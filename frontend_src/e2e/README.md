# Recette runtime — boucle espèces marchand (e2e)

Preuve **reproductible** que la boucle espèces sécurisée par R-A (#114),
crédit-off #16-B (#115) et R7 annulation (#116) est cohérente **au runtime**,
dans un vrai navigateur contre la vraie stack — pas seulement en intégration.

## PILOTE-2 — vente espèces, coupure réseau, reprise

```sh
bash frontend_src/e2e/run-recette-pilote2.sh      # GO PILOTE-2, ou NO-GO + le premier invariant cassé
```

Sept invariants, tous bloquants, arrêt au premier cassé : vente en ligne ;
coupure au moment de payer (mise en file durable, rien en base) ; retour du
réseau (rejeu, **une seule** vente) ; double rejeu de la même clé ; **le
serveur encaisse mais la réponse se perd**, puis redémarrage ; terminal
partagé (l'opération d'une marchande n'est jamais rejouée sous une autre
session) ; cohérence finale caisse / ledger / stock.

Le cinquième est la raison d'être de ce script. Les tests existants prouvent
les deux moitiés séparément — `offlineCaisse.test.mts` la file contre un
`poster` factice, `i2-idempotence-vente.spec.ts` la déduplication contre des
appels directs — mais jamais la jonction, et jamais le cas où **la vente est
déjà en base pendant que la marchande voit une erreur**. C'est là que naissent
les doublons en argent réel.

L'arbitre est PostgreSQL, jamais l'écran ni une lecture d'API.

## Lancer

```sh
# prérequis : PostgreSQL joignable (DB_* ci-dessous) + playwright-core + Chromium
export CHROMIUM_BIN=/chemin/vers/chromium        # binaire chromium (playwright)
bash frontend_src/e2e/run-recette.sh
```

Le script : base fraîche → backend NestJS (`synchronize` + seed démo) → proxy
même-origine (`frontend/dist` + `/api → :3000`) → navigateur piloté (390×844) →
**arbitrage DB**. Variables : `DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD`
(défaut `localhost/5432/julaba_user/test`), `CHROMIUM_BIN`, `RECETTE_OUT`
(défaut `/tmp/recette`).

## Scénario vérifié

1. login marchand (API, cookies) → caisse sans redirection ;
2. **étape paiement** : `Espèces` + `Mobile money`, **aucun `Crédit`**, mention
   « espèces uniquement » (capture `02-paiement.png`) ;
3. vente espèces → stock **100 → 70** ;
4. annulation admin → **200 + restitution 30** → stock **→ 100** ;
5. idempotence : rejeu annulation → **aucune re-restitution**.

Captures : `01-caisse-initiale`, `02-paiement`, `03-apres-vente`,
`04-apres-annulation` dans `RECETTE_OUT`.

## La DB est la source de vérité

Le login passe par l'**API** (cookies) pour éviter le pavé vocal, puis on navigue
directement dans la caisse. Vente et annulation passent par les **vrais
endpoints**. Le stock/ledger post-annulation est arbitré par **psql**
(`net_ledger=0`, `stock_final=100`), pas par la lecture API du navigateur.

> **Artefact de harnais connu, réfuté par la DB.** La lecture API
> `GET /caisse/produits` du contexte navigateur peut renvoyer *transitoirement*
> `null` **après** l'annulation (hoquet de session/lecture après de nombreuses
> requêtes rapides). Ce sont **deux lectures de test**, pas deux anomalies
> produit : la base montre sans ambiguïté `stock=100` et `net_ledger=0`
> (2 mouvements : vente −30, restitution +30). À ne pas réinterpréter plus tard
> comme un défaut de la boucle espèces.
