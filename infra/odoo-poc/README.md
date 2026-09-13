# POC Odoo 19 + POS — stack de test isolee

Instance Odoo 19 jetable, destinee a **valider la frontiere d'integration
JULABA <-> Odoo** : authentification par cle API, appel `External JSON-2 API`,
et forme de reponse consommable par le mapper JULABA.

Perimetre volontairement minimal. Ce que cette stack prouve :

```
JULABA -> OdooRealClient.execute() -> POST /json/2/product.product/search_read
                                   -> POST /json/2/product.product/read
       -> Odoo 19 -> versJulaba() -> catalogue JULABA
```

Le code de cette chaine existe deja cote backend (`OdooRealClient` est sur
`main`). Ce qui manque, et que cette stack fournit, c'est l'instance reelle en
face — voir "Lien avec le backend JULABA" et "Etat de validation".

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

Sur une methode de recordset comme `read`, ce sont les enregistrements vises qui
se passent par la cle nommee `ids` :

```bash
curl -X POST "http://127.0.0.1:8069/json/2/product.product/read" \
  -H "Authorization: Bearer $ODOO_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"ids": [1], "fields": ["id","name","qty_available"]}'
```

Convention verifiee dans les tests officiels d'Odoo 19
(`odoo/addons/test_http/tests/test_webjson2.py`) : un `read` sans `ids` renvoie
`[]`, et un `create` accompagne d'`ids` est refuse
(`cannot call ... with ids`).

## Lien avec le backend JULABA

`OdooRealClient` **existe deja** sur `main`
(`backend/src/odoo-gateway/odoo-real.client.ts`). Cette stack est donc son
interlocuteur : c'est l'instance contre laquelle il doit etre confronte pour la
premiere fois.

### Bascule mock / reel

La selection du client se fait par `ODOO_CLIENT_MODE`
(`backend/src/odoo-gateway/odoo-client.config.ts`) :

| Valeur | Effet |
|---|---|
| absente ou toute autre valeur | `OdooMockClient` — comportement par defaut |
| `real` | `OdooRealClient`, qui appelle vraiment l'instance Odoo |

En mode `real`, `ODOO_BASE_URL` et `ODOO_API_KEY` sont obligatoires : leur
absence fait **echouer le demarrage**, volontairement, plutot que de retomber
silencieusement sur le mock.

### Variables backend

Toutes **cote serveur uniquement**, jamais exposees au frontend JULABA :

```
ODOO_CLIENT_MODE=real
ODOO_BASE_URL=http://127.0.0.1:8069
ODOO_API_KEY=<valeur ecrite dans infra/odoo-poc/.env par init.sh>
ODOO_DB=julaba_poc            # optionnel ; declenche l'en-tete X-Odoo-Database
ODOO_REAL_WRITE_ENABLED=false # doit rester false
ODOO_REAL_TIMEOUT_MS=8000     # optionnel, defaut 8000
ODOO_POC_ENABLED=true         # expose /odoo-poc/* ; garde distinct du mode client
```

`ODOO_CLIENT_MODE` et `ODOO_POC_ENABLED` sont deux verrous independants :
le premier choisit quel client est injecte, le second autorise les routes
`/odoo-poc/*` (`OdooPocEnabledGuard`). Importer le module ne suffit pas.

Note sur `ODOO_DB` : `OdooRealClient` envoie l'en-tete `X-Odoo-Database` des que
la variable est renseignee, alors que `scripts/smoke-test.sh` ne l'envoie pas par
defaut (`ODOO_SEND_DB_HEADER=false`). Les deux comportements fonctionnent contre
cette stack : le `dbfilter = ^<base>$` de `config/odoo.conf.template` accepte
l'en-tete, et `list_db = False` n'empeche pas la resolution mono-base
(`db_list(force=True)` contourne ce controle, `odoo/service/db.py`). Pour
reproduire exactement le chemin du client reel, mettre `ODOO_SEND_DB_HEADER=true`
dans `.env`.

### Lecture seule verrouillee cote client

`OdooRealClient` applique une **allowlist**, pas une blacklist de methodes
mutantes. Tant que `ODOO_REAL_WRITE_ENABLED` n'est pas a `true`, seules ces deux
combinaisons passent, et tout le reste est refuse **avant tout appel reseau**,
methode inconnue comprise :

- `product.product/search_read`
- `product.product/read`

**`ODOO_REAL_WRITE_ENABLED` doit rester `false`.** Aucune ecriture vers Odoo
n'est au programme tant que le smoke test reel n'est pas vert (voir plus bas).
Les lectures beneficient d'un retry borne (2 tentatives) sur erreur transitoire
uniquement ; une mutation, elle, ne serait jamais rejouee automatiquement.

Ce verrou est **cote client JULABA**. Il ne dit rien des droits que la cle Odoo
possede en propre — voir "Limitation de securite" ci-dessous.

### Hypothese restant a confirmer

