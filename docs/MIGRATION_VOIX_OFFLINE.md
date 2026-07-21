# Migration de la voix vers l'offline-first

But : sortir la chaîne vocale du cloud étranger (OpenAI Whisper STT, GPT-4o LLM,
ElevenLabs TTS) vers une stack souveraine offline-first (Vosk STT, intent local,
Piper TTS), sans casser l'app existante. Cadrage : présentation Jùlaba V2.

Dernière mise à jour : 2026-07-20.

---

## 1. Constat d'architecture (bonne nouvelle)

Tout le couplage cloud est **confiné dans 3 méthodes** de
`backend/src/voice/openai.service.ts` :

- `transcribe()` (lignes 31-54) — Whisper STT
- `detectIntent()` (lignes 57-89) — GPT-4o
- `synthesize()` (lignes 92-127) — ElevenLabs TTS

Le **frontend est agnostique du moteur** : il envoie du WAV PCM 16 kHz mono
(`useVoiceCore.ts:187-210`) et joue un audio base64 (`elevenlabs.ts:91-108`).
Les endpoints (`/voice/process`, `/voice/intent`, `/tts/openai`) gardent leurs
noms. **Conséquence : on migre côté serveur, sans toucher le frontend.**

Briques **déjà locales**, réutilisables telles quelles :
`intent.parser.ts`, `speech.builder.ts`, `conversation.state.ts`, et le
classifieur regex `voice.controller.ts:intent-fast`.

---

## 2. Les deux chemins (rappel V2)

- **Transactionnel (~80 %)** : vendre, dépenser, stock, point du jour → **local**,
  sans LLM. Reconnu par grammaire fermée + parseur de nombres.
- **Conversationnel (~20 %)** : questions ouvertes → LLM (seul cas qui garde le cloud
  au départ, puis Mistral souverain).

---

## 3. Feuille de route (ordre d'exécution)

### Étape 1 — Intent transactionnel local ✅ (cette PR)
- Nouveau `backend/src/voice/local-intent.service.ts` : classifieur **sans LLM**
  (portage de la logique éprouvée du banc `banc-vosk-julaba` : produits, intentions,
  parseur de nombres FR y compris l'ellipse marché « mille cinq » = 1500).
- Branché dans `voice.service.ts:detectIntent` **en amont du LLM**, derrière le flag
  `VOICE_LOCAL_INTENT` (défaut OFF). Si l'intention est reconnue avec confiance
  (vendre/dépense/solde/stock), on **saute GPT-4o** ; sinon repli LLM (inchangé).
- Le reste du pipeline (`IntentParser`, `SpeechBuilder`, confirmation) était déjà local.
- **Effet** : ~80 % des commandes vocales ne coûtent plus d'appel GPT-4o.

### Étape 2 — STT local, moteur configurable ✅ (cette PR)

Le moteur STT est **branchable** via `VOICE_STT_ENGINE` (`whisper` | `vosk`), avec
repli cloud automatique. Deux services locaux sont fournis :

- **`whisper.service.ts` — Whisper.cpp (recommandé).** Meilleur sur le français
  ivoirien et le Dioula (multilingue, robuste au bruit et aux accents). Un seul
  modèle `base` (~142 Mo) couvre FR + Dioula. Appelle le binaire whisper.cpp.
- **`vosk.service.ts` — Vosk (alternative légère).** ~40 Mo, latence < 300 ms, mais
  WER élevé sur le français africain (mesuré ~60 % sur le banc) et un modèle par langue.

Les deux : branchés dans `voice.service.ts:transcribe` **en amont du cloud**, français
uniquement, **défensifs** (binaire/modèle absent ou échec → `null` → repli cloud, aucune
régression). Le frontend envoie déjà du WAV 16 kHz mono → **aucun changement client**.

> **Choix de moteur (données du banc).** Vosk small-fr : WER ~60 % sur voix TTS Dioula
> (CER ~19 %). Whisper.cpp `base` est attendu bien meilleur — **à confirmer sur le banc**
> (onglet « Corpus Dioula (T1) ») avant de trancher : preuve à l'appui, pas sur estimation.

**Installation — Whisper.cpp (recommandé) :**
```bash
# Binaire whisper.cpp : https://github.com/ggerganov/whisper.cpp
#   compiler -> whisper-cli ; modele ggml (base ~142 Mo, multilingue FR + Dioula)
bash ./models/download-ggml-model.sh base      # -> ggml-base.bin
export WHISPER_BIN=/opt/whisper/whisper-cli
export WHISPER_MODEL=/opt/whisper/ggml-base.bin
export WHISPER_LANG=fr                          # ou "auto"
export VOICE_STT_ENGINE=whisper
```

**Installation — Vosk (alternative) :**
```bash
npm i vosk
curl -L -o /tmp/vosk-fr.zip https://alphacephei.com/vosk/models/vosk-model-small-fr-0.22.zip
unzip /tmp/vosk-fr.zip -d /opt/vosk/
export VOSK_MODEL_PATH=/opt/vosk/vosk-model-small-fr-0.22
export VOICE_STT_ENGINE=vosk        # (compat : VOICE_LOCAL_STT=1 revient a vosk)
```

Raffinement possible : repli cloud si la **confiance** Whisper est faible (< 0,70) via
la sortie JSON (`-oj`, avg logprob), comme dans l'architecture cible (offline d'abord,
cloud LAFRICAMOBILE en secours). Non implémenté ici (v1 : repli sur échec/vide).

