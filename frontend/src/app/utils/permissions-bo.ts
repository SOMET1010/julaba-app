/**
 * Droits back-office réutilisables (Phase 4A-6).
 */

export type CreatableAdminRole =
  | 'admin_general'
  | 'admin_national'
  | 'gestionnaire_zone'
  | 'operateur_terrain';

const BO_STAFF_ROLES = new Set([
  'super_admin',
  'admin_general',
  'admin_national',
  'gestionnaire_zone',
  'operateur_terrain',
]);

export function CAN_CREATE_ADMIN(role: string | undefined | null): boolean {
  return role === 'super_admin' || role === 'admin_general';
}

/** Phase 4C / Q20 : signalement depuis le BO (sans operateur_terrain seul lecture). */
export function CAN_SIGNAL(role: string | undefined | null): boolean {
  return (
    role === 'super_admin'
    || role === 'admin_general'
    || role === 'admin_national'
    || role === 'gestionnaire_zone'
  );
}

/** Phase 4B: accès KPIs / alertes (à affiner avec RBAC métier). */
export function CAN_VIEW_ALERTS(role: string | undefined | null): boolean {
  return role === 'super_admin' || role === 'admin_general';
}

/** Phase 6: validation des comptes admin en attente. */
export function CAN_VALIDATE_ADMIN(role: string | undefined | null): boolean {
  return role === 'super_admin';
}

export function getCreatableAdminRoles(role: string | undefined | null): CreatableAdminRole[] {
  if (role === 'super_admin') {
    return ['admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain'];
  }
  if (role === 'admin_general') {
    return ['admin_national', 'gestionnaire_zone', 'operateur_terrain'];
  }
  return [];
}

export function isSuperAdminCreator(role: string | undefined | null): boolean {
  return role === 'super_admin';
}

export function labelCreatableAdminRole(role: CreatableAdminRole): string {
  switch (role) {
    case 'admin_general':
      return 'Administrateur général';
    case 'admin_national':
      return 'Administrateur national';
    case 'gestionnaire_zone':
      return 'Gestionnaire de zone';
    case 'operateur_terrain':
      return 'Analyste';
    default:
      return role;
  }
}
