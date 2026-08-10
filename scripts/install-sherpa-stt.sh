#!/usr/bin/env bash
# ═════════════════════════════════════════════════════════════════════════════
# install-sherpa-stt.sh — Runtime WASM sherpa-onnx (ASR streaming) pour Jùlaba.
#
# Dépose UNIQUEMENT les 3 fichiers runtime du build officiel (SANS le .data
# anglais de ~190 Mo embarqué) dans frontend/public/voix/sherpa/ :
#   sherpa-onnx-asr.js               (API : createOnlineRecognizer, ~53 Ko)
#   sherpa-onnx-wasm-main-asr.js     (glue Emscripten + pthreads, ~158 Ko)
#   sherpa-onnx-wasm-main-asr.wasm   (~19 Mo)
#
# Le MODÈLE FRANÇAIS (~128 Mo int8) n'est PAS vendored ici : il est téléchargé
# à l'installation (consentement de la marchande, cf. InstallerOffline) depuis
# HuggingFace puis mis en cache — les URLs vivent dans
# frontend/src/app/voice-offline/sherpaModel.ts.
#
# ⚠️ EXIGENCE DÉPLOIEMENT — le runtime est compilé avec pthreads : l'origine
# doit être « cross-origin isolated » (SharedArrayBuffer) :
#   Cross-Origin-Opener-Policy: same-origin
#   Cross-Origin-Embedder-Policy: credentialless
# Headers posés dans nginx/*.conf, render.yaml et le serveur dev Vite
# (voir sherpa-002.md §Phase 1). Sans ces headers, offlineStt.ts bascule
# automatiquement sur Vosk (repli) — jamais de régression.
#
# DÉFENSIF (même règle que backend/scripts/setup-piper.sh) : sort en 0 même si
# le réseau échoue. Le frontend retombe proprement sur Vosk.
#
# Usage :  bash scripts/install-sherpa-stt.sh
# ═════════════════════════════════════════════════════════════════════════════

set -u

WASM_RELEASE="https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.13.4"
WASM_ASSET="sherpa-onnx-wasm-simd-v1.13.4-en-asr-zipformer.tar.bz2"

DEST="frontend/public/voix/sherpa"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

mkdir -p "$ROOT/$DEST" || { echo "[sherpa-stt] mkdir KO — ignoré"; exit 0; }

echo "[sherpa-stt] Téléchargement du runtime ASR sherpa-onnx (tar ~175 Mo, extraction ciblée)…"
# Extraction STREAMING : on ne garde que les 3 fichiers runtime. Le .data
# (~190 Mo) contient le modèle anglais embarqué — inutile pour le français,
# on ne le copie jamais (gros gain de place et de déploiement).
if ! curl -fsSL "$WASM_RELEASE/$WASM_ASSET" \
     | tar -xjf - -C "$ROOT/$DEST" --strip-components=2 --wildcards \
       '*/sherpa-onnx-asr.js' \
       '*/sherpa-onnx-wasm-main-asr.js' \
       '*/sherpa-onnx-wasm-main-asr.wasm'; then
  echo "[sherpa-stt] téléchargement/extraction KO — sherpa STT ignoré (repli Vosk)"
  exit 0
fi

echo "[sherpa-stt] Terminé — fichiers du runtime :"
ls -la "$ROOT/$DEST"
exit 0
