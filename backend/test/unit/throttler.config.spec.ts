import {
  buildThrottlers,
  THROTTLE_DEFAULT_LIMIT,
  THROTTLE_DISABLED_LIMIT,
  THROTTLE_WINDOW_MS,
} from '../../src/config/throttler.config';

describe('buildThrottlers — un seul throttler `default` (cf. AUDIT_THROTTLING.md)', () => {
  it('PROD : un unique throttler généreux, fenêtre 60 s', () => {
    const t = buildThrottlers({});
    expect(t).toHaveLength(1); // pas de throttlers nommés auth/voice/recovery
    expect(t[0]).toEqual({ ttl: THROTTLE_WINDOW_MS, limit: THROTTLE_DEFAULT_LIMIT });
    expect(t[0].limit).toBe(300);
  });

  it('RÉGRESSION : jamais de limite à 5 qui plafonnerait toute l’API', () => {
    // Le bug audité : auth/recovery=5 nommés s’appliquaient à chaque route.
    expect(buildThrottlers({})[0].limit).toBeGreaterThanOrEqual(300);
  });

  it('RECETTE/E2E : THROTTLE_DISABLED=true rend la limite non contraignante', () => {
    expect(buildThrottlers({ THROTTLE_DISABLED: 'true' } as any)[0].limit).toBe(THROTTLE_DISABLED_LIMIT);
  });

  it('PROD ne définit jamais le flag : toute autre valeur → limite normale', () => {
    expect(buildThrottlers({ THROTTLE_DISABLED: 'false' } as any)[0].limit).toBe(THROTTLE_DEFAULT_LIMIT);
    expect(buildThrottlers({ THROTTLE_DISABLED: '1' } as any)[0].limit).toBe(THROTTLE_DEFAULT_LIMIT);
  });
});
