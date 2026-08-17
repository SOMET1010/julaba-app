#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Installer la voix hors-ligne dans le projet Android (à lancer AVANT le build).
#
# Télécharge (avec reprise) :
#   1. l'AAR sherpa-onnx v1.13.5 (API Kotlin + libs natives) → app/libs/
#   2. le modèle FRANÇAIS « Kroko » zipformer streaming (~71 Mo) →
#      app/src/main/assets/sherpa-kroko-fr/
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

echo "── 1/2  AAR sherpa-onnx v${SHERPA_VERSION} ──"
mkdir -p "$LIBS"
telecharger "$AAR_URL" "$AAR_DEST"

echo "── 2/2  Modèle FR Kroko (zipformer streaming, ~71 Mo) ──"
mkdir -p "$ASSETS"
for entree in "${FICHIERS[@]}"; do
  nom="${entree%%:*}"; taille="${entree##*:}"
  telecharger "$MODELE_BASE/$nom" "$ASSETS/$nom" "$taille"
done

TOTAL=$(du -sh "$ASSETS" | cut -f1)
echo ""
echo "Voix hors-ligne prête : AAR dans app/libs/, modèle ($TOTAL) dans assets/sherpa-kroko-fr/."
echo "Build : cd android && ./gradlew assembleDebug"
