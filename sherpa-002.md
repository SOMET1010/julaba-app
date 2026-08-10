# sherpa-002.md — Intégration sherpa-onnx (offline STT + TTS) dans Julaba

> **Document de conception n°2** — rédigé après lecture complète du code (branche `dev`, août 2026).
> Complète `docs/INTEGRATION_SHERPA_ONNX.md` (doc n°1, centré STT WASM) en ajoutant :
> lecture factuelle du code réel, points d'ancrage exacts, TTS offline, mot-réveil,
> vues à créer/modifier et plan d'exécution chiffré.
>
> **Objectif :** remplacer la chaîne vocale dépendante (Vosk WASM figé, voix navigateur)
> par **sherpa-onnx 100 % sur l'appareil** — STT *et* TTS — sur le web (PWA/WASM) et
> l'APK Android (plugin natif Capacitor), sans rien casser de l'existant offline-first.

---

## 1. Résumé exécutif

| | Aujourd'hui | Après sherpa-002 |
|---|---|---|
| **STT web** | `vosk-browser` (WASM, paquet quasi abandonné, modèle ~40 Mo GitHub Pages tiers) | ✅ **IMPLÉMENTÉ (Phase 1)** : `sherpa-onnx` WASM v1.13.4 (runtime vendored + modèle FR zipformer int8 ~128 Mo) ; Vosk conservé en **repli automatique** (WebView/Safari sans COOP/COEP) |
| **STT Android** | Plugin `SherpaSttPlugin.kt` **factice** (non compilé) | Vrai plugin AAR `com.k2fsa.sherpa.onnx:sherpa-onnx-android` |
| **TTS web/APK** | Clips Tata pré-enregistrés (137) + voix navigateur `speechSynthesis` | + **TTS neuronal sherpa-onnx** (modèle vits FR) pour les phrases dynamiques |
| **Mot-réveil** | `useWakeWord` présent mais **désactivé** (`wakeSupported` toujours faux) | Keyword spotting sherpa-onnx → « mains libres » réel |
| **Streaming** | Transcription *post-hoc* (après stop) | Transcription au fil de l'eau (live transcript) |

**Règle d'or** : ne jamais casser le contrat consommé par `useVoiceCore.ts` et
`main.tsx`. On remplace les implémentations **sous les mêmes interfaces**
(`transcribeWav`, `ensureOfflineModel`, `offlineModelReady`, `speakBrowser`, …).

---

## 2. État des lieux — ce que dit réellement le code

### 2.1 Backend (`backend/src/voice/`) — reste le **repli**, pas le moteur principal

Le frontend a déjà été migré vers le « tout local » : `useVoiceCore.ts` ne parle
**plus** au serveur pour la voix (le chemin serveur était mort faute de clé).
Le backend reste néanmoins une brique de sécurité (repli cloud Whisper/GPT-4o,
TTS Piper) à ne pas supprimer.

| Fichier | Rôle réel | Note pour sherpa |
|---|---|---|
| `voice.service.ts` | Orchestration : `transcribe()` (l.50-80), `detectIntent()` (l.82+), `synthesize()` (l.340+) | Sélection moteur par `VOICE_STT_ENGINE` (`whisper`/`vosk`). Le flag `VOICE_LOCAL_STT=1` → vosk. Repli OpenAI cloud. |
| `vosk.service.ts` | STT Vosk **Node natif** (`VOSK_MODEL_PATH`), parseur WAV maison (`parseWav`) | Utile : le parseur WAV est réutilisable tel quel pour le backend sherpa-onnx-node |
| `whisper.service.ts` | STT whisper.cpp via `spawn` (binaire + `ggml-base.bin`) | Remplaçable un jour par `sherpa-onnx-node` |
| `piper.service.ts` | TTS Piper via `spawn` (`.onnx` + `.onnx.json`, voix Tata Lou) | **Le format Piper est compatible sherpa-onnx** (vits) → possibilité de converger les deux |
| `openai.service.ts` | Cloud : Whisper API, LLM `LLM_BASE_URL` configurable, ElevenLabs (coupé par défaut) | Repli cloud, inchangé |
| `local-intent.service.ts` | Classifieur transactionnel sans LLM | Inchangé |
| `voice.controller.ts` | `/voice/process`, `/voice/intent`, `/voice/intent-fast`, `/tts/openai`, `/tts/status` | Inchangé |
| `voice.module.ts` | Déclare les providers | **+ `SherpaNodeService` si on ajoute le moteur backend** |

### 2.2 Frontend web / PWA — le cœur de l'intégration

#### Pipeline vocal unique (`frontend/src/app/hooks/useVoiceCore.ts`, v5)

Le flux réel (lu dans le code) :

```
handleMicClick → startRecording (getUserMedia → MediaRecorder webm/opus)
  → stopRecording → processAudio(mimeType)
      1. offlineModelReady() ? sinon : "Je prépare ta voix…" + ensureOfflineModel()
      2. transcribeWav(audioBlob)                     ← voice-offline/offlineStt.ts
      3. intentLocal(texte)                           ← voice-offline/localIntent.ts
         → si reconnu (vente/dépense) : handleResponse(...)   [100% local]
         → sinon : "Je n'ai pas bien compris…" (clip Tata)
      4. TTS : clips Tata (tataUiClips/tataVoice) → sinon speakBrowser (voix navigateur)
```

- **`offlineStt.ts`** (voice-offline/) : charge `vosk-browser` en **import dynamique**,
  télécharge le modèle depuis `voskModel.ts` (GitHub Pages tiers !), expose
  `transcribeWav`, `ensureOfflineModel`, `offlineModelReady`, `offlineModelInstalled`,
  `warmOfflineModelIfInstalled`, `startLiveDictation` (déjà un flux streaming !).
  **Il préfère déjà `nativeStt` s'il est disponible** (l.55-65) : le pont sherpa
  Android est donc *déjà branché* côté web.
