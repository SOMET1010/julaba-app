# AUDIT PARCOURS — GROSSISTE — 2026-10-20

> **Nature :** audit fonctionnel statique du parcours fourni, confronté aux documents du dépôt.  
> **Branche de travail :** `dev`  
> **Statut :** à valider et à recetter ; aucune exécution E2E n'est revendiquée.

## 1. Périmètre et sources

- **Rôle technique :** `marchand`, sous-profil `grossiste`.
- **Références :** `.ai/REQUIREMENTS.md`, `.ai/PROJECT_CONTEXT.md`, `.ai/AUDITS/ACTEURS/AUDIT-ACTEUR-MARCHAND-2026-09-28.md`, `docs/SOUS_PROFILS_MARCHAND.md`.
- **Périmètre :** stock, consolidation des besoins des demi-grossistes, achats amont, publications/récoltes prévues, ventes, négoce, caisse, paiements, cotisations, financement et Academy.

## 2. Résumé du parcours cible

Connexion → ouverture de caisse → contrôle du stock → consolidation des besoins des clients et besoins propres → expression des besoins auprès des coopératives/producteurs → commande, paiement et réception → vente aux demi-grossistes et autres clients → historique → clôture → services complémentaires.

## 3. Constats et écarts

| ID | Constat | Priorité | Action requise |
|---|---|---|---|
| GRO-01 | Le document décrit des besoins des demi-grossistes centralisés par le grossiste, mais ne définit pas si ces besoins sont des demandes indicatives, des commandes fermes ou des engagements de prix. | P1 | Distinguer demande, devis, commande confirmée et vente ; obtenir l'acceptation du client avant de créer une dette ou un engagement. |
| GRO-02 | Le parcours dit que les achats peuvent se faire auprès des coopératives ou producteurs. La documentation actuelle décrit un marché producteur global pour le grossiste et des publications/récoltes prévues ; il faut confirmer le circuit exact et les types d'offres commandables. | P1 | Cartographier les sources autorisées, les statuts et les règles de réservation/livraison par type d'offre. |
| GRO-03 | Le cycle « expression des besoins → commande → paiement → livraison » n'indique pas les preuves de réception, les livraisons partielles, les litiges ni le traitement des écarts. | P1 | Formaliser ces transitions avant de considérer le stock acheté comme disponible. |
| GRO-04 | Le dépôt documente un prix convenu modifiable par ligne pour les flux de négoce. Les unités de gros et conversions sac/carton/cuvette sont signalées comme restant à faire. | P1 | Ajouter une politique d'unités et conversions validée, ainsi que les prix par volume si le métier les exige. |
| GRO-05 | Le modèle de stock marchand `produits` diffère du modèle `stocks` utilisé pour producteurs/coopérateurs. La dette STK-03/STK-05 signale une divergence de modèles et de politique de survente. | P1 | Établir un contrat métier commun ou documenter explicitement les différences par acteur ; chaque mouvement doit être traçable. |
| GRO-06 | Le grossiste peut publier des récoltes prévues selon `docs/SOUS_PROFILS_MARCHAND.md`, mais le parcours ne distingue pas une prévision, une offre disponible, une réservation et une livraison effective. | P1 | Afficher clairement le caractère prévisionnel et interdire de confondre quantité prévue et stock disponible. |
| GRO-07 | La caisse doit réconcilier ventes, dépenses, paiements et remboursements ; le parcours ne définit pas le rapprochement des paiements mobiles ni les écarts. | P1 | Définir journal de caisse, références de paiement, rapprochement et procédure d'écart sans mutation silencieuse. |
| GRO-08 | KEIWA/CNPS/CNAM et les opérateurs mobile money sont nommés comme services, mais leur disponibilité réelle n'est pas prouvée par les exigences seules. | P1 | Confirmer intégrations actives, statuts, frais, callbacks, réconciliation, reversals et responsabilités contractuelles. |
| GRO-09 | Les institutions de financement citées ne garantissent pas une approbation. Le crédit interne JULABA est documenté comme désactivé par défaut et les invariants I4–I6 ne sont pas tous verts. | P1 | Séparer demande de financement externe, évaluation, décision, contrat et décaissement ; ne pas afficher de disponibilité non confirmée. |
| GRO-10 | Le parcours ne spécifie pas l'idempotence des commandes/ventes et les conflits de stock en cas d'opérations simultanées de plusieurs clients. | P1 | Tester la concurrence et les rejeux ; empêcher double réservation/décrément et préserver le journal append-only. |

## 4. Parcours nominal recommandé

1. Connexion et contrôle du sous-profil grossiste.
2. Ouverture de caisse et contrôle du stock, en distinguant stock disponible, réservé et prévisionnel.
3. Consolidation des demandes clients sans les convertir automatiquement en commandes fermes.
4. Création d'une demande d'achat auprès d'un fournisseur autorisé.
5. Confirmation de commande, paiement et suivi de livraison selon les statuts convenus.
6. Réception et contrôle des quantités/qualités avant disponibilité en stock.
7. Vente au client avec prix, unité et quantité convenus.
8. Historique consultable des commandes, ventes, paiements et livraisons.
9. Clôture et rapprochement de caisse.
10. Accès aux services sociaux, de financement et de formation selon leur disponibilité réelle.

## 5. Matrice minimale de recette

| Test | Résultat attendu |
|---|---|
| Demande client non confirmée | Ne génère pas de commande ferme, dette ou sortie de stock par défaut. |
| Offre de récolte prévisionnelle | Identifiée comme prévisionnelle ; pas présentée comme stock déjà disponible. |
| Commande fournisseur partiellement livrée | Reste à livrer calculé, réception traçable, stock ajusté conformément à la règle validée. |
| Deux clients achètent le même stock simultanément | Pas de dépassement non contrôlé ni de double réservation. |
| Vente avec prix négocié | Prix effectif et marge calculés sur les lignes réellement vendues. |
| Paiement mobile en attente ou callback dupliqué | Statut fidèle au prestataire et aucune double écriture. |
| Annulation/remboursement | Événement inverse tracé ; aucun mouvement financier supprimé. |
| Perte réseau et rejeu | Idempotence et état de synchronisation visibles. |
| Accès à une commande d'un autre acteur | Refus côté backend, sans fuite de données. |

## 6. Priorités

- **P0 :** aucun nouveau P0 démontré par le descriptif seul ; invariants de caisse et de stock restent bloquants à la recette.
- **P1 :** commandes clients/fournisseurs, réception, distinction prévisionnel/disponible, cohérence stock, prix/unités, paiements et concurrence.
- **P2 :** amélioration du reporting consolidé et des indicateurs de fidélisation.

## 7. Conclusion

Le parcours grossiste est le plus complexe des trois sous-profils marchands car il agrège besoins clients, achats amont, offres prévisionnelles, négoce, stocks et paiements. La recette doit confirmer chaque transition métier et ne pas assimiler demande, commande, paiement, réception et disponibilité. Les intégrations financières et sociales doivent être prouvées séparément.

**Statut : À RECETTER — audit fonctionnel statique.**
