#!/usr/bin/env bash
# Recette runtime — boucle ESPÈCES marchand, de bout en bout, dans un vrai
# navigateur contre la vraie stack. Rejouable.
#
# Prérequis :
#   - PostgreSQL joignable (DB_* ci-dessous ; défaut : localhost/julaba_user/test) ;
#   - builds présents : `npm run build -w backend` et `npm run build -w frontend_src`
#     (le script les lance si dist/ manquent) ;
#   - playwright-core (devDependency) + un binaire Chromium (CHROMIUM_BIN).
#
# La DB est la SOURCE DE VÉRITÉ : les assertions de stock/ledger post-annulation
# sont arbitrées ici (psql), pas par la lecture API du navigateur (qui peut
# renvoyer transitoirement null — artefact de harnais, pas un défaut produit).
set +e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
E2E="$ROOT/frontend_src/e2e"
OUT="${RECETTE_OUT:-/tmp/recette}"; mkdir -p "$OUT"

export DB_HOST="${DB_HOST:-localhost}" DB_PORT="${DB_PORT:-5432}"
export DB_USERNAME="${DB_USERNAME:-julaba_user}" DB_PASSWORD="${DB_PASSWORD:-test}"
DB_RECETTE="${DB_RECETTE:-julaba_recette}"
PGA=(-h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME")

echo "== builds =="
[ -f "$ROOT/backend/dist/main.js" ] || npm run build -w backend --prefix "$ROOT" >/dev/null 2>&1
[ -f "$ROOT/frontend/dist/index.html" ] || npm run build -w frontend_src --prefix "$ROOT" >/dev/null 2>&1

echo "== base fraîche $DB_RECETTE =="
PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d postgres -c "DROP DATABASE IF EXISTS $DB_RECETTE;" >/dev/null 2>&1
PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d postgres -c "CREATE DATABASE $DB_RECETTE;" >/dev/null 2>&1

echo "== backend (synchronize + seed) =="
( cd "$ROOT/backend"
  DB_NAME="$DB_RECETTE" DB_SYNCHRONIZE=true DB_LOGGING=false NODE_ENV=development PORT=3000 \
  JWT_SECRET=recette_local JWT_EXPIRES_IN=1d PIN_ENCRYPTION_KEY=recette_pin_key_32_chars_padding_x \
  REFRESH_TOKEN_SALT=recette_salt SEED_DEMO=true SEED_DEMO_PASSWORD=1234 THROTTLE_DISABLED=true \
  node dist/main.js > "$OUT/backend.log" 2>&1 & echo $! > "$OUT/backend.pid" )
curl -sS --retry 60 --retry-all-errors --retry-delay 2 -m 180 http://localhost:3000/api/v1/health >/dev/null 2>&1 \
  && echo "backend up" || { echo "backend KO"; tail -20 "$OUT/backend.log"; }

# La base recette est bootée VIERGE → synchronize + DbInit (pas de migrations, cf.
# main.ts). Or DbInit crée `stock_mouvements` SANS la colonne `type`, ajoutée
# APRÈS la bascule #10 par la seule migration autoritaire #19 (LedgerMouvementType).
# On applique ici son DDL forward — source de vérité = le fichier de migration, PAS
# DbInit — pour que la restitution d'annulation (INSERT ... type) fonctionne. Même
# précédent que le test invariant jest (LedgerMouvementType.up() en beforeAll).
PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d "$DB_RECETTE" -v ON_ERROR_STOP=1 >/dev/null 2>&1 <<'SQL'
ALTER TABLE stock_mouvements ADD COLUMN IF NOT EXISTS type varchar NOT NULL DEFAULT 'vente';
UPDATE stock_mouvements SET type = 'annulation' WHERE quantite_retranchee < 0;
SQL
echo "migration #19 (type) appliquée à $DB_RECETTE"

echo "== proxy :4180 =="
( node "$E2E/proxy.mjs" "$ROOT/frontend/dist" 4180 > "$OUT/proxy.log" 2>&1 & echo $! > "$OUT/proxy.pid" )
curl -sS --retry 20 --retry-all-errors --retry-delay 1 -m 30 -o /dev/null http://localhost:4180/ 2>/dev/null && echo "proxy up"

echo "== navigateur =="
RECETTE_OUT="$OUT" timeout 180 node "$E2E/recette-caisse-especes.mjs" 2>&1

echo "== ARBITRAGE DB (source de vérité) =="
PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d "$DB_RECETTE" -tAc \
  "SELECT 'net_ledger='||COALESCE(SUM(quantite_retranchee),0)||' mouvements='||count(*) FROM stock_mouvements;" 2>&1 | head -1
PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d "$DB_RECETTE" -tAc \
  "SELECT 'stock_final_'||nom||'='||stock FROM produits WHERE lower(nom)='tomate-recette';" 2>&1 | head -1

# teardown
[ -f "$OUT/backend.pid" ] && kill "$(cat "$OUT/backend.pid")" 2>/dev/null
[ -f "$OUT/proxy.pid" ] && kill "$(cat "$OUT/proxy.pid")" 2>/dev/null
PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d postgres -c "DROP DATABASE IF EXISTS $DB_RECETTE;" >/dev/null 2>&1
echo "== captures : $OUT/0*.png =="
ls "$OUT"/0*.png 2>/dev/null
