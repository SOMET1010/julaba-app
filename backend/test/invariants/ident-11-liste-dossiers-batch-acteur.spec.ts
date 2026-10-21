// IDENT-11 — la liste des dossiers de l'identificateur est AUTOSUFFISANTE :
// plus un seul GET /users/:id PAR dossier (20/10/2026).
//
// Constat (AUDIT-PARCOURS-IDENTIFICATEUR §IDENT-11, reconduisant
// IDENTIFICATEUR-12) : le contexte front chargeait GET /identifications puis
// enrichissait CHAQUE dossier d'un GET /users/:id (Promise.all) — et son
// polling 30 s rejouait le tout. Une page de 50 dossiers = 51 requêtes toutes
// les 30 secondes, pour des champs (téléphone, photo, activité, marché du
// participant) que le serveur PEUT joindre lui-même.
//
// Correctif : GET /identifications JOIN désormais l'acteur (users a ON
// a.id::text = i.acteur_id) et embarque acteur_telephone, acteur_photo,
// acteur_activite, acteur_marche, acteur_nom_user — dans les DEUX branches
// (identificateur = ses dossiers ; admin/gestionnaire_zone scopée).
//
// Propriétés vérifiées (🟢 attendu) :
//  - IDENT-11-a : après 2 soumissions, la liste renvoie pour CHAQUE dossier
//    le téléphone et le nom de l'acteur — l'UI n'a plus besoin d'aller
//    re-consulte /users/:id (l'autosuffisance EST la preuve anti-N+1).
//  - IDENT-11-b : un dossier orphelin (acteur_id NULL, ex. suppression RGPD
//    de l'acteur) ne casse pas la liste — LEFT JOIN, champs vides.
//  - IDENT-11-c : la pagination reste intacte (meta coherent après le JOIN).

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ThrottlerStorage } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { User, UserRole } from '../../src/users/entities/user.entity';

describe('Invariant IDENT-11 — la liste des dossiers embarque l\'acteur (🟢 attendu)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;

  let tokenIdentificateur: string;

  const api = () => request(app.getHttpServer());

  const seedUser = async (role: UserRole, phone: string): Promise<{ id: string; token: string }> => {
    const repo = ds.getRepository(User);
    const u = repo.create({
      phone, firstName: 'Agent', lastName: role, genre: 'homme',
      role, status: 'actif' as any, passwordHash: await bcrypt.hash('1234', 10),
    } as any);
    const saved: any = await repo.save(u as any);
    const token = await jwt.signAsync(
      { sub: saved.id, phone: saved.phone, role: saved.role },
      { secret: process.env.JWT_SECRET },
    );
    return { id: saved.id, token };
  };

  const soumettre = (phone: string, prenom: string, nom: string, role: string) => api()
    .post('/api/v1/identifications/create-with-acteur')
    .set('Authorization', `Bearer ${tokenIdentificateur}`)
    .send({
      acteur: {
        firstName: prenom, lastName: nom, phone,
        password: 'secret-inconnu', role, genre: 'femme',
      },
      identification: {
        type_acteur: role,
        acteur_nom: `${prenom} ${nom}`,
        commune: 'Abobo', region: 'Abidjan',
        currentStep: 3, formData: { nom: prenom },
        documents: null,
      },
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
    const ident = await seedUser('identificateur' as UserRole, '+2250700000900');
    tokenIdentificateur = ident.token;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('IDENT-11-a : la liste renvoie téléphone et nom de l\'acteur pour CHAQUE dossier (anti N+1)', async () => {
    const r1 = await soumettre('+2250700000901', 'Awa', 'Kone', 'marchand');
    expect([200, 201]).toContain(r1.status);
    const r2 = await soumettre('+2250700000902', 'Yao', 'Kouadio', 'producteur');
    expect([200, 201]).toContain(r2.status);

    const liste = await api()
      .get('/api/v1/identifications?limit=50&page=1')
      .set('Authorization', `Bearer ${tokenIdentificateur}`);
    expect(liste.status).toBe(200);

    const dossiers: any[] = liste.body?.data || [];
    const vises = dossiers.filter((d) =>
      ['+2250700000901', '+2250700000902'].includes(String(d.acteur_telephone || '')),
    );
    expect(vises.length).toBe(2);

    for (const d of vises) {
      expect(typeof d.acteur_telephone).toBe('string');
      expect(d.acteur_telephone.length).toBeGreaterThan(0);
      // le nom de l'acteur vient du JOIN users — l'UI n'a plus à re-consulter
      expect(String(d.acteur_nom_user || '').length).toBeGreaterThan(0);
      expect(typeof d.acteur_activite).toBe('string');
    }
  });

  it('IDENT-11-b : un dossier orphelin (acteur_id NULL) ne casse pas la liste', async () => {
    await ds.query(
      `INSERT INTO identifications (identificateur_id, acteur_id, type_acteur, statut, acteur_nom, commune, region)
       VALUES ((SELECT id FROM users WHERE phone = '+2250700000900'), NULL, 'marchand', 'en_attente', 'Acteur Effacé', 'Abobo', 'Abidjan')`,
    );

    const liste = await api()
      .get('/api/v1/identifications?limit=50&page=1')
      .set('Authorization', `Bearer ${tokenIdentificateur}`);
    expect(liste.status).toBe(200);

    const orphelin: any = (liste.body?.data || []).find((d: any) => d.acteur_nom === 'Acteur Effacé');
    expect(orphelin).toBeTruthy();
    expect(orphelin.acteur_telephone).toBe('');
    expect(orphelin.acteur_photo).toBeNull();
  });

  it('IDENT-11-c : la pagination reste cohérente après le JOIN (meta.total ≥ 3 dossiers)', async () => {
    const liste = await api()
      .get('/api/v1/identifications?limit=50&page=1')
      .set('Authorization', `Bearer ${tokenIdentificateur}`);
    expect(liste.status).toBe(200);
    expect(liste.body?.meta?.total).toBeGreaterThanOrEqual(3);
    expect(liste.body?.meta?.total).toBe((liste.body?.data || []).length);
  });
});
