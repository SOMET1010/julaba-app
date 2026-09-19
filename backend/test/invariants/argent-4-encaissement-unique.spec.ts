// ARGENT-4 — UNE SEULE PRIMITIVE TRANSACTIONNELLE POUR TOUT L'ARGENT DU CRÉDIT.
//
// LA RÈGLE (Patrick, 19/09/2026) : « tout argent effectivement reçu doit
// produire une écriture de caisse, quelle que soit l'origine du paiement ».
//
// TROIS CHEMINS, TROIS COMPORTEMENTS, AVANT CE LOT :
//   • `POST /caisse/credits` avec acompte → aucune ligne de caisse ;
//   • `PATCH :id/acompte` → une ligne, mais dans un `try/catch` hors
//     transaction qui avalait l'erreur ;
//   • `PATCH :id/payer` → aucune ligne, et `acompte` restait à l'ancienne
//     valeur pendant que la vue annonçait « plus rien à payer ».
//
// LA NATURE N'EST PAS DÉCIDÉE PAR LA ROUTE mais par le RÉSULTAT :
//   reste après > 0 → `acompte_credit` ; reste après = 0 → `reglement_credit`.
// Un paiement passé par `/acompte` qui termine exactement la dette doit donc
// ressortir en `reglement_credit`. C'est le test central de ce fichier.
//
// LA PREUVE TRAVERSE : entrée métier HTTP → contrôleur → données persistées →
// relecture. Un test de fonction ne prouverait rien ici, puisque le défaut
// vivait entre le contrôleur et la base.
//
// MESURE EN DELTA : la base d'invariants est partagée par toutes les suites.
//
// Numéros réservés à cette suite : +22507990004xx.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';

const TEL = '+2250799000401';

