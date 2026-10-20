# COMMIT_LOG.md — Journal des commits JULABA

> Tenu par l'Agent Commit. Format : chaque entrée = un commit (atomicité, conventions).

## Convention de commits

Format : `<type>(<scope>): <sujet>`

### Types autorisés
- `feat` : Nouvelle fonctionnalité
- `fix` : Correction de bug
- `docs` : Documentation
- `refactor` : Refactoring (sans changement de comportement)
- `test` : Tests
- `chore` : Tâches diverses (build, deps, config)
- `ci` : CI/CD
- `perf` : Performance
- `style` : Style (formatage, espaces)
- `build` : Build system / dépendances externes

### Règles d'atomicité
- 1 commit = 1 préoccupation
- Pas de `git add .` (ajout explicite par fichier)
- Pas de commits géants injustifiés
- Convention historiquement formalisée dans `coordination/README.md` (dossier supprimé le 06/10/2026)

## Historique récent (5 derniers commits)

```
0553c10 ci: publier APK pilote dans GitHub Releases                    (Patrick SOMET, 22/09/2026)
e17992a Merge pull request #246 from SOMET1010/claude/clever-allen-dnr8by (Claude, ~22/09/2026)
3917bb7 docs(dette): registre revision 20 — contre-audit n°4           (Claude, ~22/09/2026)
96c7b64 merge(UI-03, UI-02): premier ecran — zone voix 260 px          (Claude, ~22/09/2026)
62636e6 style(caisse): UI-03 hierarchie du premier ecran + UI-02 recu  (Claude, ~22/09/2026)
```

## 06/10/2026 — Lots UX-2 « Voix pour tous » et UX-6 « IA/routing » (agent Z.ai Code)

```
fix(roles): UX-2/T1 — la voix Tata parle aux trois rôles (gate speak retiré, parité Tata IdentificateurLayout)
fix(marchand): UX-6/M-P1-2 — la tuile « Mon argent » restore la porte keiwa (porte unique accueil, arbitrage §8.3)
fix(identificateur): UX-6/T5 — routes canoniques + redirects + onglet Suivi + titre Acteurs + useScoreJULABA
fix(wallet): BUG-005 — /paiement/failed affichait un succès (détection /error|failed/)
docs: journaux .ai + worklog Task 16
```

Atomicité : 1 préoccupation = 1 commit ; ajout explicite par fichier (pas de `git add .`).

> NB rebase (16-bis) : ces commits ont été rebasés sur `060c333` (agent UX producteur, arrivé en parallèle) — hash finaux `2e12cf6`, `0c026aa`, `7699927`, `65c1783`, `5d27f63`. Le commit « voix » rebasé ne porte plus que le commentaire doctrinal + la note `disabledRoles` : la substance du gate vit dans `060c333`. Détail : worklog Task 16-bis.

## 12/10/2026 — Sandbox : PG embarqué auto, seed BO connectable, testeur de rôles (agent Z.ai Code)

```
chore(infra): démarrage auto du PostgreSQL embarqué au npm run dev
fix(seed): mot de passe back-office lu à l'exécution
feat(auth): bouton de test des rôles <> sur la connexion (DEV)
docs: registres session 12/10 — commits tâches 29-32 + push dev
```

Atomicité : 1 préoccupation = 1 commit ; ajout explicite par fichier (pas de `git add .`).

## 12/10/2026 — Stack docker autoportante + audit comptable des acteurs (agent Z.ai Code)

```
chore(infra): postgres dans la stack docker + env            (tâche 34)
docs(audit): audit comptable des 10 acteurs                  (tâche 35)
docs: registres session 12/10 — tâches 34-35                 (tâche 36)
```

