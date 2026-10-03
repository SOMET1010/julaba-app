# Audit lecture seule — profils IDENTIFICATEUR, COOPÉRATIVE, INSTITUTION

Dépôt `/home/user/julaba-app`, HEAD `28bf9e8`. Rien n'a été modifié. Seul test lancé : `frontend_src/src/app/types/constants.test.mts` (isolé, vert : route `/cooperative/*` autorisée au cooperateur, `/cooperative/stock` au marchand membre).
Chemins front relatifs à `frontend_src/src/app/`, chemins back relatifs à `backend/src/`.

---

## 1. Tableau de synthèse

| Élément | Statut | Preuve courte | Prochaine action |
|---|---|---|---|
| **Enrôlement marchande par l'identificateur** (`/identificateur/fiche-identification` → `POST /identifications/create-with-acteur`) | 🟡 | Le compte est bien créé, `en_attente_activation`, avec un code d'activation (`identifications.controller.ts:350-359`). Mais : aucun SMS ne porte de code (seul « enrôlement en cours », `feedbak-sms.constants.ts:2-3`), le code expire au bout de 30 min (`activation.service.ts:9`) et **aucune route ne permet d'en réémettre un**. En cas d'échec, l'acteur orphelin reste créé ACTIF avec le secret `<mot de passe acteur par défaut>` | Créer une route de réémission bornée à la zone. Rendre le nettoyage d'échec atomique. Jouer le parcours une fois en vrai |
| Activation par la marchande (`/activation` → `POST /auth/activer`) | ✅ | `ActivationScreen.tsx:82`, `authService.ts:96-108`, `activation.service.ts:56-90` (code à usage unique, `<mot de passe acteur par défaut>` et `1234` refusés). Le login est refusé tant que le compte n'est pas activé (`auth.service.ts:269`, `jwt.strategy.ts:36`) | — |
| Skill `identifier` (chemin J0 de GO-PILOTE) | 🔴 | Elle passe par `POST /auth/signup` public, ce qui donne un compte **ACTIF avec `<mot de passe acteur par défaut>`**, sans SMS ni activation (`auth.controller.ts:63-83`, `auth.service.ts:114-146`). C'est contraire au « recevoir le code par SMS » de `GO-PILOTE-JULABA.md:101` | Décision de Patrick : retirer `<mot de passe acteur par défaut>` de la signup publique, ou interdire ce chemin pour J0 |
| Création d'identificateur + PIN par SMS (SEC-08) | ✅ | `backoffice-users.service.ts:275-317` : PIN tiré par `randomInt`, stocké chiffré, envoyé par SMS, jamais rendu | — (AUTH-RECOVERY-01 reste ouverte) |
| Vérification du PIN identificateur avant soumission | 🟡 | Contrôle uniquement côté interface (`FicheIdentificationDynamique.tsx:1483,1635-1660`). `create-with-acteur` ne vérifie aucun PIN | Vérifier le PIN côté serveur, ou assumer explicitement que c'est un contrôle d'interface |
| Contrôle de rôle sur `create-with-acteur` | 🟠 | Seul `JwtAuthGuard` est posé (`identifications.controller.ts:20`). Il n'y a aucun contrôle de rôle, donc **une marchande ou une institution peut enrôler des comptes** | `@Roles('identificateur','operateur_terrain',…)` |
| Auto-validation d'un dossier par l'identificateur | 🟠 | `PATCH /identifications/:id` autorise `statut` au propriétaire non-admin (`identifications.controller.ts:485-503`) : il peut passer son propre dossier à `valide`, ce qui déclenche le SMS de validation | Retirer `statut` des champs autorisés pour un non-admin, ou restreindre à `en_attente` |
| Cloisonnement par zone (identificateur) | 🟡 | ✅ Zone imposée à la création (`:322-326`), sur PATCH users (`users.controller.ts:276-281`) et sur `debloquer-pin` (`auth.controller.ts:296-298`). ❌ Lecture nationale via `by-phone`, `users/:id` (n'importe quel rôle, y compris admin) et `search-identificateur` (aucun filtre de zone, `users.service.ts:286-301`). Un identificateur sans zone n'impose aucune zone | Borner les lectures, rendre la zone obligatoire pour un identificateur |
| Missions (Dashboard identificateur) | ❌ | `GET /missions` exige `@Roles('super_admin','admin','institution')` (`missions.controller.ts:14-16`), donc 403 pour l'identificateur. Le front lit `missions` alors que le back renvoie `data` (`missions-api.ts:40-41`). `PATCH /missions/:id/progres` n'existe pas | Ouvrir à l'identificateur et corriger la forme (hors pilote ?) |
| Suivi / historique acteur | ❌ | `GET /users/:id/historique` est `@Roles('super_admin')` (`users.controller.ts:217`), donc 403 pour l'identificateur. L'erreur est avalée et la liste reste vide (`SuiviIdentifications.tsx:183-187`, `ActeurDetails.tsx:163`) | Ouvrir l'historique en lecture bornée à la zone |
| Stats / Rapports identificateur | 🟡 | Calculés côté client sur la **première page de 50** (`identifications-api.ts:56`). La commission vaut toujours null/0 (aucun code ne la renseigne) | Créer un endpoint de stats serveur |
| ONECI (`/oneci/lookup/:nni`) | 🟠 | Ouvert à tout rôle authentifié (`oneci.controller.ts:4-8`). Le NNI n'est pas validé et est concaténé dans l'URL distante (`oneci.service.ts:25`). Quand toutes les réponses sont des erreurs, le service renvoie `found:true` en « bac à sable » (`:30-31`) | Restreindre aux rôles terrain, valider `^\d{11}$`, traiter le cas tout-erreurs comme introuvable |
| Mutation de zone (identificateur) | ✅ | `DemandeMutation` → `POST /mutations` (`mutations.controller.ts:71-112`) | `zoneActuelleId` vient du client, à prendre côté serveur |
| **Coopérative — liste/gestion des membres** | ❌ | Le back renvoie `id` = **id user** (`cooperatives-rest.controller.ts:120-127`). Les actions statut/rôle/suppression cherchent l'**id d'adhésion** (`:503,517,538`), donc 404 « Membre introuvable » (`Membres.tsx:169,408,439,530`) | Renvoyer `adhesion_id` et l'utiliser dans le front |
| Coopérative — CooperativeContext (membres) | ❌ | Mauvais mapping : nom, prénom et téléphone vides (`CooperativeContext.tsx:170-172` lit `m.marchand?.last_name`), `actif` construit sur le statut **user** et non sur l'adhésion (`:166`), `montantCotisation: 25000` en dur (`:176`) | Aligner sur `mapApiMembreRowToMembre` |
| Coopérative — contrôles d'accès inline (26 routes) | 🟠 | `resolveUserCooperative` (`:57-70`) n'applique **aucun filtre statut/actif**. Une adhésion « en_attente » créée par `rejoindre/:id` (n'importe quel utilisateur, n'importe quel id) donne accès à la trésorerie, à la liste des membres (PII), au stock, à la **distribution du stock commun** (aucun contrôle président, `:669-760`), à la **cotisation auto-validée** (`:819-842`) et à la modification des besoins (`:342-374`). `besoins/consolider` accepte un `cooperative_id` venu du client (`:385`) : écriture possible dans une autre coopérative | Filtrer `statut='actif' AND actif=true`, exiger le rôle président sur les écritures, supprimer `body.cooperative_id` |
| `ma-cooperative` sans `actif=true` (JULABA_DECISIONS §10) | 🟡 toujours vrai | `cooperatives-rest.controller.ts:411-427` : dernière adhésion triée par `date_adhesion` (et non par `created_at` comme l'écrit §10), sans filtre `actif`. Le résolveur canonique filtre bien `actif = true` (`cooperative-resolver.service.ts:21`) | Le réconcilier comme indiqué dans §10 ; le résolveur privé du contrôleur doit l'être aussi |
| Coopérative — trésorerie président (POST, PATCH valider/annuler) | ✅ | Contrôle président appliqué (`:194-240`) | — |
| Coopérative — commandes groupées | ⏳ | Neutralisées, renvoient `[]` / `persisted:false` (`:548-571`) | Hors pilote |
| **Institution — accès aux données** | ❌ | `InstitutionScopeGuard` est fail-closed tant qu'aucune ligne `institutions.responsable_id = user.id` n'existe (`institution-scope.guard.ts:68-83`). **Aucun chemin produit ne crée ce lien** : la signup refuse le rôle `institution` (`auth.service.ts:54-60`), la création BO de l'utilisateur ne crée pas de ligne `institutions`, et `POST/PATCH /institutions` n'acceptent pas `responsable_id` (`institutions.controller.ts:53,76`). Résultat : **403 sur tout `/institution/*`**, que l'interface affiche comme des zéros | Ajouter un rattachement responsable/zone côté BO |
| Institution — `/admin/analytics/{roles,produits,graphique,alertes}`, `/admin/config` | ❌ | Ces routes n'existent pas (absentes de routes.tsv, `calls.tsv` = MISSING). `/admin/analytics` existe mais est `@Roles('ADMIN')`, donc 403 pour `institution` (`admin-analytics.controller.ts:10-11`). `/audit` est `@Roles('ADMIN')` (routes.tsv:58). Toutes les erreurs sont avalées en `[]` / 0 (`InstitutionContext.tsx:119-184`) | Supprimer `InstitutionContext` (code mort côté écrans principaux) ou créer des routes `/institution/*` |
| Institution — chemins de InstitutionLayout | ✅ routes / 🟠 garde | Tous existent dans `routes.tsx:129-138`. Mais le module `audit` du menu n'est **pas** dans la liste en dur `'audit-trail'` (`InstitutionAccessContext.tsx:26-29` contre `InstitutionLayout.tsx:33`) : l'onglet Audit est masqué et `/institution/audit-trail` affiche « Accès restreint » | Aligner les clés et lire les modules réels |
| Institution — graphiques | 🟡 démo | `DATA_EVOLUTION` est **en dur** (Sep→Mar, 9 287 tx, `useInstitutionData.ts:21-29`) sur Home et Dashboard. L'« évolution des inscriptions » est fabriquée à partir du total × (0,4 + 0,1·i) (`Analytics.tsx:61-72`) | Retirer ou alimenter avec de vraies séries |
| Institution — actions (suspendre acteur, valider tx) | ❌ | `PATCH /acteurs/:id` exige super_admin, admin_general ou identificateur. `PATCH /transactions/:id` exige super_admin, admin_general ou admin_national. Les deux renvoient 403 pour `institution` (routes.tsv) | Retirer les boutons, ou prévoir des routes institution scopées |
| Institution — BO suspendre/supprimer | ❌ (BO) | `PATCH {statut}` et `DELETE /institutions/:id` écrivent `statut`, **colonne absente de l'entité** (`institution.entity.ts:3-14`). TypeORM 0.3.31 lève alors `EntityPropertyNotFoundError` (`node_modules/typeorm/query-builder/UpdateQueryBuilder.js:307-309`), d'où une erreur 500. `InstitutionLayout` ne reçoit donc jamais `statut='suspendu'` | Ajouter la colonne `statut` ou passer par `actif` |

---

## 2. Détail par module

### 2.1 Identificateur

**Routes et menu.** Les routes sont déclarées dans `routes.tsx:153-176`, sous `IdentificateurLayout`. Le menu est défini dans `config/roleConfig.ts:368-371` : Accueil, Acteurs (`/identifications`), Suivi (`/rapports`), Moi. `IdentificateurLayout.tsx` ne contrôle pas le rôle (le rôle est garanti par `checkRouteAccess` et par le back). Ce layout monte aussi `CaisseProvider`, `ProducteurProvider` et `CooperativeProvider` (`:20-24`), ce qui déclenche des appels coopérative et caisse inutiles avec la session de l'identificateur.

**Parcours d'enrôlement J0, de bout en bout (lecture du code)**
1. **Création de l'identificateur.** Elle passe par `POST /users/backoffice/create` (super_admin, admin_general, admin_national, gestionnaire_zone). Le compte est créé `en_attente_activation` et un code d'activation est renvoyé au créateur BO (`backoffice-users.service.ts:181-191,271-273`). Le PIN est envoyé par SMS (SEC-08 ✅). La zone est obligatoire sauf si le créateur est super_admin (`:142-149`).
2. **Formulaire.** `FicheIdentificationDynamique.tsx` (5 753 lignes) enchaîne : brouillons (`POST /identifications/draft`), divisions administratives, ONECI, `verify-pin` (`:1639`), puis `POST /identifications/create-with-acteur` (`:1837`), l'upload de la photo `POST /users/:id/photo` et le PATCH de l'e-mail.
3. **Côté serveur** (`identifications.controller.ts:295-483`) : liste blanche des rôles marchand/producteur/cooperateur ✅, zone imposée si l'identificateur en a une ✅, puis `authService.signup()`. **Le commentaire l. 328-331 est faux** : `signup` ignore `acteurData.password` et pose `bcrypt('<défaut>')` avec le statut ACTIF (`auth.service.ts:111-146`). Le statut ne passe à `en_attente_activation` qu'ensuite, dans une transaction **séparée** (`:350`). Le compte reste donc loginable avec `<mot de passe acteur par défaut>` pendant la fenêtre entre les deux commits.
4. **Chemin d'échec 🔴.** `signup` crée aussi le wallet (`auth.service.ts:181`) hors transaction. Le nettoyage `DELETE FROM users` (`identifications.controller.ts:452-461`) se heurte à la FK `wallets.user_id → users.id` sans `ON DELETE CASCADE` (`BaselineSchema.ts:1117-1118`, `wallet.entity.ts:44-45`). L'acteur orphelin reste donc **ACTIF avec `<mot de passe acteur par défaut>`**, la mise à jour de statut ayant été annulée par le rollback, et son numéro est bloqué (409 à la ré-inscription). Ce résultat vient de la lecture du code, il n'a pas été reproduit (base interdite).
5. **Code d'activation.** Il est renvoyé à l'identificateur et affiché une fois avec un bouton « copier » (`FicheIdentificationDynamique.tsx:1863-1865,2115-2140`). Aucun SMS ne le transmet. Il expire au bout de 30 min (`activation.service.ts:9`). `issueForUser` n'a que deux appelants, `create-with-acteur` et la création BO : **il n'existe aucune réémission**. Pourtant le commentaire front (`:1859-1861`) suppose qu'« un identificateur réémet ». Code perdu ou expiré = compte bloqué pour toujours et numéro brûlé.
6. **Activation.** `/activation` → `POST /auth/activer` ✅ (secret ≥ 4, `<mot de passe acteur par défaut>` et `1234` interdits, consommation atomique).
7. **SMS.** À la soumission, le SMS dit « enrôlement en cours, réponse sous 48h » (`feedbak-sms.constants.ts:2-3`). À la validation BO, `PATCH /identifications/:id` choisit le bon gabarit selon la présence d'une ligne `activation_codes` (`identifications.controller.ts:522-545`) ✅.

**Tests.** `p0-activation.spec.ts` construit l'utilisateur **directement en base** (`:40-44`) : `create-with-acteur` n'est jamais testé par HTTP. `p0-activation-backoffice.spec.ts` couvre le chemin BO. `m6-m8-role-escalation.spec.ts` couvre `signup` et `create-acteur`. Aucun test ne vérifie le chemin d'échec, ni qu'une marchande soit refusée sur `create-with-acteur`.

**Autres écrans**
- `IdentificateurHome` : `GET /identifications/drafts/:id` (contrôle propriétaire ✅, mais il renvoie 200 `{success:false}` au lieu d'un 403, `:146-148`) et `search-identificateur` (national).
- `Identifications`, `ActeurDetails`, `ModalEditerActeur` : `GET /users/:id`. Le back renvoie `horsZone`, c'est une consultation nationale de **tout** utilisateur, admins compris (`users.controller.ts:239-258`). `ActeurDetails` appelle `/identifications?acteur_id=`, filtre ignoré par le back (`:91-124`). `debloquer-pin` est borné à la zone ✅.
- En mode complément, le PATCH `/users/:id` envoie `firstName`/`lastName`, qui ne figurent pas dans les champs autorisés pour un identificateur (`users.controller.ts:291-292`) : ces champs sont **ignorés en silence**.
- `IdentificateurDashboard` : `getMissionsActives` vaut toujours `[]` (403 + forme `missions` contre `data`).
- `SuiviIdentifications` : historique en 403, avalé (`:183-187`). La commission affichée vaut toujours 0.
- `RapportsIdentificateur`, `IdentificateurStats` : calculs client sur 50 dossiers au maximum.
- `IdentificateurPinChangeSection` : `POST /auth/identificateur/me/change-pin` ✅ (verrou `verrou-pin.ts`, SEC-07).
- `IdentificateurProfil` / `Parametres` : composants universels.
- `GET /identifications/geo` : le non-admin ne voit que ses propres points ✅. `gestionnaire_zone` y est traité en admin **sans zone**, alors que `GET /identifications` le traite en non-admin (`:52` contre `:95`), ce qui est incohérent.

### 2.2 Coopérative (hors pilote, GO-PILOTE:137)

**Routes.** `routes.tsx:109-125` sous `AppLayout`. `constants.test.mts` est vert.

**Backend `cooperatives-rest.controller.ts`.** `@UseGuards(JwtAuthGuard, RolesGuard)` est posé sur la classe (`:19`). Seuls `POST` et `PATCH /cooperatives` portent un `@Roles`. Toutes les autres routes reposent sur `resolveUserCooperative` (`:57-70`) : responsable (président), sinon **première adhésion trouvée, sans filtre de statut ni d'`actif`**.

Contrôles inline vérifiés :
- **Président requis ✅** : POST membres, POST/PATCH trésorerie, search-marchand, PATCH statut/rôle et DELETE membres.
- **Simple « membre » suffit, adhésion en attente comprise ⚠️** : GET membres (renvoie l'entité User complète moins les champs d'authentification, donc NNI, CNPS, date de naissance…), GET trésorerie, GET/POST/PATCH besoins, `consolider`, GET stock, `stock/apport`, **`distribution`** (décrémente le stock commun au profit de n'importe quel `membreId`, sans contrôle d'appartenance), **`cotisation`** (insère une entrée trésorerie `validee` sans aucun paiement).
- **Tout utilisateur authentifié** : `rejoindre/:id` (aucune vérification d'existence ou d'`actif` de la coopérative), `GET /cooperatives/:id` (n'importe quelle fiche), `liste`, `mes-distributions` (filtré sur soi ✅), `commandes/:id/cloture` (acheteur = soi ✅).
- `PATCH /:id` : un cooperateur qui n'est pas propriétaire reçoit `{affected:0}` (ce n'est pas un 403).

**Front.**
- `Membres.tsx` charge sa propre liste avec un mapping correct des noms (`:156-190`). En revanche **toutes les actions utilisent `m.id` = id user** et reçoivent 404. Conséquence : suspendre, réactiver, refuser, exclure ou changer le rôle **ne fonctionne jamais**. Le rollback optimiste affiche une « Erreur réseau » qui induit en erreur.
- `CooperativeContext.loadMembres` : nom, prénom et téléphone vides, statut et `actif` tirés du statut user. Conséquences : `pendingBesoinsCount` vaut toujours 0 (`CooperativeHome.tsx:37`) et les « membres actifs » sont faux.
- `loadCooperative` lit des champs inexistants (`president_id`, `solde_tresorerie`).
- Trésorerie, Finances et Stock lisent de vraies routes. MarcheHub et Commandes appellent des routes existantes (`calls.tsv` OK), sans audit approfondi (hors pilote).

### 2.3 Institution

**Routes front.** `/institution`, `analytics`, `acteurs`, `supervision`, `parametres`, `profil`, `dashboard`, `dashboard-analytics` et `audit-trail` existent tous (`routes.tsx:129-138`). Les « MISSING » de `calls.tsv` pour `InstitutionLayout` sont des faux positifs (chemins de navigation).

**Garde front.** `InstitutionLayout.tsx:317` exige `user.role === 'institution'` ✅. Les modules viennent d'une liste **en dur** (`InstitutionAccessContext.tsx:26-29`) et non de `institutions.modules`. Cette liste contient `'audit-trail'` alors que le menu teste `'audit'`, ce qui masque l'Audit. `institutionProfil.statut` n'est jamais renseigné, donc l'écran « suspendu » est inatteignable.

**Données.** La source principale est `useInstitutionData` → `GET /institution/dashboard|acteurs|transactions` (`institution-dashboard.controller.ts`). Ces routes font de vraies requêtes TypeORM, filtrées par zone pour le rôle `institution` (isolement testé par `institution-isolation.spec.ts`, qui **insère le lien `institutions` en SQL**, `:86`). Mais :
- Aucun chemin produit ne crée le lien `responsable_id` ni ne permet de le poser. Le compte institution reçoit donc 403 partout, et le hook avale l'erreur : `catch → setError` puis zéros affichés (`useInstitutionData.ts:55-67`).
- `/institution/transactions` exige le module `transactions`, alors que le menu Supervision teste `supervision`.
- Le back calcule sur 5 000 users et 10 000 tx en mémoire, `croissanceMensuelle: 0` et `alertesCritiquesActives: 0` en dur (`:122,126`). Les erreurs sont avalées en zéros (`:134-152`).
- `DashboardAnalytics` → `InstitutionContext` : appels vers 5 routes inexistantes et 2 routes ADMIN interdites, tout est avalé.
- `getDonneesGraphique('30j' as unknown as number)` est un abus de type (`DashboardAnalytics.tsx:74`).
- `AuditTrail` → `/audit` en 403. `InstitutionSupervision` lit `useAudit().logs`, même 403.
- `InstitutionProfil` / `Parametres` : composants universels.
- `useInstitutionPermissions` lit `institution`, qui n'est **jamais** alimenté (aucun appel `setInstitution`), donc vaut toujours `DEFAULT_INSTITUTION_PERMISSIONS`.

**Backend `institutions.controller.ts`.** GET est filtré sur soi pour `institution` ✅. POST et PATCH ont une liste blanche, mais `description`, `adresse`, `telephone`, `email`, `logo` et `statut` ne sont pas des colonnes : à la création ils sont ignorés silencieusement par `create()`, à la mise à jour ils provoquent une 500. `DELETE` provoque toujours une 500 (`statut`). Note annexe (BO) : `boGetCooperatives` et `boCreateCooperative` appellent `/institutions` (`backoffice-api.ts:744-778`).

---

## 3. Top problèmes (par gravité)

🔴 **Argent / sécurité**
1. **Le J0 marchande via la skill `identifier` donne un compte ACTIF avec `<mot de passe acteur par défaut>`, sans SMS** (`auth.controller.ts:63-83`). C'est le takeover que l'ADR-002 a fermé sur `create-with-acteur`, toujours ouvert sur la signup publique, et c'est le chemin que GO-PILOTE désigne pour J0.
2. **Chemin d'échec de `create-with-acteur` : un orphelin ACTIF avec `<mot de passe acteur par défaut>` survit**, car le nettoyage échoue sur la FK wallet (`identifications.controller.ts:452-461` + `BaselineSchema.ts:1117`). Le chemin nominal a lui aussi une fenêtre ACTIF/`<mot de passe acteur par défaut>` entre deux commits, et le commentaire « secret aléatoire » (`:328-331`) est faux.
3. **Coopérative : une adhésion « en_attente » permet d'auto-valider des cotisations** (entrées trésorerie `validee` sans paiement, `:819-842`) **et de distribuer le stock commun** à n'importe quel id (`:669-760`). `consolider` écrit dans une autre coopérative (`:385`). Ce domaine est hors pilote mais sensible à l'argent.

🟠 **Cassé / sécurité moyenne**
4. Pas de réémission du code d'activation (TTL 30 min) : marchande bloquée et numéro brûlé.
5. `create-with-acteur` n'a pas de contrôle de rôle (n'importe quel compte connecté enrôle).
6. `PATCH /identifications/:id` : l'identificateur peut valider son propre dossier (`statut` autorisé).
7. Profil Institution non fonctionnel de bout en bout : impossible de rattacher compte et institution, d'où 403 partout, affiché comme des zéros. Plus des routes `/admin/analytics/*` et `/admin/config` inexistantes, et `/admin/analytics` et `/audit` interdits.
8. Gestion des membres de coopérative cassée : confusion id user / id d'adhésion, 404 sur toutes les actions.
9. Identificateur : missions (403 + forme) et historique acteur (403) cassés, erreurs avalées.
10. Lectures PII nationales : `search-identificateur`, `by-phone`, `users/:id` (identificateur, institution) ; GET membres de coopérative (NNI/CNPS à tout membre, même en attente) ; ONECI ouvert à tous les rôles avec un NNI non validé.
11. BO : `PATCH statut` et `DELETE` institution en 500 (colonne `statut` absente).

🟡 **Partiel / démo**
12. Institution : `DATA_EVOLUTION` en dur, courbe d'inscriptions fabriquée, onglet Audit masqué (clé `audit` contre `audit-trail`), modules en dur, statut « suspendu » inatteignable.
13. `ma-cooperative` et le résolveur privé du contrôleur sans `actif=true` (§10 toujours vrai, et plus large que ce que §10 décrit).
14. Stats identificateur limitées à 50 dossiers ; commission jamais renseignée.
15. Vérification du PIN identificateur uniquement dans l'interface.
16. `CooperativeContext` : noms vides, `actif` faux, 25 000 en dur.

---

## 4. À DÉFINIR

- **Chemin J0 officiel** : skill `identifier` (signup publique, `<mot de passe acteur par défaut>`) ou fiche identificateur (`create-with-acteur`, code d'activation) ? GO-PILOTE:101 mentionne « code par SMS », ce qu'aucun des deux ne fait. À trancher par Patrick.
- **Transmission du code d'activation** : seulement à l'écran de l'identificateur (assisté), ou aussi par SMS ? Quelle procédure si le code est perdu ou expiré ? Aucune n'existe.
- **Chemin d'échec FK wallet** : à confirmer par un test d'invariant (je ne pouvais pas toucher la base 55432). La FK est prouvée dans la migration de référence ; reste à vérifier qu'elle existe aussi sous DbInit/synchronize en production.
- **Lien compte institution ↔ fiche `institutions`** : quel écran BO doit poser `responsable_id` et `zone_id` ? BO-02 (`BOConfigInstitution` `isBackendReady=false`) est voisin.
- **Le rôle `institution` doit-il avoir des actions** (suspendre un acteur, valider une transaction) ou seulement la lecture ? Les boutons sont présents dans l'interface mais renvoient 403.
- **ONECI** : rôles autorisés et coût du quota, à définir. Le cas « toutes erreurs → `found:true` bac à sable » est-il voulu en production ?
- **`users/:id` lisible par l'identificateur sur tout le territoire** (admins compris) : l'intention « consultation hors zone » (`messageZone`) couvre-t-elle aussi les comptes BO ?
