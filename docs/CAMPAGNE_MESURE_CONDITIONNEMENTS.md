# Campagne de mesure des conditionnements

> Préalable à toute modélisation du facteur par produit.
> **Aucun modèle n'est défini ici, et aucun code du produit n'est touché.**
> Objet : aller chercher sur le terrain la donnée qui n'existe nulle part.
>
> Suite de `docs/AUDIT_FACTEUR_PAR_PRODUIT.md`.

---

## Pourquoi une campagne, et pas un chiffre décidé au bureau

L'audit a établi que 5 des 7 facteurs de JULABA sont des **moyennes appliquées
comme des vérités**, et qu'aucune pesée ne les justifie. Décider « régime =
18 kg » dans une réunion reproduirait exactement le défaut, dans une autre
table.

La règle de cette campagne :

> **Un facteur sans pesée n'entre pas dans le référentiel.**
> Pas de valeur par défaut, pas de « en attendant ». Un produit non mesuré
> reste non mesuré, et l'écran le dit.

---

## 1. Ce qu'on mesure — liste de départ, mesurée et non devinée

Le référentiel de caisse déclare lui-même les conditionnements de ses produits.
Mesuré sur le contenu que `db-init.service.ts:256-276` sème sur une base neuve
(21 références, 5 unités) :

| Produit | Conditionnement | Facteur aujourd'hui | À peser |
|---|---|---|---|
| Ananas | pièce | **aucun** | ✅ |
| Avocat | pièce | **aucun** | ✅ |
| Banane | régime | **aucun** | ✅ |
| Plantain | régime | **aucun** | ✅ |
| Huile de palme | L | **aucun** | ✅ |
| Gombo | tas | 50 kg | ✅ **à réfuter en priorité** |
| Piment | tas | 50 kg | ✅ **à réfuter en priorité** |

Les 14 autres références sont en `kg` : le facteur y est une définition, il n'y
a rien à peser.

**Les deux dernières lignes sont le cas le plus grave de l'audit.** Le même mot
`tas` vaut *un tas de gombo au marché* côté caisse — un kilo ou deux — et
**50 kg** dans la table de conversion de la récolte. Si une productrice déclare
« 3 tas de gombo », JULABA enregistre **150 kg**. Ce n'est pas une imprécision,
c'est un ordre de grandeur. Ces deux couples se mesurent d'abord, non pour
confirmer 50 kg, mais pour **l'écarter avec une preuve**.

> `NON PROUVÉ` : le contenu réel de `caisse_produits` en production. `db-init`
> saute le seed si la table est déjà peuplée. La liste ci-dessus est celle d'une
> base neuve ; la vraie peut être plus longue.
>
> `catalogue_maitre` (les 198 références venues d'Odoo) ne porte **aucune
> unité** — il ne contribue donc pas à cette liste. C'est le trou identifié par
> l'audit.

### Compléter la liste sur la vraie base

```bash
DB_HOST=… DB_SSL=true … node backend/scripts/audit-facteur-recoltes.cjs --campagne
```

Sort un CSV des couples (produit × conditionnement) **réellement utilisés**,
tirés de `stocks`, `produits` et `caisse_produits`, triés par usage décroissant,
avec le facteur actuel et la mention `à peser`. Lecture seule éprouvée à
l'exécution (refus serveur `25006` vérifié), donc exécutable sur la production.

La campagne cible ainsi ce que les gens utilisent, pas ce qu'on imagine qu'ils
utilisent. Les noms de produit en sortent **tels qu'ils sont saisis** (texte
libre, non normalisé) : deux orthographes font deux lignes, et c'est au
dépouillement de les rapprocher — pas au script d'inventer qu'`attieke` et
`attiéké` sont le même produit.

---

## 2. Le protocole de pesée

### Combien, et surtout chez combien de personnes

| | |
|---|---|
| Cible par couple | **10 pesées** |
| Minimum pour publier quoi que ce soit | **5 pesées** |
| Vendeuses / vendeurs différents | **au moins 3** |
| Marchés ou localités différents | **au moins 2** |
| Jours différents | **au moins 2** |

**Le point méthodologique qui décide de tout** : les sacs d'une même vendeuse se
ressemblent entre eux. Dix pesées chez une seule personne donnent une faible
dispersion — et une **fausse confiance**. Ce qui compte, c'est l'écart *entre*
vendeuses. D'où le minimum de 3 personnes et 2 marchés, qui prime sur le nombre
total de pesées.

### Comment

1. **Une balance**, la même pour toute une séance, remise à zéro entre chaque
   pesée. Noter le modèle sur la fiche.
2. Peser le contenu **tel qu'il est vendu** — un régime entier, un tas tel que
   la vendeuse le constitue, une cagette pleine. On mesure ce que la cliente
   emporte, pas un échantillon idéalisé.
3. **Tare** : si le contenant est pesé avec, le noter et le soustraire. Un
   panier en osier, c'est 1 à 2 kg — sur un panier de 10 kg, l'oublier fausse
   de 15 %.
4. Noter **la variété** quand elle est visible (plantain « corne » vs
   « French »), et la **saison** : le même conditionnement ne pèse pas pareil
   en pleine récolte et en soudure.
5. **Demander l'accord** de la vendeuse avant de peser sa marchandise, et lui
   dire pourquoi. Ce sont les utilisatrices de JULABA : la campagne est aussi un
   contact, pas un prélèvement.
6. Une **photo** par pesée quand c'est possible (le conditionnement + l'écran de
   la balance). C'est ce qui rendra une valeur contestable vérifiable dans six
   mois.

