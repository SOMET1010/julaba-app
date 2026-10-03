# BO lot C — opérations, contenus, supervision technique, argent vu du BO

Audit en lecture seule, `HEAD 28bf9e8`, branche `claude/clever-allen-dnr8by`. Aucun fichier du dépôt modifié. Aucun test lancé : aucun test frontend isolé n'existe pour ces écrans, et les specs backend concernées (`backend/test/invariants/bo-communication-send-bulk.spec.ts`, `bo-cron-toggle-reel.spec.ts`, `blocage-wallet-admin.spec.ts`) utilisent la base Postgres partagée.
Rappels utiles : `@Roles('ADMIN')` = les 5 rôles BO, sans cloisonnement par zone. Pour BOKeiwa, le menu porte `permission: null` (BOLayout.tsx:126). Aucun écran n'a de garde de route (routes.tsx:178-212, BORoot ne vérifie que l'appartenance au BO).

## 1. Tableau synthèse

| Élément | Statut | Preuve courte | Prochaine action |
|---|---|---|---|
| BOKeiwa — lecture (stats, wallets, transactions) | 🟡 | Vraies requêtes SQL (admin-wallets.service.ts:54-239). Mais `volume_total` est gonflé par la jointure (l. 59 + 68) | Calculer SUM(solde) dans une sous-requête |
| BOKeiwa — crédit/débit/réinit | 🔴 | Ouvert aux 5 rôles BO, y compris operateur_terrain (admin-wallets.controller.ts:16-18, 78-102). Aucun audit_logs, aucun admin_id (service l. 241-364). Pas d'idempotence | Restreindre à super_admin, ajouter audit et clé d'idempotence (ADR argent) |
| BOKeiwa — config services/banques | ❌ | Table `keiwa_config_items` créée nulle part (SCHEMA-06). Le front retombe sur des constantes DEFAULT_* (BOKeiwa.tsx:67-95, 156-158, 227) et ses écritures sont avalées en silence (l. 329, 346, 358, 1063). `PUT config/parametres` n'existe pas | Hors pilote : masquer l'onglet ou fermer SCHEMA-06 |
| BOKeiwa — upload logo | 🔴 | Écrit le fichier sans filtre d'extension dans `/var/www/julaba/uploads/logos` (service l. 528-536) | Liste blanche png/jpg/svg-sanitisé, ou suppression |
| BOScoreFinancier | ✅ | Front et back de même forme (BOScoreFinancier.tsx:21-37 ↔ financial-score.service.ts:17-33). Réservé à super_admin (service l. 35) | — |
| BOMarketplace | ❌ | La modération fait `PATCH /publications/:id`, réservé au propriétaire → 403 pour un admin (publications-rest.controller.ts:221-230). Noms vendeur mal lus (`producteur_prenom` vs `user_prenom`) | Route de modération admin dédiée |
| BOLivraison | ⏳ | `GET /admin/livraison` renvoie un tableau vide en dur (admin-analytics.controller.ts:135-136). `assign` fait un `ALTER TABLE` à chaque appel (l. 141-143) | Masquer (BO-03 confirmé) |
| BOCommunication | 🟡 | Envoi réel `POST /notifications/send-bulk`, mais uniquement en notification in-app + push web, **pas de SMS**. Canal « SMS » sélectionné par défaut (BOCommunication.tsx:102). Modèles toujours vides | Retirer les canaux SMS/email ou les brancher |
| BOContenus | ⏳ | Lit `messages` de `/communication`, toujours `[]` (misc-rest.controller.ts:142). Toutes les actions restent locales (« non persisté », BOContenus.tsx:82-118) | Masquer |
| BOAcademy | 🟡 | Endpoints réels, mais `boApi` sans `credentials` ni Bearer (BOAcademy.tsx:114-122) → 401 sur le déploiement à deux domaines (V2). Audit client avec `ip: '127.0.0.1'` en dur (l. 317, 326) | Passer par backoffice-api |
| BONotifications | 🟡 | Notifications **fabriquées** côté client à partir du contexte (l. 61-171, ids `gen_N`). Lu/suppression envoyés à `/notifications/gen_1…` = sans effet. « Tout est en ordre » même si les données n'ont pas chargé | Brancher `GET /notifications` |
| BOSupport | 🟡 | Tickets réels, mais une seule page de 10 (paginate.ts:29, tickets-api.ts:54). Bouton « Simuler » qui injecte un faux ticket (BOSupport.tsx:630, TicketsContext.tsx:209) | Paginer, retirer « Simuler » |
| BOMonitoringIA | ✅/🟡 | Données réelles (voice_service_metrics + SELECT 1). Le coût vaut volontairement 0 (admin-analytics.controller.ts:38-112). Statut `degrade` affiché « erreur » (BOMonitoringIA.tsx:88) | Mineur |
| BOAnalyticsProduit | 🟡 | « daily_active » = **inscriptions** par jour de semaine (controller l. 30). Onglets rétention/features/drop-off jamais alimentés. Une erreur renvoie des zéros (l. 33-35) | Renommer et masquer les onglets vides |
| BOCronDashboard | ✅/🟡 | Reflète bien les 2 vrais `@Cron` (cron-jobs.registry.ts ↔ bpay.cron.ts:23, alertes.service.ts:230), et le toggle est réel. **« Relancer » ne fait rien** et renvoie success (misc-rest.controller.ts:83-88) | Implémenter ou retirer « Relancer » |
| EventMonitor | 🟡 | Bus d'événements **du navigateur local** (eventLogger en mémoire et localStorage), pas une supervision serveur | Renommer « journal local » |
| useRealtime / LiveActivityFeed / SystemHealthPanel | 🟡 | API-07 confirmé (`API='/api/v1'` relatif, useRealtime.ts:8). `connected: true` même si les 4 appels échouent (l. 74). `montant_total` additionne tous les types de wallet_transactions sur toute la période (admin.service.ts:63-94) | Cf. API-07/09, corriger les agrégats |
| `/admin/*` stubs (cron, moderation, livraison, communication, rapports, scores, health) | ⏳ | Valeurs en dur ou inventées (admin-analytics.controller.ts:117-178). `/admin/health` est déclaré deux fois | Supprimer le code mort |
| events (websocket) | 🔴 | Chaque vente/dépense de caisse est diffusée à la room `all`, donc à **tous** les connectés (events.gateway.ts:60, 88-91). Room admin sans `admin_general` (l. 62) | Diffuser seulement à `user:` et `admin` |
| notifications | 🟠 | `notify-member` : un marchand peut notifier n'importe quel userId (notifications.controller.ts:119-137). `POST /notifications` accepte une metadata libre, ce qui permet d'injecter de fausses « campagnes » dans l'historique BO | Vérifier l'appartenance, filtrer la metadata |
| universal/ doublons §4 | 🟠 | `UniversalSearchBarBO` (437 l.) et `UniversalFilterPanelBO` (766 l.) ne sont importés **par personne** hors index.ts. Les versions vivantes sont UniversalRechercheBO et UniversalFiltreBO (7 écrans chacune) | Supprimer les 2 morts, et aussi Avatar/Badge/Table/Toast BO et 3 cartes mortes |

