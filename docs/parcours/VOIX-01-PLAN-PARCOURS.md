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
