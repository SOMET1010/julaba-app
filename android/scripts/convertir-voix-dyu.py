#!/usr/bin/env python3
# ──────────────────────────────────────────────────────────────────────────────
# CONVERTIR LA VOIX DIOULA POUR sherpa-onnx — et la quantifier en int8.
#
# POURQUOI CE FICHIER EXISTE, ET CE QU'IL CORRIGE.
# On nous avait dit : « sherpa-onnx lit nativement les modèles MMS-TTS, il n'y a
# qu'un fichier de plus à poser ». C'est vrai des modèles exportés PAR le script
# de sherpa. Ce n'est PAS vrai du port publié le 19/09/2026
# (akoun-dev/julaba, tag voix-dyu-mms-v1, 114 221 861 octets) : ce port a été
# produit par `optimum-cli` pour transformers.js, c'est-à-dire pour un
# NAVIGATEUR. Mesuré ici, graphe en main :
#
#   entrées  : input_ids (int64), attention_mask (int64)
#   sorties  : waveform (float), spectrogram (float)
#   metadata_props : AUCUNE
#
# Or sherpa-onnx attend, dans cet ordre exact et positionnellement :
#   x, x_length, noise_scale, length_scale, noise_scale_w      → une seule sortie
# et lit des métadonnées OBLIGATOIRES (sample_rate, n_speakers, language,
# comment). Quand elles manquent, sherpa ne « retombe » pas : la macro
# SHERPA_ONNX_READ_META_DATA appelle SHERPA_ONNX_EXIT(-1). Donner le fichier
# publié tel quel au plugin ne produirait donc pas un silence rattrapable — ça
# TUERAIT le processus. C'est la raison pour laquelle ce convertisseur n'est pas
# un confort : c'est la condition pour que l'application reste debout.
#
# CE QU'IL FAIT, ET RIEN D'AUTRE (aucun poids n'est ré-entraîné ni ré-exporté) :
#   1. il renomme `input_ids` en `x` ;
#   2. il fabrique `attention_mask` dans le graphe (des 1 de la forme de x) —
#      le lot est de taille 1 et sans remplissage, le masque est donc plein ;
#   3. il déclare x_length, noise_scale, length_scale, noise_scale_w comme
#      entrées du graphe pour respecter l'arité de sherpa. ELLES NE SONT PAS
#      LUES : l'export optimum a figé le bruit et la durée dans des constantes.
#      CONSÉQUENCE À DIRE TOUT HAUT : la VITESSE (`speed`) n'a aucun effet sur
#      la voix dioula. Le plugin le sait et ne fait pas semblant ;
#   4. il ne garde que `waveform`, remis en [1, 1, T] sous le nom `y` ;
#   5. il écrit les métadonnées que sherpa exige, dont `frontend=characters`,
#      `add_blank=1`, `blank_id=0` et `use_eos_bos=0` — la tokenisation de
#      sherpa devient alors CARACTÈRE POUR CARACTÈRE celle du VitsTokenizer de
#      Hugging Face (minuscules, un 0 avant chaque token et au début) ;
#   6. il écrit `tokens.txt` depuis le vocabulaire du checkpoint dyu ;
#   7. il quantifie les poids en int8 et VÉRIFIE la taille obtenue.
#
# LICENCE — À LIRE AVANT DE LANCER. Les poids viennent de facebook/mms-tts-dyu,
# publié en CC-BY-NC-4.0 : NON COMMERCIAL. C'est exactement le motif pour lequel
# `installer-voix.sh` avait écarté vits-mms-fra pour le français au profit de
# siwis/Piper (CC-BY 4.0). Cette voix est donc un PILOTE d'évaluation, derrière
# un interrupteur explicite (JULABA_VOIX_DYU=1), et sa mise en production
# commerciale est une décision à prendre, pas un effet de bord d'un build.
#
# Usage :
#     python3 android/scripts/convertir-voix-dyu.py \
#         --source <mms-tts-dyu-model.onnx> --sortie <dossier>
#
# Dépendances : onnx, onnxruntime (pip). Le script ne touche pas au réseau.
# ──────────────────────────────────────────────────────────────────────────────
import argparse
import json
import os
import sys

# Vocabulaire du checkpoint facebook/mms-tts-dyu (vocab.json de l'export).
# 26 lettres latines + ŋ ɔ ɛ ɲ + espace, apostrophe, tiret, underscore.
# AUCUN CHIFFRE : ce modèle ne peut pas prononcer « 500 ». C'est un garde-fou
# de plus, gratuit, du côté de l'argent — voir voixParLocale.ts.
VOCAB = {
    " ": 17, "'": 14, "-": 18, "_": 13,
    "a": 23, "b": 2, "c": 31, "d": 27, "e": 30, "f": 16, "g": 19, "h": 11,
    "i": 12, "j": 4, "k": 24, "l": 15, "m": 10, "n": 20, "o": 7, "p": 6,
    "r": 28, "s": 8, "t": 0, "u": 3, "v": 26, "w": 9, "y": 1, "z": 21,
    "ŋ": 29, "ɔ": 25, "ɛ": 22, "ɲ": 5,
}

