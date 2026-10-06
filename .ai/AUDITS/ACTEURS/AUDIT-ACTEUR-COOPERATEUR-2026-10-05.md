# AUDIT ACTEUR — COOPERATEUR — 2026-10-05

## 1. Identité et périmètre

- **Rôle audité** : `cooperateur` (backend `UserRole.COOPERATEUR = 'cooperateur'`, `user.entity.ts:22`) — responsable/membre d'une coopérative de marchandes.
- **Compte de sonde** : +2250970707070 « Coopérative Daloa » / COOP-CACAO Daloa (seed `seed-demo.service.ts:112`), mot de passe `1234`, rôle `cooperateur`, `role` résolu `president` côté besoins.
- **Frontend** : 10 composants `frontend_src/src/app/components/cooperative/**` (8 373 lignes, MarcheHub 2 493 l., Membres 1 790 l.) + routes `/cooperative/*` (`routes.tsx:119-137`) + `CooperativeContext.tsx` + `services/api/cooperatives-api.ts`. Côté marchand : `MaCooperative.tsx`, `BesoinMarchand.tsx`.
- **Backend** : `cooperatives-rest/` (contrôleur 953 l., 4 entités, 2 DTO), `commandes-rest/` (flux commandes), `stocks-rest/` (stock personnel, non coop), `dossiers-rest/` (HORS rôle coopérative — cf. §5), `notifications/notify-member`.
- **Sonde runtime** (GET lecture seule, backend :3001) : sans token → **401** ; avec token coopérative → `/cooperatives` 200, `/tresorerie` 200 (0 transaction), `/membres` 200 (3 membres, téléphones exposés, aucun champ sensible), `/stock` 200, `/besoins` 200 (`role: president`, 2 besoins). **Aucune écriture effectuée.**
- **Audit précédent** : `.ai/AUDITS/ACTEURS/AUDIT-ACTEUR-COOPERATEUR-2026-09-28.md` — squelette « À RECETTER » sans preuve fichier:ligne ; validité réévaluée en §3 (COOPERATEUR-00).

## 2. Fonctionnalités observées dans le code

| Domaine | État | Preuve |
|---|---|---|
| Accueil coopérative | KPIs + modales + alerte adhésions en attente | CooperativeHome.tsx:46-156 |
| Membres | liste API réelle, filtres, suspension/exclusion/promotion, ajout marchand par téléphone, notification | Membres.tsx:261-276, 398-615 |
| Trésorerie | solde serveur + saisie transaction + validation/annulation | TresorerieCooperative.tsx, FinancesCooperative.tsx:548-565, backend POST/PATCH cooperatives-rest.controller.ts:194-240 |
| Stock commun | apport + distribution multi-membres + historique « mes distributions » | Stock.tsx:98-241, backend cooperatives-rest.controller.ts:573-788 |
| Besoins membres | consultation + dispatch (quantité/prix) + consolidation | Commandes.tsx:167-318, backend cooperatives-rest.controller.ts:242-409 |
| Marché | publication/retrait produits, commandes producteurs, réception/clôture | MarcheHub.tsx:889-1006, 1588-1760 |
| Flux marchand→coop | adhésion (`rejoindre/:id`), besoin (`POST besoins`), cotisation, distributions reçues | MaCooperative.tsx:56-74,155-173, BesoinMarchand.tsx:34-67 |
| Profil/Paramètres | réutilisés universels | CooperativeProfil.tsx:4, CooperativeParametres.tsx:4 |
| Universal*BO | non utilisés pour les écrans métier coopérative (RoleDashboard/SubPageLayout/UniversalKPI seulement) | CooperativeHome.tsx:84-108 |
| Voix | speak() sur actions, recherche vocale (Membres, Stock), « Écouter la trésorerie » 44 px | Membres.tsx:386-395, Stock.tsx:146-156, FinancesCooperative.tsx:312-316 |

## 3. Constats détaillés

**COOPERATEUR-00 — Validité de l'audit 2026-09-28** : ses 3 hypothèses P1 sont **partiellement levées** : stock coopératif canonique (migration `1781100000000-CooperativeStockCommun.ts` + journal `cooperative_stock_mouvements` append-only) ; concurrence réglée sur le stock (`pessimistic_write`, cooperatives-rest.controller.ts:623,704) mais pas sur cotisation (COOPERATEUR-11) ; ledger trésorerie non réglé (aucune trace `validated_by`, statuts mutés sans historique, :232-237). « P2 stubs » : `commandes-groupees` neutralisé honnêtement (:548-565), cotisation simulée (COOPERATEUR-07). Les nouveaux constats ci-dessous remplacent sa matrice.

