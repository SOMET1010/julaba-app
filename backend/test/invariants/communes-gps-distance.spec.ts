// Invariant — GPS communes + distance producteur<->grossiste (recoltes-prevues).
//
// Audit deploiement (19/08/2026) : la migration qui ajoute communes.latitude/
// longitude et cooperatives.commune_id vivait dans migrations/_archive/, hors
// du glob de migration actif -> jamais executee. Sur une base VIERGE (nouvel
// environnement), le schema est construit par `synchronize` depuis les
// entites Commune/Cooperative, qui NE declarent PAS ces colonnes (design
// volontaire) : GET /producteurs/recoltes-prevues (haversineKm) plantait donc
// en SQL ("column does not exist") sur tout deploiement neuf.
//
// Ce test reconstruit un schema EXACTEMENT comme le ferait un environnement
// neuf (synchronize depuis les entites, cf. env.ts : DB_SYNCHRONIZE=true,
// migrations jamais executees), applique DbInitService.runInit() (seul
// mecanisme garanti de tourner inconditionnellement au boot), puis verifie :
//  - les colonnes existent et portent les VRAIES coordonnees WGS84 (pas
//    inventees, recopiees de l'ex-migration archivee) ;
//  - le calcul de distance bout-en-bout (endpoint HTTP reel, haversineKm())
//    fonctionne et trie par proximite.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { AdminDivisionsSeedService } from '../../src/admin-divisions/seed/admin-divisions-seed.service';
import { User, UserRole, UserStatus } from '../../src/users/entities/user.entity';
import { SousProfilMarchand } from '../../src/users/entities/sous-profil-marchand.enum';

