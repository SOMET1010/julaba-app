#!/usr/bin/env bash
#
# JOUER LES FLOWS SUR L'ÉMULATEUR — appelé par .github/workflows/maestro.yml.
#
# POURQUOI CE FICHIER EXISTE, et c'est la leçon des runs #1 et #2.
# `reactivecircus/android-emulator-runner` n'exécute PAS son `script:` comme un
# script : il lance CHAQUE LIGNE dans un `sh -c` SÉPARÉ. Mesuré :
#
#   run #1 : « sh: 1: set: Illegal option -o pipefail »   (dash, pas bash)
#   run #2 : [command]/usr/bin/sh -c echec=0
#            [command]/usr/bin/sh -c if [ "$AVEC_COMPTE" = "true" ]; then
#            « sh: 1: Syntax error: end of file unexpected (expecting "fi") »
#
# Une variable ne survit donc pas d'une ligne à l'autre, et un `if` multi-lignes
# est impossible. Rafistoler ligne par ligne ne pouvait pas tenir : le workflow
# n'appelle plus qu'UNE commande, et tout le reste vit ici — en bash véritable,
# testable localement, et relu comme du code plutôt que comme du YAML.
#
# Lancer à la main, avec un émulateur ou un téléphone branché :
#   AVEC_COMPTE=false APK=android/app/build/outputs/apk/debug/app-debug.apk \
#     bash .maestro/ci/jouer.sh
set -o pipefail

APK="${APK:-android/app/build/outputs/apk/debug/app-debug.apk}"
FLOWS="${FLOWS:-.maestro/01-demarrage.yaml}"
AVEC_COMPTE="${AVEC_COMPTE:-false}"
RAPPORTS="${RAPPORTS:-rapports}"

adb wait-for-device
# Les animations sont déjà coupées par l'action ; on insiste côté système, car
# une transition en cours fait échouer un `tapOn` sans rien dire d'utile.
adb shell settings put global window_animation_scale 0 || true
adb shell settings put global transition_animation_scale 0 || true
adb shell settings put global animator_duration_scale 0 || true

# ── RUN #9 : CE QUE MAESTRO VOYAIT N'ÉTAIT PAS JULABA ──────────────────────
# La hiérarchie ne contenait que la barre de statut et « Pixel Launcher isn't
# responding / Close app / Wait » : une boîte ANR du LANCEUR couvrait l'écran,
# et `launchApp` avait mis VINGT-SIX MINUTES. Aucune conclusion sur la WebView
# n'était possible — l'application n'était simplement pas au premier plan.
#
# `hide_error_dialogs` supprime ces boîtes ANR/crash du système. Ce n'est pas
# masquer un défaut de JULABA : un ANR du Pixel Launcher n'est pas le nôtre, et
# il nous aveuglait.
adb shell settings put global hide_error_dialogs 1 || true

echo "::group::Installation de l APK"
adb uninstall com.julaba.app || true
adb install -r "$APK"
echo "::endgroup::"

mkdir -p "$RAPPORTS/captures" "$RAPPORTS/debug"

# ── LA PRÉCONDITION : JULABA AU PREMIER PLAN, PROUVÉ, AVANT TOUT LE RESTE ──
# Tant qu'elle n'est pas établie, rien de ce qu'on mesure ensuite ne vaut.
# `dumpsys activity activities` dit QUI est résumée : c'est une preuve, pas une
# attente arbitraire.
echo "::group::Précondition — JULABA au premier plan"
adb shell am force-stop com.julaba.app || true
adb shell monkey -p com.julaba.app -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || true
# RUN #10 : CETTE BOUCLE FERMAIT L'APPLICATION ELLE-MÊME. Elle envoyait
# KEYCODE_BACK à CHAQUE tour, sans condition : `monkey` lançait JULABA, le BACK
# la renvoyait au lanceur, soixante fois de suite. Résultat mesuré — l'écran est
# resté sur l'accueil Android pendant 120 s (Chrome, Gmail, Messages, Photos…)
# et la sonde a conclu « précondition non tenue », à juste titre.
# Le BACK ne part DÉSORMAIS que si un dialogue est vraiment détecté, et l'app
# est RELANCÉE quand elle n'est pas devant — au lieu d'être fermée.
FOREGROUND=non
for i in $(seq 1 45); do
  top=$(adb shell dumpsys activity activities 2>/dev/null | grep -E 'mResumedActivity|topResumedActivity' | head -1)
  case "$top" in
    *com.julaba.app*) FOREGROUND=oui; break ;;
  esac
  # Un dialogue système par-dessus ? ALORS seulement on le ferme.
  if adb shell dumpsys window 2>/dev/null | grep -qE 'Application Error|isn.t responding|aerr|AppErrorDialog'; then
    echo "  (dialogue système détecté — fermeture)"
    adb shell input keyevent KEYCODE_BACK >/dev/null 2>&1 || true
  fi
  # Sinon : on (re)lance, parce que ne rien faire ne la met pas devant.
  adb shell monkey -p com.julaba.app -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1 || true
  sleep 3
