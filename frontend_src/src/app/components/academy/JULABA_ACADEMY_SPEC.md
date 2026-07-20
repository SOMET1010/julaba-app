# 🎓 JÙLABA ACADEMY - Spécifications Complètes

## 📅 Date : 2 Mars 2026
## 🎯 Version : 1.0.0

---

## 🎯 **OBJECTIFS**

1. ✅ **Augmenter engagement quotidien** → Défis et récompenses quotidiennes
2. ✅ **Améliorer qualité écosystème** → Formations sur bonnes pratiques
3. ✅ **Créer différenciation forte** → Module unique en Côte d'Ivoire
4. ✅ **Renforcer conformité cahier des charges** → Traçabilité et qualité

---

## 🏗️ **ARCHITECTURE GLOBALE**

### **5 Modules Existants + 1 Nouveau**

| Module | Description | Statut |
|--------|-------------|--------|
| 1️⃣ **Tantie Sagesse** | Assistant vocal intelligent | ✅ Universel |
| 2️⃣ **Wallet** | Gestion financière | ✅ Existant |
| 3️⃣ **Carte Professionnelle** | Identité numérique | ✅ Universel |
| 4️⃣ **Score JÙLABA** | Score de crédit/réputation | ✅ Existant |
| 5️⃣ **JÙLABA Academy** 🆕 | Gamification + Formation | 🔨 À créer |

---

## 🎓 **JÙLABA ACADEMY - VUE D'ENSEMBLE**

### **Concept**
Module de **micro-formation gamifiée** avec défis quotidiens, badges, niveaux et récompenses tangibles (points score JÙLABA).

### **Inspiration Design**
- **Duolingo** : Streaks, défis quotidiens, progression visuelle
- **LinkedIn Learning** : Micro-formations courtes (5-10 min)
- **Habitica** : Gamification avec quêtes et récompenses
- **Fintech mobile** : Design moderne, animations fluides

---

## 🎨 **DESIGN SYSTEM**

### **Couleurs Adaptatives**
Comme tous les modules universels, JÙLABA Academy s'adapte à chaque profil :

- **Marchand** → 🟠 #C66A2C
- **Producteur** → 🟢 #2E8B57
- **Coopérative** → 🔵 #2072AF
- **Institution** → 🟣 #712864
- **Identificateur** → 🟠 #9F8170

### **Icône du Module**
- **Primaire** : 🎓 GraduationCap (Lucide React)
- **Alternative** : 📚 BookOpen, 🏆 Trophy, ⭐ Sparkles

### **Typographie**
- Police : **Inter** (cohérent avec tout JÙLABA)
- Titres : **Bold/Black**
- Corps : **Medium/Regular**

---

## 📐 **STRUCTURE DU MODULE**

### **1. Point d'Accès**

#### **A) Widget sur la page Accueil (UniversalAccueil)**
```
┌─────────────────────────────────────┐
│  ACCUEIL MARCHAND                   │
│                                     │
│  ┌───────────────────────────────┐  │
│  │ 🎓 JÙLABA Academy             │  │
│  │                               │  │
│  │ 🔥 3 jours de streak !        │  │
│  │ ⭐ +50 points aujourd'hui      │  │
│  │                               │  │
│  │ [Continuer ma formation →]    │  │
│  └───────────────────────────────┘  │
│                                     │
│  [Dashboard KPIs...]               │
└─────────────────────────────────────┘
```

#### **B) Icône dans la Navigation (optionnel)**
Ajout d'un bouton "Academy" dans le bottom bar ou sidebar.

#### **C) Notification Push Quotidienne**
"🎓 Ton défi du jour est prêt ! +20 points JÙLABA à gagner"

---

### **2. Page Principale - JÙLABA Academy**

#### **Sections**

