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
| **STT web** | `vosk-browser` (WASM, paquet quasi abandonné, modèle ~40 Mo GitHub Pages tiers) | `sherpa-onnx` WASM (npm officiel v1.13.x, maintenu) |
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

- `frontend/native/android/SherpaSttPlugin.kt` : **plugin Capacitor factice**.
  `OnlineRecognizerShim` est une interface **vide** ; les commentaires indiquent que
  l'API `com.k2fsa.sherpa.onnx.*` doit être alignée sur la version d'AAR intégrée.
- ⚠️ **Il n'y a pas de projet Android complet** : pas de `android/` (racine) généré
  par `npx cap add android`, pas de `MainActivity`, pas de build.gradle. Le plugin
  n'est **pas compilable** aujourd'hui.
- `capacitor.config.ts` contient un bug : `webDir: "webDir=./frontend/dist"` (le
  préfixe `webDir=` est en trop → `"./frontend/dist"`).

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
  `decoder.onnx`, `joiner.onnx`, `tokens.txt`. Taille totale **~100 Mo (fp32) /
  ~60 Mo (int8)** à confirmer au téléchargement.
- Existe aussi un modèle Kaldi/Vosk FR convertible (`sherpa-onnx-k2-vosk-fr`) —
  plus léger, à tester comme fallback RAM faible.

**TTS FR (officiel) :**
- Les voix **Piper FR** (fr_FR-siwis-low, fr_FR-upmc, fr_FR-gilles…) sont
  **directement compatibles** avec sherpa-onnx (format vits-piper). La voix déjà
  utilisée côté backend (`backend/scripts/setup-piper.sh` → `fr_FR-siwis-low.onnx`)
  peut donc être **réutilisée sur l'appareil** — une seule voix partout.
- Le repo officiel liste aussi `en_US-lessac-medium` (61 Mo) comme référence ;
  pour le FR il faut pointer le tarball `vits-piper-fr_FR-*` (voir §7).

---

## 4. Points d'ancrage — OÙ brancher exactement

### 4.1 Web / PWA — remplacer Vosk WASM (fichier central : `voice-offline/offlineStt.ts`)

On **conserve toutes les fonctions publiques** et on change l'intérieur :

```ts
// AVANT (actuel)
const { createModel } = await import('vosk-browser');
const model = await createModel(VOSK_MODEL_URL);

// APRÈS (sherpa-onnx)
const onnx = await import('sherpa-onnx/dist/sherpa-onnx-wasm.online.js'); // code-split
const recognizer = onnx.createOnlineRecognizer({
  modelType: 'zipformer',
  tokens:    urlTokens,                    // tokens.txt
  numThreads: 1,                           // conservateur sur mobile
  provider: 'wasm',                        // ou 'webgpu'
  transducer: { encoder: urlEncoder, decoder: urlDecoder, joiner: urlJoiner },
}, onnx);
```

Fichiers à modifier :
1. **`voice-offline/offlineStt.ts`** — `ensureOfflineModel()` : télécharger les
   4 fichiers `.onnx/.txt` (au lieu du `.tar.gz` Vosk), instancier le recognizer.
   `transcribeWav()` : `stream.acceptWaveform(Int16Array)` + `getResult().text`.
   `startLiveDictation()` : réutiliser l'existant (déjà streaming) mais avec le
   nouveau moteur → **live transcript gratuit**.
2. **`voice-offline/voskModel.ts`** → renommer la constante / le fichier en
   `sherpaModel.ts` (URLs des 4 fichiers). Garder un seul point de changement.
3. **`voice-offline/InstallerOffline.tsx`** — agnostique moteur : titre, taille
   (~60 Mo int8 au lieu de ~40), messages vocaux inchangés (déjà génériques).
