# 🎓 JÙLABA ACADEMY - Composants

## 📂 Structure

```
/src/app/components/academy/
├── README.md                      # Ce fichier
├── JULABA_ACADEMY_SPEC.md         # Spécifications complètes (60+ pages)
├── types.ts                       # Types TypeScript
├── academyConfig.ts               # Configuration (niveaux, badges, couleurs)
├── AcademyWidget.tsx              # Widget pour page Accueil ✅
├── JulabaAcademy.tsx              # Page principale (à créer)
├── ProgressHeader.tsx             # En-tête progression (à créer)
├── DailyChallenge.tsx             # Carte défi du jour (à créer)
├── FormationCard.tsx              # Carte de formation (à créer)
├── FormationViewer.tsx            # Lecteur de formation (à créer)
├── BadgeGallery.tsx               # Galerie de badges (à créer)
├── Leaderboard.tsx                # Classement (à créer)
├── AcademyContext.tsx             # Context API (à créer)
└── formations/                    # Contenu des formations
    ├── marchand.ts (à créer)
    ├── producteur.ts (à créer)
    ├── cooperative.ts (à créer)
    ├── identificateur.ts (à créer)
    └── institution.ts (à créer)
```

---

## ✅ Fichiers Créés

### 1. `JULABA_ACADEMY_SPEC.md`
**Spécification complète** du module (60+ pages) :
- Objectifs et architecture
- Design system
- Système de gamification (niveaux, badges, points, streaks)
- Bibliothèque de formations par profil
- Défis quotidiens
- Leaderboard
- Intégration avec Score JÙLABA et Tantie Sagesse
- Phases de développement (MVP → Avancé)
- Métriques de succès

### 2. `types.ts`
Tous les types TypeScript :
- `UserAcademy` : État utilisateur Academy
- `Badge` : Badges collectibles
- `DailyChallenge` : Défis quotidiens
- `Formation` : Structure d'une formation
- `FormationSlide` : Slide de formation
- `QuizQuestion` : Question de quiz
- `LeaderboardEntry` : Entrée du classement
- `LevelConfig` : Configuration des niveaux
- `Reward` : Récompenses

### 3. `academyConfig.ts`
Configuration centralisée :
- `LEVEL_CONFIG` : 6 niveaux (Débutant → Diamant)
- `ROLE_COLORS` : Couleurs par profil
- `UNIVERSAL_BADGES` : 8 badges universels
- `ROLE_SPECIFIC_BADGES` : Badges par rôle (2-3 par profil)
- `STREAK_REWARDS` : Récompenses par streak (3, 7, 14, 30, 100 jours)
- Helper functions :
  - `getLevelFromPoints(points)` : Obtenir niveau actuel
  - `getProgressToNextLevel(points)` : Calculer progression
  - `getJulabaScoreBonus(academyPoints)` : Convertir pts → Score
  - `getRarityColor(rarity)` : Couleur par rareté

### 4. `AcademyWidget.tsx` ✅
Widget pour la page Accueil (`UniversalAccueil`) :
- Affiche streak actuel
- Affiche points du jour
- Affiche défi quotidien avec barre de progression
- Bouton CTA "Continuer ma formation"
- Animation pulse si défi non complété
- Adaptatif aux couleurs du profil
- Animations Framer Motion (hover, tap)

**Utilisation** :
```tsx
import { AcademyWidget } from './components/academy/AcademyWidget';

<AcademyWidget
  role="marchand"
  currentStreak={7}
  pointsToday={35}
  dailyChallengeProgress={{
    current: 3,
    target: 5,
    title: 'Vendre 5 produits',
  }}
  onClick={() => navigate('/marchand/academy')}
/>
```

---

## 🔨 Composants à Créer (MVP - Phase 1)

### 1. `JulabaAcademy.tsx` (Page Principale)
Page dédiée avec 5 sections :
- En-tête de progression (niveau, points, streak)
- Défi du jour
- Formations recommandées
- Mes badges (aperçu)
- Leaderboard (aperçu)

### 2. `ProgressHeader.tsx`
Composant d'en-tête affichant :
- Niveau actuel avec badge
- Barre de progression vers niveau suivant
- Points totaux
- Streak actuel et record

### 3. `DailyChallenge.tsx`
Carte du défi quotidien :
- Titre et description
- Progression (current/target)
- Temps restant (countdown)
- Récompense (+pts + badge)
- Bouton CTA si applicable

