// Invariant — ISOLEMENT DE DONNEES ENTRE INSTITUTIONS.
//
// Correctif d'un audit securite/vie privee : le role `institution`
// (routes /institution/...) n'a le droit de voir QUE les donnees de son
// propre perimetre (zone geographique + modules autorises via
// `institutions.modules`). Avant ce lot, `institution-dashboard.controller.ts`
// tombait en fallback sur TOUTES les donnees nationales (acteurs,
// transactions) des qu'un compte institution appelait ses endpoints,
// documente par un simple log d'avertissement au lieu d'un vrai filtre.
//
// Ce test ne verifie pas seulement que le mecanisme de filtrage EXISTE : il
// cree deux comptes institution reels, avec des perimetres reellement
// distincts (zones differentes, acteurs differents), et prouve par des
// appels HTTP que chacun ne voit QUE ses propres donnees -- jamais celles de
// l'autre, jamais l'ensemble global.
//
// Verifie aussi le cote fail-closed : un compte institution SANS perimetre
// configure (zone_id absent) est refuse (403), jamais un fallback global.

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
import { Wallet } from '../../src/wallets/entities/wallet.entity';
import { WalletTransaction, TransactionType } from '../../src/wallets/entities/wallet-transaction.entity';

describe('Invariant — isolement inter-institutions (/institution/...)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    // Throttler neutralise : ce lot teste l'ISOLEMENT DE DONNEES, pas la
    // limitation de debit (sinon un refus pourrait etre masque par un 429).
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
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  async function seedUser(overrides: Partial<User> & { role: UserRole; phone: string }): Promise<User> {
    const repo = ds.getRepository(User);
    const u = repo.create({
      firstName: 'Test', lastName: overrides.role, genre: 'homme',
      status: UserStatus.ACTIF, validated: true,
      passwordHash: await bcrypt.hash('1234', 10),
      ...overrides,
    } as any);
    return repo.save(u as any);
  }

  async function tokenFor(user: User): Promise<string> {
    return jwt.signAsync(
      { sub: user.id, phone: user.phone, role: user.role },
      { secret: process.env.JWT_SECRET },
    );
  }

  async function seedInstitution(zoneId: string | null, modules: Record<string, string>, phoneSuffix: string) {
    const responsable = await seedUser({
      role: UserRole.INSTITUTION,
      phone: `+225070090${phoneSuffix}`,
    });
    if (zoneId !== undefined) {
      await ds.query(
        `INSERT INTO institutions (nom, responsable_id, zone_id, modules, actif)
         VALUES ($1, $2::uuid, $3, $4::jsonb, true)`,
        [`Institution ${phoneSuffix}`, responsable.id, zoneId, JSON.stringify(modules)],
      );
    }
    const token = await tokenFor(responsable);
    return { responsable, token };
  }

  async function seedActeurAvecTransaction(zoneId: string, phoneSuffix: string, montant: number) {
    const acteur = await seedUser({
      role: UserRole.MARCHAND,
      phone: `+225070091${phoneSuffix}`,
      zoneId,
    } as any);
    await ds.getRepository(Wallet).save(
      ds.getRepository(Wallet).create({ userId: acteur.id, solde: 0 } as any),
    );
    await ds.getRepository(WalletTransaction).save(
      ds.getRepository(WalletTransaction).create({
        userId: acteur.id,
        type: TransactionType.CREDIT,
        montant,
        statut: 'completed',
      } as any),
    );
    return acteur;
  }

  const ALL_MODULES = { dashboard: 'lecture', acteurs: 'lecture', transactions: 'lecture' };

  it('deux institutions, deux zones distinctes : chacune ne voit QUE ses propres acteurs (GET /institution/acteurs)', async () => {
    const zoneA = 'zone-invariant-a';
    const zoneB = 'zone-invariant-b';

    const acteurA = await seedActeurAvecTransaction(zoneA, '001', 10000);
    const acteurB = await seedActeurAvecTransaction(zoneB, '002', 20000);

    const { token: tokenA } = await seedInstitution(zoneA, ALL_MODULES, '001');
    const { token: tokenB } = await seedInstitution(zoneB, ALL_MODULES, '002');

    const resA = await api().get('/api/v1/institution/acteurs').set('Authorization', `Bearer ${tokenA}`);
    const resB = await api().get('/api/v1/institution/acteurs').set('Authorization', `Bearer ${tokenB}`);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    const idsA = resA.body.data.map((a: any) => a.id);
    const idsB = resB.body.data.map((a: any) => a.id);

    // Chacune voit son propre acteur...
    expect(idsA).toContain(acteurA.id);
    expect(idsB).toContain(acteurB.id);
    // ...et JAMAIS celui de l'autre institution : c'est la propriete decisive.
    expect(idsA).not.toContain(acteurB.id);
    expect(idsB).not.toContain(acteurA.id);
  });

  it('deux institutions, deux zones distinctes : chacune ne voit QUE ses propres transactions (GET /institution/transactions)', async () => {
    const zoneA = 'zone-invariant-c';
    const zoneB = 'zone-invariant-d';

    const acteurA = await seedActeurAvecTransaction(zoneA, '003', 15000);
    const acteurB = await seedActeurAvecTransaction(zoneB, '004', 25000);

    const { token: tokenA } = await seedInstitution(zoneA, ALL_MODULES, '003');
    const { token: tokenB } = await seedInstitution(zoneB, ALL_MODULES, '004');

    const resA = await api().get('/api/v1/institution/transactions').set('Authorization', `Bearer ${tokenA}`);
    const resB = await api().get('/api/v1/institution/transactions').set('Authorization', `Bearer ${tokenB}`);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    const montantsA = resA.body.data.map((t: any) => t.montant);
    const montantsB = resB.body.data.map((t: any) => t.montant);

    expect(montantsA).toContain(15000);
    expect(montantsB).toContain(25000);
    expect(montantsA).not.toContain(25000);
    expect(montantsB).not.toContain(15000);

    void acteurA; void acteurB;
  });

  it('deux institutions, deux zones distinctes : les macro-KPI du dashboard ne comptent QUE le perimetre propre', async () => {
    const zoneA = 'zone-invariant-e';
    const zoneB = 'zone-invariant-f';

    // 3 acteurs zone A, 1 acteur zone B : si le dashboard fuitait encore vers
    // le global, totalActeurs pour l'institution A refleterait 4 (ou plus,
    // avec les acteurs des tests precedents), jamais 3.
    await seedActeurAvecTransaction(zoneA, '005', 1000);
    await seedActeurAvecTransaction(zoneA, '006', 1000);
    await seedActeurAvecTransaction(zoneA, '007', 1000);
    await seedActeurAvecTransaction(zoneB, '008', 1000);

    const { token: tokenA } = await seedInstitution(zoneA, ALL_MODULES, '005');
    const { token: tokenB } = await seedInstitution(zoneB, ALL_MODULES, '006');

    const resA = await api().get('/api/v1/institution/dashboard').set('Authorization', `Bearer ${tokenA}`);
    const resB = await api().get('/api/v1/institution/dashboard').set('Authorization', `Bearer ${tokenB}`);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    expect(resA.body.macroKPIs.totalActeurs).toBe(3);
    expect(resB.body.macroKPIs.totalActeurs).toBe(1);
  });

  it('institution SANS perimetre configure (aucune fiche institution liee) : 403, jamais un fallback global', async () => {
    // Compte role=institution seede directement, SANS ligne `institutions`
    // correspondante -- reproduit le cas d'un compte cree hors du flux de
    // signup public (ex. creation back-office) sans configuration ulterieure.
    const orphan = await seedUser({ role: UserRole.INSTITUTION, phone: '+2250700099101' });
    const token = await tokenFor(orphan);

    const res = await api().get('/api/v1/institution/dashboard').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('institution avec fiche liee mais SANS zone_id configuree : 403, jamais un fallback global', async () => {
    const { token } = await seedInstitution(null, ALL_MODULES, '009');
    const res = await api().get('/api/v1/institution/acteurs').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('institution avec zone configuree mais SANS acces au module "acteurs" : 403 (dimension module de InstitutionPermissions)', async () => {
    const { token } = await seedInstitution('zone-invariant-g', { dashboard: 'lecture' }, '010');
    const res = await api().get('/api/v1/institution/acteurs').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('GET /institutions ne renvoie QUE la propre fiche institution du compte, jamais celles des autres', async () => {
    const { token: tokenA, responsable: respA } = await seedInstitution('zone-invariant-h', ALL_MODULES, '011');
    const { responsable: respB } = await seedInstitution('zone-invariant-i', ALL_MODULES, '012');

    const res = await api().get('/api/v1/institutions').set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    const responsableIds = res.body.data.map((i: any) => i.responsable_id);
    expect(responsableIds).toEqual([respA.id]);
    expect(responsableIds).not.toContain(respB.id);
  });

  it('GET /institutions/:id sur la fiche d\'une AUTRE institution → 404 (pas de confirmation d\'existence)', async () => {
    const { token: tokenA } = await seedInstitution('zone-invariant-j', ALL_MODULES, '013');
    const { responsable: respB } = await seedInstitution('zone-invariant-k', ALL_MODULES, '014');

    const instB = await ds.query('SELECT id FROM institutions WHERE responsable_id = $1', [respB.id]);
    const idB = instB[0].id;

    const res = await api().get(`/api/v1/institutions/${idB}`).set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(404);
  });
});
