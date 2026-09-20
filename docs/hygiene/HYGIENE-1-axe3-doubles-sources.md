# HYGIÈNE-1 — Axe 3 : suppression des doubles sources de vérité déjà identifiées

L'axe 2 en a supprimé la moitié en convergeant le réseau (quatre
rafraîchissements de session, deux boucles de pagination, trois fabriques
d'en-têtes, trois lecteurs du catalogue). Restaient celles qui ne portent pas
sur le réseau mais sur **le sens d'un chiffre**.

## 1. Le bénéfice d'une vente s'appelait de trois façons

`Transaction` portait `margin`, `totalMargin` et `totalBenefice`.
`resumeVentes` en tirait deux totaux, `totalBenefices` et `totalMarges`.
Et côté serveur, `caisse_transactions` a deux colonnes, `marge` et `benefice`,
que le contrôleur remplit avec **exactement la même valeur** :

```ts
prix_vente: prixVente, prix_achat: prixAchat, marge, benefice: marge,
```

Donc : deux colonnes, trois champs, deux totaux — pour **un seul chiffre**.
`margin` n'était lu nulle part. `totalMarges` était calculé et affiché nulle
part. Et `totalBenefice ?? totalMargin` substituait silencieusement l'un à
l'autre, comme s'ils pouvaient différer.

C'est précisément la faute que la doctrine du 19/09 nomme : *ne jamais donner
deux sens à la même donnée*. Ici, deux noms pour une donnée — le même mal vu de
l'autre côté : le prochain lecteur supposera qu'ils diffèrent, et écrira du code
sur cette supposition.

**Il n'y a plus qu'un champ, `benefice`, et un total, `totalBenefices`.** La
lecture accepte les deux colonnes du serveur (`tx.benefice ?? tx.marge`) puis
recalcule depuis les lignes — la règle « coût inconnu ≠ coût nul » de
`margeVente.ts` reste l'unique calcul.

**Un détail qui mérite d'être dit :** ce renommage aurait dû faire échouer la
compilation à l'écran « Mes ventes », qui lisait `sale.totalMargin`. Elle n'a
rien vu — `sale` y est typé `any`. Sans relecture, la marge affichée serait
tombée à zéro sur toutes les ventes, en silence. C'est un argument de plus pour
l'axe 4, et il vient du terrain, pas d'un principe.

**Dette nommée, non corrigée :** les deux colonnes `marge` et `benefice`
existent toujours en base. Les fusionner demande une migration, que le mandat
interdit. Le serveur continue donc d'écrire la même valeur dans les deux ; le
frontend n'en lit plus qu'un sens.

## 2. La devise n'était nommée nulle part, donc partout

`config/devise.ts` avait été créé le 19/09 (ADR-0003, #5) comme unique endroit
où la devise est nommée — et **n'était importé par personne**. C'est d'ailleurs
le seul des 100 fichiers de l'axe 1 que j'avais conservé, en annonçant qu'il
serait câblé ici.

Il l'est : `utils/fcfa.ts`, le module du rendu de monnaie (8 consommateurs),
écrivait encore le mot « francs » en dur dans `direCoupure`. Il le tient
maintenant de `DEVISE_PARLEE`.

**Conséquence mesurable : il ne reste plus AUCUN fichier hors du parcours
d'atteignabilité** (100 → 0).

**Dette nommée, non corrigée :** les 142 occurrences de « FCFA » dans les écrans
restent en dur. Les convertir serait un renommage de masse, que le mandat
interdit explicitement, et sans gain : ce sont des libellés d'affichage, pas des
sources de vérité. Ce qui comptait — qu'un seul endroit DÉCIDE de la devise —
est acquis. Le reste suivra le jour où une colonne `devise` sera ajoutée à la
vente (ADR-0003 #5, toujours partiel).

## Mesures

| Métrique | Avant | Après |
|---|---|---|
| Champs frontend pour « le bénéfice d'une vente » | 3 | **1** |
| Totaux agrégés pour le même chiffre | 2 | **1** |
| Fichiers hors parcours d'atteignabilité | 1 | **0** |
| Endroits qui décident de la devise | 0 (implicite partout) | **1** |

## Portes franchies

- `node ci/check-tsc-baseline.mjs` — 0
- `npm run verify -w frontend_src` — vert
- `npm run test:ci -w frontend_src` (gelé) — vert, non modifié
- `npm run test:unit -w backend` — 195 tests verts
- `npm run build` — vert

`statsVente.test.mts` (dans `verify`) a été mis à jour : ses cas nommaient le
champ `totalBenefice`, qui n'existe plus. Les valeurs et les attendus sont
inchangés — seul le nom du champ a suivi.
