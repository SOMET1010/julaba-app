// Invariant K1 — Paiement Keiwa d'une commande : bout-en-bout, atomique,
// idempotent, tracé.
//
// Contexte : POST /commandes/:id/paiement (branche Keiwa) est le SEUL endroit
// où l'argent bouge sur le cycle de commande (cf. argent-gele-b2.spec.ts, qui
// prouve l'inverse : rien ne bouge ailleurs). Ce test prouve que, à cet
// endroit précis, le mouvement d'argent réel entre le wallet de l'acheteur et
// celui du vendeur respecte les propriétés exigées par CONSTITUTION.md §7
// (« l'argent est sacré ») sur un VRAI Postgres, via l'API HTTP réelle — pas un
// mock qui masquerait un trou :
//
//  K1a) bout-en-bout : la commande créée, confirmée puis livrée peut être
//       payée via Keiwa ; les DEUX soldes évoluent exactement du montant dû,
//       DEUX écritures wallet_transactions tracées et rattachées à la
//       commande (related_entity_type/id), la commande passe en statut_paiement
//       'paye', et l'historique (GET /wallets/me/transactions) expose les
//       deux mouvements — rien n'est un trou silencieux.
//  K1b) idempotence : REJOUER le même POST (retry réseau, double-clic) ne crée
//       AUCUNE écriture supplémentaire et ne bouge plus les soldes.
//  K1c) atomicité : une panne injectée pendant l'écriture des mouvements
//       wallet ne laisse NI mouvement partiel NI commande marquée payée à
//       tort — rollback intégral.

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

