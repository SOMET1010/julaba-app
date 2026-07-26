# ADR-001 — Une seule source de vérité pour l'argent : un journal, des vues dérivées

- **Statut :** proposé
- **Date :** 2026-07-26
- **Portée :** module sacré « Argent » (caisse, ventes, dépenses, crédits, marge, bénéfice)

## Contexte

L'argent de Jùlaba était calculé à **au moins trois endroits indépendants** qui
se contredisaient pour la même journée :

- `getTodayStats` (écran d'accueil),
- `getFinancialSummary` (Résumé caisse),
- `CaisseContext.stats` (autres écrans).

De plus, certains mouvements d'argent réels **n'existaient pas comme données** :
l'acompte et les remboursements de crédits vivaient dans la table `credits`, pas
comme mouvements de caisse — donc invisibles pour les écrans qui lisaient les
transactions. Résultat : des chiffres faux, contradictoires, et une confiance
détruite. C'est exactement le type de défaut que la Constitution (principes 2 et
7) interdit.

Par ailleurs, Jùlaba évolue de « une caisse » vers « une intelligence
financière ». Dans ce cadre, **la donnée d'argent est le produit** : elle doit
être exacte, complète et unique.

## Décision

1. **Tout mouvement d'argent est un événement immuable dans un journal
   append-only** (`caisse_transactions` joue ce rôle). On n'édite pas un
   mouvement passé : on en ajoute un nouveau (correction, remboursement, etc.).
2. **Chaque type de mouvement est explicite** (`vente`, `depense`,
   `encaissement_credit`, …) et ne peut être compté que par les vues qui le
   revendiquent — pas de double-comptage possible.
3. **Toutes les vues d'argent sont DÉRIVÉES du journal** : caisse, ventes,
   dépenses, marge, bénéfice, résumés 7/30 jours. **Aucune vue ne stocke ni ne
   recalcule l'argent en parallèle.** Une seule fonction par grandeur, réutilisée
   partout.
4. **Le volume (ce qu'elle a vendu) et le cash (ce qu'elle a reçu) sont deux
   grandeurs distinctes et nommées** (Convention A) : une vente à crédit compte
   en volume, mais seul l'argent réellement encaissé entre en caisse.
5. **La vraie marge vient du coût d'achat** (`prix vente − prix achat`, déjà
   calculée côté serveur), jamais de `ventes − dépenses`.

## Conséquences

- Un seul chemin pour l'argent ; les écrans ne peuvent plus se contredire (ils
  lisent la même dérivation).
- Toute nouvelle « manière de gagner/dépenser » = un **nouveau type de mouvement**
  dans le journal, pas un calcul ad hoc dans un écran.
- Rend possible l'**invariante fondamentale**, vérifiable en continu :
  > `caisse == fond_initial + Σ(mouvements du journal du jour)`
- Un futur besoin de « nouveau calcul de caisse » est **interdit par défaut** :
  il faut un ADR qui remplace celui-ci, pas un second calcul à côté.

## Ce qui a déjà été fait dans cette direction

- `encaissement_credit` : l'acompte et les remboursements sont devenus de vrais
  mouvements de caisse (avec backfill de l'historique).
- Accueil, Résumé caisse et stats unifiés sur les mêmes fonctions dérivées.
- Marge/bénéfice branchés sur la vraie marge serveur, plus sur `ventes − dépenses`.

## Reste à faire pour être pleinement conforme

- Extraire les grandeurs d'argent dans **un seul module** dérivé du journal
  (supprimer les calculs résiduels dans `CaisseContext`).
- Écrire l'**invariante** `caisse == fond + Σ mouvements` comme test/garde-fou.
- Couvrir les vues multi-jours par le journal (et non par des données partielles
  chargées côté client).
