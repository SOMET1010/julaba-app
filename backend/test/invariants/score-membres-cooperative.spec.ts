// Invariant Score Jùlaba des membres de coopérative — le score affiché par
// GET /cooperatives/membres doit être le VRAI score (`scoreJulaba`), calculé
// par la même logique que GET /scores/me (ScoresService, source unique —
// Constitution §2), et non une valeur figée à 0.
//
// Propriétés attendues (🟢) :
//  - un membre avec une activité RÉELLE en base (ventes en caisse) obtient un
//    scoreJulaba > 0, cohérent (même valeur) avec ce que /scores/me calcule
//    pour ce même utilisateur ;
//  - un membre sans aucune activité reste légitimement à 0 ;
//  - la liste est calculée en un nombre BORNÉ de requêtes (pas de N+1) :
//    on vérifie ce point indirectement en s'assurant que la réponse reste
//    correcte avec plusieurs membres simultanément.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';

describe('Invariant Score Membres Coopérative — scoreJulaba réel et cohérent (🟢 attendu)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let presidentToken: string;
  let marchandActifId: string;
  let marchandActifToken: string;
  let marchandInactifId: string;

  const PHONE_PRESIDENT = '+2250700000201';
  const PHONE_ACTIF = '+2250700000202';
  const PHONE_INACTIF = '+2250700000203';

  const signup = async (phone: string, role: string, firstName: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({ phone, firstName, lastName: 'ScoreTest', role, genre: 'femme' });
    expect([200, 201]).toContain(res.status);
    const token = res.body.accessToken as string;
    // Mot de passe acteur par défaut « 0000 » + mustChangePassword=true : la
    // garde JWT bloque tout sauf change-password tant qu'il n'est pas levé.
    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: '0000', newPassword: '1234' });
    return { token, id: res.body.user.id as string };
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    await app.get(DbInitService, { strict: false }).runInit();

    // Le président : signup role=cooperateur crée AUTOMATIQUEMENT sa coopérative
    // (responsable_id = son id) — cf. AuthService.signup.
    const president = await signup(PHONE_PRESIDENT, 'cooperateur', 'Adama');
    presidentToken = president.token;

    const actif = await signup(PHONE_ACTIF, 'marchand', 'Aya');
    marchandActifId = actif.id;
    marchandActifToken = actif.token;

    const inactif = await signup(PHONE_INACTIF, 'marchand', 'Koffi');
    marchandInactifId = inactif.id;

    // Le président ajoute les deux marchands comme membres de sa coopérative.
    for (const marchand_id of [marchandActifId, marchandInactifId]) {
      const r = await request(app.getHttpServer())
        .post('/api/v1/cooperatives/membres')
        .set('Authorization', `Bearer ${presidentToken}`)
        .send({ marchand_id, role_membre: 'membre' });
      expect(r.status).toBe(201);
      expect(r.body.success).toBe(true);
    }

    // Activité RÉELLE en base pour le marchand "actif" : 10 ventes sur les 30
    // derniers jours, réparties sur plusieurs jours, avec un vrai volume FCFA.
    await ds.query(
      `INSERT INTO caisse_transactions (user_id, marchand_id, type, montant, description, created_at)
       SELECT $1, $1, 'vente', 15000, 'vente-score-' || g, NOW() - (g || ' days')::interval
       FROM generate_series(1, 10) g`,
      [marchandActifId],
    );
    // Le marchand "inactif" ne reçoit AUCUNE transaction — score légitimement 0.
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('un membre avec activité réelle (ventes) a un scoreJulaba > 0, un membre sans activité reste à 0', async () => {
    const r = await request(app.getHttpServer())
      .get('/api/v1/cooperatives/membres')
      .set('Authorization', `Bearer ${presidentToken}`);
    expect(r.status).toBe(200);
    expect(Array.isArray(r.body.membres)).toBe(true);
    expect(r.body.membres.length).toBe(2);

    const rowActif = r.body.membres.find((m: any) => m.id === marchandActifId);
    const rowInactif = r.body.membres.find((m: any) => m.id === marchandInactifId);
    expect(rowActif).toBeTruthy();
    expect(rowInactif).toBeTruthy();

    // Le champ exposé au front est bien `scoreJulaba` (cf. Membres.tsx:
    // mapApiMembreRowToMembre lit m.scoreJulaba).
    expect(typeof rowActif.scoreJulaba).toBe('number');
    expect(typeof rowInactif.scoreJulaba).toBe('number');

    expect(rowActif.scoreJulaba).toBeGreaterThan(0);
    expect(rowActif.scoreJulaba).toBeLessThanOrEqual(100);
    expect(rowInactif.scoreJulaba).toBe(0);
  });

  it('le scoreJulaba du membre actif est IDENTIQUE au score calculé par GET /scores/me pour ce même utilisateur (source unique)', async () => {
    const membresRes = await request(app.getHttpServer())
      .get('/api/v1/cooperatives/membres')
      .set('Authorization', `Bearer ${presidentToken}`);
    const rowActif = membresRes.body.membres.find((m: any) => m.id === marchandActifId);

    const meRes = await request(app.getHttpServer())
      .get('/api/v1/scores/me')
      .set('Authorization', `Bearer ${marchandActifToken}`);
    expect(meRes.status).toBe(200);

    // Même utilisateur, même activité en base ⇒ ScoresService.getScoresForUsers
    // doit produire EXACTEMENT le même score_total, que l'appel porte sur 1
    // utilisateur (/scores/me) ou sur un lot de membres (/cooperatives/membres).
    expect(rowActif.scoreJulaba).toBe(meRes.body.score.score_total);
    expect(rowActif.scoreJulaba).toBeGreaterThan(0);
  });
});
