# AUDIT PARCOURS — PRODUCTEUR — 2026-10-20

> **Nature :** audit fonctionnel statique du parcours « e. Parcours du producteur » du workflow officiel (*Workflow des parcours de la solution JULABA*), confronté au code de `dev` @ `a331b59`.
> **Méthode :** lecture directe backend (`producteur*/`, `recoltes-rest/`, `cycles-rest/`, `publications-rest/`, `commandes-rest/`, `commandes/`, `caisse-rest/`, `protection-sociale/`, `wallets/`, `bpay/`, `academy/`, `partner/`) + frontend (`routes.tsx`, `components/producteur/*`, contexts, `services/api/*`). Aucune exécution E2E revendiquée.
> **Recoupements :** `.ai/AUDITS/ACTEURS/AUDIT-ACTEUR-PRODUCTEUR-2026-10-19.md` (PRODUCTEUR-01..22 encore valables), `.ai/BUGS.md` (BUG-008/009/010 ouverts), audits parcours COO / DEMI-GROSSISTE (format suivi).
> **Statut :** à valider avec le métier et à recetter.

## 1. Tableau des 15 étapes du workflow officiel

| # | Étape | Statut | Preuves | Écart |
|---|---|---|---|---|
| 1 | Connexion à la plateforme | **IMPLÉMENTÉ** | Routage par rôle `EntryGate.tsx:91-105` (ROLE_ROUTES, logout si rôle inconnu) ; `UserRole.PRODUCTEUR` `users/entities/user.entity.ts:19` ; self-signup producteur `auth/auth.service.ts:53` (`SELF_SIGNUP_ROLES`), création terrain `auth.controller.ts:767` ; comptes démo `seed-demo.service.ts:109-137` | — |
| 2 | Ouverture de la caisse | **MANQUANT** | Aucune route caisse sous `/producteur` (`routes.tsx:133-152`) ; `ProducteurHome.tsx:102` `hasSessionManagement={false}` ; `roleConfig.ts:171-207` (actions sans caisse) ; backend caisse 100 % marchand (`caisse-rest.controller.ts:351,424` — `caisse_sessions.marchand_id`) | PROD-01 |
| 3 | Suivi de la production (dispo / commercialisable) | **PARTIEL** | `GET /producteur/stats` calcule en base `recoltesKgTotal`, `stockDisponibleKg`, `stockVenduKg` (`producteur-stats.controller.ts:30-40,65-69`) ; détail par récolte stock dispo/vendu (`RecolteDetailModal.tsx:57-64,200-201`) | PROD-11 |
| 4 | Historique de production | **IMPLÉMENTÉ** | Onglets cycles/récoltes/historique (`ProducteurProduction.tsx:112-113,442-455`) ; filtres déclarée/validée/vendue (`MesRecoltesPage.tsx:24-26,213-215`) ; `GET /cycles` (`cycles-rest.controller.ts:12-19`), `GET /recoltes` paginé (`recoltes-rest.controller.ts:14-23`) ; clôture de cycle `POST /cycles/:id/complete` | — |
| 5 | Publication des produits | **PARTIEL** | `POST /publications` garde rôle producteur/cooperateur (`publications-rest.controller.ts:13-16,122-127`), upsert par produit (128-147), nature/quantité/prix/localisation/date récolte/photo ; liaison récolte → statut `validee` (149-154) ; modal bornée au stock de la récolte (`PublierRecolteModal.tsx:18-57`) | PROD-06, PROD-09 |
| 6 | Réception & consolidation des besoins | **PARTIEL** | Réception : commandes acheteurs filtrées `demandesRecues` (`CommandesProducteurPage.tsx:274-281`) + négociations (`InboxNegociations.tsx:97-99`) ; contrôle circuit serveur grossiste→producteur / coopérateur→producteur (`commandes-rest.controller.ts:166-183`) + notif vendeur (:229-233) | PROD-07 |
| 7 | Suivi des demandes de marchandises | **IMPLÉMENTÉ** | `GET /commandes?role=producteur` (alias vendeur, `commandes-rest.controller.ts:29-55`) ; filtres statut/catégorie/tri (`CommandesProducteurPage.tsx:143-155,202-211`) ; `GET /commandes/negociations` (:533-540) ; notifications statut acheteur+vendeur (:411-446) | — |
| 8 | Enregistrement des ventes | **IMPLÉMENTÉ** | Vente directe : `POST /commandes` type `vente_directe` exige `recolte_id` (`commandes-rest.controller.ts:103-110`), décrément ferme de la récolte (`stock-reservation.service.ts:158-198`), keiwa interdit sans consentement acheteur (:116-119, :290-292) ; UI `ajouterCommande` (`CommandesProducteurPage.tsx:582-620`) ; encaissement `POST /commandes/:id/paiement` atomique/idempotent (:247-359) | total jamais recalculé serveur (PRODUCTEUR-03, :133-138) |
| 9 | Historique des ventes | **PARTIEL** | `Revenus.tsx` reconstruit sur commandes réelles, « en attente » séparé (:88-127) ; onglet Historique (`ProducteurProduction.tsx:442-455`) ; KPI livrées/encaissées (`CommandesProducteurPage.tsx:469-472`) | PROD-05 (BUG-010) |
| 10 | Clôture de la caisse (récap trésorerie) | **MANQUANT** | Modale « Résumé activité » = récoltes/revenus/commandes en cours, aucune entrée/sortie ni fond (`ProducteurModals.tsx:317+`) ; pas de session ni clôture producteur côté backend | PROD-01 |
| 11 | Paiement cotisations CNPS/CNAM via KEIWA | **PARTIEL** | Backend `POST /protection-sociale/cotisations` role-agnostique, débit keiwa transactionnel + idempotent (`protection-sociale.controller.ts:67-152`, index unique partiel :129-133) | PROD-04 |
| 12 | Historique des cotisations via KEIWA | **PARTIEL** | `GET /protection-sociale/cotisations` isolé par user (:50-57) ; historique wallet générique (`HistoriquePage.tsx:92-108` sur `GET /wallets/me/transactions`) | PROD-04 |
| 13 | Alimentation KEIWA (Wave/OM/Moov/MTN) | **IMPLÉMENTÉ** | `POST /wallets/me/recharge-mobile` (`wallets.controller.ts:39-58`) → `BpayService.initierPaiement`, `PROVIDER_MAP WAVE/MTN/MOOV/ORANGE` (`bpay.service.ts:4-10`) ; callback `POST /bpay/callback` ; réconciliation cron (`bpay.cron.ts:84-91`) ; 4 opérateurs dans `RechargeWalletModal.tsx:24-27` | — |
| 14 | Accès au financement (IMF Celpaid/Orange Bank/UNACOOPEC) | **PARTIEL / DOCUMENTÉ SEULEMENT** | Socle éligibilité : `GET /partner/financial-score/:userId` sous `ApiKeyGuard` pour partenaires (`partner.controller.ts:25-28`, gestion clés :34-56) | PROD-10 |
| 15 | JULABA Academy | **IMPLÉMENTÉ** | Route `/producteur/academy` (`routes.tsx:142`) → `UniversalAcademy` ; backend `GET /academy/modules`, questions par rôle, `enroll`, `progress`, `my-progress` (`academy.controller.ts:30-180`) ; badges producteur (`academyConfig.ts:152-166`) | — |

