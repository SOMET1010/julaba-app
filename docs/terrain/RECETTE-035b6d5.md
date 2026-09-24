# Recette JULABA — APK `035b6d5`

**À installer :** `julaba-latest.apk` (identique à `julaba-035b6d5.apk`)
https://github.com/SOMET1010/julaba-app/releases/tag/pilote-latest

`sha256 : be92e937468e547f57a5d4d9f4971c1dd50ac83a0eaef4d7f0d294006ff790dd`

**Désinstallez l'ancienne version avant d'installer celle-ci.** La recette
précédente portait sur `6a3663e`, construit le 23/09 à 19h25 — **15 commits
plus tôt**. Sans désinstallation, on reteste l'ancienne.

**Le serveur a changé aussi.** L'API tournait sur du code du **20 septembre**.
Elle est maintenant à jour. Deux constats de la recette précédente venaient de
là, pas du téléphone.

---

## 1. Ce qui a été corrigé — à revérifier

Merci de refaire exactement ces gestes et de dire si le défaut est encore là.

### 1.1 Ajouter un produit au clavier
> *Constat précédent : « la zone de saisie ne prend qu'un seul caractère ».*

Stock → **Ajouter un produit** → tapez **Tomate** en entier.

- Attendu : les six lettres s'écrivent. L'écran **ne change pas** pendant la frappe.
- Pour continuer, il faut **toucher le bouton vert « C'est bon »** — ou la touche
  OK du clavier. Rien n'avance tout seul : c'est ce qui effaçait le nom.
- Puis l'unité, puis le prix. Refaites avec **Banane** et **Riz sac**.

### 1.2 Ajouter un produit à la voix
> *Constat précédent : « l'ajout par la voix n'est pas fonctionnel, Tata ne capte rien ».*

Stock → **Ajouter en parlant** → dites **« ajoute 10 piments à 500 »**.

- Attendu : le parcours s'ouvre avec **piment** et **500** déjà remplis, et ne
  vous demande que **l'unité**.
- Essayez aussi **« gombo »** tout seul : le nom doit être repris, le reste demandé.
- Le bouton ne vous dicte plus de phrase d'exemple : dites votre produit
  comme vous le diriez au marché.

### 1.3 Modifier le prix d'un produit
> *Constat précédent : « Erreur lors de la sauvegarde ».*

Ouvrez une fiche produit → **Modifier** → changez **seulement le prix** → Enregistrer.

- Attendu : enregistré, sans erreur.
- **Puis le test inverse, le plus important** : changez **seulement la quantité**,
  enregistrez, rouvrez la fiche. **Le prix doit être intact.** Il était effacé
  en silence.

### 1.4 Vendre plusieurs fois de suite sans quitter l'écran
> *Constat précédent : « si vente reprise sans sortir de l'écran, il ne sait plus capter ».*

Faites une vente à la voix, puis **enchaînez une seconde vente sans quitter l'écran**.

- Attendu : le micro répond toujours. Il n'y a plus d'écran mort.

### 1.5 Le prix dans une phrase
> *Constat précédent : « 2 tas de piments à 1000 → il applique 1000 en prix unitaire ».*

Dites **« j'ai vendu 2 tas de piments à 1000 »**.

- Attendu : JULABA **demande** si c'est 1000 le tas ou 1000 le tout. Il ne
  décide plus à votre place quand la phrase ne le dit pas.
- Dites ensuite **« 2 tas de piments à 1000 chacun »** : là, il ne doit plus demander.

### 1.6 Le stock après une vente
Vendez un produit, puis rouvrez le stock. La quantité doit avoir baissé.

---

## 2. Ce qui est ENCORE OUVERT — inutile de le resignaler

Ces trois points sont connus, mesurés, et pas encore corrigés :

1. **« 2 tas de piments » s'écrit « 2 piments »** — l'unité est comprise mais pas
   réaffichée.
2. **Les montants sont épelés** — « 2000 » dit « 2 zéro zéro zéro ».
3. **« Encaisser » répété** — il faut parfois le redire plusieurs fois.

Si vous en voyez d'AUTRES, ceux-là nous intéressent beaucoup.

---

## 3. Ce qui est un RÉGLAGE, pas un défaut

- **Les écrans d'entrée, d'onboarding et d'accueil sont muets.** C'est voulu :
  les clips de ces écrans sont des enregistrements de prévisualisation, pas
  encore validés par une voix ivoirienne. Ils sont éteints dans ce build.
- **Les notifications push sont désactivées** (clés absentes côté serveur).
- **Un produit qu'on vient de poser a un stock à zéro** et s'affiche donc en
  « Rupture ». C'est connu, et la correction demande un arbitrage produit :
  on ne veut pas inventer une quantité qu'elle n'a pas comptée.

---

## 4. Demandes de la recette précédente — en attente d'arbitrage

Elles sont enregistrées, aucune n'est oubliée, mais elles engagent la
conception du produit et ne sont pas des correctifs :

- Ouverture de journée quand le fond est à zéro (« Veux-tu ouvrir ta caisse ? »)
- Icône de fermeture systématique sur les écrans modaux
- Trois voies d'ajout : voix, illustration, saisie
- « On ne doit pouvoir vendre que ce qui est en stock »
- Renommer « Qu'est-ce que tu vends ? »

---

## 5. Comment nous répondre utilement

Pour chaque défaut, trois choses suffisent :

1. **L'écran exact** et ce que vous veniez de faire juste avant.
2. **Ce que vous attendiez** et ce qui s'est passé à la place.
3. **Une capture** si l'écran affiche quelque chose.

Et surtout : **dites la phrase exacte** que vous avez prononcée, mot pour mot.
C'est ce qui permet de reproduire — « il n'a pas compris » ne se reproduit pas.
