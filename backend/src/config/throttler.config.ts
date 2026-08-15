import { ThrottlerOptions } from '@nestjs/throttler';

/**
 * Configuration du rate-limiting — UN SEUL throttler `default` généreux.
 *
 * Voir docs/AUDIT_THROTTLING.md. Les throttlers NOMMÉS de @nestjs/throttler ne
 * sont pas opt-in : chacun s'applique à CHAQUE route. Avec `auth`/`recovery` à 5,
 * toute l'API se retrouvait plafonnée à 5 req/min/endpoint. On inverse le modèle :
 * un unique `default` large, puis des surcharges STRICTES ciblées via `@Throttle`
 * là où c'est un enjeu de sécurité (login, signup, recovery, voix).
 *
 * `THROTTLE_DISABLED=true` (recette / e2e uniquement) rend la limite non
 * contraignante — équivalent booté de la neutralisation du ThrottlerStorage côté
 * jest. La prod ne définit jamais ce flag : limite = 300/min/endpoint/IP.
 */
export const THROTTLE_WINDOW_MS = 60_000;
export const THROTTLE_DEFAULT_LIMIT = 300;
export const THROTTLE_DISABLED_LIMIT = 1_000_000;

export function buildThrottlers(env: NodeJS.ProcessEnv = process.env): ThrottlerOptions[] {
  const disabled = env.THROTTLE_DISABLED === 'true';
  return [
    { ttl: THROTTLE_WINDOW_MS, limit: disabled ? THROTTLE_DISABLED_LIMIT : THROTTLE_DEFAULT_LIMIT },
  ];
}
