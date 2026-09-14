#!/usr/bin/env bash
# Orchestration de la recette PILOTE-2 — vente especes, coupure reseau, reprise.
#
# Monte une stack JETABLE et complete (base fraiche + backend + proxy meme
# origine), lance recette-pilote2-offline.mjs dans un vrai Chromium, puis
# range derriere elle. Rejouable : chaque execution repart d'une base vierge,
# donc les comptages de ventes sont absolus, jamais relatifs a un etat herite.
#
# Prerequis :
#   - PostgreSQL joignable (DB_* ci-dessous ; defaut : 127.0.0.1/julaba_user/test) ;
#   - builds presents : `npm run build -w backend` et `npm run build -w frontend_src`
#     (le script les lance si dist/ manquent) ;
#   - playwright-core + un binaire Chromium (CHROMIUM_BIN).
#
# La base est la SOURCE DE VERITE : toutes les assertions financieres du
# script navigateur sont des requetes SQL, jamais des lectures d'API ni des
# textes a l'ecran. Un ecran peut mentir par cache ; la base, non.
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
E2E="$ROOT/frontend_src/e2e"
OUT="${RECETTE_OUT:-/tmp/recette-pilote2}"
mkdir -p "$OUT"

export DB_HOST="${DB_HOST:-127.0.0.1}" DB_PORT="${DB_PORT:-5432}"
export DB_USERNAME="${DB_USERNAME:-julaba_user}" DB_PASSWORD="${DB_PASSWORD:-test}"
export DB_NAME="${DB_NAME:-julaba_pilote2}"
PGA=(-h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME")

log() { printf '== %s\n' "$*"; }

nettoyer() {
  for p in backend proxy; do
    if [ -f "$OUT/$p.pid" ]; then
      kill "$(cat "$OUT/$p.pid")" 2>/dev/null
      rm -f "$OUT/$p.pid"
    fi
  done
}
trap nettoyer EXIT

log "prerequis"
command -v psql >/dev/null 2>&1 || { echo "psql introuvable"; exit 1; }
PGPASSWORD="$DB_PASSWORD" pg_isready "${PGA[@]}" >/dev/null 2>&1 \
  || { echo "PostgreSQL injoignable sur $DB_HOST:$DB_PORT — demarrer une base avant."; exit 1; }

[ -f "$ROOT/backend/dist/main.js" ] || npm run build -w backend --prefix "$ROOT" >"$OUT/build-backend.log" 2>&1
[ -f "$ROOT/frontend/dist/index.html" ] || npm run build -w frontend_src --prefix "$ROOT" >"$OUT/build-front.log" 2>&1
[ -f "$ROOT/backend/dist/main.js" ] || { echo "build backend absent — voir $OUT/build-backend.log"; exit 1; }
[ -f "$ROOT/frontend/dist/index.html" ] || { echo "build frontend absent — voir $OUT/build-front.log"; exit 1; }

log "base fraiche $DB_NAME"
PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME WITH (FORCE);" >/dev/null 2>&1
PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d postgres -c "CREATE DATABASE $DB_NAME;" >/dev/null 2>&1 \
  || { echo "creation de la base impossible"; exit 1; }

log "backend (synchronize + seed de demonstration)"
(
  cd "$ROOT/backend"
  DB_SYNCHRONIZE=true DB_LOGGING=false NODE_ENV=development PORT=3000 \
  JWT_SECRET=recette_local JWT_EXPIRES_IN=1d PIN_ENCRYPTION_KEY=recette_pin_key_32_chars_padding_x \
  REFRESH_TOKEN_SALT=recette_salt SEED_DEMO=true SEED_DEMO_PASSWORD=1234 THROTTLE_DISABLED=true \
  node dist/main.js >"$OUT/backend.log" 2>&1 &
  echo $! >"$OUT/backend.pid"
)
curl -sS --retry 90 --retry-all-errors --retry-delay 2 -m 200 http://127.0.0.1:3000/api/v1/health >/dev/null 2>&1 \
  || { echo "backend KO"; tail -30 "$OUT/backend.log"; exit 1; }
log "backend en ligne"

# Le seed de demonstration tourne EN ARRIERE-PLAN apres l'ouverture du port
# (voir backend/src/main.ts) : /health repond avant que les comptes existent.
# On attend la connexion elle-meme.
for _ in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:3000/api/v1/auth/login \
    -H 'Content-Type: application/json' -d '{"phone":"+2250700000009","password":"1234"}')
  [ "$code" = "200" ] && break
  sleep 2
done
[ "$code" = "200" ] || { echo "seed de demonstration absent (login -> $code)"; tail -30 "$OUT/backend.log"; exit 1; }
log "comptes de demonstration prets"

log "proxy meme origine :4180"
( node "$E2E/proxy.mjs" "$ROOT/frontend/dist" 4180 http://127.0.0.1:3000 >"$OUT/proxy.log" 2>&1 & echo $! >"$OUT/proxy.pid" )
curl -sS --retry 30 --retry-all-errors --retry-delay 1 -m 40 -o /dev/null http://127.0.0.1:4180/ 2>/dev/null \
  || { echo "proxy KO"; tail -20 "$OUT/proxy.log"; exit 1; }
log "proxy en ligne"

# Le repertoire du binaire Chromium porte un numero de build qui change avec
# la version de Playwright : on le detecte plutot que de le figer.
if [ -z "${CHROMIUM_BIN:-}" ]; then
  CHROMIUM_BIN="$(ls -d /opt/pw-browsers/chromium*/chrome-linux/chrome 2>/dev/null | head -1)"
fi
[ -x "${CHROMIUM_BIN:-}" ] || { echo "Chromium introuvable — definir CHROMIUM_BIN."; exit 1; }
export CHROMIUM_BIN

log "navigateur — recette PILOTE-2"
RECETTE_OUT="$OUT" RECETTE_BASE="http://127.0.0.1:4180" \
  node "$E2E/recette-pilote2-offline.mjs"
CODE=$?

echo
log "captures d'ecran : $OUT"
log "journal backend : $OUT/backend.log"
exit $CODE