describe('ARGENT-4 — tout encaissement de crédit passe par la même porte', () => {
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
      .send({ phone: TEL, firstName: 'Awa', lastName: 'Arg4', role: 'marchand', genre: 'femme' });
    expect([200, 201]).toContain(su.status);
    token = su.body.accessToken;
    marchandId = su.body.user.id;
    await api().post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: '0000', newPassword: '1234' });
  }, 90000);

  afterAll(async () => { if (app) await app.close(); });

  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${token}`);

  const creer = (client: string, total: number, acompte = 0, cle?: string) =>
    auth(api().post('/api/v1/caisse/credits')).send({
      client_nom: client, montant_total: total, acompte,
      echeance: '2026-12-31', articles: [], ...(cle ? { idempotency_key: cle } : {}),
    });

  /** Les lignes de caisse d'une nature, pour CE marchand seulement. */
  const lignesCaisse = async (nature: string): Promise<number[]> =>
    (await ds.query(
      `SELECT montant FROM caisse_transactions
        WHERE marchand_id = $1 AND type = $2 ORDER BY created_at`,
      [marchandId, nature],
    )).map((r: any) => Math.round(Number(r.montant)));

  const nbLignes = async (nature: string) => (await lignesCaisse(nature)).length;

  const creditEnBase = async (id: string) =>
    (await ds.query(
      `SELECT montant_total::int AS total, COALESCE(acompte,0)::int AS acompte, statut
         FROM credits WHERE id = $1`, [id]))[0];

  const duClient = async (nom: string) =>
    Math.round(Number((await ds.query(
      `SELECT montant_du FROM clients WHERE marchand_id=$1 AND nom=$2`,
      [marchandId, nom]))[0]?.montant_du ?? 0));

  // ── 1. L'ACOMPTE À LA CRÉATION EXISTE ENFIN DANS LA CAISSE ──────────────

  it('un acompte versé à la création produit une ligne de caisse', async () => {
    const avant = await nbLignes('acompte_credit');
    const r = await creer('Mariam Arg4', 10000, 3000);
    expect([200, 201]).toContain(r.status);
    const id = r.body.credit.id;

    expect(await nbLignes('acompte_credit')).toBe(avant + 1);

    // La donnée persistée, pas la réponse HTTP.
    const c = await creditEnBase(id);
    expect(c.acompte).toBe(3000);
    expect(c.statut).not.toBe('paye');
    // Le client doit le reste, pas le total.
    expect(await duClient('Mariam Arg4')).toBe(7000);
  }, 60000);

  it('un crédit SANS acompte n’écrit aucune ligne de caisse', async () => {
    const avant = await nbLignes('acompte_credit');
    const r = await creer('Salif Arg4', 5000, 0);
    expect([200, 201]).toContain(r.status);
    expect(await nbLignes('acompte_credit')).toBe(avant);
    expect(await duClient('Salif Arg4')).toBe(5000);
  }, 60000);

  // ── 2. LA NATURE VIENT DU RÉSULTAT, PAS DE LA ROUTE ─────────────────────

  it('un acompte qui termine exactement la dette est un RÈGLEMENT, pas un acompte', async () => {
    // LE TEST CENTRAL. La route appelée est `/acompte` ; le résultat métier
    // est un solde à zéro ; la nature écrite doit donc être `reglement_credit`.
    const r = await creer('Fanta Arg4', 4000, 0);
    const id = r.body.credit.id;
    const avantA = await nbLignes('acompte_credit');
    const avantR = await nbLignes('reglement_credit');

    const paie = await auth(api().patch(`/api/v1/caisse/credits/${id}/acompte`))
      .send({ montant: 4000, idempotency_key: 'arg4-fanta-solde' });
    expect(paie.status).toBe(200);
    expect(paie.body.nature).toBe('reglement_credit');
    expect(paie.body.reste_apres).toBe(0);

    expect(await nbLignes('reglement_credit')).toBe(avantR + 1);
    expect(await nbLignes('acompte_credit')).toBe(avantA); // aucune, malgré la route

    const c = await creditEnBase(id);
    expect(c.acompte).toBe(4000);
    expect(c.statut).toBe('paye');
    expect(await duClient('Fanta Arg4')).toBe(0);
  }, 60000);

  it('un acompte qui laisse du reste est bien un ACOMPTE', async () => {
    const r = await creer('Kadi Arg4', 6000, 0);
    const id = r.body.credit.id;
    const paie = await auth(api().patch(`/api/v1/caisse/credits/${id}/acompte`))
      .send({ montant: 2000, idempotency_key: 'arg4-kadi-1' });
    expect(paie.body.nature).toBe('acompte_credit');
    expect(paie.body.reste_apres).toBe(4000);
    expect(await duClient('Kadi Arg4')).toBe(4000);
  }, 60000);

  // ── 3. LE RÈGLEMENT FINAL — ARG-10 ──────────────────────────────────────

  it('/payer encaisse réellement le reste et l’écrit en caisse', async () => {
    const r = await creer('Aya Arg4', 8000, 2000);
    const id = r.body.credit.id;
    const avantR = await nbLignes('reglement_credit');

    const payer = await auth(api().patch(`/api/v1/caisse/credits/${id}/payer`))
      .send({ idempotency_key: 'arg4-aya-payer' });
    expect(payer.status).toBe(200);
    expect(payer.body.nature).toBe('reglement_credit');

    // La ligne de caisse porte le RESTE (6000), pas le total.
    const lignes = await lignesCaisse('reglement_credit');
    expect(lignes.length).toBe(avantR + 1);
    expect(lignes[lignes.length - 1]).toBe(6000);

    // Et la table ne ment plus : `acompte` vaut le total.
    const c = await creditEnBase(id);
    expect(c.acompte).toBe(8000);
    expect(c.statut).toBe('paye');
    expect(await duClient('Aya Arg4')).toBe(0);
  }, 60000);

  // ── 4. AUCUN DOUBLE ENCAISSEMENT ────────────────────────────────────────

  it('rejouer la même clé n’encaisse pas deux fois', async () => {
    const r = await creer('Nana Arg4', 9000, 0);
    const id = r.body.credit.id;
    const corps = { montant: 3000, idempotency_key: 'arg4-nana-rejeu' };

    const un = await auth(api().patch(`/api/v1/caisse/credits/${id}/acompte`)).send(corps);
    expect(un.body.rejeu).toBe(false);
    const deux = await auth(api().patch(`/api/v1/caisse/credits/${id}/acompte`)).send(corps);
    expect(deux.body.rejeu).toBe(true);

    // Une seule fois en caisse, une seule fois sur le crédit, une seule fois
    // sur la dette du client. C'est le rejeu hors connexion.
    const [{ n }] = await ds.query(
      `SELECT count(*)::int n FROM caisse_transactions WHERE idempotency_key = $1`,
      ['credit-acompte-arg4-nana-rejeu']);
    expect(n).toBe(1);
    expect((await creditEnBase(id)).acompte).toBe(3000);
    expect(await duClient('Nana Arg4')).toBe(6000);
  }, 60000);

  it('deux acomptes simultanés s’additionnent, sans en perdre un', async () => {
    const r = await creer('Rama Arg4', 10000, 0);
    const id = r.body.credit.id;
    await Promise.all([
      auth(api().patch(`/api/v1/caisse/credits/${id}/acompte`)).send({ montant: 2000, idempotency_key: 'arg4-rama-a' }),
      auth(api().patch(`/api/v1/caisse/credits/${id}/acompte`)).send({ montant: 3000, idempotency_key: 'arg4-rama-b' }),
    ]);
    expect((await creditEnBase(id)).acompte).toBe(5000);
    expect(await duClient('Rama Arg4')).toBe(5000);
  }, 60000);

  // ── 5. TOUT OU RIEN ─────────────────────────────────────────────────────

  it('un encaissement refusé ne laisse RIEN derrière lui', async () => {
    const r = await creer('Oumou Arg4', 5000, 0);
    const id = r.body.credit.id;
    const avantA = await nbLignes('acompte_credit');
    const avantR = await nbLignes('reglement_credit');

    const trop = await auth(api().patch(`/api/v1/caisse/credits/${id}/acompte`))
      .send({ montant: 9999, idempotency_key: 'arg4-oumou-trop' });
    expect(trop.status).toBe(400);

    // Ni crédit, ni dette client, ni caisse : la transaction entière a reculé.
    expect((await creditEnBase(id)).acompte).toBe(0);
    expect(await duClient('Oumou Arg4')).toBe(5000);
    expect(await nbLignes('acompte_credit')).toBe(avantA);
    expect(await nbLignes('reglement_credit')).toBe(avantR);
  }, 60000);

  it('encaisser sur un crédit déjà soldé ne réécrit rien', async () => {
    const r = await creer('Binta Arg4', 2000, 2000);
    const id = r.body.credit.id;
    expect((await creditEnBase(id)).statut).toBe('paye');
    const avantA = await nbLignes('acompte_credit');
    const avantR = await nbLignes('reglement_credit');

    const encore = await auth(api().patch(`/api/v1/caisse/credits/${id}/acompte`))
      .send({ montant: 500, idempotency_key: 'arg4-binta-encore' });
    expect(encore.status).toBe(400);
    expect(await nbLignes('acompte_credit')).toBe(avantA);
    expect(await nbLignes('reglement_credit')).toBe(avantR);

    // Et `/payer` sur un crédit soldé répond sans réencaisser.
    const payer = await auth(api().patch(`/api/v1/caisse/credits/${id}/payer`)).send({});
    expect(payer.status).toBe(200);
    expect(payer.body.deja_solde).toBe(true);
    expect(await nbLignes('reglement_credit')).toBe(avantR);
  }, 60000);

  // ── 6. LE CHIFFRE D'AFFAIRES N'EST PAS GONFLÉ ───────────────────────────

  it('aucun encaissement de crédit n’entre dans la recette', async () => {
    // La recette a DÉJÀ été comptée à la vente à crédit. La compter à
    // l'encaissement serait le symétrique exact du défaut qu'on répare.
    const [{ n }] = await ds.query(
      `SELECT count(*)::int n FROM caisse_transactions
        WHERE marchand_id = $1 AND type = 'vente'`, [marchandId]);
    expect(n).toBe(0);
    // …alors que les encaissements, eux, existent bel et bien.
    expect(await nbLignes('acompte_credit') + await nbLignes('reglement_credit'))
      .toBeGreaterThan(0);
  }, 60000);

  // ── 7. AUCUNE AUTRE PORTE ───────────────────────────────────────────────

  it('le contrôleur crédits n’écrit plus jamais la caisse lui-même', async () => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const { join } = require('node:path') as typeof import('node:path');
    const src = readFileSync(
      join(__dirname, '..', '..', 'src', 'caisse-rest', 'credits.controller.ts'), 'utf8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ')
      .split('\n').map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');
    expect(code).not.toMatch(/INSERT\s+INTO\s+caisse_transactions/i);
    // Et la nature n'est nommée nulle part ailleurs que dans la primitive :
    // sinon un chemin pourrait recommencer à la décider lui-même.
    expect(code).not.toMatch(/'(acompte|reglement)_credit'/);
  });
});
