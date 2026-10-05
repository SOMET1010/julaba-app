# Batterie 2 — les chemins qu'on n'a jamais testés

> **À copier dans la session de l'agent qui teste déjà.**
> Commit à tester : **`9991cd3`**.

---

La première batterie (S1–S6) a trouvé ce qui bloquait la vente et le stock.
Tout est corrigé. Cette batterie attaque **les chemins d'argent qu'on n'a
jamais ouverts** : la dépense, la journée de caisse, la monnaie, l'annulation,
le hors-ligne.

**Rappel de méthode, qui a fait ses preuves :**
- vérifie le hash sur **https://julaba-web.onrender.com/sw.js** — il doit être
  `9991cd3`. S'il diffère, arrête-toi et dis-le ;
- **recharge la page** après chaque enregistrement : c'est comme ça que tu as
  démasqué le stock qui ne partait pas ;
- dis toujours **ce que tu as fait**, **ce que tu attendais**, **ce que tu as
  vu** — mot pour mot pour les messages ;
- **la dictée ne marche pas sur le web** (décision documentée : le moteur vocal
  vit dans l'APK). Ne la teste pas. Si un écran te dit d'aller chercher du
  réseau, c'est un défaut : signale-le.

---

## S7 — Noter une dépense

1. Accueil → **Mes dépenses** → le bouton d'ajout.
2. Saisis **1 500 F**, motif **« sac de charbon »**, catégorie **Transport**.
3. Enregistre, puis **recharge**.

**Attendu** : la dépense apparaît avec **son motif ET sa catégorie**. Vérifie
les deux : le motif a déjà été perdu une fois (DEP-01), la catégorie devinée
au lieu d'être lue (DEP-02).

4. Va dans **Mes ventes**.

**Attendu** : « Tu as dépensé » montre 1 500 F, et le gain net a baissé d'autant.

## S8 — La journée de caisse

1. Accueil → ouvre la journée avec un fond de **5 000 F**.
2. **Recharge**, puis rouvre l'écran de la journée.

**Attendu** : le fond déclaré est bien **5 000 F**, pas 0.

3. Fais une vente de 2 000 F.
4. Ferme la journée en comptant **7 000 F**.

**Attendu** : l'écart est **0**. Note ce qui s'affiche si tu comptes 6 500 F à
la place — l'écart annoncé doit être **−500**, jamais « moins toute la caisse ».

## S9 — Rendre la monnaie

1. Panier de **1 500 F**. Encaisse en espèces.
2. Saisis un reçu de **2 000 F**.

**Attendu** : « Tu rends **500 francs** » — à l'écran en chiffres, et **à
l'oreille en toutes lettres** si le son est actif.

3. Recommence avec un reçu de **1 000 F** (insuffisant).

**Attendu** : la vente **ne passe pas**, et le message dit ce qui manque.
Vérifie qu'aucune vente n'a été enregistrée.

## S10 — Annuler une vente

1. Note le stock d'un produit du catalogue (pas un article libre).
2. Vends-en 3, encaisse.
3. Va dans **Voir chaque vente** et **annule** cette vente.
4. **Recharge**, puis va dans **Mon stock**.

**Attendu** : le stock est **remonté de 3**. La vente n'est plus comptée dans
le total du jour. C'est le test le plus important de cette batterie : une
annulation qui ne rend pas la marchandise fait disparaître du stock.

## S11 — Une vente à plusieurs lignes

1. Mets **trois produits différents** au panier, avec des quantités différentes.
2. Encaisse.
3. **Recharge**, puis vérifie **Mon stock** et **Voir chaque vente**.

**Attendu** : les **trois** stocks ont baissé, chacun de sa quantité. La vente
porte le total exact.

## S12 — Le hors-ligne

1. Coupe le réseau (mode avion, ou `F12` → Réseau → « Hors ligne »).
2. Fais une vente de **1 000 F**.

**Attendu** : l'écran dit que la vente **attend** — jamais « Vente réussie ».
C'est une différence qui compte : une vente en attente n'est pas encaissée.

3. Rétablis le réseau, attends, puis **recharge**.

**Attendu** : la vente est partie, la file est **vide**, et elle n'est comptée
**qu'une fois**. Vérifie le total du jour avant et après.

## S13 — Ajouter un produit au parcours guidé

1. **Mon stock** → **Ajouter un produit**.
2. Essaie d'abord un nom d'**une seule lettre**, puis de valider **sans unité**.

**Attendu** : c'est **refusé**, avec un message compréhensible — pas du jargon.
(Règle posée aujourd'hui : nom d'au moins 2 caractères, unité obligatoire.)

3. Puis crée vraiment « **tomate**, au **tas**, **500 F** ».
4. **Recharge**.

**Attendu** : elle est dans l'étal, avec son unité et son prix.

## S14 — Supprimer un produit

1. Supprime le produit « **A** » (0 kg) s'il existe encore, et l'un des deux
   « **Piment** » si tu en vois deux.
2. **Recharge**.

**Attendu** : il a disparu de **Mon stock ET de la caisse**. Les deux écrans
doivent dire la même chose — ils lisaient deux listes différentes jusqu'à
aujourd'hui.

## S15 — Les périodes du résumé

1. Dans **Mes ventes**, passe sur **7 jours**, puis **Ce mois**, puis **Perso**.

**Attendu** : les totaux changent de façon cohérente (7 jours ≥ aujourd'hui,
ce mois ≥ 7 jours). Signale toute période qui affiche **moins** qu'une période
plus courte.

## S16 — Ce qui est dit et ce qui est écrit

Sur les écrans que tu ouvres, relève **toute information importante qui
n'existe qu'en texte** : un message d'erreur muet, un chiffre affiché sans
être dit, une décision demandée sans voix.

C'est la règle numéro un de ce produit : **la marchande ne lit pas**.

*(Exception connue, déjà nommée : « Je n'ai pas compris. Touche le micro et
redis-moi. » s'affiche sans être dite — le clip n'est pas encore enregistré.)*

---

## Ton rapport

```
Hash testé : ………   Date/heure : ………   Largeur réelle : ………

S7  dépense (motif + catégorie)   ✅ / ❌ / non testé
S8  journée de caisse             ✅ / ❌ / non testé
S9  monnaie rendue                ✅ / ❌ / non testé
S10 annulation → stock rendu      ✅ / ❌ / non testé
S11 vente à plusieurs lignes      ✅ / ❌ / non testé
S12 hors-ligne                    ✅ / ❌ / non testé
S13 refus de saisie               ✅ / ❌ / non testé
S14 suppression                   ✅ / ❌ / non testé
S15 périodes                      ✅ / ❌ / non testé
S16 information muette            (liste)
```

**Dis ce que tu n'as pas pu tester.** Un silence se lit comme « ça marche ».
