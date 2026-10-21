// STK-04 / A-05 — LE RÉASSORT EST UN ACHAT : il laisse une TRACE dans le
// ledger `stock_mouvements` (arbitrage A-05 pris en délégation, 20/10/2026).
//
// Trou constaté (STK-04, reconfirmé par l'audit workflow officiel 20/10,
// DET-01) : le « Réapprovisionner » de GestionStock passait par
// `PATCH /stocks/:id` qui écrivait le stock en direct — SANS UNE ligne dans
// le ledger append-only : ni prix d'achat, ni fournisseur, ni entrée
// horodatée « achat ». Une entrée de stock a un coût : sans trace, la marge
// réelle du détaillant est fausse (l'argent ne ment jamais).
//
// Propriétés vérifiées (🟢 attendu) :
//  - STK-04-a : une hausse de stock (5 → 12) écrit UNE ligne type 'achat',
//    delta correct (+5), retranchée négative (convention mapper), unité
//    figée du produit, fournisseur et coût tels que déclarés.
//  - STK-04-b : le rejeu avec la MÊME clé d'idempotence ne double PAS la
//    ligne (l'achat n'est jamais compté deux fois).
//  - STK-04-c : une BAISSE de stock (correction manuelle) n'écrit PAS
//    d'achat ; un PATCH sans quantité (édition prix) n'écrit RIEN.
//  - STK-04-d : produit non suivi (stock NULL) — pas d'achat inventé
//    (fail-honest : on ne peut pas calculer le delta, on ne prétend rien).
//  - STK-04-e : la lecture du ledger expose fournisseur et cout_total.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ThrottlerStorage } from '@nestjs/throttler';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';

