#!/usr/bin/env python3
"""Controle statique de scripts/seed_vivrier.py — AUCUN serveur Odoo requis.

Le seed tourne normalement sous `odoo shell`, qui lui fournit un global `env`.
Ici on lui injecte un `env` factice qui garde l'etat entre deux executions, ce
qui permet de verifier la seule propriete qui compte vraiment pour un script de
seed : **le rejouer ne duplique rien**.

Ce que ce test protege :

1. Idempotence. Deuxieme passage : zero creation, sept mises a jour. Un seed qui
   duplique a chaque execution transforme un catalogue de test en decharge.
2. Stock pose en valeur ABSOLUE. `inventory_quantity` est une cible, pas un
   ajout : deux passages laissent le meme stock, pas le double.
3. Reference stable. Chaque produit est retrouve par son `default_code`, jamais
   par son nom, qui peut changer.
4. Devise. La societe est bien basculee sur SEED_DEVISE, et le script honore la
   variable — c'est ce qui rend le test negatif possible.
5. `env.cr.commit()`. Sans lui, `odoo shell` annule tout en sortant.
6. Les trois prix imposes : Tomate 200, Banane 100, Riz (sac) 15000.

Lancement :  python3 scripts/test_seed_vivrier.py
"""

import io
import os
import pathlib
import sys
from contextlib import redirect_stdout

RACINE = pathlib.Path(__file__).resolve().parent.parent
SCRIPT = RACINE / "scripts" / "seed_vivrier.py"

PRIX_IMPOSES = {
    "JULABA-TOMATE": 200.0,
    "JULABA-BANANE": 100.0,
    "JULABA-RIZ-SAC": 15000.0,
}


class FauxEnregistrement:
    def __init__(self, journal, ident, valeurs):
        self._journal = journal
        self.id = ident
        self.valeurs = dict(valeurs)

    def write(self, vals):
        self.valeurs.update(vals)
        self._journal.setdefault("ecritures", []).append((self.id, dict(vals)))

    def sudo(self):
        return self


class FauxDevise(FauxEnregistrement):
    def __init__(self, journal, ident, nom, active):
        super().__init__(journal, ident, {"name": nom, "active": active})

    @property
    def name(self):
        return self.valeurs["name"]

    @property
    def active(self):
        return self.valeurs["active"]

    def __bool__(self):
        return True

    def __eq__(self, autre):
        return isinstance(autre, FauxDevise) and autre.id == self.id


class FauxSociete(FauxEnregistrement):
    def __init__(self, journal, devise):
        super().__init__(journal, 1, {"name": "Societe POC"})
        self.currency_id = devise

    @property
    def name(self):
        return self.valeurs["name"]

    def write(self, vals):
        super().write(vals)
        if "currency_id" in vals:
            self._journal["devise_societe"] = vals["currency_id"]
            # Le faux doit REFLETER l'ecriture, pas seulement la noter : sinon
            # `societe.currency_id` garderait eternellement sa valeur initiale
            # et le controle du second passage ne verrait jamais la bascule.
            for devise in getattr(self, "_devises", {}).values():
                if devise.id == vals["currency_id"]:
                    self.currency_id = devise
                    break


class VideRecordset:
    def __bool__(self):
        return False

    def __len__(self):
        return 0


class FauxDevises:
    def __init__(self, journal, magasin):
        self._journal = journal
        self._magasin = magasin

    def with_context(self, **_kw):
        return self

    def search(self, domaine, limit=None):
        code = next((v for (champ, op, v) in domaine if champ == "name"), None)
        return self._magasin["devises"].get(code) or VideRecordset()


class FauxProduits:
    def __init__(self, journal, magasin):
        self._journal = journal
        self._magasin = magasin

    def sudo(self):
        return self

    def search(self, domaine, limit=None):
        ref = next((v for (champ, op, v) in domaine if champ == "default_code"), None)
        return self._magasin["produits"].get(ref) or VideRecordset()

    def create(self, vals):
        ref = vals["default_code"]
        assert ref not in self._magasin["produits"], f"DOUBLON : '{ref}' cree deux fois"
        self._magasin["seq"] += 1
        rec = FauxEnregistrement(self._journal, self._magasin["seq"], vals)
        self._magasin["produits"][ref] = rec
        self._journal.setdefault("creations", []).append(ref)
        return rec


class FauxQuant(FauxEnregistrement):
    def action_apply_inventory(self):
        self._journal.setdefault("inventaires_appliques", []).append(self.id)


class FauxQuants:
    def __init__(self, journal, magasin):
        self._journal = journal
        self._magasin = magasin

    def sudo(self):
        return self

    def with_context(self, **kw):
        self._journal["inventory_mode"] = kw.get("inventory_mode")
        return self

    def search(self, domaine, limit=None):
        pid = next((v for (champ, op, v) in domaine if champ == "product_id"), None)
        return self._magasin["quants"].get(pid) or VideRecordset()

    def create(self, vals):
        pid = vals["product_id"]
        assert pid not in self._magasin["quants"], f"DOUBLON : quant cree deux fois pour le produit {pid}"
        self._magasin["seq"] += 1
        q = FauxQuant(self._journal, self._magasin["seq"], vals)
        self._magasin["quants"][pid] = q
        return q


class FauxCurseur:
    def __init__(self, journal):
        self._journal = journal

    def commit(self):
        self._journal["commit"] = True


