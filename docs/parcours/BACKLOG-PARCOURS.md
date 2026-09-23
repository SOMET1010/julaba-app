# Backlog du parcours marchand — ce qu'on suit à chaque passe

**Source de vérité des défauts : le banc terrain**, pas une impression.
`cd frontend_src && node apercu-caisse/banc-terrain.mjs` — 30 écrans, catalogue
vide, sans réseau, 390 × 844, `NODE_ENV=production`. Le rapport de référence est
versionné : `docs/parcours/captures/banc-terrain/banc-terrain.json`.

**Trois statuts, pas quatre.** `FERMÉ` · `OUVERT` · `HORS PÉRIMÈTRE JUSTIFIÉ`.
Documenter une dette ne la ferme pas. Fermer une dette impose de nommer les
dettes voisines ; aucune dette ne se ferme par effet de bord.

**La méthode, à chaque passe :**

1. Le banc mesure. On ne corrige pas ce qu'on n'a pas vu rouge.
2. Rouge d'abord — un test qui échoue, puis la correction.
3. Batterie complète avant de pousser : `verify`, `test:ci` (figé, jamais
   allongé), `check-tsc-baseline`, `build`, `garde-argent --preuve`.
4. Capture 390 × 844 AVANT / APRÈS dans `docs/parcours/captures/<sprint>/`.
5. Ce fichier est mis à jour dans le MÊME commit que la correction.

---

## Sprint en cours

### S1 — Écran 4, Accueil / comptoir · l'écran étalon

Périmètre arrêté par Patrick : **l'accueil seul**. Pas de migration de charte,
pas de tutoiement transversal, logique métier conservée.

| Id | Défaut relevé par le banc | Statut |
|---|---|---|
| ACC-01a | **Silence** — `0 demande au montage`. L'écran vu à chaque ouverture ne disait rien. | **FERMÉ** |
| ACC-01b | **2 impasses** — « Écouter Tata dire bonjour » et « Écouter le message de bienvenue » touchés, rien ne bougeait. | **FERMÉ** |
| ACC-01c | **Faux `0 F`** — « Ma caisse aujourd'hui : 0 F » alors que rien n'avait pu être lu. | **FERMÉ** |
| ACC-02 | **Les modales de l'accueil.** La partie qui **ÉCRIT** est fermée : la clôture refuse de calculer un écart sur une caisse non lue, et le fond n'est plus pré-rempli à zéro. Les 9 chiffres encore **AFFICHÉS** ne mentent plus en silence — les deux modales portent un bandeau qui dit qu'on n'a pas pu lire. | **FERMÉ** (ce qui écrit) · plafond à 9 pour ce qui s'affiche |
| ACC-01b′ | **Double lecture du bonjour** — le clip ET la clé étaient lancés l'un après l'autre : là où le clip est embarqué, Tantie parlait deux fois en même temps. `direAccueilMarchand` rapporte désormais ce qu'il a fait (`doitDireLeTexte`) ; le composant ne devine plus. | **FERMÉ** |
| ACC-05 | **`playClip` jette son résultat.** `audioManager.playClip` rend `Promise<void>` : un clip dont le fichier manque de l'APK se résout silencieusement en `failed` et nous parvient comme « joué » — le texte ne rattraperait pas. Corriger demande un `playClipRapporte` dans `services/audioManager.ts`, **figé par VOICE-01** contre `3917bb7`. Le type porte déjà les trois issues : un mot à changer le jour où c'est desserré. | **OUVERT** — desserrer une garde est une décision de Patrick |
| ACC-03 | Le vouvoiement transversal (7 écrans, 6 clés). | **HORS PÉRIMÈTRE JUSTIFIÉ** — arbitrage Patrick en attente : `frMarche` appartient à Manus, et `caisseCharte.test.mts` fige le H1. |
| ACC-04 | La charte hors caisse (27 écrans à 0 jeton). | **HORS PÉRIMÈTRE JUSTIFIÉ** — « aucune refonte graphique dans ce lot ». |

**Preuve de fermeture** (banc, écran 4, sans réseau) :

```
avant : 0 jet… 0 au montage, 2/15 au geste   2 impasses · ZÉRO QUI MENT
après : 17 jet  1 au montage, 5/15 au geste   impasses : aucune
        zéro : rien à reprocher — l'écran n'affirme aucun vide chiffré
```

Captures : `docs/parcours/captures/ecran-4/AVANT.png` · `APRES.png`.

Garde-fous posés (dans `verify`, **jamais** dans `test:ci`) :
`test:caisse-accueil-etat` (la règle, pure) · `test:accueil-honnete` (l'écran
s'en sert, et ACC-02 ne s'étend pas) · `test:accueil-une-sortie` (quatre situations,
jamais deux voix pour un seul geste).

### S2 — Écran 1, Akwaba · le premier écran du téléphone

