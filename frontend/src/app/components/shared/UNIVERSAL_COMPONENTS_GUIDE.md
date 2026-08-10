# 🌐 Guide des Composants Universels JULABA

## 📋 Philosophie

Les composants universels permettent de **maintenir une cohérence UI parfaite** entre tous les profils utilisateurs (Marchand, Producteur, Coopérative, Institution, Identificateur) en suivant la règle d'harmonisation à 100%.

**Principe clé** : Une seule modification = Application automatique à tous les profils ! ✨

---

## 🎯 Composants Disponibles

### 1️⃣ **UniversalPageWrapper**

Wrapper de page universel qui gère :
- ✅ Navigation (Sidebar desktop + BottomBar mobile)
- ✅ Modal Tantie Sagesse adaptée au rôle
- ✅ Gradient de fond selon la couleur du rôle
- ✅ Suggestions vocales personnalisées par rôle

#### 📝 Utilisation

```tsx
import { UniversalPageWrapper } from '@/app/components/shared';

export function MaPageMarchand() {
  return (
    <UniversalPageWrapper 
      role="marchand"
      suggestions={[
        "Combien j'ai vendu aujourd'hui ?",
        "État de ma caisse",
        "Mes produits en stock",
      ]}
    >
      <h1>Mon contenu ici</h1>
      {/* Votre page ici */}
    </UniversalPageWrapper>
  );
}
```

#### ⚙️ Props

| Prop | Type | Description | Requis |
|------|------|-------------|--------|
| `role` | `'marchand' \| 'producteur' \| 'cooperative' \| 'institution' \| 'identificateur'` | Rôle de l'utilisateur | ✅ Oui |
| `children` | `ReactNode` | Contenu de la page | ✅ Oui |
| `suggestions` | `string[]` | Suggestions vocales personnalisées | ❌ Non (utilise les défauts du rôle) |
| `className` | `string` | Classes CSS additionnelles | ❌ Non |

---

### 2️⃣ **UniversalProfil**

Page de profil universelle avec :
- ✅ Carte professionnelle flip 3D (recto/verso)
- ✅ QR Code généré automatiquement
- ✅ Informations personnelles et professionnelles
- ✅ Score de crédit et niveau membre
- ✅ Actions rapides (Modifier infos, Code sécurité, Télécharger carte)

#### 📝 Utilisation

```tsx
import { UniversalProfil } from '@/app/components/shared';

export function MarchandProfil() {
  return <UniversalProfil role="marchand" />;
}

export function ProducteurProfil() {
  return <UniversalProfil role="producteur" />;
}
```

#### ⚙️ Props

| Prop | Type | Description | Requis |
|------|------|-------------|--------|
| `role` | `'marchand' \| 'producteur' \| 'cooperative' \| 'institution' \| 'identificateur'` | Rôle de l'utilisateur | ✅ Oui |

---

### 3️⃣ **Sidebar** (déjà universel)

Navigation desktop qui s'adapte automatiquement à tous les rôles :
- ✅ Logo JULABA
- ✅ Items de navigation selon le rôle
- ✅ Bouton Tantie Sagesse
- ✅ Profil utilisateur (nom, téléphone, rôle)
- ✅ Bouton déconnexion

Déjà intégré dans `UniversalPageWrapper` !

---

### 4️⃣ **BottomBar** (déjà universel)

Navigation mobile qui s'adapte automatiquement à tous les rôles.

Déjà intégré dans `UniversalPageWrapper` !

---

## 🎨 Adaptation Automatique des Couleurs

Les composants universels utilisent automatiquement les couleurs définies dans `/src/app/config/roleConfig.ts` :

```tsx
const ROLE_COLORS = {
  marchand: '#C66A2C',      // Orange
  producteur: '#2E8B57',    // Vert
  cooperative: '#2072AF',   // Bleu
  institution: '#712864',   // Violet
  identificateur: '#9F8170' // Beige
};
```

**Pas besoin de gérer les couleurs manuellement !** 🎨

---

## 🔄 Workflow de Développement

### Créer une nouvelle page pour un rôle