`OdooRealClient` suppose que le corps de la reponse JSON-2 **est** directement le
resultat de la methode, sans enveloppe facon ancien JSON-RPC
(`{jsonrpc, result, id}`). Les tests contractuels
(`backend/test/unit/odoo-gateway.contract.spec.ts`) figent cette hypothese, mais
seule une instance reelle peut la valider. C'est l'un des objets du smoke test
reel.

## Limitation de securite — avant production

**La cle API produite par ce POC n'est pas une cle Odoo read-only.**

Pour ce POC, la lecture seule est imposee par l'allowlist de `OdooRealClient` et
par `ODOO_REAL_WRITE_ENABLED=false`. Le groupe standard
`stock.group_stock_user`, necessaire a `qty_available`, confere par ailleurs des
permissions d'ecriture Odoo. Cette cle ne doit donc pas etre consideree comme
une cle Odoo intrinsequement read-only.

`qty_available` n'est pas un champ stocke : il est calcule par
`_compute_quantities_dict` (`addons/stock/models/product.py`), qui agrege
`stock.move`. Sans droit de lecture sur `stock.move`, le premier `search_read`
echoue en 403. Le groupe standard qui ouvre cette lecture ouvre aussi des
ecritures.

Droits effectifs de la cle, constates sur une instance Odoo 19 reelle via
`check_access`, et conformes a `addons/stock/security/ir.model.access.csv` :

| Modele | read | write | create | unlink |
|---|---|---|---|---|
| `stock.move` | oui | **oui** | **oui** | non |
| `stock.picking` | oui | **oui** | **oui** | **oui** |
| `stock.quant` | oui | **oui** | **oui** | non |
| `stock.move.line` | oui | **oui** | **oui** | **oui** |
| `stock.lot` | oui | **oui** | **oui** | **oui** |
| `product.product` | oui | non | non | non |

Consequence a nommer sans detour : **la frontiere de securite effective est
cote JULABA, pas cote Odoo.** Quiconque detient cette cle et tape directement
l'API JSON-2, sans passer par `OdooRealClient`, peut ecrire dans ces objets
stock. Les deux protections reelles du POC — allowlist stricte
`search_read`/`read`, et `ODOO_REAL_WRITE_ENABLED=false` — sont solides mais
vivent dans le client JULABA.

Ce que cela implique concretement :

- Traiter `ODOO_API_KEY` comme un secret d'ecriture, pas de lecture.
- Ne pas reutiliser cette cle hors de l'instance de POC.
- Garder l'instance liee a la loopback (`ODOO_BIND_ADDR=127.0.0.1`).

**Exigence avant toute mise en production :** un utilisateur Odoo reellement
read-only, via un groupe ou des ACL dediees, teste sur Odoo 19. Ce chantier est
hors du perimetre de ce POC et n'est volontairement pas entame ici : le besoin
est nomme, pas bricole.

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

La stack a ete ecrite et verifiee statiquement : syntaxe shell et YAML, rendu de
la configuration, et logique de validation du smoke test testee sur des donnees
simulees (cas conforme et cas en echec). Les comportements d'Odoo 19 documentes
dans ce fichier ont ete lus dans le source de la branche `19.0`, pas supposes.

Elle **n'a pas pu etre executee de bout en bout** dans l'environnement ou elle a
ete redigee : le telechargement de l'image `odoo:19` y est bloque par la
politique de sortie reseau.

### Prochain jalon : le smoke test reel

Executer, sur un poste ou un VPS ou Docker Hub est accessible :

```bash
cd infra/odoo-poc
cp .env.example .env && $EDITOR .env
./scripts/init.sh
./scripts/smoke-test.sh
```

Ce test reel est ce qui doit confirmer, et rien d'autre ne peut le remplacer :

| # | A confirmer | Couvert par |
|---|---|---|
| 1 | Demarrage d'Odoo 19 | `init.sh` etape 4 |
| 2 | Creation de la cle API | `init.sh` etape 5 |
| 3 | Authentification Bearer | `smoke-test.sh` tests 1 et 2 |
| 4 | `product.product/search_read` reel | `smoke-test.sh` test 2 |
| 5 | `product.product/read` reel | `smoke-test.sh` test 4 |
| 6 | Forme reelle de la reponse JSON-2 | `smoke-test.sh` test 3 |
| 7 | Compatibilite avec le mapping JULABA | `smoke-test.sh` test 3 |

Les quatre tests de `smoke-test.sh` couvrent les deux methodes de l'allowlist de
lecture d'`OdooRealClient` : refus anonyme (401), `search_read` authentifie,
conformite de la reponse au mapper, puis `read` sur un produit issu du
`search_read` avec controle de coherence du `qty_available` entre les deux
appels. Aucun point du tableau n'est laisse de cote.

### Regle de sequencement

Tant que ce smoke test reel n'est pas vert, **aucune ecriture Odoo
supplementaire n'est developpee** et `ODOO_REAL_WRITE_ENABLED` reste `false`.
Instance reelle d'abord, code ensuite.
