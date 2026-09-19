# HYGIÈNE-1 — Axe 4 : typage des données métier critiques

**Cible retenue (règle de Patrick) :** les frontières où transitent **argent,
identité, produit, quantité, stock, session et opération hors-ligne**. Pas
« zéro `any` ».

## Ce qui a déclenché cet axe

Pas un principe : un incident de l'axe 3. Renommer le champ du bénéfice aurait
dû faire échouer la compilation de l'écran « Mes ventes », qui le lisait. Elle
n'a rien vu — la vente y était typée `any`. **La marge affichée serait tombée à
zéro sur toutes les ventes, en silence**, jusqu'à ce qu'une marchande le
remarque et n'en dise rien.

`any` sur l'argent, ce n'est pas une facilité d'écriture : c'est la garantie
qu'une erreur d'argent passera la compilation.

## Ce qui a été écrit

`types/vente.ts` — les formes de données de la caisse, déclarées une fois :
`LigneDeVente`, `VenteServeur`, `ProduitServeur`, `SessionCaisseServeur`,
`CreditServeur`, `StockServeur`, `AliasSaisieProduit`.

Et `PayloadOperation` dans `voice-offline/offlineCaisse.ts` : **la donnée la
plus exposée de l'application**. Elle est écrite sur le téléphone, survit à une
coupure, à une fermeture de l'application, parfois à une mise à jour — puis
repart vers le serveur sans que personne ne la relise. Elle était `any`.

## Ce que le typage a révélé (et que ce lot ne corrige PAS)

La règle est nette : *aucun changement observable par la marchande*. Le typage a
mis au jour cinq trous. Les corriger changerait un écran. Ils sont donc
**nommés, commentés dans le code, et laissés en l'état** :

| Trou | Ce qui se passe aujourd'hui | Pourquoi non corrigé ici |
|---|---|---|
| Le serveur peut omettre l'`id` d'un produit | L'article entre dans la caisse ; la vente partira ensuite sans produit | L'écarter le ferait DISPARAÎTRE de sa caisse |
| …et son `nom` | Idem | Idem |
| Le serveur peut omettre le montant d'un crédit | Le crédit s'affiche sans montant restant | L'écarter ferait disparaître de l'argent de l'écran ; mettre 0 dirait « elle ne doit plus rien » |
| Le serveur peut omettre `ouvert` sur la journée de caisse | La journée est « ni ouverte ni fermée » | Lui donner une valeur changerait l'état visible de la caisse au démarrage |
| Le serveur peut omettre l'`id` d'une transaction | L'annulation self-service ne s'affiche pas sur cette vente | Idem |

Ces cinq-là sont le vrai produit de l'axe 4 : **des défauts qu'aucun outil ne
pouvait voir tant que la donnée était `any`**. Ils forment le dossier d'un
chantier fonctionnel séparé, pas une rallonge de HYGIÈNE-1.

## Les casts supprimés, et ce qu'ils cachaient

- **Quatre `(transaction as any)` sur l'ÉCRITURE d'une vente** — alors que
  `category`, `montant` et `source` étaient **déjà déclarés** sur `Transaction`.
  Seul `produits` manquait. C'est ce genre de cast qui avait laissé `source` ne
  jamais partir au serveur : le compilateur ne pouvait rien en dire.
- **~20 `(product as any)` / `(updates as any)` / `(data as any)`** sur les
  alias de saisie (`prixAchat`, `purchasePrice`, `seuilAlerte`, `threshold`,
  `datePeremption`, `prixPromo`…), **tous sur des champs d'argent**. Ils sont
  désormais déclarés dans `AliasSaisieProduit` : ça ne les approuve pas, ça les
  rend visibles et comptables. Les réduire à une seule orthographe demande de
  toucher aux formulaires — hors mandat.
- **`CaisseTransaction.montant` était déclaré `number`** alors que tous les
  appelants faisaient déjà `parseFloat` : la colonne `decimal` de Postgres
  arrive en chaîne. Le type mentait, le code avait raison.
- **`CaisseTransaction.statut`** (l'annulation self-service) était lu sans être
  déclaré.

## Le cas `Transaction.type`

Le serveur écrit aussi `'approvisionnement'`, que ce contexte ne connaît pas.
Le ranger d'office en `'vente'` le compterait dans le chiffre d'affaires ; en
`'depense'`, dans le cahier. **Les deux mentiraient sur l'argent.** La valeur
`'autre'` ne correspond à aucun filtre financier — exactement ce que faisait
déjà, sans le dire, une chaîne inconnue. Comportement identique, intention
écrite.

## Mesures

| Métrique (frontières métier : caisse, vente, stock, crédits, session, file hors-ligne) | Avant | Après |
|---|---|---|
| `any` total sur ces fichiers | 60 | **17** |
| …dont `catch (e: any)` (gestion d'erreur, pas une donnée) | 12 | **12** |
| **`any` sur une DONNÉE métier** | **48** | **0** |
| Casts `as any` sur des champs d'argent | ~24 | **0** |
| Types de données de la caisse déclarés | 0 | **8** |

Les 17 restants : 12 `catch (e: any)` — ils ne décrivent aucune donnée
d'argent — et 2 `boxSizing: … as any` (CSS), plus 3 occurrences du mot dans des
commentaires qui expliquent ce qui a été retiré.

## Portes franchies

- `node ci/check-tsc-baseline.mjs` — 0
- `npm run verify -w frontend_src` — vert
- `npm run test:ci -w frontend_src` (gelé) — vert, non modifié
- `npm run test:unit -w backend` — 195 tests verts
- `npm run build` — vert

Aucun test n'a été ajouté ni modifié dans cet axe : le compilateur EST le test.
