"""Controle LECTURE SEULE du referentiel maitre apres injection.

    docker compose exec -T odoo odoo shell -c /etc/odoo/odoo.conf -d <base> --no-http < verifier_catalogue_maitre.py

N'ecrit rien : que des `search`/`read`. Sort en erreur au PREMIER ecart, en le
nommant — un controle qui passe en signalant un probleme ne sert a rien.

Couvre les huit points de la validation post-import :

  1. 198 references attendues, 198 trouvees, 0 manquante ;
  2. aucun `default_code` en double — ARCHIVES COMPRIS. C'est le point que le
     controle d'origine ne voyait pas : `search` exclut les enregistrements
     archives par defaut, donc un doublon archive restait invisible au
     controle comme au seed. Les deux passent desormais par
     `active_test=False` ;
  3. tous les produits JULABA sont `is_storable=true` (sinon ils n'entrent
     pas au catalogue JULABA, voir produit-mapper.ts) ;
  4. devise XOF — sur la societe ET sur les produits ;
  5. aucun stock fictif : `qty_available` nul partout ;
  6. aucun prix injecte : `list_price` et `standard_price` nuls ;
  7. `sale_ok`, `purchase_ok`, `active` vrais partout ;
  8. aucun produit ETRANGER sous l'arborescence JULABA — en particulier aucun
     produit technique de module (`Tips`, cree par point_of_sale). Ce dernier
     existe legitimement dans l'instance ; ce qui serait faux, c'est qu'il
     fasse partie du referentiel JULABA.
"""
DEVISE_ATTENDUE = "XOF"

