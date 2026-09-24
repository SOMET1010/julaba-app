# Audit de charte — les 7 destinations du pilote marchande

**Mesuré le 24/09. Aucun code modifié, aucune route touchée, aucun changement
fonctionnel.** Priorité en cours : le fonctionnel jusqu'au prochain APK terrain.
Ce document prépare, il n'exécute pas.

Décisions de Patrick intégrées ici :
- **« Résumé caisse » n'est plus une destination concurrente** : il appartient à
  « Mes ventes ».
- **STK-18 : le concept « Écrire » disparaît.** Le geste est **« Ajouter un
  produit »** ; parler et toucher sont des MOYENS, pas deux produits différents.

---

## 1. Le tableau, d'un coup d'œil

| # | Destination | Fichier | hex en dur | jetons | tailles de police | `caisse-font` | rayons | Classe |
|---|---|---|---|---|---|---|---|---|
| 1 | Accueil | `MarchandAccueilVoice` | **0** | 9 | 3 | 0 | 12, 18 | **A** |
| 2 | Caisse | `POSCaisse` | **0** | **29** | 11 | **67** | **14** | **A** |
| 3 | Mes produits | `GestionStock` | **52** | 4 | **14** | 0 | **10 valeurs** | **C** |
| 4 | Dépenses | `DepenseForm` | 14 | 3 | 6 | 0 | 5 valeurs | **B** |
| 4′ | Dépenses (cahier) | `MarchandDepenses` | **38** | 4 | 8 | 0 | 8 valeurs | **C** |
| 5 | Mes ventes | `VentesPassees` | 7 | **16** | 9 | 0 | 9 valeurs | **B** |
| 5′ | Mes ventes (résumé) | `ResumeCaisse` | 17 | 3 | 7 | 0 | 5 valeurs | **C** |
| 6 | Commandes | `MesCommandes` | 19 | **0** | — | 0 | — | **C** |
| 7 | Profil / Aide | `MarchandProfil` | 0 | 0 | — | 0 | — | **à définir** |

---

## 2. Le fait central

**La charte existe et fonctionne. Un seul écran s'en sert vraiment.**

`POSCaisse` : **zéro couleur en dur, 29 jetons, 67 appels à `--caisse-font-*`, et
UN SEUL rayon de bordure (14)**. C'est la démonstration que la charte tient.

Tous les autres écrans marchands ont **zéro** appel à `caisse-font`. La
typographie de la charte n'est employée nulle part ailleurs.

À l'opposé, `GestionStock` : **52 couleurs en dur, 14 tailles de police, 10
rayons de bordure différents**. Cet écran ne peut pas changer de charte — il
faudrait reprendre 52 endroits à la main.

Ce n'est pas un défaut de goût : **c'est un écran qui ne peut plus évoluer.**

---

## 3. Destination par destination

### 1 — Accueil · `MarchandAccueilVoice` — **A**

- **Couleurs** : 0 en dur, 9 jetons. Conforme.
- **Bandeau** : `var(--caisse-sable)`, plus une image de fond illustrée.
- **Typographie** : 3 tailles seulement, mais **aucune ne passe par
  `caisse-font`** — elles sont écrites en clair.
- **Boutons** : 16 `motion.button`, rayons 12 et 18 — deux valeurs, cohérent.
- **Navigation** : point d'entrée, pas de retour. Normal.
- **Vocabulaire** : « Vendre », « Mon stock », « Mes dépenses », « Mes ventes »,
  « Mon argent ». Possessif, cohérent, à hauteur d'elle.
- **Reste à faire** : brancher les 3 tailles sur `caisse-font`. Une heure.

### 2 — Caisse · `POSCaisse` — **A, et c'est le modèle**

- **Couleurs** : 0 en dur, 29 jetons.
- **Typographie** : 67 appels à `caisse-font`. Le seul écran du dépôt.
- **Rayons** : **une seule valeur**, 14.
- **Reste à faire** : rien. C'est la référence sur laquelle aligner les autres.

