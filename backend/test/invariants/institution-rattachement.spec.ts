// Invariant — RATTACHEMENT D'UN COMPTE INSTITUTION À SA FICHE (BO).
//
// `InstitutionScopeGuard` n'ouvre `/institution/*` qu'au compte désigné par
// `institutions.responsable_id`. Avant ce lot, aucun chemin back-office ne
// posait ce lien : POST et PATCH `/institutions` l'ignoraient. Un compte de
// rôle `institution` créé au BO recevait donc 403 partout, et l'écran le
// montrait comme des zéros.
//
// Ce banc prouve, par HTTP, que le super_admin pose le lien et que :
//   - le compte rattaché obtient 200 sur /institution/dashboard, limité à SA zone ;
//   - un responsable qui n'a pas le rôle `institution` est refusé (400) ;
//   - un compte déjà responsable d'une institution ne l'est pas d'une seconde (409) ;
//   - un autre compte institution, non rattaché, reste refusé.

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

describe('Invariant — rattachement BO du responsable d\'institution', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let tokenAdmin: string;
  const api = () => request(app.getHttpServer());
  const MODULES = { dashboard: 'lecture', acteurs: 'lecture', transactions: 'lecture' };

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
    tokenAdmin = await tokenFor(await seedUser({ role: UserRole.SUPER_ADMIN, phone: '+2250700920001' }));
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  async function seedUser(overrides: Partial<User> & { role: UserRole; phone: string }): Promise<User> {
    const repo = ds.getRepository(User);
    const u = repo.create({
      firstName: 'Rattache', lastName: overrides.role, genre: 'homme',
      status: UserStatus.ACTIF, validated: true,
      passwordHash: await bcrypt.hash('1234', 10),
      ...overrides,
    } as any);
    return repo.save(u as any);
  }

  function tokenFor(user: User): Promise<string> {
    return jwt.signAsync({ sub: user.id, phone: user.phone, role: user.role }, { secret: process.env.JWT_SECRET });
  }

  const creer = (body: Record<string, unknown>) =>
    api().post('/api/v1/institutions').set('Authorization', `Bearer ${tokenAdmin}`).send(body);

  it('responsable posé par le super_admin : le compte institution passe la garde et ne voit QUE sa zone', async () => {
    const responsable = await seedUser({ role: UserRole.INSTITUTION, phone: '+2250700920002' });
    await seedUser({ role: UserRole.MARCHAND, phone: '+2250700920003', zoneId: 'zone-rattache-a' } as any);
    await seedUser({ role: UserRole.MARCHAND, phone: '+2250700920004', zoneId: 'zone-rattache-a' } as any);
    await seedUser({ role: UserRole.MARCHAND, phone: '+2250700920005', zoneId: 'zone-rattache-b' } as any);
    const token = await tokenFor(responsable);

    // Sans lien : refus (c'est l'état de tout compte créé au BO avant ce lot).
    const avant = await api().get('/api/v1/institution/dashboard').set('Authorization', `Bearer ${token}`);
    expect(avant.status).toBe(403);

    const cree = await creer({ nom: 'Inst Rattachée A', type: 'cnps', zone_id: 'zone-rattache-a', modules: MODULES, responsable_id: responsable.id });
    expect(cree.status).toBe(201);
    expect(cree.body.responsable_id).toBe(responsable.id);
    expect(cree.body.responsable?.nom).toContain('Rattache');
    expect(cree.body.responsable?.telephone).not.toBe(responsable.phone); // masqué

    const lu = await api().get(`/api/v1/institutions/${cree.body.id}`).set('Authorization', `Bearer ${tokenAdmin}`);
    expect(lu.body.responsable_id).toBe(responsable.id);

    const apres = await api().get('/api/v1/institution/dashboard').set('Authorization', `Bearer ${token}`);
    expect(apres.status).toBe(200);
    expect(apres.body.macroKPIs.totalActeurs).toBe(2);

    const audit = await ds.query(
      `SELECT 1 FROM audit_logs WHERE entite_id::text = $1 AND action = 'RATTACHER_RESPONSABLE_INSTITUTION'`,
      [cree.body.id],
    );
    expect(audit.length).toBe(1);
  });

  it('responsable qui n\'a pas le rôle institution : 400 avec une phrase claire', async () => {
    const marchand = await seedUser({ role: UserRole.MARCHAND, phone: '+2250700920006' });
    const res = await creer({ nom: 'Inst Refusée', responsable_id: marchand.id });
    expect(res.status).toBe(400);
    expect(String(res.body.message)).toMatch(/rôle institution/);

    const inconnu = await creer({ nom: 'Inst Fantôme', responsable_id: '00000000-0000-4000-8000-000000000000' });
    expect(inconnu.status).toBe(400);
  });

  it('un compte déjà responsable ne l\'est pas d\'une seconde institution : 409 (création et modification)', async () => {
    const responsable = await seedUser({ role: UserRole.INSTITUTION, phone: '+2250700920007' });
    const premiere = await creer({ nom: 'Inst Première', zone_id: 'zone-rattache-c', modules: MODULES, responsable_id: responsable.id });
    expect(premiere.status).toBe(201);

    const doublon = await creer({ nom: 'Inst Doublon', responsable_id: responsable.id });
    expect(doublon.status).toBe(409);

    const seconde = await creer({ nom: 'Inst Seconde' });
    expect(seconde.status).toBe(201);
    const patch = await api().patch(`/api/v1/institutions/${seconde.body.id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`).send({ responsable_id: responsable.id });
    expect(patch.status).toBe(409);

    // Re-poser le MÊME responsable sur SA propre fiche n'est pas un doublon.
    const memeFiche = await api().patch(`/api/v1/institutions/${premiere.body.id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`).send({ responsable_id: responsable.id, nom: 'Inst Première bis' });
    expect(memeFiche.status).toBe(200);
  });

  it('PATCH pose le responsable ; un autre compte institution non rattaché reste refusé', async () => {
    const responsable = await seedUser({ role: UserRole.INSTITUTION, phone: '+2250700920008' });
    const autre = await seedUser({ role: UserRole.INSTITUTION, phone: '+2250700920009' });
    const cree = await creer({ nom: 'Inst Patchée', zone_id: 'zone-rattache-d', modules: MODULES });
    expect(cree.status).toBe(201);

    const patch = await api().patch(`/api/v1/institutions/${cree.body.id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`).send({ responsable_id: responsable.id });
    expect(patch.status).toBe(200);
    expect(patch.body.responsable_id).toBe(responsable.id);

    const ok = await api().get('/api/v1/institution/acteurs').set('Authorization', `Bearer ${await tokenFor(responsable)}`);
    expect(ok.status).toBe(200);

    const tokenAutre = await tokenFor(autre);
    const refuse = await api().get('/api/v1/institution/dashboard').set('Authorization', `Bearer ${tokenAutre}`);
    expect(refuse.status).toBe(403);
    const fiche = await api().get(`/api/v1/institutions/${cree.body.id}`).set('Authorization', `Bearer ${tokenAutre}`);
    expect(fiche.status).toBe(404);
  });
});
