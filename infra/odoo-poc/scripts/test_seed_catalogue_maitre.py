#!/usr/bin/env python3
"""Controle statique de scripts/seed_catalogue_maitre.py — AUCUN serveur Odoo requis.

Le seed tourne normalement sous `odoo shell`, qui lui fournit un global `env`.
Ici on lui injecte un `env` factice qui garde l'etat entre deux executions, ce
qui permet de verifier la seule propriete qui compte vraiment pour un script
d'import : **le rejouer ne duplique rien**.

Ce test protege six choses :

1. Volume. 198 references creees au premier passage, pas une de plus.
2. Arborescence. `JULABA / Famille / Sous-famille`, sans categorie en double,
   et une sous-famille rattachee a SA famille (deux familles peuvent porter
   une sous-famille de meme nom sans se confondre).
3. Idempotence. Deuxieme passage : zero creation, 198 mises a jour.
4. PRODUIT ARCHIVE — la regression qui a motive le correctif. `search` d'Odoo
   ignore les enregistrements archives : le script d'origine n'aurait pas
   retrouve un produit JULABA archive et en aurait CREE UN SECOND, avec le
   meme `default_code`. Ici on archive une reference, on rejoue, et on exige
   zero creation + reactivation.
5. Aucun stock ecrit — jamais de `stock.quant`, jamais de `qty_available`.
6. Aucun prix — `list_price` et `standard_price` restent nuls.

Lancement :  python3 scripts/test_seed_catalogue_maitre.py
"""

import io
import pathlib
import sys
from contextlib import redirect_stdout

RACINE = pathlib.Path(__file__).resolve().parent.parent
SCRIPT = RACINE / "scripts" / "seed_catalogue_maitre.py"

ATTENDU_PRODUITS = 198


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

    @property
    def active(self):
        return bool(self.valeurs.get("active", True))

    @property
    def parent_id(self):
        return self.valeurs.get("parent_id")

    def __bool__(self):
        return True


class VideRecordset:
    def __bool__(self):
        return False

    def __len__(self):
        return 0


class FauxCategories:
    def __init__(self, journal, magasin):
        self._journal = journal
        self._magasin = magasin

    def sudo(self):
        return self

    def search(self, domaine, limit=None):
        d = {champ: valeur for (champ, _op, valeur) in domaine}
        cle = (d.get("name"), d.get("parent_id") or False)
        rec = self._magasin["categories"].get(cle)
        return rec or VideRecordset()

    def create(self, vals):
        cle = (vals["name"], vals.get("parent_id") or False)
        assert cle not in self._magasin["categories"], f"DOUBLON categorie : {cle}"
        self._magasin["seq"] += 1
        rec = FauxEnregistrement(self._journal, self._magasin["seq"], vals)
        self._magasin["categories"][cle] = rec
        self._journal.setdefault("categories_creees", []).append(cle)
        return rec


class FauxProduits:
    def __init__(self, journal, magasin, voit_archives=False):
        self._journal = journal
        self._magasin = magasin
        self._voit_archives = voit_archives

    def sudo(self):
        return self

    def with_context(self, **kw):
        # C'EST LE COEUR DU TEST : sans active_test=False, ce faux se comporte
        # comme Odoo et CACHE les produits archives.
        return FauxProduits(self._journal, self._magasin,
                            voit_archives=kw.get("active_test") is False)

    def search(self, domaine, limit=None):
        ref = next((v for (champ, _op, v) in domaine if champ == "default_code"), None)
        rec = self._magasin["produits"].get(ref)
        if rec is None:
            return VideRecordset()
        if not rec.active and not self._voit_archives:
            return VideRecordset()  # exactement le piege d'Odoo
        return rec

    def create(self, vals):
        ref = vals["default_code"]
        assert ref not in self._magasin["produits"], (
            f"DOUBLON : '{ref}' cree deux fois — l'import n'est pas idempotent"
        )
        self._magasin["seq"] += 1
        rec = FauxEnregistrement(self._journal, self._magasin["seq"], vals)
        self._magasin["produits"][ref] = rec
        self._journal.setdefault("creations", []).append(ref)
        return rec


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
        if modele == "product.category":
            return FauxCategories(self._journal, self._magasin)
        if modele == "product.product":
            return FauxProduits(self._journal, self._magasin)
        # Un modele inattendu signale une derive : ecrire du stock, par
        # exemple, passerait par stock.quant — ce script ne doit JAMAIS le
        # faire.
        raise AssertionError(f"modele inattendu : {modele!r} — le seed ne doit toucher que les produits et categories")


