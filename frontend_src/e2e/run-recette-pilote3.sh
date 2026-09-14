#!/usr/bin/env bash
# Orchestration de la recette PILOTE-3 — catalogue Odoo branché dans JULABA.
#
# DEUX PHASES, et le basculement entre les deux EST la démonstration :
#
#   phase A — Odoo joignable : on synchronise le référentiel, deux fois, et on
#             vérifie que le second passage ne duplique rien ;
#   phase B — Odoo INJOIGNABLE : le backend redémarre avec
#             `ODOO_CLIENT_MODE=real` pointant vers un port mort, et tout le
#             reste doit continuer — consulter le référentiel, adopter,
#             VENDRE. Une vente qui passe alors qu'Odoo ne répond pas est la
#             meilleure preuve qu'aucune écriture ne part vers lui : il n'y a
#             personne au bout du fil.
#
# Prérequis : PostgreSQL joignable, builds backend et frontend, Chromium.
#
# Contre le VRAI Odoo du POC (198 références), lancer avec :
#   ODOO_REEL=1 ODOO_BASE_URL=http://127.0.0.1:8070 ODOO_API_KEY=<clé> \
#   REFERENCES_ATTENDUES=198 REF_CODE=VIV-TUB-001 REF_NOM="Igname Kponan" \
#   bash frontend_src/e2e/run-recette-pilote3.sh
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
E2E="$ROOT/frontend_src/e2e"
OUT="${RECETTE_OUT:-/tmp/recette-pilote3}"
mkdir -p "$OUT"

export DB_HOST="${DB_HOST:-127.0.0.1}" DB_PORT="${DB_PORT:-5432}"
export DB_USERNAME="${DB_USERNAME:-julaba_user}" DB_PASSWORD="${DB_PASSWORD:-test}"
export DB_NAME="${DB_NAME:-julaba_pilote3}"
export REFERENCES_ATTENDUES="${REFERENCES_ATTENDUES:-8}"
export REF_CODE="${REF_CODE:-CAR-001}" REF_NOM="${REF_NOM:-Carotte}"
PGA=(-h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME")

SECRETS=(JWT_SECRET=p3_local JWT_EXPIRES_IN=1d PIN_ENCRYPTION_KEY=p3_pin_key_32_chars_padding_xxxxx
         REFRESH_TOKEN_SALT=p3_salt SEED_DEMO=true SEED_DEMO_PASSWORD=1234 THROTTLE_DISABLED=true)

log()  { printf '== %s\n' "$*"; }
pass() { printf '  OK %s\n' "$*"; }
die()  { printf 'NO-GO — %s\n' "$*" >&2; exit 1; }

arreter_backend() {
  if [ -f "$OUT/backend.pid" ]; then
    kill "$(cat "$OUT/backend.pid")" 2>/dev/null
    rm -f "$OUT/backend.pid"
    sleep 3
  fi
}
nettoyer() {
  arreter_backend
  [ -f "$OUT/proxy.pid" ] && { kill "$(cat "$OUT/proxy.pid")" 2>/dev/null; rm -f "$OUT/proxy.pid"; }
}
trap nettoyer EXIT

demarrer_backend() {
  # $@ : variables d'environnement Odoo propres à la phase.
  ( cd "$ROOT/backend"
    env DB_SYNCHRONIZE=true DB_LOGGING=false NODE_ENV=development PORT=3000 \
        "${SECRETS[@]}" "$@" node dist/main.js >>"$OUT/backend.log" 2>&1 &
    echo $! >"$OUT/backend.pid" )
  curl -sS --retry 90 --retry-all-errors --retry-delay 2 -m 200 \
    http://127.0.0.1:3000/api/v1/health >/dev/null 2>&1 || { tail -30 "$OUT/backend.log"; die "backend KO"; }
  for _ in $(seq 1 60); do
    code=$(curl -s -o /dev/null -w '%{http_code}' -X POST http://127.0.0.1:3000/api/v1/auth/login \
      -H 'Content-Type: application/json' -d '{"phone":"+2250700000009","password":"1234"}')
    [ "$code" = "200" ] && break
    sleep 2
  done
  [ "$code" = "200" ] || die "comptes de démonstration absents (login -> $code)"
}

jeton_admin() {
  curl -s -X POST http://127.0.0.1:3000/api/v1/auth/login -H 'Content-Type: application/json' \
    -d '{"phone":"+2250700000016","password":"123456"}' \
    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("accessToken",""))'
}

log "prérequis"
PGPASSWORD="$DB_PASSWORD" pg_isready "${PGA[@]}" >/dev/null 2>&1 || die "PostgreSQL injoignable"
[ -f "$ROOT/backend/dist/main.js" ] || npm run build -w backend --prefix "$ROOT" >"$OUT/build-backend.log" 2>&1
[ -f "$ROOT/frontend/dist/index.html" ] || npm run build -w frontend_src --prefix "$ROOT" >"$OUT/build-front.log" 2>&1
[ -f "$ROOT/backend/dist/main.js" ] || die "build backend absent"
[ -f "$ROOT/frontend/dist/index.html" ] || die "build frontend absent"

log "base fraîche $DB_NAME"
PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME WITH (FORCE);" >/dev/null 2>&1
PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d postgres -c "CREATE DATABASE $DB_NAME;" >/dev/null 2>&1 || die "création de base impossible"
: >"$OUT/backend.log"

