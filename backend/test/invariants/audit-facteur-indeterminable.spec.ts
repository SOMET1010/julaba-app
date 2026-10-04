// AUDIT DE DONNÉES — le facteur de conversion est-il retrouvable a posteriori ?
//
// LA QUESTION POSÉE : « quels produits se déclarent en sac, panier, tas, et
// combien de lignes une migration du facteur impacterait-elle ? »
//
// CE QUE CE FICHIER ÉTABLIT : la question est SANS RÉPONSE sur les données
// existantes, et ce n'est pas un manque de finesse d'analyse — c'est une
// collision arithmétique exacte. On ne le soutient pas par un raisonnement :
// on fabrique la collision par le VRAI chemin d'écriture (POST /recoltes avec
// ce que RecolteForm envoie) et on constate que les lignes sont identiques.
//
// Ce test tourne contre le schéma D'AUJOURD'HUI (sans la saisie brute). Il
// documente donc l'état de la production au moment de l'audit, et il devra
// rester vert ensuite : le passé ne redevient pas déductible.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';

// Table de facteurs GLOBALE de RecolteForm.tsx:169-175 — l'objet de l'audit.
const FACTEUR = { kg: 1, tonne: 1000, sac: 100, tas: 50, cagette: 20, panier: 10, botte: 0.5 };

/** Ce que RecolteForm envoie RÉELLEMENT au serveur, aujourd'hui, sur `main`. */
function ceQueLEcranEnvoie(saisie: { quantite: number; unite: keyof typeof FACTEUR; prix: number }) {
  const f = FACTEUR[saisie.unite];
  return {
    quantite: Math.round(saisie.quantite * f * 10) / 10,   // quantiteEnKg
    unite: 'kg',                                            // EN DUR — le défaut
    prix_unitaire: Math.round((saisie.prix / f) * 100) / 100, // prixParKg
  };
}