**[P1] COOPERATEUR-01 — IDOR inter-coopératives sur la consolidation des besoins** — `consoliderBesoins` accepte `cooperative_id` fourni par le client et exécute l'UPDATE dessus (cooperatives-rest.controller.ts:385-403). Un membre authentifié passe le `cooperative_id` d'une AUTRE coopérative et bascule tous ses besoins en `consolide`. Contradiction frontale avec le commentaire de `createBesoin` (:310-312 : « jamais à un cooperative_id fourni par le client »). Impact : écriture cross-tenant.

**[P1] COOPERATEUR-02 — Membre suspendu/exclu garde tous ses droits** — `resolveUserCooperative` (cooperatives-rest.controller.ts:58-71) ne vérifie jamais `cooperative_membres.statut` ni `actif` : un membre `suspendu`/`exclu` conserve GET membres, GET/POST stock, distribution, besoins, lecture trésorerie (routes :86,170,242,573,596,669). L'UI masque les boutons, pas le serveur.

**[P1] COOPERATEUR-03 — notify-member : message arbitraire à n'importe quel utilisateur** — `POST /notifications/notify-member` autorise `cooperateur, marchand, producteur` **sans vérifier que memberId appartient à la coopérative de l'appelant** (notifications.controller.ts:121-140). Vecteur spam/phishing in-app ciblé (métadonnées `sentBy` seules).

**[P1] COOPERATEUR-04 — Statuts commande divergents : accepter/refuser/négocier ne fonctionnent jamais** — `CommandeStatut` backend = `en_attente|confirmee|en_livraison|livree|annulee|litige` (commande.entity.ts:13-20). Le front envoie `acceptee` (MarcheHub.tsx:964), `refusee` (:978), `en_negociation` (:1742), `envoyee`/`brouillon` (Commandes.tsx:49,375-380) → 400 systématique sur PATCH ; de plus `prixNegocie`/`messageNegociation` sont filtrés par la whitelist `['statut','dateLivraison','notes']` (commandes-rest.controller.ts:337-339) : la négociation est perdue même en cas de statut valide. Enfin les commandes créées par la coop (POST /commandes sans statut → `en_attente`) **n'apparaissent dans aucun groupe** de Commandes.tsx:222-226 : invisibles après création.

**[P1] COOPERATEUR-05 — Catégories trésorerie divergentes : KPI « Volume groupé » mort** — le formulaire envoie `vente_groupee|achat_groupe|commission|frais` (TresorerieCooperative.tsx:470-476) mais les stats du contexte comptent uniquement `categorie === 'vente'` et `'cotisation'` (CooperativeContext.tsx:240,235) avec une union de types qui ne contient pas ces valeurs (:77). Le KPI1 de l'accueil (CooperativeHome.tsx:50) reste à 0 quelle que soit l'activité saisie. Derrière : union dupliquée en 3 endroits (cooperatives-api.ts:38 = encore une autre liste).

**[P1] COOPERATEUR-06 — KPIs argent sans filtre de statut** — `getTotalCotisations` et `volumeGroupe` comptent transactions `validee` **ET** `annulee` (CooperativeContext.tsx:231-235,240) alors que le solde serveur ne compte que `validee` (cooperatives-rest.controller.ts:186-190). L'accueil et l'écran Finances affichent des totaux contradictoires ; une cotisation annulée gonfle le KPI « Total cotisations ».

**[P1] COOPERATEUR-07 — Cotisation auto-validée sans paiement réel** — MaCooperative.tsx:155-173 envoie `{montant: 25000}` (hard-codé) → backend INSERT direct en statut **`validee`** + auto-attribution `cotisation_payee=true` (cooperatives-rest.controller.ts:819-842), sans rail de paiement (aucun mouvement wallet), sans contrôle du montant attendu, sans idempotence (double clic = deux écritures « validées »). Contredit ADR-001/§8.2 (argent = journal contrôlé) ; le président, lui, doit valider ses propres saisies en 2 temps (:194-240) — incohérence de gouvernance.

