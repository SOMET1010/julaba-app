# AUDIT WORKFLOW OFFICIEL — LES 7 PARCOURS — 2026-10-20

> **Objet :** audit complet de la plateforme JULABA confrontée au document officiel **« Workflow des parcours de la solution JULABA »** (docx du 20/10/2026) : 7 parcours — détaillant, semi-grossiste, grossiste, coopérative, producteur, identificateur, DGE back office.
> **Base auditée :** branche `dev` @ `a331b59` (local = origin/dev).
> **Méthode :** confrontation étape par étape du docx au code (preuves fichier:ligne) + reprise des audits existants du dépôt. Audit statique : il ne prétend pas prouver l'exécution réelle de chaque écran/API.
> **Fichiers d'audit détaillés :**
> - `.ai/AUDITS/PARCOURS/AUDIT-PARCOURS-DETAILLANT-2026-10-20.md` (existant, compléments §6)
> - `.ai/AUDITS/PARCOURS/AUDIT-PARCOURS-DEMI-GROSSISTE-2026-10-20.md` (existant, compléments §6)
> - `.ai/AUDITS/PARCOURS/AUDIT-PARCOURS-GROSSISTE-2026-10-20.md` (existant, compléments §6)
> - `.ai/AUDITS/PARCOURS/AUDIT-PARCOURS-COOPERATIVE-2026-10-20.md` (existant, compléments §6)
> - `.ai/AUDITS/PARCOURS/AUDIT-PARCOURS-PRODUCTEUR-2026-10-20.md` (**nouveau**)
> - `.ai/AUDITS/PARCOURS/AUDIT-PARCOURS-IDENTIFICATEUR-2026-10-20.md` (**nouveau**)
> - `.ai/AUDITS/PARCOURS/AUDIT-PARCOURS-DGE-BACKOFFICE-2026-10-20.md` (**nouveau**)

## 1. Vue d'ensemble des 7 parcours

| Parcours | Étapes docx | Verdict global | Écarts P1 | Écarts P2/P3 |
|---|---|---|---|---|
| a. Détaillant | 11 | **Conforme sous conditions** (cœur marchand solide ; réassort a posteriori non tracé comme achat) | DET-01/03/04/05/07 | DET-02/06/08 |
| b. Semi-grossiste | 14 | **Conforme sous conditions** (circuit vers grossistes verrouillé serveur ; expression des besoins inexistante en tant que fonctionnalité) | DGR-01/03/04/07/08/09/10 | DGR-02/05/06 |
| c. Grossiste | 15 | **Conforme sous conditions** (achat coopératives OU producteurs OK depuis correctif 564dce6 ; consolidation des besoins manquante) | GRO-01/03/07/08/09 | GRO-02/04/05/06/10 |
| d. Coopérative | 15 | **Conforme sous conditions** (circuit producteurs verrouillé ; commandes+traçabilité OK ; livraison partielle manquante) | COO-01/06/07/08 | COO-02/03/04/05/09/10/11 |
| e. Producteur | 15 | **À ARBITRER / À RECETTER** (cœur métier solide ; caisse absente ; 2 états de quantités non restitués) | PROD-01/02/03/04/05 | PROD-06 à 11, PROD-12 (P3) |
| f. Identificateur | 7 | **Conforme sous conditions** (séparation des droits prouvée par C-12 ; KEIWA retiré en contradiction avec le docx) | IDENT-01/04/05 | IDENT-02/03/06 à 10, IDENT-11 (P3) |
| g. DGE back office | 6 | **À RECETTER** (workflow dossiers solide côté BO ; ventes J/M/A et 4 listes jointes manquantes ; rôle `institution` non arbitré) | DGE-01 à 08 | DGE-09 à 12 |

## 2. Les points de vigilance du docx — verdicts