```
┌─────────────────────────────────────┐
│  🎓 JÙLABA ACADEMY                  │
│  ──────────────────────────────     │
│                                     │
│  1️⃣ EN-TÊTE DE PROGRESSION          │
│  ┌───────────────────────────────┐  │
│  │ 🔥 Streak : 7 jours           │  │
│  │ ⭐ Score : 850 pts            │  │
│  │ 🏆 Niveau : Bronze            │  │
│  │                               │  │
│  │ [Progress bar: 75% → Argent] │  │
│  └───────────────────────────────┘  │
│                                     │
│  2️⃣ DÉFI DU JOUR                    │
│  ┌───────────────────────────────┐  │
│  │ ✨ Défi : Vendre 5 produits   │  │
│  │ 📅 Expire dans : 14h 23min    │  │
│  │ 🎁 Récompense : +20 pts       │  │
│  │                               │  │
│  │ [Progrès: 3/5] ▓▓▓░░         │  │
│  └───────────────────────────────┘  │
│                                     │
│  3️⃣ FORMATIONS RECOMMANDÉES         │
│  ┌─────────┐ ┌─────────┐          │
│  │ 📚 Cours│ │ 📚 Cours│          │
│  │ 5 min  │ │ 8 min  │          │
│  │ +10 pts│ │ +15 pts│          │
│  └─────────┘ └─────────┘          │
│                                     │
│  4️⃣ MES BADGES                      │
│  🏅 🥇 🎯 🌟 🔓 (...)             │
│                                     │
│  5️⃣ LEADERBOARD (optionnel)         │
│  1. Mohamed - 1850 pts             │
│  2. Aïcha - 1720 pts               │
│  3. TOI - 850 pts ⭐               │
└─────────────────────────────────────┘
```

---

## 🎯 **SYSTÈME DE GAMIFICATION**

### **1. Niveaux (Progression)**

| Niveau | Seuil | Badge | Avantages |
|--------|-------|-------|-----------|
| **Débutant** | 0-200 pts | 🥉 | Accès formations de base |
| **Bronze** | 200-500 pts | 🟤 | Déblocage filtres avancés |
| **Argent** | 500-1000 pts | 🥈 | Priorité dans recherches |
| **Or** | 1000-2000 pts | 🥇 | Commission -10% sur transactions |
| **Platine** | 2000-5000 pts | 💎 | Statut VIP + support prioritaire |
| **Diamant** | 5000+ pts | 💠 | Accès beta features + événements exclusifs |

### **2. Points Academy**

**Sources de points** :
- ✅ Compléter une formation : **+10 à +50 pts** (selon durée)
- ✅ Défi quotidien réussi : **+20 pts**
- ✅ Streak de 7 jours : **+50 pts bonus**
- ✅ Répondre correctement à un quiz : **+5 pts/question**
- ✅ Partager une formation : **+10 pts**
- ✅ Parrainer un nouveau membre : **+100 pts**

**Lien avec Score JÙLABA** :
```
Points Academy → +1 point Score JÙLABA tous les 10 points Academy
```
Exemple : 850 pts Academy = +85 pts Score JÙLABA

### **3. Badges (Collectibles)**

#### **Badges Universels (tous profils)**
- 🔥 **Enflammé** : 7 jours de streak
- 🚀 **Fusée** : Compléter 10 formations
- 🎯 **Précis** : 100% de bonnes réponses sur 5 quiz
- 🌟 **Étoile montante** : Atteindre niveau Argent
- 📚 **Bibliophile** : Compléter toutes les formations d'une catégorie
- 🏆 **Champion** : Top 3 du leaderboard régional

#### **Badges Spécifiques par Rôle**

**Marchand** :
- 💰 **Vendeur d'Or** : Vendre 100 produits
- 📊 **Gestionnaire Pro** : Utiliser toutes les features de caisse
- 🛒 **Expert Marché** : Acheter sur le marché virtuel 20 fois

**Producteur** :
- 🌱 **Agriculteur Expert** : Compléter "Rotation des cultures"
- 🌾 **Récolte Abondante** : Enregistrer 50 récoltes
- ☀️ **Météo Pro** : Utiliser les alertes météo 30 jours d'affilée

**Coopérative** :
- 👥 **Leader** : Gérer plus de 50 membres
- 📈 **Croissance** : +20 membres en 1 mois
- 🤝 **Solidaire** : Distribuer 100 commandes aux membres

**Identificateur** :
- 🔍 **Détective** : Identifier 100 acteurs
- ✅ **Vérificateur** : 100% de dossiers validés (0 erreur sur 20)
- 📍 **Explorateur** : Couvrir 10 territoires différents

**Institution** :
- 📊 **Analyste** : Générer 50 rapports
- 🎯 **Stratège** : Créer 10 campagnes
- 🌍 **Superviseur** : Gérer 5 régions

### **4. Streaks (Séries)**

**Système de séries consécutives** :
- 🔥 **Streak actuel** : Nombre de jours consécutifs avec au moins 1 action
- 🏆 **Meilleur streak** : Record personnel
- 🎁 **Récompenses** :
  - 3 jours → +10 pts
  - 7 jours → +50 pts + Badge 🔥
  - 30 jours → +200 pts + Badge 💎
  - 100 jours → +1000 pts + Badge 👑

---

## 📚 **BIBLIOTHÈQUE DE FORMATIONS**

### **Format des Formations**

Chaque formation = **Micro-learning** (5-15 minutes max)

