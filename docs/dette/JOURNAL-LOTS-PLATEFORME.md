# Journal des lots plateforme — JULABA

Un lot par entrée : périmètre, reproduction, verdicts, ce que ça ne prouve pas.
Le registre maître (`REGISTRE-MAITRE.md`) porte les statuts ; ce journal porte
le **comment** de chaque contre-audit, court, pour qu'on puisse le rejouer.
Règle de pilotage : *QA par lot dès la première livraison ; le lot est audité
avant que sa fermeture n'entre dans le registre.*

Les lots A et F s'ajouteront ici. Une PR externe (Manus) auditée a son entrée
au même titre qu'un lot. Un lot **audité mais non fusionné** a une
entrée aussi : elle dit ce qui est prouvé et ce qui attend une décision.

---

## Lot D — API (couche réseau frontend)

**Livré** : `d306e95` → `738fb53` (6 commits, base `3917bb7`). **Contre-audité**
le 20/09/2026, **fusionné** en `19eeeaa`. **Registre** : révision 21.

### Périmètre

API-04 (la couche pose `Authorization`), TYPE-03 (patch de `main.tsx` typé),
API-03 (`useWebAuthn`), API-05 (`getCurrentUser`), API-07 / API-08
(convergence de `useRealtime` et `getSystemSettings`), API-10 (compte des
`fetch()` directs). Huit fichiers touchés, tous dans `frontend_src/`. Aucun
test existant modifié ; `test:ci` identique ; un script ajouté à `verify`
(`test:api-authorization`).

### Reproduction (rejouée par QA, pas lue dans le rapport)

- `apiClientAuthorization.test.mts` contre l'`api-client.ts` de `3917bb7`
  (copié par `git show`, puis restauré) : **exit 1, 9 ❌** — chaque appel part
  sans `Authorization`. Contre `738fb53` : **exit 0, 0 ❌ / 27 ✅**.
- `test:jargon` sur `0d01f6b` (avant la reformulation de `738fb53`) : **exit 1,
  2 violations**, toutes deux dans des **commentaires** — c'est la limite
  GARDE-01, pas un défaut du lot.
- `tsc -b`, `npm run verify`, `npm run test:ci`, `npm run build`,
  `test:biometrie-session` : **0** partout, dans un worktree détaché à `738fb53`.

### Ce qui a été attaqué, et ce qui a tenu

- Jeton **relu à chaque essai** : `enTetesPourEssai()` appelée aux deux `fetch`
  (initial l. 154, rejeu l. 172) — rien capturé à la construction.
- Rejeu après 401 → `rafraichirSession` écrit le jeton neuf **avant** que le
  rejeu ne le relise.
- `main.tsx` et `api-client.ts` posent **le même en-tête depuis la même clé**,
  chacun derrière `Headers.has('Authorization')` : ni écrasement, ni doublon.
- File hors-ligne : le test **reproduit** `posterOperation` au lieu de
  l'importer ; le vrai `CaisseContext.tsx` (l. 26-38) fait bien
  `caisse-api` / `apiRequest`, la copie est fidèle.
- `/auth/refresh` sans en-tête : voulu (cookie + `refreshToken` dans le corps).
- Règle « aucun appel authentifié ne décide lui-même d'un 401 » : tenue **dans
  la couche**. Hors couche, 4 décisions locales restent (`ChangePasswordScreen`,
  `AppContext` ×3), préexistantes, non touchées par D → API-10.
- Compte des `fetch()` directs : **164** (mono-ligne, garde-fou) et **173**
  (registre) sont **la même réalité** — 9 appels multi-lignes ou à URL en
  variable séparent les deux. Méthode écrite dans API-10.
- API-03 : les 2 appels directs restants n'ont qu'un appelant,
  `LoginPassword.handleBiometric`, qui range les jetons reçus — avant-session.
- API-08 : `GET system/settings` sous `@UseGuards(JwtAuthGuard, RolesGuard)`,
  aucun `@Public` dans le backend — la justification tient, le défaut est backend.
- API-07 : `useRealtime` → `BODashboard` seulement, base `/api/v1` relative.

### Verdicts

| Dette | Verdict |
|---|---|
| API-04 | **FERMÉ** — 9 ❌ → 0, jeton relu à chaque essai, filet de `main.tsx` plus porteur |
| TYPE-03 | **FERMÉ** — patch typé ; correction : il disparaît avec **API-10**, pas API-04 |
| API-03 | **FERMÉ** sur périmètre nommé — tout appel en session par la couche ; 2 appels avant-session exemptés nommément |
| API-05 | **FERMÉ** — 0 consommateur |
| API-07 | **OUVERT** — convergence refusée, justifiée (session back-office → API-09) |
| API-08 | **OUVERT** — convergence refusée, justifiée ; bloquée par API-11 |
| API-10 | **OUVERT** — 173 re-mesuré, méthode écrite |

**Ouvertes par ce contre-audit** : **API-11** (backend : `/system/settings`
gardée par JWT mais consultée avant connexion), **AUTH-01** (`getValidToken` /
`isAuthenticated` mortes), **GARDE-01** (`test:jargon` lit les commentaires ;
`test:api-authorization` compte mono-ligne).

**Règle nouvelle, sortie du croisement des lots A et B** : jamais deux suites
d'invariants en parallèle sur le Postgres partagé — chacun voyait les tables de
l'autre dans son gate.

### Ce que ça ne prouve pas

- Aucun test contre un vrai serveur : que le backend accepte `Authorization`
  en plus du cookie sur toutes les routes reste une hypothèse (déjà tenue par
  le patch en production).
- Le test de file hors-ligne reproduit `posterOperation` (non exportée) : une
  dérive du vrai `CaisseContext` ne serait pas vue.
- La règle du 401 n'est prouvée que **dans** la couche ; les 4 décisions
  locales hors couche restent (API-10).
- Le build vert ne dit rien du comportement réel dans l'APK (cookies bloqués) :
  non exercé.

---

## Lot E — VOICE-01 (trace vocale de bout en bout)

**Livré** : `aa2f992` → `3437272` (base `3917bb7`). **Contre-audité** le
20/09/2026 (QA-E), **fusionné** en `b9534e7` (`--no-ff` ; conflit `package.json`
résolu en concaténant `verify` : `+ test:voix-trace`, `+ test:voix-trace-source`).
**Registre** : révision 22.

