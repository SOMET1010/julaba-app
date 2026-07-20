# Audit bugs — voix + caisse (et correctifs)

Audit du code (juillet 2026) sur les chemins voix + caisse. Sévérité, scénario
d'échec, statut. Branche `claude/voix-offline`.

## Corrigé sur cette branche ✅

| # | Sévérité | Bug | Correctif |
|---|---|---|---|
| 1 | CRITIQUE | **Double-clic « Oui » = vente comptée 2 fois** — `confirmAction` lit `pendingResponse` (état async) sans garde ; deux appuis rapides enregistrent 2×. | Garde synchrone `confirmingRef` avant tout `await` (`useVoiceCore.ts`). |
| 5 | HAUTE | **Vente perdue si le token expire** — `NOT_AUTHENTICATED` était avalé, l'UI affichait un succès, rien n'était enregistré. | On **enfile** la vente/dépense dans la file durable au lieu de l'avaler (`CaisseContext.tsx`). |
| A1 | (latence) | **Upload WAV non compressé** (2-6 s en trop) — `convertToWav` décompressait l'Opus. | On envoie l'**Opus natif** du MediaRecorder (Whisper l'accepte). ⚠️ tester le repli mp4 sur iOS réel. |

## À traiter (recommandé, non fait ici — plus délicat / hors de mon périmètre sûr)

| # | Sévérité | Bug | Piste de correctif |
|---|---|---|---|
| 2 | CRITIQUE | **Deux instances de `useOfflineVoiceQueue`** (`useVoiceCore` + `VenteVocaleModal`) rejouent la même file → **ventes offline dupliquées** à la reconnexion. | N'instancier la file qu'à **un seul endroit** ; exposer `pendingCount`/`isReplaying`. |
| 3 | HAUTE | **Boucle de confirmation** — si le backend renvoie `needsConfirmation=false`, `executeAction` ré-entre en "confirming" à l'infini → **vente jamais enregistrée**. | Passer un flag `confirmed` à `executeAction` pour court-circuiter `requiresLocalConfirm`. |
| 4 | HAUTE | **Vente perdue si journée non ouverte** — `onAction` fait `if(!session.opened) return` APRÈS que Tata Lou a dit « c'est enregistré ». | Vérifier l'état de session **avant** l'accusé vocal ; message explicite « ouvre ta journée ». |
| 6 | HAUTE | **`AppContext.addTransaction`** : le reload optimiste efface l'entrée avant le POST ; POST échoué = vente perdue (pas de file). | Ne pas reload sur l'émission optimiste ; réconcilier par id après le POST ; enfiler en cas d'échec. |
| 7 | MOYENNE | File hors-ligne texte en **sessionStorage** (perdue à la fermeture d'onglet). | Passer en `localStorage`/IndexedDB (le chemin micro passe déjà par la file durable IndexedDB). |
| 8 | MOYENNE | `onReplay` renvoie succès même si le rejeu a échoué (`sendText` n'échoue jamais vraiment). | Faire remonter le vrai succès/échec de `sendText`. |
| 9 | MOYENNE | Cap de retries **abandonne** une commande en silence après 3 essais. | Dead-letter + notification utilisateur. |
| 10 | MOYENNE | `quantity` **codé à 1** dans le mapping (`AppContext`) → stats « quantités vendues » fausses en multi-unités. | Dériver la quantité de `produits`/`details`. |
| 11 | MOYENNE | `prix_unitaire = Math.round(montant/quantite)` → les lignes ne resomment pas au total (500/3 → 167×3=501). | Stocker le prix unitaire brut, calculer l'affichage depuis `montant`. |
| 12 | BASSE | `processAudio` **rejoue et double-parle** sur erreur serveur non-abort (pas de `break`). | `break`/`return` après une erreur non-abort. |

## Note importante

- **A14** (déplacer le test oui/non AVANT l'appel LLM) est un gain de latence réel,
  MAIS la réponse de confirmation est construite à partir de la sortie LLM : le
  déplacer demande de reconstruire la réponse depuis l'action en attente. À faire
  **avec tests**, pas à l'aveugle (chemin argent).
- Bugs #2, #3, #6 touchent la machine à états de `useVoiceCore` / `AppContext` :
  corrections à faire avec un test manuel du parcours vocal complet.