def magasin_neuf():
    return {"categories": {}, "produits": {}, "seq": 1000}


def executer(magasin):
    journal = {}
    globaux = {"__name__": "__main__", "env": FauxEnv(journal, magasin)}
    with redirect_stdout(io.StringIO()):
        exec(compile(SCRIPT.read_text(encoding="utf-8"), str(SCRIPT), "exec"), globaux)
    return journal


def main():
    print("Controle statique de seed_catalogue_maitre.py (aucun serveur Odoo requis)")
    magasin = magasin_neuf()

    # --- Premier passage ---------------------------------------------------
    j1 = executer(magasin)
    creations = j1.get("creations", [])
    assert len(creations) == ATTENDU_PRODUITS, (
        f"premier passage : {len(creations)} creation(s) au lieu de {ATTENDU_PRODUITS}"
    )
    assert j1.get("commit") is True, "env.cr.commit() jamais appele — odoo shell annulerait tout"
    print(f"  OK premier passage : {len(creations)} references creees, commit effectue.")

    # --- Arborescence ------------------------------------------------------
    cats = magasin["categories"]
    racine = cats.get(("JULABA", False))
    assert racine is not None, "categorie racine 'JULABA' absente"
    familles = [c for c in cats.values() if c.parent_id == racine.id]
    sous = [c for c in cats.values() if c.parent_id not in (None, False, racine.id)]
    assert len(cats) == 1 + len(familles) + len(sous), "categories mal rattachees"
    assert len(familles) >= 10 and len(sous) >= 20, (
        f"arborescence suspecte : {len(familles)} famille(s), {len(sous)} sous-famille(s)"
    )
    print(f"  OK arborescence : JULABA + {len(familles)} familles + {len(sous)} sous-familles.")

    # --- Etat des produits : ni stock, ni prix -----------------------------
    for ref, rec in magasin["produits"].items():
        assert rec.valeurs["is_storable"] is True, f"'{ref}' doit etre stockable"
        assert rec.valeurs["type"] == "consu", f"'{ref}' : type inattendu"
        assert rec.valeurs["list_price"] == 0.0, f"'{ref}' : un prix a ete injecte"
        assert rec.valeurs["standard_price"] == 0.0, f"'{ref}' : un cout a ete injecte"
        assert "qty_available" not in rec.valeurs, f"'{ref}' : stock ecrit par le seed"
    print("  OK aucun prix, aucun stock, tous stockables.")

    # --- Second passage : idempotence --------------------------------------
    j2 = executer(magasin)
    assert j2.get("creations", []) == [], (
        f"second passage : {len(j2.get('creations', []))} creation(s) — l'import duplique"
    )
    assert j2.get("categories_creees", []) == [], "second passage : categorie recreee"
    assert len(magasin["produits"]) == ATTENDU_PRODUITS, (
        f"{len(magasin['produits'])} produits en base au lieu de {ATTENDU_PRODUITS}"
    )
    print(f"  OK second passage : aucune creation, {ATTENDU_PRODUITS} produits — idempotent.")

    # --- Produit ARCHIVE : la regression corrigee --------------------------
    cible = magasin["produits"]["VIV-TUB-001"]
    cible.valeurs["active"] = False
    j3 = executer(magasin)
    assert j3.get("creations", []) == [], (
        "un produit ARCHIVE a provoque une creation : doublon de default_code. "
        "C'est le defaut que `active_test=False` corrige."
    )
    assert cible.active is True, "le produit archive retrouve doit etre reactive"
    assert len(magasin["produits"]) == ATTENDU_PRODUITS, "le nombre de produits a bouge"
    print("  OK produit archive : retrouve, reactive, jamais duplique.")

    print("Tous les controles passent.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError as e:
        print(f"ECHEC {e}", file=sys.stderr)
        sys.exit(1)
