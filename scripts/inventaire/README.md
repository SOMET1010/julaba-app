# Inventaire de la base pilote — lecture seule

```bash
DATABASE_URL='postgres://…' bash scripts/inventaire/inventaire-base-pilote.sh
```

L'URL se copie depuis Render (base Postgres → Connect → *External Database
URL*). **Elle ne doit jamais être écrite dans le dépôt.**

## Ce que le rapport contient

1. **count(*) par table** — un comptage réel, pas l'estimation `reltuples` :
   sur « combien de lignes avons-nous », une approximation n'est pas une réponse.
2. **min / max `created_at`** pour chaque table qui en a un.
3. **21 contrôles de clés** — nuls et doublons sur `users`, `produits`,
   `catalogue_maitre`, `caisse_transactions`, `caisse_sessions`, `clients` et
   le découpage administratif. **Attendu : 0 partout.**
4. **`catalogue_maitre` réel** — lignes, actives, références distinctes, dates
   de synchro, trois exemples, répartition par catégorie.
5. **Découpage administratif réel** — en base, comparé au seed du code **et**
   au découpage réel de la Côte d'Ivoire.

## Ce qu'il ne contient pas, et comment on le sait

**Aucune donnée personnelle.** Aucune requête ne rend une valeur de colonne
personnelle : uniquement des comptages, des dates, des noms de géographie et
des noms de produits.

Ce n'est pas une promesse — c'est vérifié. En répétition sur une base de test
peuplée d'une fausse fiche (téléphone, nom, NIN, hachage de mot de passe), le
rapport compte bien la ligne (`users | 1`) et **aucune des quatre valeurs
n'apparaît**.

**Aucune écriture.** La transaction est ouverte en `READ ONLY`, et l'enveloppe
pose en plus `default_transaction_read_only=on` sur toute la session.
PostgreSQL **lui-même** refuserait un `INSERT`, un `UPDATE` ou un `ALTER`.
Deux verrous, dont un que le script ne contrôle pas.

**Aucun blocage de la caisse.** `statement_timeout` 120 s, `lock_timeout` 3 s.
Une requête d'inventaire ne ralentit pas la journée d'une marchande.

## Si le schéma diffère

Les tables sont découvertes dans le catalogue, jamais écrites en dur. Chaque
contrôle de clé déclare les colonnes dont il a besoin : si l'une manque, le
contrôle est dit **NON APPLICABLE** et l'inventaire continue.

**Une table absente est dite absente, jamais comptée comme zéro** — c'est la
règle appliquée partout dans ce dépôt (ACC-02, CAI-01, BO-01).

> Ce garde-fou vient d'un vrai échec : la première répétition s'est arrêtée
> sur `communes.departement_code`, qui n'existe pas — la clé est
> `departement_id`. Une colonne mal devinée tuait tout le rapport.

## Le rapport est partageable

Il ne contient aucune PII. Il est écrit dans `$HOME`, **hors du dépôt**, sous
un nom daté.
