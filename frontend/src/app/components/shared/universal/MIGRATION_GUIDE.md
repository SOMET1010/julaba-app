# 🚀 GUIDE DE MIGRATION - Composants Universels JULABA

## 📋 Vue d'ensemble

Ce guide explique comment migrer les profils existants vers les **composants universels** pour une harmonisation UI complète à 100%.

---

## 🎯 Objectif

**Avant** : Chaque profil a ses propres composants (MarchandHome, ProducteurHome, etc.)
**Après** : Tous les profils utilisent les MÊMES composants universels avec **seulement** des couleurs et données différentes

---

## ✅ RÉCAPITULATIF DES NOMS DE MENUS PAR PROFIL

| Profil | Menu 1 | Menu 2 | Menu 3 | Menu 4 |
|--------|--------|--------|--------|--------|
| **MARCHAND** | ACCUEIL | MARCHÉ | PRODUITS | MOI |
| **PRODUCTEUR** | ACCUEIL | PRODUCTION | COMMANDES | MOI |
| **COOPÉRATIVE** | ACCUEIL | MEMBRES | COMMANDES | MOI |
| **IDENTIFICATEUR** | ACCUEIL | ACTEURS | SUIVI | MOI |
| **INSTITUTION** | ACCUEIL | ACTEURS | ANALYTICS | MOI |

---

## 📦 Composants Universels Disponibles

### 1️⃣ **UniversalAccueil** (Menu 1 - ACCUEIL)
Clone exact de `MarchandHome` qui s'adapte à tous les profils.

**Fichier** : `/src/app/components/shared/universal/UniversalAccueil.tsx`

**Utilisation** :
```tsx
import { UniversalAccueil } from '@/app/components/shared/universal/UniversalAccueil';

// Marchand
export function MarchandHome() {
  return <UniversalAccueil role="marchand" />;
}

// Producteur
export function ProducteurHome() {
  return <UniversalAccueil role="producteur" />;
}

// Coopérative
export function CooperativeHome() {
  return <UniversalAccueil role="cooperative" />;
}

// Identificateur
export function IdentificateurHome() {
  return <UniversalAccueil role="identificateur" />;
}

// Institution
export function InstitutionHome() {
  return <UniversalAccueil role="institution" />;
}
```

**Features** :
- ✅ Dashboard avec KPIs cliquables
- ✅ Tantie Sagesse (Modal interactive avec mode Écrire/Parler) 🆕
- ✅ Gestion de journée (Marchand uniquement)
- ✅ Wallet (tous sauf Identificateur/Institution)
- ✅ Actions principales (2 boutons configurables)
- ✅ Couleurs adaptées automatiquement
- ✅ Coach mark (Marchand)

---

### 2️⃣ **UniversalMarche** (Menu 2 - MARCHÉ/PRODUCTION/MEMBRES/ACTEURS)
Clone adaptatif de `MarcheVirtuel`.

**Fichier** : `/src/app/components/shared/universal/UniversalMarche.tsx`

**Utilisation** :
```tsx
import { UniversalMarche } from '@/app/components/shared/universal/UniversalMarche';

// Marchand → MARCHÉ
export function MarcheVirtuel() {
  return <UniversalMarche role="marchand" />;
}

// Producteur → PRODUCTION
export function ProducteurProduction() {
  return <UniversalMarche role="producteur" />;
}

// Coopérative → MEMBRES
export function CooperativeMembres() {
  return <UniversalMarche role="cooperative" />;
}

// Identificateur → ACTEURS
export function IdentificateurActeurs() {
  return <UniversalMarche role="identificateur" />;
}

// Institution → ACTEURS
export function InstitutionActeurs() {
  return <UniversalMarche role="institution" />;
}
```

**Features** :
- ✅ Barre de recherche avec vocal
- ✅ Filtres configurables
- ✅ Grille de cartes (adaptatif selon le contenu)
- ✅ Titre et icône adaptés au rôle
- ✅ État vide personnalisé

---

### 3️⃣ **UniversalProduits** (Menu 3 - PRODUITS/COMMANDES/SUIVI/ANALYTICS)
Clone adaptatif de `GestionStock`.

**Fichier** : `/src/app/components/shared/universal/UniversalProduits.tsx`

