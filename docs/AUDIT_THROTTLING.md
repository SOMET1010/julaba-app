# Audit throttling (rate-limiting) — Julaba API

_Consigné le 15/08/2026. Déclencheur : le harnais e2e de recette se faisait `429`
sur `GET /caisse/transactions` (cf. RECETTE.md, Séance 4)._

## Verdict

**Toute l'API authentifiée était plafonnée à 5 requêtes / 60 s par endpoint et par
IP. Une seule route y échappait réellement : `/health`.** Derrière le proxy Render,
ce plafond est très probablement _partagé entre tous les utilisateurs_.

## Mécanisme — trois faits qui se cumulent

Configuration d'origine (`app.module.ts`) : quatre throttlers **nommés**
`default:1000`, `auth:5`, `voice:10`, `recovery:5` (@nestjs/throttler ^6.5.0).

1. **Tous les throttlers nommés s'appliquent à CHAQUE route.** `ThrottlerGuard`
   boucle sur les quatre throttlers pour chaque requête ; l'effectif est le plus
   strict = `min(auth 5, recovery 5) = 5/min`. La clé de compteur est
   `sha256(Classe-Handler-nom-IP)` → le plafond est **par endpoint**, **par IP**.

2. **`@SkipThrottle()` nu ne skippe QUE `default`.** Source :
   `SkipThrottle = (skip = { default: true })`. Les exemptions posées sur
   `users`, `mutations`, `identifications` ne servaient donc à rien pour les
   limites strictes — ces contrôleurs restaient à 5/min. Seul `health` échappait
   vraiment (il liste explicitement `{ default, auth, voice, recovery }`).

3. **`trust proxy` désactivé volontairement** (`main.ts`) → `getTracker = req.ip`
   = pair TCP immédiat = routeur Render, **partagé**. Le code reconnaissait déjà
   le risque de « partage de quota entre utilisateurs ».

### Preuve empirique (backend booté, limites normales, mêmes cookies)

| Endpoint | Statut attendu | Observé |
|---|---|---|
| `GET /caisse/transactions` (non exempté) | cap 5 | 200×5 puis **429** dès la 6ᵉ |
| `GET /users/me` (`@SkipThrottle()` nu) | _censé_ exempté | 200×5 puis **429** dès la 6ᵉ |

## Portée

- **Capé à 5/min** : ~50 contrôleurs / ~400 routes — tout sauf `/health`.
- **`@Throttle` défait** : `voice:{limit:60}` sur les POST voix écrasé par
  `auth/recovery=5` → voix réellement à 5/min ; `check-phone` déclaré à 10 était
  à 5.
- **Ce qui marchait** : `signup`/`login` (limites strictes < 5 respectées) et
  `/health`.

## Impact réel

- **Actif (pilote espèces)** : risque modéré — un marchand qui enchaîne >5
  lectures d'un même endpoint en 60 s prend un `429` (le harnais e2e l'a heurté).
- **Dormant (argent gelé), grave dès réactivation** : `PayPage` _poll_ le statut
  BPay **toutes les 5 s** (12/min) sur un endpoint non exempté → `429` garanti au
  bout de ~25 s, en plein paiement mobile money. Idem recharge/retrait.
- **Cross-utilisateurs (prod, NON confirmé)** : si `req.ip` est partagé derrière
  Render, tous ces plafonds deviennent partagés sur toute la base. Seul point non
  prouvé à distance (proxy bloque `onrender`). À confirmer en loguant `req.ip`
  sur une requête prod.

## Correctif retenu — inverser le modèle

Les throttlers nommés ne sont **pas** opt-in dans @nestjs/throttler : ils
s'appliquent partout. Patron correct = **un seul throttler `default` généreux +
surcharges strictes ciblées**.

- `app.module` : un seul throttler `{ ttl: 60000, limit: 300 }` (via
  `config/throttler.config.ts`, testé ; `THROTTLE_DISABLED=true` → illimité en
  recette/e2e, prod inchangée).
- Surcharges strictes ciblant `default`, **intention déclarée honorée** :
  `signup` 3, `login` 5, `check-phone` 10, `contacts-recovery-bo` 5, voix 60.
- `@SkipThrottle()` redevient correct (il skippe l'unique `default`) → `users`,
  `mutations`, `identifications` deviennent enfin réellement illimités comme
  voulu ; `health` inchangé.

300/min/endpoint laisse une marge large au polling 5 s (12/min).

### Décision laissée séparée : `trust proxy`

Pour que la limite par-IP soit vraiment _par utilisateur_ en prod, il faut
`app.set('trust proxy', <hop-count Render exact>) ` pour que `req.ip` = vrai
client. À faire prudemment : un hop-count erroné permet de spoofer
`X-Forwarded-For` et de contourner la limite. Non inclus dans le lot d'inversion —
à trancher avec la topologie Render exacte. L'inversion seule fait déjà passer le
partage éventuel de 5/min à 300/min par endpoint (marge ~25 utilisateurs
concurrents en polling avant contention).