*Note : ses composants internes ne suivent pas.* `ConfirmationLigne` (13 hex, 2
jetons) et `SaisieGuidee` (11 hex, 3 jetons) composent à la main, à l'intérieur
d'un écran conforme.

### 3 — Mes produits · `GestionStock` — **C, le plus lourd**

- **Couleurs** : **52 en dur** contre 4 jetons. Bandeau `#ef4444` — un rouge
  d'alerte comme couleur d'en-tête permanente.
- **Typographie** : **14 tailles** différentes, aucune de la charte.
- **Rayons** : **10 valeurs** (2, 8, 9, 10, 12, 14, 16, 20, 22, 30).
- **Boutons** : 40 `motion.button` — le plus dense du parcours.
- **Vocabulaire — deux points à trancher** :
  - **« Écrire »** (ligne 695, sous une icône de carton) : **à supprimer**, par ta
    décision. Le geste est « Ajouter un produit ».
  - **« Ventes passées » et « Résumé détaillé »** cohabitent en haut de cet
    écran, alors que ce sont des portes vers la destination 5. Un écran de stock
    qui propose deux portes vers les ventes.
- **Constat visuel des captures** : les deux seuls produits s'affichent en
  « ✕ RUPTURE » et « STOCK BAS », en rouge, avec 2 alertes — c'est **STK-09**,
  fonctionnel, pas visuel.

### 4 — Dépenses · `DepenseForm` (**B**) + `MarchandDepenses` (**C**)

**Deux fichiers pour une destination**, avec deux chartes :

- `DepenseForm` : bandeau **`#FFD166`** (jaune), 14 hex, 6 tailles.
- `MarchandDepenses` : bandeau **`#FDFAF7`** (blanc cassé), **38 hex**, 8 tailles.

La capture montre un troisième bandeau, **brun**, sur « Mes dépenses ». Trois
teintes d'en-tête pour une seule fonction.

- **Navigation** : les deux portent une flèche de retour — les seuls du parcours.
- **Vocabulaire** : « Faire une dépense » / « Quelle dépense ? » / « Ou décris ta
  dépense ». Cohérent entre eux.

### 5 — Mes ventes · `VentesPassees` (**B**) + `ResumeCaisse` (**C**)

Par ta décision, `ResumeCaisse` **n'est plus une destination** : il appartient à
« Mes ventes ». Mais les deux ne se ressemblent pas :

- `VentesPassees` : 7 hex, **16 jetons** — le deuxième meilleur élève. Bandeau
  `var(--caisse-ivoire)`.
- `ResumeCaisse` : 17 hex, 3 jetons. Bandeau **`#AF5B23`** (brun, en dur).

Deux moitiés d'une même destination, deux en-têtes différents.

- **Vocabulaire** : « Ventes passées » vs « Résumé détaillé » vs « Mes ventes »
  sur l'accueil. **Trois noms** pour ce qui devient une seule destination.

### 6 — Commandes · `MesCommandes` — **C**

- **Couleurs** : 19 en dur, **zéro jeton**. Le seul écran du parcours qui
  n'utilise **aucun** élément de la charte.
- **Boutons** : 4 `motion.button` sur 762 lignes — l'animation de contact n'y est
  quasiment pas.
- **Vocabulaire** : « Mes commandes », cohérent avec le possessif du parcours.

### 7 — Profil / Aide · `MarchandProfil` — **à définir**

`MarchandProfil.tsx` fait **5 lignes** : c'est une enveloppe, pas un écran. La
destination réelle est ailleurs (`Parametres`, et `support` n'a **aucune route**
déclarée).

**TRANCHÉ par Patrick le 24/09 — elle reste extrêmement simple, et ce n'est
PAS un nouveau module.** Elle contient, et rien de plus :

- l'identité de la marchande ;
- la langue ;
- les réglages voix et accessibilité ;
- une aide très courte ;
- l'état de connexion et de synchronisation, **dit en mots qu'elle comprend** ;
- la déconnexion.

Tout ce qui relève de l'administration ou de la configuration métier **reste
ailleurs**. L'audit visuel de cette destination attend qu'elle existe sous cette
forme.

---

## 4. Classement et ordre de reprise

