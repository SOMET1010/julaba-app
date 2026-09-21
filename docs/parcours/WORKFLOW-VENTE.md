# Parcours de vente — écran par écran, voix par voix

État réel du code au commit `f4cc4a9`. Chaque phrase citée est la phrase exacte
du catalogue (`i18n/voice/catalog.ts`), avec sa clé. **[ARGENT]** = message
marqué `critiqueArgent`, qu'aucun réglage de voix ne peut taire.

Les ruptures sont marquées **🔴 CASSÉ**. Il y en a trois.

---

## Vue d'ensemble

```
          ┌─────────────────────────────────────────────┐
          │  ÉCRAN 1 — Caisse du jour (POSCaisse)       │
          │  micro · recherche · + Autre article        │
          └───────┬──────────────┬──────────────┬───────┘
                  │              │              │
         voix ────┘         tactile ────┘   tactile ────┘
                  │              │              │
    ┌─────────────▼───┐   ┌──────▼──────┐  ┌────▼─────────────┐
    │ 2. Dictée       │   │ 3. Produit  │  │ 4. Autre article │
    │ comprise        │   │ du catalogue│  │ (référence/libre)│
    └─────────┬───────┘   └──────┬──────┘  └────┬─────────────┘
       🔴 s'arrête ici           │              │
        si inconnu               │              │
                  ┌──────────────▼──────────────▼───┐
                  │  ÉCRAN 5 — Panier + Total       │
                  └──────────────┬──────────────────┘
                  ┌──────────────▼──────────────────┐
                  │  6. Encaissement (reçu, monnaie)│
                  └──────────────┬──────────────────┘
                  ┌──────────────▼──────────────────┐
                  │  7. Fin : confirmée OU gardée   │
                  └──────────────┬──────────────────┘
                  ┌──────────────▼──────────────────┐
                  │  8. Reçu · 9. Synchronisation   │
                  └─────────────────────────────────┘
```

---

## 1. Caisse du jour — l'écran d'accueil de la vente

`components/marchand/POSCaisse.tsx` + `MicroVenteCaisse.tsx`

| Élément | Comportement | Voix |
|---|---|---|
| Titre | « Que voulez-vous vendre ? » | — |
| Bulle | « Dis-moi ce que tu vends » | au toucher de la bulle, relit la question |
| Gros bouton micro | lance l'écoute | « Je vous écoute » (visuel), puis « Un instant… » |
| « Choisir à l'écran » | ouvre le clavier / la recherche | — |
| Recherche + « + Autre article » | voie tactile | — |
| Raccourci panier + **Total** | toujours visible sans défilement | — |

> **🔴 Incohérence de ton** : le titre **vouvoie** (« Que voulez-**vous** vendre ? »)
> alors que toute l'application tutoie (« Dis-moi ce que **tu** vends »). À
> trancher : tutoiement partout.

> **🔴 Doublon** : « + Autre article » apparaît **deux fois** à l'écran quand le
> catalogue est vide (bouton en pointillés en haut, bouton plein en bas).

---

## 2. La dictée est comprise — **🔴 LE TROU PRINCIPAL**

`voice-offline/localIntent.ts` → `services/vendreVocalUnifie.ts`

**Ce qui marche** : la reconnaissance. « cinq tomates » → bandeau vert
« **J'ai compris : Cinq tomates** ». Quantité et nom extraits correctement.

**Ce qui est cassé** : si le produit **n'est pas au catalogue** — et le
catalogue d'une nouvelle marchande est **vide** — le parcours **s'arrête là**.

- aucune ligne n'est ajoutée ;
- aucun prix n'est demandé ;
- **rien n'est dit** : pas de « je ne connais pas ce produit », pas de « quel est
  ton prix ? » ;
- le bandeau « J'ai compris » reste affiché, donc **l'écran ment** : il affirme
  avoir compris et n'a rien fait.

Pour une femme qui ne lit pas, le parcours est mort ici. Elle n'a aucun moyen de
savoir qu'il faut appuyer sur « + Autre article ».

### Ce qui devrait se passer

La brique existe **déjà** et n'est simplement pas branchée sur la voix
(`POSCaisse.tsx` l. 172-222) :

| Clé | Phrase |
|---|---|
| `TATA_QUEL_PRIX` **[ARGENT]** | « {produit}. Quel est ton prix ? » |
| `TATA_INDIQUE_PRIX` **[ARGENT]** | « Il faut indiquer ton prix » |
| `TATA_ARTICLE_AJOUTE_CATALOGUE` **[ARGENT]** | « {produit} ajouté à ton catalogue et au panier » |

