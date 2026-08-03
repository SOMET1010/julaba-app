# 📱 Passation dev — APK Julaba avec voix Sherpa native

**Pour :** Bernard (dev Android)
**De :** l'équipe Julaba
**Dépôt :** `github.com/SOMET1010/julaba-app` · **branche :** `claude/session-ticgbm`
**Objectif :** livrer un **APK Android** qui emballe le site Julaba existant et
remplace la reconnaissance vocale navigateur (Vosk WASM, décevante) par le moteur
**sherpa-onnx NATIF** (bien meilleur, testé et validé sur téléphone).

> **Contexte en 3 lignes.** Julaba est une PWA (React/Vite) pour des marchandes
> ivoiriennes peu/non lectrices : caisse, ventes, crédit, stock, **assistant vocal
> hors-ligne**. Le vocal doit marcher **sans internet** et comprendre des montants
> (« deux mille cinq cents »). Sherpa natif y arrive ; le WASM navigateur non.

---

## 1. Ce qui est déjà fait (et prouvé côté web)

Le **côté web + le pont** sont écrits et le **build web passe** (typecheck + `vite build`
verts). Tu n'as PAS à toucher au JS : l'interface est stable.

| Fichier | Rôle |
|---|---|
| `frontend_src/capacitor.config.ts` | Capacitor 8 · `appId=ci.julaba.app` · `webDir=../frontend/dist` |
| `frontend_src/src/app/voice-offline/nativeStt.ts` | Pont JS → plugin natif `SherpaStt` |
| `frontend_src/src/app/voice-offline/offlineStt.ts` | Bascule **natif → Sherpa** / **web → Vosk** (même interface) |
| `frontend_src/native/android/SherpaSttPlugin.kt` | **Le plugin natif** (à poser dans le projet Android) |
| `frontend_src/native/android/MainActivity.kt` | Enregistre le plugin |
| `docs/ROUTE-B-BUILD-ANDROID.md` | Procédure de build détaillée (complémentaire à ce doc) |

