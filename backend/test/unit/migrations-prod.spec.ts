/**
 * L'API doit pouvoir REDÉMARRER. C'est tout ce que ce fichier protège.
 *
 * L'INCIDENT DU 18/09/2026. Une synchronisation Blueprint a poussé
 * `DB_MIGRATIONS_RUN=true` vers le service. L'API est morte au démarrage sur
 * `type "caisse_transaction_status_enum" already exists`, a réessayé dix fois,
 * puis s'est éteinte. Elle n'a survécu que parce que Render garde l'instance
 * précédente quand un déploiement échoue — autrement dit : elle tournait, mais
 * elle ne pouvait plus redémarrer. Pour une marchande, une API qui ne redémarre
 * pas, c'est une caisse qui disparaît au premier incident.
 *
 * LA CAUSE, et elle est structurelle. Sur une base VIERGE, le boot construit le
 * schéma depuis les entités (`synchronize`) et n'enregistre AUCUNE migration :
 * la table `migrations` reste vide. Au démarrage suivant la base n'est plus
 * vierge, TypeORM croit donc la baseline « en attente », et la rejoue sur un
 * schéma qui existe déjà. Le schéma est là, son ENREGISTREMENT ne l'est pas :
 * la chaîne de migrations ne sait pas adopter une base qu'elle n'a pas créée.
 *
 * Ces deux tests sont LIÉS À DESSEIN. Le second dit pourquoi le premier existe :
 * tant que la baseline ne sait pas adopter un schéma existant, remettre le
 * drapeau à "true" casse la production. Le jour où quelqu'un la rend adoptable,
 * le second test échouera — c'est voulu : c'est le signal qu'on peut rouvrir la
 * question, en connaissance de cause, au lieu de basculer un drapeau à l'aveugle.
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { computeBootDbFlags } from '../../src/database/schema-flags';

const lire = (...p: string[]) => readFileSync(join(__dirname, '../..', ...p), 'utf8');

describe('La production doit pouvoir redémarrer', () => {
  it('le Blueprint ne réactive pas les migrations au démarrage', () => {
    const rendu = lire('..', 'render.yaml');
    const bloc = rendu.slice(rendu.indexOf('key: DB_MIGRATIONS_RUN'));
    const valeur = /value:\s*"(\w+)"/.exec(bloc.split('\n').slice(0, 3).join('\n'));
    expect(valeur?.[1]).toBe('false');
  });

  it('la baseline ne sait toujours PAS adopter un schéma existant', () => {
    // Si ce test passe au rouge, c'est probablement une bonne nouvelle : lis le
    // commentaire en tête de fichier avant de le « corriger ».
    const baseline = lire('src', 'database', 'migrations', '1780200000000-BaselineSchema.ts');
    const creations = baseline.match(/CREATE TYPE /g) ?? [];
    const protegees = baseline.match(/CREATE TYPE IF NOT EXISTS |to_regclass|duplicate_object/g) ?? [];
    expect(creations.length).toBeGreaterThan(0);
    expect(protegees.length).toBe(0);
  });

  it('c’est bien ce drapeau qui décide, sur une base existante', () => {
    // La preuve que le réglage du Blueprint n'est pas décoratif : à "true", les
    // migrations tournent — et c'est exactement ce qui a tué le démarrage.
    expect(computeBootDbFlags(false, { DB_MIGRATIONS_RUN: 'true' } as NodeJS.ProcessEnv))
      .toEqual({ synchronize: 'false', migrationsRun: 'true' });
    expect(computeBootDbFlags(false, { DB_MIGRATIONS_RUN: 'false' } as NodeJS.ProcessEnv))
      .toEqual({ synchronize: 'false', migrationsRun: 'false' });
  });

  it('une base VIERGE n’enregistre aucune migration — la racine du défaut', () => {
    expect(computeBootDbFlags(true, { DB_MIGRATIONS_RUN: 'true' } as NodeJS.ProcessEnv))
      .toEqual({ synchronize: 'true', migrationsRun: 'false' });
  });
});
