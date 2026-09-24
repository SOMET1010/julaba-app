# Recette courte — quatre gestes, rien de plus

**APK** : construit sur `9131eb5` — [run 35986111954](https://github.com/SOMET1010/julaba-app/actions/runs/35986111954)
**Release** : https://github.com/SOMET1010/julaba-app/releases/tag/pilote-latest → `julaba-latest.apk`
`com.julaba.app` 1.0 · minSdk 24 · target 36 · API `julaba-api.onrender.com/api/v1`
Voix dioula, montants dioula et clips prototypes **éteints**.
Objectif : une **preuve terrain**, pas un dixième correctif.

---

## A — Le micro ne meurt plus  *(VOX-02)*

> Vendre quelque chose → arriver à la confirmation → **toucher le micro**.

**Attendu** : il répond et reprend l'écoute. **Jamais d'écran mort.**
Et s'il y a une confirmation en cours, une sortie reste visible à l'écran.

*Avant : l'appui ne faisait rien, il fallait quitter l'écran.*

---

## B — L'ambiguïté se demande  *(ARG-12 / retour #3 + #6)*

> Dire : **« 2 tas de piments à 1000 »**

**Attendu** : une **question AVANT le panier** — « 1 000 francs, c'est le prix
d'un seul, ou de tous les 2 ? » — et **le panier reste vide** tant qu'elle n'a
pas répondu.

*Avant : 2 000 F entraient directement, sans rien demander.*

---

## C — L'unité explicite ne demande rien

> Dire : **« 2 tas de piments à 1000 le tas »**

**Attendu** : **2 000 F**, **sans aucune question**.

---

## D — Le lot explicite ne demande rien

> Dire : **« 2 tas de piments pour 1000 »**

**Attendu** : **1 000 F**, **sans aucune question**.

---

## Si les quatre passent

On reprend #1 (« 2 piments » au lieu de « 2 tas de piments »), #4 (« 2 zéro
zéro zéro »), #5 (« encaisser » répété) et #7 (ajout au stock par la voix).

## Si l'un échoue

Note **les mots exacts vus à l'écran** et **le montant exact** dans le panier.
C'est ce qui permet de mesurer ; une interprétation ne le permet pas.

## Ce qu'on ne teste pas ici

Le reste du parcours (étal, encaissement, hors-ligne) a déjà été couvert par la
recette de `6a3663e` : on ne le refait pas. Quatre gestes, et on s'arrête.
