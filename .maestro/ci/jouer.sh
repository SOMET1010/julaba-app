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

echo "::group::Installation de l APK"
adb uninstall com.julaba.app || true
adb install -r "$APK"
echo "::endgroup::"

mkdir -p "$RAPPORTS/captures" "$RAPPORTS/debug"

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
ls -la "$RAPPORTS/" "$RAPPORTS/captures/" || true
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
  # LA QUESTION QUI DÉCIDE DE TOUT LE BANC — run #7 : l'application DIT
  # « Akwaba » (sherpa TTS le synthétise, c'est dans le logcat) et Maestro ne le
  # voit pas. Deux causes possibles, et elles n'ont rien à voir :
  #   · mes libellés sont faux → on corrige un flow ;
  #   · Maestro ne lit pas le contenu de la WEBVIEW Capacitor → AUCUN flow ne
  #     pourra jamais marcher, et le banc entier est à repenser.
  # La hiérarchie de vue tranche en une ligne. Sans elle, on devine.
  # Run #8 : un `head -120` brut n'a montré que `com.android.systemui` — la
  # barre de statut — donc rien de concluant : une hiérarchie COMMENCE par là.
  # On ne tronque plus, on FILTRE, et on compte : la question est « Maestro
  # voit-il du texte de JULABA », pas « à quoi ressemble l'arbre ».
  maestro hierarchy > "$RAPPORTS/hierarchie.json" 2>&1 || true
  if [ -s "$RAPPORTS/hierarchie.json" ]; then
    echo "— TEXTES que Maestro voit (tous paquets confondus) —"
    grep -oE '"(text|accessibilityText|hintText)" : "[^"]+"' "$RAPPORTS/hierarchie.json" \
      | sort -u | head -40
    echo
    echo "— NŒUDS de l application (resource-id julaba) —"
    n=$(grep -c 'com.julaba.app' "$RAPPORTS/hierarchie.json" || true)
    echo "occurrences de « com.julaba.app » dans la hiérarchie : ${n:-0}"
    grep -oE '"(resource-id|class)" : "[^"]*(julaba|WebView|webkit)[^"]*"' "$RAPPORTS/hierarchie.json" \
      | sort -u | head -15
    echo
    echo "LECTURE : s il n y a AUCUN texte de JULABA mais un nœud WebView,"
    echo "          Maestro ne lit pas le contenu HTML — le banc est à repenser."
    echo "          S il y a des textes, ce sont mes libellés qui sont faux."
  else
    echo "(hierarchy indisponible)"
  fi
  echo
  echo "— logcat, lignes de l application (30 dernières) —"
  tail -30 "$RAPPORTS/logcat-julaba.txt" 2>/dev/null || true
  echo "::endgroup::"
fi

exit "$echec"
