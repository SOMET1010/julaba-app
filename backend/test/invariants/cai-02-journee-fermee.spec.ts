// CAI-02 — UNE JOURNÉE FERMÉE N'ACCEPTE PLUS D'ARGENT.
//
// LE DÉFAUT, relevé par la recette terrain (matrice v1.0, MAR-CAI-002 et
// MAR-CAI-003, tous deux BLOQUANTS) et vérifié dans le code :
//
//   • `POST /caisse/vente` contrôle l'idempotence, le montant, la marge…
//     et JAMAIS `caisse_sessions.ouvert`.
//   • `PATCH /caisse/transactions/:id/annuler` contrôle la propriété, le type,
//     le statut, le jour… et JAMAIS `ouvert` non plus.
//   • Côté écran, le seul test de `session.opened` vit dans `RoleDashboard`,
//     un écran hérité, et il se contente de griser un bouton.
//
// On peut donc vendre et annuler dans une journée déjà comptée.
//
// CE QUE ÇA COÛTE, ET POURQUOI C'EST PIRE QU'UN BOGUE D'ÉCRAN. `fermerSession`
// fige trois nombres au moment de la clôture : `caisse_theorique`, `fond_final`
// (ce que la marchande a compté en main) et leur `ecart`. Ces trois nombres
// sont un CONSTAT daté — le soir, devant son argent. Une vente enregistrée
// après coup ne les met pas à jour : elle les rend FAUX, en silence. La
// journée affirme un écart de zéro alors qu'il manque désormais de l'argent en
// caisse, ou qu'il y en a en trop.
//
// C'est exactement la faute que ce dépôt combat partout ailleurs : une donnée
// qui a deux sens. Ici, `ecart = 0` veut dire « tout est juste » avant la
// vente, et ne veut plus rien dire après.
//
// LA PREUVE TRAVERSE : ouvrir avec un fond → vendre → fermer sur un comptage
// EXACT (écart zéro) → tenter une vente → tenter une annulation → et relire
// EN BASE que les trois nombres de la clôture n'ont pas bougé. Vérifier qu'une
// route répond 4xx ne suffit pas : c'est la ligne relue après coup qui doit
// prouver que le constat du soir tient.
//
// CE QUE CET INVARIANT N'EXIGE PAS. Il n'interdit pas de ROUVRIR une journée —
// `POST /session/ouvrir` sait déjà le faire, et une marchande qui ferme trop
// tôt doit pouvoir se reprendre. Ce qui est interdit, c'est d'écrire dans une
// journée fermée SANS la rouvrir : le geste doit être explicite, parce qu'il
// invalide un comptage.
//
// Numéros réservés à cette suite : +22507990006xx.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';

const TEL = '+2250799000601';