Détails de couverture : UI cotisations unique `/marchand/protection-sociale` (`routes.tsx:121`, header `role="marchand"` `ProtectionSociale.tsx:116`) ; aucune entrée depuis le profil producteur (`UniversalProfil.tsx:388-397`) ; tuile CNPS de `PaiementsPage` décorative — « aucun PSP branché » (:10-15) ; « selon statut » : aucune différenciation (entité sans type d'acteur). Écran `BanquePage` = placeholder banques génériques SIB/SG/NSIA… (`BanquePage.tsx:17-26,64-72`) ; Celpaid/Orange Bank/UNACOOPEC : NON TROUVÉ (front et back).

## 2. Point de vigilance du workflow : les 4 états de quantités

Le workflow exige de distinguer les quantités **produites**, **disponibles à la vente**, **commandées** et **effectivement livrées**.

**a) PRODUITES — ✅ modélisées.** `recoltes.quantite` (`recolte.entity.ts:41-42`), planifiées via `cycles.quantite_estimee/quantite_reelle` (`cycle.entity.ts:48-58`) ; agrégat autoritaire `SUM(quantite)` sur `/producteur/stats` (`producteur-stats.controller.ts:30-38`). À la déclaration, `stockDisponible = quantite`, `stockVendu = 0` (`recoltes-rest.controller.ts:62-63`).

