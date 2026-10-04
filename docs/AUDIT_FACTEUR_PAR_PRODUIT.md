# AUDIT — le facteur de conversion par produit

> Audit de données, demandé avant toute décision de modélisation.
> **Aucune migration, aucune modification du produit dans ce lot.**
>
> Règle appliquée : chaque affirmation est reliée à un fichier, un commit ou un
> test. Ce qui n'est pas prouvable est écrit `NON PROUVÉ` ou `À DÉFINIR`.
>
> Branche : `review/audit-facteur-par-produit` · mesuré sur `main` = `17f1878`

---

## La question, et la réponse courte

**Question.** Quels produits se déclarent en sac, panier, tas ? Quels facteurs
sont réellement plausibles ? Combien de lignes une migration impacterait-elle ?

**Réponse.**

| | |
|---|---|
| Quels produits se déclaraient en sac / panier / tas ? | **Impossible à savoir. La donnée n'a jamais été écrite.** Perdue définitivement. |
| Quels facteurs sont plausibles ? | **Hors du dépôt.** Le code ne porte qu'une source — les `hint` de l'écran, écrits une fois, jamais confrontés à une pesée. `À DÉFINIR` (terrain). |
| Combien de lignes impactées ? | **Mesurable sur la vraie base**, par le script livré ici. Pas depuis cet environnement : aucun accès production. `NON PROUVÉ` à ce stade. |

Et un constat qui n'était pas dans la question :

> **Un facteur global n'est pas « imprécis ». Il est nécessairement faux pour
> tous les produits sauf au plus un** — parce que 5 des 7 unités de la table ne
> sont pas des unités de masse, mais des **contenants**.

---

## 1. PROUVÉ — l'unité n'a jamais été enregistrée

`recoltes.unite` est une **constante**. Pas « souvent kg » : toujours `'kg'`.

- `RecolteForm.tsx:281` écrivait `unite: 'kg'` en dur dans le payload — alors
  que l'écran, lui, propose bien 7 unités (`RecolteForm.tsx:169-175`).
- Ce n'est pas une régression récente. `git log --follow -S"unite: uniteObj"` et
  `-S"unite: unite"` sur ce fichier : **aucun commit**. Dès la première version
  du fichier (`5aa3d78`), la ligne 281 était déjà `unite: 'kg'`.
- Un **seul** écrivain applicatif dans `recoltes` : cet écran. (L'autre est
  `seed-demo.service.ts:311`, qui écrit aussi `'kg'`.)
- La contamination se propage : `publications.unite` vaut
  `recolte.unite || 'kg'` (`PublierRecolteModal.tsx:52`). Le marché ne porte
  pas davantage l'unité.

Prouvé par `backend/test/invariants/audit-facteur-indeterminable.spec.ts`,
test « `recoltes.unite` est une CONSTANTE ».

## 2. PROUVÉ — le facteur n'est pas reconstituable par le calcul

On pourrait espérer deviner : « 300 kg est divisible par 100, c'était 3 sacs ».
**Non.** Le facteur du kilo vaut 1, et 1 divise tout : l'hypothèse « elle a tapé
N kilos » reste valide sur **chaque** ligne, et aucune autre ne peut être
écartée.

Ce n'est pas un signal faible, c'est une **collision exacte**. Quatre réalités
de terrain différentes, écrites par le vrai chemin (`POST /recoltes`), donnent
quatre lignes **identiques** :

| Ce que la productrice a dit | `quantite` | `unite` | `prix_unitaire` |
|---|---|---|---|
| 1 sac de riz à 15 000 F le sac | `100.00` | `kg` | `150.00` |
| 2 tas de riz à 7 500 F le tas | `100.00` | `kg` | `150.00` |
| 10 paniers de riz à 1 500 F le panier | `100.00` | `kg` | `150.00` |
| 100 kilos de riz à 150 F le kilo | `100.00` | `kg` | `150.00` |

Et **l'argent est juste dans les quatre cas** : 15 000 F partout. C'est
exactement pour cela que le défaut est resté invisible si longtemps — la
*valeur* était bonne, seul le *poids* était une fiction.

Prouvé par le même fichier, tests « QUATRE LIGNES IDENTIQUES », « l'argent est
juste dans les quatre cas », « l'hypothèse kg reste compatible avec 100 % ».
Non-vacuité : deux mutants, chacun fait tomber les bons tests (voir plus bas).

## 3. PROUVÉ — le défaut miroir : deux chemins d'unité, chacun perd ce que l'autre garde