- `chore(infra)` : `docker-compose.yml` gagne le service `postgres` (16-alpine — version de référence CI, healthcheck `pg_isready`, volume `julaba_pgdata`, port hôte 127.0.0.1:5433) et `backend` attend `service_healthy` ; nouveau `backend/.env.production.example` tracké (`DB_HOST=postgres`, 3 secrets fail-fast documentés) ; `docker compose up -d` devient autoportant ; VPS non cassé (`--env-file` du deploy.yml = interpolation seule).
- `docs(audit)` : `.ai/AUDITS/AUDIT-COMPTA-ACTEURS-2026-10-12.md` — matrice 10 rôles × 9 opérations monétaires, 6 chaînes d'argent scorées, 7 constats critiques (C-01…C-07, dont 5 vérifiés de première main) + 10 majeurs + 9 mineurs, 7 chantiers P1, verdict global **62/100** (conforme pilote espèces marchande ; non prêt mobile money / crédit / coopérative / marketplace).
- Batteries : YAML compose ×2 parseurs OK ; check-ignore (`.env.production.example` trackable, `backend/.env` ignorée) ; tsc frontend vert sur l'arbre audité (Task 35) ; aucun fichier TS modifié dans les 3 commits.

Atomicité : 1 préoccupation = 1 commit ; ajout explicite par fichier (pas de `git add .`).

## 12/10/2026 — C-01 : réconciliation des retraits mobile money (agent Z.ai Code)

```
fix(wallets): C-01 — réconciliation des retraits mobile money   (tâche 37)
fix(wallet): C-01 — le retrait Keiwa annonce la réconciliation   (tâche 37)
docs: registres session 12/10 — tâches 36-37                    (tâche 37)
```

- `fix(wallets)` : chantier P1 n°1 de l'audit comptable (C-01) — référence `RET-<uuid>` servante aussi de `pay_token` (fin du `RET-TEMP-Date.now()` introuvable), `COMPLETED` jamais posé sur la seule HTTP 200 (re-vérification check-status), primitive `rembourserRetraitBpay` (transition unique `PENDING_WITHDRAW → REFUNDED` + crédit dans la même transaction), cron étendu à `PENDING_WITHDRAW` (+ alerte ERROR > 24 h), webhook reconnaît les retraits. Invariant `bpay-retrait-reconciliation.spec.ts` : 6/6 sur vrai postgres (remboursement unique sous course controller/webhook/cron, compte suspendu = remboursement retenu puis effectué).
- `fix(wallet)` : `WithdrawWalletModal` — FAILED et timeout disent la vérité (remboursement automatique, solde rafraîchi) — fin de l'« échec silencieux » ; parcours masqué en pilote (keiwa hors pilote, garde RootLayout) : écrans prêts pour l'entrée au pilote.
- Batteries : invariant C-01 6/6 + régression B3/B2/K1/T1/tontines 18/18 (vrai postgres embarqué) ; tsc frontend/backend 0 erreur ; lint racine 0 erreur ; test vivant sandbox (retrait 1000 F → 400 + remboursement gardé + trace REFUNDED + debit/credit liés par `refundOf`). Aucun garde assoupli (renforcement pur).

Atomicité : 1 préoccupation = 1 commit ; ajout explicite par fichier (pas de `git add .`).

> NB sandbox : travail des Tasks 29-32 balé par le superviseur dans des auto-commits UUID sur `main` locale (dont 1544 binaires pgdata ajoutés puis désindexés) → commits reconstruits depuis l'arbre final, JAMAIS de cherry-pick des UUID, push `origin/dev` uniquement (jamais main, jamais force). Rebase sur `2b23bef` (fix(auth) amont « supprimer les éléments de contexte dev », arrivé en parallèle) — hunks `LoginPassword.tsx` sans chevauchement, badge Tata « Guide » amont conservé ; hash finaux `870701f`, `02153dd`, `a6a9eff` + commit docs. Détail : worklog Tasks 29-33.

## Statistiques Git (snapshot 2026-09-28)

- **Total commits** : 780
- **Contributeurs top** : Claude 396 / PATRICK 198 / SOMET1010 132 / claude[bot] 35 / Pascal Somet 14 / ABOA AKOUN BERNARD 3
- **Branches vivantes** : 35 (dont ~22 `review/`, 6 `claude/`, 2 `manus/`, 2 `design/`)
- **Tags** : 1 (`pilote-latest`) — pas de semver formel
- **Working tree** : propre

## Commits récents du système multi-agents

*(Sera mis à jour à chaque commit du système multi-agents)*

### Format d'enregistrement

