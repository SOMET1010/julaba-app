import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  Trash2,
  UserCheck,
  Users as UsersIcon,
  Wallet,
  XCircle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const TYPE_COLORS: Record<string, string> = {
  marchand: '#C66A2C',
  producteur: '#2E8B57',
  cooperative: '#2072AF',
  cooperateur: '#2072AF',
  institution: '#7C3AED',
  identificateur: '#5B5248',
  admin_general: '#7C3AED',
  admin_national: '#2563EB',
  gestionnaire_zone: '#10B981',
  operateur_terrain: '#EA580C',
  super_admin: '#5B5248',
  administrateur: '#5B5248',
};

export const TAB_BROUILLONS_COLOR = '#F97316';
export const TAB_ANOMALIES_COLOR = '#EF4444';
export const TAB_ADMINS_COLOR = '#DC2626';

export const STATUS_DOT_COLOR: Record<string, string> = {
  actif: '#10B981',
  en_attente: '#F59E0B',
  en_attente_validation: '#F59E0B',
  suspendu: '#EF4444',
  rejete: '#6B7280',
  supprime: '#9CA3AF',
};

export const STATUT_CONFIG: Record<string, { label: string; bg: string; text: string; icon: LucideIcon; dotColor: string }> = {
  actif: { label: 'Actif', bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle2, dotColor: STATUS_DOT_COLOR.actif },
  suspendu: { label: 'Suspendu', bg: 'bg-red-100', text: 'text-red-700', icon: XCircle, dotColor: STATUS_DOT_COLOR.suspendu },
  en_attente: { label: 'En attente', bg: 'bg-orange-100', text: 'text-orange-700', icon: Clock, dotColor: STATUS_DOT_COLOR.en_attente },
  en_attente_validation: { label: 'En attente de validation', bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock, dotColor: STATUS_DOT_COLOR.en_attente_validation },
  rejete: { label: 'Rejeté', bg: 'bg-gray-100', text: 'text-gray-700', icon: AlertCircle, dotColor: STATUS_DOT_COLOR.rejete },
  supprime: { label: 'Supprimé', bg: 'bg-gray-200', text: 'text-gray-600', icon: Trash2, dotColor: STATUS_DOT_COLOR.supprime },
};

export const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'marchand', label: 'Marchand' },
  { value: 'producteur', label: 'Producteur' },
  { value: 'cooperative', label: 'Coopérative' },
  { value: 'institution', label: 'Institution' },
  { value: 'identificateur', label: 'Identificateur' },
  { value: 'admin_general', label: 'Administrateur général' },
  { value: 'admin_national', label: 'Administrateur national' },
  { value: 'admin_regional', label: 'Administrateur régional' },
  { value: 'admin', label: 'Administrateur' },
  { value: 'super_admin', label: 'Super administrateur' },
  { value: 'gestionnaire_zone', label: 'Gestionnaire de zone' },
  { value: 'operateur_terrain', label: 'Analyste' },
];

export function getRoleLabel(role: string | undefined | null): string {
  if (!role) return 'Inconnu';
  const found = ROLE_OPTIONS.find(r => r.value === role);
  if (found) return found.label;
  const fallback: Record<string, string> = {
    cooperateur: 'Coopérative',
    super_admin: 'Super administrateur',
    administrateur: 'Administrateur',
  };
  return fallback[role] || role.charAt(0).toUpperCase() + role.slice(1);
}

export function getContextualTabLabel(role: string): { label: string; icon: LucideIcon; route: string } {
  const normalized = role === 'cooperateur' ? 'cooperative' : role;
  switch (normalized) {
    case 'marchand':
      return { label: 'Ventes', icon: Wallet, route: '/backoffice/transactions' };
    case 'producteur':
      return { label: 'Récoltes', icon: Activity, route: '/backoffice/recoltes' };
    case 'cooperative':
      return { label: 'Membres', icon: UsersIcon, route: '/backoffice/cooperatives' };
    case 'institution':
      return { label: 'Modules', icon: Layers, route: '/backoffice/institutions' };
    case 'identificateur':
      return { label: 'Enrôlements', icon: UserCheck, route: '/backoffice/enrolement' };
    default:
      return { label: 'Activité', icon: Activity, route: '/backoffice/acteurs' };
  }
}