**b) DISPONIBLES À LA VENTE — ✅ modélisées, deux niveaux.** `recoltes.stock_disponible` (`recolte.entity.ts:68-69`) décrémenté à la conversion en vente ferme (`stock-reservation.service.ts:131-140`, passage `vendue` si 0 :135) ; `publications.quantite_disponible` (`publication.entity.ts:48-57`) décrémenté **dès la réservation** (`stock-reservation.service.ts:64-67`) — l'offre du marché masque déjà le commandé. Statuts `declaree/validee/vendue` et `disponible/epuise/suspendu` distincts.

**c) COMMANDÉES — ⚠️ modélisées mais INVISIBLES.** Le journal `stock_reservations` existe (une ligne par commande, `active/convertie/liberee`, `stock-reservation.entity.ts:16,26-49`), alimenté par `reserver` (409 si insuffisant, `stock-reservation.service.ts:38-73`) et libéré à l'annulation (:205-227). **Aucun endpoint ne lit cette table** (seules 4 occurrences SQL internes au service :45, :97, :169, :207). Le front affiche une barre « Réservé » lue sur `recolte.stockReserve` (`RecolteDetailModal.tsx:58,201`) — **champ jamais alimenté par le backend → toujours 0**.

**d) EFFECTIVEMENT LIVRÉES — ❌ non distinguées de « vendues ».** La livraison est un **statut** de commande (`CommandeStatut.LIVREE`, `commande.entity.ts:13-20`) posé par le vendeur via `PATCH /commandes/:id/livrer` (`commandes-rest.controller.ts:237-244`). **`stock_vendu` est incrémenté à la CONFIRMATION, pas à la livraison** (`stock-reservation.service.ts:131-140` appelé au passage `confirmee`, `commandes-rest.controller.ts:393-398`). Pas de livraison partielle, pas d'entité de ligne de livraison, réception acheteur = message parlé (`CommandesProducteurPage.tsx:363`). Le back-office livraison est un stub `{ livraisons: [] }` (`admin-analytics.controller.ts:135-138`).

**Verdict : 2 états solides (produites, disponibles), 1 état journalisé mais non exposé (commandées), 1 état manquant en quantités (livrées ≠ vendues).** S'y ajoute un **double modèle stock** : la page « Mes stocks » lit la table `stocks` (`Stocks.tsx:92-107`) pendant que le marché décrémente `recoltes.stock_disponible`, et `POST /stocks` écrit en double dans le catalogue marchand `produits` (`stocks-rest.controller.ts:152-168`) — deux vérités stock incohérentes pour le même acteur.

## 3. Écarts