## 2. Détail par écran / module

### BOKeiwa (BOKeiwa.tsx, 1079 l.) + admin-wallets — 🔴 ARGENT

**Données : réelles.**
- `getStats`, `getChartData`, `getAllWallets` et `getAllTransactions` lisent `wallets` et `wallet_transactions` (admin-wallets.service.ts:54-239). Ces tables existent (wallet.entity.ts:14, wallet-transaction.entity.ts:37).
- **Bug de chiffre :** `getStats` fait `SUM(w.solde)` sur `wallets w LEFT JOIN wallet_transactions wt ON wt.user_id = w.user_id` (l. 59, 67-68). Le solde de chaque wallet est donc multiplié par son nombre de transactions, et le KPI « volume total » est faux dès qu'il y a plus d'une transaction. Les compteurs `COUNT(DISTINCT w.id)` restent justes.
- Les types `escrow_*` (enum, wallet-transaction.entity.ts:12-18) sont ignorés dans les crédits et débits. Le séquestre n'apparaît pas, à part `solde_bloque`.

**Ce que l'écran peut faire (actions réelles) :**
- **Crédit** : `POST /admin/wallets/:userId/credit` (controller l. 86-93, service l. 241-263). Il fait `UPDATE wallets SET solde = solde + $1` puis un INSERT `wallet_transactions` de type credit, avec `assertCompteActif`.
- **Débit** : `POST …/debit` (l. 95-102, service l. 265-288). Il vérifie le solde disponible.
- **Réinitialisation** : `POST …/reinitialiser` avec `confirmation: 'CONFIRMER'` (l. 78-84, service l. 343-364). Il met **`solde = 0` et `solde_bloque = 0`**. Le journal n'enregistre qu'un débit du `solde`. Le séquestre bloqué est effacé sans toucher aux escrows en cours.
- **Blocage** : il passe `users.status = 'suspendu'`, écrit un audit_logs avec adminId et envoie un SMS (l. 295-318). C'est couvert par `backend/test/invariants/blocage-wallet-admin.spec.ts`.
- **Déblocage** : il existe côté back (l. 320-341) mais **aucun bouton ne l'appelle** dans BOKeiwa (grep `debloquer` = 0). Bloquer est donc à sens unique depuis cet écran.