4. **`frontend/package.json`** — `"sherpa-onnx": "1.13.4"` (épingler la version
   exacte, l'API WASM bouge entre versions), retirer `vosk-browser` **en fin de
   phase 1** (après validation).
5. **`main.tsx`** — `warmOfflineModelIfInstalled()` conserve sa signature ;
   juste re-tester l'installation persistante (clé `julaba_offline_installed`).

### 4.2 Android natif — réaliser le vrai plugin (`frontend/native/android/SherpaSttPlugin.kt`)

Le contrat JS (nativeStt.ts) est **déjà bon**. Il manque :

1. **Créer le projet Android Capacitor** : `npx cap add android` (racine `android/`),
   `MainActivity.kt`, `build.gradle` avec l'AAR :
   ```gradle
   implementation 'com.k2fsa.sherpa.onnx:sherpa-onnx-android:1.13.4'  // Maven Central
   ```
2. **Implémenter `SherpaSttPlugin.kt`** : remplacer `OnlineRecognizerShim` par
   l'API réelle (`OnlineRecognizer`, `OnlineRecognizerConfig`, `FeatureConfig`,
   `OnlineModelConfig`, `OnlineTransducerModelConfig`).
   - `isAvailable()` : vrai si le modèle est chargé (assets ou filesDir).
   - `transcribe({pcm, sampleRate})` : décoder base64 Float32 LE (déjà écrit) →
     rééchantillonner à 16 kHz si besoin → `acceptWaveform(samples, sampleRate)`
     par blocs → `getResult().text`.
3. **Modèle FR** : embarquer les 4 fichiers dans `android/app/src/main/assets/`
   (offline immédiat, ~60 Mo int8) OU télécharger une fois + copier dans `filesDir`
   (pattern InstallerOffline réutilisable via un `PluginMethod` dédié).
4. Corriger `capacitor.config.ts` (`webDir: "./frontend/dist"`).

> 🔁 **Topologie** : sur APK, `nativeStt.isAvailable()` → vrai → `offlineStt.ts`
> **bascule automatiquement** (déjà en place, l.55-65). Zéro changement dans
> `useVoiceCore.ts` pour le STT.

### 4.3 TTS offline — brancher sherpa TTS dans le chef d'orchestre

Point d'ancrage : **`services/elevenlabs.ts` → `speakBrowser()`** et/ou
**`services/audioManager.ts` → `_ttsPlayer`** (joueurs injectables).

```ts
// Nouveau : services/sherpaTts.ts
export async function sherpaTtsSpeak(text: string): Promise<void> {
  const { createOfflineTts } = await import('sherpa-onnx/dist/sherpa-onnx-wasm.offline.js');
  const tts = createOfflineTts({ model: { vits: { model: urlVits, tokens: urlTokens,
    lexicon: urlLexicon, dataDir: urlEspeakData } }, });
  const samples = tts.generate({ text, sid: 0, speed: 1.0 }); // Float32Array
  // → jouer via AudioContext (réutiliser le pipeline audioManager)
}
```