done
echo "activité résumée : ${top:-(inconnue)}"
echo "JULABA au premier plan : $FOREGROUND (après $((i*2)) s)"
echo "::endgroup::"

# ── MODE SONDE : on répond à UNE question, on ne joue AUCUN flow ───────────
# Demandé par Patrick après le run #9 : « le prochain run doit répondre à une
# seule question binaire — JULABA est-elle foreground et Maestro voit-il son
# contenu ? » Pas de flow, pas de test métier, pas de nouvelle variable.
if [ "$FLOWS" = "SONDE" ]; then
  echo "::group::SONDE — ce que Maestro voit, JULABA au premier plan"
  adb exec-out screencap -p > "$RAPPORTS/captures/sonde-ecran.png" 2>/dev/null || true
  maestro hierarchy > "$RAPPORTS/hierarchie.json" 2>&1 || true
  # `grep -c` imprime DÉJÀ 0 quand il ne trouve rien ; le `|| echo 0` en
  # ajoutait un second, et le compte s'affichait sur deux lignes (run #10).
  compte () { grep -cE "$1" "$RAPPORTS/hierarchie.json" 2>/dev/null | head -1 || true; }
  textes=$(compte '"(text|accessibilityText)" : "[^"]+"')
  julaba=$(compte 'com\.julaba\.app')
  webview=$(compte 'WebView|webkit|chromium')
  echo "  JULABA au premier plan .......... $FOREGROUND"
  echo "  textes visibles (tous paquets) .. $textes"
  echo "  nœuds « com.julaba.app » ........ $julaba"
  echo "  nœuds WebView / chromium ........ $webview"
  echo
  echo "  — les textes, dédoublonnés —"
  grep -oE '"(text|accessibilityText)" : "[^"]+"' "$RAPPORTS/hierarchie.json" 2>/dev/null | sort -u | head -40
  echo
  if [ "$FOREGROUND" != "oui" ]; then
    echo "  VERDICT : PRÉCONDITION NON TENUE — JULABA n'est pas au premier plan."
    echo "            Aucune conclusion sur la WebView n'est valable."
    sortie=1
  elif [ "$julaba" -gt 0 ]; then
    echo "  VERDICT : Maestro VOIT des nœuds de JULABA → le banc tient,"
    echo "            ce sont les libellés des flows qui sont à corriger."
    sortie=0
  elif [ "$webview" -gt 0 ]; then
    echo "  VERDICT : WebView présente mais AUCUN nœud JULABA → contenu HTML"
    echo "            opaque. C'est l'arbitrage data-testid / accessibilité."
    sortie=1
  else
    echo "  VERDICT : ni nœud JULABA ni WebView — à regarder sur la capture."
    sortie=1
  fi
  echo "::endgroup::"
  pkill -f "adb logcat" 2>/dev/null || true
  exit "$sortie"
fi

