#!/bin/bash
set -e
cd /var/www/julaba/frontend
# Vendore le runtime WASM sherpa-onnx (voix hors-ligne) — défensif (exit 0).
bash ../scripts/install-sherpa-stt.sh
npm run build
sudo rm -rf /var/www/julaba/frontend/dist
sudo mkdir -p /var/www/julaba/frontend/dist
sudo cp -r dist/* /var/www/julaba/frontend/dist/
sudo chown -R ubuntu:ubuntu /var/www/julaba/frontend/dist
sudo systemctl reload nginx
echo "✅ Frontend déployé avec succès"
