# SCHEMA-08 — `recoltes` n'est pas la même table selon le chemin de construction

> **P1 — intégrité de schéma. OUVERT.**
> Entrée préparée pour `docs/dette/REGISTRE-MAITRE.md`, à reprendre par
> l'instance qui maintient ce registre (il est une photo de `main`, je n'y
> touche pas de ma propre initiative).
>
> Trouvé par la revue contradictoire du lot « saisie brute »
> (`review/recolte-saisie-brute`). **Dette ANTÉRIEURE, pas causée par ce lot** :
> vérifiée identique sur `main` = `17f1878`.
>
> **Aucune correction ici.** Corriger exige d'abord d'établir quel comportement
> est fonctionnellement canonique — ce n'est pas une décision de remplissage.

---

## Le constat

La table `recoltes` obtenue diffère selon le mécanisme qui l'a bâtie.
Comparaison de la définition complète (types, précision, échelle, longueur,
nullabilité, défauts) entre une base construite par `synchronize` depuis les
entités et une base construite par la chaîne de migrations seule :

| colonne | `synchronize` (entités) | migrations | portée |
|---|---|---|---|
| `date_recolte` | `date` **NOT NULL** | **`character varying`** NULL | **type différent** |
| `statut` | enum `recoltes_statut_enum`, défaut **`'declaree'`** | `varchar`, défaut **`'en_cours'`** | **type ET défaut différents** |
| `quantite` | `numeric(10,2)` NOT NULL | `numeric` NULL | précision + nullabilité |
| `prix_unitaire` | `numeric(10,2)` NOT NULL | `numeric` NULL | précision + nullabilité |
| `produit` | `varchar(100)` NOT NULL | `varchar` illimité NULL | longueur + nullabilité |
| `unite` | `varchar(50)` NOT NULL | `varchar` NULL | longueur + nullabilité |
| `id` | `uuid_generate_v4()` | `extensions.uuid_generate_v4()` | schéma de l'extension |

**Les deux plus graves ne sont pas cosmétiques :**

1. **`date_recolte`** est une **date** d'un côté et une **chaîne** de l'autre.
   Tout tri, toute comparaison d'intervalle et tout `CURRENT_DATE - n` se
   comportent différemment. Une chaîne `'2026-10-5'` se trie avant
   `'2026-10-10'` ; une date, non.
2. **`statut`** n'a pas le **même défaut** : `'declaree'` contre `'en_cours'`.
   Une ligne insérée sans statut explicite n'a donc pas le même état métier
   selon l'environnement — et `'en_cours'` n'appartient même pas à l'énumération
   `RecolteStatut` du code (`declaree | validee | vendue`).

## Pourquoi aucun incident aujourd'hui

En production, la base a été bâtie par `synchronize` au premier démarrage, et
les migrations **ne tournent pas** : `DB_MIGRATIONS_RUN` vaut explicitement
`"false"` (`render.yaml:154`) et `computeBootDbFlags` renvoie
`synchronize: 'false'` sur une base existante (`schema-flags.ts:29`). La
production porte donc la forme « entités ».

**Le risque est de reproductibilité d'environnement** : tout environnement qui
applique la chaîne de migrations (un poste de développement, un banc, et
`verify:dbinit-subsumed` lui-même) obtient une **autre** table que la
production. Un test vert sur un tel environnement ne dit rien de la production,
et réciproquement.

## Pourquoi aucun gate ne le voit

| Gate | Ce qu'il compare | Pourquoi il passe à côté |
|---|---|---|
| `verify:dbinit-subsumed` | migrations ↔ `db-init` | les deux sont du même côté de la divergence |
| `schema-pilote` (empreinte) | **noms** de tables et de colonnes | ne retient ni type, ni défaut, ni nullabilité |
| `recoltes-upgrade-egale-neuve` | `synchronize` ↔ `db-init`, table entière | ne compare pas la chaîne de migrations |

Le troisième a été ajouté par le lot « saisie brute » et couvre désormais le
couple `synchronize` ↔ `db-init` sur `recoltes`. **Le couple
`synchronize` ↔ `migrations` reste non gardé**, et c'est cette ligne de dette.

## Comment reproduire

```bash
# A) base bâtie par les migrations seules
#    (DataSource synchronize:false, runMigrations(), puis lire
#     information_schema.columns WHERE table_name='recoltes')
# B) base bâtie par synchronize depuis les entités
#    (la suite d'invariants le fait : DB_SYNCHRONIZE=true sur base vierge)
# puis diff des deux définitions
```

Mesuré le 05/10/2026 sur `main` = `17f1878` : **21 objets** de `recoltes` du
côté migrations, et **7 colonnes divergentes**. Le même jour sur
`review/recolte-saisie-brute` : 24 objets, **les mêmes 7 colonnes**, et les 3
colonnes du lot sont les **seules** de la table où les deux chemins concordent.

## Ce qu'il faut décider AVANT de corriger

Ne pas aligner mécaniquement les migrations sur les entités. Il faut d'abord
trancher, pour chaque colonne :

1. **`date_recolte`** : `date` est-il le type canonique ? (Vraisemblablement
   oui — mais il faut vérifier qu'aucun code ne s'appuie sur une comparaison
   de chaîne.)
2. **`statut`** : quel défaut est le bon, et que faire de `'en_cours'`, qui
   n'existe pas dans `RecolteStatut` ? Si des lignes le portent dans un
   environnement, les lire avec l'énumération échouera.
3. **Les précisions et longueurs** (`numeric(10,2)`, `varchar(100)`,
   `varchar(50)`) : contraintes voulues, ou héritage ? Les resserrer sur un
   environnement qui porte déjà des valeurs plus larges les tronquerait.
4. **La nullabilité** : `NOT NULL` côté entités suppose que la production n'a
   aucune ligne nulle sur ces colonnes. À vérifier sur la vraie base avant
   d'imposer la contrainte ailleurs.

Et une question de doctrine, qui dépasse `recoltes` : **le gate manquant**
devrait-il comparer `synchronize` ↔ `migrations` sur TOUTES les tables ? Si
oui, il révélera probablement la même divergence ailleurs, et c'est le vrai
périmètre de ce lot séparé.

## Lien avec les lignes existantes

Cette ligne est une **instance mesurée** de `SCHEMA-01` (« trois mécanismes
coexistent : migrations, `DbInitService`, `synchronize` »), qui reste OUVERTE
P1. `SCHEMA-01` énonce le mécanisme ; `SCHEMA-08` donne pour la première fois
la **liste exacte des colonnes où la divergence est observable**, sur une table
du chemin producteur.
