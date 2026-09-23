# Retour testeur — mesure contre `6a3663e`

Mesuré le 23/09/2026 en exécutant les **vraies fonctions**, pas en lisant le code.
Aucune correction dans ce lot.

**Aucun des sept points n'était déjà corrigé.** Vérifié d'abord : aucun fichier
de la vente vocale n'a bougé entre l'APK testé et aujourd'hui — ce qui est
mesuré ici est exactement ce qui tourne sur le téléphone.

| # | Ce que le testeur a vu | Verdict | Cause mesurée |
|---|---|---|---|
| 1 | « 2 tas de piments » → écrit **« 2 piments »** | **REPRODUIT** | L'unité EST extraite (`uniteParlee: 'tas'`) puis **jetée** par `libelleVenteComprise` |
| 2 | Vente reprise sans sortir de l'écran → ne capte plus | **NON MESURÉ** | Demande un vrai micro ; je ne peux pas le reproduire ici sans mentir |
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

## Ce que je n'ai pas mesuré, et pourquoi

**#2** (le micro ne se rouvre pas sans quitter l'écran) demande un vrai micro
et un vrai cycle d'écoute. Je ne peux pas le reproduire ici. Ce que je peux
dire : `finDEcoute` et la réouverture vivent dans `MicroVenteCaisse`, et
`useVoiceCore` ne vide `transcript` qu'au DÉBUT d'un nouvel enregistrement
(CAI-07c) — une piste, pas une cause établie.

**Je ne le déclare donc ni reproduit ni corrigé.**