| Classe | Destinations | Effort |
|---|---|---|
| **A — conforme** | Caisse, Accueil | Caisse : rien. Accueil : brancher 3 tailles. |
| **B — harmonisation légère** | Mes ventes (`VentesPassees`), Dépenses (`DepenseForm`) | Remplacer 7 à 14 couleurs, unifier les rayons. |
| **C — reprise importante** | **Mes produits**, Commandes, `MarchandDepenses`, `ResumeCaisse` | 17 à 52 couleurs chacun, plus la typographie. |

### La direction, tranchée par Patrick le 24/09

> **On n'invente pas une nouvelle charte. On généralise celle de la caisse**, qui
> est déjà implémentée et testée.

Le contraste `POSCaisse` **0 / 29** contre `GestionStock` **52 / 4** clôt la
discussion sur la direction graphique : la référence existe, elle tient, elle est
gardée par `test:caisse-charte` et `test:tokens`. Il n'y a rien à redessiner.

**La méthode est donc une MIGRATION vers les jetons existants, pas une refonte
écran par écran.** C'est ce qui rend le chantier peu risqué : on remplace des
valeurs, on ne repense pas des écrans.

**L'ordre validé, à n'ouvrir QU'APRÈS la validation de l'APK terrain :**

1. **Mes produits** — le plus visité après la caisse, et le plus dégradé (52 / 4).
2. **Commandes** — le seul écran à zéro jeton.
3. **Dépenses** — et ses deux moitiés à réunir.
4. **Mes ventes** — et ses deux moitiés à recoller, puisqu'elles n'en font plus
   qu'une.

**Rien de cet audit ne se corrige maintenant.** L'audit a rempli son rôle : la
caisse est l'étalon visuel, et on y touchera quand le parcours fonctionnel sera
passé sur un vrai téléphone, dans une vraie vente.

---

## 4 bis. HORS PILOTE — l'écran de code Keiwa

**Constaté par Patrick sur téléphone le 24/09 à 17h01.** Consigné ici pour qu'on
ne le redécouvre pas, et pour qu'on ne perde pas de temps à le repeindre.

`components/wallet/WalletPage.tsx` — **985 lignes, 29 couleurs en dur, 3 jetons,
et ZÉRO appel de parole.** Pas un `speak`, pas un `dire`.

**C'est un écran de sécurité, devant une femme qui ne lit pas, et il ne dit
rien.** Elle voit un pavé de chiffres et quatre ronds vides ; rien ne lui
explique ce qu'on attend d'elle.

Le reste, relevé sur la capture :

| Constat | Ce que ça fait |
|---|---|
| « Keiwa verrouillé » | Un nom de produit qu'elle n'a aucune raison de connaître |
| « PIN » | Mot anglais, répété **quatre fois** sur le même écran : « Entre ton code PIN », « Keiwa verrouillé », « Entre ton code pour accéder », « Code PIN » |
| « FaceID / Empreinte » | **Coupé par la barre de navigation Android**, à moitié illisible et probablement intouchable |
| Aucune sortie visible | Pas de retour en haut : elle est enfermée dans l'écran |
| Contraste | Instructions en gris clair sur blanc |

Quatre messages pour dire une seule chose, dans un vocabulaire qui n'est pas le
sien, sans un mot prononcé, sans porte de sortie.

### Pourquoi il n'est PAS à corriger

**Cet écran ne doit pas exister dans le pilote.** Keiwa pèse **6 des 26
destinations** du menu marchande (`keiwa`, `keiwa/transfert`, `keiwa/paiements`,
`keiwa/banque`, `keiwa/carte`, `keiwa/historique`) — un produit financier entier
logé dans la caisse d'une marchande.

**Le sortir du menu fait disparaître cet écran, sans écrire une ligne de code
visuel.** C'est exactement ce que produit la cible à 7 destinations
(`CIBLE-UX-MARCHANDE-PILOTE.md`). Ce n'est pas un écran à réparer : c'est un
module à sortir du chemin.

