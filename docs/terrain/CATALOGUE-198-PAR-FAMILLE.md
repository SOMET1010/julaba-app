# Les 198 produits vivriers — aide-mémoire de l'agent

**Généré** depuis `infra/odoo-poc/referentiel-maitre/03_mapping_julaba_local.csv`
(198 lignes, sha256 couvert par `manifest.json`).
Rejouable : `python3 scripts/terrain/generer-catalogue-terrain.py`

À imprimer, ou à garder ouvert sur un second téléphone.

## Pourquoi cette liste existe

Dans l'application, l'écran « nouveau produit » propose **37 tuiles-photo**.
Elles couvrent **8 des 198 produits** avec le nom exact. Pour les autres,
l'agent tape le nom — et le nom exact compte : **« Igname » n'est pas
« Igname Kponan »**. Quatre variétés d'igname, quatre prix différents ; les
confondre fausse le carnet dès la première vente.

> ⚠️ **Et les tuiles-photo posent un prix qui n'est pas le sien** (STK-02).
> Après chaque tuile touchée : **efface les deux prix et demande les siens.**

## Les unités du marché

Le mapping déclare **21 unités de vente distinctes**.
L'écran n'en propose que six — `unité · tas · kg · sac · bassine · régime` —
mais **la saisie libre marche partout** : si elle vend à la botte, au panier
ou au bidon, écris botte, panier ou bidon.

| Unité | Produits concernés |
|---|---:|
| `kg` | 191 |
| `tas` | 149 |
| `sac` | 90 |
| `unité` | 78 |
| `sachet` | 70 |
| `caisse` | 48 |
| `panier` | 47 |
| `botte` | 42 |
| `bassine` | 35 |
| `demi-sac` | 20 |
| `quart-sac` | 20 |
| `filet` | 15 |
| `régime` | 13 |
| `barquette` | 11 |
| `litre` | 11 |
| `bouteille` | 9 |
| `main` | 8 |
| `carton` | 8 |
| `pot` | 6 |
| `demi-panier` | 5 |
| `bidon` | 5 |

---

## Fruits — 28 produits

### Agrumes

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-AGR-001` | **Orange locale** | kg, caisse, sac, filet, unité, tas |
| `VIV-AGR-002` | **Orange importée** | kg, caisse, sac, filet, unité, tas |
| `VIV-AGR-003` | **Mandarine** | kg, caisse, sac, filet, unité, tas |
| `VIV-AGR-004` | **Clémentine** | kg, caisse, sac, filet, unité, tas |
| `VIV-AGR-005` | **Citron vert** | kg, caisse, sac, filet, unité, tas |
| `VIV-AGR-006` | **Citron jaune** | kg, caisse, sac, filet, unité, tas |
| `VIV-AGR-007` | **Pamplemousse** | kg, caisse, sac, filet, unité, tas |

### Fruits importés / complémentaires

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-FRI-001` | **Pomme rouge** | kg, caisse, carton, barquette, unité |
| `VIV-FRI-002` | **Pomme verte** | kg, caisse, carton, barquette, unité |
| `VIV-FRI-003` | **Poire** | kg, caisse, carton, barquette, unité |
| `VIV-FRI-004` | **Raisin rouge** | kg, caisse, carton, barquette, unité |
| `VIV-FRI-005` | **Raisin blanc** | kg, caisse, carton, barquette, unité |
| `VIV-FRI-006` | **Kiwi** | kg, caisse, carton, barquette, unité |
| `VIV-FRI-007` | **Pêche** | kg, caisse, carton, barquette, unité |
| `VIV-FRI-008` | **Prune** | kg, caisse, carton, barquette, unité |

