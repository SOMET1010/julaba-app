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

user = users.search([("login", "=", login)], limit=1)
if user:
    print(f"[info] utilisateur '{login}' deja present (id={user.id})")
    user.write({"password": password})
else:
    # Utilisateur interne simple. Le POC est en LECTURE SEULE sur Odoo :
    # `base.group_user` suffit pour lire product.product, et rien de plus
    # n'est accorde tant qu'aucune ecriture n'est au programme.
    user = users.create({
        "name": name,
        "login": login,
        "password": password,
        "group_ids": [(6, 0, [env.ref("base.group_user").id])],
    })
    print(f"[info] utilisateur '{login}' cree (id={user.id})")

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
