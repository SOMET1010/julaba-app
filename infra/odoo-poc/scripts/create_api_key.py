"""Cree l'utilisateur API dedie du POC JULABA et genere sa cle JSON-2.

Execute par `odoo shell` avec l'entree standard redirigee :

    docker compose exec -T odoo odoo shell -c /etc/odoo/odoo.conf -d <base> --no-http < create_api_key.py

Deux points verifies directement dans le source d'Odoo 19, et non supposes :

1. `odoo/cli/shell.py` fait un `cr.rollback()` juste apres l'execution du
   script. Sans `env.cr.commit()` explicite en fin de fichier, l'utilisateur et
   la cle seraient perdus.
2. Sur `res.users`, le champ des groupes s'appelle `group_ids` en Odoo 19
   (`odoo/addons/base/models/res_users.py`, ligne 257), et non plus `groups_id`
   comme dans les versions precedentes.
3. `base.group_user` seul ne suffit PAS a lire le catalogue tel que JULABA le
   consomme : voir le commentaire sur les groupes ci-dessous. Constate sur une
   vraie instance Odoo 19, pas deduit.

La cle est affichee UNE SEULE FOIS, prefixee par `JULABA_ODOO_API_KEY=` :
Odoo n'en stocke qu'un hash, elle n'est jamais relisible ensuite.
"""

import os
from datetime import datetime, timedelta

login = os.environ["ODOO_API_USER_LOGIN"]
name = os.environ.get("ODOO_API_USER_NAME") or "JULABA Integration (POC)"
password = os.environ["ODOO_API_USER_PASSWORD"]
key_name = os.environ.get("ODOO_API_KEY_NAME") or "julaba-poc"
key_days = int(os.environ.get("ODOO_API_KEY_DAYS") or 90)

# `env` est fourni par odoo shell, en SUPERUSER_ID.
users = env["res.users"].sudo()

# Droits strictement necessaires a la LECTURE du catalogue tel que JULABA le
# consomme, et rien de plus :
#
# - `base.group_user` : utilisateur interne, lecture de product.product.
# - `stock.group_stock_user` : indispensable des que `qty_available` est
#   demande. Ce champ n'est pas stocke : il est calcule par
#   `_compute_quantities_dict` (addons/stock/models/product.py), qui agrege
#   `stock.move`. Sans droit de lecture sur stock.move, un search_read
#   incluant `qty_available` echoue en 403 AccessError, alors meme que la
#   lecture de product.product est autorisee. Constate sur une instance Odoo 19
#   reelle : c'est le premier appel du smoke test qui tombait.
#
# LIMITATION DE SECURITE, a lire avant d'utiliser cette cle ailleurs que dans
# le POC. Pour ce POC, la lecture seule est imposee par l'allowlist de
# `OdooRealClient` et par `ODOO_REAL_WRITE_ENABLED=false`. Le groupe standard
# `stock.group_stock_user`, necessaire a `qty_available`, confere par ailleurs
# des permissions d'ecriture Odoo. Cette cle ne doit donc pas etre consideree
# comme une cle Odoo intrinsequement read-only.
#
# Constate sur une instance Odoo 19 reelle, et conforme a
# addons/stock/security/ir.model.access.csv :
#
#   modele             read  write  create  unlink
#   stock.move          oui   oui    oui     non     (access_stock_move_user 1,1,1,0)
#   stock.picking       oui   oui    oui     oui     (access_stock_picking_user 1,1,1,1)
#   stock.quant         oui   oui    oui     non
#   stock.move.line     oui   oui    oui     oui
#   stock.lot           oui   oui    oui     oui
#   product.product     oui   non    non     non
#
# La frontiere de securite effective est donc cote JULABA (allowlist client),
# pas cote Odoo. Un utilisateur Odoo reellement read-only, via un groupe ou des
# ACL dediees testes sur Odoo 19, reste une exigence AVANT toute mise en
# production. Voir README.md, section "Limitation de securite".
GROUPES_REQUIS = ["base.group_user", "stock.group_stock_user"]

user = users.search([("login", "=", login)], limit=1)
ids_groupes = [env.ref(xmlid).id for xmlid in GROUPES_REQUIS]

if user:
    print(f"[info] utilisateur '{login}' deja present (id={user.id})")
    # Les groupes sont reappliques, pas seulement poses a la creation : un
    # utilisateur issu d'une execution anterieure sans stock.group_stock_user
    # doit etre repare par un simple rejeu du script.
    user.write({"password": password, "group_ids": [(6, 0, ids_groupes)]})
else:
    user = users.create({
        "name": name,
        "login": login,
        "password": password,
        "group_ids": [(6, 0, ids_groupes)],
    })
    print(f"[info] utilisateur '{login}' cree (id={user.id})")

print(f"[info] groupes appliques : {', '.join(GROUPES_REQUIS)}")

# Une cle Odoo n'est lisible qu'a la generation. Rejouer le script doit donc
# produire une cle utilisable : on revoque l'homonyme devenue illisible.
existing = env["res.users.apikeys"].sudo().search([
    ("user_id", "=", user.id),
    ("name", "=", key_name),
])
if existing:
    print(f"[info] revocation de {len(existing)} cle(s) existante(s) nommee(s) '{key_name}'")
    existing.sudo().unlink()

# `_generate` lit `self.env.user` pour rattacher la cle : il faut donc se
# placer dans le contexte de l'utilisateur API (meme forme que le test officiel
# odoo/addons/test_http/tests/test_webjson2.py).
# Le scope 'rpc' est celui que valide l'authentification bearer des routes
# JSON-2 (odoo/addons/base/models/ir_http.py, ligne 237).
api_key = env["res.users.apikeys"].with_user(user)._generate(
    "rpc",
    key_name,
    datetime.now() + timedelta(days=key_days),
)

env.cr.commit()

print(f"[info] cle '{key_name}' valable {key_days} jours")
print(f"JULABA_ODOO_API_KEY={api_key}")
