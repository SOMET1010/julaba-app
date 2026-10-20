# AUDIT PARCOURS — DEMI-GROSSISTE / SEMI-GROSSISTE — 2026-10-20

> **Nature :** audit fonctionnel statique du parcours fourni, confronté aux documents du dépôt.  
> **Branche de travail :** `dev`  
> **Statut :** à arbitrer avec le métier puis à recetter ; aucune exécution E2E n'est revendiquée.

## 1. Périmètre et sources

- **Rôle technique :** `marchand`, sous-profil documenté `demi_grossiste`.
- **Références :** `.ai/REQUIREMENTS.md`, `.ai/PROJECT_CONTEXT.md`, `.ai/AUDITS/ACTEURS/AUDIT-ACTEUR-MARCHAND-2026-09-28.md`, `docs/SOUS_PROFILS_MARCHAND.md`.
- **Périmètre :** caisse, stock, consolidation des besoins, marché amont, commandes, ventes négociées, clôture, cotisations, KEIWA, financement et Academy.

## 2. Résumé du parcours cible

Connexion → ouverture de caisse → consultation du stock → consolidation des besoins → commande auprès de fournisseurs → suivi commande/livraison → ventes aux détaillants et autres clients → historique → clôture → services sociaux/financiers et formation.

## 3. Constats et écarts

| ID | Constat | Priorité | Action requise |
|---|---|---|---|
| DGR-01 | **Correction engagée sur `dev`** : le parcours métier fourni est retenu — le demi-grossiste achète auprès des grossistes. `GET /publications/marche` expose les offres de marché coopératif publiées par des comptes `marchand/grossiste`, et `POST /commandes` valide le profil du vendeur et le canal avant réservation. | P1 | Recetter les cas autorisés/refusés avec une base de test et confirmer le périmètre de visibilité entre coopératives. |
| DGR-02 | Le terme « semi-grossiste » du document et `demi_grossiste` du code sont deux libellés pour le même sous-profil ; la documentation demande explicitement de trancher la terminologie avant recette. | P2 | Choisir un libellé métier unique sans changer la valeur technique sans migration contrôlée. |
| DGR-03 | L'expression de besoins, la commande, la livraison et le paiement sont quatre états distincts, mais le parcours les présente parfois comme un seul flux. | P1 | Définir les statuts et transitions, la quantité confirmée, les reliquats, l'annulation, le remboursement et le responsable de chaque transition. |
| DGR-04 | Le document prévoit suivi des commandes, mais ne définit ni preuve de réception ni traitement d'une livraison partielle ou d'une marchandise non conforme. | P1 | Ajouter une étape de réception contradictoire et une procédure d'écart avant mise à jour définitive du stock. |
| DGR-05 | Le dépôt documente la négociation avec prix convenu par ligne pour le demi-grossiste, ainsi que la saisie directe de quantités. Les unités de gros et conversions sac/carton/cuvette restent à faire selon `docs/SOUS_PROFILS_MARCHAND.md`. | P1 | Tester prix réellement convenu et marge ; définir unités, conversions et règles d'arrondi avant de calculer le stock. |
| DGR-06 | Le stock marchand (`produits`) et le stock producteur/coopérateur (`stocks`) sont deux modèles distincts ; la dette documentée signale des écarts de politique de survente entre modèles. | P1 | Ne pas supposer que les mêmes règles s'appliquent partout. Définir la règle par acteur et garantir une trace cohérente à chaque mouvement. |
| DGR-07 | L'ouverture/clôture de caisse et le paiement mobile nécessitent une distinction entre commande créée, paiement initié, paiement confirmé et fonds rapprochés. | P1 | Utiliser des statuts vérifiables et des opérations idempotentes ; interdire les doubles débits au rejeu. |
| DGR-08 | CNPS/CNAM via KEIWA, rechargement multi-opérateurs et financement partenaire ne sont pas prouvés disponibles par le seul descriptif métier. | P1 | Valider intégrations, contrats, callbacks, frais, échecs, remboursements et critères d'éligibilité. |
| DGR-09 | Le parcours ne formalise pas les ventes à crédit, les retours ni les écarts de caisse, alors que les invariants de crédit I4–I6 sont signalés comme incomplets. | P1 | Définir les règles métier avant activation du crédit ; couvrir dette, acompte, annulation et traçabilité. |
| DGR-10 | Le mode offline peut toucher commande, vente, stock et argent : ces opérations n'ont pas toutes le même niveau de sécurité ni la même possibilité de mise en attente. | P1 | Définir par action ce qui est permis hors ligne, ce qui reste en brouillon et ce qui attend une confirmation serveur. |