| Point de vigilance du docx | Verdict code | Preuves principales |
|---|---|---|
| **Détaillant (NB)** : achats auprès des semi-grossistes non traçables sauf déclaration a posteriori | **PARTIEL** — déclaration de quantité possible (« Réapprovisionner » `GestionStock.tsx:1026-1049` → `PATCH /stocks/:id`), dépense caisse catégorie `marchandise` (`caisse-rest.controller.ts:59-62`), mais **aucune trace d'achat dans le ledger** (`stocks-rest.controller.ts:26-27` — STK-04) : ni prix d'achat, ni fournisseur, ni entrée horodatée « achat » | Audit détaillant DET-01 |
| **Semi-grossiste** : exprime ses besoins et achète auprès des GROSSISTES via le marché virtuel | **CIRCUIT IMPOSÉ ✅ / FONCTIONNALITÉ « BESOINS » ABSENTE ❌** — le serveur ne laisse voir au demi-grossiste que les offres des grossistes (`publications-rest.controller.ts:97-103`) et refuse tout autre circuit (`commandes-rest.controller.ts:172-181` + tests invariants :160-197) ; mais « expression des besoins » en tant que module : NON TROUVÉ (seul canal = négociation sur une offre, :452-530) | Audit demi-grossiste DGR-01/03 |
| **Grossiste** : consolide les besoins des semi-grossistes ; achète aux coopératives **ou** aux producteurs | **ACHAT AUX DEUX ✅** (correctif 564dce6 : marché grossiste = offres `producteur` **ou** `cooperateur`, `publications-rest.controller.ts:83-89`, `commandes-rest.controller.ts:169-171` ; `a7f2db4` n'est que la mise à jour de l'audit) ; **CONSOLIDATION DES BESOINS ❌** : aucun endpoint grossiste agrégeant les besoins des demi-grossistes | Audit grossiste GRO-01/02 |
| **Coopérative** : s'approvisionne auprès des PRODUCTEURS ; le marché virtuel doit formaliser les commandes, suivre les livraisons et tracer les transactions producteurs ↔ coopératives | **COMMANDES ✅ / LIVRAISONS PARTIEL / TRAÇABILITÉ ✅** — circuit producteur-only imposé (`publications-rest.controller.ts:71-76`, `commandes-rest.controller.ts:176-177,:504`, test :178) ; commandes formalisées sous verrou (143-183) ; paiement wallet atomique/idempotent (257-356) ; mais statuts livraison sans livraison partielle ni quantités reçues ; consolidation des besoins des membres **existe** (`cooperatives-rest.controller.ts:347-393,471-504`) | Audit coopérative COO-02/03/04 |
| **Producteur** : distinguer quantités produites / disponibles à la vente / commandées / effectivement livrées | **2 états solides, 1 invisible, 1 manquant** — produites ✅ (`recoltes.quantite`, cycles), disponibles ✅ (`recoltes.stock_disponible` + `publications.quantite_disponible`), commandées ⚠️ journal `stock_reservations` existe mais **aucun GET** et UI « Réservé » alimentée par un champ jamais renseigné (`RecolteDetailModal.tsx:58`), livrées ❌ `stock_vendu` incrémenté à la CONFIRMATION pas à la livraison (`stock-reservation.service.ts:131-140`) | Audit producteur PROD-02/03 |
| **Identificateur** : distinguer ses droits (créer/soumettre/consulter/mettre à jour) de ceux de la DGE (valider/demander infos/rejeter) | **HONORÉ ✅** (correctif C-12) — 403 métier dédié si le propriétaire tente de muter le statut (`identifications.controller.ts:512-516`), permission `enrolement.validate` réservée aux rôles BO (`bo-autorisation.ts:24-35`), machine à états + audit transactionnel + double porte `PATCH /dossiers/:id` ; failles résiduelles : `gestionnaire_zone` bloqué (IDENT-01), PIN absent sur écritures PII (IDENT-05) | Audit identificateur §2 |
| **DGE** : espace d'administration, statistiques, validation, ventes J/M/A, 4 listes jointes, création identificateur par zone et marché | **SOCLE ✅ / 3 MANQUES STRUCTURANTS ❌** — workflow de dossiers complet côté BO ; ventes J/M/A par acteur inexistantes (aucun bucket temporel) ; 4 listes jointes impossibles (pas de FK coopérative sur marches, pas d'axe marché sur identificateurs, pas de jointure producteur↔coopérative) ; création identificateur : zone OUI / marché NON ; rôle `institution` exclu de toute habilitation | Audit DGE DGE-01/02/04/05 |

