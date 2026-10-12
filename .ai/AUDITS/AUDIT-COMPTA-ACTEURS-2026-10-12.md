# AUDIT COMPTABLE — Workflows d'argent de TOUS les acteurs — 2026-10-12

> **Mission** : « Fais un audit comptable des workflows de tous les acteurs » (Patrick, 12/10/2026).
> **Périmètre** : les 10 rôles de `UserRole` (backend/src/users/entities/user.entity.ts:18-29) × toutes les chaînes d'argent (caisse, Keiwa, B-PAY, commandes, coopérative, tontines, protection sociale, score financier, ajustements BO).
> **Méthode** : cartographie code source (backend `backend/src/*` + frontend `frontend/src/*`), recoupement avec les registres (`BUGS.md`, `SEC_BUGS.md`, `INCIDENTS.md`, `DEBT_REPORT.md`), les 10 audits par acteur du 05/10/2026 (`.ai/AUDITS/ACTEURS/`), les invariants CI (`backend/test/invariants/`, `ci/garde-argent.mjs`, `PERIMETRE-ARGENT.json`) — puis **vérification de première main des 5 constats critiques** (cités ci-dessous avec extrait vérifié).
> **Auteurs** : agent Z.ai Code (sandbox) — synthèse des rapports d'exploration Tasks 35-a (backend), 35-b (frontend), 35-c (registres), worklog 35.

---

## 1. Le référentiel comptable du projet (ce contre quoi on audite)

| Règle | Source | Verdict global |
|---|---|---|
| « UNE caisse. UNE logique métier. UNE source de vérité. » | `ci/PERIMETRE-ARGENT.json:5-6` | ✅ Tient à l'ÉCRITURE (une porte `POST /caisse/vente`) ; ⚠️ 3 affichages de solde divergents côté UI (C-09) |
| Argent = journal append-only, `caisse == fond_initial + Σ(mouvements)` | ADR-001, PROJECT_CONTEXT §8.2 | ✅ Caisse POS ; ❌ trésorerie coopérative hors invariant (C-03) |
| Convention A : volume (vendu) ≠ cash (encaissé), acompte seul en caisse | ADR-001, AppContext.getTodayStats | ✅ Serveur + UI marchande |
| Journée fermée = plus d'argent (vente, annulation, crédit) | CAI-02 / CAI-09 (invariants CI) | ✅ Voies principales ; ❌ route héritée `/caisse/transactions` + fond (C-05, C-06) |
| Idempotence obligatoire si mutation financière | API_CONTRACTS l.136, REQUIREMENTS | ✅ Vente, transfert, paiement commande, tontine, cotisation keiwa, fidélité ; ❌ dépense/remboursement/ajustement, création crédit, recharge/retrait keiwa client, cotisation coop |
| Argent gelé : Keiwa/B-Pay/mobile money — « confirme, ne paie pas » | PROJECT_CONTEXT §8.5, invariant argent-gele-b2 | ✅ B2 tenu ; ⚠️ gel du crédit = constante UI, pas une protection serveur (C-04) |
| Annulation = événement tracé, jamais supprimé, stock restitué | PROJECT_CONTEXT §8.6, ADR-0001 | ✅ BO + restock ledger idempotent |
| Ajustements d'argent BO = super_admin only, motif + audit dans la même transaction | Décision J5, admin-wallets.service | ✅ Tenu et sondé (403) dans les audits 05/10 |
| Arithmétique honnête (marge négative affichée, inconnu ≠ 0) | ADR-0003 | ✅ modules purs testés côté client |
| Argent préservé à la suppression de compte | CONSTITUTION §7 | ✅ (non contredit par l'audit) |

## 2. Garde-fous CI — ce qui est GARANTI aujourd'hui

- **Périmètre d'argent dérivé, jamais recopié** : 94 fichiers au noyau (28 backend), recalculé à chaque run ; un fichier qui entre/sort fait échouer le gate en se nommant (`ci/garde-argent.mjs`, `ci/PERIMETRE-ARGENT.json`). ⚠️ **INC-001** : le noyau frontend a dégénéré à 0 fichiers (racine morte `frontend_src`) — restauration partielle `dffe705`, **re-gel humain toujours en attente**.
- **Anti-assouplissement** : 131+ gardes empreintées (`ci/EMPREINTE-GARDES.json`) — « Ajouter est permis. Retirer ne l'est pas » sans `GARDE-ASSOUPLIE:` dans le message de commit, jamais dans le même commit que l'argent.
- **Invariants testés contre un vrai postgres:16** (`.github/workflows/invariants.yml`) — les preuves comptables :
  - **I1/I2/I3** : atomicité vente↔stock, idempotence de vente (1 clé = 1 vente ET 1 décrément), survente tracée
  - **ARGENT-4/4b** : primitive unique d'encaissement (crédit), clôture à deux natures (l'écart fantôme de 6 000 F interdit)
  - **CAI-02/CAI-09** : journée fermée refuse l'argent (y compris crédit)
  - **B2 / K1** : la commande ne touche jamais le wallet ; paiement Keiwa de commande atomique-idempotent-tracé
  - **T1 / B3** : transfert interne atomique-idempotent ; blocage wallet effectif dans les deux sens
  - `caisse-fond-declare`, `argent-depense-jour-comptable`, `argent-agregats-administrateur`, `argent-marge-panier-mixte`
