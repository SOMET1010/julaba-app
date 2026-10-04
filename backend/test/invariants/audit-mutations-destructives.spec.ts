// Invariant — les mutations qui DÉTRUISENT de l'information la journalisent.
//
// PRINCIPE, et c'est lui qui borne ce lot : AUDIT ≠ DUPLICATION DU LEDGER.
// Une vente n'est PAS auditée — sa ligne `caisse_transactions` porte déjà qui,
// quand, combien, et `stock_mouvements` porte `stock_avant` et le delta. Tout
// y est reconstructible. Une dépense non plus, pour la même raison. Un
// ajustement de stock non plus : le ledger le trace déjà (type='ajustement',
// `stock_avant`, `quantite_retranchee`).
//
// Ne sont auditées que les TROIS mutations qui écrasent une valeur EN PLACE,
// sans qu'aucune table métier ne conserve l'ancienne :
//   1. annulation       → le `statut` d'avant disparaît (la ligne est mutée)
//   2. édition produit  → l'ancien prix et l'ancien prix d'achat disparaissent
//   3. désactivation    → l'ancien `default_code` disparaît (mis à NULL)
//
// L'audit n'apporte donc QUE ce qui manque : qui, quand, l'action, et la
// valeur d'avant. Rien d'autre.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';

describe('Invariant — audit des mutations destructives', () => {
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
      .send({ phone: '+2250700000893', firstName: 'Awa', lastName: 'Audit', role: 'marchand', genre: 'femme' });
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
  const creerProduit = (nom: string, stock: number, prix = 200, prixAchat = 120) =>
    auth(request(app.getHttpServer()).post('/api/v1/caisse/produits'))
      .send({ nom, stock, prix, prix_achat: prixAchat, unite: 'kg' });
  const vendre = (body: unknown) =>
    auth(request(app.getHttpServer()).post('/api/v1/caisse/vente')).send(body);
  /**
   * Lignes d'audit de CETTE marchande, pour une action donnée.
   *
   * ATTENTE BORNÉE, et ce n'est pas une rustine : `journaliser()` est
   * volontairement « fire-and-forget » — l'audit n'est PAS sur le chemin
   * critique de l'argent, donc la réponse HTTP revient sans l'attendre.
   * Lire `audit_logs` immédiatement après la requête perd donc la course,
   * de façon intermittente (mesuré : 2 échecs sur 3 sous charge). On attend
   * la ligne, au lieu de rendre le produit synchrone pour faire plaisir au
   * test.
   */
  const attendreAudits = async (action: string, entiteId?: string, minimum = 1, msMax = 3000) => {
    const limite = Date.now() + msMax;
    let lignes = await audits(action, entiteId);
    while (lignes.length < minimum && Date.now() < limite) {
      await new Promise((r) => setTimeout(r, 50));
      lignes = await audits(action, entiteId);
    }
    return lignes;
  };

  /** Lecture BRUTE, sans attente — pour prouver une ABSENCE. */
  const audits = (action: string, entiteId?: string) =>
    ds.query(
      `SELECT action, entite, entite_id, details, user_id, created_at
         FROM audit_logs
        WHERE user_id = $1::text AND action = $2 ${entiteId ? 'AND entite_id = $3' : ''}
        ORDER BY created_at DESC`,
      entiteId ? [marchandId, action, entiteId] : [marchandId, action],
    );

  it('1. annulation — ancien statut, nouveau statut, motif, transaction, utilisateur', async () => {
    await creerProduit('Taro-AUD', 20);
    const v = exige2xx(await vendre({ montant: '1000', produits: [{ nom: 'Taro-AUD', quantite: 5 }], idempotency_key: 'AUD-1' }), 'vente');
    const txId = v.body.transaction.id;

    exige2xx(await auth(request(app.getHttpServer()).patch(`/api/v1/caisse/transactions/${txId}/annuler`)).send(), 'annulation');

    const lignes = await attendreAudits('transaction.annulee', txId);
    expect(lignes).toHaveLength(1);
    expect(lignes[0].entite).toBe('caisse_transaction');
    expect(lignes[0].entite_id).toBe(txId);
    expect(lignes[0].user_id).toBe(marchandId);
    expect(lignes[0].details).toEqual(
      expect.objectContaining({ statut_avant: 'validee', statut_apres: 'annulee', motif: expect.any(String) }),
    );
  }, 60000);

  it('2. edition produit — ancien et nouveau prix, ancien et nouveau prix d’achat', async () => {
    const id = exige2xx(await creerProduit('Riz-AUD', 10, 500, 300), 'creation').body.produit.id;
    exige2xx(await auth(request(app.getHttpServer()).put(`/api/v1/caisse/produits/${id}`)).send({
      nom: 'Riz-AUD', prix: 750, prix_achat: 400, categorie: 'Général', stock: 10, unite: 'kg',
    }), 'PUT produit');

    const lignes = await attendreAudits('produit.modifie', id);
    expect(lignes).toHaveLength(1);
    expect(lignes[0].entite).toBe('produit');
    expect(lignes[0].details).toEqual(expect.objectContaining({
      prix_avant: 500, prix_apres: 750, prix_achat_avant: 300, prix_achat_apres: 400,
    }));
  }, 60000);

  it('2b. une edition qui ne touche NI prix NI prix d’achat n’ecrit rien', async () => {
    const id = exige2xx(await creerProduit('Fonio-AUD', 4, 900, 600), 'creation').body.produit.id;
    exige2xx(await auth(request(app.getHttpServer()).put(`/api/v1/caisse/produits/${id}`)).send({
      nom: 'Fonio-AUD renomme', prix: 900, prix_achat: 600, categorie: 'Général', stock: 4, unite: 'kg',
    }), 'PUT produit (prix inchanges)');
    // Rien n'a ete detruit : un audit ici serait du bruit. Delai FIXE avant
    // de conclure a l'absence — sinon on ne prouverait que notre impatience.
    await new Promise((r) => setTimeout(r, 400));
    expect(await audits('produit.modifie', id)).toHaveLength(0);
  }, 60000);

  it('3. desactivation — ancien default_code et bascule de `actif`', async () => {
    await ds.query(
      `INSERT INTO catalogue_maitre (default_code, nom, categorie, odoo_product_id, actif)
       VALUES ($1,$2,$3,$4,true) ON CONFLICT (default_code) DO NOTHING`,
      ['VIV-AUD-001', 'Igname Kponan AUD', 'JULABA / Tubercules', 90002],
    );
    const a = exige2xx(
      await auth(request(app.getHttpServer()).post('/api/v1/catalogue-maitre/adopter'))
        .send({ default_code: 'VIV-AUD-001', prix: 700, unite: 'kg' }), 'adoption');
    const id = a.body.produit.id;

    exige2xx(await auth(request(app.getHttpServer()).delete(`/api/v1/caisse/produits/${id}`)).send(), 'DELETE produit');

    const lignes = await attendreAudits('produit.desactive', id);
    expect(lignes).toHaveLength(1);
    expect(lignes[0].details).toEqual(expect.objectContaining({
      default_code_avant: 'VIV-AUD-001', actif_avant: true, actif_apres: false,
    }));
  }, 60000);

  it('CE QUI N’EST PAS AUDITE, et c’est voulu : la vente et la depense', async () => {
    await creerProduit('Mais-AUD', 50);
    exige2xx(await vendre({ montant: '2000', produits: [{ nom: 'Mais-AUD', quantite: 10 }], idempotency_key: 'AUD-2' }), 'vente');
    exige2xx(await auth(request(app.getHttpServer()).post('/api/v1/caisse/depense'))
      .send({ montant: '300', description: 'transport', idempotency_key: 'AUD-3' }), 'depense');

    // Tout y est deja reconstructible : la ligne `caisse_transactions` porte
    // qui/quand/combien, et `stock_mouvements` porte `stock_avant` + le delta.
    await new Promise((r) => setTimeout(r, 400));
    expect(await audits('vente.enregistree')).toHaveLength(0);
    expect(await audits('depense.enregistree')).toHaveLength(0);
    const mvts = await ds.query(
      `SELECT stock_avant, quantite_retranchee FROM stock_mouvements
        WHERE marchand_id = $1::text AND produit_nom = 'Mais-AUD'`, [marchandId]);
    expect(mvts).toHaveLength(1);
    expect(Number(mvts[0].stock_avant)).toBe(50);          // l'avant EST dans le ledger
    expect(Number(mvts[0].quantite_retranchee)).toBe(10);  // le delta aussi
  }, 60000);
});