### 4. `FormationCard.tsx`
Carte de formation (style Netflix) :
- Thumbnail/icône
- Titre et description courte
- Durée (ex: 5 min)
- Difficulté (🟢🟡🔴)
- Points à gagner
- Badge optionnel
- État : Non commencée / En cours / Complétée
- Bouton "Démarrer" / "Continuer" / "Revoir"

### 5. `FormationViewer.tsx`
Lecteur de formation :
- Slides avec navigation
- Barre de progression
- Contenu (texte + image optionnelle)
- Bouton "Écouter avec Tantie Sagesse"
- Quiz de validation à la fin
- Écran de félicitations avec récompenses

### 6. `BadgeGallery.tsx`
Galerie de badges :
- Grid de badges (débloqués + verrouillés)
- Filter par rareté / catégorie
- Modal détail badge (description, date débloquage)
- Compteur (X/Y badges)

### 7. `Leaderboard.tsx`
Classement :
- Tabs : National / Régional / Coopérative / Amis
- Liste des top utilisateurs
- Highlight utilisateur actuel
- Stats : Points, Niveau, Badges, Streak

### 8. `AcademyContext.tsx`
Context API pour état global :
- `userAcademy` : État Academy de l'utilisateur
- `addPoints(points)` : Ajouter des points
- `completeFormation(formationId)` : Marquer formation complétée
- `updateDailyChallenge(progress)` : MAJ défi
- `unlockBadge(badgeId)` : Débloquer un badge
- `updateStreak()` : MAJ streak quotidien

---

## 📚 Contenu des Formations (à créer)

Créer 3 formations par profil (MVP) = 15 formations total :

### `formations/marchand.ts`
```typescript
export const marchandFormations: Formation[] = [
  {
    id: 'gestion_caisse',
    role: 'marchand',
    category: 'Gestion de Commerce',
    title: 'Ouvrir et fermer sa caisse correctement',
    description: 'Apprends les bonnes pratiques...',
    duration: 5,
    difficulty: 'debutant',
    points: 10,
    slides: [...],
    quiz: [...],
  },
  // ... 2 autres formations
];
```

### `formations/producteur.ts`
3 formations pour Producteur (agriculture, gestion, qualité)

### `formations/cooperative.ts`
3 formations pour Coopérative (gestion, logistique, leadership)

### `formations/identificateur.ts`
3 formations pour Identificateur (méthodologie, conformité, terrain)

### `formations/institution.ts`
3 formations pour Institution (supervision, stratégie, gouvernance)

---

## 🎨 Design System

### Couleurs Adaptatives
- **Marchand** : #C66A2C (Orange)
- **Producteur** : #2E8B57 (Vert)
- **Coopérative** : #2072AF (Bleu)
- **Institution** : #712864 (Violet)
- **Identificateur** : #9F8170 (Beige)

