# À remettre à la personne technique — Julaba voix offline-first

Ce document résume un lot de travail **prêt à déployer**. La partie « Pour Patrick »
explique en clair ; la partie « Pour le développeur » donne la checklist technique.

---

## Pour Patrick (non technique)

Tout le code de la **voix offline-first** (parler même sans réseau, données traitées
localement, moins cher) est écrit et vérifié. Il attend juste d'être **installé sur le
serveur** par une personne technique. Rien n'est cassé : tant que ce n'est pas activé,
l'application se comporte exactement comme aujourd'hui.

Il y a **4 lots de modifications** (les « Pull Requests », numéros #1 à #3) sur le dépôt
`github.com/somet1010/julaba-app`. Le développeur les relit, les installe, puis **active
brique par brique** en vérifiant à chaque étape.

---

## Pour le développeur

Dépôt de travail : `github.com/somet1010/julaba-app` (copie de Julabaovh).
Contexte complet : `docs/MIGRATION_VOIX_OFFLINE.md` et `docs/BOUTIQUE_SYNC.md`.

**Principe de sécurité : toutes les briques locales sont derrière un flag, défaut OFF,
avec repli cloud automatique.** Rien n'est actif tant qu'une variable d'env n'est pas posée.

### Les Pull Requests

| PR | Objet | Fichiers clés |
|----|-------|---------------|
| #1 | 128 accents dans les chaînes UI/TTS | `frontend_src/...` |
| #2 | Voix offline : intent local, STT (Whisper.cpp/Vosk), TTS Piper, LLM configurable | `backend/src/voice/...` |
| #3 | Synchro append-only de la boutique vocale | `backend/src/boutique/...` + migration |

### Activation (après revue + build + tests d'intégration)

```bash
# --- STT local (Whisper.cpp recommandé) ---
# Compiler whisper.cpp -> whisper-cli, télécharger ggml-base.bin (multilingue FR+Dioula)
export WHISPER_BIN=/opt/whisper/whisper-cli
export WHISPER_MODEL=/opt/whisper/ggml-base.bin
export WHISPER_LANG=fr
export VOICE_STT_ENGINE=whisper        # (ou "vosk" pour l'alternative légère)

# --- Intent transactionnel local (sans GPT-4o) ---
export VOICE_LOCAL_INTENT=1

# --- TTS Piper local (voix "Tata Lou") ---
export PIPER_BIN=/opt/piper/piper
export PIPER_VOICE=/opt/piper/tata-lou.onnx
export VOICE_LOCAL_TTS=1

# --- LLM souverain (optionnel : Mistral auto-hébergé, API compatible OpenAI) ---
export LLM_BASE_URL=http://mistral-gpu.interne:8000/v1
export LLM_MODEL=mistral-small-latest

# --- Synchro boutique (PR #3) ---
# Exécuter la migration manuellement (comme les autres migrations TypeORM du projet) :
#   1780000000000-CreateBoutiqueMouvements
```

### Points d'attention

- **Défaut OFF** : sans ces variables, comportement identique à la production actuelle.
- **Repli automatique** vers le cloud si un binaire/modèle est absent ou échoue.
- **Aucun changement frontend** requis (le frontend est agnostique du moteur ; seule la
  détection auto du format audio WAV/MP3 a été ajoutée, PR #2).
- **Mesure avant de trancher** : le banc `github.com/somet1010/banc-vosk-julaba`
  (onglet « Corpus Dioula (T1) ») rejoue le corpus Dioula et donne WER + CER réels. Comparer
  Vosk vs Whisper sur ce corpus avant de figer le choix de moteur.
- Ce dépôt `julaba-app` est une **copie de travail** (pas de pipeline de prod). Le report
  vers la production `Julabaovh` / `julaba.online` suit le processus habituel du projet
  (GitHub Actions sur `master`, cf. `JULABA_DECISIONS.md`).

### Ordre suggéré

1. Relire + fusionner PR #1 (accents, sans risque).
2. PR #3 (synchro) : fusionner + exécuter la migration.
3. PR #2 (voix) : fusionner, installer Whisper.cpp + Piper, activer les flags **un par un**
   en vérifiant les logs (`[STT:WHISPER] ok`, `[LOCAL] intent=...`, `[TTS:PIPER] OK`).