Hiérarchie TTS après intégration (sans casser l'existant) :
1. **Clip Tata pré-enregistré** (phrase fixe) — inchangé, prioritaire.
2. **sherpa TTS** (phrase dynamique : montants, questions) — nouveau.
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
| F2 | STT offline APK Android natif | AAR sherpa-onnx + plugin Kotlin | Vraie offline mobile, rapidité | **P0** |
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
| Installation modèle | `voice-offline/InstallerOffline.tsx` | Agnostique moteur : libellé dynamique (sherpa int8 ~60 Mo), progression réelle (octets/%), reprise, hash. **Déjà utilisé** par VenteVocaleModal/OnboardingSlides/LoginPassword → mise à jour automatique partout. |
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

### Phase 1 — Web WASM (sans APK) — *déployable*
1. `npm i sherpa-onnx@1.13.4` (frontend), créer `voice-offline/sherpaModel.ts`.
2. Réécrire `offlineStt.ts` : téléchargement 4 fichiers + `createOnlineRecognizer`
   + `transcribeWav` + `startLiveDictation`.
3. Adapter `InstallerOffline.tsx` (libellés/progression) — l'UI se met à jour
   partout automatiquement.
4. Valider : PWA en ligne → installer modèle → mode avion → vendre vocalement.
   Comparer WER sur les 42 phrases de `vocabulaire.ts` (PHRASES_T1).
5. Supprimer `vosk-browser` de package.json **seulement après validation**.

### Phase 2 — Android natif
1. Corriger `capacitor.config.ts` ; `npx cap add android`.
2. Ajouter l'AAR Maven, implémenter `SherpaSttPlugin.kt` (API réelle).
3. Embarquer le modèle int8 dans les assets (ou téléchargement à la 1ʳᵉ install).
4. Valider sur vrai téléphone Android (mode avion) : transcription + vente.
   Vérifier `nativeStt.isAvailable()` → bascule auto (déjà codée).

### Phase 3 — UX (streaming + mot-réveil)
1. Brancher `startLiveDictation` live transcript dans `VenteVocaleModal`.
2. Keyword spotter « julaba » → réactiver le bloc mains libres existant.

### Phase 4 — TTS offline
1. `services/sherpaTts.ts` + brancher dans `audioManager` (après clips, avant
   `speakBrowser`).
2. Réutiliser la voix Piper FR (`fr_FR-siwis`) → convergence backend/appareil.

### Phase 5 — (option) backend `sherpa-onnx-node`
`SherpaNodeService` branché dans `voice.service.ts` comme 3ᵉ moteur de
`VOICE_STT_ENGINE` (`sherpa`), réutilisant `parseWav` de `vosk.service.ts`.

---

## 10. Risques & garde-fous

1. **API WASM mouvante** → épingler `sherpa-onnx@1.13.4` exactement, documenter
   les exports utilisés (comme le doc n°1 le demandait).
2. **Taille modèle ~60 Mo (int8)** → double validation + Wi-Fi conseillé + reprise
   + hash (pattern InstallerOffline existant, mis à jour).
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

---

## 11. Fichiers touchés (récapitulatif)

| Fichier | Action |
|---|---|
| `frontend/package.json` | +`sherpa-onnx@1.13.4`, −`vosk-browser` (fin P1) |
| `voice-offline/offlineStt.ts` | Réécriture moteur (interface conservée) |
| `voice-offline/voskModel.ts` → `sherpaModel.ts` | URLs modèles (1 constante) |
| `voice-offline/InstallerOffline.tsx` | Agnostique + progression réelle |
| `voice-offline/nativeStt.ts` | **Inchangé** (contrat déjà bon) |
| `voice-offline/localIntent.ts`, `extraction.ts`, `vocabulaire.ts` | Inchangés (post-traitement) |
| `services/sherpaTts.ts` | **Nouveau** (TTS vits) |
| `services/audioManager.ts` / `elevenlabs.ts` | Brancher sherpa TTS avant `speakBrowser` |
| `hooks/useWakeWord.ts` | Branché sur keyword spotter |
| `components/marchand/VenteVocaleModal.tsx` | Badge moteur, live transcript, mains libres réactivé |
| `components/auth/OnboardingSlides.tsx`, `LoginPassword.tsx` | Aucune (InstallerOffline auto) |
| `src/main.tsx` | Aucune (signature conservée) |
| `capacitor.config.ts` | Fix `webDir` |
| `android/` (racine) | **Nouveau** projet Capacitor (`cap add android`) |
| `frontend/native/android/SherpaSttPlugin.kt` | Implémentation API réelle |
| `backend/src/voice/` | Inchangé (repli) ; +`SherpaNodeService` (Phase 5, option) |

---

## 12. Prochaines questions pour l'équipe

1. **Hébergement des modèles** : stockage de l'organisation (S3/OVH/Render) avec
   CORS — qui s'en occupe ? (condition pour ne pas dépendre de HuggingFace/GitHub Pages).
2. **Voix Tata Lou** : le fine-tune Piper existant peut-il être embarqué comme
   vits-piper dans sherpa-onnx, ou garde-t-on `fr_FR-siwis` (générique) ?
3. **APK Android** : un build Capacitor est-il planifié (Play Store / APK direct) ?
   Sans lui, la Phase 2 (natif) n'a pas de cible.
4. **Backend** : garde-t-on le repli `/voice/process` tel quel (whisper.cpp/vosk/
   cloud) ou l'aligne-t-on aussi sur sherpa (Phase 5) ?
