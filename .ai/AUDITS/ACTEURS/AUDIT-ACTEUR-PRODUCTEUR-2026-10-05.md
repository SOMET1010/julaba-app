# AUDIT ACTEUR — PRODUCTEUR — 2026-10-05

## 1. Identité et périmètre

- **Rôle** : `producteur` (+ variante `cooperateur` acceptée sur POST /publications) — acteur terrain, public le plus « peu-lecteur » après la marchande.
- **Frontend audité** : `frontend_src/src/app/components/producteur/**` — **19 fichiers, 9 595 lignes** (CommandesProducteurPage 2 435 l., ProducteurProduction 1 398 l., Stocks 986 l., RecolteForm 785 l…), + `ProducteurContext.tsx` (731 l.), + services `api/` (producteur-api-adapter 204 l., recoltes-api 97 l., cycles-api 102 l., publications-api 195 l., commandes-api 212 l., stocks-api 42 l.), + routes `/producteur/*` **18 routes** (routes.tsx:98-117), garde `checkRouteAccess` (types/constants.ts:144).
- **Backend audité** : `backend/src/{producteur,producteur-rest,producteurs-rest,recoltes-rest,publications-rest,cycles-rest,revenus,boutique}` — **1 541 lignes** — + périmètre connexe `commandes-rest` (636 l. + StockReservationService) et `stocks-rest` (281 l., partagé marchand).
- **Sonde runtime** : backend :3001 vivant (health OK). Login Awa Koné (+2250700000009, marchande) → 200 après 429 de throttle (5/min, endpoint partagé par les agents). **5 sondes GET** exécutées, aucune écriture.

## 2. Fonctionnalités observées dans le code

- **Accueil** : RoleDashboard producteur, KPIs serveur autoritaires `/producteur/stats` (kg et FCFA, plus « compte de récoltes »), greeting vocal parlé, 4 modales KPI (ProducteurHome.tsx:43-51, ProducteurContext.tsx:576-601).
- **Production** : cycles → récoltes → publications en 4 onglets, refresh 30 s (ProducteurProduction.tsx:74-84), création plantation/récolte/publish (modales dédiées, publication liée à `recolte_id` bornée au stock — PublierRecolteModal.tsx:18-50).
- **Déclarer une récolte** : unités locales (tas/sac/cagette/botte, facteurs de conversion), conversion prix par unité → prix/kg (RecolteForm.tsx:267-275), confirmation parlée (l.294).
- **Commandes** : demandes marchands (accepter/refuser/contre-proposer ≤3 tours), livraison, encaissement Keiwa, vente directe obligatoirement rattachée à une récolte (ADR-0001 D2), InboxNegociations, revenus KPI, recherche vocale Groq (CommandesProducteurPage.tsx:569-611, 613-622).
- **Stocks** : onglets Stocks/Revenus, conversation vocale Tantie (ajout/modif au micro), seuils d'alerte, valeur du stock (Stocks.tsx:91-166).
- **Marketplace** : POST /publications réservé producteur/cooperateur, republication réservée grossiste, `/publications/marche` cloisonné par sous-profil (détaillant = vide par défaut, publications-rest.controller.ts:56-121, 108-121).
- **Alertes** : météo Open-Meteo 4 jours + conseils agricoles + résumé vocal, cache hors-ligne marqué `horsLigne` (ProducteurAlertes.tsx:208,387 ; meteo.service.ts:92-110).
- **Revenus/Profil/Paramètres/Alertes/Support/Keiwa** : délégation aux composants universels.

## 3. Constats détaillés

### PRODUCTEUR-01 [P0] — La voix parlée est COUPÉE pour le producteur (`speak()` muet hors rôle marchand)

`AppContext.speak` retourne immédiatement si `user?.role !== 'marchand'` (AppContext.tsx:729-730, trace `ttsIgnoree … 'role-non-marchand'`). Or les 94 appels `speak()` des écrans producteur (RecolteForm 294/301, CommandesProducteurPage 314/328/344/360/374/379, Stocks 162, ProducteurAlertes 387, Revenus 105-115, PublierRecolte 74/78/122/134…) passent tous par ce `speak`. **Impact** : le producteur (cible peu-lectrice, doctrine §1 « la voix est une propriété du PARCOURS ») n'entend AUCUNE confirmation (« C'est enregistré ! »), AUCUNE erreur, AUCUN résumé de revenus — pas même « Paiement encaissé ! L'argent est dans ton Keiwa » (CommandesProducteurPage.tsx:374). La seule voix restante = modale Tantie (clips) et STT. Le feedback d'erreur devient **uniquement visuel** (toast), doublant l'impact de PRODUCTEUR-13. **Preuve** : frontend_src/src/app/contexts/AppContext.tsx:729-730.

