# 📱 Route B — construire l'APK Julaba avec Sherpa natif

> **But** : emballer le site Julaba (React/Vite) dans une appli Android et brancher
> le moteur vocal **sherpa-onnx natif** (celui qui a donné les résultats bluffants
> en test), au lieu de Vosk WASM dans le navigateur.
>
> **Ce dépôt contient déjà le côté web + le côté pont** (prouvés au build web).
> Ce document décrit ce qui reste — le **build Android** — qui exige un atelier
> avec le **kit Android + internet** (impossible dans le conteneur Claude qui a
> préparé ce code : ni SDK Android, ni accès GitHub/HuggingFace).
>
> Statut d'honnêteté : les **fichiers Kotlin et l'API sherpa-onnx** ci-dessous
> sont écrits d'après la doc officielle mais **non compilés ici**. À valider sur
> appareil. Rien n'est « prouvé » tant que l'APK ne tourne pas sur un téléphone.

## Ce qui est déjà fait dans le dépôt (côté web, prouvé)
- `frontend_src/package.json` — Capacitor 8 ajouté (`@capacitor/core|cli|android`).
- `frontend_src/capacitor.config.ts` — `appId=ci.julaba.app`, `webDir=../frontend/dist`.
- `frontend_src/src/app/voice-offline/nativeStt.ts` — pont JS vers le plugin natif.
- `frontend_src/src/app/voice-offline/offlineStt.ts` — bascule : **natif → Sherpa**,
  **web → Vosk** (inchangé). Même interface, `useVoiceCore` ne bouge pas.
- `frontend_src/native/android/SherpaSttPlugin.kt` + `MainActivity.kt` — le plugin
  natif, prêt à poser dans le projet Android.

## Prérequis de l'atelier
- Android Studio **ou** ligne de commande : Android SDK (API 34+), JDK 17, Gradle.
- Accès internet (npm, dépôt sherpa-onnx, HuggingFace pour le modèle).
- Un téléphone Android (arm64-v8a) en mode développeur pour tester.

## Étapes

### 1. Générer le projet Android
```bash
cd frontend_src
npm install                 # récupère aussi Capacitor
npm run build               # produit ../frontend/dist (le site)
npx cap add android         # crée frontend_src/android/
npx cap sync android        # copie le site + plugins dans le projet natif
```

### 2. Poser le plugin natif
Copier les deux fichiers Kotlin fournis dans le paquet `ci.julaba.app` :
```bash
cp native/android/SherpaSttPlugin.kt android/app/src/main/java/ci/julaba/app/
cp native/android/MainActivity.kt     android/app/src/main/java/ci/julaba/app/
```
(`MainActivity.kt` **remplace** celui généré ; seule différence : `registerPlugin`.)

### 3. Ajouter la brique sherpa-onnx native
Depuis les **releases officielles sherpa-onnx** (k2-fsa), récupérer pour Android :
- l'**AAR** `sherpa-onnx-*.aar` **ou** les `.so` JNI (`libsherpa-onnx-jni.so`) pour
  les ABI `arm64-v8a` (et `armeabi-v7a` si tu vises les vieux téléphones) + les
  classes `com.k2fsa.sherpa.onnx.*`.

Deux montages possibles (suivre la doc Android de sherpa-onnx, à jour) :
- **AAR** → `android/app/libs/` + dans `android/app/build.gradle` :
  `implementation files('libs/sherpa-onnx.aar')`
- **Sources + .so** → coller le dossier `com/k2fsa/sherpa/onnx/*.kt` dans
  `android/app/src/main/java/` et les `.so` dans `android/app/src/main/jniLibs/<abi>/`.

> ⚠️ **À vérifier** : le nom exact des classes/paramètres (`OnlineRecognizerConfig`,
> `OnlineTransducerModelConfig`, signature de `acceptWaveform`) peut varier selon
> la **version** de sherpa-onnx. Aligner `SherpaSttPlugin.kt` sur la version prise.

### 4. Poser le modèle français dans l'APK
Modèle de départ : **`sherpa-onnx-streaming-zipformer-fr-2023-04-14`**
(HuggingFace `csukuangfj/...`). Télécharger, puis placer dans les assets sous des
noms simples attendus par le plugin :
```
android/app/src/main/assets/sherpa/encoder.onnx     (encoder-…​.int8.onnx)
android/app/src/main/assets/sherpa/decoder.onnx     (decoder-…​.onnx)
android/app/src/main/assets/sherpa/joiner.onnx      (joiner-…​.int8.onnx)
android/app/src/main/assets/sherpa/tokens.txt
```
> Choisir les fichiers **int8** quand ils existent (plus légers, adaptés aux
> téléphones modestes). Adapter les noms dans `SherpaSttPlugin.kt` (`base`) si tu
> gardes les noms d'origine.

### 5. Autoriser le micro dans le WebView
L'audio est capté par la couche **web** (`getUserMedia` → MediaRecorder), puis
décodé et transmis au natif. Il faut donc :
- `android/app/src/main/AndroidManifest.xml` :
  `<uses-permission android:name="android.permission.RECORD_AUDIO" />`
- Vérifier que le WebView **accorde** la demande micro (Capacitor : gérer
  `onPermissionRequest` → `AUDIO_CAPTURE`). Tester : le premier appui micro doit
  déclencher la demande de permission Android.

### 6. Compiler et tester
```bash
cd android
./gradlew assembleDebug          # APK dans app/build/outputs/apk/debug/
# installer sur le téléphone (adb install -r …) puis :
```
Test de recette (le **seul** juge = les chiffres) :
1. Ouvrir Julaba (l'APK), aller sur une vente vocale.
2. Dire : **« je vends trois tomates à deux mille cinq cents francs »**.
3. Vérifier que la confirmation affiche **vente / 2500** (le filtre
   `validationVocale.ts` s'applique à l'identique).
4. Refaire hors-ligne (mode avion) → doit marcher **sans réseau**.

## Points de vigilance (dette à suivre)
- Le web garde **Vosk** comme repli tant que l'APK natif n'est pas prouvé. Une fois
  Route B validée sur appareil, décider : appli native seule (retirer Vosk + le
  chunk 5,8 Mo du bundle) ou garder les deux plateformes.
- **Retrait du bouton micro de connexion** (dictée du numéro) : non fait ici, c'est
  une suite du chantier **auth**. Sur natif, `startLiveDictation` échoue proprement
  → la connexion retombe sur le pavé + PIN.
- Taille de l'APK : le modèle (~40–80 Mo) est **embarqué** → pas de téléchargement
  pour la marchande, mais APK plus lourd. Acceptable (installé une fois).

## Références
- Modèle FR : https://huggingface.co/csukuangfj/sherpa-onnx-streaming-zipformer-fr-2023-04-14
- Doc modèles sherpa-onnx : https://k2-fsa.github.io/sherpa/onnx/pretrained_models/index.html
- Assets WASM/Android (structure des fichiers) : dépôt `k2-fsa/sherpa-onnx`.