**Rôle :**
- Le contrôleur porte `@Roles('ADMIN')` au niveau de la classe (controller l. 16-18), donc **admin_general, super_admin, admin_national, gestionnaire_zone et operateur_terrain** peuvent créditer, débiter ou réinitialiser **n'importe quel wallet**, sans cloisonnement par zone.
- Le menu « Keiwa Wallet » a `permission: null` (BOLayout.tsx:126) : il est visible de tous les rôles BO.
- BOKeiwa ne fait aucune vérification de rôle (seulement `isAuthLoading`, l. 130).

**Journal d'audit :**
- `creditWallet`, `debitWallet` et `reinitialiserWallet` **ne reçoivent pas l'admin** (controller l. 79-101, pas de `@CurrentUser`). Ils n'écrivent **rien** dans `audit_logs`.
- La ligne `wallet_transactions` ne porte ni auteur ni `related_entity`. On ne peut pas savoir qui a crédité.
- L'onglet « audit » de BOKeiwa (`GET /admin/wallets/audit/logs`, l. 399-411) n'affiche donc que les blocages et déblocages.

**Autres risques argent :**
- Pas de clé d'idempotence. Le bouton « Confirmer » (BOKeiwa.tsx:883) n'est pas désactivé pendant l'appel (`handleAction`, l. 247-272, aucun état « en cours ») : **un double-clic crédite deux fois**.
- Pas de plafond de montant. Pas de double validation (principe des quatre yeux).
- **CSRF probable :**
  - Le front s'authentifie par cookie (`credentials: 'include'`, l. 99-117), et le cookie `bo_access_token` est le premier lu par `JwtStrategy` (jwt.strategy.ts:10-15).
  - En production, ce cookie est en `SameSite=None` par défaut (auth.controller.ts:1017-1021).
  - Le serveur accepte le `urlencoded` (main.ts:193) et aucune protection CSRF n'existe (grep `csrf` = 0).
  - Conséquence : un formulaire tiers auto-soumis pourrait viser `/admin/wallets/:id/reinitialiser` (`confirmation=CONFIRMER`) ou `/credit` (montant converti par `enableImplicitConversion`, main.ts:240-245) avec la session d'un admin.
  - À DÉFINIR : la valeur de `COOKIE_SAMESITE` en production.

**Config Keiwa (onglets services, banques, mobile money, paramètres) :**
- La table `keiwa_config_items` n'est créée nulle part. Dette déjà connue : SCHEMA-06, REGISTRE-MAITRE.md:625, et schema-pilote.spec.ts:43.
- `loadConfig` avale l'erreur et garde les constantes `DEFAULT_SERVICES/BANQUES/MM` (l. 67-95, 227). L'écran affiche donc une **configuration de démonstration** comme si elle était réelle.
- `handleAddItem` et `handleToggleItem` mettent à jour l'interface puis `.catch(() => {})` (l. 329, 346, 358, 1063) : l'écran affiche « Ajouté » ou « Activé » alors que rien n'est persisté.
- `handleSaveParametres` fait un `PUT /admin/wallets/config/parametres` → **404** (seul le GET existe, controller l. 129-132). `getConfigParametres` renvoie `{}` (service l. 422).
- `notifierBanque` renvoie `{success:true}` sans rien faire (controller l. 155-158). L'écran affiche pourtant « Utilisatrices notifiées » (BOKeiwa.tsx:389).

**Upload de logo :**
- `uploadLogo` (service l. 528-536) n'applique ni filtre de type ni filtre de taille.
- L'extension est prise de `originalname` et le fichier est écrit dans un répertoire servi (`https://julaba.online/uploads/logos/...`). Un `.html` ou `.svg` déposé par n'importe quel rôle BO donne un **XSS stocké sur le domaine principal**. Le chemin est aussi codé en dur pour le VPS (il échoue sur Render).