### Périmètre

VOICE-01 (le transcript brut et le choix de voix exposés à la recette terrain).
14 fichiers, tous dans `frontend_src/` : journal `utils/voiceTrace.ts` (329 l.)
+ son test, garde-fou `scripts/test-voix-trace-source.mjs` + fixture
`scripts/fixtures/parole-3917bb7.json`, `voiceDebug.ts` (module de rapport,
réécrit), bouton « Rapport de test » dans `UniversalParametres.tsx`, et 7
fichiers **instrumentés** (`audioManager`, `elevenlabs`, `useVoiceCore`,
`AppContext`, `offlineStt`, `nativeTts`, `AppLayout`). Fichiers interdits
(`POSCaisse`, `MicroVenteCaisse`, machine et grammaire d'encaissement,
`api-client`, `main.tsx`, backend) : absents du `--stat`. `test:ci` identique ;
aucun test existant modifié ; 2 scripts ajoutés à `verify`.

### Reproduction (rejouée par QA-E)

- `test:voix-trace-source` copié sur `3917bb7` : **28 échecs, exit 1** (26 en
  section A « tout passe par le journal », 2 en C « bouton Paramètres »). La
  section B (empreintes + inventaire, 30 vérifications) est **verte sur la
  base** : la fixture a été calculée depuis `3917bb7`, le garde-fou n'est pas
  circulaire.
- `test:voix-trace` sur `3917bb7` : `ERR_MODULE_NOT_FOUND`, exit 1.
- Dans le worktree du lot : `tsc -b`, `verify`, `test:ci`, `build` = **0**.
  Rejoués par le coordinateur après fusion, sur `b9534e7` : **0** partout.

### Ce qui a été attaqué, et ce qui a tenu

- **Invariant « zéro modification de comportement vocal »** : pour les 7
  fichiers, `git show 3917bb7:<f>` vs version du lot sans les lignes
  `vtrace.`/`voiceTrace` → diff vide ; aucune ligne `-` dans le diff ; aucune
  insertion entre `return` et son expression ; aucun `await`, `try/finally`
  ajouté ; `_generation`/`_inFlight` intacts (« la plus récente gagne »).
- **Jets** : `tracer()`, `persister()`, `pile()`, `heure()`, `rendu()` sous
  `try` ; arguments limites testés (objet circulaire, `null`, `undefined`,
  non-objet) → aucun jet. Seule `court()` est hors `try` (GARDE-02 L2).
- **Coût** : `persister()` synchrone à chaque événement, journal plein
  99 001 octets, ~0,32 ms/événement (GARDE-02 L1).
- **Journal** : anneau borné à 200 (250 injectés → 200), ordre non décroissant,
  persistance/rechargement vérifiés, textes tronqués, données d'argent limitées
  à ce qui est dérivé de la phrase dictée, `vlogStart` ne vide pas l'anneau.