- **`nativeStt.ts`** (voice-offline/) : pont JS→Capacitor `SherpaStt`
  (`isAvailable()`, `transcribe({pcm: base64 Float32Array LE, sampleRate})`).
  Contrat **stable et correct** — à ne pas casser.
- **`InstallerOffline.tsx`** : bouton « Installer le mode hors-ligne » (double
  validation + avertissement coût données mobiles). Utilisé par `VenteVocaleModal.tsx:300`,
  `OnboardingSlides.tsx:307`, `LoginPassword.tsx:1060`. **Texte et taille figés sur Vosk**
  (« ~40 Mo ») → à rendre agnostique du moteur.
- **`localIntent.ts` / `extraction.ts` / `vocabulaire.ts`** : compréhension locale
  (grammaire Vosk dérivée de `GRAMMAR_WORDS`). Réutilisables **tels quels** en post-traitement.
- **`offlineCaisse.ts`** : outbox IndexedDB (idempotence). Indépendant du moteur.
- **`useOfflineVoiceQueue.ts`** : file de commandes vocales hors-ligne. Indépendant du moteur.

#### TTS frontend (`services/elevenlabs.ts` + `services/audioManager.ts`)

- `fetchTTS()` **renvoie `null` volontairement** (cloud coupé, décision produit) →
  toute la TTS repose sur : **clips Tata** (`tataUiClips.ts`, 137 mp3 embarqués) puis
  **`speakBrowser()`** (voix `speechSynthesis` FR féminine).
- `audioManager.ts` : chef d'orchestre (une seule source à la fois, barge-in,
  priorité user/auto, joueurs injectables `__setPlayers`). **Point d'ancrage idéal**
  pour brancher un moteur TTS neuronal sherpa à la place de `speakBrowser`.
- `predictiveTTS.ts` / `earlyAudioCache.ts` : cache de phrases fréquentes.

#### Vues concernées (lecture réelle)

| Vue | Fichier | Où la voix apparaît |
|---|---|---|
| Modale vente vocale (marchand) | `components/marchand/VenteVocaleModal.tsx` | Bouton Tata (push-to-talk), `InstallerOffline` (l.300), **bloc « mains libres » masqué** (`wakeSupported &&` l.~395), exemples, confirmation, bandeau hors-ligne |
| Bouton micro générique | `components/voice/VoiceButton.tsx` | `useVoiceCore` seul, statuts animés |
| Assistante Tata (tous rôles) | `components/assistant/TantieSagesseModal.tsx` | Écoute/parle/confirme, suggestions par rôle |
| Exemples vocaux | `components/assistant/CommandesVocales.tsx` | Exemples par rôle |
| Onboarding | `components/auth/OnboardingSlides.tsx` | `InstallerOffline` (l.307) dans l'étape voix |
| Login | `components/auth/LoginPassword.tsx` | `InstallerOffline` (l.1060) |
| Boot | `src/main.tsx` | `warmOfflineModelIfInstalled()` différé (l.40-46) |
| PWA | `public/sw.js` | Pré-cache chunks + clips Tata (~7 Mo) |

### 2.3 Natif Android — l'état réel

- ✅ **Projet Capacitor généré (août 2026)** : `android/` à la racine
  (`npx cap add android`, Capacitor 8.5). `MainActivity.java` standard,
  `applicationId = ci.julaba.app`, web assets (dont le runtime sherpa WASM) déjà
  copiés dans `android/app/src/main/assets/public/`. Build APK = étape suivante
  (Android Studio / SDK).
- ✅ `capacitor.config.ts` corrigé : `webDir: "frontend/dist"` (le préfixe
  `webDir=` en trop a été retiré).
- ✅ **Phase 2 faite (août 2026)** : AAR `sherpa-onnx-1.13.4.aar` intégré dans
  `android/app/libs/` (déclaré dans `build.gradle`), vrai plugin
  `SherpaSttPlugin.java` (OnlineRecognizer natif) enregistré dans
  `MainActivity.java`. Le brouillon `frontend/native/android/SherpaSttPlugin.kt`
  a été **supprimé** (remplacé par le plugin Java, le projet Android n'étant pas
  configuré Kotlin).
- ⚠️ **L'AAR n'est PAS sur Maven Central** (vérifié : 404). Il se télécharge
  depuis les releases GitHub (`sherpa-onnx-1.13.4.aar`, ~48 Mo, 4 ABI jniLibs +
  classes) via `scripts/fetch-sherpa-aar.sh`. Le fichier est gitignoré
  (`android/app/libs/*.aar`) — relancer le script avant un build Android.

---

## 3. Pourquoi sherpa-onnx (données vérifiées août 2026)

| Critère | Vosk (actuel) | sherpa-onnx |
|---|---|---|
| Paquet npm | `vosk-browser@0.0.8` (figé, projet quasi abandonné) | **`sherpa-onnx@1.13.4`** (publié il y a ~1 mois, actif) |
| Support web (WASM) | Oui (Kaldi) | Oui — `sherpa-onnx-wasm.online.js` / `.offline.js` |
| Support Android natif | Non | **AAR officiel Maven** : `com.k2fsa.sherpa.onnx:sherpa-onnx-android` |
| Moteurs | Kaldi seul | zipformer, paraformer, transducer, CTC, nemo, whisper… |
| **TTS** | Non (voix navigateur) | **Oui** : vits (dont modèles Piper), matcha, kokoro, kitten |
| **Keyword spotting** | Non | **Oui** (`createKeywordSpotter`) → mot-réveil réel |
| Streaming | Limitée | `OnlineRecognizer` natif + WASM, partiel au fil de l'eau |
| Modèle FR | small-fr pguyot ~40 Mo (vocabulaire fermé) | **`sherpa-onnx-streaming-zipformer-fr-2023-04-14`** (fp32/int8) |

