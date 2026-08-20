// Invariant — STOCK COMMUN DE COOPÉRATIVE (apport, distribution traçable,
// isolation).
//
// Contexte (audit, docs/RESIDUS.md) : `POST /cooperatives/distribution`
// résolvait déjà la coopérative de l'appelant mais n'écrivait RIEN en base
// ensuite (`persisted: false`). Il n'existait AUCUNE table de stock PARTAGÉ
// entre membres d'une coopérative — l'écran "Stock commun" affichait en
// réalité le stock PERSONNEL de l'utilisateur.
//
// Ce test prouve, contre un vrai Postgres et via l'API HTTP réelle, que :
//  1) un apport augmente réellement le stock commun (avant/après, montant exact) ;
//  2) une distribution valide décrémente réellement le stock ET crée un
//     mouvement de traçabilité PAR membre destinataire ;
//  3) une distribution qui dépasse le stock disponible est refusée (>=400),
//     et rien ne bouge (ni le stock, ni les mouvements) — jamais de stock
//     négatif ;
//  4) isolation stricte entre deux coopératives : le stock et les mouvements
//     de la coopérative A ne sont jamais visibles ni modifiables par un appel
//     authentifié comme membre de la coopérative B ;
//  5) une distribution notifie chaque destinataire (table `notifications`,
//     même mécanisme que notifyCommande) ET apparaît dans son historique
//     personnel (GET /cooperatives/mes-distributions) — recette du défaut
//     "distribution reçue invisible côté membre" (ni notif, ni historique) ;
//  6) un membre qui n'appartient à aucune coopérative se voit refuser
//     l'apport (403), jamais de fallback silencieux.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { CooperativeStock } from '../../src/cooperatives-rest/cooperative-stock.entity';
import { CooperativeStockMouvement } from '../../src/cooperatives-rest/cooperative-stock-mouvement.entity';

