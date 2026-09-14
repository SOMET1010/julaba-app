# Kit d'injection du referentiel maitre JULABA dans Odoo 19

## Contenu
- `01_categories_odoo.csv` : arborescence `JULABA / famille / sous-famille`
- `02_produits_odoo.csv` : 198 produits maitres
- `03_mapping_julaba_local.csv` : metadonnees utiles au cache offline JULABA
- `seed_catalogue_maitre.py` : methode recommandee, idempotente, via `odoo shell`
- `verifier_catalogue_maitre.py` : controle lecture seule apres injection

## Doctrine offline-first
Odoo est la source de verite du referentiel produit. JULABA conserve une copie locale synchronisee pour fonctionner sans reseau.
Les ventes, paniers, prix negocies et operations offline ne dependent jamais d'Odoo en temps reel.

## Ce que l'injection fait
- cree/actualise 198 produits ;
- cree les categories `JULABA / Famille / Sous-famille` ;
- `type=consu`, `is_storable=true`, `sale_ok=true`, `purchase_ok=true` ;
- reference stable = `default_code`.

## Ce qu'elle NE fait PAS
- aucun stock ;
- aucun prix reel ;
- aucune ecriture via le Gateway JULABA ;
- aucune activation de `ODOO_REAL_WRITE_ENABLED`.

`list_price` et `standard_price` sont initialises a 0 volontairement.

## Methode recommandee sur le POC Odoo 19

Depuis `infra/odoo-poc` :

```bash
docker compose cp /CHEMIN/seed_catalogue_maitre.py odoo:/tmp/seed_catalogue_maitre.py
docker compose exec -T odoo sh -lc 'odoo shell -c /etc/odoo/odoo.conf -d "$ODOO_DB" --no-http < /tmp/seed_catalogue_maitre.py'
```

Si `$ODOO_DB` n'est pas disponible dans le conteneur, remplace-le explicitement par le nom de la base (par ex. `julaba_poc`).

Puis controle :

```bash
docker compose cp /CHEMIN/verifier_catalogue_maitre.py odoo:/tmp/verifier_catalogue_maitre.py
docker compose exec -T odoo sh -lc 'odoo shell -c /etc/odoo/odoo.conf -d "$ODOO_DB" --no-http < /tmp/verifier_catalogue_maitre.py'
```

Resultat attendu :
- `attendus=198`
- `trouves=198`
- `manquants=0`
- aucune reference en double
- aucun produit `is_storable=false`

## Import CSV via interface Odoo
Ordre :
1. `01_categories_odoo.csv`
2. `02_produits_odoo.csv`

Ne pas importer `03_mapping_julaba_local.csv` dans Odoo : ce fichier decrit la couche terrain JULABA.

## Apres validation
Le catalogue Odoo devient le referentiel maitre. JULABA synchronise `default_code`, `name`, categorie et etat actif vers son cache local. Les unites locales (`tas`, `bassine`, `lot_libre`, etc.) restent cote JULABA.
