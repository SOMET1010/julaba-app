#!/usr/bin/env bash
# Recette runtime — paiement KEIWA d'une commande, de bout en bout, dans un
# vrai navigateur contre la vraie stack. Rejouable.
#
# Prérequis :
#   - PostgreSQL joignable (DB_* ci-dessous ; défaut : localhost/julaba_user/test) ;
#   - builds présents : `npm run build -w backend` et `npm run build -w frontend_src`
#     (le script les lance si dist/ manquent) ;
#   - playwright-core (devDependency) + un binaire Chromium (CHROMIUM_BIN).
#
# La DB est la SOURCE DE VÉRITÉ : les soldes wallet et le compte des écritures
# wallet_transactions sont arbitrés ici (psql), pas seulement lus à l'écran
# (qui peut être transitoirement en cache) — même discipline que
# run-recette.sh (boucle espèces).
set +e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
E2E="$ROOT/frontend_src/e2e"
OUT="${RECETTE_OUT:-/tmp/recette-keiwa}"; mkdir -p "$OUT"

export DB_HOST="${DB_HOST:-localhost}" DB_PORT="${DB_PORT:-5432}"
export DB_USERNAME="${DB_USERNAME:-julaba_user}" DB_PASSWORD="${DB_PASSWORD:-test}"
DB_RECETTE="${DB_RECETTE:-julaba_recette_keiwa}"
PGA=(-h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME")
SOLDE_INITIAL_ACHETEUR=50000

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

# Même précédent que run-recette.sh : base vierge → synchronize + DbInit (pas
# de migrations), or DbInit crée stock_mouvements SANS `type` (migration #19).
# Sans effet direct sur le paiement keiwa, mais le backend boot le module
# caisse au démarrage — on garde le même correctif pour rester sur un schéma
# cohérent avec la chaîne de migrations réelle.
PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d "$DB_RECETTE" -v ON_ERROR_STOP=1 >/dev/null 2>&1 <<'SQL'
ALTER TABLE stock_mouvements ADD COLUMN IF NOT EXISTS type varchar NOT NULL DEFAULT 'vente';
SQL

echo "== wallets acheteur/vendeur + publication (setup marché, hors périmètre) =="
ACHETEUR_ID=$(PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d "$DB_RECETTE" -tAc \
  "SELECT id FROM users WHERE phone = '+2250700000009'")
VENDEUR_ID=$(PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d "$DB_RECETTE" -tAc \
  "SELECT id FROM users WHERE phone = '+2250700000010'")
echo "acheteur=$ACHETEUR_ID vendeur=$VENDEUR_ID"

PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d "$DB_RECETTE" -v ON_ERROR_STOP=1 >/dev/null 2>&1 <<SQL
INSERT INTO wallets (user_id, solde, solde_bloque) VALUES ('$ACHETEUR_ID', $SOLDE_INITIAL_ACHETEUR, 0)
  ON CONFLICT (user_id) DO UPDATE SET solde = $SOLDE_INITIAL_ACHETEUR;
INSERT INTO wallets (user_id, solde, solde_bloque) VALUES ('$VENDEUR_ID', 0, 0)
  ON CONFLICT (user_id) DO UPDATE SET solde = 0;
SQL

PUBLICATION_ID=$(PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d "$DB_RECETTE" -tAc "
INSERT INTO publications
  (user_id, produit, culture, quantite_disponible, quantite_initiale, unite, prix_unitaire, qualite, localisation, active, statut, date_publication)
VALUES ('$VENDEUR_ID','MangueKeiwaRecette','MangueKeiwaRecette',100,100,'kg',500,'standard','Test',true,'disponible', NOW())
RETURNING id;" | head -n1)
echo "publication=$PUBLICATION_ID"

echo "== proxy :4180 =="
( node "$E2E/proxy.mjs" "$ROOT/frontend/dist" 4180 > "$OUT/proxy.log" 2>&1 & echo $! > "$OUT/proxy.pid" )
curl -sS --retry 20 --retry-all-errors --retry-delay 1 -m 30 -o /dev/null http://localhost:4180/ 2>/dev/null && echo "proxy up"

echo "== navigateur =="
RECETTE_OUT="$OUT" RECETTE_PUBLICATION_ID="$PUBLICATION_ID" timeout 180 node "$E2E/recette-keiwa-paiement-commande.mjs" 2>&1

echo "== ARBITRAGE DB (source de vérité) =="
PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d "$DB_RECETTE" -tAc \
  "SELECT 'solde_acheteur='||solde FROM wallets WHERE user_id='$ACHETEUR_ID';"
PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d "$DB_RECETTE" -tAc \
  "SELECT 'solde_vendeur='||solde FROM wallets WHERE user_id='$VENDEUR_ID';"
PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d "$DB_RECETTE" -tAc \
  "SELECT 'ecritures_wallet_pour_commande='||count(*) FROM wallet_transactions wt JOIN commandes c ON c.id = wt.related_entity_id WHERE c.produit = 'MangueKeiwaRecette';"
PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d "$DB_RECETTE" -tAc \
  "SELECT 'statut_paiement='||statut_paiement FROM commandes WHERE produit = 'MangueKeiwaRecette' ORDER BY created_at DESC LIMIT 1;"

# teardown
[ -f "$OUT/backend.pid" ] && kill "$(cat "$OUT/backend.pid")" 2>/dev/null
[ -f "$OUT/proxy.pid" ] && kill "$(cat "$OUT/proxy.pid")" 2>/dev/null
PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d postgres -c "DROP DATABASE IF EXISTS $DB_RECETTE;" >/dev/null 2>&1
echo "== captures : $OUT/0*.png =="
ls "$OUT"/0*.png 2>/dev/null
