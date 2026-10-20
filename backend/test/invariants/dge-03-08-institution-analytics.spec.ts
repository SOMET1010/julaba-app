// DGE-03 + DGE-07/08 — L'ESPACE INSTITUTION LIT SES ROUTES, DIT LA VÉRITÉ.
// (plan d'action audit workflow officiel §5 item 12, 20/10/2026)
//
// DGE-03 : le contexte institution appelait /admin/analytics/{roles,
// produits,graphique,alertes} + /admin/config : N'EXISTENT PAS (404), et
// @Roles('ADMIN') exclut le rôle institution → 403 — l'écran rendait des
// zéros silencieux. → GET /institution/analytics, scopé périmètre
// (InstitutionScopeGuard, fail-closed sans zone).
//
// DGE-07 : PATCH /acteurs/:id filtrait les champs hors allow-list puis
// retournait {success:true} SANS écrire — un succès vide pour un « statut »
// demandé. → 400 explicite nommant les champs ignorés.
//
// Propriétés vérifiées (🟢 attendu) :
//  - DGE-03-a : /institution/analytics → 200 : 4 rôles (le marchand du
//    périmètre y est), 7 jours de ventes, 7 jours d'inscriptions.
//  - DGE-03-b : la vente de caisse écrite par l'API apparaît dans le volume
//    du jour (définition unique : type vente, statut non annulée).
//  - DGE-03-c : le top produits contient le produit de la commande seedée.
//  - DGE-03-d : fail-closed — institution SANS périmètre → 403, marchand → 403.
//  - DGE-07-a : PATCH /acteurs/:id {statut} → 400 explicite (fin du no-op).

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ThrottlerStorage } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { User, UserRole, UserStatus } from '../../src/users/entities/user.entity';

const ZONE_A = '5a111111-4111-4111-8111-111111111111'; // uuid v4
const ALL_MODULES = { dashboard: 'lecture', acteurs: 'lecture', transactions: 'lecture' };

describe('Invariant DGE-03/07 — l\u2019analytique institution est réelle et scopée', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let tokenInstitution: string;
  let tokenInstitutionSansZone: string;
  let tokenMarchand: string;
  let tokenSuperAdmin: string;
  let acteurId: string;

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
    await app.get(DbInitService, { strict: false }).runInit();

    const repo = ds.getRepository(User);
    const seedUser = async (role: UserRole, phone: string, extra: any = {}) => {
      const u: any = await repo.save(repo.create({
        phone, firstName: 'Test', lastName: role, genre: 'homme',
        role, status: UserStatus.ACTIF, validated: true,
        passwordHash: await bcrypt.hash('1234', 10), ...extra,
      } as any));
      return u;
    };
    const tokenFor = async (u: User) => jwt.signAsync(
      { sub: u.id, phone: u.phone, role: u.role },
      { secret: process.env.JWT_SECRET },
    );

    // L'institution du périmètre A.
    const responsable = await seedUser(UserRole.INSTITUTION, '+225070092001');
    await ds.query(
      `INSERT INTO institutions (nom, responsable_id, zone_id, modules, actif)
       VALUES ($1, $2::uuid, $3, $4::jsonb, true)`,
      ['Institution DGE03', responsable.id, ZONE_A, JSON.stringify(ALL_MODULES)],
    );
    tokenInstitution = await tokenFor(responsable);

    // Une institution SANS périmètre (fail-closed).
    const responsableSans = await seedUser(UserRole.INSTITUTION, '+225070092002');
    tokenInstitutionSansZone = await tokenFor(responsableSans);

    // Le marchand du périmètre : une VENTE DE CAISSE écrite par l'API réelle.
    const acteur = await seedUser(UserRole.MARCHAND, '+225070092003', { zoneId: ZONE_A });
    acteurId = acteur.id;
    tokenMarchand = await tokenFor(acteur);
    const vente = await api().post('/api/v1/caisse/vente')
      .set('Authorization', `Bearer ${tokenMarchand}`)
      .send({ montant: '15000', produits: [{ nom: 'Attiéké', quantite: 2 }], idempotency_key: 'DGE03-V1' });
    expect([200, 201]).toContain(vente.status);

    // Une commande réelle (pour le top produits).
    await ds.query(
      `INSERT INTO commandes
         (acheteur_nom, acheteur_telephone, vendeur_id, type, produit, quantite,
          prix_unitaire, total, statut, date_commande, statut_paiement)
       VALUES ('Acheteur DGE03', '+2250700000097', $1, 'directe', 'Gombo', 10, 2000, 20000, 'confirmee', now(), 'paye')`,
      [acteur.id],
    );

    // Un super_admin (habilitation serveur).
    const admin = await seedUser(UserRole.SUPER_ADMIN, '+225070092004');
    tokenSuperAdmin = await tokenFor(admin);
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('DGE-03-a : /institution/analytics → 200, séries réelles, 7 jours', async () => {
    const r = await api()
      .get('/api/v1/institution/analytics')
      .set('Authorization', `Bearer ${tokenInstitution}`);
    expect(r.status).toBe(200);

    const roles = r.body.roles || [];
    expect(roles.map((x: any) => x.role)).toEqual(
      expect.arrayContaining(['marchand', 'producteur', 'cooperateur', 'identificateur']),
    );
    expect(roles.find((x: any) => x.role === 'marchand').count).toBeGreaterThanOrEqual(1);

    expect((r.body.graphique || []).length).toBe(7);
    expect((r.body.inscriptionsParJour || []).length).toBe(7);
  });

  it('DGE-03-b : la vente de caisse écrite par l\u2019API est dans le volume du jour', async () => {
    const r = await api()
      .get('/api/v1/institution/analytics')
      .set('Authorization', `Bearer ${tokenInstitution}`);
    expect(r.status).toBe(200);
    const aujourdHui = new Date().toISOString().slice(0, 10);
    const jour = (r.body.graphique || []).find((g: any) => String(g.jour) === aujourdHui);
    expect(jour).toBeTruthy();
    expect(Number(jour.volume)).toBeGreaterThanOrEqual(15000);
  });

  it('DGE-03-c : le top produits contient la commande seedée', async () => {
    const r = await api()
      .get('/api/v1/institution/analytics')
      .set('Authorization', `Bearer ${tokenInstitution}`);
    expect(r.status).toBe(200);
    const noms = (r.body.produits || []).map((p: any) => p.nom);
    expect(noms).toContain('Gombo');
  });

  it('DGE-03-d : fail-closed — sans périmètre 403, marchand 403', async () => {
    const sansZone = await api()
      .get('/api/v1/institution/analytics')
      .set('Authorization', `Bearer ${tokenInstitutionSansZone}`);
    expect(sansZone.status).toBe(403);

    const marchand = await api()
      .get('/api/v1/institution/analytics')
      .set('Authorization', `Bearer ${tokenMarchand}`);
    expect(marchand.status).toBe(403);
  });

  it('DGE-07-a : PATCH /acteurs/:id {statut} → 400 explicite (fin du no-op silencieux)', async () => {
    const r = await api()
      .patch(`/api/v1/acteurs/${acteurId}`)
      .set('Authorization', `Bearer ${tokenSuperAdmin}`)
      .send({ statut: 'suspendu' });
    expect(r.status).toBe(400);
    expect(String(r.body?.message || '')).toContain('statut');

    // L'acteur n'a PAS été touché : le succès vide mentait, ici rien ne bouge.
    const row = await ds.query('SELECT status FROM users WHERE id = $1', [acteurId]);
    expect(row[0].status).toBe(UserStatus.ACTIF);
  });
});