describe('Invariant — Stock commun coopérative (apport / distribution / isolation)', () => {
  let app: INestApplication;
  let ds: DataSource;
  const api = () => request(app.getHttpServer());

  // Plage de téléphones distincte de tout ce qui existe déjà dans les autres
  // specs invariants (vérifié via grep -rhoE "\+2250[0-9]{9}" avant écriture).
  const PHONE_PRESIDENT_A = '+2250700095001';
  const PHONE_MEMBRE_A1 = '+2250700095002';
  const PHONE_MEMBRE_A2 = '+2250700095003';
  const PHONE_PRESIDENT_B = '+2250700095004';
  const PHONE_MEMBRE_B1 = '+2250700095005';
  const PHONE_HORS_COOP = '+2250700095006';

  let presidentAToken: string;
  let membreA1Token: string;
  let membreA1Id: string;
  let membreA2Token: string;
  let membreA2Id: string;
  let coopAId: string;

  let presidentBToken: string;
  let membreB1Token: string;
  let membreB1Id: string;
  let coopBId: string;

  let horsCoopToken: string;

  const signup = async (phone: string, role: string, firstName: string) => {
    const res = await api()
      .post('/api/v1/auth/signup')
      .send({ phone, firstName, lastName: 'StockCommun', role, genre: 'femme' });
    expect([200, 201]).toContain(res.status);
    const token = res.body.accessToken as string;
    // Mot de passe acteur par défaut « 0000 » + mustChangePassword=true : la
    // garde JWT bloque tout sauf change-password tant qu'il n'est pas levé.
    await api()
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: '0000', newPassword: '1234' });
    return { token, id: res.body.user.id as string };
  };

  beforeAll(async () => {
    // Throttler neutralisé : ce lot teste l'apport/distribution/isolation du
    // stock commun, pas le rate-limiting — plusieurs signups + appels
    // rapprochés déclenchent sinon des 429 (cf. institution-isolation.spec.ts).
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ThrottlerStorage)
      .useValue({
        increment: async () => ({ totalHits: 1, timeToExpire: 60000, isBlocked: false, timeToBlockExpire: 0 }),
      })
      .compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    await app.get(DbInitService, { strict: false }).runInit();

    // Coopérative A : signup role=cooperateur crée AUTOMATIQUEMENT sa
    // coopérative (responsable_id = son id) — cf. AuthService.signup.
    const presidentA = await signup(PHONE_PRESIDENT_A, 'cooperateur', 'Adjoua');
    presidentAToken = presidentA.token;

    const membreA1 = await signup(PHONE_MEMBRE_A1, 'marchand', 'Awa');
    membreA1Token = membreA1.token;
    membreA1Id = membreA1.id;

    const membreA2 = await signup(PHONE_MEMBRE_A2, 'marchand', 'Fatou');
    membreA2Token = membreA2.token;
    membreA2Id = membreA2.id;

    for (const marchand_id of [membreA1Id, membreA2Id]) {
      const r = await api()
        .post('/api/v1/cooperatives/membres')
        .set('Authorization', `Bearer ${presidentAToken}`)
        .send({ marchand_id, role_membre: 'membre' });
      expect(r.status).toBe(201);
      expect(r.body.success).toBe(true);
    }

    const coopARes = await api().get('/api/v1/cooperatives').set('Authorization', `Bearer ${presidentAToken}`);
    coopAId = coopARes.body?.data?.[0]?.id;
    expect(coopAId).toBeTruthy();

    // Coopérative B : périmètre totalement distinct, pour l'invariant d'isolation.
    const presidentB = await signup(PHONE_PRESIDENT_B, 'cooperateur', 'Bintou');
    presidentBToken = presidentB.token;

    const membreB1 = await signup(PHONE_MEMBRE_B1, 'marchand', 'Salimata');
    membreB1Token = membreB1.token;
    membreB1Id = membreB1.id;

    const rB = await api()
      .post('/api/v1/cooperatives/membres')
      .set('Authorization', `Bearer ${presidentBToken}`)
      .send({ marchand_id: membreB1Id, role_membre: 'membre' });
    expect(rB.status).toBe(201);
    expect(rB.body.success).toBe(true);

    const coopBRes = await api().get('/api/v1/cooperatives').set('Authorization', `Bearer ${presidentBToken}`);
    coopBId = coopBRes.body?.data?.[0]?.id;
    expect(coopBId).toBeTruthy();
    expect(coopBId).not.toBe(coopAId);

    // Marchand qui n'a rejoint AUCUNE coopérative.
    const horsCoop = await signup(PHONE_HORS_COOP, 'marchand', 'Kadiatou');
    horsCoopToken = horsCoop.token;
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('1) un apport augmente réellement le stock commun (avant/après, montant exact)', async () => {
    const produit = 'Riz-Test-Apport';

    const avant = await api().get('/api/v1/cooperatives/stock').set('Authorization', `Bearer ${presidentAToken}`);
    expect(avant.status).toBe(200);
    expect((avant.body.stocks || []).find((s: any) => s.produit === produit)).toBeUndefined();

    const apport1 = await api()
      .post('/api/v1/cooperatives/stock/apport')
      .set('Authorization', `Bearer ${membreA1Token}`)
      .send({ produit, quantite: 40, unite: 'kg', categorie: 'cereales' });
    expect(apport1.status).toBe(201);
    expect(apport1.body.success).toBe(true);
    expect(Number(apport1.body.stock.quantite)).toBe(40);

    const apres1 = await api().get('/api/v1/cooperatives/stock').set('Authorization', `Bearer ${presidentAToken}`);
    const ligne1 = (apres1.body.stocks || []).find((s: any) => s.produit === produit);
    expect(ligne1).toBeTruthy();
    expect(Number(ligne1.quantite)).toBe(40);

    // Second apport du même produit : la ligne s'incrémente, elle ne se duplique pas.
    const apport2 = await api()
      .post('/api/v1/cooperatives/stock/apport')
      .set('Authorization', `Bearer ${presidentAToken}`)
      .send({ produit, quantite: 25, unite: 'kg', categorie: 'cereales' });
    expect(apport2.status).toBe(201);
    expect(Number(apport2.body.stock.quantite)).toBe(65);

    const apres2 = await api().get('/api/v1/cooperatives/stock').set('Authorization', `Bearer ${presidentAToken}`);
    const lignes2 = (apres2.body.stocks || []).filter((s: any) => s.produit === produit);
    expect(lignes2.length).toBe(1);
    expect(Number(lignes2[0].quantite)).toBe(65);
  });

  it('2) une distribution valide décrémente réellement le stock et trace un mouvement PAR membre destinataire', async () => {
    const produit = 'Riz-Test-Distribution';

    const apport = await api()
      .post('/api/v1/cooperatives/stock/apport')
      .set('Authorization', `Bearer ${presidentAToken}`)
      .send({ produit, quantite: 100, unite: 'kg', categorie: 'cereales' });
    expect(apport.status).toBe(201);
    expect(Number(apport.body.stock.quantite)).toBe(100);

    const dist = await api()
      .post('/api/v1/cooperatives/distribution')
      .set('Authorization', `Bearer ${presidentAToken}`)
      .send({
        produit,
        distributions: [
          { membreId: membreA1Id, quantite: 30 },
          { membreId: membreA2Id, quantite: 20 },
        ],
      });
    expect(dist.status).toBe(201);
    expect(dist.body.success).toBe(true);
    expect(dist.body.persisted).toBe(true);
    expect(Number(dist.body.stockRestant)).toBe(50);

    const apres = await api().get('/api/v1/cooperatives/stock').set('Authorization', `Bearer ${presidentAToken}`);
    const ligne = (apres.body.stocks || []).find((s: any) => s.produit === produit);
    expect(Number(ligne.quantite)).toBe(50);

    // Traçabilité réelle en base : 1 mouvement d'apport + 2 mouvements de
    // distribution distincts, un par destinataire, avec la bonne quantité.
    const mouvementRepo = ds.getRepository(CooperativeStockMouvement);
    const mouvements = await mouvementRepo.find({ where: { cooperativeId: coopAId, produit } });
    expect(mouvements.length).toBe(3);

    const apportMvt = mouvements.filter((m) => m.type === 'apport');
    expect(apportMvt.length).toBe(1);
    expect(Number(apportMvt[0].quantite)).toBe(100);

    const distMvts = mouvements.filter((m) => m.type === 'distribution');
    expect(distMvts.length).toBe(2);
    const versA1 = distMvts.find((m) => m.membreId === membreA1Id);
    const versA2 = distMvts.find((m) => m.membreId === membreA2Id);
    expect(versA1).toBeTruthy();
    expect(versA2).toBeTruthy();
    expect(Number(versA1!.quantite)).toBe(30);
    expect(Number(versA2!.quantite)).toBe(20);
  });

  it("3) une distribution qui dépasse le stock disponible est refusée (>=400) — rien ne bouge", async () => {
    const produit = 'Riz-Test-Trop';

    const apport = await api()
      .post('/api/v1/cooperatives/stock/apport')
      .set('Authorization', `Bearer ${presidentAToken}`)
      .send({ produit, quantite: 10, unite: 'kg', categorie: 'cereales' });
    expect(apport.status).toBe(201);

    const stockRepo = ds.getRepository(CooperativeStock);
    const mouvementRepo = ds.getRepository(CooperativeStockMouvement);

    const avantLigne = await stockRepo.findOne({ where: { cooperativeId: coopAId, produit } });
    const avantMouvements = await mouvementRepo.count({ where: { cooperativeId: coopAId, produit } });
    expect(Number(avantLigne!.quantite)).toBe(10);
    expect(avantMouvements).toBe(1);

    const dist = await api()
      .post('/api/v1/cooperatives/distribution')
      .set('Authorization', `Bearer ${presidentAToken}`)
      .send({ produit, distributions: [{ membreId: membreA1Id, quantite: 15 }] });
    expect(dist.status).toBeGreaterThanOrEqual(400);

    const apresLigne = await stockRepo.findOne({ where: { cooperativeId: coopAId, produit } });
    const apresMouvements = await mouvementRepo.count({ where: { cooperativeId: coopAId, produit } });
    // Refus intégral : ni le stock ni le journal de mouvements n'ont bougé.
    expect(Number(apresLigne!.quantite)).toBe(10);
    expect(apresMouvements).toBe(1);
  });

  it('4) isolation stricte entre deux coopératives : la coopérative B ne voit ni ne modifie le stock de la coopérative A', async () => {
    const produit = 'Riz-Isolation';

    const apportA = await api()
      .post('/api/v1/cooperatives/stock/apport')
      .set('Authorization', `Bearer ${presidentAToken}`)
      .send({ produit, quantite: 40, unite: 'kg', categorie: 'cereales' });
    expect(apportA.status).toBe(201);

    // La coopérative B ne voit jamais le stock de la coopérative A dans sa
    // propre liste — jamais de fuite entre coopératives.
    const stockB = await api().get('/api/v1/cooperatives/stock').set('Authorization', `Bearer ${presidentBToken}`);
    expect(stockB.status).toBe(200);
    expect((stockB.body.stocks || []).find((s: any) => s.produit === produit)).toBeUndefined();

    // Un appel authentifié comme membre de B tentant de distribuer ce produit
    // ne trouve rien à distribuer sous SON PROPRE périmètre (stock à 0 côté
    // B) : refusé, jamais un accès croisé au stock de A.
    const distDepuisB = await api()
      .post('/api/v1/cooperatives/distribution')
      .set('Authorization', `Bearer ${presidentBToken}`)
      .send({ produit, distributions: [{ membreId: membreB1Id, quantite: 5 }] });
    expect(distDepuisB.status).toBeGreaterThanOrEqual(400);

    // Le stock de A pour ce produit est resté intact — la tentative depuis B
    // ne l'a ni lu avec succès ni modifié.
    const stockRepo = ds.getRepository(CooperativeStock);
    const ligneA = await stockRepo.findOne({ where: { cooperativeId: coopAId, produit } });
    expect(Number(ligneA!.quantite)).toBe(40);

    const ligneB = await stockRepo.findOne({ where: { cooperativeId: coopBId, produit } });
    expect(ligneB).toBeNull();

    const mouvementRepo = ds.getRepository(CooperativeStockMouvement);
    const mouvementsB = await mouvementRepo.count({ where: { cooperativeId: coopBId, produit } });
    expect(mouvementsB).toBe(0);
  });

  it('5) une distribution notifie chaque destinataire ET apparaît dans son historique personnel (GET /cooperatives/mes-distributions)', async () => {
    const produit = 'Riz-Test-Notif';

    const apport = await api()
      .post('/api/v1/cooperatives/stock/apport')
      .set('Authorization', `Bearer ${presidentAToken}`)
      .send({ produit, quantite: 60, unite: 'kg', categorie: 'cereales' });
    expect(apport.status).toBe(201);

    // Avant la distribution : ni notification, ni entrée d'historique côté membre.
    const notifsAvant = await api().get('/api/v1/notifications').set('Authorization', `Bearer ${membreA1Token}`);
    expect(notifsAvant.status).toBe(200);
    expect(
      (notifsAvant.body.notifications || []).some((n: any) => n.type === 'stock_commun_recu' && n.message?.includes(produit)),
    ).toBe(false);

    const histAvant = await api().get('/api/v1/cooperatives/mes-distributions').set('Authorization', `Bearer ${membreA1Token}`);
    expect(histAvant.status).toBe(200);
    expect((histAvant.body.distributions || []).some((d: any) => d.produit === produit)).toBe(false);

    const dist = await api()
      .post('/api/v1/cooperatives/distribution')
      .set('Authorization', `Bearer ${presidentAToken}`)
      .send({
        produit,
        distributions: [
          { membreId: membreA1Id, quantite: 12 },
          { membreId: membreA2Id, quantite: 8 },
        ],
      });
    expect(dist.status).toBe(201);
    expect(dist.body.persisted).toBe(true);

    // Après la distribution : le membre destinataire a UNE notification
    // temps réel (même mécanisme que notifyCommande — table `notifications`)…
    const notifsApres = await api().get('/api/v1/notifications').set('Authorization', `Bearer ${membreA1Token}`);
    expect(notifsApres.status).toBe(200);
    const notifDistribution = (notifsApres.body.notifications || []).find(
      (n: any) => n.type === 'stock_commun_recu' && n.message?.includes(produit),
    );
    expect(notifDistribution).toBeTruthy();
    expect(notifDistribution.message).toContain('12');
    expect(notifDistribution.message).toContain('kg');
    expect(notifDistribution.category).toBe('stock');

    // …ET une entrée dans son historique personnel, avec la bonne quantité —
    // consultable indépendamment de la notification (jamais supprimée/lue).
    const histApres = await api().get('/api/v1/cooperatives/mes-distributions').set('Authorization', `Bearer ${membreA1Token}`);
    expect(histApres.status).toBe(200);
    const entreeA1 = (histApres.body.distributions || []).find((d: any) => d.produit === produit);
    expect(entreeA1).toBeTruthy();
    expect(Number(entreeA1.quantite)).toBe(12);
    expect(entreeA1.unite).toBe('kg');

    // Le second destinataire a SA PROPRE notification et SA PROPRE entrée
    // d'historique, avec SA quantité — pas celle du premier membre.
    const histA2 = await api().get('/api/v1/cooperatives/mes-distributions').set('Authorization', `Bearer ${membreA2Token}`);
    const entreeA2 = (histA2.body.distributions || []).find((d: any) => d.produit === produit);
    expect(entreeA2).toBeTruthy();
    expect(Number(entreeA2.quantite)).toBe(8);

    // Un membre tiers (hors coopérative, jamais destinataire) ne voit rien
    // apparaître dans son propre historique — jamais de fuite entre membres.
    const histTiers = await api().get('/api/v1/cooperatives/mes-distributions').set('Authorization', `Bearer ${horsCoopToken}`);
    expect(histTiers.status).toBe(200);
    expect((histTiers.body.distributions || []).some((d: any) => d.produit === produit)).toBe(false);
  });

  it("6) un membre sans aucune coopérative se voit refuser l'apport (403), jamais de fallback silencieux", async () => {
    const produit = 'Riz-Hors-Coop';

    const res = await api()
      .post('/api/v1/cooperatives/stock/apport')
      .set('Authorization', `Bearer ${horsCoopToken}`)
      .send({ produit, quantite: 5, unite: 'kg' });
    expect(res.status).toBe(403);

    // Aucune écriture fantôme nulle part : ni ligne de stock, ni mouvement,
    // pour ce produit qui n'appartient à aucune coopérative.
    const stockRepo = ds.getRepository(CooperativeStock);
    const mouvementRepo = ds.getRepository(CooperativeStockMouvement);
    const lignes = await stockRepo.count({ where: { produit } });
    const mouvements = await mouvementRepo.count({ where: { produit } });
    expect(lignes).toBe(0);
    expect(mouvements).toBe(0);
  });
});