**Ce qui reste = le build Android** (impossible dans l'environnement qui a préparé
le code : pas de SDK Android, pas d'accès GitHub/HuggingFace). C'est ton terrain.

---

## 2. Comment marche le vocal (pour que tu saches ce que tu branches)

```
[Micro]  getUserMedia + MediaRecorder      ← couche WEB (inchangée)
   │      (useVoiceCore.ts) → blob WAV
   ▼
offlineStt.transcribeWav(wav)              ← décode le WAV en Float32 mono (WebAudio)
   │      si natif ────────────────────────┐
   ▼                                        ▼
nativeStt.transcribeNative(samples, sr)   SherpaStt.transcribe({pcm, sampleRate})
   │      encode Float32 en base64 (LE)     │  ← TON PLUGIN KOTLIN
   ▼                                        ▼
   └──────────── texte reconnu ────────────┘
   │
   ▼
validationVocale.ts   ← filtre anti-hallucination (montant multiple de 5, tournure
   │                     valide…). AGNOSTIQUE du moteur : ne pas y toucher.
   ▼
Confirmation « Vente de … pour 2500 francs, c'est bien ça ? »
```

**Contrat du plugin natif** (déjà appelé par le JS — à respecter tel quel) :
- `isAvailable(): { available: boolean }`
- `transcribe({ pcm: string /* base64 d'un Float32Array little-endian */, sampleRate: number }): { text: string }`

Le natif **rééchantillonne** à 16 kHz si besoin (le JS envoie la fréquence d'origine).

---

## 3. Procédure de build

### 3.1 Générer le projet Android
```bash
cd frontend_src
npm install
npm run build              # → ../frontend/dist
npx cap add android        # → frontend_src/android/
npx cap sync android
```

### 3.2 Poser le plugin
```bash
cp native/android/SherpaSttPlugin.kt android/app/src/main/java/ci/julaba/app/
cp native/android/MainActivity.kt     android/app/src/main/java/ci/julaba/app/   # remplace le généré
```

### 3.3 Intégrer sherpa-onnx (natif)
Depuis les **releases officielles k2-fsa/sherpa-onnx** (Android) : AAR ou `.so` JNI
(`arm64-v8a` minimum, `armeabi-v7a` si tu vises les vieux téléphones) + les classes
`com.k2fsa.sherpa.onnx.*`. Montage AAR : `android/app/libs/` + `implementation
files('libs/sherpa-onnx.aar')` dans `app/build.gradle`.

> ⚠️ **À valider par toi** : la signature exacte de l'API sherpa-onnx
> (`OnlineRecognizerConfig`, `OnlineTransducerModelConfig`, `acceptWaveform`,
> `getResult().text`) **varie selon la version**. `SherpaSttPlugin.kt` est écrit
> d'après la doc mais **n'a pas été compilé**. Aligne-le sur la version que tu prends.

### 3.4 Poser le modèle français
Modèle de départ : **`sherpa-onnx-streaming-zipformer-fr-2023-04-14`** (HuggingFace,
compte `csukuangfj`). Fichiers dans les assets, renommés simplement :
```
android/app/src/main/assets/sherpa/encoder.onnx   (prendre l'int8 si dispo)
android/app/src/main/assets/sherpa/decoder.onnx
android/app/src/main/assets/sherpa/joiner.onnx    (int8 si dispo)
android/app/src/main/assets/sherpa/tokens.txt
```
(Si tu gardes les noms d'origine, adapte la constante `base`/chemins dans le plugin.)

### 3.5 Micro dans le WebView (piège classique)
L'audio est capté côté **web** → il faut que le WebView Android **accorde** le micro :
- `AndroidManifest.xml` : `<uses-permission android:name="android.permission.RECORD_AUDIO" />`
- Gérer `WebChromeClient.onPermissionRequest` → accorder `AUDIO_CAPTURE` (Capacitor :
  vérifier le comportement du bridge ; au besoin, sous-classer). Test : le 1er appui
  micro doit déclencher la demande de permission Android.

### 3.6 Compiler + tester
```bash
cd android && ./gradlew assembleDebug     # APK : app/build/outputs/apk/debug/
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

## 4. Critères d'acceptation (le juge = les chiffres)

1. Ouvrir Julaba (APK) → écran de vente vocale.
2. Dire : **« je vends trois tomates à deux mille cinq cents francs »**
   → la confirmation doit afficher **vente / 2500**.
3. Dire : **« neuf mille neuf cents francs »** → **9900**.
4. **Mode avion** (aucun réseau) → le vocal fonctionne toujours.
5. Repli : si le moteur ne charge pas, `isAvailable` renvoie `false` et l'app ne
   plante pas (elle guide au lieu d'erreur).

Livrable : un **APK signé debug** installable + un court retour sur ce que tu as dû
ajuster (version sherpa, noms de modèle, permission WebView).

---

## 5. Décisions ouvertes (à cadrer avec Patrick, pas bloquantes pour un 1er APK)

- **ABI ciblées** : `arm64-v8a` seul (léger) ou + `armeabi-v7a` (vieux téléphones) ?
- **Modèle** : rester sur le FR 2023-04-14, ou un modèle plus récent/plus précis si
  tu en trouves un adapté au hors-ligne sur téléphone modeste ?
- **Distribution** : sideload (APK direct) d'abord, Play Store plus tard ?
- **Signature release** : keystore à créer pour la version distribuée.

## 6. Points de vigilance / dette connue

- Le **web garde Vosk** en repli tant que l'APK natif n'est pas validé sur appareil.
  Une fois Route B prouvée : décider appli native seule (retirer Vosk + son chunk de
  5,8 Mo du bundle) ou garder les deux plateformes.
- **Bouton micro de l'écran de connexion** (dictée du numéro à 10 chiffres) : à
  retirer côté UI dans un second temps (chantier auth). Sur natif il échoue déjà
  proprement → la connexion retombe sur le pavé + PIN. Ne te bloque pas dessus.
- Taille APK : modèle (~40–80 Mo) **embarqué** → APK lourd mais **zéro
  téléchargement** pour la marchande. C'est voulu.

## 7. Estimation

Pour un dev à l'aise avec Android + Capacitor : **~1 à 3 jours**. Les deux vrais
risques sont (a) l'**intégration native de sherpa-onnx** (API + `.so` + assets) et
(b) le **micro dans le WebView**. Le reste (Capacitor, plugin) est balisé.

## 8. Références
- Modèle FR : https://huggingface.co/csukuangfj/sherpa-onnx-streaming-zipformer-fr-2023-04-14
- Modèles sherpa-onnx : https://k2-fsa.github.io/sherpa/onnx/pretrained_models/index.html
- Code sherpa-onnx (Android + API) : https://github.com/k2-fsa/sherpa-onnx
- Doc Capacitor Android : https://capacitorjs.com/docs/android