# Ce que sherpa-onnx LIT et exige. Les quatre premières n'ont pas de valeur par
# défaut côté sherpa : sans elles, le processus s'arrête.
METADONNEES = {
    "model_type": "vits",
    "sample_rate": "16000",
    "n_speakers": "1",
    "language": "Dioula",
    "comment": "mms",          # ne doit contenir ni piper, ni coqui, ni melo, ni icefall
    "frontend": "characters",  # tokenisation caractère par caractère, comme VitsTokenizer
    "add_blank": "1",
    "blank_id": "0",           # le pad du checkpoint dyu est « t » = 0
    "use_eos_bos": "0",        # défaut sherpa = 1 ; MMS n'en met pas
    "pad_id": "0",
    "punctuation": "",
    "voice": "",
}

TAILLE_SOURCE_ATTENDUE = 114221861


def construire(src, dst):
    import onnx
    from onnx import TensorProto, helper

    modele = onnx.load(src)
    g = modele.graph

    noms_entrees = [e.name for e in g.input]
    if noms_entrees != ["input_ids", "attention_mask"]:
        raise SystemExit(
            f"Graphe inattendu : entrées {noms_entrees}. Ce convertisseur ne "
            "sait adapter QUE l'export optimum de facebook/mms-tts-* "
            "(input_ids, attention_mask). Refus plutôt que dégât."
        )

    # 1 + 2. `input_ids` devient `x` ; `attention_mask` est calculé dans le graphe.
    for noeud in g.node:
        for i, e in enumerate(noeud.input):
            if e == "input_ids":
                noeud.input[i] = "x"

    x = helper.make_tensor_value_info("x", TensorProto.INT64, ["N", "T"])
    x_length = helper.make_tensor_value_info("x_length", TensorProto.INT64, [1])
    scale = lambda n: helper.make_tensor_value_info(n, TensorProto.FLOAT, [1])

    forme = helper.make_node("Shape", ["x"], ["dyu_forme_x"], name="dyu_forme_x")
    masque = helper.make_node(
        "ConstantOfShape", ["dyu_forme_x"], ["attention_mask"], name="dyu_masque_plein",
        value=helper.make_tensor("un", TensorProto.INT64, [1], [1]),
    )

    # 4. une seule sortie, `y`, en [1, 1, T].
    y = helper.make_node("Unsqueeze", ["waveform"], ["y"], name="dyu_y", axes=[1])

    del g.input[:]
    g.input.extend([x, x_length, scale("noise_scale"), scale("length_scale"), scale("noise_scale_w")])
    g.node.insert(0, masque)
    g.node.insert(0, forme)
    g.node.append(y)
    del g.output[:]
    g.output.extend([helper.make_tensor_value_info("y", TensorProto.FLOAT, ["N", 1, "S"])])

    # 5. les métadonnées.
    del modele.metadata_props[:]
    for cle, valeur in METADONNEES.items():
        p = modele.metadata_props.add()
        p.key, p.value = cle, valeur

    onnx.checker.check_model(modele, full_check=False)
    onnx.save(modele, dst)
    return os.path.getsize(dst)


def ecrire_tokens(chemin):
    # Format sherpa : « <caractère> <id> » par ligne. L'espace est écrit SEUL
    # avec son id : le lecteur de sherpa traite une ligne à un seul champ
    # comme l'espace (voir offline-tts-character-frontend.cc, ReadTokens).
    lignes = []
    for tok, idt in sorted(VOCAB.items(), key=lambda kv: kv[1]):
        lignes.append(f"{idt}" if tok == " " else f"{tok} {idt}")
    with open(chemin, "w", encoding="utf-8") as f:
        f.write("\n".join(lignes) + "\n")
    return len(lignes)


def quantifier(src, dst):
    from onnxruntime.quantization import QuantType, quantize_dynamic

    quantize_dynamic(
        src, dst, weight_type=QuantType.QInt8, per_channel=True,
        op_types_to_quantize=["MatMul", "Conv", "Gemm"],
        extra_options={"MatMulConstBOnly": True},
    )
    return os.path.getsize(dst)