## 4. Parcours nominal recommandé

1. Connexion et contrôle du sous-profil.
2. Ouverture de caisse et lecture du stock suivi.
3. Consolidation des besoins avec quantités et unités explicites.
4. Sélection d'un fournisseur réellement autorisé pour ce sous-profil.
5. Création de commande avec prix convenu, quantité, frais et conditions.
6. Suivi des états de commande et du paiement.
7. Réception confirmée, partielle ou contestée ; mise à jour traçable du stock.
8. Ventes aux détaillants/clients avec prix négocié par ligne si applicable.
9. Clôture de caisse et rapprochement.
10. Accès aux services sociaux, financiers et pédagogiques uniquement selon leur disponibilité confirmée.

## 5. Matrice minimale de recette

| Test | Résultat attendu |
|---|---|
| Demi-grossiste sans coopérative active | Marché et actions amont conformes à la règle décidée ; message explicite, pas d'échec silencieux. |
| Tentative d'achat auprès d'un fournisseur interdit | Refus côté backend, pas seulement masquage du bouton. |
| Commande livrée partiellement | Quantités commandées/reçues/restantes distinctes ; stock mis à jour seulement selon la règle de réception. |
| Prix négocié | Prix convenu persisté par ligne ; montant et marge recalculés à partir du prix effectif. |
| Unités de gros | Conversion testée et sans perte/arrondi ambigu. |
| Paiement rejoué ou callback dupliqué | Un seul débit/crédit effectif, état cohérent. |
| Vente hors ligne rejouée | Pas de double vente ni de double mouvement stock. |
| Clôture de caisse | Entrées/sorties et écart consultables ; pas de modification silencieuse d'un mouvement passé. |
| Connexion d'un autre acteur | Aucune lecture ni modification des commandes ou stocks hors périmètre. |

## 6. Priorités

- **P0 :** aucun nouveau P0 établi uniquement par le descriptif.
- **P1 :** arbitrage du circuit d'achat, statuts commande/réception/paiement, unités de gros, cohérence du stock, caisse et offline.
- **P2 :** harmonisation de la terminologie.

## 7. Conclusion

Le circuit d'approvisionnement a été aligné sur le parcours fourni dans le code de `dev` : les demi-grossistes voient les offres publiées par des grossistes et le backend valide le canal à la création de commande. La visibilité globale des offres et les cas limites restent à recetter. Les services sociaux, paiements et financement nécessitent une vérification d'intégration séparée.

**Statut : À ARBITRER / À RECETTER — audit fonctionnel statique.**


## Mise à jour après corrections du 20/10/2026

- `backend/src/publications-rest/publications-rest.controller.ts` : filtrage des offres demi-grossiste sur les publications coopératives des vendeurs `marchand/grossiste`.
- `backend/src/commandes-rest/commandes-rest.controller.ts` : une commande de marché exige une publication, verrouille l'offre, vérifie son vendeur, son statut et le circuit autorisé avant réservation.
- `frontend/src/app/components/marchand/MarcheVirtuel.tsx` : les offres sont remplacées même si la réponse est vide ; le catalogue précédent ne reste pas affiché après un changement de session/profil ; libellé de secours « Grossiste » ajouté.
- **Non vérifié à ce stade :** build TypeScript, tests d'intégration avec PostgreSQL et parcours E2E.
