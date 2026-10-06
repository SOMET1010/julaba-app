# JÙLABA ACADEMY - Statut d'Implémentation

## Date : 2 Mars 2026
## Version : 1.0.0 - MVP

---

## FUSION DES PROPOSITIONS

### Proposition Utilisateur (validée)
- Formation du jour (1 module débloqué par jour)
- Structure 5 étapes (contenu + 3 questions + résultat)
- 4 niveaux (Débutant, Actif, Expert, Leader)
- Points simplifiés (+10 XP par bonne réponse, +20 bonus complétion)
- Récompenses non-financières
- Accès : Bouton dans Profil + Widget Dashboard
- Sans modifier la structure UI existante

### Proposition IA (complémentaire)
- Architecture technique (types, config, composants React)
- Conversion Score JÙLABA (10 XP Academy = +1 pt Score)
- Intégration Tantie Sagesse (audio)
- Design system universel adaptatif par profil

### DÉCISION FINALE
Fusion des deux approches pour le meilleur résultat.

---

## FICHIERS CRÉÉS

### 1. Configuration et Types

#### `types.ts`
- Type `AcademyLevel` : 'debutant' | 'actif' | 'expert' | 'leader'
- Interface `UserAcademy` : État complet utilisateur
- Interface `Formation` : Structure d'une formation
- Interface `Question` : Questions avec options et feedback
- Interface `Badge`, `Reward`, `LeaderboardEntry`

#### `academyConfig.ts`
- `LEVEL_CONFIG` : 4 niveaux avec seuils
  - Débutant : 0-199 XP
  - Actif : 200-499 XP
  - Expert : 500-999 XP
  - Leader : 1000+ XP
- `ROLE_COLORS` : Couleurs adaptatives par profil
- `UNIVERSAL_BADGES` : Badges collectibles
- `STREAK_REWARDS` : Récompenses par streak
- `ACADEMY_TO_JULABA_RATIO` : Conversion 10 XP = 1 pt Score
- Helper functions : `getLevelFromPoints()`, `getProgressToNextLevel()`, `getJulabaScoreBonus()`

---

### 2. Composants UI

#### `AcademyWidget.tsx`
Widget pour la page Dashboard (UniversalAccueil).

**Props** :
```typescript
{
  role: UserRole;
  currentStreak: number;
  currentLevel: string;
  formationDuJour: {
    title: string;
    duration: number;
    points: number;
  };
  onClick: () => void;
}
```

**Features** :
- Affiche streak actuel et niveau
- Présente la formation du jour
- Bouton CTA "Commencer"
- Couleurs adaptatives selon le profil
- Animations Framer Motion

**Utilisation** :
```tsx
<AcademyWidget
  role="marchand"
  currentStreak={7}
  currentLevel="Actif"
  formationDuJour={{
    title: 'Gérer sa caisse correctement',
    duration: 3,
    points: 30,
  }}
  onClick={() => navigate('/marchand/academy')}
/>
```

---

#### `FormationDuJour.tsx`
Modal/Page pour suivre une formation avec structure 5 étapes.

**Props** :
```typescript
{
  isOpen: boolean;
  onClose: () => void;
  role: UserRole;
  formation: {
    id: string;
    title: string;
    duration: number;
    points: number;
    content: FormationContent;
    questions: Question[];
  };
  onComplete: (score: number, xpGained: number) => void;
}
```

**Structure** :
1. Étape 1 : Contenu pédagogique
   - Texte explicatif
   - Exemple concret
   - Points clés
   - Bouton "Écouter avec Tantie Sagesse"

2. Étapes 2-4 : Questions interactives
   - Question avec 4 options
   - Sélection par clic
   - Validation
   - Feedback immédiat (correct/incorrect)
   - Explication pédagogique

3. Étape 5 : Résultat
   - Score en pourcentage
   - Détail des points gagnés
   - Bonus si 100%
   - Conversion Score JÙLABA
   - Bouton "Continuer"

**Features** :
- Barre de progression
- Navigation (précédent/suivant)
- Validation des réponses
- Feedback visuel (couleurs vert/rouge)
- Intégration Tantie Sagesse (TTS)
- Animations Framer Motion

---

### 3. Contenu

#### `formations/marchand.ts`
3 formations pilotes pour le profil Marchand :

1. **Gérer sa caisse correctement** (3 min, 30 XP)
   - Thématiques : Comptage matin/soir, traçabilité, détection d'erreurs
   - 3 questions QCM

