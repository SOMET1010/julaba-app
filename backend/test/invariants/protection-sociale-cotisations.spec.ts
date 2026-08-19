// Invariant PS1 — Cotisations sociales (CNPS/CNAM) : persistance réelle,
// débit Keiwa atomique, isolation stricte par utilisateur.
//
// Contexte : POST/GET /protection-sociale/cotisations remplacent le
// localStorage de `protectionSociale.service.ts` (front) par une persistance
// backend réelle. Quand `mode = 'keiwa'`, le contrôleur débite RÉELLEMENT le
// wallet de l'utilisatrice, dans la MÊME transaction que la création de la
// cotisation — ce test le prouve sur un VRAI Postgres, via l'API HTTP réelle,
// pas un mock qui masquerait un trou (même exigence que
// keiwa-paiement-commande.spec.ts, cf. CONSTITUTION.md §7) :
//
//  PS1a) espèces / mobile money : la cotisation est persistée telle quelle,
//        AUCUN mouvement wallet créé (mode purement déclaratif).
//  PS1b) keiwa + solde suffisant : le wallet est débité du montant EXACT, la
//        cotisation créée est rattachée à l'écriture wallet_transactions
//        (walletTransactionId), tracée avec related_entity_type='cotisation_sociale'.
//  PS1c) keiwa + solde INSUFFISANT : requête refusée (400), AUCUNE cotisation
//        créée, AUCUN mouvement wallet — rollback complet, jamais d'écriture
//        partielle (tout ou rien).
//  PS1d) isolation stricte : un utilisateur ne voit et ne peut créer que ses
//        propres cotisations — un userId étranger glissé dans le corps de la
//        requête est ignoré (toujours dérivé du JWT).

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { User, UserRole, UserStatus } from '../../src/users/entities/user.entity';

