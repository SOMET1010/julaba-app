# HYGIÈNE-1 — Axe 2 : convergence API sur auth / caisse / vente / stock

## Ce que la convergence a trouvé

L'axe 2 n'a pas déplacé du code d'un fichier à un autre. En rassemblant les
appels réseau des parcours d'argent derrière une seule porte, il a fait
apparaître **six défauts**, dont quatre atteignent la marchande.

### 1. Le rafraîchissement de session existait en quatre exemplaires — dont trois inopérants dans l'APK

Quatre implémentations de « renouveler la session » coexistaient : celle du
client API, et trois écrites à la main dans `AppContext` (chargement du profil,
vérification au démarrage, minuterie de 13 minutes).

Trois d'entre elles envoyaient un `POST /auth/refresh` **sans corps**. Or
`login` explique déjà, en commentaire, pourquoi il renvoie les jetons dans le
corps : *« sur mobile, les cookies cross-domaine (julaba-web ↔ julaba-api) sont
bloqués »*. Sans corps, ces trois-là ne pouvaient donc pas aboutir dans l'APK.

Pire, **trois sur quatre ignoraient le verrou** qui empêche deux
rafraîchissements simultanés. Ce verrou n'est pas une optimisation : côté
serveur, `rotateRefreshToken` traite un jeton déjà utilisé comme une
**compromission** et appelle `revokeAllUserTokens` — *toutes* les sessions de la
marchande. Deux rafraîchissements lancés en même temps suffisaient à la
déconnecter de partout, en plein marché.

**Il n'y a plus qu'une porte, `rafraichirSession`, et un seul verrou.**

### 2. Le rafraîchissement se croyait réussi alors qu'il avait échoué

`POST /auth/refresh` est déclaré `@HttpCode(HttpStatus.OK)` : il répond **200
même quand il échoue**, avec `{ error: … }` dans le corps. Le client lisait
`response.ok` — donc **toujours vrai**. Chaque 401 coûtait un aller-retour de
rafraîchissement inutile, puis un rejeu condamné d'avance.

Le succès se lit désormais dans le corps.

### 3. Le rafraîchissement ne rangeait pas le jeton qu'il venait d'obtenir

`main.tsx` installe un intercepteur qui ajoute `Authorization: Bearer` à partir
de `localStorage.julaba_access_token`. L'ancien rafraîchissement n'écrivait
jamais cette clé. **Dans l'APK, après un rafraîchissement réussi, l'intercepteur
continuait donc d'envoyer l'ancien jeton expiré** : le rejeu repartait en 401.
Le rafraîchissement était décoratif là où il était le plus nécessaire.

### 4. La rotation n'était complète que d'un côté — et révoquait tout

`login` renvoie `refreshToken` dans le corps ; `refresh` ne l'avait jamais
suivi. Le téléphone, qui ne reçoit pas le cookie, rejouait donc **éternellement
le même jeton stocké**. À la deuxième tentative, ce jeton est marqué `used`, et
rejouer un jeton `used` déclenche la révocation de toutes les sessions.

`POST /auth/refresh` renvoie maintenant le successeur, comme `login`. C'est le
seul changement de contrat serveur de ce lot, et il aligne `refresh` sur une
décision déjà prise pour `login`.

### 5. L'échec de création d'un stock était muet — et la voix mentait

`addStock` n'examinait pas la réponse. Un refus du serveur repartait en succès.
Or ses trois appelants entourent tous `addProduct` d'un `try/catch` avec un
message parlé : ils étaient donc **déjà écrits pour un échec qui n'arrivait
jamais**. Résultat, Tata annonçait *« C'est fait ! … ajoutés au stock »* pour un
produit qui n'existait pas.

À une marchande qui ne lit pas, c'est la voix elle-même qui mentait.

### 6. Le stock restait vide quand le serveur répondait mal

`refreshStocks` faisait `if (!res.ok) return;`. Sur un 500 ou un 503, la
marchande voyait un stock VIDE alors que son téléphone en gardait la copie. Le
catalogue de la caisse avait été corrigé de ce défaut le 18/09/2026 ; le stock
était resté en arrière. Les deux chemins d'échec convergent maintenant vers le
même repli sur le cache.

## Ce qui a convergé

