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
| CAI-04 | **Le périmètre d'argent a bougé** : `etatCatalogueCaisse.ts` y est entré (symbole `CaisseContext`). C'est correct — ce module décide ce que l'écran de vente affirme. Le figer demande `--figer-perimetre`. | **OUVERT** — décision de Patrick, jamais d'un agent |
| CAI-05 | **Une assertion figée a été retirée** : `caisseCharte.test.mts` figeait le littéral « Que voulez-vous vendre ? » comme H1 — c'est lui qui tenait le vouvoiement. Remplacée par une assertion PLUS forte (le H1 ne porte aucun texte en dur et lit la clé), mais le compte d'assertions a bougé. Demande `--figer-gardes`. | **OUVERT** — décision de Patrick, jamais d'un agent |
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
| CAI-09 | `caisseTheorique` additionne aussi `acompte_credit` et `reglement_credit`. Leurs routes ne passent pas par la nouvelle garde. Même défaut, ailleurs. | **OUVERT** — hors périmètre du lot |
| MAR-HIS-001 | « Ce mois » affiche « Aujourd'hui tu as gagné… » (`ResumeCaisse.tsx:334`, texte en dur). | **OUVERT** |
| MAR-DEP-001 | « + Noter une dépense » à renommer ; catégorie de dépense non enregistrée (le **libellé**, lui, est fermé par `5259490`). | **OUVERT** |
| MAR-VTE-001 | « Son clip Tata Nanti Lou n'est pas encore enregistré » — `useVoiceCore.ts:355`, **figé par VOICE-01**. | **OUVERT** — desserrage = décision de Patrick |
| CAI-08 | « Choisir à l'écran » : Patrick a mis **deux heures** à comprendre. L'accueil dit déjà « parler ou toucher les produits » — un concept, deux langues. | **OUVERT** — arbitrage de formulation |
| CAI-07 | Deux « J'ai compris » simultanés à l'écran. À revérifier : VOX-01 a peut-être fermé la cause. | **À REMESURER** |

**Preuve de fermeture de CAI-02** (invariant sur base réelle) :

```
rouge avant : Expected >= 400 / Received 201  (la vente après clôture passait)
              Expected >= 400 / Received 201  (l'annulation aussi)
après       : 239 invariants verts, 47 suites
```

Gardes : `cai-02-journee-fermee.spec.ts` · `test:ecoute-caisse`.

---

## Le reste du chemin — non commencé

Périmètre déclaré par Patrick : **écrans 1 → 5 uniquement** pour l'instant.

| Écran | Ce que le banc reproche | Statut |
|---|---|---|

## Les 25 portes — gelées

Patrick : « Ne touche pas encore aux 25 écrans secondaires. »
Leur état mesuré est dans le rapport de référence du banc. Rien ne s'y fait
avant que le chemin 1 → 5 soit fermé.
