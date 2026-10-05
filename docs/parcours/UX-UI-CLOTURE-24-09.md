# UX/UI — ce qui est fermé, ce qui reste à trancher

**24/09/2026.** « Écoute terminons une fois pour toutes ces questions ux ui. »

Ce document dit ce qui est **fermé et verrouillé par une garde**, et ce qui
**reste un arbitrage** — c'est-à-dire ce qui n'appartient qu'à Patrick.

---

## 1. Le diagnostic, corrigé par la mesure

Le soupçon était : « des écrans Manus et des écrans legacy cohabitent ».

**Ce n'était pas ça.** Trois causes mesurées, toutes différentes :

| Ce qu'on croyait | Ce que la mesure a montré |
|---|---|
| Deux chartes se partagent l'app | `commerce.css` **écrase** `theme.css` : 45 de ses 88 variables sont mortes. Une seule charte s'applique déjà, back-office compris. |
| Des écrans d'une autre époque | L'accent de Jùlaba a changé — `#AF5B23` → `#B74725` — et **n'a été propagé que dans la caisse**. Six autres écrans portaient encore l'ancien. |
| Des routes en double | Une seule route de vente. Mais **sept portes** menaient à **deux** écrans de chiffres, trois d'entre elles avec la **même icône**. |

---

## 2. Ce qui est fermé

### La charte : 644 → 40 couleurs en dur

Trois vagues, toutes mesurées, aucune n'a redessiné quoi que ce soit :

| Vague | Ce qui a bougé | Pixels changés |
|---|---|---|
| 1 — correspondances exactes | 328 occurrences → jeton existant | aucun |
| 2 — variantes de même famille + ancien accent | 141 occurrences | **les six écrans qui portaient `#AF5B23` rejoignent la caisse** |
| 3 — couleurs héritées dupliquées | 135 occurrences → 21 jetons `--herite-*` | aucun |

**Garde** : `charteMarchande.test.mts` — un plafond par fichier, qui ne peut que
baisser. Une couleur ajoutée refuse ; un gain non verrouillé refuse aussi. Le
test **nomme le jeton à utiliser** pour chaque couleur qu'il trouve.

### Une seule porte vers « mes chiffres » (sept avant)

`portesChiffres.test.mts`. « Mes ventes » ouvre le **résumé du jour** — « combien
j'ai fait aujourd'hui », la question du soir, qui n'était atteignable que par
deux raccourcis enfouis dans l'écran du **stock**. La liste vente par vente est
devenue le **détail**, accessible depuis le résumé et de nulle part ailleurs.

Le stock montre l'étal, plus les chiffres. La modale de clôture et
`ScoreResumeCard` perdent leurs boutons jumeaux.

### « Écrire » n'existe plus (STK-18)

`gesteAjouterProduit.test.mts`. Le geste s'appelle **« Ajouter un produit »** ;
parler et toucher n'en sont que des moyens. Le mot « Écrire » désignait
précisément ce que la marchande ne sait pas faire — une porte marquée
« interdit » dans un écran conçu pour une femme qui ne lit pas.

### Trois gardes neuves dans `verify` (103e, 104e, 105e maillon)

`test:ci` reste **figé** : 44 maillons, identique à `f0c965c` — vérifié à chaque
commit.

---

## 3. Ce qui reste, et qui n'appartient qu'à Patrick

### a) Les 21 jetons `--herite-*`

Nommés, à leur valeur exacte, dans `commerce.css`. Aucun pixel n'a bougé. Mais
la question reste entière :

- **six gris CSS « par défaut »** (`#aaa`, `#555`, `#888`, `#ccc`, `#ddd`,
  `#e0e0e0`) dispersés dans cinq fichiers — la charte a `--encre-2/3/4` pour ça ;
- **trois verts** qui ne sont pas le vert de Jùlaba ;
- **deux bleus** — la charte Jùlaba n'en a **aucun** ;
- le **blanc pur**, employé à côté du blanc cassé `--commerce-surface`.

**Question** : rejoignent-ils la charte, ou disparaissent-ils au profit des
jetons existants ? Le jour où c'est tranché, la réponse tient en **une ligne
chacune**, dans `commerce.css` et nulle part ailleurs.

### b) Les 40 dernières couleurs en dur

25 teintes, **chacune dans un seul fichier** : aucune duplication, donc aucune
dette de duplication. Leur sort est une question de charte, pas un défaut.

### c) `theme.css` : 45 lignes mortes mêlées à 42 vivantes

Personne — humain ou agent — ne peut savoir en le lisant laquelle s'applique.
C'est ce qui a produit le tableau des deux thèmes. Le nettoyer est un geste de
charte.

### d) Le troisième chantier UX

« Cinq produits mélangés » n'a jamais été détaillé. **À DÉFINIR** — dis-moi ce
que tu as vu et je le mesure.

---

## 4. Mesuré et écarté — ce qui n'est PAS un problème

Discipline : on ne gonfle pas un non-problème.

- **`theme.css` donne aux titres une taille par des variables qui n'existent
  pas** (`--text-2xl`, `--text-xl`, `--text-lg`, `--text-base`). Reproduit dans
  Chromium : `h1`, `h2`, `h3` et `p` retombent tous à **14px**. **Mais** sur les
  403 balises de titre de l'application, presque toutes portent déjà leur propre
  taille (`font:`, `fontSize`, ou une classe Tailwind qui écrase `@layer base`).
  C'est du CSS mort qui ment, pas un défaut visible.
- **17 variables CSS orphelines** : toutes dans le **back-office**, sauf
  `--zoom-texte` et `--role-color` qui sont posées en JavaScript (vérifié) et
  fonctionnent. Le parcours marchande n'en a **aucune**.
- **`tokens.css` et `soleil.css`** : aucune collision divergente avec
  `commerce.css`. Le mode SOLEIL n'est pas affecté.
- **`var()` dans un attribut SVG** : vérifié dans Chromium, pas supposé —
  `stroke="var(--commerce-action)"` → `rgb(183, 71, 37)`. Les icônes de
  catégories ne deviennent pas noires.

---

## 5. Ce qui bloque encore `verify`

Les empreintes `dialogues` et `vendreVocal` attendent la signature de Patrick
depuis `7f13b15`. Comme `&&` s'arrête au premier échec, **les 43 maillons
suivants ne tournent plus du tout** depuis ce jour-là. Ils ont été lancés à la
main à chaque commit de ce lot : tous verts.
