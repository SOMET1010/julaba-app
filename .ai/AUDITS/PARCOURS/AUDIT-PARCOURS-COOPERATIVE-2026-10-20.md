# AUDIT PARCOURS — COOPÉRATIVE — 2026-10-20

> **Nature :** audit fonctionnel statique du parcours fourni, confronté aux documents du dépôt.  
> **Branche de travail :** `dev`  
> **Statut :** à arbitrer et à recetter ; aucune exécution E2E n'est revendiquée.

## 1. Périmètre et sources

- **Acteur métier :** coopérative ; à distinguer du compte acteur technique `cooperateur` qui administre ou représente une coopérative.
- **Références :** `.ai/REQUIREMENTS.md`, `.ai/PROJECT_CONTEXT.md`, `.ai/AUDITS/ACTEURS/AUDIT-ACTEUR-COOPERATEUR-2026-09-28.md`, `docs/dette/REGISTRE-MAITRE.md` (STK-02 à STK-05).
- **Périmètre :** membres, stock commun, consolidation des besoins, approvisionnement producteurs, commandes, ventes aux grossistes, caisse/trésorerie, cotisations, KEIWA, financement et Academy.

## 2. Résumé du parcours cible

Connexion → ouverture de caisse → consultation du stock commun → consolidation des besoins des membres → demande/commande auprès des producteurs → suivi et réception → vente aux grossistes et autres clients → historique → clôture → services sociaux, financiers et formation.

## 3. Constats et écarts

| ID | Constat | Priorité | Action requise |
|---|---|---|---|
| COO-01 | Le parcours mélange parfois la coopérative (organisation) et le coopérateur (compte utilisateur). Les exigences prévoient une coopérative avec responsable, membres, stock et transactions. | P1 | Définir l'identité de l'organisation, les comptes membres et les autorisations propres à chaque action. |
| COO-02 | La consolidation des besoins des membres est décrite sans règle d'approbation, de quota, de priorité ou de gestion d'un membre qui se retire. | P1 | Définir qui peut proposer, valider et annuler un besoin ; conserver la trace et le motif. |
| COO-03 | Le parcours affirme que les achats se font auprès des producteurs via le marché virtuel. C'est cohérent avec le circuit attendu, mais les états commande, négociation, paiement, livraison et litige doivent être détaillés. | P1 | Formaliser les statuts et les transitions ; une demande de besoin ne doit pas valoir commande ni paiement. |
| COO-04 | La dette documentée signale deux modèles de stock : `produits` côté marchand et `stocks` côté producteur/coopérateur. Elle signale aussi des écarts de règles de survente entre ces modèles. | P1 | Définir le modèle canonique ou les différences métier assumées ; garantir mouvements traçables, quantités cohérentes et règle explicite de survente. |
| COO-05 | Le parcours ne précise pas si le stock commun est séparé par lot, qualité, unité, propriétaire ou membre. | P1 | Définir les dimensions nécessaires à la traçabilité, la distribution aux membres et la gestion des pertes/retours. |
| COO-06 | Le compte `cooperateur` a des opérations de trésorerie qui, selon l'audit acteur, doivent être en attente puis validées/annulées ; les permissions président-only sont un point de contrôle. | P1 | Préciser les rôles président/trésorier/membre, les seuils d'approbation, le double contrôle et les journaux d'annulation. |
| COO-07 | La clôture de caisse individuelle et la trésorerie de la coopérative peuvent être deux périmètres différents. Le document les présente comme une seule caisse sans clarifier le modèle. | P1 | Arbitrer caisse personnelle vs caisse collective ; interdire les mélanges entre argent d'un membre et fonds de l'organisation. |
| COO-08 | Le paiement CNPS/CNAM via KEIWA et l'alimentation multi-opérateurs ne sont pas confirmés opérationnellement par les exigences consultées. Les dispositifs peuvent varier selon le statut. | P1 | Vérifier l'éligibilité par type d'acteur et les intégrations réellement disponibles ; rendre les limites et frais explicites. |
| COO-09 | Le financement par IMF/partenaires doit distinguer financement individuel et financement collectif de la coopérative. | P1 | Définir demandeur légal, pièces, mandat de représentation, consentement des membres et statut de la décision partenaire. |
| COO-10 | La formation Academy ne précise pas si les parcours sont individuels ou gérés au niveau de la coopérative. | P2 | Définir suivi par membre, progression agrégée et consentement pour les rapports de formation. |
| COO-11 | Les actions de stock, trésorerie et distribution doivent résister aux opérations concurrentes et aux reprises après perte réseau. | P1 | Tester transactions atomiques, idempotence, permissions serveur et journal append-only. |

## 4. Parcours nominal recommandé

1. Connexion du compte coopérateur et résolution de la coopérative active.
2. Vérification des droits (présidence, trésorerie, gestion des membres, stock).
3. Ouverture de caisse uniquement si le modèle de caisse applicable est défini.
4. Consultation du stock commun avec unités et disponibilité explicites.
5. Consolidation et validation des besoins des membres.
6. Création des demandes auprès des producteurs autorisés.
7. Confirmation de commande, paiement et suivi de livraison.
8. Réception/contrôle, mise à jour traçable du stock puis distribution éventuelle aux membres.
9. Vente aux grossistes/clients avec preuve de transaction.
10. Consultation de l'historique et clôture/rapprochement du bon périmètre financier.
11. Accès aux services sociaux, financiers et Academy selon statut, mandat et intégrations confirmés.

## 5. Matrice minimale de recette

| Test | Résultat attendu |
|---|---|
| Coopérateur sans coopérative active | Pas d'accès aux données d'une autre coopérative ; message explicite. |
| Membre sans droit de trésorerie | Ne peut pas valider ou annuler une opération protégée, même via API directe. |
| Besoins agrégés | Quantités membres, quantité commune et quantité commandée restent explicables et auditées. |
| Réception partielle/non conforme | Écart enregistré, reliquat et litige visibles, stock corrigé selon une règle explicite. |
| Distribution du stock | Source, destinataire, quantité et date traçables ; pas de double distribution au rejeu. |
| Opérations concurrentes | Pas de solde négatif ni de double affectation de la même quantité. |
| Caisse et trésorerie collective | Fonds individuels et fonds de coopérative non mélangés. |
| Annulation d'une opération | Événement inverse tracé, historique conservé. |
| Financement collectif | Mandat et autorisation du représentant vérifiés ; aucune approbation présumée. |
| Reconnexion après offline | Une seule écriture effective par opération, avec résultat de synchronisation explicite. |

## 6. Priorités

- **P0 :** aucun nouveau P0 établi par le seul descriptif ; les invariants argent/stock restent bloquants à la recette.
- **P1 :** modèle d'organisation et permissions, stock commun, commandes/réception, séparation des caisses, trésorerie et reprise offline.
- **P2 :** reporting Academy et agrégation de formation.

## 7. Conclusion

Le parcours coopérative doit être distingué du parcours d'un compte `cooperateur`. Les risques majeurs portent sur l'autorité de décision, le stock commun, les commandes aux producteurs, la séparation des fonds et la traçabilité des opérations. Le circuit producteurs → coopérative est cohérent avec le descriptif, mais doit être validé par des tests de bout en bout et des preuves d'intégration.

**Statut : À ARBITRER / À RECETTER — audit fonctionnel statique.**