**[P1] COOPERATEUR-08 — Motif de suspension perdu + « notification envoyée » mensongère** — le front envoie `motif` (Membres.tsx:410,476) mais le backend l'ignore (PATCH membres/:id/statut, cooperatives-rest.controller.ts:492-511, entité cooperative-membre.entity.ts sans colonne) ; aucune notification serveur au membre ; le message « Une notification a été envoyée » (Membres.tsx:418) est faux et l'`addNotification` crée la notification **dans la boîte de la coopérative elle-même** (NotificationsContext.tsx:283-304), pas chez le membre.

**[P1] COOPERATEUR-09 — Modales non conformes (pas de Radix, pas de focus trap)** — toutes les modales coopérative sont des `motion.div` custom : aucun `role="dialog"`, aucun `aria-modal`, pas de focus trap ni d'ESC ni de retour de focus (CooperativeModals.tsx:19-52 ; Membres.tsx:1055-1189,1192-1326,1732-1786 ; TresorerieCooperative.tsx:428-543,547-649 ; FinancesCooperative.tsx:90-228 ; MarcheHub.tsx:1762+). Violation directe ACCESSIBILITY_GUIDE §4.3/§5 (Radix Dialog obligatoire) — exactement le défaut corrigé côté auth (AUTH-05).

**[P1] COOPERATEUR-10 — Couleurs hardcodées massives, hors de toute charte fermée** — `#2072AF` + variantes littérales ≈ 46+ occurrences : CooperativeModals.tsx:9, Membres.tsx:58-60, TresorerieCooperative.tsx:31,153-164, FinancesCooperative.tsx:38, Commandes.tsx:45-47, CooperativeHome.tsx:120-134, MarcheHub.tsx (`#2E7D32`:1792, etc.). Violation DESIGN_SYSTEM §9 ; le garde `charteMarchande.test.mts` ne couvre que MaCooperative.tsx/BesoinMarchand.tsx (budget 0, respecté) — l'espace coopérative entier est hors budgets.

**[P2] COOPERATEUR-11 — Dispatch besoin → distribution non atomique** — `submitBesoinDispatch` PATCH le besoin (commit immédiat, Commandes.tsx:265-268) PUIS distribue (:273-289) ; si la distribution échoue (stock insuffisant), le besoin reste marqué dispatché : l'état commercial diverge du stock réel. Bon point : le front exige `persisted === true` (:294-298).

**[P2] COOPERATEUR-12 — Suppression physique d'une adhésion sans trace** — `DELETE /cooperatives/membres/:id` fait un `delete` dur (cooperatives-rest.controller.ts:513-525) sans événement tracé (§8.6 « rien n'est jamais supprimé ») et sans réaligner `estMembreCooperative` (posé par `rejoindre`, :872-874).

**[P2] COOPERATEUR-13 — GET /cooperatives/:id non scopé** — renvoie toute coopérative par UUID à tout utilisateur authentifié (cooperatives-rest.controller.ts:914-917), seul endpoint sans garde de périmètre.

**[P2] COOPERATEUR-14 — Fuite de messages SQL bruts** — `e.message` renvoyé au client dans createBesoin:338, updateBesoin:372, consoliderBesoins:407, cotisation:840, cloture:815 (énumération de schéma/erreurs Postgres).

**[P2] COOPERATEUR-15 — Besoins : aucun DTO/validation de statut** — POST/PATCH besoins passent le body brut en SQL (cooperatives-rest.controller.ts:315-335,350-369) ; `statut` accepte toute chaîne, le front négocie un vocabulaire divergent (`en_cours|approuve|livre` dans Commandes.tsx:107 vs `consolide|commande|livre` dans la table :46). Un membre peut s'auto-marquer `livre` via API (le PATCH n'exige pas `president`, contrairement à la trésorerie).

**[P2] COOPERATEUR-16 — Cibles tactiles < 44 px récurrentes** — pagination 40 px (Membres.tsx:1621,1639,1654), fermetures drawer 36 px (Membres.tsx:813,1083), fermetures modales 40 px (CooperativeModals.tsx:139,242,338,404,489,557), 32 px (TresorerieCooperative.tsx:573), micro recherche 36 px (Membres.tsx:1511). Contre-exemples conformes dans le même écran (Membres.tsx:1389-1390, FinancesCooperative.tsx:312-314).

