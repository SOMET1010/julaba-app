// PROD-09 — une offre du marché producteur NE PEUT PLUS vendre plus que la
// production déclarée (20/10/2026).
//
// Constat (AUDIT-PARCOURS-PRODUCTEUR §PROD-09, portant PRODUCTEUR-04 du docx)
// : POST /publications acceptait une offre SANS recolte_id et SANS plafond
// serveur — quantite_disponible était libre, la bornée du modal était CLIENT.
// Un curl (ou un client modifié) pouvait offrir 10 000 kg d'igname sans
// AUCUNE récolte derrière : le marché affichait de la production inventée,
// un acheteur réservait, et le producteur ne pouvait jamais livrer.
//
// Correctif (fail-closed, aucun flux vivant cassé — le seul écran de
// publication vivant, PublierRecolteModal, envoie toujours recolte_id et est
// déjà borné client ; l'écran sans récolte, PublierRecolte.tsx, est orphelin
// : importé nulle part) :
//   1. recolte_id REQUIS — une offre sans récolte = une quantité inventée.
//   2. plafond serveur DUR — quantite_disponible ≤ recolte.stock_disponible.
//   3. ownership — la récolte doit appartenir à l'auteur de l'offre.
//
// Propriétés vérifiées (🟢 attendu) :
//  - PROD-09-a : offre liée à sa récolte, quantité ≤ stock → créée ; la
//    récolte passe 'validee' (contrat existant conservé).
//  - PROD-09-b : quantité > stock_disponible → 400, AUCUNE publication.
//  - PROD-09-c : sans recolte_id → 400, AUCUNE publication.
//  - PROD-09-d : récolte d'un AUTRE producteur → 400, AUCUNE publication.
//  - PROD-09-e : rejeu d'upsert (ON CONFLICT même produit) sous le plafond
//    → toujours accepté (idempotence du flux, non cassée par la garde).

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { User, UserRole } from '../../src/users/entities/user.entity';

describe('Invariant PROD-09 — plafond serveur des publications producteur (🟢 attendu)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  const api = () => request(app.getHttpServer());

  const seedUser = async (role: UserRole, phone: string): Promise<{ id: string; token: string }> => {
    const repo = ds.getRepository(User);
    const u = repo.create({
      phone, firstName: 'Prod', lastName: role, genre: 'homme',
      role, status: 'actif' as any, passwordHash: await bcrypt.hash('1234', 10),
    } as any);
    const saved: any = await repo.save(u as any);
    const token = await jwt.signAsync(
      { sub: saved.id, phone: saved.phone, role: saved.role },
      { secret: process.env.JWT_SECRET },
    );
    return { id: saved.id, token };
  };

  // Récolte déclarée, stock = 100 kg (le chiffre du scénario docx).
  const seedRecolte = async (userId: string, produit: string, stockDisponible = 100): Promise<string> => {
    const rows = await ds.query(
      `INSERT INTO recoltes (user_id, produit, quantite, unite, qualite, date_recolte, statut, prix_unitaire, stock_disponible)
       VALUES ($1, $2, $3, 'kg', 'standard', CURRENT_DATE, 'declaree', 500, $4)
       RETURNING id`,
      [userId, produit, stockDisponible, stockDisponible],
    );
    return rows[0].id;
  };

  const publier = (token: string, payload: any) => api()
    .post('/api/v1/publications')
    .set('Authorization', `Bearer ${token}`)
    .send(payload);

  const offre = (produit: string) => ({
    produit,
    culture: produit,
    quantite_disponible: 80,
    unite: 'kg',
    prix_unitaire: 500,
    qualite: 'standard',
    localisation: 'Test',
    description: 'offre de test',
  });

  const nbPublications = async (userId: string): Promise<number> =>
    (await ds.query('SELECT count(*)::int n FROM publications WHERE user_id = $1', [userId]))[0].n;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ThrottlerStorage)
      .useValue({ increment: async () => ({ totalHits: 1, timeToExpire: 60000, isBlocked: false, timeToBlockExpire: 0 }) })
      .compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    jwt = app.get(JwtService);
    await app.get(DbInitService, { strict: false }).runInit();

    // Index d'expression requis par le ON CONFLICT de create() (miroir prod).
    await ds.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS ux_publications_user_produit
         ON publications (user_id, LOWER(TRIM(produit)))`,
    );
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('PROD-09-a : offre liée à sa récolte, quantité ≤ stock → créée, récolte validee', async () => {
    const { id: uid, token } = await seedUser(UserRole.PRODUCTEUR, '+2250700011001');
    const recolteId = await seedRecolte(uid, 'Igname', 100);

    const res = await publier(token, { ...offre('Igname'), recolte_id: recolteId });
    expect([200, 201]).toContain(res.status);
    expect(res.body?.publication?.quantite_disponible).toBe('80.00'); // decimal PG = string
    expect(await nbPublications(uid)).toBe(1);

    const recolte = (await ds.query(`SELECT statut FROM recoltes WHERE id::text = $1`, [recolteId]))[0];
    expect(recolte.statut).toBe('validee');
  });

  it('PROD-09-b : quantité > stock_disponible → 400, AUCUNE publication', async () => {
    const { id: uid, token } = await seedUser(UserRole.PRODUCTEUR, '+2250700011002');
    const recolteId = await seedRecolte(uid, 'Manioc', 100);

    const res = await publier(token, { ...offre('Manioc'), quantite_disponible: 101, recolte_id: recolteId });
    expect(res.status).toBe(400);
    expect(String(res.body?.message || '')).toMatch(/stock disponible/i);
    expect(await nbPublications(uid)).toBe(0);
  });

  it('PROD-09-c : sans recolte_id → 400, AUCUNE publication (pas de production inventée)', async () => {
    const { id: uid, token } = await seedUser(UserRole.PRODUCTEUR, '+2250700011003');

    const res = await publier(token, offre('Riz'));
    expect(res.status).toBe(400);
    expect(String(res.body?.message || '')).toMatch(/recolte_id/i);
    expect(await nbPublications(uid)).toBe(0);
  });

  it('PROD-09-d : la récolte d\'un AUTRE producteur → 400, AUCUNE publication', async () => {
    const autre = await seedUser(UserRole.PRODUCTEUR, '+2250700011004');
    const recolteAutre = await seedRecolte(autre.id, 'Cacao', 500);

    const { id: uid, token } = await seedUser(UserRole.PRODUCTEUR, '+2250700011005');
    const res = await publier(token, { ...offre('Cacao'), recolte_id: recolteAutre });
    expect(res.status).toBe(400);
    expect(String(res.body?.message || '')).toMatch(/introuvable|autoris/i);
    expect(await nbPublications(uid)).toBe(0);
  });

  it('PROD-09-e : rejeu d\'upsert sous le plafond → toujours accepté (flux non cassé)', async () => {
    const { id: uid, token } = await seedUser(UserRole.PRODUCTEUR, '+2250700011006');
    const recolteId = await seedRecolte(uid, 'Patate', 100);

    const premier = await publier(token, { ...offre('Patate'), recolte_id: recolteId });
    expect([200, 201]).toContain(premier.status);

    const second = await publier(token, { ...offre('Patate'), quantite_disponible: 60, recolte_id: recolteId });
    expect([200, 201]).toContain(second.status);
    // upsert : UNE ligne, quantité mise à jour (jamais doublée)
    const lignes = await ds.query(
      `SELECT quantite_disponible::float q FROM publications WHERE user_id = $1 AND produit = 'Patate'`,
      [uid],
    );
    expect(lignes.length).toBe(1);
    expect(lignes[0].q).toBe(60);
  });
});
