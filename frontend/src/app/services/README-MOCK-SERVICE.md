# 📚 Guide Utilisation Service Mock Producteur

## 🎯 Objectif

Permettre au **profil Producteur** de fonctionner complètement **sans base de données Supabase**, en utilisant un service mock qui stocke les données dans le localStorage du navigateur.

---

## 🚀 Quick Start

### 1. Import du service

```typescript
import { 
  mockCyclesService,
  mockRecoltesService,
  mockPublicationsService,
  seedMockData 
} from '../services/mock/producteur-mock.service';
```

### 2. Initialisation données démo

```typescript
import { useProducteurMockInit } from '../hooks/useProducteurMockInit';

function ProducteurHome() {
  const { user } = useUser();
  
  // Initialise données démo automatiquement au premier lancement
  useProducteurMockInit(user?.id);
  
  // Le reste du composant...
}
```

**Données créées automatiquement :**
- 2 cycles (Riz en_cours, Igname terminé)
- 1 récolte (3500 kg)
- 1 publication (disponible marketplace)

---

## 🔧 Utilisation dans ProducteurContext

Le `ProducteurContext` doit utiliser l'**adaptateur API** au lieu du service mock directement.

### ✅ CORRECT (via adaptateur)

```typescript
// ProducteurContext.tsx
import { 
  cyclesApiAdapter,
  recoltesApiAdapter,
  publicationsApiAdapter 
} from '../services/api/producteur-api-adapter';

const fetchCycles = async () => {
  try {
    // L'adaptateur bascule automatiquement entre mock et API
    const { cycles } = await cyclesApiAdapter.fetchCycles();
    setCycles(cycles);
  } catch (error) {
    console.error('Error fetching cycles:', error);
  }
};

const createCycle = async (data) => {
  try {
    const { cycle } = await cyclesApiAdapter.createCycle(data);
    setCycles(prev => [cycle, ...prev]);
    toast.success('Cycle créé avec succès');
  } catch (error) {
    toast.error('Erreur lors de la création du cycle');
  }
};
```

### ❌ INCORRECT (service mock direct)

```typescript
// NE PAS FAIRE - Utiliser l'adaptateur à la place
import { mockCyclesService } from '../services/mock/producteur-mock.service';

const fetchCycles = async () => {
  const cycles = await mockCyclesService.getCycles(userId);
  // Problème : Pas de bascule possible vers API réelle
};
```

---

## 📦 API Disponible

### Cycles de Production

```typescript
// Récupérer tous les cycles
const { cycles } = await cyclesApiAdapter.fetchCycles();
// Retourne : CycleProduction[]

// Créer un cycle
const { cycle } = await cyclesApiAdapter.createCycle({
  culture: 'Riz',
  surface: 2.5,
  date_plantation: '2026-03-01',
  date_recolte_estimee: '2026-07-01',
  quantite_estimee: 3000,
  parcelle: 'Parcelle A',
  notes: 'Première plantation',
});

// Modifier un cycle
const { cycle } = await cyclesApiAdapter.updateCycle(cycleId, {
  status: 'completed',
  quantite_reelle: 3200,
});

// Supprimer un cycle
await cyclesApiAdapter.deleteCycle(cycleId);

// Compléter un cycle
await cyclesApiAdapter.completeCycle(cycleId, {
  date_recolte_reelle: '2026-07-15',
  quantite_reelle: 3200,
});
```

### Récoltes

```typescript
// Récupérer toutes les récoltes
const { recoltes } = await recoltesApiAdapter.fetchRecoltes();

// Créer une récolte
const { recolte } = await recoltesApiAdapter.createRecolte({
  cycle_id: cycleId,
  produit: 'Riz',
  quantite: 3200,
  unite: 'kg',
  qualite: 'premium',
  date_recolte: '2026-07-15',
  prix_unitaire: 650,
  notes: 'Bonne qualité',
});

// Modifier une récolte
const { recolte } = await recoltesApiAdapter.updateRecolte(recolteId, {
  quantite: 3300,
  qualite: 'premium',
});

// Supprimer une récolte
await recoltesApiAdapter.deleteRecolte(recolteId);
```

### Publications Marketplace

```typescript
// Récupérer toutes les publications
const { publications } = await publicationsApiAdapter.fetchPublications();

// Créer une publication
const { publication } = await publicationsApiAdapter.createPublication({
  recolte_id: recolteId,
  produit: 'Riz Premium',
  culture: 'Riz',
  quantite_disponible: 3200,
  quantite_initiale: 3200,
  unite: 'kg',
  prix_unitaire: 700,
  qualite: 'premium',
  description: 'Riz de qualité supérieure',
  localisation: 'Abobo',
});

// Modifier une publication
const { publication } = await publicationsApiAdapter.updatePublication(pubId, {
  prix_unitaire: 750,
  quantite_disponible: 2500,
});

// Archiver une publication
await publicationsApiAdapter.deletePublication(pubId);

// Toggle actif/archivé
await publicationsApiAdapter.togglePublication(pubId);
```

---

## 🎨 Exemple Complet - Composant Producteur

