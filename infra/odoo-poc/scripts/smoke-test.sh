#!/usr/bin/env bash
# Verification du contrat d'integration JULABA <-> Odoo 19, en LECTURE SEULE.
#
# Ce script ne prouve qu'une chose, mais il la prouve pour de vrai :
#   authentification par cle API + appel JSON-2 + forme de reponse
#   exploitable par le mapper JULABA.
#
# Il appelle exactement ce qu'appelle `OdooRealClient.execute()` :
#   POST {ODOO_BASE_URL}/json/2/product.product/search_read
#   POST {ODOO_BASE_URL}/json/2/product.product/read
#   Authorization: Bearer <cle>
#   corps = arguments NOMMES (jamais positionnels comme l'ancien execute_kw)
#
# Ces deux combinaisons model/method sont exactement l'allowlist de lecture
# d'OdooRealClient (backend/src/odoo-gateway/odoo-real.client.ts) : tout le
# reste est refuse cote client tant que ODOO_REAL_WRITE_ENABLED n'est pas true,
# et ce script ne sort pas de ce perimetre.
#
# Aucune ecriture : pas de create, pas de stock.move, pas de session de caisse,
# aucun autre endpoint.
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
READ_FILE="$(mktemp)"
trap 'rm -f "$RESPONSE_FILE" "$READ_FILE"' EXIT
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

# --- Test 4 : product.product/read, seconde methode de l'allowlist ---------
log "Test 4 — read authentifie sur un produit issu du search_read"

# On repart d'un produit reellement retourne par le search_read : l'identifiant
# n'est jamais code en dur, et la valeur lue sert de reference de coherence.
REFERENCE="$(python3 - "$RESPONSE_FILE" <<'PY'
import json, sys
with open(sys.argv[1], encoding="utf-8") as f:
    produits = json.load(f)
p = produits[0]
# Format brut "id<TAB>qty_available" : simple a relire cote shell.
print(f"{p['id']}\t{p['qty_available']!r}")
PY
)"
PRODUCT_ID="${REFERENCE%%$'\t'*}"
QTY_REFERENCE="${REFERENCE##*$'\t'}"

# La cle nommee `ids` est ce qui designe les enregistrements sur une methode de
# recordset en JSON-2. Verifie dans les tests officiels d'Odoo 19
# (odoo/addons/test_http/tests/test_webjson2.py) : un `read` sans `ids` renvoie
# `[]`, et un `create` avec `ids` est refuse par "cannot call ... with ids".
READ_BODY="{\"ids\": [${PRODUCT_ID}], \"fields\": [\"id\", \"name\", \"qty_available\"]}"

CODE_READ="$(curl -sS -o "$READ_FILE" -w '%{http_code}' -X POST \
  "${ODOO_BASE_URL}/json/2/product.product/read" \
  -H "Authorization: Bearer ${ODOO_API_KEY}" \
  -H 'Content-Type: application/json' \
  "${DB_HEADER[@]}" \
  --data "$READ_BODY")"

if [ "$CODE_READ" != "200" ]; then
  printf 'Reponse brute :\n'; cat "$READ_FILE"; printf '\n'
  die "read : code HTTP $CODE_READ au lieu de 200."
fi
pass "200 — reponse JSON recue pour product.product/read."

python3 - "$READ_FILE" "$PRODUCT_ID" "$QTY_REFERENCE" <<'PY'
import json, sys

chemin, attendu_id, attendu_qty = sys.argv[1], int(sys.argv[2]), float(sys.argv[3])

with open(chemin, encoding="utf-8") as f:
    data = json.load(f)

if not isinstance(data, list):
    sys.exit(f"ECHEC read : reponse de type {type(data).__name__} au lieu d'une liste : {data!r}")
if len(data) != 1:
    sys.exit(f"ECHEC read : {len(data)} enregistrement(s) retourne(s) pour un seul id demande.")

rec = data[0]
if rec.get("id") != attendu_id:
    sys.exit(f"ECHEC read : id {rec.get('id')!r} retourne au lieu de {attendu_id}.")
if "qty_available" not in rec:
    sys.exit(f"ECHEC read : champ 'qty_available' absent de la reponse {rec!r}")
qty = rec["qty_available"]
if isinstance(qty, bool) or not isinstance(qty, (int, float)):
    sys.exit(f"ECHEC read : 'qty_available' de type {type(qty).__name__} ({qty!r}).")
# Meme source de verite des deux cotes : un ecart signalerait une incoherence
# entre les deux methodes de lecture, pas un arrondi.
if abs(float(qty) - attendu_qty) > 1e-9:
    sys.exit(f"ECHEC read : qty_available = {qty!r} alors que search_read annonce {attendu_qty!r} "
             f"pour le produit id={attendu_id}.")

print(f"  OK produit id={attendu_id} — qty_available = {qty!r}, identique au search_read.")
PY

cat <<EOF

--------------------------------------------------------------------
Contrat valide : authentification par cle API, appels JSON-2 a arguments
nommes sur les DEUX lectures de l'allowlist (search_read et read), et
reponse directement consommable par versJulaba().

Ce qui n'est PAS couvert, volontairement : aucune ecriture vers Odoo
(pas de create, pas de stock.move), aucun autre endpoint, aucune caisse
JULABA, aucun credit, aucun Mobile Money, aucune comptabilite.
ODOO_REAL_WRITE_ENABLED doit rester false.
--------------------------------------------------------------------
EOF

