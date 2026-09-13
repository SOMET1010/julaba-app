#!/usr/bin/env bash
# Test NEGATIF de la frontiere de devise.
#
# Le garde-fou XOF du Gateway (backend/src/odoo-gateway/produit-mapper.ts) est
# couvert par des tests unitaires. Ce qu'ils ne prouvent pas, c'est qu'une vraie
# instance Odoo puisse reellement produire le payload fautif, ni qu'on le
# detecte a la frontiere de lecture. C'est ce que fait ce script :
#
#   1. etat de reference : le catalogue est en XOF et le smoke test passe ;
#   2. bascule de la societe Odoo en devise etrangere (administration) ;
#   3. le smoke test doit alors ECHOUER, en nommant la devise ;
#   4. retour en XOF ;
#   5. le smoke test doit repasser.
#
# Un test negatif qui ne casse jamais ne prouve rien. Si l'etape 3 passe, c'est
# le garde-fou qui est decoratif, et ce script le dit.
#
# CE QUE CE SCRIPT NE FAIT PAS : il n'execute pas le backend NestJS. Il verifie
# la meme condition, sur les memes champs, au meme endroit de la chaine — mais
# la preuve que `OdooRealClient` + `versJulaba` refusent ce payload vit dans
# backend/test/unit/produit-mapper.spec.ts, et le bout-en-bout via les routes
# /odoo-poc/* reste le jalon decrit dans docs/ODOO-SMOKE-TEST-READONLY.md.
#
# La bascule de devise est une operation d'ADMINISTRATION, faite sous
# `odoo shell` avec les droits admin Odoo. Elle ne passe pas par
# OdooRealClient, n'elargit aucune allowlist, et ODOO_REAL_WRITE_ENABLED
# reste false.
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$PWD"

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
pass() { printf '\033[1;32m  OK\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31mECHEC\033[0m %s\n' "$*" >&2; exit 1; }

[ -f "$ROOT/.env" ] || die ".env absent. Lancer d'abord ./scripts/init.sh"

set -a
# shellcheck disable=SC1091
. "$ROOT/.env"
set +a

: "${ODOO_DB:?ODOO_DB absent du .env}"
: "${SEED_DEVISE:=XOF}"
DEVISE_ETRANGERE="${DEVISE_ETRANGERE:-USD}"

if [ "$SEED_DEVISE" = "$DEVISE_ETRANGERE" ]; then
  die "SEED_DEVISE et DEVISE_ETRANGERE valent toutes deux '$SEED_DEVISE' — le test ne prouverait rien."
fi

appliquer_devise() {
  docker compose exec -T -e SEED_DEVISE="$1" \
    odoo odoo shell -c /etc/odoo/odoo.conf -d "$ODOO_DB" --no-http --log-level=warn \
    < "$ROOT/scripts/seed_vivrier.py" > /tmp/seed-devise.log 2>&1 \
    || { cat /tmp/seed-devise.log >&2; die "bascule en $1 impossible."; }
  grep -q "SEED_DEVISE_APPLIQUEE=$1" /tmp/seed-devise.log \
    || { cat /tmp/seed-devise.log >&2; die "le seed n'a pas confirme la devise $1."; }
}

# Quoi qu'il arrive — echec, interruption — l'instance est remise en XOF.
# Laisser une instance de test en USD ferait echouer tous les passages suivants
# pour une raison sans rapport.
restaurer() {
  printf '\033[1;34m==>\033[0m Restauration de la devise %s\n' "$SEED_DEVISE"
  appliquer_devise "$SEED_DEVISE" || true
}
trap restaurer EXIT

# --- 1. Etat de reference --------------------------------------------------
log "Etape 1 — le smoke test passe en $SEED_DEVISE"
appliquer_devise "$SEED_DEVISE"
"$ROOT/scripts/smoke-test.sh" > /tmp/smoke-avant.log 2>&1 \
  || { cat /tmp/smoke-avant.log >&2; die "le smoke test echoue deja en $SEED_DEVISE — corriger cela d'abord."; }
pass "etat de reference sain."

# --- 2. Bascule en devise etrangere ---------------------------------------
log "Etape 2 — bascule de la societe Odoo en $DEVISE_ETRANGERE"
appliquer_devise "$DEVISE_ETRANGERE"
pass "instance basculee."

# --- 3. Le refus doit avoir lieu ------------------------------------------
log "Etape 3 — le smoke test DOIT echouer"
if "$ROOT/scripts/smoke-test.sh" > /tmp/smoke-pendant.log 2>&1; then
  cat /tmp/smoke-pendant.log >&2
  die "le smoke test est passe alors que le catalogue est en $DEVISE_ETRANGERE. \
Le garde-fou de devise est inoperant : des prix faux atteindraient le catalogue JULABA."
fi

if ! grep -q "$DEVISE_ETRANGERE" /tmp/smoke-pendant.log; then
  cat /tmp/smoke-pendant.log >&2
  die "le smoke test a echoue, mais sans nommer la devise $DEVISE_ETRANGERE — \
l'echec vient probablement d'autre chose, ce qui ne prouverait rien."
fi
pass "refus constate, et la devise fautive est nommee :"
grep -m1 "ECHEC" /tmp/smoke-pendant.log | sed 's/^/       /'

# --- 4 et 5. Retour a la normale ------------------------------------------
log "Etape 4 — retour en $SEED_DEVISE"
appliquer_devise "$SEED_DEVISE"
trap - EXIT

log "Etape 5 — le smoke test repasse"
"$ROOT/scripts/smoke-test.sh" > /tmp/smoke-apres.log 2>&1 \
  || { cat /tmp/smoke-apres.log >&2; die "le smoke test ne repasse pas apres restauration en $SEED_DEVISE."; }
pass "instance revenue a l'etat de reference."

cat <<EOF

--------------------------------------------------------------------
Garde-fou de devise DEMONTRE sur instance reelle.

Une societe Odoo en $DEVISE_ETRANGERE produit bien un catalogue que la frontiere
de lecture refuse, en nommant la devise. Remise en $SEED_DEVISE, la chaine
repasse au vert. Le garde-fou n'est pas decoratif.

Rappel de frontiere : la bascule de devise est une operation d'administration
de l'instance de test. ODOO_REAL_WRITE_ENABLED reste false et l'allowlist
JSON-2 du Gateway est inchangee.
--------------------------------------------------------------------
EOF