```
### <SHA court> — <type>(<scope>): <sujet>
- **Auteur** : <Agent>
- **Date** : YYYY-MM-DD HH:MM
- **Fichiers modifiés** : N fichiers
- **Atomicité** : ✅ 1 préoccupation / ❌ multi-préoccupations (justifié : ...)
- **Tests** : ✅ verts / ❌ rouges / ⏭️ skippés
- **Revue** : ✅ Reviewer OK / ⏳ en attente / ❌ bloquée
- **Validation** : Tech Lead ✅/❌ | Security ✅/❌ | a11y ✅/❌/N/A | Perf ✅/❌/N/A | QA ✅/❌
- **Description** : ...
- **Liens** : TASKS.md INIT-XXX, ADR-XXX, BUG-XXX, etc.
```

## Commits du 2026-10-06 (système multi-agents — lot UX-1)

```
68149f2 fix(wallet): T2 — la page Paiements services ne promet plus un paiement qui n'existe pas (BUG-001)   (JULABA, 06/10/2026)
f7e9544 fix(wallet): T8/M-P0-3 — le transfert keiwa passe par une relecture avant l'irréversible (BUG-002)   (JULABA, 06/10/2026)
67f72ef fix(marchand): T2 — le marché virtuel annonce une COMMANDE, jamais un paiement réussi (BUG-003)      (JULABA, 06/10/2026)
41b6671 fix(marchand): T8/M-P0-2 — la cotisation coopérative (25 000 F) passe par relecture + PIN (BUG-004)  (JULABA, 06/10/2026)
```

- **Atomicité** : ✅ 4 commits, 1 préoccupation chacun (1 bug = 1 commit), fichiers ajoutés explicitement (pas de `git add .`)
- **Tests** : ✅ verts — `tsc -b` 0, garde charte marchande 0, `vite build` 0 (21,9 s), `test:ci` 44 maillons EXIT 0, garde-argent = les 3 refus attendus (gels humains en attente, aucun refus nouveau)
- **Revue** : ⏳ auto-revue orchestrateur (spot-checks + relecture des diffs) — revue Reviewer indépendante à planifier
- **Détail** : BUGS.md BUG-001..004 · source audit `docs/audit/AUDIT-UX-ROLES-2026-10-06.md`

## 2026-10-06 — Actions correctives REVIEW-003/REVIEW-004 (restaurations CI + gels, gardes voix, registres)

**Commits** :
```txt
d9f08ad fix(ci): REVIEW-003/004 Act-1 — restaurer schema-pilote + check-nest-versions et les gels dffe705 (retour aux 3 refus attendus)  (JULABA, 06/10/2026)
4eb6471 test(voix): REVIEW-004 Act-2 — encoder §8.1 et l'arbitrage Rapport de test dans les gardes voix, historique consigné  (JULABA, 06/10/2026)
(ce commit) docs: REVIEW-003/004 — suivi des actions exécutées, INC-001 atténué, BUGS.md réconcilié, CHANGELOG, worklog 19  (JULABA, 06/10/2026)
```

- **Atomicité** : ✅ 3 commits, 1 préoccupation chacun (restauration CI / gardes voix / registres), fichiers ajoutés explicitement (pas de `git add .`)
- **Tests** : ✅ verts — `tsc -b` 0, `tsc --noEmit` backend 0, `test:ci` 44 maillons EXIT 0, charte marchande verte, `test:parole-entree` vert, `test:voix-trace-source` = les 4 rouges hérités connus (0 nouveau), `test:maillons-orphelins` vert, `check:nest-versions` EXIT 0, garde-argent = les 3 refus attendus (re-gel humain en attente, voulu)
- **Revue** : ✅ actions DEMANDÉES par REVIEW-003/REVIEW-004, exécutées par le reviewer-agissant-orchestrateur — preuves mécaniques dans REVIEW_LOG, section « Suivi des actions correctives » ; B4-1 et B4-2 levés, INC-001 atténué
- **Détail** : scripts/schema-pilote.mjs + scripts/check-nest-versions.mjs (état `dffe705`) · ci/PERIMETRE-ARGENT.json + ci/EMPREINTE-GARDES.json (état `dffe705` — restauration, PAS un gel) · paroleEntree.test.mts §[7] (7 assertions §8.1) · test-voix-trace-source.mjs A/C + en-têtes · fixture parole-3917bb7.json (liste blanche : seule contexts/AppContext.tsx re-bénie) · BUGS.md 8/5/3 + BUG-006/007 réservés

