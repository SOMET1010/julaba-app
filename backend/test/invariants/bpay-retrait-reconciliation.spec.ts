// Invariant C-01 — RÉCONCILIATION DES RETRAITS MOBILE MONEY : un retrait
// Keiwa → mobile money débite le wallet AVANT l'appel opérateur ; quel que
// soit le chemin par lequel l'échec du cashin est découvert (réponse
// synchrone, webhook B-Pay, cron de réconciliation), l'argent débité revient
// au wallet EXACTEMENT UNE FOIS — et un statut indéterminé ne perd jamais
// l'argent (PENDING_WITHDRAW retenté, compte suspendu compris).
//
// Contexte (audit comptable 12/10, constat C-01) : l'ancien contrôleur
// marquait COMPLETED dès la HTTP 200 du cashin sans vérifier l'opérateur,
// écrivait un pay_token factice `RET-TEMP-${Date.now()}` introuvable côté
// opérateur, le webhook ignorait les retraits et le cron ne voyait que
// `PENDING` — un cashin échoué asynchronement = wallet débité, argent jamais
// reçu, aucune correction.
//
// Propriétés vérifiées (BpayService STUBBÉ — aucun appel réseau) :
//  C01a) cashin en échec HTTP → 400, wallet remboursé une fois, ligne REFUNDED.
//  C01b) cashin PENDING → 201 avec payToken = référence stable (préfixe
//        RET-), wallet débité, ligne PENDING_WITHDRAW, pay_token = merchant_tx_id.
//  C01c) cron + check-status FAILED → remboursement ; un SECOND passage du
//        cron ne rembourse PAS deux fois (idempotence de la course).
//  C01d) cron + check-status SUCCESS → COMPLETED sans aucun mouvement wallet
//        (l'argent est parti, l'opérateur confirme l'envoi).
//  C01e) webhook (secret valide) FAILED → remboursement ; REJEU du webhook
//        → aucun second remboursement.
//  C01f) compte SUSPENDU : le cron ne rembourse pas (crédit refusé) mais le
//        retrait reste PENDING_WITHDRAW (argent ni perdu ni rendu à
//        l'opérateur) ; après déblocage, le passage suivant rembourse.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { BpayService } from '../../src/bpay/bpay.service';
import { BpayCronService } from '../../src/bpay/bpay.cron';
import { User, UserRole } from '../../src/users/entities/user.entity';

process.env.BPAY_WEBHOOK_SECRET = process.env.BPAY_WEBHOOK_SECRET || 'test-bpay-secret-invariants';

// Stub du client opérateur : comportement mutable test par test, zéro réseau.
const bpayStub = {
  initierPaiement: async () => ({ payToken: 'STUB-TOKEN', paymentUrl: '', status: 'INITIATED' }),
  retraitVersMobileMoney: async () => {
    throw new Error('BPAY cashin failed: 500');
  },
  verifierStatut: async () => ({ statut: 'PENDING', message: '' }),
};

