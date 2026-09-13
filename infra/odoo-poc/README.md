# POC Odoo 19 + POS — stack de test isolee

Instance Odoo 19 jetable, destinee a **valider la frontiere d'integration
JULABA <-> Odoo** : authentification par cle API, appel `External JSON-2 API`,
et forme de reponse consommable par le mapper JULABA.

Perimetre volontairement minimal. Ce que cette stack prouve :

```
JULABA -> POST /json/2/product.product/search_read -> Odoo 19 -> versJulaba() -> catalogue JULABA
```

Ce qu'elle ne fait **pas**, et ne doit pas faire a ce stade : aucune ecriture
vers Odoo (ni `create`, ni `stock.move`), aucune caisse JULABA, aucun credit,
aucun Mobile Money, aucune comptabilite.

## Regles de cadrage

- **Odoo ne tourne jamais dans le backend JULABA.** Cette stack se lance sur une
  machine de test (poste de dev ou VPS), avec son propre PostgreSQL. Elle ne
  touche jamais la base de JULABA.
- **Modules officiels uniquement.** Les modules du depot `ifn_odoo_modules` sont
  en version 17 et ne sont pas installes ici. Voir `addons/README.md`.
- **Instance de test.** Donnees de demonstration, mot de passe `admin`, liaison
  reseau sur la loopback. Rien de tout cela n'est destine a la production.

## Prerequis

- Docker Engine + le plugin `docker compose` (v2)
- `curl` et `python3` sur la machine hote (pour `scripts/smoke-test.sh`)
- Environ 2 Go d'espace disque et un acces sortant vers Docker Hub

> Note : l'image `odoo:19` se telecharge depuis `production.cloudfront.docker.com`.
> Certains reseaux d'entreprise bloquent cet hote — c'est le cas de
> l'environnement d'execution distant de Claude Code, raison pour laquelle cette
> stack a ete ecrite ici mais doit etre lancee depuis ton poste ou le VPS.

## Demarrage

```bash
cd infra/odoo-poc
cp .env.example .env
$EDITOR .env          # remplacer toutes les valeurs "change-me"
./scripts/init.sh
```

`scripts/init.sh` est idempotent. Il enchaine :

1. rendu de `config/odoo.conf` depuis `config/odoo.conf.template` ;
2. demarrage de PostgreSQL 16 et attente de disponibilite ;
3. creation de la base et installation des modules (saute si la base existe) ;
4. demarrage du serveur Odoo et attente de la reponse HTTP ;
5. creation de l'utilisateur API dedie et generation de sa cle ;
6. ecriture de `ODOO_API_KEY` dans `.env`.

Puis la verification du contrat :

```bash
./scripts/smoke-test.sh
```

Trois controles : l'appel anonyme est refuse (401), l'appel authentifie
repond 200, et chaque enregistrement retourne est conforme a
`OdooProductRecord` du mapper JULABA. Le script affiche pour finir la
projection `versJulaba()` de ce que verrait le catalogue JULABA.

## Acces a l'interface

`http://127.0.0.1:8069` — login `admin`, mot de passe `admin` (compte de
demonstration Odoo). Le POS est dans le menu **Point de Vente**.

### Acces distant

`ODOO_BIND_ADDR` vaut `127.0.0.1` par defaut : l'instance n'est pas joignable
depuis l'exterieur de la machine. Pour y acceder depuis ton poste quand elle
tourne sur le VPS, ouvrir un tunnel SSH plutot que de l'exposer :

```bash
ssh -L 8069:127.0.0.1:8069 julaba
```

Puis `http://127.0.0.1:8069` en local. Mettre `ODOO_BIND_ADDR=0.0.0.0` exposerait
une instance de demonstration avec un mot de passe `admin` sur le reseau : a
eviter.

## Perimetre fonctionnel

`ODOO_INSTALL_MODULES` vaut `point_of_sale,stock,sale,account` par defaut.
Odoo resout automatiquement les dependances (`point_of_sale` tire notamment
`stock_account`, `product`, `barcodes`).

