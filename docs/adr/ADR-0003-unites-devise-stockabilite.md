# ADR-0003 — Unités, devise, stockabilité : six arbitrages de Patrick

**Date :** 19/09/2026
**Statut :** deux appliqués (1, 2), un PARTIEL (5), trois décidés et DIFFÉRÉS (3, 4, 6)
**Décideur :** Patrick Somet
**Origine :** trois audits en lecture seule sur `main` = `8e296ba`, dont un
mené à la lumière de trois jours passés sur Odoo.

---

## Pourquoi ce document existe

Ces six questions n'avaient jamais été tranchées. Elles ne sont pas apparues
parce que le code était mauvais : elles sont apparues parce qu'on a enfin
comparé JULABA à un système qui, lui, les avait tranchées il y a vingt ans.

Quatre des six décisions ci-dessous **ne sont pas implémentées**, et c'est
délibéré : elles touchent le modèle de données ou des valeurs déjà écrites en
base. Les injecter dans l'APK de terrain avant la fin de la recette en cours
reviendrait à changer le sol pendant qu'on le teste.

Ce fichier existe pour qu'elles ne se reperdent pas — c'est exactement ce qui
est arrivé à la note de licence MMS, restée hors de `main` et réinstruite de
zéro un mois plus tard.

## La doctrine, telle que Patrick l'a formulée

> Ne jamais masquer une réalité économique.
> Ne jamais faire dépendre l'historique de l'état actuel du catalogue.
> Ne jamais donner deux sens à la même donnée.

Les six décisions en découlent toutes.

---

## 1. Marge négative — ✅ APPLIQUÉ

**Décision :** afficher la perte réelle. Achat 1 000 F, vente 800 F → **−200 F**.

Le plancher `Math.max(0, …)` rendait une vente à perte indistinguable d'une
vente au coût inconnu : deux situations opposées, un seul affichage « marge — ».
Les bénéfices cumulés étaient surévalués d'autant.

**Fait :** plancher retiré côté serveur ET côté client (les deux appliquaient des
règles différentes — le serveur sur le total, le client ligne par ligne, d'où
deux vérités pour une même vente). L'écran affiche « Perte : 200 F » en rouge,
et **Tata le dit** : *« mais tu as perdu 200 francs dessus »*. Une marchande qui
ne lit pas ne l'apprendrait jamais autrement.

Le plancher reste pour un **coût inconnu** : ce n'est pas une perte, c'est une
absence d'information. Inventer une perte serait aussi faux qu'inventer un gain.

## 5. Devise — 🟡 PARTIELLEMENT APPLIQUÉ

**Décision :** XOF explicite dans le modèle, invisible dans l'UX quotidienne.
La marchande voit « F » ; la donnée sait « XOF ».

**Fait :** `frontend_src/src/app/config/devise.ts` — un seul endroit DÉCIDE de
la devise, de son symbole et de sa forme parlée. Il est importé par
`utils/fcfa.ts` (rendu de la monnaie, 8 consommateurs) et par
`services/margeVente.ts` (libellés de marge).

**CE QUE CETTE LIGNE A AFFIRMÉ À TORT, et il faut le dire ici parce que c'est
un document de passation.** Elle disait : « Le "FCFA" en dur dans des dizaines
d'écrans cesse d'être la source de vérité. » C'était faux deux fois. D'abord
parce qu'à l'écriture de cet ADR (19/09), `devise.ts` n'était importé par
PERSONNE : c'était du code mort annoncé comme appliqué. Un auditeur externe l'a
relevé, à raison. Ensuite parce que même après câblage, **107 fichiers écrivent
encore « FCFA » en dur** — ce sont des libellés d'affichage, pas des sources de
vérité, et les convertir serait un renommage de masse sans gain. La dette est
réelle, elle est nommée, elle n'est pas résorbée.

La leçon vaut au-delà de la devise : **un ADR qui dit « fait » alors que le
code n'est pas branché coûte plus cher qu'un ADR qui dit « décidé, pas fait ».**
Le second se reprend ; le premier se re-instruit de zéro un mois plus tard.

**PARTIEL, ET IL FAUT LE DIRE AINSI** (relevé par Patrick le 19/09) :
l'implicite CÔTÉ CODE est corrigé, mais **la vente ne persiste toujours pas sa
devise**. Tant que cette colonne n'existe pas, le XOF reste une convention, pas
une donnée.

**Reste à faire :** une colonne `devise` sur la
ligne de vente, remplie depuis cette constante. Le portefeuille en a une
(`currency DEFAULT 'XOF'`), la vente non — c'est cette asymétrie qui a été
relevée.

---

## 2. Unité de la vente — ✅ APPLIQUÉ le 19/09/2026

**Décision :** persister l'unité **dans chaque ligne de vente**, pas seulement
dans le produit.

