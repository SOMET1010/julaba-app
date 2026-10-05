# OSS-02 — Sherpa VAD contre MIC-01 : spike, rien d'autre

> **Aucun fichier de production n'est touché.** Ni `useVoiceCore`, ni
> `MicroVenteCaisse`, ni l'argent, ni l'intention. Aucun remplacement n'est
> proposé ici : ce dossier mesure, il ne décide pas.

## La question

JULABA embarque déjà sherpa-onnx pour la **transcription**. Sherpa fournit aussi
un **VAD** (détection d'activité vocale). La logique maison de début/fin de
parole — `services/ecouteCaisse.ts`, seuil de niveau + minuteries — peut-elle
être remplacée par lui ?

## Le résultat, en une ligne

**Sherpa VAD gagne 7 cas sur 8, égalité sur le huitième.** MIC-01 n'en gagne
aucun. Mais le remplacement n'est **pas** un pour un — voir « Ce que ça ne dit
pas ».

## Le tableau

| cas | attendu | MIC-01 | Sherpa VAD | meilleur |
|---|---|---|---|---|
| silence total | aucune parole | ne déclenche pas, ferme à 6,02 s (`rien-dit`) | 0 segment | **=** |
| phrase courte | 1,34 → 2,50 s | 1,34 → 4,77 s (`silence`) | 1,51 → 2,64 s | **Sherpa** |
| phrase longue | 1,30 → 7,82 s | 1,31 → **jamais de fin** | 1,64 → 7,56 s (4 seg) | **Sherpa** |
| hésitation 2 s | 0,84 → 5,50 s | 0,83 → 4,26 s **COUPÉ** | 1,00 → 5,64 s (2 seg) | **Sherpa** |
| hésitation 4 s | 0,84 → 7,50 s | 0,83 → 4,26 s **COUPÉ** | 1,00 → 7,53 s (2 seg) | **Sherpa** |
| bruit constant | aucune parole | déclenche à 0 s — **FAUX POSITIF** | 0 segment | **Sherpa** |
| bruit + parole | 1,34 → 2,50 s | démarre à **0 s** (sur le bruit) | 1,48 → 2,64 s | **Sherpa** |
| voix faible (−20 dB) | 1,34 → 2,50 s | 1,34 → 4,26 s | 1,51 → 2,86 s | **Sherpa** |

Preuve complète : `resultats.json` (niveaux image par image, segments, écarts).

### Ce que MIC-01 fait bien

**Le début, quand il n'y a pas de bruit** : 1,34 contre 1,34 attendu ; 1,31
contre 1,30 ; 0,83 contre 0,84. À moins de 20 ms. Ce n'est pas rien, et un
remplacement ne doit pas le perdre.

### Les trois défauts mesurés

1. **Le bruit déclenche la parole.** Sur du bruit rose seul, MIC-01 voit de la
   parole dès 0 s : son niveau est une moyenne de spectre, qui ne distingue pas
   une voix d'un souffle. Sur un marché, le micro s'ouvre tout seul.
2. **Le bruit masque le vrai début.** Avec du bruit sous la parole, MIC-01
   démarre à 0 s au lieu de 1,34 s — il date la vente d'avant qu'elle soit dite.
3. **L'hésitation coupe la phrase.** `SILENCE_FIN_MS = 1500` : un trou de 2,3 s
   ferme le micro avant la seconde moitié. Sherpa rend les deux morceaux.

Et la **latence de fin** : MIC-01 ferme 2,27 s après la dernière syllabe (1,5 s
de silence + la sonde de 250 ms), Sherpa délimite à 0,14 s. Sur une caisse,
c'est deux secondes d'attente à chaque vente.

## Ce que ça ne dit PAS — et c'est la partie qui compte

**Sherpa VAD ne remplace pas `finDEcoute`.** Les deux ne font pas le même
travail :

- `parleMaintenant(niveau)` répond « est-ce que ça parle MAINTENANT » → **c'est
  ça que Sherpa VAD remplace**, et bien mieux ;
- `finDEcoute(faits)` répond « faut-il FERMER LE MICRO » — une décision de
  produit (1,5 s de silence, plafond de 12 s, 6 s avant le premier mot) que
  Sherpa ne prend pas et ne doit pas prendre.

Un remplacement consisterait donc à **alimenter `finDEcoute` avec le VAD** à la
place du niveau, en gardant ses règles. Ce n'est pas écrit ici, et ce n'est pas
proposé : OSS-02 est un spike.

## Limites du banc, à connaître avant de s'en servir

- **La parole est synthétique** : ce sont les clips TTS de Tata (vraie voix
  française, pas du bruit modulé), mais pas une marchande dans un marché. Le
  bruit est du bruit rose, pas un vrai fond de marché.
- **La vérité terrain a été mesurée, pas supposée.** Premier passage : je l'avais
  écrite en supposant que les clips parlent du début à la fin. `bornes-reelles.mjs`
  a montré 0,34 s de blanc au début et une fin à 6,82 s au lieu de 7,0. Les
  chiffres du tableau sont ceux d'après correction.
- **Le niveau MIC-01 est une reproduction** de `AnalyserNode` (fftSize 512,
  fenêtre de Blackman, lissage 0,8, dB clampés [−100, −30], ×2,5). Fidèle à la
  spec Web Audio, mais ce n'est pas Chrome sur un Samsung.
- **Hors appareil** : tout tourne en Node sur Linux. Sur téléphone, sherpa VAD
  passe par l'AAR natif, pas par `sherpa-onnx-node`.

## Rejouer

```sh
cd spike/oss-02-vad
npm init -y && npm install sherpa-onnx-node
curl -fsSLO https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/silero_vad.onnx
# Deux clips de vraie voix, depuis le dépôt :
ffmpeg -y -i ../../frontend/dist-recette/voix/fr-CI/prototype/tata-entree-numero.mp3   -ar 16000 -ac 1 court.wav
ffmpeg -y -i ../../frontend/dist-recette/voix/fr-CI/prototype/tata-accueil-preview.mp3 -ar 16000 -ac 1 long.wav
bash generer-cas.sh      # les 8 cas + leur vérité terrain
node bornes-reelles.mjs  # où la voix est réellement, par l'énergie
node banc-vad.mjs        # le tableau
```

Versions : `sherpa-onnx-node` 1.13.8, `silero_vad.onnx` (629 Ko), Node 22.