**Exports CSV :** `exportWalletsCSV` et `exportTransactionsCSV` exportent sans échappement, avec téléphones et noms, et sont accessibles à tous les rôles BO (l. 366-397). Risque d'injection de formule CSV (`=…` dans un nom) et de fuite de données personnelles.

**Hors pilote :** Keiwa est hors pilote (brief, GO-PILOTE). La surface d'écriture d'argent est pourtant **atteignable en production** par n'importe quel compte BO.

### BOScoreFinancier — ✅
- Le front appelle `GET /users/by-phone/:phone` (BOScoreFinancier.tsx:273), avec un contrôle de rôle inline (users.controller.ts:53-58), puis `GET /financial-score/:userId` (l. 327).
- `ADMIN_SCORE_ROLES = {'super_admin','admin'}` (financial-score.service.ts:35). `admin` est un rôle fantôme, donc seul super_admin passe, ce qui est cohérent avec le menu `superOnly` (BOLayout.tsx:153).
- La forme de la réponse est identique des deux côtés. Les vraies tables sont `caisse_sessions`, `caisse_transactions`, `wallets` et `wallet_transactions`.
- Test : `backend/test/invariants/financial-score-self-access.spec.ts`.

### BOMarketplace — ❌
- La lecture `GET /publications/admin/all` est réelle, avec un contrôle inline admin_general/super_admin (publications-rest.controller.ts:41-54).
- Le front lit `producteur_prenom/producteur_nom` (BOMarketplace.tsx:110), mais le back renvoie `user_prenom/user_nom` (l. 48). Résultat : le vendeur s'affiche toujours « Producteur » / « Vendeur ».
- **Les actions valider, rejeter et suspendre** passent par `PATCH /publications/:id` (BOMarketplace.tsx:171). Le back filtre `WHERE id=$1 AND user_id=$2` (l. 224-230) : **un admin prend un 403 sur toutes les publications d'autrui**. La modération est donc inopérante.
- Le KPI « ca_total » vaut `commandes × prix`, avec `commandes` absent de la table, donc 0 (l. 190).

### BOLivraison — ⏳ (BO-03 confirmé)
- `GET /admin/livraison` renvoie `{ livraisons: [], total: 0, … }` en dur (admin-analytics.controller.ts:135-136). Il existe aussi un doublon `GET /livraison` dans misc-rest.controller.ts:40-43, lui aussi vide.
- `PATCH /admin/livraison/:id/assign` exécute `ALTER TABLE commandes ADD COLUMN IF NOT EXISTS livreur` **à chaque requête**, ouvert aux 5 rôles BO (l. 138-152). Il renvoie HTTP 200 `success:false` si la commande est introuvable, et le front affiche quand même « Course assignée » (BOLivraison.tsx:155-164).
- Menu `livraison.read` : aucune permission par rôle dans BO_SCREEN_PERMISSIONS (BackOfficeContext.tsx:190-193), donc visible du seul super_admin.

### BOModeration (cité pour BO-03)
- Ce n'est **pas** une ébauche : l'écran utilise `/users/flags` (user-flags.controller.ts:14-35), réel, et `/marches`.
- La route `/admin/moderation` est un stub vide (admin-analytics.controller.ts:132-133), mais **personne ne l'appelle**.
- Incohérence de rôles : operateur_terrain et gestionnaire_zone ont `moderation.write` côté front (BackOfficeContext.tsx:192-193), alors que `PATCH /users/flags/:id/resolve` est limité à super_admin, admin_general et admin_national → 403.

### BOCommunication — 🟡
**Envoi :**
- L'envoi passe par `sendBulkNotifications` → `POST /notifications/send-bulk` (BOCommunication.tsx:145, notifications.controller.ts:140-171). Rôles autorisés : admin_general, institution, super_admin. Plafond de 500 destinataires.
- Il crée une ligne `notifications` par destinataire, plus une notification **push web** et un emit socket (notifications.service.ts:80-99).
- **Aucun SMS** : le SMS n'est appelé que par des notifications unitaires (feedbak-sms, grep). Il n'y a donc pas de risque de coût SMS de masse.