### PRODUCTEUR-02 [P1] — IDOR : POST /commandes accepte un vendeur_id arbitraire hors vente directe

Le contrôle `vendeurId !== user.id` n'existe que pour `type='vente_directe'` (commandes-rest.controller.ts:92-94). Pour tout autre type, un marchand crée une commande attribuée au producteur de son choix (l.88), avec `publicationId` non vérifié (l.141, 159-169) → la réservation/convertion décrète le stock d'UNE publication étrangère (StockReservationService, reserver/convertir sur `publication_id` sans vérifier le propriétaire). Le `recolteId` d'une vente directe confirmée n'est pas non plus vérifié comme appartenant au vendeur (l.100-102, 170-177). **Impact** : manipulation inter-comptes du stock et des statistiques de revenus d'un producteur ; commande fictive notifiée chez lui. **Preuve** : backend/src/commandes-rest/commandes-rest.controller.ts:86-94, 114-117, 136-179.

### PRODUCTEUR-03 [P1] — Le total d'une commande est accepté du client sans recalcul serveur

`total` validé seulement `> 0` (commandes-rest.controller.ts:126-131) ; jamais comparé à `quantite × prix_unitaire` ni au prix de la publication. `statut` accepté dès la création (l.121-125) : une commande « acheteur » peut naître `confirmee` avec un prix quelconque, convertible immédiatement, puis payée Keiwa sur ce montant (l.228-275, débit/crédit = `cmd.total`). **Impact** : encaissement possible à un prix non conforme à l'offre ; le vendeur ne re-confirme pas les commandes déjà confirmées à la création. **Preuve** : commandes-rest.controller.ts:121-131, 228-310.

### PRODUCTEUR-04 [P1] — Publication marché sans récolte de rattachement ni plafond de stock (voie /producteur/publier-recolte)

`POST /publications` accepte `quantite_disponible` libre, sans `recolte_id` ni contrôle « quantité publiée ≤ stock récolte » (publications-rest.controller.ts:108-141). Le flux PublierRecolte.tsx (l.106-120) n'envoie aucun `recolte_id` — contrairement à PublierRecolteModal.tsx:47 qui, lui, borne (stockMax). **Impact** : offres fantômes sur le marché grossiste ; réitération directe du P1 « cohérence stock/récolte » de l'audit du 28/09 (partiellement encore valable). **Preuve** : publications-rest.controller.ts:108-141 ; PublierRecolte.tsx:106-120.

### PRODUCTEUR-05 [P1] — Suppressions physiques sans trace — contre la règle critique 6 (« rien n'est jamais supprimé »)

DELETE dur sur cycles (cycles-rest.controller.ts:66-68), récoltes (recoltes-rest.controller.ts:87-90), publications (publications-rest.controller.ts:258-264), stocks (stocks-rest.controller.ts:265-268). Aucun événement tracé, aucun contrôle de dépendances (récolte publiée/commandée supprimable → offres vivantes pointant sur un stock disparu). **Preuve** : fichiers cités ; §8.6 PROJECT_CONTEXT.md.

### PRODUCTEUR-06 [P1] — L'onglet « Revenus » de /producteur/stocks affiche des données financières FICTIVES en dur

`donneesGraphique` = 450 000→1 150 000 FCFA sur 7 jours codé en dur (Revenus.tsx:22-30), `enAttente = 0` / `croissance = 0` affichés comme vrais (« +0% vs période précédente », l.117-118, 209), « historique » = les RÉCOLTES (pas les commandes) avec client « Client », mode « Cash », statut dérivé du seul `statut` récolte (l.119, 353). Le composant est bien monté (StocksWrapper.tsx:128). **Impact** : un producteur peu-lecteur croit voir/entendre un graphique de revenus inventé ; contradiction avec la source de vérité `/producteur/stats`. **Preuve** : Revenus.tsx:22-30, 117-119, 209, 353 ; StocksWrapper.tsx:128.

### PRODUCTEUR-07 [P1] — Toutes les modales producteur sont custom : zéro focus trap, zéro role=dialog/aria-modal

