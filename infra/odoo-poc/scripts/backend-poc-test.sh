#!/usr/bin/env bash
# Test d'integration BACKEND JULABA -> Odoo 19 reel, en lecture seule.
#
# Ce que scripts/smoke-test.sh prouve : le contrat JSON-2 d'Odoo, en parlant a
# Odoo directement avec curl. Ce que CE script prouve, et que l'autre ne peut
# pas prouver : que le backend NestJS lui-meme, avec OdooRealClient injecte
# sous ODOO_CLIENT, ses gardes (JwtAuthGuard, OdooPocEnabledGuard) et son
# mapping, se comporte contre une vraie instance comme les tests par contrat
# l'avaient anticipe. C'est le protocole de docs/ODOO-SMOKE-TEST-READONLY.md.
#
# SEPT ASSERTIONS, toutes bloquantes :
#   1. les 7 vivriers seedes arrivent dans /odoo-poc/catalogue ;
#   2. Tips (produit technique de point_of_sale) n'y arrive pas ;
#   3. prix et stocks exacts, au franc et a l'unite pres ;
#   4. /odoo-poc/stock/:id coherent avec le catalogue ;
#   5. POST /odoo-poc/mouvement-stock refuse par l'allowlist ;
#   6. le stock Odoo n'a PAS bouge apres cette tentative ;
#   7. la cle API n'apparait nulle part dans les logs du backend.
#
# L'assertion 5 merite un mot. Le controleur ne renvoie PAS une erreur HTTP :
# `simulerMouvementStock` attrape le refus et journalise un etat `rejected`,
# donc la reponse est un 201 au corps parlant. Lire le code HTTP seul
# conclurait exactement l'inverse de la verite. On verifie donc le CORPS, et
# on double la preuve en relisant le stock cote Odoo (assertion 6) : le refus
# a lieu avant tout appel reseau, rien ne doit avoir bouge.
#
# FRONTIERE. Base Postgres JULABA jetable, creee ici et detruite avec la stack.
# ODOO_REAL_WRITE_ENABLED reste false, l'allowlist JSON-2 est inchangee, et
# aucune ecriture Odoo n'est tentee autrement que pour prouver son refus.
#
# Usage :  ./scripts/backend-poc-test.sh            # monte la stack et teste
#          ./scripts/backend-poc-test.sh --arreter  # detruit la stack de test
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$PWD"
COMPOSE_FILE="$ROOT/backend-poc/docker-compose.yml"
SECRETS="$ROOT/backend-poc/.env"
API="http://127.0.0.1:3001/api/v1"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# BuildKit explicite : c'est lui qui honore backend-poc/Dockerfile.dockerignore,
# sans quoi le .dockerignore de la racine exclurait backend/ et le build
# echouerait sur un COPY introuvable.
export DOCKER_BUILDKIT=1
export COMPOSE_DOCKER_CLI_BUILD=1

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
pass() { printf '\033[1;32m  OK\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31mECHEC\033[0m %s\n' "$*" >&2; exit 1; }

compose() { docker compose -f "$COMPOSE_FILE" "$@"; }

# --- 0. Prerequis et secrets ----------------------------------------------
[ -f "$ROOT/.env" ] || die ".env absent. Lancer d'abord ./scripts/init.sh"
set -a
# shellcheck disable=SC1091
. "$ROOT/.env"
set +a

: "${ODOO_API_KEY:?ODOO_API_KEY absent du .env — relancer ./scripts/init.sh}"
: "${ODOO_BASE_URL:?ODOO_BASE_URL absent du .env}"

if [ "${1:-}" = "--arreter" ]; then
  log "Destruction de la stack de test (conteneurs + base jetable)"
  compose down -v
  pass "stack de test supprimee. L'instance Odoo du POC, elle, n'est pas touchee."
  exit 0
fi

# Secrets STABLES entre deux executions : le mot de passe Postgres est fixe a
# l'initialisation du volume, le regenerer a chaque run casserait la connexion
# au deuxieme passage.
if [ ! -f "$SECRETS" ]; then
  log "Generation des secrets jetables ($SECRETS)"
  umask 077
  cat > "$SECRETS" <<EOF
