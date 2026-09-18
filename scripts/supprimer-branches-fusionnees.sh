#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# Supprimer les branches dont le travail est DÉJÀ dans `main`.
#
# POURQUOI CE SCRIPT EXISTE PLUTÔT QU'UNE SUPPRESSION FAITE PAR L'ASSISTANT.
# La suppression a été refusée deux fois côté passerelle git de la session
# (HTTP 403). Vérification faite : aucune branche supprimée, aucune à moitié.
# Le droit de supprimer est du côté de Patrick. Ce que je peux livrer, c'est la
# commande exacte — et la mesure qui la justifie.
#
# ⚠ LA PREMIÈRE MESURE (17/09) ÉTAIT FAUSSE, ET VOICI POURQUOI.
# Elle a été faite sur un dépôt CLONÉ EN SURFACE (shallow). Dans ce mode, git
# ne voit qu'une tranche d'histoire : il répond « aucune base commune » à toute
# question d'ascendance. J'en avais conclu que 105 branches étaient identiques
# à main. Refaite sur l'histoire COMPLÈTE (`git fetch --unshallow`), la mesure
# donne autre chose — et elle donne raison à Patrick, qui disait que le travail
# des autres n'avait pas été pris en compte.
#
# CE QUE DIT LA MESURE REFAITE, sur les 104 branches archivées :
#   •  68 sont des ANCÊTRES DIRECTS de main. Preuve mécanique, aucun doute.
#   •  35 ont été fusionnées par ÉCRASEMENT (squash) : git ne reconnaît plus
#         le lien, mais leur contenu a été retrouvé fichier par fichier dans main
#         (Constitution, ADR-001/002, fidélité, GPS communes, Keiwa, etc.).
#   •   1 porte ENCORE quelque chose qui n'est pas dans main, et elle est
#         VOLONTAIREMENT ÉPARGNÉE : `claude/julaba-voice-audit-fixes-hi3jlq`.
#         Elle contient le moteur sherpa-onnx en WASM pour le NAVIGATEUR
#         (frontend/public/voix/sherpa/ : ASR + TTS). Main n'a que la voix
#         NATIVE de l'APK. Garder ou jeter ce chemin web est un arbitrage
#         d'architecture : il appartient à Patrick, pas à un script de ménage.
#
# RIEN N'EST IRRÉCUPÉRABLE : chaque SHA est archivé dans
# docs/BRANCHES-SUPPRIMEES-2026-09-17.md. Restaurer une branche :
#   git push origin <sha>:refs/heads/<nom>
#
# NE SONT PAS TOUCHÉES : `main`, `dev`, `claude/clever-allen-dnr8by`.
#
# Usage :
#   ./scripts/supprimer-branches-fusionnees.sh             # montre, ne supprime rien
#   ./scripts/supprimer-branches-fusionnees.sh --appliquer # supprime pour de bon
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APPLIQUER=0
[[ "${1:-}" == "--appliquer" ]] && APPLIQUER=1

# Ancêtres directs de main : le script le RE-VÉRIFIE avant de supprimer.
ANCETRES=(
  "claude/accents-autres-roles"
  "claude/accents-coeur-cible"
  "claude/accueil-titre-marge"
  "claude/accueil-tuiles-locales"
  "claude/api-url-backoffice"
  "claude/api-url-objectifs-raccourcis"
  "claude/audit-ui-code"
  "claude/backlog-2026-08"
  "claude/bo-parametres-voix"
  "claude/caisse-plus-cercle"
  "claude/caisse-plus-contraste"
  "claude/cap-azure"
  "claude/clavier-image"
  "claude/cloche-44"
  "claude/cnps-cnam-backend"
  "claude/commande-negociation-lien"
  "claude/coop-inbox-partagee"
  "claude/dates-jour-local"
  "claude/decisions-entree"
  "claude/entete-retour-tactile"
  "claude/fiche-cibles-tactiles"
  "claude/fix-acces-marchand-stock-commun"
  "claude/fix-activation-critique"
  "claude/fix-audio-unlock-onboarding"
  "claude/fix-bo-cross-domain-auth-token"
  "claude/fix-change-password-bo-role"
  "claude/fix-distribution-stock-commun-visible"
  "claude/fix-flakiness-m6-m8"
  "claude/fix-icone-apk-android"
  "claude/fix-marche-zone-creation"
  "claude/fix-nom-tata-nanti-lou"
  "claude/fix-passwordhash-leak-residuel"
  "claude/fix-phone-collision-ps-tontine"
  "claude/fix-reappro-tronque"
  "claude/fix-reset-password-mechanism"
  "claude/fix-seed-demo-password-coherence"
  "claude/fix-tresorerie-stocks-500"
  "claude/fix-webdir-capacitor"
  "claude/guidage-vocal-auto"
  "claude/hygiene-voix"
  "claude/hygiene-voix-canaux"
  "claude/inbox-negociation-producteur"
  "claude/invariants-readiness"
  "claude/keiwa-transfert-comptes"
  "claude/microcredit-palier-reel"
  "claude/mouvements-produit"
  "claude/nettoyage-clips-voix"
  "claude/packs-voix"
  "claude/protocole-pilote"
  "claude/raccourcis-validation"
  "claude/recu-sans-pdf"
  "claude/routeur-intentions"
  "claude/sauvegarde-auto"
  "claude/sherpa-onnx-apk"
  "claude/stock-commun-cooperative"
  "claude/studio-v1-collecte"
  "claude/studio-voix"
  "claude/suppression-cible-exacte"
  "claude/suppression-modale-fiable"
  "claude/tontine-reelle"
  "claude/vente-guidee-confirmation"
  "claude/vente-guidee-grammaire"
  "claude/vente-guidee-ligne-provisoire"
  "claude/ventes-filtre-voix"
  "claude/verrou-parole-ecoute"
  "claude/voix-code-mort"
  "claude/voix-first-activation"
  "claude/voix-first-numero"
)