# ─────────────────────────────────────────────────────────────────────────────
# ENREGISTREUR D'ÉCRANS — LA CARTE DU PARCOURS EN UN SEUL RUN.
#
# Jusqu'au run #14, le banc ne relevait QU'UN écran : celui de la fin. Chaque
# run n'apprenait donc qu'un libellé, à six minutes pièce, et corriger un flow
# de dix gestes demandait dix runs. Le coût n'était pas dans l'émulateur, il
# était dans la MÉTHODE.
#
# `adb shell uiautomator dump` lit l'arbre de vue SANS passer par Maestro : les
# deux ne se disputent rien, et on peut échantillonner pendant que le flow joue.
# On ne garde que les écrans DIFFÉRENTS du précédent — un parcours de dix
# écrans tient alors en dix relevés, horodatés, dans l'ordre réel.
#
# C'est ce qui remplace « un écran par run » par « tout le parcours par run ».
# ─────────────────────────────────────────────────────────────────────────────
mkdir -p "$RAPPORTS/ecrans"
enregistrer_ecrans() {
  precedent=""
  n=0
  i=0
  while [ "$i" -lt 600 ]; do
    i=$((i + 1))
    if adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; then
      adb shell cat /sdcard/ui.xml 2>/dev/null > /tmp/ui-courant.xml || true
      # Les textes visibles, dédoublonnés et triés : c'est la SIGNATURE de l'écran.
      textes=$(grep -oE 'text="[^"]+"' /tmp/ui-courant.xml 2>/dev/null \
        | sed 's/^text="//; s/"$//' | sort -u)
      if [ -n "$textes" ] && [ "$textes" != "$precedent" ]; then
        n=$((n + 1))
        {
          echo "ÉCRAN $(printf '%02d' "$n") — t+${i}×1s"
          echo "$textes" | sed 's/^/    /'
        } > "$RAPPORTS/ecrans/ecran-$(printf '%02d' "$n").txt"
        adb exec-out screencap -p > "$RAPPORTS/captures/ecran-$(printf '%02d' "$n").png" 2>/dev/null || true
        precedent="$textes"
      fi
    fi
    sleep 1
  done
}
enregistrer_ecrans &
PID_ECRANS=$!

# Le logcat tourne PENDANT les flows : quand un flow tombe, la cause est souvent
# une exception Java ou une erreur de WebView qu'aucun arbre de vue ne montre.
adb logcat -c || true
adb logcat > "$RAPPORTS/logcat.txt" 2>&1 &
PID_LOGCAT=$!

# LE CODE DE SORTIE EST RETENU, PAS PROPAGÉ TOUT DE SUITE : si `maestro test`
# arrêtait le script ici, la collecte ne tournerait pas et on perdrait captures,
# arbre de vue et logcat — exactement quand ils servent.
echec=0
if [ "$AVEC_COMPTE" = "true" ]; then
  echo "Flows joués : $FLOWS (avec compte)"
  maestro test "$FLOWS" \
    -e MAESTRO_PHONE="$MAESTRO_PHONE" \
    -e MAESTRO_PIN="$MAESTRO_PIN" \
    --format junit --output "$RAPPORTS/junit.xml" \
    --debug-output "$RAPPORTS/debug" || echec=$?
else
  echo "Flows joués : étiquette sansCompte UNIQUEMENT (secrets absents)"
  maestro test .maestro/ --include-tags=sansCompte \
    --format junit --output "$RAPPORTS/junit.xml" \
    --debug-output "$RAPPORTS/debug" || echec=$?
fi

# ─────────────────────────────────────────────────────────────────────────────
# RELEVÉ DE HIÉRARCHIE — SYSTÉMATIQUE, PAS SEULEMENT À L'ÉCHEC.
#
# Run #13 : le flow est tombé sur `Taper mon numéro sur le clavier`, et la
# hiérarchie relevée 37 s plus tard montrait encore l'écran d'ENTRÉE plus un
# menu « Copy / Select all / Share » — donc deux lectures possibles, et aucune
# preuve pour trancher. Il manquait l'état de l'écran AU MOMENT du geste.
#
# Et le trou était structurel : la hiérarchie n'était relevée QUE si `maestro
# test` tombait. Un flow qui PASSE ne montrait rien — donc une sonde conçue
# pour observer un écran ne pouvait rien rapporter sans échouer exprès. On ne
# construit pas un instrument de mesure qui n'écrit que quand il casse.
# ─────────────────────────────────────────────────────────────────────────────
relever_hierarchie() {
  # $1 = nom du fichier, $2 = ce qu'on regarde (affiché en tête)
  fichier="$RAPPORTS/${1:-hierarchie}.json"
  echo "— ÉTAT DE L ÉCRAN : ${2:-fin du passage} —"
  maestro hierarchy > "$fichier" 2>&1 || true
  if [ ! -s "$fichier" ]; then
    echo "(hierarchy indisponible)"
    return 0
  fi
  echo "— TEXTES que Maestro voit (tous paquets confondus) —"
  grep -oE '"(text|accessibilityText|hintText)" : "[^"]+"' "$fichier" \
    | sort -u | head -40
  echo
  echo "— NŒUDS de l application (resource-id julaba) —"
  n=$(grep -c 'com.julaba.app' "$fichier" || true)
  echo "occurrences de « com.julaba.app » dans la hiérarchie : ${n:-0}"
  grep -oE '"(resource-id|class)" : "[^"]*(julaba|WebView|webkit)[^"]*"' "$fichier" \
    | sort -u | head -15
  echo
  # Run #7 : l'application DIT « Akwaba » (sherpa TTS le synthétise, c'est au
  # logcat) et Maestro ne le voit pas. Deux causes qui n'ont rien à voir :
  #   · mes libellés sont faux → on corrige un flow ;
  #   · Maestro ne lit pas la WEBVIEW → aucun flow ne marchera, banc à repenser.
  # Run #11 a tranché : Maestro LIT la WebView. La lecture reste imprimée parce
  # qu'elle redeviendra la bonne question le jour où la WebView changera.
  echo "LECTURE : s il n y a AUCUN texte de JULABA mais un nœud WebView,"
  echo "          Maestro ne lit pas le contenu HTML — le banc est à repenser."
  echo "          S il y a des textes, ce sont mes libellés qui sont faux."
}