| Appel | Avant | Après |
|---|---|---|
| `/caisse/produits` (lecture, création, modification, suppression) | 4 `fetch()` dans `CaisseContext` | `caisse-api.ts` |
| `/caisse/produits` (place de marché) | `fetch()` **sans session ni cookie** | `caisse-api.ts` |
| `/caisse/session/{jour,ouvrir,fermer,fond}` | 4 `fetch()` dans `AppContext` | `caisse-api.ts` |
| `/caisse/credits` (compta du jour) | `fetch()` dans `AppContext` | `caisseApi.fetchCredits` (qui existait déjà) |
| `/caisse/transactions` | boucle de pagination **dupliquée** dans `AppContext` | `caisseApi.fetchCaisseTransactions` |
| `/caisse/vente` et `/caisse/depense` (3ᵉ chemin d'écriture) | `fetch()` dans `AppContext` | client commun |
| `/stocks` (4 appels) | 4 `fetch()` dans `StockContext` | `stocks-api.ts` (nouveau) |
| `/stocks/:id` (rejeu hors-ligne) | `fetch()` dans `CaisseContext` | client commun |
| `/catalogue-maitre` (3 appels) | 3 `fetch()` dans `useCatalogueMaitre` | `catalogue-maitre-api.ts` (nouveau) |
| `/auth/refresh` | 4 implémentations | 1 |

Deux fabriques d'en-têtes ont disparu avec eux : `caisseAuthHeaders`
(`AppContext`) et `headers()` (`StockContext`) recomposaient à la main
l'en-tête `Authorization` que l'intercepteur de `main.tsx` pose déjà.

## Les exceptions, et pourquoi elles en sont

**Les cérémonies d'authentification ne passent pas par le client commun, et ne
doivent pas y passer.** `login`, `create-acteur`, `activer`, `change-password`,
`pin/set`, `pin/verify`, `check-phone`, WebAuthn : sur ces routes, un **401
signifie « mauvais code »**, pas « session expirée ». Les y faire passer
déclencherait un rafraîchissement silencieux — donc une consommation du jeton de
session — et l'événement `julaba:session-expired`, sur une marchande qui vient
simplement de se tromper de chiffre. Ce serait introduire un défaut, pas en
retirer un.

**Le sondage de session au démarrage** (`/auth/me`, `/users/me`) reste direct
pour la même raison : à froid, un 401 est la réponse NORMALE d'une personne non
connectée. Il partage désormais le verrou de rafraîchissement, ce qui était le
vrai danger.

**Le back-office** est hors périmètre : le mandat dit *auth / caisse / vente /
stock*. `backoffice-api.ts` garde ses 50 appels directs. C'est de la dette,
elle est ici nommée et volontairement conservée.

## Le garde-fou

Converger sans garde-fou, c'est converger une fois. `test:convergence-api`
(dans `verify`) interdit désormais tout `fetch()` direct vers `/caisse`,
`/stocks` ou `/catalogue-maitre` hors de `services/api/`. Le garde a été
vérifié dans les deux sens : il échoue quand on introduit un appel direct, il
passe quand il n'y en a pas.

## Mesures

| Métrique | Avant l'axe 2 | Après |
|---|---|---|
| `fetch()` hors `services/api/` | 218 appels / 64 fichiers | **195 / 60** |
| …dont sur caisse / vente / stock / catalogue (hors back-office) | 23 | **0** |
| Implémentations de « rafraîchir la session » | 4 | **1** |
| Fabriques d'en-têtes d'authentification | 3 | **1** (l'intercepteur) |
| Boucles de pagination des transactions | 2 | **1** |

## Portes franchies

- `node ci/check-tsc-baseline.mjs` — 0 erreur
- `npm run verify -w frontend_src` (55 scripts) — vert
- `npm run test:ci -w frontend_src` (gelé) — vert, **non modifié**
- `npm run test:unit -w backend` — 195 tests / 24 suites, vert
- `npm run build` frontend et backend — verts

Un test existant de `verify` a été réécrit : `test-fusion-panier.mjs` vérifiait
la FORME du code (`if (!res.ok) { … restaurerDepuisCache }`) et non la garantie.
La convergence supprime ce `if` — le client lève désormais — donc la garantie
tient toujours, mieux qu'avant. L'assertion porte maintenant sur la garantie.
C'est signalé ici parce qu'un test réécrit par celui qui modifie le code doit
toujours être signalé.

## Question ouverte

Le contrat de `POST /auth/refresh` change : il renvoie désormais `refreshToken`
dans le corps. C'est le seul point de ce lot qui touche l'authentification côté
serveur. Il est nécessaire — sans lui, converger sur le seul chemin qui
fonctionne dans l'APK rendrait la révocation générale PLUS facile à atteindre,
pas moins. Mais c'est un changement de contrat : si tu préfères le repousser, il
se retire seul, et le reste de l'axe 2 tient sans lui.