describe('Invariant STK-04 — le réassort entre dans le ledger comme ACHAT (🟢 attendu)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let marchandToken: string;
  let produitId: string;
  let produitNonSuiviId: string;

  const api = () => request(app.getHttpServer());

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

    // Marchand réel via l'inscription publique (mot de passe acteur 0000 → levé).
    const signup = await api()
      .post('/api/v1/auth/signup')
      .send({ phone: '+2250700000501', firstName: 'Awa', lastName: 'Stk04', role: 'marchand', genre: 'femme' });
    expect([200, 201]).toContain(signup.status);
    marchandToken = signup.body.accessToken as string;
    await api()
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${marchandToken}`)
      .send({ oldPassword: '0000', newPassword: '1234' });

    // Deux produits : un suivi (stock 5, unité kg), un que l'on passera non suivi.
    const p1 = await api()
      .post('/api/v1/stocks')
      .set('Authorization', `Bearer ${marchandToken}`)
      .send({ nom: 'Riz STK04', quantite: 5, prix: 500, unite: 'kg' });
    expect([200, 201]).toContain(p1.status);
    produitId = p1.body.id;

    const p2 = await api()
      .post('/api/v1/stocks')
      .set('Authorization', `Bearer ${marchandToken}`)
      .send({ nom: 'Sucre STK04', quantite: 2, prix: 700, unite: 'sac' });
    expect([200, 201]).toContain(p2.status);
    produitNonSuiviId = p2.body.id;
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('STK-04-a : une hausse de stock écrit UNE ligne achat — delta, unité, fournisseur, coût', async () => {
    const r = await api()
      .patch(`/api/v1/stocks/${produitId}`)
      .set('Authorization', `Bearer ${marchandToken}`)
      .send({ quantite: 12, fournisseur: 'Marché de Bouaké', cout_total: 9000, idempotency_key: 'stk04-achat-1' });
    expect([200, 201]).toContain(r.status);
    expect(r.body.success).toBe(true);

    // Le stock a bien été écrit.
    const stocks = await api().get('/api/v1/stocks').set('Authorization', `Bearer ${marchandToken}`);
    const produit = (stocks.body.stocks || []).find((s: any) => s.id === produitId);
    expect(produit).toBeTruthy();
    expect(Number(produit.quantite)).toBe(12);

    const mouvements = await api()
      .get(`/api/v1/stocks/${produitId}/mouvements`)
      .set('Authorization', `Bearer ${marchandToken}`);
    expect(mouvements.status).toBe(200);
    const achats = (mouvements.body.mouvements || []).filter((m: any) => m.type === 'achat');
    expect(achats.length).toBe(1);
    const achat = achats[0];
    // Delta SIGNÉ : rentré = positif (5 → 12, soit +7).
    expect(Number(achat.quantite)).toBe(7);
    // Unité FIGÉE au mouvement (celle du produit au moment de l'écriture).
    expect(achat.unite).toBe('kg');
    // Trace d'achat déclarée.
    expect(achat.fournisseur).toBe('Marché de Bouaké');
    expect(Number(achat.cout_total)).toBe(9000);
  });

  it('STK-04-b : le rejeu avec la même clé d\u2019idempotence ne double PAS l\u2019achat', async () => {
    const r = await api()
      .patch(`/api/v1/stocks/${produitId}`)
      .set('Authorization', `Bearer ${marchandToken}`)
      .send({ quantite: 12, fournisseur: 'Marché de Bouaké', cout_total: 9000, idempotency_key: 'stk04-achat-1' });
    expect([200, 201]).toContain(r.status);
    expect(r.body.replayed).toBe(true);

    const mouvements = await api()
      .get(`/api/v1/stocks/${produitId}/mouvements`)
      .set('Authorization', `Bearer ${marchandToken}`);
    const achats = (mouvements.body.mouvements || []).filter((m: any) => m.type === 'achat');
    expect(achats.length).toBe(1);
  });

  it('STK-04-c : une baisse de stock et une édition sans quantité n\u2019écrivent PAS d\u2019achat', async () => {
    // Baisse manuelle 12 → 8 : hors périmètre A-05, aucun achat.
    await api()
      .patch(`/api/v1/stocks/${produitId}`)
      .set('Authorization', `Bearer ${marchandToken}`)
      .send({ quantite: 8, idempotency_key: 'stk04-baisse-1' });
    // Édition prix sans quantité : pas un mouvement.
    await api()
      .patch(`/api/v1/stocks/${produitId}`)
      .set('Authorization', `Bearer ${marchandToken}`)
      .send({ prix: 550, idempotency_key: 'stk04-prix-1' });

    const mouvements = await api()
      .get(`/api/v1/stocks/${produitId}/mouvements`)
      .set('Authorization', `Bearer ${marchandToken}`);
    const achats = (mouvements.body.mouvements || []).filter((m: any) => m.type === 'achat');
    expect(achats.length).toBe(1);
  });

  it('STK-04-d : produit non suivi (stock NULL) — pas d\u2019achat inventé (fail-honest)', async () => {
    // On rend le produit « non suivi » (stock NULL — état distinct du zéro,
    // cf. correctifs 20/10 sur untracked vs zéro).
    await ds.query(`UPDATE produits SET stock = NULL WHERE id = $1`, [produitNonSuiviId]);

    const r = await api()
      .patch(`/api/v1/stocks/${produitNonSuiviId}`)
      .set('Authorization', `Bearer ${marchandToken}`)
      .send({ quantite: 6, idempotency_key: 'stk04-nonsuivi-1' });
    expect([200, 201]).toContain(r.status);

    const mouvements = await api()
      .get(`/api/v1/stocks/${produitNonSuiviId}/mouvements`)
      .set('Authorization', `Bearer ${marchandToken}`);
    const achats = (mouvements.body.mouvements || []).filter((m: any) => m.type === 'achat');
    // On ne peut pas calculer le delta depuis un stock inconnu : pas de ligne,
    // donc pas de mensonge (le suivi démarre, l'achat déclaré restera optionnel).
    expect(achats.length).toBe(0);
  });
});
