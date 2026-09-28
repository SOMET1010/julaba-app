#!/usr/bin/env bash
# RECETTE VOIX DE LA CAISSE — de bout en bout, dans un vrai navigateur.
#
# Patrick, 28/09 : « tu dois faire toi-même une recette pas à pas sinon c'est
# injouable ». Ce script monte tout, joue la recette, et démonte.
#
# BASE NEUVE À CHAQUE PASSAGE, et ce n'est pas une précaution de style : au
# quatrième essai, le produit de recette existait en QUATRE exemplaires,
# `apparierProduit` refusait de choisir entre quatre homonymes, et la recette
# accusait le code d'un défaut qui venait d'elle. Une recette qui garde son
# état ment tôt ou tard.
set +e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
E2E="$ROOT/frontend_src/e2e"
OUT="${RECETTE_OUT:-/tmp/recette-voix}"; mkdir -p "$OUT"
export DB_HOST="${DB_HOST:-127.0.0.1}" DB_PORT="${DB_PORT:-5432}"
export DB_USERNAME="${DB_USERNAME:-julaba_user}" DB_PASSWORD="${DB_PASSWORD:-test}"
DB="${DB_RECETTE:-julaba_recette_voix}"
PGA=(-h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME")

echo "== builds =="
[ -f "$ROOT/backend/dist/main.js" ] || npm run build -w backend --prefix "$ROOT" >/dev/null 2>&1
# LE BUNDLE DE RECETTE : celui de production, à UN alias près — le module STT
# sherpa-onnx, qui n'existe que dans l'APK, remplacé par un stub piloté par le
# script. Aucun fichier de src/ n'est modifié.
( cd "$ROOT/frontend_src" && npx vite build --config e2e/vite.recette.config.ts ) >/dev/null 2>&1 \
  && echo "bundle de recette OK" || { echo "bundle KO"; exit 1; }

echo "== base neuve $DB =="
PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d postgres -c "DROP DATABASE IF EXISTS $DB;" >/dev/null 2>&1
PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d postgres -c "CREATE DATABASE $DB;" >/dev/null 2>&1

echo "== backend =="
( cd "$ROOT/backend"
  DB_NAME="$DB" DB_SYNCHRONIZE=true DB_LOGGING=false NODE_ENV=development PORT=3000 \
  JWT_SECRET=recette_local JWT_EXPIRES_IN=1d PIN_ENCRYPTION_KEY=recette_pin_key_32_chars_padding_x \
  REFRESH_TOKEN_SALT=recette_salt SEED_DEMO=true SEED_DEMO_PASSWORD=1234 THROTTLE_DISABLED=true \
  node dist/main.js > "$OUT/backend.log" 2>&1 & echo $! > "$OUT/backend.pid" )
curl -sS --retry 60 --retry-all-errors --retry-delay 2 -m 180 http://localhost:3000/api/v1/health >/dev/null 2>&1 \
  && echo "backend up" || { echo "backend KO"; tail -20 "$OUT/backend.log"; }

echo "== proxy :4180 =="
( node "$E2E/proxy.mjs" "$ROOT/frontend/dist-recette" 4180 http://localhost:3000 > "$OUT/proxy.log" 2>&1 & echo $! > "$OUT/proxy.pid" )
curl -sS --retry 20 --retry-all-errors --retry-delay 1 -m 30 -o /dev/null http://localhost:4180/ 2>/dev/null && echo "proxy up"

echo "== navigateur =="
RECETTE_OUT="$OUT" timeout 420 node "$E2E/recette-voix-caisse.mjs" 2>&1
CODE=$?

[ -f "$OUT/backend.pid" ] && kill "$(cat "$OUT/backend.pid")" 2>/dev/null
[ -f "$OUT/proxy.pid" ] && kill "$(cat "$OUT/proxy.pid")" 2>/dev/null
PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d postgres -c "DROP DATABASE IF EXISTS $DB;" >/dev/null 2>&1
echo "== captures : $OUT/0*.png =="
exit $CODE