| ID | Constat | Priorité | Action requise |
|---|---|---|---|
| PROD-01 | Étapes 2 & 10 du workflow (ouverture/clôture de caisse, récap entrées/sorties) absentes du parcours producteur : aucune route, aucun composant, backend `caisse_sessions` marchand-only (`caisse-rest.controller.ts:351,424`) | P1 | Arbitrer : caisse producteur dédiée OU amendement officiel du workflow ; ne pas présenter « Revenus du jour » comme une caisse |
| PROD-02 | « Quantités commandées » non restituées : `stock_reservations` journalisé mais aucun `GET` ; UI « Réservé » branchée sur `stockReserve` jamais alimenté (`RecolteDetailModal.tsx:58`) | P1 | Exposer les réservations actives (ex. `GET /recoltes/:id/reservations`) et alimenter `stockReserve` |
| PROD-03 | « Livré » ≠ « vendu » non distingué : `stock_vendu` incrémenté à la confirmation (`stock-reservation.service.ts:131-140`), livraison = simple statut, pas de livraison partielle ni de réception acheteur tracée | P1 | Définir l'état livré en quantités (décrément à `livree` ou entité lignes de livraison), gérer livraisons partielles et litiges |
| PROD-04 | Cotisations CNPS/CNAM (étapes 11-12) : backend role-agnostique mais UI uniquement sous `/marchand/protection-sociale` (`routes.tsx:121`) ; aucune entrée profil producteur ; « selon statut » non modélisé | P1 | Router la page cotisations pour `/producteur` (ou route commune) ; définir l'éligibilité par statut |
| PROD-05 | BUG-010 (registre, ouvert) : `/producteur/stats` compte les commandes non payées/non livrées dans `revenusTotal` (`producteur-stats.controller.ts:43-52`) → KPI « Revenus totaux » mensonger, divergence online/offline (`ProducteurContext.tsx:613-627` ne compte que `paye`) | P1 | Aligner le calcul serveur sur `statut_paiement='paye'` ou séparer « encaissé / en attente » |
| PROD-06 | Conditions de vente (étape 5) : colonne `conditions_vente` orpheline (`publication.entity.ts:107-108`), jamais envoyée par l'UI (`PublierRecolte.tsx:112-126`) | P2 | Ajouter le champ au formulaire ou assumer la `description` et retirer la colonne |
| PROD-07 | Consolidation des demandes reçues (étape 6) : aucun agrégat « quantités à fournir par produit » ; demandes restent une liste unitaire | P2 | Ajouter une vue d'agrégation des commandes en attente par produit/période |
| PROD-08 | Double modèle stock producteur : « Mes stocks » lit `stocks`/écrit dans `produits` marchand (`Stocks.tsx:92-107`, `stocks-rest.controller.ts:117,146,152-168`) pendant que le marché porte `recoltes.stock_disponible` | P2 | Arbitrer le modèle canonique (PRODUCTEUR-11, COO-04) ; au minimum renommer/découpler « Mes stocks » |
| PROD-09 | Publication possible sans `recolte_id` ni plafond serveur (`publications-rest.controller.ts:128-147`) : une offre peut vendre plus que la production déclarée (= PRODUCTEUR-04) | P2 | Exiger `recolte_id` + plafond `quantite_disponible ≤ stock_disponible` serveur |
| PROD-10 | Financement IMF (étape 14) : placeholder banques génériques, partenaires du workflow absents, flux de demande inexistant | P2 | Définir le MVP financement (demande + éligibilité via `/partner/financial-score`) ou documenter l'exclusion |
| PROD-11 | KPI production incohérent : `ProductionKPIBar.tsx:46` somme `quantite` ; `stockDisponibleKg`/`stockVenduKg` calculés serveur mais jamais affichés | P2 | Afficher les 3 chiffres (produit / dispo / vendu) depuis la source serveur |
| PROD-12 | `GET /revenus` somme `prixUnitaire × quantite` de toutes les récoltes quel que soit le statut (`revenus.controller.ts:14-15`) — endpoint orphelin, contradictoire avec `/producteur/stats` (= PRODUCTEUR-19) | P3 | Supprimer ou aligner |

