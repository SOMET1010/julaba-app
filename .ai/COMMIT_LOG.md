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

## Commits à venir (planifiés)

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
