# Fiche de passe RC1 — Caisse

**Décision de sortie de version POUR LA CAISSE**, et pour elle seule. Le feu
vert de lancement est une autre décision : [`GO-PILOTE-JULABA.md`](GO-PILOTE-JULABA.md).

**Pour l'encadrant, pas pour la marchande.** Elle **complète** la fiche vocale
(`docs/terrain/FICHE-TESTEUR-CAISSE-VOCALE.md`), elle ne la remplace pas.

| | |
|---|---|
| **Fiche vocale** | qualité du parcours marchande — sept relevés |
| **Fiche RC1** | **décision de sortie de version** — les quatre critères qu'elle ne couvre pas |

APK : **`ca2e817`** · compte de test · réseau disponible au départ.

---

## LA RÈGLE QUI PRIME SUR TOUT

> **Un montant observé différent de l'attendu, à n'importe quelle étape de
> n'importe quelle fiche : RC1 ÉCHOUE. Immédiatement.**

Pas de nuance, pas de « à vérifier », pas de moyenne. On arrête la passe et on
consigne le montant attendu, le montant affiché, et le geste exact.

---

## 1 · Vente tactile  *(critère 1)*

| | |
|---|---|
| **geste** | ouvrir la caisse → toucher un produit → poser une quantité → poser un prix libre que **vous choisissez** → ajouter au panier |
| **attendu** | la ligne apparaît au panier avec **exactement** la quantité et le prix posés ; le total du panier = quantité × prix |
| **observé** | |
| | ☐ PASS ☐ **FAIL** |

> Prix **libre** et non prix catalogue : l'attendu se calcule de tête, sans
> dépendre de ce que contient le catalogue ce jour-là.

---

## 2 · Encaissement, montant exact  *(critère 3)*

| | |
|---|---|
| **geste** | sur le panier de l'étape 1, aller jusqu'à l'encaissement et aller **au bout** |
| **attendu** | le montant à encaisser est **identique** au total du panier de l'étape 1 ; la vente est enregistrée pour ce montant ; le panier se vide |
| **observé** | |
| | ☐ PASS ☐ **FAIL** |

> Le montant **dit** compte autant que le montant **écrit** : si l'application
> l'annonce à voix haute, il doit être le même. Une marchande qui ne lit pas
> n'a que celui-là.

---

## 3 · Démarrage et connexion  *(critère 7)*

| | |
|---|---|
| **geste** | fermer complètement l'application → la rouvrir → se connecter (numéro puis code) |
| **attendu** | elle s'ouvre, l'écran d'entrée s'affiche, la connexion aboutit et mène à la caisse |
| **observé** | |
| | ☐ PASS ☐ **FAIL** |

---

## 4 · Aucun crash bloquant  *(critère 6)*

| | |
|---|---|
| **geste** | **aucun geste propre** : c'est une observation tenue pendant **toute** la passe, fiche vocale comprise |
| **attendu** | l'application ne se ferme pas d'elle-même, ne gèle pas, ne reste pas sur un écran sans sortie |
| **observé** | |
| | ☐ PASS ☐ **FAIL** |

> **Bloquant** = on ne peut plus vendre, encaisser ou retrouver le panier sans
> réinstaller. Un écran lent, un affichage de travers, un bouton mal placé
> **ne sont pas** des crashs bloquants : ils vont dans `POST-PILOTE.md`.

---

## 5 · Crédit introuvable  *(preuve de configuration, pas un critère de qualité)*

| | |
|---|---|
| **geste** | parcourir la caisse et l'historique **sans chercher à faire un crédit** : regarder les moyens de paiement proposés, puis les onglets de « mes ventes » |
| **attendu** | **« Crédit », « À crédit » et l'onglet « Crédits » sont INTROUVABLES** |
| **observé** | |
| | ☐ PASS ☐ **FAIL** |

> **Pourquoi ce contrôle existe.** Le crédit et l'acompte sont **hors pilote**
> (`CAISSE_CREDIT_ACTIF=false`), parce que les invariants **I4, I5 et I6** sont
> rouges : un crédit rejoué crée deux dettes, un acompte rejoué encaisse deux
> fois. Une garde automatique (`test:credit-hors-pilote`) vérifie le **source**
> à chaque `verify` ; **celui-ci vérifie le BUILD**, qui est ce que la marchande
> tient en main.
>
> Un FAIL ici n'est pas un défaut d'interface : c'est **un risque d'argent qui
> rentre dans le pilote**.

---

## Verdict

| | |
|---|---|
| **les 5 PASS**, et la fiche vocale sans bloquant au sens §5 | **RC1 — Caisse EST FIGÉE** |
| **un seul FAIL** | **RC1 échoue** — on corrige ce défaut-là, **et rien d'autre** |

Un FAIL ne rouvre pas le produit : il rouvre **une ligne**. Tout ce qu'on
remarque d'autre pendant la passe, même si on sait comment l'améliorer, va dans
[`POST-PILOTE.md`](POST-PILOTE.md) — c'est le régime de [`RC1.md`](RC1.md).

**Et si tout tient, on fige** — même s'il reste un meilleur réglage possible.
