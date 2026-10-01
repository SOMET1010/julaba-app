# Fiche testeur — la caisse qui parle

> **Sept relevés. Une petite heure. Vous n'avez pas besoin de connaître
> l'application.**
>
> Vous testez une caisse pour des marchandes de marché, **dont beaucoup ne
> savent pas lire**. C'est pour ça que tout se dit à voix haute : si une
> information n'existe qu'à l'écran, elle n'existe pas.

---

## Avant de commencer

1. **Désinstallez** l'ancienne JULABA si vous l'avez. Sinon vous testerez
   l'ancienne sans le savoir.
2. Installez l'APK qu'on vous a donné (« sources inconnues » à autoriser).
3. Ouvrez l'application. **En bas de l'écran de connexion il y a une ligne
   comme `v5.0.0 · af06ba2 · 2026-10-01`.** Notez ces 7 caractères du milieu
   (`af06ba2`) : **c'est la version testée, et tout compte rendu sans elle est
   inutilisable.**
4. Connectez-vous avec les identifiants qu'on vous a remis.
5. **Montez le son.** La moitié de ce qu'on teste s'entend.

---

## Comment vous rapportez — lisez ceci avant les gestes

Dès qu'une chose ne va pas :

1. **Touchez le bouton 🐞 Rapport**, en bas à gauche. Il est sur tous les
   écrans. Ne changez pas d'écran avant.
2. Le rapport est copié. **Collez-le** (message, mail, bloc-notes).
3. En haut du rapport il y a une ligne `repère: XXXX`. **Dites ce repère** dans
   votre message : « geste 2, rapport 7K2P ».
4. Écrivez trois lignes, pas plus :

```
Geste n° :
Ce que j'ai fait :
Ce que j'attendais :
Ce qui s'est passé :
```

**N'écrivez pas la cause.** Pas de « je pense que le micro… », pas de « ça vient
sûrement de… ». Une cause supposée oriente la correction avant qu'on ait
mesuré, et on a déjà perdu deux jours comme ça. **Le geste, l'attendu,
l'observé. C'est tout, et c'est beaucoup.**

Si tout se passe bien : dites-le aussi. « Geste 3 : OK » est une information.

---

## Les sept relevés

### 1 · Est-ce qu'elle vous entend vraiment ?

Allez sur **Vendre**. Touchez le micro, dites :

> **« encaisser »**

Puis **sans rien changer**, touchez 🐞 et envoyez.

Recommencez avec :

> **« vends deux tas de piment »**

🐞 et envoyez.

*On cherche ce que le téléphone a réellement entendu. Ces deux rapports sont les
plus importants des cinq.*

---

### 2 · Est-ce qu'elle dit les montants en toutes lettres ?

Faites une vente (touchez un produit, ou dites-la). Écoutez.

- **Attendu** : « … **mille cinq cents** francs ».
- **Défaut** : « … **un cinq zéro zéro** francs », ou des chiffres épelés.

Écoutez aussi en ouvrant l'application, et dans **Mes dépenses**.

*Une marchande qui ne lit pas n'a que ça.*

---

### 3 · Est-ce qu'elle vous laisse finir votre phrase ?

Touchez le micro, **attendez deux secondes sans parler**, puis dites une phrase
longue :

> **« vends trois sacs de riz importé long grain à vingt mille francs »**

- **Attendu** : le micro reste ouvert tant que vous parlez, et se ferme **après**
  que vous avez fini.
- **Défaut** : il se coupe en plein milieu.

Refaites-le **dans un endroit bruyant** si vous pouvez.

---

### 4 · Est-ce qu'elle perd une vente quand le réseau tombe ?

1. Activez le **mode avion**.
2. Faites une vente complète : produit, prix, puis **encaissez**.
3. Désactivez le mode avion. Attendez une minute.
4. Regardez **Mes ventes**.

- **Attendu** : **une seule** vente, avec le bon montant.
- **Défaut** : zéro vente, ou **deux fois la même**.

*C'est le geste le plus important pour l'argent. Faites-le sérieusement.*

---

### 5 · Est-ce qu'elle voit son total sans chercher ?

Mettez **4 ou 5 articles** au panier. Sans faire défiler l'écran :

- Voyez-vous le **total** ?
- Voyez-vous le bouton pour **encaisser** ?

Regardez aussi : les chiffres sont-ils assez gros **en plein soleil** ?

---

### 6 · Est-ce que le panier survit si l'application se ferme ?

Celui-là arrive pour de vrai : le téléphone s'éteint, ou Android ferme
l'application tout seul pour faire de la place. Si le panier est perdu, elle a
encaissé **de mémoire** — ou n'a pas encaissé du tout.

1. Mettez **2 articles** au panier. **Notez le total** sur un papier.
2. **Fermez complètement l'application** — pas le bouton retour : la liste des
   applications ouvertes, puis balayez JULABA pour la fermer.
3. **Rouvrez** JULABA.

**Les deux articles sont-ils encore là, avec le même total ?**

Si le panier est vide ou si le total a changé : **c'est un cas qui arrête tout.**

---

### 7 · Deux prix libres de suite, est-ce que le compte est bon ?

Un « prix libre » c'est quand elle vend quelque chose sans le nommer — elle dit
juste un montant. Deux de suite, ils n'ont pas de nom pour les distinguer, et
c'est là que le total peut mentir.

1. Panier **vide** pour commencer.
2. Un premier article libre à **500**.
3. Un second article libre à **300**.

**Le total affiche-t-il 800 ?** Et voyez-vous bien **deux lignes**, pas une ?

Si le total n'est pas 800 : **c'est un cas qui arrête tout.**

---

## Ce qui n'est PAS à tester

Pour ne pas vous disperser : **le profil, la photo, la carte, les marchés, les
communes, les statistiques, le back-office.** Ces écrans existent et peuvent
avoir des défauts — ce n'est pas ce lot. Notez-les en une ligne si vous voulez,
mais ne vous y attardez pas.

---

## Ce qui arrête tout

Si vous rencontrez **l'un de ces trois cas**, prévenez immédiatement sans
continuer :

1. **Un montant faux enregistré, ou une vente perdue** — le panier ou le reçu
   n'affiche pas ce que vous avez vendu. C'est le cas d'un **panier perdu** après
   fermeture (geste 6), et d'un **total qui n'est pas 800** sur deux prix libres
   de 500 et 300 (geste 7).
2. **Un montant faux dit à voix haute** — elle annonce un chiffre qui n'est pas
   celui de l'écran.
3. **Un des sept relevés impossible à terminer.**

Tout le reste — un mot mal tourné, un bouton mal placé, une lenteur — se note et
**ne vous empêche pas de continuer**.

---

## En une ligne

> **Installez. Notez les 7 caractères de version. Faites les sept relevés.
> Touchez 🐞 dès que ça cloche. Dites le repère. N'expliquez pas pourquoi.**