13+ modales `motion.div fixed inset-0` ; `grep Dialog` = 0 fichier, `aria-modal|role="dialog"` = 0 occurrence dans components/producteur (RecolteForm.tsx:320-329, MesRecoltesPage.tsx:44-58, CommandesProducteurPage.tsx:1049/1400/1705/1826/2020/2197/2322, ProducteurModals.tsx:29-34/393, PlantationDetailModal.tsx:64…). Contre ACCESSIBILITY_GUIDE §4.2/§5.2 et DESIGN_SYSTEM §9 (Radix Dialog préféré ; le tranché AUTH-05 de l'audit auth n'a pas été répliqué ici).

### PRODUCTEUR-08 [P2] — Aucune validation d'entrée serveur (DTO body:any), statuts libres → 500 SQL

ValidationPipe global sans effet (body non typé, main.ts:240-246). `statut` récolte accepté tel quel (recoltes-rest.controller.ts:77), `statut` publication libre (publications-rest:242), `status` cycle libre (cycles-rest:47) — colonnes PostgreSQL `enum` → 500 au lieu de 400. Découverte : la couche DTO propre existe mais est MORTE (producteur/cycles/cycles.service.ts + DTO non enregistrés dans app.module.ts — `grep CyclesModule app.module.ts` = vide). **Preuve** : main.ts:238-246 ; recoltes-rest.controller.ts:76-82 ; app.module.ts (aucun module producteur/cycles).

### PRODUCTEUR-09 [P2] — Pas de garde de rôle sur les endpoints producteur (fail-open rôle, fail-closed données)

Aucun `@Roles()`/RolesGuard sur cycles/recoltes/publications/stats/revenus (grep négatif) ; scoping systématique par `user.id`. Runtime : token marchande sur GET /producteur/stats, /recoltes, /publications → **200 avec données vides de son propre scope** (sondes P3/P4/P5), jamais 403. POST /cycles accessible à tout rôle authentifié. **Impact** : pas de fuite de données d'autrui (verdict sonde : OK), mais pollution possible et défense en profondeur absente. **Preuve** : cycles-rest.controller.ts:29-39 ; sondes du 05/10.

### PRODUCTEUR-10 [P2] — cycle_id d'une récolte non vérifié côté serveur (lien inter-comptes)

`cycleId: body.cycle_id || null` sans contrôle que le cycle appartient à `user.id` (recoltes-rest.controller.ts:51). **Impact** : récoltes rattachables à un cycle étranger → agrégats et PlantationDetail faussés.

### PRODUCTEUR-11 [P2] — Deux systèmes de stock parallèles dans l'espace producteur

`/producteur/stocks` gère la table `stocks` (Stocks.tsx:94-107) tandis que les KPIs Home/réservations portent sur `recoltes.stock_disponible` (producteur-stats.controller.ts:30-40) ; aucun pont entre les deux. **Impact** : « stock » différent selon l'écran — risque de décision d'erreur pour l'acteur (relance du P1 historique « cohérence stock/récolte »). **Preuve** : Stocks.tsx:91-115 ; producteur-stats.controller.ts:31-40.

### PRODUCTEUR-12 [P2] — Cibles tactiles < 44 px et gardes CI hors périmètre producteur

Fermeture modale 36 px (MesRecoltesPage.tsx:70 `w-9 h-9`), 40 px (RecolteForm.tsx:344 `w-10 h-10`) ; le garde `test-cible-tactile.mjs` ne scanne que POSCaisse + 4 surfaces auth (scripts/test-cible-tactile.mjs:25, 88-108).

### PRODUCTEUR-13 [P2] — Formulaires sans labels associés ni erreurs rendues accessibles

`<Label>` sans `htmlFor`, `<Input>` sans `id` (PublierRecolte.tsx:195-260, 219-229, 241-247 ; RecolteForm.tsx:356-358, 436-438) ; erreurs uniquement `speak()` + toast sans `role="alert"`/`aria-live` — et le `speak` est mort (PRODUCTEUR-01). Violation ACCESSIBILITY_GUIDE §4.3/§5.4.

### PRODUCTEUR-14 [P2] — aria-label quasi absent sur les boutons icônes

4 occurrences dans 19 fichiers (CommandesProducteurPage ×2, Revenus ×1, ProducteurAlertes ×1) ; X de fermeture, filtres, micro sans libellé.

