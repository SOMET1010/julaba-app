// Invariant — LECTURE trésorerie coopérative et stock personnel (GET ne
// plante jamais en 500 pour un utilisateur légitime).
//
// Contexte (recette du 2026-08-20) : `GET /cooperatives/tresorerie` et
// `GET /stocks` répondaient tous deux 500 en production. Deux défauts
// distincts, tous deux des désalignements schéma/requête jamais détectés en
// intégration :
//
//  1) `cooperative_transactions` — la table que le contrôleur trésorerie lit
//     et écrit en SQL brut — n'existait dans AUCUN des deux chemins de
//     construction du schéma (ni une entité TypeORM pour `synchronize` sur
//     base neuve, ni une migration pour une base existante) : toute
//     résolution de coopérative faisait planter la requête en
//     "relation does not exist" (QueryFailedError, 500).
//
//  2) `GET /stocks` — le repli sur la table `stocks` (utilisateur sans ligne
//     dans `produits` : cooperateur, producteur, ou marchand tout juste
//     inscrit) castait le paramètre en `::uuid` alors que la colonne
//     `stocks.proprietaire_id` est `character varying` — Postgres refuse la
//     comparaison ("operator does not exist: character varying = uuid",
//     42883, 500).
//
// Ce test prouve, contre un vrai Postgres et via l'API HTTP réelle, que les
// deux GET répondent 200 avec des données cohérentes (vides tant qu'aucune
// écriture n'a eu lieu — jamais de donnée inventée), et que le cycle
// écriture -> lecture fonctionne réellement pour la trésorerie.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';

describe('Invariant — Lecture trésorerie coopérative et stock (jamais de 500)', () => {
  let app: INestApplication;
  const api = () => request(app.getHttpServer());

  // Plage de téléphones distincte de tout ce qui existe déjà dans les autres
  // specs invariants (vérifié via grep -rhoE "\+2250[0-9]{9}" avant écriture).
  const PHONE_PRESIDENT = '+2250700096001';
  const PHONE_PRODUCTEUR = '+2250700096002';

  let presidentToken: string;
  let producteurToken: string;

  const signup = async (phone: string, role: string, firstName: string) => {
    const res = await api()
      .post('/api/v1/auth/signup')
      .send({ phone, firstName, lastName: 'TresorerieStock', role, genre: 'femme' });
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
    // Throttler neutralisé : signup + change-password + plusieurs appels GET
    // rapprochés déclenchent sinon des 429 (cf. stock-commun-cooperative.spec.ts).
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
    await app.get(DbInitService, { strict: false }).runInit();

    // Signup role=cooperateur crée AUTOMATIQUEMENT sa coopérative
    // (responsable_id = son id) — cf. AuthService.signup.
    const president = await signup(PHONE_PRESIDENT, 'cooperateur', 'Solange');
    presidentToken = president.token;

    const producteur = await signup(PHONE_PRODUCTEUR, 'producteur', 'Kouamé');
    producteurToken = producteur.token;
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('GET /cooperatives/tresorerie répond 200 (pas 500) pour le président d\'une coopérative fraîchement créée', async () => {
    const res = await api()
      .get('/api/v1/cooperatives/tresorerie')
      .set('Authorization', `Bearer ${presidentToken}`);
    expect(res.status).toBe(200);
    // Rien n'a encore été écrit : réponse vide et cohérente, jamais de donnée inventée.
    expect(res.body).toEqual({ solde: 0, entrees: 0, sorties: 0, transactions: [] });
  });

  it('le cycle écriture -> lecture de la trésorerie fonctionne réellement (POST puis PATCH reflétés par GET)', async () => {
    const entree = await api()
      .post('/api/v1/cooperatives/tresorerie')
      .set('Authorization', `Bearer ${presidentToken}`)
      .send({ type: 'entree', categorie: 'cotisation', montant: 5000, description: 'Test invariant' });
    expect(entree.status).toBe(201);
    expect(entree.body.success).toBe(true);
    expect(entree.body.transaction.statut).toBe('en_attente');
    const txId = entree.body.transaction.id as string;

    // En attente : ne compte pas encore dans le solde.
    const avantValidation = await api()
      .get('/api/v1/cooperatives/tresorerie')
      .set('Authorization', `Bearer ${presidentToken}`);
    expect(avantValidation.status).toBe(200);
    expect(avantValidation.body.solde).toBe(0);
    expect(avantValidation.body.transactions.length).toBe(1);

    const validation = await api()
      .patch(`/api/v1/cooperatives/tresorerie/${txId}`)
      .set('Authorization', `Bearer ${presidentToken}`)
      .send({ statut: 'validee' });
    expect(validation.status).toBe(200);
    expect(validation.body.success).toBe(true);

    const apresValidation = await api()
      .get('/api/v1/cooperatives/tresorerie')
      .set('Authorization', `Bearer ${presidentToken}`);
    expect(apresValidation.status).toBe(200);
    expect(apresValidation.body.solde).toBe(5000);
    expect(apresValidation.body.entrees).toBe(5000);
    expect(apresValidation.body.sorties).toBe(0);
  });

  it("GET /stocks répond 200 (pas 500) pour un producteur sans aucun produit — repli sur la table `stocks`", async () => {
    // Un producteur fraîchement inscrit n'a aucune ligne dans `produits` :
    // le contrôleur retombe sur la table `stocks`, filtrée par
    // `proprietaire_id`. C'est CE chemin précis qui plantait (cast ::uuid
    // sur une colonne varchar).
    const res = await api()
      .get('/api/v1/stocks')
      .set('Authorization', `Bearer ${producteurToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ stocks: [] });
  });

  it('le cycle écriture -> lecture du stock personnel fonctionne réellement (POST puis GET)', async () => {
    const creation = await api()
      .post('/api/v1/stocks')
      .set('Authorization', `Bearer ${producteurToken}`)
      .send({ produit: 'Igname-Test-Invariant', quantite: 42, unite: 'kg', prix: 300, prix_achat: 150 });
    expect(creation.status).toBe(201);
    expect(creation.body.produit).toBe('Igname-Test-Invariant');

    const lecture = await api()
      .get('/api/v1/stocks')
      .set('Authorization', `Bearer ${producteurToken}`);
    expect(lecture.status).toBe(200);
    const ligne = (lecture.body.stocks || []).find((s: any) => s.produit === 'Igname-Test-Invariant');
    expect(ligne).toBeTruthy();
    expect(Number(ligne.quantite)).toBe(42);
  });
});