- **Rapport** : répond aux deux questions de Patrick (quelles voix, dans quel
  ordre, depuis quel écran ; qu'a entendu le STT, quelle intention).
  Bouton rendu inconditionnellement pour les 5 rôles, 44 px, aucune garde dev.
- **Garde-fou de source** : rougira à raison — `speakMessage(` n'est pas dans
  l'inventaire regex, toute édition des 7 fichiers instrumentés casse le SHA
  « sans journal », toute retouche Manus des 7 fichiers de règles casse
  l'empreinte. Le message d'échec ne cite pas `--regenerer` (GARDE-02 L3).
- **Écart du rapport de l'agent E** : il nommait `voiceDebug.ts` parmi les 7
  fichiers à empreinte ; c'est `AppLayout.tsx`. `voiceDebug.ts` est bien
  réécrit (module de rapport, pas module vocal) : justifié, mais la description
  du lot était imprécise — corrigée ici.

### Verdicts

| Dette | Verdict |
|---|---|
| VOICE-01 | **FERMÉ** — rapport complet et accessible connecté ; invariant vocal prouvé ; 28 ❌ → 0 |
| VOIX-04 | **OUVERT, owner Manus — reclassée P1 fonctionnel voix par Patrick, à corriger avant l'APK terrain final** — réponses « pas compris » / « rien entendu » de la dictée caisse muettes (clés absentes de `TATA_CLIPS` → `text_only`) ; aucune correction Claude |
| VOIX-05 | **OUVERT, owner Manus** — deux timbres au démarrage (synthèse pour l'accueil, clip mp3 pour « Entre ton code secret ») ; Patrick : « à mesurer sur le terrain avec le journal E » ; aucune correction Claude |
| GARDE-02 | **OUVERT** — L1 `persister()` synchrone, L2 `court()` hors `try`, L3 message d'échec sans `--regenerer` |

**Règle E × F, tranchée par Patrick** (elle remplace la proposition §5c de
QA-E) : F modifie les appels ; E/QA vérifie la résolution sémantique — ancien
texte résolu → nouvelle clé → nouveau texte résolu, identité exigée sauf
changement de formulation explicitement décidé ; ensuite seulement le snapshot
est régénéré, **jamais par l'auteur du lot**. Le snapshot protège le sens
prononcé, pas l'implémentation de l'appel. Écrite dans les règles du registre.

### Ce que ça ne prouve pas

- Aucune exécution sur téléphone : contenu réel de `TTS_VOIX_NAVIGATEUR`, sonde
  SherpaTts/SherpaStt, coût réel de `localStorage.setItem` sur WebView Android,
  comportement de `navigator.share` — lecture et simulation Node seulement.
- VOIX-05 reste une hypothèse tant qu'un rapport terrain n'a pas été lu.
- Gates lancées avec les `node_modules` de la racine (dépendances inchangées),
  pas avec un `npm ci` neuf.

---

## Lot B — crédit backend (AUDITÉ, NON FUSIONNÉ)

**Livré** : `3574f8f` (base `3917bb7`). **Contre-audité** le 20/09/2026 (QA-B).
**Non fusionné** : fusion suspendue aux décisions de Patrick ci-dessous.
**Registre** : révision 22 — **aucun statut B ne bouge** ; les verdicts ci-dessous
sont *proposés* et n'entrent au registre qu'à la fusion.

### Périmètre

ARG-04 (idempotence de création d'un crédit), TYPE-02 (DTO du contrôleur
crédit), ARG-11 (I6 : trace de la vente à crédit), CLIENT-02 marche 1
(`credits.client_id`). Backend seulement : `git diff --name-only` ne montre
aucun fichier `frontend_src`.

### Reproduction (rejouée par QA-B, sur base dédiée)

- **Contamination du Postgres partagé prouvée** : `test-db.ts` prend
  `DB_NAME=julaba_test` par défaut, `global-setup.ts` fait
  `DROP DATABASE … WITH (FORCE)` ; `julaba_test` contenait `pin_recovery_codes`,
  table absente de tout l'arbre B et présente seulement dans le worktree de
  l'agent A. QA-B a donc tout rejoué sur `julaba_qab_test` / `julaba_qabase_test`
  (détruites à la fin) : **241/242, 45 suites, seul rouge = empreinte**
  (`credits`, `credits_avec_statut`), 61 tables, pas de `pin_recovery_codes`.
  Les chiffres de B sont **reproduits sur base propre**. Ce mécanisme est
  inscrit au registre en **TEST-05** (P1 outillage) : la règle humaine
  « jamais deux en parallèle » est nécessaire tout de suite mais n'est pas la
  solution. Séquence imposée : QA-B seul → remise à zéro → QA-A seul.
- Nouvelle `blockers.spec.ts` contre le backend `3917bb7` : **8 échecs / 4
  réussites, exit 1**, chaque rouge sur l'invariant (I4, I4b, I4c, I4d, I6a,
  I6b, CLIENT-02 marche 1 et repli). À savoir : I6c et I6d passent déjà sur
  l'ancien code (non discriminants). I4 promu tel qu'écrit (diff vide).
- Codes : `test:unit` 218/218 → 0 ; `test:invariants` isolé → 1 (empreinte
  seule) ; `check-tsc-baseline` 0 = 0 → 0 ; `schema-pilote.mjs` → 1 (cite
  `credits, credits_avec_statut`, arrêt 2/5) ; `verify-dbinit-subsumed` → 1
  (**5 objets non portés par les migrations**).

### Ce qui a été attaqué (8 cas, spec scratch supprimée après)

- Idempotence **tenue** : rejeu vérifié avant toute écriture, transaction
  unique, sans clé → 400 par DTO ; simultané même clé → 1 crédit, 1 acompte,
  même id ; deux clés différentes sur cliente nouvelle → 1 cliente, 2 crédits ;
  `client_id` d'une autre marchande → 400, rien écrit.
- **Deux marchandes, même clé brute → 201 puis 409** : `ux_caisse_tx_idempotency_key`
  est global ; le commentaire « deux marchandes peuvent tirer la même clé sans
  se voir » est faux → **ARG-15 (P3 dormant)**.
- **I6 / trace** : 7 lecteurs `type='vente'` comptent désormais la vente à
  crédit comme CA (`admin.service:71`, `financial-score.service:89/95/113/135`,
  `scores.service:216`, `zones.service:34`, `misc-rest.controller:233/301`) ;
  seul `caisseTheorique` l'exclut. **Double compte à la réactivation confirmé
  par lecture** (`VentesPassees.tsx` l. 340-352, `AppContext.tsx` l. 1008-1029),
  dormant tant que `CAISSE_CREDIT_ACTIF=false`. Côté téléphone, `creerCredit`
  tire une clé neuve à chaque appel : pas d'idempotence bout en bout.
- **Annuler la vente issue d'un crédit** : 200, stock restitué, `statut='annulee'`,
  mais crédit `en_cours`, `montant_du` intact — marchandise rendue, dette
  maintenue → **ARG-13 (P1 dormant)**.
- **Trois écarts avec `/caisse/vente`** : pas de `caisse_sessions`,
  `date_operation` retirée par le `whitelist` du DTO, pas d'`emitTransactionCreated`
  ni `checkStockApreVente`, `details` non normalisé → **ARG-14 (P2 dormant)**.
- CLIENT-02 marche 1 tenue : colonne nullable, aucun backfill, repli byte-identique.
- Schéma : DbInit idempotent, second démarrage vert ; **pas d'entité TypeORM
  `credit.entity`** (table en SQL brut) — la déclaration de B est à corriger.

### Verdicts proposés (n'entrent au registre qu'à la fusion)

| Dette | Verdict proposé |
|---|---|
| TYPE-02 | **FERMÉ à la fusion** — 0 `: any`, 4 DTO, `ValidationPipe whitelist`, 11 tests |
| ARG-04 | **FERMÉ à la fusion** — clé exigée, index unique partiel `(marchand_id, idempotency_key)`, rejeu → même crédit ; réserves à part : ARG-15, clé de création non stable côté téléphone |
| ARG-11 | **reste OUVERT** — I6 techniquement correcte ; la convention est maintenant tranchée (décision 1) ; conditions restantes : les 7 agrégats à corriger, double compte téléphone (anomalie, plus dormance), clé stable côté téléphone, ARG-13, ARG-14, CLIENT-02, migration ADR-0002 |
| CLIENT-02 | **OUVERT** — marche 1 faite ; restent la clé `(marchand_id, nom)`, `GET credits/clients/:nom` par `ILIKE`, téléphone n'envoie pas `client_id` |
| ARG-13 / ARG-14 / ARG-15 | **nouvelles**, P1 / P2 / P3 dormant — libellés ci-dessus |

### Décisions de Patrick (QA-B §9)

1. **Convention comptable — TRANCHÉE (révision 22)** : *vente à crédit =
   chiffre d'affaires commercial, mais pas encaissement de caisse.* Une seule
   vente (`type='vente'`, `mode_paiement='credit'`), stock décrémenté à la
   vente, créance créée dans la même transaction, **zéro entrée de caisse** à
   cet instant ; règlement ultérieur = encaissement distinct, jamais une
   seconde vente ; aucun double comptage de CA ; les agrégats distinguent
   explicitement ventes / encaissements / créances / règlements. Conséquence
   pour B : le défaut n'est pas `type='vente'`, ce sont les **7 agrégats qui
   lisent `type='vente'` comme « argent encaissé »** (liste ci-dessus) — à
   corriger. Le **double compte téléphone** (`VentesPassees.tsx` l. 340-352,
   `AppContext.tsx` l. 1008-1029) devient une **anomalie à corriger avant
   activation du crédit**, plus une dormance tolérée. ARG-11 reste OUVERT.

Restent **à définir** :

2. **Annulation d'une vente à crédit** (ARG-13) : interdite tant que le crédit
   existe, ou annule aussi le crédit et la dette ?
3. **Identité de la cliente** (CLIENT-02) : téléphone ? choix explicite ?
4. **Clé d'idempotence inter-marchandes** : accepter le 409 (corriger le
   commentaire) ou scoper par marchande.
