# STK-03 — matrice des 37 tuiles face aux 198 références maître

Mesure du 23/09/2026, arbre `fd10e47`. **Aucune modification fonctionnelle.**
Rejouable : `python3 scripts/inventaire/stk03-matrice-tuiles.py`

Sources : `frontend_src/src/app/data/catalogue-produits.ts` (37 tuiles) et
`docs/data/catalogue-maitre-julaba.v1.json` (198 références, 18 familles,
30 sous-familles).

**Méthode, et sa limite.** Une tuile « couvre » une référence si tous ses mots
apparaissent comme suite contiguë dans le nom de la référence, accents et casse
neutralisés. **Aucun synonyme n'est deviné** : on ne rapproche jamais deux noms
que le référentiel n'a pas rapprochés lui-même. C'est volontairement bête —
une règle qui devine est une règle qui invente, et l'arbitrage interdit
d'inventer une variété.

---

## 1. Le compte

| | Tuiles | Ce que ça veut dire |
|---|---:|---|
| **AMBIGUËS** | **21** | ≥ 2 références maître derrière → **porte de famille**, jamais ligne vendable |
| **NON AMBIGUËS** | **8** | 1 seule référence → peut rester en un toucher |
| **ORPHELINES** | **7** | **aucune** référence maître ne porte ce nom |
| Repli | 1 | « Autre » |

**Réponse à la question 3 : 8 tuiles sur 37 sont réellement vendables
directement.** Les 7 orphelines ne le sont pas non plus au sens de la règle —
elles n'ont pas d'identité maître, donc pas d'identité exacte.

**Couverture :** 103 / 198 références atteintes ; **95 références qu'aucune
tuile n'atteint**. 14 familles sur 18 touchées.

---

## 2. Les 21 tuiles ambiguës — portes de famille

| Tuile | Réf. | Sous-familles derrière |
|---|---:|---|
| Manioc | 9 | Manioc et autres racines, Feuilles, Attiéké, Farines, Séchés |
| Igname | 9 | Ignames, Farines |
| Arachide | 8 | Arachides et graines, Arachide transformée, Huiles |
| Riz | 6 | Riz |
| Tomate | 6 | Tomates, Séchés |
| Aubergine | 6 | Aubergines, Feuilles |
| Piment | 6 | Piments, Séchés |
| Maïs | 6 | Maïs et céréales locales, Farines |
| Gombo | 5 | Gombo, Séchés |
| Banane | 5 | Banane dessert, Plantain |
| Plantain | 5 | Plantain |
| Haricot | 5 | Haricots et pois, Légumes verts |
| Oignon | 3 | Oignons et alliacées |
| Mangue | 3 | Fruits tropicaux |
| Patate douce | 3 | Manioc et autres racines, Feuilles |
| Orange | 3 | Agrumes (+1 faux rapprochement, voir §5) |
| Huile de palme | 2 | Huiles |
| Chou | 2 | Légumes verts |
| Pomme de terre | 2 | Manioc et autres racines |
| Citron | 2 | Agrumes |
| Noix de coco | 2 | Palmier / coco |

**L'exemple imposé par l'arbitrage se vérifie** : `Igname` →
VIV-TUB-001 **Kponan**, -002 **Bêtê-Bêtê**, -003 **Florido**, -004 **Krenglè**,
-005 Lokpa, -006 Assawa, +3 autres (dont `VIV-TRF-008 Farine d'igname`).
**Six variétés, pas quatre.** L'aide-mémoire terrain n'en nommait que quatre.

---

## 3. Les 8 non ambiguës — vendables en un toucher

| Tuile | Référence | Sous-famille |
|---|---|---|
| Avocat | VIV-FRT-008 | Fruits tropicaux |
| Ananas | VIV-FRT-005 | Fruits tropicaux |
| Papaye | VIV-FRT-004 | Fruits tropicaux |
| Pastèque | VIV-FRT-006 | Fruits tropicaux |
| Carotte | VIV-LEG-027 | Légumes verts et divers |
| Concombre | VIV-LEG-019 | Légumes verts et divers |
| Courgette | VIV-LEG-020 | Légumes verts et divers |
| Laitue | VIV-LEG-018 | Légumes verts et divers |

Contre-vérifié en listant **tout** le voisinage de leurs sous-familles : le
référentiel ne porte aucune variété pour ces huit.

**Mais « non ambiguë » est un état du RÉFÉRENTIEL, pas une propriété du
produit.** Le jour où Odoo gagne « Avocat Hass », la tuile redevient une porte
de famille. **L'ambiguïté doit donc être CALCULÉE à la lecture du catalogue,
jamais écrite en dur dans l'écran** — sinon on recrée le défaut qu'on ferme.

---

## 4. Les 7 orphelines — un trou qui demande ton arbitrage

`Brocoli` · `Fraise` · `Café` · `Poisson` · `Poulet` · `Œuf` · `Pain`

Aucune référence maître ne porte ces noms. Le catalogue maître est **vivrier** ;
ces sept sortent de son périmètre (protéines, boulangerie, ou espèces absentes).

Elles sont vendables aujourd'hui. La règle dit « identité exacte = catalogue
maître » : appliquée telle quelle, ces sept **perdent leur identité**.
**Question ouverte, je ne tranche pas : sortir ces tuiles, ou étendre le
référentiel hors vivrier ?** Les supprimer sans décision ferait disparaître
sept produits que des marchandes vendent réellement.

---

## 5. Contrôle de mon propre appariement

**3 références sont atteintes par DEUX tuiles** — deux portes vers le même
produit, ce qui est déjà le défaut de STK-03 en miniature :

| Référence | Tuiles |
|---|---|
| VIV-BAN-001 Banane plantain verte | **Banane**, **Plantain** |
| VIV-BAN-002 Banane plantain mûre | **Banane**, **Plantain** |
| VIV-TUB-012 Patate douce orange | Patate douce, **Orange** ← faux rapprochement (couleur) |

**17 rapprochements où le mot de la tuile n'est pas le produit de la
référence** — feuille, farine, pâte, poudre, huile, séché. Exemples :
« Aubergine » ← *Feuille d'aubergine* ; « Maïs » ← *Farine de maïs* ;
« Arachide » ← *Huile d'arachide* ; « Manioc » ← *Amidon de manioc*.

Aucun ne change un classement (ces tuiles sont ambiguës de toute façon), et
« Orange » reste ambiguë même sans son faux rapprochement (2 agrumes). **Mais
ils disent qu'une famille d'écran ne peut pas être dérivée du NOM : elle doit
venir de `famille` / `sous_famille`, que le référentiel porte déjà.**

---

## 6. Familles maître jamais atteintes

| Famille | Produits |
|---|---:|
| Épices et condiments secs | 10 |
| Champignons | 3 |
| Noix et graines | 3 |
| Produits complémentaires | 2 |

18 produits invisibles, faute de toute porte.

---

## 7. Ce que la mesure dit du travail à faire

1. **21 tuiles sur 37 doivent cesser d'être vendables** et devenir des portes.
2. **8 seulement peuvent rester en un toucher** — et ce statut doit être
   recalculé, pas figé.
3. **7 sont hors référentiel** et attendent ton arbitrage avant toute action.
4. **Banane / Plantain se recouvrent** : à trancher en même temps.
5. Le regroupement doit lire `famille` / `sous_famille` du référentiel, **jamais
   le nom de la tuile**.

**Rien n'est décidé ici, et rien n'est modifié.** Prochaine étape seulement
après arbitrage sur le point 3.