| Id | Défaut relevé par le banc | Statut |
|---|---|---|
| AKW-01a | **Muet** — `0 demande au montage`. Le premier écran ne disait pas bonjour. | **FERMÉ** |
| AKW-01b | **1 impasse /2** — « Écouter Tantie Nanti Lou » touché, rien ne bougeait. | **FERMÉ** |
| AKW-02 | **La voix était refusée avant connexion.** `AppContext.speak` écarte tout ce qui n'est pas `role === 'marchand'` (`role-non-marchand`) — or sur cet écran personne n'est connecté. Contourné ici en remettant la clé de catalogue au moteur audio directement. Les écrans 2 et 3 ont le même plafond. | **OUVERT** — à traiter avec les écrans 2–3 |
| AKW-03 | **La règle de disponibilité des clips existe à deux endroits** — `onboardingVoix.ts` (figé VOICE-01) et `entreeAkwabaVoix.ts`. Un test relit le fichier figé et refuse la divergence, mais deux copies restent deux copies. | **OUVERT** — se referme si VOICE-01 est desserrée (décision Patrick) |
| AKW-04 | Charte : `0 jeton --caisse-*` sur `Welcome.tsx`. C'est la seule cause de la sortie rouge du banc sur cet écran. | **HORS PÉRIMÈTRE JUSTIFIÉ** — « ne fais pas encore la migration générale de charte » |

**Preuve de fermeture** (banc, écran 1, sans réseau) :

```
avant : MUET (0 au montage, 0 au geste)              1 impasse /2
après : 1 au montage, 1/2 au geste                   impasses : aucune
        « Akwaba. Pour vendre, touche un produit, ou parle à Tantie Nanti Lou.
          On est ensemble. »
```

Captures : `docs/parcours/captures/ecran-1/AVANT.png` · `APRES.png`.
Garde-fou : `test:akwaba-voix` (quatre situations, une seule sortie, et la
règle figée surveillée sans être desserrée).

### S3 — Écran 2, Tantie se présente

| Id | Défaut relevé par le banc | Statut |
|---|---|---|
| TNT-01a | **Muet au montage** — le design disait « Tata LIT l'écran toute seule » ; sans clip, personne ne prenait le relais. | **FERMÉ** |
| TNT-01b | **Muet sous les trois éléments**, dont « Réécouter Tantie Nanti Lou » — un bouton qui promet de répéter et ne répète rien. | **FERMÉ** |
| TNT-02 | **La présentation partait de deux endroits** — `Welcome.commencer` la lançait pour « accompagner » l'écran suivant, qui la dit désormais lui-même. Avec un clip, la seconde source supplanterait la première en plein milieu. Une seule source maintenant : l'écran 2. | **FERMÉ** |
| TNT-03 | Charte : `0 jeton --caisse-*`. Seule cause restante de la sortie rouge du banc. | **HORS PÉRIMÈTRE JUSTIFIÉ** |

**Preuve de fermeture** (banc, écrans 1 et 2, sans réseau) :

```
écran 2 avant : MUET (0 au montage, 0/3 au geste)
écran 2 après : 1 au montage, 3/3 au geste, impasses aucune
                « Je serai avec toi chaque jour dans ton commerce. Tu peux
                  toucher l'écran. Tu peux aussi écouter. On est ensemble. »
écran 1        : inchangé — 1 au montage, 2/2 au geste, impasses aucune
ZÉRO REFUS des deux côtés : AKW-02 respectée, on ne passe pas par la garde de rôle.
```

Captures : `docs/parcours/captures/ecran-2/AVANT.png` · `APRES.png`.
Le module de voix de l'entrée a été renommé AVANT ce lot, dans un commit qui ne
fait que cela : `entreeAkwabaVoix` → `entreeVoixAvantConnexion`. Il ne sert pas
qu'Akwaba ; le nom devait cesser de mentir.

### S4 — Écran 3, Ton numéro

| Id | Défaut relevé par le banc | Statut |
|---|---|---|
| NUM-01a | **Muet** — `0 demande au montage`, 0 sous les quatorze éléments. L'écran qui explique le geste ne l'expliquait qu'à l'écrit. | **FERMÉ** |
| NUM-01b | **1 impasse /14** — « Écouter Tantie Nanti Lou » touché, rien ne bougeait. | **FERMÉ** |
| NUM-02 | **La relecture du numéro composé n'a pas de repli parlé, et n'en aura pas.** `direEntreeTexte` sert aussi à relire « 0 7 0 9… » : lui donner une voix de secours ferait prononcer le numéro de la marchande à voix haute, au marché. Un test l'interdit explicitement. | **HORS PÉRIMÈTRE JUSTIFIÉ** — fermée par construction |
| NUM-03 | **Le pavé numérique est silencieux.** Les dix chiffres mènent quelque part (`mene: true`) mais aucun ne parle, alors que la consigne promet « les ronds en haut vont se remplir ». Le banc ne le compte pas comme un défaut ; pour une marchande qui ne lit pas, c'en est un. | **OUVERT** — hors périmètre de ce lot, nommé pour ne pas être perdu |
| NUM-04 | Charte : 0 jeton `--caisse-*`, 46 couleurs en dur. Seule cause restante de la sortie rouge du banc. | **HORS PÉRIMÈTRE JUSTIFIÉ** — « ne traite pas encore les 46 couleurs en dur » |

**Preuve de fermeture** (banc, écran 3, sans réseau) :

```
avant : MUET (0 au montage, 0/14 au geste)      1 impasse /14
après : 1 au montage, 1/14 au geste             impasses : aucune
        « Tape les chiffres de ton numéro, un par un. Les ronds en haut
          vont se remplir. »
ZERO REFUS : AKW-02 respectée.
```

Captures : `docs/parcours/captures/ecran-3/AVANT.png` · `APRES.png`.
Garde-fou : `test:entree-numero-voix`. Ici le fichier n'était **pas** figé par
VOICE-01 : correction sur place, sans module parallèle et sans règle en double.