**Le défaut, et il perd de l'information de façon irréversible.** La charge
utile envoyée à l'encaissement ne contient pas `unite`. L'unité ne vit que dans
`produits.unite`, que la marchande peut changer à tout moment. Le jour où elle
passe la tomate du tas au kilo, **toutes ses ventes passées se relisent au
kilo**. Un reçu dit « 3 × Tomate » — trois quoi ? Plus personne ne peut le
savoir, et aucune reconstitution n'est possible.

**AUCUN CHANGEMENT DE SCHÉMA N'A ÉTÉ NÉCESSAIRE**, contrairement à ce qu'on
craignait. La colonne `details` est un `jsonb` déjà persisté qui porte chaque
ligne de la vente : l'unité y est simplement ajoutée. Et c'est le bon endroit —
une vente à deux produits a DEUX unités, l'unité appartient donc à la ligne, pas
à la transaction. Le gel PILOTE-2 n'était pas réellement en cause.

**Ce qui a été fait :**
- `CartItem.unite`, capturée depuis le produit **à la création de la ligne** et
  figée — même règle que `prix_achat`, pour que l'historique ne bouge pas quand
  le catalogue change ;
- envoyée dans les DEUX chemins d'encaissement (espèces et crédit) ;
- le reçu lit l'unité de la LIGNE : « 3 tas de Tomate », plus « 3 × Tomate » ;
- **Tata la dit** au moment de l'ajout au panier : « J'ai compris : 3 tas de
  tomate » — c'est là, avant l'encaissement, qu'un malentendu se rattrape ;
- les ventes d'AVANT ce correctif n'ont pas d'unité : elles gardent la forme
  historique « 3 × Tomate ». On ne réécrit pas le passé, on cesse de le perdre.

**Accords prudents :** « tas » reste invariable, « sac » prend son pluriel,
« kg » ne se pluralise jamais. Un pluriel manquant vaut mieux qu'un mot inventé.
« unité » est traitée comme neutre — « 3 unité » n'apprend rien.

## 3. Cinq vocabulaires d'unités — 🔒 DÉCIDÉ, DIFFÉRÉ

**Décision :** un seul vocabulaire canonique, avec **alias d'entrée**. La valeur
enregistrée est `kg` ; Tata comprend « kilo », « kilos », « kilogramme ».

**Le défaut :** 15 libellés distincts répartis sur cinq listes
(`config/unites.ts`, une liste en dur dans `POSCaisse`, la table à facteurs de
`RecolteForm`, et deux types dans `julaba.types.ts`). Seuls `kg` et `sac` sont
présents partout. `régime` et `régimes`, `unité`/`unite`/`pièce` ne se
rencontreront jamais — et la comparaison se fait par égalité stricte, donc une
unité choisie à la caisse retombe en « Autre » dans la gestion de stock.

**Pourquoi différé :** **change des valeurs déjà écrites en base**. Ce n'est pas
un remplacement, c'est une normalisation à la lecture puis une migration
contrôlée.

**Note :** la partie lecture (normaliser les alias à l'affichage) est séparable
et sans risque ; elle pourrait passer avant la migration.

## 4. Facteurs de conversion — 🔒 DÉCIDÉ, DIFFÉRÉ

**Décision :** par **produit + conditionnement**, jamais de table globale.

Un sac de riz et un sac d'oignons n'ont aucune équivalence universelle.
`RecolteForm` porte aujourd'hui une table de facteurs globale — le modèle `uom`
d'Odoo fait à moitié, avec l'erreur qu'Odoo évite précisément.

**Précision, et elle compte :** l'argent est juste. `quantiteEnKg × prixParKg`
égale bien `quantite × prixSaisi`. C'est le **poids** qui est inventé, et tout
ce qui compare des prix au kilo ou agrège des tonnages en dépend.

**Pourquoi différé :** modèle de données.

## 6. Produit non stockable — 🔒 DÉCIDÉ, DIFFÉRÉ

**Décision :** un champ distinct (`suivi_stock` / `is_storable`). **Jamais zéro
pour deux sens.**

Aujourd'hui `stock = 0` veut dire à la fois « en rupture » et « pas suivi ».
L'article libre est créé avec `stock: 0` et se vend quand même — c'est la
doctrine, et elle est juste. Mais aucune requête ne peut distinguer les deux, ce
qui rend toute alerte de rupture douteuse.

**Pourquoi différé :** modèle de données.

---

## Ce qui déclenche la reprise

La recette terrain en cours. Tant qu'elle n'est pas finie, l'APK de terrain ne
doit pas changer de modèle de données sous les pieds de celle qui le teste.

**Ordre à la reprise, par coût d'attente :**

1. ~~#2 (unité de la vente)~~ — **fait le 19/09**, sans changement de schéma.
2. **#3 (vocabulaire d'unités)**, partie lecture d'abord, migration ensuite.
3. **#6 (stockabilité)** — débloque les alertes de rupture.
4. **#4 (facteurs par produit)** — le moins urgent : l'argent est déjà juste.