class FauxEnv:
    def __init__(self, journal, magasin):
        self._journal = journal
        self._magasin = magasin
        self.cr = FauxCurseur(journal)

    def __getitem__(self, modele):
        if modele == "res.currency":
            return FauxDevises(self._journal, self._magasin)
        if modele == "res.company":
            return self
        if modele == "product.product":
            return FauxProduits(self._journal, self._magasin)
        if modele == "stock.quant":
            return FauxQuants(self._journal, self._magasin)
        raise AssertionError(f"modele inattendu : {modele!r}")

    def _get_main_company(self):
        # Le magasin survit d'un passage a l'autre pour tester l'idempotence,
        # mais le journal est propre a chaque execution : on rebranche la
        # societe (et les devises) sur le journal courant, sinon leurs
        # ecritures seraient enregistrees ailleurs et le controle passerait a
        # cote — c'est exactement ce qui s'est produit a la premiere ecriture
        # de ce test.
        societe = self._magasin["societe"]
        societe._journal = self._journal
        societe._devises = self._magasin["devises"]
        for devise in self._magasin["devises"].values():
            devise._journal = self._journal
        return societe

    def ref(self, xmlid, raise_if_not_found=True):
        if xmlid == "stock.stock_location_stock":
            return FauxEnregistrement(self._journal, 8, {"name": "WH/Stock"})
        if raise_if_not_found:
            raise AssertionError(f"xmlid inattendu : {xmlid!r}")
        return False


def magasin_neuf():
    journal_init = {}
    xof = FauxDevise(journal_init, 11, "XOF", active=False)
    usd = FauxDevise(journal_init, 12, "USD", active=True)
    return {
        "devises": {"XOF": xof, "USD": usd},
        "produits": {},
        "quants": {},
        "societe": FauxSociete(journal_init, usd),  # part en USD, comme une base Odoo neuve
        "seq": 100,
    }


def executer(magasin, devise="XOF"):
    journal = {}
    globaux = {"__name__": "__main__", "env": FauxEnv(journal, magasin)}
    ancien = dict(os.environ)
    os.environ["SEED_DEVISE"] = devise
    try:
        with redirect_stdout(io.StringIO()):
            exec(compile(SCRIPT.read_text(encoding="utf-8"), str(SCRIPT), "exec"), globaux)
    finally:
        os.environ.clear()
        os.environ.update(ancien)
    return journal


def main():
    print("Controle statique de seed_vivrier.py (aucun serveur Odoo requis)")
    magasin = magasin_neuf()

    # --- Premier passage ---------------------------------------------------
    j1 = executer(magasin)
    creations = j1.get("creations", [])
    assert len(creations) == 7, f"premier passage : {len(creations)} creation(s) au lieu de 7"
    assert j1.get("commit") is True, "env.cr.commit() jamais appele — odoo shell annulerait tout"
    assert j1.get("inventory_mode") is True, "stock.quant doit etre utilise en inventory_mode"
    print(f"  OK premier passage : {len(creations)} produits crees, stock applique, commit effectue.")

    # --- Prix imposes ------------------------------------------------------
    for reference, prix in PRIX_IMPOSES.items():
        rec = magasin["produits"].get(reference)
        assert rec is not None, f"reference imposee '{reference}' absente du seed"
        assert rec.valeurs["list_price"] == prix, (
            f"'{reference}' : prix {rec.valeurs['list_price']!r} au lieu de {prix!r}"
        )
        assert rec.valeurs["is_storable"] is True, f"'{reference}' doit etre stockable pour avoir un qty_available"
    print(f"  OK prix imposes respectes : {', '.join(f'{k}={v:.0f}' for k, v in PRIX_IMPOSES.items())}.")

    # --- Devise ------------------------------------------------------------
    assert magasin["societe"].currency_id.name == "XOF" or j1.get("devise_societe") == 11, (
        "la societe n'a pas ete basculee en XOF"
    )
    xof = magasin["devises"]["XOF"]
    assert xof.active is True, "XOF doit etre activee : Odoo la livre desactivee"
    print("  OK societe basculee en XOF, devise activee.")

    # --- Second passage : LA propriete qui compte -------------------------
    stocks_apres_1 = {ref: q.valeurs["inventory_quantity"] for ref, q in magasin["quants"].items()}
    j2 = executer(magasin)
    assert j2.get("creations", []) == [], (
        f"second passage : {len(j2.get('creations', []))} creation(s) — le seed duplique, il n'est pas idempotent"
    )
    assert len(magasin["produits"]) == 7, f"{len(magasin['produits'])} produits en base au lieu de 7"
    stocks_apres_2 = {ref: q.valeurs["inventory_quantity"] for ref, q in magasin["quants"].items()}
    assert stocks_apres_1 == stocks_apres_2, (
        f"le stock a bouge au second passage : {stocks_apres_1} -> {stocks_apres_2}. "
        f"Une quantite posee en delta au lieu d'une cible doublerait le stock a chaque rejeu."
    )
    print("  OK second passage : aucune creation, 7 produits, stock inchange — idempotent.")

    # --- Honore SEED_DEVISE (ce qui rend le test negatif possible) ---------
    # On reproduit le scenario reel de devise-refusee-test.sh : instance saine
    # en XOF, PUIS bascule en devise etrangere. Partir d'une societe deja en USD
    # ne prouverait rien, la bascule serait un non-evenement.
    magasin2 = magasin_neuf()
    executer(magasin2, devise="XOF")
    assert magasin2["societe"].currency_id.name == "XOF", "le passage de reference doit laisser la societe en XOF"
    j3 = executer(magasin2, devise="USD")
    assert j3.get("devise_societe") == 12, "SEED_DEVISE=USD doit basculer la societe en USD"
    assert magasin2["societe"].currency_id.name == "USD", "la societe doit reellement se retrouver en USD"
    assert j3.get("creations", []) == [], "la bascule de devise ne doit creer aucun produit"
    print("  OK SEED_DEVISE honoree : XOF puis bascule en USD, sans creation — condition du test negatif.")

    print("Tous les controles passent.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError as e:
        print(f"ECHEC {e}", file=sys.stderr)
        sys.exit(1)
