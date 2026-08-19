// Invariant B3 — BLOCAGE RÉEL D'UN WALLET : bloquer un compte doit vraiment
// l'empêcher de bouger de l'argent, dans les deux sens, y compris quand le
// mouvement est déclenché par un tiers ; débloquer doit vraiment le
// réautoriser.
//
// Contexte (audit) : deux contrôleurs existaient pour l'admin des wallets.
// Celui monté dans AdminModule (POST /admin/wallets/:userId/bloquer) ne
// faisait QU'insérer une transaction wallet fictive à 0 FCFA — rien
// n'empêchait le compte de continuer à émettre/recevoir des mouvements.
// Corrigé : bloquer bascule users.status = 'suspendu' (source unique de
// vérité, cf. WalletsService.assertCompteActif), vérifié à CHAQUE point
// d'écriture wallet, pas seulement à la connexion.
//
// Propriétés vérifiées :
//  B3a) bloquer un compte : users.status passe à 'suspendu' (visible dans
//       GET /admin/wallets), pas de champ fictif "solde_bloque" détourné.
//  B3b) compte bloqué : un crédit ADMIN et un débit ADMIN sur ce wallet sont
//       tous deux refusés (403), soldes strictement inchangés.
//  B3c) compte bloqué : un paiement Keiwa de commande où le compte bloqué est
//       l'ACHETEUR échoue proprement (>=400) même si c'est le VENDEUR (actif)
//       qui déclenche l'appel — la protection ne dépend pas de qui appelle.
//       Rollback intégral : ni solde touché, ni écriture, ni commande payée.
//  B3d) débloquer réautorise immédiatement : le même crédit admin, puis le
//       même paiement Keiwa (rejoué sur la même commande), aboutissent.

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

