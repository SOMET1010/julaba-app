// ARGENT-4b — LA CLÔTURE COMPREND LES DEUX NATURES D'ENCAISSEMENT.
//
// LE DÉFAUT, trouvé au contre-audit de Patrick sur ARGENT-4. La primitive
// écrivait correctement `reglement_credit` quand un paiement soldait la dette,
// mais `caisseTheorique` ne sommait que `vente + acompte_credit − depense`.
// Un règlement final de 6 000 F entrait donc physiquement dans la caisse, était
// correctement journalisé… et la clôture l'ignorait : écart fantôme de 6 000 F,
// sur une journée où rien ne manquait.
//
// POURQUOI LE TEST D'ARGENT-4 NE POUVAIT PAS LE VOIR. Il vérifiait que la ligne
// `reglement_credit` existait et qu'elle ne gonflait pas la recette. Il ne
// FERMAIT JAMAIS LA JOURNÉE. Une écriture d'argent n'est pas finie quand elle
// est écrite, mais quand la clôture la comprend — c'est ce maillon-là qui
// manquait, et c'est celui que ce fichier tient.
//
// LA PREUVE TRAVERSE : ouvrir la journée avec un fond → vendre → créer un
// crédit avec acompte → encaisser un acompte → solder le reste → fermer avec
// ce qu'on a RÉELLEMENT en main, et exiger un écart de ZÉRO.
//
// Numéros réservés à cette suite : +22507990005xx.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';

const TEL = '+2250799000501';

describe('ARGENT-4b — un règlement final ne crée plus d’écart fantôme', () => {
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
      .send({ phone: TEL, firstName: 'Awa', lastName: 'Arg4b', role: 'marchand', genre: 'femme' });
    expect([200, 201]).toContain(su.status);
    token = su.body.accessToken;
    marchandId = su.body.user.id;
    await api().post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: '0000', newPassword: '1234' });
  }, 90000);

  afterAll(async () => { if (app) await app.close(); });

  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${token}`);

  it('journée complète avec acompte ET règlement final : écart = 0', async () => {
    const FOND = 10000;
    const ouvrir = await auth(api().post('/api/v1/caisse/session/ouvrir'))
      .send({ fond_initial: FOND });
    expect([200, 201]).toContain(ouvrir.status);

    // Un crédit de 12 000 F, dont 2 000 F versés tout de suite.
    const credit = await auth(api().post('/api/v1/caisse/credits')).send({
      client_nom: 'Aminata Arg4b', montant_total: 12000, acompte: 2000,
      echeance: '2026-12-31', articles: [], idempotency_key: 'arg4b-creation',
    });
    expect([200, 201]).toContain(credit.status);
    const id = credit.body.credit.id;

    // Elle revient verser 3 000 F.
    const acompte = await auth(api().patch(`/api/v1/caisse/credits/${id}/acompte`))
      .send({ montant: 3000, idempotency_key: 'arg4b-acompte' });
    expect(acompte.status).toBe(200);
    expect(acompte.body.nature).toBe('acompte_credit');

    // Puis elle solde les 7 000 F restants. C'est CE montant que la clôture
    // ignorait.
    const solde = await auth(api().patch(`/api/v1/caisse/credits/${id}/payer`))
      .send({ idempotency_key: 'arg4b-reglement' });
    expect(solde.status).toBe(200);
    expect(solde.body.nature).toBe('reglement_credit');

    // Ce que la marchande a réellement en main le soir : son fond, plus les
    // 12 000 F encaissés sur ce crédit. Rien d'autre n'est entré.
    const enMain = FOND + 2000 + 3000 + 7000;

    const fermer = await auth(api().post('/api/v1/caisse/session/fermer'))
      .send({ comptage_reel: enMain });
    expect([200, 201]).toContain(fermer.status);

    // LE TEST QUI MANQUAIT. Sans `reglement_credit` dans la somme, l'écart
    // vaudrait −7 000 : la marchande se verrait reprocher un manque sur une
    // journée où tout est là.
    const [session] = await ds.query(
      `SELECT caisse_theorique::int AS theorique, ecart::int AS ecart
         FROM caisse_sessions WHERE marchand_id = $1 AND date = CURRENT_DATE`,
      [marchandId],
    );
    expect(session.theorique).toBe(enMain);
    expect(session.ecart).toBe(0);
  }, 90000);

  it('la caisse théorique somme les DEUX natures, pas une seule', async () => {
    // Preuve structurelle, en plus de la preuve de comportement : si quelqu'un
    // ajoute demain une troisième nature d'encaissement sans toucher cette
    // somme, le défaut reviendra à l'identique.
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const { join } = require('node:path') as typeof import('node:path');
    const src = readFileSync(
      join(__dirname, '..', '..', 'src', 'caisse-rest', 'caisse-rest.controller.ts'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ')
      .split('\n').map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');
    const somme = code.slice(code.indexOf('caisseTheorique'), code.indexOf('caisseTheorique') + 1200);
    expect(somme).toContain('acompte_credit');
    expect(somme).toContain('reglement_credit');
  });

  it('un acompte sans clé d’idempotence est REFUSÉ, pas deviné', async () => {
    // ARG-12 : le serveur fabriquait une clé avec `Date.now()` quand le client
    // n'en envoyait pas. Deux envois de la MÊME tentative recevaient donc deux
    // clés et encaissaient deux fois — tout en ayant l'air idempotents.
    const credit = await auth(api().post('/api/v1/caisse/credits')).send({
      client_nom: 'Sans Cle Arg4b', montant_total: 5000, acompte: 0,
      echeance: '2026-12-31', articles: [], idempotency_key: 'arg4b-sans-cle',
    });
    const id = credit.body.credit.id;
    const sansCle = await auth(api().patch(`/api/v1/caisse/credits/${id}/acompte`))
      .send({ montant: 1000 });
    expect(sansCle.status).toBe(400);
    expect(String(sansCle.body.message)).toContain('idempotency_key');

    // Et rien n'a été encaissé au passage.
    const [c] = await ds.query(`SELECT COALESCE(acompte,0)::int AS a FROM credits WHERE id=$1`, [id]);
    expect(c.a).toBe(0);
  }, 60000);
});
