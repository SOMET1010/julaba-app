# AUDIT — CATALOGUE PRODUITS : LE MARCHAND PEUT-IL VENDRE HORS LISTE ?

| | |
|---|---|
| date | 19/10/2026 |
| déclencheur | Patrick : « C'est pas normal d'avoir un catalogue pré-enregistré, c'est comme si on limitait l'ajout uniquement à cette liste. Le marchand doit pouvoir ajouter ses produits sans aucun catalogue prédéfini. » |
| périmètre | front `marchand/*`, `contexts/CaisseContext`, `services/{premierProduit,produitDit,prixDeLaMarchande}`, `data/catalogue-produits.ts` ; back `caisse-rest`, `catalogue-maitre`, `commun/produit-saisi.ts`, `commun/reconciliation-stock.ts` |
| base | dev@821cc12 |
| verdict | **NON CONFORME sur le chemin TACTILE de la caisse — CONFORME partout ailleurs. Corrigé dans le même lot (3 commits front, 0 back : le back était déjà libre).** |

---

## 1. Les quatre catalogues — qui contraint, qui suggère

| Catalogue | Où | Nature | Contraint le marchand ? |
|---|---|---|---|
| `CATALOGUE_PRODUITS` (37+ entrées) | `data/catalogue-produits.ts:28-72` | front, statique, prix inventés | **NON depuis STK-03** — ne sert plus qu'aux images (`getImageByNom:74`) et suggestions (`suggererProduits:121`) |
| `catalogue_maitre` (miroir Odoo) | back `catalogue-maitre/catalogue-maitre.service.ts:73-107` | référentiel synchronisé | **OUI, côté caisse tactile** (adoption obligatoire pour un produit réel nommé) |
| `produits` (sa boutique) | back `POST /caisse/produits` | sa vraie liste | **libre** : nom quelconque accepté |
| lignes `libre-*` | front, synthétiques | non persistées | ne créent RIEN |

## 2. Ce qui est DÉJÀ conforme (vérifié de première main)

1. **Création guidée (stock)** — `AjoutProduitGuide` : trois questions (nom libre → unité → prix), zéro lecture du catalogue. Preuves : `services/premierProduit.ts` (STK-03), monté dans `SaisieGuidee.tsx:188` et `GestionStock.tsx:464` ; l'ancien formulaire `addStockItem` a été supprimé (`GestionStock.tsx:440-455`).
2. **Backend** — `POST /caisse/produits` n'consulte AUCUN catalogue : `caisse-rest.controller.ts:1036-1044` insère `nomDeProduitSaisi(body.nom)` tel quel ; seule règle : ≥ 2 lettres (`commun/produit-saisi.ts:25,31-39`).
3. **Dictée caisse** — produit inconnu → ligne libre au panier (`MicroVenteCaisse.tsx:218-219`), puis « J'ajoute "X" à ta boutique à N F ? » → `accepterCreation` crée un VRAI produit au nom libre via `addProduct` (`MicroVenteCaisse.tsx:728-744`).
4. **Besoin marchand** — texte libre, catalogue en suggestions seulement (`BesoinMarchand.tsx:87-100`).
5. **Le back reconnaît l'article libre** — `TYPE_SANS_CATALOGUE = 'sans_catalogue'` (`commun/reconciliation-stock.ts:46-47`).

## 3. Constats NON conformes (le mur est dans POSCaisse, chemin tactile)

### C-A1 — BLOQUANT : l'auto-adoption du catalogue maître est IMPOSÉE
`POSCaisse.tsx:282-284` : si une référence du catalogue maître porte le nom dicté, le code la choisit pour elle (« on la choisit pour elle ») et la carte affichée ne propose QUE « Changer » (`POSCaisse.tsx:1612-1620`) — qui rouvre… la recherche dans le même catalogue. **La marchande ne peut pas créer son propre produit homonyme, ni sortir de la liste.**