| | enregistre l'unité choisie ? | convertit en kilos ? |
|---|---|---|
| `recoltes` (écran récolte) | **non** (`'kg'` en dur) | oui (facteur global) |
| `stocks` (écran producteur/coop) | **oui** (choix libre, conservé) | **non** (aucune colonne de poids) |

`stocks` est donc **la seule source de vérité existante** sur « quel produit se
compte en quoi » : `producteur/Stocks.tsx:785`, `cooperative/Stock.tsx:445`,
`Commandes.tsx:1016`, `MarcheHub.tsx:2185` utilisent tous
`SelectWithAutre` sur `UNITES_COURANTES`, saisie libre comprise.

C'est la mesure à faire en production (section 4 du script) : elle donne un
**proxy** de la réponse à la question 1. Proxy, pas réponse : un stock n'est pas
une récolte.

Prouvé par le test « `stocks` conserve l'unité choisie — et aucun facteur ne lui
est attaché » (aucune colonne `%kg%` / `%facteur%` / `%poids%` dans `stocks`).

## 4. PROUVÉ — les deux vocabulaires d'unités divergent

| | unités |
|---|---|
| Table de conversion (`RecolteForm.tsx:169-175`) | kg, tonne, sac, tas, cagette, panier, botte |
| Vocabulaire partagé (`config/unites.ts`) | kg, sac, tonne, tas, **régimes, carton, L, pièce** |
| Intersection | kg, sac, tonne, tas — **4 seulement** |
| Proposées à la saisie, **sans aucun facteur** | **régimes, carton, L, pièce** |
| Avec un facteur, mais absentes du vocabulaire partagé | cagette, panier, botte |

`régimes` est le cas le plus coûteux : c'est la banane plantain, un produit
majeur, et un régime n'a pas de poids fixe. Le fichier `config/unites.ts:14`
avertit lui-même : « ⚠️ Ne PAS confondre avec la table de conversion pondérale
de RecolteForm ». L'avertissement est exact — et c'est le symptôme.

Prouvé par le test « quatre unités du vocabulaire partagé n'ont aucun facteur ».

## 5. PROUVÉ — pourquoi un facteur global est structurellement faux

Les 7 unités de la table se séparent en deux familles :

| Famille | Unités | Le facteur est… |
|---|---|---|
| **Masse** | kg (×1), tonne (×1000) | une **définition**. Juste pour tous les produits, toujours. |
| **Contenant** | sac (×100), tas (×50), cagette (×20), panier (×10), botte (×0,5) | une **moyenne**. Dépend du produit, et souvent de la région et de la saison. |

**5 facteurs sur 7 sont des moyennes appliquées comme des vérités.** Un sac
d'igname et un sac de gombo n'ont pas le même poids : la densité du contenu
décide. Donc « panier = 10 kg » ne peut être juste que pour un produit à la
fois — pour tous les autres, le chiffre est faux, et il l'était déjà avant cet
audit.

C'est un raisonnement sur la **nature** des unités, pas une donnée agronomique.
Les valeurs plausibles, elles, restent `À DÉFINIR`.

## 6. NON PROUVÉ / hors dépôt

- **La plausibilité de chaque facteur.** Le dépôt ne contient qu'une source :
  les `hint` de `RecolteForm.tsx:171-175` (« ≈50 kg/tas », « ≈10 kg/panier »…).
  Aucun commit, aucun document, aucun test ne les relie à une pesée, un barème
  ou un interlocuteur de terrain. `À DÉFINIR` — et c'est une question pour les
  productrices, pas pour le dépôt.
- **Le volume réel en production** : nombre de récoltes, par produit, et
  distribution des quantités. Mesurable, non mesuré : **aucun accès à la base
  de production depuis cet environnement.** Le script est livré prêt à tourner.
- **Ce que fait Odoo 19** sur ce point précis (`uom.uom` et le conditionnement
  par produit). Direction à vérifier sur l'instance réelle — pas accessible
  d'ici. Noté parce que `catalogue_maitre` porte déjà `odoo_product_id`.

## 7. Là où le facteur devrait vivre — et le trou constaté

`catalogue_maitre`, le référentiel maître (198 références), porte aujourd'hui :
`nom`, `categorie`, `default_code`, `odoo_product_id`, `actif`, `synced_at`.

**Aucune unité. Aucun conditionnement. Aucun poids.**

C'est pourtant l'endroit naturel : le « Conditionnement » de la structure
référentielle proposée (Famille → Sous-famille → Produit → Variante →
**Conditionnement** → Unité de vente) *est* le facteur par produit. La réponse
est peut-être déjà dans ce modèle ; elle n'est simplement pas encore dans la
base.

