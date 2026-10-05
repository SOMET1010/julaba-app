// CAI-09 — UN ENCAISSEMENT DE CRÉDIT NE PEUT PAS ROUVRIR UNE JOURNÉE COMPTÉE.
//
// CAI-02 a fermé la vente et l'annulation après clôture. Il restait un trou,
// nommé le jour même et laissé ouvert : les deux routes de crédit.
//
//   PATCH /caisse/credits/:id/acompte   → encaisserCredit()
//   PATCH /caisse/credits/:id/payer     → encaisserCredit()
//   POST  /caisse/credits (acompte > 0) → encaisserCredit()
//
// Le troisième s'est nommé en relisant les routes : la création d'un crédit
// avec un acompte versé sur-le-champ encaisse par la MÊME primitive. Fermer
// les deux premiers et laisser celui-là, c'était fermer la porte en laissant
// la fenêtre.
//
// `encaisserCredit` écrit une ligne dans `caisse_transactions` avec le type
// `acompte_credit` ou `reglement_credit`. Et `caisseTheorique` les ADDITIONNE :
//
//   SUM(CASE WHEN type IN ('acompte_credit','reglement_credit') THEN montant …)
//
// Ces trois routes font donc entrer de l'argent dans la caisse du jour —
// exactement comme une vente — sans passer par `exigerJourneeOuverte`.
//
// CE QUE ÇA COÛTE. Le soir, la marchande compte son argent en main. La clôture
// fige trois nombres : `caisse_theorique`, `fond_final` et leur `ecart`. C'est
// un CONSTAT daté. Une cliente qui vient payer sa dette après la fermeture
// ajoute de l'argent réel dans la caisse réelle — et la ligne de clôture, elle,
// continue d'affirmer un écart de zéro. Le constat du soir devient faux en
// silence, dans le sens le plus difficile à voir : il y a PLUS d'argent que ce
// que la caisse dit.
//
// ET CE N'EST PAS THÉORIQUE. `CAISSE_CREDIT_ACTIF = false` désactive l'onglet
// crédit dans l'ÉCRAN (POSCaisse, VentesPassees) — c'est un drapeau du
// téléphone. Les routes, elles, sont montées et joignables avec un simple
// jeton de marchande. Un drapeau d'affichage n'est pas une garde.
//
// LA PREUVE TRAVERSE : ouvrir → créer un crédit → encaisser un acompte →
// fermer sur un comptage EXACT → tenter un second acompte, un règlement, une
// création avec acompte → et RELIRE EN BASE que les trois nombres de la
// clôture, le montant déjà encaissé du crédit et le nombre de lignes de caisse
// n'ont pas bougé. Vérifier qu'une route répond 4xx ne suffit pas.
//
// ET LA FRONTIÈRE SE PROUVE DES DEUX CÔTÉS : une garde qui refuse tout ne
// protège rien, elle empêche. Noter une dette SANS acompte reste possible
// après la clôture — aucun argent ne bouge.
//
// Numéros réservés à cette suite : +22507990009xx.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';

const TEL = '+2250799000901';

