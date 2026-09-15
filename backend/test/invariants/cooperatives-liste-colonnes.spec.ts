// Invariant — GET /cooperatives/liste et /cooperatives/ma-cooperative ne
// lisent que des colonnes qui existent VRAIMENT.
//
// Defaut repare : les deux endpoints lisaient marche, commune,
// responsable_nom, fonction et contact sur `cooperatives`, cinq colonnes qui
// n'ont jamais existe sur cette table, et triaient `cooperative_membres` par
// `created_at`, absente elle aussi. Postgres repondait "column does not
// exist" : 500 systematique sur toute base migree. Le menu "Rejoindre une
// cooperative" restait vide et le bouton inerte : aucune adhesion possible.
//
// Pourquoi un invariant et pas seulement un test unitaire : une requete SQL
// brute ne ment qu'a l'execution. Un test qui observe la chaine SQL prouve
// l'intention ; seule une VRAIE base prouve que les colonnes existent. C'est
// exactement la classe de defaut que le test unitaire ne peut pas attraper.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { User, UserRole, UserStatus } from '../../src/users/entities/user.entity';

describe('Invariant — cooperatives : colonnes reellement existantes', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let jeton: string;
  let marchandId: string;
  const api = () => request(app.getHttpServer());
  // La base jetable est PARTAGEE par les 32 suites d'invariants (maxWorkers 1,
  // aucune troncature entre suites). Tout ce que cette suite ecrit porte donc
  // un marqueur qui lui est propre : sans cela, un numero de telephone ou un
  // code de commune deja pris par une autre suite fait echouer la preparation
  // (contrainte d'unicite), et le test accuse le correctif a tort.
  const MARQUEUR = 'CLZ';
  const COOP = `COOP-${MARQUEUR}`;
  const COOP_FERMEE = `COOP-${MARQUEUR}-FERMEE`;
  const COMMUNE = `Daloa-${MARQUEUR}`;

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
    await app.get(DbInitService, { strict: false }).runInit();

    const repo = ds.getRepository(User);
    const responsable: any = await repo.save(repo.create({
      phone: "+2250700009731", firstName: 'Awa', lastName: 'Traore', genre: 'femme',
      role: UserRole.COOPERATEUR, status: UserStatus.ACTIF,
      passwordHash: await bcrypt.hash('1234', 10),
    } as any) as any);
    const marchande: any = await repo.save(repo.create({
      phone: "+2250700009732", firstName: 'Fatou', lastName: 'Kone', genre: 'femme',
      role: UserRole.MARCHAND, status: UserStatus.ACTIF,
      passwordHash: await bcrypt.hash('1234', 10),
    } as any) as any);
    marchandId = marchande.id;
    jeton = await jwt.signAsync(
      { sub: marchande.id, phone: marchande.phone, role: marchande.role },
      { secret: process.env.JWT_SECRET },
    );

    // Une commune REELLE. Le decoupage administratif est une chaine complete
    // (district -> region -> departement -> commune) avec des cles etrangeres :
    // un departement_id invente est refuse par la base. On monte donc la chaine.
    const district: any = (await ds.query(
      `INSERT INTO districts (nom, code) VALUES ($1, $2) RETURNING id`,
      [`Sassandra-${MARQUEUR}`, `SM-${MARQUEUR}`],
    ))[0];
    const region: any = (await ds.query(
      `INSERT INTO regions (nom, code, district_id) VALUES ($2, $3, $1) RETURNING id`,
      [district.id, `Haut-Sassandra-${MARQUEUR}`, `HS-${MARQUEUR}`],
    ))[0];
    const departement: any = (await ds.query(
      `INSERT INTO departements (nom, code, region_id) VALUES ($2, $3, $1) RETURNING id`,
      [region.id, `Daloa-${MARQUEUR}`, `DALD-${MARQUEUR}`],
    ))[0];
    const commune: any = (await ds.query(
      `INSERT INTO communes (nom, code, departement_id) VALUES ($3, $2, $1) RETURNING id`,
      [departement.id, `DAL-${MARQUEUR}`, COMMUNE],
    ))[0];
    await ds.query(
      `INSERT INTO cooperatives (nom, responsable_id, actif, commune_id)
       VALUES ($3, $1, true, $2)`,
      [responsable.id, commune.id, COOP],
    );
    // Une cooperative inactive : elle ne doit jamais apparaitre dans la liste.
    await ds.query(`INSERT INTO cooperatives (nom, actif) VALUES ($1, false)`, [COOP_FERMEE]);
  }, 90000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('GET /cooperatives/liste repond 200 (et non 500) sur une base migree', async () => {
    const r = await api().get('/api/v1/cooperatives/liste').set('Authorization', `Bearer ${jeton}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
  });

  it('remonte la commune et le responsable depuis les tables qui les portent', async () => {
    const r = await api().get('/api/v1/cooperatives/liste').set('Authorization', `Bearer ${jeton}`);
    const coop = r.body.find((c: any) => c.nom === COOP);
    expect(coop).toBeDefined();
    expect(coop.commune).toBe(COMMUNE);
    expect(coop.responsable_nom).toBe('Awa Traore');
  });

  it('conserve le contrat attendu par le front, sans inventer de donnee', async () => {
    const r = await api().get('/api/v1/cooperatives/liste').set('Authorization', `Bearer ${jeton}`);
    const coop = r.body.find((c: any) => c.nom === COOP);
    // Les cles existent toutes (CooperativeListeItem), mais celles sans source
    // dans le schema valent null plutot qu'une valeur inventee.
    for (const cle of ['id', 'nom', 'marche', 'commune', 'responsable_nom', 'fonction', 'contact']) {
      expect(Object.prototype.hasOwnProperty.call(coop, cle)).toBe(true);
    }
    expect(coop.marche).toBeNull();
    expect(coop.fonction).toBeNull();
    expect(coop.contact).toBeNull();
  });

  it('n’expose jamais une cooperative inactive', async () => {
    const r = await api().get('/api/v1/cooperatives/liste').set('Authorization', `Bearer ${jeton}`);
    expect(r.body.some((c: any) => c.nom === COOP_FERMEE)).toBe(false);
  });

  it('GET /cooperatives/ma-cooperative repond 200 apres une adhesion reelle', async () => {
    const coop: any = (await ds.query(`SELECT id FROM cooperatives WHERE nom = $1 LIMIT 1`, [COOP]))[0];
    await ds.query(
      `INSERT INTO cooperative_membres (cooperative_id, membre_id, statut, role, date_adhesion, actif)
       VALUES ($1, $2, 'actif', 'membre', '2026-09-01', true)`,
      [coop.id, marchandId],
    );

    const r = await api().get('/api/v1/cooperatives/ma-cooperative').set('Authorization', `Bearer ${jeton}`);
    // Avant le correctif : 500, car ORDER BY created_at sur cooperative_membres
    // (colonne absente) puis relecture des cinq colonnes fantomes.
    expect(r.status).toBe(200);
    expect(r.body.nom).toBe(COOP);
    expect(r.body.commune).toBe(COMMUNE);
    expect(r.body.responsable_nom).toBe('Awa Traore');
    expect(r.body.statut_membre).toBe('actif');
    expect(r.body.date_adhesion).toBe('2026-09-01');
  });
});