**[P2] COOPERATEUR-17 — ARIA manquants sur actions critiques** — alerte « X adhésions en attente » non annoncée (pas de `role="status"`, CooperativeHome.tsx:142-156) ; fermeture modale notification en glyphe sans `aria-label` (Membres.tsx:1753) ; formulaires sans `aria-invalid`/`aria-describedby` (Membres.tsx:1096-1124, TresorerieCooperative.tsx:482-506).

**[P3] COOPERATEUR-18 — Voix dégradée sur le plus grand écran** — `voiceLecture` neutralisé (« causait boucle audio infinie », MarcheHub.tsx:883-886) : le hub marché n'a plus de lecture vocale ; toast « Tantie Nanti Lou parle... » émis sans garantie (Membres.tsx:394).

**[P3] COOPERATEUR-19 — DDL à la demande** — `ensureCooperativeBesoinsTable` exécuté sur chaque appel (cooperatives-rest.controller.ts:34-56) : dérive de schéma assumée, contraire au choix migration fait pour `cooperative_transactions` (1781300000000).

**[P3] COOPERATEUR-20 — Rôle « cooperative » vs « cooperateur » mélangés** — `getRoleConfig('cooperative')` (CooperativeHome.tsx:46) vs `role="cooperateur"` (Membres.tsx:1385, Commandes.tsx:405) ; masqué par `normalizeRole`, risque de maintenance.

## 4. Risques et vulnérabilités

| ID | Risque | Catégorie | Criticité | Vecteur |
|---|---|---|---|---|
| COOPERATEUR-01 | Écriture cross-coopérative (consolidation besoins) | IDOR / autorisation | P1 | PATCH/POST /cooperatives/besoins* avec cooperative_id forgé |
| COOPERATEUR-02 | Membre suspendu/exclu conserve stock/besoins/trésorerie | Autorisation | P1 | API directe avec compte membre actif dans le passé |
| COOPERATEUR-03 | Message in-app arbitraire à tout userId | Abus / spam | P1 | POST /notifications/notify-member (rôles marchand/producteur inclus) |
| COOPERATEUR-04 | Acceptation/refus/négociation commandes impossibles (400) | Intégrité fonctionnelle | P1 | Statuts UI hors enum backend + whitelist PATCH |
| COOPERATEUR-05/06 | KPIs argent faux ou morts (volume groupé 0, annulées comptées) | Intégrité argent | P1 | Union catégories divergente + filtre statut absent |
| COOPERATEUR-07 | Cotisation « payée » sans paiement, non idempotente | Intégrité argent | P1 | Double POST /cooperatives/cotisation |
| COOPERATEUR-08 | Motif suspension perdu, notification auto-adressée | Traçabilité / PII | P1 | PATCH statut sans persistance motif |
| COOPERATEUR-09/16 | Modales sans focus trap/ESC, cibles < 44 px | A11y WCAG 2.1 AA | P1/P2 | Clavier seul, lecteur d'écran, tactile |
| COOPERATEUR-10 | ~80+ hex hardcodés hors charte | Design system | P1/P2 | Aucune garde CI sur l'espace coopérative |
| COOPERATEUR-11 | Dispatch non atomique (état vs stock) | Intégrité stock | P2 | Échec distribution post-PATCH |
| COOPERATEUR-12 | Delete adhésion sans trace | Traçabilité (§8.6) | P2 | DELETE /cooperatives/membres/:id |
| COOPERATEUR-13/14 | Lecture coop quelconque ; fuite messages SQL | IDOR / disclosure | P2 | GET /cooperatives/:id, réponses e.message |
| COOPERATEUR-15 | Auto-marquage besoin « livré », statuts libres | Autorisation | P2 | PATCH /cooperatives/besoins/:id |

## 5. Points forts