### Règle d'arrêt

On arrête un couple quand : **10 pesées**, chez **3 personnes**, sur **2
marchés** — ou quand la dispersion est déjà si large (voir § 4) qu'une pesée de
plus ne changera pas la conclusion : ce conditionnement n'est pas convertible en
un chiffre, et seule une fourchette sera affichée.

---

## 3. La fiche de relevé

Une ligne par pesée. À imprimer, ou à tenir sur un carnet puis à saisir.

| # | Date | Marché / localité | Vendeuse (initiales) | Produit | Conditionnement | Poids brut (kg) | Tare (kg) | **Poids net (kg)** | Variété | Balance | Photo |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | | | | | | | | | | | ☐ |
| 2 | | | | | | | | | | | ☐ |
| 3 | | | | | | | | | | | ☐ |
| … | | | | | | | | | | | ☐ |

Les initiales suffisent : on a besoin de savoir que ce sont **trois personnes
différentes**, pas de qui il s'agit.

### Format de restitution

Défini maintenant pour que les relevés n'aient pas à être ressaisis le jour où
le modèle sera tranché. Un fichier `pesees-<conditionnement>-<date>.csv` :

```csv
date;marche;vendeuse_ref;produit;conditionnement;poids_net_kg;variete;balance;photo_ref
2026-10-12;Adjamé;MK;Plantain;régime;16.4;corne;Camry 50kg;IMG_0412
2026-10-12;Adjamé;AD;Plantain;régime;21.1;French;Camry 50kg;IMG_0413
2026-10-14;Korhogo;BT;Plantain;régime;13.8;corne;Camry 50kg;IMG_0455
```

**Une ligne = une pesée.** On ne saisit jamais une moyenne déjà calculée : les
agrégats se recalculent, les pesées perdues ne se retrouvent pas.

---

## 4. Comment on lit les résultats

Par couple (produit × conditionnement) :

| Grandeur | Pourquoi celle-là |
|---|---|
| **médiane** | résiste à une pesée mal faite ; une moyenne, non |
| **min / max** | c'est ce qu'on affichera en fourchette |
| **n** (nombre de pesées) | sans lui, la médiane ne vaut rien |
| **n_vendeuses**, **n_marchés** | la vraie mesure de représentativité |
| **dispersion** = (max − min) / médiane | décide s'il existe un chiffre |

### Niveau de confiance — proposition, à valider

| Niveau | Condition | Ce qu'on en fait |
|---|---|---|
| **haute** | n ≥ 10, ≥ 3 vendeuses, ≥ 2 marchés, dispersion ≤ 30 % | la médiane sert de facteur, affichée « environ » |
| **moyenne** | n ≥ 5, ≥ 3 vendeuses, dispersion ≤ 60 % | facteur utilisable, fourchette affichée |
| **faible** | n < 5, ou une seule vendeuse | **n'entre pas dans le référentiel** |
| **non convertible** | dispersion > 60 % même avec n ≥ 10 | **aucun facteur**. Fourchette seule, et on n'additionne pas ce produit en kilos |

La dernière ligne est importante : elle admet qu'un conditionnement peut être
**intrinsèquement non convertible**. C'est l'option D de l'audit, et c'est le
seul résultat honnête possible pour certains produits. Mieux vaut un produit
qu'on n'additionne pas qu'un total faux.

---

## 5. Deux questions sur le schéma proposé — à trancher avant de coder

Le schéma que tu as esquissé :

```text
produit · conditionnement · quantite_de_reference · unite_de_reference
facteur_estime · source · niveau_de_confiance · date_de_validite
```

**Question 1 — `quantite_de_reference` / `unite_de_reference` et
`facteur_estime` disent-ils la même chose deux fois ?**
Dans ton exemple, « ≈ 18 kg » *est* le facteur 18. Deux colonnes pour un seul
fait, c'est deux sources de vérité qui divergeront — c'est exactement ce qui a
produit le défaut audité (`produits.stock` cache vs `stock_mouvements` ledger).
Soit `facteur_estime` + `unite_de_reference` (le nombre et son unité), soit une
seule colonne dérivée et calculée. À trancher.

**Question 2 — `date_de_validite` : date *de* la mesure, ou date *jusqu'à
laquelle* elle vaut ?**
Les deux sont nécessaires et ne sont pas la même chose. Et si la saison compte —
un régime de plantain ne pèse pas pareil en pleine récolte qu'en soudure — alors
un couple peut avoir **plusieurs** facteurs valides selon la période, et la
clé n'est plus (produit, conditionnement) mais (produit, conditionnement,
période). C'est une décision de modèle, pas de remplissage.

**Ce que j'ajouterais, vu le § 4** : `n`, `n_vendeuses`, `min_kg`, `max_kg`.
Sans eux, `niveau_de_confiance` est une étiquette qu'on ne peut plus vérifier —
et dans six mois personne ne saura si « moyenne » voulait dire 5 pesées ou 50.

---

## 6. Ce qui bloque, et ce qui ne dépend pas de la campagne

**La campagne ne débloque rien si la saisie brute n'est pas déployée.**
`review/recolte-saisie-brute` (`923ef84`) est la condition : tant qu'elle n'est
pas intégrée, chaque récolte déclarée continue de détruire l'unité saisie, et le
jour où les facteurs seront mesurés, **les lignes de l'intervalle ne seront pas
recalculables**. Le coût du retard n'est pas en retard : il est en données
définitivement perdues.

Les deux travaux sont indépendants et peuvent avancer en parallèle — la campagne
sur le terrain, l'intégration dans le dépôt.
