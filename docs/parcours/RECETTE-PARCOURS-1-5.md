# Recette du parcours marchand 1 → 5 — passe de mesure

**Rien n'a été corrigé pendant cette passe, sauf le banc lui-même, deux fois.**
Les deux corrections sont nommées plus bas.

## Conditions

| | |
|---|---|
| Écran | 390 × 844, `deviceScaleFactor: 2`, tactile, `fr-FR` |
| Réseau | **aucun** — toute requête hors origine est coupée |
| Catalogue | vide ; la caisse à zéro ; compte marchand en cache (le seul chemin sans réseau) |
| Build | `NODE_ENV=production` — aucun outil de développement à l'écran |
| Clips voix | **éteints**, comme un APK livré (`VITE_JULABA_VOICE_PREVIEW` absent) |
| Éléments touchés | 24 par écran, tous atteints (0 tronqué) |

## Commande exacte pour rejouer

```bash
cd frontend_src

# La passe 1 → 5, sans réseau (le cas du marché)
BANC_SORTIE=../docs/parcours/captures/parcours-1-5 \
BANC_ECRANS=1,2,3,4,5 \
node apercu-caisse/banc-terrain.mjs

# L'écran 5 avec un catalogue RÉELLEMENT vide (le serveur répond, il n'a rien)
BANC_SORTIE=../docs/parcours/captures/parcours-1-5/catalogue-vide \
BANC_CATALOGUE=vide BANC_ECRANS=5 \
node apercu-caisse/banc-terrain.mjs
```

Chromium est celui déjà présent (`/opt/pw-browsers/chromium-1194/chrome-linux/chrome`) ;
`PW_CHROMIUM` le remplace au besoin. Rien n'est téléchargé.

## Résultat, écran par écran

| # | Écran | Voix montage | Refusées | Au geste | Impasses | Faux zéro | Vouvoie | Erreurs console | Passage |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Akwaba | 1 | 0 | 2/2 | **0** | non | non | 1 | « Écouter et entrer » |
| 2 | Tantie se présente | 1 | 0 | 3/3 | **0** | non | non | 0 | « Continuer » |
| 3 | Ton numéro | 1 | 0 | 1/14 | **0** | non | non | 0 | **aucun** (voir ci-dessous) |
| 4 | Accueil — le comptoir | 1 | 0 | 5/15 | **0** | non | non | 1 | « Vendre » |
| 5 | Caisse | 1 | 0 | 3/10 | **0** | non | non | 1 | fin du chemin |

**Zéro impasse, zéro refus de voix, zéro faux zéro, zéro vouvoiement sur les cinq écrans.**
Aucun élément hors de portée, aucun débordement hors des 390 px, aucune cible sous 44 px.

Ce qui est dit à l'arrivée :

```
1  « Akwaba. Pour vendre, touche un produit, ou parle à Tantie Nanti Lou. On est ensemble. »
2  « Je serai avec toi chaque jour dans ton commerce. Tu peux toucher l'écran.
     Tu peux aussi écouter. On est ensemble. »
3  « Tape les chiffres de ton numéro, un par un. Les ronds en haut vont se remplir. »
4  « Je n'ai pas pu lire ta caisse. Ce n'est pas zéro : je n'ai pas pu demander.
     Ton argent est là. »
5  « Que veux-tu vendre ? »
```

## Écran 5 — les deux catalogues, distingués

| | Serveur muet (marché sans réseau) | Serveur qui répond, et n'a rien |
|---|---|---|
| Commande | passe normale | `BANC_CATALOGUE=vide` |
| L'écran affiche | « Je n'ai pas pu lire tes produits. Ce n'est pas vide : réessaie. » | « Aucun produit » |
| Verdict du banc | pas de faux zéro | **À RELIRE À L'ŒIL** (voir correction 2) |
| Sortie | 1 (charte seule) | **0** |

