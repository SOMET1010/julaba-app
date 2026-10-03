# BO lot B — gouvernance, accès, administration

Audit en lecture seule. Dépôt `/home/user/julaba-app`, branche `claude/clever-allen-dnr8by`, HEAD `28bf9e8`, le 03/10/2026.
Les chemins front sont relatifs à `frontend_src/src/app/`, les chemins back à `backend/src/`.
Sondes utilisées : `scratchpad/bo-b/probe-perms.mts` (comparaison du registre front et de la liste blanche serveur), lecture de TypeORM 0.3.31 (`node_modules/typeorm/query-builder/UpdateQueryBuilder.js:309`).

---

## 1. Tableau de synthèse

| Élément | Statut | Preuve courte | Prochaine action |
|---|---|---|---|
| Modèle de permissions (`hasPermission`, matrice, `bo_permissions`) | 🟡 appliqué **côté front seulement** | Serveur : une seule lecture de `boPermissions`, à `users.controller.ts:112` (counts-by-role). Aucun garde de permission (`grep PermissionsGuard` : 0) | Garde serveur `@RequirePermission`, ou supprimer la matrice en la déclarant « confort d'affichage » |
| Différenciation des 5 rôles BO côté API | 🟡 partielle | `users/*`, `institutions/*`, `auth/create-super-admin` : différenciés. `admin/*` (44 routes `'ADMIN'`), `audit`, `admin/wallets/*` crédit/débit : les 5 rôles, opérateur compris, sans zone | Restreindre les écritures sensibles ; borner par zone |
| `PATCH /users/:id`, élévation de privilège par contournement | 🔴 | `users.controller.ts:291-293` : admin_general et admin_national peuvent écrire `boPermissions` et `status` sur **n'importe quel** compte, super_admin compris (seul `role` est bloqué, l. 306) | Bloquer `boPermissions` hors super_admin ; contrôle hiérarchique sur `status`/`phone` |
| `DELETE /users/:id` | 🔴 | `users.controller.ts:455-460` `@Roles('ADMIN')` : opérateur_terrain archive n'importe qui. `users.service.ts:344` : aucun audit | Restreindre, auditer, interdire la cible super_admin |
| Journal d'audit | 🟡 | Une seule table `audit_logs` (baseline l. 204), écrite et lue par tous. Trous : suppression d'un compte, `create-super-admin`, clés API, crédit/débit wallet. `POST /audit` est forgeable par le client | Combler les trous ; retirer `POST /audit` ou le marquer « déclaratif » |
| BOAudit (écran) | 🟡 | Lit les 50 dernières lignes (`audit-rest.controller.ts:30`, `backoffice-api.ts:1019`). Rôle forcé à `'admin'` (`BOAudit.tsx:62`), donc le filtre par rôle est inopérant. Affiche un UUID au lieu d'un nom. Les erreurs sont avalées en `[]` (faux zéro) | Pagination serveur ; jointure `users` ; propager l'erreur |
| `/auth/test-login`, `/auth/reset-super-admin-password`, `/auth/recover-super-admin` | ❌ (absentes du back) / 🔴 (secret dans le bundle) | Aucune route dans `auth.controller.ts`. `AdminRecovery.tsx:190,320,430` les appellent. Une clé de récupération est en dur : secret présent à `pages/AdminRecovery.tsx:22`. La page est publique (`routes.tsx:34`) et liée depuis `LoginPassword.tsx:1611` | Supprimer la page et la constante |
| SEC-10 : mot de passe rendu en clair | 🔴 toujours vrai | Création : `admin-users.service.ts:163-164,287-288`, `backoffice-users.service.ts:414-416`. Reset : `users.service.ts:505`. Affiché : `BOUtilisateurs.tsx:648-650,664-666` | Doctrine AUTH-RECOVERY-01 |
| SEC-08b : `reset-user-password` | 🔴 toujours vrai | `auth.controller.ts:466-468` `@Roles('super_admin','admin')`, corps `newPassword` | Lot A |
| `BOParametres.tsx:423` `/admin/wallets/config/parametres/reset` | ❌ n'existe pas | Seul `GET config/parametres` existe (`admin-wallets.controller.ts:129`) et renvoie `{}` (`admin-wallets.service.ts:422`). Le `PUT` de `BOParametres.tsx:392` n'existe pas non plus | Créer le stockage, ou retirer l'écran |
| BO-01 (feature flags sans endpoint) | 🟡 toujours vrai, masqué en prod | `BOParametres.tsx:229-234` TODO ; toggle « (simulation) » l. 710 ; sections DEV seulement (l. 70-74) | Clore en retirant le code |
| BO-02 (`isBackendReady=false`) | ⏳ toujours vrai | `BOConfigInstitution.tsx:130`. Aucun `/admin/config` dans `routes.tsv` | Clore ou implémenter |
| `/rapport/rapports\|moderation\|cron\|analytics\|monitoring` | ❌ n'existent pas, ⚪ code mort | Seul `GET /rapport/hebdo` existe (`caisse-rest/rapport-hebdo.controller.ts:9,20`). `boGetRapports`, `boGetModeration`, `boGetCron`, `boGetAnalytics`, `boGetMonitoring` (`backoffice-api.ts:812-866`) n'ont **aucun appelant** | Supprimer les 5 fonctions |
| Clés API partenaires (SEC-01 du contre-audit) | 🔴 confirmé | Stockage en clair et clé relisible : `partner-api-keys.service.ts:35-40`. Bouton « révéler » : `BOApiKeys.tsx:513,619`. Table absente sur base neuve (SCHEMA-05, `_archive/1739200000000-ApiKeysTable.ts`). Aucun audit | Hacher la clé ; afficher le secret une seule fois ; ajouter la migration |
| Session BO (jeton, refresh, 401, déconnexion) | 🟠 | Jeton BO non envoyé par la plupart des appels ; aucun `/auth/refresh` côté BO ; aucun émetteur de `julaba:bo-session-expired` ; la déconnexion n'appelle pas `/auth/logout` | Voir §2.3 |
| `/auth/contacts-recovery-bo` public | 🟠 | `auth.controller.ts:93-108` : nom et téléphone de 5 super_admin, sans authentification | Retirer les téléphones, ou authentifier la route |
| BOInstitutions : statut, suppression, champs | ❌ | L'entité n'a pas de colonne `statut`, `email`, `telephone`… (`institution.entity.ts`, baseline l. 494-504). `repo.update` avec `statut` lève `EntityPropertyNotFoundError`, donc 500 (`institutions.controller.ts:95-96`, l. 82) | Migration de colonnes, ou alignement du front |
| BOInstitutionsPermissions | ⏳ code mort | `PermissionsEditor` est importé (`BOInstitutions.tsx:14`) mais jamais rendu | Supprimer |
| BORapports | 🟡 | `/admin/stats` réel ; radar inventé (`BORapports.tsx:103`) ; commissions = 3 % en dur (l. 504) ; filtres période/région non appliqués (l. 271) | Retirer les valeurs inventées |
| BOProfil | 🟡 | gestionnaire_zone et operateur_terrain prennent un 403 en éditant leur propre profil (`users.controller.ts:262` exclut ces rôles) ; le changement de mot de passe part sans bearer (`BOProfil.tsx:290`) | Ajouter le propriétaire aux rôles ; utiliser `authHeaders` |
| BOLogin | 🟡 | Mot de passe : OK. WebAuthn : le jeton n'est pas stocké (`BOLogin.tsx:171-183`) | `setBoAccessToken` après WebAuthn |
| BORoot / garde de route | 🟡 | Vérifie seulement « rôle BO » (`BORoot.tsx:15-37`) ; aucune garde par écran ; toute URL est atteignable | Garde par permission sur les routes |
| BOShortcutsModal / BOProgressBar | ✅ | UI pure ; Ctrl+K, Ctrl+N et Échap sont branchés (`BOLayout.tsx:771-781`, `ShortcutsContext.tsx:64`) | — |

