# Journal des lots plateforme — JULABA

Un lot par entrée : périmètre, reproduction, verdicts, ce que ça ne prouve pas.
Le registre maître (`REGISTRE-MAITRE.md`) porte les statuts ; ce journal porte
le **comment** de chaque contre-audit, court, pour qu'on puisse le rejouer.
Règle de pilotage : *QA par lot dès la première livraison ; le lot est audité
avant que sa fermeture n'entre dans le registre.*

Les lots A, B, C, E et F s'ajouteront ici.

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
