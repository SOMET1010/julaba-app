// Invariant — supprimer un article ne doit jamais effacer son histoire.
//
// `stock_mouvements` est un ledger append-only qui référence `produit_id` sans
// clé étrangère. Effacer la ligne de `produits` laisse donc le ledger pointer
// dans le vide : l'historique survit (le nom est dénormalisé) mais le stock
// n'est plus recalculable pour ce produit, et annuler une vente de cet article
// rend l'argent SANS rendre le stock (`stock-restitution.ts:47`).
//
// Trois propriétés, qui forment un seul sujet : « supprimer un article ».
//   1. la suppression désactive, elle n'efface pas          (risque #4)
//   2. un article désactivé disparaît de TOUS les écrans    (incohérence existante)
//   3. une référence Odoo redevient adoptable après retrait (blocage existant)
//
// Les points 2 et 3 n'ont pas été introduits par ce lot : ils EXISTENT déjà,
// parce que `DELETE /caisse/produits/:id` désactive depuis toujours
// (`caisse-rest.controller.ts:658`) alors que `GET /stocks` ne filtre pas
// `actif` et que le contrôle de doublon d'adoption ne le filtre pas non plus.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';

describe('Invariant — supprimer un article ne detruit pas son histoire', () => {
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
      .send({ phone: '+2250700000891', firstName: 'Awa', lastName: 'Suppr', role: 'marchand', genre: 'femme' });
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
  const vendre = (body: unknown) =>
    auth(request(app.getHttpServer()).post('/api/v1/caisse/vente')).send(body);
  const ligneProduit = async (id: string) =>
    (await ds.query('SELECT id, actif, default_code FROM produits WHERE id = $1', [id]))[0];
  const nbMouvements = async (id: string) =>
    (await ds.query('SELECT count(*)::int n FROM stock_mouvements WHERE produit_id = $1', [id]))[0].n;

  it('1. DELETE /stocks/:id DESACTIVE l’article, il ne l’efface pas', async () => {
    const produitId = exige2xx(await creerProduit('Taro-SUP', 30), 'POST /caisse/produits').body.produit.id;
    exige2xx(await vendre({ montant: '1000', produits: [{ nom: 'Taro-SUP', quantite: 5 }], idempotency_key: 'SUP-1' }), 'POST /caisse/vente');
    expect(await nbMouvements(produitId)).toBe(1);

    const d = await auth(request(app.getHttpServer()).delete(`/api/v1/stocks/${produitId}`)).send();
    expect(d.status).toBe(200);

    const ligne = await ligneProduit(produitId);
    expect(ligne).toBeDefined();          // la ligne SURVIT…
    expect(ligne.actif).toBe(false);      // …desactivee
    expect(await nbMouvements(produitId)).toBe(1); // et le ledger reste rattachable
  }, 60000);

  it('2. un article desactive disparait de GET /stocks', async () => {
    const produitId = exige2xx(await creerProduit('Gombo-SUP', 12), 'POST /caisse/produits').body.produit.id;
    exige2xx(await auth(request(app.getHttpServer()).delete(`/api/v1/caisse/produits/${produitId}`)).send(), 'DELETE /caisse/produits');
    expect((await ligneProduit(produitId)).actif).toBe(false);

    const liste = exige2xx(await auth(request(app.getHttpServer()).get('/api/v1/stocks')).send(), 'GET /stocks');
    const ids = (liste.body.stocks || []).map((s: { id: string }) => s.id);
    expect(ids).not.toContain(produitId);
  }, 60000);

  it('3. une reference Odoo redevient adoptable apres retrait', async () => {
    await ds.query(
      `INSERT INTO catalogue_maitre (default_code, nom, categorie, odoo_product_id, actif)
       VALUES ($1,$2,$3,$4,true) ON CONFLICT (default_code) DO NOTHING`,
      ['VIV-SUP-001', 'Igname Kponan SUP', 'JULABA / Tubercules', 90001],
    );
    const adopter = () =>
      auth(request(app.getHttpServer()).post('/api/v1/catalogue-maitre/adopter'))
        .send({ default_code: 'VIV-SUP-001', prix: 700, unite: 'kg' });

    const a1 = exige2xx(await adopter(), 'adoption 1');
    const produitId = a1.body.produit.id;

    exige2xx(await auth(request(app.getHttpServer()).delete(`/api/v1/caisse/produits/${produitId}`)).send(), 'DELETE /caisse/produits');

    // Elle a retire l'article : la reference ne compte plus parmi ses adoptees…
    const adoptees = exige2xx(await auth(request(app.getHttpServer()).get('/api/v1/catalogue-maitre/adoptees')).send(), 'GET adoptees');
    expect(adoptees.body.codes || []).not.toContain('VIV-SUP-001');
    // …et elle peut la reprendre. Sinon l'article est invisible ET interdit.
    const a2 = await adopter();
    expect([200, 201]).toContain(a2.status);
  }, 60000);
});
