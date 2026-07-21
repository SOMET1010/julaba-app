# Intégration voix offline-first dans Julaba — note technique

Branche : `claude/voix-offline` (NON mergée sur `main` — à valider d'abord).
Statut : **compile** (typecheck 0 erreur sur les fichiers ajoutés/modifiés ; `vite build` OK).
À valider : **en conditions réelles** (appareil + backend), voir §5.

## 1. Ce qui a été fait

« On ne corrige que la voix. » Tout le reste de Julaba (confirmation, caisse,
historique, stock) est **inchangé** : on branche l'offline en amont et en aval.

**Couche 1 — comprendre sans réseau** (`useVoiceCore.processAudio`)
- Nouveau dossier `frontend_src/src/app/voice-offline/` :
  - `offlineStt.ts` — STT Vosk 100 % sur l'appareil (`transcribeWav(blob)`),
    `vosk-browser` en **import dynamique** (chunk séparé, chargé à la demande).
  - `extraction.ts` + `vocabulaire.ts` — compréhension locale (produits, nombres,
    intentions) éprouvée sur le banc de test.
  - `localIntent.ts` — transforme la transcription en la **même forme** que la
    réponse serveur (`intent`, `action`, `response`, `needsConfirmation`).
  - `voskModel.ts` — URL du modèle (une seule constante à changer).
- Dans `processAudio` : si **hors-ligne** OU si le modèle on-device est **installé**,
  on transcrit + comprend localement, puis on repart dans le flux existant via
  `handleResponse(...)`. En ligne et non reconnu → repli serveur (inchangé).

**Couche 2 — enregistrer sans réseau** (`CaisseContext`)
- `voice-offline/offlineCaisse.ts` — **file d'attente durable** (IndexedDB) des
  ventes/dépenses, chaque opération portant une **clé d'idempotence** (uuid).
- `enregistrerVente` / `enregistrerDepense` : hors-ligne → on **enfile** au lieu de
  POSTer (et si une panne réseau survient en cours de POST). En ligne → inchangé.
- Au retour du réseau (événement `online`) **et** au montage : `synchroniser()`
  rejoue les opérations vers `/caisse/vente | /caisse/depense`, puis re-fetch.

## 2. Installer le modèle offline (à câbler côté UI)

Le modèle (~40 Mo) doit être téléchargé **une fois en ligne** (puis mis en cache par
le navigateur → offline ensuite). Ajouter un bouton « Installer le mode hors-ligne »
qui appelle :

```ts
import { ensureOfflineModel } from '../voice-offline/offlineStt';
await ensureOfflineModel(); // télécharge + met en cache ; ensuite offlineModelReady() = true
```

Tant que ce n'est pas fait, `processAudio` hors-ligne prévient l'utilisateur
(« connecte-toi une fois pour l'installer »).

## 3. ✅ Garde-fou backend anti double-comptage (IMPLÉMENTÉ)

La couche 2 rejoue les opérations à la reconnexion avec un champ **`idempotency_key`**
(uuid stable par opération). Le backend le gère désormais :

- **Entité** `caisse-transaction.entity.ts` : nouvelle colonne `idempotency_key`.
- **Migration** `1778700200000-AddCaisseTransactionIdempotencyKey.ts` : colonne +
  **index UNIQUE PARTIEL** (`WHERE idempotency_key IS NOT NULL` — autorise les lignes
  existantes sans clé, interdit deux fois la même clé).
- **Contrôleur** `caisse-rest.controller.ts` (`/caisse/vente`, `/caisse/depense`) :
  si la clé existe déjà → renvoie la transaction existante **sans en créer une
  nouvelle**. Course concurrente gérée (violation d'unicité `23505` → on renvoie
  l'existante).

⚙️ **À l'exploitation :** exécuter la migration (`npm run migration:run` ou équivalent
du pipeline) lors du déploiement.

## 4. Où regarder dans le code

| Rôle | Fichier |
|---|---|
| STT on-device | `voice-offline/offlineStt.ts` |
| Compréhension locale | `voice-offline/extraction.ts`, `vocabulaire.ts`, `localIntent.ts` |
| File d'attente durable | `voice-offline/offlineCaisse.ts` |
| Branche offline (comprendre) | `hooks/useVoiceCore.ts` → `processAudio` |
| Branche offline (enregistrer) | `contexts/CaisseContext.tsx` → `enregistrerVente/Depense` + effet `online` |
| URL du modèle | `voice-offline/voskModel.ts` |

## 5. À valider en conditions réelles (non testable hors appareil)

1. Sur un vrai téléphone : installer le modèle en ligne, puis **mode avion** →
   parler une vente → vérifier transcription + compréhension + confirmation.
2. Vérifier la **file d'attente** : vente hors-ligne → revenir en ligne → la vente
   remonte bien dans l'historique (une seule fois).
3. Appliquer le **garde-fou idempotency_key** backend (§3) AVANT toute mise en prod.
4. Précision du petit modèle sur la voix ivoirienne : la confirmation reste le
   filet de sécurité (déjà en place dans Julaba).

## 6. Souveraineté

`voskModel.ts` pointe aujourd'hui sur un hébergeur public (rapide). Le jour où le
serveur souverain sert le même fichier `.tar.gz` (avec CORS), on change **une seule
ligne**.