### Niveaux
- 🥉 **Débutant** : 0-199 pts (#A0A0A0)
- 🟤 **Bronze** : 200-499 pts (#CD7F32)
- 🥈 **Argent** : 500-999 pts (#C0C0C0)
- 🥇 **Or** : 1000-1999 pts (#FFD700)
- 💎 **Platine** : 2000-4999 pts (#E5E4E2)
- 💠 **Diamant** : 5000+ pts (#B9F2FF)

### Raretés
- **Commun** : #9CA3AF
- **Rare** : #3B82F6
- **Épique** : #8B5CF6
- **Légendaire** : #F59E0B

---

## 🔗 Intégration dans l'App

### 1. Ajouter le Widget dans `UniversalAccueil.tsx`

```tsx
import { AcademyWidget } from '../academy/AcademyWidget';

export function UniversalAccueil({ role }: UniversalAccueilProps) {
  // ... code existant

  return (
    <>
      {/* ... Dashboard, Wallet, etc. */}

      {/* 🆕 Academy Widget */}
      <div className="px-6 mb-6">
        <AcademyWidget
          role={role}
          currentStreak={7}
          pointsToday={35}
          dailyChallengeProgress={{
            current: 3,
            target: 5,
            title: 'Vendre 5 produits',
          }}
          onClick={() => navigate(`/${role}/academy`)}
        />
      </div>

      {/* ... Actions principales, etc. */}
    </>
  );
}
```

### 2. Ajouter les Routes

```tsx
// routes.tsx
import { JulabaAcademy } from './components/academy/JulabaAcademy';

{
  path: '/marchand',
  children: [
    { index: true, element: <MarchandHome /> },
    { path: 'marche', element: <MarcheVirtuel /> },
    { path: 'stock', element: <GestionStock /> },
    { path: 'profil', element: <MarchandProfil /> },
    { path: 'academy', element: <JulabaAcademy role="marchand" /> }, // 🆕
  ],
}
```

### 3. Ajouter dans le Profil

Dans `UniversalProfil.tsx`, ajouter section Academy :

```tsx
{/* Section Academy */}
<div
  className="p-4 rounded-[20px] border-2"
  style={{ borderColor: activeColor, backgroundColor: `${activeColor}10` }}
>
  <div className="flex items-center justify-between mb-2">
    <div className="flex items-center gap-2">
      <GraduationCap className="w-5 h-5" style={{ color: activeColor }} />
      <p className="text-xs font-bold text-gray-600">JÙLABA Academy</p>
    </div>
    <span className="text-xs font-black" style={{ color: activeColor }}>
      Niveau: Bronze 🟤
    </span>
  </div>

  <div className="grid grid-cols-3 gap-2 mt-3">
    <div className="text-center">
      <p className="text-lg font-black text-gray-900">850</p>
      <p className="text-xs text-gray-500">Points</p>
    </div>
    <div className="text-center">
      <p className="text-lg font-black text-gray-900">12</p>
      <p className="text-xs text-gray-500">Badges</p>
    </div>
    <div className="text-center">
      <p className="text-lg font-black text-gray-900">7</p>
      <p className="text-xs text-gray-500">Streak</p>
    </div>
  </div>

  <button
    className="w-full mt-3 py-2 rounded-[12px] font-semibold text-sm text-white"
    style={{ backgroundColor: activeColor }}
    onClick={() => navigate(`/${role}/academy`)}
  >
    Voir ma progression →
  </button>
</div>
```

---

## 🚀 Plan de Développement

### Phase 1 : MVP (2-3 semaines)
- [x] Spec complète (JULABA_ACADEMY_SPEC.md)
- [x] Types (types.ts)
- [x] Config (academyConfig.ts)
- [x] Widget Accueil (AcademyWidget.tsx)
- [ ] Page principale (JulabaAcademy.tsx)
- [ ] En-tête progression (ProgressHeader.tsx)
- [ ] Défi du jour (DailyChallenge.tsx)
- [ ] Carte formation (FormationCard.tsx)
- [ ] Lecteur de formation (FormationViewer.tsx)
- [ ] 15 formations (3 par profil)
- [ ] Context API (AcademyContext.tsx)
- [ ] Intégration routes

### Phase 2 : Enrichissement (3-4 semaines)
- [ ] Badge Gallery (BadgeGallery.tsx)
- [ ] Leaderboard (Leaderboard.tsx)
- [ ] 50 formations (10 par profil)
- [ ] Système de streaks avancé
- [ ] Notifications push
- [ ] Intégration Tantie Sagesse (audio)

### Phase 3 : Gamification Avancée (2-3 semaines)
- [ ] Défis adaptatifs
- [ ] Badges rares et légendaires
- [ ] Certificats téléchargeables
- [ ] Partage social
- [ ] Système de parrainage

---

## 📊 Métriques de Succès

| Métrique | Objectif |
|----------|----------|
| DAU Academy | 60% des utilisateurs actifs |
| Taux de complétion formations | 80% |
| Streak moyen | 5 jours |
| Défis complétés | 70% |
| Badges/user/mois | 10 |
| Temps moyen dans Academy | 10 min/jour |
| Amélioration Score JÙLABA | +15% grâce à Academy |

---

## 🎯 Prochaines Étapes

1. **Créer `JulabaAcademy.tsx`** : Page principale
2. **Créer `ProgressHeader.tsx`** : En-tête de progression
3. **Créer `DailyChallenge.tsx`** : Carte défi quotidien
4. **Créer `FormationCard.tsx`** : Carte de formation
5. **Créer contenu formations** : 15 formations MVP
6. **Tester avec utilisateurs pilotes**

**Prêt à commencer le développement !** 🚀

---

**Créé le** : 2 Mars 2026  
**Version** : 1.0.0  
**Statut** : Base créée - Prêt pour MVP