### PRODUCTEUR-15 [P2] — Offline : aucune file d'attente pour les mutations producteur

Échecs réseau avalés (`console.warn` + perte) dans ProducteurContext (212, 348) et Stocks (109) ; contrairement à la caisse (eventReplayBuffer) et au banc vocal (boutique/sync idempotent ON CONFLICT, boutique.service.ts:20-44). Une déclaration de récolte hors-ligne est perdue sans parole ni file. **Preuve** : ProducteurContext.tsx:212, 348 ; boutique.service.ts (contre-exemple positif).

### PRODUCTEUR-16 [P2] — Voix producteur non migrée en clips (24 phrases a_migrer)

24 entrées PROD_001…PROD_024 toutes `statut: 'a_migrer'` (catalog.ts:353-376) — le parcours producteur dépend du TTS, aucune grammaire par clips pré-cachés comme l'auth/verrou (tranché AUTH-03). **Preuve** : frontend_src/src/app/i18n/voice/catalog.ts:353-376.

### PRODUCTEUR-17 [P2] — Photos : base64 en colonne photo_url TEXT + stratégie mixte Cloudinary/base64

Image compressée ~500 KB en data-URL envoyée en JSON et stockée en TEXT (PublierRecolte.tsx:92-118 ; recolte.entity.ts photo_url text), remontée telle quelle dans les listes du marché ; pendant ce temps CommandesProducteurPage pousse vers Cloudinary (543-567). **Impact** : payload/DB gonflés, lenteur 3G, incohérence de stratégie.

### PRODUCTEUR-18 [P2] — Couleurs hardcodées massives (contre DESIGN_SYSTEM §9), non couvertes par aucun garde

`#2E8B57` (RecolteForm:165, CommandesProducteurPage:66, ProducteurProduction:49, StocksWrapper:68/85 `#00563B`), Revenus.tsx:127 gradient littéral, etc. — `caisseCharte`/`authCharte` ne couvrent pas producteur (grep gardes = vide).

### PRODUCTEUR-19 [P3] — Endpoint /revenus incohérent avec la source de vérité

Somme `prix_unitaire × quantite` de TOUTES les récoltes, vendues ou non (revenus.controller.ts:14-15) — contradictoire avec `/producteur/stats` (commandes hors annulée/litige, l.43-52). Non consommé par Revenus.tsx (stats du contexte) → quasi orphelin.

### PRODUCTEUR-20 [P3] — La localisation d'une récolte est perdue en route

Saisie (RecolteForm.tsx:284) mais non transmise par ProducteurContext.createRecolte (356-370) et sans colonne côté entité récolte.

### PRODUCTEUR-21 [P3] — Bruit console en prod : 29 console.* sur 10 fichiers producteur

CommandesProducteurPage ×9, Stocks ×4, ModifierPublicationModal ×3… — la norme `warnDev` (AUTH-14) n'a pas été étendue ici.

### PRODUCTEUR-22 [P3] — PII : exposition large (mais sans téléphone) des identités producteur

`/publications/marche` joint `first_name, last_name, commune` (publications-rest:60-63) ; `/producteurs/recoltes-prevues` liste NOM + prévisions de tous les producteurs actifs, nationwide, à tout grossiste (producteurs-rest:77-92). Aucun champ téléphone/email dans entités publication/récolte (vérifié). Minimisation à valider produit, pas de fuite de coordonnées.

## 4. Risques et vulnérabilités