**Cible** : après « J'ai compris : Cinq tomates », si le produit est inconnu,
l'écran de saisie s'ouvre **pré-rempli** — nom « tomates », quantité 5 — et
Tantie demande **le prix, et rien que le prix** : « Tomates. Quel est ton
prix ? » Une fois le prix donné : « Tomates ajouté à ton catalogue et au
panier. » **Jamais de silence après un « J'ai compris ».**

---

## 3. Produit connu, choisi à l'écran ou dicté

`components/marchand/SaisieGuidee.tsx` · `ConfirmationLigne.tsx`

Le prix vient du catalogue, donc **la marchande n'a rien à taper** : elle ne
règle que la quantité.

| Étape | Voix |
|---|---|
| Quantité manquante | `phraseQuantiteManquante()` |
| Prix manquant | `phrasePrixManquant()` |
| Prix déjà connu | `TATA_REPLI_PRIX_CONNU` — « {montant} » |
| Chaque chiffre tapé | `TATA_MONTANT_DEVISE` **[ARGENT]** — « {montant} {devise} » |
| Effacement | `TATA_PRIX_EFFACE` |
| Nom ambigu | `phraseAmbiguite()` |
| Confirmation | `phraseConfirmation()` · `TATA_QUESTION_CORRECTION` |

---

## 4. « + Autre article » — **🔴 ARRIVE VIDE**

Deux voies dans le même écran :

**a) Référence du catalogue maître** — on cherche, on choisit, Tantie demande
« {produit}. Quel est ton prix ? » (`TATA_QUEL_PRIX`), on donne le prix, et
l'article est **adopté** : ajouté au catalogue **et** au panier d'un seul geste
(`TATA_ARTICLE_AJOUTE_CATALOGUE`). **Ce chemin est bon.**

**b) « OU MONTANT LIBRE »** — champ **Montant** obligatoire, champ
« **Quoi ? (facultatif)** », choix d'unité (unité / tas / kg / sac / bassine /
régime), bouton **Ajouter**.

> **🔴 L'écran arrive vide** alors que « Cinq tomates » vient d'être dicté. Ni le
> nom ni la quantité ne sont repris — il faut tout retaper. C'est exactement ce
> que `SaisieGuidee` promet d'éviter dans son propre commentaire.

> **🔴 Le libellé est facultatif, le montant obligatoire.** On peut donc ajouter
> au panier **un prix sans article** — défaut symétrique de celui de l'écran 2 :
> là un article sans prix, ici un prix sans nom. Une vente dont l'historique ne
> dira jamais ce qui a été vendu.

---

## 5. Panier et Total

| Clé | Phrase |
|---|---|
| `TATA_LIGNE_AJOUTEE` **[ARGENT]** | « {quantite}, {montantLigne} {devise}. Total : {totalPanier} {devise}. » |
| `TATA_QUANTITE_LIGNE` **[ARGENT]** | « {produit} : {quantite} » |
| `TATA_PRIX_UNITE_LIGNE` **[ARGENT]** | « {produit} : {prix} {devise} l'unité » |
| `TATA_TOTAL` **[ARGENT]** | « Total : {total} {devise} » |
| `TATA_PANIER_VIDE` **[ARGENT]** | « Ton panier est vide. » |
| `TATA_AJOUTE_PRODUITS_D_ABORD` **[ARGENT]** | « Ajoute d'abord des produits au panier. » |

**Règle du premier écran** (tranchée) : le **Total reste visible sans
défilement**. Les lignes détaillées, le reçu, la monnaie et le bouton final
peuvent demander un défilement raisonnable.

---

## 6. Encaissement

`services/machineEncaissement.ts` — fonction pure : l'écran ne décide rien, il
lui donne l'état financier et exécute l'effet rendu.

