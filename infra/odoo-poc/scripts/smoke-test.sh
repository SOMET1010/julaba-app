#!/usr/bin/env bash
# Verification du contrat d'integration JULABA <-> Odoo 19, en LECTURE SEULE.
#
# Ce script ne prouve qu'une chose, mais il la prouve pour de vrai :
#   authentification par cle API + appel JSON-2 + forme de reponse
#   exploitable par le mapper JULABA.
#
# Il appelle exactement ce que `OdooRealClient.execute()` appellera :
#   POST {ODOO_BASE_URL}/json/2/product.product/search_read
#   Authorization: Bearer <cle>
#   corps = arguments NOMMES (jamais positionnels comme l'ancien execute_kw)
#
# Aucune ecriture : pas de create, pas de stock.move, pas de session de caisse.
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$PWD"

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
pass() { printf '\033[1;32m  OK\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31mECHEC\033[0m %s\n' "$*" >&2; exit 1; }

command -v curl >/dev/null 2>&1 || die "curl introuvable."
[ -f "$ROOT/.env" ] || die ".env absent. Lancer d'abord ./scripts/init.sh"

set -a
# shellcheck disable=SC1091
. "$ROOT/.env"
set +a

: "${ODOO_BASE_URL:=http://127.0.0.1:${ODOO_PORT:-8069}}"
: "${ODOO_SEND_DB_HEADER:=false}"
[ -n "${ODOO_API_KEY:-}" ] || die "ODOO_API_KEY vide dans .env. Lancer d'abord ./scripts/init.sh"

URL="${ODOO_BASE_URL}/json/2/product.product/search_read"

# L'en-tete de base n'est utile qu'en multi-base. La stack epingle dbfilter sur
# une seule base, donc il reste desactive par defaut.
DB_HEADER=()
if [ "$ODOO_SEND_DB_HEADER" = "true" ]; then
  DB_HEADER=(-H "X-Odoo-Database: ${ODOO_DB}")
fi

# Champs demandes = exactement ceux que consomme OdooProductRecord dans
# backend/src/odoo-gateway/produit-mapper.ts. Si l'un disparait, le mapper
# casse : c'est precisement ce que ce test doit detecter.
BODY='{"domain": [], "fields": ["id", "name", "list_price", "qty_available", "default_code"], "limit": 5, "order": "id asc"}'

# --- Test 1 : l'authentification est bien exigee ---------------------------
log "Test 1 — appel sans cle API (401 attendu)"
CODE_ANON="$(curl -sS -o /dev/null -w '%{http_code}' -X POST "$URL" \
  -H 'Content-Type: application/json' \
  "${DB_HEADER[@]}" \
  --data "$BODY" || true)"
[ "$CODE_ANON" = "401" ] || die "code $CODE_ANON recu au lieu de 401 : la route n'exige pas d'authentification."
pass "401 — l'acces anonyme est refuse."

# --- Test 2 : appel authentifie -------------------------------------------
log "Test 2 — search_read authentifie sur product.product"
RESPONSE_FILE="$(mktemp)"
trap 'rm -f "$RESPONSE_FILE"' EXIT
CODE="$(curl -sS -o "$RESPONSE_FILE" -w '%{http_code}' -X POST "$URL" \
  -H "Authorization: Bearer ${ODOO_API_KEY}" \
  -H 'Content-Type: application/json' \
  "${DB_HEADER[@]}" \
  --data "$BODY")"

if [ "$CODE" != "200" ]; then
  printf 'Reponse brute :\n'; cat "$RESPONSE_FILE"; printf '\n'
  die "code HTTP $CODE au lieu de 200."
fi
pass "200 — reponse JSON recue."

# --- Test 3 : la reponse alimente reellement le mapper JULABA --------------
log "Test 3 — conformite de la reponse au contrat OdooProductRecord"
python3 - "$RESPONSE_FILE" <<'PY'
import json, sys

# Miroir de OdooProductRecord (backend/src/odoo-gateway/produit-mapper.ts).
REQUIS = {"id": int, "name": str, "list_price": (int, float), "qty_available": (int, float)}
OPTIONNEL = {"default_code": (str, bool, type(None))}  # Odoo renvoie False quand vide

with open(sys.argv[1], encoding="utf-8") as f:
    data = json.load(f)

if not isinstance(data, list):
    sys.exit(f"ECHEC la reponse n'est pas une liste JSON mais {type(data).__name__} : {data!r}")
if not data:
    sys.exit("ECHEC aucun produit retourne. Base sans catalogue : relancer init.sh avec ODOO_WITH_DEMO=true, "
             "ou creer au moins un produit dans Odoo.")

for rec in data:
    for champ, attendu in REQUIS.items():
        if champ not in rec:
            sys.exit(f"ECHEC champ requis '{champ}' absent de l'enregistrement {rec!r}")
        if not isinstance(rec[champ], attendu) or isinstance(rec[champ], bool):
            sys.exit(f"ECHEC champ '{champ}' de type {type(rec[champ]).__name__} "
                     f"pour l'enregistrement id={rec.get('id')!r}")
    for champ, attendu in OPTIONNEL.items():
        if champ in rec and not isinstance(rec[champ], attendu):
            sys.exit(f"ECHEC champ '{champ}' de type inattendu {type(rec[champ]).__name__}")

print(f"  OK {len(data)} produit(s), tous conformes a OdooProductRecord.")
print()
print("  Projection par versJulaba() — ce que verrait le catalogue JULABA :")
print(f"  {'id JULABA':<14}{'nom':<34}{'prix':>10}{'stock':>9}  code")
for rec in data:
    code = rec.get("default_code")
    code = "" if code in (False, None) else code
    nom = rec["name"]
    nom = nom if len(nom) <= 32 else nom[:31] + "…"
    print(f"  {'odoo-' + str(rec['id']):<14}{nom:<34}{rec['list_price']:>10.2f}{rec['qty_available']:>9.2f}  {code}")
PY

cat <<EOF

--------------------------------------------------------------------
Contrat valide : authentification par cle API, appel JSON-2 a arguments
nommes, et reponse directement consommable par versJulaba().

Ce qui n'est PAS couvert, volontairement : aucune ecriture vers Odoo
(pas de create, pas de stock.move), aucune caisse JULABA, aucun credit,
aucun Mobile Money, aucune comptabilite.
--------------------------------------------------------------------
EOF