describe('Audit — le facteur d’une récolte passée est indéterminable', () => {
  let app: INestApplication;
  let ds: DataSource;
  let token: string;
  let producteurId: string;

  // QUATRE réalités de terrain DIFFÉRENTES, de même valeur marchande.
  // Une productrice de riz qui vend pour 15 000 FCFA peut dire sa récolte de
  // quatre façons ; une seule est « 100 kilos ».
  const QUATRE_REALITES = [
    { libelle: '1 sac de riz à 15 000 F le sac',      quantite: 1,   unite: 'sac' as const,    prix: 15000 },
    { libelle: '2 tas de riz à 7 500 F le tas',       quantite: 2,   unite: 'tas' as const,    prix: 7500 },
    { libelle: '10 paniers de riz à 1 500 F le panier', quantite: 10, unite: 'panier' as const, prix: 1500 },
    { libelle: '100 kilos de riz à 150 F le kilo',    quantite: 100, unite: 'kg' as const,     prix: 150 },
  ];

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
      .send({ phone: '+2250700000896', firstName: 'Awa', lastName: 'Audit', role: 'producteur', genre: 'femme' });
    expect([200, 201]).toContain(su.status);
    token = su.body.accessToken;
    producteurId = su.body.user.id;
    // Le mot de passe par défaut doit être changé avant tout appel métier
    // (même garde que les autres specs d'invariants).
    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: '0000', newPassword: '1234' });

    // On déclare les quatre réalités par le VRAI chemin.
    for (const r of QUATRE_REALITES) {
      const rep = await request(app.getHttpServer())
        .post('/api/v1/recoltes')
        .set('Authorization', `Bearer ${token}`)
        .send({
          produit: 'Riz',
          qualite: 'standard',
          date_recolte: '2026-10-01',
          ...ceQueLEcranEnvoie(r),
        });
      expect([200, 201]).toContain(rep.status);
    }
  }, 90000);

  afterAll(async () => { if (app) await app.close(); });

  const lignesRiz = () => ds.query(
    `SELECT quantite::text AS quantite, unite, prix_unitaire::text AS prix_unitaire
       FROM recoltes WHERE produit = 'Riz' ORDER BY created_at`,
  );

  it('les quatre réalités s’écrivent en QUATRE LIGNES IDENTIQUES', async () => {
    const lignes = await lignesRiz();
    expect(lignes).toHaveLength(4);

    // Le cœur de l'audit : la signature stockée est la MÊME pour les quatre.
    const signatures = new Set(lignes.map((l: Record<string, string>) =>
      `${Number(l.quantite)}|${l.unite}|${Number(l.prix_unitaire)}`));
    expect([...signatures]).toEqual(['100|kg|150']);
    expect(signatures.size).toBe(1);
  });

  it('l’argent, lui, est juste dans les quatre cas — le défaut porte sur le POIDS', async () => {
    const lignes = await lignesRiz();
    for (const [i, r] of QUATRE_REALITES.entries()) {
      const valeurReelle = r.quantite * r.prix;              // ce que la vente vaut
      const valeurStockee = Number(lignes[i].quantite) * Number(lignes[i].prix_unitaire);
      expect(valeurStockee).toBeCloseTo(valeurReelle, 2);
      expect(valeurReelle).toBe(15000);
    }
  });

  // Périmètre : les lignes écrites PAR LE VRAI CHEMIN dans ce test. On ne mesure
  // pas toute la table — d'autres suites d'invariants y insèrent aussi, et un
  // test qui casse à cause d'une suite voisine ne prouve plus rien.
  it('`recoltes.unite` est une CONSTANTE : la colonne ne distingue rien', async () => {
    const [r] = await ds.query(
      `SELECT count(*)::int AS lignes, count(DISTINCT unite)::int AS distinctes,
              string_agg(DISTINCT unite, ',') AS valeurs
         FROM recoltes WHERE user_id = $1`, [producteurId],
    );
    expect(r.lignes).toBeGreaterThan(1);
    expect(r.distinctes).toBe(1);
    expect(r.valeurs).toBe('kg');
  });

  // ── POURQUOI AUCUNE INFÉRENCE NE SAUVE LA SITUATION ───────────────────────
  // On pourrait espérer deviner le facteur par divisibilité : « 100 est
  // divisible par 100, donc c'était un sac ». Mais le facteur « kg » vaut 1, et
  // 1 divise tout. L'hypothèse « elle a tapé N kilos » reste donc valide sur
  // CHAQUE ligne, et aucune autre ne peut être écartée.
  it('l’hypothèse « kg » reste compatible avec 100 % des lignes', async () => {
    const [r] = await ds.query(
      `SELECT count(*)::int AS lignes,
              count(*) FILTER (WHERE quantite::numeric = round(quantite::numeric))::int AS compatibles_kg
         FROM recoltes WHERE quantite IS NOT NULL AND user_id = $1`, [producteurId],
    );
    expect(r.lignes).toBeGreaterThan(0);
    expect(r.compatibles_kg).toBe(r.lignes);
  });

  it('plusieurs facteurs restent simultanément compatibles : rien n’est départagé', async () => {
    const [r] = await ds.query(
      `SELECT count(*) FILTER (WHERE mod(quantite::numeric, 100) = 0)::int AS sac,
              count(*) FILTER (WHERE mod(quantite::numeric, 50)  = 0)::int AS tas,
              count(*) FILTER (WHERE mod(quantite::numeric, 10)  = 0)::int AS panier
         FROM recoltes WHERE produit = 'Riz'`,
    );
    // Les quatre lignes sont compatibles avec sac ET tas ET panier ET kg.
    expect(r.sac).toBe(4);
    expect(r.tas).toBe(4);
    expect(r.panier).toBe(4);
  });

  // ── LÀ OÙ L'UNITÉ DU PRODUCTEUR EXISTE VRAIMENT ───────────────────────────
  // `stocks` (écran producteur/Stocks.tsx, coopérative) laisse CHOISIR l'unité
  // et la conserve. C'est la seule source de vérité existante sur « quel
  // produit se compte en quoi » — mais elle ne convertit jamais en kilos.
  // Défaut miroir : `recoltes` convertit sans conserver, `stocks` conserve
  // sans convertir.
  it('`stocks` conserve l’unité choisie — et aucun facteur ne lui est attaché', async () => {
    const cols = await ds.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name = 'stocks' AND column_name IN ('unite', 'quantite')`,
    );
    expect(cols.map((c: { column_name: string }) => c.column_name).sort()).toEqual(['quantite', 'unite']);

    // Aucune colonne de poids normalisé, nulle part : la conversion n'existe pas
    // de ce côté. Ce n'est pas un oubli de l'audit, c'est le constat.
    const poids = await ds.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name = 'stocks'
          AND (column_name LIKE '%kg%' OR column_name LIKE '%facteur%' OR column_name LIKE '%poids%')`,
    );
    expect(poids).toEqual([]);
  });

  // Les unités que les écrans de stock proposent, mais pour lesquelles AUCUN
  // facteur n'est défini. « régimes » est le cas le plus coûteux : c'est la
  // banane plantain, et un régime pèse de 8 à 30 kg selon la variété.
  it('quatre unités du vocabulaire partagé n’ont aucun facteur', () => {
    const UNITES_COURANTES = ['kg', 'sac', 'tonne', 'tas', 'régimes', 'carton', 'L', 'pièce'];
    const sansFacteur = UNITES_COURANTES.filter((u) => !(u.toLowerCase() in FACTEUR));
    expect(sansFacteur).toEqual(['régimes', 'carton', 'L', 'pièce']);
  });
});