---

## 2. Détail par écran ou module

### 2.1 Modèle de permissions : le front décide, le serveur ne regarde pas

- **Trois sources front qui divergent :**
  1. `BO_SCREEN_PERMISSIONS`, repli par rôle (`contexts/BackOfficeContext.tsx:189-194`), environ 26 clés pour admin_general.
  2. Le registre `config/bo-permissions.ts`. La sonde compte **59 clés**, dont 5 réservées au super_admin (`utilisateurs.*`, `parametres.*`). Valeurs par défaut : admin_general 54, admin_national 51, gestionnaire_zone 13, operateur_terrain 8.
  3. La « matrice de 42 permissions » de `JULABA_DECISIONS.md:162` : **obsolète**, le registre en a 59.

  Incohérence : le repli (1) donne `utilisateurs.write` et `parametres.write` à admin_general, alors que le registre (2) les réserve au super_admin.
- **`hasPermission`** (`BackOfficeContext.tsx:760-768`) : super_admin passe toujours. Sinon, si `boPermissions` existe, on le lit **exclusivement** ; sinon on prend le repli par rôle.
- **Liste blanche serveur** (`users.controller.ts:410-438`) : 59 clés, identiques au registre (sonde : 0 écart dans les deux sens). C'est une validation de **forme** uniquement.
- **Application serveur** : `grep boPermissions backend/src` ne trouve qu'une seule lecture fonctionnelle, `users.controller.ts:112` (`counts-by-role` refuse si `acteurs.read !== true`). Aucun `PermissionsGuard` n'existe. **Conclusion : la matrice ne fait que masquer le menu** (`BOLayout.tsx:883-888`) et quelques boutons (`BOUtilisateurs.tsx:603-604`, `BOParametres.tsx:147`, `BOInstitutions.tsx:372`). Un compte à qui on retire `acteurs.write` garde l'accès API complet de son rôle.
- **Contournement de `PATCH /users/:id/bo-permissions`** : cette route est réservée au super_admin (l. 394-396). Mais `PATCH /users/:id` (l. 262-317) accepte `boPermissions` et `status` pour `isAdmin`, donc admin_general et admin_national (gestionnaire_zone et operateur_terrain sont écartés par `@Roles`). Aucune règle de hiérarchie : `users.service.ts:348-392` ne compare pas les rôles. Conséquence 🔴 : un admin_national peut **suspendre un super_admin** (`status: 'suspendu'`, et `jwt.strategy.ts` le rejette ensuite), changer son `phone` ou son `email`, ou se donner toutes les permissions. L'audit `modification` le trace (`users.service.ts:381`), mais rien ne l'empêche.
- **Les 5 rôles côté API** (`routes.tsx`, `routes.tsv`) :
  - `@Roles('ADMIN')` couvre 44 routes, dont 22 en écriture. Les 5 rôles y sont traités pareil, sans zone (`roles.guard.ts:5,27`).
  - Différenciation réelle seulement sur `users/admin*`, `users/backoffice*`, `users/:id/bo-permissions`, `users/:id/admin-reset-password`, `institutions` (POST/PATCH super_admin et admin_general, DELETE super_admin) et `auth/create-super-admin`.
  - `GET /users` n'a aucun bornage par zone pour gestionnaire_zone (`users.service.ts:192-235`).
  - `POST /admin/wallets/:userId/credit|debit|reinitialiser` (`admin-wallets.controller.ts:78-101`) est ouvert à operateur_terrain, sans `adminId` ni ligne d'audit (`admin-wallets.service.ts:241-290`). Hors pilote (Keiwa), mais la route est vivante. 🔴 argent.