| ID | Risque | Catégorie | Criticité | Vecteur |
|---|---|---|---|---|
| PRODUCTEUR-01 | Parcours producteur silencieux (speak muet hors marchand) | Voice-first / doctrine | P0 | AppContext.speak:729-730 (garde rôle) |
| PRODUCTEUR-02 | Création de commande attribuée à un producteur tiers + décrément de sa publication/récolte | IDOR / autorisation | P1 | POST /commandes, vendeur_id non vérifié hors vente_directe |
| PRODUCTEUR-03 | Prix d'encaissement arbitraire (total client) + commande auto-confirmée | Intégrité argent | P1 | POST /commandes total/statut non recalculés |
| PRODUCTEUR-04 | Offres marché sans stock réel (pas de recolte_id/plafond) | Intégrité stock/marché | P1 | POST /publications |
| PRODUCTEUR-05 | Suppressions physiques sans trace ni contrôle de dépendances | Conformité §8.6 / intégrité | P1 | DELETE cycles/recoltes/publications/stocks |
| PRODUCTEUR-06 | Données financières fictives affichées (graphique en dur) | Intégrité argent / confiance | P1 | Revenus.tsx:22-30 monté via StocksWrapper |
| PRODUCTEUR-07 | Modales sans focus trap/aria-modal/ESC | A11y (guide §4/5) | P1 | 13+ modales custom |
| PRODUCTEUR-08 | Entrées non validées (statuts libres → 500), DTO morte | Robustesse / validation | P2 | *-rest controllers body:any |
| PRODUCTEUR-09 | Endpoints producteur sans garde de rôle | Autorisation (défense en profondeur) | P2 | @Roles absent (sondes : 200 scoped) |
| PRODUCTEUR-10 | cycle_id inter-comptes | IDOR partiel | P2 | POST /recoltes cycle_id |
| PRODUCTEUR-11 | Double source de vérité stock | Architecture données | P2 | stocks vs recoltes.stock_disponible |
| PRODUCTEUR-12 | Cibles < 44 px hors gardes CI | A11y tactile | P2 | 36/40 px mesurés au code |
| PRODUCTEUR-13 | Formulaires sans labels/erreurs ARIA (et erreurs muettes via P0) | A11y formulaires | P2 | Label/Input non associés |
| PRODUCTEUR-14 | Boutons icônes sans aria-label | A11y lecteur d'écran | P2 | 4 aria-label / 19 fichiers |
| PRODUCTEUR-15 | Mutations perdues hors-ligne sans file ni annonce | Offline / voice-first | P2 | console.warn + perte |
| PRODUCTEUR-16 | 24 phrases voix non migrées en clips | Voice-first offline | P2 | catalog.ts a_migrer |
| PRODUCTEUR-17 | Base64 photo en TEXT + stratégie mixte | Performance / cohérence | P2 | PublierRecolte vs Cloudinary |
| PRODUCTEUR-18 | Couleurs hardcodées sans garde | Design system §9 | P2 | #2E8B57/#00563B littéraux |
| PRODUCTEUR-19 | /revenus contradictoire avec /producteur/stats | Intégrité données | P3 | revenus.controller.ts:14-15 |
| PRODUCTEUR-20 | localisation récolte perdue | Perte de données silencieuse | P3 | RecolteForm→Context→entity |
| PRODUCTEUR-21 | console.* en prod | Qualité/observabilité | P3 | 29 occurrences |
| PRODUCTEUR-22 | Identités producteur exposées nationwide (sans téléphone) | PII minimisation | P3 | /publications/marche, /producteurs/recoltes-prevues |

## 5. Points forts

