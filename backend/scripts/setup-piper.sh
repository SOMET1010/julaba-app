#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────
# Installe Piper (TTS souverain, gratuit à l'usage) + une voix française LÉGÈRE
# (siwis "low" : petite empreinte mémoire, adaptée au plan gratuit Render).
#
# DÉFENSIF : ce script NE DOIT JAMAIS faire échouer le build. En cas d'erreur
# réseau/téléchargement, on sort en 0 : le backend démarre quand même, Piper est
# simplement absent -> repli automatique sur la voix du navigateur (voir
# PiperService + frontend). Aucun risque pour la caisse.
# ──────────────────────────────────────────────────────────────────────────
set -u

PIPER_RELEASE="https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz"
VOICE_ONNX="https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/low/fr_FR-siwis-low.onnx"
VOICE_JSON="https://huggingface.co/rhasspy/piper-voices/resolve/main/fr/fr_FR/siwis/low/fr_FR-siwis-low.onnx.json"

DEST=".piper"
mkdir -p "$DEST" || { echo "[piper] mkdir KO — ignoré"; exit 0; }

echo "[piper] Téléchargement du binaire Piper…"
if ! curl -fsSL -o "$DEST/piper.tar.gz" "$PIPER_RELEASE"; then
  echo "[piper] Téléchargement binaire KO — Piper ignoré (voix navigateur en repli)"; exit 0
fi
tar -xzf "$DEST/piper.tar.gz" -C "$DEST" && rm -f "$DEST/piper.tar.gz" || { echo "[piper] extraction KO — ignoré"; exit 0; }

echo "[piper] Téléchargement de la voix française (siwis low)…"
if ! curl -fsSL -o "$DEST/voice.onnx" "$VOICE_ONNX"; then
  echo "[piper] Voix KO — Piper ignoré (voix navigateur en repli)"; exit 0
fi
curl -fsSL -o "$DEST/voice.onnx.json" "$VOICE_JSON" || echo "[piper] .json KO (Piper cherchera à côté)"

chmod +x "$DEST/piper/piper" 2>/dev/null || true
echo "[piper] Installation OK -> $DEST/piper/piper + voix"
exit 0
