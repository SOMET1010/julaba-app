# Banc terrain — le parcours de la marchande, écran par écran

```sh
cd frontend_src
npm run banc:terrain            # ou : node apercu-caisse/banc-terrain.mjs
```

Un navigateur, un téléphone de 390 × 844, **aucun réseau**, **aucun stub**,
**catalogue vide**. Le banc monte les écrans du parcours **dans l'ordre** et pose
à chacun les trois questions qu'une personne pose en dix secondes.

## Les trois questions

| | Ce qu'on mesure | Quand il échoue |
|---|---|---|
| **Est-il dans la charte ?** | jetons `--caisse-*` contre couleurs écrites en dur (`#rrggbb`) dans les fichiers que l'écran monte réellement | zéro jeton, ou moins de la moitié des décisions passant par la charte (`BANC_SEUIL_CHARTE`, défaut 0,5) |
| **Parle-t-il ?** | ce qui est **réellement demandé au moteur audio** au montage et sous chaque doigt, lu dans les deux instrumentations existantes (`enregistrerRenduVocal` et `utils/voiceTrace`) | rien n'est demandé, ni au montage ni sous le doigt : **écran muet** |
| **Mène-t-il quelque part ?** | chaque élément visible qui a l'air touchable est **touché**, sur un écran neuf, et l'on regarde si l'adresse, le texte, le stockage, le clavier ou la voix bougent | un élément touché ne fait **rien** : impasse. Le doigt ne peut pas l'atteindre : **hors de portée**. Une confirmation s'affiche sans que l'état de la vente change : **piège** |

Trois distinctions que le banc tient, parce que les confondre le ferait mentir
dans un sens ou dans l'autre : un bouton **désactivé** est un état, pas un
défaut ; un élément que Playwright refuse de toucher parce que son animation
n'est pas posée est **touché en insistant**, pas hors de portée ; et le foyer ne
compte comme effet que s'il tombe sur un **champ de saisie** — sinon tout bouton
« mènerait quelque part » du seul fait d'avoir été touché.

Une quatrième ligne, **à l'œil**, est rapportée sans faire échouer : largeur de
défilement, éléments qui sortent de l'écran, cibles sous 44 px. C'est ce que
Patrick voit avant même de toucher.

## Pourquoi il ne bouchonne rien

Le banc précédent (`apercu-caisse/capture.mjs`) remplaçait `CaisseContext` et
`AppContext` par des stubs dont l'état **par défaut** était peuplé : huit
produits, un panier de trois lignes, 12 500 F de caisse. Il mesurait donc un
écran que l'application ne rend pour personne. Deux fois, il a déclaré vert un
parcours mort sur le téléphone.

Ici : la vraie application (`frontend_src/index.html` → `src/main.tsx`), le vrai
routeur, les vrais contextes. Le catalogue est **vide** et la caisse à **zéro**,
parce que c'est l'état d'une marchande qui ouvre l'application la première fois.
Si un écran ne marche que peuplé, c'est un défaut, pas une excuse.

Et il juge l'application **telle qu'elle est livrée** : le serveur est démarré
avec `NODE_ENV=production`, donc `import.meta.env.DEV` est faux et les outils de
développement disparaissent — sélecteur de profil, « 🐞 Rapport de test »,
« Revoir le tutoriel », badge « · DEV », ligne de version. Le dépôt avait déjà
payé ce piège une fois (`scripts/mesure-ecrans.cjs`, point 2) : mesurer sur le
serveur de dev fait passer des outils d'équipe pour des défauts de la marchande.
Le sélecteur de profil est en plus écarté de l'inventaire, par ceinture et
bretelles.

## Ce qu'il n'ajoute pas à l'application

`journal.ts` s'enregistre comme rendu vocal **par-dessus** celui de
l'application et lui rend la main aussitôt : aucun texte réécrit, aucune
décision prise, aucun son changé. `vite.config.ts` n'a aucun alias. Ni ce
dossier ni `banc-terrain.mjs` n'entrent dans `npm run build` ni dans `tsc -b`.

## Où il ne va pas

**Pas dans `test:ci`, pas dans `verify`.** Les deux sont des suites Node pures,
sans navigateur : y glisser Chromium ferait dépendre chaque commit d'un binaire
de navigateur et de deux à trois minutes de rendu. Le banc reste une commande à
part, qu'on lance quand on touche à un écran du parcours.

## Variables

| | |
|---|---|
| `PW_CHROMIUM` | exécutable Chromium (déjà présent, rien n'est installé) |
| `BANC_SORTIE` | dossier des captures (défaut `docs/parcours/captures/banc-terrain`) |
| `BANC_MAX_ELEMENTS` | éléments touchés par écran (défaut 24) |
| `BANC_SEUIL_CHARTE` | part minimale de jetons de charte (défaut 0,5) |
| `BANC_ECRANS=1,4` | ne juger que ces écrans, dans l'ordre du parcours |
| `VITE_JULABA_VOICE_PREVIEW=true` | rejoue avec les clips « prototype » actifs, pour distinguer « muet parce que le build éteint les clips » de « muet parce qu'aucun code ne parle » |

## Ce qu'il ne prouve pas

Il ne juge pas le **son** (headless : rien n'est audible — il lit ce que le
moteur a reçu et ce qu'il en a fait). Il ne reconnaît pas la **parole** (pas de
micro : le chemin vocal de la caisse n'est pas encore parcouru). Il ne juge pas
la **beauté**, ni la lisibilité des textes. Il ne couvre, pour l'instant, que le
début du parcours — les autres écrans s'ajouteront un par un dans `PARCOURS`.