## 3. Écarts transversaux (plusieurs parcours à la fois)

| # | Thème du docx | Verdict | Preuves |
|---|---|---|---|
| T-01 | **Ouverture/clôture de caisse avec récapitulatif de trésorerie** (étape commune à 5 parcours) | IMPLÉMENTÉ pour les marchands (caisse-rest) ; **MANQUANT pour producteur et coopérative** (producteur : aucune route caisse, `caisse_sessions.marchand_id` `caisse-rest.controller.ts:351,424` ; coopérative : trésorerie COO-06/07) | PROD-01 |
| T-02 | **Cotisations CNPS/CNAM via KEIWA + historique** (étape commune à 7 parcours) | Backend **existe et est solide** (débit keiwa transactionnel + idempotent `protection-sociale.controller.ts:67-152`, modes `especes/keiwa/mobile_money` :26, contrainte organisme `IN ('CNPS','CNAM')`) ; **UI uniquement sous `/marchand/protection-sociale`** (`routes.tsx:121`) — ni producteur, ni coopérative (route dédiée ?), ni identificateur (retrait volontaire) ; « selon statut » non modélisé ; **intégration réelle CNPS/CNAM non établie** (pas de PSP branché) | PROD-04, IDENT-04 |
| T-03 | **Alimentation KEIWA Wave/Orange/Moov/MTN** (étape commune à 7 parcours) | **IMPLÉMENTÉ** : `POST /wallets/me/recharge-mobile` → B-Pay, 4 opérateurs `WAVE_CI/OM_CI/MOOV_CI/MTN_CI` (`bpay.service.ts:4-10`), callback + cron de réconciliation (`bpay.cron.ts:84-91`) ; absent uniquement de l'espace identificateur (retrait volontaire) | IDENT-04/06 |
| T-04 | **Accès au financement Celpaid/Orange Bank/UNACOOPEC** (étape commune à 5 parcours) | **DOCUMENTÉ SEULEMENT** : socle score financier exposé aux partenaires sous `ApiKeyGuard` (`partner.controller.ts:25-28`) ; aucun flux de demande, partenaires du docx absents des écrans (placeholder SIB/SG/NSIA `BanquePage.tsx:17-26`) ; crédit désactivé par défaut (invariants I4-I6) | PROD-10, DET-05 |
| T-05 | **JULABA ACADEMY** (étape commune à 7 parcours) | **IMPLÉMENTÉ** pour tous les rôles (backend role-scoped + progression persistée `academy.controller.ts:120-180`) ; contenu quiz/gamifié plutôt que modules structurés par métier (IDENT-08) | — |
| T-06 | **Fidélisation clients** (carte des piliers VENTES, tous profils marchands) | **MODULE PRÉSENT MAIS DÉCONNECTÉ DE LA VENTE** : `fidelite-rest.controller.ts` (config/client/gagner/utiliser) alimenté manuellement via `Fidelite.tsx:56`, aucun appel depuis le flux de vente | DET-08 |
| T-07 | **Inventaire digital + alertes niveau bas** (carte STOCKAGE) | **PARTIEL** : ledger append-only `stock_mouvements` (`stocks-rest.controller.ts:29-76`) mais réappro manuels hors ledger (STK-04) ; alertes **OUI** (`notifications/alertes.service.ts:84-117`, seuil_alerte, cron, commit c19c5e5 excluant le stock non suivi) | — |
| T-08 | **Identité numérique** (carte PROTECTION SOCIALE) | **NON EXPOSÉE** : lookup ONECI/RNPP par NNI orienté enrôlement (`oneci.controller.ts:58-84`) ; aucune rubrique « identité numérique » dans les espaces acteurs | — |
| T-09 | **Expression / consolidation des besoins inter-acteurs** (semi-grossiste→grossistes, grossiste→coopératives, producteur réceptionne) | **INEXISTANTE en tant que fonctionnalité** sauf côté coopérative (`cooperative_besoins` + agrégation + consolidation persistée `cooperatives-rest.controller.ts:337-504`) ; partout ailleurs le seul canal = négociation sur une offre | PROD-07, DGR-03, GRO-01 |
| T-10 | **Gestion des commandes / paiement mobile / traçabilité des transactions** (carte APPROVISIONNEMENT & PAIEMENT des profils amont) | **IMPLÉMENTÉ** : statuts de commande `en_livraison/livree/litige` (`commande.entity.ts:13-19`), `PATCH :id/livrer` vendeur-only (`commandes-rest.controller.ts:237-244`), encaissement wallet atomique/idempotent (247-359), B-Pay | — |

