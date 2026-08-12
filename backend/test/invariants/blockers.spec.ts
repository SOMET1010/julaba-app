// Invariants des BLOCKERS argent — état 🔴 attendu (spécification exécutable).
//
// Ces tests décrivent le comportement ATTENDU (cible). Tant que le code métier
// n'est pas corrigé (étape 4), ils ÉCHOUENT — c'est voulu : ils sont marqués
// `it.failing`, donc « verts tant que le blocker est ouvert », et deviendront
// rouges (échec CI) dès qu'un correctif les satisfait, forçant leur promotion
// en `it(...)` dans la même PR. Aucun correctif métier ici.
//
// Chaque test a d'abord été exécuté en `it` normal pour confirmer qu'il échoue
// bien SUR L'INVARIANT (pas sur le seed), avant bascule en `it.failing`.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';

describe('Invariants blockers argent (🔴 attendu — it.failing)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let token: string;
  let marchandId: string;

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
      .send({ phone: '+2250700000034', firstName: 'Awa', lastName: 'Blk', role: 'marchand', genre: 'femme' });
    expect([200, 201]).toContain(su.status);
    token = su.body.accessToken;
    marchandId = su.body.user.id;
    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: '0000', newPassword: '1234' });
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${token}`);
  const creerCredit = (body: any) => auth(request(app.getHttpServer()).post('/api/v1/caisse/credits')).send(body);
  const nbCredits = async (client: string) =>
    (await ds.query('SELECT count(*)::int n FROM credits WHERE marchand_id=$1 AND client_nom=$2', [marchandId, client]))[0].n;
  const montantDu = async (client: string) =>
    Number((await ds.query('SELECT montant_du FROM clients WHERE marchand_id=$1 AND nom=$2', [marchandId, client]))[0]?.montant_du);
  const acompteOf = async (id: string) =>
    Number((await ds.query('SELECT acompte FROM credits WHERE id=$1', [id]))[0]?.acompte);
  const nbTxType = async (type: string) =>
    (await ds.query('SELECT count(*)::int n FROM caisse_transactions WHERE user_id=$1 AND type=$2', [marchandId, type]))[0].n;

  // I3 est désormais 🟢 et couvert par i1-i3-atomicite-stock.spec.ts.

  // I4 — Idempotence de la création de crédit.
  it.failing('I4 — même crédit rejoué ⇒ une seule dette (montant_du non doublé)', async () => {
    const client = 'Client-I4';
    const payload = { client_nom: client, montant_total: '5000', acompte: '0', echeance: '2027-12-31', idempotency_key: 'I4-K' };
    await creerCredit(payload);
    await creerCredit(payload); // rejeu identique
    expect(await nbCredits(client)).toBe(1);
    expect(await montantDu(client)).toBe(5000);
  }, 30000);

  // I5 — Idempotence de l'acompte.
  it.failing('I5 — acompte rejoué ⇒ un seul encaissement', async () => {
    const c = await creerCredit({ client_nom: 'Client-I5', montant_total: '4000', acompte: '0', echeance: '2027-12-31' });
    const id = c.body.credit.id;
    const payer = () =>
      auth(request(app.getHttpServer()).patch(`/api/v1/caisse/credits/${id}/acompte`)).send({ montant: 1000, idempotency_key: 'I5-K' });
    await payer();
    await payer(); // rejeu même clé
    expect(await acompteOf(id)).toBe(1000);
  }, 30000);

  // I6 — Traçabilité comptable du crédit.
  it.failing('I6 — une vente à crédit laisse une trace en caisse (caisse_transaction)', async () => {
    const avant = await nbTxType('credit');
    await creerCredit({ client_nom: 'Client-I6', montant_total: '3000', acompte: '0', echeance: '2027-12-31' });
    const apres = await nbTxType('credit');
    expect(apres).toBeGreaterThan(avant);
  }, 30000);
});
