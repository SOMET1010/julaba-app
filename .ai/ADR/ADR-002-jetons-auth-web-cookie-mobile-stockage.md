# ADR-002 — Jetons d'auth : cookies httpOnly sur le web, stockage local réservé à l'APK

> Architecture Decision Record. Remplir toutes les sections. Date au format YYYY-MM-DD.

## Métadonnées

- **ID** : ADR-002
- **Titre** : Jetons d'auth : cookies httpOnly sur le web, stockage local réservé à l'APK
- **Statut** : accepté
- **Date** : 2026-10-05
- **Décideur** : Z.ai Code (Tech Lead, audit UI auth AUTH-06) / Patrick Somet (arbitre produit)
- **Périmètre** : backend | frontend | mobile | gouvernance
- **Clôt** : AUTH-06 (audit `AUDITS/AUDIT-UI-AUTH-2026-10-05.md` §6/§13, registre `DEBT_REPORT.md` §AUTH)

## Contexte

L'audit UI auth (AUTH-06) relevait que les jetons JWT access + refresh vivaient en
`localStorage` (« décision documentée en code : auth mobile sans cookie cross-domaine »)
et demandait « à terme cookie httpOnly même-domaine ». La dette restait OUVERTE parce que
la décision paraissait bloquée par le déploiement mobile.

L'état réel du code au moment de trancher :

- le backend pose **déjà** les cookies httpOnly à `login`, `refresh`, `activer` et les efface
  à `logout`/`logout-all` — `access_token` (24 h), `refresh_token` (7 j), `bo_access_token`
  pour les rôles BO (`auth.controller.ts`, `setTokenCookies`) ;
- la stratégie JWT lit le cookie **avant** l'en-tête (`cookieOrBearer`, `jwt.strategy.ts`) ;
- la session web survit déjà au rechargement par le cookie seul : `AppContext.checkSession`
  appelle `/auth/me` avec `credentials: 'include'` et range la valeur sentinelle
  `accessToken = 'cookie'` ;
- `rafraichirSession` (api-client.ts) envoie le jeton stocké AUSSI dans le corps, mais le
  serveur accepte le cookie seul (`req.cookies?.refresh_token || body?.refreshToken`) — et
  le corps n'est nécessaire que là où le cookie ne passe pas ;
- les contraintes de prod V2 sont écrites dans `getTokenCookieBaseOptions` : en prod
  cross-domaine (julaba-web ↔ julaba-api sur Render), `SameSite=None; Secure` — sinon le
  cookie n'est jamais renvoyé ; en dev même-origine, `SameSite=Lax`.

Il reste donc **un seul** vrai reste d'AUTH-06 : le frontend web **persiste** encore les
deux jetons en `localStorage` à la connexion (LoginPassword, 2 sites), alors que les
cookies rendent cette écriture inutile sur le web — et dangereuse : un XSS qui lit
`julaba_refresh_token` obtient 7 jours de session rejouable, là où le même XSS face à un
cookie httpOnly ne lit RIEN.

La contrainte mobile reste entière : l'APK Capacitor charge une webview depuis un origine
local, les cookies cross-domaine vers l'API y sont bloqués. Le jeton doit y vivre en
`localStorage` et partir en `Authorization: Bearer`. La rotation serveur renvoie le
successeur dans le corps précisément pour ce cas (HYGIÈNE-1 axe 2, cf. commentaire
`auth.controller.ts` : rejouer un jeton « used » est traité en compromission).

## Décision

Nous décidons de la **voie duelle assumée**, sélectée en un point unique :

1. **Sur le web**, les jetons ne sont JAMAIS écrits en `localStorage`/`sessionStorage`.
   La session entière vit dans les cookies httpOnly posés par le backend (déjà le cas
   côté serveur). L'en-tête `Authorization` n'y est plus qu'un chemin mort : les lectures
   existantes (api-client, filet `main.tsx`) trouvent `null` et laissent le cookie agir.
2. **Sur l'APK natif** (`Capacitor.isNativePlatform()`), le comportement est INCHANGÉ :
   les deux jetons se posent en `localStorage` et partent en `Bearer` — la rotation
   serveur continue de fournir le successeur dans le corps.
3. L'écriture des clés `julaba_access_token` / `julaba_refresh_token` est concentrée dans
   **un seul module** frontend (`utils/stockerJetonsSiMobile.ts`), qui ne fait rien sur
   le web. Aucun autre fichier n'a le droit d'écrire ces clés — le garde
   `test:coffre-web` balaye les sources et refuse tout `setItem` hors de ce fichier.