1. **Authentification vérifiée en runtime** : `/api/v1/cooperatives/*` sans token → 401 ; token coopérative accepté ; `JwtAuthGuard + RolesGuard` sur tout le contrôleur (cooperatives-rest.controller.ts:19).
2. **distribution() exemplaire** : transaction SQL + verrou pessimiste, stock jamais négatif, journal append-only, notifications post-commit, contrat `persisted:true` (cooperatives-rest.controller.ts:696-753) — modèle à répliquer.
3. **Attachement serveur systématique** : createBesoin ignore le cooperative_id client (:310-335) ; search-marchand et mutations membres réservées au president (:138,470,506,520,541).
4. **PII maîtrisée** : stripSensitiveUserFields sur la liste membres (:119-126) — sonde runtime : téléphones visibles (cohérent intra-coop), aucun hash/pin/WebAuthn.
5. **Optimistic updates avec rollback** sur suspension/exclusion/promotion (Membres.tsx:398-538) ; validation/annulation trésorerie avec snapshot+rollback (CooperativeContext.tsx:296-324).
6. **Honnêteté du code** : commentaires qui documentent les défauts corrigés (migrations 1781300000000, :879-894), stubs déclarés (:548-565).
7. **Côté marchand propre** : MaCooperative/BesoinMarchand en tokens CSS (`--commerce-action`), budget charte 0 respecté, besoin rattaché serveur.
8. **Garde de route testée** : cumul marchand+coopérative encadré par checkRouteAccess + test constants.test.mts:22-61 ; dossiers fail-closed pour le rôle (dossiers-rest.controller.ts:13 — cooperateur → 403).

## 6. Recommandations de correction

