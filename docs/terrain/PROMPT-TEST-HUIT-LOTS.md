# Test terrain — les huit lots de la caisse et de la voix

**Version attendue : `ada8ef1` ou plus récente.**
URL : https://julaba-web.onrender.com

---

## Ce qu'on te demande

Huit corrections ont été faites en deux jours sur le parcours d'une marchande.
**Aucune n'a jamais été vue sur un vrai téléphone.** Elles sont toutes vertes
en test automatique — ce qui prouve seulement qu'elles font ce que le code
croit faire.

Ton travail : **dire ce que tu entends et ce que tu lis**, moment par moment.

Ce qu'on cherche n'est pas une erreur à l'écran. C'est **un silence**, ou
**un écart entre ce qui s'affiche et ce qui se dit**. Ni l'un ni l'autre ne
lève d'exception, et personne ne les signale jamais.

**Une marchande sur deux, dans ce pilote, ne sait pas lire.** Quand tu hésites
entre « c'est écrit » et « c'est dit », c'est toujours le dit qui compte.

## Étape 0 — la version, avant tout le reste

Ouvre `https://julaba-web.onrender.com/sw.js` et cherche :

```js
const BUILD = '<hash> · <date>'
```

- Hash `ada8ef1` **ou plus récent** → continue.
- Hash plus ancien → **arrête-toi et dis-le.** Render n'a pas fini de
  déployer, et tout ce que tu testerais serait l'ancienne version.

## Avant de commencer

1. **Monte le son**, mets-toi au calme. Certains clips durent moins d'une seconde.
2. Le journal de voix vit dans le stockage local, pas dans la console :

   ```js
   JSON.parse(localStorage.getItem('julaba_journal_voix') || '[]').slice(-20)
   ```

   C'est ta preuve quand l'oreille hésite. **Attention : « ended » dans ce
   journal ne prouve pas que tu as ENTENDU** — il prouve que le lecteur audio
   est arrivé au bout. Un volume à zéro donne aussi « ended ». Fie-toi à ton
   oreille d'abord, au journal ensuite.

---

# A — LE PARCOURS D'AJOUT AU STOCK (lots STK-22, STK-23, STK-24)

Va dans **Mon stock**, puis « Ajouter un produit ».

### A1 — les trois questions se disent-elles ?

Le parcours pose trois questions à la suite. Avant, elles étaient **écrites et
jamais dites** : on entendait seulement les confirmations de ce qu'on venait de
faire.

| Étape | Ce que tu dois ENTENDRE |
|---|---|
| 1 | « Qu'est-ce que tu vends ? » |
| 2 | « {le nom du produit}, tu le vends comment ? » |
| 3 | « Le {unité}, à combien ? » |

**Note pour chacune : entendue ou muette.** Et si tu l'entends, dis si elle
arrive AVANT que tu commences à taper, ou après.

### A2 — le bouton « C'est bon » quand il manque quelque chose

À l'étape du nom, **n'écris rien** et appuie sur le grand bouton vert.

- Avant : rien ne se passait, en silence.
- Attendu : tu dois **entendre** « Je n'ai pas son nom. Dis-le, ou tape-le. »

Puis tape **une seule lettre** et rappuie.

- Attendu : « C'est trop court pour un nom. Mets au moins deux lettres. »
- **Point important** : cette phrase doit encourager à CONTINUER, pas donner
  l'impression qu'il faut tout recommencer. Dis-nous comment tu la reçois.

Fais pareil à l'étape de l'unité (ne choisis rien) et à celle du prix (ne tape
rien). Tu dois entendre à chaque fois une phrase différente.

### A3 — le micro qui ne répond pas

Si tu peux, **refuse l'autorisation micro** au navigateur, puis touche
« Ajouter en parlant ».

- Attendu : tu **entends** « Le micro ne répond pas. Touche Ajouter un produit. »
- Avant, c'était écrit et rien n'était dit.

---

# B — LES MONTANTS DITS À VOIX HAUTE (lots VOIX-07, VOIX-09, ARG-17)

**C'est la partie la plus importante du test.**

### B1 — « deux mille » ou « 2 zéro zéro zéro » ?

Fais une vente de **2 000 F** et va jusqu'à l'encaissement.

Écoute **très attentivement** chaque fois qu'un montant est prononcé :

- ✅ Attendu : « **deux mille francs** »
- ❌ Défaut : « **2 zéro zéro zéro** », ou le nombre épelé chiffre par chiffre

**Signale le moindre montant épelé, en disant à quel moment.** C'est le défaut
qu'on vient de fermer à quatre endroits ; s'il en reste un, il est là.

