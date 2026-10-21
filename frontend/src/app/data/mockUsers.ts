/**
 * ═══════════════════════════════════════════════════════════════════
 * ⚠️ DONNÉES MOCK — DÉVELOPPEMENT UNIQUEMENT
 * ═══════════════════════════════════════════════════════════════════
 * 
 * IMPORTANT : Ce fichier contient des utilisateurs fictifs pour
 * faciliter le développement et les tests. Il doit être SUPPRIMÉ
 * ou DÉSACTIVÉ en production.
 * 
 * TODO: Supprimer ce fichier après migration Supabase complète
 */

import { User } from '../contexts/AppContext';

export const DEV_MOCK_USERS: User[] = [
  {
    id: '1',
    phone: '0701020304',
    firstName: 'Aminata',
    lastName: 'Kouassi',
    role: 'marchand',
    region: 'Abidjan',
    commune: 'Yopougon',
    activity: 'Vente de riz',
    market: 'Marché de Yopougon',
    score: 85,
    createdAt: '2024-01-15',
    validated: true,
  },
  {
    id: '2',
    phone: '0709080706',
    firstName: 'Konan',
    lastName: 'Yao',
    role: 'producteur',
    region: 'Bouaké',
    commune: 'Bouaké Centre',
    activity: 'Production de maïs',
    score: 92,
    createdAt: '2024-02-10',
    validated: true,
  },
  {
    id: '3',
    phone: '0705040302',
    firstName: 'Marie',
    lastName: 'Bamba',
    role: 'cooperative',
    region: 'San Pedro',
    commune: 'San Pedro',
    activity: 'Coopérative agricole',
    cooperativeName: 'COOP IVOIRE VIVRIER',
    score: 88,
    createdAt: '2024-03-05',
    validated: true,
  },
  {
    id: '4',
    phone: '0707070707',
    firstName: 'Jean',
    lastName: 'Kouadio',
    role: 'institution',
    region: 'Abidjan',
    commune: 'Plateau',
    activity: 'Direction Générale de l\'Économie',
    score: 100,
    createdAt: '2024-01-01',
    validated: true,
  },
  {
    id: '5',
    phone: '0708080808',
    firstName: 'Sophie',
    lastName: 'Diarra',
    role: 'identificateur',
    region: 'Abidjan',
    commune: 'Marcory',
    activity: 'Agent terrain',
    market: 'Marché de Yopougon',
    score: 95,
    createdAt: '2024-04-20',
    validated: true,
  },
];

/**
 * ⚠️ FONCTION DEV ONLY - Rechercher un utilisateur mock par téléphone
 */
export function getMockUserByPhone(phone: string): User | null {
  return DEV_MOCK_USERS.find((u) => u.phone === phone) || null;
}

/**
 * ⚠️ FONCTION DEV ONLY - Obtenir tous les utilisateurs mock
 */
export function getAllMockUsers(): User[] {
  return DEV_MOCK_USERS;
}
