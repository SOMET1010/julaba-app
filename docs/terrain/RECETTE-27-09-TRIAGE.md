# Recette du 27/09 — triage, mesuré point par point

> **Le compte rendu porte sur un APK du 27/09**, donc antérieur à ENC-01,
> MIC-01, CAT-01, CAT-02 et A1. Chaque point a été vérifié **contre le code
> d'aujourd'hui** avant toute correction : deux étaient déjà fermés, deux sont
> corrigés ici, trois demandent un arbitrage.

---

## Déjà fermé — ne rien refaire

### « Tata lit 1 zéro zéro zéro francs » (dépenses)

**C'est VOIX-09, corrigé.** Mesuré sur la clé réellement appelée par l'écran
(`DEPENSE_DU_JOUR`, via `useSpeakMessage` → `formeDite`) :

| montant | ce qui s'affiche | ce qui se dit |
|---|---|---|
| 1 000 | `1 000 francs` | **« mille francs »** |
| 2 000 | `2 000 francs` | « deux mille francs » |
| 12 500 | `12 500 francs` | « douze mille cinq cents francs » |

**Une scorie à nettoyer, sans effet :** le catalogue garde une entrée
`DEPENSE_002` (« Aujourd'hui tu as dépensé {kpiToday} francs. », statut
`a_migrer`) qui décrit l'ANCIEN site. L'écran ne l'appelle plus. Elle fait
croire à une dette qui n'existe pas — c'est exactement ce qui m'a fait suspecter
un défaut ici.

---

## Corrigé, et vérifié dans un vrai navigateur

### Le titre de l'écran de vente

`« Caisse du jour » → « Vendre »` (`POSCaisse.tsx`).

On arrive par le bouton **« Vendre »** et l'écran s'annonçait « Caisse du
jour ». Pour une marchande qui se fait lire l'écran, le bouton touché et le
titre entendu ne se répondaient pas : rien ne lui disait qu'elle était arrivée
où elle voulait. Même règle que CAI-08 — **l'étiquette du bouton et le titre de
l'écran sont le même mot.** La date et « Bonnes ventes ! » restent juste en
dessous : rien de ce que « Caisse du jour » disait n'est perdu.

### La question de l'ajout au stock

`« Qu'est-ce que tu vends ? » → « Quel produit tu veux ajouter ? »`

Elle arrive par **« Ajouter un produit »** et on lui demandait ce qu'elle
**vend**. La question posait le mauvais geste.

Changé **aux trois endroits à la fois** — la clé du catalogue (`STOCK_047`),
le texte de l'écran, et la garde qui les compare — parce que le texte vu et le
texte dit doivent rester LA MÊME phrase. `audioMode: 'none'` : aucun clip
enregistré n'est cassé.

*Le testeur proposait deux formulations ; j'ai pris la plus courte. Dis-moi si
tu préfères « Qu'est-ce que tu veux ajouter ? ».*

---

## À TRANCHER — chacun rouvre une décision déjà écrite

### 1. La quantité à l'ajout d'un produit (voix et saisie)

**Ce n'est pas un oubli.** `AjoutProduitGuide.tsx` le dit en tête, sous la
référence **STK-03 §2** :

> « ET RIEN D'AUTRE. Pas de catégorie, **pas de stock**, pas de seuil d'alerte,
> pas de prix d'achat, pas de date de péremption. L'écran d'avant les réclamait
> tous : une marchande ne décrit pas son produit, elle le vend. Chaque champ en
> plus est une occasion d'abandonner — et pour une non-lectrice, une occasion de
> plus de se tromper. »

et `premierProduit.ts` : `stock: 0` — *« Elle n'a pas compté son stock : on
n'invente pas une quantité. »*

**Le testeur touche un vrai point quand même** : tout produit ajouté démarre à
**0**, donc les alertes de rupture et le suivi de stock sont faux dès la
création. Les deux positions se défendent, et elles s'excluent.

**Ta décision.** Trois sorties possibles :
- garder trois questions (le stock se corrige ailleurs, dans « Mon stock ») ;
- ajouter une **quatrième question facultative** (« Tu en as combien ? », qu'on
  peut passer) ;
- rendre la quantité obligatoire — et rouvrir STK-03 §2.

### 2. Retirer « + Autre article » de l'écran des ventes

**Ce bouton porte DEUX gestes**, pas un :
1. **chercher dans le référentiel maître** (les 198 références) pour ajouter un
   vrai article à son catalogue ;
2. **vendre un montant libre** quand rien ne correspond — « vends pour 500 ».

Le retirer supprimerait la seule porte vers le catalogue maître depuis la
caisse, **et** l'article libre que CAT-02 vient explicitement de préserver
(étape 6 de la recette navigateur : `700 F → 1 200 F`).

**Ta décision.** Si c'est l'encombrement visuel qui gêne, on peut le déplacer ou
le réduire sans retirer les deux gestes. Si c'est le geste lui-même que tu ne
veux plus, dis-le : je retire, et je retire aussi l'étape de recette qui le
garde.

### 3. Profil — carte, marché, commune

- **Afficher ma carte : prise de vue depuis la caméra** — travail réel
  (permission caméra, capture, envoi, stockage). Capacitor Camera est
  disponible ; à cadrer.
- **Marché et Commune : listes du back-office** — il faut que le backend expose
  ces référentiels, et que le profil les consomme. À vérifier : existent-ils
  déjà en base ?

Ce n'est pas un lot de libellés, c'est un lot de données. **Dis-moi s'il passe
avant ou après la qualification de la caisse vocale.**
