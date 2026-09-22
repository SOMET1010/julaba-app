#!/usr/bin/env bash
# INVENTAIRE DE LA BASE PILOTE — enveloppe du fichier SQL, avec ses garde-fous.
#
#   DATABASE_URL='postgres://...' bash scripts/inventaire/inventaire-base-pilote.sh
#
# L'URL se copie depuis le tableau de bord Render (base Postgres > Connect >
# External Database URL). Elle n'est jamais ecrite dans le depot.
#
# CE QUE CETTE ENVELOPPE AJOUTE AU .sql :
#   • elle refuse de partir si l'URL n'est pas fournie ;
#   • elle ouvre la session en lecture seule AVANT meme le fichier, par
#     defaut_transaction_read_only : deux verrous valent mieux qu'un ;
#   • elle ecrit le rapport dans un fichier date, hors du depot ;
#   • elle n'affiche JAMAIS l'URL de connexion (elle porte le mot de passe).
#
# Le fichier SQL ne contient aucune instruction d'ecriture, et la transaction
# est READ ONLY : PostgreSQL lui-meme refuserait un INSERT.

set -uo pipefail
: "${DATABASE_URL:?DATABASE_URL manquante : copier l URL Postgres depuis Render}"

ICI="$(cd "$(dirname "$0")" && pwd)"
SQL="$ICI/inventaire-base-pilote.sql"
[ -f "$SQL" ] || { echo "Fichier SQL introuvable : $SQL"; exit 1; }

SORTIE="${SORTIE:-$HOME/julaba-inventaire-$(date +%Y%m%d-%H%M%S).txt}"

command -v psql >/dev/null 2>&1 || {
  echo "psql introuvable. Sur macOS : brew install libpq. Sur Debian/Ubuntu : apt install postgresql-client."
  exit 1
}

echo "Inventaire en cours (lecture seule)…"
echo "  rapport : $SORTIE"

# `default_transaction_read_only=on` : tout ce qui suit est en lecture seule,
# y compris si quelqu un ajoutait une requete au fichier plus tard.
PGOPTIONS="-c default_transaction_read_only=on -c application_name=julaba-inventaire" \
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$SQL" 2>&1 | tee "$SORTIE"
CODE=${PIPESTATUS[0]}

echo
if [ "$CODE" -eq 0 ]; then
  echo "Termine. Rapport complet : $SORTIE"
  echo
  echo "Ce rapport ne contient AUCUNE donnee personnelle : que des comptages,"
  echo "des dates, des noms de geographie et des noms de produits."
  echo "Il peut donc etre partage tel quel."
else
  echo "psql a rendu le code $CODE — rien n a ete ecrit dans la base (lecture seule)."
fi
exit "$CODE"
