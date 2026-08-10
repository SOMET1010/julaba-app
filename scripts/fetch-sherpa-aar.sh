#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# fetch-sherpa-aar.sh — Télécharge l'AAR sherpa-onnx (STT/TTS natif Android)
# depuis les releases officielles k2-fsa/sherpa-onnx et le place dans
# android/app/libs/ pour le build Capacitor.
#
# ⚠️ L'AAR n'est PAS publié sur Maven Central : c'est la seule source fiable
# (la release contient aussi les sources dans android/SherpaOnnxAar si un build
# local était nécessaire). Déclaré dans android/app/build.gradle via
# `implementation files('libs/sherpa-onnx-1.13.4.aar')`.
#
# Usage :
#   bash scripts/fetch-sherpa-aar.sh            # version par défaut 1.13.4
#   SHERPA_ONNX_VERSION=1.13.4 bash scripts/fetch-sherpa-aar.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

VERSION="${SHERPA_ONNX_VERSION:-1.13.4}"
URL="https://github.com/k2-fsa/sherpa-onnx/releases/download/v${VERSION}/sherpa-onnx-${VERSION}.aar"
OUT_DIR="android/app/libs"
OUT="${OUT_DIR}/sherpa-onnx-${VERSION}.aar"

mkdir -p "${OUT_DIR}"

if [ -f "${OUT}" ]; then
  echo "AAR déjà présent : ${OUT} ($(du -h "${OUT}" | cut -f1))"
  exit 0
fi

echo "Téléchargement de l'AAR sherpa-onnx v${VERSION}…"
curl -fsSL -o "${OUT}" "${URL}"
echo "OK : ${OUT} ($(du -h "${OUT}" | cut -f1))"
