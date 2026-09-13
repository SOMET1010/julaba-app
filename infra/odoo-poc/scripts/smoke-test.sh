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
# `currency_id` est demande au meme titre que le prix : `list_price` est un
# nombre sans unite, et le Gateway JULABA refuse de le mapper tant que la devise
# n'est pas prouvee etre du XOF (backend/src/odoo-gateway/produit-mapper.ts).
# `sale_ok` est demande pour la meme raison : `estVendable()` (produit-mapper.ts)
# ecarte tout produit a sale_ok=false AVANT le mapping (ex. « Tips », cree par
# point_of_sale) — voir infra/odoo-poc/README.md. Ce script demande donc
# exactement les memes champs que `listerCatalogue()`.
#
# AUCUNE `limit`, volontairement, et pour deux raisons.
#
# 1. Fidelite : `listerCatalogue()` n'en impose pas. Un plafond ici testerait
#    autre chose que ce que le Gateway fait reellement.
# 2. Justesse : les modules installes creent leurs propres produits, meme sans
#    donnees de demonstration. Les produits seedes etant crees en dernier, ils
#    portent les identifiants les plus hauts ; avec `order: "id asc"` et un
#    plafond, ils sortiraient de la fenetre. Le controle des prix ne verrait
#    alors aucune reference JULABA et se sauterait lui-meme — un smoke test
#    vert sur un seed qui n'a jamais tourne. Une fenetre partielle produirait
#    l'echec inverse, tout aussi faux : « reference absente » alors que le seed
#    est correct.
#
# Sans plafond, « absent » veut vraiment dire absent, et « present » veut dire
# que les sept references ont ete vues. L'instance est un POC : lire tout le
# catalogue ne coute rien.
BODY='{"domain": [], "fields": ["id", "name", "list_price", "qty_available", "default_code", "currency_id", "sale_ok"], "order": "id asc"}'

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
log "Test 3 — conformite OdooProductRecord et devise XOF"
python3 - "$RESPONSE_FILE" <<'PY'
import json, sys

# Miroir de OdooProductRecord (backend/src/odoo-gateway/produit-mapper.ts).
REQUIS = {"id": int, "name": str, "list_price": (int, float), "qty_available": (int, float)}
OPTIONNEL = {
    "default_code": (str, bool, type(None)),  # Odoo renvoie False quand vide
    "sale_ok": (bool,),  # champ standard Odoo, ne devrait jamais etre absent
}
DEVISE_JULABA = "XOF"

# Catalogue vivrier pose par scripts/seed_vivrier.py : reference -> (prix, stock).
# Les trois premieres valeurs sont celles que JULABA seede deja cote backend.
ATTENDU = {
    "JULABA-TOMATE": (200.0, 50.0),
    "JULABA-BANANE": (100.0, 40.0),
    "JULABA-RIZ-SAC": (15000.0, 10.0),
    "JULABA-MANIOC": (200.0, 60.0),
    "JULABA-IGNAME": (400.0, 35.0),
    "JULABA-PLANTAIN": (800.0, 25.0),
    "JULABA-HUILE-PALME": (1500.0, 20.0),
}

with open(sys.argv[1], encoding="utf-8") as f:
    data = json.load(f)

if not isinstance(data, list):
    sys.exit(f"ECHEC la reponse n'est pas une liste JSON mais {type(data).__name__} : {data!r}")
if not data:
    sys.exit("ECHEC aucun produit retourne. Relancer ./scripts/init.sh, qui seede le catalogue vivrier.")

def devise_de(rec):
    """Un many2one Odoo se lit [id, display_name] ; pour res.currency le nom EST
    le code ISO. Meme extraction que deviseDe() cote Gateway."""
    v = rec.get("currency_id")
    return v[1] if isinstance(v, list) and len(v) == 2 else None

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

    # Le controle qui compte : un prix sans devise prouvee est un chiffre sans
    # signification. Le Gateway refuserait ce catalogue entier (502).
    devise = devise_de(rec)
    if devise is None:
        sys.exit(f"ECHEC produit id={rec.get('id')} : 'currency_id' absent ou vide. "
                 f"Le Gateway JULABA refuse un prix dont la devise est inconnue.")
    if devise != DEVISE_JULABA:
        sys.exit(f"ECHEC produit id={rec.get('id')} : prix libelle en {devise}, "
                 f"or JULABA n'affiche que des montants en {DEVISE_JULABA}. "
                 f"Le Gateway refuserait ce catalogue (502). "
                 f"Verifier la devise de la societe Odoo (SEED_DEVISE).")

print(f"  OK {len(data)} produit(s) conformes a OdooProductRecord, tous en {DEVISE_JULABA}.")

