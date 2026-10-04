// Invariant — aucune modification de stock n'est muette.
//
// Deux routes vivantes changeaient `produits.stock` sans écrire au ledger :
// `PUT /caisse/produits/:id` et `PATCH /stocks/:id`. Le stock n'était alors
// plus recalculable, et `reconciliation-stock.ts` le constatait sans pouvoir
// l'empêcher. Ici on vérifie la cause, pas le symptôme : toute route qui
// bouge le stock LAISSE UNE LIGNE, et la réconciliation reste verte.
//
// Troisième cas, tout aussi important : une route qui NE change PAS le stock
// n'écrit RIEN. Un ledger qui enregistre des non-événements devient illisible.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { SQL_ECARTS_STOCK_LEDGER } from '../../src/stocks-rest/reconciliation-stock';

describe('Invariant — toute modification de stock laisse une ligne au ledger', () => {
  let app: INestApplication;
  let ds: DataSource;
  let token: string;
  let marchandId: string;

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
    await app.get(DbInitService, { strict: false }).runInit();

    const su = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({ phone: '+2250700000892', firstName: 'Awa', lastName: 'Ajust', role: 'marchand', genre: 'femme' });
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
  const exige2xx = (r: request.Response, quoi: string) => {
    if (r.status >= 400) throw new Error(`${quoi} → HTTP ${r.status} ${JSON.stringify(r.body)}`);
    return r;
  };
  const creerProduit = (nom: string, stock: number) =>
    auth(request(app.getHttpServer()).post('/api/v1/caisse/produits')).send({ nom, stock, prix: 200, unite: 'kg' });
  const mouvements = (id: string) =>
    ds.query(
      `SELECT type, stock_avant, quantite_demandee, quantite_retranchee, transaction_id
         FROM stock_mouvements WHERE produit_id = $1 ORDER BY created_at, type`, [id]);
  const stockDe = async (id: string) =>
    Number((await ds.query('SELECT stock FROM produits WHERE id = $1', [id]))[0].stock);
  const ecartsDeCetteMarchande = async () =>
    (await ds.query(SQL_ECARTS_STOCK_LEDGER)).filter((r: { marchand_id: string }) => r.marchand_id === marchandId);

  it('PUT /caisse/produits/:id — le stock change, le ledger l’enregistre', async () => {
    const id = exige2xx(await creerProduit('Riz-AJU', 20), 'POST /caisse/produits').body.produit.id;
    exige2xx(await auth(request(app.getHttpServer()).put(`/api/v1/caisse/produits/${id}`)).send({
      nom: 'Riz-AJU', prix: 200, prix_achat: 0, categorie: 'Général', stock: 35, unite: 'kg',
    }), 'PUT /caisse/produits');

    expect(await stockDe(id)).toBe(35);
    const mvts = await mouvements(id);
    expect(mvts).toHaveLength(1);
    expect(mvts[0].type).toBe('ajustement');
    expect(Number(mvts[0].stock_avant)).toBe(20);
    expect(Number(mvts[0].quantite_retranchee)).toBe(-15);   // ajout → négatif
    expect(mvts[0].transaction_id).toBeNull();               // aucune vente derrière
    expect(await ecartsDeCetteMarchande()).toEqual([]);      // réconcilié
  }, 60000);

  it('PATCH /stocks/:id — même garantie', async () => {
    const id = exige2xx(await creerProduit('Mais-AJU', 50), 'POST /caisse/produits').body.produit.id;
    exige2xx(await auth(request(app.getHttpServer()).patch(`/api/v1/stocks/${id}`)).send({ quantite: 8 }), 'PATCH /stocks');

    expect(await stockDe(id)).toBe(8);
    const mvts = await mouvements(id);
    expect(mvts).toHaveLength(1);
    expect(mvts[0].type).toBe('ajustement');
    expect(Number(mvts[0].quantite_retranchee)).toBe(42);    // retrait → positif
    expect(await ecartsDeCetteMarchande()).toEqual([]);
  }, 60000);

  it('une modification qui ne touche PAS le stock n’écrit rien', async () => {
    const id = exige2xx(await creerProduit('Fonio-AJU', 7), 'POST /caisse/produits').body.produit.id;
    exige2xx(await auth(request(app.getHttpServer()).patch(`/api/v1/stocks/${id}`)).send({ prix: 950 }), 'PATCH /stocks (prix seul)');
    expect(await mouvements(id)).toHaveLength(0);

    // Même valeur de stock que l'actuelle : ce n'est pas un événement.
    exige2xx(await auth(request(app.getHttpServer()).patch(`/api/v1/stocks/${id}`)).send({ quantite: 7 }), 'PATCH /stocks (stock inchange)');
    expect(await mouvements(id)).toHaveLength(0);
    expect(await ecartsDeCetteMarchande()).toEqual([]);
  }, 60000);
});
