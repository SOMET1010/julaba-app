// PROD-05 (BUG-010) — « Revenus » du producteur = argent ENCAISSÉ, pas une
// promesse de paiement.
//
// LE DÉFAUT (audit parcours producteur, 20/10/2026) : ProducteurStatsController
// sommait `SUM(total)` de TOUTES les commandes du vendeur hors annulée/litige,
// sans filtre sur `statut_paiement`. Une commande `confirmee` NON PAYÉE
// gonflait « Revenus totaux » et « Revenus du jour » : le producteur voyait de
// l'argent qui n'était pas dans son wallet — exactement le genre de promesse
// que la doctrine « preuve avant croyance » interdit (voir ARGENT-2 : un
// agrégat montré de l'extérieur doit être une RECETTE).
//
// Correctif : `revenus_total` / `revenus_jour` ne comptent QUE
// statut_paiement='paye' ; le reste est exposé SÉPARÉMENT dans
// `revenus_en_attente` (on ne cache rien, on ne prétend rien).
//
// Propriétés vérifiées (🟢 attendu) :
//  - PROD-05-a : une commande PAYÉE (paye) entre dans revenusTotal.
//  - PROD-05-b : une commande NON PAYÉE (non_paye) n'y entre PAS — elle est
//    dans revenusEnAttente, à hauteur exacte.
//  - PROD-05-c : une commande ANNULÉE ne compte nulle part.
//  - PROD-05-d : « Revenus du jour » suit la même règle (paye uniquement).

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { User } from '../../src/users/entities/user.entity';

// Plage réservée aux suites ARGENT/PROD (+22507888800xx) — cf. le garde-fou
// backend/test/unit/telephones-tests-uniques.spec.ts : la base de test est
// partagée, un numéro déjà pris casse le run groupé.
const PHONE_PRODUCTEUR = '+2250788880044';

const PAYEE = 45000;
const NON_PAYEE = 30000;
const ANNULEE = 20000;

describe('Invariant PROD-05 — les revenus producteur sont encaissés (statut_paiement=paye)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let tokenProducteur: string;
  let producteurId: string;

  let revenusAvant = 0;
  let enAttenteAvant = 0;
  let revenusJourAvant = 0;

  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    jwt = app.get(JwtService);
    await app.get(DbInitService, { strict: false }).runInit();

    // Producteur posé directement en base (l'inscription publique est ouverte,
    // mais un compte posé évite tout couplage au parcours d'activation).
    const repo = ds.getRepository(User);
    const prod: any = await repo.save(repo.create({
      phone: PHONE_PRODUCTEUR, firstName: 'Koffi', lastName: 'ProdStats', genre: 'homme',
      role: 'producteur', status: 'actif', passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    producteurId = prod.id;
    tokenProducteur = await jwt.signAsync(
      { sub: prod.id, phone: prod.phone, role: prod.role },
      { secret: process.env.JWT_SECRET },
    );

    // DELTA : /producteur/stats est un agrégat par producteur (scopé au token),
    // mais on mesure quand même l'état AVANT nos écritures — la base est
    // partagée et un producteur précédent pourrait exister.
    const avant = await api()
      .get('/api/v1/producteur/stats')
      .set('Authorization', `Bearer ${tokenProducteur}`);
    expect(avant.status).toBe(200);
    revenusAvant = Number(avant.body.revenusTotal) || 0;
    enAttenteAvant = Number(avant.body.revenusEnAttente) || 0;
    revenusJourAvant = Number(avant.body.revenusJour) || 0;

    // Trois commandes du vendeur, écritées en base : le CONTRAT testé ici est
    // la requête d'agrégation (le filtre statut_paiement), pas le parcours de
    // création — celui-ci est couvert par les invariants commandes/wallet.
    const seedCommande = (total: number, statut: string, statutPaiement: string) =>
      ds.query(
        `INSERT INTO commandes
           (acheteur_nom, acheteur_telephone, vendeur_id, type, produit, quantite,
            prix_unitaire, total, statut, date_commande, statut_paiement)
         VALUES ('Acheteur Test', '+2250788880045', $1, 'directe', 'Igname', 10, $2, $2, $3, now(), $4)`,
        [producteurId, total, statut, statutPaiement],
      );
    await seedCommande(PAYEE, 'confirmee', 'paye');
    await seedCommande(NON_PAYEE, 'confirmee', 'non_paye');
    await seedCommande(ANNULEE, 'annulee', 'non_paye');
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('PROD-05-a : une commande PAYÉE entre dans revenusTotal', async () => {
    const r = await api()
      .get('/api/v1/producteur/stats')
      .set('Authorization', `Bearer ${tokenProducteur}`);
    expect(r.status).toBe(200);
    const delta = Number(r.body.revenusTotal) - revenusAvant;
    expect(delta).toBe(PAYEE);
  });

  it('PROD-05-b : la commande NON PAYÉE n\u2019y entre PAS — elle est exposée à part', async () => {
    const r = await api()
      .get('/api/v1/producteur/stats')
      .set('Authorization', `Bearer ${tokenProducteur}`);
    expect(r.status).toBe(200);
    // La somme aveugle d'avant le correctif répondait PAYEE + NON_PAYEE :
    // une promesse de paiement présentée comme de l'argent encaissé.
    expect(Number(r.body.revenusTotal) - revenusAvant).not.toBe(PAYEE + NON_PAYEE);
    // Rien n'est caché : l'attente est lisible, à l'unité près.
    expect(Number(r.body.revenusEnAttente) - enAttenteAvant).toBe(NON_PAYEE);
  });

  it('PROD-05-c : une commande ANNULÉE ne compte nulle part', async () => {
    const r = await api()
      .get('/api/v1/producteur/stats')
      .set('Authorization', `Bearer ${tokenProducteur}`);
    expect(r.status).toBe(200);
    expect(Number(r.body.revenusTotal) - revenusAvant).not.toBe(PAYEE + ANNULEE);
    expect(Number(r.body.revenusEnAttente) - enAttenteAvant).not.toBe(NON_PAYEE + ANNULEE);
  });

  it('PROD-05-d : « Revenus du jour » suit la même règle (paye uniquement)', async () => {
    const r = await api()
      .get('/api/v1/producteur/stats')
      .set('Authorization', `Bearer ${tokenProducteur}`);
    expect(r.status).toBe(200);
    const deltaJour = Number(r.body.revenusJour) - revenusJourAvant;
    expect(deltaJour).toBe(PAYEE);
    expect(deltaJour).not.toBe(PAYEE + NON_PAYEE);
  });
});
