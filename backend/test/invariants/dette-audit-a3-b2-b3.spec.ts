// ═══════════════════════════════════════════════════════════════════════════
// CES TESTS DÉCRIVENT DES DÉFAUTS. ILS NE LES APPROUVENT PAS.
//
// Arbitrage de Patrick, 19/09/2026 : les trois derniers constats de l'audit
// base (A3, B2, B3) sont VÉRIFIÉS, pas corrigés. La règle était stricte — pas
// de correction parce que « ça semble faux » : il fallait une preuve
// reproductible du type entrée réelle → persistance réelle → RÉSULTAT FAUX
// OBSERVÉ. Ces tests sont cette preuve, et rien d'autre.
//
// Ils affirment donc le comportement ACTUEL, celui qui est faux. C'est
// délibéré : tant que la dette existe, la suite reste verte et exécutable ; le
// jour où quelqu'un corrige, CE TEST ÉCHOUERA — et ce rouge-là voudra dire
// « le défaut est réparé, mets ce fichier et docs/dette/ à jour », pas
// « régression ».
//
// Numéros dans la plage RÉSERVÉE (+22507888800xx) — cf. le garde-fou
// backend/test/unit/telephones-tests-uniques.spec.ts.
// ═══════════════════════════════════════════════════════════════════════════

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { LedgerMouvementType1780400000000 } from '../../src/database/migrations/1780400000000-LedgerMouvementType';