- **Preuve horodatée** : `ci/prouver-invariants.mjs` — « il n'écarte rien. Un invariant qui échoue ENTRE dans le journal ».

## 3. Matrice — rôles × opérations monétaires (vue serveur)

Légende : ✔ autorisé et vérifié · 🟡 autorisé avec brèche (voir constat) · ✖ refusé/vérifié 403 · ⛔ n'existe pas pour ce rôle

| Rôle | Caisse POS (vente/dépense) | Crédit client | Keiwa crédit (recharge/B-PAY) | Keiwa débit (retrait/transfert) | Paiement commandes (Keiwa) | Trésorerie coop | Ajustement wallet (BO) | Gel/annulation transaction | Agrégats argent |
|---|---|---|---|---|---|---|---|---|---|
| **Marchand** (grossiste/demi-grossiste/détaillant) | 🟡 ✔ si journée ouverte (⚠️ C-05/C-06) | 🟡 gelé UI, serveur ouvert (⚠️ C-04) | ✔ B-PAY self-service | ✔ verrous + plafond 10 M | 🟡 acheteur (B2 ✅) / vendeur (K1 ✅) | 🟡 cotisation (C-03) | ✖ (403, J5) | ✖ | self ✔ |
| **Producteur** | ⛔ (pas de caisse POS) | ✖ | ✔ | ✔ | 🟡 encaisse à prix non recalculé (C-08) | ✖ | ✖ | ✖ | 🟡 revenus faux (C-10) |
| **Identificateur** | ⛔ monétiquement neutre (vérifié : 0 composant d'argent) | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ | 🟡 stats faussées par self-approbation de statut (C-12) |
| **Coopérateur** | ⛔ | ✖ | ✔ | ✔ | 🟡 clôture = « payé » sans argent (C-02) | 🟡 ledger non atomique, non idempotent (C-02) | ✖ | ✖ | 🟡 KPI sans filtre statut (C-10) |
| **Institution** | ⛔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ (403) | ✖ (403 vérifié) | 🟡 dashboards + mapping statuts cassé (D-05) |
| **Admin général / national / gestionnaire zone / opérateur terrain** | ⛔ | ✖ | ✖ | ✖ | ✖ | ✖ | ✖ (403, J5 tenu) | ✔ motif ≥ 5 car + audit même tx + restock | 🟡 isolation territoriale non tenue (C-11) |
| **Super admin** | ⛔ | ✖ | ✔ (crédit/débit/réinit, motif J5) | ✔ | ✖ | ✖ | ✔ seul (audit même tx) | ✔ | ✔ + exports CSV (⚠️ C-13) |

## 4. Chaînes d'argent transverses

### Chaîne A — Encaissement de la marchande (cœur, pilote espèces) — **SOLIDE (85/100)**
Machine à états unique (`frontend/src/app/components/caisse/machineEncaissement.ts:271-278` : l'écriture d'argent vocal a UNE porte, conditionnée à l'empreinte relu) → `POST /caisse/vente` (transaction SQL unique + `FOR UPDATE` produits + clé d'idempotence + ledger) → file offline durable IndexedDB `caisse_outbox`/`caisse_dead` (rejeu avec la MÊME clé, 4xx lettre morte, 5xx cap 5, argent jamais abandonné) → clôture : caisse théorique **calculée serveur**, écart gravé et loggé. La grammaire vocale est une liste blanche fermée ; « encaisse » prépare, ne paie jamais.
Brèches : route héritée hors invariants (C-05), fond modifiable après clôture (C-06), 3 soldes UI divergents (C-09), crédit/mobile money gelés par constante UI seulement (C-04).

### Chaîne B — Keiwa ↔ mobile money (B-PAY) — **FRAGILE (50/100)**
Recharge : init → callback (secret header, statut **re-vérifié** auprès de B-PAY ×3) OU cron */5 min (PENDING > 15 min) → crédit dans la même tx que `UPDATE ... WHERE status='PENDING'` — pas de double crédit connu. **Retrait : débit AVANT l'appel, `COMPLETED` dès la réponse HTTP, statut opérateur jamais revérifié, aucune réconciliation, id généré `Date.now()`** (C-01 — vérifié de première main). Callbacks sans signature HMAC ; `pay_token`/`merchant_tx_id` sans unicité en base (C-07) ; boucle UI par polling 5 s/180 s avec échec silencieux après timeout.

### Chaîne C — Marketplace / commandes (Keiwa) — **MOYEN (70/100)**
Commande = réservation de stock, **zéro wallet** (invariant B2 ✅) ; encaissement vendeur `POST /commandes/:id/paiement` : verrou commande + 2 wallets ordonnés, `assertCompteActif` ×2, index unique partiel d'idempotence (K1 ✅) ; vente directe du vendeur à lui-même : keiwa interdit (consentement). Brèches : total jamais recalculé serveur (C-08), clôture coopérative qui marque « payé » sans mouvement (C-02), **escrow inexistant** (méthodes `blockFunds/releaseFunds/refundFunds` mortes, `wallets.service.ts:395-510`) et escrow **fantôme côté client** (`WalletContext.tsx:119-135` renvoie un faux escrowId) — tout litige financier est impossible aujourd'hui, et l'UI pourrait le croire possible.

### Chaîne D — Coopérative — **NON PRÊT POUR DE L'ARGENT RÉEL (40/100)**
Trésorerie = ledger déclaratif SANS transaction ni idempotence (INSERT puis UPDATE séparés) ; cotisation 25 000 F auto-validée sans paiement réel, sans mouvement wallet, sans contrôle de montant, double clic = deux écritures validées (C-02) ; KPI sans filtre de statut (cotisations annulées comptées) ; la clôture de commande groupe marque `statut_paiement='paye'` sans argent (vérifié : `cooperatives-rest.controller.ts:807-818`). Constat repris de l'audit 05/10 : « empêchent de déclarer l'acteur prêt pour une exploitation avec de l'argent réel ».

### Chaîne E — Back-office (supervision & ajustements) — **BON (75/100)**
Ajustements argent (crédit/débit/réinitialisation) = **super_admin only**, motif obligatoire, `audit_logs` dans la MÊME transaction, `FOR UPDATE` + solde insuffisant vérifié ; blocage wallet = `users.status='suspendu'` (source unique, vérifiée sous verrou à chaque écriture) ; gel/annulation de transaction = motif ≥ 5 car + restock ledger idempotent + audit même tx, **l'argent encaissé n'est jamais touché**. Brèches : exports CSV soldes+PII sans permission ni trace (C-13), fuite WS `transaction:created` (montant + user_id) à la room `all` (C-14), `PATCH /cron/:id/toggle` permet à un admin_general de **mettre en pause la réconciliation B-PAY** (C-15), config Keiwa sans journal d'audit.

### Chaîne F — Score financier & partenaires — **À FIABILISER (55/100)**
Score 0-1000 → `montantEligible` (500 k/200 k/50 k) alimenté par sessions caisse 30 j, CA 90 j, équilibre 30 j, croissance, wallet + crédits 90 j, ancienneté. Brèches : **aucun filtre `statut<>'annulée'`** dans les 7 requêtes (C-10 — ventes annulées gonflent l'éligibilité au crédit) ; exposé aux partenaires externes via clés API **stockées en clair** ; rôle fantôme `'admin'` (inexistant dans `UserRole`) utilisé dans `ADMIN_SCORE_ROLES`, `bpay.controller.ts:146` et `events.gateway.ts:62` → les admins BO légitimes ne peuvent PAS consulter le score d'un tiers (fail-closed mais faux).

## 5. Audit comptable par acteur

### 5.1 Marchand (grossiste, demi-grossiste, détaillant) — le cœur bancaire du pilote
**Workflows** : ouverture (fond déclaré en billets/pièces, journalisé `caisse_fond_journal`) → encaissement (empreinte du panier, modes de règlement : espèces seul en pilote ; mobile money et crédit **gelés par constante UI prouvée par test**) → dépense (cahier, description canonique DEP-01) → annulation tracée → clôture (écart gravé). Offline : outbox IndexedDB, clé = id d'opération, rejeu identique, date comptable portée. Keiwa complet (recharge/retrait/transfert PIN-ifié). Achats grossiste sur le marché virtuel (B2) ; ventes sur commande (K1).
**Constats** : C-04 (crédit), C-05 (route héritée), C-06 (fond), C-09 (3 soldes UI), M-03 (drapeaux pilote dupliqués `POSCaisse.tsx:55` / `VentesPassees.tsx:45`), M-05 (recharge/retrait sans clé d'idempotence client), M-10 (panier interrompu = ni vente ni argent tant que non tranché — par design, à documenter).
**Ce qui tient** : toute la chaîne I1/I2/I3/ARGENT-4/CAI-02/CAI-09 + outbox production-grade.

### 5.2 Producteur
**Workflows** : déclaration récolte (prix, sans mouvement d'argent), commandes (acheteur → lui), **encaissement Keiwa des commandes livrées** (atomique, idempotent — conforme CONSTITUTION §7, recette 05/10), revenus en lecture.
**Constats** : C-08 (le total encaissable n'est jamais comparé à `quantite × prix_unitaire` — encaissement possible à un prix arbitraire, PRODUCTEUR-03 P1), C-10 (`revenusTotal` compte des commandes non payées et un graphique **fictif en dur** 450 k→1 150 k F, PRODUCTEUR-06), M-06 (annulation de commande sans confirmation ni verrou, BUG-009), M-07 (récolte/publication **perdue hors ligne** — pas d'outbox, BUG-008).

### 5.3 Coopérateur (coopérative)
**Workflows** : trésorerie (ledger serveur, validation PATCH + rollback optimiste UI), cotisations, commandes groupées (paiement « trésorerie » ou Keiwa à la livraison), clôture de commandes.
**Constats** : C-02 en entier (cotisation auto-validée sans argent/idempotence ; clôture « payé » sans mouvement ; trésorerie non atomique, sans plafond, sans `validated_by` ni historique de statut), C-10 (KPI sans filtre statut, catégories divergentes ⇒ « Volume groupé » mort).

### 5.4 Identificateur
**Verdict : monétiquement neutre — confirmé** (0 composant d'argent dans `components/identificateur/`). Le risque comptable est indirect : self-approbation du statut d'un dossier via PATCH (`allowedFields` inclut `statut`) ⇒ statistiques et **commissions faussées** (C-12) ; offline inexistant pour le terrain (perte de saisies, recommandation outbox idempotente déjà formulée en 05/10).

### 5.5 Institution
**Verdict : lecture seule — le serveur tient** (403 vérifié sur mutation d'argent). L'UI propose des actions mortes et le mapping de statuts est cassé : **le régulateur ne voit jamais les transactions en attente** (D-05). Exposée à la fuite WS des montants (C-14).

### 5.6 Admin général
J5 tenu (crédit/débit/réinit refusés 403, sondes 05/10). **Constats** : `BOKeiwa` sans garde de route côté front (ADMINGEN-01), exports CSV soldes+PII sans permission ni trace (C-13), config Keiwa sans journal d'audit (ADMINGEN-12), fuite WS (C-14), peut **mettre en pause le cron de réconciliation B-PAY** (C-15, SUPERADMIN-04).

### 5.7 Admin national
J5 tenu (403 vérifiés). Gel/annulation de transaction conforme (motif + audit même tx + restock). **Constats** : exports CSV téléphones sans masquage ni trace (C-13), boutons morts exposés dans BOKeiwa.

### 5.8 Gestionnaire de zone
**Constat principal** : l'isolation territoriale **n'est pas tenue sur l'argent** — `GET /zones` expose le `volumeTotal` (somme des `caisse_transactions`) de TOUTES les zones (C-11, GESTZONE-04 P1) ; KPI revenus caisse nationaux visibles ; `POST /audit` polluable (injection de logs → fiabilité probante du journal).

### 5.9 Opérateur terrain
**Aucune opération financière — fail-closed vérifié** (« OT ne touche wallets/transactions sensibles », audit 05/10 l.150). Offline BO inexistant (perte d'enrôlement en réseau instable, OPERATEUR-12) — pas monétaire mais fragilise les données d'identité qui alimentent les commissions.

### 5.10 Super admin
**Seul** à muter l'argent des wallets (crédit/débit/réinitialisation, motif J5, audit dans la transaction, confirmation `CONFIRMER` pour la réinitialisation). **Constats** : C-15 (pause du cron de réconciliation accessible aussi à admin_general + retry factice `{success:true}`), la réinitialisation efface `solde_bloque` sans écriture dédiée pour la partie bloquée.

## 6. Constats consolidés (vérifiés code en main, dédupliqués avec les registres)

### CRITIQUES — bloquants pour de l'argent réel
| Réf | Constat | Preuve (fichier:ligne) | Chaîne |
|---|---|---|---|
| **C-01** | **Retrait mobile money non réconcilié** : débit wallet AVANT l'appel, `COMPLETED` dès la réponse HTTP sans vérifier le statut opérateur, cron ne traite que PENDING (jamais PENDING_WITHDRAW), id = `Date.now()` (pas d'idempotence). Un retrait échoué côté opérateur = wallet débité, argent jamais reçu, aucune correction. | `wallets/wallets.controller.ts:76-119` (extrait vérifié), `bpay.cron.ts:48-53` | B |
| **C-02** | **Coopérative : l'argent est déclaratif** — cotisation 25 000 F auto-validée sans paiement ni idempotence (double clic = deux écritures) ; clôture de commande marque `statut_paiement='paye'` **sans aucun mouvement wallet ni contrôle du mode** ; trésorerie INSERT+UPDATE sans transaction ni plafond. | `cooperatives-rest.controller.ts:807-818` (extrait vérifié), `:836-860`, `:211-260` | D |
| **C-04** | **Gel du crédit = constante UI, pas une protection serveur** : `CAISSE_CREDIT_ACTIF=false` côté front mais les routes crédit restent ouvertes ; création de crédit **non idempotente** (dette doublable au rejeu) et I4/I5/I6 toujours `it.failing` — toute réactivation réouvre le double encaissement. | `caisse-rest/credits.controller.ts:60-82`, DEBT_REPORT l.19/22/65, AUDIT-ACTEUR-MARCHAND l.26 | A |
| **C-05** | **Route héritée `/caisse/transactions` hors invariants** : la vente est bien refusée (correctif 18/09 — vérifié), mais `depense/remboursement/ajustement` passent en `repo.save()` nu : sans idempotence, sans garde de journée fermée, hors transaction, et `ajustement`/`remboursement` invisibles dans la `caisseTheorique` serveur → écart du soir faussé. | `caisse-rest/caisse-rest.controller.ts:245-287` (extrait vérifié) vs `:456-492` | A |
| **C-06** | **Fond de caisse modifiable sur journée fermée** : `PATCH /session/fond` ne vérifie ni `ouvert` ni `heure_fermeture` ; le mouvement est journalisé (« correction ») mais l'écart déjà gravé à la clôture n'est jamais recalculé → constat du soir faux en silence. | `caisse-rest/caisse-rest.controller.ts:405-446` (extrait vérifié) | A |
| **C-07** | **Webhooks B-PAY sans signature + intégrité 100 % applicative** : `/wallets/public/pay-callback` n'a AUCUN secret ; `/bpay/callback` = secret partagé en header (pas de HMAC, pas d'allowlist IP — SEC-022 ouvert) ; `pay_token`/`merchant_tx_id` sans unicité en base. Le double-crédit n'est bloqué que par `UPDATE WHERE status='PENDING'` + re-vérification. | `wallets-public.controller.ts:80-126`, `bpay.controller.ts:26-32`, `BaselineSchema.ts:228-238` | B |

### MAJEURS
| Réf | Constat | Preuve |
|---|---|---|
| **C-08** | Encaissement Keiwa d'une commande à un **prix jamais recalculé** serveur (`quantite × prix_unitaire` non comparé au total) — PRODUCTEUR-03 P1 | `CommandesProducteurPage.tsx:395-412`, audit 05/10 l.31 |
| **C-09** | **Trois « soldes de caisse » UI divergents** (accueil / caisse / résumé — avec acomptes crédit traités différemment) : la règle « UNE source de vérité » tient à l'écriture, pas à l'affichage | `AppContext.getTodayStats:1067-1075`, `CaisseContext.stats:583-595`, `ResumeCaisse.tsx:222` |
| **C-10** | **Chiffres faux présentés comme vrais** : score financier sans filtre ventes annulées (éligibilité crédit gonflée) ; `revenusTotal` compte des commandes non payées (BUG-010) ; graphique revenus producteur **fictif en dur** (PRODUCTEUR-06) ; KPI coopératives sans filtre statut (COOPERATEUR-06) | `financial-score.service.ts:86-115`, `ProducteurContext.tsx:606-614`, `Revenus.tsx` |
| **C-11** | **Isolation territoriale non tenue sur les agrégats d'argent** (volumeTotal toutes zones visible d'un gestionnaire de zone) | `gestionnaire_zone` audit 05/10 l.29/60 |
| **C-12** | **Self-approbation du statut d'identification** (commissions/Stats faussées) + offline inexistant terrain | audit IDENTIFICATEUR 05/10 l.31/71 |
| **C-13** | **Exports CSV soldes+PII sans permission ni trace** (admin général/national) | ADMINGEN-11, ADMINNAT-06 |
| **C-14** | **Fuite WS** : `transaction:created` (montant + user_id) broadcast à la room `all` | `events.gateway.ts:95-98` |
| **C-15** | **Pause de la réconciliation financière B-PAY** accessible à admin_general + retry factice `{success:true}` | SUPERADMIN-04, `PATCH /cron/:id/toggle` |
| **C-16** | **Escrow fantôme** : module inexistant côté serveur (méthodes mortes) mais `WalletContext` simule un escrow (faux escrowId `Date.now()`) — toute UI future mentirait sur l'argent bloqué | `wallets.service.ts:395-510`, `WalletContext.tsx:119-139` |
| **C-17** | **Second chemin d'écriture vente/dépense latent** (`AppContext.addTransaction`) sans idempotence au premier POST, sans appelant vivant aujourd'hui — exactement la « seconde caisse » interdite | `AppContext.tsx:818-880` |

### MINEURS / À SURVEILLER
- M-01 rôle fantôme `'admin'` (`bpay.controller.ts:146`, `ADMIN_SCORE_ROLES`, `events.gateway.ts:62`) — fail-closed mais faux : les admins BO ne peuvent pas lire le score d'un tiers.
- M-02 `parseInt` sur les montants d'ajustement BO (`BOKeiwa.tsx:257-262`) — pas de validation décimale client.
- M-03 drapeaux pilote dupliqués (`CAISSE_CREDIT_ACTIF` ×2).
- M-04 URLs codées en dur dans `BOScoreFinancier.tsx:273,326` (hors `API_URL`).
- M-05 recharge/retrait Keiwa sans clé d'idempotence client (protection = payToken serveur seul).
- M-06 annulation de commande sans confirmation/verrou (BUG-009) ; récolte/publication perdue hors ligne (BUG-008).
- M-07 plafond de montant absent en caisse (vente/dépense : `montant > 0` seulement, vs 10 M en wallets).
- M-08 clés API partenaires en clair (`api_keys`) ; config Keiwa sans audit ; bouton « Payer maintenant » mort (`PaiementsPage.tsx:280`, notifications banque simulées).
- M-09 `database/init.sql` obsolète (dangereux si exécuté) ; ARG-08 (0 colonne `devise` sur les ventes) ; route masquée `GET /transactions` jamais atteinte.

## 7. Ce qui tient (à préserver absolument)

1. **La caisse POS de la marchande est bancaire** : une porte d'écriture, transaction unique, `FOR UPDATE`, idempotence, ledger append-only, survente tracée, journée fermée protégée, clôture calculée serveur, écart gravé — et tout est PROUVÉ par des invariants CI contre un vrai postgres:16.
2. **L'offline marchand est production-grade** : outbox durable, clé d'idempotence stable au rejeu, 4xx lettre morte / 5xx cap 5, argent jamais abandonné, date comptable portée.
3. **Keiwa transfert/commande/tontine/cotisation-keiwa** : verrous pessimistes, double verrou ordonné anti-deadlock, plafond 10 M, blocage = statut du compte vérifié sous verrou, 3 index uniques partiels d'idempotence.
4. **J5** : la mutation d'argent BO est super_admin only, motif obligatoire, audit dans la même transaction — sondée 403 sur tous les autres rôles.
5. **Le garde-argent CI** (périmètre dérivé, anti-assouplissement, preuve horodatée) est une infrastructure d'audit rare et précieuse — à re-geler côté front (INC-001) et à chérir.

## 8. Recommandations priorisées

**P1 — avant tout argent réel (ordre proposé)**
1. **Réconcilier les retraits mobile money** (C-01) : statut opérateur vérifié avant `COMPLETED`, cron étendu à `PENDING_WITHDRAW`, `merchantTransactionId` idempotent, réconciliation quotidienne.
2. **Comptabiliser la coopérative** (C-02) : cotisation transactionnelle + idempotente + statut `en_attente` ; clôture de commande exige un mouvement wallet ou un statut distinct (`declare_paye` ≠ `paye`) ; trésorerie atomique avec plafond.
3. **Verdir I4/I5/I6 AVANT toute réactivation du crédit** (C-04) ; idempotence serveur sur la création de crédit.
4. **Condamner ou mettre au niveau la route héritée** (C-05) : idempotence + `exigerJourneeOuverte` + intégrer `remboursement/ajustement` à `caisseTheorique` (ou supprimer la route).
5. **Fermer `PATCH /session/fond` sur journée fermée** ou re-graver l'écart à chaque correction (C-06).
6. **Signer les webhooks B-PAY** (HMAC + allowlist IP) + unicité DB sur `pay_token`/`merchant_tx_id` (C-07).
7. **Re-gel humain du périmètre garde-argent frontend** + fix `racinesScannees` (INC-001 — HUMAIN SEULEMENT, jamais un agent).

**P2**
8. Filtre `statut<>'annulée'` dans le score financier ; corriger revenus producteur (BUG-010, PRODUCTEUR-06) ; KPI coopératives filtrés (C-10).
9. Recalcul serveur du total encaissable des commandes (C-08) ; confirmation/verrou sur l'annulation (M-06).
10. Unifier les 3 soldes de caisse UI sur une seule primitive (C-09).
11. WS : room ciblée par propriétaire, jamais de montant/user_id en broadcast global (C-14) ; isolation territoriale sur les agrégats (C-11).
12. Exports CSV : permission dédiée + entrée d'audit à chaque export (C-13) ; protger `PATCH /cron/:id/toggle` (C-15).
13. Supprimer `AppContext.addTransaction` et l'escrow fantôme `WalletContext` (C-16, C-17) ; créer l'ADR escrow AVANT toute implémentation (module sacré §8.1).
14. Idempotence client sur recharge/retrait Keiwa (M-05) ; DTO/validation décimale sur les ajustements BO (M-02).

**P3** : unifier les drapeaux pilote (M-03), `API_URL` partout (M-04), journal d'audit config Keiwa, décider de la route masquée (M-09), colonne `devise` (ARG-08), supprimer `database/init.sql`, offline identificateur/opérateur terrain (C-12, OPERATEUR-12).

## 9. Verdict

| Domaine | Score | Justification éclair |
|---|---|---|
| Caisse POS marchande (pilote espèces) | **85/100** | bancaire et prouvé ; brèches héritées C-05/C-06 |
| Keiwa (transfert/commande/blocage) | **80/100** | verrous + idempotence + J5 ; escrow absent (assumé) |
| Offline (marchande) | **80/100** | outbox production-grade ; hors marchande : absent |
| Back-office supervision/ajustements | **75/100** | J5 tenu ; exports/WS/cron à blinder |
| Marketplace commandes | **70/100** | B2/K1 solides ; prix non recalculé, bypass coop |
| Score financier & agrégats | **55/100** | données faussées (annulées, statuts, graphique fictif) |
| Mobile money B-PAY | **50/100** | recharge correcte ; **retraits non réconciliés**, webhooks non signés |
| Crédit client | **45/100** | gelé en UI seulement ; I4/I5/I6 rouges |
| Coopérative | **40/100** | argent déclaratif, non atomique, non idempotent |
| **GLOBAL** | **62/100** | **Conforme pour le pilote espèces de la marchande — NON PRÊT pour de l'argent réel sur mobile money, crédit, coopérative et marketplace** |

> Verdict aligné sur celui de l'audit coopérateur (05/10) : la plateforme tient sa promesse là où l'argent a été conçu comme sacré (caisse, Keiwa interne), et échoue partout où un flux argenté a été câblé « déclaratif » sans primitive transactionnelle. Le chemin vers l'argent réel est listé au §8 : 7 chantiers P1, tous localisés, tous testables par un invariant CI du même style que ceux qui protègent déjà la caisse.

## 10. Sources
- Code : `backend/src/{caisse-rest,credits(encaisser-credit),wallets,bpay,transactions-rest,commandes-rest,cooperatives-rest,tontines,protection-sociale,fidelite-rest,boutique,financial-score,partner,admin-wallets,events,odoo-gateway}`, `frontend/src/app/components/*`, entités & migrations (BaselineSchema, 1780700000000, 1781000000001, 1781100000000, 1781500000000, 1782100000000, _archive/1779500000000-DropCommissionsTable)
- Registres : `ci/PERIMETRE-ARGENT.json`, `ci/garde-argent.mjs`, `ci/EMPREINTE-GARDES.json`, `.github/workflows/{garde-argent,invariants}.yml`, `backend/test/invariants/*` (22 specs), `BUGS.md`, `SEC_BUGS.md`, `INCIDENTS.md`, `DEBT_REPORT.md`, `ADR-0001/0002/0003`, `PROJECT_CONTEXT.md §8`, `REQUIREMENTS.md`, `API_CONTRACTS.md`
- Audits : `.ai/AUDITS/ACTEURS/AUDIT-ACTEUR-*-2026-10-05.md` (10 rôles)
- Vérifications de première main (12/10) : C-01, C-02, C-05, C-06 (+ extraits cités) ; TSC frontend vert (0 erreur) sur l'arbre audité.