echo "::group::Collecte des traces"
cp -r "$HOME/.maestro/tests" "$RAPPORTS/maestro-tests" 2>/dev/null || true
# Les `takeScreenshot: nom` écrivent dans le répertoire courant.
find . -maxdepth 1 -name '*.png' -exec mv {} "$RAPPORTS/captures/" \; 2>/dev/null || true
# Une capture de l'écran final, quel qu'il soit : quand un flow tombe sur un
# écran inattendu, c'est la première chose qu'on veut voir.
adb exec-out screencap -p > "$RAPPORTS/captures/zz-ecran-final.png" 2>/dev/null || true
grep -aE "julaba|chromium|Capacitor|sherpa|AndroidRuntime|FATAL" "$RAPPORTS/logcat.txt" \
  > "$RAPPORTS/logcat-julaba.txt" 2>/dev/null || true
kill "$PID_LOGCAT" 2>/dev/null || true
kill "$PID_ECRANS" 2>/dev/null || true
ls -la "$RAPPORTS/" "$RAPPORTS/captures/" || true
echo "::endgroup::"

# LE RELEVÉ PART DANS TOUS LES CAS : un vert qui ne dit pas CE QU IL A VU ne
# sert qu une fois. C est ce relevé qui donne les libellés du flow suivant.
# LA CARTE DU PARCOURS — tous les écrans traversés, dans l'ordre, avec leurs
# libellés RÉELS. C'est ce qui permet de corriger un flow entier d'un coup au
# lieu d'un geste par run.
echo "::group::CARTE DU PARCOURS — tous les écrans traversés"
nb=$(ls "$RAPPORTS/ecrans/" 2>/dev/null | wc -l | tr -d ' ')
echo "écrans distincts relevés : ${nb:-0}"
echo
for f in "$RAPPORTS"/ecrans/ecran-*.txt; do
  [ -f "$f" ] || continue
  cat "$f"
  echo
done
echo "::endgroup::"

echo "::group::CE QUE MAESTRO VOIT À LA FIN DU PASSAGE"
relever_hierarchie "hierarchie" "après le dernier geste du flow"
echo "::endgroup::"

# LA CAUSE DOIT ÊTRE DANS LE LOG, PAS SEULEMENT DANS LE ZIP — run #5 : le flow
# a échoué en 3 s et le log ne disait QUE « 1/1 Flow Failed ». Il fallait
# télécharger un artefact pour savoir pourquoi, ce qui rend chaque diagnostic
# dépendant d'un accès au dépôt. Une trace qui n'arrive pas jusqu'à l'œil ne
# sert à rien : c'est le même motif que tout ce qu'on corrige dans ce projet.
if [ "$echec" != "0" ]; then
  echo "::group::POURQUOI LE FLOW A ÉCHOUÉ"
  [ -f "$RAPPORTS/junit.xml" ] && { echo "— junit.xml —"; cat "$RAPPORTS/junit.xml"; echo; }
  # Maestro écrit le détail de la commande fautive dans son arbre de vue.
  find "$RAPPORTS/debug" -name '*.txt' -o -name '*.log' 2>/dev/null | head -4 | while read -r f; do
    echo "— $(basename "$f") (40 dernières lignes) —"; tail -40 "$f"; echo
  done
  # LES WAV EN BASE64 SONT ÉCARTÉS : chaque synthèse imprime des dizaines de
  # milliers de caractères qui noient les neuf lignes utiles. Trois lectures de
  # log y sont passées.
  echo "— logcat, lignes de l application (30 dernières, sans les WAV) —"
  grep -v '"wav":' "$RAPPORTS/logcat-julaba.txt" 2>/dev/null | cut -c1-240 | tail -30 || true
  echo "::endgroup::"
fi

exit "$echec"
