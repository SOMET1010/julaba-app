# 🔄 Exemple de Migration vers les Composants Universels

## Exemple Pratique : Migration de ProducteurProfil

### ❌ AVANT - Composant spécifique

```tsx
// /src/app/components/producteur/ProducteurProfil.tsx
import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Navigation } from '../layout/Navigation';
import { User, Phone, MapPin } from 'lucide-react';

export function ProducteurProfil() {
  const [showCard, setShowCard] = useState(false);

  return (
    <>
      <Navigation role="producteur" onMicClick={() => {}} />
      
      <div className="pb-32 lg:pb-8 pt-12 lg:pt-16 px-4 lg:pl-[320px] max-w-2xl lg:max-w-7xl mx-auto min-h-screen bg-gradient-to-b from-green-50 to-white">
        
        {/* Carte professionnelle avec code dupliqué */}
        <div className="p-6 bg-white rounded-2xl shadow-lg">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <User className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Koné Ibrahim</h1>
              <p className="text-sm text-gray-600">Producteur</p>
            </div>
          </div>
          
          {/* Beaucoup de code... */}
          
        </div>
      </div>
    </>
  );
}
```

**Problèmes** :
- ❌ Code dupliqué entre tous les profils
- ❌ Difficile à maintenir
- ❌ Incohérence UI possible
- ❌ Une modification nécessite de toucher 5 fichiers

---

### ✅ APRÈS - Composant universel

```tsx
// /src/app/components/producteur/ProducteurProfil.tsx
import { UniversalProfil } from '../shared';

export function ProducteurProfil() {
  return <UniversalProfil role="producteur" />;
}
```

**Avantages** :
- ✅ **1 ligne de code** au lieu de centaines
- ✅ Cohérence UI garantie à 100%
- ✅ Une modification → tous les profils mis à jour
- ✅ Couleurs adaptées automatiquement
- ✅ Moins de bugs, plus de maintenabilité

---

## Exemple 2 : Migration d'une Page avec Wrapper

### ❌ AVANT

```tsx
// /src/app/components/marchand/MarchandVentes.tsx
import React from 'react';
import { Navigation } from '../layout/Navigation';

export function MarchandVentes() {
  return (
    <>
      <Navigation role="marchand" onMicClick={() => {}} />
      
      <div className="pb-32 lg:pb-8 pt-12 lg:pt-16 px-4 lg:pl-[320px] max-w-2xl lg:max-w-7xl mx-auto min-h-screen bg-gradient-to-b from-orange-50 to-white">
        
        <h1 className="text-3xl font-black text-orange-600 mb-6">
          Mes Ventes
        </h1>
        
        {/* Contenu de la page */}
        <div className="space-y-4">
          {/* Liste des ventes... */}
        </div>
        
      </div>
    </>
  );
}
```

### ✅ APRÈS

```tsx
// /src/app/components/marchand/MarchandVentes.tsx
import React from 'react';
import { UniversalPageWrapper } from '../shared';
import { getRoleColor } from '../../config/roleConfig';

export function MarchandVentes() {
  const color = getRoleColor('marchand');
  
  return (
    <UniversalPageWrapper 
      role="marchand"
      suggestions={[
        "Afficher mes ventes du jour",
        "Filtrer par produit",
        "Voir les statistiques",
      ]}
    >
      <h1 className="text-3xl font-black mb-6" style={{ color }}>
        Mes Ventes
      </h1>
      
      {/* Contenu de la page */}
      <div className="space-y-4">
        {/* Liste des ventes... */}
      </div>
      
    </UniversalPageWrapper>
  );
}
```

**Réduction** : ~15 lignes → ~25 lignes (mais avec navigation + Tantie Sagesse inclus !)

---

## Exemple 3 : Créer une nouvelle page universelle

### Créer une page "Statistiques" pour tous les profils