# Reserve laissee ouverte par le filtre estVendable() (backend/src/odoo-gateway/
# produit-mapper.ts, voir infra/odoo-poc/README.md) : jamais verifie contre une
# vraie instance que le produit technique "Tips" (cree par point_of_sale) porte
# reellement sale_ok=false. INFORMATIF seulement — ce n'est pas un ECHEC du
# smoke test si l'hypothese s'avere fausse, c'est justement la question a
# trancher ici : le Gateway devrait alors ajouter un second critere.
tips = next((r for r in data if r.get("default_code") == "TIPS" or r.get("name") == "Tips"), None)
if tips is None:
    print("  -- aucun produit 'Tips' (default_code=TIPS) dans le catalogue : "
          "reserve sale_ok non tranchee par ce run (point_of_sale absent ou non installe ?).")
elif tips.get("sale_ok") is False:
    print(f"  OK reserve tranchee : Tips (id={tips['id']}) a bien sale_ok=false — "
          f"estVendable() l'exclurait correctement du catalogue JULABA.")
else:
    print(f"  ATTENTION reserve NON confirmee : Tips (id={tips['id']}) a sale_ok={tips.get('sale_ok')!r}, "
          f"pas False. estVendable() (produit-mapper.ts) ne l'exclurait PAS du catalogue JULABA — "
          f"un second critere de filtrage est necessaire.")

# Prix et stocks du catalogue vivrier, au franc pres. Verifies seulement si le
# seed est present : le script reste utilisable sur une instance seedee
# autrement, sans se transformer en faux echec.
trouves = {r.get("default_code"): r for r in data if r.get("default_code") in ATTENDU}
if not trouves:
    # Le search_read n'est pas plafonne : si aucune reference n'apparait ici,
    # elles ne sont reellement pas dans l'instance — ce n'est pas un effet de
    # fenetre. Le script reste utilisable sur une instance seedee autrement,
    # d'ou un saut plutot qu'un echec, mais le message doit le dire clairement.
    print("  -- aucune reference JULABA-* dans le catalogue complet : verification des prix sautee.")
    print("     Si ./scripts/init.sh vient de tourner, c'est anormal : le seed n'a pas pris.")
else:
    for reference, (prix, stock) in sorted(ATTENDU.items()):
        rec = trouves.get(reference)
        if rec is None:
            sys.exit(f"ECHEC reference '{reference}' attendue mais absente du catalogue.")
        if abs(float(rec["list_price"]) - prix) > 1e-9:
            sys.exit(f"ECHEC '{reference}' : prix {rec['list_price']!r} au lieu de {prix!r} FCFA.")
        if abs(float(rec["qty_available"]) - stock) > 1e-9:
            sys.exit(f"ECHEC '{reference}' : stock {rec['qty_available']!r} au lieu de {stock!r}.")
    print(f"  OK {len(ATTENDU)} references vivrieres au prix et au stock attendus.")

print()
print("  Projection par versJulaba() apres estVendable() — ce que verrait le catalogue JULABA :")
print(f"  {'id JULABA':<14}{'nom':<24}{'prix FCFA':>12}{'stock':>9}  {'vendable':<9}reference")
for rec in sorted(data, key=lambda r: r.get("sale_ok") is False):
    code = rec.get("default_code")
    code = "" if code in (False, None) else code
    nom = rec["name"]
    nom = nom if len(nom) <= 22 else nom[:21] + "…"
    vendable = "non" if rec.get("sale_ok") is False else "oui"
    marque = "  odoo-" if vendable == "oui" else "X odoo-"  # X = ecarte par estVendable()
    print(f"  {marque + str(rec['id']):<14}{nom:<24}{rec['list_price']:>12.0f}{rec['qty_available']:>9.0f}  {vendable:<9}{code}")
PY

# --- Test 4 : product.product/read, seconde methode de l'allowlist ---------
log "Test 4 — read authentifie sur un produit a stock non nul"

# On repart d'un produit reellement retourne par le search_read : l'identifiant
# n'est jamais code en dur, et la valeur lue sert de reference de coherence.
#
# Le produit est choisi parmi ceux a stock NON NUL. Prendre simplement le
# premier de la liste reviendrait souvent a comparer 0 a 0 — les modules Odoo
# creent des produits techniques a stock zero (« Tips », pour point_of_sale) et
# ils arrivent en tete par identifiant. Un test qui ne peut pas echouer ne
# prouve rien.
if ! REFERENCE="$(python3 - "$RESPONSE_FILE" <<'PY'
import json, sys

with open(sys.argv[1], encoding="utf-8") as f:
    produits = json.load(f)

candidats = [p for p in produits if float(p.get("qty_available") or 0) > 0]
if not candidats:
    # Le seed pose des stocks positifs sur les sept references vivrieres :
    # n'en trouver aucun est une anomalie en soi, pas un cas a contourner.
    sys.exit("aucun produit a stock non nul dans le catalogue. La coherence "
             "search_read/read ne peut pas etre prouvee sur des zeros. "
             "Verifier que ./scripts/init.sh est alle au bout, seed compris.")

p = candidats[0]
# Format brut "id<TAB>qty_available" : simple a relire cote shell.
print(f"{p['id']}\t{p['qty_available']!r}")
PY
)"; then
  die "test 4 : impossible de choisir un produit de reference (voir le message ci-dessus)."
fi
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

