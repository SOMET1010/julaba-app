// DGE-09 / IDENT-07 — POST /dossiers pose `en_attente`, la machine à états
// reste actionnable, les statuts LEGACY sont régularisés (20/10/2026).
//
// Trou constaté le 20/10 (AUDIT-PARCOURS-DGE §DGE-09 + AUDIT-PARCOURS-
// IDENTIFICATEUR §IDENT-07) : POST /dossiers écrivait `statut: 'en_cours'` —
// statut LEGACY inconnu de la mappe C-12 (statuts-identification.ts). Tout
// dossier créé par cette route était immuable côté statut (409 garanti à la
// première transition) et invisible pour l'écran Suivi.
//
// Correctifs : (a) la création pose `en_attente`, le seul état d'entrée de la
// machine — le client ne choisit jamais le statut ; (b) DbInit régularise les
// lignes LEGACY déjà écrites (en_cours→en_attente, validee→approuve,
// rejetee→rejete), idempotent.
//
// Propriétés vérifiées (🟢 attendu) :
//  - DGE-09-a : POST /dossiers → 201, statut DB `en_attente` ; un
//    `body.statut: 'approuve'` du client est ignoré.
//  - DGE-09-b : le dossier créé est actionnable — un agent habilité
//    (admin_general) l'approuve via PATCH /dossiers/:id, l'audit
//    IDENTIFICATION_STATUT_MODIFIE est écrit et le compte acteur est activé.
//  - DGE-09-c : la régularisation DbInit ramène les statuts LEGACY aux
//    équivalents canoniques, et un second passage ne change rien (idempotent).

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

describe('Invariant DGE-09 — POST /dossiers naît en_attente + régularisation legacy (🟢 attendu)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;

  let identificateurToken: string;
  let adminToken: string;
  let acteurId: string;

  const api = () => request(app.getHttpServer());

  const seedUser = async (role: UserRole, phone: string): Promise<{ id: string; token: string }> => {
    const repo = ds.getRepository(User);
    const u = repo.create({
      phone, firstName: 'Agent', lastName: role, genre: 'homme',
      role, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
    } as any);
    const saved: any = await repo.save(u as any);
    const token = await jwt.signAsync(
      { sub: saved.id, phone: saved.phone, role: saved.role },
      { secret: process.env.JWT_SECRET },
    );
    return { id: saved.id, token };
  };

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

    const ident = await seedUser(UserRole.IDENTIFICATEUR, '+2250700000501');
    identificateurToken = ident.token;
    const admin = await seedUser(UserRole.ADMIN_GENERAL, '+2250700000502');
    adminToken = admin.token;
    // L'acteur dont le dossier porte l'identifiant (le compte activé à la validation).
    const acteur = await seedUser(UserRole.MARCHAND, '+2250700000503');
    acteurId = acteur.id;
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('DGE-09-a : POST /dossiers → statut DB en_attente ; body.statut du client ignoré', async () => {
    const r = await api()
      .post('/api/v1/dossiers')
      .set('Authorization', `Bearer ${identificateurToken}`)
      .send({ acteur_id: acteurId, zone_id: null, notes: 'Création DGE-09', statut: 'approuve' });
    expect([200, 201]).toContain(r.status);

    const identRow = await ds.query(`SELECT id::text AS id FROM users WHERE phone = '+2250700000501'`);
    const rows = await ds.query(
      `SELECT id, statut FROM identifications WHERE identificateur_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [identRow[0].id],
    );
    expect(rows.length).toBe(1);
    expect(rows[0].statut).toBe('en_attente');

    // Le dossier créé est lisible par l'écran Suivi (branche propriétaire).
    const liste = await api()
      .get('/api/v1/dossiers')
      .set('Authorization', `Bearer ${identificateurToken}`);
    expect(liste.status).toBe(200);
    const ids: string[] = (liste.body.data || []).map((d: any) => String(d.id));
    expect(ids).toContain(String(rows[0].id));

    // Mémoire pour DGE-09-b.
    (global as any).__dge09Dossier = rows[0].id;
  });

  it('DGE-09-b : le dossier créé est actionnable — approbation BO, audit écrit, acteur activé', async () => {
    const dossierId = (global as any).__dge09Dossier;
    const r = await api()
      .patch(`/api/v1/dossiers/${dossierId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statut: 'approuve' });
    expect([200, 201]).toContain(r.status);

    const rows = await ds.query(`SELECT statut FROM identifications WHERE id = $1`, [dossierId]);
    expect(rows[0].statut).toBe('approuve');

    const audit = await ds.query(
      `SELECT action FROM audit_logs WHERE entite = 'identification' AND entite_id = $1 AND action = 'IDENTIFICATION_STATUT_MODIFIE'`,
      [dossierId],
    );
    expect(audit.length).toBe(1);

    const acteur = await ds.query(`SELECT validated FROM users WHERE id = $1`, [acteurId]);
    expect(acteur[0].validated).toBe(true);
  });

  it('DGE-09-c : régularisation legacy (en_cours→en_attente, validee→approuve, rejetee→rejete), idempotent', async () => {
    const identRow = await ds.query(`SELECT id FROM users WHERE phone = '+2250700000501'`);
    const identId = identRow[0].id;
    const inserted = await ds.query(
      `INSERT INTO identifications (identificateur_id, acteur_nom, type_acteur, statut)
       VALUES ($1, 'Legacy A', 'marchand', 'en_cours'),
              ($1, 'Legacy B', 'marchand', 'validee'),
              ($1, 'Legacy C', 'marchand', 'rejetee')
       RETURNING id, statut`,
      [identId],
    );
    expect(inserted.length).toBe(3);

    // Le passage DbInit (déjà joué au boot) rejoué : ramène les LEGACY aux canoniques.
    await app.get(DbInitService, { strict: false }).runInit();

    const after = await ds.query(
      `SELECT id, statut FROM identifications WHERE id = ANY($1::uuid[]) ORDER BY acteur_nom`,
      [inserted.map((r: any) => r.id)],
    );
    expect(after.map((r: any) => r.statut)).toEqual(['en_attente', 'approuve', 'rejete']);

    // Idempotence : un second passage ne change plus rien.
    await app.get(DbInitService, { strict: false }).runInit();
    const again = await ds.query(
      `SELECT id, statut FROM identifications WHERE id = ANY($1::uuid[]) ORDER BY acteur_nom`,
      [inserted.map((r: any) => r.id)],
    );
    expect(again.map((r: any) => r.statut)).toEqual(['en_attente', 'approuve', 'rejete']);
  });
});