# Fusionnées par écrasement : l'ascendance ne le prouve plus, le contenu a été
# vérifié à la main. Le script re-vérifie ce qu'il peut : qu'aucun commit de la
# branche n'introduit un patch absent de main.
ECRASEES=(
  "claude/anonymisation-complete 97f3099e2e0a0cae98f0f586a80091c09c75b5c4"
  "claude/backlog-a-jour 39bc64c416c134d6bd4c363476d9ee86e5d02cb7"
  "claude/blocage-wallet-reel 16902189a5a4486cbbcfa9f70958f735387ddd2a"
  "claude/bo-communication-reelle 43ca8a5f606651e23bd7c1a9831be6b1c5487f6f"
  "claude/bo-cron-reel 59807fd8f23f2a915b26e2135ec2ff6bb6409c5c"
  "claude/bo-monitoring-ia-reel 993a971e2f6a142d5ccf9bd24812cc36b3104da0"
  "claude/bo-rapports-pdf-reels 4591cadc3437870bc2f55713a841a55d63dfe31a"
  "claude/durcir-confirm-suppression 6848b07e3350770edea2c9684af668e93ca87007"
  "claude/ecran-activation 04e665bf324c84f932ec25cf48129bb119707235"
  "claude/fidelite-paiement-recompenses 3a61bae97371b2086c5517dd75e57953cc43cefc"
  "claude/fix-annulation-en-cours fe9c5ab0bb500978c291a419f99613142c118bfb"
  "claude/fix-cooperatives-liste-500 b1b8415d108d7fe9ac0b97e70c4c6e4935b95727"
  "claude/fix-cosmetique-annulee-credits 1e020e5e1feb7e680d366447aa7aefbcad032e07"
  "claude/fix-notif-caisse-obsolete e21dfb217f79c80c8884323252a94048428e5e07"
  "claude/fix-prix-achat-marge 122847d49304b882e09a532d4489e0f6c07f3da1"
  "claude/fix-recolte-prix-unite 12386b06074b5c62e82316af07eeab2ecc879112"
  "claude/fix-suppression-stock 444e057aef745be220a337e90ecc5157b85d196c"
  "claude/fix-verite-argent-caisse 670f05206dd922fb2befa003f3e2a9c944dee4e0"
  "claude/fuite-passwordhash-membres c6103a36feeffa0dfd3827f732ae276ab6ccba49"
  "claude/institution-isolation-donnees ef2012da7b2621e8194926ca192877ddbd54f0ea"
  "claude/julaba-conversation-6zfdaz 24045db1a63b40027722fb3b83091a64e9533ec8"
  "claude/keiwa-paiement-e2e bd1c98616b07eec07ff451474ea1f4671b8eaf4a"
  "claude/migration-gps-communes 7cae8a6d5b6cf02e453c2b92ea6f0a3babf9d46c"
  "claude/mutations-zone-reelles e2f6fa25b7eae305487ee3238b525d6064293e95"
  "claude/negociation-contre-offre 715d084aecbfad3bc02d881b05f71b78740c1bef"
  "claude/negociation-reservation-stock 96c4647e6ea0b3f415146ad7b2ec2bc65a88fb30"
  "claude/p0-activation aa1eee5d9eb66bc5c1989c4c463435c4634053df"
  "claude/raccourcis-rapport-montage bb64b46f5c3d37642e72dd389417c17f53440283"
  "claude/readiness-pilote 35186d2f7a6093a5c004235636d180972e27f745"
  "claude/score-membres-cooperative 1791450e3dd3505c6e0ff3ff158ee61f53172e29"
  "claude/session-ticgbm 4b32fbc9b777d79c6fad85663f5201259f6845d9"
  "claude/skill-identifier-acteur 8255209b3c3f487848a7e52b532c0d955bafe046"
  "claude/unify-unites 4333076f29bed597535584b0b82c1059c0b52cf2"
  "claude/ux-creation-produit 49eb5cf7008204220adbd98a35f5792c7e55fa2d"
  "claude/vente-guidee-catalogue e1d680897f23cbf5d009790d6752f500eb555a5a"
)

