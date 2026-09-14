#!/usr/bin/env bash
# Le referentiel maitre vu par le CRITERE DU GATEWAY, contre le vrai Odoo.
#
# CE QUE CE SCRIPT REPOND, ET LUI SEUL : combien de references le referentiel
# maitre livre-t-il a JULABA, sur l'instance reelle ? Le seed en a ecrit 198
# et `verifier_catalogue_maitre.py` l'a confirme DANS Odoo. Ce script pose
# l'autre moitie de la question : parmi tout ce qu'Odoo expose, combien
# passent le filtre que le backend applique reellement.
#
# Il rejoue EXACTEMENT le critere de backend/src/odoo-gateway/
# referentiel-mapper.ts (`estReferenceMaitre`) :
#
#     default_code non vide  ET  is_storable === true
#
# et demande exactement les memes champs (`CHAMPS_REFERENTIEL`), aucun champ
# de prix. Si ce script et le backend divergeaient un jour, c'est ici qu'on le
# verrait, avant qu'une marchande ne le voie.
#
# CE QU'IL NE REMPLACE PAS : la recette PILOTE-3 complete
# (frontend_src/e2e/run-recette-pilote3.sh), qui monte le backend, le
# navigateur et une base JULABA pour prouver l'adoption, la vente sans Odoo et
# le cache local. Celle-la exige Node, psql et Chromium — absents du VPS.
# Ici : curl et python3, comme smoke-test.sh.
#
# Lecture seule. Aucune ecriture, ni vers Odoo ni ailleurs.
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
: "${ODOO_API_KEY:?ODOO_API_KEY absent du .env}"
: "${ODOO_BASE_URL:?ODOO_BASE_URL absent du .env}"

ATTENDUES="${REFERENCES_ATTENDUES:-198}"
REPONSE="$(mktemp)"
trap 'rm -f "$REPONSE"' EXIT

log "Lecture du referentiel sur $ODOO_BASE_URL (search_read, lecture seule)"
# Memes champs que CHAMPS_REFERENTIEL — aucun prix n'est demande.
CORPS='{"domain": [], "fields": ["id", "name", "default_code", "categ_id", "active", "is_storable"], "order": "id asc"}'
CODE=$(curl -s -o "$REPONSE" -w '%{http_code}' --max-time 60 \
  -X POST "$ODOO_BASE_URL/json/2/product.product/search_read" \
  -H "Authorization: bearer $ODOO_API_KEY" \
  -H 'Content-Type: application/json' \
  -d "$CORPS")
[ "$CODE" = "200" ] || { head -c 400 "$REPONSE" >&2; echo; die "Odoo a repondu HTTP $CODE."; }
pass "reponse recue."

python3 - "$REPONSE" "$ATTENDUES" <<'PY'
import json, sys, collections

data = json.load(open(sys.argv[1], encoding="utf-8"))
attendues = int(sys.argv[2])
if not isinstance(data, list):
    sys.exit(f"ECHEC reponse inattendue : {type(data).__name__}.")


def est_reference_maitre(r):
    """Copie fidele de `estReferenceMaitre` (referentiel-mapper.ts)."""
    code = r.get("default_code")
    code = code.strip() if isinstance(code, str) else ""
    return len(code) > 0 and r.get("is_storable") is True


retenus = [r for r in data if est_reference_maitre(r)]
ecartes = [r for r in data if not est_reference_maitre(r)]

print(f"  {len(data)} produits exposes par Odoo")
print(f"  {len(retenus)} retenus par le critere du Gateway, {len(ecartes)} ecartes")

# Ce qui est ecarte doit l'etre pour une raison nommable — sinon le critere
# mange des articles reels sans qu'on s'en apercoive.
for r in ecartes[:10]:
    code = r.get("default_code")
    raison = "sans reference stable" if not (isinstance(code, str) and code.strip()) else "non suivi en stock"
    print(f"    ecarte : {r.get('name')!r} ({raison})")
if len(ecartes) > 10:
    print(f"    ... et {len(ecartes) - 10} autre(s)")

doublons = [c for c, n in collections.Counter(
    r["default_code"].strip() for r in retenus).items() if n > 1]
if doublons:
    sys.exit(f"ECHEC references en double cote Odoo : {doublons[:10]}")

sans_categorie = [r["default_code"] for r in retenus if not isinstance(r.get("categ_id"), list)]
if sans_categorie:
    print(f"  -- {len(sans_categorie)} reference(s) sans categorie : {sans_categorie[:5]}")

if len(retenus) != attendues:
    sys.exit(
        f"ECHEC {len(retenus)} references livrees au Gateway, {attendues} attendues. "
        f"Soit le referentiel a bouge dans Odoo, soit le critere ne voit pas ce qu'on croit."
    )

print(f"REFERENTIEL_GATEWAY_RETENUES={len(retenus)}")
print(f"REFERENTIEL_GATEWAY_ECARTEES={len(ecartes)}")
PY

cat <<EOF

--------------------------------------------------------------------
Le critere du Gateway livre bien $ATTENDUES references depuis l'instance reelle.

Ce qui est ainsi etabli : le referentiel maitre traverse la frontiere de
lecture sans perte ni doublon, et aucun prix n'est demande a Odoo.

Ce qui ne l'est PAS, et reste a jouer ailleurs : l'adoption, la vente sans
Odoo, le cache du telephone — c'est la recette PILOTE-3 complete
(frontend_src/e2e/run-recette-pilote3.sh), qui exige Node, psql et Chromium.
--------------------------------------------------------------------
EOF
