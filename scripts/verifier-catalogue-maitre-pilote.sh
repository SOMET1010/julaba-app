#!/usr/bin/env bash
# VÉRIFIER LE RÉFÉRENTIEL MAÎTRE SUR LE PILOTE — chemin 1 (Odoo source de vérité).
#
# Produit EXACTEMENT les quatre résultats demandés :
#   1. connexion Render → Odoo
#   2. résultat de la synchronisation
#   3. count(*) réel de catalogue_maitre
#   4. trois exemples lus depuis l'API JULABA
#
# Ce script ne modifie RIEN d'autre : il lit, il synchronise, il relit. Il
# n'écrit jamais dans Odoo (le backend est en lecture seule tant que
# ODOO_REAL_WRITE_ENABLED n'est pas posée).
#
# À exécuter depuis n'importe quel ordinateur ayant un accès internet normal.
# La session Claude qui l'a écrit ne peut PAS l'exécuter : son proxy de sortie
# refuse julaba-api.onrender.com (CONNECT tunnel failed, 403).
#
#   API=https://julaba-api.onrender.com/api/v1 \
#   TEL=+2250700000000 MDP=xxxx \
#   bash scripts/verifier-catalogue-maitre-pilote.sh
#
# TEL/MDP doivent être ceux d'un compte ADMIN (admin_general, super_admin,
# admin_national, gestionnaire_zone ou operateur_terrain) : la route de
# synchronisation est réservée à l'administration.

set -uo pipefail
API="${API:-https://julaba-api.onrender.com/api/v1}"
: "${TEL:?TEL manquant : numero +225XXXXXXXXXX du compte ADMIN}"
: "${MDP:?MDP manquant}"

titre() { printf '\n\033[1m%s\033[0m\n' "$1"; }
jqok()  { command -v jq >/dev/null 2>&1; }
montre() { if jqok; then jq . ; else cat; fi; }

titre "[0] Connexion à l'API JULABA"
REP=$(curl -sS --max-time 90 -X POST "$API/auth/login" \
        -H 'Content-Type: application/json' \
        -d "{\"phone\":\"$TEL\",\"password\":\"$MDP\"}")
TOKEN=$(printf '%s' "$REP" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')
if [ -z "$TOKEN" ]; then
  echo "  ÉCHEC — pas de jeton. Réponse brute :"; printf '%s\n' "$REP" | head -c 600; echo
  echo "  (403 « Accès refusé » plus bas = le compte n'est pas ADMIN.)"
  exit 1
fi
ROLE=$(printf '%s' "$REP" | sed -n 's/.*"role":"\([^"]*\)".*/\1/p' | head -1)
echo "  connecté — rôle : ${ROLE:-inconnu}"
AUTH=(-H "Authorization: Bearer $TOKEN")

titre "[1] État du miroir AVANT synchronisation"
curl -sS --max-time 60 "${AUTH[@]}" "$API/catalogue-maitre/etat" | montre

titre "[2] Connexion Render → Odoo ET synchronisation"
# Une seule requête répond aux deux : si Odoo est injoignable ou mal
# configuré, elle échoue ici et le message le dit. Si elle rend un compte,
# c'est que Render a bien parlé à Odoo.
CODE=$(curl -sS --max-time 180 -o /tmp/julaba-sync.json -w '%{http_code}' \
        -X POST "${AUTH[@]}" "$API/catalogue-maitre/synchroniser")
echo "  HTTP $CODE"
cat /tmp/julaba-sync.json | montre
echo
case "$CODE" in
  200) echo "  → Render a joint Odoo. Le champ lues = ce qu Odoo a rendu." ;;
  401) echo "  → jeton refusé." ;;
  403) echo "  → ce compte n'est pas ADMIN : la synchro est réservée à l'administration." ;;
  5*)  echo "  → Odoo injoignable, ou ODOO_CLIENT_MODE/ODOO_BASE_URL/ODOO_API_KEY absents ou faux." ;;
  *)   echo "  → réponse inattendue." ;;
esac

titre "[3] count(*) réel de catalogue_maitre"
curl -sS --max-time 60 "${AUTH[@]}" "$API/catalogue-maitre/etat" | montre
echo '  (total = count(*), actives = count(*) FILTER (WHERE actif) — attendu : 198 / 198)'

titre "[4] IDEMPOTENCE — seconde synchronisation, immédiatement"
# Attendu : 198 lues, 0 créée, 198 mises à jour, 0 désactivée.
# Une seule créée au second passage voudrait dire que l'upsert ne retrouve
# pas sa clé (default_code), et le miroir grossirait à chaque synchro.
curl -sS --max-time 180 -X POST "${AUTH[@]}" "$API/catalogue-maitre/synchroniser" | montre

titre "[5] Trois exemples lus depuis l'API JULABA"
curl -sS --max-time 60 "${AUTH[@]}" "$API/catalogue-maitre?q=igname&limit=3" | montre

titre "Fin"
echo "  Attendu, en un coup d'œil :"
echo "    [2] lues=198  creees=198  majs=0    desactivees=0"
echo "    [3] total=198 actives=198"
echo "    [4] lues=198  creees=0    majs=198  desactivees=0   ← l'idempotence"
echo "    [5] trois références VIV-TUB-00x (Igname Kponan, Bêtê-Bêtê, Florido…)"