1. **Scoping propriétaire systématique** : `user_id`/`user.id` présent dans TOUTES les requêtes cycles/recoltes/publications/stats/stocks (verdict sondes runtime : token marchand → 200 sur données vides de son seul scope, jamais sur celles d'un producteur).
2. **Fail-closed auth** : /cycles et /recoltes sans token → **401** (sondes P1/P2) ; `/publications/marche` vide par défaut pour sous-profil non éligible (publications-rest:99-104).
3. **Réservations de stock exemplaires** : verrou `FOR UPDATE`, idempotence par `commande_id`, refus 409 si stock insuffisant, libération à l'annulation (StockReservationService, commandes-rest:159-178, 339-362).
4. **Encaissement Keiwa bancaire** : transaction unique, verrous pessimistes, garde vente directe sans consentement, index unique d'idempotence (commandes-rest:199-311) — conforme CONSTITUTION §7/§8.2.
5. **Vente directe obligatoirement adossée à une récolte** (ADR-0001 D2) avec garde serveur (commandes-rest:96-103).
6. **Voix conversationnelle réelle** sur Stocks (Tantie, ajout/modif au micro) et alertes météo vocales avec cache hors-ligne (meteo.service).
7. **Banc vocal offline idempotent** `boutique/mouvements/sync` (ON CONFLICT DO NOTHING) — modèle à étendre (PRODUCTEUR-15).
8. **Gardes de rôle ciblés efficaces** là où ils existent : publications (producteur/cooperateur), republier (grossiste seul), recoltes-prevues (grossiste seul), /publications/admin/all (admin).

## 6. Recommandations de correction

1. **PRODUCTEUR-01 (P0)** : lever la garde `role !== 'marchand'` dans AppContext.speak (ou passer à une allow-list par écran) + garde CI « toute page producteur doit émettre ≥1 annonce audible par action critique » ; re-tester le parcours déclarer-récolte à l'oreille.
2. **PRODUCTEUR-02/03 (P1)** : côté serveur, dériver `vendeurId` de la publication (`publication.user_id`) et refuser si ≠ owner ; vérifier `recolte.user_id = vendeurId` ; recalculer `total = quantite × prix_unitaire` serveur et ignorer le `total` client ; forcer `en_attente` à la création hors vente directe.
3. **PRODUCTEUR-04 (P1)** : exiger `recolte_id` (ou cycle_id) sur POST /publications et borner `quantite_disponible ≤ stock_disponible` vérifiée en transaction ; migrer PublierRecolte.tsx vers PublierRecolteModal.
4. **PRODUCTEUR-05 (P1)** : remplacer DELETE par archive/statut `archivee` + événement tracé (règle 6) ; interdire la suppression d'une récolte publiée/commandée (409).
5. **PRODUCTEUR-06 (P1)** : brancher le graphique sur `/producteur/stats` (série serveur) ou masquer ; supprimer `croissance`/`enAttente` fictifs ; lister les COMMANDES du vendeur, pas les récoltes.
6. **PRODUCTEUR-07 (P1)** : migrer les 13 modales vers Radix Dialog (modèle AUTH-05) ; à défaut, role/aria-modal/focus trap/retour focus minimum.
7. **PRODUCTEUR-08/09/10 (P2)** : recâbler les modules producteur/cycles + DTO existants (ils existent, non enregistrés) ou écrire les DTOs sur les *-rest ; @Roles('producteur','cooperateur') sur POST cycles/recoltes ; vérifier `cycle.user_id` à la création de récolte.
8. **PRODUCTEUR-11 (P2)** : arbitrer UNE source de vérité stock producteur (recommandé : recoltes) et faire de /stocks une vue.
9. **PRODUCTEUR-12/13/14 (P2)** : corriger les 2 cibles < 44 px ; étendre test-cible-tactile + une charte charteProducteur au dossier ; associer labels/id et ajouter role="alert".
10. **PRODUCTEUR-15/16 (P2)** : file d'attente offline des mutations producteur (modèle eventReplayBuffer/boutique) ; migrer les 24 PROD_* vers clips.
11. **PRODUCTEUR-17/18/21 (P2)** : imposer Cloudinary partout (URL courtes), charte jetons + garde, warnDev.
12. **PRODUCTEUR-19/20/22 (P3)** : aligner ou retirer /revenus ; propager localisation ; revoir l'affichage des noms (pseudonyme marché ?) côté produit.

## 7. Matrice de recette

| Domaine | À vérifier | Critère d'acceptation |
|---|---|---|
| Auth | routes /producteur/* sans session | redirection EntryGate, aucune donnée |
| Autorisation | API producteur avec token marchand | données propres uniquement (sondé OK), idéalement 403 sur POST |
| IDOR | commande publique avec vendeur_id tiers | refus serveur (aujourd'hui accepté) |
| Argent | encaissement Keiwa rejeu ×2 | un seul mouvement (verrou OK à maintenir) |
| Stock | vente directe + réserve + annulation | stock récolte restitué exactement, idempotent |
| Marché | publication sans récolte | refus ou plafond serveur (aujourd'hui accepté) |
| Trace | suppression récolte publiée | 409 ou archive tracée (aujourd'hui DELETE dur) |
| Voix | déclarer une récolte yeux fermés | confirmation parlée entendue (aujourd'hui MUET) |
| A11y | parcours clavier + lecteur d'écran | focus trap modale, labels associés, cibles ≥ 44 px |
| Offline | déclaration récolte sans réseau | mise en file + rejeu unique (aujourd'hui perte) |
| PII | offre publique marché | pas de téléphone/email ; nom/commune assumé produit |

## 8. Tests critiques recommandés

1. Marchand authentifié crée POST /commandes avec `vendeur_id` = producteur tiers + publication tiers → attendu 403/404 (échoue aujourd'hui).
2. POST /commandes avec total incohérent (1 FCFA pour 1 000 kg) → attendu recalcul/refus serveur (échoue aujourd'hui).
3. POST /publications `quantite_disponible=99999` sans recolte_id → attendu refus (échoue aujourd'hui).
4. DELETE /recoltes/:id d'une récolte avec publication active → attendu 409 (échoue : suppression + offre fantôme).
5. POST /recoltes avec cycle_id d'un autre producteur → attendu 403/404 (échoue : lien accepté).
6. Rejeu ×2 de POST /:id/paiement sur commande Keiwa → un seul couple débit/crédit (doit rester vert).
7. Réservation concurrente : 2 commandes 409 sur même stock publication → une seule passe (doit rester vert).
8. Connexion producteur → déclarer récolte → vérifier qu'une voix audible confirme (échoue aujourd'hui : P0).
9. Session expirée en cours de vente directe → refresh cookie → poursuite sans double écriture.
10. Compte producteur suspendu → tout endpoint producteur refuse immédiatement.

## 9. Synthèse des actions prioritaires

| Priorité | Action | Effort |
|---|---|---|
| P0 | PRODUCTEUR-01 : rendre speak() effectif pour producteur (+ garde CI voix) | S |
| P1 | PRODUCTEUR-02/03 : dériver vendeur de la publication + recalcul total serveur + statut forcé | M |
| P1 | PRODUCTEUR-04 : plafond publication ≤ récolte (exiger recolte_id) | M |
| P1 | PRODUCTEUR-05 : archive tracée à la place des DELETE durs | S |
| P1 | PRODUCTEUR-06 : supprimer le graphique fictif de Revenus, brancher sur /producteur/stats | S |
| P1 | PRODUCTEUR-07 : Radix Dialog sur les modales producteur | L |
| P2 | DTOs + @Roles + cycle_id vérifié (recâbler modules morts) | M |
| P2 | File offline mutations + migration clips PROD_* | M |
| P2 | A11y : cibles/labels/aria-label + gardes CI étendus au dossier | S/M |
| P3 | /revenus aligné, localisation, warnDev, charte jetons | S |

## 10. Scores proposés

| Dimension | Score | Justification |
|---|---|---|
| Accessibilité (a11y) | 52/100 | Modales non conformes (0 focus trap), labels non associés, aria quasi absent, cibles < 44 px — compensé partiellement par la voix (quand elle parle) |
| Sécurité | 61/100 | Scoping user_id systématique et sondes 401 OK, mais IDOR commande (P1), total client, pas de garde de rôle, DELETE durs |
| Intégrité des données | 58/100 | Réservations/encaissement exemplaires MAIS offres sans stock, double source stock, suppressions non tracées, graphique fictif |
| Voice-first | 35/100 | Parcours producteur muet (P0), 24 phrases non migrées clips, STT et conversation Stocks solides en revanche |
| Qualité | 64/100 | Code lisible et commenté, mais 2 435 l. monolithique, DTO morte, console.*, couleurs hardcodées |
| Global | 54/100 | Sous le seuil PROD 60 : bloqué par le P0 voix et les 5 P1 |

## 11. Conclusion + statut

Le socle technique du rôle Producteur est **réellement bon là où il a été travaillé** (réservations de stock verrouillées et idempotentes, encaissement Keiwa atomique, scoping propriétaire vérifié en runtime, 401 fail-closed, vente directe adossée à la récolte). Mais l'audit révèle une **contradiction frontale avec la doctrine voice-first** : la fonction `speak()` est coupée pour tout rôle non-marchand (AppContext.tsx:729), ce qui rend **l'intégralité du feedback vocal producteur inopérant** — pour le public le plus peu-lecteur du projet après la marchande. S'y ajoutent des trous d'autorisation côté commandes (vendeur_id/total acceptés du client), une voie de publication hors stock, des suppressions physiques contraires à la règle 6, et un écran Revenus qui affiche des chiffres inventés.

**Comparaison avec l'audit du 28/09** : « cohérence stock/récolte » → **toujours valable partiellement** (PRODUCTEUR-04/11) ; « concurrence commande/stock » → **essentiellement corrigé** (StockReservationService) ; « SQL brut et duplication » → **toujours valable** (DTO morte, cycles-rest/recoltes-rest raw SQL). L'ancien audit restait déclaratif (« À RECETTER ») ; celui-ci apporte les preuves fichier:ligne et runtime.

**Statut : AUDIT COMPLET — NON CONFORME PROD en l'état (54/100 < 60). Blocants : PRODUCTEUR-01 (P0) puis PRODUCTEUR-02..07 (P1).**