1. **COOPERATEUR-01** : retirer `body.cooperative_id` de `consoliderBesoins`, utiliser exclusivement `coop.id` résolu (miroir de `createBesoin`).
2. **COOPERATEUR-02** : ajouter dans `resolveUserCooperative` la lecture du statut d'adhésion ; refuser (403) si `statut` ≠ `actif` sauf lecture `ma-cooperative`.
3. **COOPERATEUR-03** : dans `notifyMember`, vérifier `cooperative_membres` (membre de la coop de l'appelant) + rate-limit par expéditeur.
4. **COOPERATEUR-04** : aligner les statuts UI sur l'enum backend (`confirmee`/`annulee`), ajouter `prixNegocie`/`messageNegociation` à l'entité ou supprimer la négociation côté coop ; mapper `en_attente` dans le groupage d'affichage.
5. **COOPERATEUR-05/06** : définir UNE union de catégories partagée (constant backend + front), filtrer `statut === 'validee'` dans tous les KPIs, ou déléguer les totaux au serveur (déjà fait pour le solde).
6. **COOPERATEUR-07** : brancher la cotisation sur un intent de paiement (wallet/Keiwa) ou la passer en `en_attente` + validation président ; clé d'idempotence client.
7. **COOPERATEUR-08** : colonne `motif` + table d'événements (suspension/exclusion/promotion) ; notification serveur au membre via `sendToUser(memberId)`.
8. **COOPERATEUR-09** : migrer les 7 familles de modales coopérative sur Radix Dialog (modèle AUTH-05) ; **10** : fermer une charte coopérative (budgets hex figés, modèle authCharte.test.mts) ; **16/17** : passer toutes les cibles ≥ 44 px (garde test-cible-tactile étendue), ajouter role="status"/aria-label.
9. **COOPERATEUR-11/12/13/14/15** : encapsuler PATCH+distribution en un endpoint transactionnel ; tracer/soft-delete l'adhésion ; scoper GET :id au périmètre ; remplacer e.message par messages génériques + log serveur ; whitelist statuts besoins + exigence president.

## 7. Matrice de recette

| Domaine | À vérifier | Critère d'acceptation |
|---|---|---|
| Auth | login coopérative, routes /cooperative/* | 401 sans token ; garde front + back cohérentes |
| Autorisation | membre vs president, suspendu/exclu | toute mutation refusée hors périmètre (403), statut d'adhésion respecté |
| Trésorerie | saisie → validation → solde | solde serveur = KPI écran ; annulation retirée des totaux |
| Stock commun | apport/distribution concurrentes | jamais de stock négatif ; 1 mouvement = 1 ligne journal ; persisted exigé |
| Besoins | création marchand → dispatch | besoin rattaché à LA coop de l'appelant ; dispatch atomique |
| Commandes | création → progression → clôture | tous les statuts affichés existent dans l'enum backend |
| Membres | suspension/exclusion | motif persisté, membre notifié, trace exploitable |
| A11y | modales au clavier, cibles | focus trap + ESC + retour focus ; aucune cible < 44 px |
| Voix | actions critiques auditables | speak() présent sur validation/suspension ; pas d'écran muet |
| Sonde live | /cooperatives/tresorerie sans token | 401 (vérifié 2026-10-05) |

## 8. Tests critiques recommandés

1. Membre suspendu → POST /cooperatives/stock/apport et GET /cooperatives/membres → 403.
2. POST /cooperatives/besoins/consolider avec cooperative_id d'une autre coop → refus (test IDOR).
3. PATCH /cooperatives/besoins/:id statut livre par un simple membre → 403 après durcissement.
4. Double POST /cooperatives/cotisation → une seule écriture validee (idempotence).
5. Cycle complet commande coopérative : créer → accepter → livrer → clôturer (statuts enum exacts, 0×400).
6. Distribution concurrente (2 requêtes simultanées sur le même produit) → total décrémenté exact, 2 mouvements.
7. Suspension avec motif → motif lisible en base + notification reçue par le MEMBRE (pas la coop).
8. Parcours clavier seul : modale « Ajouter un marchand » et modale suspension (focus trap, ESC, retour focus).
9. KPI accueil après 1 vente groupée validée et 1 annulée → le volume ne compte que la validée.
10. Garde CI : charte coopérative (budget hex = 0) + cibles ≥ 44 px sur components/cooperative/**.

## 9. Synthèse des actions prioritaires

| Priorité | Action | Effort |
|---|---|---|
| P0 | COOPERATEUR-01 : fermer l'IDOR consoliderBesoins (+ test) | S |
| P0 | COOPERATEUR-02 : refuser les membres non actif dans resolveUserCooperative | S |
| P0 | COOPERATEUR-04 : réaligner les statuts commandes front↔backend | M |
| P1 | COOPERATEUR-07 : cotisation → en_attente + validation (ou rail paiement) | M |
| P1 | COOPERATEUR-05/06 : union catégories unique + filtre statut KPIs | M |
| P1 | COOPERATEUR-08 : persister motif + notifier le membre côté serveur | M |
| P1 | COOPERATEUR-09 : migrer les modales coopérative sur Radix Dialog | L |
| P1 | COOPERATEUR-10 : charte coopérative fermée + garde CI | M |
| P2 | COOPERATEUR-11/12/15 : dispatch atomique, trace adhésion, validation besoins | M |
| P2 | COOPERATEUR-16/17 : cibles ≥ 44 px + ARIA (labels, role="status") | S |
| P3 | COOPERATEUR-18..20 : réactiver la voix du MarcheHub, migration DDL, unifier le nom de rôle | S/M |

## 10. Scores proposés

| Dimension | Score | Justification |
|---|---|---|
| Accessibilité (a11y) | 45/100 | Voice-first partiel, mais modales sans focus trap/ARIA (P1), ~15 cibles < 44 px, alertes non annoncées |
| Sécurité | 60/100 | Auth/scoping/sanitisation solides, mais IDOR inter-coop, membre suspendu actif, notify-member non vérifié |
| Intégrité | 50/100 | Stock exemplaire ; trésorerie/commandes/cotisation : statuts divergents, KPIs faux, écriture auto-validée non idempotente |
| Qualité code | 62/100 | API réelle, rollbacks, commentaires honnêtes ; mais fichiers géants (MarcheHub 2 493 l.), 3 unions dupliquées, zéro test backend coopérative, couleurs hors garde |
| Global | 54/100 | Sous le seuil PROD 60 — l'espace coopérative doit être recetté avant exposition réelle |

## 11. Conclusion + statut

Le rôle **Coopérateur** est fonctionnellement riche (membres, trésorerie, stock commun, besoins, marché) et son socle d'autorisation (scoping serveur, president-only, sanitisation) est réel — la sonde runtime confirme des endpoints authentifiés et scopés. Mais la recette révèle une **désynchronisation systémique front↔backend** : statuts de commande hors enum (accepter/négocier en échec silencieux), catégories de trésorerie qui ne nourrissent jamais les KPIs, cotisation auto-validée sans paiement, motif de suspension jeté. Ajoutés à un IDOR inter-coopératives, à la rétention de droits des membres suspendus et à des modales entièrement hors normes a11y, ces éléments empêchent de déclarer l'acteur prêt pour une exploitation avec de l'argent réel. L'audit 2026-09-28 (squelette « À RECETTER ») est partiellement validé : stock canonique et concurrence traités, ledger trésorerie et traçabilité des annulations toujours ouverts.

**Statut : AUDIT COMPLET — statut acteur : NON CONFORME pour PROD (global 54/100 < 60) — lot de corrections P0 (COOPERATEUR-01/02/04) requis avant recette de clôture.**
