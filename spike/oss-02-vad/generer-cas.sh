#!/usr/bin/env bash
# Génère les 8 cas du spike OSS-02, en VRAIE VOIX française (clips Tata du
# dépôt), à 16 kHz mono PCM — le format que sherpa VAD attend.
#
# Chaque cas porte sa VÉRITÉ TERRAIN dans verite.json : les instants où la
# parole commence et finit réellement. Sans elle, « le VAD a détecté » ne veut
# rien dire — on ne saurait pas s'il a eu raison.
set -euo pipefail
cd "$(dirname "$0")"
R=16000
mkdir -p cas

# Deux extraits de vraie voix, taillés court et long.
ffmpeg -y -loglevel error -i court.wav -t 1.5 -ar $R -ac 1 p-court.wav
ffmpeg -y -loglevel error -i long.wav  -t 7.0 -ar $R -ac 1 p-long.wav
# La même voix, atténuée de 20 dB : « voix faible » reste de la VOIX.
ffmpeg -y -loglevel error -i p-court.wav -af "volume=-20dB" -ar $R -ac 1 p-faible.wav
# Silence et bruit de fond (bruit rose : plus proche d'un marché qu'un bruit blanc).
sil () { ffmpeg -y -loglevel error -f lavfi -i "anullsrc=r=$R:cl=mono" -t "$1" -c:a pcm_s16le "$2"; }
bruit () { ffmpeg -y -loglevel error -f lavfi -i "anoisesrc=r=$R:c=pink:a=$2" -t "$1" -ac 1 -c:a pcm_s16le "$3"; }

joindre () { out="$1"; shift; printf "file '%s'\n" "$@" > liste.txt; \
  ffmpeg -y -loglevel error -f concat -safe 0 -i liste.txt -c copy "$out"; }

sil 1.0 s1.wav; sil 2.0 s2.wav; sil 3.0 s3.wav; sil 4.0 s4.wav; sil 0.5 s05.wav; sil 8.0 s8.wav

# 1 · silence total — aucune parole : tout déclenchement est un FAUX POSITIF
cp s8.wav cas/1-silence-total.wav
# 2 · phrase courte — parole de 1,0 à 2,5 s
joindre cas/2-phrase-courte.wav s1.wav p-court.wav s3.wav
# 3 · phrase longue — parole de 1,0 à 8,0 s
joindre cas/3-phrase-longue.wav s1.wav p-long.wav s2.wav
# 4 · hésitation 2 s — deux prises, trou de 2 s entre elles
joindre cas/4-hesitation-2s.wav s05.wav p-court.wav s2.wav p-court.wav s2.wav
# 5 · hésitation 4 s — même chose, trou de 4 s : AU-DELÀ du silence de fin (1,5 s)
joindre cas/5-hesitation-4s.wav s05.wav p-court.wav s4.wav p-court.wav s2.wav
# 6 · bruit constant — aucune parole : tout déclenchement est un FAUX POSITIF
bruit 8.0 0.05 cas/6-bruit-constant.wav
# 7 · bruit + parole — la parole est à 1,0-2,5 s, sous un bruit continu
bruit 6.0 0.05 b6.wav
joindre tmp7.wav s1.wav p-court.wav s3.wav
ffmpeg -y -loglevel error -i tmp7.wav -i b6.wav -filter_complex "[0][1]amix=inputs=2:duration=first:weights=1 0.6" -ar $R -ac 1 cas/7-bruit-plus-parole.wav
# 8 · voix faible — la même voix 20 dB plus bas, de 1,0 à 2,5 s
joindre cas/8-voix-faible.wav s1.wav p-faible.wav s3.wav

cat > cas/verite.json <<'JSON'
{
  "1-silence-total":      { "parole": [],                         "duree": 8.0,  "note": "aucune parole : tout déclenchement est un faux positif" },
  "2-phrase-courte":      { "parole": [[1.0, 2.5]],               "duree": 5.5 },
  "3-phrase-longue":      { "parole": [[1.0, 8.0]],               "duree": 10.0 },
  "4-hesitation-2s":      { "parole": [[0.5, 2.0], [4.0, 5.5]],   "duree": 7.5,  "note": "trou de 2,0 s — AU-DESSUS du silence de fin de MIC-01 (1,5 s)" },
  "5-hesitation-4s":      { "parole": [[0.5, 2.0], [6.0, 7.5]],   "duree": 9.5,  "note": "trou de 4,0 s" },
  "6-bruit-constant":     { "parole": [],                         "duree": 8.0,  "note": "bruit rose seul : tout déclenchement est un faux positif" },
  "7-bruit-plus-parole":  { "parole": [[1.0, 2.5]],               "duree": 5.5 },
  "8-voix-faible":        { "parole": [[1.0, 2.5]],               "duree": 5.5,  "note": "même voix, -20 dB" }
}
JSON
rm -f s1.wav s2.wav s3.wav s4.wav s05.wav s8.wav b6.wav tmp7.wav liste.txt
echo "— cas générés —"
for f in cas/*.wav; do printf "  %-28s %6.2f s\n" "$(basename "$f")" "$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$f")"; done