## 4. Nouveau défaut découvert par cet audit

**SEC-BESOIN-01 (P1)** — `POST /cooperatives/besoins/consolider` accepte `body.cooperative_id` fourni par le client (`cooperatives-rest.controller.ts:480`), en contradiction avec `createBesoin` qui force la coopérative résolue serveur (:405-409). Un président de coopérative peut consolider les besoins d'une AUTRE coopérative. **Action :** résoudre la coopérative côté serveur comme dans `createBesoin`, ajouter un test d'invariant.

> **✅ FERMÉ le 20/10/2026** — `consoliderBesoins` résout désormais la coopérative côté serveur (`const cooperativeId = coop.id`, `body.cooperative_id` ignoré, même contrat que `createBesoin`). Invariant exécuté sur Postgres jetable : `backend/test/invariants/sec-besoin-01-consolidation-scopee.spec.ts` (SEC-BESOIN-1 attaque avec id étranger → coop A intacte ; SEC-BESOIN-2 consolidation légitime scopée ; SEC-BESOIN-3 `createBesoin` ignore l'id étranger) — 3/3 verts, et prouvé ROUGE sur le code non corrigé (2/3 en échec avant fix).

## 5. Plan d'action priorisé (consolidation des P1 de tous les audits)

1. ~~**IDENT-01 / DGE-12** — débloquer `gestionnaire_zone` (listes isAdmin de `identifications.controller.ts`) : c'est le rôle DGE de terrain, aujourd'hui incapable de valider.~~ **✅ FERMÉ 20/10** (commit b187d4d4 — débloqué SCOPÉ zone, fail-closed sans zone affectée, C-12 intact ; invariant 6/6).
2. ~~**PROD-02 + PROD-03** — restituer les quantités COMMANDÉES et distinguer LIVRÉ de VENDU.~~ **✅ FERMÉ 20/10** : GET /recoltes/:id/reservations (le journal stock_reservations était écrit depuis B2, JAMAIS lu) ; recoltes.stock_livre (migration 1782300000010) incrémenté à livree UNE fois (idempotence dans le ledger, cycle convertie→livree), restitué si annulée/litige ; écran récolte = 4 états docx (livré, vendu non livré, réservé, disponible). Invariants prod-02-03-etats-quantites 6/6 + stock-reservation/négociation/annulation non régressés (34/34).
3. ~~**DGE-01** — arbitrer par écrit le rôle DGE~~ **✅ ARBITRÉ 20/10 (A-03)** : la DGE opère via comptes BO ; `institution` hors validation au pilote (voir §7.1).
4. ~~**DGE-02** — ventes par acteur jour/mois/année.~~ **✅ FERMÉ 20/10** : GET /admin/analytics/ventes-par-acteur?bucket=jour|mois|annee (whitelist serveur du bucket) — volume_total / volume_encaisse (paye) / volume_en_attente séparés ; annulée/litige hors périmètre. Invariant dge-02-ventes-par-acteur 5/5.
5. ~~**DGE-04 + DGE-05** — les 4 listes jointes.~~ **✅ FERMÉ 20/10** : migration 1782300000020 (marches.cooperative_id, users.marche_id + index, miroir DbInit) ; addMembre OUVERTE aux PRODUCTEURS (la jointure producteur↔coopérative existait pas) ; marcheId au DTO de création BO identificateur (persisté users.marche_id) ; GET /admin/groupes/{marches,membres,identificateurs,producteurs} (rôles comptes BO, uuid obligatoire, aucune colonne sensible). Invariant dge-04-05-listes-groupes 5/5.
6. ~~**T-02** — couverture cotisations par rôle.~~ **✅ COUVERT 20/10** : marchand ✅ (route existante), producteur ✅ (PROD-04 : /producteur/protection-sociale + PS1e), identificateur ❌ ASSUMÉ (A-02 : neutre monétiquement, docx amendé), coopérative ✅ (/cooperatives/cotisation). L'ABSENCE d'intégration PSP CNPS/CNAM réelle reste documentée (aucun branchement invented).
7. ~~**PROD-01 / T-01** — arbitrer la caisse producteur~~ **✅ ARBITRÉ 20/10 (A-01)** : amendement docx au stade pilote (voir §7.1).
8. ~~**PROD-04** — router la page cotisations pour l'espace producteur.~~ **✅ FERMÉ 20/10** : /producteur/protection-sociale (même composant, même garde MODULES_HORS_PILOTE), tuile profil gated moduleVisible, rôle auto-détecté par URL. Invariant PS1e 5/5 + garde modulesPilote front verte (16 règles).
9. ~~**PROD-05 (BUG-010)** — aligner revenusTotal sur statut_paiement='paye'.~~ **✅ FERMÉ 20/10** : revenus_total/revenus_jour ne comptent QUE l'encaissé (FILTER SQL) ; revenusEnAttente séparé (on ne cache rien) ; le repli offline était déjà aligné. Invariant prod-05-revenus-encaisses 4/4.
10. ~~**SEC-BESOIN-01** — verrouiller `POST /cooperatives/besoins/consolider` sur la coopérative serveur.~~ **✅ FERMÉ 20/10** (fix + invariant `sec-besoin-01-consolidation-scopee.spec.ts`, 3/3 verts).
11. ~~**IDENT-05** — PIN serveur sur les écritures PII.~~ **✅ FERMÉ 20/10** : la vérification est SERVEUR sur PATCH /users/:id hors self (lecture BRUTE du repo — la sanitisation retirait le PIN chiffré), échelle verrou-pin.ts sur les colonnes dédiées, compteur remis à zéro SEULEMENT par un PIN juste ; self et comptes BO ne paient pas le péage. Invariant ident-05-pin-pii 5/5.
12. ~~**DGE-03/06/07/08** — réparer l'espace institution.~~ **✅ FERMÉ 20/10** : GET /institution/analytics scopé (roles/produits/graphique/inscriptionsParJour/alertes — définition unique des ventes, rien de simulé, fail-closed sans zone) ; boutons Valider/Rejeter remplacés par la note A-03 (l'institution supervise, ne mute pas) ; no-op silencieux de PATCH /acteurs/:id remplacé par une 400 qui NOMME les champs ignorés ; la courbe ×coefficient et les 4 lignes « par profil » inventées remplacées par la série réelle des inscriptions 7 jours ; export supervision = VRAI CSV téléchargeable ; la « config Dashboard » jamais existée côté serveur supprimée du contexte. Invariant dge-03-08-institution-analytics 5/5 + non-régression institution-isolation.