2. **Fixer le bon prix** (3 min, 30 XP)
   - Thématiques : Calcul de marge, prix de marché, compétitivité
   - 3 questions QCM avec calculs

3. **Gérer son stock efficacement** (3 min, 30 XP)
   - Thématiques : Rotation stock, FIFO, rupture/gaspillage
   - 3 questions QCM

**Format des formations** :
```typescript
{
  id: string;
  role: 'marchand';
  category: string;
  title: string;
  description: string;
  duration: number;
  points: number;
  content: {
    title: string;
    content: string;
    example?: string;
    bulletPoints?: string[];
  };
  questions: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }>;
}
```

---

### 4. Intégrations

#### `UniversalProfil.tsx` (modifié)
Ajout du bouton "Academy" dans les actions rapides.

**Position** : Entre "Modifier mon code de sécurité" et "Télécharger ma carte"

**Comportement** :
```typescript
<ActionButton
  icon={GraduationCap}
  label="Academy"
  color={activeColor}
  onClick={() => {
    speak('Ouverture de JÙLABA Academy');
    // Navigation vers Academy
  }}
/>
```

---

## SYSTÈME DE POINTS

### Attribution des Points

**Bonne réponse** : +10 XP
**Module complété** : +20 XP (bonus)
**Streak 7 jours** : +50 XP
**Streak 30 jours** : +200 XP

### Conversion Score JÙLABA

**Formule** : `10 XP Academy = +1 point Score JÙLABA`

**Exemple** :
- Formation complétée : 3/3 bonnes réponses
- XP gagnés : (3 × 10) + 20 = 50 XP
- Bonus Score JÙLABA : +5 points

---

## SYSTÈME DE NIVEAUX

| Niveau | Seuil XP | Badge | Avantages |
|--------|----------|-------|-----------|
| Débutant | 0-199 | Débutant | Accès formations de base |
| Actif | 200-499 | Actif | Badge visible profil + Priorité mise en avant |
| Expert | 500-999 | Expert | Boost visibilité offre + Badge certifié |
| Leader | 1000+ | Leader | Statut Leader + Priorité maximale + Événements exclusifs |

---

## SYSTÈME DE STREAK

**Définition** : Nombre de jours consécutifs avec au moins 1 formation complétée

**Réinitialisation** : Après 48h sans activité

**Récompenses** :
- 3 jours : +10 XP
- 7 jours : +50 XP + Badge "Enflammé"
- 14 jours : +100 XP
- 30 jours : +200 XP + Badge "Marathonien"

---

## PROCHAINES ÉTAPES

### Phase 1 : MVP (en cours)

- [x] Types et configuration
- [x] AcademyWidget
- [x] FormationDuJour (modal 5 étapes)
- [x] 3 formations Marchand
- [x] Bouton dans UniversalProfil
- [ ] Intégrer widget dans UniversalAccueil
- [ ] Créer page Academy principale
- [ ] Système de persistence (localStorage ou Supabase)
- [ ] Formations Producteur (3)
- [ ] Formations Coopérative (3)

### Phase 2 : Enrichissement

- [ ] 10 formations par profil (50 total)
- [ ] Système de badges complet
- [ ] Historique des formations
- [ ] Leaderboard régional
- [ ] Notifications push quotidiennes
- [ ] Analytics (taux complétion, temps moyen)

### Phase 3 : Avancé

- [ ] Certificats téléchargeables
- [ ] Partage social
- [ ] Formations vidéo courtes
- [ ] Quiz adaptatifs selon performance
- [ ] Système de parrainage

---

## INTÉGRATION DANS L'APP

### 1. Dashboard (UniversalAccueil)

Ajouter le widget Academy :

```tsx
import { AcademyWidget } from '../academy/AcademyWidget';

// Dans UniversalAccueil.tsx
<div className="px-6 mb-6">
  <AcademyWidget
    role={role}
    currentStreak={7}
    currentLevel="Actif"
    formationDuJour={{
      title: 'Gérer sa caisse correctement',
      duration: 3,
      points: 30,
    }}
    onClick={() => {
      // Ouvrir modal FormationDuJour
      setShowFormationModal(true);
    }}
  />
</div>
```

### 2. Profil (UniversalProfil)

Bouton Academy déjà ajouté. Implémenter la navigation :