**Problèmes :**
- Le canal **« SMS » est sélectionné par défaut** (l. 102) et l'historique affiche « SMS ». Le texte de la l. 341 l'admet, mais l'interface trompe l'opérateur.
- Il n'existe ni brouillon, ni planification, ni annulation. Les modèles ne sont jamais renvoyés par le back (misc-rest.controller.ts:142 → pas de `templates`).
- Historique : `GET /communication` déduit les campagnes de `notifications.metadata->>'bulk'='true'` (misc-rest.controller.ts:104-145). **Or `POST /notifications`, ouvert à tout utilisateur authentifié, recopie la `metadata` du corps** (notifications.controller.ts:53-65). N'importe qui peut donc injecter une fausse « campagne » (bulk, canal, cible, sentBy=uuid d'un admin) dans l'historique BO.
- Le taux de délivrabilité vaut 100 en dur (misc-rest l. ~140).
- Le rôle `institution` peut envoyer à 500 userIds de n'importe quel rôle. Le choix est à confirmer.
- Menu `communication.read` : super_admin seulement (absent de la matrice).
- Test existant : `backend/test/invariants/bo-communication-send-bulk.spec.ts`, non lancé (base partagée).

### BOContenus — ⏳
- Il lit `d.messages` de `/communication`, qui vaut toujours `[]` (misc-rest.controller.ts:142). L'écran est donc toujours vide.
- Créer, éditer, activer et supprimer restent locaux (toasts « non persisté », BOContenus.tsx:82, 94, 113, 118). Il n'existe aucune table de contenus.

### BOAcademy — 🟡 (hors pilote)
- Le back est réel : `academy_modules`, questions et progress. L'écriture est limitée à `ROLES_ACADEMY_ADMIN = super_admin, admin_general, admin_national` (academy.controller.ts:18).
- `boApi` (BOAcademy.tsx:114-122) et les lectures (l. 133, 142) partent **sans `credentials: 'include'` et sans Bearer**. En V2 (`julaba-web.onrender.com` → `julaba-api.onrender.com`, utils/api.ts:57-59), le cookie n'est pas envoyé → **401 sur toute écriture**. Sur le même domaine (VPS), cela fonctionne.
- Le front n'accorde `academy.write` qu'à admin_general (BackOfficeContext.tsx:190), alors que le back l'accepte aussi pour admin_national.
- `addAuditLog` est écrit **par le client**, avec `ip: '127.0.0.1'` en dur (l. 317, 326).
- `GET /academy/stats` n'a pas de @Roles : tout authentifié peut le lire (l. 180). Impact faible.

### BONotifications — 🟡
- Il **n'appelle pas** `GET /notifications`. Il génère 1 à 8 « notifications » côté client à partir de `dossiers`, `acteurs`, `zones` et `auditLogs` du contexte (l. 61-171), avec des ids `gen_N`.
- `markAsRead`, `markAllRead` et `deleteNotif` envoient `/notifications/gen_1/read` ou `DELETE /notifications/gen_1`, avec les erreurs avalées (l. 193-215). La lecture est perdue au prochain recalcul.
- Si le contexte est vide (échec de chargement), l'écran affiche « Tout est en ordre — la plateforme fonctionne normalement » (l. 152-165) : **faux positif**.
- Menu `permission: null` : tous les rôles BO.

### BOSupport + tickets-rest — 🟡
- Le back est réel (tickets-rest.controller.ts:19-108, ROLES_BO). Le module `backend/src/tickets/tickets.module.ts` est vide (code mort, importé dans app.module.ts:92).
- `fetchTickets` → `GET /tickets` **sans limit** → `paginate` prend 10 par défaut (common/paginate.ts:29). Le BO ne voit que les **10 derniers tickets**, et `nouveauxCount` est calculé sur ces 10 (TicketsContext.tsx:135).
- Il passe par `apiRequest` (client marchand) et non par backoffice-api (tickets-api.ts:54), ce qui le rapproche du problème API-07.
- Bouton **« Simuler »** visible en production : il crée un ticket `demo-…` aléatoire en mémoire (BOSupport.tsx:628-636, TicketsContext.tsx:209-235).
- Le `numero` est calculé avec `count()+1` (l. 44-45) : risque de doublon en cas d'accès concurrent.

### BOMonitoringIA — ✅ (avec réserves)
- `GET /admin/monitoring` est réel : SELECT 1, `voice_service_metrics` via VoiceMetricsService. Les coûts sont **volontairement** à 0 et commentés (admin-analytics.controller.ts:38-112). Il n'invente pas de chiffres.
- Le statut `degrade` tombe en « erreur » dans le front (BOMonitoringIA.tsx:62-88).
- Le hook est appelé après un `return` conditionnel (l. 16-26). C'est une violation des règles des hooks, sans effet tant que le rôle ne change pas.