describe('DETTE — constats A3 / B2 / B3 vérifiés, non corrigés', () => {
  let app: INestApplication;
  let ds: DataSource;
  let token: string;
  let marchandId: string;

  const PHONE = '+2250788880006';
  const api = () => request(app.getHttpServer());
  const auth = () => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    await app.get(DbInitService, { strict: false }).runInit();

    // ─────────────────────────────────────────────────────────────────────
    // CETTE RUSTINE EST ELLE-MÊME LA PREUVE DU CONSTAT B1.
    //
    // Sans elle, `GET /stocks/mouvements` répond 500 : « column sm.type does
    // not exist ». La colonne `type` du ledger n'est créée NI par le CREATE
    // TABLE de DbInit, NI par `synchronize` (la table n'a pas d'entité), NI par
    // la chaîne de migrations (qui ne tourne pas sur une base vierge :
    // schema-flags -> synchronize:true, migrationsRun:false).
    //
    // Le seul endroit qui la crée est cette migration — que
    // `annulation-remise-stock.spec.ts` applique déjà de la même façon, dans
    // son propre beforeAll. Autrement dit : LE TEST QUI AURAIT DÛ ATTRAPER LE
    // DÉFAUT RÉPARE LE SCHÉMA POUR SE RENDRE VERT. En production, sur une base
    // neuve, personne ne le fait.
    //
    // Je l'applique ici pour pouvoir vérifier B2 et B3 sur un schéma complet.
    // Sans cette ligne, B2 et B3 ne sont pas vérifiables — ils sont MASQUÉS par
    // un défaut plus grave.
    // ─────────────────────────────────────────────────────────────────────
    {
      const qr = ds.createQueryRunner();
      await new LedgerMouvementType1780400000000().up(qr);
      await qr.release();
    }

    const su = await api()
      .post('/api/v1/auth/signup')
      .send({ phone: PHONE, firstName: 'Awa', lastName: 'Dette', role: 'marchand', genre: 'femme' });
    expect([200, 201]).toContain(su.status);
    token = su.body.accessToken;
    marchandId = su.body.user.id;
    await api().post('/api/v1/auth/change-password').set(auth())
      .send({ oldPassword: '0000', newPassword: '1234' });
  }, 90000);

  afterAll(async () => { if (app) await app.close(); });

  // ── B2 ────────────────────────────────────────────────────────────────────
  // L'unité d'un mouvement PASSÉ est relue dans le catalogue d'AUJOURD'HUI.
  // `stocks-rest.controller.ts` : LEFT JOIN produits p ... SELECT p.unite.
  // Le ledger fige `produit_nom`, mais PAS l'unité.
  // Viole la règle 2 de la doctrine : ne jamais faire dépendre l'historique de
  // l'état actuel du catalogue. La leçon a été tirée côté VENTE (l'unité est
  // figée dans caisse_transactions.details depuis le 19/09) et pas côté STOCK.
  describe('B2 — changer l’unité d’un produit réécrit le sens de son historique', () => {
    const PRODUIT = 'Piment-B2';
    let produitId: string;

    it('lundi : 5 tas sortent du stock, le mouvement dit « tas »', async () => {
      const p = await api().post('/api/v1/caisse/produits').set(auth())
        .send({ nom: PRODUIT, stock: 12, prix: 150, prix_achat: 100, unite: 'tas' });
      expect([200, 201]).toContain(p.status);
      produitId = p.body.produit.id;

      const v = await api().post('/api/v1/caisse/vente').set(auth())
        .send({ montant: '750', produits: [{ nom: PRODUIT, quantite: 5, productId: produitId }],
                idempotency_key: 'DETTE-B2-001' });
      expect([200, 201]).toContain(v.status);

      const m = await api().get('/api/v1/stocks/mouvements').set(auth());
      expect(m.status).toBe(200);
      const ligne = m.body.mouvements.find((x: any) => x.produit_nom === PRODUIT || x.name === PRODUIT);
      expect(ligne).toBeTruthy();
      expect(JSON.stringify(ligne)).toContain('tas');
    });

    it('mercredi : elle passe le produit au kilo — et le mouvement de LUNDI dit « kg »', async () => {
      const u = await api().put(`/api/v1/caisse/produits/${produitId}`).set(auth())
        .send({ nom: PRODUIT, prix: 800, prix_achat: 600, categorie: 'legumes', stock: 7, unite: 'kg' });
      expect([200, 201]).toContain(u.status);

      const m = await api().get('/api/v1/stocks/mouvements').set(auth());
      const ligne = m.body.mouvements.find((x: any) => x.produit_nom === PRODUIT || x.name === PRODUIT);
      expect(ligne).toBeTruthy();
      // DÉFAUT OBSERVÉ : aucune vente n'a bougé, et 5 tas sont devenus 5 kg.
      expect(JSON.stringify(ligne)).toContain('kg');
      expect(JSON.stringify(ligne)).not.toContain('tas');
    });
  });

  // ── B3 ────────────────────────────────────────────────────────────────────
  // `manquant` est écrit à chaque vente et lu par PERSONNE, et la seule requête
  // de lecture du ledger filtre `AND sm.quantite_retranchee <> 0`. Une vente
  // entièrement hors stock produit retranchee = 0 : la ligne est écrite, puis
  // exclue de l'affichage. Le commentaire du code annonce l'inverse (« I3 :
  // jamais de clamp silencieux — le manquant est explicitement journalisé »).
  // Il est journalisé ; il n'est jamais ressorti.
  describe('B3 — une vente hors stock est journalisée puis rendue invisible', () => {
    const PRODUIT = 'Igname-B3';

    it('vendre 4 kg avec 0 en stock : le ledger le sait, l’écran ne le montre pas', async () => {
      const p = await api().post('/api/v1/caisse/produits').set(auth())
        .send({ nom: PRODUIT, stock: 0, prix: 400, prix_achat: 300, unite: 'kg' });
      expect([200, 201]).toContain(p.status);

      const v = await api().post('/api/v1/caisse/vente').set(auth())
        .send({ montant: '1600', produits: [{ nom: PRODUIT, quantite: 4, productId: p.body.produit.id }],
                idempotency_key: 'DETTE-B3-001' });
      expect([200, 201]).toContain(v.status);

      // La ligne EXISTE en base, et elle dit la vérité : 4 demandés, 0 retranchés.
      const [ledger] = await ds.query(
        `SELECT quantite_demandee::float AS demandee, quantite_retranchee::float AS retranchee,
                manquant::float AS manquant
           FROM stock_mouvements WHERE marchand_id = $1::text AND produit_nom = $2`,
        [marchandId, PRODUIT],
      );
      expect(ledger).toBeTruthy();
      expect(ledger.demandee).toBe(4);
      expect(ledger.retranchee).toBe(0);
      expect(ledger.manquant).toBe(4);

      // DÉFAUT OBSERVÉ : l'écran « Derniers mouvements » ne la montre pas.
      const m = await api().get('/api/v1/stocks/mouvements').set(auth());
      const ligne = m.body.mouvements.find((x: any) => x.produit_nom === PRODUIT || x.name === PRODUIT);
      expect(ligne).toBeUndefined();
    });
  });

  // ── A3 ────────────────────────────────────────────────────────────────────
  // `caisseTheorique` = fond + ventes − dépenses, sur `caisse_transactions`
  // SEULEMENT. Or un acompte de crédit est de l'ARGENT REÇU qui n'écrit AUCUNE
  // caisse_transaction (credits.controller.ts ne touche que la table credits).
  // Le téléphone, lui, compte les acomptes dans sa caisse. Les deux nombres
  // divergent donc du montant des acomptes du jour — et le serveur journalise
  // un « écart de fermeture » sur une journée où rien ne manque.
  //
  // Aggravant : la réponse de `POST /caisse/session/fermer` porte bien
  // `caisse_theorique` et `ecart`, mais le client la JETTE, et aucun écran ne
  // lit ces colonnes. La marchande ne voit jamais l'écart que l'audit conserve.
  //
  // LATENT EN PILOTE : le crédit est désactivé (CAISSE_CREDIT_ACTIF = false).
  // À re-tester impérativement avant toute réactivation.
  describe('A3 — un acompte de crédit est de l’argent reçu que la clôture ignore', () => {
    it('l’acompte n’écrit AUCUNE transaction de caisse', async () => {
      const c = await api().post('/api/v1/caisse/credits').set(auth())
        .send({ client_nom: 'Mariam-A3', montant_total: 5000, echeance: '2026-12-31' });
      expect([200, 201]).toContain(c.status);
      const creditId = c.body.credit.id;

      const avant = await ds.query(
        `SELECT count(*)::int AS n FROM caisse_transactions WHERE marchand_id = $1`, [marchandId]);

      const a = await api().patch(`/api/v1/caisse/credits/${creditId}/acompte`).set(auth())
        .send({ montant: 2000 });
      expect([200, 201]).toContain(a.status);

      const apres = await ds.query(
        `SELECT count(*)::int AS n FROM caisse_transactions WHERE marchand_id = $1`, [marchandId]);

      // DÉFAUT OBSERVÉ : 2 000 F sont entrés dans la caisse, et la caisse n'en
      // sait rien. Le compte de transactions n'a pas bougé.
      expect(apres[0].n).toBe(avant[0].n);
    });

    it('la clôture journalise donc un écart alors que rien ne manque', async () => {
      const [theorique] = await ds.query(
        `SELECT COALESCE(SUM(montant) FILTER (WHERE type='vente'   AND statut <> 'annulee'),0)::float
              - COALESCE(SUM(montant) FILTER (WHERE type='depense'),0)::float AS mouvement
           FROM caisse_transactions
          WHERE marchand_id = $1 AND created_at::date = CURRENT_DATE`, [marchandId]);

      // Elle a en main ce que le serveur sait, PLUS les 2 000 F de l'acompte.
      const enMain = theorique.mouvement + 2000;
      const f = await api().post('/api/v1/caisse/session/fermer').set(auth())
        .send({ comptage_reel: enMain, notes: 'clôture A3' });
      expect([200, 201]).toContain(f.status);

      // DÉFAUT OBSERVÉ : un écart de +2 000 F est stocké et journalisé comme un
      // incident, sur une journée parfaitement en ordre.
      expect(Number(f.body.ecart)).toBe(2000);

      const [session] = await ds.query(
        `SELECT ecart::float AS ecart FROM caisse_sessions
          WHERE marchand_id = $1 AND date = CURRENT_DATE`, [marchandId]);
      expect(session.ecart).toBe(2000);
    });
  });
});