Il redeviendra un sujet le jour où Keiwa sera un produit à part entière — avec sa
propre voix, son propre vocabulaire et sa propre porte d'entrée. **Décision de
Patrick, 24/09 : HORS PILOTE.**

## 4 ter. OBSTACLE — la migration « sans redessiner » n'existe pas

**Mesuré le 24/09 en ouvrant le chantier. La prémisse du plan est fausse, et il
faut un arbitrage avant d'aller plus loin.**

La méthode retenue était : *« migrer vers les jetons existants plutôt qu'en
redessinant chaque écran »*. Elle suppose que les valeurs employées dans les
écrans correspondent à celles de la charte. Mesure sur `GestionStock` :

| | |
|---|---|
| Valeurs de couleur distinctes | **50** |
| Correspondant **exactement** à un jeton | **0** |

Aucune. Chaque remplacement **changerait la couleur affichée**. Sur cet écran,
migrer **c'est** redessiner.

### Pire : la charte est plus pauvre que l'usage

L'écran distingue deux rouges qui portent une **information différente** :

| Valeur | Rôle | Usages |
|---|---|---|
| `#dc2626` | **rupture** — il n'y en a plus | 7 |
| `#ef4444` | **stock bas** — il en reste peu | 19 |
| `--caisse-alerte` (`#D95C4F`) | le seul rouge de la charte | 0 |

Les fusionner en un seul jeton **effacerait la distinction entre « il n'y en a
plus » et « il en reste peu »** — sur l'écran du stock, chez quelqu'un qui ne
lit pas et ne dispose que de la couleur pour le savoir. C'est la faute que ce
dépôt combat : écraser une information qui existe.

Le même manque vaut pour les gris (`#555` texte principal, `#aaa` secondaire —
un seul `--caisse-gris-texte`) et pour la typographie (14 tailles employées, 5
jetons `--caisse-font-*`, qui sont des raccourcis `font:` complets).

### Ce qui, lui, est migrable sans changer un pixel

Les rayons de bordure, parce que la charte et l'écran partagent des valeurs :

| | |
|---|---|
| Migrables à l'identique | **29 usages** — 12px (×22), 16px (×6), 8px (×1) |
| Sans équivalent | **36 usages** — 14px (×17), 20px, 22px, 9px, 10px, 30px, 2px |

### Les trois voies, à trancher

1. **Enrichir la charte d'abord** — lui ajouter le second rouge, le second
   gris, les tailles manquantes, puis migrer. Rien ne change à l'écran, et la
   migration redevient mécanique. *C'est la voie que je recommande : elle tient
   la promesse « ne pas redessiner ».*
2. **Migrer quand même** — la charte l'emporte, l'apparence change, et la
   distinction rupture / stock bas doit être portée autrement (un mot, une
   icône, la voix) plutôt que par deux rouges.
3. **Ne migrer que les rayons** — 29 usages, aucun pixel modifié, mais le
   problème de fond reste entier.

**Décision de Patrick attendue.** Le chantier est arrêté ici : aller plus loin
sans arbitrage reviendrait à redessiner les écrans, ce qu'il a explicitement
exclu.

### Correction d'une approximation de cet audit

La section 3 annonçait `#ef4444` comme « bandeau » de `Mes produits`. Vérifié :
c'est la couleur d'**alerte** (pastille « Rupture », badge de la cloche,
compteurs), pas l'en-tête. La mesure prenait le premier `background:` du
fichier — un raccourci. Le reste des chiffres est confirmé.

## 5. Ce que cet audit ne fait pas

- Aucune couleur, aucune mise en page modifiée.
- Aucune route touchée, aucun changement fonctionnel.
- Il ne traite ni le back-office, ni les autres rôles.
- Il ne juge pas l'esthétique : il mesure l'écart à une charte qui existe.

## 6. Les deux décisions déjà prises, à appliquer plus tard

- **« Écrire » disparaît** (`GestionStock.tsx:695`). Un seul geste : « Ajouter un
  produit ». Parler et toucher sont des moyens.
- **« Résumé caisse » rejoint « Mes ventes »** — donc « Ventes passées » et
  « Résumé détaillé » cessent d'être deux portes depuis le stock.