5. **Datation hors ligne** des ventes à crédit (`date_operation`) : même règle
   que `/caisse/vente` ?

**Point d'intégration C** : `verify-dbinit-subsumed` sort exit 1 avec exactement
**5 objets non portés par les migrations** — `credits.client_id`,
`credits.idempotency_key`, `credits_avec_statut.client_id`, `idx_credits_client`,
`ux_credits_marchand_idempotency` : c'est la migration que l'agent C doit écrire.
Empreinte : 60 tables / 684 colonnes → 687 attendu, non figé.

### Ce que ça ne prouve pas

Aucun test frontend exécuté ; le double compte est établi par lecture, pas en
réactivant le drapeau ; le crash entre deux écritures est couvert par
construction (une transaction), non par expérience ; concurrence testée à 2
requêtes ; `mode_paiement='credit'` est une chaîne libre sans contrainte ; les 44
autres suites d'invariants n'ont pas été relues ligne à ligne.

---

## Lot C — schéma (AUDITÉ, NON FUSIONNÉ)

**Livré** : `9d15935` (base `3917bb7`). **Contre-audité** le 20/09/2026 (QA-C).
**Non fusionné** : fusion suspendue aux décisions 1-5 de Patrick ci-dessous,
dont l'ADR-0002. **Registre** : révision 23 — **aucun statut ne bouge** ; les
verdicts et les défauts SCHEMA-08 à SCHEMA-12 sont *proposés* et n'entrent dans
les tables qu'à la fusion.

### Périmètre

20 fichiers, backend et docs, **0 sous `frontend_src`** ; `package-lock`
inchangé. `docs/schema/EMPREINTE-PILOTE.json` **identique à l'octet**
(`git diff 3917bb7 9d15935` vide) ; **`--figer` non lancé** (empreinte figée
toujours 60/684, `genereLe: 2026-09-19`) ; l'empreinte PROPOSÉE est un fichier
à part, 62/707 : les 60 tables figées y sont strictement inchangées, seules
`api_keys` (9 col.) et `keiwa_config_items` (14 col.) s'ajoutent. Mécanisme
livré : convergence des entités vers DbInit sous drapeau `DB_SCHEMA_ENTITES`
(`off` / `plan` / `apply`), carte des mécanismes, plan des entités.

### Reproduction (rejouée par QA-C, bases dédiées `julaba_qac_*`, détruites)

| Étape | Base `3917bb7` | Lot `9d15935` |
|---|---|---|
| Empreinte figée | — | diff **vide** |
| `check-tsc-baseline` | — | 0 = 0, **exit 0** |
| `test:unit` | — | 28 suites / 216 tests, **exit 0** |
| `test:invariants` | — | 47 suites : 45 vertes, **2 rouges = empreinte** (`api_keys`, `keiwa_config_items`) ; les 5 autres tests d'`un-seul-chemin` verts ; **exit 1** |
| `schema-pilote.mjs` | **exit 0** | **exit 1** à l'étape 2/5, uniquement « le schéma a changé » (2 tables) |
| 3 specs nouvelles sur la base | `05-06` : **7/8 rouges** (relation absente) ; `un-seul-chemin` : **3/6 rouges sur l'invariant** (13 tables au lieu de 60, divergence 44, plan avec écarts) ; `schema-entites-dbinit` (unitaire) : 2/7 rouges **seulement faute des deux fichiers docs** — elle prouve la fraîcheur des docs, pas un défaut de la base | verts (sauf empreinte) |
| Bugs `const [row]` | **reproduits** : `updateConfigItem`/`setActive` sur uuid inexistant → `[]` sans lever ; existant → tableau | **corrigés** : `NotFoundException` / objet |
| `verify-dbinit-subsumed` (ADR-0002) | **exit 0** (« 0 ajouté ») | **exit 1** en `plan` **et** `apply` : 32 objets = les 2 tables ; rien d'autre (migrations ≡ entités pour les 900 autres objets) |

### Ce qui a été attaqué — tenu / pas tenu

**Tenu**
- **Mode `plan` = zéro écriture** : sur base vierge, « Render-like » (13 tables
  + 1 vue) et synchronize, `convergerEntites` émet **exactement 4 requêtes,
  toutes `SELECT`** ; empreinte identique avant/après ; un seul `logger.warn`
  (ligne la plus longue 1 454 caractères) ; entièrement sous `try/catch`,
  lancé après `app.listen` — **un déploiement en `plan` ne peut pas échouer au
  démarrage**.
- **Mode `off` = base + 3** : 82 → 85 requêtes, exactement `CREATE TABLE
  api_keys`, `CREATE INDEX idx_api_keys_key`, `CREATE TABLE keiwa_config_items`
  (SCHEMA-05/06), même ordre. Mais **variable absente ⇒ `plan`, pas `off`** :
  à écrire noir sur blanc.
- **`off` puis `apply`** : 14 → 59 relations, 732 instructions, 0 échec ;
  `runInit()` complet en `apply` → 62 = PROPOSÉE.
- **Idempotence** : deux `runInit()` en `apply`, empreinte strictement
  identique, 239 requêtes à chaque fois (pas « ~120 »).
- **Additivité** : aucun `DROP`/`ALTER COLUMN`/`RENAME` ; colonne existante
  d'un autre type laissée telle quelle ; `ADD COLUMN … NOT NULL` sur table
  peuplée → refusée, isolée, journalisée, second `apply` identique. Aucune des
  3 colonnes isolées « sans chemin » n'est NOT NULL.

**Pas tenu**
- **Type divergent non signalé** : `schema-entites.ts` et `CHANTIER-SCHEMA.md`
  §3 promettent « laissée telle quelle **et signalée** » ; `diagnostiquerEntites`
  compare les **noms** seulement — `activation_codes.selector integer` (entité
  varchar), `user_id text` (entité uuid) → après `apply`, types inchangés et
  journal « aucun écart » → **SCHEMA-09**.