**Structure** :
1. **Titre** (ex: "Comment bien gérer sa caisse")
2. **Durée** (ex: 8 min)
3. **Difficulté** (🟢 Débutant | 🟡 Intermédiaire | 🔴 Avancé)
4. **Points à gagner** (ex: +15 pts)
5. **Contenu** :
   - 3-5 slides visuelles (images + texte court)
   - Option audio (Tantie Sagesse peut lire !)
   - Quiz de validation (3-5 questions)
6. **Badge/Certificat** à la fin

---

### **Catégories de Formations PAR PROFIL**

#### **🟠 MARCHAND**

**Gestion de Commerce** :
- ✅ "Ouvrir et fermer sa caisse correctement" (5 min, +10 pts)
- ✅ "Gérer les crédits clients" (8 min, +15 pts)
- ✅ "Calculer sa marge bénéficiaire" (10 min, +20 pts)
- ✅ "Fidéliser ses clients" (7 min, +15 pts)

**Utilisation de JÙLABA** :
- ✅ "Créer une fiche produit optimale" (5 min, +10 pts)
- ✅ "Utiliser le marché virtuel efficacement" (8 min, +15 pts)
- ✅ "Interpréter son tableau de bord" (6 min, +12 pts)

**Bonnes Pratiques** :
- ✅ "Hygiène et conservation des produits frais" (10 min, +20 pts)
- ✅ "Prix justes et négociation gagnant-gagnant" (8 min, +15 pts)

---

#### **🟢 PRODUCTEUR**

**Agriculture Moderne** :
- ✅ "Rotation des cultures pour un sol fertile" (12 min, +25 pts)
- ✅ "Techniques d'irrigation efficaces" (10 min, +20 pts)
- ✅ "Lutte biologique contre les ravageurs" (15 min, +30 pts)
- ✅ "Optimiser sa récolte selon les saisons" (8 min, +15 pts)

**Gestion de Production** :
- ✅ "Planifier ses cycles de culture" (10 min, +20 pts)
- ✅ "Tracer ses récoltes sur JÙLABA" (5 min, +10 pts)
- ✅ "Conserver ses récoltes sans perte" (12 min, +25 pts)

**Qualité & Conformité** :
- ✅ "Normes de qualité des produits vivriers" (10 min, +20 pts)
- ✅ "Certificat de conformité : mode d'emploi" (8 min, +15 pts)

---

#### **🔵 COOPÉRATIVE**

**Gestion Coopérative** :
- ✅ "Principes de la gouvernance coopérative" (15 min, +30 pts)
- ✅ "Gérer les cotisations et dividendes" (12 min, +25 pts)
- ✅ "Résoudre les conflits entre membres" (10 min, +20 pts)

**Logistique & Distribution** :
- ✅ "Optimiser les commandes groupées" (8 min, +15 pts)
- ✅ "Gérer les stocks collectifs" (10 min, +20 pts)
- ✅ "Traçabilité des produits membres" (12 min, +25 pts)

**Leadership** :
- ✅ "Motiver et fidéliser les membres" (10 min, +20 pts)
- ✅ "Recruter de nouveaux producteurs" (8 min, +15 pts)

---

#### **🟠 IDENTIFICATEUR**

**Méthodologie** :
- ✅ "Les 4 étapes d'une identification réussie" (10 min, +20 pts)
- ✅ "Vérifier les documents officiels" (8 min, +15 pts)
- ✅ "Utiliser le GPS pour la géolocalisation" (5 min, +10 pts)

**Qualité & Conformité** :
- ✅ "Critères d'éligibilité JÙLABA" (12 min, +25 pts)
- ✅ "Détecter les fraudes et incohérences" (15 min, +30 pts)
- ✅ "Respecter la confidentialité des données" (8 min, +15 pts)

**Terrain** :
- ✅ "Techniques d'entretien efficace" (10 min, +20 pts)
- ✅ "Gérer les refus et situations difficiles" (12 min, +25 pts)

---

#### **🟣 INSTITUTION**

**Supervision** :
- ✅ "Lire et interpréter les analytics" (15 min, +30 pts)
- ✅ "Détecter les anomalies dans l'écosystème" (12 min, +25 pts)
- ✅ "Créer des rapports d'impact" (10 min, +20 pts)

**Stratégie** :
- ✅ "Définir des KPIs pertinents" (12 min, +25 pts)
- ✅ "Piloter une campagne de sensibilisation" (15 min, +30 pts)
- ✅ "Politique de conformité et audit" (10 min, +20 pts)

