# Dette vérifiée — constats A3 / B2 / B3, et le cas B1

**Règle appliquée** (arbitrage de Patrick, 19/09/2026) : *pas de correction
parce que « ça semble faux ». Pour chacun, une preuve reproductible du type
entrée réelle → persistance réelle → **résultat faux observé**. Sans cette
preuve, le constat reste dans la dette documentée et on avance.*

Les quatre constats ci-dessous sont **reproduits**, par un test qui tourne
contre un vrai PostgreSQL :
`backend/test/invariants/dette-audit-a3-b2-b3.spec.ts`.

Ce test **décrit** les défauts, il ne les approuve pas. Il affirme le
comportement actuel — celui qui est faux — pour que la suite reste verte et la
preuve exécutable. **Le jour où quelqu'un corrige, ce test échouera**, et ce
rouge-là voudra dire « le défaut est réparé, mets ce fichier à jour », pas
« régression ».

---

## B1 — `stock_mouvements.type` n'existe pas sur une base neuve

**Statut : CONFIRMÉ. La source a été identifiée, le constat sort de
« écart d'environnement à expliquer ».**

### Ce qui est prouvé

Sur une base bâtie comme en production, `GET /stocks/mouvements` répond **500** :

```
ERROR: column sm.type does not exist
```

La colonne `type` n'est créée :