// Haversine independante (pas d'appel a la methode privee du controleur) :
// sert d'oracle pour verifier la valeur renvoyee par l'API.
function haversineKmOracle(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

describe('Invariant — GPS communes (schema neuf) + distance recoltes-prevues', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ThrottlerStorage)
      .useValue({
        increment: async () => ({ totalHits: 1, timeToExpire: 60000, isBlocked: false, timeToBlockExpire: 0 }),
      })
      .compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    jwt = app.get(JwtService);

    // Ordre identique a main.ts (bootstrap) : seed des divisions admin (cree
    // les 13 communes d'Abidjan depuis les entites), PUIS DbInit (patchs
    // idempotents, dont le mirroir GPS communes).
    await app.get(AdminDivisionsSeedService, { strict: false }).runSeed();
    await app.get(DbInitService, { strict: false }).runInit();
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('communes.latitude/longitude et cooperatives.commune_id existent sur un schema reconstruit depuis zero', async () => {
    const cols = await ds.query(`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = 'public'
        AND (
          (table_name = 'communes' AND column_name IN ('latitude', 'longitude'))
          OR (table_name = 'cooperatives' AND column_name = 'commune_id')
        )
      ORDER BY table_name, column_name
    `);
    const found = cols.map((r: any) => `${r.table_name}.${r.column_name}`);
    expect(found).toEqual([
      'communes.latitude',
      'communes.longitude',
      'cooperatives.commune_id',
    ]);
  });

  it('la FK cooperatives.commune_id -> communes(id) est posee (idempotente)', async () => {
    const rows = await ds.query(
      `SELECT 1 FROM pg_constraint WHERE conname = 'fk_cooperatives_commune'`,
    );
    expect(rows.length).toBe(1);
  });

  it('les coordonnees seedees sont les vraies valeurs WGS84 (pas inventees)', async () => {
    // Abobo et Yopougon : deux des 13 communes d'Abidjan effectivement seedees
    // par AdminDivisionsSeedService sur un environnement neuf.
    const rows = await ds.query(
      `SELECT code, latitude, longitude FROM communes WHERE code IN ('ABJ-ABO', 'ABJ-YOP') ORDER BY code`,
    );
    expect(rows).toEqual([
      { code: 'ABJ-ABO', latitude: 5.4304, longitude: -4.0159 },
      { code: 'ABJ-YOP', latitude: 5.3372, longitude: -4.0758 },
    ]);
  });

  it('re-executer DbInit.runInit() est un no-op sans erreur (idempotence)', async () => {
    await expect(
      app.get(DbInitService, { strict: false }).runInit(),
    ).resolves.not.toThrow();
    const rows = await ds.query(
      `SELECT latitude, longitude FROM communes WHERE code = 'ABJ-ABO'`,
    );
    expect(rows[0]).toEqual({ latitude: 5.4304, longitude: -4.0159 });
  });

  it('GET /producteurs/recoltes-prevues calcule et trie par distance Haversine reelle', async () => {
    const communes = await ds.query(
      `SELECT id, code, latitude, longitude FROM communes WHERE code IN ('ABJ-ABO', 'ABJ-YOP', 'ABJ-COC') ORDER BY code`,
    );
    const abo = communes.find((c: any) => c.code === 'ABJ-ABO');
    const yop = communes.find((c: any) => c.code === 'ABJ-YOP');
    const coc = communes.find((c: any) => c.code === 'ABJ-COC');

    // Grossiste rattache (via cooperative) a la commune ABJ-ABO.
    const userRepo = ds.getRepository(User);
    const grossiste: any = await userRepo.save(
      userRepo.create({
        phone: '+2250700050001',
        firstName: 'Grossiste',
        lastName: 'GPS',
        genre: 'homme',
        role: UserRole.MARCHAND,
        sousProfilMarchand: SousProfilMarchand.GROSSISTE,
        status: UserStatus.ACTIF,
        passwordHash: await bcrypt.hash('1234', 10),
      } as any),
    );
    const grossisteToken = await jwt.signAsync(
      { sub: grossiste.id, phone: grossiste.phone, role: grossiste.role },
      { secret: process.env.JWT_SECRET },
    );

    const coopRows = await ds.query(
      `INSERT INTO cooperatives (nom, commune_id, actif) VALUES ($1, $2, true) RETURNING id`,
      ['Cooperative GPS Test', abo.id],
    );
    const coopId = coopRows[0].id;
    await ds.query(
      `INSERT INTO cooperative_membres (cooperative_id, membre_id, statut, role, actif)
       VALUES ($1, $2, 'actif', 'membre', true)`,
      [coopId, grossiste.id],
    );

    // Deux producteurs : un proche (meme commune que la cooperative, ABJ-ABO),
    // un plus loin (ABJ-YOP). Cycle actif avec recolte estimee future.
    const prodProche: any = await userRepo.save(
      userRepo.create({
        phone: '+2250700050002', firstName: 'Prod', lastName: 'Proche', genre: 'femme',
        role: UserRole.PRODUCTEUR, status: UserStatus.ACTIF,
        passwordHash: await bcrypt.hash('1234', 10),
      } as any),
    );
    await ds.query(`UPDATE users SET commune_id = $1 WHERE id = $2`, [abo.id, prodProche.id]);

    const prodLoin: any = await userRepo.save(
      userRepo.create({
        phone: '+2250700050003', firstName: 'Prod', lastName: 'Loin', genre: 'homme',
        role: UserRole.PRODUCTEUR, status: UserStatus.ACTIF,
        passwordHash: await bcrypt.hash('1234', 10),
      } as any),
    );
    await ds.query(`UPDATE users SET commune_id = $1 WHERE id = $2`, [yop.id, prodLoin.id]);

    const prodSansCommune: any = await userRepo.save(
      userRepo.create({
        phone: '+2250700050004', firstName: 'Prod', lastName: 'SansCommune', genre: 'femme',
        role: UserRole.PRODUCTEUR, status: UserStatus.ACTIF,
        passwordHash: await bcrypt.hash('1234', 10),
      } as any),
    );

    for (const [prod, culture] of [
      [prodProche, 'MangueGPSProche'],
      [prodLoin, 'MangueGPSLoin'],
      [prodSansCommune, 'MangueGPSSansCommune'],
    ] as const) {
      await ds.query(
        `INSERT INTO cycles (user_id, culture, surface, date_plantation, date_recolte_estimee, quantite_estimee, status)
         VALUES ($1, $2, 1, CURRENT_DATE, CURRENT_DATE + INTERVAL '10 days', 100, 'active')`,
        [prod.id, culture],
      );
    }

    const res = await api()
      .get('/api/v1/producteurs/recoltes-prevues')
      .set('Authorization', `Bearer ${grossisteToken}`);

    expect(res.status).toBe(200);
    expect(res.body.cooperative.commune).toBe('Abobo');

    const parCulture = new Map(res.body.recoltes.map((r: any) => [r.culture, r]));
    const rProche = parCulture.get('MangueGPSProche') as any;
    const rLoin = parCulture.get('MangueGPSLoin') as any;
    const rSans = parCulture.get('MangueGPSSansCommune') as any;

    // Meme commune que la cooperative -> distance 0.
    expect(rProche.distanceKm).toBe(0);
    // Distance reelle Haversine ABJ-ABO <-> ABJ-YOP, calculee independamment.
    const attendu = haversineKmOracle(
      Number(abo.latitude), Number(abo.longitude),
      Number(yop.latitude), Number(yop.longitude),
    );
    expect(rLoin.distanceKm).toBe(attendu);
    expect(attendu).toBeGreaterThan(0);
    // Producteur sans commune resolue -> distance null.
    expect(rSans.distanceKm).toBeNull();

    // Tri croissant : le plus proche (0) avant le plus loin ; le null (sans
    // commune) relegue en fin de liste.
    const distances = res.body.recoltes.map((r: any) => r.distanceKm);
    const idxProche = distances.indexOf(rProche.distanceKm);
    const idxLoin = distances.indexOf(rLoin.distanceKm);
    const idxSans = distances.indexOf(null);
    expect(idxProche).toBeLessThan(idxLoin);
    expect(idxSans).toBe(distances.length - 1);

    // Verification croisee : la commune ABJ-COC (non utilisee ici) porte bien
    // sa propre coordonnee distincte -> confirme que les 41 lignes du seed ne
    // se chevauchent pas / n'ecrasent pas les autres communes.
    expect(Number(coc.latitude)).toBeCloseTo(5.35, 2);
    expect(Number(coc.longitude)).toBeCloseTo(-3.9833, 3);
  });
});