**Modèle FR STT (officiel, HuggingFace) :**
- `shaojieli/sherpa-onnx-streaming-zipformer-fr-2023-04-14` — streaming zipformer
  (transducer), variantes **fp32** et **int8**. Fichiers : `encoder.onnx`,
  `decoder.onnx`, `joiner.onnx`, `tokens.txt`. Taille totale **vérifiée (août
  2026) : ~128 Mo en int8** — encoder 126,6 Mo, decoder 1,3 Mo, joiner 0,26 Mo,
  tokens 4,8 Ko. Le fp32 (encoder seul ~292 Mo) est inutilisable sur mobile.
- Existe aussi un modèle Kaldi/Vosk FR convertible (`sherpa-onnx-k2-vosk-fr`) —
  plus léger, à tester comme fallback RAM faible (moteur offline, Phase 3).

**TTS FR (officiel) :**
- Les voix **Piper FR** (fr_FR-siwis-low, fr_FR-upmc, fr_FR-gilles…) sont
  **directement compatibles** avec sherpa-onnx (format vits-piper). La voix déjà
  utilisée côté backend (`backend/scripts/setup-piper.sh` → `fr_FR-siwis-low.onnx`)
  peut donc être **réutilisée sur l'appareil** — une seule voix partout.
- Le repo officiel liste aussi `en_US-lessac-medium` (61 Mo) comme référence ;
  pour le FR il faut pointer le tarball `vits-piper-fr_FR-*` (voir §7).

---

## 4. Points d'ancrage — OÙ brancher exactement

### 4.1 Web / PWA — remplacer Vosk WASM (fichier central : `voice-offline/offlineStt.ts`) ✅ FAIT

On **conserve toutes les fonctions publiques** et on change l'intérieur.
Réalité technique (différente du plan initial, cf. §9.1) :

```ts
// offlineStt.ts (extrait) — chargement du runtime + modèle FR
const w = window as any;
w.Module = { getPreloadedPackage: () => new ArrayBuffer(0) }; // saute le .data EN de 190 Mo
await loadScript(SHERPA_API_JS);          // définit createOnlineRecognizer (global)
await loadScript(SHERPA_RUNTIME_GLUE_JS); // instancie le module WASM (pthreads)
// après onRuntimeInitialized : écriture du modèle FR dans la FS virtuelle
mod.FS_createDataFile('/model-encoder.onnx', null, bytes, true, true, true);
const recognizer = w.createOnlineRecognizer(buildSherpaOnlineConfig(), mod);
// transcription : stream.acceptWaveform(16000, Float32Array) → while(isReady) decode → getResult().text
```

Fichiers touchés (faits) :
1. **`voice-offline/sherpaModel.ts`** *(nouveau)* — URLs du modèle FR int8
   (HuggingFace, CORS ouvert), tailles, chemins FS virtuels, `buildSherpaOnlineConfig()`.
2. **`voice-offline/offlineStt.ts`** — moteur sherpa en principal : chargement
   runtime (scripts classiques), téléchargement 4 fichiers avec progression →
   Cache API → FS Emscripten, `transcribeWav` + `startLiveDictation` (streaming).
   **Repli Vosk automatique** (code Vosk conservé tel quel) si pas d'isolation
   cross-origin, runtime absent ou erreur. API publique identique.
3. **`voice-offline/InstallerOffline.tsx`** — agnostique moteur : taille réelle
   (~128 Mo sherpa / ~40 Mo Vosk) + nom du moteur affiché.
4. **`scripts/install-sherpa-stt.sh`** *(nouveau)* — vendore le runtime WASM
   (3 fichiers, ~19 Mo, SANS le .data EN) dans `public/voix/sherpa/`. Défensif
   (exit 0). Appelé par `deploy-frontend.sh` et le build Render.
5. **Headers COOP/COEP** *(exigence déploiement)* — `Cross-Origin-Opener-Policy:
   same-origin` + `Cross-Origin-Embedder-Policy: credentialless` posés dans
   `nginx/julaba.conf`, `nginx/frontend.conf`, `render.yaml` et le dev server Vite.
6. **`main.tsx`** — signature conservée ; le ré-échauffement sherpa est **sans
   réseau** (cache uniquement, on ne télécharge jamais 128 Mo en silence).
   `vosk-browser` reste dans package.json (repli) — à retirer seulement si l'on
   abandonne les contextes non isolés.

### 4.2 Android natif — réaliser le vrai plugin (`SherpaSttPlugin.java`) ✅ FAIT

1. ✅ **Projet Android** : `npx cap add android` (racine `android/`, Capacitor 8.5,
   `MainActivity.java` avec `registerPlugin(SherpaSttPlugin.class)`,
   `applicationId ci.julaba.app`).
2. ✅ **AAR** : pas de coordonnée Maven (404 vérifié) → AAR téléchargé depuis les
   releases GitHub (48,8 Mo, 4 ABI : arm64-v8a, armeabi-v7a, x86, x86_64) dans
   `android/app/libs/sherpa-onnx-1.13.4.aar` (gitignoré, script
   `scripts/fetch-sherpa-aar.sh`), déclaré via
   `implementation files('libs/sherpa-onnx-1.13.4.aar')`.