- **ni** par le `CREATE TABLE` de `db-init.service.ts` (vérifié ligne par ligne,
  aucun `ALTER` ne l'ajoute non plus) ;
- **ni** par `synchronize` — `stock_mouvements` n'a **aucune entité TypeORM** ;
- **ni** par la chaîne de migrations — sur une base vierge,
  `computeBootDbFlags` renvoie `synchronize: true, migrationsRun: false`.

Son seul créateur est la migration `1780400000000-LedgerMouvementType`.

### Pourquoi personne ne l'avait vu

`backend/test/invariants/annulation-remise-stock.spec.ts` **applique cette
migration lui-même**, dans son `beforeAll` :

```ts
const qr = ds.createQueryRunner();
await new LedgerMouvementType1780400000000().up(qr);
```

Le commentaire qui l'accompagne est lucide — il dit que les invariants
n'exécutent pas la chaîne de migrations. Mais la conséquence ne l'est pas :
**le test qui aurait attrapé le défaut répare le schéma pour se rendre vert.**
En production, sur une base neuve, personne ne le fait.

C'est la forme la plus coûteuse d'un faux vert : huit tests passent, et ils
prouvent le contraire de ce qu'on croit.

### Ce que ça coûte à la marchande

Sur tout déploiement neuf (nouveau serveur pilote, bascule d'hébergeur) :

1. Elle se trompe de produit et touche « Annuler cette vente ».
2. `restituerStock` insère dans `stock_mouvements (…, type)` → échec Postgres.
3. L'exception remonte hors de la transaction → **rollback complet** : la vente
   **redevient valide**, l'argent reste au chiffre d'affaires, le stock reste
   retranché.
4. Elle entend : « Je n'ai pas pu annuler cette vente. » Sans savoir pourquoi,
   et sans recours.
5. En parallèle, le panneau « Derniers mouvements » reste vide en permanence
   (500 à chaque appel) : elle croit que la fonction n'existe pas.

**Coût du correctif** : ajouter la colonne au `CREATE TABLE` de DbInit, ou un
`ALTER TABLE … ADD COLUMN IF NOT EXISTS` à côté des autres. DbInit est le seul
mécanisme garanti en production — c'est la règle « DbInit ⊆ migrations » que ce
fichier revendique déjà pour `caisse_sessions`.

**Requête qui tranche sur la base réelle :**
```sql
SELECT column_name FROM information_schema.columns
 WHERE table_name = 'stock_mouvements' AND column_name = 'type';
```

---

## B2 — Changer l'unité d'un produit réécrit le sens de tout son historique

**Statut : CONFIRMÉ, reproduit.**

`stocks-rest.controller.ts` lit l'unité d'un mouvement **passé** dans le
catalogue **d'aujourd'hui** :

```sql
SELECT sm.produit_nom, sm.quantite_retranchee, …, p.unite
  FROM stock_mouvements sm
  LEFT JOIN produits p ON p.id = sm.produit_id
```

Le ledger fige `produit_nom`. Il ne fige pas l'unité.

**Reproduction** : lundi, « Piment » au **tas**, elle en vend 5 → le mouvement
dit « 5 tas ». Mercredi, elle repasse le piment au **kilo** → le mouvement de
lundi dit « **5 kg** ». Aucune vente n'a bougé.

C'est la règle 2 de la doctrine — *ne jamais faire dépendre l'historique de
l'état actuel du catalogue*. La leçon a été tirée côté **vente** le 19/09
(l'unité est figée dans `caisse_transactions.details`, et le commentaire de
`POSCaisse` le dit mot pour mot). Elle n'a pas été portée côté **stock**.

Pour une non-lectrice, le chiffre et la couleur restent lisibles ; l'unité est
précisément ce qu'elle ne peut pas recouper de mémoire.

---

## B3 — Une vente hors stock est journalisée, puis rendue invisible

**Statut : CONFIRMÉ, reproduit.**

À chaque vente, le contrôleur écrit `manquant = demandée − retranchée`. Cette
colonne n'est **lue par personne** : aucun `SELECT`, aucune route, aucun écran.
Et la seule requête de lecture du ledger filtre `AND sm.quantite_retranchee <> 0`.

**Reproduction** : « Igname » à 0 en stock, elle en vend 4 kg.
La ligne est écrite — `demandée 4, retranchée 0, manquant 4` — puis **exclue de
l'affichage** par le filtre.

Le commentaire du code annonce l'inverse : *« I3 : jamais de clamp silencieux —
le manquant est explicitement journalisé »*. Il est journalisé. Il n'est jamais
ressorti.

Conséquence : son stock d'igname reste bloqué à 0, aucune sortie n'apparaît, et
le stock qu'elle consulte pour décider de son réapprovisionnement n'a jamais
reflété ce qu'elle a vendu.

---

## A3 — Un acompte de crédit est de l'argent reçu que la clôture ignore

**Statut : CONFIRMÉ, reproduit. LATENT en pilote.**

`caisseTheorique` = fond + ventes − dépenses, calculé sur
`caisse_transactions` **seulement**. Or `PATCH /caisse/credits/:id/acompte`
n'écrit **aucune** transaction de caisse : il ne touche que la table `credits`.
Le téléphone, lui, compte les acomptes dans sa caisse
(`encaisse = ventesEspeces + acomptesCredit`).

**Reproduction** : crédit de 5 000 F, acompte de 2 000 F encaissé.
Le nombre de transactions de caisse **ne bouge pas**. À la clôture, le serveur
stocke et journalise un **écart de +2 000 F** — sur une journée où rien ne
manque.

**Aggravant** : la réponse de `POST /caisse/session/fermer` porte bien
`caisse_theorique` et `ecart`, mais le client la **jette** (`await` sans
affectation), et **aucun écran ne lit ces colonnes**. La marchande ne voit
jamais l'écart que la piste d'audit conserve.

**Pourquoi latent** : le crédit est désactivé en pilote
(`CAISSE_CREDIT_ACTIF = false`). **À re-tester impérativement avant toute
réactivation du crédit.**

---

## Ce qui n'a PAS été fait, et pourquoi

Aucune correction. Aucune migration. Aucun changement visible par la marchande.
Le lot de vérification s'arrête ici, conformément à l'arbitrage.

Un seul de ces quatre constats est, à mon sens, bloquant avant un APK terrain :
**B1**, parce qu'il casse l'annulation d'une vente sur tout déploiement neuf —
et qu'annuler une vente, c'est de l'argent réel.
