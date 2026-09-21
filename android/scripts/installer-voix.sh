#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Installer la voix hors-ligne dans le projet Android (à lancer AVANT le build).
#
# Télécharge (avec reprise) :
#   1. l'AAR sherpa-onnx v1.13.5 (API Kotlin + libs natives) → app/libs/
#   2. le modèle FRANÇAIS « Kroko » zipformer streaming (~71 Mo) → ÉCOUTE →
#      app/src/main/assets/sherpa-kroko-fr/
#   3. le modèle de SYNTHÈSE français siwis (Piper, ~79 Mo) → PAROLE →
#      app/src/main/assets/sherpa-tts-fr/
#   4. FACULTATIF, sur JULABA_VOIX_DYU=1 : la voix DIOULA (MMS), convertie et
#      quantifiée ici → app/src/main/assets/sherpa-tts-dyu/  (voir plus bas)
#
# LICENCE DU MODÈLE DE SYNTHÈSE : vits-piper-fr_FR-siwis-medium, jeu de données
# SIWIS sous CC-BY 4.0 — usage commercial permis, attribution requise.
# Ce n'est PAS vits-mms-fra : son amont (facebook/mms-tts) est en CC-BY-NC,
# donc NON COMMERCIAL, donc inembarquable dans une application distribuée.
# CETTE RÈGLE N'A PAS CHANGÉ, et elle vaut aussi pour le dioula : la voix
# dioula de l'étape 4 vient de facebook/mms-tts-dyu, CC-BY-NC-4.0 elle aussi.
# Elle est donc DERRIÈRE UN INTERRUPTEUR, éteint par défaut : un build ordinaire
# ne l'embarque pas. L'allumer est une décision de pilote, pas un effet de bord.
#
# Ces fichiers sont volontairement HORS git (.gitignore) : ce script est la
# source unique. Idempotent : relancer ne retélécharge que ce qui manque.
#
# Usage :  cd android && ./scripts/installer-voix.sh
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

ICI="$(cd "$(dirname "$0")/.." && pwd)"
LIBS="$ICI/app/libs"
ASSETS="$ICI/app/src/main/assets/sherpa-kroko-fr"

SHERPA_VERSION="1.13.5"
AAR_URL="https://github.com/k2-fsa/sherpa-onnx/releases/download/v${SHERPA_VERSION}/sherpa-onnx-${SHERPA_VERSION}.aar"
AAR_DEST="$LIBS/sherpa-onnx-${SHERPA_VERSION}.aar"

MODELE_BASE="https://huggingface.co/csukuangfj/sherpa-onnx-streaming-zipformer-fr-kroko-2025-08-06/resolve/main"

TTS_NOM="vits-piper-fr_FR-siwis-medium"
TTS_URL="https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/${TTS_NOM}.tar.bz2"
TTS_ASSETS="$ICI/app/src/main/assets/sherpa-tts-fr"

# ── Voix DIOULA (étape 4, facultative) ────────────────────────────────────────
# Le poids publié est un export `optimum-cli` pour transformers.js : il n'a
# NI les cinq entrées NI les métadonnées que sherpa-onnx exige, et sherpa ne
# retombe pas quand elles manquent — il arrête le processus. On le convertit
# donc ici, avec un script commité et reproductible, puis on le quantifie.
# Tailles MESURÉES le 21/09/2026 sur cette machine, pas estimées.
DYU_ASSETS="$ICI/app/src/main/assets/sherpa-tts-dyu"
DYU_URL="https://github.com/akoun-dev/julaba/releases/download/voix-dyu-mms-v1/mms-tts-dyu-model.onnx"
DYU_SOURCE_TAILLE=114221861     # fp32 publié, octet pour octet
DYU_INT8_MIN=30000000           # borne basse de vraisemblance du quantifié
DYU_INT8_MAX=48000000           # borne haute — mesuré : 38 329 231 o
DYU_CONVERTISSEUR="$ICI/scripts/convertir-voix-dyu.py"
# fichier → taille attendue en octets (relevée sur le dépôt HF le 2026-08-18)
FICHIERS=(
  "encoder.onnx:70092599"
  "decoder.onnx:617488"
  "joiner.onnx:336817"
  "tokens.txt:5415"
)

telecharger() { # url dest taille_attendue(optionnelle)
  local url="$1" dest="$2" attendu="${3:-}"
  if [[ -f "$dest" && -n "$attendu" ]]; then
    local actuel; actuel=$(stat -c%s "$dest" 2>/dev/null || stat -f%z "$dest")
    if [[ "$actuel" == "$attendu" ]]; then
      echo "  ✓ $(basename "$dest") déjà présent (${actuel} o)"
      return 0
    fi
    echo "  … $(basename "$dest") incomplet (${actuel}/${attendu} o) — reprise"
  fi
  curl -L --fail --retry 4 --retry-delay 3 -C - -o "$dest" "$url"
  if [[ -n "$attendu" ]]; then
    local actuel; actuel=$(stat -c%s "$dest" 2>/dev/null || stat -f%z "$dest")
    if [[ "$actuel" != "$attendu" ]]; then
      echo "  ✗ $(basename "$dest") : taille $actuel ≠ attendue $attendu — abandon" >&2
      exit 1
    fi
  fi
  echo "  ✓ $(basename "$dest") téléchargé"
}

echo "── 1/3  AAR sherpa-onnx v${SHERPA_VERSION} ──"
mkdir -p "$LIBS"
telecharger "$AAR_URL" "$AAR_DEST"

echo "── 2/3  Modèle FR Kroko (zipformer streaming, ~71 Mo) ──"
mkdir -p "$ASSETS"
for entree in "${FICHIERS[@]}"; do
  nom="${entree%%:*}"; taille="${entree##*:}"
  telecharger "$MODELE_BASE/$nom" "$ASSETS/$nom" "$taille"
