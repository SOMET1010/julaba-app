"""Seed du catalogue vivrier ivoirien en FCFA sur l'instance Odoo du POC.

    docker compose exec -T odoo odoo shell -c /etc/odoo/odoo.conf -d <base> --no-http < seed_vivrier.py

FRONTIERE D'ARCHITECTURE — a ne jamais confondre :

    seed_vivrier.py   = administration de l'environnement de test.
    OdooRealClient    = interface runtime JULABA, toujours read-only.
    Les droits du premier ne deviennent jamais les droits du second.

Ce script ecrit dans Odoo : il cree une societe en XOF, des produits, des
quantites en stock. Il le fait en tant qu'ADMINISTRATEUR de l'instance de test,
via `odoo shell`, exactement comme un humain le ferait dans l'interface. Il ne
passe pas par `OdooRealClient`, n'emprunte pas la cle API du Gateway, n'elargit
aucune allowlist et ne justifie EN RIEN d'activer `ODOO_REAL_WRITE_ENABLED`.
Cote JULABA, le Gateway reste strictement en lecture sur
`product.product/search_read` et `product.product/read`.

IDEMPOTENCE : rejouable sans jamais dupliquer. Chaque produit est retrouve par
sa reference stable `default_code` (`JULABA-TOMATE`...), puis mis a jour ou cree.
Les quantites sont posees en valeur ABSOLUE (`inventory_quantity`), pas en
delta : deux executions laissent le meme stock, pas le double.

DEVISE : pilotee par la variable d'environnement `SEED_DEVISE` (defaut `XOF`).
En Odoo 19, `product.template.currency_id` est un champ CALCULE non stockable,
derive de la societe (`_compute_currency_id`, addons/product/models/
product_template.py) : la devise ne se fixe pas produit par produit, elle se
fixe sur la societe. C'est aussi ce qui rend le test negatif possible —
`SEED_DEVISE=USD` bascule l'instance entiere et doit faire echouer le smoke test.
"""

import os

DEVISE_DEFAUT = "XOF"

# Les trois premieres lignes reprennent a l'identique les valeurs que JULABA
# seede deja cote backend (backend/src/database/seed-demo.service.ts) : Tomate
# 200, Banane 100, Riz (sac) 15000, avec leurs stocks. Ce sont elles qui font
# foi, et le smoke test les verifie au franc pres.
#
# Les suivantes viennent de frontend_src/src/app/data/catalogue-produits.ts,
# champ `prixVente`. ATTENTION : ces deux sources JULABA ne s'accordent pas sur
# tous les produits (`catalogue-produits.ts` donne Tomate a 400 et Banane a 700,
# la ou le seed backend donne 200 et 100). On suit ici l'instruction explicite —
# garder 200 / 100 / 15000 — mais cette divergence est un vrai probleme cote
# JULABA, pas un detail de ce POC : deux catalogues qui se contredisent, c'est
# le principe 2 de la CONSTITUTION (un concept, une seule source de verite).
#
# `stock` n'est pas une donnee JULABA pour les lignes hors seed backend : ce
# sont des quantites de test arbitraires, choisies rondes pour etre lisibles.
CATALOGUE = [
    # (reference, nom, prix de vente FCFA, stock, provenance du prix)
    ("JULABA-TOMATE", "Tomate", 200.0, 50.0, "seed backend JULABA"),
    ("JULABA-BANANE", "Banane", 100.0, 40.0, "seed backend JULABA"),
    ("JULABA-RIZ-SAC", "Riz (sac)", 15000.0, 10.0, "seed backend JULABA"),
    ("JULABA-MANIOC", "Manioc", 200.0, 60.0, "catalogue-produits.ts"),
    ("JULABA-IGNAME", "Igname", 400.0, 35.0, "catalogue-produits.ts"),
    ("JULABA-PLANTAIN", "Plantain", 800.0, 25.0, "catalogue-produits.ts"),
    ("JULABA-HUILE-PALME", "Huile de palme", 1500.0, 20.0, "catalogue-produits.ts"),
]

code_devise = (os.environ.get("SEED_DEVISE") or DEVISE_DEFAUT).strip().upper()

# --- 1. Devise de la societe ----------------------------------------------
devise = env["res.currency"].with_context(active_test=False).search([("name", "=", code_devise)], limit=1)
if not devise:
    raise SystemExit(f"[seed] devise '{code_devise}' introuvable dans res.currency — rien n'a ete modifie.")
if not devise.active:
    # Odoo livre la plupart des devises desactivees : XOF en fait partie.
    devise.sudo().write({"active": True})
    print(f"[seed] devise {code_devise} activee")

societe = env["res.company"]._get_main_company()
if societe.currency_id != devise:
    ancienne = societe.currency_id.name
    societe.sudo().write({"currency_id": devise.id})
    print(f"[seed] societe '{societe.name}' : devise {ancienne} -> {code_devise}")
else:
    print(f"[seed] societe '{societe.name}' : deja en {code_devise}")

# --- 2. Produits, retrouves par reference stable ---------------------------
Produit = env["product.product"].sudo()
produits = {}

for reference, nom, prix, _stock, _source in CATALOGUE:
    existant = Produit.search([("default_code", "=", reference)], limit=1)
    valeurs = {
        "name": nom,
        "list_price": prix,
        # Odoo 19 : `type='consu'` designe un bien materiel, et c'est
        # `is_storable` qui le rend suivi en stock — donc qui donne un
        # `qty_available` qui veut dire quelque chose.
        "type": "consu",
        "is_storable": True,
        "sale_ok": True,
        "purchase_ok": True,
    }
    if existant:
        existant.write(valeurs)
        produits[reference] = existant
        print(f"[seed] {reference:<20} mis a jour  ({nom}, {prix:.0f} {code_devise})")
    else:
        cree = Produit.create({**valeurs, "default_code": reference})
        produits[reference] = cree
        print(f"[seed] {reference:<20} cree        ({nom}, {prix:.0f} {code_devise})")

# --- 3. Stock, en valeur absolue ------------------------------------------
# `inventory_quantity` est une CIBLE, pas un ajout : rejouer le script ne double
# jamais le stock. C'est ce qui rend l'idempotence vraie et pas approximative.
emplacement = env.ref("stock.stock_location_stock", raise_if_not_found=False)
if not emplacement:
    print("[seed] emplacement de stock introuvable — quantites non posees (module stock absent ?)")
else:
    Quant = env["stock.quant"].sudo().with_context(inventory_mode=True)
    for reference, _nom, _prix, stock, _source in CATALOGUE:
        produit = produits[reference]
        quant = Quant.search([("product_id", "=", produit.id), ("location_id", "=", emplacement.id)], limit=1)
        if quant:
            quant.write({"inventory_quantity": stock})
        else:
            quant = Quant.create({
                "product_id": produit.id,
                "location_id": emplacement.id,
                "inventory_quantity": stock,
            })
        quant.action_apply_inventory()
    print(f"[seed] stock pose pour {len(CATALOGUE)} produits")

# `odoo shell` fait un rollback apres execution du script (odoo/cli/shell.py) :
# sans ce commit explicite, tout ce qui precede serait perdu.
env.cr.commit()

print(f"[seed] termine — {len(CATALOGUE)} produits en {code_devise}")
print(f"SEED_DEVISE_APPLIQUEE={code_devise}")