### S5 — Écran 5, Caisse · le dernier du chemin

| Id | Défaut relevé par le banc | Statut |
|---|---|---|
| CAI-01 | **Faux « Aucun produit »** — l'écran de VENTE a demandé au serveur, n'a rien obtenu, et affirmait quand même. Une marchande qui lit ça range son téléphone. | **FERMÉ** |
| CAI-02 | **Vouvoiement, à l'écran ET à voix haute** — « Que voulez-vous vendre ? » était le grand titre ET la phrase dite au montage ; « Je vous écoute » dans la bulle. | **FERMÉ** |
| CAI-03 | **La question vivait en double** — en dur dans le H1 et dans le catalogue. C'est par là que le vouvoiement a survécu à l'oral après avoir été vu à l'écran. Le H1 lit désormais la clé. | **FERMÉ** |
| CAI-04 | **Le périmètre d'argent avait bougé** : `etatCatalogueCaisse.ts` y est entré (symbole `CaisseContext`). Le gel demandé a été fait par Patrick le 22/09 (`c2a5e49`, « figeage du perimetre et des empreintes — autorise par Patrick ») : le fichier est au noyau depuis, et le garde est vert. **Le backlog l'a affirmée ouverte pendant un jour de plus qu'elle ne l'était** — relu et corrigé au recensement du 23/09. | **FERMÉ** |
| CAI-05 | **Une assertion figée avait été retirée** : `caisseCharte.test.mts` figeait le littéral « Que voulez-vous vendre ? » comme H1. Remplacée par une assertion PLUS forte (le H1 lit la clé `TATA_QUE_VENDRE`), le compte avait bougé. Regelé par Patrick le 22/09 dans le MÊME commit `c2a5e49`. L'empreinte porte aujourd'hui les DEUX assertions (le H1 par la clé, et « le vouvoiement n'est plus écrit nulle part »), et le garde dit « aucune assertion retirée ». Même correction de recensement que CAI-04. | **FERMÉ** |
| CAI-06 | Le catalogue servi depuis le cache du téléphone est modélisé (état `memoire`) mais pas encore montré : une liste périmée est présentée comme à jour. | **OUVERT** — hors périmètre de ce lot (« pas de dettes voisines ») |

**Preuve de fermeture** (banc, écran 5, sans réseau) :

```
avant : ZERO QUI MENT (« Aucun produit ») · vouvoie (écran ET voix)
après : sortie 0 — muet non · impasses aucune · zero.ment false · vouvoie false
        charte.ok TRUE (499 jetons) — premier écran entièrement vert du parcours
        « Que veux-tu vendre ? »
```

Captures : `docs/parcours/captures/ecran-5/AVANT.png` · `APRES.png`.
Gardes : `test:catalogue-caisse-etat` · `test:caisse-tutoie`.

**Le banc lui-même était faux** : sa `preuve` attendait la phrase vouvoyante.
Corrigé — la preuve suit l'écran, jamais l'inverse.

### S6 — La journée de caisse, et le micro de la vente

Ouvert par la recette terrain v1.0 (matrice de Patrick) et par une capture de
son téléphone le 22/09.

| Id | Défaut | Statut |
|---|---|---|
| CAI-02 | **On pouvait vendre ET annuler après la clôture** (MAR-CAI-002 / MAR-CAI-003, BLOQUANTS). Ce n'était pas une garde manquante : `ensureSessionOuverte` faisait `DO UPDATE SET ouvert = true` à chaque vente et chaque dépense — il **rouvrait** la journée sans toucher aux trois nombres du soir. | **FERMÉ** |
| VOX-01a | **Le micro écoutait 60 s** sans jamais détecter la fin de phrase. D'où le paragraphe de six lignes. L'écran du numéro avait ce mécanisme depuis toujours ; celui de l'argent n'avait rien. | **FERMÉ** |
| VOX-01b | **« J'ai compris » était un mensonge** : il s'affichait sur une simple transcription. | **FERMÉ** |
| VOX-01c | **L'écran montrait la sortie brute de la machine.** | **FERMÉ** |
| CAI-09a | `caisseTheorique` additionne aussi `acompte_credit` et `reglement_credit`. Leurs routes ne passaient pas par la garde de CAI-02. Le trou ne venait pas d'un oubli mais d'un RANGEMENT : `exigerJourneeOuverte` était une méthode **privée** de `CaisseRestController`, et `CreditsController` — autre classe, même module — ne pouvait pas l'atteindre. Une règle rangée dans un objet ne protège que cet objet. | **FERMÉ** |
| CAI-09b | **DETTE VOISINE, trouvée en relisant les routes** : `POST /caisse/credits` avec `acompte > 0` appelle la MÊME primitive `encaisserCredit` et écrit donc la même ligne `acompte_credit`. Fermer `payer` et `acompte` en laissant celui-là, c'était fermer la porte et laisser la fenêtre. | **FERMÉ** |
| CAI-09c | **Et la garde se prouve des deux côtés** : noter une dette **sans** acompte ne déplace aucun argent et reste possible après la clôture. Refuser là aussi aurait fait PERDRE l'information — la marchande n'aurait écrit le crédit nulle part. | **FERMÉ** |
| CAI-09d | **Le fichier qui PORTAIT la règle n'était pas dans le périmètre d'argent.** `journee-ouverte.ts` décide si une écriture d'argent passe, mais il ne nommait aucun des 36 symboles déclarés : le noyau restait à 88 fichiers et le modifier n'exigeait aucun invariant. **Arbitrage de Patrick du 23/09 : fermer.** Symbole `exigerJourneeOuverte` ajouté à la zone `enregistrement-vente`, `--figer-perimetre` relancé **par décision explicite de Patrick**. Noyau 88 → 89. | **FERMÉ** |
| HIS-01a (MAR-HIS-001) | **« Ce mois » affichait « Aujourd'hui tu as gagné… »** — `ResumeCaisse.tsx:334`. Les chiffres venaient bien de la période choisie ; c'est la PHRASE qui mentait sur ce qu'ils comptaient. « Aujourd'hui » et « Résumé du jour » étaient écrits en dur, à deux endroits. | **FERMÉ** |
| HIS-01b | **DETTE VOISINE, trouvée en fermant la première** : la phrase DITE assemblait ses trois montants avec `toLocaleString('fr-FR')`, puis partait à `speak(texte)`. L'espace fine insécable (U+202F) atteignait le moteur, qui épelait « trois zéro zéro zéro ». C'est la faute fermée le 22/09 sur la caisse (`deuxFormes`), encore vivante sur le résumé. | **FERMÉ** |
| DEP-02a (MAR-DEP-001) | **La catégorie de dépense n'était enregistrée nulle part.** La marchande TOUCHE « Taxe mairie » — le seul geste qu'une non-lectrice puisse faire — et ce choix était aplati dans `description`. La colonne `category` de `caisse_transactions` existait et restait vide sur chaque dépense. Chaîne rompue en quatre endroits : l'écran, le contexte, la route, la projection de lecture. | **FERMÉ** |
| DEP-02b | **Et l'écran la RECONSTRUISAIT par mots-clés français** (`detectCat`). L'écran propose onze catégories, la table en connaissait neuf : « Taxe mairie » (aucun mot-clé) devenait « Autre », « École » tombait sur le mot-clé de FAMILLE. Deux des onze choix ne pouvaient pas revenir tels qu'elle les avait faits. | **FERMÉ** |
| DEP-02c | **`Transaction.category` contenait le MOTIF en minuscules** (« taxe mairie »), et le camembert « dépenses par catégorie » de `ResumeCaisse` groupait dessus. Un champ nommé « catégorie » qui portait du texte libre. De plus, une projection sur deux ne le lisait pas du tout : après rechargement, la donnée disparaissait. | **FERMÉ** |
| MAR-DEP-001 (mots) | « + Noter une dépense » → « + Faire une dépense » (2 endroits) ; « Changer » → « Changer la catégorie de dépense ». Le **libellé** de la dépense était déjà fermé par `5259490`. | **FERMÉ** |
| DEP-03 | « Dernier taxe mairie : — » — l'historique de l'écran 2 colle le motif après « Dernier » sans accord. Vu à la capture 390×844 en fermant DEP-02. Dette VOISINE nommée, pas fermée. | **OUVERT** |
| STK-01a (MAR-STK-002) | **« Erreur lors de l'enregistrement du prix produit ».** `PUT /caisse/produits/:id` était un REMPLACEMENT COMPLET déguisé en modification : aucun `COALESCE` sur `nom`, `prix`, `prix_achat`, `categorie`, `stock`, `unite`. `nom` étant NOT NULL, corriger un prix seul renvoyait **500**. | **FERMÉ** |
| STK-01b | **Et la faute inverse, silencieuse** : `prix` étant NULLABLE, une modification du seul stock (`updateProduct(id, { stock })`, deux appels dans `GestionStock`) **effaçait le prix** sans erreur. Le produit restait en rayon sans prix. | **FERMÉ** |
| STK-01c | **`RETURNING *` puis `result[0]` sur un UPDATE.** `dataSource.query` rend `[lignes, nombre]` sur un UPDATE et les lignes sur un INSERT : la route répondait `{ produit: [ {…} ] }` sur un succès, et **200 `{ produit: [] }`** quand l'id n'était pas à la marchande. L'écran affichait « Produit mis à jour » sur une modification qui n'avait pas eu lieu. | **FERMÉ** |
| STK-01d | **`Number('')` vaut zéro.** L'écran remet le champ à `''` quand la marchande l'efface ; vider la case du prix l'aurait écrit à **zéro**, et le produit serait parti en caisse à zéro franc. Dette VOISINE trouvée en fermant STK-01a. | **FERMÉ** |
| MAR-VTE-001 | « Son clip Tata Nanti Lou n'est pas encore enregistré » — `useVoiceCore.ts:355`, **figé par VOICE-01**. | **OUVERT** — desserrage = décision de Patrick |
| CAI-08 | **« Choisir à l'écran »** : Patrick a mis **deux heures** à comprendre. Deux fautes en quatre mots — « choisir » ne nomme aucun geste (on choisit avec la tête), « à l'écran » ne distingue rien (la voix aussi part d'un bouton à l'écran). Et l'accueil annonçait DÉJÀ « Parler ou toucher les produits » : un geste, deux langues. **Arbitrage de Patrick du 22/09 : « Toucher les produits ».** L'étiquette lue et le texte vu sont désormais la même phrase. | **FERMÉ** |
| CAI-10 | **L'icône du bouton était un CLAVIER** (`Keyboard`, lucide) alors qu'il dit « Toucher les produits » et qu'il ouvre une grille de photos où l'on n'écrit rien. Pour une marchande qui ne lit pas, l'icône n'accompagne pas le message : elle EST le message, et c'est le seul qu'elle reçoive. **Arbitrage de Patrick du 23/09 : une icône du toucher, pas de l'écriture.** → `Hand` : le geste de son corps, celui que la phrase nomme déjà. | **FERMÉ** |
| CAI-11 | **Un troisième nom pour le même geste** : le panneau ouvert par ce bouton s'intitulait « SAISIR SANS PARLER » (`SaisieGuidee.tsx:183`). Deux fautes, les mêmes qu'à CAI-08 : « saisir » n'est pas un geste de la main (on saisit au clavier, on ne saisit pas un légume), et « sans parler » se définit par ce qu'on NE fait pas — ce qui ne dit toujours pas quoi faire. → « TOUCHER LES PRODUITS », au mot près comme le bouton. | **FERMÉ** |
| CAI-07a | **Deux « J'ai compris » simultanés à l'écran**, remesuré le 23/09 : REPRODUIT, VOX-01 n'avait pas fermé la cause. Deux blocs FRÈRES du même `<section>` de `MicroVenteCaisse` (bandeau vert l.656 ; `SaisieGuidee` → `ConfirmationLigne` l.730), aucune des deux conditions ne mentionnant l'autre. La formule avait DEUX SENS en même temps : « j'ai extrait une vente de ta phrase » (passé, peut-être échoué) et « voici ce que je vais enregistrer, confirme » (engage l'argent). Pour une non-lectrice, le premier contredit le second à l'instant où elle décide. **Arbitrage de Patrick du 23/09 : un seul à la fois ; le bandeau micro est transitoire et disparaît dès que `SaisieGuidee` s'ouvre ; ne pas maquiller les libellés pour contourner.** | **FERMÉ** |
| CAI-07b | **Et l'écran ouvrait le second LUI-MÊME** : `signalerBlocage` (vente comprise, prix introuvable) fait `setSaisieOuverte(true)` — sans aucun geste de la marchande. Le commentaire d'alors décrivait déjà l'état sans y voir un défaut (« se terminait en silence absolu SOUS le bandeau J'ai compris ») : on avait ajouté un panneau sous le premier au lieu de retirer le premier. | **FERMÉ** |
| CAI-07c | **ÉNONCÉ CORRIGÉ AU RECENSEMENT DU 23/09 — la première rédaction était FAUSSE.** Elle disait que `useVoiceCore` « ne remet JAMAIS `transcript` à `''` ». C'est inexact : il le vide en deux endroits (`reset()` l.542, câblé sur le bouton « Parler encore à Tantie » ; et `startRecording()` l.941, à chaque nouvelle dictée). La mesure d'origine avait filtré les lignes portant un `//`, et ces deux lignes en portent une. **Ce qui reste vrai, et c'est plus étroit** : `transcript` n'est vidé qu'au DÉBUT du cycle suivant, jamais à la FIN du cycle en cours. Une vente partie au panier laisse donc « J'ai compris : 3 tomates » affiché — un état passé présenté au présent — jusqu'à ce qu'elle reparle ou touche le bouton. Depuis CAI-07, ce bandeau est au moins SEUL à l'écran. | **OUVERT** — Patrick, 23/09 : « je ne rouvrirais pas CAI-07c maintenant » |

