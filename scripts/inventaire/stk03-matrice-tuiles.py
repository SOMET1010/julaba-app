# -*- coding: utf-8 -*-
# MESURE STK-03 — lecture seule, aucun fichier du dépôt modifié.
import json, re, unicodedata

MAITRE = json.load(open('docs/data/catalogue-maitre-julaba.v1.json'))
PRODUITS = MAITRE['produits']

src = open('frontend_src/src/app/data/catalogue-produits.ts', encoding='utf-8').read()
TUILES = [m.group(1) for m in re.finditer(r"nom:\s*'([^']+)'", src)]

def norm(s):
    s = unicodedata.normalize('NFD', s.lower())
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^a-z0-9 ]+', ' ', s).strip()

def mots(s): return norm(s).split()

# Une tuile "couvre" une référence si TOUS ses mots apparaissent, dans l'ordre,
# comme sous-séquence CONTIGUË des mots de la référence. Mécanique, pas de
# synonyme deviné : on ne rapproche jamais deux noms que le référentiel n'a pas
# rapprochés lui-même.
def couvre(tuile, ref):
    t, r = mots(tuile), mots(ref)
    if not t: return False
    for i in range(len(r) - len(t) + 1):
        if r[i:i+len(t)] == t: return True
    return False

lignes = []
for tuile in TUILES:
    if tuile == 'Autre':
        lignes.append((tuile, 'REPLI', [], set(), set())); continue
    refs = [p for p in PRODUITS if couvre(tuile, p['nom'])]
    fams = {p['famille'] for p in refs}
    sous = {p['sous_famille'] for p in refs}
    if   len(refs) == 0: etat = 'ORPHELINE'
    elif len(refs) == 1: etat = 'EXACTE'
    else:                etat = 'AMBIGUE'
    lignes.append((tuile, etat, refs, fams, sous))

for etat, titre in [('AMBIGUE',  'AMBIGUËS — plusieurs références maître derrière une tuile'),
                    ('EXACTE',   'NON AMBIGUËS — une seule référence, vendable en un toucher'),
                    ('ORPHELINE','ORPHELINES — aucune référence maître ne porte ce nom'),
                    ('REPLI',    'REPLI')]:
    sel = [l for l in lignes if l[1] == etat]
    print(f'\n=== {titre} : {len(sel)} ===')
    for tuile, _, refs, fams, sous in sel:
        if etat == 'AMBIGUE':
            print(f'  {tuile:<18} {len(refs):>3} réf. | {", ".join(sorted(sous))}')
            for p in refs[:6]:
                print(f'       - {p["reference"]}  {p["nom"]}')
            if len(refs) > 6: print(f'       … et {len(refs)-6} autre(s)')
        elif etat == 'EXACTE':
            p = refs[0]
            print(f'  {tuile:<18} → {p["reference"]}  {p["nom"]}   [{p["sous_famille"]}]')
        else:
            print(f'  {tuile}')

print('\n' + '='*66)
n = {e: len([l for l in lignes if l[1]==e]) for e in ('AMBIGUE','EXACTE','ORPHELINE','REPLI')}
print(f"tuiles : {len(TUILES)}   ambiguës {n['AMBIGUE']} | exactes {n['EXACTE']} | orphelines {n['ORPHELINE']} | repli {n['REPLI']}")
couvertes = {p['reference'] for _,_,refs,_,_ in lignes for p in refs}
print(f"références maître atteintes par une tuile : {len(couvertes)} / {len(PRODUITS)}")
print(f"références maître qu'AUCUNE tuile n'atteint : {len(PRODUITS)-len(couvertes)}")
fams_couvertes = {p['famille'] for _,_,refs,_,_ in lignes for p in refs}
print(f"familles touchées : {len(fams_couvertes)} / {len(MAITRE['familles'])}")
print('\nFAMILLES MAÎTRE JAMAIS ATTEINTES :')
for f in MAITRE['familles']:
    if f['famille'] not in fams_couvertes:
        print(f"  - {f['famille']:<34} {f['nb_produits']:>3} produits")

print('\n' + '='*66)
print('CONTRÔLE DE MON PROPRE APPARIEMENT')
from collections import defaultdict
par_ref = defaultdict(list)
for tuile, etat, refs, _, _ in lignes:
    for p in refs: par_ref[p['reference']].append(tuile)
multi = {r: t for r, t in par_ref.items() if len(t) > 1}
print(f"\nRéférences atteintes par PLUSIEURS tuiles : {len(multi)}")
noms = {p['reference']: p['nom'] for p in PRODUITS}
for r, t in sorted(multi.items()):
    print(f"  {r}  {noms[r]:<26} ← {', '.join(t)}")

print("\nRapprochements à VÉRIFIER PAR UN HUMAIN (le mot de la tuile n'est pas")
print("le produit de la référence : couleur, feuille, transformation) :")
SUSPECT = ('Feuille', 'Poudre', 'Pâte', 'Amidon', 'Semoule', 'Farine', 'Huile', 'séché', 'séchée', 'sèche', 'orange')
for tuile, etat, refs, _, _ in lignes:
    for p in refs:
        if any(s.lower() in p['nom'].lower() for s in SUSPECT) and not p['nom'].lower().startswith(norm(tuile)[:4]):
            print(f"  « {tuile} » ← {p['reference']}  {p['nom']}")
