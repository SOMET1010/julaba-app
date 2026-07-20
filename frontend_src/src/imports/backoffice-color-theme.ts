Prompt à donner à Figma Make :

---

**Instruction de modification UI – Alignement des couleurs du Back-Office**

Je souhaite **aligner totalement la palette du Back-Office avec celle déjà utilisée dans le profil “Identificateur”**.

Important :

* **Ne modifier absolument rien d’autre que les couleurs.**
* **Aucun changement de layout, structure, typographie, spacing, animation ou logique métier.**
* Le Back-Office doit simplement **reprendre exactement la même palette que l’interface Identificateur**.

---

### 1️⃣ Source de référence obligatoire

La **référence visuelle et colorimétrique** est :

**Profil : Identificateur**

Tu dois reprendre **exactement les mêmes couleurs pour :**

* fond principal
* fond des cartes
* couleur des CTA
* hover des boutons
* sidebar
* header
* icônes actives
* badges neutres
* éléments sélectionnés
* highlights

Le Back-Office doit **visuellement appartenir à la même famille UI que l’Identificateur**.

---

### 2️⃣ Règle de cohérence

Pour garantir la cohérence :

Créer un **fichier thème centralisé** :

```
/src/app/components/backoffice/bo-theme.ts
```

Puis **importer les couleurs depuis ce thème**, mais **en utilisant exactement les mêmes valeurs que celles utilisées par le profil Identificateur**.

Exemple :

```ts
export const BO_PRIMARY = IDENTIFICATEUR_PRIMARY
export const BO_SECONDARY = IDENTIFICATEUR_SECONDARY
export const BO_BACKGROUND = IDENTIFICATEUR_BACKGROUND
export const BO_CARD = IDENTIFICATEUR_CARD
```

Le Back-Office doit donc **hériter visuellement du thème Identificateur**.

---

### 3️⃣ Zones à adapter

Appliquer ces couleurs sur :

**BOLayout**

* sidebar
* header
* background global

**Composants BO**

* boutons principaux
* boutons secondaires
* cards
* tableaux
* indicateurs actifs
* hover states
* badges neutres

---

### 4️⃣ Éléments à ne pas modifier

Ne jamais modifier :

* couleurs sémantiques des statuts
  (vert = succès, rouge = erreur, orange = attente)

* charts / graphiques

* animations

* logique des composants

---

### 5️⃣ Vérification finale

Après modification, effectuer un contrôle et me confirmer :

1. que **le Back-Office utilise exactement la même palette que l’Identificateur**
2. que **aucun autre profil n’a été impacté**
3. la **liste des fichiers modifiés**
4. qu’**aucune couleur hardcodée ne reste dans les fichiers BO**

---