- **Tests** : aucun test backend ne couvre `bo-permissions`, `PATCH /users/:id` par rôle, ni `DELETE /users/:id`. `grep` dans `backend/test` : 0.

### 2.2 Journal d'audit

- **Table** : une seule, `audit_logs` (`database/migrations/1780200000000-BaselineSchema.ts:204`, entité `audit-rest/audit-log.entity.ts`). Toutes les écritures y vont (8 `INSERT INTO audit_logs`), et BOAudit lit **la même** table via `GET /audit` (`audit-rest.controller.ts:30`).
- **Actions écrites** :

  | Action | Lieu |
  |---|---|
  | login | `auth.service.ts:284` |
  | PASSWORD_RESET | `auth.controller.ts:481` |
  | PIN_RESET | `auth.controller.ts:730` |
  | PASSWORD_ADMIN_RESET | `users.service.ts:497` |
  | `modification` à chaque `usersService.update`, donc aussi bo-permissions et changements de statut | `users.service.ts:381` |
  | création, validation, rejet d'admin | `admin-users.service.ts:151,188,256,321` |
  | création BO | `backoffice-users.service.ts:308,362,467` |
  | UPDATE_INSTITUTION_MODULES, **seulement si `modules` est présent** | `institutions.controller.ts:62,85` |
  | BLOQUER_WALLET / DEBLOQUER_WALLET | `admin-wallets.service.ts:306,331` |