describe("Invariant K1 — paiement Keiwa d'une commande (bout-en-bout, atomique, idempotent)", () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let vendeurId: string;
  let vendeurToken: string;
  let acheteurId: string;
  let acheteurToken: string;
  const api = () => request(app.getHttpServer());

  const SOLDE_INITIAL_ACHETEUR = 50_000;

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
    const vendeur: any = await repo.save(repo.create({
      phone: '+2250700040001', firstName: 'Vendeur', lastName: 'Keiwa', genre: 'homme',
      role: UserRole.PRODUCTEUR, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    vendeurId = vendeur.id;
    vendeurToken = await jwt.signAsync({ sub: vendeur.id, phone: vendeur.phone, role: vendeur.role }, { secret: process.env.JWT_SECRET });
    const acheteur: any = await repo.save(repo.create({
      phone: '+2250700040002', firstName: 'Acheteur', lastName: 'Keiwa', genre: 'femme',
      role: UserRole.MARCHAND, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    acheteurId = acheteur.id;
    acheteurToken = await jwt.signAsync({ sub: acheteur.id, phone: acheteur.phone, role: acheteur.role }, { secret: process.env.JWT_SECRET });

    // Wallets réels avec un solde acheteur connu — c'est ce solde qui doit
    // bouger de façon exacte et tracée, pas un mock.
    await ds.query(
      `INSERT INTO wallets (user_id, solde, solde_bloque) VALUES ($1,$3,0),($2,0,0)`,
      [acheteurId, vendeurId, SOLDE_INITIAL_ACHETEUR],
    );
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  let seq = 0;
  async function creerPublication(dispo: number): Promise<string> {
    seq += 1;
    const rows = await ds.query(
      `INSERT INTO publications
         (user_id, produit, culture, quantite_disponible, quantite_initiale, unite, prix_unitaire, qualite, localisation, active, statut, date_publication)
       VALUES ($1,$3,$3,$2,$2,'kg',500,'standard','Test',true,'disponible', NOW())
       RETURNING id`,
      [vendeurId, dispo, `MangueKeiwa-${seq}`],
    );
    return rows[0].id;
  }

  async function commanderConfirmerLivrer(montant: number): Promise<string> {
    const pubId = await creerPublication(100);
    const quantite = montant / 500;
    const creation = await api()
      .post('/api/v1/commandes')
      .set('Authorization', `Bearer ${acheteurToken}`)
      .send({
        vendeur_id: vendeurId, publication_id: pubId, type: 'achat', produit: 'Mangue',
        quantite, prix_unitaire: 500, total: montant, mode_paiement: 'keiwa',
      });
    expect([200, 201]).toContain(creation.status);
    const commandeId = creation.body.commande.id;
    const confirmee = await api()
      .patch(`/api/v1/commandes/${commandeId}`)
      .set('Authorization', `Bearer ${vendeurToken}`)
      .send({ statut: 'confirmee' });
    expect(confirmee.status).toBe(200);
    const livree = await api()
      .patch(`/api/v1/commandes/${commandeId}`)
      .set('Authorization', `Bearer ${vendeurToken}`)
      .send({ statut: 'livree' });
    expect(livree.status).toBe(200);
    return commandeId;
  }

  const payer = (commandeId: string) =>
    api().post(`/api/v1/commandes/${commandeId}/paiement`).set('Authorization', `Bearer ${vendeurToken}`);

  const soldesDe = async (userId: string): Promise<number> =>
    Number((await ds.query('SELECT solde FROM wallets WHERE user_id = $1', [userId]))[0].solde);
  const txPourCommande = async (commandeId: string) =>
    ds.query(
      `SELECT user_id, type, montant, related_entity_type, related_entity_id
         FROM wallet_transactions WHERE related_entity_id = $1 ORDER BY type`,
      [commandeId],
    );
  const statutPaiementDe = async (commandeId: string): Promise<{ statut_paiement: string; paye_at: Date | null }> =>
    (await ds.query('SELECT statut_paiement, paye_at FROM commandes WHERE id = $1', [commandeId]))[0];

  it('K1a — bout-en-bout : soldes exacts, 2 écritures tracées, commande payée, historique consultable', async () => {
    const montant = 5_000;
    const commandeId = await commanderConfirmerLivrer(montant);

    const soldeAcheteurAvant = await soldesDe(acheteurId);
    const soldeVendeurAvant = await soldesDe(vendeurId);

    const res = await payer(commandeId);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    // Soldes : mouvement exact, ni plus ni moins.
    expect(await soldesDe(acheteurId)).toBe(soldeAcheteurAvant - montant);
    expect(await soldesDe(vendeurId)).toBe(soldeVendeurAvant + montant);

    // Traçabilité : exactement 2 écritures (débit acheteur, crédit vendeur),
    // rattachées à LA commande, jamais supprimées, jamais un tiers mouvement.
    const tx = await txPourCommande(commandeId);
    expect(tx).toHaveLength(2);
    const debit = tx.find((t: any) => t.type === 'debit');
    const credit = tx.find((t: any) => t.type === 'credit');
    expect(debit.user_id).toBe(acheteurId);
    expect(Number(debit.montant)).toBe(montant);
    expect(debit.related_entity_type).toBe('commande');
    expect(credit.user_id).toBe(vendeurId);
    expect(Number(credit.montant)).toBe(montant);
    expect(credit.related_entity_type).toBe('commande');

    // La commande elle-même reflète le paiement.
    const statut = await statutPaiementDe(commandeId);
    expect(statut.statut_paiement).toBe('paye');
    expect(statut.paye_at).not.toBeNull();

    // Historique consultable par les DEUX acteurs (pas seulement en base brute).
    const histoAcheteur = await api().get('/api/v1/wallets/me/transactions').set('Authorization', `Bearer ${acheteurToken}`);
    expect(histoAcheteur.status).toBe(200);
    expect(histoAcheteur.body.some((t: any) => t.montant == montant && t.type === 'debit')).toBe(true);

    const histoVendeur = await api().get('/api/v1/wallets/me/transactions').set('Authorization', `Bearer ${vendeurToken}`);
    expect(histoVendeur.status).toBe(200);
    expect(histoVendeur.body.some((t: any) => t.montant == montant && t.type === 'credit')).toBe(true);
  }, 30000);

  it('K1b — idempotence : rejouer le même paiement ne double AUCUN mouvement', async () => {
    const montant = 3_000;
    const commandeId = await commanderConfirmerLivrer(montant);

    const r1 = await payer(commandeId);
    expect(r1.status).toBe(201);
    const soldeAcheteurApres1 = await soldesDe(acheteurId);
    const soldeVendeurApres1 = await soldesDe(vendeurId);
    expect(await txPourCommande(commandeId)).toHaveLength(2);

    // Rejeu : simule un retry réseau / double-clic sur le même id de commande.
    const r2 = await payer(commandeId);
    expect(r2.status).toBe(201);
    expect(r2.body.success).toBe(true);

    // Toujours 2 écritures — jamais 4 — et soldes STRICTEMENT inchangés.
    expect(await txPourCommande(commandeId)).toHaveLength(2);
    expect(await soldesDe(acheteurId)).toBe(soldeAcheteurApres1);
    expect(await soldesDe(vendeurId)).toBe(soldeVendeurApres1);

    // Un 3e rejeu concurrent-like ne casse rien non plus.
    const r3 = await payer(commandeId);
    expect(r3.status).toBe(201);
    expect(await txPourCommande(commandeId)).toHaveLength(2);
    expect(await soldesDe(acheteurId)).toBe(soldeAcheteurApres1);
  }, 30000);

  it("K1c — atomicité : panne pendant l'écriture ⇒ NI mouvement partiel NI commande marquée payée", async () => {
    const montant = 2_000;
    const commandeId = await commanderConfirmerLivrer(montant);

    const soldeAcheteurAvant = await soldesDe(acheteurId);
    const soldeVendeurAvant = await soldesDe(vendeurId);

    // Injection de panne au niveau base : toute insertion dans
    // wallet_transactions échoue, APRÈS que les soldes aient déjà été modifiés
    // en mémoire dans la transaction SQL — seul un vrai rollback protège ici.
    await ds.query('ALTER TABLE wallet_transactions ADD CONSTRAINT force_fail_test CHECK (false) NOT VALID');
    try {
      const res = await payer(commandeId);
      expect(res.status).toBeGreaterThanOrEqual(500); // l'échec n'est pas avalé en faux succès
    } finally {
      await ds.query('ALTER TABLE wallet_transactions DROP CONSTRAINT force_fail_test');
    }

    // Rollback intégral : soldes intacts, aucune écriture, commande toujours non payée.
    expect(await soldesDe(acheteurId)).toBe(soldeAcheteurAvant);
    expect(await soldesDe(vendeurId)).toBe(soldeVendeurAvant);
    expect(await txPourCommande(commandeId)).toHaveLength(0);
    const statut = await statutPaiementDe(commandeId);
    expect(statut.statut_paiement).toBe('non_paye');

    // Preuve que ce n'est PAS un trou définitif : une fois la panne levée, le
    // MÊME appel (retry) aboutit normalement — bout-en-bout réel, pas un
    // mock qui aurait masqué l'échec.
    const retry = await payer(commandeId);
    expect(retry.status).toBe(201);
    expect(await soldesDe(acheteurId)).toBe(soldeAcheteurAvant - montant);
    expect(await soldesDe(vendeurId)).toBe(soldeVendeurAvant + montant);
    expect(await txPourCommande(commandeId)).toHaveLength(2);
  }, 30000);
});