# Secrets JETABLES de la stack de test backend+Odoo. Generes automatiquement,
# ignores par git. Les supprimer impose de refaire un 'down -v' (le mot de
# passe Postgres est fige a la creation du volume).
JULABA_DB_PASSWORD=$(openssl rand -hex 16)
JULABA_JWT_SECRET=$(openssl rand -hex 32)
JULABA_REFRESH_SALT=$(openssl rand -hex 32)
JULABA_PIN_KEY=$(openssl rand -hex 32)
EOF
fi
set -a
# shellcheck disable=SC1091
. "$SECRETS"
set +a

# --- 1. Demarrage ----------------------------------------------------------
log "Construction de l'image de test et demarrage (npm ci complet : compter plusieurs minutes au premier passage)"
compose up -d --build

log "Attente de la disponibilite HTTP du backend"
pret=""
for _ in $(seq 1 120); do
  if curl -fsS -o /dev/null --max-time 3 "$API/health" 2>/dev/null; then pret="oui"; break; fi
  sleep 2
done
[ -n "$pret" ] || { compose logs --tail 80 api >&2; die "le backend ne repond pas sur $API/health."; }
pass "backend en ligne sur 127.0.0.1:3001."

# Le seed de demonstration tourne EN ARRIERE-PLAN apres l'ouverture du port
# (voir main.ts) : /health repond donc avant que les comptes existent. On
# attend la connexion elle-meme, pas le port.
log "Attente du seed de demonstration puis connexion (JwtAuthGuard reste actif)"
# Cadence de 5 s, pas moins : /auth/login est volontairement bride a 20 appels
# par minute (@Throttle dans auth.controller.ts). Sonder plus vite ferait
# echouer ce test sur un 429 qui n'a rien a voir avec Odoo.
TOKEN=""
for _ in $(seq 1 36); do
  code=$(curl -s -o "$TMP/login.json" -w '%{http_code}' --max-time 10 \
    -X POST "$API/auth/login" -H 'Content-Type: application/json' \
    -d '{"phone":"+2250700000009","password":"1234"}' || true)
  if [ "$code" = "200" ]; then
    TOKEN=$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1])).get("accessToken") or "")' "$TMP/login.json")
    [ -n "$TOKEN" ] && break
  fi
  sleep 5
done
[ -n "$TOKEN" ] || { compose logs --tail 80 api >&2; die "connexion impossible (seed de demonstration absent ?)."; }
pass "connectee en tant que marchande de demonstration, jeton JWT obtenu."

auth_get() { curl -fsS --max-time 20 -H "Authorization: Bearer $TOKEN" "$API$1"; }

# --- 2. Catalogue : assertions 1, 2 et 3 -----------------------------------
log "Appel 1/3 — GET /odoo-poc/catalogue"
auth_get "/odoo-poc/catalogue" > "$TMP/catalogue.json" \
  || { compose logs --tail 40 api >&2; die "GET /odoo-poc/catalogue a echoue."; }

python3 - "$TMP/catalogue.json" "$TMP/id-tomate" <<'PY'
import json, sys

# Meme table de reference que scripts/smoke-test.sh : reference -> (prix, stock).
ATTENDU = {
    "JULABA-TOMATE": (200.0, 50.0),
    "JULABA-BANANE": (100.0, 40.0),
    "JULABA-RIZ-SAC": (15000.0, 10.0),
    "JULABA-MANIOC": (200.0, 60.0),
    "JULABA-IGNAME": (400.0, 35.0),
    "JULABA-PLANTAIN": (800.0, 25.0),
    "JULABA-HUILE-PALME": (1500.0, 20.0),
}

data = json.load(open(sys.argv[1], encoding="utf-8"))
if not isinstance(data, list):
    sys.exit(f"ECHEC /odoo-poc/catalogue n'a pas renvoye une liste : {type(data).__name__}.")

par_code = {r.get("codeOdoo"): r for r in data}

# Assertion 1 — les 7 vivriers sont la.
manquants = [ref for ref in ATTENDU if ref not in par_code]
if manquants:
    sys.exit(f"ECHEC references absentes du catalogue JULABA : {', '.join(sorted(manquants))}.")

