// ──────────────────────────────────────────────────────────────────────────
// challenge-usernameless.ts — LE CHALLENGE QUI NE SAIT PAS ENCORE QUI.
//
// En connexion WebAuthn « par numéro », le challenge vit sur la ligne de
// l'utilisateur (user.webauthnChallenge) : on sait qui demande à se connecter.
// En connexion USERNAMELESS (SPEC-AUTH-CIBLE §2.1 — allowCredentials vide,
// l'authentificateur propose sa clé découvrable), on ne sait PAS encore qui :
// le userHandle n'arrivera qu'avec l'assertion. Le challenge doit donc vivre
// AILLEURS — ici, un registre mémoire à TTL court, à USAGE UNIQUE.
//
// Pourquoi un TTL : un challenge WebAuthn protège contre le rejeu. S'il peut
// être posé sans identifiant, il doit mourir vite (3 minutes, le temps d'un
// doigt posé) et ne servir QU'UNE FOIS. Une réinstallation du serveur vide le
// registre : la personne retape son geste, c'est tout — aucun état persistant
// ne dépend de lui.
//
// Volume : un challenge ≈ 43 caractères, posé une fois par tentative de
// connexion, purgé au passage — la carte reste de l'ordre des tentatives
// vivantes, rien de plus.
// ──────────────────────────────────────────────────────────────────────────

/** Durée de vie d'un challenge posé sans identifiant (3 minutes). */
export const TTL_CHALLENGE_SANS_IDENTIFIANT_MS = 3 * 60 * 1000;

const registre = new Map<string, number>();

/** Pose un challenge en attente d'assertion (remplace tout usage précédent). */
export function enregistrerChallengeSansIdentifiant(
  challenge: string,
  maintenant: number = Date.now(),
): void {
  purger(maintenant);
  registre.set(challenge, maintenant + TTL_CHALLENGE_SANS_IDENTIFIANT_MS);
}

/**
 * Vérifie PUIS CONSOME le challenge porté par l'assertion : usage unique.
 * Rend false si inconnu, expiré, ou déjà consommé — un rejeu ne passe pas.
 */
export function consommerChallengeSansIdentifiant(
  challenge: unknown,
  maintenant: number = Date.now(),
): boolean {
  purger(maintenant);
  if (typeof challenge !== 'string' || challenge.length === 0) return false;
  const expire = registre.get(challenge);
  if (expire === undefined || expire <= maintenant) return false;
  registre.delete(challenge);
  return true;
}

/** Nombre de challenges vivants (diagnostic/test). */
export function challengesVivants(): number {
  return registre.size;
}

function purger(maintenant: number): void {
  for (const [challenge, expire] of registre) {
    if (expire <= maintenant) registre.delete(challenge);
  }
}
