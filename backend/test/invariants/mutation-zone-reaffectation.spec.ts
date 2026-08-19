// Invariant — Mutation de zone d'un identificateur : l'approbation doit
// RÉELLEMENT réaffecter users.zone_id.
//
// Avant correctif : POST /mutations créait la demande et
// PATCH /mutations/:id/decision faisait bien un UPDATE mutations.statut,
// mais l'approbation ne touchait JAMAIS users.zone_id — elle ne faisait
// qu'une insertion "best effort" dans `missions`, dans un try/catch qui
// avalait silencieusement toute erreur. Un identificateur dont la mutation
// était "acceptée" restait donc, en base, affecté à son ancienne zone.
//
// PROPRIÉTÉ VÉRIFIÉE :
//   1) Une mutation approuvée réaffecte réellement users.zone_id vers la
//      zone demandée (pas seulement mutations.statut).
//   2) Une mutation rejetée NE modifie PAS users.zone_id.
//   3) Une décision sur une mutation déjà tranchée est refusée (pas de
//      double traitement / pas de deuxième écriture).

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

describe('Invariant — mutation de zone : approbation réaffecte réellement users.zone_id', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    // On neutralise le throttler : ce lot teste l'effet métier de la
    // décision, pas la limitation de débit.
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ThrottlerStorage)
      .useValue({
        increment: async () => ({
          totalHits: 1,
          timeToExpire: 60000,
          isBlocked: false,
          timeToBlockExpire: 0,
        }),
      })
      .compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    jwt = app.get(JwtService);
    await app.get(DbInitService, { strict: false }).runInit();
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  async function seedUser(role: UserRole, phone: string, zoneId: string | null): Promise<{ id: string; token: string }> {
    const repo = ds.getRepository(User);
    const u = repo.create({
      phone,
      firstName: 'Identificateur',
      lastName: 'Test',
      genre: 'homme',
      role,
      status: UserStatus.ACTIF,
      zoneId: zoneId as any,
      passwordHash: await bcrypt.hash('1234', 10),
    } as any);
    const saved: any = await repo.save(u as any);
    const token = await jwt.signAsync(
      { sub: saved.id, phone: saved.phone, role: saved.role },
      { secret: process.env.JWT_SECRET },
    );
    return { id: saved.id, token };
  }

  async function zoneIdEnBase(userId: string): Promise<string | null> {
    const rows = await ds.query(`SELECT zone_id FROM users WHERE id = $1`, [userId]);
    return rows[0]?.zone_id ?? null;
  }

  it('approbation par super_admin → users.zone_id réellement réaffecté à la zone demandée', async () => {
    const identificateur = await seedUser(
      UserRole.IDENTIFICATEUR,
      '+2250700070301',
      'zn-01',
    );
    const admin = await seedUser(UserRole.SUPER_ADMIN as any, '+2250700070302', null);

    // Zone de départ confirmée en base avant toute demande.
    expect(await zoneIdEnBase(identificateur.id)).toBe('zn-01');

    const create = await api()
      .post('/api/v1/mutations')
      .set('Authorization', `Bearer ${identificateur.token}`)
      .send({
        zoneActuelleId: 'zn-01',
        zoneActuelle: 'Zone 01',
        zoneDemandeeId: 'zn-02',
        zoneDemandee: 'Zone 02',
        raison: 'Rapprochement familial pour raisons professionnelles.',
      });
    expect(create.status).toBe(201);
    const mutationId = create.body?.data?.id;
    expect(mutationId).toBeTruthy();

    const decision = await api()
      .patch(`/api/v1/mutations/${mutationId}/decision`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ decision: 'approuvee' });
    expect(decision.status).toBe(200);
    expect(decision.body?.data?.statut).toBe('approuvee');

    // L'INVARIANT DÉCISIF : la zone de l'identificateur a réellement changé
    // en base (et pas seulement le statut de la demande de mutation).
    expect(await zoneIdEnBase(identificateur.id)).toBe('zn-02');

    // Effet secondaire de traçabilité conservé (mission créée), sans être
    // le SEUL effet de l'approbation.
    const missions = await ds.query(
      `SELECT zone_id, assignee_id FROM missions WHERE assignee_id = $1`,
      [identificateur.id],
    );
    expect(missions.length).toBeGreaterThan(0);
    expect(missions[0].zone_id).toBe('zn-02');
  });

  it('rejet par gestionnaire_zone → users.zone_id INCHANGÉ', async () => {
    const identificateur = await seedUser(
      UserRole.IDENTIFICATEUR,
      '+2250700070303',
      'zn-01',
    );
    const gestionnaire = await seedUser(
      UserRole.GESTIONNAIRE_ZONE as any,
      '+2250700070304',
      null,
    );

    const create = await api()
      .post('/api/v1/mutations')
      .set('Authorization', `Bearer ${identificateur.token}`)
      .send({
        zoneActuelleId: 'zn-01',
        zoneActuelle: 'Zone 01',
        zoneDemandeeId: 'zn-03',
        zoneDemandee: 'Zone 03',
        raison: 'Motif de test suffisamment long pour passer la validation.',
      });
    expect(create.status).toBe(201);
    const mutationId = create.body?.data?.id;

    const decision = await api()
      .patch(`/api/v1/mutations/${mutationId}/decision`)
      .set('Authorization', `Bearer ${gestionnaire.token}`)
      .send({ decision: 'rejetee', motif: 'Zone demandée déjà saturée en identificateurs.' });
    expect(decision.status).toBe(200);
    expect(decision.body?.data?.statut).toBe('rejetee');

    // Rejet : la zone ne doit surtout pas bouger.
    expect(await zoneIdEnBase(identificateur.id)).toBe('zn-01');
  });

  it('décision sur une mutation déjà tranchée → refusée, pas de nouvelle écriture', async () => {
    const identificateur = await seedUser(
      UserRole.IDENTIFICATEUR,
      '+2250700070305',
      'zn-01',
    );
    const admin1 = await seedUser(UserRole.SUPER_ADMIN as any, '+2250700070306', null);
    const admin2 = await seedUser(UserRole.ADMIN_GENERAL as any, '+2250700070307', null);

    const create = await api()
      .post('/api/v1/mutations')
      .set('Authorization', `Bearer ${identificateur.token}`)
      .send({
        zoneActuelleId: 'zn-01',
        zoneActuelle: 'Zone 01',
        zoneDemandeeId: 'zn-04',
        zoneDemandee: 'Zone 04',
        raison: 'Motif de test suffisamment long pour passer la validation.',
      });
    const mutationId = create.body?.data?.id;

    const premiere = await api()
      .patch(`/api/v1/mutations/${mutationId}/decision`)
      .set('Authorization', `Bearer ${admin1.token}`)
      .send({ decision: 'approuvee' });
    expect(premiere.status).toBe(200);
    expect(await zoneIdEnBase(identificateur.id)).toBe('zn-04');

    // Deuxième décision sur la même mutation (déjà "approuvee") → refusée.
    const seconde = await api()
      .patch(`/api/v1/mutations/${mutationId}/decision`)
      .set('Authorization', `Bearer ${admin2.token}`)
      .send({ decision: 'rejetee', motif: 'Décision tentée en double, doit être refusée.' });
    expect(seconde.status).toBe(400);

    // La zone reste celle de la première décision (aucune régression).
    expect(await zoneIdEnBase(identificateur.id)).toBe('zn-04');
  });
});
