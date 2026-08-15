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
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { User, UserRole, UserStatus } from '../../src/users/entities/user.entity';

describe('Invariant R7 — annulation vente → remise en stock (🟢)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let token: string;       // marchand (vendeur)
  let adminToken: string;  // admin (annulation)
  let marchandId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    jwt = app.get(JwtService);
    await app.get(DbInitService, { strict: false }).runInit();

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
  const annuler = (txId: string, tok = adminToken) =>
    request(app.getHttpServer())
      .patch(`/api/v1/transactions/${txId}`)
      .set('Authorization', `Bearer ${tok}`)
      .send({ statut: 'annulee', motif: 'test annulation R7' });

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
});
