# STK-03 — les trois parcours de l'étal

Décision de Patrick, 23/09/2026. **Aucun code.** Proposition d'écrans seulement.

> La caisse montre l'étal personnel de la marchande, pas un catalogue générique.

**Ce que ces écrans ne font jamais** : montrer une famille, une sous-famille, un
domaine, un code référence, ou les 198. La taxonomie est notre problème, pas le
sien.

---

## Ce qui existe déjà (mesuré, pas supposé)

| Brique | État |
|---|---|
| `produits` = l'étal de CETTE marchande | ✅ existe, `POSCaisse` l'affiche déjà |
| `produits.default_code` = rattachement au maître | ✅ existe |
| `POST /catalogue-maitre/adopter` (prix, unité, stock) | ✅ existe |
| `GET /catalogue-maitre?q=` recherche | ✅ existe |
| Ajout d'un produit LIBRE (sans code) | ✅ existe (`stocks-rest`) |
| `unites_locales_autorisees` **par produit** | ✅ existe — Kponan → `kg, sac, tas, unité` |

**Le parcours est donc surtout un travail d'écran.** Le serveur sait déjà faire.

---

## 1 · L'étal vide — premier jour, sans agent

```
┌────────────────────────────────┐
│                                │
│         [ photo Tata ]         │
│                                │
│   Qu'est-ce que tu vends       │
│        aujourd'hui ?           │
│                                │
│   ┌──────────────────────────┐ │
│   │   🎤    LE DIRE          │ │   ← gros, orange voix
│   └──────────────────────────┘ │
│                                │
│   ┌──────────────────────────┐ │
│   │   👆    AJOUTER UN       │ │   ← gros, même taille
│   │         PRODUIT          │ │
│   └──────────────────────────┘ │
│                                │
└────────────────────────────────┘
```

**Dit à voix haute, dès l'ouverture** : « Qu'est-ce que tu vends aujourd'hui ?
Dis-le-moi, ou touche pour ajouter. »

Deux gestes. Rien d'autre à l'écran — pas de menu, pas de liste, pas de compteur
à zéro. Un étal vide ne s'excuse pas, il invite.

---

## 2 · Ajouter un produit — trois écrans, pas un de plus

### Écran A — son nom

Elle dit « Kponan », ou elle touche et le dit.

JULABA cherche **en arrière-plan** dans le référentiel. **Elle ne voit jamais
la recherche.** Elle voit ce qu'elle a dit :

```
┌────────────────────────────────┐
│   J'ai compris : Kponan        │   ← chip vert, le seul « J'ai compris »
│                                │
│         [ photo igname ]       │
│                                │
│   ┌──────────────────────────┐ │
│   │        C'EST ÇA          │ │
│   └──────────────────────────┘ │
│   ┌──────────────────────────┐ │
│   │       NON, REDIRE        │ │
│   └──────────────────────────┘ │
└────────────────────────────────┘
```

**Trouvé dans les 198** → on retient `VIV-TUB-001` en silence, elle ne le voit
pas. **Pas trouvé** → **on ne bloque pas** : on garde « Kponan » tel qu'elle l'a
dit, sans rattachement. Le rattachement est notre travail, fait plus tard, sans
elle.

### Écran B — comment elle le vend

```
┌────────────────────────────────┐
│   Kponan, tu le vends          │
│          comment ?             │
│                                │
│   ┌────────┐  ┌────────┐       │
│   │  TAS   │  │   KG   │       │   ← 44 px mini, deux par ligne
│   └────────┘  └────────┘       │
│   ┌────────┐  ┌────────┐       │
│   │  SAC   │  │ UNITÉ  │       │
│   └────────┘  └────────┘       │
│                                │
│        Autre ▾                 │
└────────────────────────────────┘
```

**Les boutons viennent du produit, pas d'une liste générique.** Le référentiel
porte `unites_locales_autorisees` produit par produit — Kponan donne exactement
`kg, sac, tas, unité`. Zéro invention.