**Utilisation** :
```tsx
import { UniversalProduits } from '@/app/components/shared/universal/UniversalProduits';

// Marchand → PRODUITS
export function GestionStock() {
  return <UniversalProduits role="marchand" />;
}

// Producteur → COMMANDES
export function ProducteurCommandes() {
  return <UniversalProduits role="producteur" />;
}

// Coopérative → COMMANDES
export function CooperativeCommandes() {
  return <UniversalProduits role="cooperative" />;
}

// Identificateur → SUIVI
export function IdentificateurSuivi() {
  return <UniversalProduits role="identificateur" />;
}

// Institution → ANALYTICS
export function InstitutionAnalytics() {
  return <UniversalProduits role="institution" />;
}
```

**Features** :
- ✅ Onglets configurables (via `roleConfig.ts`)
- ✅ Recherche et filtres
- ✅ Grille/Liste adaptative
- ✅ Bouton CTA selon le rôle
- ✅ État vide personnalisé

---

### 4️⃣ **UniversalProfil** (Menu 4 - MOI)
Page profil universelle avec carte professionnelle.

**Fichier** : `/src/app/components/shared/UniversalProfil.tsx` (déjà existe)

**Utilisation** :
```tsx
import { UniversalProfil } from '@/app/components/shared/UniversalProfil';

// Tous les profils
export function MarchandProfil() {
  return <UniversalProfil role="marchand" />;
}

export function ProducteurProfil() {
  return <UniversalProfil role="producteur" />;
}

export function CooperativeProfil() {
  return <UniversalProfil role="cooperative" />;
}

export function IdentificateurProfil() {
  return <UniversalProfil role="identificateur" />;
}

export function InstitutionProfil() {
  return <UniversalProfil role="institution" />;
}
```

**Features** :
- ✅ Carte professionnelle 3D flip
- ✅ QR Code généré automatiquement
- ✅ Informations personnelles et professionnelles
- ✅ Score JULABA avec compteur animé
- ✅ Boutons d'action (Modifier, Code sécurité, Télécharger)

---

## 🔧 Configuration Centralisée

Toute la configuration est dans `/src/app/config/roleConfig.ts`.

**Exemple pour Marchand** :
```typescript
marchand: {
  name: 'Marchand',
  primaryColor: '#C66A2C',
  // ... config existante
  
  // 🆕 Configuration des pages universelles
  pages: {
    accueil: {
      hasSessionManagement: true,
      hasWallet: true,
    },
    menu2: {
      menuLabel: 'MARCHÉ',
      pageTitle: 'Marché Virtuel',
      description: 'Achète et vends des produits',
      dataType: 'produits',
    },
    menu3: {
      menuLabel: 'PRODUITS',
      pageTitle: 'Gestion de Stock',
      description: 'Gère tes produits',
      dataType: 'stock',
      tabs: ['Tous', 'En stock', 'Rupture'],
    },
  },
}
```

**Exemple pour Producteur** :
```typescript
producteur: {
  name: 'Producteur',
  primaryColor: '#2E8B57',
  // ... config existante
  
  pages: {
    accueil: {
      hasSessionManagement: false,
      hasWallet: true,
    },
    menu2: {
      menuLabel: 'PRODUCTION',
      pageTitle: 'Ma Production',
      description: 'Gère tes cultures et cycles agricoles',
      dataType: 'cultures',
    },
    menu3: {
      menuLabel: 'COMMANDES',
      pageTitle: 'Mes Commandes',
      description: 'Commandes de tes récoltes',
      dataType: 'commandes',
      tabs: ['Toutes', 'En attente', 'Livrées'],
    },
  },
}
```

---

## 📝 PLAN DE MIGRATION PAR PROFIL

### ✅ MARCHAND (Déjà prêt - 100%)
Le Marchand utilise déjà `RoleDashboard` et sert de référence.

**Aucune action nécessaire pour l'instant.**

---

### 🔄 PRODUCTEUR

**Fichiers à modifier** :

1. **`/src/app/components/producteur/ProducteurHome.tsx`**
   ```tsx
   // AVANT
   export function ProducteurHome() {
     // Code spécifique...
   }
   
   // APRÈS
   import { UniversalAccueil } from '../shared/universal/UniversalAccueil';
   
   export function ProducteurHome() {
     return <UniversalAccueil role="producteur" />;
   }
   ```