**Gouvernance** :
- ✅ "Cadre réglementaire du secteur vivrier" (15 min, +30 pts)
- ✅ "Gérer les litiges et sanctions" (12 min, +25 pts)

---

## 🎮 **DÉFIS QUOTIDIENS**

### **Système de Défis**

Chaque jour à **6h00 AM**, un nouveau défi est généré selon le profil.

**Caractéristiques** :
- ⏰ **Expire à minuit** (00h00)
- 🎁 **Récompense** : +20 pts Academy + Badge occasionnel
- 🔄 **Adaptatif** : Basé sur l'activité de l'utilisateur

---

### **Exemples de Défis par Profil**

#### **Marchand**
- ✅ "Vendre au moins 5 produits aujourd'hui"
- ✅ "Enregistrer 3 nouvelles ventes avec différents clients"
- ✅ "Mettre à jour ton stock (ajouter/modifier 5 produits)"
- ✅ "Clôturer ta journée avant 20h avec au moins 10,000 FCFA"
- ✅ "Acheter 2 produits sur le marché virtuel"

#### **Producteur**
- ✅ "Enregistrer une nouvelle récolte"
- ✅ "Mettre à jour l'état de 3 parcelles"
- ✅ "Compléter une formation sur l'agriculture"
- ✅ "Répondre à 2 commandes de coopératives"
- ✅ "Consulter les alertes météo"

#### **Coopérative**
- ✅ "Ajouter 2 nouveaux membres"
- ✅ "Distribuer 5 commandes aux producteurs"
- ✅ "Organiser une réunion (créer un événement)"
- ✅ "Vérifier l'état des stocks collectifs"
- ✅ "Générer un rapport mensuel"

#### **Identificateur**
- ✅ "Identifier 3 nouveaux acteurs"
- ✅ "Vérifier et valider 5 dossiers en attente"
- ✅ "Couvrir un nouveau territoire"
- ✅ "Compléter une formation sur la conformité"
- ✅ "Soumettre 10 identifications sans erreur"

#### **Institution**
- ✅ "Consulter les analytics du jour"
- ✅ "Générer 2 rapports régionaux"
- ✅ "Vérifier 10 acteurs en attente de validation"
- ✅ "Créer une nouvelle campagne de sensibilisation"
- ✅ "Analyser les performances de 5 coopératives"

---

## 🏆 **LEADERBOARD (Classement)**

### **Types de Leaderboards**

1. **🌍 National** : Top 100 de toute la Côte d'Ivoire
2. **📍 Régional** : Top 50 par région (Abidjan, Bouaké, etc.)
3. **🏢 Coopérative** : Classement interne (pour Producteurs membres)
4. **👥 Amis** : Comparer avec ses contacts

### **Critères de Classement**
- Points Academy (principal)
- Niveau atteint
- Nombre de badges
- Streak actuel

### **Récompenses Mensuelles**
- 🥇 **Top 1** : +500 pts Academy + Badge "Champion du Mois" + Mise en avant sur la plateforme
- 🥈 **Top 2-3** : +200 pts Academy + Badge "Podium"
- 🏅 **Top 10** : +100 pts Academy + Badge "Top 10"

---

## 🔔 **NOTIFICATIONS & ENGAGEMENT**

### **Notifications Push**