# Assertion 2 — Tips n'est pas la. Il EXISTE cote Odoo (le smoke test le voit) :
# son absence ici est donc bien l'effet du filtre, pas un hasard de catalogue.
intrus = [r for r in data if r.get("codeOdoo") == "TIPS" or r.get("nom") == "Tips"]
if intrus:
    sys.exit(f"ECHEC Tips a atteint le catalogue JULABA : {intrus[0]!r}. "
             f"estArticleCatalogue() ne l'a pas ecarte.")

# Assertion 3 — prix au franc pres, stock a l'unite pres.
for ref, (prix, stock) in sorted(ATTENDU.items()):
    rec = par_code[ref]
    if abs(float(rec["prix"]) - prix) > 1e-9:
        sys.exit(f"ECHEC '{ref}' : prix {rec['prix']!r} cote JULABA au lieu de {prix!r} FCFA cote Odoo. "
                 f"C'est de l'argent de commercante — NO-GO (protocole, section 6).")
    if abs(float(rec["stock"]) - stock) > 1e-9:
        sys.exit(f"ECHEC '{ref}' : stock {rec['stock']!r} au lieu de {stock!r}.")
    for champ in ("id", "nom", "odooProductId"):
        if rec.get(champ) in (None, ""):
            sys.exit(f"ECHEC '{ref}' : champ '{champ}' absent du mapping JULABA.")
    if not str(rec["id"]).startswith("odoo-"):
        sys.exit(f"ECHEC '{ref}' : id JULABA '{rec['id']}' non prefixe par 'odoo-'.")

print(f"  OK {len(data)} produit(s) livres par le backend, dont les {len(ATTENDU)} vivriers "
      f"au prix et au stock exacts.")
print("  OK Tips absent du catalogue JULABA alors qu'il existe cote Odoo.")

open(sys.argv[2], "w").write(str(par_code["JULABA-TOMATE"]["odooProductId"]))
PY

ID_TOMATE=$(cat "$TMP/id-tomate")

# --- 3. Stock unitaire : assertion 4 ---------------------------------------
log "Appel 2/3 — GET /odoo-poc/stock/:id sur les 7 vivriers"
: > "$TMP/stocks.txt"
python3 -c 'import json,sys
for r in json.load(open(sys.argv[1])):
    if (r.get("codeOdoo") or "").startswith("JULABA-"):
        print(r["codeOdoo"], r["odooProductId"], r["stock"])' "$TMP/catalogue.json" \
  | while read -r ref pid stock_catalogue; do
      recu=$(auth_get "/odoo-poc/stock/$pid")
      printf '%s %s %s %s\n' "$ref" "$pid" "$stock_catalogue" "$recu" >> "$TMP/stocks.txt"
    done

python3 - "$TMP/stocks.txt" <<'PY'
import sys
lignes = [l.split() for l in open(sys.argv[1]) if l.strip()]
if len(lignes) != 7:
    sys.exit(f"ECHEC {len(lignes)} produit(s) interroges au lieu de 7.")
for ref, pid, attendu, recu in lignes:
    if recu in ("null", ""):
        sys.exit(f"ECHEC /odoo-poc/stock/{pid} ('{ref}') renvoie null — produit introuvable cote Odoo.")
    if abs(float(recu) - float(attendu)) > 1e-9:
        sys.exit(f"ECHEC '{ref}' : /odoo-poc/stock/{pid} renvoie {recu}, le catalogue annonce {attendu}.")
print("  OK les 7 lectures unitaires concordent avec le catalogue.")
PY

# --- 4. Tentative d'ecriture : assertions 5 et 6 ---------------------------
lire_stock_odoo() {
  curl -fsS --max-time 20 -X POST "$ODOO_BASE_URL/json/2/product.product/read" \
    -H "Authorization: bearer $ODOO_API_KEY" -H 'Content-Type: application/json' \
    -d "{\"ids\": [$1], \"fields\": [\"qty_available\"]}"
}

log "Appel 3/3 — POST /odoo-poc/mouvement-stock (doit etre refuse)"
lire_stock_odoo "$ID_TOMATE" > "$TMP/odoo-avant.json" || die "lecture directe Odoo impossible avant la tentative."