- **Ordre de boot réel en `apply` sur base vierge** : `main.ts` lance
  `AdminDivisionsSeedService.runSeed()` **avant** `runInit()` ; le seed crée
  `districts/regions/departements/communes` avec ses propres contraintes
  inline, DbInit ajoute celles de l'entité par-dessus → **9 contraintes en
  double**, PK `*_pkey` au lieu de `PK_…`, `gen_random_uuid()` au lieu de
  `uuid_generate_v4()` — et le plan dit « aucun écart ». Le gate
  `schema-un-seul-chemin` appelle `runInit()` directement et **ne rejoue pas
  l'ordre de `main.ts`** → **SCHEMA-10**.

### Écarts entre le rapport de C et l'observé

1. **« 117 colonnes sans aucun chemin » est faux : c'est 97.** Les 117
   incluent les 15 colonnes de la **vue** `credits_avec_statut` (créée par
   DbInit, présente dans la baseline ; `sansCheminSurBaseExistante` ignore
   `dbInit.vues`) et **5 colonnes camelCase qui sont dans la baseline**
   (`objectifs_journaliers."userId"/"createdAt"`,
   `raccourcis_vocaux."userId"/"createdAt"/"updatedAt"`) : `lireDdl` met tout
   en minuscules, `userid ≠ userId`. Reste **11 tables (94 colonnes) + 3
   colonnes = 97**. Les 11 tables : `activation_codes`, `cooperative_stock`,
   `cooperative_stock_mouvements`, `cooperative_transactions`,
   `cotisations_sociales`, `fidelite_evenements`, `tontine_membres`,
   `tontine_mouvements`, `tontines`, `voice_provider_config`,
   `voice_service_metrics` (absentes de la baseline, présentes seulement dans
   les migrations postérieures). Le chiffre faux est repris dans
   `CARTE-MECANISMES.md` et `CHANTIER-SCHEMA.md` §1/§3 → **SCHEMA-08**.
2. Promesse « type divergent signalé » non tenue (SCHEMA-09).
3. « DbInit seul posait 12 tables » vs « 13 » : mesuré **13 tables + 1 vue**.
4. « ~120 aller-retours » en `apply` : **239** par `runInit()`.
5. « Trois specs rouges sur la base » : vrai pour `05-06` et `un-seul-chemin`,
   **pas** pour `schema-entites-dbinit` (rouge seulement faute des docs).
6. `verify-dbinit-subsumed` passe de vert (base) à rouge (lot) ; C ne le dit
   pas → **SCHEMA-12**.
7. Le mode par défaut n'est pas « rien » : variable absente ⇒ `plan`.
8. Tout le reste conforme : plan 47 tables / 538 col. / 19 enums / 13
   contraintes / 20 index / 15 FK recompté, déterministe ; `computeBootDbFlags`
   inchangé hors `apply` ; DDL `api_keys` = migration archivée sauf
   `gen_random_uuid()`.

### Verdicts proposés (n'entrent au registre qu'à la fusion)

| Dette | Verdict proposé |
|---|---|
| SCHEMA-01 | **reste OUVERT** — les trois mécanismes coexistent (`synchronize`, branche vierge, 27 migrations) ; `apply` n'est pas posé ; `computeBootDbFlags(true,{})` rend toujours `synchronize:'true'` |
| SCHEMA-02 | **reste OUVERT** — `schema-flags.ts` garde ses deux branches, un troisième chemin sous drapeau s'ajoute |
| SCHEMA-03 | **reste OUVERT (mécanisme livré, non activé)** — sous `plan`, toute évolution d'entité doit encore être recopiée à la main dans DbInit ; sur base Render-like, le plan journalise 111 objets et n'en applique aucun ; 14 colonnes restent manuscrites |
| SCHEMA-05 | **FERMÉ à la fusion, conditionné au gel 62/707** — DbInit pose `api_keys` (7/8 rouges sur la base → verts) ; tant que `--figer` n'est pas fait, gate et invariant restent rouges |
| SCHEMA-06 | **FERMÉ à la fusion, même condition** — `keiwa_config_items` avec `UNIQUE (type,item_id)` ; `updateConfigItem` corrigé (`[]` → `NotFound`) |
| SCHEMA-07 | **non concernée** — `bpay_transactions` non touchée, garde-fou colonne vert |

**Défauts nouveaux proposés** (prochain numéro libre : SCHEMA-08)

| N° | Sévérité | Constat reproduit |
|---|---|---|
| **SCHEMA-08** | P2 actif (doc/outillage) | La carte compte 117 colonnes sans chemin, il y en a 97 : `lireDdl` écrase la casse des identifiants quotés, `sansCheminSurBaseExistante` ignore les vues DbInit. Un chiffre faux dans le document qui sert à décider `apply` |
| **SCHEMA-09** | P2 dormant (`apply` seulement) | `diagnostiquerEntites` ne compare que les noms : une colonne présente avec un autre type n'est ni convergée ni signalée, contrairement à la promesse écrite. Sur Render, un drift de type resterait invisible sous « aucun écart » |
| **SCHEMA-10** | P2 dormant (base vierge + `apply`) | L'ordre réel de `main.ts` (seed divisions → DbInit) produit une base différente de celle prouvée par le gate (9 contraintes dupliquées, PK/défauts différents) ; `schema-un-seul-chemin` ne rejoue pas cet ordre |
| **SCHEMA-11** | P3 actif (outillage, chevauche TEST-05) | `schema-un-seul-chemin.spec.ts` crée `${DB_NAME}_dbinit_seul` et ne la supprime jamais : une base de plus sur le Postgres partagé à chaque run |
| **SCHEMA-12** | P2 actif (gouvernance ADR) | Le lot fait passer `verify:dbinit-subsumed` (ADR-0002 Étape 2) de exit 0 à exit 1 (32 objets), quel que soit le mode, sans modifier l'ADR — il propose seulement de l'acter |
| (remarque) | P3 | Défaut de `DB_SCHEMA_ENTITES` = `plan`, pas `off` : à documenter |

### Décisions attendues de Patrick (QA-C §6)

