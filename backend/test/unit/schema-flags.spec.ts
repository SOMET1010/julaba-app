import { computeBootDbFlags } from '../../src/database/schema-flags';

describe('computeBootDbFlags — décision des flags de schéma au boot', () => {
  it('base VIERGE : synchronize on, migrations off (quel que soit l’env)', () => {
    expect(computeBootDbFlags(true, {})).toEqual({ synchronize: 'true', migrationsRun: 'false' });
    expect(computeBootDbFlags(true, { DB_MIGRATIONS_RUN: 'true' } as any)).toEqual({
      synchronize: 'true',
      migrationsRun: 'false',
    });
  });

  it('base EXISTANTE : jamais de reconstruction, et RESPECTE DB_MIGRATIONS_RUN du dashboard', () => {
    expect(computeBootDbFlags(false, { DB_MIGRATIONS_RUN: 'true' } as any)).toEqual({
      synchronize: 'false',
      migrationsRun: 'true',
    });
    expect(computeBootDbFlags(false, { DB_MIGRATIONS_RUN: 'false' } as any)).toEqual({
      synchronize: 'false',
      migrationsRun: 'false',
    });
    // Défaut sûr : variable absente → migrations off.
    expect(computeBootDbFlags(false, {})).toEqual({ synchronize: 'false', migrationsRun: 'false' });
  });

  it('RÉGRESSION #19 : sur base existante, migrationsRun activé au dashboard ne doit JAMAIS être forcé à off', () => {
    // C'était le bug : prepareDatabase écrasait DB_MIGRATIONS_RUN='false' → aucune
    // migration ne s'appliquait en prod malgré l'activation #10.
    expect(computeBootDbFlags(false, { DB_MIGRATIONS_RUN: 'true' } as any).migrationsRun).toBe('true');
  });
});
