#!/usr/bin/env python3
"""Régénère docs/terrain/CATALOGUE-198-PAR-FAMILLE.md depuis le CSV du dépôt.

La source est `infra/odoo-poc/referentiel-maitre/03_mapping_julaba_local.csv`,
dont l'intégrité est couverte par `manifest.json` (sha256). Rien n'est inventé
ici : le script regroupe et met en forme, il n'ajoute aucune donnée.

POURQUOI PAS DEPUIS `catalogue_maitre` : la table est présumée vide en
production (non vérifié — l'inventaire n'a pas encore tourné), et Odoo n'est
pas joignable depuis JULABA. Le CSV est l'artefact d'injection : c'est
exactement ce qui a été mis dans Odoo, et son empreinte le prouve.
"""
import csv, pathlib, sys
from collections import defaultdict

RACINE = pathlib.Path(__file__).resolve().parents[2]
SRC = RACINE / 'infra/odoo-poc/referentiel-maitre/03_mapping_julaba_local.csv'
DST = RACINE / 'docs/terrain/CATALOGUE-198-PAR-FAMILLE.md'

if not SRC.exists():
    sys.exit(f"source introuvable : {SRC}")

ref = list(csv.DictReader(SRC.open(encoding='utf-8-sig')))
par = defaultdict(lambda: defaultdict(list))
for r in ref:
    par[r['famille']][r['sous_famille']].append(r)
print(f"{len(ref)} produits, {len(par)} familles → {DST}")