## 07/10/2026 — Corrections des revues REVIEW-001/002/003 (agent Z.ai Code)

```
c7e2715 fix(backend): REVIEW-003/B3-3 — retire les majeures non prouvées (jest 29.7.0, @types/jest 29.5.14, swagger 11.4.7, backend + racine, retour dffe705)
6db87ed fix(marchand): REVIEW-001/R1-1 — le libellé cotisation dérive de COTISATION_MONTANT (bouton + récap modal)
c292812 chore(voix): REVIEW-002/R2-2 — newline AppContext + fixture re-bénie par le garde (liste blanche) ; docs: R2-1 CODE-NEW-7
docs: journaux .ai + worklog Task 21
```

Atomicité : 1 préoccupation = 1 commit ; ajout explicite par fichier (pas de `git add .`).

- **B3-3** : preuve par exécution — suite unitaire backend **33 suites / 251 tests EXIT 0** (la suite morte ressuscitée), `tsc --noEmit` 0, `nest build` EXIT 0 ; preuve nouvelle : l'upgrade swagger 12 était **irrésoluble** (peer `@nestjs/common ^12` vs common 11.2.6 — ERESOLVE npm), la « recette swagger 12 » est morte-non-lieu (upgrade retiré, pas prouvé)
- **R1-1** : rendu byte-identique prouvé (`25\u00A0000 FCFA`) ; **R2-2** : diff fixture = 1 ligne (hash AppContext seul) ; **R2-1** : orphelinat re-vérifié mécaniquement (0 référence externe) avant traçage
- Détail : worklog Task 21 (REVIEW_LOG, section « Suivi des corrections »)

## 07/10/2026 — Lot primitives d'argent T8 (agent Z.ai Code)

```
dcc6716 refactor(argent): REVIEW-001/R1-3 — primitives maison RelectureArgent + PinArgent (une seule copie) ; R1-4 voix sur relectures (même source, ARG-17) + vibrerAttente ; R1-5 Radix Dialog (AUTH-05) ; R1-2 TransfertPage 499 l. (idempotence extraite, méthodes vers methodsTransfert) ; MaCooperative 382 l.
docs: journaux .ai + worklog Task 22
```

Atomicité : 1 préoccupation = 1 commit ; ajout explicite par fichier (pas de `git add .`).

- **Nouveaux fichiers** : `components/argent/RelectureArgent.tsx` (199 l.), `components/argent/PinArgent.tsx` (47 l.), `utils/idempotence.ts` (17 l.), `components/wallet/methodsTransfert.ts` (29 l.)
- **Fichiers migrés** : TransfertPage (562→499), MaCooperative (440→382) — comportement métier inchangé (mêmes endpoints, verrous, textes)
- **Détail** : worklog Task 22 (REVIEW_LOG, « Suivi des corrections — 2e session ») ; batteries vertes, garde-argent aux 3 refus attendus

## 07/10/2026 — Merge des dernières améliorations de main dans dev (agent Z.ai Code)