### Fruits tropicaux

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-FRT-001` | **Mangue Kent** | kg, caisse, panier, unité, tas |
| `VIV-FRT-002` | **Mangue Amélie** | kg, caisse, panier, unité, tas |
| `VIV-FRT-003` | **Mangue Brooks** | kg, caisse, panier, unité, tas |
| `VIV-FRT-004` | **Papaye** | kg, caisse, panier, unité, tas |
| `VIV-FRT-005` | **Ananas** | kg, caisse, panier, unité, tas |
| `VIV-FRT-006` | **Pastèque** | kg, caisse, panier, unité, tas |
| `VIV-FRT-007` | **Melon** | kg, caisse, panier, unité, tas |
| `VIV-FRT-008` | **Avocat** | kg, caisse, panier, unité, tas |
| `VIV-FRT-009` | **Goyave** | kg, caisse, panier, unité, tas |
| `VIV-FRT-010` | **Corossol** | kg, caisse, panier, unité, tas |
| `VIV-FRT-011` | **Pomme cannelle** | kg, caisse, panier, unité, tas |
| `VIV-FRT-012` | **Fruit de la passion** | kg, caisse, panier, unité, tas |
| `VIV-FRT-013` | **Carambole** | kg, caisse, panier, unité, tas |

## Condiments frais — 19 produits

### Aromates

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-CON-001` | **Gingembre frais** | kg, botte, tas, sachet |
| `VIV-CON-002` | **Curcuma frais** | kg, botte, tas, sachet |
| `VIV-CON-003` | **Basilic local** | kg, botte, tas, sachet |
| `VIV-CON-004` | **Menthe** | kg, botte, tas, sachet |
| `VIV-CON-005` | **Persil africain** | kg, botte, tas, sachet |
| `VIV-CON-006` | **Céleri feuille** | kg, botte, tas, sachet |

### Oignons et alliacées

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-OIG-001` | **Oignon violet** | kg, sac, filet, botte, tas |
| `VIV-OIG-002` | **Oignon blanc** | kg, sac, filet, botte, tas |
| `VIV-OIG-003` | **Oignon jaune** | kg, sac, filet, botte, tas |
| `VIV-OIG-004` | **Échalote** | kg, sac, filet, botte, tas |
| `VIV-OIG-005` | **Ail local** | kg, sac, filet, botte, tas |
| `VIV-OIG-006` | **Ail importé** | kg, sac, filet, botte, tas |
| `VIV-OIG-007` | **Poireau** | kg, sac, filet, botte, tas |
| `VIV-OIG-008` | **Ciboulette** | kg, sac, filet, botte, tas |

### Piments

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-PIM-001` | **Piment frais rouge** | kg, panier, bassine, tas, sachet |
| `VIV-PIM-002` | **Piment frais vert** | kg, panier, bassine, tas, sachet |
| `VIV-PIM-003` | **Piment antillais** | kg, panier, bassine, tas, sachet |
| `VIV-PIM-004` | **Piment bec d'oiseau** | kg, panier, bassine, tas, sachet |
| `VIV-PIM-005` | **Piment sec** | kg, panier, bassine, tas, sachet |

## Légumes — 19 produits

### Courges

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-COU-001` | **Courge locale** | kg, unité, tas |
| `VIV-COU-002` | **Potiron** | kg, unité, tas |
| `VIV-COU-003` | **Citrouille** | kg, unité, tas |
| `VIV-COU-004` | **Melon local** | kg, unité, tas |

### Légumes verts et divers

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-LEG-016` | **Chou vert** | kg, caisse, panier, botte, unité, tas |
| `VIV-LEG-017` | **Chou rouge** | kg, caisse, panier, botte, unité, tas |
| `VIV-LEG-018` | **Laitue** | kg, caisse, panier, botte, unité, tas |
| `VIV-LEG-019` | **Concombre** | kg, caisse, panier, botte, unité, tas |
| `VIV-LEG-020` | **Courgette** | kg, caisse, panier, botte, unité, tas |
| `VIV-LEG-021` | **Haricot vert** | kg, caisse, panier, botte, unité, tas |
| `VIV-LEG-022` | **Poivron vert** | kg, caisse, panier, botte, unité, tas |
| `VIV-LEG-023` | **Poivron rouge** | kg, caisse, panier, botte, unité, tas |
| `VIV-LEG-024` | **Poivron jaune** | kg, caisse, panier, botte, unité, tas |
| `VIV-LEG-025` | **Céleri** | kg, caisse, panier, botte, unité, tas |
| `VIV-LEG-026` | **Persil** | kg, caisse, panier, botte, unité, tas |
| `VIV-LEG-027` | **Carotte** | kg, caisse, panier, botte, unité, tas |
| `VIV-LEG-028` | **Betterave** | kg, caisse, panier, botte, unité, tas |
| `VIV-LEG-029` | **Navet** | kg, caisse, panier, botte, unité, tas |
| `VIV-LEG-030` | **Radis** | kg, caisse, panier, botte, unité, tas |

## Tubercules et racines — 16 produits