Rappel registre (hors numérotation PROD) : BUG-008 (récolte/publication perdue hors ligne, pas d'outbox), BUG-009 (annulation de commande sans confirmation), PRODUCTEUR-02/03 (IDOR vendeur_id, total client non recalculé).

## 4. Points positifs

1. **Réservations de stock exemplaires** : transactionnelles, `FOR UPDATE`, 409 si insuffisant, idempotentes par `commande_id`, libération à l'annulation (`stock-reservation.service.ts:23-28,38-73,205-227`) — exactement le socle du point de vigilance.
2. **Encaissement keiwa bancaire** : transaction unique, verrous pessimistes commande + 2 wallets, `assertCompteActif`, index unique d'idempotence (`commandes-rest.controller.ts:247-359`) ; idem débit cotisation (`protection-sociale.controller.ts:96-148`).
3. **Circuit marché verrouillé serveur** par profil (grossiste→producteur, coopérateur→producteur seul) sur la commande **et** la négociation (`commandes-rest.controller.ts:166-183,477-509`) ; marché fail-closed pour les autres rôles (`publications-rest.controller.ts:109-110`).
4. **Vente directe tracée** : `recolte_id` obligatoire, keiwa interdit sans consentement acheteur, journalisée dans `stock_reservations` (`commandes-rest.controller.ts:103-119`, `stock-reservation.service.ts:158-198`).
5. **Stats producteur autoritaires en base** (`/producteur/stats`) avec repli offline honnête documenté (`ProducteurContext.tsx:591-627`).
6. **KEIWA complet** : recharge 4 opérateurs + callback + cron de réconciliation (`bpay.service.ts:4-10`, `bpay.cron.ts:84-91`), pages keiwa accessibles au producteur (`routes.tsx:143-148`).
7. **Academy role-scoped** avec progression persistée (`academy.controller.ts:120-180`).
8. **Traçabilité récolte ↔ publication ↔ commande ↔ négociation** par liens explicites (`recolte_id`, `publication_id`, `negociation_id` — `commande.entity.ts:46-58`).

## 5. Matrice de recette minimale

| Test | Résultat attendu |
|---|---|
| Publication d'une récolte puis vue grossiste et coopérative | L'offre apparaît sur `/publications/marche` pour grossiste et coopérateur, jamais pour détaillant/demi-grossiste |
| Commande en_attente sur une offre | `publications.quantite_disponible` diminue immédiatement ; ligne `stock_reservations` `active` créée ; 409 si quantité > disponible |
| Deux commandes concurrentes sur la même offre | Une seule réussit (verrou `FOR UPDATE`), pas de disponible négatif |
| Annulation d'une commande en_attente | Quantité restituée sur l'offre, réservation `liberee`, rejeu sans double effet |
| Confirmation (vendeur) | `recoltes.stock_disponible` décrémenté, `stock_vendu` incrémenté, publication `epuise` si 0 — une seule fois au rejeu |
| Livraison puis paiement keiwa, rejeu ×2 de l'encaissement | Statut `livree` visible des deux parties + notifications ; un seul couple débit/crédit wallet (index unique) |
| Vente directe sans `recolte_id` ou en mode keiwa | 400 refus serveur dans les deux cas |
| Revenus affichés avec 1 commande en_attente non payée | « Revenus totaux » ne la compte PAS (échoue aujourd'hui : PROD-05/BUG-010) |
| Écran « Réservé » d'une récolte avec 2 commandes actives | Barre « Réservé » = somme des réservations actives (échoue aujourd'hui : PROD-02) |
| Producteur ouvre « Cotisations » et paie CNPS en keiwa | Page accessible depuis l'espace producteur ; débit wallet + cotisation créés atomiquement, idempotent au rejeu |
| Recharge KEIWA via Wave | Crédit wallet au callback (ou à la réconciliation cron), transaction `bpay_transactions` COMPLETED unique |
| Déclaration d'un stock dans « Mes stocks » | Le stock déclaré n'est PAS celui vendu par le marché (écart documenté ou fusion — à arbitrer, PROD-08) |

---

**Statut : À ARBITRER / À RECETTER.** Le cœur métier (production → publication → commande → vente) est réel, transactionnel et protégé ; les écarts critiques portent sur (1) l'absence de caisse producteur (étapes 2/10), (2) la non-restitution des quantités commandées et livrées (cœur du point de vigilance), (3) la couverture CNPS/CNAM côté UI producteur, (4) l'honnêteté du KPI revenus serveur.
