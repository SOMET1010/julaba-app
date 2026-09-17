#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Remplir le catalogue d'un compte marchand DE TEST, pour éprouver la vente
# vocale pour de vrai.
#
# POURQUOI CE SCRIPT EXISTE. Le 17/09/2026, le compte de test ne contenait
# qu'UN produit — « oignon », 0 restants. Toute vente vocale se rabattait
# dessus, et on ne pouvait plus distinguer un défaut de RECONNAISSANCE d'un
# simple effet de catalogue vide. Un catalogue d'un seul produit ne prouve
# rien : il donne toujours la même réponse.
#
# LES PRODUITS CHOISIS SONT TOUS DANS LE VOCABULAIRE VOCAL EMBARQUÉ
# (frontend_src/src/app/voice-offline/vocabulaire.ts). C'est la condition pour
# que le test ait un sens : dicter un produit que l'application ne connaît pas
# ne teste que le repli, pas la reconnaissance.
#
# Les prix sont des ordres de grandeur de marché abidjanais, à ajuster : ce
# sont des valeurs d'essai, pas une vérité de terrain.
#
# CE SCRIPT ÉCRIT DANS LA BASE DE PRODUCTION. À n'utiliser que sur un compte
# de test, jamais sur le compte d'une vraie marchande.
#
# Usage :
#   ./scripts/seed-catalogue-test.sh +2250700000000 0000
#   ./scripts/seed-catalogue-test.sh 0700000000 monCode
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

API="${JULABA_API:-https://julaba-api.onrender.com/api/v1}"

if [[ $# -lt 2 ]]; then
  echo "Usage : $0 <numéro> <code>" >&2
  echo "Exemple : $0 +2250700000000 0000" >&2
  exit 1
fi
TEL="$1"
CODE="$2"

echo "── Connexion à $API ──"
REPONSE="$(curl -s --fail-with-body -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"phone\":\"$TEL\",\"password\":\"$CODE\"}")" || {
    echo "✗ Connexion refusée. Vérifie le numéro et le code." >&2
    echo "$REPONSE" >&2
    exit 1
  }

JETON="$(printf '%s' "$REPONSE" | sed -n 's/.*"accessToken":"\([^"]*\)".*/\1/p')"
if [[ -z "$JETON" ]]; then
  echo "✗ Pas de jeton dans la réponse — connexion incomplète :" >&2
  printf '%s\n' "$REPONSE" >&2
  exit 1
fi
echo "  ✓ connectée"

# nom | stock | prix de vente | prix d'achat | unité | catégorie
PRODUITS=(
  "Tomate|20|500|350|kg|Légumes"
  "Banane|40|100|60|pièce|Fruits"
  "Riz|50|600|500|kg|Céréales"
  "Attiéké|30|200|125|portion|Autre"
)

echo "── Ajout de ${#PRODUITS[@]} produits ──"
for ligne in "${PRODUITS[@]}"; do
  IFS='|' read -r nom stock prix achat unite cat <<< "$ligne"
  corps="$(printf '{"nom":"%s","quantite":%s,"prix":%s,"prix_achat":%s,"unite":"%s","categorie":"%s","seuil_alerte":5}' \
    "$nom" "$stock" "$prix" "$achat" "$unite" "$cat")"
  if curl -s --fail-with-body -X POST "$API/stocks" \
      -H 'Content-Type: application/json' \
      -H "Authorization: Bearer $JETON" \
      -d "$corps" > /dev/null; then
    echo "  ✓ $nom — $prix F/$unite, $stock en stock"
  else
    echo "  ✗ $nom — échec" >&2
  fi
done

echo ""
echo "Catalogue prêt. Rouvre « Caisse du jour » : tu dois voir 5 produits"
echo "(les 4 ci-dessus + l'oignon existant), chacun avec sa propre image."
echo ""
echo "Le test qui compte, maintenant :"
echo "  bouton VERT de Tata → « j'ai vendu trois tomates à cinq cents francs »"
echo "  puis relève ce qui est écrit dans « TU AS DIT », mot pour mot."
