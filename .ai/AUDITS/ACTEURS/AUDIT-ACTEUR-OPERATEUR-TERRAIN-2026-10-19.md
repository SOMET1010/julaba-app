# AUDIT ACTEUR — OPERATEUR-TERRAIN — 2026-10-19

> **Mission** : 2ᵉ vague d'audits statiques par acteur (rejouer les constats du 05/10 + constats comptables transverses + delta commits depuis le 05/10 + fail-closed argent + offline enrôlement).
> **Périmètre** : front `frontend/src/app/components/backoffice/` (NouvelActeurPage, FicheIdentificationDynamiqueBO, BOActeurs, BOEnrolement, BOSupervision, BOMutations, BOModeration, BOLayout/BOLogin/BORoot), registre `BackOfficeContext.tsx` ; back `backend/src/auth/bo-autorisation.ts` + routes accessibles au rôle (`identifications`, `users`, `mutations`, `user-flags`, `zones`, `missions`, `audit-rest`, `transactions-rest`).
> **Méthode** : relecture de première main sur `/home/z/julaba-wt` (dev, HEAD `04ae652`), preuves re-read le 19/10, `git log --since=2026-10-05`, aucune écriture, aucune sonde.
> **Auteur** : agent Z.ai Code — Task 45-c.

## 1. Identité et périmètre