```typescript
import React, { useEffect, useState } from 'react';
import { useProducteurMockInit } from '../hooks/useProducteurMockInit';
import { cyclesApiAdapter } from '../services/api/producteur-api-adapter';
import { useUser } from '../contexts/UserContext';
import { toast } from 'sonner';

function MesC cycles() {
  const { user } = useUser();
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initialisation données mock (premier lancement uniquement)
  useProducteurMockInit(user?.id);

  // Charger les cycles
  useEffect(() => {
    loadCycles();
  }, []);

  const loadCycles = async () => {
    try {
      setLoading(true);
      const { cycles } = await cyclesApiAdapter.fetchCycles();
      setCycles(cycles);
    } catch (error) {
      toast.error('Erreur chargement cycles');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCycle = async (formData) => {
    try {
      const { cycle } = await cyclesApiAdapter.createCycle({
        culture: formData.culture,
        surface: formData.surface,
        date_plantation: formData.datePlantation,
        date_recolte_estimee: formData.dateRecolteEstimee,
        quantite_estimee: formData.quantiteEstimee,
      });

      setCycles(prev => [cycle, ...prev]);
      toast.success('Cycle créé avec succès');
    } catch (error) {
      toast.error('Erreur création cycle');
    }
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div>
      <h1>Mes Cycles de Production</h1>
      
      <button onClick={() => setShowModal(true)}>
        Nouveau Cycle
      </button>

      <div className="cycles-grid">
        {cycles.map(cycle => (
          <div key={cycle.id} className="cycle-card">
            <h3>{cycle.culture}</h3>
            <p>Surface: {cycle.surface} ha</p>
            <p>Statut: {cycle.status}</p>
          </div>
        ))}
      </div>

      {showModal && (
        <CreerCycleModal 
          onSubmit={handleCreateCycle}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
```

---

## 🔄 Migration vers API Réelle

Quand les tables Supabase sont créées :

```typescript
// Fichier : src/app/services/api/producteur-api-adapter.ts
// Ligne 24

// AVANT (mock)
const USE_MOCK_MODE = true;

// APRÈS (API Supabase)
const USE_MOCK_MODE = false;
```

**Aucun autre changement requis !** L'adaptateur bascule automatiquement.

---

## 🧹 Nettoyage Données Mock

### Via Console Navigateur

```javascript
// Nettoyer toutes les données mock
localStorage.removeItem('julaba_mock_cycles');
localStorage.removeItem('julaba_mock_recoltes');
localStorage.removeItem('julaba_mock_publications');
localStorage.removeItem('julaba_mock_initialized');

// Recharger la page
location.reload();
```

### Via Hook

```typescript
import { resetProducteurMock } from '../hooks/useProducteurMockInit';

// Dans un bouton "Réinitialiser données"
<button onClick={resetProducteurMock}>
  Réinitialiser Données Mock
</button>
```

---

## 🐛 Dépannage

### Problème : Données vides

**Solution :**
```javascript
// Console navigateur
localStorage.getItem('julaba_mock_cycles')
// Si null → Pas initialisé

// Forcer initialisation
import { seedMockData } from '../services/mock/producteur-mock.service';
seedMockData('producteur_demo');
```

### Problème : Erreur "Cannot read property"

**Cause :** userId null ou adaptateur mal importé

**Solution :**
```typescript
// Vérifier user connecté
const { user } = useUser();
if (!user) return <Redirect to="/login" />;

// Vérifier import correct
import { cyclesApiAdapter } from '../services/api/producteur-api-adapter';
// PAS : import { mockCyclesService } from '...'
```

### Problème : Données ne persistent pas

**Cause :** localStorage désactivé ou mode navigation privée

**Solution :**
```javascript
// Tester localStorage
try {
  localStorage.setItem('test', 'ok');
  localStorage.removeItem('test');
  console.log('✅ localStorage OK');
} catch (error) {
  console.error('❌ localStorage désactivé');
}
```

---

## 📊 Limites du Service Mock

| Feature | Mock | API Réelle |
|---------|------|------------|
| Stockage | localStorage (5-10 MB) | PostgreSQL (illimité) |
| Partage données | ❌ Par navigateur uniquement | ✅ Multi-users |
| Realtime | ❌ Non | ✅ Websockets |
| Requêtes complexes | ❌ Limitées | ✅ SQL complet |
| Production | ❌ Non recommandé | ✅ Oui |

**Recommandation :** Mock pour développement uniquement. Basculer vers API réelle dès que possible.

---

## 🎯 Checklist Intégration

- [ ] Import adaptateur (pas service mock direct)
- [ ] Hook `useProducteurMockInit` dans ProducteurHome
- [ ] Toast notifications (succès/erreur)
- [ ] Loading states
- [ ] Gestion erreurs (try/catch)
- [ ] Refresh data après mutations
- [ ] Validation formulaires
- [ ] Tests navigateur (localStorage)

---

## 📞 Support

En cas de problème :
1. Vérifier console navigateur (F12)
2. Vérifier localStorage (Application → Local Storage)
3. Consulter `GUIDE-MIGRATION-MOCK-TO-API.md`
4. Consulter `RAPPORT-CORRECTIONS-JULABA.md` section 3-4

---

**✅ Service Mock Prêt à l'Emploi !**