done

echo "── 3/4  Modèle de SYNTHÈSE française siwis (Piper, ~79 Mo) ──"
# Le test de présence porte sur model.onnx ET espeak-ng-data : sans les données
# de phonétisation, un modèle Piper se charge mais reste MUET — une absence qui
# ne se verrait qu'à l'oreille, sur le téléphone, trop tard.
if [[ -f "$TTS_ASSETS/model.onnx" && -d "$TTS_ASSETS/espeak-ng-data" ]]; then
  echo "  ✓ modèle de synthèse déjà présent ($(du -sh "$TTS_ASSETS" | cut -f1))"
else
  mkdir -p "$TTS_ASSETS"
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  telecharger "$TTS_URL" "$tmp/tts.tar.bz2"
  tar xjf "$tmp/tts.tar.bz2" -C "$tmp"
  # L'archive nomme le fichier de poids d'après la voix ; le plugin attend
  # model.onnx. On renomme ici plutôt que de coder le nom de la voix en dur
  # dans le Kotlin : changer de voix ne doit toucher que ce script.
  mv "$tmp/$TTS_NOM"/*.onnx "$TTS_ASSETS/model.onnx"
  mv "$tmp/$TTS_NOM/tokens.txt" "$TTS_ASSETS/tokens.txt"
  mv "$tmp/$TTS_NOM/espeak-ng-data" "$TTS_ASSETS/espeak-ng-data"
  rm -rf "$tmp"; trap - EXIT
  echo "  ✓ modèle de synthèse posé ($(du -sh "$TTS_ASSETS" | cut -f1))"
fi

echo "── 4/4  Voix DIOULA (MMS, pilote) ──"
if [[ "${JULABA_VOIX_DYU:-0}" != "1" ]]; then
  # Par défaut on NE pose RIEN, et on RETIRE ce qu'un lancement précédent
  # aurait posé. Sans cette suppression, un build « ordinaire » lancé après un
  # build pilote emporterait quand même 37 Mo sous licence non commerciale sans
  # que personne ne l'ait demandé. L'interrupteur doit valoir dans les DEUX sens.
  if [[ -d "$DYU_ASSETS" ]]; then
    echo "  — voix dioula RETIRÉE des assets (JULABA_VOIX_DYU≠1)"
    rm -rf "$DYU_ASSETS"
  else
    echo "  — ignorée (JULABA_VOIX_DYU≠1). L'APK ne contient aucune voix dioula."
  fi
  echo "    Pour le pilote : JULABA_VOIX_DYU=1 ./scripts/installer-voix.sh"
elif [[ -f "$DYU_ASSETS/model.onnx" && -f "$DYU_ASSETS/tokens.txt" ]]; then
  echo "  ✓ voix dioula déjà présente ($(stat -c%s "$DYU_ASSETS/model.onnx" 2>/dev/null || stat -f%z "$DYU_ASSETS/model.onnx") o)"
else
  echo "  ⚠ LICENCE : facebook/mms-tts-dyu est en CC-BY-NC-4.0 (NON COMMERCIAL)."
  echo "    Pilote et évaluation seulement. La distribution commerciale de cet"
  echo "    APK avec cette voix est une décision à prendre explicitement."
  if ! python3 -c "import onnx, onnxruntime" 2>/dev/null; then
    echo "  ✗ onnx et onnxruntime sont requis :  pip install onnx onnxruntime" >&2
    exit 1
  fi
  mkdir -p "$DYU_ASSETS"
  tmpdyu="$(mktemp -d)"
  trap 'rm -rf "$tmpdyu"' EXIT
  telecharger "$DYU_URL" "$tmpdyu/mms-tts-dyu-model.onnx" "$DYU_SOURCE_TAILLE"
  python3 "$DYU_CONVERTISSEUR" --source "$tmpdyu/mms-tts-dyu-model.onnx" --sortie "$DYU_ASSETS"
  rm -rf "$tmpdyu"; trap - EXIT
  taille_dyu=$(stat -c%s "$DYU_ASSETS/model.onnx" 2>/dev/null || stat -f%z "$DYU_ASSETS/model.onnx")
  # On ne fige pas un octet exact : la taille dépend de la version
  # d'onnxruntime qui quantifie. On borne, et c'est le convertisseur qui
  # apporte la vraie preuve — il refuse un modèle qui ne parle pas.
  if (( taille_dyu < DYU_INT8_MIN || taille_dyu > DYU_INT8_MAX )); then
    echo "  ✗ modèle dioula quantifié : $taille_dyu o hors de [$DYU_INT8_MIN, $DYU_INT8_MAX] — abandon" >&2
    exit 1
  fi
  echo "  ✓ voix dioula posée ($taille_dyu o)"
fi

TOTAL=$(du -sh "$ASSETS" | cut -f1)
TOTAL_TTS=$(du -sh "$TTS_ASSETS" | cut -f1)
echo ""
echo "Voix hors-ligne prête :"
echo "  AAR ................ app/libs/"
echo "  écoute (STT) ....... assets/sherpa-kroko-fr/  ($TOTAL)"
echo "  parole (TTS) ....... assets/sherpa-tts-fr/    ($TOTAL_TTS)"
if [[ -f "$DYU_ASSETS/model.onnx" ]]; then
  echo "  parole (dioula) .... assets/sherpa-tts-dyu/   ($(du -sh "$DYU_ASSETS" | cut -f1))  ⚠ CC-BY-NC, pilote"
fi
echo "Build : cd android && ./gradlew assembleDebug"