- **Non audités** :
  - `DELETE /users/:id` (`users.service.ts:344`) ;
  - `POST /auth/create-super-admin` (`auth.controller.ts:832-848`) ;
  - création et désactivation de clé API (`partner.controller.ts:44-70`) ;
  - crédit, débit et réinitialisation de wallet ;
  - création, statut et suppression d'institution sans `modules` ;
  - enregistrement WebAuthn.
- **Forgeable** : `POST /audit` (`audit-rest.controller.ts:31`) est ouvert aux 5 rôles. `user_id` est forcé par le serveur, mais `action`, `details` et `ip` viennent du client. Le front l'utilise (`BackOfficeContext.tsx:699-707`), y compris pour annoncer des sauvegardes de paramètres qui n'ont pas eu lieu (cf. 2.6). Les champs `utilisateurBO`, `module` et `ancienneValeur` sont retirés par `whitelist: true` (`main.ts:240-242`) : BOAudit ne les recevra jamais.
- **BOAudit** (`components/backoffice/BOAudit.tsx`) :
  - `normalizeLog` (l. 57-68) cherche `utilisateurBO`, `roleBO` et `module`, que le back ne renvoie pas. L'utilisateur s'affiche donc en UUID et le rôle vaut toujours `'admin'` : le filtre par rôle (l. 84-97) ne retient jamais un vrai rôle. Le contenu `details` (avant/après) n'est jamais affiché.
  - La liste est limitée à la page 1 (50 lignes) : `boGetAuditLogs` n'envoie pas de `page` (`backoffice-api.ts:1019-1026`).
  - `boGetAuditLogs` avale l'erreur en `[]`, donc l'état `indisponible` du contexte (`BackOfficeContext.tsx:533`) ne peut jamais se produire : **faux zéro**.
  - `GET /audit` est ouvert aux 5 rôles, sans zone : un operateur_terrain lit tout le journal national, connexions comprises.

### 2.3 Session BO : BOLogin, BackOfficeContext, backoffice-api, BOLayout

- **Jeton** : `boLogin` stocke `accessToken` en sessionStorage (`backoffice-api.ts:157`). Il n'est envoyé que par `authHeaders()` (l. 34-39). En revanche, ces appels partent **sans bearer** :
  - `apiRequest`, `apiPatch`, `apiDelete` (l. 868-888), car `getValidToken()` renvoie toujours `null` (l. 68-71). Cela couvre `PATCH /users/:id`, `bo-permissions`, `institutions` et toutes les suppressions ;
  - `loadUser` de `BackOfficeContext.tsx:297` (`/auth/me`, `credentials` seul) ;
  - BOParametres (l. 250-251, 392, 423), BORapports (l. 181, 185), BOApiKeys (l. 113, 165, 213), BOProfil (`change-password`, l. 290).

  Le filet global de `main.tsx:46-60` lit `localStorage.julaba_access_token`, que BOLogin n'écrit pas. **Effet** : si le cookie tiers `bo_access_token` est bloqué (cas décrit à `backoffice-api.ts:4-14`), `loadUser` échoue et `BORoot` renvoie à la connexion. Le BO est alors inutilisable malgré un login réussi. 🟠 Reproduction en navigateur : À DÉFINIR.
