# AUDIT VOIX — architecture réelle, conflits, et condition d'activation de sherpa

18/08/2026. Audit code complet (branche `main`), demandé avant tout merge de la
reconnaissance native (PR #170, **gelée** en attendant) : « on avait de gros
soucis de plusieurs voix qui cohabitaient — la voix principale était celle du
navigateur, ensuite des voix en ligne ».

## 1. Architecture réelle de la SORTIE (qui parle)

**Il existe un chef d'orchestre central : `services/audioManager.ts`** — une
seule source à la fois, générations (une parole neuve invalide la précédente),
priorité user > auto, déduplication, mute global, coupé à chaque navigation
(`AppLayout` → `cancelObsoleteVoice`). Passent par lui : `AppContext.speak`,
`useVoiceCore` (réponses de Tata), `ObjectifContext`, `RapportHebdoContext`.

Deux lecteurs bas-niveau derrière le manager :
- **clips enregistrés de Tata** : 137 `ui-*.mp3` réels dans `public/voix/tata/`,
  pré-cachés au build par le service worker (~7 Mo) ;
- **synthèse du navigateur** (`speechSynthesis`) : voix FR féminine mémorisée
  une fois, `cancel()` avant chaque phrase.

**La voix EN LIGNE est DÉSACTIVÉE** : `elevenlabs.fetchTTS` retourne `null`
immédiatement (« VOIX INTERNET DÉSACTIVÉE (décision produit) »). La
cohabitation historique navigateur + voix online n'est **plus active**.
`predictiveTTS.ts` et `earlyAudioCache.ts` sont du **code mort réactivable**
(ils rappelleraient le TTS cloud si quelqu'un retirait le `return null`).

**Contournent le manager** (canaux parallèles, hors sérialisation) :
`onboardingVoix.direIntro` (lecteur privé d'elevenlabs.ts), `LoginPassword.parle()`
(`new Audio(clip)` direct), `ModeAccesSwitcher` et `BOProfil` (speechSynthesis
brut), bips WebAudio de useVoiceCore.

Découverte annexe : les 9 clips `intro-*.mp3` déclarés par `onboardingVoix.ts`
**n'existent pas** dans `public/voix/tata/` → l'onboarding parle toujours en
synthèse (voix « robot »), jamais avec la vraie voix de Tata.

## 2. Architecture réelle de l'ENTRÉE (qui écoute)

Moteur **unique** : sherpa-onnx natif via le plugin Capacitor `SherpaStt`
(Vosk retiré ; chemin serveur abandonné — « zéro cloud »). Sur `main` le plugin
n'existe pas → `isAvailable()=false` partout → **aucune reconnaissance active
sur aucun canal**, le clavier est le filet. Trois chemins d'écoute, tous via
`offlineStt → nativeStt` : push-to-talk (`useVoiceCore.processAudio` — vente
vocale, stock, dictée « Dis le nom »), pseudo-live par lots (`startLiveDictation`
— connexion, objectif), et `sendText` (clavier, zéro STT).

## 3. Conflits identifiés

| # | Sévérité | Constat |
|---|---|---|
| **C1** | **HAUTE — bloquant sherpa** | **Aucune exclusion mutuelle parole/écoute centrale.** `startRecording` ne coupait que la voix de son propre hook (`isSpeaking`) ; une annonce d'`AppContext.speak`/`speakAuto` pouvait jouer pendant l'ouverture du micro. Les dictées live coupaient `speechSynthesis` mais PAS les clips. Tant que la reco était morte : aucun symptôme. Avec sherpa : **le micro peut transcrire Tata elle-même** (fausse commande, faux « oui » pendant l'auto-écoute de confirmation). |
| C2 | moyenne | Onboarding : lecteur parallèle au manager (chevauchement possible, limité aux écrans pré-auth). |
| C3 | moyenne | `LoginPassword.parle()` : clip hors manager, deux clips peuvent se chevaucher sur l'écran de connexion. |
| C4 | basse | `ModeAccesSwitcher`/`BOProfil` : speechSynthesis brut, un clip du manager peut jouer dessous. |
| C5 | basse (latent) | Code mort TTS cloud réactivable par accident (`predictiveTTS`, `earlyAudioCache`). |

Historique : les gros bugs de cohabitation passés (double-parole, double file
offline, fausse voix « Manuela », voix qui repart après Stop, boucle
online/offline) sont **déjà corrigés** sur `main` — preuves dans
`AUDIT_BUGS_VOIX_CAISSE.md` et les commentaires du code.

## 4. Verdict sherpa (PR #170)

Le lot #170 est **strictement côté entrée** (android/ + docs, zéro fichier
frontend) : il ne change **rien** à la sortie voix. Quand `isAvailable()`
devient vrai, se débloquent : vente vocale, dictée « Dis le nom », dictée
connexion, dictée objectif, écran « Installer ma voix ».

**Verdict : activable À CONDITION de corriger C1 d'abord.** C'est l'objet du
présent lot (voir §5). C2-C5 = hygiène non bloquante, à traiter ensuite.
Après merge de C1 puis de #170 : build APK + mesures + recette appareils
(cf. `SHERPA_ONNX_APK.md`) avant tout pilote.

## 5. Correctif C1 appliqué dans ce lot (verrou parole/écoute)

1. `hooks/useVoiceCore.ts` (`startRecording`) : `audioManager.stopAllVoice()`
   **inconditionnel** avant d'ouvrir le micro — coupe toute voix, quel que soit
   son émetteur.
2. `auth/LoginPassword.tsx` (dictée numéro/code) : `stopAllVoice()` +
   `stopIntro()` (le seul `speechSynthesis.cancel()` laissait clips et intro
   jouer dans le micro).
3. `marchand/ObjectifModal.tsx` (dictée objectif) : idem `stopAllVoice()`.

Restent proposés (petits lots suivants, non bloquants) :
- rapatrier `LoginPassword.parle()` dans le manager (C3) ;
- brancher l'onboarding sur le manager + trancher les clips intro manquants (C2) ;
- unifier `ModeAccesSwitcher`/`BOProfil` sur le manager (C4) ;
- supprimer le code mort TTS cloud (C5) ;
- option durcissement : un flag « micro actif » dans audioManager qui refuse les
  `speakAuto` pendant une écoute.