```tsx
// /src/app/components/shared/UniversalStats.tsx
import React from 'react';
import { motion } from 'motion/react';
import { BarChart3, TrendingUp, TrendingDown } from 'lucide-react';
import { UniversalPageWrapper } from './UniversalPageWrapper';
import { getRoleColor } from '../../config/roleConfig';

interface UniversalStatsProps {
  role: 'marchand' | 'producteur' | 'cooperative' | 'institution' | 'identificateur';
}

export function UniversalStats({ role }: UniversalStatsProps) {
  const color = getRoleColor(role);
  
  // Titres adaptés par rôle
  const titles = {
    marchand: 'Mes Statistiques de Vente',
    producteur: 'Mes Statistiques de Production',
    cooperative: 'Statistiques de la Coopérative',
    institution: 'Statistiques Globales',
    identificateur: 'Mes Statistiques d\'Identification',
  };
  
  return (
    <UniversalPageWrapper role={role}>
      <h1 className="text-3xl font-black mb-6" style={{ color }}>
        {titles[role]}
      </h1>
      
      {/* KPIs universels */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Total"
          value="142"
          icon={BarChart3}
          trend="+12%"
          color={color}
        />
        {/* Autres KPIs... */}
      </div>
      
      {/* Graphiques */}
      <div className="bg-white p-6 rounded-2xl shadow-lg">
        {/* Graphique universel ici */}
      </div>
    </UniversalPageWrapper>
  );
}

// Composant StatCard réutilisable
function StatCard({ title, value, icon: Icon, trend, color }) {
  const isPositive = trend.startsWith('+');
  
  return (
    <motion.div
      className="p-4 bg-white rounded-xl shadow-md"
      whileHover={{ scale: 1.05, y: -4 }}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-6 h-6" style={{ color }} />
        {trend && (
          <div className={`flex items-center gap-1 text-xs font-bold ${
            isPositive ? 'text-green-600' : 'text-red-600'
          }`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {trend}
          </div>
        )}
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-xs font-semibold text-gray-600">{title}</p>
    </motion.div>
  );
}
```

### Utilisation dans chaque profil

```tsx
// /src/app/components/marchand/MarchandStats.tsx
import { UniversalStats } from '../shared/UniversalStats';

export function MarchandStats() {
  return <UniversalStats role="marchand" />;
}

// /src/app/components/producteur/ProducteurStats.tsx
import { UniversalStats } from '../shared/UniversalStats';

export function ProducteurStats() {
  return <UniversalStats role="producteur" />;
}

// ... et ainsi de suite pour tous les profils
```

**Résultat** :
- ✅ 1 seul fichier source (`UniversalStats.tsx`)
- ✅ 5 wrappers minimaux par profil
- ✅ Cohérence UI totale
- ✅ Maintenance simplifiée

---

## 📝 Checklist de Migration

Avant de migrer un composant :

### 1. Analyse
- [ ] Le composant existe-t-il pour plusieurs profils ?
- [ ] La logique est-elle similaire entre les profils ?
- [ ] Seules les couleurs et données changent ?

### 2. Préparation
- [ ] Identifier les parties communes
- [ ] Identifier les parties spécifiques par rôle
- [ ] Créer une interface claire pour les props

### 3. Implémentation
- [ ] Créer le composant universel dans `/shared/`
- [ ] Utiliser `getRoleColor()` et `getRoleConfig()`
- [ ] Ajouter la prop `role`
- [ ] Exporter dans `/shared/index.ts`

### 4. Migration
- [ ] Remplacer les anciens composants par le nouveau
- [ ] Tester avec tous les 5 profils
- [ ] Vérifier la cohérence visuelle
- [ ] Supprimer les anciens fichiers

### 5. Documentation
- [ ] Ajouter des exemples d'utilisation
- [ ] Documenter les props
- [ ] Mettre à jour le guide

---

## 🎯 Prochaines Étapes

Composants à migrer en priorité :

1. **✅ Profil** - FAIT avec `UniversalProfil`
2. **✅ PageWrapper** - FAIT avec `UniversalPageWrapper`
3. **⏳ Home** - À faire
4. **⏳ Dashboard** - À faire
5. **⏳ Stats** - À faire

---

**Temps estimé de migration par composant** : 30-60 minutes  
**Gain de maintenabilité** : 80% de code en moins à maintenir  
**ROI** : Excellente ! 🚀