### Étape 3 — TTS Piper (remplace ElevenLabs) ✅ (cette PR)
- Nouveau `backend/src/voice/piper.service.ts` : TTS **local sur CPU** via le binaire
  Piper (voix « Tata Lou »). Sortie WAV.
- Branché dans `openai.service.ts:synthesize` **en amont d'ElevenLabs**, derrière le
  flag `VOICE_LOCAL_TTS` (défaut OFF). Ce point central couvre **tous** les appels TTS
  (`/voice/process` et `/tts/openai`). Repli ElevenLabs automatique si Piper renvoie null.
- **Frontend** : `elevenlabs.ts:base64ToBlob` détecte désormais automatiquement le
  format (WAV « RIFF » → `audio/wav`, sinon `audio/mpeg`). Compatible ElevenLabs ET Piper,
  aucune autre modification client.
- `normalizeTTSText` (`voice.service.ts:356-395`) reste utile (FCFA→Francs, nombres).

**Installation en production (serveur backend) :**
```bash
# Binaire Piper : https://github.com/rhasspy/piper/releases
#   ex: /opt/piper/piper
# Voix : modele .onnx + .onnx.json (voix "Tata Lou" fine-tunee, ou fr_FR generique)
export PIPER_BIN=/opt/piper/piper
export PIPER_VOICE=/opt/piper/tata-lou.onnx
export VOICE_LOCAL_TTS=1
```

### Étape 4 — LLM conversationnel souverain ✅ (cette PR)
- `openai.service.ts:detectIntent` appelle désormais un **endpoint LLM configurable**
  (compatible OpenAI). Par défaut : OpenAI GPT-4o (comportement inchangé).
- Pour basculer sur **Mistral souverain** auto-hébergé (vLLM ou Ollama exposent une
  API compatible OpenAI `/v1/chat/completions`), il suffit de définir des variables —
  **aucun changement de code** :
```bash
export LLM_BASE_URL=http://mistral-gpu.interne:8000/v1   # serveur GPU souverain
export LLM_MODEL=mistral-small-latest                    # ou le modele servi
export LLM_API_KEY=...                                    # optionnel si le LLM local n'en exige pas
```
- Les intents métier restent servis par `SpeechBuilder` (templates locaux) ; le LLM
  ne sert plus qu'aux questions ouvertes (`conversation`), et sur le GPU national.
- Note : le LLM local doit accepter `response_format: json_object` (vLLM/Ollama récents).
  À défaut, un repli JSON est déjà géré (`detectIntent` renvoie l'intent `conversation`).

### Transverse — dioula/bambara
- Passe par le service tiers ANSUT (`voice.service.ts:442,523`). À traiter séparément
  de la stack Vosk/Piper française (corpus dioula à constituer, cf. banc).

---

## 4. Comment tester l'étape 1

1. Backend : définir `VOICE_LOCAL_INTENT=1` dans l'environnement.
2. Dicter « j'ai vendu dix tomates à deux mille francs » → la réponse doit arriver
   **sans** ligne de log `[LLM:OPENAI]` (log `[LOCAL] intent=vendre` à la place).
3. Dicter une question ouverte (« qu'est-ce que je devrais racheter ? ») → repli LLM
   normal (log `[LLM:OPENAI]`).
4. Laisser `VOICE_LOCAL_INTENT` vide → comportement 100 % identique à aujourd'hui.

Le classifieur est vérifié en isolation (8/8 cas, dont le repli `null` sur les phrases
conversationnelles). **Intégration backend complète à valider** (build NestJS + base)
avant d'activer le flag en production.
