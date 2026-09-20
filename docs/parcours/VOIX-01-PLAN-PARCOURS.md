# VOIX-01 — Plan de parcours (proposition, non implémentée)

> **Statut : PLAN VALIDÉ le 20/09/2026. Les quatre arbitrages du §5 sont
> FIGÉS (voir §7). Le lot A est livré (voir §8).**

Dette d'origine : **VOIX-01 — continuité vocale de bout en bout du parcours de
vente** (registre maître, révision 13, première dette *produit* du registre).

Décisions du propriétaire (20/09/2026), reprises ici comme cadre :

- support **téléphone, portrait** ;
- maquette = **mélange** : la question de la verte (« Que voulez-vous
  vendre ? ») + le **gros micro** de l'orange ;
- **un seul paiement visible : espèces**. Crédit, Mobile Money et carte
  **absents** du pilote — pas grisés, absents ;
- **l'unité est obligatoire partout** : `500 F / tas`, `800 F / kg`,
  `300 F / pièce` ;
- principe : **une seule surface, un seul panier, un seul paiement, Tata
  toujours disponible** ;
- **le micro reste énorme et permanent pendant toute la vente**, pas seulement
  au début.

---

## 1. Ce qui existe déjà et qu'il ne faut pas réécrire

Vérifié dans le code de `main` (`2f34941`) avant d'écrire ce plan.

| Acquis | Où | Ce que cela change pour le plan |
|---|---|---|
| **Un seul panier** partagé voix/tactile | `CaisseContext.cart` ; `vendreVocalUnifie` appelle la **même** `addToCart` que le tactile | La « fusion » du panier est **déjà faite** (Lot 2). Rien à refaire. |
| **Unité portée par la ligne et figée à la vente** | `POSCaisse` l. 234 et l. 297 (`unite: i.unite`) | L'historique ne dépend pas du catalogue courant. Acquis ARG-02. |
| **Unité affichée** sur les tuiles et dans le panier | `FCFA/{p.unite}` (l. 663, 723) ; `ligneLisible(q, nom, unite)` (l. 580) | « Unité obligatoire partout » est **déjà vrai dans la caisse** — sauf deux trous, cf. §2.5. |
| **Unité dite à la voix** + garde-fou d'incompatibilité | `vendreVocalUnifie` l. 142-144, 197-198 (`phraseCompris`, `unite_incompatible`) | Tata sait déjà dire « le prix du kilo », et sait refuser « tas » sur un produit au kilo. |
| **Bloc encaissement complet** : total, montant reçu **en billets**, « Compte juste », monnaie à rendre **décomposée en coupures** | `POSCaisse` l. 173-205, 439-495 | Les étapes 6 et 7 du parcours cible **existent**. Ce qui manque, c'est qu'elles soient **sur la surface** et **dites spontanément**. |
| **Crédit / Mobile Money déjà derrière des drapeaux** | `CAISSE_CREDIT_ACTIF = false` (l. 32), `CAISSE_MOBILE_MONEY_ACTIF` | « Absents du pilote » est à **une ligne de distance**, pas à un chantier. |

**Conséquence : VOIX-01 n'est pas une réécriture de la caisse.** C'est la
suppression de quatre ruptures dans un parcours dont les briques sont déjà là.

---

## 2. Les ruptures réelles, nommées et localisées

### R1 — La voix s'arrête à l'entrée du panier
`VenteVocaleModal` ajoute la ligne au panier puis fait
`navigate('/marchand/caisse')`. À partir de cet instant, **il n'y a plus aucun
micro** : `POSCaisse` l. 618 porte le commentaire *« PAS DE MICROPHONE ICI, ET
C'EST VOLONTAIRE »*.