---

## Comment mesurer sur la vraie base

```bash
DB_HOST=… DB_PORT=5432 DB_USERNAME=… DB_PASSWORD=… DB_NAME=… DB_SSL=true \
  node backend/scripts/audit-facteur-recoltes.cjs          # --sql pour voir les requêtes
```

**Sans risque, et ce n'est pas une promesse de commentaire.** La session est
mise en `TRANSACTION READ ONLY`, puis le script **éprouve le verrou** : il tente
une écriture volontairement vide (`UPDATE … WHERE false`, zéro ligne concernée)
et **exige** qu'elle soit refusée par le serveur (code `25006`). Si elle passait,
il s'arrête avant d'avoir rien lu. Vérifié : `UPDATE`, `DELETE` et `ALTER` sont
tous refusés, `SELECT` fonctionne.

Le rapport donne 6 sections : la constante, la non-déductibilité, le volume par
produit, les unités réellement utilisées dans `stocks`, puis dans `produits`,
et enfin — une fois le lot `risque #1` déployé — **la vraie réponse** à « quel
produit se déclare en quoi », qui commence à exister à partir de ce jour-là.

### Preuves exécutées ici

| | |
|---|---|
| `test/invariants/audit-facteur-indeterminable.spec.ts` | 7/7 |
| `test/unit/facteurs-sans-derive.spec.ts` | 5/5 |
| Mutant A — l'écran transmettrait l'unité choisie | 2 échecs (collision + constante) ; l'argent reste vert, à raison |
| Mutant B — le prix n'est plus ramené au kilo | 2 échecs (collision + argent) |
| Mutant C — la table de l'audit dérive (panier 10 → 12) | 1 échec (no-drift) |
| Script exécuté, base sans les colonnes | section 6 → « ABSENTES », correct |
| Script exécuté, colonnes posées + 4 récoltes | section 6 → sac, tas, panier, cagette par produit |

---

## Ce que cet audit implique pour la décision

Trois conséquences, dans l'ordre où elles contraignent la suite.

1. **`risque #1` n'est pas qu'un correctif : c'est la condition de l'audit.**
   Tant qu'il n'est pas déployé, aucune donnée d'unité ne s'accumule et la
   question restera sans réponse, indéfiniment. Chaque jour sans déploiement
   est un jour de données perdues.
2. **Le passé ne se rattrape pas.** Toute modélisation du facteur ne vaudra que
   pour l'avenir. Aucune migration ne peut corriger les lignes existantes —
   sauf à inventer, ce que la doctrine interdit.
3. **La question n'est pas « quel facteur » mais « où vit le facteur ».**
   `catalogue_maitre` est vide sur ce point, et c'est là que ça se joue.

### Options de modélisation — à arbitrer, non tranchées

| | Option | Ce qu'on gagne | Ce qu'on paie |
|---|---|---|---|
| **A** | Facteur par (produit, unité) dans le référentiel maître | juste par produit | ~150 produits × n unités à renseigner sur le terrain |
| **B** | Facteur par (catégorie, unité) | beaucoup moins de lignes à remplir | reste faux à l'intérieur d'une catégorie |
| **C** | Ne plus convertir du tout : stocker (quantité, unité) et ne comparer que le comparable | n'invente jamais rien | plus de total « valeur stock » toutes unités confondues |
| **D** | Facteur avec **fourchette** (min/max) et restitution en fourchette : « entre 24 et 36 kilos » | dit la vérité sur l'incertitude | tous les écrans de total à revoir |

**Ma recommandation, sous ton arbitrage : A pour le stockage, D pour
l'affichage.** Le référentiel porte le facteur par produit ; l'écran et la voix
disent une fourchette tant que ce facteur n'a pas été pesé. C'est la seule
combinaison qui ne transforme jamais une approximation en fait — et c'est déjà
ce que fait la confirmation parlée livrée dans `risque #1` (« soit **environ**
30 kilos »).

### Arbitrages qui t'appartiennent

1. **A, B, C ou D** — et si A : qui renseigne les facteurs, et comment on traite
   un produit non renseigné (refus de l'unité contenant ? fourchette large ?).
2. **Les 4 unités sans facteur** (`régimes`, `carton`, `L`, `pièce`) : on leur
   donne un facteur, ou on les interdit à la récolte ? `régimes` est le cas qui
   presse.
3. **Déployer `risque #1`** — point 1 ci-dessus : le coût du retard est en
   données définitivement perdues.
4. **Faire tourner le script sur la production** : je n'y ai pas accès.