- **WebAuthn** : `boWebAuthnAuthenticateVerify` (`backoffice-api.ts:189-201`) ignore l'`accessToken` que le back renvoie (`auth.controller.ts:991-996`). La session repose uniquement sur le cookie.
- **Refresh** : aucun appel à `/auth/refresh` depuis le BO (`grep` : seul `services/api/api-client.ts:115`, client de la marchande). `JWT_EXPIRES_IN=15m` (`GUIDE_DEPLOIEMENT.md:183`, `auth.service.ts:415`). La session BO meurt donc au bout de 15 minutes, alors que le minuteur d'inactivité est réglé à 30 minutes (`BOLayout.tsx:762-766`).
- **401 et expiration** : `BOLayout.tsx:860-869` écoute `julaba:bo-session-expired`, mais **aucun code ne l'émet** (`grep` : 0 `dispatchEvent`). Les 401 deviennent des erreurs génériques, sans redirection.
- **Déconnexion** : `BOLayout.handleLogout` (l. 849-858) retire `localStorage.julaba_bo_user` et navigue, **sans appeler `logout()` du contexte ni `/auth/logout`**. Le cookie httpOnly, le refresh token serveur, le jeton sessionStorage et l'état `user` du contexte survivent : revenir sur `/backoffice/dashboard` rouvre la session. `BOProfil.handleLogout` (l. 311-320) n'appelle pas `/auth/logout` non plus et ne vide pas le jeton BO. Seule la déconnexion par inactivité (`idleLogout`, l. 751-759) appelle `logout()` du contexte, et encore sans `/auth/logout`. 🟠
- **Garde de route** : `BORoot` (l. 15-37) ne vérifie que l'appartenance aux 5 rôles. Aucune garde par écran : `/backoffice/utilisateurs`, `/api-keys` ou `/parametres` s'ouvrent par URL directe. Le serveur ferme ensuite ou non selon le cas (§2.1). Les écrans BOConfigInstitution (l. 115-123) et BOUtilisateurs (`canEdit`) se protègent eux-mêmes ; les autres non.
- **`/auth/refresh`** répond 200 avec `{error}` en cas d'échec (`auth.controller.ts:152-157`). C'est connu, documenté à `api-client.ts:74`.
- **`/auth/contacts-recovery-bo`** (`auth.controller.ts:93-108`) : public, limité à 5 requêtes par minute. Il rend le nom et le téléphone des 5 premiers super_admin actifs. Consommé par `BOLogin.tsx:138`. Il fournit la cible idéale pour un hameçonnage ou une attaque sur le login. 🟠
- **`/auth/webauthn/authenticate/options`** : énumération de comptes possible (« Utilisateur introuvable » ou « Aucune clé biométrique », l. 937-940).

### 2.4 Routes de récupération super_admin et AdminRecovery

- `/auth/test-login`, `/auth/reset-super-admin-password` et `/auth/recover-super-admin` **n'existent pas** dans le back : `grep` sur `backend/src` donne 0, et `routes.tsv` ne les contient pas. Elles ne sont **pas actives en prod sur ce code**. Leur présence sur le serveur déployé : À DÉFINIR, sans accès réseau.
- `pages/AdminRecovery.tsx` reste **routée publiquement** (`routes.tsx:34`) et liée depuis l'écran de connexion (`LoginPassword.tsx:1611`). Ses trois actions tombent en 404 (l. 190, 320, 430). Son diagnostic appelle `super-admin-status` (l. 73), réservé au super_admin (`auth.controller.ts:852-854`) : inutilisable par la personne qu'elle prétend dépanner. ❌
- 🔴 Une **clé de récupération en dur** est livrée dans le bundle public : secret présent à `pages/AdminRecovery.tsx:22`, envoyé en `secretKey` (l. 323, 433). C'est inerte aujourd'hui, faute de route. Mais si une version serveur l'accepte encore (À DÉFINIR), n'importe qui peut réinitialiser le super_admin.
- `POST /auth/create-super-admin` (l. 832-848) : réservé au super_admin, mais ne vérifie pas la robustesse du mot de passe, ne pose pas `mustChangePassword` et **n'écrit aucun audit**.

### 2.5 Création des comptes BO (BOUtilisateurs) et SEC-10

