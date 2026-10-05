# Fiche agent — poser la boutique avec la marchande

**Pour la recette terrain de l'APK `a10fcc0`.** Option **B** retenue par
Patrick : *les prix se posent sur place, avec elle.*

Une page. À lire avant de partir.

---

## ⚠️ LE PIÈGE, ET IL EST EN PREMIER

L'écran « nouveau produit » propose **37 tuiles-photo**. Toucher une photo
remplit tout d'un coup — nom, unité, catégorie… **et DEUX PRIX**.

```
  Tomate     → prix d'achat 300 F   ·  prix de vente 400 F
  Aubergine  → prix d'achat 700 F   ·  prix de vente 800 F
  Piment     → prix d'achat 100 F   ·  prix de vente 150 F
```

**Ces prix ne sont PAS les siens.** Ils sont écrits dans le code. Si tu valides
sans les changer, elle repart avec les prix de quelqu'un d'autre — et **tout le
test de la caisse se fait alors sur des chiffres faux**.

Un zéro se remarque. **400 F ne se remarque pas.**

> **Règle absolue : après chaque tuile touchée, tu EFFACES les deux prix et tu
> demandes les siens.** « Tu l'achètes combien ? » puis « Tu la vends combien ? »

---

## Ce que tu apportes

- le téléphone avec l'APK `a10fcc0` installé (sources inconnues autorisées) ;
- **l'aide-mémoire des 198 produits** ([`CATALOGUE-198-PAR-FAMILLE.md`](./CATALOGUE-198-PAR-FAMILLE.md)),
  imprimé ou ouvert sur un second téléphone ;
- son numéro de téléphone, déjà transmis pour créer son compte.

---

## 1. La connexion

| | |
|---|---|
| Numéro | le sien, celui donné pour créer le compte |
| Code | **`0000`** |
| Ensuite | l'application **oblige** à choisir un nouveau code à 4 chiffres |

**Le nouveau code, c'est ELLE qui le choisit, et c'est elle qui le retient.**
Ne le choisis pas pour elle, ne le note pas sur un papier qui reste chez toi.

Si tu veux tester sur le web plutôt que sur l'APK : `https://julaba-web.onrender.com`

---

## 2. Poser ses produits — le geste

Pour **chaque** produit qu'elle vend réellement. Commence par **cinq**, pas
vingt : on veut qu'elle vende aujourd'hui, pas qu'elle remplisse un catalogue.

1. **« Mes produits »** → **« + Ajouter »**
2. **Le nom.** S'il y a une tuile-photo qui correspond **exactement**, touche-la.
   Sinon, tape le nom depuis l'aide-mémoire.

   > **« Igname » n'est pas « Igname Kponan ».** Quatre variétés d'igname, quatre
   > prix. Sur les 198 produits, **8 seulement** ont une tuile au nom exact.
   > Dans le doute : tape le nom complet.

3. **⚠️ LES DEUX PRIX — efface ce qui est pré-rempli.**
   - « Tu l'achètes combien ? » → prix d'achat
   - « Tu la vends combien ? » → prix de vente

   L'application refuse un prix de vente à zéro. Elle **accepte** un prix
   inventé : c'est à toi de l'empêcher.

4. **L'unité.** L'écran propose `unité · tas · kg · sac · bassine · régime`.
   L'aide-mémoire dit ce qui se vend au marché pour ce produit-là. **Si elle
   vend à la botte ou au panier, écris botte ou panier** — la saisie libre marche.
5. **La quantité** qu'elle a devant elle aujourd'hui.
6. **Enregistrer.** Tantie dit à voix haute ce qui a été ajouté — **écoute** :
   c'est le premier contrôle.

---

## 3. Ce qu'on veut savoir — les sept corrections à vérifier

Ne coche rien à l'avance. Note ce que tu **vois**.

| # | Ce qu'on teste | Comment | Attendu |
|---|---|---|---|
| 1 | **Corriger un prix** | un produit → change le prix seul → enregistre | ça passe. **Avant : erreur.** Et l'ancien prix ne disparaît pas |
| 2 | **Corriger le stock seul** | change la quantité, ne touche pas au prix | le **prix ne bouge pas**. Avant : il était effacé |
| 3 | **Le micro de la caisse** | parle une phrase, puis **tais-toi** | il s'arrête tout seul. Plus de paragraphe de six lignes |
| 4 | **« J'ai compris »** | dis quelque chose d'incompréhensible | il dit « Je n'ai pas compris ». Il ne répète **pas** tes mots |
| 5 | **La dépense** | note une dépense → touche « Taxe mairie » | on la retrouve en **« Taxe mairie »**, pas en « Autre » |
| 6 | **Le résumé** | résumé → choisis « 30 derniers jours » | il dit « Sur les 30 derniers jours », **pas** « Aujourd'hui ». Et les montants se **prononcent** |
| 7 | **La journée fermée** | ferme la caisse → essaie de vendre | **refusé**, avec une phrase claire |

Et **la question qui compte plus que les sept** :

> **Est-ce qu'elle a vendu sans toi ?**
> Après la troisième vente, recule d'un pas. Tais-toi. Regarde.

---

## 4. Ce qui ne marche pas encore — ne le cherche pas

| | |
|---|---|
| Le **catalogue des 198** dans l'application | **absent** : Odoo n'est pas branché. Elle tape ses produits, c'est normal |
| Le **crédit / carnet de dettes** | désactivé pour le pilote |
| Le **back-office** | aucun compte n'existe encore |
| Les **voix en langues locales** | éteintes dans cet APK |

Si elle demande l'une de ces quatre choses : **note-le**, c'est une information.
Ne promets pas de date.

---

## 5. Ce que tu rapportes

Trois choses, pas un rapport :

1. **Ce qu'elle a fait seule.** Combien de ventes sans que tu parles.
2. **Où elle s'est arrêtée.** L'écran exact, et ce qu'elle a dit à ce moment-là.
   *Ses mots, pas ton interprétation.*
3. **Ce qui l'a fait rire ou soupirer.** C'est souvent là qu'est le vrai défaut.

Les sept lignes du tableau : coche, et écris une phrase quand c'est rouge.

---

## Le rappel qui vaut pour toute la journée

Elle **ne lit pas**. Si tu lui lis l'écran, tu testes ta lecture, pas
l'application. **Laisse le silence durer.** Ce qui se passe pendant ce silence
est le seul résultat qui compte.
