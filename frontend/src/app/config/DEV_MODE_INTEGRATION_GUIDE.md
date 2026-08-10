# Guide d'Intégration du Mode Dev dans les Contextes

## Pour les nouveaux contextes ou modifications

Si vous créez un nouveau contexte ou modifiez un contexte existant, voici comment intégrer le mode dev :

## 1. Imports nécessaires

```typescript
import { DEV_MODE, devLog } from '../config/devMode';
import { DEV_EMPTY_DATA } from '../data/devMockData';
```

## 2. Court-circuiter le chargement initial (useEffect)

```typescript
useEffect(() => {
  // Mode dev : ne pas charger les données
  if (DEV_MODE) {
    devLog('MonContext', 'Chargement données désactivé en mode dev');
    setLoading(false);
    return;
  }
  
  // Code normal pour charger les données depuis l'API
  const loadData = async () => {
    // ... appels API
  };
  
  loadData();
}, []);
```

## 3. Court-circuiter les mutations (ajout, modification, suppression)

```typescript
const addItem = async (item: Item) => {
  // Mise à jour de l'état local (fonctionne en mode dev et production)
  setItems(prev => [...prev, item]);
  
  // Mode dev : ne pas synchroniser avec l'API
  if (DEV_MODE) {
    devLog('MonContext', 'Ajout item (mode dev - pas de sync)');
    return;
  }
  
  // Code normal pour synchroniser avec l'API
  try {
    await fetch(/* ... */);
  } catch (error) {
    console.error('Erreur sync:', error);
  }
};
```

## 4. Court-circuiter les fetch/requêtes

```typescript
const fetchData = async () => {
  // Mode dev : retourner des données vides
  if (DEV_MODE) {
    devLog('MonContext', 'Fetch ignoré - retour données mock');
    return DEV_EMPTY_DATA.monType;
  }
  
  // Code normal
  const response = await fetch(/* ... */);
  return response.json();
};
```

## 5. Données mock personnalisées

Si vous avez besoin de données mock spécifiques, ajoutez-les dans `/src/app/data/devMockData.ts` :

```typescript
export const DEV_EMPTY_DATA = {
  // ... données existantes
  
  // Nouvelles données mock
  monNouveauType: [] as MonType[],
};
```

Ou créez des données par défaut :

```typescript
export const DEV_MON_TYPE_DEFAULT: MonType = {
  id: 'dev-001',
  name: 'Item Dev',
  // ... autres champs
};
```

## 6. Pattern complet pour un contexte

```typescript
import React, { createContext, useContext, useState, useEffect } from 'react';
import { DEV_MODE, devLog } from '../config/devMode';
import { projectId, publicAnonKey } from '/utils/supabase/info';

interface MonContextType {
  items: Item[];
  loading: boolean;
  addItem: (item: Item) => Promise<void>;
  refreshItems: () => Promise<void>;
}

const MonContext = createContext<MonContextType | undefined>(undefined);

export function MonProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Chargement initial
  useEffect(() => {
    if (DEV_MODE) {
      devLog('MonContext', 'Mode dev - Pas de chargement');
      setLoading(false);
      return;
    }
    
    loadItems();
  }, []);
  
  const loadItems = async () => {
    if (DEV_MODE) return;
    
    try {
      const response = await fetch(`https://${projectId}.supabase.co/...`);
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const addItem = async (item: Item) => {
    setItems(prev => [...prev, item]);
    
    if (DEV_MODE) {
      devLog('MonContext', 'Item ajouté (mode dev - pas de sync)');
      return;
    }
    
    try {
      await fetch(`https://${projectId}.supabase.co/...`, {
        method: 'POST',
        body: JSON.stringify(item),
      });
    } catch (error) {
      console.error('Erreur ajout:', error);
    }
  };
  
  const refreshItems = async () => {
    if (DEV_MODE) {
      devLog('MonContext', 'Refresh ignoré en mode dev');
      return;
    }
    
    await loadItems();
  };
  
  return (
    <MonContext.Provider value={{ items, loading, addItem, refreshItems }}>
      {children}
    </MonContext.Provider>
  );
}

export function useMonContext() {
  const context = useContext(MonContext);
  if (!context) {
    throw new Error('useMonContext doit être utilisé dans MonProvider');
  }
  return context;
}
```

## 7. Checklist pour intégrer le mode dev

- [ ] Importer DEV_MODE et devLog
- [ ] Court-circuiter le useEffect de chargement initial
- [ ] Court-circuiter toutes les fonctions de mutation (add, update, delete)
- [ ] Court-circuiter toutes les fonctions de fetch/refresh
- [ ] Ajouter des logs devLog pour le debugging
- [ ] Tester en mode dev (DEV_MODE = true)
- [ ] Tester en mode normal (DEV_MODE = false)

## 8. Fonctions helper disponibles

### devLog
```typescript
devLog('ContextName', 'Message', optionalData);
// Affiche dans console uniquement si DEV_MODE = true
```

### devApiCall (from useDevMode.ts)
```typescript
import { devApiCall } from '../hooks/useDevMode';

const data = await devApiCall(
  () => fetch(url).then(r => r.json()),
  DEV_EMPTY_DATA.myType,
  'myEndpoint'
);
```

### useDevModeSkip (from useDevMode.ts)
```typescript
import { useDevModeSkip } from '../hooks/useDevMode';

useEffect(() => {
  if (useDevModeSkip('MonContext')) return;
  
  // Code normal...
}, []);
```

## Exemples concrets

Voir :
- `/src/app/contexts/AppContext.tsx` - Exemple complet d'intégration
- `/src/app/contexts/DevModeContext.tsx` - Context dédié au mode dev
- `/src/app/hooks/useDevMode.ts` - Hooks utilitaires