Ce commentaire a **raison sur son motif** (un micro inerte à côté d'un micro
vivant est pire que pas de micro : la marchande parlait, rien n'arrivait) et
**tort sur son remède**. Le remède n'était pas « aucun micro », c'était « un
seul micro, et il marche ». VOIX-01 consiste à appliquer le bon remède.

### R2 — Le repli est écrit
`SaisieGuidee.tsx` (227 l.) et `ConfirmationLigne.tsx` (162 l.) contiennent
**zéro `speak()`**. La relecture de Tata (« j'ai compris : 3 tas à 500, c'est
bon ? ») y est **affichée**, jamais dite.

C'est le pire endroit possible pour une information écrite : **c'est le chemin
pris précisément quand la dictée vient d'échouer.** On répond à une marchande
qui n'a pas été comprise… par du texte qu'elle ne lit pas.

### R3 — Aucune intention de paiement n'existe dans le code
`voice-offline/localIntent.ts` ne connaît que deux intentions : `vendre` et
`depense`. Aucune occurrence de « encaisser », « payer », « valide »,
« monnaie », « total » — vérifié par recherche, résultat vide.

Les étapes **5** (« dit *encaisser* ») et **8** (« dit *valide* ») du parcours
cible ne sont donc **pas à rebrancher : elles sont à créer.** C'est le seul
vrai travail neuf de VOIX-01.

### R4 — Sur téléphone portrait, la surface unique n'existe pas
`POSCaisse` a **deux dispositions** :

- `lg:` (grand écran) — grille produits **+ panier permanent à droite**
  (`<aside className="hidden lg:flex">`, l. 759), total et encaissement visibles
  en continu. **C'est déjà la maquette.**
- mobile — grille produits, barre flottante « Encaisser », et le panier **+ tout
  le bloc d'encaissement** dans un **panneau coulissant** (`showCart`, l. 789).

Le support retenu pour le pilote est **exactement celui qui n'a pas la surface
unique**. C'est la rupture la plus coûteuse des quatre, et elle n'est pas
vocale : elle est structurelle.

### R5 — La relecture n'est jamais spontanée
Total, « Compte juste », monnaie à rendre : chacun **parle quand on le touche**
(`onClick={() => dire(...)}`, l. 386, 473, 479). L'étape 7 du parcours cible
(« Elle doit 4 000. Elle t'a donné 5 000. Tu rends 1 000. ») n'est donc
prononcée **que si la marchande sait qu'il faut appuyer dessus**. Pour une
marchande non lectrice, une information qui n'existe que derrière un appui sur
un chiffre **n'existe pas**.

---

## 3. Le parcours cible, exprimé en états — pas en écrans

Une seule route (`/marchand/caisse`), **aucune navigation pendant la vente**.
Trois **moments**. Le micro est **au même endroit, à la même taille, aux trois
moments**. Ce qui change entre eux, c'est **ce que Tata demande** et **ce
qu'elle accepte d'entendre**.

### Moment 1 — « Dis-moi » (panier vide)
- Tata **demande** : « Que voulez-vous vendre ? » *(la question de la verte)*
- Micro **énorme, au centre**. *(le micro de l'orange)*
- Entrées acceptées : une vente dictée **ou** un appui sur une photo de produit.
- Sortie : une ligne entre au panier → **Moment 2**. Jamais de navigation.

### Moment 2 — « J'ajoute » (panier ≥ 1 ligne)
- Tata **relit à voix haute, spontanément** : « 3 tas de tomate, 1 500 francs.
  Total : 1 500 francs. » — avec **l'unité**, toujours.
- Micro **toujours là, même taille, même place**. Il ne rétrécit pas, il ne se
  déplace pas, il ne disparaît pas.
- Entrées acceptées : une vente de plus, **ou** « encaisser ».
- Le panier et le total sont **sur la surface**, pas derrière un bouton.

### Moment 3 — « Je rends » (encaissement ouvert, espèces uniquement)
- Tata **relit spontanément** : « Elle doit 4 000. »
- Le montant reçu se saisit **en billets** (l'existant, qui fonctionne) ou à la
  voix *(À DÉFINIR — §5.2)*.
- Dès que le montant reçu est connu, Tata **relit spontanément** : « Elle t'a
  donné 5 000. Tu rends 1 000. » — décomposée en coupures, comme aujourd'hui.
- Un seul bouton de paiement : **Payer en espèces**. Pas de crédit, pas de
  Mobile Money, pas de carte.
- Validation : le doigt sur « Payer en espèces », **ou** la voix *(À DÉFINIR —
  §5.1)*.
- Confirmation finale **dite ET affichée**.

**Règle transverse, vérifiable :** à aucun moment du parcours de vente il
n'existe un état où le micro est absent de l'écran. C'est ce qui rend VOIX-01
testable plutôt qu'opinable.

---

## 4. Découpage proposé en lots

Ordre choisi pour que **chaque lot soit vérifiable seul** et qu'aucun ne
dépende d'un lot ultérieur pour être honnête.

### Lot A — La surface (aucune voix nouvelle)
Faire exister, **en portrait**, la disposition que `lg:` a déjà : panier et
bloc d'encaissement **sur la surface**, plus dans un panneau coulissant.
Retirer crédit / Mobile Money / carte du pilote (les drapeaux existent).

*Pourquoi d'abord :* tant que l'encaissement est derrière un panneau, toute
voix ajoutée parlera **d'un écran qui n'est pas affiché**. On refabriquerait la
rupture en la rendant sonore.

*Preuve attendue :* en portrait, panier vide → panier rempli → encaissement,
**sans une seule navigation ni ouverture de panneau**.

### Lot B — Le micro permanent
Un micro unique, **énorme**, présent aux trois moments, au même endroit.
Suppression de l'entrée `VenteVocaleModal` → `navigate('/marchand/caisse')`
comme **seule** porte vocale.

*Preuve attendue :* un test qui parcourt les trois moments et **échoue si le
micro disparaît d'un seul d'entre eux**.

### Lot C — La grammaire de l'encaissement (travail neuf)
Étendre `localIntent.ts` avec une famille d'intentions **caisse** :
« encaisser », « combien elle doit », et *(selon §5.2)* « il m'a donné X ».
Module pur, testé comme les intentions existantes, **hors ligne d'abord**.

*Preuve attendue :* table de phrases réelles (avec leurs variantes ivoiriennes)
→ intention attendue, y compris les phrases qui **ne doivent pas** déclencher
un encaissement.

### Lot D — La relecture spontanée, et la fin du repli écrit
Tata dit d'elle-même le total, le reçu, la monnaie. `SaisieGuidee` et
`ConfirmationLigne` parlent enfin — ou disparaissent, absorbés par la surface
unique *(À DÉFINIR — §5.3)*.

*Preuve attendue :* aucune phrase de confirmation de ligne ou de monnaie
n'existe uniquement sous forme de texte. C'est la doctrine voix, appliquée à ce
parcours.

### Lot E — L'unité, partout sans exception
Deux trous mesurés, tous deux sur le **produit libre** (« Autre article ») :
- `POSCaisse` l. 161 : `unite: 'unite'` **en dur**, jamais demandée ;
- `vendreVocalUnifie` l. 180 : `unite: 'unité'` **en dur**, jamais demandée.

Dans les deux cas la marchande vend « quelque chose à 500 F » et l'unité est
inventée par le code. C'est petit, c'est faux, et c'est exactement le
« deux sens à la même donnée » que la doctrine interdit.

---

## 5. Points que je ne tranchais pas — TRANCHÉS le 20/09/2026

> Les quatre questions ci-dessous sont **fermées**. Les réponses de Patrick
> sont reportées telles quelles au §7. Le texte d'origine est conservé parce
> qu'il dit **pourquoi** la question se posait — c'est ce qui rend la décision
> relisible dans six mois.

### 5.1 — « valide » encaisse-t-il vraiment à la voix ?
L'étape 8 dit « **valide** ou touche Payer ». Je la mets en œuvre telle quelle
si c'est la décision, mais je dois signaler le risque avant, pas après : c'est
**le seul mot du parcours qui écrit de l'argent**. Un mot mal entendu au marché,
dans le bruit, encaisse une vente.

Trois options :
1. **la voix encaisse** — « valide » suffit (le plus fluide, le plus risqué) ;
2. **la voix prépare, le doigt termine** — « valide » ouvre l'encaissement et
   Tata demande confirmation, le doigt appuie (le plus sûr, un geste de plus) ;
3. **confirmation en deux temps à la voix** — Tata relit puis demande « je
   valide ? », et un second mot confirme.

**Je recommande la 3** : elle garde le parcours mains libres tout en exigeant
deux signaux vocaux concordants avant une écriture d'argent. **À toi de
trancher.**

### 5.2 — Le montant reçu à la voix fait-il partie du pilote ?
« Il m'a donné 5 000 » est du **chiffre dicté dans le bruit**, avec les mêmes
erreurs de reconnaissance que « cinq tomates » mal entendu sur le terrain. La
saisie **en billets** existe, fonctionne et ne se trompe pas.
Option A : billets seulement pour le pilote. Option B : voix + billets.
**Je recommande A pour le pilote**, et la voix ensuite, mesurée.

### 5.3 — Que devient le repli quand la dictée échoue deux fois ?
Aujourd'hui : `SaisieGuidee` (photos) puis `ConfirmationLigne`, tous deux
muets, et tous deux **hors de la surface**. Deux voies possibles :
- **les absorber** dans la surface unique (les photos sont déjà là, dans la
  grille produits) — cohérent avec « une seule surface », mais c'est plus de
  travail ;
- **les garder** comme repli et leur donner la voix (Lot D) — moins de travail,
  mais ça maintient deux endroits où la même chose se fait.
**Je recommande l'absorption**, mais c'est un arbitrage de périmètre, donc le
tien.

### 5.4 — L'accueil vocal reste-t-il la porte d'entrée ?
`MarchandAccueilVoice` ouvre `VenteVocaleModal`, qui redirige ensuite vers la
caisse. Si la caisse devient la surface unique, cette porte fait **deux
démarrages de vente** pour un seul parcours — et c'est peut-être l'origine des
**« deux voix différentes au début »** constatées sur le terrain. Option : que
« Vendre » depuis l'accueil ouvre **directement** la caisse au Moment 1.
*(Hypothèse non vérifiée : les deux voix n'ont pas encore été reproduites — cf.
§6.)*

---

## 6. Ce que ce plan ne couvre pas

- **Les deux voix au démarrage** et le **« cinq tomates » mal entendu** relevés
  sur le terrain ne sont **pas diagnostiqués**. Le 🐞 *Rapport de test* de
  l'application (`utils/voiceDebug.ts`) capture le catalogue de voix françaises
  du téléphone **et** le journal de dictée : il transformerait ces deux
  observations en données en une seule manipulation. Tant qu'il n'est pas
  envoyé, toute correction serait une correction « parce que ça semble faux ».
- **Aucune maquette n'est produite ici.** Ce document décrit un **parcours**,
  pas des écrans — conformément à la consigne.

---

## 7. Les arbitrages, figés le 20/09/2026

Décisions de Patrick, reprises sans reformulation :

1. **« valide » peut encaisser à la voix, mais uniquement en deux temps.**
   Tata relit d'abord : « Elle doit 4 000. Elle t'a donné 5 000. Tu rends
   1 000. Je valide ? » Puis il faut une **seconde réponse explicite**, par
   exemple **« Oui, valide »**. **Un simple « oui » ne doit jamais suffire.**
   Le bouton **Payer en espèces** reste toujours disponible et appelle
   **exactement la même fonction métier**.
2. **Montant reçu : billets uniquement pour le pilote.** Pas de « il m'a donné
   5 000 ». La voix peut annoncer le total, demander de compter, dire chaque
   coupure touchée et annoncer la monnaie — elle **ne transcrit pas un montant
   financier libre dans le bruit**. À rouvrir après mesure terrain.
3. **Repli après échec : absorption dans la surface unique.** Après un ou deux
   échecs, Tata dit « Je n'ai pas compris. Choisis avec la photo. » et **la
   grille produits de la même caisse devient le repli**. « Autre article »
   reste sur cette même surface. Pas de couture supplémentaire.
4. **L'accueil ouvre directement la caisse au Moment 1.** Le bouton **Vendre**
   ouvre `/marchand/caisse`, Tata demande « Que voulez-vous vendre ? », le gros
   micro est déjà actif sur cette surface. Le chemin
   `Accueil → VenteVocaleModal → Caisse` disparaît du parcours pilote.
   *Précision de Patrick : cela ne prétend pas expliquer les « deux voix »
   observées — ce défaut reste à diagnostiquer séparément, avec le rapport de
   test.*

**Cible fonctionnelle figée :**

> **Surface portrait unique.**
> **Vendre ouvre directement la caisse.**
> **La voix peut conduire tout le parcours, sauf la saisie du montant reçu qui
> reste par billets pour le pilote.**
> **Toute écriture d'argent vocale exige une confirmation en deux temps.**
> **Le repli après échec reste sur la même surface.**

**Contrainte posée sur le lot A :** il doit rester **purement structurel** — il
ne touche **ni aux intentions vocales, ni au moteur STT, ni à l'argent
backend**.

---

## 8. Lot A — livré le 20/09/2026

### Ce qui a changé

| Avant | Après |
|---|---|
| Sur téléphone, le panier **et tout l'encaissement** (total, montant reçu, coupures, monnaie, « Payer en espèces ») vivaient dans une **feuille coulissante** `showCart` | Ils sont **sur la page**, sous les produits, dans une `<section className="lg:hidden">` qui rend **les mêmes** `renderCartLines()` / `renderCartFooter()` que le panneau grand écran |
| Un **bouton panier** dans l'en-tête et une **barre flottante « Encaisser »** servaient de poignées pour ouvrir cette feuille | Supprimés tous les deux : un bouton qui n'ouvre plus rien n'a pas à rester |
| La grille produits était entière : le panier qui la suit aurait été à plusieurs écrans de défilement | La grille se replie à **quatre vignettes** sur téléphone, avec **« Voir plus »** qui **déplie sur place** (jamais une navigation). Au-dessus de 1024 px la grille reste entière, le panier étant à côté |
| La **ligne de panier ne portait pas l'unité** — elle n'existait, sur téléphone, que dans la barre flottante supprimée. Le panier disait « 3 » : trois quoi ? | Chaque ligne affiche son unité (`uniteSeule`), comme l'étiquette produit (`500 F / tas`) et comme le reçu |

Le crédit, le Mobile Money et la carte étaient déjà absents du pilote
(`CAISSE_CREDIT_ACTIF = false`, `CAISSE_MOBILE_MONEY_ACTIF = false`) : rien à
faire, et rien n'a été touché.

### Ce qui n'a PAS été touché
Aucune intention vocale, aucun moteur STT, aucune écriture d'argent backend,
aucun changement sur `/marchand/caisse` côté route. `handlePay` est **identique
au caractère près**. Le lot A ne déplace que **l'endroit où les choses sont
affichées**.

### Preuve
- **Garde-fou de source** `caisseSurfaceUnique.test.mts`, suite **`verify`**
  (jamais `test:ci`, gelée) : 13 assertions — plus aucun `showCart`, plus
  aucun `bottomAction`, la section téléphone rend **les lignes ET le pied**,
  `renderCartLines`/`renderCartFooter` rendus **exactement deux fois** (une
  logique, deux dispositions), l'unité sur la ligne, « Voir plus » sans
  navigation, la règle CSS d'aperçu bornée sous 1024 px.
- **Reproduction** : le même garde-fou lancé contre la source **d'avant** le
  lot A donne **8 échecs**. Il ne se contente donc pas de décrire l'état
  actuel — il aurait attrapé le défaut.
- `npm run verify` verte, `npm run test:ci` (gelée) verte, `npm run build` OK.

### Ce que cette preuve ne dit pas
**Aucune capture sur un vrai téléphone.** Le garde-fou prouve que la feuille
n'existe plus dans le code ; il ne prouve pas que la page est agréable à
faire défiler avec une cliente qui attend. **Cela se juge sur l'APK, pas en
CI.** À vérifier au prochain APK : que « Payer en espèces » soit atteignable
sans défilement interminable quand le panier a six lignes.

### Reste à faire pour VOIX-01
Lots **B** (micro permanent aux trois moments), **C** (grammaire
d'encaissement dans `localIntent`), **D** (relecture spontanée et fin du repli
muet), **E** (unité sans exception sur le produit libre). **La dette reste
OUVERTE.**

---

## 9. Lot B — étude préalable, et l'arbitrage qu'elle fait remonter

> **Rien n'est codé pour le lot B.** Cette section est le résultat de la
> lecture du code, faite après le lot A. Elle s'arrête sur une décision qui
> appartient à Patrick.

### Ce que « le micro permanent » demande réellement

Le micro qui marche n'est pas un bouton : c'est tout le moteur vocal de
`VenteVocaleModal` (537 lignes). Il tient à `useVoiceCore`, alimenté par un
contexte d'une vingtaine de champs (caisse du jour, ventes, dépenses, session
ouverte, prénom, genre, langue, objectif, progression, top stocks, dernier
produit…), plus un adaptateur `onAction` qui appelle `vendreVocalUnifie`, plus
le repli `SaisieGuidee`, plus la proposition de création de produit.

**Prérequis structurel mesuré :** ce moteur exige les providers
`RaccourcisProvider` et `ObjectifProvider` (et `RapportHebdoProvider` sur
l'accueil). `MarchandAccueilVoice` et `GestionStock` les montent tous les
deux ; **la route `/marchand/caisse` n'en monte aucun.** Poser le micro sur la
caisse sans les monter ne donnerait pas une erreur bruyante : `useObjectif()`
et `useRaccourcis()` retombent sur des valeurs nulles, et on obtiendrait un
micro **qui a l'air de marcher**. C'est exactement le piège que le commentaire
de `POSCaisse` dénonçait.

### L'arbitrage qui remonte

L'arbitrage n°4 sort `VenteVocaleModal` du parcours de vente pilote. Mais ce
composant a **un second appelant** : `GestionStock.tsx` l'ouvre avec un
`initialProduct` (vendre depuis la fiche d'un produit). Il ne peut donc pas
simplement disparaître. Trois voies, et le choix n'est pas technique :

1. **Extraire le moteur** dans un hook partagé (`useVenteVocale`) monté par la
   caisse **et** par le modal, qui reste pour `GestionStock`. Plus sûr, plus
   long ; deux surfaces vocales coexistent un temps.
2. **Déplacer le moteur dans la caisse** et faire de `GestionStock` un simple
   « ouvrir la caisse avec ce produit déjà dicté ». Plus proche de la cible
   « une seule surface » ; touche un écran hors périmètre du lot.
3. **Monter les providers sur la route caisse** et dupliquer temporairement le
   câblage. Le plus rapide, et le plus cher ensuite : deux moteurs vocaux à
   maintenir, c'est la dette VOIX-01 qu'on recrée ailleurs.

*Ma recommandation était la 1. **Patrick a tranché la 2**, et a corrigé ce
plan au passage : « avec la voie 2, je ne demanderais pas d'extraire le moteur
dans un hook partagé. Ce serait contradictoire : le moteur doit converger vers
la caisse, pas être abstrait pour continuer à alimenter deux surfaces. » Sa
raison sur `GestionStock` : « le second appelant est précisément la preuve qui
justifie cette petite extension de périmètre » — ce n'est pas du périmètre qui
déborde, c'est le périmètre réel de la dette.*

### Ordre de travail proposé pour le lot B, une fois la voie choisie

1. Monter les providers manquants sur la route `/marchand/caisse`.
2. Extraire le moteur (voie retenue) **sans changer un seul comportement** —
   `VenteVocaleModal` doit continuer de fonctionner à l'identique, c'est la
   preuve que l'extraction n'a rien cassé.
3. Poser le micro sur la surface caisse, présent aux **trois moments**.
4. Basculer « Vendre » de l'accueil vers `/marchand/caisse` (arbitrage n°4).
5. Garde-fou : un test qui **échoue si le micro disparaît d'un seul des trois
   moments**, et un autre qui échoue si un micro est rendu **sans** que le
   moteur soit monté au-dessus de lui.

---

## 10. Lot B — livré le 20/09/2026 (voie 2)

### Ce qui a changé

| Avant | Après |
|---|---|
| La voix vivait dans `VenteVocaleModal` — un écran séparé qui, la ligne une fois au panier, renvoyait vers la caisse, **où il n'y avait plus aucun micro** | `MicroVenteCaisse.tsx` : le moteur vocal (`useVoiceCore` + l'adaptateur `vendreVocalUnifie`) et le gros micro orange sont **dans le même composant**. Le bouton ne peut pas exister sans son moteur |
| La route `/marchand/caisse` ne montait **aucun** des providers du moteur | `POSCaisse` monte `RaccourcisProvider` et `ObjectifProvider` au-dessus de l'écran |
| « Vendre » depuis l'accueil ouvrait l'écran vocal, qui renvoyait ensuite à la caisse — **deux démarrages pour un parcours** | « Vendre » ouvre **directement** `/marchand/caisse` |
| « Vendre » depuis la fiche d'un produit ouvrait ce même écran vocal | Il navigue vers la caisse avec le produit dans l'**état de route** (`produitPreselectionne` : nom, prix, unité, image) |
| Le repli tactile (`SaisieGuidee`) s'ouvrait dans l'écran vocal, ailleurs | Il s'ouvre **sur la surface caisse** (arbitrage n°3), au-dessus de la grille de photos qui est déjà là |
| `VenteVocaleModal.tsx`, 537 lignes | Supprimé. Zéro appelant restant, vérifié fichier par fichier |

### Le micro « présent aux trois moments », rendu vérifiable
Il est rendu **sans aucune condition** — ni sur l'état du panier, ni sur celui
de l'encaissement. Le garde-fou lit la ligne de rendu et **échoue** si elle
porte un `&&`, un ternaire, ou si la ligne au-dessus ouvre une condition.
C'est ce qui transforme « la voix ne disparaît jamais » d'une intention en un
fait qu'une machine sait contrôler.

### Le piège que ce lot devait éviter, et pourquoi il était réel
`useObjectif()` et `useRaccourcis()` **ne lèvent aucune erreur** sans leur
provider : ils retombent sur des valeurs nulles. Poser le micro sans monter
les providers aurait donné **un micro qui a l'air de marcher** — la marchande
parle, rien n'arrive. C'est mot pour mot le défaut que `POSCaisse` documentait
depuis des mois. Le garde-fou vérifie donc les providers, pas seulement le
bouton.

### Preuve
- `caisseMicroPermanent.test.mts`, suite **`verify`** (jamais `test:ci`) : les
  **cinq points** demandés — le produit qui voyage avec nom, prix et unité ;
  l'accueil qui mène à la caisse ; le micro câblé à son moteur **et** à ses
  providers ; son absence de condition ; l'absence totale d'appelant de
  l'ancien écran, cherchée fichier par fichier dans tout `src/`.
- **Reproduction** : lancé contre la source **d'avant** le lot → **13 échecs**,
  et il nomme les deux importeurs (`GestionStock`, `MarchandAccueilVoice`).
- `typecheck`, `verify`, `test:ci` (gelée) et `build` verts.

### Une erreur que ce garde-fou a attrapée — la mienne
Mon premier nettoyeur de commentaires retirait les commentaires JSX
`{/* … */}` **avant** les blocs `/* … */`. Sur `interface Props {` suivi d'un
JSDoc, la forme « accolade, commentaire, accolade » matchait jusqu'à la
première accolade fermante suivant un `*/` : **10 000 caractères avalés,
moteur vocal compris**. Le test a échoué là où le code était juste. Corrigé en
retirant les blocs d'abord — et le commentaire du test dit pourquoi, pour que
personne ne réintroduise l'ordre inverse.

### Ce que cette preuve ne dit pas
**Aucune dictée réelle sur un téléphone.** Le garde-fou prouve le câblage ; il
ne prouve pas que « cinq tomates » est reconnu, ni que les « deux voix » au
démarrage ont disparu. Ces deux observations du terrain **restent non
diagnostiquées** — le 🐞 *Rapport de test* de l'application reste l'artefact
qui les transformerait en données.

### Reste à faire pour VOIX-01
Lots **C** (grammaire d'encaissement : « encaisser », puis la confirmation en
deux temps de l'arbitrage n°1), **D** (relecture spontanée du total, du reçu
et de la monnaie ; fin du repli muet dans `SaisieGuidee` et
`ConfirmationLigne`), **E** (unité sans exception sur le produit libre).
**La dette reste OUVERTE.**

---

## 11. Lot B2 — le défaut que le lot B avait laissé passer (20/09/2026)

### Le constat, de Patrick
Contre-audit de `9cb89a5` : *« Le produit présélectionné arrive bien dans
POSCaisse, puis dans MicroVenteCaisse, et il sert à la question d'ouverture
ainsi qu'au repli SaisieGuidee. Mais il n'est pas utilisé par le moteur vocal
pour compléter une commande de vente. »* Exact — et c'est **la couture même
que le lot B prétendait avoir fermée** : l'écran savait qu'on parlait de
tomate, la voix l'avait oublié.

### Ce que ça donnait vraiment, mesuré
`vendreVocalUnifie(undefined, 3, 0, …)` avec Tomate à 500 F le tas au
catalogue :

```
panier   : []
Tata dit : « Je n'ai pas compris le prix. Redis-moi combien tu as vendu. »
```

Ce n'était donc pas seulement un contexte perdu : **l'application redemandait
un prix qu'elle connaissait déjà**, et la vente n'existait pas.

### La règle, et sa limite
`preselectionVente.ts`, module pur, appliqué aux **deux** chemins de vente (la
vente directe et le raccourci résolu en vente — c'est le même acte métier) :

- **la parole prime toujours.** « deux kilos d'oignons » après avoir touché
  Tomate vend des oignons : ce qu'elle dit est plus récent, donc plus vrai,
  que ce qu'elle a touché ;
- **seul le NOM est repris.** Ni l'unité ni le prix de la fiche ne sont
  injectés : les forcer court-circuiterait `resoudrePrixVocal`, celui qui
  refuse de vendre un « tas » au prix du kilo. Une fois le nom connu, le
  catalogue fournit le reste comme pour n'importe quelle vente dictée ;
- **sans parole et sans présélection, Tata redemande.** On n'invente jamais un
  produit. Ce cas est testé, pour que le repli ne devienne pas une devinette.

### Preuve
- `preselectionVente.test.mts` (suite **`verify`**) joue les trois cas exigés à
  travers la **vraie chaîne** — `produitPourVente` puis `vendreVocalUnifie` —
  et non sur la seule fonction de décision : c'est le chaînage qui était cassé,
  pas la règle.
- **Reproduction** : la fonction ramenée au comportement de `9cb89a5` donne
  **7 échecs**, pendant que les cas « parole explicite » et « sans
  présélection » **restent verts** — le correctif ne change que ce qu'il doit.
- Deux assertions de câblage ajoutées au garde-fou du lot B, **rouges elles
  aussi sur `9cb89a5`**.
- `typecheck`, `verify`, `test:ci` (gelée), `build` verts.

### Une phrase fausse, corrigée sans en faire un lot
Le commentaire de `GestionStock` disait l'état de route « lisible dans l'URL
de navigation ». C'est faux : l'état de React Router n'est pas inscrit dans
l'adresse et **ne survit pas à un rechargement de page**. Le mécanisme reste
le bon pour ce geste immédiat ; c'est la phrase qui mentait sur ses
propriétés — et un commentaire faux finit toujours par servir d'argument.

### Ce que cette preuve ne dit pas
Toujours **aucune dictée réelle**. Ces tests prouvent que la chaîne transporte
le bon produit ; ils ne prouvent pas que « trois tas » est reconnu par le
téléphone de Jeanne.

---

## 12. Lots C, D, E — contre-audit (20/09/2026, `a947f2a`)

> Contre-audit transverse, fait sur le **code** de `a947f2a`, pas sur les
> messages de commit ni sur les rapports des agents. Aucune ligne applicative
> n'a été modifiée ; les défauts trouvés sont **reproduits, mesurés, et laissés
> ouverts** au registre (révision 17). Scripts jetables hors dépôt.

### 12.1 Ce qui est PROUVÉ

**Le chemin d'argent à la voix a une seule porte, et elle tient.**

- `machineEncaissement.ts` : **un seul** `type: 'encaisser'` dans tout le
  fichier (l. 218), gardé par cinq conditions conjointes (l. 211-216) :
  `phase === 'attente_confirmation'`, `memeEmpreinte(etat.empreinte,
  fin.empreinte)` (total, reçu, composition triée du panier), `!panierVide`,
  `suffisant`, `total > 0`. La branche `etat_financier_change` (l. 148-181)
  ne rend que `rien` ou `dire` : elle **ne peut pas** émettre `encaisser`.
- `POSCaisse.tsx` : `handlePay` (l. 241) a **exactement deux appelants** —
  le bouton « Payer en espèces » (`onClick={handlePay}`, l. 671) et l'effet
  `encaisser` (`void handlePay()`, l. 366). Le verrou `paiementEnCoursRef`
  est **dans** `handlePay` (l. 242), donc couvre les deux. `enregistrerVente`
  n'a **qu'un** appelant dans `POSCaisse` (l. 279). Le `bloque` du bouton
  (l. 660-662 : `isProcessing`, reçu insuffisant, opérateur MM manquant) est
  **strictement inclus** dans les gardes de `handlePay` : la voix ne peut pas
  contourner un état où le bouton est gris.
- `suffisant` vocal = `recu > 0 && !insuffisant` (l. 335) : la voix **refuse
  le reçu à 0** que le bouton accepte.
- `MicroVenteCaisse.tsx` : 0 `handlePay`, 0 `enregistrerVente`, aucun état
  de confirmation financière ; l'intention est transmise et le gestionnaire
  **s'arrête** (`return`, l. 187). `useVoiceCore` ne parle pas sur une
  intention contournée (`bypassed`, l. 569-604) : la seule voix de
  l'encaissement est celle de la machine.
- **Énumération exhaustive relancée** (`test:machine-encaissement`) :
  2 560 000 conversations, 19 312 paiements émis, **0 sans relecture exacte
  du même compte juste avant**.

**Attaque du critère de fermeture** (« aucune phrase vocale ne peut écrire de
l'argent sans confirmer EXACTEMENT l'état financier qu'elle vient de
relire »), script jetable important `reduire`, `empreintePanier`,
`ETAT_INITIAL`, état financier construit **comme POSCaisse le construit**
(l. 328-345). Résultats mesurés, `encaisser` émis / attendu :

| Cas | Séquence | Mesuré |
|---|---|---|
| a | « encaisse » (reçu 0) → billet 5 000 → relecture 4 000/5 000 → panier passe à 6 000 → « oui valide » | **0 paiement** ; Tata : « Elle doit 6 000 francs. Touche les billets » ; après billet 1 000 → relecture 6 000/6 000 → « oui valide » → 1 paiement, **de l'état relu** |
| a2 | idem, reçu 10 000 couvrant les deux totaux | le changement relit d'elle-même 6 000/10 000 ; le « oui valide » suivant paie **6 000**, jamais 4 000 |
| b | 2 tomates à 1 000 relues, panier recomposé en 1 tomate à 2 000 (même total) → « oui valide » | **rejet** : « Le compte a changé… » (empreinte `tomate:2:2000` ≠ `tomate:1:2000`) |
| c | reçu 5 000 relu, « oui valide » avec reçu 6 000 | **rejet**, relecture du nouveau compte |
| d | double « oui valide » sur le même état | **1 seul** paiement ; le second relit |
| e | « oui valide » au repos | **0 paiement**, relecture puis attente |
| f | reçu 0, panier plein, « encaisse » puis 3 × « oui valide », puis attente **forgée** sur reçu 0 | **0 paiement** dans les quatre cas |
| g | relecture puis panier vidé puis « oui valide » (y compris attente forgée) | **0 paiement**, « Ton panier est vide » |
| h1 | retrait puis ré-ajout d'une ligne → empreinte identique à celle relue | chaque changement **relit** ; le paiement final porte l'état relu |
| h2 | mêmes lignes dans l'autre ordre | empreinte triée : paiement légitime |
| h3 | total flottant (500/3 × 3) puis 500,4 : empreinte arrondie identique, `total` différent | **rejet** (le `total` de l'empreinte est comparé en plus des lignes) |
| h4 | « non » puis « oui valide » | **0 paiement** |
| h5 | « combien elle doit » entre relecture et « oui valide » | lecture seule, l'attente survit, 1 paiement |
| h6 | attente forgée avec reçu insuffisant | **rejet** |
| h7 | « encaisse » deux fois puis « oui valide » | 1 paiement |
| h8 | paiement, panier vidé, **nouveau panier identique** + billets, « oui valide » sans nouvel « encaisse » | **0 paiement** (repos → relecture d'abord) |

**17 scénarios, 0 violation.** Une « violation » est apparue au premier
passage sur (a) : elle était dans **mon attendu** (j'avais compté 0 paiement
pour toute la séquence alors que le second « oui valide » suivait une
relecture fraîche de 6 000/6 000). Corrigée dans le script, dite ici.

**Les garde-fous mordent.** Rejoués sur la source d'avant, dans un worktree
temporaire : `repliParle` sur `f0c965c` → **14 échecs** (annoncé 14) ;
`choixUnite` sur `f7d1916` (composant existant, non posé) → **3 échecs**
(annoncé 3) ; `caisseEncaissementVocal` sur `f0c965c` → **plante à l'import**
(`INTENTIONS_ENCAISSEMENT` n'existe pas encore) et, avec la grammaire et la
machine actuelles copiées, **30 échecs** (annoncé 28 : le chiffre dépend de
la version des modules purs copiés ; rouge dans les deux cas).

**Gelée intacte.** `git diff f0c965c..HEAD -- frontend_src/package.json` :
la ligne `test:ci` est **inchangée** ; les sept scripts ajoutés sont tous dans
`verify`. `git grep '<<<<<<<\|>>>>>>>' HEAD` : **vide**.

**Batterie relancée** : `tsc -b` 0 · `verify` 0 · `test:ci` 0 · `build` 0 ·
`test-cible-tactile` 0 (ce script ne teste **que** la barre de recherche ;
`ChoixUnite` l. 69-70 et `BoutonReecouter` l. 55 sont à ≥ 44 px **par
lecture**, pas par ce script).

**Lot E sur ses deux trous nommés** : `POSCaisse` `unite: libreUnite`
(l. 195, choisi par `ChoixUnite`, l. 1127) ; `vendreVocalUnifie` l. 193
`unite: uniteParlee ?? 'unité'` via `uniteEntendue` (« kilos » → `kg`).

### 12.2 Ce que le contre-audit a TROUVÉ (reproduit, laissé ouvert)

**VOIX-02 — « oui je valide pas » écrit de l'argent.** La grammaire lit
`AFFIRMATION_PUIS_VALIDE` (l. 83-85) avant tout sauf `ANNULATION` (l. 92),
et `ANNULATION` ne connaît pas « pas » seul (seulement « pas encore »). À
l'oral, le « ne » tombe : « oui je valide pas », « oui valide pas », « oui,
je valide pas » sont lus **`oui_valide`**. Traversée mesurée : grammaire →
`intentLocal` → machine en `attente_confirmation` sur l'état relu → effet
**`encaisser`** → `handlePay`. Le critère de Patrick est **respecté à la
lettre** (l'argent écrit est exactement l'état relu) et **contredit dans son
esprit** : Tata demande « Je valide ? », elle répond non, ça paie. Le
commentaire de la grammaire (« le doute profite TOUJOURS au refus ») décrit
une règle que le code ne tient pas sur cette forme. Dégât borné : les billets
ont été touchés, le montant est celui qu'elle vient d'entendre ; il reste une
vente enregistrée contre un refus dit, à annuler ensuite. Pas corrigé ici.

**Autres phrases ordinaires qui déclenchent la grammaire** (aucune n'écrit
d'argent sans relecture — c'est la machine qui protège, pas la grammaire) :
« oui je valide mon panier plus tard » → `oui_valide` ; « ma cliente a dit
oui valide », « oui valide la dépense » → `oui_valide` ; « c'est bon on
encaisse demain », « encaissement » → `encaisser` (ouvre une préparation,
n'écrit rien) ; « le total du jour », « total », « mon total » →
`combien_doit` (Tata répond sur la dette de la cliente, pas sur la journée —
lecture seule) ; « j'ai laissé 500 francs » → `annuler_validation`
(sans coût). **Ne déclenchent rien, comme voulu** : « oui », « d'accord »,
« valide », « ok valide », « ça va valider », « ouais c'est ça », « combien
j'ai vendu aujourd'hui », « elle a validé hier », « il m'a donné cinq
mille ». **Manqués (faux négatifs, sans risque)** : « oui c'est bon je
valide », « oui je la valide », « oui alors valide », « oui madame valide »,
« oui ma chérie valide » → `null` → « je n'ai pas bien compris ».

**`localIntent`, nuance d'annulation différée — mesurée** : « attends, vends
deux tomates à 500 francs » → `vendre` (tomate, 2, 500) ✔ ; « vends trois
tas de tomates non mûres » → `vendre` ✔ ; « non, pas valide » →
`annuler_validation` ✔. **« encaisse deux tomates à 500 » → `encaisser`** :
la vente portée par la phrase est **perdue** (la grammaire gagne avant
`extraire`). Pas silencieux — Tata relit le panier tel qu'il est ou dit
« Ton panier est vide » — mais la ligne n'entre pas. Acceptable pour un
pilote ? **À trancher** (§12.3).

**VOIX-03 — un second micro vivant sur la surface de vente, qui ne sait ni
l'unité ni « encaisse ».** `/marchand/caisse` est rendu sous `AppLayout`
(`routes.tsx` l. 58), qui monte `BottomBar` (`AppLayout` l. 116) partout sauf
sur `hiddenPaths` (l. 81) — la caisse n'y est pas. `BottomBar` affiche sur
téléphone (`lg:hidden`) un **bouton rond vert « Tata »** (l. 76-88) qui ouvre
`TantieSagesseModal`, lequel vend dans le **même panier** par
`vendreVocalUnifie(nomParle, quantite, montant)` **sans transmettre l'unité
dictée** (l. 85-86, 128-131). Mesuré, même phrase « vends deux tas de gombo
à 500 » : micro de la caisse → ligne `unite: "tas"`, Tata dit « 2 tas de
gombo » ; micro vert → ligne **`unite: "unité"`**, Tata dit « 2 gombos ».
L'agent du lot E l'avait signalé hors lot ; le contre-audit établit que ce
chemin est **atteignable par une marchande, sur la caisse elle-même, dans le
pilote**. Ce micro ne déclare pas `onIntentionEncaissement` : « encaisse »
dit dedans passe par `intentLocal` (partagé) → `encaisser` → non contourné →
`executerActionTataMarchand` → `not_handled` → **rien** (lecture du code ;
la phrase exacte qu'il prononce alors n'est pas mesurée — hypothèse). C'est
le motif même de VOIX-01 (« deux voix », un micro qui ne finit pas la
vente), reformé sur la surface que le lot B rendait unique. Non corrigé ici.

### 12.3 Décisions qui appartiennent à Patrick

1. **`speak` vs `dire` dans le bloc machine** (`POSCaisse` l. 365 et 393).
   Raison écrite par l'agent : « la relecture EST la garantie : une
   marchande qui dit “encaisse” et n'entend rien dirait “oui valide” sans
   avoir entendu le compte qu'elle confirme ». Le contre-audit ajoute un
   fait qui pèse : **le texte de la relecture n'est affiché nulle part**
   (« rien n'est rendu à partir de cet état », l. 351). Deux lectures :
   - *`speak` (état actuel)* : en profil « lecture », la caisse parle quand
     même — mais seulement en réponse à une phrase que la marchande a
     elle-même dite, et la confirmation en deux temps reste réelle. Coût :
     une voix automatique dans un profil qui l'a refusée, et une
     **incohérence** : « deux mille francs » (coupure), « Il manque… »,
     « Vente enregistrée » restent muets (`dire`) tandis que la relecture
     parle.
   - *`dire`* : en profil « lecture », « encaisse » ne produirait **ni son ni
     texte**, la machine passerait quand même en attente, et « oui valide »
     paierait un état qu'elle n'a **ni entendu ni lu**. Ce serait
     l'arbitrage n°1 vidé de son sens dans ce profil.
   Ni l'une ni l'autre n'est un défaut de code ; c'est une **décision
   produit** (et, si `speak` est retenu, décider si la relecture doit aussi
   s'afficher). Rien au registre.
2. **VOIX-02** : ajouter « pas » au voisinage de « valide » à l'annulation
   (ou toute autre règle) — ce n'est pas au contre-audit de choisir la forme.
3. **« encaisse deux tomates à 500 »** perd la ligne : accepter pour le
   pilote, ou faire gagner la vente et différer « encaisser » comme
   l'annulation ?
4. **VOIX-03** : masquer le micro vert sur `/marchand/caisse`, ou lui faire
   transmettre l'unité et les intentions d'encaissement, ou le retirer du
   parcours marchand pilote. Trois voies, une seule règle : **un micro qui
   marche, pas deux dont un qui ne finit pas la vente**.
5. **Statut de VOIX-01** : le contre-audit la laisse **OUVERTE** (§12.4) ;
   Patrick peut requalifier la gravité de VOIX-02/VOIX-03 et décider si
   elles bloquent l'APK.

### 12.4 Verdict sur VOIX-01 et ce que ce contre-audit NE prouve PAS

**VOIX-01 reste OUVERTE**, pour deux raisons précises et pas une de plus :
(1) une phrase de **refus** écrit de l'argent sur le chemin même du lot C
(VOIX-02) ; (2) un second micro sur la surface de vente perd l'unité et ne
sait pas finir la vente (VOIX-03) — le lot E n'est donc pas « sans
exception » sur un chemin atteignable, et le lot B n'est pas « un seul
micro ». Tout le reste — surface unique, micro permanent, machine à porte
unique, relecture spontanée, repli parlé, unité sur les deux trous nommés —
est **vérifié dans le code et mesuré**.

Ce que ce contre-audit ne prouve pas :
- **Rien n'a été entendu sur un vrai téléphone.** Ni la reconnaissance de
  « oui valide » dans le bruit, ni l'ordre réel des phrases quand deux
  `speak` se suivent dans la même frame (coupure puis relecture), ni si la
  synthèse coupe la précédente. La séquence du point 8 du brief est déduite
  du code : « encaisse » (reçu 0) → *« Elle doit 4 000 francs. Touche les
  billets qu'elle te donne. »* → billet 2 000 → *« deux mille francs »*
  (`dire`) puis *« Il manque 2 000 francs. »* (`dire`, lot D) → billet 2 000
  → *« deux mille francs »* puis *« Elle doit 4 000 francs. Elle t'a donné
  4 000. Compte juste. Je valide ? »* (`speak`, machine ; lot D se tait) →
  billet 1 000 → *« mille francs »* puis *« Elle doit 4 000 francs. Elle t'a
  donné 5 000. Tu rends 1 000. Je valide ? »* → « oui valide » → aucune
  phrase de la machine (texte vide), `handlePay`, *« Vente enregistrée.
  4 000 francs »* (`dire`). **Aucune phrase dite deux fois, aucune étape
  muette en profil voix** ; en profil « lecture », tout est muet sauf les
  trois relectures de la machine (cf. décision 1).
- React n'est pas monté par les garde-fous : que le `useEffect` sur
  l'empreinte s'exécute avant qu'une phrase suivante soit traitée est une
  propriété de React, pas une preuve de ces tests. La machine, elle,
  rejette de toute façon une empreinte périmée (cas c, h6).
- La réaction exacte du micro vert à « encaisse » (VOIX-03) est lue, pas
  mesurée.
- Les « deux voix au démarrage » du terrain restent **non diagnostiquées** ;
  VOIX-03 est une **hypothèse** plausible de leur origine, pas un diagnostic.

---

## 13. Contre-audit n°2 — VOIX-02 et VOIX-03 sur `df17cc7` (20/09/2026)

> Même méthode qu'au §12 : code lu, tests relancés, garde-fous rejoués sur
> la source d'avant (`a947f2a`), attaques par scripts jetables hors dépôt.
> Aucune ligne applicative modifiée. Le lot F (visuel) travaille en parallèle
> sur une autre branche : rien de lui ici.

### 13.1 VOIX-02 — la liste blanche tient

**Ce qui a changé** (`99d8ef8`) : `grammaireEncaissement.ts` remplace les deux
regex `AFFIRMATION_PUIS_VALIDE` / `VALIDE_PUIS_AFFIRMATION` par
`REPONSES_VALIDATION` (l. 92-101), **huit réponses autonomes**, et compare la
**phrase entière** normalisée (l. 139 : `has(t.trim())`). L'annulation reste
testée avant (l. 134). `normaliser` (l. 76-85) : minuscules, NFD sans
diacritiques, apostrophes `'’\`` → `'`, `.,!;:?` → espace, `\s+` → un espace.

**Attaque** — 71 phrases, chacune traversée grammaire → `intentLocal` →
`reduire` **sans** relecture puis **après** relecture (état 4 000 / 5 000) :

| Famille | Exemples | Résultat |
|---|---|---|
| Doublons, concaténations | « oui valide oui valide », « oui valide, oui valide », « oui valide\noui valide », « valide oui valide », « oui oui valide », « oui valide oui » | **null** |
| Refus, objets, discours rapporté | « oui je valide pas », « oui valide pas », « oui c'est bon valide pas », « oui valide la dépense », « ma cliente a dit oui valide », « oui on valide plus tard » | **null** |
| Chiffres, ventes collées | « oui valide 2 », « oui valide 2 tomates », « 2 oui valide » | **null** |
| Ponctuation non aplatie | « oui-valide », « oui valide… », « « oui valide » », « (oui valide) », « oui valide / », « oui valide - », « oui valide " » | **null** (le caractère reste dans la phrase, elle ne matche plus) |
| Homoglyphes, largeur nulle | « ouı valide » (ı sans point), « oui vаlide » (а cyrillique), « ｏｕｉ ｖａｌｉｄｅ », « oui​valide » (U+200B) | **null** |
| Formes verbales hors liste | « oui valider », « oui validation », « oui validez », « oui valid », « oui vali de » | **null** |
| **Variantes acceptées** (22) | casse « OUI VALIDE » ; accent « oui validé », « Oui, Validé. », accent combinant ; ponctuation **finale** « oui valide. », « ! », « ? », « ; », « : » ; apostrophe typographique / backtick « oui c’est bon valide » ; espaces multiples, tabulation, **NBSP U+00A0 et U+202F** ; « oui valide ca », « oui valide çà » ; les huit entrées | `oui_valide` |

**Bilan : 22 acceptées, toutes des variantes de normalisation d'une des huit
entrées ; 0 phrase non autonome acceptée ; `encaisser` sans relecture : 0 ;
`encaisser` après relecture : 22 (une par phrase acceptée, jamais deux).**
Deux tolérances à connaître, pas des défauts : « oui validé » (participe) et
« oui valide çà » (« çà » → « ca ») valent « oui valide ».

**Faux négatifs réalistes du marché — limites consignées** : « oui c'est bon
je valide », « oui valide ma chérie », « oui Tata valide », « oui valide
hein », « oui valide vas-y », « hm hm valide », « ouais c'est bon valide »,
« oui d'accord valide », « oui valide ma fille », « c'est bon valide »,
« valide valide », « oui je valide ça » → `null` → « je n'ai pas bien
compris », l'attente reste ouverte, elle redit. C'est le prix d'une liste
fermée, et c'est le choix de Patrick.

**Garde-fous rejoués sur `a947f2a`** : `grammaireEncaissement.test.mts`
**12 échecs** (annoncé 12) ; `caisseEncaissementVocal.test.mts` **7 échecs**
(annoncé 7). **Machine : 0 ligne de diff** entre `a947f2a` et `df17cc7`.

### 13.2 Cas mixte « encaisse + … » — mesuré, 17 phrases

`localIntent.ts` : « encaisse » et l'annulation sont **différés** ; une vente
ou une dépense extraite gagne ; « encaisse » suivi d'un **produit** vaut verbe
de vente (`venteParEncaisse`, l. 100-101).

| Phrase | Vendu | Encaissé | Perdu |
|---|---|---|---|
| « encaisse », « on encaisse », « encaisse la vente » | — | oui | — |
| « encaisse deux tomates à 500 » | tomate ×2, 500 | non | l'encaissement (elle redit « encaisse ») |
| « encaisse deux gombos à 500 » | **gombo ×2, 500** (gombo est connu d'`extraire`, contrairement à l'hypothèse du brief) | non | idem |
| « encaisse trois tas de tomate à 1500 » | tomate ×3, 1 500, **unité tas** | non | idem |
| « encaisse deux kilos d'oignon à 800 » | oignon ×2, 800, unité kilos | non | idem |
| « encaisse deux tomates » | tomate ×2, prix catalogue | non | idem |
| « encaisse 500 francs de tomate » | tomate, 500 | non | idem |
| « deux tomates à 500 encaisse », « termine la vente deux tomates à 500 », « vends deux tomates à 500 et encaisse » | tomate ×2, 500 | non | idem |
| « encaisse 500 », « encaisse cinq mille » | — | oui, **chiffre ignoré** | le chiffre (limite documentée : montant reçu dicté hors périmètre) |
| « encaisse dépense 2000 transport » | — (dépense 2 000) | non | l'encaissement |
| **« encaisse la tomate »** | **tomate ×1, prix catalogue** | non | l'encaissement — **et le sens** : « encaisse la tomate » voulait sans doute dire « encaisse la vente de tomate » ; ça ajoute une tomate au panier |
| « encaisse deux tomates à 500 non » | — | non | tout : `annuler_validation` (le « non » gagne sur la vente, par construction) |

Aucune de ces phrases n'écrit d'argent. Deux **limites** à consigner :
« encaisse la tomate » ajoute une ligne (décision de forme : un produit sans
quantité ni prix après « encaisse » pourrait rester un encaissement) ; une
phrase « vente + encaisse » n'enchaîne pas l'encaissement, elle le redemande.

### 13.3 VOIX-03 — un seul moteur vocal sur la caisse, vérifié par lecture

- `routes.tsx` l. 58-60 : `/marchand` → `AppLayout` ; `caisse` → `POSCaisse`,
  **sans route enfant**.
- `BottomBar.tsx` : `ROUTES_SANS_TATA = ['/marchand/caisse']`, `tataMasquee =
  ROUTES_SANS_TATA.includes(location.pathname)` ; bouton + étiquette sous
  `{!tataMasquee && (…)}` ; modale sous `isOpen={isTantieOpen && !tataMasquee}`.
- **Autres portes vers un second moteur, toutes fermées sur la caisse** :
  `TantieSagesseModal` n'a **qu'un** monteur (`BottomBar` l. 133) ; le
  **double-tap global** (`AppContext` l. 1198-1210, `touchend`) et **Alt+V**
  (l. 1213-1218) ne font que lever `globalVoiceOpen`, que `BottomBar` retombe
  sur `isTantieOpen` — modale masquée ; `POSCaisse` n'importe ni `SearchBar`
  (qui porte un `useVoiceCore`) ni `TantieSagesseModal` ; le seul
  `useVoiceCore` monté sur la caisse est celui de `MicroVenteCaisse`
  (l. 154). Sur grand écran, `BottomBar` est `lg:hidden` de toute façon.
- **Les autres routes marchandes gardent le bouton** : seule la caisse est
  dans la liste ; `hiddenPaths` d'`AppLayout` (l. 81) est inchangé.
- **Égalité stricte de `pathname`** : les six appelants (`GestionStock`,
  `MarchandAccueilVoice`, `VentesPassees`, `RoleDashboard`, `roleConfig`,
  `BottomBar`) naviguent tous vers `/marchand/caisse` **sans** slash final ni
  sous-chemin ; la query n'est pas dans `pathname`. Une future sous-route
  `/marchand/caisse/…` ne serait **pas** masquée — risque faible, noté, pas un
  défaut aujourd'hui.
- **Observation non mesurée** : un double-tap sur la caisse met `isTantieOpen`
  à `true` sans ouvrir la modale ; à la **prochaine** route, elle s'ouvrirait
  sans geste. Hypothèse par lecture, à regarder sur téléphone.
- Garde-fou `caisseUnSeulMicro.test.mts` (suite `verify`) rejoué sur
  `a947f2a` : **5 échecs** (annoncé 5).

### 13.4 Batterie et gelée

`tsc -b` 0 · `verify` 0 (dont `test:caisse-un-seul-micro`) · `test:ci` 0 ·
`build` 0. `test:ci` **identique** à `f0c965c` (diff : 0 ligne). Marqueurs de
conflit : la seule occurrence de `<<<<<<<` dans `HEAD` est le motif grep
écrit en clair dans le §12 de ce document — pas un conflit.

### 13.5 Verdicts

- **VOIX-02 : FERMÉ.** Aucune phrase non autonome n'entre ; 0 paiement hors
  liste ; garde-fous rouges sur la source d'avant.
- **VOIX-03 : FERMÉ.** Plus aucun second moteur vocal atteignable sur la
  caisse, par aucune des quatre portes (bouton, modale, double-tap, clavier).
- **VOIX-01 : OUVERTE**, sur un point unique tranché par Patrick : la
  relecture financière est **dite** (`speak`, conservé) mais **n'est affichée
  nulle part** (`POSCaisse` l. 351). Elle doit l'être, **dérivée du même
  snapshot de machine** que la voix — prévu après le lot F. Rien d'autre ne
  retient la dette.

### 13.6 Ce que ce contre-audit ne prouve pas

Toujours **aucune dictée réelle** : la liste blanche est jugée sur des chaînes,
pas sur ce que le STT du téléphone rend de « oui valide » dans le bruit — un
STT qui produit « oui, valide » ou « oui validé » passe ; un STT qui produit
« oui valide » suivi d'un mot parasite ne passe pas, et c'est voulu. Le
comportement de la modale « fantôme » après double-tap (13.3) est une lecture,
pas une mesure. Les « deux voix au démarrage » du terrain restent non
diagnostiquées ; VOIX-03 en était une hypothèse, sa fermeture ne la vérifie
pas.