| Événement | Message | Heure |
|-----------|---------|-------|
| **Défi du jour** | "🎓 Ton défi est prêt ! +20 pts à gagner" | 06h00 |
| **Streak en danger** | "🔥 Ne perds pas ton streak de 7 jours !" | 20h00 (si pas d'action) |
| **Nouvelle formation** | "📚 Nouvelle formation : 'Gérer sa caisse' (8 min)" | Variable |
| **Badge débloqué** | "🏆 Badge 'Enflammé' débloqué ! +50 pts" | Instantané |
| **Niveau up** | "🚀 Niveau Bronze atteint ! Nouveaux avantages débloqués" | Instantané |
| **Leaderboard** | "🏅 Tu es 3ème de ta région ! Encore 50 pts pour la 2ème place" | Dimanche 18h00 |

---

## 📱 **INTÉGRATION UI/UX**

### **1. Widget sur Accueil (UniversalAccueil)**

**Position** : Juste après le Dashboard KPIs, avant les actions principales

**Contenu** :
- Icône 🎓 + Titre "JÙLABA Academy"
- Streak actuel (🔥 X jours)
- Points gagnés aujourd'hui (⭐ +X pts)
- CTA "Continuer ma formation →"
- Badge du défi du jour (si actif)

**Comportement** :
- Clic → Ouvre la page/modal JÙLABA Academy
- Animation : Pulse si défi non complété

---

### **2. Page/Modal JÙLABA Academy**

**Type** : Page dédiée (comme Marché/Produits) OU Modal full-screen (comme Tantie Sagesse)

**Recommandation** : **Page dédiée** pour plus d'espace et meilleure UX

**Route** :
```tsx
// Routes
/marchand/academy
/producteur/academy
/cooperative/academy
/identificateur/academy
/institution/academy
```

**Navigation** :
- Accessible via le widget Accueil
- Icône dédiée dans la bottom bar (optionnel)
- Accessible via le menu Profil (section "Formation")

---

### **3. Composants Universels**

#### **Structure des fichiers**

```
/src/app/components/academy/
  ├── JulabaAcademy.tsx          # Page principale
  ├── AcademyWidget.tsx          # Widget pour Accueil
  ├── ProgressHeader.tsx         # En-tête de progression
  ├── DailyChallenge.tsx         # Carte défi du jour
  ├── FormationCard.tsx          # Carte de formation
  ├── FormationViewer.tsx        # Lecteur de formation
  ├── BadgeGallery.tsx           # Galerie de badges
  ├── Leaderboard.tsx            # Classement
  ├── AcademyContext.tsx         # Context API
  ├── types.ts                   # Types TypeScript
  └── formations/                # Contenu des formations
      ├── marchand.ts
      ├── producteur.ts
      ├── cooperative.ts
      ├── identificateur.ts
      └── institution.ts
```

---

## 🎨 **DESIGN DÉTAILLÉ**

### **Widget Accueil (AcademyWidget)**

```tsx
┌───────────────────────────────────────┐
│ 🎓 JÙLABA ACADEMY                     │
│ ─────────────────────────────────     │
│                                       │
│ 🔥 7 jours de streak !                │
│ ⭐ +35 points aujourd'hui              │
│                                       │
│ ⏰ Défi du jour : Vendre 5 produits   │
│ Progrès : ▓▓▓░░ 3/5                   │
│                                       │
│ [ Continuer ma formation → ]          │
└───────────────────────────────────────┘
```

**Couleurs** :
- Bordure et accents : Couleur du profil
- Fond : Blanc avec subtle gradient
- Icônes : Couleur du profil

---

### **Page Principale (JulabaAcademy)**

#### **Section 1 : En-tête de Progression**
```tsx
┌───────────────────────────────────────┐
│ 🎓 JÙLABA ACADEMY                     │
│                                       │
│ ┌─────────────────────────────────┐   │
│ │ Niveau: Bronze 🟤              │   │
│ │ ────────────────────           │   │
│ │ 750 / 1000 pts → Argent       │   │
│ │ [Progress bar: 75%]           │   │
│ │                               │   │
│ │ 🔥 Streak: 7 jours            │   │
│ │ 🏆 Meilleur: 12 jours         │   │
│ │ ⭐ Score total: 850 pts       │   │
│ └─────────────────────────────────┘   │
└───────────────────────────────────────┘
```

#### **Section 2 : Défi du Jour**
```tsx
┌───────────────────────────────────────┐
│ ✨ DÉFI DU JOUR                       │
│ ─────────────────────────────────     │
│                                       │
│ ┌─────────────────────────────────┐   │
│ │ 🎯 Vendre 5 produits             │   │
│ │                                 │   │
│ │ Progrès : 3/5 ▓▓▓░░            │   │
│ │                                 │   │
│ │ ⏰ Expire dans : 14h 23min      │   │
│ │ 🎁 Récompense : +20 pts + 🏅    │   │
│ └─────────────────────────────────┘   │
└───────────────────────────────────────┘
```

#### **Section 3 : Formations Recommandées**
```tsx
┌───────────────────────────────────────┐
│ 📚 FORMATIONS RECOMMANDÉES            │
│ ─────────────────────────────────     │
│                                       │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│ │ 📖 Gérer│ │ 💰 Marge│ │ 🛒 Fidé-│  │
│ │ sa caisse│ │ bénéf. │ │ liser  │  │
│ │         │ │         │ │         │  │
│ │ 🟢 5min │ │ 🟡 10min│ │ 🟢 7min │  │
│ │ +10 pts │ │ +20 pts │ │ +15 pts │  │
│ │         │ │         │ │         │  │
│ │ [Démarrer]│[Démarrer]│[Démarrer]│  │
│ └─────────┘ └─────────┘ └─────────┘  │
│                                       │
│ [Voir toutes les formations →]       │
└───────────────────────────────────────┘
```

#### **Section 4 : Mes Badges**
```tsx
┌───────────────────────────────────────┐
│ 🏆 MES BADGES (12/50)                 │
│ ─────────────────────────────────     │
│                                       │
│ 🔥 🚀 🎯 🌟 📚 💰 🛒 🏅              │
│ ⭐ 💎 🔓 🌱                          │
│                                       │
│ [Voir tous les badges →]             │
└───────────────────────────────────────┘
```

#### **Section 5 : Leaderboard**
```tsx
┌───────────────────────────────────────┐
│ 🏅 CLASSEMENT RÉGIONAL                │
│ ─────────────────────────────────     │
│                                       │
│ 🥇 1. Mohamed K.      1850 pts        │
│ 🥈 2. Aïcha B.        1720 pts        │
│ ⭐ 3. TOI (Kouakou)    850 pts ←      │
│ 4. Fatou D.           820 pts         │
│ 5. Yao T.             780 pts         │
│                                       │
│ [Voir le classement complet →]       │
└───────────────────────────────────────┘
```

---

### **Lecteur de Formation (FormationViewer)**

**Type** : Modal full-screen ou page dédiée

#### **Structure**
```tsx
┌───────────────────────────────────────┐
│ [← Retour]    Formation    [X Fermer] │
│ ───────────────────────────────────   │
│                                       │
│ 📖 Gérer sa caisse correctement      │
│ 🟢 Débutant · 5 min · +10 pts        │
│                                       │
│ [Progress: Slide 2/5] ▓▓░░░          │
│                                       │
│ ┌─────────────────────────────────┐   │
│ │                                 │   │
│ │   [Image/Illustration]          │   │
│ │                                 │   │
│ │   📝 Contenu textuel :          │   │
│ │   "Toujours compter ta caisse   │   │
│ │   avant d'ouvrir et après       │   │
│ │   fermeture. Note tous les      │   │
│ │   mouvements dans JÙLABA."      │   │
│ │                                 │   │
│ └─────────────────────────────────┘   │
│                                       │
│ [🔊 Écouter avec Tantie Sagesse]     │
│                                       │
│ [ ← Précédent ]    [ Suivant → ]     │
└───────────────────────────────────────┘
```

#### **Fin de Formation : Quiz**
```tsx
┌───────────────────────────────────────┐
│ ✅ QUIZ DE VALIDATION                 │
│ ───────────────────────────────────   │
│                                       │
│ Question 1/3                          │
│                                       │
│ Quand faut-il compter sa caisse ?     │
│                                       │
│ ⭕ A. Le matin uniquement              │
│ ⭕ B. Le soir uniquement               │
│ ⚫ C. Matin ET soir                    │
│ ⭕ D. Une fois par semaine             │
│                                       │
│ [ Valider → ]                         │
└───────────────────────────────────────┘
```

#### **Résultat Quiz**
```tsx
┌───────────────────────────────────────┐
│ 🎉 FÉLICITATIONS !                    │
│ ───────────────────────────────────   │
│                                       │
│ ✅ 3/3 bonnes réponses (100%)         │
│                                       │
│ Tu as gagné :                         │
│ ⭐ +10 points Academy                 │
│ 🏅 Badge "Gestionnaire"               │
│ 💎 +1 point Score JÙLABA              │
│                                       │
│ [ Voir ma progression ]               │
│ [ Formation suivante → ]              │
└───────────────────────────────────────┘
```

---

## 💾 **STRUCTURE DE DONNÉES**

### **UserAcademy (Extension du User)**

```typescript
interface UserAcademy {
  userId: string;
  
  // Progression
  academyPoints: number;        // Points Academy cumulés
  academyLevel: AcademyLevel;   // Niveau actuel
  
  // Streaks
  currentStreak: number;        // Série actuelle
  longestStreak: number;        // Meilleur série
  lastActivityDate: string;     // Dernière activité (pour calcul streak)
  
  // Badges
  badges: Badge[];              // Liste des badges débloqués
  
  // Formations
  completedFormations: string[]; // IDs des formations complétées
  inProgressFormation: {
    formationId: string;
    currentSlide: number;
    startedAt: string;
  } | null;
  
  // Défis
  dailyChallenges: DailyChallenge[];
  completedChallenges: string[]; // IDs des défis complétés
  
  // Leaderboard
  regionalRank: number;
  nationalRank: number;
}

type AcademyLevel = 'debutant' | 'bronze' | 'argent' | 'or' | 'platine' | 'diamant';

interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlockedAt: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

interface DailyChallenge {
  id: string;
  date: string;           // Date du défi
  role: UserRole;
  title: string;
  description: string;
  target: number;         // Objectif (ex: 5 ventes)
  current: number;        // Progression actuelle
  reward: number;         // Points à gagner
  expiresAt: string;
  completed: boolean;
  badge?: string;         // Badge optionnel à débloquer
}

interface Formation {
  id: string;
  role: UserRole | 'all'; // 'all' = universel
  category: string;
  title: string;
  description: string;
  duration: number;       // en minutes
  difficulty: 'debutant' | 'intermediaire' | 'avance';
  points: number;         // Points à gagner
  badge?: string;         // Badge optionnel
  slides: FormationSlide[];
  quiz: QuizQuestion[];
  prerequisites?: string[]; // IDs de formations requises
}

interface FormationSlide {
  slideNumber: number;
  title: string;
  content: string;
  imageUrl?: string;
  audioUrl?: string;      // Pour Tantie Sagesse
}

interface QuizQuestion {
  question: string;
  options: string[];      // 4 options
  correctAnswer: number;  // Index de la bonne réponse (0-3)
  explanation?: string;   // Explication après réponse
}
```

---

## 🔗 **INTÉGRATION AVEC L'EXISTANT**

### **1. Score JÙLABA**

**Formule de conversion** :
```
Score JÙLABA += Math.floor(Academy Points / 10)
```

Exemple :
- 850 pts Academy → +85 pts Score JÙLABA
- Complète formation (+20 pts) → +2 pts Score JÙLABA

**Affichage** :
Dans `UniversalProfil`, ajouter une section "Academy" :
```tsx
┌─────────────────────────────────┐
│ 🎓 JÙLABA Academy               │
│                                 │
│ Niveau : Bronze 🟤             │
│ Points : 850 pts               │
│ Badges : 12/50                 │
│ Contribution Score : +85 pts   │
│                                 │
│ [ Voir ma progression → ]      │
└─────────────────────────────────┘
```

---

### **2. Tantie Sagesse**

**Intégration** :
- Tantie Sagesse peut **lire** les formations (audio TTS)
- Dans `FormationViewer`, bouton "🔊 Écouter avec Tantie Sagesse"
- Tantie Sagesse peut **rappeler** le défi du jour
- Tantie Sagesse peut **féliciter** pour les badges débloqués

**Exemple de dialogue** :
```
User: "Tantie, c'est quoi mon défi aujourd'hui ?"
Tantie: "Ton défi est de vendre 5 produits ! 
         Tu en as déjà vendu 3, plus que 2 ! 
         Tu peux gagner 20 points. Tu veux que 
         je te rappelle ce soir ?"
```

---

### **3. Navigation**

**Ajout dans Bottom Bar** (optionnel) :
```tsx
┌────────────────────────────────────┐
│ ACCUEIL  MARCHÉ  🎓  PRODUITS  MOI │
└────────────────────────────────────┘
```

OU

**Widget uniquement sur Accueil** (recommandé pour ne pas surcharger)

---

### **4. Dashboard KPIs**

Dans `UniversalAccueil`, ajouter un KPI Academy :

```tsx
┌──────────────────────────────────┐
│ TABLEAU DE BORD                  │
│                                  │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐     │
│ │ CA │ │Vente│ │Dep.│ │Acad│     │
│ │50k │ │25k │ │10k │ │850 │     │
│ └────┘ └────┘ └────┘ └────┘     │
│                          ↑       │
│                    Academy Pts   │
└──────────────────────────────────┘
```

---

## 🚀 **PHASES DE DÉVELOPPEMENT**

### **PHASE 1 : MVP (Minimum Viable Product)**

**Objectif** : Tester le concept avec features essentielles

**Features** :
- ✅ Widget Academy sur Accueil
- ✅ Page JÙLABA Academy
- ✅ Système de points et niveaux
- ✅ 3 formations par profil (15 formations total)
- ✅ Défis quotidiens basiques
- ✅ 5 badges universels
- ✅ Conversion Points → Score JÙLABA

**Durée estimée** : 2-3 semaines

---

### **PHASE 2 : Enrichissement**

**Features** :
- ✅ 10 formations par profil (50 formations total)
- ✅ Quiz de validation
- ✅ 20 badges (universels + spécifiques)
- ✅ Système de streaks complet
- ✅ Notifications push
- ✅ Intégration Tantie Sagesse (lecture audio)

**Durée estimée** : 3-4 semaines

---

### **PHASE 3 : Gamification Avancée**

**Features** :
- ✅ Leaderboard régional et national
- ✅ Défis adaptatifs (basés sur l'activité réelle)
- ✅ Badges rares et légendaires
- ✅ Certificats téléchargeables
- ✅ Partage social (badges, certificats)
- ✅ Système de parrainage (gagner des points en invitant)

**Durée estimée** : 2-3 semaines

---

### **PHASE 4 : Contenu Avancé**

**Features** :
- ✅ 20+ formations par profil (100+ formations total)
- ✅ Vidéos courtes (2-3 min)
- ✅ Cas pratiques interactifs
- ✅ Événements spéciaux (formations limitées)
- ✅ Partenariats (formations certifiées par institutions)
- ✅ Mode hors-ligne (télécharger formations)

**Durée estimée** : 4-6 semaines

---

## 📊 **MÉTRIQUES DE SUCCÈS**

### **KPIs à Suivre**

| Métrique | Objectif | Fréquence |
|----------|----------|-----------|
| **DAU (Daily Active Users) Academy** | 60% des utilisateurs actifs | Quotidien |
| **Taux de complétion formations** | 80% des formations commencées | Hebdomadaire |
| **Streak moyen** | 5 jours | Hebdomadaire |
| **Défis complétés** | 70% des défis quotidiens | Quotidien |
| **Badges débloqués par user** | 10 badges/mois | Mensuel |
| **Temps moyen dans Academy** | 10 min/jour | Hebdomadaire |
| **Amélioration Score JÙLABA** | +15% grâce à Academy | Mensuel |

---

## ✅ **CHECKLIST DE LANCEMENT**

### **Technique**
- [ ] Composants universels créés
- [ ] Context API Academy
- [ ] Intégration User (extension du modèle)
- [ ] Système de points et niveaux
- [ ] Bibliothèque de formations (MVP : 15 formations)
- [ ] Système de badges
- [ ] Défis quotidiens
- [ ] Widget Accueil
- [ ] Page/Modal Academy
- [ ] Lecteur de formations
- [ ] Quiz de validation
- [ ] Notifications push

### **Contenu**
- [ ] Rédaction de 15 formations (3 par profil)
- [ ] Création de 20 slides (4 slides/formation x 5 formations)
- [ ] Rédaction de 45 questions quiz (3 questions/formation)
- [ ] Design de 10 badges
- [ ] Liste de 25 défis quotidiens (5 par profil)

### **Design**
- [ ] Maquettes UI (Figma)
- [ ] Icônes et illustrations
- [ ] Animations (Framer Motion)
- [ ] Adaptation mobile (responsive)

### **Tests**
- [ ] Tests unitaires (composants)
- [ ] Tests d'intégration (flux complets)
- [ ] Tests utilisateurs (5 personnes par profil)
- [ ] Tests de performance

### **Documentation**
- [ ] Guide utilisateur (comment utiliser Academy)
- [ ] Guide admin (comment ajouter des formations)
- [ ] API documentation

---

## 🎯 **RECOMMANDATIONS FINALES**

### **Priorités**

1. **MVP d'abord** : Lancer PHASE 1 rapidement (3 semaines)
2. **Tester et itérer** : Recueillir feedback utilisateurs
3. **Contenu de qualité** : Mieux vaut 10 excellentes formations que 50 médiocres
4. **Engagement quotidien** : Les défis et streaks sont CRITIQUES
5. **Récompenses tangibles** : Lier Academy au Score JÙLABA pour motivation

---

### **Différenciation Forte**

**Ce qui rend JÙLABA Academy UNIQUE** :

✅ **Premier système de formation in-app** dans l'écosystème vivrier ivoirien
✅ **Adaptatif par profil** : Contenu personnalisé (Marchand ≠ Producteur)
✅ **Micro-learning** : 5-10 min (adapté au terrain)
✅ **Gamification complète** : Pas juste des badges, mais un vrai système de progression
✅ **Récompenses concrètes** : Points → Score JÙLABA → Avantages financiers
✅ **Intégration Tantie Sagesse** : Formation vocale (unique !)
✅ **Conformité et qualité** : Formations sur les normes et bonnes pratiques

---

## 📞 **NEXT STEPS**

**Pour commencer** :

1. ✅ **Valider ce spec** avec toi
2. ✅ **Créer les composants universels** (JulabaAcademy, AcademyWidget, etc.)
3. ✅ **Rédiger 15 formations MVP** (3 par profil)
4. ✅ **Intégrer au Dashboard** (widget sur Accueil)
5. ✅ **Tester avec utilisateurs pilotes**

**Veux-tu que je commence à créer les composants ?** 🚀

---

**Document créé le** : 2 Mars 2026  
**Version** : 1.0.0  
**Auteur** : Équipe JULABA  
**Statut** : ✅ Spec complète - Prêt pour développement
