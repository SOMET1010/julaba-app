// Invariant B1 — AUTORITE DE PUBLICATION sur le marche producteur.
//
// Regle (lot Marche, Option A) : creer une offre du marche producteur via
// POST /publications est reserve aux roles producteur et cooperateur. Un
// grossiste voit tout p.type_marche='producteur' sans filtre d'auteur
// (getMarche), donc sans cette garde un detaillant, un demi-grossiste ou une
// institution qui poste apparaitrait dans le marche de tous les grossistes.
// Les grossistes disposent d'une voie dediee et deja gardee : /publications/
// republier (marche cooperatif).
//
// Propriete verifiee : un role interdit ne CREE jamais de publication (refus
// 403, aucune ligne ecrite) ; un role autorise cree bien.
//
// Note d'infrastructure : create() fait un ON CONFLICT (user_id,
// LOWER(TRIM(produit))). Cet index d'expression n'est pose par aucune migration
// TypeORM (DDL manuelle en prod) et n'existe donc pas sous synchronize=true. On
// le cree explicitement dans le setup pour que le chemin nominal soit
// deterministe et reflete la prod ; la garde, elle, s'execute AVANT tout INSERT.

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

describe('Invariant B1 — autorite de publication (POST /publications)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    // Throttler neutralise : ce lot teste l'AUTORISATION, pas la limitation de
    // debit (sinon un refus pourrait etre masque par un 429).
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

    // Index d'expression requis par le ON CONFLICT de create() (voir en-tete).
    await ds.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS ux_publications_user_produit
         ON publications (user_id, LOWER(TRIM(produit)))`,
    );
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  // Seed direct d'un utilisateur de role donne + jeton signe (hors inscription
  // publique, qui est elle-meme allow-listee). Mirroir du pattern M6/M8.
  async function seed(role: UserRole, phone: string, sousProfil?: string): Promise<string> {
    const repo = ds.getRepository(User);
    const u = repo.create({
      phone,
      firstName: 'Test',
      lastName: role,
      genre: 'femme',
      role,
      status: UserStatus.ACTIF,
      passwordHash: await bcrypt.hash('1234', 10),
      ...(sousProfil ? { sousProfilMarchand: sousProfil } : {}),
    } as any);
    const saved: any = await repo.save(u as any);
    return jwt.signAsync(
      { sub: saved.id, phone: saved.phone, role: saved.role },
      { secret: process.env.JWT_SECRET },
    );
  }

  const offre = (produit: string) => ({
    produit,
    culture: produit,
    quantite_disponible: 100,
    unite: 'kg',
    prix_unitaire: 500,
    qualite: 'standard',
    localisation: 'Test',
    description: 'offre de test',
  });

  const nbPublications = async (userId: string): Promise<number> =>
    (await ds.query('SELECT count(*)::int n FROM publications WHERE user_id = $1', [userId]))[0].n;

  const idDe = async (phone: string): Promise<string> =>
    (await ds.query('SELECT id FROM users WHERE phone = $1', [phone]))[0].id;

  it('producteur : POST /publications autorise (201)', async () => {
    const token = await seed(UserRole.PRODUCTEUR, '+2250700010001');
    const res = await api()
      .post('/api/v1/publications')
      .set('Authorization', `Bearer ${token}`)
      .send(offre('Tomate'));
    expect([200, 201]).toContain(res.status);
    expect(res.body?.publication?.produit).toBe('Tomate');
    expect(await nbPublications(await idDe('+2250700010001'))).toBe(1);
  });

  it('cooperateur : POST /publications autorise (201)', async () => {
    const token = await seed(UserRole.COOPERATEUR, '+2250700010002');
    const res = await api()
      .post('/api/v1/publications')
      .set('Authorization', `Bearer ${token}`)
      .send(offre('Manioc'));
    expect([200, 201]).toContain(res.status);
    expect(res.body?.publication?.produit).toBe('Manioc');
  });

  it('marchand (detaillant) : POST /publications refuse (403), aucune ligne ecrite', async () => {
    const phone = '+2250700010003';
    const token = await seed(UserRole.MARCHAND, phone, 'detaillant');
    const res = await api()
      .post('/api/v1/publications')
      .set('Authorization', `Bearer ${token}`)
      .send(offre('Igname'));
    expect(res.status).toBe(403);
    expect(await nbPublications(await idDe(phone))).toBe(0);
  });

  it('institution : POST /publications refuse (403), aucune ligne ecrite', async () => {
    const phone = '+2250700010004';
    const token = await seed(UserRole.INSTITUTION, phone);
    const res = await api()
      .post('/api/v1/publications')
      .set('Authorization', `Bearer ${token}`)
      .send(offre('Cacao'));
    expect(res.status).toBe(403);
    expect(await nbPublications(await idDe(phone))).toBe(0);
  });
});
