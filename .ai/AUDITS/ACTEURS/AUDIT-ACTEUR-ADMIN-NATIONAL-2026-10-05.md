# AUDIT ACTEUR — ADMIN-NATIONAL — 2026-10-05

## 1. Identité et périmètre

- **Rôle audité** : admin_national (UserRole.ADMIN_NATIONAL, user.entity.ts:25) — back-office national.
- **Famille BO** : super_admin, admin_general, admin_national, gestionnaire_zone, operateur_terrain (auth.service.ts:40, bo-autorisation.ts:22, BORoot.tsx:17-23).
- **Périmètre couvert** : frontend frontend/src/app/components/backoffice/** (BORoot, BOLayout, BOLogin, écrans BO*, universal/), routes routes.tsx:188-222 ; backend backend/src/{admin,users,user-flags,mutations,notifications,tickets-rest,audit-rest,transactions-rest,identifications,auth} ; garde serveur bo-autorisation.ts ; journal d'audit ; a11y écrans BO.
- **Sonde runtime** (5 appels lecture seule, backend :3001) : /api/v1/admin/stats et /api/v1/users **sans token → 401** ; token Awa Koné (marchande) obtenu → mêmes endpoints **403** « Rôle requis: ADMIN ». Aucune écriture.
- **Audit précédent relu** : AUDIT-ACTEUR-ADMIN-NATIONAL-2026-09-28.md — générique, statut « À RECETTER ». Verdict §7 infra.

## 2. Fonctionnalités observées dans le code

**Frontend (routes BO routes.tsx:188-222)** — réservations constatées :
- **Ouvertes à admin_national par défaut** (menu BOLayout.tsx:78-184 + hasPermission BackOfficeContext.tsx:760-768) : dashboard, acteurs (read/write/suspend), enrôlement (+validate), supervision (+write/freeze), zones (+write), carte, modération (+write), mutations (+décision), academy (read), missions (+write), audit & logs (read), support, notifications, profil.
- **Masquées par superOnly** (BOLayout.tsx:136-138,150-154) : utilisateurs BO, institutions, config-institution, monitoring-ia, event-monitor, analytics, score-financier, api-keys — **gardées aussi côté client** par garde role !== 'super_admin' dans BOInstitutions.tsx:363, BOAnalyticsProduit.tsx:19, BOApiKeys.tsx:78, EventMonitor.tsx:48, BOScoreFinancier.tsx:303, BOMonitoringIA.tsx:17, BOConfigInstitution.tsx:116. **Exception : BOUtilisateurs (§ ADMINNAT-02).**
- **Rapports** : entrée limitée roles: ['admin_general'] (BOLayout.tsx:155) — admin_national exclu du menu mais la route reste montée.
- **Keiwa Wallet** : permission: null → visible de tout rôle BO (BOLayout.tsx:120-127), sans garde dans BOKeiwa (§ ADMINNAT-06).

**Backend** — actions sensibles du rôle :
- Acteurs : liste/détail/patch/delete (users.controller.ts:43-52, 240-338, 475-487), flags/signalements (user-flags.controller.ts), doublons (:96-107).
- Enrôlement : lecture globale + validation/rejet dossier (identifications.controller.ts:91-137, 485-577).
- Supervision : transactions all/geo/export + gel/annulation/litige (transactions-rest.controller.ts:49-125).
- Mutations de zone : décision approbation/rejet (mutations.controller.ts:113-227).
- Wallet (Keiwa) : consultation, blocage/déblocage ; crédit/débit/réinit **refusés** (super_admin, J5).
- Support : tickets (tickets-rest.controller.ts:17 ROLES_BO inclut admin_national).
- Communication : **non autorisé** (send/send-bulk excluent admin_national, notifications.controller.ts:93, 141).

## 3. Constats détaillés

### ADMINNAT-01 [P2] — Trois matrices de permissions divergentes (front, serveur, registre)

Les défauts du rôle sont définis 3 fois et diffèrent : BO_SCREEN_PERMISSIONS front (BackOfficeContext.tsx:189-194), DEFAUTS_PAR_ROLE serveur (bo-autorisation.ts:24-29), registre BO_PERMISSION_TREE/ROLE_SCOPES (bo-permissions.ts:418-459) explicitement « non branché » (bo-permissions.ts:14-15). Exemple concret : DEFAUTS_PAR_ROLE.admin_national contient utilisateurs.read et parametres.read (bo-autorisation.ts:26) alors que le registre marque ces modules superOnly (bo-permissions.ts:351,367) et le menu les cache. Preuve : bo-autorisation.ts:26 vs bo-permissions.ts:351 vs BOLayout.tsx:136-138. Impact : l'écran et le serveur peuvent diverger silencieusement ; périmètre réel du rôle dépend du fichier lu.

### ADMINNAT-02 [P1] — La liste des comptes BO est lisible par admin_national (URL directe)

/backoffice/utilisateurs n'a aucune garde d'écran (BOUtilisateurs.tsx:579-605 ne masque que les boutons via canCreate/canDelete), et GET /users?scope=bo est ouvert à @Roles('ADMIN') (users.controller.ts:43-52) avec scope=bo servi au rôle BO (users.service.ts:229-233). Un admin_national naviguant vers l'URL voit prénoms, noms, téléphones, e-mails, rôles, statuts et boPermissions de tous les comptes BO (hors super_admin, filtré côté service :214-216) — contredit l'intention « seul le super_admin gère les comptes du back-office » (bo-autorisation.ts:16-18) et le masquage superOnly du menu. Preuve : BOUtilisateurs.tsx:579-605 ; users.controller.ts:43-52 ; backoffice-api.ts:1032-1038. Impact : fuite d'annuaire BO (cibles privilégiées pour hameçonnage/SMS), incohérence écran/serveur.

### ADMINNAT-03 [P2] — J6 non généralisé : routes sensibles sans exigerPermissionBO

La couche permission serveur ne couvre que PATCH/DELETE /users, PATCH /acteurs, wallets bloquer/débloquer (en-tête bo-autorisation.ts:4-7, « la généralisation … relève de BO-3 »). Hors de la couverture : PATCH /transactions/:id (gel/annulation — @Roles seul, transactions-rest.controller.ts:71-72), PATCH /identifications/:id (enrolement.validate non vérifié, identifications.controller.ts:485-511), PATCH /marches/:id (marches.controller.ts:140). Un compte admin_national dont boPermissions={} (objet vide = fait foi, bo-autorisation.ts:49-52) garde donc tous ces pouvoirs sans passer par la matrice. Preuve : transactions-rest.controller.ts:71-72 ; identifications.controller.ts:485-493 ; bo-autorisation.ts:4-7. Impact : contournement matriciel plausible via boPermissions vide ; échec des recettes « action interdite via API directe ».

### ADMINNAT-04 [P2] — Validation/rejet d'enrôlement sans trace d'audit et statut libre

PATCH /identifications/:id écrit le statut (approbation/rejet national) et déclenche les SMS mais n'insère AUCUNE ligne audit_logs (identifications.controller.ts:524-577) ; statut accepte n'importe quelle valeur (aucune allow-list, :494-511). DELETE brouillon super_admin est audité (:618-624) mais la validation ne l'est pas. Preuve : identifications.controller.ts:524-577 (aucun appel auditService). Impact : action sensible nationale non traçable (contrat audit de recette non tenu) ; statut corruptible silencieusement.

### ADMINNAT-05 [P2] — Écriture d'audit ouverte : un admin peut forger le journal

POST /audit est @Roles('ADMIN') (classe audit-rest.controller.ts:12) donc accessible à admin_national, avec action libre et IP fournie par le client (create-audit-log.dto.ts:7-27, ip optionnel non déduit du socket). Lecture globale GET /audit également ouverte (identique au droit audit.read du rôle, cohérent), mais l'écriture client autorisée dégrade la valeur probante du journal. Preuve : audit-rest.controller.ts:30-31. Impact : pollution/contrefaçon de la piste d'audit par un compte compromis ; forensic fragilisé.

### ADMINNAT-06 [P2] — Keiwa BO : actions mortes exposées et export CSV de PII non audité

L'écran BOKeiwa n'a ni garde de rôle ni hasPermission ; Créditer/Débiter/Réinitialiser s'affichent pour admin_national et échouent 403 (serveur J5 correct, admin-wallets.controller.ts:83-116). GET /admin/wallets/export/csv renvoie téléphone complet de tous les détenteurs (admin-wallets.service.ts:428-441) sans masquage (pas de masquerTelephone) ni ligne audit d'export. Preuve : BOLayout.tsx:120-127 ; BOKeiwa.tsx:266-392 (aucun role === dans le fichier) ; admin-wallets.service.ts:428-441. Impact : exposition PII massive exportable par admin_national, sans trace ; UX trompeuse (boutons morts).

### ADMINNAT-07 [P2] — Stubs BO servent encore des données fabriquées

GET /admin/moderation → signalements [] codés en dur (admin-analytics.controller.ts:132-133) alors que les vrais signalements sont dans user-flags ; GET /admin/rapports → 2 « rapports » fictifs (:118-130) ; GET /admin/scores → score 0 pour tous (:165-174) ; GET /admin/communication → [] (:154-155) ; GET /admin/health → tts/stt « up » affirmés (:176-179). BOModeration utilise heureusement /marches réels ; BOConfigInstitution déclare isBackendReady=false (BOConfigInstitution.tsx:130). Le constat « P2 stubs BO » de l'audit du 28/09 reste donc VALABLE. Preuve : admin-analytics.controller.ts:118-179 ; contredit la doctrine zéro-faux-zéro (etatSectionsBO.ts:10-28). Impact : dès qu'un écran se rebranche sur ces endpoints, une panne se lit « tout va bien ».

### ADMINNAT-08 [P2] — DDL dans une route métier livrée à admin_national

PATCH /admin/livraison/:id/assign exécute ALTER TABLE commandes ADD COLUMN IF NOT EXISTS livreur à chaque appel, sans audit, sous @Roles('ADMIN') (admin_national inclus) (admin-analytics.controller.ts:138-152) ; la liste livraisons associée est un stub (:135-136). Preuve : admin-analytics.controller.ts:138-152. Impact : migration de schéma déléguée au runtime, action d'écriture hors matrice, non tracée.

### ADMINNAT-09 [P3] — Couleurs hardcodées généralisées dans le BO

~390 hexadécimaux littéraux dans les écrans BO (BOMutations 15, BOMissions 23, BOSupport 35, BOAudit 12-42, BOLayout SIDEBAR_MENU :93/109/123/149/164, FicheIdentificationDynamiqueBO 195…), contre la règle DESIGN_SYSTEM §9 ; bo-theme.ts existe mais le garde charte (caisseCharte/authCharte) n'a pas d'équivalent BO. Universal/*BO est exempt (0 hex détecté). Preuve : BOAudit.tsx:15-23,35-42 ; BOMutations.tsx (15 littéraux) ; BOLayout.tsx:93-176. Impact : dérive visuelle, mode sombre/soleil non garantis sur le BO.

### ADMINNAT-10 [P3] — A11y BO : cible 32 px, modale custom sans focus trap, console.* en prod

Bouton « Fermer » d'UniversalModalBO 32×32 px (UniversalModalBO.tsx:162) < cible 44 px (ACCESSIBILITY_GUIDE §4.6) ; la modale « mot de passe oublié » de BOLogin est custom (role=dialog sans focus trap ni ESC, BOLogin.tsx:554-583) ; 58 console.* dans 10 fichiers BO (BOLogin 1, BOInstitutions 4, FicheIdentificationDynamiqueBO 34…) alors que le robinet warnDev (AUTH-14) n'a pas été étendu au BO. Points conformes : modales Universal Radix (UniversalModalBO.tsx:86-113 : aria-modal, ESC/geste configurable, focus trap natif), BOLogin entièrement labellisé (labels htmlFor, autocomplete username/current-password, role=alert :443, aria-pressed :433). Impact : a11y AA partiellement tenue sur le BO (cible et clavier de la modale de secours).

### ADMINNAT-11 [P3] — Superset serveur : freeze/suspend accordés par défaut au rôle

DEFAUTS_PAR_ROLE.admin_national inclut acteurs.suspend et supervision.freeze (bo-autorisation.ts:26) alors que la matrice de défauts visuelle les laisse décochés (bo-permissions.ts:453-456 « périmètre sauf les deux actions sensibles »). Les routes serveur ne vérifient pas ces clés (§ ADMINNAT-03) : le défaut serveur fait foi. Preuve : bo-autorisation.ts:26 vs bo-permissions.ts:453-456. Impact : pouvoir de gel national actif par défaut, plus large que la maquette validée.

### ADMINNAT-12 [P3] — Création de super_admin sans trace

POST /auth/create-super-admin est bien réservé super_admin (auth.controller.ts:822-825) mais n'écrit aucune ligne audit et ne force pas mustChangePassword (:826-840). Preuve : auth.controller.ts:822-840. Impact : l'élévation la plus critique du système n'est pas journalisée.

### ADMINNAT-13 [P3] — Échecs de lecture d'audit transformés en « aucun log »

boGetAuditLogs avale toute erreur et retourne [] (backoffice-api.ts:1021-1028) ; BOAudit affiche alors un journal vide, contournant le vocabulaire EtatLecture pourtant branché ailleurs (BackOfficeContext.tsx:524-532). Preuve : backoffice-api.ts:1021-1028 ; BOAudit.tsx:46-51. Impact : panne masquée en « vide légitime » sur l'écran de conformité.

### ADMINNAT-14 [P3] — Divergence matrice ↔ routes de communication

Le registre permettrait d'accorder communication.write à admin_national (bo-permissions.ts:420, tout sauf superOnly), mais POST /notifications/send et send-bulk excluent admin_national pour toujours (notifications.controller.ts:93, 141) — écran d'envoi → 403 systématique si la matrice l'accorde. Preuve : notifications.controller.ts:92-94, 140-142. Impact : droit « accordé » côté matrice inopérant ; confusion de recette garantie.

## 4. Risques et vulnérabilités

| ID | Risque | Catégorie | Criticité | Vecteur |
|---|---|---|---|---|
| ADMINNAT-02 | Lecture de l'annuaire des comptes BO par admin_national (URL directe + GET /users?scope=bo) | Fuite de données / autorisation | P1 | Navigateur authentifié admin_national |
| ADMINNAT-03 | Gel/annulation transactions et validation enrôlement hors matrice boPermissions | Autorisation | P2 | boPermissions vide + API directe |
| ADMINNAT-04 | Validation d'enrôlement nationale sans audit, statut non borné | Traçabilité / intégrité | P2 | PATCH /identifications/:id |
| ADMINNAT-05 | Forge d'entrées d'audit par un rôle ADMIN | Intégrité du journal | P2 | POST /audit avec action libre |
| ADMINNAT-06 | Export CSV PII (téléphones) sans masquage ni trace ; boutons morts Keiwa | PII / UX | P2 | GET /admin/wallets/export/csv |
| ADMINNAT-07 | Stubs affirmant des données falsifiées (santé, rapports, scores) | Fiabilité affichée | P2 | GET /admin/{moderation,rapports,scores,communication,health} |
| ADMINNAT-08 | DDL runtime (ALTER TABLE) depuis route métier ADMIN | Robustesse / autorisation | P2 | PATCH /admin/livraison/:id/assign |
| ADMINNAT-01/11 | Matrices divergentes, superset serveur (freeze national par défaut) | Cohérence autorisation | P2/P3 | Comparaison des 3 registres |
| ADMINNAT-09/10 | Couleurs hardcodées, cible 32 px, modale sans focus trap, console.* prod | A11y / charte | P3 | Écrans BO |
| ADMINNAT-12/13/14 | Traçabilité create-super-admin, échecs d'audit masqués, droits communication fantômes | Traçabilité / cohérence | P3 | Endpoints dédiés |

## 5. Points forts

1. **Allow-list fail-closed irréprochable pour l'élévation** : super_admin non créable par signup (auth.service.ts:58,120-123), non présent dans les rôles créables BO (create-admin-user.dto.ts:15-20 ; create-backoffice-account.dto.ts:17-22 ; create-backoffice-user.dto.ts:20-30) ; admin_national explicitement interdit de créer un compte administrateur (backoffice-users.service.ts:110-119) ; POST /users/backoffice-account réservé super_admin (users.controller.ts:190-216).
2. **Hiérarchie BO réelle côté serveur** : exigerAutoriteSur — nul hors super_admin ne touche un compte BO (bo-autorisation.ts:66-71), appliqué sur PATCH/DELETE users et wallets ; pas d'auto-suspension ni d'auto-suppression (users.controller.ts:290-291, 479-481) ; suppression = archivage tracé en transaction (users.service.ts:348-359).
3. **§8.7 PIN/Mots de passe respecté de bout en bout** : PIN né serveur, chiffré, envoyé SMS, jamais rendu ni journalisé (backoffice-users.service.ts:277-320) ; reset admin par SMS sans fragment (auth.controller.ts:705-744, users.service.ts:498-546) ; masquerTelephone (remise-code-bo.ts:19-25) ; aucun endpoint admin n'écrit ni ne lit un PIN.
4. **§8.6 annulation tracée** : gel/annulation transaction = motif ≥5 car + audit TRANSACTION_STATUT_* dans la MÊME transaction + restock ledger append-only (transactions-rest.controller.ts:88-124) ; wallet J5 = mouvement + journal même transaction avec soldes avant/après (admin-wallets.service.ts:242-271, 400-426).
5. **PII technique blindée** : @Exclude sur les 5 champs d'auth (user.entity.ts:231-237) + strip camelCase et stripping snake_case explicite dans findAll (sanitize-user.util.ts:27-35, users.service.ts:100-108).
6. **Récits honnêtes du dashboard** : BO-01/BO-03 — jamais de faux zéro, « tout est en ordre » seulement si vérifié (etatSectionsBO.ts:25-28, 144-147).
7. **Runtime conforme** : 401 sans token / 403 marchand sur /admin* et /users (sondes §1) ; cookies HttpOnly (ADR-002) rappelés à l'écran BO.
8. **A11y des socles** : Universal*BO sur Radix (aria-modal, ESC, focus trap), BOLogin entièrement labellisé, voix d'accueil BO (BOLayout.tsx:1058).

## 6. Recommandations de correction

- **ADMINNAT-02 (P1)** : ajouter à BOUtilisateurs le même garde role !== 'super_admin' → message « réservé » que BOInstitutions (BOInstitutions.tsx:363), OU aligner le serveur : exiger utilisateurs.read par exigerPermissionBO dans GET /users et retirer utilisateurs.read/parametres.read de DEFAUTS_PAR_ROLE.admin_national (bo-autorisation.ts:26). Les deux de préférence.
- **ADMINNAT-03 (P2)** : généraliser J6 (BO-3) — exigerPermissionBO('supervision.freeze'|'supervision.write') dans PATCH /transactions/:id, enrolement.validate dans PATCH /identifications/:id, zones.write dans PATCH /marches/:id.
- **ADMINNAT-04 (P2)** : journaliser validation/rejet enrôlement (action, auteur, motif, IP) dans la même transaction que l'update ; allow-list statut (valide|approuve|rejete|complement).
- **ADMINNAT-05 (P2)** : restreindre POST /audit à super_admin (ou le supprimer) et déduire l'IP du socket ; ignorer l'IP client.
- **ADMINNAT-06 (P2)** : masquer à BOKeiwa les actions non super_admin (isSuper), masquer les téléphones dans exports CSV, tracer tout export (action EXPORT_WALLETS_CSV, auteur, ip).
- **ADMINNAT-07 (P2)** : brancher moderation sur user-flags, tuer /admin/{rapports,scores,communication,health} ou les marquer 501 explicites — jamais de valeur inventée.
- **ADMINNAT-08 (P2)** : supprimer l'ALTER TABLE runtime (migration 1782000000000+ à faire), garder l'UPDATE, restreindre à super_admin + audit.
- **ADMINNAT-01/11 (P2)** : faire de bo-permissions.ts la source unique (le branchement « ETAPE A » annoncé) et générer DEFAUTS_PAR_ROLE à partir de ROLE_DEFAULTS ; une garde CI de cohérence front↔serveur (miroir de test:enum-check-phone).
- **ADMINNAT-09 (P3)** : boCharte.test.mts sur le modèle authCharte — budgets hex figés par fichier BO, migration vers bo-theme/tokens.
- **ADMINNAT-10 (P3)** : Fermer UniversalModalBO 32→44 px ; passer la modale « mot de passe oublié » sur Radix Dialog ; étendre warnDev aux 58 console.* BO.
- **ADMINNAT-12 (P3)** : audit log SUPER_ADMIN_CREATION + mustChangePassword dans create-super-admin.
- **ADMINNAT-13 (P3)** : ne pas avaler l'erreur de boGetAuditLogs — retourner un état indisponible(raison).
- **ADMINNAT-14 (P3)** : ajouter admin_national aux Roles de /notifications/send|send-bulk OU retirer communication du scope admin_national dans le registre (trancher avec Patrick).

## 7. Matrice de recette

| Domaine | À vérifier | Critère d'acceptation |
|---|---|---|
| Auth BO | login /backoffice, refresh cookie, logout | aucune session hors périmètre ; mustChangePassword honoré |
| Autorisation UI | /backoffice/utilisateurs, /institutions, /keiwa en URL directe | écran refusé OU liste non servie (ADMINNAT-02) |
| Autorisation API | PATCH /transactions/:id, /identifications/:id sans boPermissions | refus si permission absente (ADMINNAT-03) |
| Élévation | création de super_admin / admin_general par admin_national | 403 partout (probe + allow-list) |
| Argent | credit/debit/reset wallet en admin_national | 403 (J5) ; en super_admin : motif obligatoire + trace même transaction |
| Annulation | annulation d'une vente nationale | statut + restock + TRANSACTION_STATUT_ANNULEE signée |
| Audit | validation dossier enrôlement, export CSV, create-super-admin | une ligne exploitable par action (ADMINNAT-04/06/12) |
| PII | téléphones dans écrans/exports BO | masquage exporté + export tracé (ADMINNAT-06) |
| A11y | modales Universal BO, cibles tactiles | focus trap Radix, Fermer ≥44 px, ESC |
| Données | GET /audit en admin_national | lecture OK, écriture refusée (ADMINNAT-05) |

## 8. Tests critiques recommandés

1. admin_national ouvre /backoffice/utilisateurs → aucun compte BO affiché (écran bloqué ou API 403).
2. admin_national avec boPermissions: {} tente PATCH /transactions/:id (gelé) → 403 après BO-3.
3. Rejeu d'annulation de transaction → une seule restitution stock, un seul log TRANSACTION_STATUT_ANNULEE.
4. POST /audit en admin_national → 403 (après correction) ; vérifier qu'aucune entrée n'est inscriptible par le client.
5. Export CSV wallets → téléphones masqués + ligne d'audit d'export.
6. Création d'un identificateur par admin_national → PIN généré serveur, SMS, rien dans la réponse ni les logs (SEC-08 régression).
7. Validation de dossier → présence IDENTIFICATION_VALIDEE (auteur, motif, IP) dans audit_logs.
8. Clavier seul sur UniversalModalBO + BOLogin : Tab/ESC/Enter, Fermer ≥ 44 px mesuré.

## 9. Synthèse des actions prioritaires

| Priorité | Action | Effort |
|---|---|---|
| P1 | ADMINNAT-02 : garde BOUtilisateurs + retirer utilisateurs.read/parametres.read du défaut serveur | S |
| P2 | ADMINNAT-03 : généraliser exigerPermissionBO (transactions, identifications, marches) — lot BO-3 | M |
| P2 | ADMINNAT-04 : audit + allow-list statut sur PATCH /identifications/:id | S |
| P2 | ADMINNAT-05 : fermer POST /audit aux rôles non super_admin, IP serveur | S |
| P2 | ADMINNAT-06 : BOKeiwa rôle-aware + export CSV masqué/tracé | M |
| P2 | ADMINNAT-07/08 : suppression des stubs fabriqués + sortie de l'ALTER TABLE runtime | S |
| P2 | ADMINNAT-01/11 : source unique des défauts de rôle + garde CI de cohérence | M |
| P3 | ADMINNAT-09/10 : boCharte, 44 px, Radix sur modale BOLogin, warnDev BO | M |

## 10. Scores proposés

| Dimension | Score | Justification éclair |
|---|---|---|
| Sécurité | 74/100 | Allow-list/hiérarchie/secrets solides ; journal inscriptible, PII exportable, DDL runtime |
| Autorisation | 68/100 | J6 réel mais partiel ; 3 matrices divergentes ; liste BO lisible par le rôle |
| Accessibilité | 70/100 | Socle Radix + BOLogin exemplaires ; cible 32 px, modale custom sans trap, console.* |
| Qualité | 72/100 | Transactions atomiques, états honnêtes ; stubs vivants, listes de rôles dupliquées, couleurs |
| **Global** | **71/100** | Livrable PROD conditionnel (seuil 60) — autorisation à consolider avant montée en charge |

## 11. Conclusion + statut

Le rôle **admin_national** est aujourd'hui **correctement bridé sur l'essentiel** : il ne peut pas créer de compte administrateur, pas plus qu'il ne peut toucher un compte BO, lire un PIN, ni opérer d'argent Keiwa — et les sondes runtime confirment le fail-closed des endpoints /admin* et /users. Les règles §8.6 (annulation tracée, rien n'est supprimé) et §8.7 (PIN jamais choisi/lisible/journalisé) sont tenues avec des preuves de code précises.

Les écarts résiduels sont **structurels, pas critiques** : trois matrices de permissions divergent dont une « non branchée » (ADMINNAT-01), la généralisation serveur J6/BO-3 reste à faire (ADMINNAT-03), l'écran Utilisateurs BO reste lisible par URL (ADMINNAT-02, seul P1), le journal d'audit reste inscriptible par les rôles qu'il est censé juger (ADMINNAT-05), et les stubs BO fabriquant des données « rassurantes » (ADMINNAT-07) contredisent la doctrine zéro-faux-zéro du projet.

**Validité de l'audit du 28/09** : ses 3 alertes (matrice permissions, opérations financières, stubs BO) restent **toutes les trois pertinentes** — la première et la deuxième ont reçu un traitement partiel de qualité le 03/10 (bo-autorisation J6, wallet J5), la troisième est inchangée. Le statut « À RECETTER » demeure la bonne qualification.

**Statut de l'audit : À RECETTER — audit statique + sondes runtime 401/403 conformes — global 71/100.**