describe('CAI-02 — une journée fermée n’accepte plus d’argent', () => {
  let app: INestApplication;
  let ds: DataSource;
  let token: string;
  let marchandId: string;
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

    const su = await api().post('/api/v1/auth/signup')
      .send({ phone: TEL, firstName: 'Awa', lastName: 'Cai02', role: 'marchand', genre: 'femme' });
    expect([200, 201]).toContain(su.status);
    token = su.body.accessToken;
    marchandId = su.body.user.id;
    await api().post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: '0000', newPassword: '1234' });
  }, 90000);

  afterAll(async () => { if (app) await app.close(); });

  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${token}`);
  const aujourdhui = () => new Date().toISOString().slice(0, 10);

  /** La session du jour de CETTE marchande, relue EN BASE — pas ce que l'API
   *  veut bien en dire. Les suites d'invariants partagent UNE base : une
   *  lecture non bornée au marchand mesure le travail des autres suites, et
   *  rend ce test vert seul et rouge en groupe (la pire forme d'échec). */
  const sessionEnBase = async () => {
    const [s] = await ds.query(
      `SELECT ouvert, fond_initial, fond_final, caisse_theorique, ecart
         FROM caisse_sessions WHERE marchand_id = $1 AND date = $2 LIMIT 1`,
      [marchandId, aujourdhui()],
    );
    return s;
  };

  it('le constat du soir tient : ni vente ni annulation ne peuvent le fausser', async () => {
    const FOND = 10000;
    const VENTE = 4000;

    // ── La journée, telle qu'une marchande la vit ─────────────────────────
    const ouvrir = await auth(api().post('/api/v1/caisse/session/ouvrir')).send({ fond_initial: FOND });
    expect([200, 201]).toContain(ouvrir.status);

    const vente = await auth(api().post('/api/v1/caisse/vente')).send({
      montant: VENTE, produit: 'Tomate', quantite: 1,
      mode_paiement: 'especes', idempotency_key: 'cai02-vente-du-jour',
    });
    expect([200, 201]).toContain(vente.status);
    const idVente = vente.body.transaction?.id ?? vente.body.id;
    expect(idVente).toBeTruthy();

    // Le soir, elle compte EXACTEMENT ce qu'elle doit avoir. Écart zéro.
    const enMain = FOND + VENTE;
    const fermer = await auth(api().post('/api/v1/caisse/session/fermer')).send({ comptage_reel: enMain });
    expect(fermer.status).toBe(201);
    expect(fermer.body.ecart).toBe(0);

    const apresCloture = await sessionEnBase();
    expect(apresCloture.ouvert).toBe(false);
    expect(Number(apresCloture.ecart)).toBe(0);
    expect(Number(apresCloture.caisse_theorique)).toBe(enMain);

    // ── CE QUI NE DOIT PLUS PASSER ────────────────────────────────────────
    //
    // 1. Une vente. Elle ferait entrer de l'argent dans une journée déjà
    //    comptée : le `caisse_theorique` figé deviendrait faux de 2 500 F.
    const venteApres = await auth(api().post('/api/v1/caisse/vente')).send({
      montant: 2500, produit: 'Banane', quantite: 1,
      mode_paiement: 'especes', idempotency_key: 'cai02-vente-apres-cloture',
    });
    expect(venteApres.status).toBeGreaterThanOrEqual(400);
    expect(venteApres.status).toBeLessThan(500);

    // 2. Une annulation. Elle retirerait de l'argent d'une journée déjà
    //    comptée — l'écart deviendrait faux dans l'autre sens.
    const annulation = await auth(api().patch(`/api/v1/caisse/transactions/${idVente}/annuler`)).send({});
    expect(annulation.status).toBeGreaterThanOrEqual(400);
    expect(annulation.status).toBeLessThan(500);

    // ── LA PREUVE : les trois nombres du soir n'ont pas bougé ─────────────
    const apresTentatives = await sessionEnBase();
    expect(apresTentatives.ouvert).toBe(false);
    expect(Number(apresTentatives.fond_final)).toBe(enMain);
    expect(Number(apresTentatives.caisse_theorique)).toBe(enMain);
    expect(Number(apresTentatives.ecart)).toBe(0);

    // Et la vente du jour est toujours VALIDEE : rien n'a été annulé en douce.
    const [ligne] = await ds.query(
      `SELECT statut, montant FROM caisse_transactions WHERE id = $1`, [idVente],
    );
    expect(ligne.statut).toBe('validee');
    expect(Number(ligne.montant)).toBe(VENTE);

    // La recette du jour vaut exactement la vente enregistrée AVANT la clôture.
    const [somme] = await ds.query(
      `SELECT COALESCE(SUM(montant), 0) AS total
         FROM caisse_transactions
        WHERE marchand_id = $1 AND type = 'vente' AND statut = 'validee'
          AND created_at::date = $2::date`,
      [marchandId, aujourdhui()],
    );
    expect(Number(somme.total)).toBe(VENTE);
  }, 90000);

  it('rouvrir la journée reste possible — c’est le geste explicite qui manquait', async () => {
    // On n'interdit pas de se reprendre : on exige que ce soit VOULU.
    const rouvrir = await auth(api().post('/api/v1/caisse/session/ouvrir')).send({});
    expect([200, 201]).toContain(rouvrir.status);

    const s = await sessionEnBase();
    expect(s.ouvert).toBe(true);

    // Et une fois rouverte, la vente repasse : c'est la journée qui commande,
    // pas une exception glissée dans la route de vente.
    const vente = await auth(api().post('/api/v1/caisse/vente')).send({
      montant: 1500, produit: 'Piment', quantite: 1,
      mode_paiement: 'especes', idempotency_key: 'cai02-vente-apres-reouverture',
    });
    expect([200, 201]).toContain(vente.status);
  }, 60000);
});
