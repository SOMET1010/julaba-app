#!/usr/bin/env python3
"""Controle statique de scripts/create_api_key.py — AUCUN serveur Odoo requis.

Le script de creation tourne normalement sous `odoo shell`, qui lui fournit un
global `env`. Ici on lui injecte un `env` factice qui enregistre les appels, et
on verifie ce qu'il DEMANDE a Odoo, sans qu'Odoo existe.

Ce que ce test protege, concretement : les deux defauts constates lors du
premier passage contre une instance Odoo 19 reelle.

1. L'utilisateur API doit recevoir `base.group_user` ET
   `stock.group_stock_user`. Sans le second, `qty_available` (champ calcule
   agregeant stock.move) fait echouer le premier search_read en 403.
2. `.env.example` doit rester lisible par `sh` : une valeur contenant des
   parentheses non quotees casse le `. .env` de init.sh et de smoke-test.sh.

Lancement :  python3 scripts/test_create_api_key.py
"""

import io
import os
import pathlib
import subprocess
import sys
from contextlib import redirect_stdout

RACINE = pathlib.Path(__file__).resolve().parent.parent
SCRIPT = RACINE / "scripts" / "create_api_key.py"

GROUPES_ATTENDUS = ["base.group_user", "stock.group_stock_user"]

ENV_FACTICE = {
    "ODOO_API_USER_LOGIN": "julaba_api",
    "ODOO_API_USER_NAME": "JULABA Integration (POC)",
    "ODOO_API_USER_PASSWORD": "mot-de-passe-factice",
    "ODOO_API_KEY_NAME": "julaba-poc",
    "ODOO_API_KEY_DAYS": "90",
}


class FauxGroupe:
    def __init__(self, xmlid, ident):
        self.xmlid = xmlid
        self.id = ident


class FauxRecordsetVide:
    """Recordset vide : falsy, pour que le script prenne la branche 'creation'."""

    def __bool__(self):
        return False

    def __len__(self):
        return 0

    def sudo(self):
        return self

    def unlink(self):
        raise AssertionError("unlink() ne doit pas etre appele sur un recordset vide")


class FauxUtilisateur:
    def __init__(self, journal, ident=7):
        self.id = ident
        self._journal = journal

    def write(self, vals):
        self._journal["write"] = vals


class FauxUsers:
    def __init__(self, journal, existant):
        self._journal = journal
        self._existant = existant

    def sudo(self):
        return self

    def search(self, domain, limit=None):
        return self._existant

    def create(self, vals):
        self._journal["create"] = vals
        return FauxUtilisateur(self._journal)


class FauxApikeys:
    def __init__(self, journal):
        self._journal = journal

    def sudo(self):
        return self

    def search(self, domain):
        return FauxRecordsetVide()

    def with_user(self, user):
        self._journal["with_user"] = user
        return self

    def _generate(self, scope, name, expiration_date):
        self._journal["generate"] = (scope, name, expiration_date)
        return "CLE-FACTICE"


class FauxCurseur:
    def __init__(self, journal):
        self._journal = journal

    def commit(self):
        self._journal["commit"] = True


class FauxEnv:
    def __init__(self, journal, existant):
        self._journal = journal
        self._users = FauxUsers(journal, existant)
        self._apikeys = FauxApikeys(journal)
        self.cr = FauxCurseur(journal)
        self._prochain_id = 100

    def __getitem__(self, modele):
        if modele == "res.users":
            return self._users
        if modele == "res.users.apikeys":
            return self._apikeys
        raise AssertionError(f"modele inattendu demande : {modele!r}")

    def ref(self, xmlid):
        self._journal.setdefault("refs", []).append(xmlid)
        self._prochain_id += 1
        return FauxGroupe(xmlid, self._prochain_id)


def executer(fabrique_existant):
    """Execute create_api_key.py avec un env factice et renvoie le journal.

    `fabrique_existant` recoit le journal partage : sans cela un faux
    utilisateur deja present enregistrerait son write() dans un journal
    distinct, et le controle passerait a cote.
    """
    journal = {}
    globaux = {"__name__": "__main__", "env": FauxEnv(journal, fabrique_existant(journal))}
    ancien = dict(os.environ)
    os.environ.update(ENV_FACTICE)
    try:
        with redirect_stdout(io.StringIO()):
            exec(compile(SCRIPT.read_text(encoding="utf-8"), str(SCRIPT), "exec"), globaux)
    finally:
        os.environ.clear()
        os.environ.update(ancien)
    return journal


def ids_groupes_demandes(vals):
    """Extrait les ids de la commande Odoo (6, 0, [...]) du champ group_ids."""
    assert "group_ids" in vals, f"champ 'group_ids' absent des valeurs : {vals!r}"
    commande = vals["group_ids"]
    assert isinstance(commande, list) and len(commande) == 1, f"forme inattendue : {commande!r}"
    code, zero, ids = commande[0]
    assert (code, zero) == (6, 0), f"commande Odoo attendue (6, 0, [...]), recue {commande[0]!r}"
    return ids


def verifier_scenario(libelle, fabrique_existant, cle_valeurs):
    journal = executer(fabrique_existant)

    refs = journal.get("refs", [])
    assert refs == GROUPES_ATTENDUS, (
        f"{libelle} : groupes demandes {refs!r} au lieu de {GROUPES_ATTENDUS!r}"
    )

    vals = journal.get(cle_valeurs)
    assert vals is not None, f"{libelle} : aucun appel '{cle_valeurs}' enregistre"
    ids = ids_groupes_demandes(vals)
    assert len(ids) == len(GROUPES_ATTENDUS), (
        f"{libelle} : {len(ids)} groupe(s) applique(s) au lieu de {len(GROUPES_ATTENDUS)}"
    )
    assert len(set(ids)) == len(ids), f"{libelle} : ids de groupes dupliques {ids!r}"

    scope, nom, _expiration = journal.get("generate", (None, None, None))
    assert scope == "rpc", f"{libelle} : scope de cle {scope!r} au lieu de 'rpc'"
    assert nom == ENV_FACTICE["ODOO_API_KEY_NAME"], f"{libelle} : nom de cle {nom!r}"
    assert journal.get("commit") is True, (
        f"{libelle} : env.cr.commit() jamais appele — odoo shell annulerait tout"
    )
    print(f"  OK {libelle} : {', '.join(GROUPES_ATTENDUS)} demandes, cle scope 'rpc', commit effectue.")


def verifier_env_example_sourcable():
    """`.env.example` doit passer un `.` shell : sinon init.sh casse au demarrage."""
    chemin = RACINE / ".env.example"
    res = subprocess.run(
        ["sh", "-c", f'set -a; . "{chemin}"; set +a; printf "%s" "$ODOO_API_USER_NAME"'],
        capture_output=True,
        text=True,
    )
    assert res.returncode == 0, (
        f".env.example illisible par sh (code {res.returncode}) : {res.stderr.strip()}"
    )
    assert res.stdout == "JULABA Integration (POC)", (
        f"ODOO_API_USER_NAME mal relu : {res.stdout!r}"
    )
    print("  OK .env.example est sourcable par sh, valeur avec parentheses preservee.")


def main():
    print("Controle statique de create_api_key.py (aucun serveur Odoo requis)")
    verifier_scenario("utilisateur cree", lambda journal: FauxRecordsetVide(), "create")
    verifier_scenario("utilisateur deja present", FauxUtilisateur, "write")
    verifier_env_example_sourcable()
    print("Tous les controles passent.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except AssertionError as e:
        print(f"ECHEC {e}", file=sys.stderr)
        sys.exit(1)