1. **Prochain déploiement Render en `plan`** (tel que `render.yaml` le pose) —
   recommandé par QA : zéro écriture prouvé, incapable de faire tomber le boot,
   seule mesure réelle de l'écart sur Render. Il ne dira rien des colonnes dont
   seul le type diverge (SCHEMA-09).
2. **Passage en `apply`** — pas avant : lecture du journal `plan`, correction de
   SCHEMA-09, SCHEMA-10 si une base vierge doit être bâtie en `apply`,
   `--figer`. Risques résiduels : `uuid_generate_v4()` suppose `uuid-ossp` dans
   le `search_path` de Render (non prouvable d'ici) ; contraintes refusées par
   des données existantes (journalisées, base non dégradée, rejouées à chaque
   boot).
3. **Retrait de `synchronize` et de la branche vierge** — après un déploiement
   `apply` observé ; c'est cela qui fermerait SCHEMA-01/02, pas ce lot.
4. **ADR-0002** — la chaîne de migrations est cohérente avec les entités
   (redondante, pas fausse) ; trancher explicitement la cible (« DbInit dérivé
   des entités » vs « migrations autoritaires ») **avant** de fusionner C,
   parce que C casse déjà son gate Étape 2 (SCHEMA-12) et B ajoute 5 objets au
   même compteur (32 + 5).
5. **`--figer` 62/707** — décision de Patrick seul ; au moment de la fusion de
   C, sachant que A (`pin_recovery_codes`) et B (`credits.client_id`, …) le
   feront bouger à nouveau : un gel par fusion, ou un seul après les trois.

### Chevauchements (règle de chevauchement, révision 22 bis)

- **TEST-05** : `schema-un-seul-chemin.spec.ts` **aggrave** le mécanisme
  (SCHEMA-11) ; `schema-pilote.mjs` tourne sur `julaba_test` sauf `DB_NAME`
  exporté. TEST-05 reste OUVERTE, C n'y touche pas — mention ajoutée dans sa
  ligne.
- **Point d'intégration B** (`credits.client_id`, `credits.idempotency_key`,
  `credits_avec_statut.client_id`, `idx_credits_client`,
  `ux_credits_marchand_idempotency`) : `credits` n'a pas d'entité → B pose du
  manuscrit sur table sans entité, pas de conflit avec `HORS_ENTITE_CONNUES`,
  mais l'empreinte bouge encore, `verify-dbinit-subsumed` cumule 32 + 5, la
  carte les recensera « DBINIT seul ». Les migrations restent un chemin
  documenté mais jamais exécuté : c'est la décision 4.
- **Lot A — `pin_recovery_codes`** (entité **et** DbInit) : à la fusion A+C,
  `PLAN-ENTITES.sql`, `CARTE-MECANISMES.md` et l'empreinte sont périmés →
  `schema-entites-dbinit.spec.ts` rouge, `--figer` à refaire ; si le DDL
  manuscrit de A nomme ses contraintes autrement que TypeORM, doublon de type
  SCHEMA-10.
- **DOC-02** : C ajoute des énoncés (« les migrations ne tournent nulle part au
  boot ») sans réconcilier les anciens → reste OUVERTE — mention ajoutée dans
  sa ligne.
- **ARG-06** (`marge`/`benefice` doublées) : les deux colonnes entrent telles
  quelles dans le plan ; rien ne se ferme.
- **Les 14 colonnes `HORS_ENTITE_CONNUES`** (`stocks` ×8, `communes` ×2,
  `marches` ×2, `cooperatives.commune_id`, `cycles.statut`) : tout lot qui
  touche ces entités ou ces `ALTER` manuscrits fait rougir l'unitaire à
  égalité stricte — à signaler aux lots stock/marchés.
- Aucune dette fermée par effet de bord : les corrections `const [row]`
  relèvent de SCHEMA-05/06 (code jamais exécuté avant).

### Ce que ça ne prouve pas

Rien sur la base de **production** (contenu, `uuid-ossp` dans le `search_path`,
comportement d'`apply` sur ses données) ; que `apply` sur base vierge dans
l'ordre réel de `main.ts` donne la base du gate (SCHEMA-10 prouve le contraire
pour 4 tables, d'autres tables paresseuses non cherchées) ; que le plan détecte
un drift de type, de défaut ou de nullabilité (noms seulement) ; les tables
paresseuses hors seed (`cron_jobs_config`, `support_config`,
`cooperative_besoins`) et le SQL brut hors `INSERT/UPDATE` ; `apply` concurrent
(deux instances Render) ; la CI `schema-pilote.yml` (inchangée, non exécutée ici).

---

## PR #245 — Manus, refonte UX/UI et voix (AUDITÉE, NON FUSIONNÉE)

**Source** : `origin/manus/refonte-ui-ux-voix`, tête locale **`907523d`** (47
commits, 120 fichiers, merge-base `3917bb7`) ; GitHub déjà à **`9a14bcc`**
(+1 commit PWA : `sw.js`, `vite.config.ts`, `test-offline-first-update.mjs`, lu
sans toucher `origin/*`). **Base mesurée : `2277bf0`** (rév. 22).
**Contre-auditée** le 20/09/2026 (QA-Manus), lecture seule, aucun commentaire
GitHub. **Non fusionnée : décisions ligne par ligne réservées à Patrick.**
**Registre** : révision 24 — aucune ligne Manus n'entre dans les tables ; deux
dettes **plateforme** révélées (DEP-01, OFF-01) y entrent, car elles sont sur la
branche aujourd'hui.

### Gates

Fusion à blanc de #245 sur `2277bf0` : **2 conflits textuels** (`package.json`,
`AppLayout.tsx`), **9 fichiers touchés des deux côtés** (les 9 annoncés).
Résolution de mesure : `verify` = chaîne plateforme + les 2 ajouts Manus ;
`test:ci` **remise à la chaîne gelée de `f0c965c`** ; `AppLayout.tsx` = `vtrace`
(lot E) + `TantieSagesseModal` (Manus).