- **Création** : `boCreateBOUser`, puis `POST /users/backoffice-account` (`backoffice-api.ts:1048-1063`, puis `users.controller.ts:187-211`, super_admin, rôles bornés par `CREATABLE_BO_ACCOUNT_ROLES`). Le mot de passe est généré (`auth.service.ts:69-77`, 12 caractères aléatoires) **puis rendu en clair** (`backoffice-users.service.ts:414-416`) et **affiché dans un toast** (`BOUtilisateurs.tsx:646-650`). Même chose sur `POST /users/admin` et sur sa validation (`admin-users.service.ts:163-164,287-288`). SEC-10 et son « hors périmètre nommé » restent **ouverts et vérifiés**.
- **Reset** : `boAdminResetPassword`, puis `POST /users/:id/admin-reset-password` (`users.controller.ts:463-468`, puis `users.service.ts:485-506`). Le mot de passe est rendu en clair et affiché (`BOUtilisateurs.tsx:664-666`). Pas de révocation de session, pas de throttle. SEC-10 confirmé.
- **Cohérence front** : `canCreate = hasPermission('utilisateurs.write')` (l. 603). admin_general l'obtient par le repli de rôle, mais le serveur répond 403 (super_admin seulement). L'écran n'est atteignable que par URL directe, puisque le menu est `superOnly` (`BOLayout.tsx:136`).
- **Matrice** (`BOUtilisateurs.tsx:153-330`) : branchée sur le vrai registre, l'auto-enregistrement passe par `PATCH /users/:id/bo-permissions`. Elle fonctionne en écriture, mais n'a aucun effet serveur (§2.1).

### 2.6 BOParametres

- **Lecture** : `GET /admin/wallets/config/parametres` renvoie toujours `{}` (`admin-wallets.service.ts:422`, commentaire « stub » à `admin-wallets.controller.ts:122`). Tous les paramètres s'affichent donc à 0 ou `false` (`BOParametres.tsx:253-300`), y compris la durée de session, le nombre de tentatives, la 2FA et la journalisation IP. C'est un **faux zéro** présenté comme une configuration réelle. 🟡
- **Écriture** : `PUT …/config/parametres` (l. 392) n'existe pas, seul un GET existe (`routes.tsv`). `calls.tsv` le note « OK » à tort, parce qu'il ne compare pas la méthode. Résultat : 404 et toast « Échec ». ❌
- **Reset** : `POST …/config/parametres/reset` (l. 423) **n'existe pas**. ❌
- BO-01 reste vrai (l. 229-234, l. 710 « simulation »), mais les sections ne sont visibles qu'en `import.meta.env.DEV` (l. 70-74).
- Le menu exige `parametres.read` sans `superOnly` (`BOLayout.tsx:181`) : admin_general et admin_national voient l'écran.

### 2.7 BOInstitutions, BOInstitutionsPermissions, BOConfigInstitution

- **Câblage** : `boGetInstitutions`, `boCreateInstitution`, `boUpdateInstitution` et `boDeleteInstitutionApi` (`backoffice-api.ts:1326-1338`) appellent `institutions.controller.ts`.
- **Schéma réel** : la table `institutions` a `id, nom, type, zone_id, responsable_id, modules, actif, created_at, updated_at` (baseline l. 494-504, entité identique). Le contrôleur accepte `description, adresse, telephone, email, logo, statut` (l. 53, 76).
  - **Création** : `repo.create` ignore les champs inconnus. `email`, `referentNom`, `referentTelephone`, `region` et `statut` envoyés par `BOInstitutions.tsx:426` sont **perdus en silence**.
  - **PATCH avec `statut`** (`updateInstitutionStatut`, `BackOfficeContext.tsx:724`) **et DELETE** (`institutions.controller.ts:96` écrit `statut: 'supprime'`) : TypeORM 0.3.31 lève `EntityPropertyNotFoundError` (`UpdateQueryBuilder.js:309`), donc **500 à chaque fois**. Suspendre ou supprimer une institution ❌.
  - Les KPI « actives » et « suspendues » (`BOInstitutions.tsx:403-404`) valent toujours 0, puisque `statut` n'existe pas.
