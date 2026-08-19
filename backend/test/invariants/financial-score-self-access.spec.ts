// Invariant Score Financier Réel (GET /financial-score/:userId) — non-régression
// d'accès et de forme de réponse.
//
// Contexte (lot « palier de microcrédit réel ») : le palier/montant affiché à
// l'utilisateur dans l'app doit désormais provenir de ce VRAI score financier
// (FinancialScoreService, 0-1000, seuils 200/400/600/800 → 0/50k/200k/500k FCFA),
// et non d'une reconversion approximative du score de gamification (0-100).
// Ce test ne touche à aucune écriture d'argent : lecture seule.
//
// Propriétés attendues (🟢) :
//  - un marchand authentifié peut consulter SON PROPRE score financier
//    (GET /financial-score/:userId avec userId = son propre id) → 200 ;
//  - la réponse contient bien `montantEligible` (nombre) et `niveau`, les deux
//    champs consommés par le nouvel écran de détail frontend ;
//  - un marchand NE PEUT PAS consulter le score financier d'un AUTRE utilisateur
//    (pas de régression sur le contrôle d'accès self-or-admin déjà en place).

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';

describe('Invariant Score Financier Réel — accès self et forme de réponse (🟢 attendu)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let marchandId: string;
  let marchandToken: string;
  let autreMarchandId: string;
  let autreMarchandToken: string;

  const PHONE_MARCHAND = '+2250700000301';
  const PHONE_AUTRE = '+2250700000302';

  const signup = async (phone: string, role: string, firstName: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({ phone, firstName, lastName: 'FinScoreTest', role, genre: 'femme' });
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

    const marchand = await signup(PHONE_MARCHAND, 'marchand', 'Aminata');
    marchandId = marchand.id;
    marchandToken = marchand.token;

    const autre = await signup(PHONE_AUTRE, 'marchand', 'Fatou');
    autreMarchandId = autre.id;
    autreMarchandToken = autre.token;

    // Activité réelle en base pour que le score ne soit pas trivialement à 0
    // (non requis par l'invariant, mais rend le test plus représentatif).
    await ds.query(
      `INSERT INTO caisse_transactions (user_id, marchand_id, type, montant, produit, description, created_at)
       SELECT $1, $1, 'vente', 15000, 'igname', 'vente-finscore-' || g, NOW() - (g || ' days')::interval
       FROM generate_series(1, 5) g`,
      [marchandId],
    );
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it("un marchand authentifié consulte SON PROPRE score financier réel (self) → 200, avec montantEligible et niveau", async () => {
    const r = await request(app.getHttpServer())
      .get(`/api/v1/financial-score/${marchandId}`)
      .set('Authorization', `Bearer ${marchandToken}`);

    expect(r.status).toBe(200);
    expect(r.body.userId).toBe(marchandId);
    expect(typeof r.body.scoreTotal).toBe('number');
    expect(r.body.scoreTotal).toBeGreaterThanOrEqual(0);
    expect(r.body.scoreTotal).toBeLessThanOrEqual(1000);
    expect(typeof r.body.montantEligible).toBe('number');
    expect([0, 50_000, 200_000, 500_000]).toContain(r.body.montantEligible);
    expect(typeof r.body.niveau).toBe('string');
    expect(['Excellent', 'Bon', 'Moyen', 'Faible', 'Insuffisant']).toContain(r.body.niveau);
    expect(typeof r.body.recommandation).toBe('string');
    expect(r.body.dimensions).toBeTruthy();
  });

  it("un marchand NE PEUT PAS consulter le score financier d'un AUTRE utilisateur (contrôle d'accès self-or-admin inchangé)", async () => {
    const r = await request(app.getHttpServer())
      .get(`/api/v1/financial-score/${autreMarchandId}`)
      .set('Authorization', `Bearer ${marchandToken}`);

    expect(r.status).toBe(403);
  });

  it('sans authentification, la route est refusée (401)', async () => {
    const r = await request(app.getHttpServer()).get(`/api/v1/financial-score/${marchandId}`);
    expect(r.status).toBe(401);
  });
});
