// Invariants I1 (atomicité vente↔stock) + I3 (survente tracée, jamais bloquée
// ni clampée en silence). État attendu : 🟢 après le correctif (transaction
// unique QueryRunner + FOR UPDATE + ledger stock_mouvements).
//
// Trois scénarios exigés :
//  1) vente normale → caisse + stock + mouvement cohérents ;
//  2) stock 3 / vente 10 → vente persistée, stock 0, manquant 7 tracé ;
//  3) panne forcée pendant l'effet stock → NI vente NI mouvement partiel.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';

describe('Invariants I1 + I3 — atomicité vente↔stock + survente tracée (🟢)', () => {
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
      .send({ phone: '+2250700000056', firstName: 'Awa', lastName: 'Atom', role: 'marchand', genre: 'femme' });
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
  const createProduit = (nom: string, stock: number) =>
    auth(request(app.getHttpServer()).post('/api/v1/caisse/produits')).send({ nom, stock, prix: 200 });
  const vendre = (body: any) => auth(request(app.getHttpServer()).post('/api/v1/caisse/vente')).send(body);
  const stockOf = async (nom: string) =>
    Number((await ds.query('SELECT stock FROM produits WHERE marchand_id=$1::text AND lower(nom)=lower($2)', [marchandId, nom]))[0]?.stock);
  const nbTx = async (key: string) =>
    (await ds.query('SELECT count(*)::int n FROM caisse_transactions WHERE idempotency_key=$1 AND user_id=$2', [key, marchandId]))[0].n;
  const mouvementsTx = async (txId: string) =>
    ds.query('SELECT stock_avant, quantite_demandee, quantite_retranchee, manquant FROM stock_mouvements WHERE transaction_id=$1', [txId]);

  it('scénario 1 — vente normale : caisse + stock + mouvement cohérents', async () => {
    await createProduit('Riz-N', 20);
    const r = await vendre({ montant: '1000', produits: [{ nom: 'Riz-N', quantite: 5 }], idempotency_key: 'N-1' });
    expect([200, 201]).toContain(r.status);
    expect(await stockOf('Riz-N')).toBe(15);
    const mvts = await mouvementsTx(r.body.transaction.id);
    expect(mvts).toHaveLength(1);
    expect(Number(mvts[0].stock_avant)).toBe(20);
    expect(Number(mvts[0].quantite_demandee)).toBe(5);
    expect(Number(mvts[0].quantite_retranchee)).toBe(5);
    expect(Number(mvts[0].manquant)).toBe(0);
  }, 30000);

  it('scénario 2 (I3) — stock 3 / vente 10 : acceptée, stock 0, manquant 7 tracé', async () => {
    await createProduit('Sucre-S', 3);
    const r = await vendre({ montant: '2000', produits: [{ nom: 'Sucre-S', quantite: 10 }], idempotency_key: 'S-2' });
    expect([200, 201]).toContain(r.status); // JAMAIS bloquée
    expect(await stockOf('Sucre-S')).toBe(0); // jamais négatif
    const mvts = await mouvementsTx(r.body.transaction.id);
    expect(mvts).toHaveLength(1);
    expect(Number(mvts[0].stock_avant)).toBe(3);
    expect(Number(mvts[0].quantite_demandee)).toBe(10);
    expect(Number(mvts[0].quantite_retranchee)).toBe(3); // sorti du stock connu
    expect(Number(mvts[0].manquant)).toBe(7); // manquant EXPLICITE (jamais silencieux)
  }, 30000);

  it('scénario 3 (I1) — panne pendant l\'effet stock : NI vente NI mouvement partiel', async () => {
    await createProduit('Mil-P', 50);
    const KEY = 'P-3';
    // Injection de panne au niveau base : toute insertion dans le ledger échoue.
    await ds.query('ALTER TABLE stock_mouvements ADD CONSTRAINT force_fail_test CHECK (false) NOT VALID');
    try {
      const r = await vendre({ montant: '600', produits: [{ nom: 'Mil-P', quantite: 4 }], idempotency_key: KEY });
      expect(r.status).toBeGreaterThanOrEqual(500); // l'erreur d'inventaire n'est pas avalée
    } finally {
      await ds.query('ALTER TABLE stock_mouvements DROP CONSTRAINT force_fail_test');
    }
    // Rollback intégral : aucune vente, aucun mouvement, stock intact.
    expect(await nbTx(KEY)).toBe(0);
    expect(await stockOf('Mil-P')).toBe(50);
    const mvts = await ds.query('SELECT count(*)::int n FROM stock_mouvements WHERE produit_nom=$1', ['Mil-P']);
    expect(mvts[0].n).toBe(0);
  }, 30000);
});