## 6. Complements à apporter aux 4 audits de parcours existants (confrontation)

1. **Détaillant (DET-01)** : documenter le mécanisme a posteriori existant — « Réapprovisionner » (`GestionStock.tsx:1026-1049` → `PATCH /stocks/:id`) + dépense caisse catégorie `marchandise` — et sa limite : hors ledger `stock_mouvements` (STK-04), sans fournisseur ni prix d'achat.
2. **Détaillant** : ajouter « Alertes niveau bas » (`alertes.service.ts:84-117`) et les bornes de l'« Inventaire digital » ; noter « Identité numérique » comme non exposée marchand.
3. **KEIWA/CNPS/CNAM (DET-04, DGR-08, GRO-08, COO-08)** : actualiser avec les preuves `protection-sociale` + `bpay` (cotisations CNPS/CNAM, modes especes/keiwa/mobile_money, débit wallet idempotent ; Wave/Orange/Moov/MTN) ; préciser ce qui reste sans preuve (intégration réelle CNPS/CNAM, remboursements, échecs opérateur).
4. **Tous profils** : ajouter « Fidélisation clients » (module présent, points saisis manuellement, déconnecté de la vente).
5. **Semi-grossiste & grossiste** : constater l'absence de fonctionnalité « expression/consolidation des besoins » inter-marchands (corriger DGR-03 et GRO-01 qui la supposent).
6. **Grossiste** : préciser que « coopératives ou producteurs » = comptes `cooperateur`/`producteur` (564dce6) et que la consolidation des besoins des demi-grossistes n'existe pas.
7. **Coopérative** : citer les preuves code de COO-02/COO-03 (`cooperative_besoins` + agrégation + consolidation ; circuit producteur-only ; statuts livraison ; paiement wallet idempotent ; stock commun append-only) et répondre au point de vigilance : commandes formalisées OUI, suivi de livraison PARTIEL, traçabilité OUI.
8. **Transversal** : référencer dans chaque audit les preuves « Gestion des commandes / Paiement mobile / Traçabilité » (`commandes-rest.controller.ts` statuts+idempotence, wallets, bpay).