curl -s -o "$TMP/mouvement.json" -w '%{http_code}' --max-time 30 \
  -X POST "$API/odoo-poc/mouvement-stock" \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d "{\"operationId\": \"poc-239-$(date +%s)\", \"odooProductId\": $ID_TOMATE, \"quantite\": 1, \"type\": \"out\"}" \
  > "$TMP/mouvement.code" || true

sleep 2
lire_stock_odoo "$ID_TOMATE" > "$TMP/odoo-apres.json" || die "lecture directe Odoo impossible apres la tentative."

python3 - "$TMP/mouvement.json" "$TMP/mouvement.code" "$TMP/odoo-avant.json" "$TMP/odoo-apres.json" <<'PY'
import json, sys

corps_brut = open(sys.argv[1], encoding="utf-8").read()
code_http = open(sys.argv[2], encoding="utf-8").read().strip()
avant = json.load(open(sys.argv[3], encoding="utf-8"))
apres = json.load(open(sys.argv[4], encoding="utf-8"))

try:
    corps = json.loads(corps_brut)
except json.JSONDecodeError:
    sys.exit(f"ECHEC reponse non-JSON du mouvement de stock (HTTP {code_http}) : {corps_brut[:200]!r}")

# Assertion 5 — le refus se lit dans le CORPS. Un 201 ne prouve rien ici :
# le Gateway journalise le refus au lieu de propager une erreur HTTP.
etat = corps.get("etat")
erreur = corps.get("derniereErreur") or ""
if etat != "rejected":
    sys.exit(f"ECHEC mouvement de stock en etat '{etat}' (HTTP {code_http}) au lieu de 'rejected'. "
             f"Une ecriture a peut-etre atteint Odoo — NO-GO immediat.")
if "lecture seule" not in erreur:
    sys.exit(f"ECHEC refus constate mais motif inattendu : {erreur!r}. "
             f"L'allowlist d'OdooRealClient n'est pas la cause du rejet — verifier pourquoi.")
print(f"  OK ecriture refusee par l'allowlist (HTTP {code_http}, etat='rejected').")
print(f"     motif : {erreur[:120]}")

# Assertion 6 — la preuve qui ferme le risque : rien n'a bouge cote Odoo.
q_avant = float(avant[0]["qty_available"])
q_apres = float(apres[0]["qty_available"])
if abs(q_avant - q_apres) > 1e-9:
    sys.exit(f"ECHEC le stock Odoo est passe de {q_avant} a {q_apres} apres la tentative : "
             f"une ecriture a bien eu lieu. NO-GO immediat.")
print(f"  OK stock Odoo inchange apres la tentative ({q_avant} avant, {q_apres} apres).")
PY

# --- 5. Secrets dans les logs : assertion 7 --------------------------------
log "Inspection des logs du backend (aucune fuite de cle API)"
compose logs --no-color api > "$TMP/api.log" 2>&1 || true
if grep -qF "$ODOO_API_KEY" "$TMP/api.log"; then
  die "la cle API apparait dans les logs du backend. NO-GO (protocole, section 4.7)."
fi
pass "la cle API n'apparait nulle part dans les logs ($(wc -l < "$TMP/api.log") lignes inspectees)."

cat <<EOF

--------------------------------------------------------------------
BACKEND JULABA branche sur Odoo 19 reel — les sept assertions passent.

  1. les 7 vivriers arrivent par /odoo-poc/catalogue
  2. Tips n'y arrive pas, alors qu'il existe cote Odoo
  3. prix au franc pres, stocks a l'unite pres
  4. /odoo-poc/stock/:id coherent avec le catalogue
  5. POST /odoo-poc/mouvement-stock refuse par l'allowlist
  6. stock Odoo inchange apres la tentative d'ecriture
  7. aucune trace de la cle API dans les logs

Ce n'est plus un client valide par contrat : c'est OdooRealClient injecte
dans NestJS, derriere JwtAuthGuard, parlant a une vraie instance Odoo 19.

Ce qui reste hors perimetre, volontairement : toute ecriture reelle
(elle exigera sa propre allowlist explicite), la caisse JULABA, le credit,
le Mobile Money, la comptabilite.

Pour tout demonter (base jetable comprise) :
  ./scripts/backend-poc-test.sh --arreter
--------------------------------------------------------------------
EOF
