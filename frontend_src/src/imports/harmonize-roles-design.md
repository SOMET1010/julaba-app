CONTEXTE

Les 5 rôles existent déjà avec leurs propres données, écrans et logique métier.

Le rôle **Marchand** est 90% finalisé (UI/UX, animations, composants, responsive).
Les autres rôles existent mais ne respectent pas encore parfaitement le même système visuel.

Objectif :
Harmoniser **Producteur, Coopérative, Identificateur et Administrateur** pour qu’ils utilisent **exactement le même Design System, les mêmes animations et la même structure UI que le Marchand**, tout en conservant leurs données métier spécifiques.

---

# 1️⃣ RÈGLE FONDAMENTALE (NON NÉGOCIABLE)

* Cloner **100% du système UI du Marchand**

* Conserver :

  * Grilles
  * Spacings
  * Radius
  * Ombres
  * Hiérarchie typographique
  * Styles de cards
  * Styles de modals
  * Styles d’inputs
  * Structure Header
  * Structure Bottom bar
  * Micro-interactions
  * États (hover, active, focus, disabled)
  * Transitions
  * Animations
  * Système de composants et variants

* Adapter uniquement :

  * Les contenus
  * Les KPI
  * Les champs métier
  * Les libellés
  * Les icônes spécifiques
  * La couleur dominante du rôle

⚠️ Aucune donnée Marchand ne doit apparaître dans les autres rôles.
⚠️ Aucune création d’un nouveau style non existant dans le Marchand.

---

# 2️⃣ DESIGN SYSTEM À CLONER À 100%

## 🎯 GRILLE

### Desktop

* Max width : 1440px
* Content : 1280px
* 12 colonnes
* Gutter : 24px
* Margin : 80px

### Tablet

* 8 colonnes
* Gutter : 20px
* Margin : 40px

### Mobile

* 4 colonnes
* Gutter : 16px
* Margin : 20px

Même breakpoints que Marchand.

---

## 🎨 COULEURS PAR RÔLE (remplacement du Primary uniquement)

Tous les autres tokens restent identiques au Marchand.

* Marchand → #C66A2C
* Producteur → #2E8B57
* Coopérative → #2072AF
* Identificateur → #9F8170
* Administrateur → #712864

Règle :

* Le Primary du rôle = sa couleur
* Boutons CTA = Primary du rôle
* Icônes actives = Primary
* Bottom bar active item = Primary
* Badges principaux = Primary light
* Focus ring = Primary

Ne modifier aucun autre token.

---

## 🔠 TYPOGRAPHIE

Reprendre exactement :

* Font family
* Font weights
* Scale
* Line-height
* Letter spacing

Hiérarchie inchangée.

---

## 📦 COMPOSANTS À CLONER STRICTEMENT

### 1. Header

* Même hauteur
* Même shadow
* Même structure :

  * Titre
  * Subtitle optionnel
  * Icône action droite
* Animation scroll shrink identique

---

### 2. Bottom Bar

Conserver :

* Hauteur
* Blur background
* Animation active state
* Indicateur animé
* Micro-interaction pression

Adapter uniquement les labels :

Marchand :

* Accueil
* Marché
* Produit
* Moi

Producteur :

* Accueil
* Commandes
* Productions
* Moi

Coopérative :

* Accueil
* Membres
* Stocks
* Moi

Identificateur :

* Accueil
* Identifications
* Rapports
* Moi

Administrateur :

* Dashboard global
* Utilisateurs
* Transactions
* Paramètres

Même comportement actif.

---

### 3. Cards

Conserver :

* Radius exact
* Padding exact
* Ombres exactes
* Hover lift
* Transition 180–220ms ease-in-out
* Structure interne (title / subtitle / metrics / CTA)

Adapter seulement le contenu.

---

### 4. Modals

Conserver :

* Backdrop blur
* Animation open
* Animation close
* Sticky CTA mobile
* Header modal identique
* Cross close top-right

