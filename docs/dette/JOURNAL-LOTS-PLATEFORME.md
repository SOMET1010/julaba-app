# Journal des lots plateforme — JULABA

Un lot par entrée : périmètre, reproduction, verdicts, ce que ça ne prouve pas.
Le registre maître (`REGISTRE-MAITRE.md`) porte les statuts ; ce journal porte
le **comment** de chaque contre-audit, court, pour qu'on puisse le rejouer.
Règle de pilotage : *QA par lot dès la première livraison ; le lot est audité
avant que sa fermeture n'entre dans le registre.*

Les lots A, C et F s'ajouteront ici. Un lot **audité mais non fusionné** a une
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