- **Rôle** : `operateur_terrain` (UserRole.OPERATEUR_TERRAIN) — back-office « Analyste » : acteurs, enrôlement (validate), supervision, missions, mutations, modération, audit.read.
- **Compte démo** : toujours AUCUN — `seed-demo.service.ts:75/:95/:112` ne crée aucun OT (le commit `d6617d7` = script d'exécution des seeds, pas de compte ajouté) → recette toujours bloquée.
- **Évolutions depuis le 05/10** :
  - `3d7070b` fix(bo-moderation) : signalements servis sous `/user-flags` + jointures castées — la LISTE modération fonctionne (le resolve reste refusé, §3-04) ;
  - `ee0b4a0`/`02153dd` : réorg backend + mot de passe BO seed lu à l'exécution ;
  - `04ae652` (15/10) : `ProfileSwitcher` réinstallé dans `BOLayout.tsx:1449` ; `e04fa73` l'avait retiré ; `2b23bef`/`f739a66` n'ont touché que la connexion marchande ;
  - Aucun commit n'aligne les @Roles serveur sur le registre du rôle : les 5 dérives du 05/10 sont intactes.

### Évolutions depuis le 05/10 — verdict gating dev/prod
- **Dev Mode** : `BOLayout.tsx:1449` `{import.meta.env.DEV && <ProfileSwitcher/>}` + bouton « Simuler ticket entrant » DEV-gated (:1362-1371) → **rien ne fuit en production**.
- **BOLogin** : 0 élément de contexte dev, 0 bouton Rapport (grep vide) — écran BO propre.
- **Connexion** : l'OT passe par `BOLogin` (routes.tsx:197) : la réécriture `LoginPassword` (04ae652, écran téléphone) ne change AUCUN comportement de sécurité pour ce rôle ; les gardes BO sont inchangées (`bo-autorisation.ts`, verrou/throttler serveur intacts, `contacts-recovery-bo` durci :102-116).

## 2. Fonctionnalités observées dans le code

| Fonction | Écran front | API back | Verdict 19/10 |
|---|---|---|---|
| Lister acteurs | BOActeurs (gate acteurs.read, BOLayout:96) | GET /users @Roles('ADMIN') | fonctionne |
| Détail/modifier/suspendre | BOActeurs :680 (hasPermission acteurs.suspend) | GET/PATCH /users/:id **sans OT** (users.controller.ts:240/:263) | 403 (02) |
| Enrôlement / validation | BOEnrolement :226-227 (canWrite/canValidate) ; FicheIdentificationDynamiqueBO :2056-2058 | GET/PATCH /identifications (OT admis in-code :96/:488) | fonctionne MAIS sans permission serveur ni scope (06) |
| Supervision | BOSupervision — **0 hasPermission** (grep vide) | GET /transactions/all OK OT (:50) ; PATCH /transactions/:id sans OT (:70-71) | lecture OK, actions 403 (03) |
| Missions | BOMissions :91 hasPermission('missions.write') | GET /missions @Roles('super_admin','admin','institution') :15 | 403 (01) |
| Mutations (décision) | BOMutations | PATCH :id/decision sans OT (mutations.controller.ts:113-115) | décision 403 (04) |
| Modération | BOModeration | GET /user-flags OK OT (:26) ; PATCH :id/resolve sans OT (:39-40) | liste OK (3d7070b), traitement 403 (04) |
| Zones | gate zones.read | POST/PATCH/DELETE @Roles('ADMIN','super_admin') :35-36/47-48/60 | serveur plus permissif que le front (09) |
| Audit | gate audit.read :144 | GET /audit OK ; **POST /audit ouvert à tout BO** (audit-rest.controller.ts:31) | voir 07 |
| Création d'acteur | NouvelActeurPage | POST /auth/create-acteur admis OT (auth.controller.ts:763), escalade verrouillée | fonctionne |
| Keiwa BO | /backoffice/keiwa (routes.tsx:231, BOKeiwa) | ajustements super_admin only (J5) | fail-closed (voir §5) |

## 3. Constats détaillés

### OPERATEUR-01 [P1] — Écran Missions mort — **TOUJOURS VALABLE (05/10 → 19/10)**
`missions.controller.ts:14-15` : `@Roles('super_admin','admin','institution')` — le littéral `'admin'` minuscule n'est toujours pas résolu par RolesGuard et OT est absent → 403 permanent pour le rôle (et pour admin_general/national). Désalignement entité/UI inchangé.

### OPERATEUR-02 [P1] — acteurs.write/acteurs.suspend inopérants serveur — **TOUJOURS VALABLE**
`users.controller.ts:263` PATCH :id sans OT dans @Roles (logique in-code :267/:291/:294 `exigerPermissionBO` inatteignable pour lui) ; `:240` GET :id sans OT (présent dans isAdmin :244 — branche morte). Le cœur « agir sur un acteur » reste cassé alors que `BOActeurs.tsx:680` affiche l'action gated front.

### OPERATEUR-03 [P1] — Actions supervision affichées puis 403 — **TOUJOURS VALABLE**
`transactions-rest.controller.ts:70-71` : PATCH /transactions/:id sans OT ; `BOSupervision.tsx` n'appelle JAMAIS hasPermission (0 occurrence). L'OT voit geler/annuler/litige, le serveur refuse.

### OPERATEUR-04 [P1] — mutations.write et moderation.write promis, refusés — **TOUJOURS VALABLE**
`mutations.controller.ts:113-115` (décision sans OT) ; `user-flags.controller.ts:39-40` (resolve sans OT — la liste est réparée par 3d7070b, pas le traitement). Deux missions « décider » restent des impasses.

### OPERATEUR-05 [P2] — Trois registres de permissions divergents — **TOUJOURS VALABLE**
(a) `config/bo-permissions.ts` toujours non branché ; (b) registre vivant `BackOfficeContext.tsx:193` ; (c) copie serveur `bo-autorisation.ts:24-29` (OT :28 identique au front, « à garder synchronisé jusqu'à BO-3 »). Aucun garde CI de synchronisation.

### OPERATEUR-06 [P1] — enrolement.validate non vérifié serveur + pas de scope — **TOUJOURS VALABLE**
`identifications.controller.ts:485-508` : PATCH :id accepte tout rôle BO in-code sans `exigerPermissionBO('enrolement.validate')` ni filtre zone : un OT dont la matrice a été restreinte (PATCH /users/:id/bo-permissions, :410-412 super_admin only) valide encore les dossiers ; zoneId jamais utilisé. FicheIdentificationDynamiqueBO envoie bien le PATCH statut (:2056-2058).

### OPERATEUR-07 [P2] — POST /audit ouvert à tout rôle BO — **TOUJOURS VALABLE**
`audit-rest.controller.ts:31` : POST /audit @Roles('ADMIN') avec body libre — un « Analyste » peut toujours injecter des entrées de piste d'audit.

### OPERATEUR-08 [P2] — Validation de dossiers non journalisée — **TOUJOURS VALABLE**
PATCH /identifications/:id : aucun audit_logs (SMS :525-566 et DELETE super_admin :605-611 seulement). La décision la plus sensible du rôle reste non traçable.

### OPERATEUR-09 [P2] — Zones : serveur plus permissif que le front — **TOUJOURS VALABLE**
`zones.controller.ts:35-36/:47-48/:60` : POST/PATCH/DELETE en 'ADMIN' (= 5 rôles BO) → l'OT passe en API directe sans `zones.write` (garde métier zones.service inchangé).

### OPERATEUR-10 [P2] — Rôle « terrain » sans périmètre géographique — **TOUJOURS VALABLE**
`identifications.controller.ts:96/:129/:488` : OT dans la liste isAdmin → listes/dossiers NATIONAUX ; `transactions-rest.controller.ts:255-256` : applyZoneRestriction ne traite que gestionnaire_zone. Un OT de San-Pédro voit tout le pays.

### OPERATEUR-11 [P2] — Aucun compte démo + secret partagé historique — **TOUJOURS VALABLE**
Seed sans OT (voir §1) ; ALERTE-SEC-01 S1 (mot de passe BO partagé) non clôturée dans les registres. Recette du rôle toujours impossible en l'état.

### OPERATEUR-12 [P2] — Offline inexistant — **TOUJOURS VALABLE (avec un progrès non assumé)**
0 occurrence outbox/navigator.onLine dans `components/backoffice/` (grep 19/10 vide). Progression pertinente : `FicheIdentificationDynamiqueBO.tsx:1296/:1332` sauvegarde le brouillon en **localStorage** (debounce 500 ms) — la saisie survit au redémarrage, mais la soumission reste réseau-only, sans idempotence ni file de rejeu.

### OPERATEUR-13 [P2] — Voice-first non décliné — **TOUJOURS VALABLE**
0 occurrence parle(/Tata/entreeVoix dans components/backoffice/ (Fiche BO : 58 aria mais 0 voix). La doctrine BO « assumé lettré/online » reste à écrire (REQUIREMENTS).

### OPERATEUR-14 [P3] — Garde tactile hors périmètre BO — **TOUJOURS VALABLE**
`frontend/scripts/test-cible-tactile.mjs:89` : « Le garde ne scannait que POSCaisse » — aucun contrôle des écrans BO.

### OPERATEUR-15 [P3] — PII complète exposée sans périmètre — **TOUJOURS VALABLE**
`users.controller.ts:54-71` : by-phone accessible OT (in-code :56) et renvoie le profil entier ; `sanitize-user.util.ts:14-20` ne retire que les secrets d'auth (nin/numCNPS/numCMU restent).

### OPERATEUR-16 [P3] — Scories de rôles — **TOUJOURS VALABLE**
`events.gateway.ts:62` : `'operateur_terrain'` dupliqué + `'admin'` fantôme dans la liste room admin ; `'admin'` fantôme missions.controller:15.

## 4. Risques et vulnérabilités

| ID | Risque | Catégorie | Criticité | Vecteur |
|---|---|---|---|---|
| OPERATEUR-01 | Missions 403, module désaligné | Fonctionnel | P1 | Navigation BO |
| OPERATEUR-02 | Actions acteurs bloquées malgré permission | Autorisation (dérive front↔serveur) | P1 | Navigation BO |
| OPERATEUR-03 | Geler/annuler affiché puis 403 | Autorisation (dérive) | P1 | Navigation BO |
| OPERATEUR-04 | Décision mutation / resolve signalement 403 | Autorisation (dérive) | P1 | Navigation BO |
| OPERATEUR-06 | Matrice cosmétique sur enrolement.validate ; pas de scope | Autorisation (fail-open partiel) | P1 | API directe |
| OPERATEUR-09 | Création/suppression zones par OT | Autorisation (dérive inverse) | P2 | API directe |
| OPERATEUR-07 | Falsification de journal d'audit | Intégrité/traçabilité | P2 | POST /audit |
| OPERATEUR-08 | Validation dossier sans trace | Traçabilité | P2 | Navigation BO |
| OPERATEUR-10 | Données nationales sans scope | Données/minimisation | P2 | Navigation BO |
| OPERATEUR-11 | Rôle non recetable (pas de compte) | Sécurité opérationnelle | P2 | Seed |
| OPERATEUR-12 | Perte en réseau instable (pas d'outbox BO) | Disponibilité | P2 | Terrain |
| OPERATEUR-13 | Parcours non vocal | A11y/doctrine | P2 | Peu-lecteur |
| OPERATEUR-05 | 3 registres divergents | Gouvernance | P2 | Évolution |
| OPERATEUR-15 | PII (nin/CNPS/CMU) exposée | PII/2013-450 | P2 | by-phone |
| OPERATEUR-14 | Cibles tactiles non mesurées BO | A11y | P3 | Tablette |
| OPERATEUR-16 | Rôles fantômes/duplications | Hygiène | P3 | — |

## 5. Points forts

1. **Fail-closed argent confirmé ligne en main** : PATCH /transactions/:id sans OT (:70-71), ajustements wallets super_admin only (J5, admin-wallets), OT absent des @Roles de toute route d'argent — « OT ne touche wallets/transactions sensibles » reste vrai. BOKeiwa accessible par URL mais toute mutation est refusée serveur.
2. **Escalade de privilèges verrouillée** : create-acteur OT → seulement marchand/producteur/cooperateur (auth.controller.ts:763 + règle M8 dans le service :779-784) ; exigerAutoriteSur interdit de toucher un compte BO (bo-autorisation.ts:66-71) ; CHAMPS_RESERVES/CHAMPS_AUTHENTIFICATION (:74-80) protègent role/status/boPermissions et les secrets.
3. **J6 réel et vivant** : counts-by-role vérifie acteurs.read (:113-116), DELETE /users/:id exigerPermissionBO('acteurs.delete') :477-484 — le patron à généraliser (06) existe.
4. **Modération liste réparée** (3d7070b) : /user-flags dédié sous /users/flags — l'écran fonctionne à nouveau pour la lecture.
5. **Brouillon enrôlement BO persistant** (localStorage :1296/:1332) + validation anti-prototype-pollution (:1068) — continuité de saisie améliorée depuis le 05/10.
6. **Session web ADR-002** et redirection BO OT correctes ; BOLogin sans aucun élément dev ; Dev Mode strictement DEV-gated.

## 6. Recommandations de correction

1. **Lot « dérive front↔serveur » (01/02/03/04)** : arbitrer chaque capacité et aligner — soit ajouter operateur_terrain aux @Roles (users GET/PATCH :id, transactions PATCH, mutations decision, flags resolve) avec `exigerPermissionBO` correspondant, soit retirer la permission du registre + masquer l'action. Corriger `'admin'`→'ADMIN' dans missions.controller:15. Effort M.
2. **06** : `exigerPermissionBO(req.user,'enrolement.validate')` sur PATCH /identifications/:id + filtre zone si zoneId. Effort S.
3. **05** : source unique de permissions (générer registres front+serveur) + garde CI de synchronisation. Effort M.
4. **07** : fermer POST /audit au serveur (allow-list d'actions ou rôle système). Effort S.
5. **08** : audit_logs DOSSIER_STATUT_* dans la même transaction que le PATCH (patron transactions-rest). Effort S.
6. **09** : exigerPermissionBO('zones.write') sur POST/PATCH/DELETE /zones. Effort S.
7. **10** : décider le scope (zoneId exploité ou rôle national documenté ADR). Effort M.
8. **11** : compte OT au seed démo (secret dédié) + clôture S1. Effort S.
9. **12/13** : trancher la doctrine BO (outbox + voix) dans REQUIREMENTS. Effort M/L.
10. **15/14/16** : projection de colonnes publiques sur by-phone ; étendre le garde tactile aux 5 écrans BO clés ; purge littéraux fantômes. Effort S.

## 7. Matrice de recette

| Domaine | À vérifier | Critère d'acceptation |
|---|---|---|
| Auth | BOLogin OT → /backoffice/dashboard | cookie session, 0 élément dev visible |
| Autorisation | chaque clé true du registre vs API | 0 action affichée finissant en 403 ; 0 mutation sans permission serveur |
| Enrôlement | valider/rejeter/complément un dossier | effet atomique + SMS + trace d'audit |
| Missions | lecture | 200 réel (pas d'écran en erreur) |
| Zones | API directe sans zones.write | 403 |
| Mutations/Modération | décision selon arbitrage | cohérence UI ↔ 200/403 assumée |
| Argent | toute mutation wallet/transaction | 403 (fail-closed) — vérifié statique |
| Audit | validation de dossier | ligne audit_logs auteur/avant/après |
| Offline | coupure pendant la fiche BO | brouillon conservé (localStorage OK), soumission unique à la reprise |
| Voix/A11y | information critique sans lecture | doctrine tranchée + cibles ≥44 px mesurées BO |

## 8. Tests critiques recommandés

1. Matrice OT : pour chaque clé du registre un appel réel (true→200, false→403) — automatisable sur le modèle EMPREINTE-GARDES.
2. OT token : PATCH /transactions/:id, PATCH /mutations/:id/decision, PATCH /user-flags/:id/resolve, PATCH /identifications avec boPermissions retirés → comportements documentés (aujourd'hui : 403 partout sauf identifications).
3. Escalade : OT → identificateur/institution/super_admin via create-acteur → refus (gardes m6-m8 à maintenir verts).
4. Validation dossier : double PATCH → statut+SMS uniques (idempotence à créer avec l'audit).
5. POST /audit par OT → refus après correctif.
6. Seed démo : login OT démo → 200 ; aucun compte BO à secret partagé en recette (S1).

## 9. Synthèse des actions prioritaires

| Priorité | Action | Effort |
|---|---|---|
| P0 | Aligner les 5 capacités cassées (missions, acteurs :id, supervision, mutations, modération) — 01..04 | M |
| P0 | Brancher enrolement.validate + scope sur /identifications — 06 | S |
| P1 | Source unique de permissions + garde CI — 05 | M |
| P1 | Audit log sur validation dossiers — 08 | S |
| P1 | Fermer POST /audit — 07 | S |
| P2 | zones.write serveur + décision de scope — 09/10 | M |
| P2 | Compte OT de démo + clôture S1 — 11 | S |
| P2 | Doctrine offline/voix BO — 12/13 | M/L |
| P3 | Minimisation PII, garde tactile BO, purge littéraux — 15/14/16 | S |

## 10. Scores proposés

| Dimension | Score | Justification |
|---|---|---|
| Sécurité | 68/100 | Escalade verrouillée + J6 vivant + fail-closed argent intact ; mais matrice cosmétique sur la permission cœur (06), POST /audit ouvert (07), dérives bidirectionnelles |
| Argent/intégrité | 72/100 | Aucune opération financière possible pour le rôle (vérifié) ; commission faussée en aval par C-12 (validation sans trace ni permission) |
| Accessibilité | 56/100 | Fiche BO bien aria (58) ; 0 voix, offline partiel (brouillon OK, pas d'outbox), garde tactile absent du BO |
| Voice-first | 35/100 | Zéro canal vocal dans tout le BO — doctrine non tranchée |
| Qualité | 62/100 | Liste modération réparée + brouillon persistant (+) ; Missions mort, 3 registres, pas de compte démo |
| **Global** | **61/100** | Au-dessus du seuil 60 mais toujours **non recetable** (compte démo absent + 5 capacités cassées) |

## 11. Conclusion + statut

Les **16 constats du 05/10 restent valables** — aucun corrigé, aucun aggravé — preuves relocalisées le 19/10 (le seul progrès connexe, `3d7070b`, répare la LISTE de modération mais pas le traitement, et le brouillon localStorage de la fiche BO améliore la continuité de saisie sans régler l'offline). Le fail-closed argent est re-confirmé ligne en main : OT absent de toutes les @Roles financières, escalade verrouillée, J6 vivant. Le delta UI (04ae652) est sans effet de sécurité : Dev Mode DEV-gated, BOLogin propre, et la réécriture de LoginPassword ne concerne pas la porte BO. La recette du rôle reste bloquée par l'absence de compte démo (OPERATEUR-11) et son périmètre d'action déclaré reste refusé par le serveur — l'inverse du risque classique, tout aussi bloquant.

**Statut : CONFORME SOUS CONDITIONS — rôle câblé et fail-closed sur l'argent, mais À RECETTER : compte démo absent + 5 dérives front↔serveur + enrolement.validate hors matrice (inchangés depuis le 05/10).**