C'est la distinction que l'écran ne savait pas faire avant `de25144` : il disait
« Aucun produit » dans les deux cas.

## Rouges restants

1. **La charte, écrans 1, 2, 3** — `0 jeton --caisse-*` (0, 1 et 46 couleurs en dur).
   **C'est la seule cause de la sortie rouge du banc.** Hors périmètre par
   décision de Patrick. Écrans 4 et 5 : `charte.ok = true`.

2. **Écran 3 — aucun passage vers l'écran suivant.** Le bouton « C'est mon
   numéro » est *désactivé* tant qu'aucun chiffre n'est tapé, et le banc ne
   tape pas de numéro : il touche chaque élément depuis un écran neuf. Ce
   n'est pas une impasse (le banc le classe correctement comme un état), mais
   le banc ne sait pas encore franchir un écran qui demande une saisie.
   **Limite du banc, pas défaut de l'écran** — à lever quand on voudra mesurer
   le parcours d'un bout à l'autre en une seule session.

3. **Trois erreurs de console**, toutes de la même famille et toutes dues à
   l'absence de réseau : `loadNotifications: Réponse serveur invalide
   (non-JSON)` (écrans 4 et 5) et `Failed to load resource: net::ERR_FAILED`
   (écran 1). Aucune ne casse l'écran ; aucune n'est visible par la marchande.
   Elles disent seulement que l'échec réseau est journalisé sans être présenté.

4. **16 requêtes externes, toutes coupées** — et deux familles très différentes :

   - **1 vers Sentry** (`o4511079112835072.ingest.de.sentry.io`) : de la
     télémétrie, envoyée depuis le téléphone d'une marchande.
   - **15 vers Cloudinary** (`res.cloudinary.com`, qui relaie `i.postimg.cc`) :
     **les images des produits du catalogue**. Tomate, aubergine, piment,
     gombo, manioc, igname, maïs, banane, plantain, oignon, avocat, huile de
     palme, mangue, ananas, arachide.

   La seconde famille mérite qu'on s'arrête : sur un marché sans réseau, **les
   tuiles de produits de la caisse n'ont aucune image**. L'écran qui doit se
   lire par l'image se lit alors par le texte — pour quelqu'un qui ne lit pas.
   Ce n'est pas dans le périmètre de cette passe ; c'est mesuré, et nommé.

## Les deux fois où le banc s'est trompé, et ce qui a été corrigé

**1. La preuve de l'écran 5 attendait une phrase disparue.**
Le banc attend, pour chaque écran, un texte que la marchande voit. Le sien
était « Que voulez-vous vendre ? » — la phrase vouvoyante supprimée par
`de25144`. Il déclarait donc l'écran `NON ATTEINT`. La preuve suit l'écran,
jamais l'inverse.

**2. Le banc accusait un écran qui disait la stricte vérité.**
Avec `BANC_CATALOGUE=vide`, le serveur répond « aucun produit » : l'écran qui
l'affiche a raison. Le banc criait quand même `ZÉRO QUI MENT`, parce que
*d'autres* lectures — la session, les tickets, le stock — échouaient encore.
Il attribuait à l'affirmation un échec qui ne la concernait pas.

Il ne sait pas relier une phrase à l'appel qui la nourrit, et prétendre le
contraire serait refaire son erreur dans l'autre sens. Il distingue donc
désormais ce qu'il sait :

```
aucune lecture n'a abouti  → rien ne peut justifier l'affirmation : MENT
certaines ont abouti       → l'une d'elles peut la justifier   : À RELIRE À L'ŒIL
```

## Captures

`docs/parcours/captures/parcours-1-5/` — une vue téléphone et une page entière
par écran. Le cas du catalogue vraiment vide est dans `catalogue-vide/`.
Rapport texte intégral : `rapport-parcours-1-5.txt`.
Rapport machine : `banc-terrain-partiel-1-2-3-4-5.json`.
