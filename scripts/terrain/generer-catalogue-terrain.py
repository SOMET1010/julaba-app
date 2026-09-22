#!/usr/bin/env python3
"""Regenere docs/terrain/CATALOGUE-198-PAR-FAMILLE.md depuis le CSV du depot.

    python3 scripts/terrain/generer-catalogue-terrain.py

LA SOURCE est `infra/odoo-poc/referentiel-maitre/03_mapping_julaba_local.csv`,
dont l'integrite est couverte par `manifest.json` (sha256). Ce script REGROUPE
et MET EN FORME : il n'ajoute aucune donnee, n'invente aucun nom, aucune unite.

POURQUOI PAS DEPUIS `catalogue_maitre` : cette table est PRESUMEE VIDE en
production — non verifie, l'inventaire n'a pas encore tourne — et Odoo n'est
pas joignable depuis JULABA. Le CSV est l'artefact d'injection : c'est
exactement ce qui a ete mis dans Odoo, et son empreinte le prouve.
"""
import csv, pathlib, sys
from collections import defaultdict, Counter

RACINE = pathlib.Path(__file__).resolve().parents[2]
SRC = RACINE / 'infra/odoo-poc/referentiel-maitre/03_mapping_julaba_local.csv'
DST = RACINE / 'docs/terrain/CATALOGUE-198-PAR-FAMILLE.md'

if not SRC.exists():
    sys.exit("source introuvable : " + str(SRC))

ref = list(csv.DictReader(SRC.open(encoding='utf-8-sig')))
par = defaultdict(lambda: defaultdict(list))
for r in ref:
    par[r['famille']][r['sous_famille']].append(r)

unites = Counter(
    x.strip() for r in ref
    for x in r['unites_locales_autorisees'].replace(';', ',').split(',') if x.strip()
)

out = []
w = out.append
w("# Les 198 produits vivriers — aide-mémoire de l'agent\n")
w("**Généré** depuis `infra/odoo-poc/referentiel-maitre/03_mapping_julaba_local.csv`")
w("(198 lignes, sha256 couvert par `manifest.json`).")
w("Rejouable : `python3 scripts/terrain/generer-catalogue-terrain.py`\n")
w("À imprimer, ou à garder ouvert sur un second téléphone.\n")
w("## Pourquoi cette liste existe\n")
w("Dans l'application, l'écran « nouveau produit » propose **37 tuiles-photo**.")
w("Elles couvrent **8 des 198 produits** avec le nom exact. Pour les autres,")
w("l'agent tape le nom — et le nom exact compte : **« Igname » n'est pas")
w("« Igname Kponan »**. Quatre variétés d'igname, quatre prix différents ; les")
w("confondre fausse le carnet dès la première vente.\n")
w("> ⚠️ **Et les tuiles-photo posent un prix qui n'est pas le sien** (STK-02).")
w("> Après chaque tuile touchée : **efface les deux prix et demande les siens.**\n")
w("## Les unités du marché\n")
w("Le mapping déclare **" + str(len(unites)) + " unités de vente distinctes**.")
w("L'écran n'en propose que six — `unité · tas · kg · sac · bassine · régime` —")
w("mais **la saisie libre marche partout** : si elle vend à la botte, au panier")
w("ou au bidon, écris botte, panier ou bidon.\n")
w("| Unité | Produits concernés |")
w("|---|---:|")
for u, n in unites.most_common():
    w("| `" + u + "` | " + str(n) + " |")
w("")
w("---\n")

total = 0
for fam in sorted(par, key=lambda f: -sum(len(v) for v in par[f].values())):
    n = sum(len(v) for v in par[fam].values())
    total += n
    w("## " + fam + " — " + str(n) + " produits\n")
    for sf in sorted(par[fam]):
        w("### " + sf + "\n")
        w("| Référence | Nom exact à saisir | Unités du marché |")
        w("|---|---|---|")
        for r in sorted(par[fam][sf], key=lambda x: x['code_produit']):
            w("| `" + r['code_produit'] + "` | **" + r['nom_canonique'] + "** | "
              + r['unites_locales_autorisees'] + " |")
        w("")
w("---\n")
w("**" + str(total) + " produits**, " + str(len(par)) + " familles. Tous vendus au détail.\n")

DST.write_text("\n".join(out), encoding='utf-8')
print(str(total) + " produits · " + str(len(par)) + " familles · "
      + str(len(unites)) + " unités  →  " + str(DST.relative_to(RACINE)))
