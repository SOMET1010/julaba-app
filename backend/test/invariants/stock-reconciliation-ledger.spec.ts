// Invariant — `produits.stock` doit se RECALCULER depuis le ledger.
//
// `produits.stock` est un cache ; `stock_mouvements` est la vérité. Tant que
// personne ne confronte les deux, le cache peut dériver indéfiniment sans que
// rien ne le signale — et TROIS routes le font déjà dériver, sans écrire le
// moindre mouvement.
//
// Ce test ne corrige rien. Il rend l'écart VISIBLE et CHIFFRÉ :
//   1. chemin propre (vente, puis annulation)              → réconcilié
//   2. `PUT /caisse/produits/:id`, la VRAIE route           → écart détecté
//   3. l'ordre du ledger reste déterminable                → pas d'ambiguïté
//
// Le point 2 passe par l'API réelle, pas par un UPDATE fabriqué : c'est ce qui
// prouve que le défaut est atteignable par une marchande, pas seulement en SQL.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import {
  SQL_ECARTS_STOCK_LEDGER,
  SQL_MOUVEMENTS_AMBIGUS,
  verdictReconciliation,
} from '../../src/stocks-rest/reconciliation-stock';

describe('Invariant — stock recalculable depuis le ledger', () => {
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
      .send({ phone: '+2250700000890', firstName: 'Awa', lastName: 'Reconcil', role: 'marchand', genre: 'femme' });
    expect([200, 201]).toContain(su.status);
    token = su.body.accessToken;
    marchandId = su.body.user.id;
    // Même séquence que les autres invariants : le compte sort du signup avec
    // un mot de passe provisoire, et certaines routes l'exigent changé.
    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: '0000', newPassword: '1234' });
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${token}`);
  /** Échoue en NOMMANT la réponse : un `expect(status)` nu ne dit pas pourquoi. */
  const exige2xx = (r: request.Response, quoi: string) => {
    if (r.status >= 400) throw new Error(`${quoi} → HTTP ${r.status} ${JSON.stringify(r.body)}`);
    return r;
  };
  const creerProduit = (nom: string, stock: number) =>
    auth(request(app.getHttpServer()).post('/api/v1/caisse/produits')).send({ nom, stock, prix: 200, unite: 'kg' });
  const vendre = (body: unknown) =>
    auth(request(app.getHttpServer()).post('/api/v1/caisse/vente')).send(body);

  // La requête est GLOBALE (c'est son usage réel : surveiller toute la base).
  // La base d'invariants est partagée entre suites : on ne retient donc que
  // les lignes de CETTE marchande, sinon une autre suite ferait le verdict.
  const bilanDeCetteMarchande = async () => {
    const tous = await ds.query(SQL_ECARTS_STOCK_LEDGER);
    const ecarts = tous.filter((r: { marchand_id: string }) => r.marchand_id === marchandId);
    const ambigusTous = await ds.query(SQL_MOUVEMENTS_AMBIGUS);
    const miens = await ds.query(
      'SELECT id FROM produits WHERE marchand_id = $1::text',
      [marchandId],
    );
    const idsMiens = new Set(miens.map((p: { id: string }) => p.id));
    const ambigus = ambigusTous.filter((a: { produit_id: string }) => idsMiens.has(a.produit_id));
    return { ecarts, ambigus, verdict: verdictReconciliation({ ecarts, ambigus }) };
  };

  it('chemin propre — vente puis annulation : le cache et le ledger concordent', async () => {
    await creerProduit('Igname-REC', 100);
    const v = await vendre({ montant: '4000', produits: [{ nom: 'Igname-REC', quantite: 20 }], idempotency_key: 'REC-1' });
    exige2xx(v, 'POST /caisse/vente');

    let bilan = await bilanDeCetteMarchande();
    expect(bilan.ecarts).toEqual([]);                  // après la vente
    expect(bilan.verdict).toBe('reconcilie');

    const a = await auth(request(app.getHttpServer()).patch(`/api/v1/caisse/transactions/${v.body.transaction.id}/annuler`)).send({});
    expect(a.status).toBe(200);

    bilan = await bilanDeCetteMarchande();
    expect(bilan.ecarts).toEqual([]);                  // après l'annulation
    expect(bilan.verdict).toBe('reconcilie');
  }, 60000);

  it('PUT /caisse/produits/:id modifie le stock SANS mouvement — l’écart est détecté et chiffré', async () => {
    const c = await creerProduit('Manioc-REC', 50);
    const produitId = exige2xx(c, 'POST /caisse/produits').body.produit.id;
    const v = await vendre({ montant: '2000', produits: [{ nom: 'Manioc-REC', quantite: 10 }], idempotency_key: 'REC-2' });
    exige2xx(v, 'POST /caisse/vente');
    expect((await bilanDeCetteMarchande()).verdict).toBe('reconcilie');  // 40, cohérent

    // LA VRAIE ROUTE. Une marchande qui corrige son stock à l'écran passe ici.
    const put = await auth(request(app.getHttpServer()).put(`/api/v1/caisse/produits/${produitId}`)).send({
      nom: 'Manioc-REC', prix: 200, prix_achat: 0, categorie: 'Général', stock: 999, unite: 'kg',
    });
    expect(put.status).toBe(200);

    // Aucun mouvement n'a été écrit : le ledger ignore ces 959 unités.
    const nbMvts = (await ds.query(
      'SELECT count(*)::int n FROM stock_mouvements WHERE produit_id = $1', [produitId],
    ))[0].n;
    expect(nbMvts).toBe(1);                            // la vente, et elle seule

    const bilan = await bilanDeCetteMarchande();
    expect(bilan.verdict).toBe('ecart');
    const ligne = bilan.ecarts.find((e: { produit_id: string }) => e.produit_id === produitId);
    expect(ligne).toBeDefined();
    expect(Number(ligne.stock_attendu)).toBe(40);       // 50 − 10, selon le ledger
    expect(Number(ligne.stock_constate)).toBe(999);     // ce que dit le cache
    expect(Number(ligne.ecart)).toBe(959);              // l'écart, chiffré
  }, 60000);

  it('l’ordre du ledger reste déterminable — aucun mouvement ambigu', async () => {
    // Si ce test tombe, c'est que deux mouvements d'un même produit partagent
    // `created_at` : le « dernier mouvement » devient arbitraire et le verdict
    // de réconciliation n'est plus opposable. Garde-fou de la requête, pas
    // décoration.
    const bilan = await bilanDeCetteMarchande();
    expect(bilan.ambigus).toEqual([]);
  }, 60000);
});
