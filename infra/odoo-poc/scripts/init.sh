#!/usr/bin/env bash
# Amorce complete de l'instance Odoo 19 + POS du POC JULABA.
#
# Idempotent : relancable sans casser une instance deja amorcee. Si la base
# existe deja, la creation est sautee ; si une cle API existe deja sous le meme
# nom, elle est revoquee et remplacee (une cle Odoo n'est lisible qu'une fois).
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$PWD"

log()  { printf '\033[1;34m==>\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31mERREUR\033[0m %s\n' "$*" >&2; exit 1; }

# --- 1. Prerequis ----------------------------------------------------------
command -v docker >/dev/null 2>&1 || die "docker introuvable."
docker compose version >/dev/null 2>&1 || die "docker compose v2 introuvable (plugin 'compose')."
docker info >/dev/null 2>&1 || die "le demon Docker ne repond pas."

[ -f "$ROOT/.env" ] || die ".env absent. Faire : cp .env.example .env puis remplacer les valeurs change-me."

set -a
# shellcheck disable=SC1091
. "$ROOT/.env"
set +a

for var in ODOO_DB ODOO_DB_USER ODOO_DB_PASSWORD ODOO_MASTER_PASSWORD ODOO_API_USER_LOGIN ODOO_API_USER_PASSWORD; do
  [ -n "${!var:-}" ] || die "$var absent ou vide dans .env"
  case "${!var}" in
    *change-me*) die "$var contient encore une valeur 'change-me'. Choisir une vraie valeur." ;;
  esac
done

# L'entrypoint de l'image odoo relit les valeurs db_* de odoo.conf avec
# `cut -d " " -f3` : un espace dans l'identifiant ou le mot de passe de base
# serait silencieusement tronque. On refuse le cas plutot que de le subir.
case "$ODOO_DB_USER$ODOO_DB_PASSWORD" in
  *[[:space:]]*) die "ODOO_DB_USER et ODOO_DB_PASSWORD ne doivent contenir aucun espace." ;;
esac
case "$ODOO_DB" in
  *[!a-zA-Z0-9_]*) die "ODOO_DB ne doit contenir que des lettres, chiffres et underscores." ;;
esac

: "${ODOO_INSTALL_MODULES:=point_of_sale,stock,sale,account}"
: "${ODOO_WITH_DEMO:=false}"
: "${SEED_DEVISE:=XOF}"
: "${ODOO_API_KEY_NAME:=julaba-poc}"
: "${ODOO_API_KEY_DAYS:=90}"
: "${ODOO_BASE_URL:=http://127.0.0.1:${ODOO_PORT:-8069}}"

# --- 2. Rendu de la configuration Odoo -------------------------------------
log "Rendu de config/odoo.conf depuis le gabarit"
python3 - "$ROOT" <<'PY'
import os, sys, pathlib
root = pathlib.Path(sys.argv[1])
tpl = (root / "config" / "odoo.conf.template").read_text(encoding="utf-8")
subs = {
    "__ADMIN_PASSWD__": os.environ["ODOO_MASTER_PASSWORD"],
    "__DB_USER__": os.environ["ODOO_DB_USER"],
    "__DB_PASSWORD__": os.environ["ODOO_DB_PASSWORD"],
    "__DB_NAME__": os.environ["ODOO_DB"],
}
for token, value in subs.items():
    tpl = tpl.replace(token, value)
out = root / "config" / "odoo.conf"
out.write_text(tpl, encoding="utf-8")
# 0644 et non 0600 : ce fichier est monte dans le conteneur odoo, dont le
# processus tourne sous l'utilisateur `odoo` (uid 101), alors que le fichier
# appartient a celui qui lance le script (uid 1000 en general). Un bind mount
# ne traduit pas les uid : en 0600, le conteneur ne peut pas lire sa propre
# configuration et l'entrypoint plante sur
# `configparser.NoSectionError: No section: 'options'`, apres un
# `grep: /etc/odoo/odoo.conf: Permission denied` peu bavard.
# Constate sur un vrai passage Docker ; invisible en installation depuis les
# sources, ou le fichier est lu par l'utilisateur qui l'a ecrit.
# COMPROMIS ASSUME : le fichier contient `admin_passwd` et `db_password`, et
# devient lisible par tout utilisateur de la machine hote. Acceptable pour une
# instance de POC jetable sur une machine a administrateur unique ; a durcir
# avant tout usage durable (voir README.md, "Limitation de securite").
out.chmod(0o644)
PY

# --- 3. Base de donnees ----------------------------------------------------
log "Demarrage de PostgreSQL"
docker compose up -d db

log "Attente que PostgreSQL soit pret"
for i in $(seq 1 60); do
  if docker compose exec -T db pg_isready -U "$ODOO_DB_USER" -d postgres >/dev/null 2>&1; then break; fi
  [ "$i" -eq 60 ] && die "PostgreSQL n'est pas pret apres 60 tentatives."
  sleep 2
done

DB_EXISTS="$(docker compose exec -T db psql -U "$ODOO_DB_USER" -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname = '$ODOO_DB'" 2>/dev/null | tr -d '[:space:]')"