2. **`/src/app/components/producteur/ProducteurProduction.tsx`** (créer si n'existe pas)
   ```tsx
   import { UniversalMarche } from '../shared/universal/UniversalMarche';
   
   export function ProducteurProduction() {
     return <UniversalMarche role="producteur" />;
   }
   ```

3. **`/src/app/components/producteur/ProducteurCommandes.tsx`** (créer si n'existe pas)
   ```tsx
   import { UniversalProduits } from '../shared/universal/UniversalProduits';
   
   export function ProducteurCommandes() {
     return <UniversalProduits role="producteur" />;
   }
   ```

4. **`/src/app/components/producteur/ProducteurProfil.tsx`**
   ```tsx
   // AVANT
   export function ProducteurProfil() {
     // Code spécifique...
   }
   
   // APRÈS
   import { UniversalProfil } from '../shared/UniversalProfil';
   
   export function ProducteurProfil() {
     return <UniversalProfil role="producteur" />;
   }
   ```

---

### 🔄 COOPÉRATIVE

**Fichiers à modifier** :

1. **`/src/app/components/cooperative/CooperativeHome.tsx`**
   ```tsx
   import { UniversalAccueil } from '../shared/universal/UniversalAccueil';
   
   export function CooperativeHome() {
     return <UniversalAccueil role="cooperative" />;
   }
   ```

2. **`/src/app/components/cooperative/CooperativeMembres.tsx`** (créer)
   ```tsx
   import { UniversalMarche } from '../shared/universal/UniversalMarche';
   
   export function CooperativeMembres() {
     return <UniversalMarche role="cooperative" />;
   }
   ```

3. **`/src/app/components/cooperative/CooperativeCommandes.tsx`** (créer)
   ```tsx
   import { UniversalProduits } from '../shared/universal/UniversalProduits';
   
   export function CooperativeCommandes() {
     return <UniversalProduits role="cooperative" />;
   }
   ```

4. **`/src/app/components/cooperative/CooperativeProfil.tsx`**
   ```tsx
   import { UniversalProfil } from '../shared/UniversalProfil';
   
   export function CooperativeProfil() {
     return <UniversalProfil role="cooperative" />;
   }
   ```

---

### 🔄 IDENTIFICATEUR

**Fichiers à modifier** :

1. **`/src/app/components/identificateur/IdentificateurHome.tsx`**
   ```tsx
   import { UniversalAccueil } from '../shared/universal/UniversalAccueil';
   
   export function IdentificateurHome() {
     return <UniversalAccueil role="identificateur" />;
   }
   ```

2. **`/src/app/components/identificateur/IdentificateurActeurs.tsx`** (créer)
   ```tsx
   import { UniversalMarche } from '../shared/universal/UniversalMarche';
   
   export function IdentificateurActeurs() {
     return <UniversalMarche role="identificateur" />;
   }
   ```

3. **`/src/app/components/identificateur/IdentificateurSuivi.tsx`** (créer)
   ```tsx
   import { UniversalProduits } from '../shared/universal/UniversalProduits';
   
   export function IdentificateurSuivi() {
     return <UniversalProduits role="identificateur" />;
   }
   ```

4. **`/src/app/components/identificateur/IdentificateurProfil.tsx`**
   ```tsx
   import { UniversalProfil } from '../shared/UniversalProfil';
   
   export function IdentificateurProfil() {
     return <UniversalProfil role="identificateur" />;
   }
   ```

---

### 🔄 INSTITUTION

**Fichiers à modifier** :

1. **`/src/app/components/institution/InstitutionHome.tsx`**
   ```tsx
   import { UniversalAccueil } from '../shared/universal/UniversalAccueil';
   
   export function InstitutionHome() {
     return <UniversalAccueil role="institution" />;
   }
   ```

2. **`/src/app/components/institution/InstitutionActeurs.tsx`** (créer)
   ```tsx
   import { UniversalMarche } from '../shared/universal/UniversalMarche';
   
   export function InstitutionActeurs() {
     return <UniversalMarche role="institution" />;
   }
   ```

3. **`/src/app/components/institution/InstitutionAnalytics.tsx`** (créer)
   ```tsx
   import { UniversalProduits } from '../shared/universal/UniversalProduits';
   
   export function InstitutionAnalytics() {
     return <UniversalProduits role="institution" />;
   }
   ```

4. **`/src/app/components/institution/InstitutionProfil.tsx`**
   ```tsx
   import { UniversalProfil } from '../shared/UniversalProfil';
   
   export function InstitutionProfil() {
     return <UniversalProfil role="institution" />;
   }
   ```

---

## ⚙️ Mise à jour des Routes

**Fichier** : `/src/app/routes.tsx`

**Exemple pour Producteur** :
```tsx
import { ProducteurHome } from './components/producteur/ProducteurHome';
import { ProducteurProduction } from './components/producteur/ProducteurProduction';
import { ProducteurCommandes } from './components/producteur/ProducteurCommandes';
import { ProducteurProfil } from './components/producteur/ProducteurProfil';

// Dans les routes
{
  path: '/producteur',
  children: [
    { index: true, element: <ProducteurHome /> },
    { path: 'production', element: <ProducteurProduction /> },
    { path: 'commandes', element: <ProducteurCommandes /> },
    { path: 'profil', element: <ProducteurProfil /> },
  ],
}
```

---

## 🎨 Ce qui est Automatiquement Harmonisé

Grâce aux composants universels :

✅ **Couleurs** → Via `roleConfig.ts` (primaryColor)
✅ **KPIs** → Labels et icônes configurables
✅ **Actions** → Boutons configurables
✅ **Navigation** → Bottom bar + Sidebar (déjà universel)
✅ **Modals** → Même style partout
✅ **Animations** → Framer Motion identique
✅ **Icônes** → Lucide React cohérentes
✅ **Typographie** → Inter partout
✅ **Formulaires** → Même design d'inputs

---

## 🚨 Points d'Attention

### ⚠️ Spécificités à Préserver

Certains profils ont des **features uniques** à conserver :

1. **Marchand** → Gestion de journée (Ouvrir/Fermer)
2. **Identificateur** → Formulaire 4 étapes + GPS + Recherche territoire
3. **Producteur** → Cycles agricoles
4. **Coopérative** → Gestion membres

**Solution** : Les composants universels **incluent** ces spécificités via la config !

---

## ✅ Checklist Migration

Pour chaque profil :

- [ ] Créer/Modifier `{Profil}Home.tsx` → `<UniversalAccueil role="{profil}" />`
- [ ] Créer `{Profil}{Menu2}.tsx` → `<UniversalMarche role="{profil}" />`
- [ ] Créer `{Profil}{Menu3}.tsx` → `<UniversalProduits role="{profil}" />`
- [ ] Modifier `{Profil}Profil.tsx` → `<UniversalProfil role="{profil}" />`
- [ ] Mettre à jour les routes dans `routes.tsx`
- [ ] Vérifier que la config dans `roleConfig.ts` est complète
- [ ] Tester toutes les pages
- [ ] Vérifier les couleurs
- [ ] Vérifier la navigation
- [ ] Vérifier les modals

---

## 📊 Résultat Final

**AVANT** :
```
/marchand/MarchandHome.tsx (500 lignes)
/producteur/ProducteurHome.tsx (480 lignes)
/cooperative/CooperativeHome.tsx (450 lignes)
/identificateur/IdentificateurHome.tsx (520 lignes)
/institution/InstitutionHome.tsx (470 lignes)

TOTAL : 2420 lignes de code dupliqué
```

**APRÈS** :
```
/shared/universal/UniversalAccueil.tsx (200 lignes)
/marchand/MarchandHome.tsx (3 lignes)
/producteur/ProducteurHome.tsx (3 lignes)
/cooperative/CooperativeHome.tsx (3 lignes)
/identificateur/IdentificateurHome.tsx (3 lignes)
/institution/InstitutionHome.tsx (3 lignes)

TOTAL : 215 lignes - Réduction de 91% !
```

---

## 🎯 Avantages

1. ✅ **Maintenance simplifiée** : 1 seul endroit à modifier
2. ✅ **Cohérence UI parfaite** : Impossible d'avoir des différences
3. ✅ **Nouveaux profils faciles** : 3 lignes de code suffiront !
4. ✅ **Tests centralisés** : Tester 1 composant = Tester 5 profils
5. ✅ **Performance** : Moins de code = App plus légère

---

## 🚀 Prochaines Étapes

1. **Tester** les composants universels avec chaque profil
2. **Migrer progressivement** : Commencer par Producteur
3. **Affiner** les composants selon les retours
4. **Documenter** les spécificités de chaque profil
5. **Former** l'équipe sur les composants universels

---

**Créé le** : 2 Mars 2026  
**Version** : 1.0.0  
**Auteur** : Équipe JULABA