**Preuve de fermeture de STK-03** (les quatre cas exigés par Patrick) :

```
rouge avant : ✗ SaisieGuidee ne lit plus la liste des 37 tuiles en dur
              ✗ et ne lit plus AUCUN `prixVente` du catalogue générique
              ✗ elle lit l'étal de la marchande
après       : [1] son Gombo à 700 → tuile à 700, SON unité « tas », et surtout
                  pas le 400 du catalogue générique
              [2] étal vide → ZÉRO tuile ; un produit sans prix d'elle n'a pas
                  de tuile non plus — il n'y a rien à poser
              [3] « Pas dans la liste ? » toujours là : un produit neuf ne
                  bloque personne
              [4] plus aucune lecture de CATALOGUE_PRODUITS ni de `prixVente`
```

TROUVÉ EN FERMANT : le paramètre de `choisirProduit` s'appelait `prixVente` —
le nom du champ du catalogue. Un mot qui désigne deux choses finit par les
confondre ; renommé `prixDelle`.

Les deux fonctions du catalogue qui restent (`getImageByNom`,
`rechercherProduitCatalogue`) ne servent plus qu'à retrouver une **image** par
son nom. Jamais un prix.

**Preuve de fermeture de CAI-10 + CAI-11** (un seul lot : c'est UNE règle, pas
deux — le garde de CAI-08 a été ÉTENDU plutôt que doublé, deux gardes sur un
même geste, ce serait deux règles) :