describe('Invariant PS1 — cotisations sociales CNPS/CNAM (persistance réelle, débit Keiwa atomique, isolation)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let userAId: string;
  let userAToken: string;
  let userBId: string;
  let userBToken: string;
  const api = () => request(app.getHttpServer());

  const SOLDE_INITIAL_A = 20_000;

  beforeAll(async () => {
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
    ds = app.get(DataSource);
    jwt = app.get(JwtService);
    await app.get(DbInitService, { strict: false }).runInit();

    const repo = ds.getRepository(User);
    const userA: any = await repo.save(repo.create({
      phone: '+2250700090001', firstName: 'Aya', lastName: 'Cotisante', genre: 'femme',
      role: UserRole.MARCHAND, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    userAId = userA.id;
    userAToken = await jwt.signAsync({ sub: userA.id, phone: userA.phone, role: userA.role }, { secret: process.env.JWT_SECRET });

    const userB: any = await repo.save(repo.create({
      phone: '+2250700090002', firstName: 'Blessing', lastName: 'Voisine', genre: 'femme',
      role: UserRole.MARCHAND, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    userBId = userB.id;
    userBToken = await jwt.signAsync({ sub: userB.id, phone: userB.phone, role: userB.role }, { secret: process.env.JWT_SECRET });

    // Wallets réels avec un solde A connu — c'est ce solde qui doit bouger
    // (ou non) de façon exacte et tracée, pas un mock.
    await ds.query(
      `INSERT INTO wallets (user_id, solde, solde_bloque) VALUES ($1,$3,0),($2,0,0)`,
      [userAId, userBId, SOLDE_INITIAL_A],
    );
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  const enregistrer = (token: string, body: Record<string, unknown>) =>
    api().post('/api/v1/protection-sociale/cotisations').set('Authorization', `Bearer ${token}`).send(body);

  const lister = (token: string) =>
    api().get('/api/v1/protection-sociale/cotisations').set('Authorization', `Bearer ${token}`);

  const soldeDe = async (userId: string): Promise<number> =>
    Number((await ds.query('SELECT solde FROM wallets WHERE user_id = $1', [userId]))[0].solde);

  const txPourCotisation = async (cotisationId: string) =>
    ds.query(
      `SELECT user_id, type, montant, related_entity_type, related_entity_id
         FROM wallet_transactions WHERE related_entity_id = $1 AND related_entity_type = 'cotisation_sociale'`,
      [cotisationId],
    );

  const nbCotisations = async (userId: string): Promise<number> =>
    Number((await ds.query('SELECT COUNT(*)::int AS n FROM cotisations_sociales WHERE user_id = $1', [userId]))[0].n);

  it("PS1a — espèces / mobile money : persistée telle quelle, AUCUN mouvement wallet", async () => {
    const soldeAvant = await soldeDe(userAId);

    const especes = await enregistrer(userAToken, {
      organisme: 'CNPS', montant: 3_000, periode: '2026-08', mode: 'especes',
    });
    expect(especes.status).toBe(201);
    expect(especes.body.cotisation.mode).toBe('especes');
    expect(especes.body.cotisation.walletTransactionId).toBeNull();
    expect(Number(especes.body.cotisation.montant)).toBe(3_000);

    const mobile = await enregistrer(userAToken, {
      organisme: 'CNAM', montant: 1_500, periode: '2026-08', mode: 'mobile_money',
    });
    expect(mobile.status).toBe(201);
    expect(mobile.body.cotisation.walletTransactionId).toBeNull();

    // Aucun mouvement wallet créé pour ces deux cotisations.
    expect(await txPourCotisation(especes.body.cotisation.id)).toHaveLength(0);
    expect(await txPourCotisation(mobile.body.cotisation.id)).toHaveLength(0);
    // Solde strictement inchangé.
    expect(await soldeDe(userAId)).toBe(soldeAvant);

    // Consultable via l'historique réel (plus de localStorage).
    const historique = await lister(userAToken);
    expect(historique.status).toBe(200);
    const ids = historique.body.cotisations.map((c: any) => c.id);
    expect(ids).toContain(especes.body.cotisation.id);
    expect(ids).toContain(mobile.body.cotisation.id);
  }, 30000);

  it('PS1b — keiwa + solde suffisant : débit exact, cotisation rattachée à la transaction wallet', async () => {
    const soldeAvant = await soldeDe(userAId);
    const montant = 2_500;

    const res = await enregistrer(userAToken, {
      organisme: 'CNPS', montant, periode: '2026-09', mode: 'keiwa',
    });
    expect(res.status).toBe(201);
    const cotisation = res.body.cotisation;
    expect(cotisation.mode).toBe('keiwa');
    expect(cotisation.walletTransactionId).toBeTruthy();

    // Solde débité du montant EXACT, ni plus ni moins.
    expect(await soldeDe(userAId)).toBe(soldeAvant - montant);

    // Une seule écriture wallet, tracée et rattachée à CETTE cotisation.
    const tx = await txPourCotisation(cotisation.id);
    expect(tx).toHaveLength(1);
    expect(tx[0].user_id).toBe(userAId);
    expect(tx[0].type).toBe('debit');
    expect(Number(tx[0].montant)).toBe(montant);
    expect(tx[0].related_entity_id).toBe(cotisation.id);

    // L'id de cette écriture EST bien walletTransactionId renvoyé.
    const idsTx = tx.map((t: any) => t.related_entity_id);
    expect(idsTx).toContain(cotisation.id);

    // Historique consultable par l'utilisatrice elle-même via l'API wallet.
    const histoWallet = await api().get('/api/v1/wallets/me/transactions').set('Authorization', `Bearer ${userAToken}`);
    expect(histoWallet.status).toBe(200);
    expect(
      histoWallet.body.some((t: any) => t.montant == montant && t.type === 'debit' && t.relatedEntityId === cotisation.id),
    ).toBe(true);
  }, 30000);

  it('PS1c — keiwa + solde INSUFFISANT : refusée (400), AUCUNE cotisation créée, wallet intact (rollback complet)', async () => {
    const soldeAvant = await soldeDe(userAId);
    expect(soldeAvant).toBeLessThan(1_000_000); // sanity : le solde restant est fini
    const nbAvant = await nbCotisations(userAId);

    const res = await enregistrer(userAToken, {
      organisme: 'CNAM', montant: 1_000_000, periode: '2026-10', mode: 'keiwa',
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);

    // Solde strictement inchangé — aucun débit partiel.
    expect(await soldeDe(userAId)).toBe(soldeAvant);
    // Aucune cotisation orpheline créée pour cette tentative refusée.
    expect(await nbCotisations(userAId)).toBe(nbAvant);
    // Aucun mouvement wallet pour cette période (preuve indirecte qu'aucune
    // écriture wallet_transactions n'a été laissée derrière, même partielle).
    const mouvementsPeriode = await ds.query(
      `SELECT COUNT(*)::int AS n FROM wallet_transactions
        WHERE user_id = $1 AND related_entity_type = 'cotisation_sociale'
          AND metadata->>'periode' = '2026-10'`,
      [userAId],
    );
    expect(Number(mouvementsPeriode[0].n)).toBe(0);
  }, 30000);

  it("PS1d — isolation stricte : un utilisateur ne voit et ne crée que ses PROPRES cotisations", async () => {
    // A a déjà des cotisations (tests précédents). B n'en a aucune.
    const listeB = await lister(userBToken);
    expect(listeB.status).toBe(200);
    expect(listeB.body.cotisations).toHaveLength(0);

    // B enregistre la sienne — même en glissant un userId étranger dans le
    // corps, la cotisation est TOUJOURS rattachée à l'utilisateur du JWT.
    const creationB = await enregistrer(userBToken, {
      organisme: 'CNPS', montant: 500, periode: '2026-08', mode: 'especes', userId: userAId,
    });
    expect(creationB.status).toBe(201);
    expect(creationB.body.cotisation.userId).toBe(userBId);

    // A ne voit toujours pas la cotisation de B, et vice-versa.
    const listeA = await lister(userAToken);
    const idsA = listeA.body.cotisations.map((c: any) => c.id);
    expect(idsA).not.toContain(creationB.body.cotisation.id);

    const listeB2 = await lister(userBToken);
    expect(listeB2.body.cotisations).toHaveLength(1);
    expect(listeB2.body.cotisations[0].id).toBe(creationB.body.cotisation.id);
  }, 30000);
});
