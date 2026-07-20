Réponses à lui transmettre directement.

---

**1️⃣ Constantes de couleurs**

Choisir **Option B**.

Centraliser toutes les couleurs du Back-Office dans **un seul fichier thème**.

Créer par exemple :

`/src/app/components/backoffice/bo-theme.ts`

Avec uniquement ces variables :

```
export const BO_PRIMARY = "#EEC053";
export const BO_SECONDARY = "#181816";
```

Tous les composants BackOffice devront **importer ces constantes**.

Objectif :

* éviter les couleurs hardcodées
* permettre un changement global de palette plus tard
* garantir une cohérence totale du thème

---

**2️⃣ Gradients**

Les gradients doivent **être adaptés à la nouvelle palette**.

Règle :

Base toujours sur **#EEC053**

Exemple acceptable :

```
#EEC053 → #D4A83A
```

ou

```
#EEC053 → #C99A2E
```

Ne jamais introduire d’autres couleurs.

Les gradients doivent rester **très subtils**.

---

**3️⃣ Badges de statut**

Les couleurs **sémantiques doivent rester**.

Ne pas remplacer par la palette dorée.

Donc :

* Vert = actif
* Rouge = erreur / rejet
* Orange = attente
* Bleu = information

La palette **#EEC053 / #181816** ne sert **pas** aux statuts métier.

---

**4️⃣ Charts**

Ne pas toucher aux charts.

Les graphiques doivent **conserver leur palette actuelle**.

Raison :

* lisibilité des données
* distinction visuelle entre séries

La nouvelle palette concerne **uniquement l’UI structurelle**.

---

**5️⃣ BOLayout**

Oui, c’est exactement cela.

Structure à appliquer :

Sidebar background
`#181816`

Header background
`#181816`

Dashboard background
`#181816`

Éléments actifs :

`#EEC053`

Exemples :

* menu actif
* bouton principal
* indicateur actif
* hover important
* CTA

Texte :

sur `#181816` → **blanc ou gris clair**
sur `#EEC053` → **noir**

---

**Rappel critique**

Ne modifier **aucun** :

* layout
* spacing
* animation
* typographie
* logique métier
* composants fonctionnels

Modification **couleurs uniquement** et **Back-Office uniquement**.

---

Après implémentation, demander un **rapport listant** :

1. tous les fichiers modifiés
2. confirmation que **les autres profils n’ont pas été impactés**
3. confirmation que **toutes les couleurs sont maintenant importées depuis `bo-theme.ts`**.
