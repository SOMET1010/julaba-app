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
| ACC-02 | **Les modales de l'accueil** (résumé du jour, clôture, fond de caisse) reçoivent encore le même faux zéro : 10 montants en `?.x \|\| 0`. Même défaut, autre fichier (`MarchandModals.tsx`). | **OUVERT** |
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

---

## Le reste du chemin — non commencé

Périmètre déclaré par Patrick : **écrans 1 → 5 uniquement** pour l'instant.

| Écran | Ce que le banc reproche | Statut |
|---|---|---|
| 1 — Akwaba | muet · 1 impasse /2 · 0 jeton de charte | OUVERT |
| 2 — Tantie se présente | muet · 0 jeton | OUVERT |
| 3 — Ton numéro | muet · 1 impasse /14 · 0 jeton · 46 couleurs en dur | OUVERT |
| 5 — Caisse | `ZÉRO QUI MENT` (« Aucun produit ») · vouvoie (à l'écran ET à voix haute) | OUVERT |

## Les 25 portes — gelées

Patrick : « Ne touche pas encore aux 25 écrans secondaires. »
Leur état mesuré est dans le rapport de référence du banc. Rien ne s'y fait
avant que le chemin 1 → 5 soit fermé.
