// Invariant R7 — Annulation d'une vente → remise en stock cohérente.
//
// Propriété attendue (🟢 après ce lot) : quand un admin passe une vente à
// ANNULEE, le stock RÉELLEMENT retranché est restitué, un mouvement INVERSE est
// tracé dans le ledger append-only (net = 0), le tout ATOMIQUE avec le
// changement de statut. Idempotent : une 2ᵉ annulation ne restitue rien.
// L'argent n'est PAS touché (argent gelé) — seulement stock + statut + ledger.
//
// On vérifie les DEUX effets (stock ET ledger), pas seulement le statut.

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
import { LedgerMouvementType1780400000000 } from '../../src/database/migrations/1780400000000-LedgerMouvementType';

describe('Invariant R7 — annulation vente → remise en stock (🟢)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let token: string;       // marchand (vendeur)
  let adminToken: string;  // admin (annulation)
  let marchandId: string;

  beforeAll(async () => {
    // Neutraliser le throttler : ce lot enchaîne beaucoup de requêtes (ventes +
    // annulations) — sinon des 429 masqueraient la logique testée.
    const mod = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(ThrottlerStorage)
      .useValue({ increment: async () => ({ totalHits: 1, timeToExpire: 60000, isBlocked: false, timeToBlockExpire: 0 }) })
      .compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    jwt = app.get(JwtService);
    await app.get(DbInitService, { strict: false }).runInit();

    // Le schéma de test est bâti par synchronize+DbInit (les invariants
    // n'exécutent pas la chaîne de migrations). On applique la migration ADDITIVE
    // du ledger typé pour disposer de la colonne `type` — source unique : la
    // migration elle-même (pas de DDL dupliqué, pas de DDL via DbInit).
    {
      const qr = ds.createQueryRunner();
      await new LedgerMouvementType1780400000000().up(qr);
      await qr.release();
    }

    const su = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({ phone: '+2250700000077', firstName: 'Awa', lastName: 'R7', role: 'marchand', genre: 'femme' });
    expect([200, 201]).toContain(su.status);
    token = su.body.accessToken;
    marchandId = su.body.user.id;
    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: '0000', newPassword: '1234' });

    // Admin (seed direct + jeton signé), seul habilité à changer un statut.
    const repo = ds.getRepository(User);
    const admin: any = await repo.save(repo.create({
      phone: '+2250700000078', firstName: 'Admin', lastName: 'R7', genre: 'homme',
      role: UserRole.ADMIN_GENERAL, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
    } as any) as any);
    adminToken = await jwt.signAsync(
      { sub: admin.id, phone: admin.phone, role: admin.role },
      { secret: process.env.JWT_SECRET },
    );
  }, 60000);

  afterAll(async () => {
    // Base d'invariants PARTAGÉE entre suites (--runInBand) : on retire l'ADMIN
    // seedé ici pour ne pas polluer l'assertion globale de M6+M8 (« aucun compte
    // à rôle administratif en base »). On ne touche pas au marchand : il porte un
    // wallet (FK) créé au signup, et aucune autre suite ne compte les marchands.
    if (ds?.isInitialized) {
      await ds.query(`DELETE FROM users WHERE phone = $1`, ['+2250700000078']);
    }
    if (app) await app.close();
  });

  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${token}`);
  const createProduit = (nom: string, stock: number) =>
    auth(request(app.getHttpServer()).post('/api/v1/caisse/produits')).send({ nom, stock, prix: 200 });
  const vendre = (body: any) => auth(request(app.getHttpServer()).post('/api/v1/caisse/vente')).send(body);
  const stockOf = async (nom: string) =>
    Number((await ds.query('SELECT stock FROM produits WHERE marchand_id=$1::text AND lower(nom)=lower($2)', [marchandId, nom]))[0]?.stock);
  const netLedger = async (txId: string) =>
    Number((await ds.query('SELECT COALESCE(SUM(quantite_retranchee),0) AS net FROM stock_mouvements WHERE transaction_id=$1', [txId]))[0].net);
  const nbMouvements = async (txId: string) =>
    (await ds.query('SELECT count(*)::int n FROM stock_mouvements WHERE transaction_id=$1', [txId]))[0].n;
  const typesMouvements = async (txId: string) =>
    (await ds.query('SELECT type FROM stock_mouvements WHERE transaction_id=$1 ORDER BY created_at', [txId])).map((r: any) => r.type);
  const annuler = (txId: string, tok = adminToken) =>
    request(app.getHttpServer())
      .patch(`/api/v1/transactions/${txId}`)
      .set('Authorization', `Bearer ${tok}`)
      .send({ statut: 'annulee', motif: 'test annulation R7' });
  const annulerMarchand = (txId: string, tok = token) =>
    request(app.getHttpServer())
      .patch(`/api/v1/caisse/transactions/${txId}/annuler`)
      .set('Authorization', `Bearer ${tok}`)
      .send({});

  it('vente normale puis annulation : stock restitué + mouvement inverse (net 0)', async () => {
    await createProduit('Cafe-R7', 100);
    const v = await vendre({ montant: '6000', produits: [{ nom: 'Cafe-R7', quantite: 30 }], idempotency_key: 'R7-1' });
    expect([200, 201]).toContain(v.status);
    const txId = v.body.transaction.id;
    expect(await stockOf('Cafe-R7')).toBe(70);          // décrément à la vente
    expect(await netLedger(txId)).toBe(30);             // 30 retranchés
    expect(await nbMouvements(txId)).toBe(1);

    const a = await annuler(txId);
    expect(a.status).toBe(200);
    expect(a.body.restitutions).toEqual([              // restitution rapportée
      expect.objectContaining({ produit_nom: 'Cafe-R7', quantite: 30 }),
    ]);
    expect(await stockOf('Cafe-R7')).toBe(100);         // stock RENDU
    expect(await netLedger(txId)).toBe(0);              // net ledger revenu à 0
    expect(await nbMouvements(txId)).toBe(2);           // ligne inverse ajoutée (append-only)
    // Ledger TYPÉ (#19) : la vente porte 'vente' (DEFAULT), la restitution 'annulation'.
    expect(await typesMouvements(txId)).toEqual(['vente', 'annulation']);
  }, 30000);

  it('idempotence : une 2ᵉ annulation ne re-restitue pas', async () => {
    await createProduit('The-R7', 50);
    const v = await vendre({ montant: '2000', produits: [{ nom: 'The-R7', quantite: 20 }], idempotency_key: 'R7-2' });
    const txId = v.body.transaction.id;
    expect(await stockOf('The-R7')).toBe(30);

    const a1 = await annuler(txId);
    expect(a1.status).toBe(200);
    expect(await stockOf('The-R7')).toBe(50);
    expect(await nbMouvements(txId)).toBe(2);

    const a2 = await annuler(txId);                     // rejeu de l'annulation
    expect(a2.status).toBe(200);
    expect(a2.body.restitutions).toEqual([]);           // rien restitué la 2ᵉ fois
    expect(await stockOf('The-R7')).toBe(50);           // stock inchangé (pas de double remise)
    expect(await nbMouvements(txId)).toBe(2);           // aucune nouvelle ligne
  }, 30000);

  it('survente (manquant) : on ne restitue QUE ce qui fut réellement retranché', async () => {
    await createProduit('Mais-R7', 5);
    const v = await vendre({ montant: '4000', produits: [{ nom: 'Mais-R7', quantite: 12 }], idempotency_key: 'R7-3' });
    const txId = v.body.transaction.id;
    expect(await stockOf('Mais-R7')).toBe(0);           // 5 retranchés, 7 manquants
    expect(await netLedger(txId)).toBe(5);

    const a = await annuler(txId);
    expect(a.status).toBe(200);
    expect(await stockOf('Mais-R7')).toBe(5);           // on rend 5 (jamais les 12)
    expect(await netLedger(txId)).toBe(0);
  }, 30000);

  it('autorité : un marchand ne peut pas annuler (403)', async () => {
    await createProduit('Sel-R7', 10);
    const v = await vendre({ montant: '500', produits: [{ nom: 'Sel-R7', quantite: 3 }], idempotency_key: 'R7-4' });
    const txId = v.body.transaction.id;
    const refus = await annuler(txId, token);           // jeton marchand
    expect(refus.status).toBe(403);
    expect(await stockOf('Sel-R7')).toBe(7);            // stock intact (annulation refusée)
  }, 30000);

  // ── Self-service marchand (#20) ─────────────────────────────────────────
  it('#20 — le marchand annule SA vente du jour : stock rendu + statut annulee + ledger typé', async () => {
    await createProduit('Igname-20', 40);
    const v = await vendre({ montant: '3000', produits: [{ nom: 'Igname-20', quantite: 15 }], idempotency_key: '20-1' });
    const txId = v.body.transaction.id;
    expect(await stockOf('Igname-20')).toBe(25);
    const a = await annulerMarchand(txId);
    expect(a.status).toBe(200);
    expect(a.body.statut).toBe('annulee');
    expect(a.body.restitutions).toEqual([expect.objectContaining({ produit_nom: 'Igname-20', quantite: 15 })]);
    expect(await stockOf('Igname-20')).toBe(40);          // stock rendu
    expect(await typesMouvements(txId)).toEqual(['vente', 'annulation']);
  }, 30000);

  it('#20 — un marchand ne peut PAS annuler la vente d’un autre (404)', async () => {
    await createProduit('Banane-20', 10);
    const v = await vendre({ montant: '400', produits: [{ nom: 'Banane-20', quantite: 4 }], idempotency_key: '20-2' });
    const txId = v.body.transaction.id;
    const refus = await annulerMarchand(txId, adminToken); // pas le propriétaire → introuvable
    expect(refus.status).toBe(404);
    expect(await stockOf('Banane-20')).toBe(6);            // intact
  }, 30000);

  it('#20 — vente d’un AUTRE JOUR : non annulable en self-service (400)', async () => {
    await createProduit('Mil-20', 20);
    const v = await vendre({ montant: '1000', produits: [{ nom: 'Mil-20', quantite: 5 }], idempotency_key: '20-3' });
    const txId = v.body.transaction.id;
    await ds.query(`UPDATE caisse_transactions SET created_at = NOW() - INTERVAL '1 day' WHERE id=$1`, [txId]);
    const refus = await annulerMarchand(txId);
    expect(refus.status).toBe(400);
    expect(await stockOf('Mil-20')).toBe(15);              // intact (refusé) — reste du ressort admin
  }, 30000);

  it('#20 — re-annulation self-service rejetée (déjà annulée) : pas de double remise', async () => {
    await createProduit('Sucre-20', 30);
    const v = await vendre({ montant: '2000', produits: [{ nom: 'Sucre-20', quantite: 10 }], idempotency_key: '20-4' });
    const txId = v.body.transaction.id;
    expect((await annulerMarchand(txId)).status).toBe(200);
    expect(await stockOf('Sucre-20')).toBe(30);
    const rejeu = await annulerMarchand(txId);
    expect(rejeu.status).toBe(400);                        // déjà annulée
    expect(await stockOf('Sucre-20')).toBe(30);            // pas de double remise
  }, 30000);
});
