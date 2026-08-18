// Invariants « readiness pilote » — garde-fous posés par #175, verrouillés ici.
//
// R5 — Le seed de démonstration (mots de passe publiés dans le dépôt) est REFUSÉ
//      d'office quand NODE_ENV=production, sauf opt-in explicite SEED_DEMO="true".
// R4 — GET /caisse/transactions est PLAFONNÉ : 500 lignes par défaut, 1000 au
//      maximum, pagination par ?limit/?page. Un historique de plusieurs années ne
//      doit jamais revenir en entier sur un téléphone 3G.
//
// État attendu vs code actuel : 🟢 (verrouillage anti-régression).

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { SeedDemoService } from '../../src/database/seed-demo.service';

describe('R5 — seed de démo interdit en production sans opt-in (🟢 attendu)', () => {
  const sauve = { env: process.env.NODE_ENV, seed: process.env.SEED_DEMO };
  afterEach(() => {
    process.env.NODE_ENV = sauve.env;
    if (sauve.seed === undefined) delete process.env.SEED_DEMO;
    else process.env.SEED_DEMO = sauve.seed;
  });

  it('NODE_ENV=production sans SEED_DEMO ⇒ runSeed sort AVANT tout accès à la base', async () => {
    const acces: string[] = [];
    // DataSource « empoisonné » : le moindre accès à une propriété échoue le test.
    const poison = new Proxy({}, {
      get: (_t, prop) => {
        acces.push(String(prop));
        throw new Error(`runSeed a touché la base en production : ${String(prop)}`);
      },
    }) as unknown as DataSource;

    process.env.NODE_ENV = 'production';
    delete process.env.SEED_DEMO;
    await new SeedDemoService(poison).runSeed(); // ne doit PAS rejeter
    expect(acces).toEqual([]);

    // Même chose avec SEED_DEMO=false explicite.
    process.env.SEED_DEMO = 'false';
    await new SeedDemoService(poison).runSeed();
    expect(acces).toEqual([]);
  });

  it('NODE_ENV=production + SEED_DEMO="true" ⇒ le seed reprend (opt-in assumé)', async () => {
    const appels: string[] = [];
    // Stub minimal : le contrôle « seed déjà présent » trouve une ligne et le
    // service s'arrête là — preuve qu'il a bien passé la garde de production.
    const stub = { query: async () => { appels.push('query'); return [{ ok: 1 }]; } } as unknown as DataSource;

    process.env.NODE_ENV = 'production';
    process.env.SEED_DEMO = 'true';
    await new SeedDemoService(stub).runSeed();
    expect(appels).toContain('query');
  });
});

describe('R4 — GET /caisse/transactions plafonné et paginé (🟢 attendu)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let token: string;
  let marchandId: string;

  const PHONE = '+2250700000031';
  const TOTAL = 1010; // > plafond maximal (1000) pour prouver la borne haute

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    await app.get(DbInitService, { strict: false }).runInit();

    const su = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({ phone: PHONE, firstName: 'Adjoua', lastName: 'Test', role: 'marchand', genre: 'femme' });
    expect([200, 201]).toContain(su.status);
    token = su.body.accessToken;
    marchandId = su.body.user.id;
    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: '0000', newPassword: '1234' });

    // 1010 transactions horodatées en escalier : B4-1 est la plus récente.
    await ds.query(
      `INSERT INTO caisse_transactions (user_id, marchand_id, type, montant, description, created_at)
       SELECT $1, $1, 'vente', 100, 'B4-' || g, NOW() - (g || ' seconds')::interval
       FROM generate_series(1, ${TOTAL}) g`,
      [marchandId],
    );
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
  });

  const lister = (qs = '') =>
    request(app.getHttpServer())
      .get(`/api/v1/caisse/transactions${qs}`)
      .set('Authorization', `Bearer ${token}`);

  it('sans paramètre ⇒ 500 lignes (défaut), les plus récentes d’abord', async () => {
    const r = await lister();
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
    expect(r.body.length).toBe(500);
    expect(r.body[0].description).toBe('B4-1');
  });

  it('?limit démesuré ⇒ borné à 1000, jamais l’historique entier', async () => {
    const r = await lister('?limit=999999');
    expect(r.status).toBe(200);
    expect(r.body.length).toBe(1000);
  });

  it('?limit/?page paginent dans l’ordre chronologique inverse', async () => {
    const r = await lister('?limit=2&page=2');
    expect(r.status).toBe(200);
    expect(r.body.map((t: any) => t.description)).toEqual(['B4-3', 'B4-4']);
  });

  it('valeurs absurdes (limit négatif) ⇒ au moins une ligne, jamais d’erreur', async () => {
    const r = await lister('?limit=-5');
    expect(r.status).toBe(200);
    expect(r.body.length).toBe(1);
    expect(r.body[0].description).toBe('B4-1');
  });
});
