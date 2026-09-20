// ═══════════════════════════════════════════════════════════════════════════
// ARGENT-3 — les trois dettes de l'audit base, FERMÉES.
//
// Ce fichier décrivait les défauts. Il décrit maintenant le comportement juste.
//
// Doctrine corrigée par Patrick le 19/09/2026, et c'est elle qui a provoqué ce
// lot : « on ne part pas au terrain avec des dettes connues et atteignables
// simplement parce qu'elles sont documentées. Le terrain ne doit pas servir à
// redécouvrir des défauts déjà compris. »
//
// Les assertions ci-dessous étaient l'exact inverse il y a un commit : c'était
// la preuve reproductible exigée avant toute correction. Les retourner EST le
// test-d'abord de ce lot.
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

    // La rustine qui vivait ici — appliquer la migration du ledger typé pour
    // disposer de `type` — a été RETIRÉE le 19/09/2026 : la colonne est
    // désormais posée par DbInit, le seul mécanisme garanti en production.
    // C'était le constat B1, et il est corrigé.

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
  describe('B2 — un mouvement passé garde SON unité passée', () => {
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

    it('mercredi : elle passe le produit au kilo — le mouvement de LUNDI dit toujours « tas »', async () => {
      const u = await api().put(`/api/v1/caisse/produits/${produitId}`).set(auth())
        .send({ nom: PRODUIT, prix: 800, prix_achat: 600, categorie: 'legumes', stock: 7, unite: 'kg' });
      expect([200, 201]).toContain(u.status);

      const m = await api().get('/api/v1/stocks/mouvements').set(auth());
      const ligne = m.body.mouvements.find((x: any) => x.produit_nom === PRODUIT || x.name === PRODUIT);
      expect(ligne).toBeTruthy();
      // L'unité est FIGÉE au mouvement, comme elle l'est à la vente depuis le
      // 19/09. Aucune vente n'a bougé : 5 tas restent 5 tas.
      expect(ligne.unite).toBe('tas');
    });
  });

  // ── B3 ────────────────────────────────────────────────────────────────────
  // `manquant` est écrit à chaque vente et lu par PERSONNE, et la seule requête
  // de lecture du ledger filtre `AND sm.quantite_retranchee <> 0`. Une vente
  // entièrement hors stock produit retranchee = 0 : la ligne est écrite, puis
  // exclue de l'affichage. Le commentaire du code annonce l'inverse (« I3 :
  // jamais de clamp silencieux — le manquant est explicitement journalisé »).
  // Il est journalisé ; il n'est jamais ressorti.
  describe('B3 — une vente hors stock se VOIT', () => {
    const PRODUIT = 'Igname-B3';

    it('vendre 4 kg avec 0 en stock : l’écran le montre, et dit que le stock ne couvrait pas', async () => {
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

      // Elle a bien vendu 4 kg : c'est une réalité économique, on ne la masque
      // pas parce que le stock enregistré était à zéro.
      const m = await api().get('/api/v1/stocks/mouvements').set(auth());
      const ligne = m.body.mouvements.find((x: any) => x.produit_nom === PRODUIT);
      expect(ligne).toBeTruthy();
      // Ce qui est SORTI de la boutique — 4, pas 0.
      expect(ligne.quantite_affichee).toBe(4);
      // …et le fait que le stock ne le couvrait pas, dit explicitement.
      expect(ligne.hors_stock).toBe(true);
      expect(ligne.manquant).toBe(4);
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
  describe('A3 — un acompte de crédit est de l’argent que la caisse voit', () => {
    it('l’acompte écrit une transaction de caisse, de type acompte_credit', async () => {
      const c = await api().post('/api/v1/caisse/credits').set(auth())
        .send({ client_nom: 'Mariam-A3', montant_total: 5000, echeance: '2026-12-31' });
      expect([200, 201]).toContain(c.status);
      const creditId = c.body.credit.id;

      const avant = await ds.query(
        `SELECT count(*)::int AS n FROM caisse_transactions WHERE marchand_id = $1`, [marchandId]);

      // ARGENT-4b : `/acompte` EXIGE désormais une clé d'idempotence. Le
      // serveur en fabriquait une avec `Date.now()` quand elle manquait, ce
      // qui faisait passer deux envois de la MÊME tentative pour deux
      // encaissements distincts. Cet appel-ci en fournit donc une — la
      // propriété testée ici (« l'acompte écrit une ligne de caisse de type
      // `acompte_credit` ») est inchangée.
      const a = await api().patch(`/api/v1/caisse/credits/${creditId}/acompte`).set(auth())
        .send({ montant: 2000, idempotency_key: 'a3-acompte-mariam' });
      expect([200, 201]).toContain(a.status);

      const apres = await ds.query(
        `SELECT count(*)::int AS n FROM caisse_transactions WHERE marchand_id = $1`, [marchandId]);

      // 2 000 F sont entrés dans la caisse : elle doit le savoir.
      expect(apres[0].n).toBe(avant[0].n + 1);

      const [ecriture] = await ds.query(
        `SELECT type, montant::float AS montant FROM caisse_transactions
          WHERE marchand_id = $1 AND type = 'acompte_credit'
          ORDER BY created_at DESC LIMIT 1`, [marchandId]);
      expect(ecriture.type).toBe('acompte_credit');
      expect(ecriture.montant).toBe(2000);
    });

    it('cet encaissement N’EST PAS une recette — elle a déjà été comptée à la vente', async () => {
      // Le type est distinct de 'vente' : tous les agrégats de recette filtrent
      // sur 'vente', donc l'acompte n'y entre pas. Compter deux fois le même
      // argent serait le symétrique exact du défaut qu'on répare.
      const [r] = await ds.query(
        `SELECT COALESCE(SUM(montant) FILTER (WHERE type = 'vente' AND statut <> 'annulee'), 0)::float AS recette,
                COALESCE(SUM(montant) FILTER (WHERE type = 'acompte_credit'), 0)::float             AS acomptes
           FROM caisse_transactions WHERE marchand_id = $1`, [marchandId]);
      expect(r.acomptes).toBe(2000);
      expect(r.recette).not.toBe(r.recette + r.acomptes);
    });

    it('la clôture ne journalise AUCUN écart : l’argent est là, et la caisse le sait', async () => {
      const [mvt] = await ds.query(
        `SELECT COALESCE(SUM(montant) FILTER (WHERE type='vente' AND statut <> 'annulee'),0)::float
              + COALESCE(SUM(montant) FILTER (WHERE type='acompte_credit'),0)::float
              - COALESCE(SUM(montant) FILTER (WHERE type='depense'),0)::float AS mouvement
           FROM caisse_transactions
          WHERE marchand_id = $1 AND created_at::date = CURRENT_DATE`, [marchandId]);

      // Ce qu'elle a réellement en main : ventes + acompte − dépenses, plus son fond.
      const [sess] = await ds.query(
        `SELECT fond_initial::float AS fond FROM caisse_sessions
          WHERE marchand_id = $1 AND date = CURRENT_DATE`, [marchandId]);
      const enMain = Number(sess.fond) + mvt.mouvement;

      const f = await api().post('/api/v1/caisse/session/fermer').set(auth())
        .send({ comptage_reel: enMain, notes: 'clôture A3' });
      expect([200, 201]).toContain(f.status);

      // Aucun écart : l'acompte est compté des DEUX côtés, comme il doit l'être.
      expect(Number(f.body.ecart)).toBe(0);

      const [session] = await ds.query(
        `SELECT ecart::float AS ecart FROM caisse_sessions
          WHERE marchand_id = $1 AND date = CURRENT_DATE`, [marchandId]);
      expect(session.ecart).toBe(0);
    });
  });
});