describe("Invariant B3 — blocage réel d'un wallet (bloquer/débloquer)", () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let adminToken: string;
  let vendeurId: string;
  let vendeurToken: string;
  let acheteurId: string;
  let acheteurToken: string;
  let commandeBloquee: string;
  const api = () => request(app.getHttpServer());

  const SOLDE_INITIAL_ACHETEUR = 20_000;

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

    const admin: any = await repo.save(repo.create({
      phone: '+2250700050000', firstName: 'Admin', lastName: 'Blocage', genre: 'femme',
      role: UserRole.ADMIN_GENERAL, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    adminToken = await jwt.signAsync({ sub: admin.id, phone: admin.phone, role: admin.role }, { secret: process.env.JWT_SECRET });

    const vendeur: any = await repo.save(repo.create({
      phone: '+2250700050001', firstName: 'Vendeur', lastName: 'Blocage', genre: 'homme',
      role: UserRole.PRODUCTEUR, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    vendeurId = vendeur.id;
    vendeurToken = await jwt.signAsync({ sub: vendeur.id, phone: vendeur.phone, role: vendeur.role }, { secret: process.env.JWT_SECRET });

    const acheteur: any = await repo.save(repo.create({
      phone: '+2250700050002', firstName: 'Acheteur', lastName: 'Blocage', genre: 'femme',
      role: UserRole.MARCHAND, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    acheteurId = acheteur.id;
    acheteurToken = await jwt.signAsync({ sub: acheteur.id, phone: acheteur.phone, role: acheteur.role }, { secret: process.env.JWT_SECRET });

    // Wallets réels — c'est l'ACHETEUR qu'on va bloquer.
    await ds.query(
      `INSERT INTO wallets (user_id, solde, solde_bloque) VALUES ($1,$3,0),($2,0,0)`,
      [acheteurId, vendeurId, SOLDE_INITIAL_ACHETEUR],
    );

    // La commande Keiwa est créée/confirmée/livrée MAINTENANT, pendant que
    // l'acheteur est encore actif : la créer via son propre token APRÈS
    // blocage échouerait dès l'authentification (JwtStrategy rejette tout
    // appel d'un compte 'suspendu'), ce qui ne testerait pas ce qu'on veut
    // ici — à savoir le refus du MOUVEMENT D'ARGENT lui-même, déclenché par
    // le vendeur, sur une commande déjà légitimement en attente de paiement.
    commandeBloquee = await commanderConfirmerLivrer(4_000);
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
      [vendeurId, dispo, `IgnameBlocage-${seq}`],
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
        vendeur_id: vendeurId, publication_id: pubId, type: 'achat', produit: 'Igname',
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
    // C'est le VENDEUR (actif) qui déclenche le paiement — pas l'acheteur
    // bloqué. La protection doit tenir même si l'appelant n'est pas le
    // titulaire du compte bloqué.
    api().post(`/api/v1/commandes/${commandeId}/paiement`).set('Authorization', `Bearer ${vendeurToken}`);

  const soldesDe = async (userId: string): Promise<number> =>
    Number((await ds.query('SELECT solde FROM wallets WHERE user_id = $1', [userId]))[0].solde);
  const statutDe = async (userId: string): Promise<string> =>
    (await ds.query('SELECT status FROM users WHERE id = $1', [userId]))[0].status;
  const txPourCommande = async (commandeId: string) =>
    ds.query('SELECT id FROM wallet_transactions WHERE related_entity_id = $1', [commandeId]);
  const statutPaiementDe = async (commandeId: string): Promise<string> =>
    (await ds.query('SELECT statut_paiement FROM commandes WHERE id = $1', [commandeId]))[0].statut_paiement;

  it('B3a — bloquer un compte bascule réellement users.status sur suspendu', async () => {
    expect(await statutDe(acheteurId)).toBe('actif');

    const res = await api()
      .post(`/api/v1/admin/wallets/${acheteurId}/bloquer`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ raison: 'Activité suspecte (test)' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);

    expect(await statutDe(acheteurId)).toBe('suspendu');

    // Visible dans la liste back-office (pas un statut fictif figé à 'actif').
    const liste = await api()
      .get('/api/v1/admin/wallets')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(liste.status).toBe(200);
    const ligne = liste.body.wallets.find((w: any) => w.user_id === acheteurId);
    expect(ligne.status).toBe('suspendu');
  });

  it('B3b — compte bloqué : crédit ET débit admin refusés, soldes inchangés', async () => {
    const soldeAvant = await soldesDe(acheteurId);

    const credit = await api()
      .post(`/api/v1/admin/wallets/${acheteurId}/credit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ montant: 1000, description: 'Tentative crédit sur compte bloqué' });
    expect(credit.status).toBe(403);

    const debit = await api()
      .post(`/api/v1/admin/wallets/${acheteurId}/debit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ montant: 1000, description: 'Tentative débit sur compte bloqué' });
    expect(debit.status).toBe(403);

    expect(await soldesDe(acheteurId)).toBe(soldeAvant);
  });

  it("B3c — compte bloqué : paiement Keiwa refusé même déclenché par l'autre partie, rollback intégral", async () => {
    const soldeAcheteurAvant = await soldesDe(acheteurId);
    const soldeVendeurAvant = await soldesDe(vendeurId);

    const res = await payer(commandeBloquee);
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500); // refus propre (403), pas un crash serveur

    // Rollback intégral : rien n'a bougé nulle part.
    expect(await soldesDe(acheteurId)).toBe(soldeAcheteurAvant);
    expect(await soldesDe(vendeurId)).toBe(soldeVendeurAvant);
    expect(await txPourCommande(commandeBloquee)).toHaveLength(0);
    expect(await statutPaiementDe(commandeBloquee)).toBe('non_paye');
  });

  it('B3d — débloquer réautorise immédiatement crédit admin et paiement Keiwa', async () => {
    const res = await api()
      .post(`/api/v1/admin/wallets/${acheteurId}/debloquer`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(await statutDe(acheteurId)).toBe('actif');

    // Crédit admin repasse.
    const soldeAvant = await soldesDe(acheteurId);
    const credit = await api()
      .post(`/api/v1/admin/wallets/${acheteurId}/credit`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ montant: 1000, description: 'Crédit après déblocage' });
    expect(credit.status).toBe(201);
    expect(await soldesDe(acheteurId)).toBe(soldeAvant + 1000);

    // Rejeu du MÊME paiement Keiwa (même commande, toujours non_paye) : passe.
    const montant = 4_000;
    const soldeAcheteurAvant = await soldesDe(acheteurId);
    const soldeVendeurAvant = await soldesDe(vendeurId);

    const paiement = await payer(commandeBloquee);
    expect(paiement.status).toBe(201);
    expect(paiement.body.success).toBe(true);

    expect(await soldesDe(acheteurId)).toBe(soldeAcheteurAvant - montant);
    expect(await soldesDe(vendeurId)).toBe(soldeVendeurAvant + montant);
    expect(await txPourCommande(commandeBloquee)).toHaveLength(2);
    expect(await statutPaiementDe(commandeBloquee)).toBe('paye');
  });
});
