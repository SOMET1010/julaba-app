# 🌐 Composants Partagés JULABA

Ce dossier contient tous les composants partagés et réutilisables de la plateforme JULABA.

## 📚 Documentation

- **[Guide des Composants Universels](./UNIVERSAL_COMPONENTS_GUIDE.md)** - Guide complet d'utilisation
- **[Exemples de Migration](./MIGRATION_EXAMPLE.md)** - Exemples pratiques de migration
- **[Composants Universels](./universal/README.md)** 🆕 - Nouveaux composants universels (ACCUEIL/MARCHÉ/PRODUITS)

## 🎯 Composants Universels (🆕 NOUVEAU)

Ces composants **remplacent tous les composants spécifiques** par profil pour atteindre **100% d'harmonisation UI** :

### 🌐 Pages Universelles (Menu 1-2-3-4)
- **UniversalAccueil** _(Menu 1 : ACCUEIL)_ - Dashboard universel adaptable à tous les profils
- **UniversalMarche** _(Menu 2 : MARCHÉ/PRODUCTION/MEMBRES/ACTEURS)_ - Page menu 2 adaptative
- **UniversalProduits** _(Menu 3 : PRODUITS/COMMANDES/SUIVI/ANALYTICS)_ - Page menu 3 adaptative  
- **UniversalProfil** _(Menu 4 : MOI)_ - Page de profil avec carte professionnelle QR code

📖 **[Documentation complète](./universal/README.md)**  
📖 **[Guide de migration](./universal/MIGRATION_GUIDE.md)**  
📖 **[Comparaison AVANT/APRÈS](./universal/EXEMPLE_COMPARAISON.md)**

### 🌐 Navigation & Layout
- **Sidebar** - Navigation desktop (dans `/layout/`)
- **BottomBar** - Navigation mobile (dans `/layout/`)

## 🎨 Composants UI Génériques

### Boutons & Interactions
- **SharedButton** - Bouton avec variantes
- **SharedBadge** - Badge de statut

### Cartes & Conteneurs
- **SharedCard** - Carte générique
- **KPIWidget** - Widget KPI pour tableaux de bord

### Formulaires
- **SharedInput** - Input stylisé
- **SharedModal** - Modal réutilisable

### Feedback
- **Toast** - Notifications toast
- **EmptyState** - État vide

### Loading
- **Skeleton** - Skeleton loaders (KPI, Card, List)

### Professionnel
- **ProfessionalCard** - Carte professionnelle avancée

## 🚀 Utilisation

```tsx
// Importer depuis l'index
import { 
  UniversalPageWrapper,
  UniversalProfil,
  SharedButton,
  KPIWidget 
} from '@/app/components/shared';

// Utiliser dans votre composant
export function MaPage() {
  return (
    <UniversalPageWrapper role="marchand">
      <SharedButton variant="primary">Action</SharedButton>
      <KPIWidget title="Ventes" value="1,234" />
    </UniversalPageWrapper>
  );
}
```

## 🎨 Adaptation Automatique

Les composants universels utilisent automatiquement :
- ✅ Couleurs du rôle (`getRoleColor()`)
- ✅ Configuration du rôle (`getRoleConfig()`)
- ✅ Données utilisateur (`useUser()`, `useApp()`)

**Pas besoin de gérer les couleurs manuellement !**

## ✨ Nouveaux Composants

Pour créer un nouveau composant partagé :

1. Créez le fichier dans ce dossier
2. Exportez-le dans `index.ts`
3. Documentez son utilisation
4. Testez avec tous les profils

## 📐 Architecture

```
/shared/
├── UniversalPageWrapper.tsx     # Wrapper universel
├── UniversalProfil.tsx          # Profil universel
├── Button.tsx                   # Bouton générique
├── Card.tsx                     # Carte générique
├── Input.tsx                    # Input générique
├── Modal.tsx                    # Modal générique
├── Badge.tsx                    # Badge générique
├── Toast.tsx                    # Toast notifications
├── EmptyState.tsx               # État vide
├── Skeleton.tsx                 # Loaders
├── KPIWidget.tsx                # Widget KPI
├── ProfessionalCard.tsx         # Carte pro
├── index.ts                     # Exports centralisés
├── README.md                    # Ce fichier
├── UNIVERSAL_COMPONENTS_GUIDE.md # Guide complet
└── MIGRATION_EXAMPLE.md         # Exemples de migration
```

## 🎓 Bonnes Pratiques

### ✅ À FAIRE
- Créer des composants réutilisables
- Utiliser TypeScript pour les props
- Documenter les composants
- Tester avec tous les profils

### ❌ À NE PAS FAIRE
- Dupliquer du code
- Hard-coder les couleurs
- Créer des composants trop spécifiques
- Oublier d'exporter dans index.ts

---

**Dernière mise à jour** : Février 2026