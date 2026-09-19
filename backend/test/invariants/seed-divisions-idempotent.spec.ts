// SEED-01 — UN SEUL DISTRICT NE DOIT PAS EMPÊCHER LE SEED DES COMMUNES.
//
// CE QUI ÉTAIT FAUX. `AdminDivisionsSeedService.runSeed()` gardait toute la
// cascade derrière une seule condition :
//
//     if (districtCount === 0) { …districts, régions, départements, communes… }
//
// « La table districts n'est pas vide » y tenait lieu de « tout le découpage
// administratif est en place ». Deux sens pour une même donnée — exactement ce
// qu'on s'interdit ailleurs. Un district créé à la main, ou un premier
// démarrage interrompu après le premier INSERT, et les 13 communes d'Abidjan
// ne sont JAMAIS posées. `GET /producteurs/recoltes-prevues` perd alors
// silencieusement ses données, sans la moindre erreur.
//
// COMMENT ON L'A TROUVÉ. Pas par lecture : par trois échecs qui revenaient une
// exécution complète sur trois, et qu'on avait faute de mieux laissés en
// « observation non résolue » au registre. `cooperatives-liste-colonnes`
// insère un district et ne le retire pas ; selon l'ordre où Jest place les
// fichiers, `communes-gps-distance` trouvait ou non ses communes. Ce n'était
// pas une instabilité de test : c'était ce défaut-là, visible depuis le dépôt.
//
// CE TEST LE REPRODUIT SANS DÉPENDRE DE L'ORDRE DES FICHIERS : il pose
// lui-même le district parasite, puis exige que le seed fasse quand même son
// travail.

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { AdminDivisionsSeedService } from '../../src/admin-divisions/seed/admin-divisions-seed.service';
import {
  DISTRICTS_SEED,
  COMMUNES_ABIDJAN_SEED,
} from '../../src/admin-divisions/seed/admin-divisions.seed';

const MARQUEUR = 'SEED01';

describe('SEED-01 — le seed du découpage administratif est idempotent niveau par niveau', () => {
  let app: INestApplication;
  let ds: DataSource;
  let seed: AdminDivisionsSeedService;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    ds = app.get(DataSource);
    seed = app.get(AdminDivisionsSeedService, { strict: false });
    await app.get(DbInitService, { strict: false }).runInit();
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('un district étranger au seed ne bloque plus la cascade', async () => {
    // On remet la base dans l'état exact qui produisait le défaut : un district
    // présent, qui n'appartient PAS au jeu de seed, et aucune commune d'Abidjan.
    await ds.query(
      `DELETE FROM communes WHERE code = ANY($1)`,
      [COMMUNES_ABIDJAN_SEED.map((c) => c.code)],
    );
    await ds.query(
      `INSERT INTO districts (nom, code) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [`District parasite ${MARQUEUR}`, `DP-${MARQUEUR}`],
    );
    const [{ n: districtsAvant }] = await ds.query('SELECT count(*)::int n FROM districts');
    expect(Number(districtsAvant)).toBeGreaterThan(0); // la garde fautive se déclenchait ici

    await seed.runSeed();

    const codes = COMMUNES_ABIDJAN_SEED.map((c) => c.code);
    const [{ n }] = await ds.query(
      'SELECT count(*)::int n FROM communes WHERE code = ANY($1)', [codes],
    );
    expect(Number(n)).toBe(codes.length);
  }, 60000);

  it('rejouer le seed n’écrit rien en double', async () => {
    const compter = async () => {
      const [d] = await ds.query('SELECT count(*)::int n FROM districts');
      const [r] = await ds.query('SELECT count(*)::int n FROM regions');
      const [dp] = await ds.query('SELECT count(*)::int n FROM departements');
      const [c] = await ds.query('SELECT count(*)::int n FROM communes');
      return [d.n, r.n, dp.n, c.n].map(Number);
    };
    const avant = await compter();
    await seed.runSeed();
    await seed.runSeed();
    expect(await compter()).toEqual(avant);
  }, 60000);

  it('un niveau intermédiaire amputé est reconstruit, pas ignoré', async () => {
    // Le cas d'un démarrage interrompu : les districts sont là, les communes
    // ont disparu. La garde d'avant voyait « districts non vide » et s'arrêtait.
    await ds.query(
      `DELETE FROM communes WHERE code = ANY($1)`,
      [COMMUNES_ABIDJAN_SEED.map((c) => c.code)],
    );
    await seed.runSeed();
    const [{ n }] = await ds.query(
      'SELECT count(*)::int n FROM communes WHERE code = ANY($1)',
      [COMMUNES_ABIDJAN_SEED.map((c) => c.code)],
    );
    expect(Number(n)).toBe(COMMUNES_ABIDJAN_SEED.length);
  }, 60000);

  it('les districts du seed sont tous présents, parasite ou non', async () => {
    const [{ n }] = await ds.query(
      'SELECT count(*)::int n FROM districts WHERE code = ANY($1)',
      [DISTRICTS_SEED.map((d) => d.code)],
    );
    expect(Number(n)).toBe(DISTRICTS_SEED.length);
  });
});
