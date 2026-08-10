#!/usr/bin/env bash
# ═════════════════════════════════════════════════════════════════════════════
# install-sherpa-tts.sh — PRÉPARATION du TTS neuronal OFFLINE sherpa-onnx (Jùlaba).
#
# ⚠️ ÉTAT RÉEL (août 2026) : la voix française neuronale N'EST PAS livrée.
#   - Le build WASM officiel « pocket-tts » (démo multilingue) n'est PAS la voix
#     de Tata Nanti Lou : sa voix embarquée fait ~200 Mo décompressée et ce n'est
#     pas du français → on NE LE DÉPLOIE PAS (coût de données + mauvaise voix).
#   - La vraie voix exige un build WASM CUSTOM embarquant
#     vits-piper-fr_FR-siwis-low-int8 (~13 Mo) : procédure officielle sur
#     https://k2-fsa.github.io/sherpa/onnx/tts/ (onglet « WebAssembly »),
#     via wasm/build-wasm-simd-tts.sh (sources épinglées v1.13.4).
#
# Ce script ne DÉPLOIE RIEN dans frontend/public/ : il télécharge juste le modèle
# FR (~13 Mo) dans un dossier de PRÉPARATION HORS DU BUILD (scripts/.tts-fr-model/)
# pour le futur build custom, puis affiche la procédure. Défensif : sort en 0.
#
# Tant que le build custom n'existe pas, sherpaTts.ts retombe sur la voix
# navigateur (speakBrowser) : AUCUNE régression, l'assistante n'est jamais muette.
#
# Usage :  bash scripts/install-sherpa-tts.sh
# ═════════════════════════════════════════════════════════════════════════════

set -u

TTS_MODELS_RELEASE="https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models"
FR_ASSET="vits-piper-fr_FR-siwis-low-int8.tar.bz2"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGE="$ROOT/scripts/.tts-fr-model"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "[sherpa-tts] ⚠️  La voix française neuronale n'est PAS encore livrée."
echo "[sherpa-tts]    Le build officiel « pocket-tts » est une démo multilingue"
echo "[sherpa-tts]    (~200 Mo, pas du français) → refusé. Il faut un build WASM"
echo "[sherpa-tts]    CUSTOM avec fr_FR-siwis-low-int8 (~13 Mo)."

mkdir -p "$STAGE"
echo "[sherpa-tts] Téléchargement du modèle FR (≈13 Mo) pour préparer ce build…"
if curl -fsSL -o "$TMP/fr.tar.bz2" "$TTS_MODELS_RELEASE/$FR_ASSET"; then
  tar -xjf "$TMP/fr.tar.bz2" -C "$STAGE" 2>/dev/null
  if [ -n "$(ls -A "$STAGE" 2>/dev/null)" ]; then
    echo "[sherpa-tts] ✓ modèle FR prêt dans scripts/.tts-fr-model/ (hors du build)"
  else
    echo "[sherpa-tts] extraction KO — ignoré"
  fi
else
  echo "[sherpa-tts] téléchargement modèle FR KO — ignoré (réessaie plus tard)"
fi

echo "[sherpa-tts] PROCÉDURE pour livrer la vraie voix française (Phase 4) :"
echo "   1. Build WASM custom (build-wasm-simd-tts.sh, sources v1.13.4) en"
echo "      embarquant scripts/.tts-fr-model/* (renommer le .onnx en model.onnx"
echo "      + tokens.txt + espeak-ng-data, cf. la doc officielle WebAssembly TTS)."
echo "   2. Déposer les fichiers livrés (sherpa-onnx-wasm-main-tts.* +"
echo "      sherpa-onnx-tts.js + sherpa-onnx-tts.worker.js) dans"
echo "      frontend/public/voix/sherpa/."
echo "   3. Ajouter « bash ../scripts/install-sherpa-tts.sh » à deploy-frontend.sh"
echo "      ET à la buildCommand de render.yaml (julaba-web)."
echo "   4. Valider le bouton « Installer la voix neuronale » sur téléphone réel."
exit 0