- **Ce qui marche** : la création (nom, type, zone, modules) et la mise à jour des `modules`, auditée et réellement appliquée côté serveur par `InstitutionScopeGuard` (`institutions/guards/institution-scope.guard.ts:91-104`). Impossible en revanche de rattacher un `responsable_id` depuis le BO : le champ n'est pas dans la liste blanche.
- **BOInstitutionsPermissions** : `PermissionsEditor` est importé mais jamais rendu (`grep "<PermissionsEditor"` : 0). Code mort ⏳.
- **BOConfigInstitution** : `isBackendReady = false` (l. 130). Le chargement est vide (l. 136-140), la sauvegarde désactivée (l. 173-176). BO-02 **toujours vrai**. Défaut React à noter : un `return` précède les `useState` (l. 115-125), ce qui viole les règles des hooks si le rôle change.
- **Test existant** : `backend/test/invariants/institution-isolation.spec.ts` couvre l'isolation, pas les opérations BO.

### 2.8 BORapports

- **Données** : `GET /admin/stats` (`admin.service.ts:89-103`, vraies requêtes ; une erreur devient des zéros) et `GET /admin/analytics` (`admin-analytics.controller.ts:24-37`, vrai, erreur avalée en zéros).
- **Valeurs inventées** :
  - radar `40 + …*55` (`BORapports.tsx:103`) ;
  - « commissions » = `montant_total * 0.03` (l. 504) ;
  - `analytics.monthly` attendu (l. 32), jamais renvoyé par le back.