Ajouter `sale_management` a la liste si l'application **Ventes** doit apparaitre
dans le menu : le module `sale` seul fournit le modele, pas l'interface.

### Donnees de demonstration

`ODOO_WITH_DEMO=true` charge le catalogue de demonstration Odoo, ce qui donne au
smoke test des produits sur lesquels travailler.

> Changement Odoo 19 : les donnees de demonstration ne sont **plus** chargees par
> defaut a la creation d'une base. `scripts/init.sh` passe `--with-demo`
> explicitement (`odoo/tools/config.py`, option `--with-demo`, `my_default=False`).
> Le comportement differe des versions <= 18.

Pour repartir d'une base vierge :

```bash
docker compose down -v      # detruit la base ET le datadir
# puis mettre ODOO_WITH_DEMO=false dans .env et relancer ./scripts/init.sh
```

## Le contrat JSON-2 en pratique

Verifie dans le source d'Odoo 19 (branche `19.0`), pas suppose :

| Point | Valeur | Source |
|---|---|---|
| Route | `POST /json/2/<model>/<method>` | `odoo/addons/test_http/tests/test_webjson2.py` |
| Authentification | `Authorization: Bearer <cle>` | `odoo/http.py` (`auth='bearer'`) |
| Scope de cle valide | `rpc` (ou cle globale, scope `NULL`) | `odoo/addons/base/models/ir_http.py:237` |
| Corps | objet JSON d'arguments **nommes** | idem tests |
| `Content-Type` | `application/json` obligatoire (sinon 415) | idem tests |
| Base | `X-Odoo-Database` requis **uniquement** en multi-base | idem tests |
| Generation de cle | `_generate(scope, name, expiration_date)` | `res_users.py:1591` |
| Champ groupes | `group_ids` (et non `groups_id`) | `res_users.py:257` |

Appel equivalent en une ligne :

```bash
curl -X POST "http://127.0.0.1:8069/json/2/product.product/search_read" \
  -H "Authorization: Bearer $ODOO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"domain": [], "fields": ["id","name","list_price","qty_available","default_code"], "limit": 5}'
```

## Lien avec le backend JULABA

Le module `backend/src/odoo-gateway/` n'a aujourd'hui qu'un `OdooMockClient`
(`odoo-mock.client.ts`), derriere le garde `ODOO_POC_ENABLED`. Le
`OdooRealClient` qui consommerait cette instance **n'existe pas encore** : c'est
un lot suivant, explicitement hors du perimetre de cette stack.

Quand il sera ecrit, les variables a fournir au backend, **cote serveur
uniquement et jamais exposees au frontend**, seront celles que produit ce POC :

```
ODOO_BASE_URL=http://127.0.0.1:8069
ODOO_API_KEY=<valeur ecrite dans infra/odoo-poc/.env par init.sh>
ODOO_DB=julaba_poc
```

## Secrets

`.env` et `config/odoo.conf` contiennent des secrets et sont ignores par git
(`.gitignore` local). La cle API n'est affichee qu'une seule fois a sa
generation : Odoo n'en conserve qu'un hash. Relancer `scripts/init.sh` revoque
la cle homonyme et en genere une nouvelle.

## Commandes utiles

```bash
docker compose ps                  # etat des conteneurs
docker compose logs -f odoo        # journaux Odoo
docker compose restart odoo        # redemarrage apres modification de odoo.conf
docker compose exec db psql -U odoo -d julaba_poc   # acces SQL direct
docker compose down                # arret, donnees conservees
docker compose down -v             # arret ET destruction des donnees
```

## Etat de validation

La stack a ete ecrite et verifiee statiquement (syntaxe shell, YAML, rendu de
configuration, logique de validation du smoke test testee sur des donnees
simulees). Elle **n'a pas pu etre executee de bout en bout** dans
l'environnement ou elle a ete redigee : le telechargement de l'image `odoo:19`
y est bloque par la politique de sortie reseau. Le premier `./scripts/init.sh`
reel est donc a faire sur ton poste ou le VPS.