ATTENDU = ['VIV-TUB-001', 'VIV-TUB-002', 'VIV-TUB-003', 'VIV-TUB-004', 'VIV-TUB-005', 'VIV-TUB-006', 'VIV-TUB-007', 'VIV-TUB-008', 'VIV-TUB-009', 'VIV-TUB-010', 'VIV-TUB-011', 'VIV-TUB-012', 'VIV-TUB-013', 'VIV-TUB-014', 'VIV-TUB-015', 'VIV-TUB-016', 'VIV-BAN-001', 'VIV-BAN-002', 'VIV-BAN-003', 'VIV-BAN-004', 'VIV-BAN-005', 'VIV-BAN-006', 'VIV-BAN-007', 'VIV-BAN-008', 'VIV-CER-001', 'VIV-CER-002', 'VIV-CER-003', 'VIV-CER-004', 'VIV-CER-005', 'VIV-CER-006', 'VIV-CER-007', 'VIV-CER-008', 'VIV-CER-009', 'VIV-CER-010', 'VIV-CER-011', 'VIV-CER-012', 'VIV-LEG-001', 'VIV-LEG-002', 'VIV-LEG-003', 'VIV-LEG-004', 'VIV-LEG-005', 'VIV-LEG-006', 'VIV-LEG-007', 'VIV-LEG-008', 'VIV-LEG-009', 'VIV-LEG-010', 'VIV-LEG-011', 'VIV-LEG-012', 'VIV-LEG-013', 'VIV-LEG-014', 'VIV-LEG-015', 'VIV-TOM-001', 'VIV-TOM-002', 'VIV-TOM-003', 'VIV-TOM-004', 'VIV-TOM-005', 'VIV-OIG-001', 'VIV-OIG-002', 'VIV-OIG-003', 'VIV-OIG-004', 'VIV-OIG-005', 'VIV-OIG-006', 'VIV-OIG-007', 'VIV-OIG-008', 'VIV-AUB-001', 'VIV-AUB-002', 'VIV-AUB-003', 'VIV-AUB-004', 'VIV-AUB-005', 'VIV-PIM-001', 'VIV-PIM-002', 'VIV-PIM-003', 'VIV-PIM-004', 'VIV-PIM-005', 'VIV-GOM-001', 'VIV-GOM-002', 'VIV-GOM-003', 'VIV-GOM-004', 'VIV-FEU-001', 'VIV-FEU-002', 'VIV-FEU-003', 'VIV-FEU-004', 'VIV-FEU-005', 'VIV-FEU-006', 'VIV-FEU-007', 'VIV-FEU-008', 'VIV-FEU-009', 'VIV-FEU-010', 'VIV-FEU-011', 'VIV-LEG-016', 'VIV-LEG-017', 'VIV-LEG-018', 'VIV-LEG-019', 'VIV-LEG-020', 'VIV-LEG-021', 'VIV-LEG-022', 'VIV-LEG-023', 'VIV-LEG-024', 'VIV-LEG-025', 'VIV-LEG-026', 'VIV-LEG-027', 'VIV-LEG-028', 'VIV-LEG-029', 'VIV-LEG-030', 'VIV-COU-001', 'VIV-COU-002', 'VIV-COU-003', 'VIV-COU-004', 'VIV-AGR-001', 'VIV-AGR-002', 'VIV-AGR-003', 'VIV-AGR-004', 'VIV-AGR-005', 'VIV-AGR-006', 'VIV-AGR-007', 'VIV-FRT-001', 'VIV-FRT-002', 'VIV-FRT-003', 'VIV-FRT-004', 'VIV-FRT-005', 'VIV-FRT-006', 'VIV-FRT-007', 'VIV-FRT-008', 'VIV-FRT-009', 'VIV-FRT-010', 'VIV-FRT-011', 'VIV-FRT-012', 'VIV-FRT-013', 'VIV-FRI-001', 'VIV-FRI-002', 'VIV-FRI-003', 'VIV-FRI-004', 'VIV-FRI-005', 'VIV-FRI-006', 'VIV-FRI-007', 'VIV-FRI-008', 'VIV-PAL-001', 'VIV-PAL-002', 'VIV-PAL-003', 'VIV-PAL-004', 'VIV-PAL-005', 'VIV-CON-001', 'VIV-CON-002', 'VIV-CON-003', 'VIV-CON-004', 'VIV-CON-005', 'VIV-CON-006', 'VIV-EPI-001', 'VIV-EPI-002', 'VIV-EPI-003', 'VIV-EPI-004', 'VIV-EPI-005', 'VIV-EPI-006', 'VIV-EPI-007', 'VIV-EPI-008', 'VIV-EPI-009', 'VIV-EPI-010', 'VIV-HUI-001', 'VIV-HUI-002', 'VIV-HUI-003', 'VIV-HUI-004', 'VIV-HUI-005', 'VIV-MAN-001', 'VIV-MAN-002', 'VIV-MAN-003', 'VIV-MAN-004', 'VIV-MAN-005', 'VIV-MAN-006', 'VIV-MAN-007', 'VIV-MAN-008', 'VIV-MAN-009', 'VIV-TRF-001', 'VIV-TRF-002', 'VIV-TRF-003', 'VIV-TRF-004', 'VIV-TRF-005', 'VIV-TRF-006', 'VIV-TRF-007', 'VIV-TRF-008', 'VIV-ARA-001', 'VIV-ARA-002', 'VIV-ARA-003', 'VIV-ARA-004', 'VIV-SEC-001', 'VIV-SEC-002', 'VIV-SEC-003', 'VIV-SEC-004', 'VIV-SEC-005', 'VIV-SEC-006', 'VIV-SEC-007', 'VIV-CHA-001', 'VIV-CHA-002', 'VIV-CHA-003', 'VIV-NOI-001', 'VIV-NOI-002', 'VIV-NOI-003', 'VIV-CAN-001', 'VIV-CAN-002']

def echec(message):
    raise SystemExit(f"ECHEC {message}")


# `active_test=False` : un doublon archive doit etre VU, pas ignore.
Produit = env["product.product"].sudo().with_context(active_test=False)
Categorie = env["product.category"].sudo()

