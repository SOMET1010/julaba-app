# Sondes de reproduction — audit écosystème, 03/10/2026

Ces sondes ont été **exécutées**, pas seulement écrites. Elles vivaient hors du
dépôt (scratchpad de session) et ne sont **pas** branchées dans une suite : ce
sont des preuves d'audit, pas des tests. Elles ont tourné sur le PostgreSQL
**local et jetable** des invariants (`./scripts/pg-test-local.sh start`,
`127.0.0.1:55432`, base recréée par `test/invariants/global-setup.ts`), avec le
même harnais que `backend/test/invariants/keiwa-paiement-commande.spec.ts` :
`AppModule` complet, `DbInitService.runInit()`, jetons JWT signés localement,
appels HTTP réels via supertest. Aucun appel réseau externe.

Pour les rejouer : copier le corps dans un fichier
`backend/test/invariants/<nom>.spec.ts` d'une branche jetable, démarrer la base,
`npx jest --config backend/jest-invariants.config.cjs <nom>`.

## S1 — Vol de wallet par `vente_directe` (🔴 argent)

```ts
const voleur = await mk('+2250799990001');   // marchand quelconque
const victime = await mk('+2250799990002');  // marchand avec 50 000 F
await ds.query('INSERT INTO wallets (user_id, solde, solde_bloque) VALUES ($1,50000,0),($2,0,0)', [victime.id, voleur.id]);
// 1) le voleur crée une « vente directe » dont la victime est l'acheteur
POST /api/v1/commandes  (jeton du voleur)
  { type:'vente_directe', vendeur_id: voleur.id, acheteur_id: victime.id,
    recolte_id: <uuid aléatoire>, produit:'Rien', quantite:1, prix_unitaire:40000,
    total:40000, mode_paiement:'keiwa', statut:'en_attente' }
// 2) le voleur « récupère le paiement »
POST /api/v1/commandes/:id/paiement  (jeton du voleur)
```

**Résultat mesuré :**
```
CREATION 201
PAIEMENT 201 {"success":true}
SOLDES [{"qui":"victime","solde":"10000.00"},{"qui":"voleur","solde":"40000.00"}]
```
Aucune action de la victime. `recolte_id` n'est vérifié par rien quand la
commande est `en_attente`. Code : `commandes-rest.controller.ts:85-176`
(création), `:190-296` (paiement, ne contrôle que `vendeurId === user.id`).

## S2 — Création d'argent par un `operateur_terrain` (🔴 argent)

```
POST /api/v1/admin/wallets/<marchande>/credit  (jeton operateur_terrain)
  { montant: 1000000, description: 'sonde' }
```
**Résultat :** `201`, solde de la marchande `1000000.00`, `audit_logs` : **0 ligne**.
Code : `admin-wallets.controller.ts:16-18` (`@Roles('ADMIN')` = 5 rôles BO),
`admin-wallets.service.ts:241-263` (aucun auteur enregistré).

## S3 — Escalade de privilèges par `admin_national` (🔴 sécurité BO)

```
PATCH /api/v1/users/<super_admin>   (jeton admin_national)  { status: 'suspendu' }
PATCH /api/v1/users/<lui-même>      (jeton admin_national)  { boPermissions: [...] }
```
**Résultat :** `200` et `200` ; en base, le super_admin est `suspendu`,
l'admin_national porte les permissions qu'il s'est données.
Code : `users.controller.ts:262-306` (liste blanche `isAdmin` contenant
`status` et `boPermissions`, aucune règle de hiérarchie).

## S4 — `GET /users/flags` (écran Modération) (❌)

**Résultat :** `500 Internal server error` pour un super_admin. La route est
capturée par `GET /users/:id`, enregistré avant (ordre de chargement réel :
`UsersModule` arrive par `AuthModule → WalletsModule` avant `UserFlagsModule`).

## S5 — `GET /zones` et `GET /missions` (❌)

```
POST /api/v1/zones (super_admin) → 201
GET  /api/v1/zones (super_admin) → 500
GET  /api/v1/missions (admin_national) → 403
```
`zones.service.ts:47` compare `stocks.zone_id` (varchar) à `zones.id` (uuid).
`missions.controller.ts:15` : `@Roles('super_admin','admin','institution')` —
`admin` n'existe pas dans `UserRole`. **Limite** : mesuré sur un schéma construit
comme le harnais (synchronize + DbInit). Le type réel de `stocks.zone_id` en
production est **À DÉFINIR**.

## Suites rejouées le 03/10/2026 (HEAD `28bf9e8`)

| Commande | Résultat |
|---|---|
| `npm run test:unit -w backend` | 33 suites, **249 tests verts** |
| `npx jest --config backend/jest-invariants.config.cjs --runInBand` (Postgres jetable) | 50 suites, **252 tests verts** |
| `node ci/check-tsc-baseline.mjs` | 0 erreur (= baseline) |
| `npm run build -w backend` / `-w frontend_src` | verts |
| `npm run verify -w frontend_src` | 127 / 130 — 3 rouges **connus** (voix-trace-source, garde-argent, i18n-empreintes-argent) |
| `npm run test:ci -w frontend_src` (CI gelée) | **ROUGE** — voir section 1.3 du rapport principal |