4. Les chemins de LECTURE et de PURGE existants restent tels quels : ils servent à l'APK,
   tolèrent les jetons hérités des sessions web antérieures (lecture sans réécriture :
   la première rotation les rend obsolètes), et purgent les clés à la déconnexion.
5. La posture CSRF est documentée : l'API ne parle qu'en `application/json` (tout corps
   de formulaire simple-request arrive vide → DTO rejeté), le CORS est une liste
   d'origines vérifiée par un test dédié, et les cookies prod sont `SameSite=None;
   Secure` limités aux deux origines de la plateforme. Le durcissement futur (vérification
   serveur de l'en-tête `Origin` sur les mutations auth) est inscrit comme sous-dette,
   pas comme blocant.

## Alternatives considérées

### Alternative A : cookie httpOnly PARTOUT, y compris l'APK
- **Description** : migrer l'APK vers un domaine servi par l'API (ou un reverse-proxy
  même-domaine) pour que les cookies y passent.
- **Avantages** : un seul chemin d'auth ; plus de jeton lisible côté JS nulle part.
- **Inconvénients** : dépendance hors code (DNS/proxy/empaquetage), l'offline-first de
  l'APK en dépend ; coût et risque réels pour un gain nul en production web.
- **Rejetée parce que** : la contrainte cross-domaine de la webview est une donnée
  déploiement, pas un choix de code ; HYGIÈNE-1 a déjà payé cher la rotation sans
  successeur, autant figer le chemin APK qui marche.

### Alternative B : accès en mémoire seule + refresh en cookie, sur le web, SANS tolérance héritée
- **Description** : ne jamais lire les clés sur le web, purger au boot.
- **Avantages** : invariant plus dur (« rien à lire sur le web »).
- **Inconvénients** : casse les gardes qui simulent le stockage (convergence, session
  expirée, api-authorization — qui documentent le chemin APK réellement vivant), purge
  brutalement des sessions héritées qui se seraient repliées d'elles-mêmes.
- **Rejetée parce que** : la lecture tolérante sans réécriture obtient la même propriété
  de sécurité (plus rien ne s'écrit) sans casser les filets ni les tests.

## Conséquences

### Positives
- Le refresh token de 7 jours n'est plus lisible par aucun script côté web : la classe
  d'attaques « XSS lit le stockage » perd son butin principal.
- La décision AUTH-06 sort du registre : elle est écrite, sélectée en un point, et gardée.
- Le web ne dépend plus du portage en corps des jetons ; l'APK garde son chemin éprouvé.
- Surface de code minime : 1 module + 2 appels ; aucune route, aucun DTO, aucune stratégie.

### Négatives
- Deux chemins d'auth coexistent durablement : toute lecture du code doit connaître la
  règle « écriture = APK seulement » (le garde et l'ADR l'imposent).
- Les jetons hérités déjà posés en localStorage par des sessions web antérieures restent
  lisibles JUSQU'À leur rotation suivante ou leur déconnexion (purge `clearAuthClientState`
  / logout inchangée).

### Risques neutres
- Un utilisateur web qui ferme son navigateur revient via le cookie `refresh_token` (7 j),
  comme avant — aucun changement visible d'expérience.

## Invariants testables

- Invariant 1 : aucun `setItem` des clés `julaba_access_token`/`julaba_refresh_token`
  hors de `utils/stockerJetonsSiMobile.ts` — Test : `frontend/scripts/test-coffre-web.mjs`
- Invariant 2 : l'unique module d'écriture ne fait rien quand Capacitor est absent
  (web) et pose les deux clés en APK — Test : `test:coffre-web` (statique) + recette
  navigateur (localStorage vide après login web, session restaurée au rechargement)
- Invariant 3 : LoginPassword ne connaît plus le stockage direct, il appelle le coffre
  ×2 et cite l'ADR — Test : `test:coffre-web`

## Modules impactés

- `auth/` (backend) — Module sacré : AUCUN changement (cookies déjà posés) ; cité pour mémoire.
- `frontend/src/app/components/auth/LoginPassword.tsx` — 2 sites d'écriture remplacés.
- `frontend/src/app/utils/stockerJetonsSiMobile.ts` — nouveau module, unique écrivain.
- `frontend/src/app/services/api/api-client.ts` — INCHANGÉ (lectures + purge inchangées).
