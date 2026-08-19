/**
 * Champs d'authentification sensibles de l'entité User (hash de mot de passe,
 * hash / chiffré de code PIN, credentials WebAuthn, challenge WebAuthn en
 * cours) — ne doivent JAMAIS être sérialisés dans une réponse API, même pour
 * un compte tiers consulté par un rôle privilégié : un hash exposé côté
 * client est attaquable hors ligne (brute-force). Cf. `User` entity
 * (`backend/src/users/entities/user.entity.ts`) pour la liste des colonnes
 * `@Exclude()`.
 */
export const SENSITIVE_USER_AUTH_FIELDS = [
  'passwordHash',
  'pinCodeHash',
  'pinCodeEncryptedIdentificateur',
  'webauthnCredentials',
  'webauthnChallenge',
] as const;

export type SensitiveUserAuthField = (typeof SENSITIVE_USER_AUTH_FIELDS)[number];

/**
 * Retourne une copie superficielle de `user` (ou de tout objet dérivé d'un
 * `User`, ex. un résultat de requête brute) débarrassée des champs
 * d'authentification sensibles. À utiliser systématiquement avant d'étaler
 * (`{ ...user }`) ou de retourner directement une entité `User` dans une
 * réponse HTTP.
 */
export function stripSensitiveUserFields<T extends Record<string, any>>(
  user: T,
): Omit<T, SensitiveUserAuthField> {
  const clone: any = { ...user };
  for (const field of SENSITIVE_USER_AUTH_FIELDS) {
    delete clone[field];
  }
  return clone;
}