```
rouge avant : ✗ plus de « SAISIR SANS PARLER »
              ✗ « saisir » ne sert plus de titre
              ✗ le panneau nomme le geste avec LES MÊMES MOTS
              ✗ aucun titre en creux (« sans parler »)
              ✗ l'icône du bouton n'est plus un clavier — c'est « Keyboard »
              ✗ et elle ne dit pas « écrire »
après       : [5] le panneau porte le même nom que le bouton — 4 ✓
              [6] l'icône dit le même geste que la phrase — 4 ✓  (« Hand »)
              et les 7 règles de CAI-08 restent vertes
```

LE GARDE NE FIGE PAS UNE PHRASE, il vérifie la RÈGLE : le geste porte le même
nom partout (bouton vu, étiquette lue, titre du panneau), le verbe est un geste
de la main, et l'icône ne dit pas « écrire ». Une reformulation reste possible
sans desserrer la garde ; un quatrième nom, non.

**Aucune logique métier ni d'argent modifiée** : trois libellés et une icône.

**Preuve de fermeture de CAI-07** (le chemin exact demandé par Patrick :
« deux gombos » → prix manquant → saisie guidée → prix → Vérifier) :

```
rouge avant : ✗ plus de bandeau « J'ai compris » pendant la saisie
              ✗ la bulle revient au repos
              ✗ zéro « J'ai compris » venant du micro
              ✗ À L'INSTANT DE LA DÉCISION FINANCIÈRE : 2 « J'ai compris » (attendu 1)
              ✗ jamais deux à la fois, à aucun instant
              ✗ l'appel à afficheEcoute reçoit saisieOuverte
après       : comptage instant par instant du parcours réel
                elle parle                   → 0
                micro seul, compris          → 1
                saisie ouverte (saisie)      → 0
                saisie ouverte (confirm.)    → 1   ← celui qui engage l'argent
                micro rouvert sur saisie     → 0
```