| Clé | Phrase |
|---|---|
| `TATA_DOIT` **[ARGENT]** | « Elle doit {total} {devise}. » |
| `TATA_TOUCHE_LES_BILLETS` **[ARGENT]** | « Elle doit {total} {devise}. Touche les billets qu'elle te donne. » |
| `TATA_RELECTURE_MONNAIE` **[ARGENT]** | « Elle doit {total}. Elle t'a donné {recu}. Tu rends {monnaie}. **Je valide ?** » |
| `TATA_RELECTURE_COMPTE_JUSTE` **[ARGENT]** | « … Compte juste. Je valide ? » |
| `TATA_MANQUE` **[ARGENT]** | « Il manque {montant} {devise}. » |
| `TATA_COMPTE_A_CHANGE` **[ARGENT]** | « Le compte a changé. {suite} » |
| `TATA_NE_VALIDE_PAS` **[ARGENT]** | « D'accord, je ne valide pas. » |
| `TATA_MONNAIE_A_RENDRE` **[ARGENT]** | « Monnaie à rendre : {monnaie} {devise} » |
| `TATA_MONTANT_RECU_INSUFFISANT` **[ARGENT]** | « Montant reçu insuffisant » |
| `TATA_CHOISIS_OPERATEUR` **[ARGENT]** | « Choisis l'opérateur » |

**« Encaisse » ne paie jamais** : Tantie relit le compte et attend « oui valide ».

---

## 7. Fin de vente — deux états, jamais confondus

| Cas | Écran | Voix | Vibration |
|---|---|---|---|
| **Confirmée** (serveur d'accord) | rond vert, coche, « Vente réussie » | `TATA_VENTE_ENREGISTREE` **[ARGENT]** — « Vente enregistrée. {total} {devise} » | double brève (35-60-35) |
| **Gardée** (hors ligne ou envoi tombé) | nuage barré, « Vente gardée sur le téléphone » + « En attente d'envoi. Je l'envoie dès que le réseau revient. » | `TATA_VENTE_GARDEE_TELEPHONE` **[ARGENT]** | **une seule impulsion courte (90 ms)** |
| **Refusée** (erreur métier) | — | `TATA_VENTE_ECHEC` **[ARGENT]** | longue (180 ms) |

Variantes `_RUPTURE` des deux premières quand le stock passe sous zéro.

---

## 8. Reçu

Partageable dans les deux cas — la vente a eu lieu devant la cliente.

```
🧾 REÇU — Jùlaba
Vendeuse : …
Date : …
3 tas de Tomate — 500 F
TOTAL : 4 500 FCFA
Paiement : Espèces
Reçu n° D4E5F6
Vente enregistrée sur ce téléphone — synchronisation en attente.   ← SEULEMENT si gardée
Merci et à bientôt !
```

Le reçu d'une vente confirmée est **identique à l'octet** à celui d'avant. Le mot
« confirmée » n'apparaît jamais.

---

## 9. Synchronisation — la vente gardée part

| Clé | Phrase |
|---|---|
| `TATA_VENTE_PARTIE` **[ARGENT]** | « Ta vente gardée sur le téléphone est partie. Le serveur l'a reçue. » |
| `TATA_VENTES_PARTIES` **[ARGENT]** | « {nombre} ventes gardées … sont parties. Le serveur les a reçues. » |
| `TATA_VENTE_PARTIE_RESTE` **[ARGENT]** | « … est partie. Il en reste {reste} à envoyer. » |
| `TATA_VENTES_PARTIES_RESTE` **[ARGENT]** | « … sont parties. Il en reste {reste} à envoyer. » |

Vibration : **montée asymétrique (35-70-140)**, seul motif croissant de
l'application. **Jamais déclenché par une dépense** rejouée.

---

## Les quatre motifs de vibration

| Motif | Quand |
|---|---|
| `[35, 60, 35]` double symétrique | vente **confirmée** |
| `90` impulsion courte unique | vente **gardée** |
| `[35, 70, 140]` montée | vente **partie** après synchro |
| `180` longue unique | **erreur** |

---

## Ce qu'il y a à corriger, en une passe

1. **Écran 2 — brancher la voix sur le chemin d'adoption qui existe déjà.**
   Produit inconnu → ouvrir la saisie **pré-remplie** (nom + quantité dictés) →
   `TATA_QUEL_PRIX` → prix → `TATA_ARTICLE_AJOUTE_CATALOGUE`. Jamais de silence
   après « J'ai compris ».
2. **Écran 4 — pré-remplir depuis la dictée**, et décider si le libellé reste
   facultatif quand un montant libre est saisi.
3. **Écran 1 — tutoyer** (« Que veux-tu vendre ? ») et **supprimer le doublon**
   « + Autre article ».

Le reste du parcours — panier, encaissement, fin de vente, reçu,
synchronisation — est complet et prouvé par tests.
