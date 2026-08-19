// Invariant Fidélité — cycle complet paramétrage → points → seuil → récompense.
//
// Propriété attendue (🟢) : le barème est réellement PERSISTÉ (relu après un
// redémarrage de contexte HTTP), un achat qualifiant crédite RÉELLEMENT des
// points au client (fidelite_clients), le seuil déclenche l'éligibilité, et
// l'octroi d'une récompense DÉDUIT les points ET laisse une trace IMMUABLE
// dans le journal `fidelite_evenements` (Constitution §5 — jamais une simple
// mutation de colonne sans preuve). Idempotence : rejouer la MÊME clé (gain ou
// récompense) ne doit ni recréditer, ni redébiter, ni dupliquer l'événement.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';

describe('Invariant Fidélité — cycle réel paramétrage→points→seuil→récompense (🟢 attendu)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let token: string;
  let marchandId: string;

  const PHONE_MARCHAND = '+2250700000099';
  const TEL_CLIENT = '+2250711223344';

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    await app.get(DbInitService, { strict: false }).runInit();

    const su = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({ phone: PHONE_MARCHAND, firstName: 'Awa', lastName: 'Fidelite', role: 'marchand', genre: 'femme' });
    expect([200, 201]).toContain(su.status);
    token = su.body.accessToken;
    marchandId = su.body.user.id;
    expect(token).toBeTruthy();

    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: '0000', newPassword: '1234' });
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  const auth = () => request(app.getHttpServer());
  const evenementsEnBase = async (type?: string) => {
    const rows = type
      ? await ds.query(
          `SELECT * FROM fidelite_evenements WHERE marchand_id = $1::uuid AND type = $2 ORDER BY created_at`,
          [marchandId, type],
        )
      : await ds.query(`SELECT * FROM fidelite_evenements WHERE marchand_id = $1::uuid ORDER BY created_at`, [marchandId]);
    return rows;
  };

  it('1) le barème paramétré est réellement PERSISTÉ (relecture indépendante)', async () => {
    const put = await auth()
      .put('/api/v1/fidelite/config')
      .set('Authorization', `Bearer ${token}`)
      .send({ actif: true, points_par_cent: 2, seuil_points: 10, recompense_fcfa: 500 });
    expect(put.status).toBe(200);
    expect(put.body.config).toEqual({ actif: true, points_par_cent: 2, seuil_points: 10, recompense_fcfa: 500 });

    // Relecture indépendante en base — pas seulement la réponse de l'API.
    const row = await ds.query('SELECT * FROM fidelite_config WHERE marchand_id = $1::uuid', [marchandId]);
    expect(row[0]).toBeTruthy();
    expect(Number(row[0].points_par_cent)).toBe(2);
    expect(Number(row[0].seuil_points)).toBe(10);
    expect(Number(row[0].recompense_fcfa)).toBe(500);

    const get = await auth().get('/api/v1/fidelite/config').set('Authorization', `Bearer ${token}`);
    expect(get.body.config).toEqual(put.body.config);
  });

  it('2) un achat qualifiant crédite RÉELLEMENT des points (fidelite_clients + journal)', async () => {
    const r = await auth()
      .post('/api/v1/fidelite/gagner')
      .set('Authorization', `Bearer ${token}`)
      .send({ telephone: TEL_CLIENT, montant: 300, nom: 'Client Test', idempotency_key: 'gain-1' });
    expect(r.status).toBe(201);
    expect(r.body.pointsGagnes).toBe(6); // 300 FCFA / 100 * 2 points
    expect(Number(r.body.client.points)).toBe(6);
    expect(r.body.recompenseDisponible).toBe(false);

    const clientRow = await ds.query(
      'SELECT * FROM fidelite_clients WHERE marchand_id = $1::uuid AND telephone = $2',
      [marchandId, TEL_CLIENT],
    );
    expect(Number(clientRow[0].points)).toBe(6);
    expect(Number(clientRow[0].total_achats)).toBe(300);

    const gains = await evenementsEnBase('gain');
    expect(gains.length).toBe(1);
    expect(Number(gains[0].points_delta)).toBe(6);
    expect(Number(gains[0].points_apres)).toBe(6);
    expect(Number(gains[0].montant_achat)).toBe(300);
  });

  it('3) rejouer la MÊME clé d’idempotence ne recrédite JAMAIS (rejeu réseau sans danger)', async () => {
    const r = await auth()
      .post('/api/v1/fidelite/gagner')
      .set('Authorization', `Bearer ${token}`)
      .send({ telephone: TEL_CLIENT, montant: 300, nom: 'Client Test', idempotency_key: 'gain-1' });
    expect(r.status).toBe(201);
    expect(Number(r.body.client.points)).toBe(6); // inchangé, pas 12

    const gains = await evenementsEnBase('gain');
    expect(gains.length).toBe(1); // toujours un seul événement, pas deux
  });

  it('4) le seuil atteint déclenche l’éligibilité à la récompense', async () => {
    const r = await auth()
      .post('/api/v1/fidelite/gagner')
      .set('Authorization', `Bearer ${token}`)
      .send({ telephone: TEL_CLIENT, montant: 400, idempotency_key: 'gain-2' }); // +8 points => 14
    expect(r.status).toBe(201);
    expect(Number(r.body.client.points)).toBe(14);
    expect(r.body.recompenseDisponible).toBe(true);

    const gains = await evenementsEnBase('gain');
    expect(gains.length).toBe(2);
  });

  it('5) la récompense accordée DÉDUIT les points ET laisse une trace immuable', async () => {
    const r = await auth()
      .post('/api/v1/fidelite/utiliser')
      .set('Authorization', `Bearer ${token}`)
      .send({ telephone: TEL_CLIENT, idempotency_key: 'recompense-1' });
    expect(r.status).toBe(201);
    expect(r.body.remise).toBe(500);
    expect(Number(r.body.client.points)).toBe(4); // 14 - seuil(10)

    const clientRow = await ds.query(
      'SELECT points FROM fidelite_clients WHERE marchand_id = $1::uuid AND telephone = $2',
      [marchandId, TEL_CLIENT],
    );
    expect(Number(clientRow[0].points)).toBe(4);

    const recompenses = await evenementsEnBase('recompense');
    expect(recompenses.length).toBe(1);
    expect(Number(recompenses[0].points_delta)).toBe(-10);
    expect(Number(recompenses[0].points_apres)).toBe(4);
    expect(Number(recompenses[0].remise_fcfa)).toBe(500);

    // L'historique exposé (preuve consultable, pas seulement une trace interne).
    const hist = await auth()
      .get(`/api/v1/fidelite/evenements?tel=${encodeURIComponent(TEL_CLIENT)}`)
      .set('Authorization', `Bearer ${token}`);
    expect(hist.status).toBe(200);
    expect(hist.body.evenements.length).toBe(3); // 2 gains + 1 récompense
  });

  it('6) rejouer la clé de récompense ne déduit JAMAIS deux fois', async () => {
    const r = await auth()
      .post('/api/v1/fidelite/utiliser')
      .set('Authorization', `Bearer ${token}`)
      .send({ telephone: TEL_CLIENT, idempotency_key: 'recompense-1' });
    expect(r.status).toBe(201);
    expect(Number(r.body.client.points)).toBe(4); // toujours 4, pas -6

    const recompenses = await evenementsEnBase('recompense');
    expect(recompenses.length).toBe(1);
  });

  it('7) sous le seuil, la récompense est REFUSÉE (aucun octroi, aucune trace créée)', async () => {
    const avant = (await evenementsEnBase('recompense')).length;
    const r = await auth()
      .post('/api/v1/fidelite/utiliser')
      .set('Authorization', `Bearer ${token}`)
      .send({ telephone: TEL_CLIENT, idempotency_key: 'recompense-refusee' });
    expect(r.status).toBe(400);
    const apres = (await evenementsEnBase('recompense')).length;
    expect(apres).toBe(avant); // aucune ligne fantôme
  });
});
