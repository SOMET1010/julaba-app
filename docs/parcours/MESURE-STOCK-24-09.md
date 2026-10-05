# Mesure de l'écran du stock — 24/09

**Ce document est une MESURE, pas un lot de correctifs.** Aucune de ces dettes
n'est fermée. Elles sont nommées pour qu'on cesse de les redécouvrir.

**Ce que j'ai vérifié de ma main** : STK-05 seulement (exécution de `intentLocal`
et recensement des producteurs de `ajouter_stock`). Le reste vient d'une mesure
en lecture seule menée par un agent dédié : les preuves sont statiques
(fichier + ligne), **non revérifiées une à une**. Traiter en conséquence :
prouver avant de corriger.

## Ce qui coûte le plus cher à une marchande, dans l'ordre

| Id | Défaut | Vérifié par moi |
|---|---|---|
| **STK-05** | **Le gros bouton « Ajouter en parlant » dicte une phrase que rien ne comprend.** | **OUI** |
| STK-14 | L'écran affirme « Aucun produit » et cinq zéros sans avoir rien pu lire. | non |
| STK-06 | Deux routes écrivent la même ligne produit avec deux règles opposées sur « la case vidée ». | non |
| STK-09 | Le produit qu'elle vient de poser lui revient « ✕ Rupture », en rouge, avec vibration. | non |
| STK-08 | Les montants partent à la voix avec l'espace fine U+202F → « 2 zéro zéro zéro ». | cause OUI |
| STK-12 / STK-11 | Le réappro s'annonce avant la réponse du serveur ; le chiffre bouge même sur échec. | non |
| STK-13 | Sur les mouvements, `[]` veut dire « aucune vente » **et** « je n'ai pas pu lire ». | non |
| STK-10 | « Pas noté » est re-deviné par l'écran (catégorie, seuil, prix d'achat), puis gravé en base. | non |
| STK-16 | Le micro de la recherche promet une recherche vocale qui n'existe pas. | non |
| STK-04 | Les réapprovisionnements manuels n'entrent dans aucun registre. | déclaré dans le code |
| STK-17 | Deux produits de même nom n'en font qu'un : la caisse et le stock ne disent pas le même nombre. | non |
| STK-15 | L'écran du stock ne dit rien quand il s'ouvre. | non |
| STK-18 | « Écrire » : un verbe d'écriture pour une non-lectrice. Le même geste a trois noms. | arbitrage Patrick |
| STK-19 | Résidus morts du retrait de STK-03c. | non |

## STK-05 — le seul que j'ai prouvé moi-même

L'écran imprime la phrase sur son propre bouton (`GestionStock.tsx:709-719`) :

> `dis : « ajoute 10 piments à 500 »`

Exécution de la règle pure :

```
intentLocal("ajoute 10 piments à 500")    -> null
intentLocal("ajoute dix kilos de tomate") -> null
intentLocal("valeur du stock")            -> null
```

Recensement de `ajouter_stock` dans tout le dépôt — **4 occurrences, toutes
consommatrices, aucun producteur** :

```
GestionStock.tsx:366        if (a.type === 'ajouter_stock' || ...)
MicroVenteCaisse.tsx:364    } else if (action?.type === 'ajouter_stock' || ...)
tataMarchandActions.ts:69   if (action.type === 'ajouter_stock') {
tataMarchandActions.test.mts:44   (donnée de test)
```

`intentLocal` ne fabrique que `vendre` et `depense`. Le mot « ajoute » est même
dans `MOTS_PAS_UNE_VENTE` : il **ferme** une porte, il n'en ouvre aucune.

**Conséquence.** Elle dit exactement ce que l'écran lui dicte, et reçoit « Je
n'ai pas bien compris. Redis-moi ça autrement. » Ce n'est pas un bouton muet :
c'est un bouton qui lui donne tort. Et tout le correctif STK-02c — « ne jamais
annoncer un prix qu'elle n'a pas dit » — vit dans ce bloc inatteignable.

C'est le **#7 du retour terrain**, confirmé, et plus grave que signalé.

**À DÉFINIR** — existe-t-il un service de compréhension hors dépôt qui
renverrait `ajouter_stock` ? Si non, le bloc est mort de bout en bout.

## STK-08 — ce que la mesure change au retour terrain « 2 zéro zéro zéro »

La cause est confirmée : `(2000).toLocaleString('fr-FR')` rend `2` + **U+202F**
+ `000`, et aucune couche ne la retire avant le moteur de voix.

**Mais la règle existe déjà** — `i18n/voice/argent/deuxFormes.ts` : `formeEcran`
garde l'espace fine pour l'œil, `formeParlee` / `nombreEnMotsFr` disent « deux
mille » en toutes lettres. HIS-01b est fermée. Le défaut n'est donc pas qu'il
manque une règle : **c'est que des écrans parlent sans passer par le catalogue
i18n qui l'applique.** Écrire une seconde règle serait une seconde naissance.

Et sur le stock, les deux appels de `GestionStock` (l.408 et l.423) sont **sur
le chemin mort de STK-05** : ils ne sonnent pas aujourd'hui. Le chemin vivant
est ailleurs — `services/margeVente.ts:101` → `VentesPassees.tsx:140`, c'est-à-
dire **la marge, dite à voix haute, avec deux montants épelés**.

**À DÉFINIR** — sur quel écran le testeur a-t-il entendu « 2 zéro zéro zéro » ?

## Ce que la mesure a cherché et N'A PAS trouvé

Pour ne pas refaire le travail :

1. **Aucune seconde naissance de produit survivante.** `addStockItem` a bien
   disparu. La seule création hors `AjoutProduitGuide` passe par la même
   primitive `useCaisse().addProduct`.
2. **Aucun micro décoratif.** VOX-03b est corrigé ; les deux `Mic` de
   `GestionStock` sont dans de vrais `<button onClick>`. Le défaut y est
   l'inverse : les boutons sont cliquables, c'est le moteur qui ne répond pas.
3. **Aucune injection de prix du catalogue.** STK-02 / STK-03a tiennent.
4. **Aucun emprunt d'unité sur un mouvement passé.** ARG-02 tient de bout en bout.
5. **La modale « Valeur du stock » est honnête** : elle refuse d'afficher marge
   et ROI tant qu'un produit en stock n'a pas de coût. Bon modèle à recopier.

## La mesure qui manque

Le banc terrain n'a jamais vu le cœur de cet écran : il tourne **catalogue
vide** et son relevé est **tronqué à 8 éléments**. Fiche produit, modification,
réappro et mouvements — tout ce qui touche à l'argent ici — n'ont jamais été
mesurés une seule fois. `"impasses": []` sur cet écran ne prouve donc rien.
