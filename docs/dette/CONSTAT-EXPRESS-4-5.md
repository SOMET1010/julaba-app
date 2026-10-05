# Constat EXP-01 — deux Express dans le même arbre

> **Statut : CONSTAT, aucune correction.** Arbitrage de Patrick, 29/09 :
> *« Ne touche pas au conflit Express 4/5 dans ce lot. Ouvre un constat séparé
> et prépare une reproduction/tests avant toute migration. »*

## Ce qui est mesuré

| | |
|---|---|
| `@nestjs/platform-express@11.2.6` amène | **express 5.2.1** (hissé à la racine) |
| `backend/package.json` déclare | **`express: ^4.18.0`** → 4.22.2, imbriqué |
| `backend/src/main.ts:191` fait | `const express = require('express')` |

Quatre fichiers importent aussi des **types** d'express — `Request`, `Response`
(`transactions-rest.controller.ts`, `jwt.strategy.ts`, `auth.controller.ts`,
`partner/api-key.guard.ts`). Les types sont inoffensifs ; le `require` ne l'est
pas.

## Pourquoi ce n'est pas cosmétique

Patrick, 29/09 : *« avoir Nest servi par Express 5 tandis qu'un
`require('express')` peut résoudre Express 4 est exactement le genre de dette
qui donne des comportements difficiles à reproduire. »*

C'est la forme la plus dangereuse d'une dette de ce dépôt : **le serveur peut
être configuré avec une version et servi par une autre.** Entre 4 et 5,
diffèrent notamment le routage des motifs (`path-to-regexp` v8), le traitement
des promesses rejetées dans les gestionnaires, `res.status()` sur codes hors
plage, et le comportement par défaut de `query parser`. Un middleware posé sur
l'instance 4 peut donc ne jamais voir passer une requête servie par la 5 — sans
aucune erreur, et sans trace.

**Aucun incident n'est attribué à ce conflit à ce jour.** Ce constat dit un
risque mesuré, pas une panne observée.

## Ce qu'il faut AVANT toute migration

1. **Reproduction.** Un test serveur qui prouve laquelle des deux instances
   sert réellement une requête, et ce que `main.ts:191` configure.
   Sans ça, on migrerait à l'aveugle.
2. **Arbre de dépendances figé** : qui d'autre tire express 4 ?
3. **Tests serveur** sur les chemins que `main.ts` configure via `require`.
4. **Décision explicite**, et c'est celle de Patrick :
   - **alignement total sur Express 5** — retirer la déclaration express du
     backend et laisser `@nestjs/platform-express` fournir la seule instance ;
   - ou **maintien temporaire cohérent sur Express 4** — épingler
     `@nestjs/platform-express` à une version qui amène express 4, et le dire.

Les deux se défendent. Ce qui ne se défend pas, c'est l'état actuel : **les
deux à la fois.**

## Ce que ce constat NE dit pas

Ce n'est pas une CVE. `express@4.22.2` portait un avis modéré fermé par ailleurs
lors du lot verrou. Le problème ici est **l'ambiguïté d'instance**, pas la
vulnérabilité — et il survivrait à n'importe quelle montée de version tant que
les deux déclarations coexistent.

## Origine

Trouvé le 28/09 en remontant la chaîne de `npm audit` pendant le lot CA-01,
signalé sans correction, et confirmé comme prochain chantier technique par
Patrick le 29/09 — **avant montée en charge, pas dans l'APK de recette.**