Produit non reconnu → les quatre plus fréquentes du marché (`tas`, `kg`,
`unité`, `sac`) + « Autre », où elle dit son mot à elle.

Chaque bouton est **dit** au toucher : « Le tas. »

### Écran C — son prix

```
┌────────────────────────────────┐
│      Le tas, à combien ?       │
│                                │
│        ┌──────────────┐        │
│        │   1 500 F    │        │   ← dit à chaque chiffre
│        └──────────────┘        │
│                                │
│     [ 1 ] [ 2 ] [ 3 ]          │
│     [ 4 ] [ 5 ] [ 6 ]          │
│     [ 7 ] [ 8 ] [ 9 ]          │
│     [ ⌫ ] [ 0 ] [ ✓ ]          │
│                                │
│   🎤 ou dis-le                 │
└────────────────────────────────┘
```

**Aucun prix pré-rempli. Jamais.** C'est STK-02 : le prix vient d'elle, ou il
n'existe pas. Le champ part vide et le bouton vert reste éteint tant qu'elle n'a
rien donné.

**Puis c'est fini.** Dit : « Kponan, mille cinq cents francs le tas. C'est dans
ton étal. » La tuile apparaît.

---

## 3 · La caisse de tous les jours — son étal

```
┌────────────────────────────────┐
│   Que voulez-vous vendre ?     │
│   ┌──────────────────────────┐ │
│   │  🎤   Parler à Tantie    │ │
│   └──────────────────────────┘ │
│        👆 Toucher les produits │
│                                │
│  ┌──────┐ ┌──────┐ ┌──────┐    │
│  │[img] │ │[img] │ │[img] │    │
│  │Kponan│ │Tomate│ │Gombo │    │
│  │1 500 │ │ 400  │ │ 300  │    │
│  │ /tas │ │ /kg  │ │ /tas │    │
│  └──────┘ └──────┘ └──────┘    │
│  ┌──────┐ ┌──────┐ ┌──────┐    │
│  │ ...  │ │ ...  │ │  +   │    │
│  └──────┘ └──────┘ └──────┘    │
└────────────────────────────────┘
```

**Ses 8, 12 ou 15 produits.** Son nom, son prix, son unité — sur la tuile, parce
qu'elle ne lit pas le prix ailleurs. **Un toucher vend.**

Le `+` en dernière tuile rouvre le parcours du §2. Elle n'a plus jamais à
reposer son étal : demain, elle retrouve ses produits.

---

## Ce qui disparaît

**Les 37 tuiles génériques ne créent plus de vente et n'imposent plus de prix.**
Aujourd'hui `SaisieGuidee.tsx:201` fait `choisirProduit(p.nom, p.prixVente)` puis
`setPrixModifiable(false)` : toucher « Tomate » pose **400 F qui ne sont pas les
siens**, et **elle ne peut pas les corriger**. C'est STK-02 encore vivant, sur le
chemin de l'argent.

Elles peuvent rester comme **images d'aide** pendant la constitution de l'étal —
jamais comme source de prix, jamais comme ligne vendable.

---

## Le kit terrain B

Inchangé et toujours utile : avec l'agent, tout l'étal se pose en une fois, au
marché. **Mais l'absence d'agent ne bloque plus rien** — le §2 se fait seule.

---

## Deux points à trancher au moment du code (pas maintenant)

1. **`default_code IS NULL` veut dire deux choses** : « cherché, pas trouvé » et
   « jamais cherché ». Deux sens pour une donnée — la faute qu'on ferme partout.
   Il faudra les distinguer.
2. **`catalogue_maitre` est présumée vide en production**, non vérifiée. Le
   parcours doit donc marcher **entièrement sans elle** : si la recherche ne rend
   rien, on garde le nom de la marchande et on vend. C'est déjà la règle — il
   faut qu'un test le prouve.