Refais avec **15 000 F** (« quinze mille ») et **500 F** (« cinq cents »).

### B2 — l'écran et l'oreille peuvent dire différemment, et c'est NORMAL

Au moment de l'encaissement, l'écran affiche la relecture **et** Tata la dit.

- L'écran doit montrer « **3 000 francs** » — avec l'espace, pour être lisible.
- L'oreille doit entendre « **trois mille francs** ».

**Ce n'est pas une incohérence, c'est voulu.** Ce qu'il faut vérifier, c'est
que les deux disent **le même montant** et **la même phrase**. Si l'écran dit
3 000 et la voix dit autre chose que trois mille, **c'est un défaut grave** :
signale-le tout de suite.

### B3 — l'unité doit traverser

Dis au micro : « **j'ai vendu 5 sacs de riz à 20 000** ».

- ❌ Avant : Tata répondait « Vente de 5 riz pour 20 000 francs, c'est bien ça ? »
- ✅ Attendu : « Vente de **5 sacs de riz** pour vingt mille francs, c'est bien ça ? »

**Le mot « sacs » doit être là.** Sans lui, tu confirmerais une autre vente que
celle que tu as dite.

Refais avec « 2 tas de piments à 1000 » et « 3 kilos de tomate à 500 ».
L'écran aussi doit afficher l'unité.

### B4 — l'objectif du jour

Dans l'accueil marchande, fixe un **objectif de 15 000 F**.

- Attendu : « Super ! Ton objectif du jour est fixé à **quinze mille** francs. »
- Défaut : « quinze zéro zéro zéro » ou « 15 000 » épelé.

---

# C — DIRE OUI, DIRE NON (lot VOIX-08)

Quand Tata demande « c'est bien ça ? », elle attend une réponse.

### C1 — une question n'est pas un oui

Quand Tata attend ta confirmation, **pose-lui une question** au micro :

> « **ça fait combien ?** »

- ❌ Avant : c'était compris comme **OUI**, et **la vente était validée**.
- ✅ Attendu : Tata ne valide pas. Elle doit redemander : « Dis oui pour
  valider, ou non pour annuler. »

**Si la vente part, arrête tout et signale-le immédiatement.** C'est de
l'argent validé sans accord.

Essaie aussi « **ça va** » et « **bon alors** » : aucun ne doit valider.

### C2 — ce qui doit marcher marche toujours

Dis, chacun à son tour : « oui », « ouais », « d'accord », « ok »,
« parfait », « c'est bon », « c'est ça ».
**Tous doivent valider.** Signale ceux qui ne sont pas compris.

### C3 — le refus reste large

Dis « **pas d'accord** ».

- Attendu : Tata **annule**.
- Défaut : elle valide. (Ce cas a été cassé puis réparé dans la même journée —
  il mérite une vérification réelle.)

Essaie aussi « non », « pas ça », « c'est faux », « erreur ».

### C4 — la répétition

Dis « **oui oui** », puis dans une autre vente « **encaisser encaisser** ».
Répéter ne doit jamais empirer les choses : c'est ce qu'une marchande fait
quand elle croit ne pas avoir été entendue.

---

# D — CE QUI NE SE VOIT PAS À L'ÉCRAN (lot ARG-18)

Ce lot n'a **aucun effet visible**. Il écrit une trace quand une vente ne
retrouve pas son produit. **Tu ne peux pas le tester à l'œil** — ne cherche pas.

Ce que tu peux faire : vends un **« Autre article »** (montant libre, sans
produit du catalogue), puis vérifie que **la vente s'enregistre normalement**
et que le total est juste. C'est tout ce qui te concerne ici.

---

# Ce que tu renvoies

Un tableau, une ligne par point (A1 à D) :

| Point | Entendu / Vu | Conforme ? | Ce que tu as noté |
|---|---|---|---|

Et **trois choses en plus, qui valent autant que le tableau** :

1. **Tout montant que tu as entendu épelé**, avec le moment exact.
2. **Tout endroit où l'écran et la voix ne disent pas la même chose** (hors du
   cas B2, qui est voulu).
3. **Tout silence** : un écran qui affiche quelque chose d'important sans le
   dire. Même si ce n'est pas dans la liste ci-dessus.

## Ce qu'on ne te demande pas

- De corriger quoi que ce soit.
- De juger si c'est grave — dis ce que tu as vu et entendu, on tranche ensuite.
- De deviner : si tu n'es pas sûr d'avoir entendu, **dis que tu n'es pas sûr**.
  Un doute signalé coûte une minute ; un doute gardé coûte un passage terrain.
