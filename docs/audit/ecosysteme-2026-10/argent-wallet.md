# Audit lecture seule — ARGENT hors caisse (wallet/Keiwa + modules financiers)

Dépôt `/home/user/julaba-app`, branche `claude/clever-allen-dnr8by`. Aucune modification. Aucun test lancé : les résultats cités viennent de `scratchpad/inv.log` (suite invariants lancée en arrière-plan : **50 suites / 252 tests PASS**).
Chemins backend relatifs à `backend/src/`, chemins front relatifs à `frontend_src/src/app/`.

## 1. Tableau synthèse

| Élément | Statut | Preuve courte | Prochaine action |
|---|---|---|---|
| **Paiement Keiwa d'une commande en `vente_directe`** | 🔴 ❌ | Le vendeur choisit `acheteur_id` librement (`commandes-rest.controller.ts:105-108`), puis débite le wallet de cet acheteur (`:190-296`) | Interdire `keiwa` sur `vente_directe` ou exiger une action de l'acheteur (PIN ou consentement) ; ajouter un test d'invariant |
| Paiement Keiwa d'une commande (parcours normal) | 🟡 | Atomique et idempotent (K1 vert). Mais c'est le **vendeur** qui débite l'acheteur, quel que soit le statut, et `total` vient du client | Contrôler le statut (`livree`), recalculer `total` côté serveur, verrouiller les deux wallets dans un ordre fixe |
| Crédit/débit admin `/admin/wallets/:userId/credit\|debit` | 🔴 | `@Roles('ADMIN')` = 5 rôles BO, y compris `operateur_terrain` (`admin-wallets.controller.ts:17,86-102`). Aucun `audit_logs`, aucun plafond (`admin-wallets.service.ts:241-286`) | Réserver à `super_admin`, écrire l'audit (admin id, motif), double validation, plafond |
| Réinitialisation admin `/admin/wallets/:userId/reinitialiser` | 🔴 | Met `solde=0, solde_bloque=0`, sans audit, sans contrepartie (`admin-wallets.service.ts:343-364`) | Supprimer, ou passer par un débit tracé et audité |
| Recharge mobile (`/wallets/me/recharge-mobile`) + `/bpay/callback` | 🟡 | Crédit seulement si B-Pay `check-status`=SUCCESS (`bpay.controller.ts:52`). Verrou par `UPDATE … WHERE status='PENDING' RETURNING` | Signature : secret partagé en clair, pas de HMAC (`:26-29`). Plafond 10 M non appliqué à l'initiation |
| Paiement QR public `/wallets/public/pay` + `pay-callback` | 🔴 | `creditWallet` appelé **sans** `em`, donc commité dans sa propre transaction (`wallets-public.controller.ts:100`). Même défaut dans le cron (`bpay.cron.ts:81`) : si la notification échoue, risque de **double crédit** | Passer `em` à `creditWallet` (comme dans tontines) |
| Retrait mobile `/wallets/me/retrait-mobile` | 🔴 | Débit puis cashin B-Pay. Sur un timeout de 10 s, re-crédit automatique (`wallets.controller.ts:107-113`), alors que le cashin a pu partir : **double paiement**. Pas d'idempotence, pas de PIN, `PENDING_WITHDRAW` jamais réconcilié | Statut « en attente » + réconciliation, pas de rollback aveugle ; clé d'idempotence ; PIN serveur |
| Transfert compte-à-compte | ✅ (logique) / 🟠 (accès) | Verrous dans un ordre fixe, idempotence + index unique, T1a-e verts (`wallets.service.ts:247-379`). Aucun PIN côté serveur | Exiger PIN/WebAuthn côté serveur pour tout débit initié par le titulaire |
| `rechercher-destinataire` | 🟠 | Téléphone → `id`, nom, prénom de n'importe quel compte (`wallets.controller.ts:122-143`). C'est un oracle d'énumération qui donne l'`id` nécessaire à l'attaque `vente_directe` | Limiter le débit, masquer le nom, ne pas renvoyer l'`id` brut |
| Escrow | ⏳ | `EscrowModule` vide (`escrow/escrow.module.ts:3-7`). `block/release/refundFunds` n'ont aucun appelant. Le front simule (`WalletContext.tsx:113-137`, retourne `Date.now()`) | Retirer ou implémenter. `releaseFunds` détruirait de l'argent (débit sans crédit, `wallets.service.ts:455-456`) |
| Tontines | ✅ / 🟡 | Transaction unique + verrou tontine + `debitWallet/creditWallet(manager)` (`tontines.service.ts:172-293`). TN a-h verts | Ajouter un consentement des membres. `montantCotisation` sans max : au-delà de 10 M au total, la tontine reste bloquée (`creditWallet` lève l'exception) |
| Protection sociale (mode keiwa) | 🔴 | Débit réel **sans contrepartie** : l'argent ne va nulle part (`protection-sociale.controller.ts:116-133`). Pas d'idempotence : `randomUUID` à chaque requête (`:93`) | Bloquer le mode keiwa tant qu'il n'y a pas de compte de destination ; clé d'idempotence client |
| Fidélité | 🟡 | Uniquement des points, scopés au marchand, idempotents (journal). `utiliser` lit sans `FOR UPDATE` (`fidelite-rest.controller.ts:219-238`), donc solde de points négatif possible en course | `SELECT … FOR UPDATE` ou `UPDATE … WHERE points >= seuil` |
| Score financier `/financial-score/:userId` | ✅ / 🟡 | Contrôle self ou admin (`financial-score.controller.ts:31-36`). `ADMIN_SCORE_ROLES` contient `'admin'`, qui n'existe pas (`financial-score.service.ts:35`) | Aligner sur les rôles réels |
| API partenaire `/partner/financial-score/:userId` | 🟠 | Toute clé active lit le score **et le solde wallet exact** de n'importe quel utilisateur (`partner.controller.ts:32-36`, `financial-score.service.ts:186-190`). Aucun consentement. Clés stockées en clair (`api-key.guard.ts:96`). Table `api_keys` absente sur base neuve (SCHEMA-05) | Ajouter consentement et périmètre par partenaire ; hasher les clés |
| `/scores` (liste) | ⏳ | Renvoie `score: 0, niveau: 1` en dur pour tout le monde (`scores.controller.ts:26`) | Brancher sur `ScoresService` ou retirer |
| `/revenus` | 🟡 | « Revenus » = récoltes × prix déclaré, pas de l'argent encaissé (`revenus.controller.ts:14-19`) | Renommer ou documenter |
| Flag « No-Go Keiwa hors pilote » | 🔴 | **Aucun** contrôle serveur (grep `keiwa\|pilote` dans `backend/src`). Côté front : seule la tuile accueil marchand est retirée (`MarchandAccueilVoice.tsx:206-217`). Les routes `/…/keiwa*` restent montées pour 5 rôles (`routes.tsx:79-173`) | Garde serveur (flag d'environnement) sur toutes les routes qui déplacent de l'argent |
| Front Keiwa : Paiements de factures | ⏳ trompeur | Le bouton « Payer maintenant » se contente de fermer la modale (`components/wallet/PaiementsPage.tsx:262-269`) | Désactiver avec « bientôt » |
| Tableau de bord des invariants | 🟡 périmé | Indique I5 🔴 alors que `blockers.spec.ts:98` est un `it` (bloquant). Ne liste aucun invariant wallet (K1, B3, PS1, TN, T1) | Mettre à jour |

## 2. Détail par module

### 2.1 Wallets — modèle de données et ADR-001
- **Le solde est stocké et muté** (`wallets.solde`, `solde_bloque` decimal, `wallets/entities/wallet.entity.ts:22-32`), et `wallet_transactions` sert de journal parallèle. **Aucun solde n'est dérivé du journal** et aucun invariant `solde == Σ crédits − Σ débits` n'existe. ADR-001 (`docs/adr/ADR-001-source-unique-argent.md`, statut « proposé ») ne couvre que la caisse.
- Pas de `CHECK (solde >= 0)` dans la baseline (`database/migrations/1780200000000-BaselineSchema.ts:875`).
- **Il existe 5 chemins d'écriture du solde distincts**, et ils ne passent pas tous par `WalletsService` :
  - `wallets.service.ts`
  - `bpay.controller.ts:102`, mutation directe
  - `commandes-rest.controller.ts:259-260`
  - `protection-sociale.controller.ts:116`
  - `admin-wallets.service.ts:254,277,360`, en SQL brut
- Sur le type de mouvement, deux chemins divergent :
  - `admin-wallets.service.ts:259` insère `'credit'` en minuscules, conforme à l'enum (baseline `:153-159`).
  - `reinitialiser` écrit aussi un `'debit'` sans `related_entity`.
- Verrous : `findOne(... lock pessimistic_write)` partout, et `FOR UPDATE` côté admin. Transactions SQL présentes sur tous les chemins.
- `assertCompteActif` (`wallets.service.ts:94-103`) est appelé sur tous les chemins **sauf `reinitialiser`**.

### 2.2 `wallets.controller.ts` (JWT au niveau classe, `:14`)
- `GET me`, `me/transactions`, `me/pending`, `me/statut-paiement` sont scopés `user.id` : pas d'IDOR.
- **`recharge-mobile`** (`:38-61`) :
  - pas de plafond haut à l'initiation ;
  - au-delà de 10 M, le crédit lève une exception dans le callback (`bpay.controller.ts:87`). La ligne reste `PENDING` indéfiniment alors que l'utilisateur a payé.
- **`retrait-mobile`** (`:63-120`) 🔴 :
  - le pré-contrôle du solde se fait hors verrou, mais `debitWallet` reverrouille : OK ;
  - **pas d'idempotence** : un double clic produit deux retraits ;
  - en cas d'exception de `retraitVersMobileMoney`, y compris un `AbortSignal.timeout(10000)` (`bpay/bpay.service.ts:130`), il y a **re-crédit immédiat** alors que B-Pay a peut-être exécuté le cashin. C'est un double paiement possible ;
  - le statut passe à `COMPLETED` sur un simple HTTP 200, sans confirmation. `status: data.status || 'SUCCESSFULL'` est un défaut optimiste (`bpay.service.ts:153`) ;
  - les lignes `PENDING_WITHDRAW` ne sont jamais réconciliées : le cron ne lit que `PENDING` (`bpay.cron.ts:50`).
- **`transfert`** (`:145-193`) ✅ : `expediteurId` vient du JWT, `destinataire` du body. Pas d'IDOR possible sur le débit.

### 2.3 `wallets-public.controller.ts` — 4 routes sans garde
- `POST public/pay` (`:47-78`) : sans authentification, fait initier par Julaba une demande de paiement B-Pay vers **n'importe quel téléphone**, pour n'importe quel marchand et n'importe quel montant. Vecteur de spam/hameçonnage par push USSD ; seul le throttler global s'applique. Le crédit n'a lieu qu'après confirmation B-Pay.
- `POST public/pay-callback` (`:80-126`) : **aucune authentification** (ni secret ni signature), mais le crédit dépend de `verifierStatut` côté serveur. Un appel forgé ne crée donc pas d'argent. 🔴 Par contre :
  - `creditWallet(...)` est appelé **sans passer `em`** (`:100`), donc commité dans une transaction séparée ;
  - si `notificationsService.create` (`:106`) lève une exception, la transaction externe annule `status='COMPLETED'` → retour à `PENDING` ;
  - le crédit est déjà commité ;
  - le cron (`bpay.cron.ts:76-83`, même défaut) ou un nouveau callback recrédite : **double crédit**.
- `POST public/statut-paiement` (`:128-132`) : n'importe qui peut interroger le statut B-Pay de n'importe quel `payToken`. Fuite mineure.
- `GET public/:marchandId` (`:134-152`) : renvoie le téléphone du marchand (donnée personnelle). Voulu pour le QR, à arbitrer.

### 2.4 B-Pay — `bpay/bpay.controller.ts`
- Authentification du callback (`:26-32`) :
  - comparaison d'un **secret partagé en en-tête** (`x-bpay-secret`/`x-webhook-secret`) avec `!==` : ni HMAC du corps, ni comparaison en temps constant ;
  - si `BPAY_WEBHOOK_SECRET` est absent, tout est ignoré et seul le cron crédite ;
  - défense réelle : relecture `check-status` côté serveur (`:52`), montant lu en base et non dans le corps (`:83`). On ne peut donc pas créer d'argent avec un callback forgé.
- Pas de filtre sur `type` : un `PAY_MARCHAND` peut être crédité par ce callback comme « Recharge ». Le résultat est équivalent grâce au verrou `WHERE status='PENDING'`.
- `GET bpay/pending/:userId` (`:140-155`) : comparé à `req.user.id`. `isAdmin` contient `'admin'`, qui n'existe pas → seul `super_admin` passe. Pas d'IDOR.
- `verifierStatut` ne vérifie ni montant ni `merchant_transaction_id` (`bpay.service.ts:103-116`). C'est acceptable parce que le `payToken` est lié au montant initié.
- Pas d'index UNIQUE sur `bpay_transactions.pay_token` (`database/db-init.service.ts:581-591`, baseline `:228`).

### 2.5 Escrow
- `escrow/escrow.module.ts` est vide, sans route. `WalletsService.blockFunds/releaseFunds/refundFunds` (`:395-510`) n'ont **aucun appelant** (grep).
- `releaseFunds` diminue `solde` et `solde_bloque` sans créditer personne. Si un appelant était branché, l'argent disparaîtrait.
- Le front `WalletContext.bloquerArgent` renvoie un faux identifiant `Date.now()` (`contexts/WalletContext.tsx:113-122`). Aucun appelant front (grep), donc pas de dégât actuel.

### 2.6 Commandes — `POST /commandes/:id/paiement` 🔴
- Côté technique : `pessimistic_write` sur la commande, `statutPaiement` relu sous verrou, index unique `ux_wallet_tx_commande_idempotence`. Le paiement est atomique et idempotent : K1a/b/c verts (`test/invariants/keiwa-paiement-commande.spec.ts:140-210`).
- **Vol possible** :
  1. `POST /wallets/me/rechercher-destinataire {telephone}` renvoie l'`id` de la victime.
  2. `POST /commandes {type:'vente_directe', vendeur_id:<moi>, acheteur_id:<victime>, recolte_id:<n'importe quel uuid>, quantite:1, prix_unitaire:1, total:<X>, mode_paiement:'keiwa'}`. Pour une vente directe, `acheteurId` est pris dans le body (`commandes-rest.controller.ts:105-108`). `recolte_id` n'a pas de FK (`commandes/entities/commande.entity.ts:51`) et n'est pas lu en `en_attente`. `total` n'est pas comparé à `quantite×prix`.
  3. `POST /commandes/:id/paiement` en tant que vendeur : `walletAcheteur.solde -= total`, `walletVendeur.solde += total` (`:259-260`), sans aucune action de l'acheteur.
  - N'importe quel compte authentifié peut le faire : pas de `@Roles` sur `CommandesRestController`, qui n'a que `JwtAuthGuard` au niveau classe (`:15`).
  - Non couvert par K1, qui crée la commande côté acheteur (`keiwa-paiement-commande.spec.ts:101-124`).
- Même hors vente directe :
  - le vendeur peut encaisser dès `en_attente` : aucun contrôle de statut ;
  - le contrôle de solde ignore `soldeBloque` (`:256`) ;
  - les verrous sont pris dans l'ordre acheteur puis vendeur, sans tri : deadlock possible en croisé (Postgres annule l'une des deux, sans perte d'argent).

### 2.7 Admin wallets — `admin/admin-wallets.controller.ts`
- `@Roles('ADMIN')` au niveau classe (`:17`), soit 5 rôles BO sans cloisonnement par zone.
- 🔴 `credit` (`:86-93`) : un `operateur_terrain` peut **créer de l'argent** sur n'importe quel wallet. Il n'y a :
  - ni `audit_logs` (`admin-wallets.service.ts:241-263`, contrairement à `bloquer`, `:305-308`) ;
  - ni plafond ;
  - ni idempotence ;
  - ni validation de type de `montant` (`@Body('montant') montant: number` sans pipe).
- 🔴 `reinitialiser` (`:78-84`, service `:343-364`) : remet le solde et le **solde bloqué** à zéro, sans audit, sans `assertCompteActif`, sans destination des fonds.
- Côté front BO : menu « Keiwa Wallet » avec `permission: null` (`components/backoffice/BOLayout.tsx:120-126`). `BOKeiwa.tsx` utilise `bloquer` et `reinitialiser` (`:262,266`) ; `credit`/`debit` restent appelables directement par l'API.

### 2.8 Tontines
- Le contrôleur est en JWT au niveau classe. `cotiser` ne débite que l'appelant (`tontines.service.ts:213`). Accès réservé au responsable ou à un membre (`:102-108`).
- Tout tient dans une seule transaction (`:174`), avec verrou tontine puis wallets via `manager`. Index unique (tontine, membre, cycle, type). Tests TN a-h verts (`test/invariants/tontine-cycle-complet.spec.ts`).
- 🟡 Le responsable peut inscrire n'importe quel `userId` sans son consentement (`:32-64`). `findOne` expose ensuite le téléphone des membres (`:145`).
- 🟡 `montantCotisation` n'a qu'un `@IsInt @IsPositive`, sans max (`tontines/dto/create-tontine.dto.ts`). Si `montant × membres > 10 M`, la dernière cotisation échoue toujours et la tontine reste bloquée.
- Entre la cotisation et la distribution, l'argent débité n'est dans aucun wallet (pas de compte de séquestre). La somme des soldes n'est donc pas conservée.

### 2.9 Protection sociale 🔴
- Isolation correcte : `user.id` vient du JWT. PS1a-d verts.
- **Mode `keiwa`** : débit réel du wallet (`protection-sociale.controller.ts:116-133`) **sans aucun crédit en face**. Pas de compte CNPS/CNAM ni de séquestre, et le suivi est « déclaratif » (`:31-33`). L'argent sort du système sans destination tracée.
- **Pas d'idempotence** :
  - `cotisationId = randomUUID()` à chaque requête (`:93`), donc l'index `ux_wallet_tx_cotisation_idempotence` ne protège pas contre un double envoi ;
  - aucune unicité (user, organisme, période) : un double clic produit un double débit.

### 2.10 Fidélité
- Points uniquement, pas de wallet. Scopé `marchand_id = user.id`. Journal append-only et `idempotency_key`. Test fidelite-cycle 1-7 vert.
- 🟡 Course sur `utiliser` (pas de verrou de ligne). `gagner` fonctionne même quand `actif=false`.
- Côté front (`services/fidelite.service.ts:65,71`), la clé est générée à chaque appel. Elle ne protège donc que des rejeux internes du client.

### 2.11 Scores, score financier, revenus, partenaire
- `/financial-score/:userId` : comparaison à `user.id`, sinon admin. Le test `financial-score-self-access` est vert. Rôles admin incohérents : `'admin'` n'existe pas, `admin_general` est refusé.
- `/partner/financial-score/:userId` : `ApiKeyGuard` seul. Aucun consentement de l'utilisateur, aucun périmètre par partenaire. Le texte de la dimension wallet contient le **solde exact** (`financial-score.service.ts:190`). `findAll` renvoie les clés en clair au BO (`partner/partner-api-keys.service.ts:33-40`). SCHEMA-05 (registre) : table `api_keys` absente sur base neuve.
- `/scores` : données factices (`scores.controller.ts:26`). `/scores/me` : calcul réel via `ScoresService`.
- `/revenus` : déclaratif, à partir des récoltes.

### 2.12 Front Keiwa
- `services/api/wallets-api.ts` → routes existantes (OK). `fetchKeiwa` annonce `{keiwa: Wallet}` en snake_case ; le contexte tolère les deux formats (`WalletContext.tsx:68-78`).
- 🟡 Mapping des transactions : `tx.related_entity_type` est lu alors que l'entité renvoie `relatedEntityType` → `undefined`. `solde` (decimal) arrive en chaîne. À DÉFINIR : vérifier l'affichage.
- Le PIN Keiwa (`components/wallet/WalletPage.tsx:416-560`) est un **verrou d'interface seulement**. Le backend n'exige aucun PIN pour `transfert` ou `retrait-mobile` : avec le JWT, l'argent bouge.
- `TransfertPage` : clé d'idempotence stable par tentative (`components/wallet/TransfertPage.tsx:68,146,161`) ✅.
- `BanquePage`/`CartePage` : marqués « Bientôt », sans action. `PaiementsPage` : « Payer maintenant » est factice (voir tableau).

### 2.13 No-Go Keiwa (pilote)
- `docs/pilote/GO-PILOTE-JULABA.md:136-145` : Keiwa, tontines, protection sociale, fidélité et commandes sont **hors pilote**. Le document lui-même dit « ces écrans sont accessibles depuis le menu marchand » et laisse le masquage « À DÉFINIR ».
- **Côté serveur : rien.** Aucun flag, et toutes les routes d'argent ci-dessus sont actives.
- Côté front :
  - la tuile « Mon argent » est retirée de l'accueil marchand ; le commentaire dit explicitement que « LA ROUTE EXISTE TOUJOURS » (`components/marchand/MarchandAccueilVoice.tsx:206-217`) ;
  - le profil continue de lier tontines, protection sociale et fidélité (`components/shared/UniversalProfil.tsx:322,342,363`) ;
  - le paiement `keiwa` reste proposé dans `ReceptionPaiementModal.tsx:50,76` (valeur par défaut `'keiwa'`) et dans `MarcheVirtuel.tsx:438` ;
  - `NotificationToast.tsx:41` renvoie vers `/keiwa`.
- Conclusion : le No-Go Keiwa n'est **garanti que par l'absence de tuile**, et ni serveur ni routeur ne l'appliquent.

### 2.14 Tests d'invariants couvrant le domaine (lus, non relancés ; état d'après `inv.log`)
| Spec | Couvre | Ne couvre pas |
|---|---|---|
| `keiwa-paiement-commande.spec.ts` (K1a-c) | Paiement commande créé par l'acheteur : soldes, idempotence, atomicité | `vente_directe` avec acheteur arbitraire ; paiement avant livraison |
| `blocage-wallet-admin.spec.ts` (B3a-d) | Blocage réel, crédit/débit admin refusés si suspendu | Rôle de l'admin qui crédite ; audit ; `reinitialiser` |
| `transfert-compte-a-compte.spec.ts` (T1a-e) | Atomicité, idempotence, comptes bloqués | PIN ; énumération |
| `tontine-cycle-complet.spec.ts` (TN a-h) | Cycle complet, concurrence | Plafond, consentement |
| `protection-sociale-cotisations.spec.ts` (PS1a-d) | Débit atomique, isolation | Double envoi ; destination des fonds |
| `fidelite-cycle.spec.ts` (1-7) | Idempotence par clé | Course sur `utiliser` |
| `financial-score-self-access.spec.ts` | Self/403/401 | API partenaire |
| — | **Aucun test** | `/bpay/callback`, `/wallets/public/*`, cron B-Pay, `retrait-mobile`, `admin credit/reinitialiser` |

- `docs/invariants/TABLEAU_DE_BORD.md` :
  - n'indexe que I1-I7 (caisse/crédit). I4 et I6 sont toujours `it.failing` (`blockers.spec.ts:64,109`).
  - **I5 est désormais `it` vert** (`blockers.spec.ts:98`) mais reste affiché 🔴 : le tableau est périmé.
  - aucun des invariants wallet (K1, B3, T1, TN, PS1) n'y figure.

## 3. Top problèmes (par gravité)

🔴 **Argent / sécurité**
1. **Vol de wallet via `vente_directe` + `paiement` Keiwa**. Tout compte authentifié peut débiter le wallet de n'importe quel utilisateur : `commandes-rest.controller.ts:105-108` + `:190-296`, avec `rechercher-destinataire` comme oracle d'`id`. Aucun test.
2. **Création d'argent par n'importe quel rôle BO** (`operateur_terrain` compris) via `POST /admin/wallets/:userId/credit`, sans audit ni plafond (`admin-wallets.controller.ts:17,86` ; `admin-wallets.service.ts:241-263`). `reinitialiser` efface solde et solde bloqué sans trace d'audit (`:343-364`).
3. **Double crédit possible** dans `public/pay-callback` et dans le cron B-Pay : `creditWallet` est hors de la transaction qui marque `COMPLETED` (`wallets-public.controller.ts:100`, `bpay.cron.ts:81`).
4. **Retrait mobile** : re-crédit sur timeout (double paiement possible), pas d'idempotence, `COMPLETED` sans confirmation, `PENDING_WITHDRAW` jamais réconcilié (`wallets.controller.ts:63-120`).
5. **Protection sociale keiwa** : débit sans destination et sans idempotence (`protection-sociale.controller.ts:93,116-133`).
6. **No-Go Keiwa non appliqué côté serveur** : toutes les routes d'argent sont actives, et le front n'a retiré qu'une tuile.
7. **Aucun PIN côté serveur** pour transfert ou retrait (le PIN est un verrou d'interface).
8. Callback `/bpay/callback` : secret partagé en clair, sans HMAC ni temps constant (`bpay.controller.ts:26-29`). Atténué par le `check-status` côté serveur. `/wallets/public/pay-callback` n'a aucune authentification (même atténuation).

🟠 **Cassé / exposition**
9. API partenaire : solde et score de n'importe quel utilisateur, sans consentement ; clés en clair ; table `api_keys` absente sur base neuve (SCHEMA-05).
10. `public/pay` sans authentification : demandes de paiement vers des numéros arbitraires (spam USSD). `rechercher-destinataire` permet d'énumérer téléphone → nom/id.
11. `PaiementsPage` : bouton « Payer maintenant » factice. `/scores` renvoie des zéros en dur.
12. Montant au-delà de 10 M (recharge, QR, tontine) : la ligne reste `PENDING` ou la tontine bloquée, avec de l'argent payé non crédité.

🟡 **Partiel**
13. Soldes stockés et mutés (5 chemins d'écriture, dont du SQL brut), sans invariant `solde == Σ journal` ni `CHECK solde >= 0`. ADR-001 limité à la caisse.
14. Paiement de commande possible avant livraison ; `total` fourni par le client ; verrous non ordonnés ; `soldeBloque` ignoré.
15. Fidélité : course sur `utiliser`. Tontine : membres sans consentement. Rôles `'admin'` fantômes dans financial-score et bpay.
16. Tableau de bord des invariants périmé (I5) et muet sur les invariants wallet.

## 4. À DÉFINIR
- B-Pay envoie-t-il réellement `x-bpay-secret` / `x-webhook-secret`, et `BPAY_WEBHOOK_SECRET` est-il configuré en prod ? Impossible à vérifier sans accès au VPS ni à la doc B-Pay. S'il ne l'est pas, seul le cron crédite (délai de 15 min).
- (Vérifié) les libellés `'credit'/'debit'` en SQL brut correspondent bien à l'enum `wallet_transactions_type_enum` (`database/migrations/1780200000000-BaselineSchema.ts:153-159`) : pas de 500 de ce côté.
- Côté B-Pay, un cashin qui a expiré (timeout) côté Julaba est-il exécuté quand même ? Cela détermine la réalité du double paiement du point 4.
- `notificationsService.create` peut-il lever une exception dans la transaction (DB, FCM) ? Cela conditionne la probabilité du double crédit du point 3.
- Où va l'argent d'une cotisation CNPS/CNAM payée en keiwa ? Il faut un arbitrage métier : compte de séquestre, reversement manuel, ou interdiction.
- Masquage des modules hors pilote : l'arbitrage de Patrick (`GO-PILOTE-JULABA.md:142-145`) n'est pas rendu.
- La FK `commandes.acheteur_id → users` existe-t-elle en base ? Sans incidence sur l'attaque, car la victime existe. Je ne l'ai pas vérifié en base (interdit).