## 7. Décisions produit à arbitrer avec le métier

> **⚡ ARBITRÉ le 20/10/2026** — Patrick a délégué l'arbitrage (« Prends les meilleures décisions en arbitrant »). Les 7 arbitrages sont consignés dans `docs/DECISIONS.md` (entrées **A-01** à **A-07**, datées, révocables par écrit) et résumés en §7.1 ci-dessous.

| # | Question | Options |
|---|---|---|
| A-01 | Le producteur a-t-il une caisse (ouverture/clôture/récap trésorerie) comme le dit le docx, ou « Revenus du jour » suffit-il ? | Caisse dédiée / amendement docx |
| A-02 | L'identificateur paie-t-il des cotisations KEIWA (docx) ou reste-t-il monétiquement neutre (décision IDENTIFICATEUR-16) ? | Réintégrer KEIWA / amendement docx |
| A-03 | Qui valide les enrôlements au nom de la DGE : comptes back-office (`admin_national`…) ou rôle `institution` ? | DGE-01 |
| A-04 | Le grossiste doit-il voir la consolidation des besoins des semi-grossistes dans l'app, ou le docx décrit-il un processus hors plateforme ? | T-09 |
| A-05 | Les réassorts du détaillant doivent-ils être déclarés comme ACHATS (prix, fournisseur, entrée dans le ledger) ou un ajustement de stock suffit-il ? | NB du docx / STK-04 |
| A-06 | La fidélisation doit-elle être déclenchée automatiquement par la vente ? | DET-08 |
| A-07 | Le financement est-il un MVP (demande + éligibilité) ou une simple vitrine d'orientation ? | PROD-10, DET-05 |

### 7.1 Arbitrage du 20/10/2026 (délégation Patrick — révocable par écrit)