### BOAnalyticsProduit — 🟡
- `GET /admin/analytics` est réel sur `users`, mais :
  - « daily_active » est en fait le nombre d'inscrits des 7 derniers jours, groupé par `Dy` (admin-analytics.controller.ts:30) : le libellé est trompeur.
  - Le funnel ne compte que 2 étapes.
  - `retention`, `feature_engagement` et `drop_off` ne sont jamais renvoyés : les onglets sont vides.
  - Une exception renvoie des zéros (l. 33-35), ce qui donne un faux zéro.

### BOCronDashboard + cron-jobs — ✅ / 🟡
- `GET /cron` (misc-rest.controller.ts:49-73) mappe le **registre statique** cron-jobs.registry.ts. Ce registre contient exactement les 2 `@Cron` réels du backend : `bpay.cron.ts:23` (*/5) et `alertes.service.ts:230` (horaire). Le grep `@Cron(` ne trouve aucun autre job.
- Les deux jobs consultent `isEnabled` et `recordExecution` (bpay.cron.ts:25-37, alertes.service.ts:232-244). Le toggle est donc **réel**, couvert par `bo-cron-toggle-reel.spec.ts`.
- Le mapping des statuts est OK (BOCronDashboard.tsx:16-22).
- **`POST /cron/:id/retry` ne relance rien** et renvoie `{success:true}` (misc-rest.controller.ts:83-88). Le front affiche « Tâche relancée » et efface l'erreur (BOCronDashboard.tsx:108-121) : c'est un mensonge.
- `prochaine_exec` n'est jamais fourni → « - ».
- `GET /cron` n'a pas de @Roles : tout authentifié, marchand compris, peut lire la liste (fuite d'information mineure).
- Mettre en pause la réconciliation BPay (qui **crédite des wallets**) est possible pour admin_general, **sans audit_logs**.
- `GET /admin/cron` (admin-analytics.controller.ts:156-162) renvoie 2 jobs **inventés** (`sync-acteurs`, `rapport-hebdo`, lastRun = maintenant). Personne ne l'appelle côté front : code mort mensonger.

### EventMonitor — 🟡
- Il affiche `eventLogger` et `replayBuffer`, un ring buffer **en mémoire plus localStorage du navigateur courant** (services/eventLogger.ts:3, 18-53).
- Ce n'est pas une supervision serveur : il ne montre que les événements émis dans cet onglet BO. Il est réservé à super_admin (EventMonitor.tsx:24).

### useRealtime, LiveActivityFeed, LiveActivityDrawer, SystemHealthPanel — 🟡
- API-07 est confirmé : `const API = '/api/v1'` est relatif (useRealtime.ts:8). En V2, ces 4 lectures visent le site statique.
- `Promise.allSettled` ne rejette jamais, donc `connected: true` même si **tous** les appels échouent (useRealtime.ts:62-78). Le panneau peut afficher « connecté » avec des données vides ou anciennes.
- Le listener `visibilitychange` déclenche `fetchAll` même quand `enabled=false` (l. 98-105).
- `/admin/stats` (admin.service.ts:29-106) :
  - `montant_total` = SUM(montant) de **toutes** les `wallet_transactions` (crédit, débit, escrow_block, release, refund, sur toute la période) + les ventes de caisse. Un même franc est compté plusieurs fois (transfert = débit + crédit, séquestre = blocage + libération).
  - `total_transactions` additionne les tx wallet **du jour** et les ventes de caisse **depuis toujours** : fenêtres temporelles mélangées.
  - Toute erreur renvoie des zéros (l. 99-105).
- `/admin/timeline` ne lit que `wallet_transactions` (l. 744-764). Pour un pilote en espèces (caisse), la courbe reste plate.
- `/admin/health` : status « ok » dès que SELECT 1 passe. `errors_last_hour` = audit_logs dont l'action contient « error » (l. 724), une mesure quasi vide.
- `SystemHealthPanel` affiche `status ?? "ok"` par défaut (SystemHealthPanel.tsx:135).
- `GET /admin/health` est déclaré **deux fois** : AdminController (admin.controller.ts:19) et AdminAnalyticsController (l. 175-178, `db:'up', tts:'up', stt:'up'` en dur). AdminController étant enregistré en premier (admin.module.ts:23), la version en dur est morte mais trompeuse.
- `/admin/activity` est réel (union SQL sur ~8 sources, admin.service.ts:302-712). LiveActivityDrawer masque l'IP (l. 55-58).