LE REPLI QU'ON N'A PAS PRIS : laisser la suite retomber sur « Je n'ai pas
compris » (la transcription n'est pas vide) aurait remplacé un doublon par un
MENSONGE — elle AVAIT compris, et c'est pour ça que la saisie s'est ouverte.
Repos. Et le test l'exige explicitement.

Le fait `saisieOuverte` est **requis**, jamais optionnel : un appelant qui
l'oublierait retomberait en silence sur l'ancien comportement, et c'est comme
ça que le défaut a vécu. Le test lit en plus le source de `MicroVenteCaisse`
— une règle pure verte pendant que l'écran garde l'ancien comportement, c'est
une garde qui ne garde rien.

**Preuve de fermeture de CAI-09d** (le périmètre ne se régularise pas tout
seul : il doit ROUGIR d'abord, en nommant chaque mouvement) :

```
rouge avant : ✗ LE PÉRIMÈTRE A BOUGÉ sans déclaration (1 entré, 0 sorti, 1 reclassé)
                → journee-ouverte.ts est ENTRÉ — symbole exigerJourneeOuverte
                → credits.controller.ts change de zone : + enregistrement-vente
après gel   : noyau 88 → 89, 36 → 37 symboles
              ENTRÉS : journee-ouverte.ts (1)      SORTIS : aucun
              RECLASSÉS : les 2 contrôleurs gagnent le symbole ; credits.controller
                gagne la zone `enregistrement-vente` — il grave bien au registre,
                donc il exige DAVANTAGE d'invariants qu'avant, pas moins
              zones, invariants, chaineTestCiGelee, racinesScannees : inchangés
              2044 assertions figées — aucune retirée, renommée ni désarmée
              chaîne test:ci : identique à f0c965c, 44 maillons
```

**Preuve de fermeture de CAI-09** (invariant sur base réelle — la preuve
TRAVERSE : on ne vérifie pas qu'une route répond 4xx, on RELIT en base que la
clôture n'a pas bougé) :

```
rouge avant : Expected >= 400 / Received 200  (second acompte après clôture)
              Expected >= 400 / Received 201  (création avec acompte, contre-essai isolé)
après       : 252 invariants verts, 50 suites
              ouvert=false, fond_final=12000, caisse_theorique=12000, ecart=0 — inchangés
              lignes acompte_credit/reglement_credit : nombre et somme inchangés
              credits.acompte et statut : inchangés
              et le crédit SANS acompte, lui, s'écrit toujours (201)
```

**Preuve de fermeture de CAI-02** (invariant sur base réelle) :

```
rouge avant : Expected >= 400 / Received 201  (la vente après clôture passait)
              Expected >= 400 / Received 201  (l'annulation aussi)
après       : 239 invariants verts, 47 suites
```

**Preuve de fermeture de HIS-01** (la preuve TRAVERSE : on ne vérifie pas que
l'écran appelle le catalogue, on lit ce que le catalogue rend, à l'œil et à
l'oreille, sur les quatre périodes) :

```
rouge avant : ✗ la phrase affichée ne commence plus par « Aujourd'hui »
              ✗ la phrase dite ne s'appelle plus « Résumé du jour »
              ✗ l'écran passe par la règle au lieu de la réécrire
              ✗ le résumé parlé passe par le catalogue
après       : 30days → écran   : « Sur les 30 derniers jours, tu as gagné 33 600 francs. »
              30days → oreille : « … trente-trois mille six cents francs … »
```

**Ce que HIS-01 NE ferme pas, et qui reste nommé.** Le bouton « Personnalisé »
dit « Sur la période choisie » — il ne relit pas les deux dates. C'est un choix :
une date lue à voix haute est un autre sujet (format, ordre, année), et rien ne
l'exige pour le pilote. **HORS PÉRIMÈTRE JUSTIFIÉ.**

**Preuve de fermeture de DEP-02** (la preuve TRAVERSE : la ligne relue EN BASE,
pas le code de retour de la route) :

```
rouge avant : Expected "transport" / Received null   (les onze, jamais écrites)
après       : 11/11 catégories relues en base ET rendues par GET /caisse/transactions
              sans catégorie      → NULL en base, jamais « autre »
              hors liste          → NULL (« carburant » refusé)
              libellé à la place  → NULL (« Taxe mairie » n'est pas `taxe_mairie`)
              14 dépenses × 1 500 F : la comptabilité du jour n'a pas bougé
```

**Deux gardes desserrées, sur autorisation de Patrick (22/09).**
`GARDE-ASSOUPLIE:` VOICE-01 refigé — une seule empreinte a changé,
`contexts/AppContext.tsx` (3 lignes de projection des transactions) ;
**l'inventaire ordonné des appels de parole est identique**, aucune voix n'a
bougé. Et `--figer-perimetre` : `services/categorieDepense.ts` entre dans le
périmètre argent (88 fichiers au lieu de 87).

`test:depense-libelle` a aussi été **renforcé, pas desserré** : son T0 nomme
désormais ce qui n'est PAS un motif (au lieu de compter tous les champs du
payload), et deux assertions neuves (T6, T7) prouvent que la catégorie traverse
la file hors ligne et ne s'invente pas au rejeu.

**Preuve de fermeture de STK-01** (invariant sur base réelle) :

```
rouge avant : PUT { prix: 650 }   → 500   (nom NOT NULL, écrit à NULL)
              PUT { stock: 8 }    → 500   — et sans le NOT NULL, prix effacé
              PUT sur le produit d'une AUTRE marchande → 200 « c'est fait »
              PUT sur un id inconnu                    → 200 « c'est fait »
après       : 7 invariants verts · 250 invariants / 50 suites au total
              la modification partielle ne change que ce qu'elle nomme
              l'id qui n'est pas à elle → 404, et le produit n'a pas bougé
              `prix: ''` (case vidée) → le prix ne bouge pas
              `prix: 0` (choix écrit) → s'écrit
```

**La règle, en une phrase** : c'est la **présence de la clé** qui décide qu'une
colonne est écrite, jamais la vérité de sa valeur. `{ prix: 0 }` est une
décision et s'écrit ; `{}` ne dit rien du prix et ne le touche pas ; `''` est
une case vidée, pas un zéro.

Gardes : `cai-02-journee-fermee.spec.ts` · `dep-02-categorie-depense.spec.ts` ·
`stk-01-modifier-produit.spec.ts` · `produit-champs-a-ecrire.spec.ts` ·
`test:ecoute-caisse` · `test:resume-periode` · `test:categorie-depense` ·
`test:depense-libelle` · `test:geste-tactile`.

---

### S7 — Le back-office

Ouvert par la mesure du 22/09 (`docs/parcours/MESURE-BACKOFFICE.md`) : 37
écrans, 33 678 lignes, jamais mesurés. 76 replis qui fabriquent une liste vide,
158 qui fabriquent un zéro, 32 écrans sur 37 qui n'affichent jamais une erreur.

| Id | Défaut | Statut |
|---|---|---|
| BO-01a | **Un seul champ `error` pour tout le back-office.** Une panne sur les zones effaçait l'erreur des acteurs : impossible de dire à l'agent **ce qui** manquait. Chaque source porte maintenant son propre état de lecture (`attente` / `indisponible` + raison / `lue`). | **FERMÉ** |
| BO-01b | **Les sept compteurs du tableau de bord valaient zéro quand rien n'avait été lu** — sous un commentaire « KPIs - 100 % données réelles ». Une institution taille un programme sur ce genre de nombre. Un zéro **lu** s'affiche ; un zéro **fabriqué** n'existe plus. | **FERMÉ** |
| BO-01c | **Erreurs avalées** sur les cinq sources du tableau de bord (`catch (e) { console.error('[BO]', e) }`). La console d'un navigateur n'est pas une interface. | **FERMÉ** |
| BO-02 | Les **autres sources** du contexte (missions, audit, utilisateurs BO, institutions, signalements) avalent encore leurs erreurs : 7 `console.error('[BO]', e)` restants. Elles alimentent les 36 écrans hors périmètre. | **OUVERT** — hors lot BO-01 |
| BO-03 | Sur le tableau de bord lui-même, les **alertes, graphiques et barres de progression** lisent encore les listes qui valent `[]` quand la lecture échoue. Dette VOISINE nommée en fermant BO-01. | **OUVERT** |
| BO-04 | **`SEED_DEMO_BO_PASSWORD` n'est pas posée sur Render** : aucun compte d'administration n'existe, donc le banc terrain ne peut pas entrer et rien du back-office n'est mesuré *vivant*. À poser au tableau de bord Render, **jamais dans le dépôt**. | **OUVERT** — décision de Patrick |
| BO-05 | La tuile affiche « Indisponible » (12 caractères) en corps 22 : elle se tronque sous ~200 px de large. Lisible sur le poste d'un agent, serrée sur un téléphone. | **OUVERT** — arbitrage visuel |

### S8 — Le terrain (option B : les prix se posent sur place)

| Id | Défaut | Statut |
|---|---|---|
| STK-02a | **Les tuiles-photo pré-remplissaient un prix d'achat ET un prix de vente** (`catalogue-produits.ts` : Tomate 300/400, Aubergine 700/800…). Toucher la photo et valider posait à la marchande **les prix de quelqu'un d'autre**. Même famille que le faux zéro, en pire : un zéro se remarque, **400 F ne se remarque pas**. | **FERMÉ** |
| STK-02b | **Même injection par la suggestion de nom** — au clic, et la liste **affichait** en plus le prix comme s'il s'agissait d'une information sur le produit. | **FERMÉ** |
| STK-02c | **L'AJOUT À LA VOIX, le pire des trois.** Le code le disait lui-même : « prix dit, **sinon prix du catalogue** ». Elle dictait « ajoute dix kilos de tomate » sans prix ; l'application écrivait 400 F **et le lui annonçait** : « C'est fait ! 10 kg de Tomate à 400 francs, ajoutés au stock. » Pour une marchande qui ne lit pas, **la voix EST la confirmation** — elle entendait un prix qu'elle n'avait jamais dit, énoncé comme un fait accompli. | **FERMÉ** |
| STK-02d | **Le type de l'état de saisie mentait** : `purchasePrice: number`, alors que les gestionnaires écrivaient `'' as any`. Un champ de prix a **trois** états — un montant, zéro, ou pas encore saisi — et le type n'en connaissait que deux. Dette voisine, trouvée en fermant STK-02. | **FERMÉ** |
| STK-03a | **La saisie guidée vendait le catalogue, pas son étal.** `SaisieGuidee.tsx:201` faisait `choisirProduit(p.nom, p.prixVente)` sur les 37 tuiles en dur, puis `setPrixModifiable(false)` : toucher « Tomate » posait **400 F qui ne sont pas les siens**, et elle ne pouvait pas les corriger. C'était STK-02 encore vivant, sur le chemin de l'argent — ce prix partait au panier, puis dans la marge, puis dans le bilan. **Arbitrage de Patrick du 23/09 : la caisse montre l'étal personnel de la marchande.** Le panneau lit désormais `products` : son nom, son prix, son unité. | **FERMÉ** |
| STK-03b | **Et le nom mentait aussi.** Mesure du 23/09 (`224fc01`) : 21 des 37 tuiles couvrent plusieurs références maître ; « Igname » en couvre **neuf** (Kponan, Bêtê-Bêtê, Florido, Krenglè, Lokpa, Assawa…). Fermé par le même correctif, mais **sans aucune taxonomie** : elle ne voit ni famille, ni sous-famille, ni les 198 — elle voit ses produits, qu'elle nomme elle-même. | **FERMÉ** |
| STK-03c | **Dette VOISINE nommée, pas fermée** : `GestionStock.tsx:842` affiche encore les 37 tuiles génériques pour AJOUTER un produit. Là c'est légitime (choisir un produit à adopter) et `champsDepuisTuile` y vide déjà les prix depuis STK-02 — mais le NOM reste générique : adopter « Igname » plutôt que « Kponan ». Hors périmètre du lot. | **OUVERT** |

**Preuve de fermeture de STK-02** (règle pure, `test:prix-marchande`) :

```
rouge avant : ✗ l'écran importe la règle
              ✗ 2 tuiles remplissent encore le formulaire à la main
              ✗ l'ajout à la voix se replie sur le prix du catalogue
              ✗ la suggestion affiche un prix qui n'est pas le sien
après       : une tuile pose un PRODUIT, jamais un PRIX
              deux tuiles d'affilée : le prix de la première ne reste pas
              `prixDicte` n'a QU'UN argument — aucun repli possible
              la voix ne cite un montant que s'il vient d'elle
```

**Le catalogue garde ses prix.** On n'efface pas une donnée : on cesse de la
prendre pour une autre. Ces chiffres restent un ordre de grandeur ; ils ne sont
plus posés comme étant les siens.

**STK-03 reste OUVERT** — les tuiles ne nomment toujours pas le bon produit.
Contournement terrain maintenu : `docs/terrain/FICHE-AGENT-POSE-PRODUITS.md` et
`docs/terrain/CATALOGUE-198-PAR-FAMILLE.md` (noms exacts, unités du marché).
La fiche garde son avertissement sur les prix — il ne coûte rien, et il tient
même après ce correctif.

**Preuve de fermeture de BO-01** (règles pures, les quatre exigences de Patrick) :

```
rouge avant : ✗ BackOfficeContext importe l'état de lecture
              ✗ le tableau de bord calcule ses sept compteurs par la règle
              ✗ les cinq sources : l'échec n'était pas nommé
après       : 1. tout lu, tout vide        → les 8 compteurs rendent 0
              2. tout en panne             → les 8 disent « indisponible » + raison
                                             AUCUN ne rend un nombre
              3. zones KO, acteurs lus     → acteurs 3 / actifs 2 / suspendus 1
                                             zones seules indisponibles
                                             « sur N zones » n'invente pas de N
              4. attente → indisponible → attente → lue(12) → lue(0)
                                             le chiffre revient, et 0 reste 0
```

Gardes : `test:etat-lecture-bo`.

---

## Le reste du chemin — non commencé

Périmètre déclaré par Patrick : **écrans 1 → 5 uniquement** pour l'instant.

| Écran | Ce que le banc reproche | Statut |
|---|---|---|

## Les 25 portes — gelées

Patrick : « Ne touche pas encore aux 25 écrans secondaires. »
Leur état mesuré est dans le rapport de référence du banc. Rien ne s'y fait
avant que le chemin 1 → 5 soit fermé.
