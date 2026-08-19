// Invariant T1 — Transfert compte-à-compte (POST /wallets/me/transfert) :
// atomique, idempotent, tracé, et respecte le blocage de compte (#193).
//
// Contexte (audit) : `TransfertPage.tsx` avait des contacts et méthodes de
// paiement codés en dur, et le bouton "Envoyer maintenant" était désactivé
// (aucun appel API). Côté backend, aucun endpoint de transfert compte-à-compte
// n'existait. C'est un transfert INTERNE entre deux comptes Jùlaba déjà
// identifiés — réalisable sans partenaire externe, contrairement à Keiwa
// banque/carte (hors périmètre).
//
// Propriétés vérifiées, contre un VRAI Postgres, via l'API HTTP réelle :
//  T1a) bout-en-bout : recherche du destinataire par téléphone, puis transfert
//       — les DEUX soldes évoluent exactement du montant, DEUX écritures
//       wallet_transactions tracées et liées par une référence commune
//       (relatedEntityType='transfert'), l'historique des deux acteurs
//       expose le mouvement.
//  T1b) idempotence : REJOUER la même requête (même idempotencyKey — retry
//       réseau, double-clic) ne crée AUCUNE écriture supplémentaire et ne
//       bouge plus les soldes.
//  T1c) solde insuffisant : transfert refusé (>=400), rien ne bouge.
//  T1d) compte bloqué (émetteur OU destinataire) : transfert refusé, rollback
//       intégral — cf. WalletsService.assertCompteActif posé par #193.
//  T1e) atomicité : une panne injectée pendant l'écriture des mouvements
//       wallet ne laisse ni mouvement partiel ni solde modifié — rollback
//       intégral, et un retry ultérieur aboutit normalement.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ThrottlerStorage } from '@nestjs/throttler';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { User, UserRole, UserStatus } from '../../src/users/entities/user.entity';

