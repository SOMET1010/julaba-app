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

**Statut : ✅ CORRIGÉ le 19/09/2026.** La colonne est désormais posée par
DbInit (`ALTER TABLE … ADD COLUMN IF NOT EXISTS type varchar NOT NULL DEFAULT
'vente'`), DDL identique à la migration — règle « DbInit ⊆ migrations »
(ADR-0002). Additif et idempotent : juste que la colonne existe déjà en
production ou non.

La rustine qui masquait le défaut a été retirée de
`annulation-remise-stock.spec.ts` : ce test CONSTATE désormais le schéma au
lieu de le fabriquer. Et un invariant dédié,
`backend/test/invariants/schema-ledger-sans-migration.spec.ts`, boote
l'application comme la production le fait (DbInit seul, aucune migration) et
vérifie les colonnes, la requête réelle du panneau « Derniers mouvements » et
l'INSERT réel de la restitution. Non-vacuité prouvée : en retirant la ligne de
DbInit, ses trois assertions tombent avec les erreurs exactes de production.

**Le diagnostic ci-dessous est conservé** — c'est lui qui explique pourquoi le
défaut avait survécu.

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

**Statut : ✅ CORRIGÉ le 19/09/2026.** L'unité est désormais **figée dans le
ledger** au moment du mouvement (colonne `unite`, posée dans DbInit *et* dans
la migration `1780500000000-LedgerUniteFigee`, règle ADR-0002). La lecture fait
`COALESCE(sm.unite, p.unite)` : l'unité figée gagne toujours, la jointure ne
sert plus que de repli pour les mouvements écrits avant ce jour — qu'on ne peut
pas reconstituer, puisque le catalogue a pu changer entre-temps. Une annulation
rend ce qui avait été pris **dans l'unité où il avait été pris**.

**Diagnostic d'origine, conservé :**

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

**Statut : ✅ CORRIGÉ le 19/09/2026.** Le filtre
`AND sm.quantite_retranchee <> 0` a disparu de la requête de lecture, et
`quantite_demandee` / `manquant` remontent jusqu'à l'écran. Le panneau montre
désormais **ce qui est sorti de la boutique** (4 kg), en rouge comme toute
sortie, avec la mention **« ⚠ hors stock »**. Un « 0 » n'apprend rien à
quelqu'un qui vient de remettre 4 kg à sa cliente.

La règle d'affichage vit dans **un seul endroit**, le mapper pur
`mouvement-mapper.ts` (`quantite_affichee`, `manquant`, `hors_stock`), et elle
est testée des deux côtés.

**Diagnostic d'origine, conservé :**

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

**Statut : ✅ CORRIGÉ le 19/09/2026**, bien que le crédit reste désactivé en
pilote — la chaîne est rendue correcte et testée maintenant, pour ne pas
laisser dormir une dette monétaire qui ressurgirait à la réactivation.

Chaque acompte écrit désormais une ligne dans `caisse_transactions`, de type
**`acompte_credit`** — distinct de `vente`, et c'est essentiel : la recette a
déjà été comptée à la vente à crédit, la compter une seconde fois à
l'encaissement serait le symétrique exact du défaut réparé. Tous les agrégats
de recette filtrent sur `type='vente'`, donc cette écriture leur est invisible.
`caisseTheorique` l'ajoute explicitement comme espèces entrées : **la caisse
théorique est un compte d'espèces, pas un compte de résultat.** Clé
d'idempotence dérivée du crédit et du cumul atteint.

**Diagnostic d'origine, conservé :**

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

**Les quatre constats sont corrigés.** Doctrine posée par Patrick le
19/09/2026 : *on ne part pas au terrain avec des dettes connues et atteignables
simplement parce qu'elles sont documentées — le terrain ne doit pas servir à
redécouvrir des défauts déjà compris.* Une dette n'est acceptable avant terrain
que si elle est réellement hors parcours, volontairement désactivée, sans
impact monétaire ni historique, et avec une raison explicite.

**Reste utile à savoir, pas à décider** : si la base Render ne portait PAS la
colonne, l'annulation de vente y était déjà cassée avant ce correctif. La
requête le dit, et elle ne change rien au code à livrer :

```sql
SELECT column_name FROM information_schema.columns
 WHERE table_name = 'stock_mouvements' AND column_name = 'type';
```