### Ignames

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-TUB-001` | **Igname Kponan** | kg, sac, tas, unité |
| `VIV-TUB-002` | **Igname Bêtê-Bêtê** | kg, sac, tas, unité |
| `VIV-TUB-003` | **Igname Florido** | kg, sac, tas, unité |
| `VIV-TUB-004` | **Igname Krenglè** | kg, sac, tas, unité |
| `VIV-TUB-005` | **Igname Lokpa** | kg, sac, tas, unité |
| `VIV-TUB-006` | **Igname Assawa** | kg, sac, tas, unité |
| `VIV-TUB-007` | **Igname C18** | kg, sac, tas, unité |
| `VIV-TUB-008` | **Igname Cameroun** | kg, sac, tas, unité |

### Manioc et autres racines

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-TUB-009` | **Manioc frais doux** | kg, sac, tas, unité |
| `VIV-TUB-010` | **Manioc frais amer** | kg, sac, tas, unité |
| `VIV-TUB-011` | **Patate douce blanche** | kg, sac, tas, unité |
| `VIV-TUB-012` | **Patate douce orange** | kg, sac, tas, unité |
| `VIV-TUB-013` | **Taro** | kg, sac, tas, unité |
| `VIV-TUB-014` | **Macabo** | kg, sac, tas, unité |
| `VIV-TUB-015` | **Pomme de terre blanche** | kg, sac, tas, unité |
| `VIV-TUB-016` | **Pomme de terre rouge** | kg, sac, tas, unité |

## Légumineuses — 15 produits

### Arachides et graines

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-LEG-009` | **Arachide en coque** | kg, sac, bassine, tas |
| `VIV-LEG-010` | **Arachide décortiquée** | kg, sac, bassine, tas |
| `VIV-LEG-011` | **Arachide grillée** | kg, sac, bassine, tas |
| `VIV-LEG-012` | **Sésame blanc** | kg, sac, bassine, tas |
| `VIV-LEG-013` | **Sésame noir** | kg, sac, bassine, tas |
| `VIV-LEG-014` | **Graines de courge** | kg, sac, bassine, tas |
| `VIV-LEG-015` | **Graines de melon** | kg, sac, bassine, tas |

### Haricots et pois

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-LEG-001` | **Niébé blanc** | kg, sac, demi-sac, quart-sac, tas |
| `VIV-LEG-002` | **Niébé rouge** | kg, sac, demi-sac, quart-sac, tas |
| `VIV-LEG-003` | **Haricot blanc** | kg, sac, demi-sac, quart-sac, tas |
| `VIV-LEG-004` | **Haricot rouge** | kg, sac, demi-sac, quart-sac, tas |
| `VIV-LEG-005` | **Haricot noir** | kg, sac, demi-sac, quart-sac, tas |
| `VIV-LEG-006` | **Haricot moucheté** | kg, sac, demi-sac, quart-sac, tas |
| `VIV-LEG-007` | **Pois de terre** | kg, sac, demi-sac, quart-sac, tas |
| `VIV-LEG-008` | **Soja** | kg, sac, demi-sac, quart-sac, tas |

## Légumes fruits — 14 produits

### Aubergines

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-AUB-001` | **Aubergine N'Drowa** | kg, panier, bassine, tas |
| `VIV-AUB-002` | **Aubergine africaine blanche** | kg, panier, bassine, tas |
| `VIV-AUB-003` | **Aubergine africaine verte** | kg, panier, bassine, tas |
| `VIV-AUB-004` | **Aubergine violette** | kg, panier, bassine, tas |
| `VIV-AUB-005` | **Aubergine longue** | kg, panier, bassine, tas |

### Gombo

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-GOM-001` | **Gombo frais petit** | kg, panier, bassine, tas, sachet |
| `VIV-GOM-002` | **Gombo frais gros** | kg, panier, bassine, tas, sachet |
| `VIV-GOM-003` | **Gombo sec** | kg, panier, bassine, tas, sachet |
| `VIV-GOM-004` | **Poudre de gombo** | kg, panier, bassine, tas, sachet |

### Tomates

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-TOM-001` | **Tomate locale ronde** | kg, caisse, panier, demi-panier, bassine, tas |
| `VIV-TOM-002` | **Tomate allongée** | kg, caisse, panier, demi-panier, bassine, tas |
| `VIV-TOM-003` | **Tomate salade** | kg, caisse, panier, demi-panier, bassine, tas |
| `VIV-TOM-004` | **Tomate cerise** | kg, caisse, panier, demi-panier, bassine, tas |
| `VIV-TOM-005` | **Tomate mûre transformation** | kg, caisse, panier, demi-panier, bassine, tas |

## Céréales — 12 produits

### Maïs et céréales locales

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-CER-007` | **Maïs blanc sec** | kg, sac, demi-sac, quart-sac, tas |
| `VIV-CER-008` | **Maïs jaune sec** | kg, sac, demi-sac, quart-sac, tas |
| `VIV-CER-009` | **Maïs frais en épi** | kg, sac, demi-sac, quart-sac, tas |
| `VIV-CER-010` | **Mil** | kg, sac, demi-sac, quart-sac, tas |
| `VIV-CER-011` | **Sorgho** | kg, sac, demi-sac, quart-sac, tas |
| `VIV-CER-012` | **Fonio** | kg, sac, demi-sac, quart-sac, tas |

