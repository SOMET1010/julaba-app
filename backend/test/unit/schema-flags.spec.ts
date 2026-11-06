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

  it('GARDE 06/11/2026 : historique NON amorcé (pas de table migrations) → DB_MIGRATIONS_RUN=true est IGNORÉ', () => {
    // Incident 18/09/2026 : sans la table `migrations`, TypeORM rejoue la baseline
    // sur le schéma existant → uuid-ossp refusée (Azure) puis « already exists »,
    // boot mort. La base Azure alignée en SQL direct le 06/11 est exactement dans
    // ce cas : un drapeau resté à true n'y doit PAS tuer le démarrage.
    expect(computeBootDbFlags(false, { DB_MIGRATIONS_RUN: 'true' } as any, false)).toEqual({
      synchronize: 'false',
      migrationsRun: 'false',
    });
  });

  it('GARDE 06/11/2026 : historique amorcé → le drapeau reste respecté (aucune régression #19)', () => {
    expect(computeBootDbFlags(false, { DB_MIGRATIONS_RUN: 'true' } as any, true)).toEqual({
      synchronize: 'false',
      migrationsRun: 'true',
    });
    // Défaut rétro-compatible : sans sonde, on suppose l'historique amorcé.
    expect(computeBootDbFlags(false, { DB_MIGRATIONS_RUN: 'true' } as any).migrationsRun).toBe('true');
  });
});