def verifier(chemin_modele, chemin_tokens):
    """Charge le modèle converti et le fait PARLER, avec la convention d'appel
    de sherpa (cinq entrées). Une conversion qui ne produit pas de son est une
    conversion ratée : on le voit ici, pas sur le téléphone."""
    import numpy as np
    import onnxruntime as ort

    table = {}
    for ligne in open(chemin_tokens, encoding="utf-8"):
        ligne = ligne.rstrip("\n")
        if not ligne:
            continue
        morceaux = ligne.split(" ")
        if len(morceaux) == 1:
            table[" "] = int(morceaux[0])
        else:
            table[morceaux[0]] = int(morceaux[1])

    # Phrase de DÉCOR — une salutation. Aucun nombre, aucun montant : ce lot
    # n'autorise pas la voix dioula à dire de l'argent.
    phrase = "i ni ce"
    ids = [0]
    for c in phrase.lower():
        if c in table:
            ids.append(table[c])
            ids.append(0)

    s = ort.InferenceSession(chemin_modele, providers=["CPUExecutionProvider"])
    noms = [e.name for e in s.get_inputs()]
    attendu = ["x", "x_length", "noise_scale", "length_scale", "noise_scale_w"]
    if noms != attendu:
        raise SystemExit(f"Entrées {noms} ≠ {attendu} — sherpa les lit par position.")

    sortie = s.run(None, {
        "x": np.array([ids], dtype=np.int64),
        "x_length": np.array([len(ids)], dtype=np.int64),
        "noise_scale": np.array([0.667], dtype=np.float32),
        "length_scale": np.array([1.0], dtype=np.float32),
        "noise_scale_w": np.array([0.8], dtype=np.float32),
    })[0]
    echantillons = np.asarray(sortie).reshape(-1)
    rms = float(np.sqrt(np.mean(echantillons.astype(np.float64) ** 2)))
    if echantillons.size < 8000 or rms < 0.005:
        raise SystemExit(f"Sortie muette ou trop courte ({echantillons.size} éch., rms={rms:.5f}).")
    return echantillons, rms


def ecrire_wav(chemin, echantillons, sr=16000):
    import struct

    import numpy as np

    pcm = (np.clip(echantillons, -1.0, 1.0) * 32767.0).round().astype("<i2").tobytes()
    with open(chemin, "wb") as f:
        f.write(b"RIFF" + struct.pack("<I", 36 + len(pcm)) + b"WAVE")
        f.write(b"fmt " + struct.pack("<IHHIIHH", 16, 1, 1, sr, sr * 2, 2, 16))
        f.write(b"data" + struct.pack("<I", len(pcm)) + pcm)


def main():
    ap = argparse.ArgumentParser(description="Convertit le port ONNX dioula pour sherpa-onnx, puis le quantifie en int8.")
    ap.add_argument("--source", required=True, help="mms-tts-dyu-model.onnx (export optimum, fp32)")
    ap.add_argument("--sortie", required=True, help="dossier de sortie (assets sherpa-tts-dyu)")
    ap.add_argument("--garder-fp32", action="store_true", help="conserver aussi le modèle adapté non quantifié")
    args = ap.parse_args()

    taille_src = os.path.getsize(args.source)
    if taille_src != TAILLE_SOURCE_ATTENDUE:
        print(f"  ⚠ source {taille_src} o ≠ {TAILLE_SOURCE_ATTENDUE} o attendus — on continue, mais dites-le.", file=sys.stderr)

    os.makedirs(args.sortie, exist_ok=True)
    intermediaire = os.path.join(args.sortie, "model.fp32.onnx")
    final = os.path.join(args.sortie, "model.onnx")
    tokens = os.path.join(args.sortie, "tokens.txt")

    print("── 1/4  adaptation du graphe à la convention sherpa ──")
    t_fp32 = construire(args.source, intermediaire)
    print(f"  ✓ {t_fp32} o")

    print("── 2/4  tokens.txt ──")
    print(f"  ✓ {ecrire_tokens(tokens)} tokens")

    print("── 3/4  quantification int8 ──")
    t_int8 = quantifier(intermediaire, final)
    print(f"  ✓ {t_int8} o ({t_int8 / 1048576:.1f} Mio)")

    print("── 4/4  vérification : le modèle quantifié parle-t-il ? ──")
    echantillons, rms = verifier(final, tokens)
    wav = os.path.join(args.sortie, "verification-dyu.wav")
    ecrire_wav(wav, echantillons)
    print(f"  ✓ « i ni ce » → {echantillons.size} échantillons ({echantillons.size / 16000:.2f} s), rms={rms:.4f}")
    print(f"  ✓ preuve écoutable : {wav}")

    if not args.garder_fp32:
        os.remove(intermediaire)

    json.dump(
        {"source_octets": taille_src, "adapte_fp32_octets": t_fp32, "int8_octets": t_int8,
         "echantillons_verification": int(echantillons.size), "rms_verification": round(rms, 5)},
        open(os.path.join(args.sortie, "mesures.json"), "w"), indent=2,
    )
    print(f"\nVoix dioula prête : {final} ({t_int8} o)")


if __name__ == "__main__":
    main()
