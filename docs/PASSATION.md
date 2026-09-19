# Passation — JULABA historique

Maintenu par l'instance **JULABA historique** (celle-ci), seule autorisée à
concevoir les changements, ouvrir des branches, committer et merger sur ce
dépôt (décision Patrick, 15/09/2026).

## Organisation

- **JULABA historique** (cette instance) : conçoit, code, teste, commit,
  merge. Seule source de vérité pour l'état de `main`.
- **Instance de preuve locale** : environnement sandbox (Postgres 16, Node,
  Chromium) — exécute builds, tests E2E et recettes (PILOTE-2, PILOTE-3)
  contre des services locaux/jetables. N'a **aucun accès réseau au VPS ni à
  Odoo réel**. N'écrit plus dans Git de sa propre initiative : reçoit des
  commandes précises de JULABA historique, exécute, retourne la sortie
  brute complète. Une anomalie découverte est **signalée**, jamais corrigée
  dans le dépôt de sa propre initiative.
- **VPS / Odoo réel** : environnement externe, manipulé **par Patrick
  lui-même**, à partir de commandes exactes préparées par JULABA historique
  (aucune instance IA n'y a d'accès direct).
- **`main` est la seule source de vérité.** Toute nouvelle tâche commence
  par un `git fetch origin main` + resynchronisation.
- Décisions irréversibles (appId Android, changements de doctrine produit)
  restent soumises à Patrick.

Objectif explicite : plus de branche concurrente sur le même sujet, plus de
double correctif, plus de réconciliation manuelle entre instances.

## ⚠️ ÉTAT AU 19/09/2026 — À LIRE EN PREMIER

**Le travail du 19/09 n'est PAS sur `main`.** Il vit sur une branche, non
fusionnée. Toute autre session qui reprend ce dépôt doit partir de LÀ, sinon
elle refera ce qui est déjà fait.