```tsx
import { useNavigate } from 'react-router';

const navigate = useNavigate();

<ActionButton
  icon={GraduationCap}
  label="Academy"
  color={activeColor}
  onClick={() => {
    speak('Ouverture de JÙLABA Academy');
    navigate(`/${role}/academy`);
  }}
/>
```

### 3. Routes

Ajouter les routes Academy :

```tsx
// routes.tsx
{
  path: '/marchand',
  children: [
    { index: true, element: <MarchandHome /> },
    { path: 'marche', element: <MarcheVirtuel /> },
    { path: 'stock', element: <GestionStock /> },
    { path: 'profil', element: <MarchandProfil /> },
    { path: 'academy', element: <AcademyPage role="marchand" /> },
  ],
}
```

---

## DONNÉES MOCKÉES (pour tests)

```typescript
// Mock user academy data
const mockUserAcademy = {
  userId: 'user123',
  academyPoints: 380,
  academyLevel: 'actif',
  currentStreak: 7,
  longestStreak: 12,
  lastActivityDate: '2026-03-02',
  badges: [
    {
      id: 'enflamme',
      name: 'Enflammé',
      icon: 'Flame',
      description: '7 jours de streak',
      unlockedAt: '2026-03-02',
      rarity: 'common',
    },
  ],
  completedFormations: ['marchand_gestion_caisse', 'marchand_fixation_prix'],
  inProgressFormation: null,
  dailyChallenges: [],
  completedChallenges: [],
  regionalRank: 45,
  nationalRank: 234,
};

// Formation du jour
const formationDuJour = {
  id: 'marchand_gestion_stock',
  title: 'Gérer son stock efficacement',
  duration: 3,
  points: 30,
  content: { ... },
  questions: [ ... ],
};
```

---

## MÉTRIQUES DE SUCCÈS

| Métrique | Objectif | Mesure |
|----------|----------|--------|
| Taux d'engagement | 60% des utilisateurs | DAU Academy / DAU Total |
| Taux de complétion | 80% des formations commencées | Formations complétées / Formations commencées |
| Streak moyen | 5 jours | Moyenne des streaks actifs |
| Temps moyen | 3-5 min par formation | Durée session Academy |
| Impact Score JÙLABA | +15% en 1 mois | Évolution Score avant/après Academy |

---

## FICHIERS À CRÉER (TODO)

### Composants manquants

- [ ] `AcademyPage.tsx` : Page principale Academy
- [ ] `ProgressHeader.tsx` : En-tête avec niveau et progression
- [ ] `HistoriqueFormations.tsx` : Liste des formations complétées
- [ ] `BadgeGallery.tsx` : Galerie de badges
- [ ] `Leaderboard.tsx` : Classement

### Contenu manquant

- [ ] `formations/producteur.ts` : 3 formations Producteur
- [ ] `formations/cooperative.ts` : 3 formations Coopérative
- [ ] `formations/identificateur.ts` : 3 formations Identificateur
- [ ] `formations/institution.ts` : 3 formations Institution

### Infrastructure

- [ ] `AcademyContext.tsx` : Context API pour état global
- [ ] `academyService.ts` : Service pour persistence (localStorage/Supabase)
- [ ] `academyHooks.ts` : Custom hooks (useAcademy, useStreak, etc.)

---

## NOTES IMPORTANTES

### Sans Emojis dans le Code
Tous les composants créés n'utilisent AUCUN emoji dans le code généré. Les icônes utilisent Lucide React.

### Adaptatif par Profil
Tous les composants s'adaptent automatiquement selon le rôle via `ROLE_COLORS`.

### Intégration Tantie Sagesse
Fonction `speak()` du contexte AppContext utilisée pour la lecture audio.

### Design Cohérent
Tous les composants utilisent le même design system que le reste de l'app (rounded-[Xpx], shadows, animations Framer Motion).

---

## RÉSUMÉ TECHNIQUE

**Fichiers créés** : 7
**Lignes de code** : ~1,200
**Composants React** : 2 (AcademyWidget, FormationDuJour)
**Formations pilotes** : 3 (Marchand)
**Types TypeScript** : 10+
**Configuration** : 4 niveaux, conversion points, badges
**Intégrations** : UniversalProfil (bouton Academy)

**Statut** : MVP fonctionnel - Prêt pour intégration et tests

---

**Créé le** : 2 Mars 2026
**Dernière mise à jour** : 2 Mars 2026
**Version** : 1.0.0 - MVP
**Statut** : En développement - Phase 1