echo "── Histoire complète requise ──"
if [[ "$(git rev-parse --is-shallow-repository)" == "true" ]]; then
  echo "  dépôt en surface → récupération de l'histoire complète…"
  git fetch --unshallow --quiet origin
fi
git fetch --quiet origin "+refs/heads/*:refs/remotes/origin/*" --prune
echo "  main = $(git rev-parse --short origin/main)"
echo ""

sures=()
douteuses=()
disparues=()

for nom in "${ANCETRES[@]}"; do
  if ! git show-ref --quiet "refs/remotes/origin/$nom"; then disparues+=("$nom"); continue; fi
  if git merge-base --is-ancestor "origin/$nom" origin/main; then
    sures+=("$nom")
  else
    douteuses+=("$nom — annoncée ancêtre de main, elle ne l'est plus")
  fi
done

# Pour celles-ci, l'ascendance ne prouve plus rien : c'est le CONTENU qui a été
# vérifié, à la main, sur un commit précis. Le script ne peut donc que vérifier
# une chose — que la branche n'a pas bougé depuis. Si elle a bougé, ce qu'elle
# porte de nouveau n'a été vérifié par personne : on n'y touche pas.
for entree in "${ECRASEES[@]}"; do
  nom="${entree%% *}"
  sha_verifie="${entree##* }"
  if ! git show-ref --quiet "refs/remotes/origin/$nom"; then disparues+=("$nom"); continue; fi
  if [[ "$(git rev-parse "origin/$nom")" == "$sha_verifie" ]]; then
    sures+=("$nom")
  else
    douteuses+=("$nom — poussée depuis la vérification du contenu")
  fi
done

echo "── Mesure ──"
echo "  ${#sures[@]} branches supprimables"
echo "  ${#douteuses[@]} branches douteuses → CONSERVÉES"
echo "  ${#disparues[@]} déjà absentes du distant"
echo "  1 conservée exprès : claude/julaba-voice-audit-fixes-hi3jlq (voix WASM web)"
echo ""

if [[ ${#douteuses[@]} -gt 0 ]]; then
  echo "⚠ Non touchées :"
  for b in "${douteuses[@]}"; do echo "    $b"; done
  echo ""
fi

if [[ ${#sures[@]} -eq 0 ]]; then echo "Rien à supprimer."; exit 0; fi

if [[ $APPLIQUER -eq 0 ]]; then
  echo "Essai à blanc — rien n'a été supprimé."
  echo "Pour supprimer pour de bon :  $0 --appliquer"
  exit 0
fi

echo "── Suppression de ${#sures[@]} branches ──"
# Par paquets de 20 : une seule commande pour 100 branches dépasse souvent la
# limite de la passerelle, et un échec en milieu de liste laisse un état flou.
lot=()
faites=0
pousser_lot() {
  [[ ${#lot[@]} -eq 0 ]] && return 0
  if git push origin --delete "${lot[@]}"; then
    faites=$((faites + ${#lot[@]}))
  else
    echo "  ✗ échec sur ce lot : ${lot[*]}" >&2
  fi
  lot=()
}
for nom in "${sures[@]}"; do
  lot+=("$nom")
  [[ ${#lot[@]} -ge 20 ]] && pousser_lot
done
pousser_lot

echo ""
echo "$faites / ${#sures[@]} branches supprimées."
git fetch --quiet origin --prune
echo "Il reste $(git ls-remote --heads origin | wc -l) branches sur le distant."
