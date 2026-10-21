// PROD-06 — les conditions de vente ne sont plus une colonne orpheline
// (20/10/2026).
//
// Constat (AUDIT-PARCOURS-PRODUCTEUR §PROD-06) : publications.conditions_vente
// existait en base (docx étape 5 « Publier » : le producteur décrit ses
// conditions) mais JAMAIS envoyée par l'UI, JAMAIS écrite par le serveur,
// JAMAIS lue — une colonne morte depuis le jour zéro.
//
// Correctif : le modal de publication vivant saisit les conditions
// (optionnelles — rien d'inventé), POST /publications les persiste (et les
// met à jour sur rejeu d'upsert), et les GET (SELECT p.*) les exposent au
// marché, qui les affiche dans le détail produit.
//
// Propriétés vérifiées (🟢 attendu) :
//  - PROD-06-a : une offre publiée avec conditions_vente → la ligne la porte.
//  - PROD-06-b : le rejeu d'upsert (même produit) MET À JOUR les conditions.
//  - PROD-06-c : sans conditions → colonne NULL (jamais de chaîne vide
//    maquillée), et le reste de l'offre est intact.

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

describe('Invariant PROD-06 — conditions de vente persistées (🟢 attendu)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  const api = () => request(app.getHttpServer());

  let token: string;
  let uid: string;

  const seedRecolte = async (userId: string, produit: string, stockDisponible = 100): Promise<string> => {
    const rows = await ds.query(
      `INSERT INTO recoltes (user_id, produit, quantite, unite, qualite, date_recolte, statut, prix_unitaire, stock_disponible)
       VALUES ($1, $2, $3, 'kg', 'standard', CURRENT_DATE, 'declaree', 500, $4)
       RETURNING id`,
      [userId, produit, stockDisponible, stockDisponible],
    );
    return rows[0].id;
  };

  const publier = (payload: any) => api()
    .post('/api/v1/publications')
    .set('Authorization', `Bearer ${token}`)
    .send(payload);

  const offre = (produit: string, recolte_id: string) => ({
    produit,
    culture: produit,
    quantite_disponible: 50,
    unite: 'kg',
    prix_unitaire: 500,
    qualite: 'standard',
    localisation: 'Test',
    recolte_id,
  });

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

    await ds.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS ux_publications_user_produit
         ON publications (user_id, LOWER(TRIM(produit)))`,
    );

    const repo = ds.getRepository(User);
    const u = repo.create({
      phone: '+2250700012001', firstName: 'Prod', lastName: 'Six', genre: 'homme',
      role: UserRole.PRODUCTEUR, status: 'actif' as any, passwordHash: await bcrypt.hash('1234', 10),
    } as any);
    const saved: any = await repo.save(u as any);
    uid = saved.id;
    token = await jwt.signAsync(
      { sub: saved.id, phone: saved.phone, role: saved.role },
      { secret: process.env.JWT_SECRET },
    );
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('PROD-06-a : une offre publiée avec conditions_vente → la ligne la porte', async () => {
    const recolteId = await seedRecolte(uid, 'Gombo', 100);
    const res = await publier({
      ...offre('Gombo', recolteId),
      conditions_vente: 'Paiement à la livraison, minimum 5 kg',
    });
    expect([200, 201]).toContain(res.status);

    const ligne = (await ds.query(
      `SELECT conditions_vente FROM publications WHERE user_id = $1 AND produit = 'Gombo'`,
      [uid],
    ))[0];
    expect(ligne.conditions_vente).toBe('Paiement à la livraison, minimum 5 kg');
  });

  it('PROD-06-b : le rejeu d\'upsert met à jour les conditions', async () => {
    const recolteId = await seedRecolte(uid, 'Piment', 100);
    await publier({ ...offre('Piment', recolteId), conditions_vente: 'Emballage inclus' });
    const rejoue = await publier({ ...offre('Piment', recolteId), conditions_vente: 'Paiement en 2 fois' });
    expect([200, 201]).toContain(rejoue.status);

    const lignes = await ds.query(
      `SELECT conditions_vente FROM publications WHERE user_id = $1 AND produit = 'Piment'`,
      [uid],
    );
    expect(lignes.length).toBe(1);
    expect(lignes[0].conditions_vente).toBe('Paiement en 2 fois');
  });

  it('PROD-06-c : sans conditions → NULL propre, le reste de l\'offre intact', async () => {
    const recolteId = await seedRecolte(uid, 'Aubergine', 100);
    const res = await publier(offre('Aubergine', recolteId));
    expect([200, 201]).toContain(res.status);

    const ligne = (await ds.query(
      `SELECT conditions_vente, quantite_disponible::float q FROM publications WHERE user_id = $1 AND produit = 'Aubergine'`,
      [uid],
    ))[0];
    expect(ligne.conditions_vente).toBeNull();
    expect(ligne.q).toBe(50);
  });
});