describe('Invariant T1 — transfert compte-à-compte (atomique, idempotent, tracé)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let adminToken: string;
  let expediteurId: string;
  let expediteurToken: string;
  let expediteurPhone: string;
  let destinataireId: string;
  let destinataireToken: string;
  let destinatairePhone: string;
  const api = () => request(app.getHttpServer());

  const SOLDE_INITIAL_EXPEDITEUR = 30_000;

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
      phone: '+2250700060000', firstName: 'Admin', lastName: 'Transfert', genre: 'femme',
      role: UserRole.ADMIN_GENERAL, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    adminToken = await jwt.signAsync({ sub: admin.id, phone: admin.phone, role: admin.role }, { secret: process.env.JWT_SECRET });

    expediteurPhone = '+2250700060001';
    const expediteur: any = await repo.save(repo.create({
      phone: expediteurPhone, firstName: 'Aya', lastName: 'Expediteur', genre: 'femme',
      role: UserRole.MARCHAND, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    expediteurId = expediteur.id;
    expediteurToken = await jwt.signAsync({ sub: expediteur.id, phone: expediteur.phone, role: expediteur.role }, { secret: process.env.JWT_SECRET });

    destinatairePhone = '+2250700060002';
    const destinataire: any = await repo.save(repo.create({
      phone: destinatairePhone, firstName: 'Boubacar', lastName: 'Destinataire', genre: 'homme',
      role: UserRole.PRODUCTEUR, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    destinataireId = destinataire.id;
    destinataireToken = await jwt.signAsync({ sub: destinataire.id, phone: destinataire.phone, role: destinataire.role }, { secret: process.env.JWT_SECRET });

    // Wallets réels avec un solde expéditeur connu.
    await ds.query(
      `INSERT INTO wallets (user_id, solde, solde_bloque) VALUES ($1,$3,0),($2,0,0)`,
      [expediteurId, destinataireId, SOLDE_INITIAL_EXPEDITEUR],
    );
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  const soldesDe = async (userId: string): Promise<number> =>
    Number((await ds.query('SELECT solde FROM wallets WHERE user_id = $1', [userId]))[0].solde);
  const statutDe = async (userId: string): Promise<string> =>
    (await ds.query('SELECT status FROM users WHERE id = $1', [userId]))[0].status;
  const txPourReference = async (reference: string) =>
    ds.query(
      `SELECT user_id, type, montant, related_entity_type, related_entity_id, idempotency_key
         FROM wallet_transactions WHERE related_entity_id = $1 ORDER BY type`,
      [reference],
    );

  const rechercher = (telephone: string, token: string) =>
    api().post('/api/v1/wallets/me/rechercher-destinataire').set('Authorization', `Bearer ${token}`).send({ telephone });

  const transferer = (
    token: string,
    body: { destinataireTelephone?: string; destinataireUserId?: string; montant: number; note?: string; idempotencyKey?: string },
  ) => api().post('/api/v1/wallets/me/transfert').set('Authorization', `Bearer ${token}`).send(body);

  it('T1a — bout-en-bout : recherche destinataire puis transfert, soldes exacts, 2 écritures liées, historique consultable', async () => {
    const recherche = await rechercher(destinatairePhone, expediteurToken);
    expect(recherche.status).toBe(201);
    expect(recherche.body.id).toBe(destinataireId);
    expect(recherche.body.nom).toBe('Destinataire');

    const montant = 5_000;
    const soldeExpediteurAvant = await soldesDe(expediteurId);
    const soldeDestinataireAvant = await soldesDe(destinataireId);
    const idempotencyKey = randomUUID();

    const res = await transferer(expediteurToken, {
      destinataireTelephone: destinatairePhone,
      montant,
      note: 'Pour le marché',
      idempotencyKey,
    });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.dejaTraite).toBe(false);
    expect(typeof res.body.reference).toBe('string');

    // Soldes : mouvement exact, ni plus ni moins.
    expect(await soldesDe(expediteurId)).toBe(soldeExpediteurAvant - montant);
    expect(await soldesDe(destinataireId)).toBe(soldeDestinataireAvant + montant);
    expect(res.body.solde).toBe(soldeExpediteurAvant - montant);

    // Traçabilité : exactement 2 écritures (débit expéditeur, crédit
    // destinataire), liées par une référence commune, jamais un tiers mouvement.
    const tx = await txPourReference(res.body.reference);
    expect(tx).toHaveLength(2);
    const debit = tx.find((t: any) => t.type === 'debit');
    const credit = tx.find((t: any) => t.type === 'credit');
    expect(debit.user_id).toBe(expediteurId);
    expect(Number(debit.montant)).toBe(montant);
    expect(debit.related_entity_type).toBe('transfert');
    expect(debit.idempotency_key).toBe(idempotencyKey);
    expect(credit.user_id).toBe(destinataireId);
    expect(Number(credit.montant)).toBe(montant);
    expect(credit.related_entity_type).toBe('transfert');
    expect(credit.related_entity_id).toBe(debit.related_entity_id);

    // Historique consultable par les DEUX acteurs.
    const histoExpediteur = await api().get('/api/v1/wallets/me/transactions').set('Authorization', `Bearer ${expediteurToken}`);
    expect(histoExpediteur.status).toBe(200);
    expect(histoExpediteur.body.some((t: any) => t.montant == montant && t.type === 'debit')).toBe(true);

    const histoDestinataire = await api().get('/api/v1/wallets/me/transactions').set('Authorization', `Bearer ${destinataireToken}`);
    expect(histoDestinataire.status).toBe(200);
    expect(histoDestinataire.body.some((t: any) => t.montant == montant && t.type === 'credit')).toBe(true);
  }, 30000);

  it('T1b — idempotence : rejouer la même clé ne double AUCUN mouvement', async () => {
    const montant = 2_500;
    const idempotencyKey = randomUUID();

    const r1 = await transferer(expediteurToken, { destinataireUserId: destinataireId, montant, idempotencyKey });
    expect(r1.status).toBe(201);
    const reference = r1.body.reference;
    const soldeExpediteurApres1 = await soldesDe(expediteurId);
    const soldeDestinataireApres1 = await soldesDe(destinataireId);
    expect(await txPourReference(reference)).toHaveLength(2);

    // Rejeu : simule un retry réseau / double-clic sur "Envoyer maintenant".
    const r2 = await transferer(expediteurToken, { destinataireUserId: destinataireId, montant, idempotencyKey });
    expect(r2.status).toBe(201);
    expect(r2.body.dejaTraite).toBe(true);
    expect(r2.body.reference).toBe(reference);

    // Toujours 2 écritures — jamais 4 — et soldes STRICTEMENT inchangés.
    expect(await txPourReference(reference)).toHaveLength(2);
    expect(await soldesDe(expediteurId)).toBe(soldeExpediteurApres1);
    expect(await soldesDe(destinataireId)).toBe(soldeDestinataireApres1);

    // Un 3e rejeu ne casse rien non plus.
    const r3 = await transferer(expediteurToken, { destinataireUserId: destinataireId, montant, idempotencyKey });
    expect(r3.status).toBe(201);
    expect(await txPourReference(reference)).toHaveLength(2);
    expect(await soldesDe(expediteurId)).toBe(soldeExpediteurApres1);

    // Deux requêtes CONCURRENTES avec la même clé (course réelle sur la
    // contrainte unique en base) : une seule doit gagner la course d'écriture,
    // aucune ne doit planter en 500, et le résultat reste 2 écritures.
    const montantConcurrent = 1_500;
    const cleConcurrente = randomUUID();
    const [c1, c2] = await Promise.all([
      transferer(expediteurToken, { destinataireUserId: destinataireId, montant: montantConcurrent, idempotencyKey: cleConcurrente }),
      transferer(expediteurToken, { destinataireUserId: destinataireId, montant: montantConcurrent, idempotencyKey: cleConcurrente }),
    ]);
    expect([c1.status, c2.status]).toEqual([201, 201]);
    expect(c1.body.reference).toBe(c2.body.reference);
    expect(await txPourReference(c1.body.reference)).toHaveLength(2);
  }, 30000);

  it('T1c — solde insuffisant : transfert refusé, rien ne bouge', async () => {
    const soldeExpediteurAvant = await soldesDe(expediteurId);
    const soldeDestinataireAvant = await soldesDe(destinataireId);
    const montantExcessif = soldeExpediteurAvant + 10_000;

    const res = await transferer(expediteurToken, {
      destinataireUserId: destinataireId,
      montant: montantExcessif,
      idempotencyKey: randomUUID(),
    });
    expect(res.status).toBe(400);

    expect(await soldesDe(expediteurId)).toBe(soldeExpediteurAvant);
    expect(await soldesDe(destinataireId)).toBe(soldeDestinataireAvant);
  });

  it("T1d — compte destinataire bloqué : transfert refusé, rollback intégral", async () => {
    const blocage = await api()
      .post(`/api/v1/admin/wallets/${destinataireId}/bloquer`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ raison: 'Test transfert vers compte bloqué' });
    expect(blocage.status).toBe(201);
    expect(await statutDe(destinataireId)).toBe('suspendu');

    const soldeExpediteurAvant = await soldesDe(expediteurId);
    const soldeDestinataireAvant = await soldesDe(destinataireId);

    const res = await transferer(expediteurToken, {
      destinataireUserId: destinataireId,
      montant: 1_000,
      idempotencyKey: randomUUID(),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);

    expect(await soldesDe(expediteurId)).toBe(soldeExpediteurAvant);
    expect(await soldesDe(destinataireId)).toBe(soldeDestinataireAvant);

    // Débloquer pour ne pas polluer les tests suivants.
    const deblocage = await api()
      .post(`/api/v1/admin/wallets/${destinataireId}/debloquer`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deblocage.status).toBe(201);
    expect(await statutDe(destinataireId)).toBe('actif');
  });

  it("T1d-bis — compte EXPÉDITEUR bloqué : transfert refusé même s'il tente lui-même l'envoi", async () => {
    const blocage = await api()
      .post(`/api/v1/admin/wallets/${expediteurId}/bloquer`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ raison: 'Test expéditeur bloqué' });
    expect(blocage.status).toBe(201);

    const soldeExpediteurAvant = await soldesDe(expediteurId);
    const soldeDestinataireAvant = await soldesDe(destinataireId);

    const res = await transferer(expediteurToken, {
      destinataireUserId: destinataireId,
      montant: 1_000,
      idempotencyKey: randomUUID(),
    });
    // Le compte étant suspendu, l'auth JWT elle-même peut déjà refuser
    // l'appel (JwtStrategy) — dans tous les cas, aucun mouvement n'a lieu.
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);

    expect(await soldesDe(expediteurId)).toBe(soldeExpediteurAvant);
    expect(await soldesDe(destinataireId)).toBe(soldeDestinataireAvant);

    const deblocage = await api()
      .post(`/api/v1/admin/wallets/${expediteurId}/debloquer`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(deblocage.status).toBe(201);
  });

  it("T1e — atomicité : panne pendant l'écriture ⇒ NI mouvement partiel NI solde modifié, retry ultérieur aboutit", async () => {
    const montant = 1_200;
    const soldeExpediteurAvant = await soldesDe(expediteurId);
    const soldeDestinataireAvant = await soldesDe(destinataireId);
    const idempotencyKey = randomUUID();

    // Injection de panne au niveau base : toute insertion dans
    // wallet_transactions échoue, APRÈS que les soldes aient déjà été
    // modifiés en mémoire dans la transaction SQL — seul un vrai rollback
    // protège ici.
    await ds.query('ALTER TABLE wallet_transactions ADD CONSTRAINT force_fail_test_transfert CHECK (false) NOT VALID');
    try {
      const res = await transferer(expediteurToken, { destinataireUserId: destinataireId, montant, idempotencyKey });
      expect(res.status).toBeGreaterThanOrEqual(500); // l'échec n'est pas avalé en faux succès
    } finally {
      await ds.query('ALTER TABLE wallet_transactions DROP CONSTRAINT force_fail_test_transfert');
    }

    // Rollback intégral : soldes intacts, aucune écriture.
    expect(await soldesDe(expediteurId)).toBe(soldeExpediteurAvant);
    expect(await soldesDe(destinataireId)).toBe(soldeDestinataireAvant);

    // Preuve que ce n'est PAS un trou définitif : une fois la panne levée, le
    // MÊME appel (même idempotencyKey, retry) aboutit normalement.
    const retry = await transferer(expediteurToken, { destinataireUserId: destinataireId, montant, idempotencyKey });
    expect(retry.status).toBe(201);
    expect(retry.body.dejaTraite).toBe(false);
    expect(await soldesDe(expediteurId)).toBe(soldeExpediteurAvant - montant);
    expect(await soldesDe(destinataireId)).toBe(soldeDestinataireAvant + montant);
    expect(await txPourReference(retry.body.reference)).toHaveLength(2);
  }, 30000);
});