| # | Arbitrage retenu | Portée immédiate |
|---|---|---|
| A-01 | **Amendement docx au stade pilote** : « Revenus du jour » = vue trésorerie du producteur ; la caisse producteur dédiée est POST-pilote, sur les invariants caisse marchande. | Rien à coder aujourd'hui ; le libellé « caisse » ne doit jamais être affiché côté producteur (PROD-01). |
| A-02 | **Amendement docx** : l'identificateur reste MONÉTIQUEMENT NEUTRE (IDENTIFICATEUR-16 tenue) ; pas de réintégration KEIWA. | Aucun code ; docx amendé pour la cotisation identificateur (hors espace). |
| A-03 | **La DGE valide via les comptes back-office** (C-12, `enrolement.validate`) ; rôle `institution` HORS validation au pilote ; déblocage `gestionnaire_zone` = chantier P1 prioritaire (IDENT-01/DGE-12). | ✅ Fait le 20/10 : `gestionnaire_zone` débloqué SCOPÉ zone (commit b187d4d4, invariant 6/6). |
| A-04 | **Hors plateforme au stade pilote** : canal in-app = offres + négociation ; la consolidation des besoins reste un module COOPÉRATIVE ; extension semi-grossiste/grossiste = POST-pilote (T-09). | Aucun code ; docx amendé (processus hors app au pilote). |
| A-05 | **Principe adopté : un réassort est un ACHAT** (cible ledger type achat + dépense marchandise + fournisseur optionnel — STK-04 « cible actée ») ; déclaration a posteriori = voie officielle du pilote (le docx la décrit déjà). | ✅ Fait le 20/10 : entrée ledger 'achat' (commit 964697ce — delta sous verrou, fournisseur + coût optionnels, idempotent, migration 1782300000000 ; invariant 4/4). La dépense caisse reste le chemin de l'argent (ADR-001). |
| A-06 | **Oui au principe** : crédit de points à l'encaissement confirmé, idempotent (une vente = une accréditation) ; implémentation POST-pilote après recette caisse. | Aucun code aujourd'hui (le flux de vente est en recette terrain). |
| A-07 | **Vitrine d'orientation au pilote** (pas de flux de demande) ; MVP financement POST-pilote sur le socle score financier + ApiKeyGuard ; remplacer/retirer les placeholders SIB/SG/NSIA ; I4-I6 tenus. | ✅ Fait le 20/10 : partenaires du docx à l'écran + fausse « banque liée » supprimée (commit 83fe939a). |

> **✅ 20/10/2026 (suite)** — Les 12 items du plan §5 sont FERMÉS (16 commits, 9 nouveaux invariants : prod-05 4/4, prod-02-03 6/6, dge-02 5/5, PS1e 5/5, dge-04-05 5/5, ident-05 5/5, dge-03-08 5/5 ; non-régression globale 344 tests verts). DEUX échecs PRÉEXISTANTS à la base 8a829fd5, hors périmètre du lot : commande-negociation-lien (POST /commandes/negociation → 400, prouvé au commit de base) et le gate schema-pilote (régularisé par re-gel de l'empreinte, procédure du workflow).

---

**Conclusion générale.** Le cœur du produit (caisse marchande, marché virtuel avec circuits imposés, réservations de stock transactionnelles, encaissements idempotents, workflow d'enrôlement avec séparation des droits) est **réel, transactionnel et bien gardé**. Les écarts majeurs se concentrent sur : (1) la restitution d'informations déjà journalisées mais non exposées (quantités commandées/livrées, ventes J/M/A, 4 listes jointes), (2) la couverture des parcours récents par les écrans (cotisations, caisse producteur), (3) des arbitrages produit non consignés qui opposent le docx au code (KEIWA identificateur, caisse producteur). Aucune de ces ouvertures ne remet en cause le socle — elles sont traçables, numérotées et prêtes à être planifiées.