describe('Invariant C-01 — réconciliation des retraits mobile money', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let cron: BpayCronService;
  let token: string;
  let userId: string;
  let token2: string;
  let userId2: string;
  const api = () => request(app.getHttpServer());

  const SOLDE_INITIAL = 10_000;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ThrottlerStorage)
      .useValue({
        increment: async () => ({ totalHits: 1, timeToExpire: 60000, isBlocked: false, timeToBlockExpire: 0 }),
      })
      .overrideProvider(BpayService)
      .useValue(bpayStub)
      .compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    jwt = app.get(JwtService);
    cron = app.get(BpayCronService, { strict: false });
    await app.get(DbInitService, { strict: false }).runInit();

    const repo = ds.getRepository(User);
    const u1: any = await repo.save(repo.create({
      phone: '+2250700059101', firstName: 'Awa', lastName: 'Retrait', genre: 'femme',
      role: UserRole.MARCHAND, passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    userId = u1.id;
    token = await jwt.signAsync({ sub: u1.id, phone: u1.phone, role: u1.role }, { secret: process.env.JWT_SECRET });

    const u2: any = await repo.save(repo.create({
      phone: '+2250700059102', firstName: 'Fatou', lastName: 'Suspendue', genre: 'femme',
      role: UserRole.MARCHAND, passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    userId2 = u2.id;
    token2 = await jwt.signAsync({ sub: u2.id, phone: u2.phone, role: u2.role }, { secret: process.env.JWT_SECRET });

    await ds.query(
      `INSERT INTO wallets (user_id, solde, solde_bloque) VALUES ($1,$3,0),($2,5000,0)`,
      [userId, userId2, SOLDE_INITIAL],
    );
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  // ── Helpers ─────────────────────────────────────────────────────────
  const soldeDe = async (uid: string): Promise<number> =>
    Number((await ds.query('SELECT solde FROM wallets WHERE user_id = $1', [uid]))[0].solde);

  const statutBpayDe = async (ref: string): Promise<string> =>
    (await ds.query('SELECT status FROM bpay_transactions WHERE merchant_tx_id = $1', [ref]))[0]?.status ?? '';

  const nbRemboursements = async (uid: string, ref: string): Promise<number> =>
    (await ds.query(
      `SELECT COUNT(*)::int AS n FROM wallet_transactions
        WHERE user_id = $1 AND type = 'credit' AND metadata->>'refundOf' = $2`,
      [uid, ref],
    ))[0].n;

  const backdater = async (ref: string) =>
    ds.query(`UPDATE bpay_transactions SET created_at = NOW() - INTERVAL '5 minutes' WHERE merchant_tx_id = $1`, [ref]);

  const passerCron = async () => (cron as any).executerReconciliation();

  /** Retrait dont le cashin reste indéterminé (stub PENDING) → PENDING_WITHDRAW. */
  async function retraitEnAttente(uid: string, bearer: string, montant: number): Promise<string> {
    bpayStub.retraitVersMobileMoney = async () => ({ partnerTransactionId: 'PT-STUB', status: 'PENDING' });
    const res = await api()
      .post('/api/v1/wallets/me/retrait-mobile')
      .set('Authorization', `Bearer ${bearer}`)
      .send({ provider: 'WAVE', montant, telephone: '0701020304' });
    expect([200, 201]).toContain(res.status);
    expect(res.body.status).toBe('PENDING_WITHDRAW');
    expect(String(res.body.payToken)).toMatch(/^RET-/);
    return res.body.payToken;
  }

  // ── C01a : échec HTTP synchrone → remboursement immédiat unique ────
  it('C01a — cashin en échec HTTP : 400, wallet remboursé exactement une fois, ligne REFUNDED', async () => {
    bpayStub.retraitVersMobileMoney = async () => { throw new Error('BPAY cashin failed: 500'); };
    const res = await api()
      .post('/api/v1/wallets/me/retrait-mobile')
      .set('Authorization', `Bearer ${token}`)
      .send({ provider: 'WAVE', montant: 1000, telephone: '0701020304' });
    expect(res.status).toBe(400);
    // Débité PUIS remboursé dans la même requête : solde intact.
    expect(await soldeDe(userId)).toBe(SOLDE_INITIAL);
    // La ligne porte la trace du remboursement (pas un FAILED silencieux).
    const rows = await ds.query(
      `SELECT status, merchant_tx_id FROM bpay_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );
    expect(rows[0].status).toBe('REFUNDED');
    expect(await nbRemboursements(userId, rows[0].merchant_tx_id)).toBe(1);
  });

  // ── C01b : cashin PENDING → PENDING_WITHDRAW, référence stable ──────
  it('C01b — cashin PENDING : 201, wallet débité, PENDING_WITHDRAW, pay_token = merchant_tx_id', async () => {
    const ref = await retraitEnAttente(userId, token, 1500);
    expect(await soldeDe(userId)).toBe(SOLDE_INITIAL - 1500);
    expect(await statutBpayDe(ref)).toBe('PENDING_WITHDRAW');
    const row = (await ds.query(
      'SELECT pay_token, merchant_tx_id FROM bpay_transactions WHERE merchant_tx_id = $1',
      [ref],
    ))[0];
    // Plus jamais de RET-TEMP : la référence est cherchable côté opérateur.
    expect(row.pay_token).toBe(row.merchant_tx_id);
    expect(row.pay_token).toBe(ref);
  });

  // ── C01c : cron FAILED → remboursement UNE fois ─────────────────────
  it('C01c — cron + check-status FAILED : remboursement, et un second passage ne rembourse pas deux fois', async () => {
    const ref = await retraitEnAttente(userId, token, 500);
    await backdater(ref);
    bpayStub.verifierStatut = async () => ({ statut: 'FAILED', message: '' });

    await passerCron();
    expect(await statutBpayDe(ref)).toBe('REFUNDED');
    expect(await soldeDe(userId)).toBe(SOLDE_INITIAL - 1500 - 500 + 500);
    expect(await nbRemboursements(userId, ref)).toBe(1);

    // Second passage (course webhook/cron simulée) : RIEN ne bouge.
    await passerCron();
    expect(await nbRemboursements(userId, ref)).toBe(1);
    expect(await soldeDe(userId)).toBe(SOLDE_INITIAL - 1500);
  });

  // ── C01d : cron SUCCESS → COMPLETED sans mouvement wallet ──────────
  it('C01d — cron + check-status SUCCESS : COMPLETED sans aucun mouvement wallet', async () => {
    const ref = await retraitEnAttente(userId, token, 2000);
    await backdater(ref);
    bpayStub.verifierStatut = async () => ({ statut: 'SUCCESS', message: '' });

    const soldeAvant = await soldeDe(userId);
    await passerCron();
    expect(await statutBpayDe(ref)).toBe('COMPLETED');
    // L'argent est DÉJÀ parti : l'opérateur confirme, aucun mouvement.
    expect(await soldeDe(userId)).toBe(soldeAvant);
    expect(await nbRemboursements(userId, ref)).toBe(0);
  });

  // ── C01e : webhook FAILED → remboursement une fois, rejeu inerte ────
  it('C01e — webhook FAILED : remboursement, et le rejeu du webhook ne rembourse pas deux fois', async () => {
    const ref = await retraitEnAttente(userId, token, 1000);
    bpayStub.verifierStatut = async () => ({ statut: 'FAILED', message: '' });

    const callback = () =>
      api()
        .post('/api/v1/bpay/callback')
        .set('x-bpay-secret', 'test-bpay-secret-invariants')
        .send({ pay_token: ref });

    const res = await callback();
    expect(res.status).toBe(200);
    expect(await statutBpayDe(ref)).toBe('REFUNDED');
    expect(await nbRemboursements(userId, ref)).toBe(1);

    // Rejeu (B-Pay renvoie la même notification) : aucun second mouvement.
    await callback();
    expect(await nbRemboursements(userId, ref)).toBe(1);
    expect(await statutBpayDe(ref)).toBe('REFUNDED');
  });

  // ── C01f : compte suspendu → ni perte ni remboursement prématuré ────
  it('C01f — compte suspendu : remboursement retenu (PENDING_WITHDRAW), effectué après déblocage', async () => {
    const ref = await retraitEnAttente(userId2, token2, 1500);
    expect(await soldeDe(userId2)).toBe(5000 - 1500);
    await backdater(ref);
    bpayStub.verifierStatut = async () => ({ statut: 'FAILED', message: '' });
    await ds.query(`UPDATE users SET status = 'suspendu' WHERE id = $1`, [userId2]);

    await passerCron();
    // Ni remboursement (compte bloqué), ni abandon : le retrait reste en attente.
    expect(await statutBpayDe(ref)).toBe('PENDING_WITHDRAW');
    expect(await soldeDe(userId2)).toBe(3500);
    expect(await nbRemboursements(userId2, ref)).toBe(0);

    await ds.query(`UPDATE users SET status = 'actif' WHERE id = $1`, [userId2]);
    await passerCron();
    expect(await statutBpayDe(ref)).toBe('REFUNDED');
    expect(await soldeDe(userId2)).toBe(5000);
    expect(await nbRemboursements(userId2, ref)).toBe(1);
  });
});
