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
#
# LICENCE DU MODÈLE DE SYNTHÈSE : vits-piper-fr_FR-siwis-medium, jeu de données
# SIWIS sous CC-BY 4.0 — usage commercial permis, attribution requise.
# Ce n'est PAS vits-mms-fra : son amont (facebook/mms-tts) est en CC-BY-NC,
# donc NON COMMERCIAL, donc inembarquable dans une application distribuée.
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

echo "── 3/3  Modèle de SYNTHÈSE française siwis (Piper, ~79 Mo) ──"
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

TOTAL=$(du -sh "$ASSETS" | cut -f1)
TOTAL_TTS=$(du -sh "$TTS_ASSETS" | cut -f1)
echo ""
echo "Voix hors-ligne prête :"
echo "  AAR ................ app/libs/"
echo "  écoute (STT) ....... assets/sherpa-kroko-fr/  ($TOTAL)"
echo "  parole (TTS) ....... assets/sherpa-tts-fr/    ($TOTAL_TTS)"
echo "Build : cd android && ./gradlew assembleDebug"
