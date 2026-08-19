#!/usr/bin/env bash
# Recette runtime — programme de FIDÉLITÉ marchand, de bout en bout, dans un
# vrai navigateur contre la vraie stack. Rejouable.
#
# Prérequis :
#   - PostgreSQL joignable (DB_* ci-dessous ; défaut : localhost/julaba_user/test) ;
#   - builds présents : `npm run build -w backend` et `npm run build -w frontend_src`
#     (le script les lance si dist/ manquent) ;
#   - playwright-core (devDependency) + un binaire Chromium (CHROMIUM_BIN).
#
# La DB est la SOURCE DE VÉRITÉ pour l'arbitrage final (barème persisté, solde
# de points du client, journal fidelite_evenements) — pas la seule lecture API
# du navigateur. Même patron que run-recette.sh (caisse espèces).
set +e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
E2E="$ROOT/frontend_src/e2e"
OUT="${RECETTE_OUT:-/tmp/recette-fidelite}"; mkdir -p "$OUT"

export DB_HOST="${DB_HOST:-localhost}" DB_PORT="${DB_PORT:-5432}"
export DB_USERNAME="${DB_USERNAME:-julaba_user}" DB_PASSWORD="${DB_PASSWORD:-test}"
DB_RECETTE="${DB_RECETTE:-julaba_recette_fidelite}"
PGA=(-h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME")

echo "== builds =="
[ -f "$ROOT/backend/dist/main.js" ] || npm run build -w backend --prefix "$ROOT" >/dev/null 2>&1
[ -f "$ROOT/frontend/dist/index.html" ] || npm run build -w frontend_src --prefix "$ROOT" >/dev/null 2>&1

echo "== base fraîche $DB_RECETTE =="
PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d postgres -c "DROP DATABASE IF EXISTS $DB_RECETTE;" >/dev/null 2>&1
PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d postgres -c "CREATE DATABASE $DB_RECETTE;" >/dev/null 2>&1

# Ports DÉDIÉS (3017/4197, hors 3000/4180) : l'environnement peut avoir un
# AUTRE agent qui fait tourner sa PROPRE recette (backend :3000) en parallèle
# — on évite délibérément la collision plutôt que de la découvrir en EADDRINUSE.
BACKEND_PORT="${BACKEND_PORT:-3017}"
PROXY_PORT="${PROXY_PORT:-4197}"

echo "== backend (synchronize + seed) sur :$BACKEND_PORT =="
( cd "$ROOT/backend"
  DB_NAME="$DB_RECETTE" DB_SYNCHRONIZE=true DB_LOGGING=false NODE_ENV=development PORT=$BACKEND_PORT \
  JWT_SECRET=recette_local JWT_EXPIRES_IN=1d PIN_ENCRYPTION_KEY=recette_pin_key_32_chars_padding_x \
  REFRESH_TOKEN_SALT=recette_salt SEED_DEMO=true SEED_DEMO_PASSWORD=1234 THROTTLE_DISABLED=true \
  node dist/main.js > "$OUT/backend.log" 2>&1 & echo $! > "$OUT/backend.pid" )
curl -sS --retry 60 --retry-all-errors --retry-delay 2 -m 180 "http://localhost:$BACKEND_PORT/api/v1/health" >/dev/null 2>&1 \
  && echo "backend up" || { echo "backend KO"; tail -20 "$OUT/backend.log"; }

# DbInit (crée fidelite_config/fidelite_clients, tables « plates » en SQL brut)
# tourne en ARRIÈRE-PLAN APRÈS le bind du port (cf. main.ts) : /health répond
# AVANT que ces tables existent. On attend le marqueur de fin dans le log,
# plutôt que de deviner un délai — sinon la 1ʳᵉ requête fidélité peut échouer
# sur une table encore absente.
echo "== attente DbInit (tables fidelite_*) =="
for i in $(seq 1 60); do
  grep -q "Initialisation base terminée" "$OUT/backend.log" 2>/dev/null && { echo "DbInit terminé"; break; }
  sleep 1
done

echo "== proxy :$PROXY_PORT =="
( node "$E2E/proxy.mjs" "$ROOT/frontend/dist" "$PROXY_PORT" "http://localhost:$BACKEND_PORT" > "$OUT/proxy.log" 2>&1 & echo $! > "$OUT/proxy.pid" )
curl -sS --retry 20 --retry-all-errors --retry-delay 1 -m 30 -o /dev/null "http://localhost:$PROXY_PORT/" 2>/dev/null && echo "proxy up"

echo "== navigateur =="
RECETTE_OUT="$OUT" RECETTE_BASE="http://localhost:$PROXY_PORT" timeout 180 node "$E2E/recette-fidelite.mjs" 2>&1
NAV_STATUS=$?

echo "== ARBITRAGE DB (source de vérité) =="
PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d "$DB_RECETTE" -tAc \
  "SELECT 'config: actif='||actif||' points_par_cent='||points_par_cent||' seuil_points='||seuil_points||' recompense_fcfa='||recompense_fcfa FROM fidelite_config;" 2>&1
PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d "$DB_RECETTE" -tAc \
  "SELECT 'client: telephone='||telephone||' points='||points||' total_achats='||total_achats FROM fidelite_clients ORDER BY updated_at DESC LIMIT 1;" 2>&1
PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d "$DB_RECETTE" -tAc \
  "SELECT 'journal: '||count(*)||' événements ('||string_agg(DISTINCT type, ', ')||')' FROM fidelite_evenements;" 2>&1
PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d "$DB_RECETTE" -c \
  "SELECT type, points_delta, points_apres, montant_achat, remise_fcfa, created_at FROM fidelite_evenements ORDER BY created_at;" 2>&1

# teardown
[ -f "$OUT/backend.pid" ] && kill "$(cat "$OUT/backend.pid")" 2>/dev/null
[ -f "$OUT/proxy.pid" ] && kill "$(cat "$OUT/proxy.pid")" 2>/dev/null
PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d postgres -c "DROP DATABASE IF EXISTS $DB_RECETTE;" >/dev/null 2>&1
echo "== captures : $OUT/0*.png =="
ls "$OUT"/0*.png 2>/dev/null
exit $NAV_STATUS