**AVANT** (approche ancienne - non recommandée) :
```tsx
// ❌ Créer un composant spécifique par rôle
export function MarchandVentes() {
  return (
    <>
      <Navigation role="marchand" />
      <div className="pb-32 lg:pb-8 pt-12 lg:pt-16 px-4 lg:pl-[320px]">
        {/* Contenu */}
      </div>
    </>
  );
}
```

**MAINTENANT** (approche universelle - recommandée) :
```tsx
// ✅ Utiliser UniversalPageWrapper
export function MarchandVentes() {
  return (
    <UniversalPageWrapper role="marchand">
      {/* Contenu */}
    </UniversalPageWrapper>
  );
}
```

---

## 🚀 Migration des Composants Existants

### Étape 1 : Identifier les composants dupliqués

Composants actuellement dupliqués par rôle :
- ❌ `MarchandProfil`, `ProducteurProfil`, `CooperativeProfil`, etc.
- ❌ `ProducteurPageWrapper` (uniquement pour producteur)

### Étape 2 : Remplacer par les composants universels

**Exemple : Migration de ProducteurProfil**

AVANT :
```tsx
// /src/app/components/producteur/ProducteurProfil.tsx
export function ProducteurProfil() {
  // Beaucoup de code spécifique...
}
```

APRÈS :
```tsx
// /src/app/components/producteur/ProducteurProfil.tsx
import { UniversalProfil } from '../shared';

export function ProducteurProfil() {
  return <UniversalProfil role="producteur" />;
}
```

**Bénéfice** : Une seule modification dans `UniversalProfil` → Tous les profils sont mis à jour ! ✨

---

## 📐 Architecture des Composants Universels

```
/src/app/components/
├── shared/                        # Composants universels
│   ├── UniversalPageWrapper.tsx   # Wrapper universel avec navigation
│   ├── UniversalProfil.tsx        # Page profil universelle
│   └── index.ts                   # Export centralisé
├── layout/                        # Composants de mise en page
│   ├── Sidebar.tsx                # ✅ Déjà universel
│   ├── BottomBar.tsx              # ✅ Déjà universel
│   └── Navigation.tsx             # ✅ Déjà universel
└── [role]/                        # Composants spécifiques par rôle
    ├── [Role]Home.tsx             # Utilise UniversalPageWrapper
    ├── [Role]Profil.tsx           # Utilise UniversalProfil
    └── ...                        # Autres pages métier
```

---

## ✅ Checklist de Qualité

Avant de créer un nouveau composant spécifique à un rôle :

- [ ] Ce composant existe-t-il déjà pour un autre rôle ?
- [ ] Peut-il être transformé en composant universel ?
- [ ] Utilise-t-il `getRoleColor()` et `getRoleConfig()` ?
- [ ] Accepte-t-il une prop `role` ?
- [ ] Fonctionne-t-il avec les 5 profils ?

**Si oui à toutes ces questions** → Créez un composant universel dans `/shared/` ! 🎯

---

## 🎓 Bonnes Pratiques

### ✅ À FAIRE

- Utiliser `UniversalPageWrapper` pour toutes les nouvelles pages
- Utiliser `UniversalProfil` au lieu de créer des composants Profil par rôle
- Centraliser la logique commune dans `/shared/`
- Tester avec tous les 5 profils avant de valider

### ❌ À NE PAS FAIRE

- Dupliquer du code entre les rôles
- Créer des composants spécifiques sans vérifier s'ils peuvent être universels
- Hard-coder les couleurs au lieu d'utiliser `getRoleColor()`
- Oublier de tester sur tous les profils

---

## 🔮 Composants Universels À Venir

Prochains composants à créer :

- [ ] **UniversalHome** - Page d'accueil adaptable
- [ ] **UniversalDashboard** - Dashboard universel avec KPIs
- [ ] **UniversalStats** - Statistiques adaptées au rôle
- [ ] **UniversalSettings** - Paramètres universels

---

## 📞 Support

Questions ou suggestions ?  
Contactez l'équipe de développement JULABA !

---

**Dernière mise à jour** : Février 2026  
**Version** : 1.0.0