### events (websocket) — 🔴 confidentialité
- `emitTransactionCreated` diffuse à la room **`all`** (events.gateway.ts:87-91, 77-80). Tous les sockets authentifiés y entrent (l. 60).
- Cette méthode est appelée **à chaque vente et dépense de caisse** avec la transaction complète et le `userId` (caisse-rest.controller.ts:822, 885 — cité seulement, régime RC1).
- Conséquence : **chaque marchand connecté reçoit les ventes et dépenses de tous les autres marchands**. Ce point n'est pas au registre (WS-01 ne traite que l'authentification, CONTRE-AUDIT-002:233).
- La room `admin` (l. 62) liste `admin` (rôle fantôme) et deux fois `operateur_terrain`, mais **pas `admin_general`**, le rôle BO principal, qui ne reçoit donc pas les événements `admin:*`.
- CORS en dur sur `https://julaba.online` (l. 20) : le domaine V2 onrender en est absent, ce qui pose problème pour le fallback polling.
- Le jeton est vérifié sans contrôler le statut de l'utilisateur (l. 51) : c'est WS-01.

### notifications (partie BO) — 🟠
- `POST /notifications/notify-member` (rôles cooperateur, marchand, producteur) envoie à `body.memberId` **sans vérifier l'appartenance** (notifications.controller.ts:119-137). C'est un vecteur d'hameçonnage ou de spam entre comptes, avec un push web.
- `POST /notifications/send` est ouvert à `identificateur` et `institution` vers n'importe quel userId (l. 92-117).
- `GET /notifications/bo/counts` est réel (l. 24-41).

### scores / financial-score — ✅ / code mort
- `/scores/me` n'a pas de @Roles au niveau méthode (scores.controller.ts:30). Le `roles=` de routes.tsv est un faux positif.
- `GET /admin/scores` (admin-analytics.controller.ts:164-173) renvoie `score: 0, niveau: 1` en dur pour 200 utilisateurs. Personne ne l'appelle : c'est du code mort.
- `updateScore` (`PATCH /scores/:id`, services/api/scores-api.ts:56-61) n'a aucune route backend.

### sms / feedbak-sms
- Il n'existe **aucun envoi SMS de masse** dans le BO. Les SMS sont unitaires : blocage et déblocage wallet (admin-wallets.service.ts:313, 336), identifications, PIN.
- Le blocage Keiwa déclenche un SMS par appel, donc un coût par appel, exposé à tous les rôles BO.

### universal/ et UniversalCardBO — doublons interdits par CONSTITUTION §4 (et §1-5 « pas de code mort »)