Audit REVIEW-006 (PR #261→#272 : cadre CI racine, correctifs RC, retours terrain PIE A1/A2/A3, profil/activation) puis fusion sur dev en worktree isolé. `main` jamais poussé. Gels et chaîne `test:ci` intacts.

1. `265062e` — `Merge main dans dev — retours terrain PIE 07/10 et cadre CI racine` : 63 commits fusionnés ; rename-follow git (frontend_src→frontend suivi : 32 modifiés auto-fusionnés, 14 ajouts relocalisés) ; conflits résolus (.gitignore union, anti-enumeration même-fix SEC-07 → version dev, package.json workspaces `frontend` + scripts main, package-lock régénéré) ; 6 occurrences frontend_src traduites dans l'outillage main
2. `1b32929` — `fix(i18n): intégration de la chaîne verify de main sur l'arbre renommé dev` : banc rejeuDeclencheurs (chemin frontend), 4 phrases dites héritées enregistrées au catalogue (MARCH_COTISATION_PAYEE/ECHEC, PROD_COMMANDE_ACCEPTEE, PROD_DEMANDE_DETAIL — a_migrer, motif PIE), INVENTAIRE-VOIX régénéré (425/242) ; test:i18n-source/-argent/-locales/-empreintes verts
3. Registres : REVIEW_LOG (REVIEW-006), CHANGELOG (Fusionné 07/10), COMMIT_LOG (cette entrée), worklog 24

Batteries finales : tsc ×2 = 0 ; charte 0 ; test:ci 0 ; parole-entree 0 ; voix-trace = 4 hérités ; garde-argent = 3 refus attendus ; jest 251/251 ; nest build 0 ; 6 bancs main + verrou + i18n verts.

## 12/10/2026 — Libération des variables d'environnement mortes (agent Z.ai Code)

Audit REVIEW-007 (double inventaire usages↔déclarations, tous canaux) puis nettoyage sur dev en worktree isolé. `main` jamais poussé. Gels et chaîne `test:ci` intacts.

1. `122aedb` — `chore(env): libère 8 variables d'environnement jamais lues (audit complet)` : backend/.env.example −5 (BPAY_RECONCILIATION, FEEDBAK_SMS_TEMPLATES, VOICE_PROVIDERS, VOICE_METRIC_LABELS, ODOO_CLIENT — homonymes = constantes de code, env jamais lue) ; render.yaml + compose odoo-poc −TTS_DISABLE_CLOUD (flag réel = VOICE_LOCAL_TTS) ; vite-env.d.ts −VITE_SENTRY_DSN (DSN en dur dans sentry.ts)
2. Registres : REVIEW_LOG (REVIEW-007), CHANGELOG (section Nettoyé), COMMIT_LOG (cette entrée), worklog 25

Batteries : typecheck EXIT 0 ; test:ci EXIT 0 (chaîne gelée intacte) ; enum-check-phone EXIT 0 ; garde-argent = baseline héritée exacte (3 refus connus, aucun fichier touché impliqué).

## 12/10/2026 — Vérification « pas morts » variables + composants (agent Z.ai Code)

Passe de vérification REVIEW-008 sur dev (worktree isolé, main jamais poussé) : preuve de mort des 7 noms libérés (122aedb), vivacité des 102 déclarations restantes (61 .env.example + 24 render.yaml + 17 POC), audit des composants hôtes (modules app.module, sentry/instrument, WebSocketTransport, 12 workflows → scripts, secrets, render/deploy/POC/Caddyfile) — **aucune variable ni composant mort restant**.

1. `c912d8a` — `chore(env-types): type VITE_CLOUDINARY_URL/PRESET dans vite-env.d.ts` : clôture du point ouvert REVIEW-007 (type seul, +4 lignes)
2. Registres : REVIEW_LOG (REVIEW-008), CHANGELOG (section Vérifié), COMMIT_LOG (cette entrée), worklog 26

Batteries : `tsc -b` frontend EXIT 0 ; gels ci/*.json intacts (diff bb9052a vide) ; vite-env.d.ts hors empreintes garde-argent.

## 12/10/2026 — Refonte de l'étape numéro de la connexion au design validé (agent Z.ai Code)

Maquette 12/10 appliquée à l'écran de connexion (75c869d, dev en worktree isolé, main jamais poussé) : signature de marque, titre complet + promesse, carte Tata nommée avec Écouter, numéro 🇨🇮 +225 en paires à positions pointées, pavé à lettres avec micro de dictée (empreinte en repli), carte « Dicter mon numéro » + badge MICRO OUVERT/EN VEILLE. Étapes code/reconnaissance intactes.

Gardes : voix-trace LoginPassword 15/15 appels identiques (ordre + arguments) ; auth-charte 24/26 hex, zéro nouveau ; verrou/canal/entrée-unique/enum/coffre/cible-tactile/parole-entree/lien-activation/charte-marchande EXIT 0 ; tsc -b EXIT 0. Vérifié au navigateur (Vite + agent-browser) : rendu, saisie, progression, étape code, 0 erreur console.

## 12/10/2026 — Micro de dictée au bout de la ligne numéro (agent Z.ai Code)

Demande du 12/10 (`7b146b4`, dev en worktree isolé, main jamais poussé) : bouton micro en fin de la carte numéro, même contrat que la carte dictée et la touche du pavé (handler réutilisé, visible seulement moteur vocal prêt, pastille qui pulse). Paires de chiffres passées en classe `.login-paire` + paliers responsive ≤430/≤360 px (ligne à trois gestes sans débordement, vérifié 390 et 320 px).

Gardes : voix-trace LoginPassword 15/15 appels identiques ; auth-charte EXIT 0 (zéro hex nouveau TSX) ; verrou/canal/entrée-unique/enum/coffre/cible-tactile/parole-entree/lien-activation/charte-marchande/entree-numero-voix EXIT 0 ; tsc -b EXIT 0. Vérifié au navigateur (Vite + agent-browser) : micro 44×44 en bout de ligne, œil avant micro, repli honnête sans moteur, 0 erreur console.

## Commits à venir (planifiés)## 07/10/2026 — Audit UX marchand/producteur/voix + lots UX-7/UX-8 (agent Z.ai Code)

| Commit | Type | Contenu (1 préoccupation = 1 commit) |
|---|---|---|
| `e780436` | fix(caisse) | T7 — l'échec générique d'encaissement/ajout s'écrit aussi (POS Caisse, AjoutProduitGuide, MicroVenteCaisse) |
| `4ab3452` | fix(marchand) | T7 — MesCommandes (6 handlers + 2 négos + hors-ligne) et DepenseForm s'écrivent |
| `14662b9` | fix(marchand) | Tontines — trois situations trois phrases + Réessayer (M-P1-5) |
| `968c454` | fix(argent) | MarchéVirtuel — verrou anti double-tap + PIN honnête (BUG-011) |
| `56c0293` | fix(argent) | TransfertPage — trois situations 404/panne/hors-ligne + échec dicté (M-P1-1, T7) |
| `34f8c0a` | fix(argent) | TransfertPage — PIN conditionnel dans la relecture ; M-P0-3 COMPLET |
| `eba2380` | fix(voix) | T7 producteur — messageUtilisateur + toasts appariés + UUID retirés (9 sites + RecolteForm) |
| `1f44736` | fix(voix) | ARG-17 — montants dictés en toutes lettres (4 sites, nombreEnMotsFr) |
| `5a56cb3` | fix(voix) | Encaissement producteur — parité dit/écrit + triple canal (haptique) |
| `48b868f` | fix(voix) | Le muet §8.1 lisible — réglage « Voix coupée » dans les Paramètres |
| (ce commit) | docs | Audit `AUDIT-UX-MARCHAND-PRODUCTEUR-VOIX-2026-10-07.md` + BUGS 011-014 + DEBT CODE-NEW-8/9 + CHANGELOG + COMMIT_LOG + worklog 23 |

Batteries rejetées sur l'état final : tsc front/back 0 · charte EXIT 0 · test:ci EXIT 0 (622 vertes) · parole-entree EXIT 0 · voix-trace-source = les 4 rouges héritées exactes · garde-argent = les 3 refus attendus.



### P0 — Gouvernance (à commiter dès validation)
1. `docs(readme): créer README.md racine point d'entrée universel` (INIT-001)
2. `docs(license): ajouter LICENSE MIT + champ license dans 3 package.json` (INIT-002)
3. `chore(env): créer backend/.env.example listant variables d'environnement` (INIT-005)

### P1 — Sécurité (à commiter après patch)
4. `fix(deps): npm audit fix — patcher 14 CVEs prod (multer, js-yaml, picomatch, qs, tmp)` (INIT-006)
5. `fix(security): hasher API keys partenaires (comme refresh tokens)` (SEC-011)
6. `fix(security): rendre BPAY_WEBHOOK_SECRET obligatoire en prod (fail-fast boot)` (SEC-022)
7. `fix(security): brancher EventsGateway sur JwtStrategy au lieu de jwtService.verify direct` (SEC-023)
8. `fix(security): cesser journaliser terme de recherche dans users.service.ts:334` (SEC-024 / SEC-04 registre)

## Commits rejetés (historique)

*(Aucun commit rejeté pour le moment — système initialisé)*

## 12/10/2026 — Vérification C-01 + resynchronisation (agent Z.ai Code)

```
docs: registres session — vérification C-01, resync arbre     (tâche 38)
```

- Session de reprise après coupure de contexte : le résumé périmé annonçait C-01 « à faire » alors que la tâche 37 l'avait déjà poussé. Aucun code produit : attestation de première main du fix (controller/service/cron/webhook conformes à la prescription audit :157), re-jeu des gates sur le contenu poussé (tsc front/back 0 · lint racine 0), resynchronisation de l'arbre principal sur origin/dev (worklog + COMMIT_LOG + LoginPassword.tsx du fix amont f739a66), nettoyage du bruit de modes 644→755 (2049 fichiers, 0 ligne).

Atomicité : 1 préoccupation = 1 commit ; ajout explicite par fichier (pas de `git add .`).

## 12/10/2026 — Déploiement PM2 (agent Z.ai Code)

```
chore(deploy): PM2 hôte — julaba-dev.ansut.ci (backend :3004, statique :8080)   (tâche 39)
docs: registres session — déploiement PM2 (tâche 39)                            (tâche 39)
```

- `chore(deploy)` : ecosystem.config.cjs (backend PM2 en fork strict, .env.production chargé via dotenv — précédence identique à env_file du compose) + docs/DEPLOIEMENT-PM2.md (guide 11 sections calé sur l'infra réelle : nginx 443 julaba-dev.ansut.ci → /api + socket.io sur 127.0.0.1:3004, statique sur 8080 ; BD compose postgres 5433 ou système ; migrations typeorm hoisté ; redéploiement zéro downtime ; 6 pièges repo — fork non cluster, secrets fail-fast, .env.production jamais commité, non-cumul Docker/PM2).
- Batteries : eslint sur ecosystem.config.cjs exit 0 ; 0 fichier TypeScript modifié (aucune gate tsc requise) ; doc vérifiée de première main (dotenv + typeorm hoistés, PORT lu à main.ts:270/:277, health /api/v1/health du compose).

Atomicité : 1 préoccupation = 1 commit ; ajout explicite par fichier (pas de `git add .`).

## 2026-10-19 — audit catalogue produits + correctif caisse tactile

1. `docs(audit): catalogue produits — ce qui bloque encore le marchand (caisse tactile)` — `.ai/AUDITS/AUDIT-CATALOGUE-PRODUITS-2026-10-19.md` (preuves fichier:ligne, 4 catalogues cartographiés, C-A1/C-A2/C-A3/C-C1, recette).
2. `fix(caisse): le marchand crée son produit au nom libre depuis « Autre article »` — POSCaisse.tsx (creerProduitDepuisFeuille, bouton 3 états, sortie d'adoption, ligne « Créer X ») + CaisseContext.tsx (addProduct renvoie le produit créé). Gates : tsc -b ✅, 5 tests unitaires purs ✅.

## 2026-10-20 — lot « Continue les corrections » : dictée du nom dans le parcours guidé + gardes héritées (agent Z.ai Code)

1. `82c7471` — `fix(voix): la dictée web préserve le nom libre comme l'APK (STK-25)` : BoutonDireProduit chemin web — le repli nomLibreDicte n'existait que sur Sherpa ; « ajoute dix kassos » était jeté sur web, gardé sur APK. Même règle aux deux oreilles.
2. `2ba6c01` — `fix(voix): le nom du produit se dicte dans le parcours guidé (audit 20/10 §5.3)` : BoutonDireNom.tsx (nouveau) + AjoutProduitGuide — bloc dictée à l'étape « nom », orthographe de son étal, unité/prix dits en même temps conservés, relecture vocale du nom transcrit (STOCK_059), refus dits (STOCK_060/061, une seule source), STOCK_046 migre. Correction d'une non-lectrice par l'oreille : redire REMPLACE + champ mot à mot.
3. `f3d42a7` — `fix(i18n): les phrases restées en dur rejoignent le catalogue (couverture)` : STOCK_062 (dictée web 821cc12) + WALLET_009 (retrait Keiwa, C-01 ef419c4) inscrites ; INVENTAIRE-VOIX régénéré (430 sites / 241 phrases) — 3 échecs hérités de test:i18n-source fermés.
4. `ab6da32` — `test(voix): gardes recalées sur le code actuel — rouges hérités du 19/10` : vente-sans-prix (bouton 3 états e3e3a63), caisse-micro + CAT-01 vente-au-catalogue (renommage venteBase 821cc12, gardes RENFORCÉES : le nom libre n'écrase jamais un nom de son catalogue).
5. (ce commit) — `docs(audit)`: AUDIT-VENTE-SAISIE-VOIX §5.3 FERMÉ + §5.4 rouges hérités hors périmètre + worklog 47.

Batteries : tsc -b front EXIT 0 (--force, code réel) ; 15 suites audit + produit-dit/premier-produit/montant-dit/i18n-argent ✅ ; gardes bouton-dire-produit/parcours-guide-parle/refus-parle/charte-marchande/vente-sans-prix/caisse-micro/vente-au-catalogue/i18n-locales/i18n-source EXIT 0 ; verify complet 146 vert / 6 rouge / 152 — 0 rouge nouveau dû au lot, 5 rouges hérités fermés ; eslint 0 erreur ; gels ci/ intacts.

Atomicité : 1 préoccupation = 1 commit ; ajout explicite par fichier (pas de `git add .`) ; messages via `git commit -F`.

## 2026-10-20 — « Passe a la suite des corrections » : fin des rouges héritées (agent Z.ai Code)

1. `test(commandes): le banc refuse-hors-ligne espionne aussi l'ÉCRIT (toast)` — refusHorsLigneCommande.test.mts : le banc extrait le VRAI source (eval) ; le toast sonner du source était absent du scope → ReferenceError. Espion toast + assertions d'écrit (B4-1/2/3 : l'écrit est humain et porte la MÊME phrase que le dit — T7). La garde ressort plus forte.
2. `test(accueil): la garde recale la porte Keiwa sur la décision du 06/10` — accueilHonnete.test.mts §PILOTE : conflit 24/09 (tuile retirée) vs 06/10 (restaurée, arbitrage §8.3 AUDIT-UX-ROLES, commit UX-6/M-P1-2 — preuve COMMIT_LOG.md:41). Assertions inversées, via code actif (lire() filtre les commentaires), historique conservé.
3. `fix(auth): effacer un numéro dit le clip login-24, plus une phrase sans clip` — LoginPassword.tsx:1048 : « Tu es en train d'effacer le numéro hein ! » = aucun clip (direEntreeTexte cherche par le TEXTE → muet sans erreur), canal machine, et nommait « numéro » (violait lot A §5). Remplacé par parle("C'est effacé net.") = AUTH_24/login-24.mp3 mot pour mot. INVENTAIRE-VOIX régénéré (430→431 sites, 241→242 phrases).
4. `test(pilote): le plancher d'argent passe de 40 à 38 routes (retrait voulu du 19/10)` — modulesPilote.test.mts : IDENTIFICATEUR-16 (b91f6a8) a retiré les 6 routes keiwa de l'identificateur ; les autres assertions de la section [5] restent vertes (toutes couvertes, rien supprimé). Le plancher continue de traquer l'érosion.
5. `chore(verify): i18n-empreintes-argent sort des CONNUS — il est guéri` — verify-tout.mjs : redevu vert (relance exit 0 à dev@3c4bc40), historique de la guérison dans le commentaire. Restent 2 CONNUS (voix-trace-source, garde-argent).
6. `docs(audit): fin des rouges héritées — les cinq sont verts, C-C1 intacte` — AUDIT-CORRECTIONS-ROUGES-2026-10-20.md + correction méthodologique (le script réel est test:prix-marchande, DÉJÀ VERT — la dette C-C1 est documentée dans le test lui-même, décision Patrick requise pour vider les prix) + COMMIT_LOG + worklog 47-bis.

Batteries : tsc -b front exit 0 (--force) ; eslint 0 erreur sur les 5 fichiers ; 15 suites vertes relancées (refus-hors-ligne, accueil-honnete, voix-connexion-lot-a, modules-pilote, i18n-source, i18n-locales, i18n-empreintes-argent, web-reco, lien-activation, auth-charte, charte-marchande, retour-frappe, micro-contraint, parole-entree, fcfa) ; **verify complet : 150 vert / 2 rouge / 152 — les 2 rouges sont les 2 CONNUS assumés, 0 rouge non-documenté** (l'audit consolidé du matin était 146/6).

Atomicité : 1 préoccupation = 1 commit ; ajout explicite par fichier (pas de `git add .`) ; messages via `git commit -F` (jamais /tmp) ; UN seul heredoc par commande bash.