### Riz

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-CER-001` | **Riz local blanc** | kg, sac, demi-sac, quart-sac |
| `VIV-CER-002` | **Riz local étuvé** | kg, sac, demi-sac, quart-sac |
| `VIV-CER-003` | **Riz importé long grain** | kg, sac, demi-sac, quart-sac |
| `VIV-CER-004` | **Riz importé brisé** | kg, sac, demi-sac, quart-sac |
| `VIV-CER-005` | **Riz parfumé** | kg, sac, demi-sac, quart-sac |
| `VIV-CER-006` | **Riz paddy** | kg, sac, demi-sac, quart-sac |

## Produits transformés — 12 produits

### Arachide transformée

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-ARA-001` | **Pâte d'arachide** | kg, pot, sachet, litre, bouteille |
| `VIV-ARA-002` | **Poudre d'arachide** | kg, pot, sachet, litre, bouteille |
| `VIV-ARA-003` | **Arachide grillée salée** | kg, pot, sachet, litre, bouteille |
| `VIV-ARA-004` | **Huile artisanale d'arachide** | kg, pot, sachet, litre, bouteille |

### Farines et semoules

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-TRF-001` | **Farine de maïs blanche** | kg, sac, sachet |
| `VIV-TRF-002` | **Farine de maïs jaune** | kg, sac, sachet |
| `VIV-TRF-003` | **Semoule de maïs** | kg, sac, sachet |
| `VIV-TRF-004` | **Farine de mil** | kg, sac, sachet |
| `VIV-TRF-005` | **Farine de sorgho** | kg, sac, sachet |
| `VIV-TRF-006` | **Farine de fonio** | kg, sac, sachet |
| `VIV-TRF-007` | **Farine de manioc** | kg, sac, sachet |
| `VIV-TRF-008` | **Farine d'igname** | kg, sac, sachet |

## Légumes feuilles — 11 produits

### Feuilles locales

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-FEU-001` | **Épinard local** | kg, botte, tas, sachet |
| `VIV-FEU-002` | **Amarante** | kg, botte, tas, sachet |
| `VIV-FEU-003` | **Kplala / corète potagère** | kg, botte, tas, sachet |
| `VIV-FEU-004` | **Feuille de manioc** | kg, botte, tas, sachet |
| `VIV-FEU-005` | **Feuille de patate douce** | kg, botte, tas, sachet |
| `VIV-FEU-006` | **Feuille de taro** | kg, botte, tas, sachet |
| `VIV-FEU-007` | **Feuille d'aubergine** | kg, botte, tas, sachet |
| `VIV-FEU-008` | **Feuille de baobab** | kg, botte, tas, sachet |
| `VIV-FEU-009` | **Dah** | kg, botte, tas, sachet |
| `VIV-FEU-010` | **Oseille** | kg, botte, tas, sachet |
| `VIV-FEU-011` | **Feuille de bissap** | kg, botte, tas, sachet |

## Épices et condiments secs — 10 produits