# --- 1. Presence ----------------------------------------------------------
recs = Produit.search([("default_code", "in", ATTENDU)])
codes = set(recs.mapped("default_code"))
manquants = sorted(set(ATTENDU) - codes)
print(f"[verify] attendus={len(ATTENDU)} trouves={len(codes)} manquants={len(manquants)}")
if manquants:
    echec(f"produits manquants ({len(manquants)}) : {manquants[:20]}")

# --- 2. Unicite, archives compris ----------------------------------------
doublons = []
for code in ATTENDU:
    n = Produit.search_count([("default_code", "=", code)])
    if n != 1:
        doublons.append((code, n))
print(f"[verify] references en double (archives compris)={len(doublons)}")
if doublons:
    echec(f"references non uniques : {doublons[:20]}")

# --- 3, 6, 7. Etat des produits -------------------------------------------
non_stockables = [(r.default_code, r.name) for r in recs if not r.is_storable]
if non_stockables:
    echec(f"produits non stockables : {non_stockables[:20]}")

inactifs = [r.default_code for r in recs if not r.active]
if inactifs:
    echec(f"produits archives : {inactifs[:20]}")

non_vendables = [r.default_code for r in recs if not r.sale_ok or not r.purchase_ok]
if non_vendables:
    echec(f"produits sans sale_ok/purchase_ok : {non_vendables[:20]}")

avec_prix = [(r.default_code, r.list_price, r.standard_price) for r in recs
             if abs(r.list_price) > 1e-9 or abs(r.standard_price) > 1e-9]
if avec_prix:
    echec(f"prix injectes alors que le referentiel n'en porte pas : {avec_prix[:10]}")
print("[verify] etat produits : stockables, actifs, vendables, prix nuls — conforme")

# --- 4. Devise -------------------------------------------------------------
societe = env["res.company"]._get_main_company()
if societe.currency_id.name != DEVISE_ATTENDUE:
    echec(f"societe '{societe.name}' en {societe.currency_id.name}, attendu {DEVISE_ATTENDUE}. "
          f"Un prix lu dans une autre devise serait un chiffre faux — NO-GO.")
devises = {r.currency_id.name for r in recs}
if devises != {DEVISE_ATTENDUE}:
    echec(f"devises produits inattendues : {sorted(devises)}")
print(f"[verify] devise societe et produits = {DEVISE_ATTENDUE}")

# --- 5. Aucun stock fictif -------------------------------------------------
avec_stock = [(r.default_code, r.qty_available) for r in recs if abs(r.qty_available) > 1e-9]
if avec_stock:
    echec(f"stock fictif detecte : {avec_stock[:20]}")
print("[verify] aucun stock injecte (qty_available nul sur les 198)")

# --- 8. Rien d'etranger sous l'arborescence JULABA ------------------------
racine = Categorie.search([("name", "=", "JULABA"), ("parent_id", "=", False)], limit=1)
if not racine:
    echec("categorie racine 'JULABA' introuvable — l'arborescence n'a pas ete creee.")
sous_julaba = Produit.search([("categ_id", "child_of", racine.id)])
intrus = sorted(set(sous_julaba.mapped("default_code")) - set(ATTENDU))
etiquettes = [f"{r.default_code or '(sans ref)'}/{r.name}" for r in sous_julaba
              if r.default_code not in ATTENDU]
if intrus or etiquettes:
    echec(f"produits etrangers sous l'arborescence JULABA : {etiquettes[:20]}. "
          f"Un produit technique de module (ex. Tips) n'a rien a faire dans le referentiel.")
print(f"[verify] arborescence JULABA : {len(sous_julaba)} produits, aucun intrus")

print(f"CATALOGUE_MAITRE_TROUVES={len(codes)}")
print(f"CATALOGUE_MAITRE_MANQUANTS={len(manquants)}")
print(f"CATALOGUE_MAITRE_DOUBLONS={len(doublons)}")
print("OK referentiel maitre present, unique, stockable, en XOF, sans stock ni prix fictifs.")
