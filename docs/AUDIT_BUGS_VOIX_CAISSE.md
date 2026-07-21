# Audit bugs — voix + caisse (et correctifs)

Audit du code (juillet 2026) sur les chemins voix + caisse. Branche `claude/voix-offline`.
Tous les correctifs ci-dessous : **typecheck 0 erreur ajoutée + build OK**. À valider en
conditions réelles (appareil + backend).

## Corrigé ✅

| # | Sévérité | Bug | Correctif |
|---|---|---|---|
| 1 | CRITIQUE | **Double-clic « Oui » = vente comptée 2×** (pas de garde, `pendingResponse` async). | Garde synchrone `confirmingRef` avant tout `await` (`useVoiceCore.ts`). |
| 2 | CRITIQUE | **Deux `useOfflineVoiceQueue`** (hook + modal) rejouaient la même file → **ventes offline dupliquées**. | Une seule instance dans `useVoiceCore`, qui expose `pendingCount`/`isReplaying` ; le modal ne crée plus la sienne. |
| 3 | HAUTE | **Boucle de confirmation** : si `needsConfirmation=false`, la vente n'était **jamais** enregistrée. | Flag `confirmed` passé à `executeAction` (bypass du re-confirm). |
| 4 | HAUTE | **Vente perdue en silence si journée non ouverte** (après « c'est enregistré »). | `onAction` **lève** une erreur explicite ; `executeAction` la **montre + la dit** au lieu de l'avaler. |
| 5 | HAUTE | **Vente perdue si token expiré** (`NOT_AUTHENTICATED` avalé, UI en succès). | Enfilée dans la file durable au lieu d'être avalée (`CaisseContext.tsx`). |
| 6 | HAUTE | **`AppContext.addTransaction`** : POST échoué = vente perdue ; les 4xx/5xx « réussissaient » en silence. | `if(!res.ok) throw` + **enfile** la transaction dans la file durable en cas d'échec. |
| 7 | MOYENNE | File hors-ligne en **sessionStorage** (perdue à la fermeture d'onglet). | Passée en **localStorage** (durable). |
| 9 | MOYENNE | Cap de retries **abandonnait** une commande en silence. | La commande **reste dans la file** (visible « en attente ») au lieu de disparaître. |
| 12 | BASSE | `processAudio` **rejouait et double-parlait** sur erreur serveur non-abort. | `break` ajouté après une erreur non-abort. |
| A1 | (latence) | Upload **WAV** non compressé (2-6 s en trop). | Envoi de l'**Opus natif** (Whisper l'accepte). ⚠️ repli mp4 à tester sur iOS réel. |

## À traiter avec un test (non fait — risque sans validation runtime)

| # | Sévérité | Bug | Pourquoi pas corrigé à l'aveugle |
|---|---|---|---|
| 8 | MOYENNE | `onReplay` rapporte un succès même si le rejeu a échoué (`sendText` n'échoue jamais vraiment). | Demande de changer le **contrat de `sendText`** (succès/échec réel) — impacte plusieurs appelants, à tester. |
| 10 | MOYENNE | `quantity` codé à 1 dans le mapping → « quantités vendues » fausses. | **Piège** : `price` = montant total ; `topProduits` fait `total = price × quantity`. Corriger `quantity` **sans** passer `price` en prix unitaire **gonflerait le CA**. À corriger avec 10+11 ensemble, avec test des écrans de stats. |
| 11 | MOYENNE | `prix_unitaire = Math.round(montant/quantite)` : les lignes ne resomment pas au total (500/3→167×3=501). | Lié à #10 ; en FCFA (sans décimales) toute répartition d'un total indivisible arrondit. Stocker le montant total sur la ligne / recalculer les affichages depuis `montant`, avec test. |

## Note

- **A14** (test oui/non AVANT le LLM, backend) : gain de latence réel mais la réponse de
  confirmation se construit depuis la sortie LLM → à refaire **avec tests**, pas à l'aveugle.
- Les correctifs #10/#11 sont **volontairement** laissés : les toucher sans pouvoir
  vérifier les écrans de statistiques risquerait d'afficher un chiffre d'affaires faux —
  pire que le bug actuel. À faire dans une passe dédiée avec test terrain.