describe('CAI-09 — une journée fermée n’encaisse plus de crédit', () => {
  let app: INestApplication;
  let ds: DataSource;
  let token: string;
  let marchandId: string;
  let creditId: string;
  const api = () => request(app.getHttpServer());
  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${token}`);
  const aujourdhui = () => new Date().toISOString().slice(0, 10);

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

    const su = await api().post('/api/v1/auth/signup')
      .send({ phone: TEL, firstName: 'Awa', lastName: 'Cai09', role: 'marchand', genre: 'femme' });
    expect([200, 201]).toContain(su.status);
    token = su.body.accessToken;
    marchandId = su.body.user.id;
    await api().post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: '0000', newPassword: '1234' });
  }, 90000);

  afterAll(async () => { if (app) await app.close(); });

  /** La session du jour de CETTE marchande, relue EN BASE. Les suites
   *  partagent une base : une lecture non bornée mesure le travail des autres
   *  et rend ce test vert seul, rouge en groupe. */
  const sessionEnBase = async () => {
    const [s] = await ds.query(
      `SELECT ouvert, fond_initial, fond_final, caisse_theorique, ecart
         FROM caisse_sessions WHERE marchand_id = $1 AND date = $2 LIMIT 1`,
      [marchandId, aujourdhui()],
    );
    return s;
  };

  const creditEnBase = async () => {
    const [c] = await ds.query(
      `SELECT montant_total, COALESCE(acompte,0) AS acompte, statut
         FROM credits WHERE id = $1 AND marchand_id = $2 LIMIT 1`,
      [creditId, marchandId],
    );
    return c;
  };

  const lignesDeCaisse = async () => {
    const [r] = await ds.query(
      `SELECT count(*)::int AS n,
              COALESCE(SUM(montant), 0) AS total
         FROM caisse_transactions
        WHERE marchand_id = $1 AND type IN ('acompte_credit', 'reglement_credit')`,
      [marchandId],
    );
    return r;
  };

  it('le constat du soir tient : aucun encaissement de crédit ne peut le fausser', async () => {
    const FOND = 10000;
    const ACOMPTE_DU_JOUR = 2000;

    // ── La journée, telle qu'une marchande la vit ─────────────────────────
    const ouvrir = await auth(api().post('/api/v1/caisse/session/ouvrir')).send({ fond_initial: FOND });
    expect([200, 201]).toContain(ouvrir.status);

    const credit = await auth(api().post('/api/v1/caisse/credits')).send({
      client_nom: 'Adjoua', client_phone: '+2250700000921',
      montant_total: 6000, echeance: aujourdhui(),
    });
    expect([200, 201]).toContain(credit.status);
    creditId = credit.body.credit?.id ?? credit.body.id;
    expect(creditId).toBeTruthy();

    // Elle encaisse un acompte PENDANT la journée : c'est légitime.
    const acompte = await auth(api().patch(`/api/v1/caisse/credits/${creditId}/acompte`)).send({
      montant: ACOMPTE_DU_JOUR, idempotency_key: 'cai09-acompte-du-jour',
    });
    expect([200, 201]).toContain(acompte.status);

    // Le soir, elle compte EXACTEMENT ce qu'elle doit avoir. Écart zéro.
    const enMain = FOND + ACOMPTE_DU_JOUR;
    const fermer = await auth(api().post('/api/v1/caisse/session/fermer')).send({ comptage_reel: enMain });
    expect(fermer.status).toBe(201);
    expect(fermer.body.ecart).toBe(0);

    const apresCloture = await sessionEnBase();
    expect(apresCloture.ouvert).toBe(false);
    expect(Number(apresCloture.ecart)).toBe(0);
    expect(Number(apresCloture.caisse_theorique)).toBe(enMain);
    const caisseAvant = await lignesDeCaisse();
    const creditAvant = await creditEnBase();

    // ── CE QUI NE DOIT PLUS PASSER ────────────────────────────────────────
    //
    // 1. Un second acompte. Il ferait entrer 1 500 F dans une journée déjà
    //    comptée : le `caisse_theorique` figé deviendrait faux d'autant.
    const acompteApres = await auth(api().patch(`/api/v1/caisse/credits/${creditId}/acompte`)).send({
      montant: 1500, idempotency_key: 'cai09-acompte-apres-cloture',
    });
    expect(acompteApres.status).toBeGreaterThanOrEqual(400);
    expect(acompteApres.status).toBeLessThan(500);

    // 2. Le règlement du solde. Même faute, montant plus gros.
    const reglementApres = await auth(api().patch(`/api/v1/caisse/credits/${creditId}/payer`)).send({
      idempotency_key: 'cai09-reglement-apres-cloture',
    });
    expect(reglementApres.status).toBeGreaterThanOrEqual(400);
    expect(reglementApres.status).toBeLessThan(500);

    // 3. Un NOUVEAU crédit avec acompte versé en main : c'est le même
    //    encaissement, par une autre porte.
    const creditAvecAcompte = await auth(api().post('/api/v1/caisse/credits')).send({
      client_nom: 'Mariam', client_phone: '+2250700000922',
      montant_total: 4000, acompte: 1000, echeance: aujourdhui(),
      idempotency_key: 'cai09-creation-acompte-apres-cloture',
    });
    expect(creditAvecAcompte.status).toBeGreaterThanOrEqual(400);
    expect(creditAvecAcompte.status).toBeLessThan(500);
    // Et le refus est ENTIER : ni client, ni crédit à moitié écrits.
    const [restee] = await ds.query(
      `SELECT count(*)::int AS n FROM credits WHERE marchand_id = $1 AND client_nom = $2`,
      [marchandId, 'Mariam'],
    );
    expect(restee.n).toBe(0);

    // ── CE QUI DOIT ENCORE PASSER ─────────────────────────────────────────
    //
    // Noter une dette ne déplace aucun argent : la journée fermée l'accepte.
    // Refuser ici ferait PERDRE l'information au lieu de la protéger — la
    // marchande n'écrirait le crédit nulle part.
    const creditSansAcompte = await auth(api().post('/api/v1/caisse/credits')).send({
      client_nom: 'Kadija', client_phone: '+2250700000923',
      montant_total: 3000, echeance: aujourdhui(),
    });
    expect([200, 201]).toContain(creditSansAcompte.status);

    // ── LA PREUVE : rien n'a bougé ────────────────────────────────────────
    const apresTentatives = await sessionEnBase();
    expect(apresTentatives.ouvert).toBe(false);
    expect(Number(apresTentatives.fond_final)).toBe(enMain);
    expect(Number(apresTentatives.caisse_theorique)).toBe(enMain);
    expect(Number(apresTentatives.ecart)).toBe(0);

    const caisseApres = await lignesDeCaisse();
    expect(caisseApres.n).toBe(caisseAvant.n);
    expect(Number(caisseApres.total)).toBe(Number(caisseAvant.total));

    const creditApres = await creditEnBase();
    expect(Number(creditApres.acompte)).toBe(Number(creditAvant.acompte));
    expect(creditApres.statut).toBe(creditAvant.statut);
  }, 120000);

  it('rouvrir la journée rend l’encaissement possible — le geste devait être VOULU', async () => {
    const rouvrir = await auth(api().post('/api/v1/caisse/session/ouvrir')).send({});
    expect([200, 201]).toContain(rouvrir.status);
    expect((await sessionEnBase()).ouvert).toBe(true);

    const avant = await creditEnBase();
    const acompte = await auth(api().patch(`/api/v1/caisse/credits/${creditId}/acompte`)).send({
      montant: 1000, idempotency_key: 'cai09-acompte-apres-reouverture',
    });
    expect([200, 201]).toContain(acompte.status);

    const apres = await creditEnBase();
    expect(Number(apres.acompte)).toBe(Number(avant.acompte) + 1000);
  }, 60000);
});
