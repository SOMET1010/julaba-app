# VOIX-01 — Plan de parcours (proposition, non implémentée)

> **Statut : PROPOSITION SOUMISE À VALIDATION.** Aucun code applicatif n'est
> modifié par ce document. Rien n'est écrit dans `frontend_src/` tant que
> Patrick n'a pas validé ce plan et tranché les points « À DÉFINIR ».

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

## 5. Points que je ne tranche pas — « À DÉFINIR »

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

*Document de travail. Rien n'est implémenté. En attente de validation et des
quatre arbitrages du §5.*