### C-A2 — BLOQUANT : sans référence, seule la ligne synthétique existe
Feuille « Autre article » : bouton final `onClick={refChoisie ? adopterReference : ajouterMontantLibre}` (`POSCaisse.tsx:1816`). `ajouterMontantLibre` (`POSCaisse.tsx:385-401`) fabrique `id: libre-<ts>`, `prix_achat: 0`, `categorie: 'Autre'`, stock non touché — **jamais persisté dans `produits`** : invisible dans Mon stock, marge fausse (0 F d'achat), impossible à retrouver demain. Pendant que la DICTÉE crée un vrai produit (cf. §2.3), le TACTILE refuse.

### C-A3 — MAJEUR : la recherche de références n'a pas de sortie « créer »
`POSCaisse.tsx:1556-1590` : résultats du seul catalogue maître ; zéro résultat → « Tu peux quand même vendre un montant libre ci-dessous » (`1559-1563`). Aucun moment ne propose « créer « ce que j'ai tapé » comme produit ».

### C-C1 — MINEUR (dette assumée) : prix par défaut du catalogue statique
`data/catalogue-produits.ts` porte encore `prixAchat/prixVente` inventés. Arbitrage documenté (test `prixDeLaMarchande.test.mts:135-138` : « ordre de grandeur ») — NE PAS vider sans décision Patrick. Classé dette, non corrigé ici.

## 4. Correctifs appliqués (POSCaisse.tsx uniquement — le back était déjà libre)

| # | Correctif | Preuve après commit |
|---|---|---|
| F1 | `creerProduitDepuisFeuille()` : création d'un VRAI produit au nom saisi via `addProduct` (même sémantique que la dictée), garde anti-doublon étal (n'apparie jamais en silence — si le produit existe déjà, c'est LUI qui part au panier au prix dit), voix `TATA_PRODUIT_AJOUTE_BOUTIQUE` | POSCaisse.tsx `creerProduitDepuisFeuille` |
| F2 | Bouton final à trois états : référence choisie → « Ajouter à mon catalogue » (adoption, inchangé) ; nom saisi → « **Ajouter à ma boutique** » (création réelle) ; sans nom → « Ajouter » (montant libre, inchangé) | POSCaisse.tsx bouton final |
| F3 | Carte de référence choisie : second geste « **Non — je crée mon produit** » qui rend la main et garde le nom pré-rempli | POSCaisse.tsx carte refChoisie |
| F4 | Recherche de références : ligne permanente « **Créer « X » comme nouveau produit** » (X = ce qu'elle a tapé), disponible qu'il y ait des résultats ou non ; message « Rien trouvé » corrigé en conséquence | POSCaisse.tsx bloc recherche |

Règle respectée : le catalogue maître devient une SUGGESTION, jamais une porte à sens unique. `ajouterMontantLibre` reste pour la vente ponctuelle sans nom.

## 5. Recette (à refaire sur stack locale / APK)

1. Caisse → dire « cinq attiékés » (hors catalogue) → feuille pré-remplie → prix → « Ajouter à ma boutique » → le produit EXISTE dans Mon stock, la ligne est au panier.
2. Dire « tomate » (référence maître existe) → carte suggérée → « Non — je crée mon produit » → nom conservé → prix → création réelle.
3. Recherche « atti » → 0 résultat → « Créer "atti" comme nouveau produit ».
4. Sans nom tapé → « Ajouter » → montant libre (inchangé).
5. Dictée produit inconnu → proposition « J'ajoute à ta boutique ? » → Oui → produit réel (déjà conforme, régression-check).

## 6. Tests / gates passés

- `tsc -b` front ✅ (post-correctif)
- Tests unitaires liés relancés : `test:ventes-bo` etc. requièrent un back vivant → recette §5 sur stack locale.

## 7. Ce que cet audit NE tranche PAS (à décider Patrick)

- Vider les prix du catalogue statique (`data/catalogue-produits.ts`) — dette C-C1.
- Brancher la recherche de références sur l'usage réel (combien d'adoptions depuis le pilote ?) — si l'adoption n'est jamais utilisée, le catalogue maître peut devenir optionnel au chargement de la caisse.