### Épices

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-EPI-001` | **Poivre noir** | kg, sachet, tas |
| `VIV-EPI-002` | **Poivre blanc** | kg, sachet, tas |
| `VIV-EPI-003` | **Clou de girofle** | kg, sachet, tas |
| `VIV-EPI-004` | **Cannelle** | kg, sachet, tas |
| `VIV-EPI-005` | **Muscade** | kg, sachet, tas |
| `VIV-EPI-006` | **Anis** | kg, sachet, tas |
| `VIV-EPI-007` | **Laurier** | kg, sachet, tas |
| `VIV-EPI-008` | **Akpi / djansang** | kg, sachet, tas |
| `VIV-EPI-009` | **Soumbara** | kg, sachet, tas |
| `VIV-EPI-010` | **Graines de selim / kili** | kg, sachet, tas |

## Produits transformés du manioc — 9 produits

### Attiéké et dérivés

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-MAN-001` | **Attiéké frais** | kg, sac, bassine, sachet, tas |
| `VIV-MAN-002` | **Attiéké déshydraté** | kg, sac, bassine, sachet, tas |
| `VIV-MAN-003` | **Attiéké type garba** | kg, sac, bassine, sachet, tas |
| `VIV-MAN-004` | **Gari blanc** | kg, sac, bassine, sachet, tas |
| `VIV-MAN-005` | **Gari jaune** | kg, sac, bassine, sachet, tas |
| `VIV-MAN-006` | **Placali frais** | kg, sac, bassine, sachet, tas |
| `VIV-MAN-007` | **Pâte de manioc** | kg, sac, bassine, sachet, tas |
| `VIV-MAN-008` | **Amidon de manioc** | kg, sac, bassine, sachet, tas |
| `VIV-MAN-009` | **Semoule de manioc** | kg, sac, bassine, sachet, tas |

## Bananes — 8 produits

### Banane dessert

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-BAN-006` | **Banane douce locale** | kg, régime, main, unité |
| `VIV-BAN-007` | **Banane dessert Cavendish** | kg, régime, main, unité |
| `VIV-BAN-008` | **Banane petite douce** | kg, régime, main, unité |

### Plantain

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-BAN-001` | **Banane plantain verte** | kg, régime, main, unité, tas |
| `VIV-BAN-002` | **Banane plantain mûre** | kg, régime, main, unité, tas |
| `VIV-BAN-003` | **Plantain Corne 1** | kg, régime, main, unité, tas |
| `VIV-BAN-004` | **Plantain Corne 2** | kg, régime, main, unité, tas |
| `VIV-BAN-005` | **Plantain Agnrin** | kg, régime, main, unité, tas |

## Produits séchés — 7 produits

### Produits vivriers séchés

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-SEC-001` | **Tomate séchée** | kg, sac, sachet |
| `VIV-SEC-002` | **Champignon séché** | kg, sac, sachet |
| `VIV-SEC-003` | **Feuilles séchées** | kg, sac, sachet |
| `VIV-SEC-004` | **Manioc séché** | kg, sac, sachet |
| `VIV-SEC-005` | **Cossettes de manioc** | kg, sac, sachet |
| `VIV-SEC-006` | **Piment séché moulu** | kg, sac, sachet |
| `VIV-SEC-007` | **Gombo séché moulu** | kg, sac, sachet |

## Palmier et coco — 5 produits

### Palmier / coco

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-PAL-001` | **Noix de coco fraîche** | kg, sac, régime, unité, tas |
| `VIV-PAL-002` | **Noix de coco sèche** | kg, sac, régime, unité, tas |
| `VIV-PAL-003` | **Chair de coco** | kg, sac, régime, unité, tas |
| `VIV-PAL-004` | **Graine de palme** | kg, sac, régime, unité, tas |
| `VIV-PAL-005` | **Noix de palme** | kg, sac, régime, unité, tas |

## Huiles alimentaires — 5 produits

### Huiles

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-HUI-001` | **Huile de palme rouge** | litre, bidon, bouteille |
| `VIV-HUI-002` | **Huile de palme raffinée** | litre, bidon, bouteille |
| `VIV-HUI-003` | **Huile d'arachide** | litre, bidon, bouteille |
| `VIV-HUI-004` | **Huile de soja** | litre, bidon, bouteille |
| `VIV-HUI-005` | **Huile végétale** | litre, bidon, bouteille |

## Champignons — 3 produits

### Champignons

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-CHA-001` | **Champignon local frais** | kg, barquette, sachet |
| `VIV-CHA-002` | **Pleurote frais** | kg, barquette, sachet |
| `VIV-CHA-003` | **Champignon séché** | kg, barquette, sachet |

## Noix et graines — 3 produits

### Noix

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-NOI-001` | **Noix de cajou brute** | kg, sac, sachet |
| `VIV-NOI-002` | **Noix de cajou décortiquée** | kg, sac, sachet |
| `VIV-NOI-003` | **Noix de cajou grillée** | kg, sac, sachet |

## Produits complémentaires — 2 produits

### Canne et miel

| Référence | Nom exact à saisir | Unités du marché |
|---|---|---|
| `VIV-CAN-001` | **Canne à sucre** | unité, botte, litre, pot |
| `VIV-CAN-002` | **Miel local** | unité, botte, litre, pot |

---

**198 produits**, 18 familles. Tous vendus au détail.
