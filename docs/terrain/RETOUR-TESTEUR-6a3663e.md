# Retour testeur — mesure contre `6a3663e`

Mesuré le 23/09/2026 en exécutant les **vraies fonctions**, pas en lisant le code.
Aucune correction dans ce lot.

**Aucun des sept points n'était déjà corrigé.** Vérifié d'abord : aucun fichier
de la vente vocale n'a bougé entre l'APK testé et aujourd'hui — ce qui est
mesuré ici est exactement ce qui tourne sur le téléphone.

| # | Ce que le testeur a vu | Verdict | Cause mesurée |
|---|---|---|---|
| 1 | « 2 tas de piments » → écrit **« 2 piments »** | **REPRODUIT** | L'unité EST extraite (`uniteParlee: 'tas'`) puis **jetée** par `libelleVenteComprise` |
| 2 | Vente reprise sans sortir de l'écran → ne capte plus | **REPRODUIT — CAUSE TROUVÉE** | `VoiceState` a **7** valeurs, `handleMicClick` en traite **6** : `confirming` n'est traité NULLE PART. Le bouton micro devient inerte. |
| 3 | « 2 tas de piments **à 1000** » → 1000 pris comme prix **unitaire** | **REPRODUIT** | `extraire` tranche `lecturePrix: 'unitaire'` sur le mot « à » → la ligne naît `resolue: true` et **la levée d'ambiguïté n'est jamais posée** |
| 4 | « 2000 francs » dit **« 2 zéro zéro zéro »** | **REPRODUIT** | `toLocaleString('fr-FR')` glisse U+202F. Le catalogue i18n dit correctement « deux mille francs » — mais **des écrans envoient le brut à la voix** |
| 5 | « Encaisser » répété → « Je n'ai pas compris » | **REPRODUIT** | `estIntentionEncaissement('encaisser encaisser')` → **NON** |
| 6 | Produit inconnu : panier déjà rempli, « Non » le laisse | **REPRODUIT** | Le panier reçoit **5 × 1500 = 7 500 F** immédiatement, sans confirmation |
| 7 | Ajout de produit au stock par la voix : ne marche pas | **REPRODUIT** | `intentLocal('ajoute 10 kilos de tomate')` → **`null`** |

---

## Les preuves, telles qu'elles sont sorties

```
#1  "j'ai vendu 2 tas de piments"
      extraction : {"uniteParlee":"tas","lecturePrix":null}
      libellé    : "2 piment"            ← le « tas » a disparu

#3  "j'ai vendu 2 tas de piments à 1000"
      extraction : {"uniteParlee":"tas","lecturePrix":"unitaire"}
      ligne      : {"interpretationPrix":"unitaire","resolue":true}
      sans lecturePrix → {"interpretationPrix":"a_confirmer","resolue":false}

#4  toLocaleString('fr-FR') de 2000 → "2 000"  (contient U+202F : OUI)
      forme parlée par le catalogue  → "deux mille francs"  (propre)

#5  "encaisser"                 → encaissement ? OUI
    "encaisser encaisser"       → encaissement ? NON
    "Encaisser. Encaisser !"    → encaissement ? NON
    (mais `intentLocalCaisse` comprend « encaisser » dans TOUS ces cas)

#6  "5 tas de gombos à 1500", gombo absent du stock
      panier : [{"nom":"gombo","q":5,"total":7500,"src":"vocal"}]

#7  "ajoute 10 kilos de tomate"       → intentLocal: null
    "ajoute 10 kilos de tomate à 500" → intentLocal: null
    "ajouter 5 tas de gombo"          → intentLocal: null
```

---

## Ce que ces sept défauts ont en commun

**Six sur sept sont la même faute, celle que ce dépôt combat partout : une
information existe, et quelqu'un en aval la jette ou la re-devine.**

- **#1** — l'unité est extraite, puis jetée à l'affichage.
- **#3** — l'ambiguïté est mesurable, mais `extraire` la tranche avant que
  quiconque puisse demander. Le mécanisme de levée existe **et fonctionne** ;
  il ne reçoit jamais la main.
- **#4** — le montant a une forme PARLÉE juste dans le catalogue ; des écrans
  fabriquent la leur avec `toLocaleString`.
- **#5** — **deux grammaires pour une même idée**. `intentLocalCaisse`
  comprend « encaisser encaisser », `estIntentionEncaissement` non. Deux
  règles, donc deux vérités.
- **#6** — l'argent entre au panier avant que la question ne soit répondue.
- **#7** — l'écran attend une intention `ajouter_stock` que la grammaire
  locale **ne produit jamais** : du code câblé sur du vide.

## Gravité, telle que je la vois

**Sur l'argent réel — à traiter en premier**
1. **#3 + #6 ensemble.** « 5 tas de gombos à 1500 » met **7 500 F** au panier
   sans qu'elle ait confirmé quoi que ce soit. Si elle voulait dire « 1500 pour
   les cinq », l'écart est de 6 000 F sur une seule vente. Et refuser la
   création du produit ne retire pas la ligne.

**Sur la confiance — ça fait abandonner l'outil**
2. **#5** — cercle vicieux : elle répète parce que rien ne s'est passé, et
   répéter garantit que ça ne marchera pas.
3. **#2** — même famille : elle doit sortir de l'écran pour être réentendue.
4. **#4** — « 2 zéro zéro zéro » sur un montant : pour une non-lectrice, la
   voix EST le montant.

**Fonctionnalité morte**
5. **#7** — l'ajout au stock par la voix n'a jamais pu marcher.

**Affichage**
6. **#1** — « 2 piments » au lieu de « 2 tas de piments ».

---

## #2 — LA CAUSE, TROUVÉE APRÈS COUP (capture de Patrick, 20h57)

La capture montre « Je n'ai pas compris. Redis-moi. » figé sur l'écran de
caisse. Elle a permis de remonter à la cause, et elle est structurelle.

```
VoiceState = "idle" | "listening" | "processing" | "thinking"
           | "speaking" | "confirming" | "error"        ← SEPT valeurs

handleMicClick traite :  speaking, idle, error, listening, thinking, processing
                         ← SIX. `confirming` n'apparaît dans AUCUNE branche.

setState("confirming") est posé 4 fois :
  l.624  confirmation d'une intention FINANCIÈRE (FINANCIAL_INTENTS)
  l.681  question qui attend oui/non (« J'ajoute gombo à ta boutique ? »)
  l.703  auto-écoute juste après la question
  l.845  réponse pas claire, on redemande
```

**Dès qu'une confirmation est en cours, le bouton micro ne fait RIEN.** Pas
d'erreur, pas de retour, pas de son : aucune branche ne correspond. Le seul
moyen d'en sortir est de quitter l'écran — ce qui démonte le composant et
remet `state` à `idle`. C'est mot pour mot ce que le testeur décrit.

**ET VENDRE EST UNE INTENTION FINANCIÈRE.** Le piège se referme donc sur le
geste le plus courant : première vente → `confirming` → micro mort.

**CE N'EST PAS UN OUBLI ISOLÉ, C'EST UNE FAMILLE D'ÉTATS NON EXHAUSTIVE.** Une
suite de `if/else if` sur un type à sept valeurs, sans branche finale ni
vérification d'exhaustivité : le compilateur ne dit rien, et l'état oublié
devient un trou noir. `confirming` est le seul aujourd'hui — rien n'empêche le
prochain.

**Conséquence sur la gravité** : ce défaut passe DEVANT #3 + #6. Il ne fait pas
perdre d'argent, il rend la caisse vocale **inutilisable après la première
vente**.