if [ "$DB_EXISTS" = "1" ]; then
  log "Base '$ODOO_DB' deja presente : creation sautee."
else
  # Odoo 19 : les donnees de demo ne sont PLUS chargees par defaut. Il faut
  # --with-demo explicitement (odoo/tools/config.py, option --with-demo,
  # my_default=False ; --without-demo est documente comme le comportement par
  # defaut). C'est un changement par rapport a Odoo <= 18.
  DEMO_FLAG=()
  if [ "$ODOO_WITH_DEMO" = "true" ]; then
    DEMO_FLAG=(--with-demo)
    log "Creation de la base '$ODOO_DB' AVEC donnees de demonstration"
  else
    log "Creation de la base '$ODOO_DB' SANS donnees de demonstration"
  fi
  log "Modules installes : $ODOO_INSTALL_MODULES"
  docker compose run --rm odoo \
    odoo -c /etc/odoo/odoo.conf -d "$ODOO_DB" \
         -i "$ODOO_INSTALL_MODULES" \
         "${DEMO_FLAG[@]}" \
         --load-language=fr_FR \
         --stop-after-init
fi

# --- 4. Serveur ------------------------------------------------------------
log "Demarrage du serveur Odoo"
docker compose up -d odoo

log "Attente de la disponibilite HTTP"
for i in $(seq 1 90); do
  if docker compose exec -T odoo python3 -c \
       "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8069/web/login', timeout=5).status == 200 else 1)" \
       >/dev/null 2>&1; then break; fi
  [ "$i" -eq 90 ] && die "Odoo ne repond pas sur /web/login. Voir : docker compose logs odoo"
  sleep 2
done

# --- 5. Catalogue vivrier en FCFA ------------------------------------------
# ADMINISTRATION de l'instance de test, pas un appel du Gateway : execute sous
# `odoo shell` avec les droits d'admin Odoo, sans passer par OdooRealClient et
# sans toucher a ODOO_REAL_WRITE_ENABLED, qui reste false. Voir l'en-tete de
# scripts/seed_vivrier.py.
log "Seed du catalogue vivrier en $SEED_DEVISE"
docker compose exec -T \
  -e SEED_DEVISE="$SEED_DEVISE" \
  odoo odoo shell -c /etc/odoo/odoo.conf -d "$ODOO_DB" \
       --no-http --log-level=warn \
  < "$ROOT/scripts/seed_vivrier.py"

# --- 6. Utilisateur et cle API ---------------------------------------------
log "Creation de l'utilisateur API '$ODOO_API_USER_LOGIN' et generation de la cle"
KEY_OUTPUT="$(docker compose exec -T \
  -e ODOO_API_USER_LOGIN="$ODOO_API_USER_LOGIN" \
  -e ODOO_API_USER_NAME="${ODOO_API_USER_NAME:-JULABA Integration (POC)}" \
  -e ODOO_API_USER_PASSWORD="$ODOO_API_USER_PASSWORD" \
  -e ODOO_API_KEY_NAME="$ODOO_API_KEY_NAME" \
  -e ODOO_API_KEY_DAYS="$ODOO_API_KEY_DAYS" \
  odoo odoo shell -c /etc/odoo/odoo.conf -d "$ODOO_DB" \
       --no-http --log-level=warn \
  < "$ROOT/scripts/create_api_key.py")"

API_KEY="$(printf '%s\n' "$KEY_OUTPUT" | sed -n 's/^JULABA_ODOO_API_KEY=//p' | tail -n1 | tr -d '[:space:]')"
[ -n "$API_KEY" ] || { printf '%s\n' "$KEY_OUTPUT" >&2; die "cle API non generee (sortie du shell Odoo ci-dessus)."; }

log "Ecriture de ODOO_API_KEY dans .env"
python3 - "$ROOT/.env" "$API_KEY" <<'PY'
import pathlib, sys
path, key = pathlib.Path(sys.argv[1]), sys.argv[2]
lines = path.read_text(encoding="utf-8").splitlines()
found = False
for i, line in enumerate(lines):
    if line.startswith("ODOO_API_KEY="):
        lines[i], found = f"ODOO_API_KEY={key}", True
if not found:
    lines.append(f"ODOO_API_KEY={key}")
path.write_text("\n".join(lines) + "\n", encoding="utf-8")
PY
chmod 600 "$ROOT/.env"

# --- 7. Resume -------------------------------------------------------------
cat <<EOF

--------------------------------------------------------------------
Instance Odoo 19 + POS prete.

  Interface    : ${ODOO_BASE_URL}
  Base         : ${ODOO_DB}
  Modules      : ${ODOO_INSTALL_MODULES}
  Donnees demo : ${ODOO_WITH_DEMO}
  Catalogue    : vivrier JULABA, devise ${SEED_DEVISE}
  Admin        : login 'admin' / mot de passe 'admin' (donnees de demo)
  Compte API   : ${ODOO_API_USER_LOGIN}
  Cle API      : ecrite dans .env (ODOO_API_KEY), non reaffichee ici.

Etape suivante, verification du contrat JSON-2 attendu par le gateway JULABA :

  ./scripts/smoke-test.sh

--------------------------------------------------------------------
EOF