Adapter champs métier.

---

### 5. Inputs

* Même height
* Même label animation
* Même error state
* Même focus ring (Primary du rôle)

---

### 6. Buttons

* Primary
* Secondary
* Ghost
* Danger
* Loading state
* Press animation scale 0.97

---

# 3️⃣ STRUCTURE DES RÔLES

---

## 🟠 MARCHAND (référence)

Ne rien modifier. Sert de base.

---

## 🟢 PRODUCTEUR

Couleur : #2E8B57

Bottom bar :

* Accueil
* Commandes
* Productions
* Moi

Dashboard :

* KPI production
* Commandes en attente
* Revenus estimés
* Volume récolté

Commandes :

* Liste cards statut
* Détail commande modal

Productions :

* Liste produits cultivés
* Ajout production modal

Profil :
Structure identique Marchand :

* Infos générales
* Paramètres
* Sécurité
* Déconnexion

Champs adaptés :

* Type culture
* Surface
* Capacité mensuelle

---

## 🔵 COOPÉRATIVE

Couleur : #2072AF

Bottom bar :

* Accueil
* Membres
* Stocks
* Moi

Dashboard :

* Nombre membres
* Volume groupé
* Transactions
* Activité récente

Membres :

* Liste
* Badge statut
* Modal détail

Stocks :

* Produits mutualisés
* Quantités
* Historique

Profil :
Même structure que Marchand.

---

## 🟤 IDENTIFICATEUR

Couleur : #9F8170

Bottom bar :

* Accueil
* Identifications
* Rapports
* Moi

Dashboard :

* Demandes en attente
* Validations du jour
* Rejets
* Performance

Identifications :

* Liste demandes
* Modal validation
* CTA confirmer / rejeter

Rapports :

* Liste rapports
* Upload
* Historique

Profil :
Même structure que Marchand.

---

## 🟣 ADMINISTRATEUR

Couleur : #712864

Bottom bar :

* Dashboard global
* Utilisateurs
* Transactions
* Paramètres

Dashboard global :

* KPI globaux
* Graphiques animés
* Volume plateforme

Utilisateurs :

* Liste par rôle
* Suspendre
* Modifier

Transactions :

* Historique complet
* Filtres

Paramètres :

* Gestion rôles
* Configuration
* Logs

---

# 4️⃣ ANIMATIONS (OBLIGATOIRE)

Reproduire EXACTEMENT celles du Marchand :

* Page transition slide + fade (300ms)
* Modal slide-up mobile
* Fade + scale desktop
* Hover card elevation
* Button press scale 0.97
* Skeleton shimmer loading
* Toast notification slide-in right
* Counter animation KPI
* Animated tab indicator bottom bar

Aucune interface statique.

---

# 5️⃣ COHÉRENCE GLOBALE

* Bouton retour visible partout
* CTA principal toujours dominant
* Empty states illustrés
* Micro feedback après chaque action
* Responsive parfait Desktop / Tablet / Mobile
* Aucun changement de spacing
* Aucun changement de radius
* Aucun changement de shadow

---

# 6️⃣ CONTRÔLES QUALITÉ

Vérifier :

* Aucun style non issu du Marchand
* Aucun champ Marchand dans autres rôles
* Tous les composants utilisent les mêmes variants
* Toutes les animations sont actives
* Tokens centralisés
* Auto-layout propre
* Responsive vérifié

---

# 7️⃣ LIVRABLE ATTENDU

* 5 rôles harmonisés et parfaitement synchronisée (créer un système de synchronisation unique)
* 100% cohérence UI/UX
* Composants partagés
* Variables couleur par rôle
* Desktop / Tablet / Mobile
* Animations configurées
* Design System unique centralisé

Objectif final :
Un seul système UI décliné en 5 rôles, différenciés uniquement par la couleur dominante et les données métier.


As-tu des questions avant ?