3. ✅ **`SherpaSttPlugin.java`** (Java — le projet Android n'est pas configuré
   Kotlin, et le demo officiel de l'API est en Java) :
   - `isAvailable()` → `{ available }` (recognizer construit).
   - `prepare({ dir, files })` → télécharge les fichiers absents/incorrects
     (HTTP, écriture atomique `.tmp`, events `modelProgress` par % par fichier)
     puis construit `OnlineRecognizer(null, config)` (transducer zipformer FR
     int8, `modelType: zipformer`, `numThreads: 2`). Idempotent : si les 4
     fichiers sont déjà dans `filesDir` (taille vérifiée), aucun réseau.
   - `transcribe({ pcm, sampleRate })` → base64 Float32 LE décodé,
     rééchantillonnage linéaire → 16 kHz, `createStream("")` →
     `acceptWaveform` + `inputFinished` + `while(isReady) decode` →
     `getResult().getText()` ; `stream.release()` en finally.
   - `release()` + `handleOnDestroy()` → libère le recognizer (mémoire ~128 Mo).
   - Exécution sur un **thread unique** (`ExecutorService`) : téléchargements et
     transcriptions sérialisés (recognizer non thread-safe).
4. ✅ **Modèle FR** : téléchargé par le plugin dans `filesDir/sherpa-stt/`
   (encoder.onnx, decoder.onnx, joiner.onnx, tokens.txt) — mêmes URLs/tailles
   que le WASM (`SHERPA_NATIVE_FILES`). Pas d'assets embarqués (128 Mo).
5. ✅ **JS branché** : `nativeStt.ts` (+`prepare`/`release`/`present`),
   `offlineStt.ts` — le moteur NATIF est choisi en premier sur APK dans
   `ensureOfflineModel` (même garde anti-téléchargement silencieux que le WASM),
   ré-échauffé au boot (idempotent, sans réseau si déjà installé), dictée live
   « par lots » (~2 s) pour `startLiveDictation`.

> 🔁 **Topologie** : sur APK, `nativeStt.isAvailable()` → vrai → `offlineStt.ts`
> **bascule automatiquement** (transcribeWav l.~65). Zéro changement dans
> `useVoiceCore.ts` pour le STT.

### 4.3 TTS offline — brancher sherpa TTS dans le chef d'orchestre (⚠️ code prêt, PAS livré)

Point d'ancrage : **`services/audioManager.ts` → `defaultTtsSpeakChunk`** (le bas-niveau
utilisé par `realStartTts`, le lecteur TTS injectable). Désormais :

```ts
// services/audioManager.ts (extrait) — TTS neuronal AVANT la voix navigateur
const defaultTtsSpeakChunk = async (chunk: string): Promise<void> => {
  try {
    const { speakChunkSherpaOrBrowser } = await import("./sherpaTts");
    await speakChunkSherpaOrBrowser(chunk);
  } catch {
    const { speakBrowser } = await import("./elevenlabs");
    await speakBrowser(chunk); // repli même si l'import échoue
  }
};
```

Nouveau **`services/sherpaTts.ts`** (implanté, défensif) :
- Charge le runtime WASM officiel sherpa-onnx via un **Worker module**
  (`sherpa-onnx-tts.worker.js`, fourni avec le build Emscripten) — ne bloque pas l'UI.