| Gate | Combiné (`2277bf0` + #245) | #245 seule | Base |
|---|---|---|---|
| `check-tsc-baseline` | **0** | 0 | — |
| `verify` | **1** — seul rouge `test:voix-trace-source` (**11 écarts**) ; tout le reste vert ; `home-voice`/`netlify-auth-proxy` seuls : 0 | 0 (sa chaîne n'a ni `api-authorization` ni `voix-trace*`) | `voix-trace-source` 0 |
| `test:ci` (chaîne gelée) | **0** | 0 (chaîne Manus = 12 ajouts + gelée) | — |
| `build` | **0** (190 chunks + 152 clips) | 0 | — |
| `test:unit` backend | **0** (28 / 210) | 0 | — |
| `test:invariants` | **non exécuté** (pas de Postgres ; TEST-05) | — | — |

30 garde-fous rejoués un par un sur l'arbre combiné : **tous 0** (dont
`api-authorization` : toujours 164 `fetch()` directs, **0 ajouté par Manus**).
**Conclusion** : « cassé par la combinaison », pas « cassé par Manus » — le seul
rouge est le garde-fou du lot E qui fige 7 fichiers voix contre `3917bb7`.

### Classification (120 fichiers, résumé)

- **CMNA** (changement métier non autorisé) : `caisse-rest.controller.ts`
  (backend interdit — sur un défaut réel, DEP-01) ; `POSCaisse.handlePay`
  (montant reçu **obligatoire** en espèces : règle nouvelle, contredit le
  commentaire plateforme « le bouton accepte un reçu à 0 ») ;
  `CaisseContext.enregistrerVente`/`enregistrerDepense` **réécrits** (délégués à
  `soumettreOperationCaisse`, type de retour changé) ; `LoginPassword.tsx`
  (`check-phone` non-OK → erreur bloquante au lieu de passer à l'étape code) ;
  `routes.tsx` (`/login`, `/welcome` fermés).
- **`test:ci` modifiée** : 12 scripts ajoutés en tête (règle absolue) — tous
  verts, statiques, déplaçables tels quels dans `verify`.
- **Garde-fous édités** : `caisseUnSeulMicro` **affaibli par OR** (accepte
  BottomBar ou AppLayout sans exiger un seul monteur) ; `test-cible-tactile`
  **verrouille la règle nouvelle** de `handlePay` ; `fcfa.test` et
  `tataMarchandActions.test` adaptés (équivalents) ; `offlineCaisse.test` et
  `caisseSurfaceUnique` renforcés. Aucun invariant argent affaibli.
- **Voix produit** : `entreeVoix`, `onboardingVoix`, `accueilMarchandVoix` —
  clips prototype (15 mp3, 947 Ko, voix synthétique « Callirrhoe ») **muets
  sauf `VITE_JULABA_VOICE_PREVIEW=true`**, drapeau défini nulle part : sur un
  build standard, Welcome, Onboarding, Numéro, Code, erreurs et **« Écouter ma
  caisse » sont silencieux** ; `direCaisse` ne dit plus le montant. Niveau voix
  « Essentiel » par défaut après connexion (mute « Compte juste », « Je n'ai pas
  compris », accueils), blocage **avant toute trace** (`runExclusive` l. 327).
- **Déploiement** : `public/_redirects` = proxy Netlify `/api/v1/*` →
  `julaba-api.onrender.com` (**production**) ; preview publique
  `julaba-manus.netlify.app` branchée sur l'API de production avec un compte
  réel. PWA : précache de tous les chunks + tous les mp3, `await` dans
  `waitUntil` → **≈ 13 Mo (`907523d`) à 18 Mo (`9a14bcc`)** à la première
  installation.
- **UX pure et renommage « Tata → Tantie »** : le reste (PaveMontant, montants
  privés, pictogrammes, palette `--julaba-*` de 10 tokens dans `commerce.css`,
  500 F billet → pièce, `MesCommandes` refus hors-ligne, 17 fichiers de
  renommage 0 ligne hors nom).

### Affirmations de la PR, vérifiées

| Affirmation | Verdict |
|---|---|
| « Ne change pas les règles métier d'auth, vente, stock, encaissement » | **Infirmée** : `handlePay`, `enregistrerVente/Depense`, backend dépense, flux `check-phone`. Stock / machine / grammaire / `localIntent` : **intacts** |
| « Arbre combiné vert : test:ci, 45 suites / 233 invariants, build » | `test:ci` gelée et build : confirmés ; `verify` combiné : **rouge** (lot E) ; invariants : **non vérifiable** ici |
| « 137 clips, 128 mappés, 9 orphelins » | Confirmée — mais le build précache **152** clips (137 + 15 prototypes) |
| « Aucune seconde application » | **Confirmée** (pas de nouvelle entrée, pas de second moteur vocal sur la caisse, modale montée une fois) |
| « Une opération offline en attente n'est jamais présentée comme confirmée » | **Infirmée pour la vente** (hunk perdu) ; vraie pour la dépense |
| « Le paiement espèces reste bloqué sans montant reçu » | Vraie — mais c'est une **règle nouvelle**, pas une conservation |
| « Test rouge avant correction, commit autonome » | **Non tenue** pour argent / backend / auth |
| « Le prototype vocal reste muet par défaut en production » | Vraie — et c'est le problème P1 voix |

### Conflits sémantiques avec les lots

- **Lot D** (fusionné) : aucun `fetch` direct ajouté ; `_redirects` introduit un
  **3ᵉ mode de déploiement** (Netlify, `/api/v1` relatif proxifié) — API-07/09
  « deux domaines » deviennent trois.
- **Lot E** (fusionné) : 11 écarts `voix-trace-source` (6 fichiers instrumentés
  modifiés hors `vtrace`, 3 fichiers de règles de voix, 2 écarts d'appels —
  `onboardingVoix` et 17 appels de `LoginPassword`) ; trou de journal l. 327 ;
  `vtrace.ecran` conservé.
- **VOIX-01/02/03, UI-02/03/04** (fermées) : intactes ; UI-03 : les hauteurs
  mesurées (zone voix 260 px, panier 658 px) changent avec le raccourci panier
  sticky et le pavé XXL → **banc `capture.mjs` à rejouer**.
- **Lot A** (auth, en attente) : `LoginPassword.tsx` (~90 lignes), `routes.tsx`,
  `PropositionReconnaissance.tsx`, `Welcome.tsx` → conflits probables +
  changement de flux `check-phone`.
- **Lot B** (crédit, en attente) : `CreditModal.tsx` (1 ligne),
  `VentesPassees.tsx` (zone l. 340-352 d'ARG-11 réécrite), `AppContext.tsx`
  (l. 1008-1029 décalées de +12) → à refusionner.
- **Lot F** (i18n) : 3 registres de clips Manus (`ENTREE_VOICE_CLIPS`,
  `INTRO_CLIPS`, `ACCUEIL_MARCHAND_VOICE_CLIPS`) + `importancePourTexte` par
  regex sur le français = **architecture parallèle** à `contrat-audio.ts` ; à
  réconcilier avant F.

### Chevauchements (règle 22 bis — aucune dette ne se ferme par effet de bord)

| Dette | Ce que #245 change | Statut |
|---|---|---|
| **VOIX-04** (owner Manus) | Ne fournit ni clip `pas_compris`/`rien_entendu` ni voix de secours ; **supprime** le message écran « clip … pas encore enregistré » (reste `console.info`) ; institue la doctrine **inverse** (« un clip absent n'est JAMAIS remplacé ») et l'étend à l'entrée/accueil ; le niveau « Essentiel » mute en plus « Je n'ai pas compris » | **Reste OUVERTE, aggravée** |
| **VOIX-05** (owner Manus) | Supprime `managerSpeak` ; tout passe par clips prototype — un seul timbre **sous drapeau preview, sinon silence** | Reste OUVERTE (la PR ne la revendique pas) |
| **GARDE-02** | Nouveau silence **non journalisé** (`runExclusive` l. 327) | Reste OUVERTE ; **L4** consignée comme chevauchement à venir |
| **GARDE-01** | `test-cible-tactile` édité ; comptage multi-lignes non corrigé, 164 inchangé | Sans effet |
| **ARG-11** | `VentesPassees` et `AppContext` réécrits/décalés ; double compte non corrigé | Reste OUVERTE ; lot B à refusionner |
| API-07/08/11, SEC-08b, TEST-05, ARG-13/14 | Non touchés | Sans chevauchement |

Dettes **plateforme** révélées (non enregistrées avant) : **DEP-01** (motif de
dépense perdu : `CaisseContext` l. 486 envoie `notes`, backend l. 603 lit
`description`, même perte au rejeu de la file) et **OFF-01** (vente enfilée hors
ligne annoncée « Vente réussie » : `POSCaisse` l. 310-319 sans lire le résultat,
`enregistrerVente` rend `Promise<void>`). Toutes deux vérifiées sur `e00a16c` et
ouvertes au registre ; la PR les corrige (DEP-01 en zone interdite ; OFF-01 par
une frontière `statutOperationCaisse` dont le branchement sur la vente a été
**perdu** dans ses fusions — la dépense y est honnête).

### Les 16 écarts — sévérité et recommandation

| # | Écart | Sév. | Recommandation QA (Patrick tranche) |
|---|---|---|---|
| 1 | `test:ci` modifiée (12 ajouts) | P1 règle absolue | Refuser ; déplacer dans `verify` |
| 2 | Entrée / onboarding / accueil muets par défaut, caisse plus lue | P1 produit | Renvoyer à Manus avec arbitrage : clips attestés ou voix de secours, jamais le silence ; VOIX-04 reste ouverte |
| 3 | Vente offline toujours « Vente réussie » (hunk perdu) + `enregistrerVente` réécrit | P1 argent/offline | Reprendre côté plateforme (**OFF-01**) ou renvoyer à Manus sous contre-audit |
| 4 | Backend dépense (`caisse-rest.controller.ts`) | P1 périmètre / défaut réel | Frontend : conserver ; backend : reprendre côté plateforme (**DEP-01**) |
| 5 | `handlePay` reçu obligatoire + verrou dans `test-cible-tactile` | P1 CMNA | Patrick tranche ; si oui → reprendre côté plateforme ; sinon refuser le hunk |
| 6 | Preview Netlify publique sur l'API de production (+ `_redirects`) | P1 gouvernance / sécurité | Interdire la preview sur prod ; `_redirects` vers une recette ou retiré |
| 7 | `verify` rouge (`voix-trace-source`, 11 écarts) | P1 gate | Reprendre côté plateforme après fusion (règle E × F) — pas un défaut Manus |
| 8 | Auth : `check-phone` bloquant, `/login` fermé | P2 CMNA / lot A | Renvoyer à Manus ou confier au lot A |
| 9 | Niveau « Essentiel » par défaut, silence non journalisé | P2 | Manus décide du défaut ; plateforme ajoute `vtrace.ttsIgnoree('niveau')` |
| 10 | Précache SW 13-18 Mo à l'installation | P2 terrain | Renvoyer à Manus : revenir au seuil, voix en tâche de fond ; mesurer sur 3G |
| 11 | Diagnostic « clip absent » masqué (`useVoiceCore`) | P2 (VOIX-04) | Renvoyer à Manus : garder un signal utilisateur |
| 12 | `caisseUnSeulMicro` affaibli par OR | P2 garde-fou | Reprendre côté plateforme (exiger un seul monteur) |
| 13 | Lot F : 3 registres de clips + regex FR | P2 architecture | Réconcilier avec `contrat-audio.ts` avant F |
| 14 | Palette `--julaba-*` | P3 | Patrick tranche |
| 15 | `test:nom-tantie` interdit l'ancien nom dans `src/`/`public/` | P3 gouvernance | Garder dans `verify` seulement ; `MANUS-REGLES.md` à jour |
| 16 | 500 F billet → pièce, `MesCommandes` hors-ligne, `useCountUp` retiré | P3 UX | Conserver |

Obligations de livraison non tenues : aucune capture/mesure visuelle committée ;
`test:ci` modifiée ; garde-fous édités ; PR toujours brouillon.

### Ce que ça ne prouve pas

Les 45/233 invariants Postgres (non exécutés, TEST-05) ; les mesures 390×844 du
banc `apercu-caisse` (hauteurs changées, à rejouer) ; le comportement sonore réel
(autoplay, `AbortError`, SW sur Android) ; l'APK (workflow non lancé) ; l'écoute
humaine ivoirienne des clips « Callirrhoe » ; l'état exact de `9a14bcc` au-delà
de son diff de 3 fichiers ; tout ce qui se passe sur `julaba-manus.netlify.app`
(non visité).