- Les agrégats région et profil portent sur `acteurs` du contexte, une seule page chargée (`BackOfficeContext`) : partiel.
- Les filtres `periode` et `region` ne servent qu'à l'en-tête du PDF (l. 271).
- Pas de bearer (l. 181, 185).
- Le menu exige `audit.read` et `roles: ['admin_general']` (`BOLayout.tsx:155`).
- **Routes `/rapport/*` de `backoffice-api.ts:812-866`** : absentes du back (seul `/rapport/hebdo`) **et sans appelant**. Code mort.
- Les équivalents `/admin/rapports|moderation|livraison|communication|cron` existent mais sont des **stubs** :
  - modération, livraison et communication renvoient des listes vides constantes (`admin-analytics.controller.ts:132-155`) ;
  - `/admin/cron` renvoie 2 jobs inventés, `lastRun = now` et `status: 'success'` (l. 157-163) ;
  - `/admin/health` est déclarée deux fois (`admin.controller.ts:19` et `admin-analytics.controller.ts:176`, cette dernière en dur et masquée par l'ordre des contrôleurs, `admin.module.ts:23`).

  BO-03 reste vrai.

### 2.9 BOApiKeys et le module partner

- L'accès est réellement limité au super_admin : `assertBoAdmin` s'appuie sur `ADMIN_SCORE_ROLES = {'super_admin','admin'}` (`financial-score.service.ts:35`), et `admin` n'existe pas.
- SEC-01 du contre-audit est **confirmé** : la clé est stockée en clair (`partner-api-keys.service.ts:56-60`), comparée en clair (`api-key.guard.ts:24-27`), et **relisible** via `GET` (l. 35-40) et le bouton « révéler » (`BOApiKeys.tsx:513,619`).
- Ni la création ni la désactivation ne sont auditées.
- `rate_limit` est lu mais **jamais appliqué** (`api-key.guard.ts:24-38`).
- La table `api_keys` n'est créée que par une migration archivée : sur base neuve, l'écran tombe en 500 (SCHEMA-05, ouvert).

### 2.10 BOProfil

- Sessions (`/auth/sessions`), journal personnel (`/audit/me` ; `@Roles()` vide au niveau méthode, donc ouvert à tout compte connecté, ce qui est voulu) et photo (`/users/:id/photo`) : branchés.
- `updateUserProfile` appelle `PATCH /users/:id`, dont les `@Roles` excluent gestionnaire_zone et operateur_terrain (`users.controller.ts:262`). Ces deux rôles reçoivent **403 sur leur propre profil**. 🟠
- Changement de mot de passe sans bearer (l. 290-295).
- Déconnexion incomplète (§2.3).

---

## 3. Top problèmes, par gravité

1. 🔴 **Élévation latérale par `PATCH /users/:id`** : admin_national et admin_general peuvent écrire `status`, `boPermissions`, `phone` et `email` de n'importe quel compte, super_admin compris (`users.controller.ts:291-306`). Ils peuvent donc suspendre le super_admin ou s'octroyer toutes les permissions.
2. 🔴 **`DELETE /users/:id` ouvert aux 5 rôles**, opérateur compris, sans hiérarchie ni audit (`users.controller.ts:455-460`, `users.service.ts:344`).
3. 🔴 **Mots de passe rendus en clair** à la création et au reset (SEC-10 et son hors-périmètre ; SEC-08b), affichés dans des toasts.
4. 🔴 **Clé de récupération super_admin en dur** dans le bundle public (`pages/AdminRecovery.tsx:22`) ; la page est publique et liée depuis le login.
5. 🔴 **Clés API partenaires en clair et relisibles** (SEC-01 du contre-audit), sans audit, `rate_limit` non appliqué.
6. 🔴 (hors pilote, route vivante) **Crédit, débit et réinitialisation de wallet** ouverts à operateur_terrain, sans trace de l'auteur dans `audit_logs` (`admin-wallets.controller.ts:78-101`).
7. 🟠 **Permissions BO purement cosmétiques côté serveur** : la matrice de 59 clés n'est lue qu'à un seul endroit (`users.controller.ts:112`).
8. 🟠 **Session BO** : bearer absent sur la plupart des appels, aucun refresh (le jeton meurt à 15 minutes), aucun émetteur de `bo-session-expired`, déconnexion sans `/auth/logout` et session réouvrable.
9. 🟠 **Institutions** : suspendre ou supprimer donne toujours un 500 (colonne `statut` absente) ; email et référent perdus en silence.
10. 🟠 **BOParametres** : lecture `{}` affichée en zéros, `PUT` et `/reset` inexistants.
11. 🟠 **`contacts-recovery-bo`** public : il expose les téléphones des super_admin.
12. 🟠 **BOProfil** : 403 pour gestionnaire_zone et operateur_terrain sur leur propre profil.
13. 🟡 **BOAudit** : 50 lignes, rôle et utilisateur faux, `details` invisibles, faux zéro sur erreur ; `POST /audit` forgeable ; trous d'audit (suppression de compte, create-super-admin, clés API, wallets).
14. 🟡 **BORapports** : radar et commissions inventés, filtres décoratifs ; `/admin/cron` invente des exécutions.
15. 🟡 **Code mort** : 5 fonctions `/rapport/*`, `PermissionsEditor`, BO-01 (feature flags), BO-02 (`BOConfigInstitution`).
16. 🟡 **Pas de garde par écran** dans `BORoot` ; le repli `BO_SCREEN_PERMISSIONS` contredit le registre (`utilisateurs.*` et `parametres.*`) ; « 42 permissions » dans les décisions, 59 dans le code.

---

## 4. À DÉFINIR

- Les routes `test-login`, `reset-super-admin-password` et `recover-super-admin` existent-elles sur le serveur **déployé** (OVH julaba.online) ? Si oui, acceptent-elles la clé en dur ? Impossible à vérifier sans appel réseau.
- La valeur réelle de `JWT_EXPIRES_IN` en prod. Le guide dit `15m`. Si c'est confirmé, le BO expire en silence toutes les 15 minutes ; témoignage terrain à recueillir.
- Le cookie `bo_access_token` passe-t-il en prod ? Domaines identiques ou différents entre OVH et Render V2 ? Cela décide si la perte du bearer (§2.3) casse réellement le BO.
- Doctrine attendue : `bo_permissions` doit-il devenir une autorisation serveur, ou rester un réglage d'affichage ? Cela tranche le point 7.
- Le compte bloqué par `status = 'supprime'` : `jwt.strategy.ts` ne refuse que `SUSPENDU` et `EN_ATTENTE_ACTIVATION`. Un jeton déjà émis pour un compte « supprimé » reste-t-il valide 15 minutes ? Le login le refuse-t-il ? Non vérifié dans `auth.service.ts.login`.
- Une ligne existe-t-elle dans `api_keys` en prod (table créée à la main ?) ? Si oui, des clés en clair circulent déjà.
