// Autorisation SERVEUR du back-office (lot BO-0, décision J6 du 03/10/2026).
//
// J6 : les permissions du back-office sont une vraie autorisation côté
// serveur. BO-0 l'applique aux routes qu'il touche (PATCH /users/:id,
// DELETE /users/:id, PATCH /acteurs/:id, /admin/wallets/:id/bloquer|debloquer) ;
// la généralisation à tout le back-office relève des lots suivants (BO-3).
//
// Résolution d'une permission : copie EXACTE de `hasPermission` du front
// (frontend_src/src/app/contexts/BackOfficeContext.tsx) pour que l'écran et le
// serveur disent la même chose :
//   1. super_admin : toujours vrai ;
//   2. sinon, si le compte porte un objet `boPermissions`, il fait seul foi ;
//   3. sinon, le défaut de son rôle (DEFAUTS_PAR_ROLE ci-dessous, recopié de
//      BO_SCREEN_PERMISSIONS — à garder synchronisé jusqu'à BO-3).
//
// Hiérarchie : seul le super_admin gère les comptes du back-office. Aucun autre
// rôle ne modifie, ne suspend, ne promeut ni ne supprime un compte BO (pair,
// supérieur ou inférieur), et nul hors super_admin n'écrit de permissions.

import { ForbiddenException } from '@nestjs/common';

export const ROLES_BO = ['super_admin', 'admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain'] as const;

const DEFAUTS_PAR_ROLE: Record<string, readonly string[]> = {
  admin_general: ['acteurs.read', 'acteurs.write', 'acteurs.delete', 'acteurs.suspend', 'enrolement.read', 'enrolement.write', 'enrolement.validate', 'supervision.read', 'supervision.write', 'supervision.freeze', 'zones.read', 'zones.write', 'missions.read', 'missions.write', 'mutations.read', 'mutations.write', 'moderation.read', 'moderation.write', 'audit.read', 'utilisateurs.read', 'utilisateurs.write', 'utilisateurs.delete', 'parametres.read', 'parametres.write', 'academy.read', 'academy.write'],
  admin_national: ['acteurs.read', 'acteurs.write', 'acteurs.suspend', 'enrolement.read', 'enrolement.write', 'enrolement.validate', 'supervision.read', 'supervision.write', 'supervision.freeze', 'zones.read', 'zones.write', 'missions.read', 'missions.write', 'mutations.read', 'mutations.write', 'moderation.read', 'moderation.write', 'audit.read', 'utilisateurs.read', 'parametres.read', 'academy.read'],
  gestionnaire_zone: ['acteurs.read', 'acteurs.write', 'enrolement.read', 'enrolement.validate', 'supervision.read', 'zones.read', 'missions.read', 'mutations.read', 'mutations.write', 'moderation.read', 'moderation.write', 'audit.read', 'academy.read'],
  operateur_terrain: ['acteurs.read', 'acteurs.write', 'acteurs.suspend', 'enrolement.read', 'enrolement.validate', 'supervision.read', 'supervision.write', 'supervision.freeze', 'zones.read', 'missions.read', 'mutations.read', 'mutations.write', 'moderation.read', 'moderation.write', 'audit.read', 'academy.read'],
};

interface CompteAutorise {
  id?: string;
  role?: string | null;
  boPermissions?: Record<string, boolean> | null;
}

export function estRoleBO(role: string | null | undefined): boolean {
  return !!role && (ROLES_BO as readonly string[]).includes(role);
}

export function estSuperAdmin(c: CompteAutorise | null | undefined): boolean {
  return c?.role === 'super_admin';
}

/** Même règle que `hasPermission` du front (voir l'en-tête). */
export function aPermissionBO(c: CompteAutorise | null | undefined, cle: string): boolean {
  if (!c) return false;
  if (estSuperAdmin(c)) return true;
  if (c.boPermissions && typeof c.boPermissions === 'object') {
    return c.boPermissions[cle] === true;
  }
  return DEFAUTS_PAR_ROLE[c.role ?? '']?.includes(cle) ?? false;
}

export function exigerPermissionBO(c: CompteAutorise | null | undefined, cle: string): void {
  if (!aPermissionBO(c, cle)) {
    throw new ForbiddenException(`Permission requise : ${cle}`);
  }
}

/**
 * Un acteur peut-il agir sur la cible ? Le super_admin gère tout le monde.
 * Les autres rôles ne touchent jamais un compte du back-office (pair,
 * supérieur ou inférieur) : « seul le super_admin gère les admins ».
 */
export function exigerAutoriteSur(acteur: CompteAutorise, cible: CompteAutorise): void {
  if (estSuperAdmin(acteur)) return;
  if (estRoleBO(cible.role)) {
    throw new ForbiddenException('Seul le super_admin gère les comptes du back-office');
  }
}

/** Champs qu'aucun rôle hors super_admin ne peut écrire, même sur lui-même. */
export const CHAMPS_RESERVES_SUPER_ADMIN = ['role', 'status', 'boPermissions', 'validated'] as const;

/** Champs d'authentification qu'aucune route de profil n'écrit jamais. */
export const CHAMPS_AUTHENTIFICATION = [
  'passwordHash', 'pinCodeHash', 'pinCodeEncryptedIdentificateur', 'mustChangePassword',
  'webauthnCredentials', 'webauthnChallenge',
] as const;