- `createOfflineTts(Module)` → `tts.generate({ text, sid, speed })` →
  `{ samples: Float32Array, sampleRate }` joué via le **contexte audio partagé**
  (`getSharedAudioContext` d'elevenlabs) → aucune re-création coûteuse.
- `speakChunkSherpaOrBrowser(chunk)` : essaie sherpa → sinon `speakBrowser` (jamais muet).
- `stopSherpaTts()` coupe `activeSource` (source.stop() → onended) — appelé par
  `realStartTts.stop()` pour une annulation propre (barge-in, navigation).
- Installation : `installSherpaTtsModel()` (HEAD sur le worker + drapeau localStorage
  `julaba_tts_installed`) + `warmSherpaTtsIfInstalled()` (réchauffé à chaque boot,
  cf. `src/main.tsx`). ⚠️ Le null de « non installé » n'est JAMAIS mis en cache :
  une installation après une première phrase fonctionne.

> ⚠️ **ÉTAT RÉEL (août 2026)** : ce code est écrit mais **JAMAIS livré**.
> `deploy-frontend.sh` et `render.yaml` ne déploient que le runtime **STT**
> (`install-sherpa-stt.sh`), jamais le TTS — et `frontend/public/voix/sherpa/`
> ne contient que les 3 fichiers ASR. Le worker `sherpa-onnx-tts.worker.js` est
> donc ABSENT (404) → `installSherpaTtsModel()` renvoie false et le bouton
> « Installer la voix neuronale » affiche toujours « non prêt ». La voix RÉELLE
> reste `speakBrowser` (repli garanti). Le build WASM custom FR est requis
> (voir Phase 4) — le pocket-tts officiel est refusé (démo multilingue ~200 Mo).

Hiérarchie TTS après intégration (sans casser l'existant) :
1. **Clip Tata pré-enregistré** (phrase fixe) — inchangé, prioritaire.
2. **sherpa TTS** (phrase dynamique : montants, questions) — **nouveau, avant le navigateur**.
3. **`speakBrowser`** (voix navigateur) — dernier repli, jamais muet.

### 4.4 Mot-réveil « mains libres » — activer réellement

`useWakeWord.ts` existe déjà ; `VenteVocaleModal.tsx` a **déjà tout le bloc UI**
(l.~395 `wakeSupported && …`) mais `wakeSupported` est toujours faux (désactivé
volontairement tant qu'il n'y a pas de version hors-ligne). Avec sherpa keyword
spotter :

```ts
const kws = onnx.createKeywordSpotter({ keywords: 'julaba', ... });
// → onWake()/onCommand() branchés sur les événements
```

La UI mains libres se **débloque toute seule** quand `wakeSupported` devient vrai.

---

## 5. Fonctionnalités visées (par priorité)

| # | Fonctionnalité | Moteur | Impact | Priorité |
|---|---|---|---|---|
| F1 | STT offline web (remplace Vosk WASM) | sherpa-onnx WASM zipformer FR int8 | Précision ++, streaming live | **P0** |
| F2 | STT offline APK Android natif | AAR sherpa-onnx + plugin Java (`SherpaSttPlugin.java`) | Vraie offline mobile, rapidité | **P0 — ✅ FAIT** (build/test APK réel restant) |
| F3 | Transcription au fil de l'eau (live transcript) | `OnlineRecognizer` + `startLiveDictation` | UX : on voit ce qu'on dit | P1 |
| F4 | Mot-réveil « Julaba » (mains libres) | Keyword spotter | 2 mains prises → parler | P1 |
| F5 | TTS neuronal offline (phrases dynamiques) | vits-piper FR via WASM | Voix naturelle hors-ligne | P2 |
| F6 | Gestion modèles (téléchargement, mise à jour, hash, reprise) | InstallerOffline v2 + IndexedDB | Données mobiles maîtrisées | P1 |
| F7 | Moteur backend `sherpa-onnx-node` (repli serveur) | npm `sherpa-onnx` (node-addon) | Cohérence modèle partout | P3 |
| F8 | Réutiliser la voix Piper FR existante (`fr_FR-siwis`) pour TTS appareil | vits-piper | **Une seule voix Tata Lou** | P2 |

---

## 6. Vues (UI) à créer / modifier

### 6.1 Modifier

| Vue | Fichier | Modification |
|---|---|---|
| Installation modèle | `voice-offline/InstallerOffline.tsx` | Agnostique moteur : libellé dynamique (sherpa int8 ~60 Mo), progression réelle (octets/%), reprise, hash. **Déjà utilisé** par VenteVocaleModal/OnboardingSlides/LoginPassword → mise à jour automatique partout. **Écrit mais non opérationnel (TTS)** : section `InstallerVoixNeuronale` (bouton « Installer la voix neuronale », double validation, statut prêt/erreur) présente sous le bloc STT, mais le runtime TTS n'est pas déployé → toujours « non prêt » |
| Modale vente vocale | `marchand/VenteVocaleModal.tsx` | Badge moteur (sherpa/vosk/natif), **réactiver le bloc mains libres**, afficher le live transcript pendant l'enregistrement, état du téléchargement modèle. |
| Assistante Tata | `assistant/TantieSagesseModal.tsx` | Idem badge moteur + live transcript. |
| Bouton micro | `voice/VoiceButton.tsx` | Afficher le live transcript (déjà géré via `liveTranscript`). |
| Boot | `src/main.tsx` | Inchange (signature conservée) ; ajuster le commentaire « VOSK » → « moteur vocal ». |
| PWA | `public/sw.js` + `vite.config.ts` | Pré-cache éventuel des fichiers `.onnx` du modèle (via Cache API, ~60 Mo → **pas par défaut**, à l'installation consentie comme aujourd'hui). |

### 6.2 Créer (propositions)

1. **Écran « Moteur vocal & modèles »** (section réglages utilisateur, accessible
   depuis VenteVocaleModal / Profil) :
   - Statut : moteur actif (WASM / Natif APK / indisponible), version sherpa-onnx.
   - Modèles installés : nom, langue, taille, version, date, espace disque.
   - Boutons : « Installer / Mettre à jour le modèle », « Supprimer le modèle »,
     « Réparer » (re-téléchargement).
   - Aperçu son : bouton « Tester la voix » (dynamique → TTS sherpa ; fixe → clip Tata).
2. **Dialog de téléchargement de modèle** (refonte d'`InstallerOffline`) :
   - Progression en Mo réels + vitesse, conseil Wi-Fi, pause/reprise, hash
     d'intégrité, double validation (héritée).
3. **Badge « Offline voix prête »** : petit indicateur dans les modales vocales
   (vert = modèle prêt / gris = à installer), parlant à une non-lectrice
   (icône + voix).

---

## 7. Modèles & hébergement (souveraineté)

**STT (int8 recommandé pour mobile) :**
```
https://huggingface.co/shaojieli/sherpa-onnx-streaming-zipformer-fr-2023-04-14
  ├─ tokens.txt
  ├─ encoder.onnx   (~30 Mo int8)
  ├─ decoder.onnx   (~10 Mo int8)
  └─ joiner.onnx    (~4 Mo int8)
```
**TTS (voix FR vits-piper, à vérifier les slugs exacts) :**
```
https://huggingface.co/rhasspy/piper-voices (fr_FR/siwis/low/…)
  → convertir/embarquer comme vits (model.onnx + tokens.txt + espeak-ng-data)
```
⚠️ **Hébergement** : le doc n°1 (INTEGRATION_SHERPA_ONNX.md §6) insistait déjà —
ne pas laisser les URLs poindre vers un CDN tiers non contrôlé (le modèle Vosk
actuel dépend de GitHub Pages). **Action recommandée** : héberger les 4 fichiers
STT + le TTS sur le stockage de l'organisation (S3/OVH/Render) avec CORS ouvert,
et ne changer qu'une constante (pattern `sherpaModel.ts`).

---

## 8. Contrat d'interface (à préserver)

```ts
// frontend/src/app/voice-offline/offlineStt.ts — API PUBLIQUE (inchangée)
export function offlineModelReady(): boolean
export function offlineModelInstalled(): boolean
export function ensureOfflineModel(): Promise<unknown>
export function warmOfflineModelIfInstalled(): void
export async function transcribeWav(wav, useGrammar?, customGrammar?): Promise<string>
export async function startLiveDictation(stream, onText, customGrammar?, onDebug?): Promise<{ stop }>

// frontend/src/app/voice-offline/nativeStt.ts — pont Capacitor (inchangé)
interface SherpaSttNative {
  isAvailable(): Promise<{ available: boolean }>;
  transcribe(p: { pcm: string /* base64 Float32Array LE */; sampleRate: number }): Promise<{ text: string }>;
}

// frontend/src/app/voice-offline/InstallerOffline.tsx — props (inchangées)
{ onReady?: () => void }
```

Toute nouvelle capacité (streaming push, keyword spotting, TTS) = **nouveaux
exports/modules**, pas de rupture des contrats ci-dessus.

---

## 9. Plan d'exécution recommandé

### Phase 1 — Web WASM (sans APK) — ✅ FAIT (août 2026)

1. ✅ `voice-offline/sherpaModel.ts` créé (URLs + tailles vérifiées + config).
2. ✅ `offlineStt.ts` réécrit : `createOnlineRecognizer` (streaming zipformer FR
   int8) + `transcribeWav` + `startLiveDictation`, **repli Vosk automatique**.
3. ✅ `InstallerOffline.tsx` agnostique moteur (taille ~128 Mo sherpa / ~40 Mo Vosk).
4. ✅ `scripts/install-sherpa-stt.sh` (runtime vendored, ~19 Mo, défensif) +
   headers **COOP/COEP** (nginx, render.yaml, dev Vite) + intégration déploiement.
   ⚠️ Le bloc `headers:` de render.yaml (nouveau schéma `routes:`) est à VÉRIFIER
   au 1er déploiement Render — sur le VPS nginx c'est déjà en place.
5. ⏳ À valider en réel : PWA en ligne → installer le modèle → mode avion → vendre
   vocalement. Comparer WER sur les 42 phrases de `vocabulaire.ts` (PHRASES_T1).
   ⚠️ Config runtime à confirmer en smoke test : `provider: 'wasm'` +
   `modelingUnit: 'bpe'` (les defaults démo connus-bons sont `'cpu'` + `'cjkchar'`
   — revenir à ces valeurs si le modèle FR refuse de s'initialiser).
6. ⏳ `vosk-browser` conservé comme REPLI (contextes non isolés : WebView, Safari
   sans credentialless) — retirer seulement si on abandonne ces contextes.

**Préférence de moteur (garde-fous données) :** le moteur installé est mémorisé
(`julaba_offline_engine`) et un échec sherpa marqué (`julaba_sherpa_unavailable`)
— jamais de téléchargement silencieux de ~128 Mo pour un appareil déjà Vosk, ni
de re-tentatives infinies. Le bouton d'installation explicite force sherpa et le
ré-échauffement au boot reste SANS RÉSEAU (cache uniquement).

### Phase 2 — Android natif ✅ FAIT (sauf build/test APK réel)
1. ✅ `capacitor.config.ts` corrigé (`webDir`) ; `npx cap add android` (racine).
2. ✅ AAR depuis les releases GitHub (`sherpa-onnx-1.13.4.aar`, pas de Maven
   Central) + `SherpaSttPlugin.java` (OnlineRecognizer réel) + enregistrement
   dans `MainActivity.java`.
3. ✅ Modèle FR téléchargé par le plugin dans `filesDir` (progression, idempotent)
   + branchement JS complet (`prepare`, moteur natif prioritaire, dictée live).
4. ⏳ **À valider sur vrai téléphone** (build APK : `bash scripts/fetch-sherpa-aar.sh`
   puis Android Studio / `./gradlew assembleDebug`) : installer le mode hors-ligne
   → mode avion → vente vocale. Vérifier `nativeStt.isAvailable()` → bascule auto.
   ⚠️ Pas de JDK/SDK Android dans cet environnement → aucune compilation Java/Gradle
   vérifiée ici ; la relecture s'est faite contre les signatures officielles de l'AAR.
   ⚠️ Le fichier `android/app/libs/*.aar` est gitignoré → exécuter
   `scripts/fetch-sherpa-aar.sh` avant chaque build (intégrer au CI si besoin).

### Phase 3 — UX (streaming + mot-réveil)
1. ✅ Brancher `startLiveDictation` live transcript dans `VenteVocaleModal`.
2. ✅ Mot-réveil « julaba » → réactiver le bloc mains libres existant : `useWakeWord`
   réutilise l'écoute streaming du moteur hors-ligne installé (sherpa → Vosk) via
   `startLiveDictation`, 100 % hors-ligne, activé dès que le modèle est installé.
   ⚠️ Un vrai keyword spotter dédié (léger, modèle ~6 Mo) est documenté dans
   **Phase 3 bis** ci-dessous. Non fait : nécessite un build WASM KWS one-shot +
   un modèle anglais (il n'existe pas de KWS français). L'écoute streaming du
   modèle déjà installé suffit pour le MVP.

### Phase 3 bis — Keyword spotter dédié « Julaba » (plan détaillé)

**Verdict de faisabilité (vérifié 10 août 2026) :**
1. **Runtime** : sherpa-onnx ne publie **aucun build WASM KWS précompilé**
   (issue k2-fsa/sherpa-onnx#3112 — pas d'artefact `*kws*` wasm dans les
   releases v1.13.x). Le runtime ASR vendored n'exporte que
   `createOnlineRecognizer`. Il faut donc **compiler une fois** le build KWS
   (`wasm/build-wasm-simd-kws.sh` ou le Colab officiel) → `sherpa-onnx-kws.js`
   + `sherpa-onnx-wasm-main-kws.js` + `.wasm` (~10-12 Mo), puis vendorer ces 3
   fichiers comme les 3 ASR actuels.
2. **Modèle** : il n'existe **pas de modèle KWS français**. Officiels :
   `gigaspeech-3.3M-2024-01-01` (anglais), `wenetspeech-3.3M-2024-01-01`
   (chinois), `zh-en-3M-2025-12-20` (chinois+anglais). Le KWS étant
   « open-vocabulary » (mini-ASR qui ne décode que les mots donnés), tester
   « julaba » sur **gigaspeech** (BPE anglais) — à valider au micro réel :
   sensibilité, fausses alertes, variantes d'orthographe.
3. **Poids** : ~6 Mo seulement (encoder int8 ~4,4 Mo + decoder fp32 ~1,1 Mo +
   joiner int8 ~85 Ko + tokens/bpe) → **vendorable dans `public/`** sans double
   validation (léger, contrairement au 128 Mo STT → pas de consentement requis).

**Pourquoi le faire malgré le MVP fonctionnel (écoute streaming actuelle) :**
- Aujourd'hui `useWakeWord` fait tourner le **ASR streaming 128 Mo en continu**
  (micro + zipformer toujours chauds) → batterie/RAM pénalisées sur téléphone
  entrée de gamme. Le KWS = 3,3 M de paramètres (~40× plus petit), dédié à un
  seul mot → consommation minime pendant l'idle.
- Architecture cible : spotter continu (idle) → « Julaba » entendu → bip +
  bascule en **dictée ASR** (`startLiveDictation`) pour la commande → retour au
  spotter.

**Étapes :**
1. Build WASM KWS one-shot (épinglé `v1.13.4`, cohérent avec l'ASR) → vendorer
   `sherpa-onnx-kws.js`, `sherpa-onnx-wasm-main-kws.js`,
   `sherpa-onnx-wasm-main-kws.wasm` dans `public/voix/sherpa/`
   (`scripts/install-sherpa-kws.sh`, défensif exit 0) ; stocker l'artefact
   compilé sur le stockage de l'organisation (§7) pour ne pas recompiler.
2. Vendorer le modèle `gigaspeech-3.3M` int8 (~6 Mo) dans `public/voix/kws/` +
   `voice-offline/kwsModel.ts` (constantes chemins FS virtuelle + config, calqué
   sur `sherpaModel.ts`).
3. Générer `keywords.txt` (`python3 scripts/text2token.py`, bpe.model + tokens)
   → ligne `julaba <ids BPE> <trigger threshold>` + variantes ; régler le
   boosting score (compromis fausses alertes / sensibilité).
4. Nouveau module dans `offlineStt.ts` **sans casser le contrat §8** :
   `startWakeWordStreaming(mic, onKeyword)` → boucle `acceptWaveform(16000, f32)`
   + `while (isReady(stream)) decode(stream)` + `getResult(stream).keyword`.
5. `useWakeWord.ts` : remplacer l'écoute ASR continue par le spotter dédié +
   bascule dictée ASR à la détection ; conserver `active` (pause quand Tata
   parle, sinon le spotter s'allume sur sa voix) ; **repli** sur l'écoute
   streaming actuelle si le spotter est indisponible.

**Risques & garde-fous :** précision du spotter sur « julaba » (BPE anglais,
marché bruyant) → calibrage du seuil sur enregistrements réels ; build wasm
one-shot à versionner (jamais de recompilation au déploiement) ; pas de
téléchargement silencieux (modèle vendored) ; `numThreads: 1`.

### Phase 4 — TTS offline (⚠️ PAS LIVRÉ — build WASM custom FR requis)

1. `sherpaTts.ts` est écrit et branché dans `audioManager` (après clips, avant
   `speakBrowser`), mais le runtime TTS n'est **jamais déployé** (seul le STT
   l'est). En l'état, tout le chemin sherpa TTS retombe sur `speakBrowser` :
   aucune régression, mais la « voix neuronale » de l'UI n'est pas disponible.
2. ❌ **Ne PAS brancher le build officiel « pocket-tts »** : démo multilingue,
   `.data` ~200 Mo décompressé, pas la voix française → inacceptable sur forfait
   ivoirien et mauvaise voix.
3. 🔧 **Solution** : build WASM CUSTOM (`wasm/build-wasm-simd-tts.sh`, sources
   épinglées v1.13.4) embarquant `vits-piper-fr_FR-siwis-low-int8` (~13 Mo), puis
   déposer les 5 fichiers dans `public/voix/sherpa/` et ajouter
   `install-sherpa-tts.sh` aux deux déploiements (`deploy-frontend.sh` +
   `render.yaml`). La convergence voix Piper FR (F8) suit ensuite.

### Phase 5 — (option) backend `sherpa-onnx-node`
`SherpaNodeService` branché dans `voice.service.ts` comme 3ᵉ moteur de
`VOICE_STT_ENGINE` (`sherpa`), réutilisant `parseWav` de `vosk.service.ts`.

---

## 10. Risques & garde-fous

1. **API WASM mouvante** → épingler `sherpa-onnx@1.13.4` exactement, documenter
   les exports utilisés (comme le doc n°1 le demandait).
2. **Taille modèle ~128 Mo (int8, vérifié)** → double validation + Wi-Fi conseillé
   + progression octets réels (InstallerOffline, mis à jour). Le fp32 (292 Mo)
   est exclu sur mobile.
3. **RAM/CPU mobile entrée de gamme** → `numThreads: 1`, privilégier int8, tester
   `sherpa-onnx-k2-vosk-fr` (plus léger) comme fallback, streaming optionnel.
4. **Pas de projet Android aujourd'hui** → Phase 2 = gros chantier (build APK
   complet) ; le web reste la valeur immédiate.
5. **`wakeSupported` réactivé = écoute continue** → consommation batterie/RAM ;
   garder la pause quand Tata parle (déjà dans le code, `active` prop).
6. **Ne jamais supprimer les replis** : clips Tata → sherpa TTS → `speakBrowser`
   pour la TTS ; STT local → backend (`/voice/process`) pour la sécurité.
7. **Grammaire/Vosk** : `GRAMMAR_WORDS` sert aujourd'hui de liste fermée Vosk ;
   sherpa zipformer est vocabulaire ouvert → `localIntent.ts`/`extraction.ts`
   restent le filtre sémantique (inchangés), mais on peut retirer la grammaire
   fermée et gagner en généralité.
8. **COOP/COEP (nouveau, Phase 1)** : le runtime officiel est compilé avec
   pthreads → SharedArrayBuffer → l'origine doit être « cross-origin isolated ».
   On pose `COOP: same-origin` + `COEP: credentialless` (nginx, Render, dev Vite)
   — `credentialless` n'impacte pas les ressources tierces (images…). Contextes
   sans support (Safari < 16.4, WebView sans headers) → **repli Vosk automatique**.
9. **Runtime vendored ~19 Mo dans public/** → le build/deploy grossit (~175 Mo
   à télécharger au déploiement pour extraire 3 fichiers). Amélioration future :
   héberger les 3 fichiers sur le stockage de l'organisation (cf. §7).

---

## 11. Fichiers touchés (récapitulatif)

| Fichier | Action |
|---|---|
| `frontend/package.json` | `vosk-browser` **conservé** (repli) ; pas de dép npm `sherpa-onnx` (build Node) — le runtime WASM est vendored par script |
| `voice-offline/offlineStt.ts` | ✅ **FAIT** : moteur sherpa-onnx + repli Vosk (interface conservée) |
| `voice-offline/sherpaModel.ts` | ✅ **NOUVEAU** : URLs modèle FR int8, tailles vérifiées, config recognizer |
| `scripts/install-sherpa-stt.sh` | ✅ **NOUVEAU** : runtime WASM ASR vendored (3 fichiers, ~19 Mo) |
| `voice-offline/InstallerOffline.tsx` | ✅ **FAIT** : agnostique moteur (taille + nom du moteur) |
| `nginx/*.conf`, `render.yaml`, `vite.config.ts` | ✅ **FAIT** : headers COOP/COEP (`credentialless`) |
| `scripts/deploy-frontend.sh`, `render.yaml` | ✅ **FAIT** : exécution de `install-sherpa-stt.sh` au build |
| `voice-offline/nativeStt.ts` | ✅ **FAIT** : + `prepare`/`release`/`present` (contrat conservé) |
| `voice-offline/localIntent.ts`, `extraction.ts`, `vocabulaire.ts` | Inchangés (post-traitement) |
| `services/sherpaTts.ts` | ⚠️ **Écrit + branché** (`audioManager`), mais **jamais livré** : runtime TTS non déployé (voir Phase 4) |
| `services/audioManager.ts` / `elevenlabs.ts` | **Fait** : `defaultTtsSpeakChunk` essaie sherpa puis `speakBrowser` ; `realStartTts.stop()` appelle `stopSherpaTts()` |
| `scripts/install-sherpa-tts.sh` | ⚠️ **Durci (août 2026)** : ne déploie PLUS rien dans `public/` (le pocket-tts était une démo hors-sujet, refusée) ; prépare le modèle FR dans `scripts/.tts-fr-model/` pour le futur build custom + affiche la procédure. Voix FR = build WASM custom requis |
| `voice-offline/InstallerOffline.tsx` | ⚠️ Section `InstallerVoixNeuronale` écrite mais **non opérationnelle** tant que le runtime TTS n'est pas déployé (bouton → « non prêt ») |
| `src/main.tsx` | **Fait** : `warmSherpaTtsIfInstalled()` au boot (idle/timeout différé) |
| `hooks/useWakeWord.ts` | ✅ Branché sur l'écoute streaming hors-ligne (`startLiveDictation`) — `supported` redevenu vrai dès que le modèle est installé |
| `components/marchand/VenteVocaleModal.tsx` | ✅ Badge moteur (`EngineBadge`), live transcript, mains libres réactivé |
| `components/assistant/TantieSagesseModal.tsx` | ✅ Badge moteur (`EngineBadge`) + live transcript pendant l'écoute |
| `voice-offline/EngineBadge.tsx` | **NOUVEAU** : indicateur moteur (sherpa/Vosk/natif), auto-rafraîchi via `subscribeModelReady` |
| `scripts/install-sherpa-kws.sh` + `public/voix/kws/` | **Phase 3 bis** : build WASM KWS one-shot vendored + modèle gigaspeech ~6 Mo |
| `voice-offline/kwsModel.ts` | **Phase 3 bis** : constantes modèle KWS ; `startWakeWordStreaming` ajouté à `offlineStt.ts` |
| `components/auth/OnboardingSlides.tsx`, `LoginPassword.tsx` | Aucune (InstallerOffline auto) |
| `src/main.tsx` | Aucune (signature conservée) |
| `capacitor.config.ts` | ✅ **FAIT** : fix `webDir` → `"frontend/dist"` |
| `android/` (racine) | ✅ **FAIT** : projet Capacitor généré (`cap add android`, Capacitor 8.5) |
| `android/app/src/main/java/ci/julaba/app/SherpaSttPlugin.java` | ✅ **NOUVEAU** : vrai plugin Capacitor (prepare/téléchargement modèles, transcribe OnlineRecognizer, release, handleOnDestroy) |
| `android/app/src/main/java/ci/julaba/app/MainActivity.java` | ✅ **FAIT** : `registerPlugin(SherpaSttPlugin.class)` |
| `android/app/build.gradle` | ✅ **FAIT** : `implementation files('libs/sherpa-onnx-1.13.4.aar')` |
| `android/app/libs/sherpa-onnx-1.13.4.aar` | ✅ **FAIT** : AAR 48 Mo (gitignoré, récupéré par `scripts/fetch-sherpa-aar.sh`) |
| `scripts/fetch-sherpa-aar.sh` | ✅ **NOUVEAU** : téléchargement reproductible de l'AAR (releases GitHub) |
| `frontend/native/android/SherpaSttPlugin.kt` | **Supprimé** (brouillon Kotlin remplacé par le plugin Java) |
| `voice-offline/sherpaModel.ts` | ✅ **FAIT** : + `SHERPA_NATIVE_FILES` (noms courts natifs) |
| `backend/src/voice/` | Inchangé (repli) ; +`SherpaNodeService` (Phase 5, option) |

---

## 12. Prochaines questions pour l'équipe

1. **Hébergement des modèles** : stockage de l'organisation (S3/OVH/Render) avec
   CORS — qui s'en occupe ? (condition pour ne pas dépendre de HuggingFace/GitHub Pages).
2. **Voix Tata Lou** : le fine-tune Piper existant peut-il être embarqué comme
   vits-piper dans sherpa-onnx, ou garde-t-on `fr_FR-siwis` (générique) ?
3. **APK Android** : qui lance le premier build (`scripts/fetch-sherpa-aar.sh` +
   Android Studio / `./gradlew assembleDebug`) et le smoke test en mode avion ?
   C'est l'ultime validation de la Phase 2 (aucun JDK/SDK Android ici).
4. **ABI Android** : garder les 4 ABI (APK ~40 Mo de .so) ou filtrer
   `arm64-v8a` + `armeabi-v7a` (APK réduit de moitié, émulateur x86 exclu) ?
5. **Backend** : garde-t-on le repli `/voice/process` tel quel (whisper.cpp/vosk/
   cloud) ou l'aligne-t-on aussi sur sherpa (Phase 5) ?