# ── PHASE A — Odoo joignable ──────────────────────────────────────────────
log "PHASE A — Odoo joignable : synchronisation du référentiel"
if [ "${ODOO_REEL:-0}" = "1" ]; then
  demarrer_backend ODOO_CLIENT_MODE=real "ODOO_BASE_URL=${ODOO_BASE_URL:?ODOO_BASE_URL requis avec ODOO_REEL=1}" \
                   "ODOO_API_KEY=${ODOO_API_KEY:?ODOO_API_KEY requis avec ODOO_REEL=1}" ODOO_REAL_WRITE_ENABLED=false
else
  # Client simulé : la synchronisation est réelle, la source ne l'est pas.
  demarrer_backend ODOO_CLIENT_MODE=mock
fi
ADM=$(jeton_admin)

S1=$(curl -s -X POST http://127.0.0.1:3000/api/v1/catalogue-maitre/synchroniser -H "Authorization: Bearer $ADM")
S2=$(curl -s -X POST http://127.0.0.1:3000/api/v1/catalogue-maitre/synchroniser -H "Authorization: Bearer $ADM")
echo "  1re synchro : $S1"
echo "  2e  synchro : $S2"

python3 - "$S1" "$S2" "$REFERENCES_ATTENDUES" <<'PY' || exit 1
import json, sys
s1, s2, attendues = json.loads(sys.argv[1]), json.loads(sys.argv[2]), int(sys.argv[3])
def echec(m):
    print(f"NO-GO — {m}", file=sys.stderr); sys.exit(1)
if s1.get("lues") != attendues:
    echec(f"{s1.get('lues')} références lues depuis Odoo au lieu de {attendues}.")
if s1.get("creees") != attendues:
    echec(f"{s1.get('creees')} créées au premier passage au lieu de {attendues}.")
# LA propriété d'un import : rejoué, il ne duplique rien.
if s2.get("creees") != 0 or s2.get("majs") != attendues:
    echec(f"second passage non idempotent : {s2}.")
if s2.get("desactivees") != 0:
    echec(f"second passage : {s2.get('desactivees')} désactivée(s) alors que rien n'a disparu.")
print(f"  OK {attendues} références synchronisées, rejeu sans duplication (0 créée, {attendues} mises à jour).")
PY

REEL=$(PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d "$DB_NAME" -tAc "select count(*) from catalogue_maitre where actif;")
[ "$REEL" = "$REFERENCES_ATTENDUES" ] || die "miroir : $REEL références actives en base au lieu de $REFERENCES_ATTENDUES"
pass "miroir Postgres : $REEL références actives (arbitrage base)"

PRIX=$(PGPASSWORD="$DB_PASSWORD" psql "${PGA[@]}" -d "$DB_NAME" -tAc \
  "select count(*) from information_schema.columns where table_name='catalogue_maitre' and (column_name ilike '%prix%' or column_name ilike '%price%' or column_name ilike '%stock%');")
[ "$PRIX" = "0" ] || die "la table catalogue_maitre porte $PRIX colonne(s) de prix ou de stock — une référence pourrait devenir vendable"
pass "le référentiel ne porte ni prix ni stock (0 colonne)"

# ── PHASE B — Odoo injoignable ────────────────────────────────────────────
log "PHASE B — on ÉTEINT Odoo : redémarrage vers un port mort"
arreter_backend
# Port 9 (discard) : rien n'écoute jamais. `ODOO_CLIENT_MODE=real` est bien
# actif — le backend CROIT parler à un vrai Odoo, et se casse le nez.
demarrer_backend ODOO_CLIENT_MODE=real ODOO_BASE_URL=http://127.0.0.1:9 \
                 ODOO_API_KEY=cle-sans-destinataire ODOO_REAL_WRITE_ENABLED=false ODOO_REAL_TIMEOUT_MS=2000
pass "backend redémarré, Odoo injoignable"

log "proxy même origine :4180"
if [ ! -f "$OUT/proxy.pid" ]; then
  ( node "$E2E/proxy.mjs" "$ROOT/frontend/dist" 4180 http://127.0.0.1:3000 >"$OUT/proxy.log" 2>&1 & echo $! >"$OUT/proxy.pid" )
  curl -sS --retry 30 --retry-all-errors --retry-delay 1 -m 40 -o /dev/null http://127.0.0.1:4180/ 2>/dev/null || die "proxy KO"
fi
pass "proxy en ligne"

if [ -z "${CHROMIUM_BIN:-}" ]; then
  CHROMIUM_BIN="$(ls -d /opt/pw-browsers/chromium*/chrome-linux/chrome 2>/dev/null | head -1)"
fi
[ -x "${CHROMIUM_BIN:-}" ] || die "Chromium introuvable — définir CHROMIUM_BIN"
export CHROMIUM_BIN

log "navigateur — recette PILOTE-3 (Odoo éteint)"
RECETTE_OUT="$OUT" RECETTE_BASE="http://127.0.0.1:4180" node "$E2E/recette-pilote3-catalogue.mjs"
CODE=$?

echo
log "captures : $OUT"
log "journal backend : $OUT/backend.log"
exit $CODE
