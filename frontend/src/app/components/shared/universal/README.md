# 🌐 Composants Universels JULABA

## 📋 Vue d'ensemble

Ce dossier contient les **4 composants universels** qui remplacent tous les composants spécifiques par profil pour atteindre une **harmonisation UI à 100%**.

---

## 📦 Composants Disponibles

| Composant | Fichier | Remplace | Menu |
|-----------|---------|----------|------|
| **UniversalAccueil** | `UniversalAccueil.tsx` | MarchandHome, ProducteurHome, etc. | ACCUEIL (Menu 1) |
| **UniversalMarche** | `UniversalMarche.tsx` | MarcheVirtuel, ProducteurProduction, etc. | MARCHÉ/PRODUCTION/MEMBRES/ACTEURS (Menu 2) |
| **UniversalProduits** | `UniversalProduits.tsx` | GestionStock, ProducteurCommandes, etc. | PRODUITS/COMMANDES/SUIVI/ANALYTICS (Menu 3) |
| **UniversalProfil** | (existe dans `/shared/`) | MarchandProfil, ProducteurProfil, etc. | MOI (Menu 4) |

---

## 🎯 Principe de Fonctionnement

### **UN SEUL PROP** : `role`

```tsx
<UniversalAccueil role="marchand" />
<UniversalAccueil role="producteur" />
<UniversalAccueil role="cooperative" />
<UniversalAccueil role="identificateur" />
<UniversalAccueil role="institution" />
```

**Tout le reste est automatique** :
- ✅ Couleurs adaptées via `roleConfig.ts`
- ✅ Labels personnalisés via `roleConfig.ts`
- ✅ Données contextuelles via Context API
- ✅ Navigation adaptée automatiquement

---

## 🚀 Utilisation

### Import centralisé
```tsx
import { 
  UniversalAccueil, 
  UniversalMarche, 
  UniversalProduits 
} from '@/app/components/shared/universal';
```

### Exemple complet (Producteur)
```tsx
// ProducteurHome.tsx
import { UniversalAccueil } from '@/app/components/shared/universal';

export function ProducteurHome() {
  return <UniversalAccueil role="producteur" />;
}

// ProducteurProduction.tsx
import { UniversalMarche } from '@/app/components/shared/universal';

export function ProducteurProduction() {
  return <UniversalMarche role="producteur" />;
}

// ProducteurCommandes.tsx
import { UniversalProduits } from '@/app/components/shared/universal';

export function ProducteurCommandes() {
  return <UniversalProduits role="producteur" />;
}

// ProducteurProfil.tsx
import { UniversalProfil } from '@/app/components/shared';

export function ProducteurProfil() {
  return <UniversalProfil role="producteur" />;
}
```

---

## ⚙️ Configuration

Toute la configuration est centralisée dans `/src/app/config/roleConfig.ts`.

**Exemple de configuration pour un profil** :
```typescript
producteur: {
  name: 'Producteur',
  primaryColor: '#2E8B57',
  gradientFrom: 'from-green-50',
  gradientTo: 'to-white',
  greeting: 'Enregistre tes récoltes aujourd\'hui',
  
  bottomBar: {
    items: [
      { label: 'Accueil', path: '/producteur', icon: 'Home' },
      { label: 'Production', path: '/producteur/production', icon: 'Sprout' },
      { label: 'Commandes', path: '/producteur/commandes', icon: 'ShoppingCart' },
      { label: 'Moi', path: '/producteur/profil', icon: 'User' },
    ],
  },
  
  dashboardKPIs: {
    kpi1: { label: 'Production totale', unit: 'kg', icon: 'Sprout', color: '#16A34A' },
    kpi2: { label: 'Revenus totaux', unit: 'FCFA', icon: 'TrendingUp', color: '#2563EB' },
  },
  
  mainActions: {
    action1: { label: 'Nouveau cycle', subtitle: 'Créer un cycle', route: '/producteur/production', color: '#16A34A', icon: 'Sprout' },
    action2: { label: 'Déclarer récolte', subtitle: 'Enregistrer', route: '/producteur/production', color: '#2563EB', icon: 'Package' },
  },
  
  pages: {
    accueil: {
      hasSessionManagement: false,
      hasWallet: true,
    },
    menu2: {
      menuLabel: 'PRODUCTION',
      pageTitle: 'Ma Production',
      description: 'Gère tes cultures et récoltes',
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

## 📊 Nomenclature des Menus par Profil

| Profil | Accueil | Menu 2 | Menu 3 | Profil |
|--------|---------|--------|--------|--------|
| **Marchand** | ACCUEIL | **MARCHÉ** | **PRODUITS** | MOI |
| **Producteur** | ACCUEIL | **PRODUCTION** | **COMMANDES** | MOI |
| **Coopérative** | ACCUEIL | **MEMBRES** | **COMMANDES** | MOI |
| **Identificateur** | ACCUEIL | **ACTEURS** | **SUIVI** | MOI |
| **Institution** | ACCUEIL | **ACTEURS** | **ANALYTICS** | MOI |

---

## 🎨 Avantages

1. **Maintenance centralisée** : 1 modification = Changement partout
2. **Cohérence parfaite** : Impossible d'avoir des écarts UI
3. **Nouveaux profils faciles** : Ajouter une config = Nouveau profil prêt
4. **Tests simplifiés** : Tester 1 composant = Tester tous les profils
5. **Code réduit de 91%** : Moins de duplication

---

## 📚 Documentation

- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** : Guide complet de migration
- **[types.ts](./types.ts)** : Types TypeScript des composants

---

## 🔧 Structure des Fichiers

```
/universal/
├── UniversalAccueil.tsx      # Menu 1 : ACCUEIL (Dashboard)
├── UniversalMarche.tsx        # Menu 2 : MARCHÉ/PRODUCTION/MEMBRES/ACTEURS
├── UniversalProduits.tsx      # Menu 3 : PRODUITS/COMMANDES/SUIVI/ANALYTICS
├── types.ts                   # Types partagés
├── index.ts                   # Exports centralisés
├── README.md                  # Ce fichier
└── MIGRATION_GUIDE.md         # Guide de migration détaillé
```

---

## ✅ Checklist d'utilisation

Pour utiliser les composants universels dans un nouveau profil :

1. [ ] Définir la configuration dans `roleConfig.ts`
2. [ ] Créer les fichiers wrapper (`{Profil}Home.tsx`, etc.)
3. [ ] Importer les composants universels
4. [ ] Passer le prop `role` avec le bon profil
5. [ ] Configurer les routes dans `routes.tsx`
6. [ ] Tester toutes les pages
7. [ ] Vérifier les couleurs et labels

---

## 🚨 Important

### ⚠️ NE JAMAIS :
- ❌ Dupliquer le code des composants universels
- ❌ Hard-coder les couleurs dans les composants
- ❌ Créer des composants spécifiques par profil

### ✅ TOUJOURS :
- ✅ Utiliser les composants universels
- ✅ Configurer via `roleConfig.ts`
- ✅ Passer le prop `role` correctement
- ✅ Utiliser les hooks Context pour les données

---

**Créé le** : 2 Mars 2026  
**Version** : 1.0.0  
**Dernière mise à jour** : 2 Mars 2026
