# VOICE ROADMAP — NEXT STEPS
*Dernière mise à jour : 23 mars 2026*
*État actuel : Phase 1 ✅ + Phase 2 ✅ déployées*

---

## PRIORITÉ 1 — PERFORMANCE (critique UX)

### 1. Pipeline parallèle
- Lancer l'intent avant la fin du STT
- Ne plus bloquer STT → NLP → TTS séquentiellement
- Objectif : réduire latence totale de ~5s à ~2s

### 2. Optimisation STT
- Réduire silence detection (~500-700ms au lieu de 2s)
- Envoi anticipé audio dès détection de pause naturelle
- Fichier : `useVoiceCore.ts` — `SILENCE_THRESHOLD_MS`

### 3. Optimisation Piper
- Limiter longueur texte TTS à < 120 chars par chunk
- Tester vitesse génération selon `length_scale`
- Fichier : `piper.service.ts` — `synthesize()`

---

## PRIORITÉ 2 — PERCEPTION DE LATENCE

### 1. Réponses immédiates
- Jouer micro feedback ("ok...", "j écoute...") dès fin user
- Avant même que Groq réponde
- Fichier : `useVoiceCore.ts` — `processAudio()`

### 2. Étendre predictive TTS
- Couvrir 60-70% des phrases fréquentes pré-générées
- Fichier : `predictiveTTS.ts`
- Phrases à couvrir : confirmations, questions courantes, erreurs

---

## PRIORITÉ 3 — ROBUSTESSE

### 1. Gestion erreurs API (Groq, TTS)
- Retry automatique x2 avant fallback
- Fallback propre si indisponible (message clair)
- Fichier : `voice.service.ts` — `detectIntent()`
- ⚠️ Quota Groq : 100k tokens/jour — surveiller consommation

### 2. Timeout sécurité
- Éviter blocage > 3s côté frontend
- Afficher message "ça prend du temps..." si > 2s
- Fichier : `useVoiceCore.ts` — timeout actuel à 25s (trop long)

### 3. Reset intelligent
- Si state incohérent → retour idle automatique
- Fichier : `conversation.state.ts` — `transition()`
- Cas : userId absent, intent inconnu, erreur répétée x2

---

## PRIORITÉ 4 — QUALITÉ CONVERSATION

### 1. Améliorer variations
- Enrichir pools de 5 → 10-15 phrases par type
- Fichier : `speech.builder.ts` — `POOL`
- Focus : success_vente, success_depense, questions contextuelles

### 2. Mémoire courte améliorée
- Inclure dernier intent + entities dans le contexte injecté
- Ex : si dernier intent = vendre tomates → Groq sait qu'on parlait de tomates
- Fichier : `conversation.state.ts` + `voice.service.ts`

### 3. Reformulation intelligente
- Avant confirmation : "Tu veux vendre 3 tomates pour 1500 ?"
- Utiliser les entities extraites pour reformuler naturellement
- Fichier : `speech.builder.ts` — `buildContextualQuestion()`

### 4. Gestion "oui/non" robuste
- Actuellement : nécessite state awaiting_confirmation côté serveur
- Améliorer : détecter confirmation même sans state explicite
- Fichier : `voice.service.ts` — bloc confirmation Phase 2

---

## PRIORITÉ 5 — ARCHITECTURE (plus tard)

### 1. Isoler modules proprement
- `conversation/` — state + memory
- `nlp/` — intent parsing
- `domain/` — logique métier handlers
- `speech/` — speech builder
- `tts/` — TTS providers
- Compatible avec pipeline actuel

### 2. Préparer TTS interchangeable
- Interface unique : `ITTSProvider.generate(text): Buffer`
- Implémentations : `PiperProvider`, `ElevenLabsProvider`
- Switch facile sans toucher au reste

### 3. STT interchangeable
- Interface unique : `ISTTProvider.transcribe(audio): string`
- Implémentations : `WhisperProvider`, `GroqWhisperProvider`, candidat `OmnilingualASRProvider` (voir langues ivoiriennes ci-dessous)

---

## LANGUES IVOIRIENNES — Meta Omnilingual ASR (piste STT, 10/09/2026)

Whisper (STT actuel) ne couvre pas les langues locales de Côte d'Ivoire au-delà
du français. Recherche menée sur le paquet officiel Meta `omnilingual-asr`
(1 668 langues, licence **Apache 2.0**, usage public compris) : liste des
langues du modèle confrontée aux langues parlées en Côte d'Ivoire.

**22 langues ivoiriennes couvertes**, dont la plus critique :
- **Dioula (`dyu`) en propre** — pas seulement via le bambara (couvert aussi)
- Groupe kwa (sud/centre) : Baoulé (`bci`), Agni (`any`), Attié (`ati`), Abidji
  (`abi`), Adioukrou (`adj`)
- Ouest/sud-ouest : Dan/Yacouba (`dnj`), Toura, Mano, Wobé, Nyabwa, Krumen
  (plapo et tépo), Dida
- Nord : Sénoufo en 3 variantes (djimini, supyiré, mamara), Lobi
- Véhiculaires régionales : mooré, peul, haoussa

**Absentes** : bété (Daloa/Gagnoa), guéré/wè, sénoufo cebaara (Korhogo), abé,
kulango. Le modèle est **zéro-shot** : une langue absente s'apprend avec
quelques exemples enregistrés, sans réentraînement — compatible avec le
protocole de casting de voix déjà écrit pour Tata (mêmes marchandes, même
séance d'enregistrement pourrait aussi fournir ces exemples).

**Dimensionnement (fiche officielle du modèle, à injecter dans le chiffrage
Azure, voir `docs/AZURE.md`)** :
- Modèle rapide : ~2 Go VRAM, ~96× temps réel
- Modèle qualité : ~17 Go VRAM (carte A100)

Prochaine étape si on poursuit cette piste : vérifier la latence réelle sur un
échantillon de dictées marchande (pas seulement la fiche du modèle), et
comparer le coût d'hébergement face à Groq Whisper (`ÉTAT ACTUEL DU SYSTÈME`
ci-dessous) avant toute décision de bascule — aucune langue locale n'est
utilisable en STT aujourd'hui, donc n'importe quelle avancée ici est un pur
ajout, pas un remplacement risqué du français qui marche déjà.

---

## CONTRAINTES PERMANENTES
- Ne jamais dégrader la performance actuelle
- Toujours privilégier la latence perçue
- Code simple et maintenable — pas de sur-ingénierie
- Logs obligatoires à chaque étape : INPUT, INTENT, STATE, MISSING, OUTPUT
- Compatibilité mobile iOS/Android first

---

## ÉTAT ACTUEL DU SYSTÈME
```
✅ Phase 1 : State machine + mémoire courte + parser structuré
✅ Phase 2 : SpeechBuilder + validation + confirmation + variations
✅ Modèle : llama-3.1-8b-instant (économique) + fallback 429
✅ TTS : Piper (local) → ElevenLabs (fallback)
✅ STT : Faster-Whisper → Groq Whisper (fallback)
⚠️  Quota Groq : 100k tokens/jour — à surveiller
⚠️  Latence : ~3-5s — objectif <2s (Priorité 1)
```

---

## OBJECTIF FINAL
> Passer de **"stable"** à **"rapide + fluide + scalable"**
> Agent vocal qui répond en < 2s, comprend le contexte,
> ne répète jamais les mêmes phrases, et ne se perd jamais.