| | |
|---|---|
| Branche de travail | **`claude/clever-allen-dnr8by`** |
| Tête de branche | **`40dde11`** |
| `main` | **`59b9142`** — 14 commits en retard |
| Fusion vers `main` | **PAS faite. Aucune PR ouverte** (aucune n'a été demandée) |

### Portes, mesurées sur `08abbde`

```
node ci/check-tsc-baseline.mjs          → 0 erreur (cliquet)
npm run verify -w frontend_src          → vert (56 scripts)
npm run test:ci -w frontend_src         → vert, GELÉ et NON MODIFIÉ
npm run test:unit -w backend            → 196 tests verts
npm run build -w frontend_src           → vert
npm run build -w backend                → vert

# Invariants (PostgreSQL réel — à démarrer d'abord) :
./scripts/pg-test-local.sh start
npx jest --config backend/jest-invariants.config.cjs --runInBand --forceExit
                                        → 39 suites / 188 tests verts
```

### Les 12 commits du 19/09, dans l'ordre

| SHA | Lot | Ce qu'il fait |
|---|---|---|
| `ee30077` | HYGIÈNE-1 axe 1 | 99 fichiers / 17 899 lignes de code mort supprimés, prouvés inatteignables. 1 conservé, zéro inexpliqué |
| `9d74fec` | HYGIÈNE-1 axe 2 | Convergence API auth/caisse/vente/stock. **4 rafraîchissements de session → 1** (trois ne pouvaient pas marcher dans l'APK, trois ignoraient le verrou → risque de révocation de TOUTES les sessions) |
| `ed9321b` | HYGIÈNE-1 axe 3 | 3 champs pour « le bénéfice » → 1. `config/devise.ts` enfin câblé |
| `56b4168` | HYGIÈNE-1 axe 4 | 48 `any` de donnée → 0 aux frontières argent/stock/session/hors-ligne. `types/vente.ts` créé |
| `53695a4` | HYGIÈNE-1 | **Retrait** de 3 correctifs visibles par la marchande, hors mandat d'hygiène |
| `5de6893` | Règle | La fausse convergence écrite en tête du garde-fou |
| `fa104ce` | ARGENT-1 | Les 2 défauts d'argent reproduits **en ROUGE**, avant toute correction |
| `1d1f38a` | ARGENT-1 | Marge du panier mixte (400 → 100) + la dépense porte son jour comptable |
| `ca946da` | ADR-0003 | Correction d'une affirmation fausse sur la devise |
| `01fd765` | ARGENT-2 | Les 2 défauts hors caisse reproduits **en ROUGE** |
| `974de94` | ARGENT-2 | « revenus » = recette (67 000 → 40 000) + les alertes de rupture partent enfin |
| `08abbde` | Dette | A3/B2/B3 vérifiés sans correction — **et B1 confirmé** |
| `5777475` | Passation | État du 19/09, décision ouverte, pièges |
| `40dde11` | **B1** | La colonne du ledger posée par DbInit + le garde-fou qui l'exige |

## ✅ B1 — CORRIGÉ le 19/09/2026

`stock_mouvements.type` n'était créée que par la migration
`1780400000000-LedgerMouvementType`, qui ne tourne jamais sur une base vierge
(`migrationsRun: false`). La table n'a aucune entité, donc `synchronize` ne la
crée pas non plus. **DbInit était le seul mécanisme possible, et il ne le
faisait pas.**

Conséquence, avant correction, sur tout déploiement neuf : annuler une vente
échouait sur `column "type" does not exist`, l'exception remontait hors de la
transaction, et le rollback rendait la vente à nouveau valide — l'argent
restait compté, le stock restait retranché, la marchande entendait « Je n'ai
pas pu annuler cette vente » sans recours. `GET /stocks/mouvements` répondait
500 en permanence.

**Correctif** : la colonne est posée par DbInit, DDL identique à la migration
(règle « DbInit ⊆ migrations », ADR-0002). Additif et idempotent — donc juste
que la production porte déjà la colonne ou non. C'est ce qui a permis de
trancher sans attendre : les deux options (a)/(b) menaient au même code.

**Ce qui l'avait masqué est retiré** : `annulation-remise-stock.spec.ts`
appliquait la migration lui-même dans son `beforeAll`. Le test qui aurait
attrapé le défaut réparait le schéma pour se rendre vert. Il CONSTATE
désormais.

**Garde-fou** : `backend/test/invariants/schema-ledger-sans-migration.spec.ts`
boote l'application comme la production le fait — DbInit seul, aucune
migration — et vérifie les colonnes du ledger, la requête réelle du panneau
« Derniers mouvements » et l'INSERT réel de la restitution. Il échouera le jour
où du DDL sera ajouté à une migration sans être porté dans DbInit.

**Prochaine étape : APK terrain.** Patrick a explicitement exclu tout lot
supplémentaire avant.

## Règles posées par Patrick le 19/09 — elles survivent à ce lot

1. **Sur l'argent, la preuve doit TRAVERSER** : entrée métier → contrôleur →
   donnée persistée → lecture/affichage ou voix. *Un test de fonction ne prouve
   plus qu'un parcours est correct.* (Le dépôt avait 195 tests backend et zéro
   sur la marge ; le seul test de marge vérifiait une fonction qui ne
   s'exécute presque jamais.)
2. **Un lot d'hygiène ne change RIEN d'observable par la marchande.** Dès
   qu'un correctif touche un écran, un calcul métier, une phrase de Tata, une
   règle de stock ou une donnée persistée, il sort du lot et devient un
   chantier fonctionnel séparé.
3. **Unifier un appel ne suffit pas** : il faut vérifier que les deux appels
   portent le même **sens métier**. Critère opérationnel : écrire la phrase
   « ces deux appels demandent la même chose au serveur, au sens métier ». Si
   elle ne s'écrit pas, on ne converge pas.
4. **Pas de correction parce que « ça semble faux »** : reproduction d'abord,
   résultat faux observé, sinon dette documentée et on avance.
5. **ARGENT-1 et ARGENT-2 sont FERMÉS.** On ne les rouvre pas pour « nettoyer
   encore ». Seul un bug reproductible peut les rouvrir.
6. **Les 4 arbitrages différés d'ADR-0003** (unité de la vente côté modèle,
   facteurs de conversion, vocabulaires d'unités, stockabilité) restent
   différés et assumés.

## Pièges découverts le 19/09 — à ne pas repayer

- **Le faux vert de schéma** (B1 ci-dessus) : un test qui répare le schéma
  pour se rendre vert prouve le contraire de ce qu'on croit.
- **Espace insécable** : `montantAffiche()` (`config/devise.ts`) place un
  U+00A0 entre le montant et le « F » — voulu. **Les montants se comparent au
  formateur canonique, jamais à une chaîne recopiée.** L'erreur a été commise
  trois fois.
- **Base d'invariants PARTAGÉE** entre toutes les suites (`globalSetup` la
  recrée une fois par exécution, pas une par fichier). Conséquences :
  mesurer en **delta** sur tout agrégat global, et ne jamais réutiliser un
  numéro de téléphone (signup → 409, la suite passe seule et échoue en
  groupe). Garde-fou : `backend/test/unit/telephones-tests-uniques.spec.ts`.
  Plage réservée aux suites ARGENT : `+22507888800xx`.
- **Route masquée** : `misc-rest.controller.ts` `@Get('transactions')` n'est
  jamais atteint — `TransactionsRestController` gagne la route. Documenté,
  **non traité** (ce n'est pas un défaut utilisateur tant qu'il n'est pas
  atteint).
- **La place de marché lit `/caisse/produits`**, qui ne renvoie que le
  catalogue de la marchande elle-même. L'authentifier lui présenterait son
  propre stock comme l'offre d'autres vendeurs. Exception **nommée** dans le
  garde-fou `test:convergence-api` — ne pas « corriger » par réflexe.

## Dette vérifiée et documentée (aucune correction faite)

| Constat | Où | Gravité |
|---|---|---|
| ~~**B1**~~ — `stock_mouvements.type` absent sur base neuve | `docs/dette/AUDIT-BASE-constats-verifies.md` | ✅ **corrigé**, avec garde-fou |
| **B2** — l'unité d'un mouvement passé est relue du catalogue actuel (5 tas deviennent 5 kg) | idem | Dégrade l'information |
| **B3** — `manquant` écrit, jamais lu ; la vente hors stock est exclue de l'affichage | idem | Dégrade l'information |
| **A3** — un acompte de crédit n'écrit aucune transaction de caisse → écart de clôture fantôme | idem | **Latent** (`CAISSE_CREDIT_ACTIF = false`) |

Les reproductions sont exécutables :
`backend/test/invariants/dette-audit-a3-b2-b3.spec.ts`. Ce test **décrit** les
défauts sans les approuver — il affirme le comportement actuel pour rester
vert. **Le jour où quelqu'un corrige, il échouera**, et ce rouge voudra dire
« c'est réparé, mets le registre à jour », pas « régression ».

Registres des lots : `docs/hygiene/HYGIENE-1-axe{1,2,3,4}-*.md`.

## État courant (antérieur, 15/09/2026)

- `main` à **`1958d6a`** (15/09/2026) — **périmé, voir l'état du 19/09
  ci-dessus**.
- Backend : 161/161 tests unitaires verts, `tsc --noEmit` propre.
- Frontend : `npm run verify` et `npm run test:ci` verts, `npm run build`
  réel réussi.

## Lots clos

| Lot | Contenu | Repère |
|---|---|---|
| PILOTE-1 | Odoo 19 réel + contrat JSON-2 + `OdooRealClient`, filtre catalogue sur `is_storable` (mesuré, pas supposé — `sale_ok` s'est révélé ne pas discriminer) | `865afde`, `24605d7` |
| #239 | Validation du backend JULABA contre Odoo réel (fermé vert) | — |
| #75 / #76 | Recette espèces bout-en-bout + checklist GO pilote (déclaré GO) | PR #75, #76 |
| P0-1 / P1-1 | Cloisonnement par utilisateur : `offlineCaisse` (déjà correct) et `useOfflineVoiceQueue.clearQueue()` (bug réel, corrigé) | `85b7b4b` |
| PILOTE-2 | Caisse espèces/offline, 8 invariants (dont « le serveur encaisse mais la réponse se perd ») | `a355d1d` |
| Référentiel maître | 198 produits vivriers injectés et vérifiés sur le vrai Odoo (198/198, idempotent, prix nuls par construction) | `b2c8035` (kit), import réel exécuté sur le VPS/Odoo réel |
| PILOTE-3 lots 1-2 | Miroir Postgres `catalogue_maitre` + synchro idempotente + `GET /catalogue-maitre` | `0c5e4c0` |
| PILOTE-3 lot 3 | Adoption backend (`produits.default_code`, prix > 0 obligatoire côté marchande, unicité par marchande) + écran d'adoption depuis « Autre article » | `183ed90`, `39b6a0b` |
| PILOTE-3 lot 4 | Recette e2e, 7 invariants, Odoo injoignable | `008b4c2` |
| PILOTE-3 durcissement | Course concurrente sur l'adoption (23505 non capturé → 500 brut), migration formelle manquante (ADR-0002), contrainte nommée explicitement dans le `catch` | `375f8c6`, `b79206f`, `e21a98a` |
| Porte Android — URL API | APK sans `VITE_API_URL` ne joignait aucun backend (repli relatif résolu contre l'origine interne du WebView). Deux correctifs indépendants réconciliés — doctrine retenue : panne bruyante (URL `.invalid` RFC 2606 + `console.error`), jamais de repli deviné | `1958d6a` (fusion de `7a0cb7c` et `3a0b90a`) |

**Doctrine centrale de PILOTE-3, à ne pas rouvrir** : Odoo ne porte que le
référentiel (nom, catégorie, référence) — **jamais de prix**. Le prix
appartient à chaque marchande, posé à l'adoption, jamais partagé. Ce n'est
pas un garde-fou applicatif, c'est une absence de colonne
(`catalogue_maitre` n'a pas de champ prix).

## Lot actif

**Voix absente sur mobile v5** — diagnostic fait, **aucun correctif encore
appliqué** (consigne explicite : diagnostic d'abord).

Piste principale (code lu, pas encore confirmée sur appareil réel) :
`useAudioUnlockFallback` (`LoginPassword.tsx`) est branché pour les étapes
`reconnaissance` (L278) et `phone` (L609), **pas** pour `password`. Une
marchande connue sur l'appareil mais sans biométrie atterrit directement sur
l'écran PIN (`step: 'password'` dès le premier rendu) ; sa consigne vocale
part avant tout geste dans la session et se fait couper par la politique
autoplay du navigateur — en silence.

Deux protocoles de confirmation terrain restent à faire (décrits dans la
conversation) avant tout correctif : reconnexion sur appareil connu sans
biométrie (repro piste #1), et rapport de diagnostic intégré (`🐞 Rapport de
test`, mode dev) pour vérifier `speechSynthesis`/voix disponibles (piste #2,
alternative).

## File d'attente (retours « Bernard »), dans l'ordre décidé par Patrick

1. ~~Stock vendable sans couverture~~ — **clos**, aucun patch. Décision
   produit confirmée : le stock ne bloque jamais une vente, clamp à 0 +
   journalisation du manquant (`stock_mouvements.manquant`), doctrine déjà
   implémentée et volontaire.
2. Voix absente sur mobile v5 — **en cours** (voir ci-dessus).
3. « Ouvre ta journée » — vérifier le câblage exact du bouton/carte
   (`RoleDashboard.tsx` ~L286-393) — pas encore commencé.
4. Retours arrière / chevauchement menu / responsive — pas commencé.
5. Genre « Maman »/« Papa » — pas commencé.
6. Libellés + message de bienvenue — pas commencé.
7. ~~Crédit à la vente~~ — **hors pilote, ne pas rouvrir** (`CAISSE_CREDIT_ACTIF = false`, doctrine déjà actée : stock/idempotence non prêts pour le crédit).

## Invariants gelés (ne pas rouvrir sans décision explicite)

- **CI gelée** : `.github/workflows/ci.yml` n'appelle que `npm run test:ci
  -w frontend_src` (+ `test:unit -w backend`). Aucun ajout à `test:ci` tant
  que la recette terrain n'est pas faite — nouveaux tests dans `verify`
  uniquement (frontend) ou dans la suite `test:unit` déjà existante
  (backend, non gelée).
- **`ODOO_REAL_WRITE_ENABLED` reste `false`** — aucune écriture JULABA →
  Odoo tant qu'un journal de synchronisation persistant (pas en mémoire)
  n'existe pas.
- **Doctrine stock** : jamais de blocage de vente pour rupture — voir point
  1 de la file d'attente.
- **Crédit à la vente** : hors périmètre pilote — voir point 7.
- **Prix Odoo** : structurellement absent du référentiel maître — voir
  doctrine PILOTE-3 ci-dessus.

## Arbitrages ouverts (décision Patrick requise)

- ~~**appId Android**~~ — **tranché le 15/09/2026**. Pilote = APK posé à la
  main, publication Play Store reportée après validation terrain. Le nom
  reste donc provisoire, à condition d'être stable sur les appareils : la
  ligne orpheline `ci.julaba.app` de `capacitor.config.ts` est alignée sur
  `com.julaba.app`, que portent déjà sept autres emplacements (dont le
  schéma d'URL des liens profonds). Le nom définitif se tranchera à la
  publication, seul moment où il devient irréversible. Voir
  `JULABA_DECISIONS.md` § 9.
- **Homonymie catalogue** : une marchande peut se retrouver avec deux
  produits au même nom (un « libre », un adopté via une référence Odoo) —
  ex. « Tomate | 200 F/kg | (libre) » et « Tomate | 500 F/tas | TOM-001 ».
  Connu, documenté dans `39b6a0b`, pas corrigé — décision produit (fusionner
  visuellement ? proposer de relier au produit existant ?), pas technique.
- **Version Android figée** : `versionCode 1`, `versionName "1.0"`, jamais
  incrémentés — pas bloquant tant qu'aucune publication réelle n'a eu lieu.
- **Cleartext traffic** : aucun `usesCleartextTraffic` ni
  `networkSecurityConfig` dans le manifest Android. Sans effet tant que le
  backend cible reste en HTTPS (`https://julaba-api.onrender.com`) — à
  traiter seulement si un jour l'APK doit parler à un backend en HTTP clair
  (ex. VPS local sans certificat).