| Composant | Importé par (hors index.ts) | Verdict |
|---|---|---|
| UniversalRechercheBO (305 l.) | 7 écrans (BOActeurs, BOAudit, BOEnrolement, BOMarketplace, BOModeration, BOSupervision, BOZones) | Vivant |
| UniversalSearchBarBO (437 l.) | **0** (exporté par index.ts seulement ; seul BOZones importe le barrel, pour d'autres noms) | **Doublon mort → supprimer** |
| UniversalFiltreBO (278 l.) | 7 écrans | Vivant |
| UniversalFilterPanelBO (766 l.) | **0** | **Doublon mort → supprimer** |
| UniversalAvatarBO, UniversalBadgeBO, UniversalTableBO, UniversalToastBO | 0 | Morts |
| UniversalCardBOFlag / BOBOUser / BOInstitution (UniversalCardBO.tsx:695, 756, 817) | 0 | Exports morts |

Il n'existe pas de contrôle CI du code mort (aucun knip ou ts-prune dans frontend_src/package.json ou scripts/), ce qui contredit CONSTITUTION §1-5.

## 3. Top problèmes (par gravité)

🔴 **Argent / sécurité**
1. **Crédit, débit et réinitialisation de n'importe quel wallet par les 5 rôles BO**, y compris operateur_terrain, sans zone, sans plafond et sans double validation (admin-wallets.controller.ts:16-18, 78-102 ; menu `permission:null`, BOLayout.tsx:126).
2. **Aucune trace de l'auteur** pour crédit, débit et réinitialisation : ni audit_logs ni admin_id (admin-wallets.service.ts:241-364). L'écran « audit » ne les montre pas.
3. **Double-clic = double crédit** : pas d'idempotence, bouton non verrouillé (BOKeiwa.tsx:247-272, 883).
4. **La réinitialisation remet `solde_bloque` à 0** sans traiter les séquestres ; le journal est incomplet (service l. 343-364).
5. **CSRF plausible** sur ces routes : cookie `SameSite=None` en production, urlencoded accepté, aucune protection CSRF (auth.controller.ts:1017-1021, main.ts:193). À confirmer selon la configuration de production.
6. **Upload sans filtre** dans un répertoire web servi, donc XSS stocké (admin-wallets.service.ts:528-536).
7. **Fuite de confidentialité websocket** : chaque vente ou dépense de caisse est diffusée à tous les connectés (events.gateway.ts:60, 87-91).

🟠 **Cassé**
8. BOMarketplace : modération impossible, 403 propriétaire (publications-rest.controller.ts:221-230). Noms vendeur faux.
9. BOKeiwa : la config affiche des démos, les écritures sont avalées, PUT parametres renvoie 404, notifier banque est un faux succès (SCHEMA-06).
10. BOCronDashboard : « Relancer » est un faux succès (misc-rest.controller.ts:83-88).
11. BOAcademy : écritures sans authentification → 401 en V2 (BOAcademy.tsx:114-122).
12. `assign` livraison : DDL `ALTER TABLE` à chaque requête, accessible à tous les rôles BO (admin-analytics.controller.ts:141-143).
13. Room websocket `admin` sans `admin_general` (events.gateway.ts:62).
14. `notify-member` sans contrôle d'appartenance ; injection de fausses campagnes via `POST /notifications` avec metadata.
15. Doublons universal/ morts (SearchBar et FilterPanel, plus 4 composants et 3 cartes morts) contraires à §4 et §5.

🟡 **Partiel / faux chiffres**
16. KPI « volume total » Keiwa gonflé par la jointure (admin-wallets.service.ts:59, 67-68).
17. `/admin/stats` : `montant_total` compte plusieurs fois le même argent et mélange les périodes ; `connected:true` même en échec (admin.service.ts:63-94, useRealtime.ts:74).
18. BONotifications fabriquées côté client, avec un « Tout est en ordre » en faux positif.
19. BOSupport limité à 10 tickets ; bouton « Simuler » en production.
20. BOLivraison et BOContenus sont des coquilles (BO-03 confirmé pour livraison). Communication : canal SMS trompeur, modèles vides.
21. Stubs `/admin/cron|moderation|livraison|communication|rapports|scores|health` inventés ou vides, et `/admin/health` en double.
22. BOAnalyticsProduit : libellé « actifs » sur des inscriptions ; 3 onglets jamais alimentés.

## 4. À DÉFINIR
- **`COOKIE_SAMESITE` en production** (VPS et Render) : si `lax` ou `strict`, le risque CSRF tombe. On ne peut pas le vérifier sans accès à l'environnement.
- **Blocage des cookies tiers en V2** : sur un déploiement à deux domaines, les écrans qui n'utilisent que `credentials:'include'` (Keiwa, Cron, Livraison, Marketplace, Communication, Monitoring, Analytics, Notifications) dépendent d'un cookie cross-site `SameSite=None`, que certains navigateurs bloquent. backoffice-api (Bearer) ne serait pas touché. À tester en recette réelle.
- **Décision métier** : qui a le droit de créditer ou débiter un wallet (super_admin seul ? double validation ?) et sur quel journal (audit_logs, ou colonne auteur sur wallet_transactions) ? À trancher par ADR (CONSTITUTION §2 et §7).
- **Exposition de l'onglet Keiwa pendant le pilote** : le menu est visible de tous. Faut-il le masquer tant que Keiwa est No-Go ?
- **Contenu exact de `result`** diffusé par `emitTransactionCreated` (téléphone client, nom, etc.) : il relève de la caisse (RC1), non audité ici.
- **Droit du rôle `institution`** à faire un envoi de masse (500) vers n'importe quel rôle : est-ce voulu ?
- Les specs `bo-communication-send-bulk`, `bo-cron-toggle-reel` et `blocage-wallet-admin` n'ont pas été lancées (base partagée). Leur état vert ou rouge est inconnu ici.
