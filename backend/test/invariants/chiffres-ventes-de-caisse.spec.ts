// UNE SEULE DÉFINITION DES « TRANSACTIONS » ET DU « VOLUME » : LES VENTES DE CAISSE.
//
// PREUVE QUI TRAVERSE : ventes réelles écrites par POST /caisse/vente (le seul
// chemin de vente) -> base -> chiffres servis à l'institution et au back-office.
//
// LES DÉFAUTS, relevés sur la stack de démo :
//  - le tableau de bord INSTITUTION comptait les transactions de PORTEFEUILLE
//    (Keiwa, hors pilote) au lieu des ventes de caisse de sa zone ;
//  - `/admin/stats` (écran Rapports) additionnait portefeuille + ventes ;
//    l'écran Supervision lisait, lui, toutes les lignes de caisse (ventes,
//    dépenses, annulées) : deux écrans, deux sens pour « volume » ;
//  - « Tous » des Acteurs (`/users/counts-by-role`) comptait TOUS les comptes,
//    la liste (`/users`) seulement les acteurs non supprimés et identifiés.
//
// Une écriture de portefeuille, une vente annulée et une dépense sont posées
// À CÔTÉ de la vente : aucune ne doit entrer dans le chiffre.

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
import { Wallet } from '../../src/wallets/entities/wallet.entity';
import { WalletTransaction, TransactionType } from '../../src/wallets/entities/wallet-transaction.entity';

describe('Chiffres des tableaux de bord : ventes de caisse, une seule définition', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  const api = () => request(app.getHttpServer());

  const ZONE = 'zone-chiffres-ventes';
  const REGION = 'Region-Chiffres-Ventes';
  const VENTE = 40000;
  const VENTE_ANNULEE = 15000;
  const DEPENSE = 12000;
  const PORTEFEUILLE = 99999;

  let tokenAdmin: string;
  let tokenInstitution: string;
  let statsAvant: { montant: number; nombre: number };
  let timelineAvant: number;

  async function seedUser(o: Partial<User> & { role: UserRole; phone: string }): Promise<User> {
    const repo = ds.getRepository(User);
    return repo.save(repo.create({
      firstName: 'Test', lastName: String(o.role), genre: 'femme',
      status: UserStatus.ACTIF, validated: true,
      passwordHash: await bcrypt.hash('1234', 10),
      ...o,
    } as any) as any);
  }
  const tokenFor = (u: User) => jwt.signAsync(
    { sub: u.id, phone: u.phone, role: u.role },
    { secret: process.env.JWT_SECRET },
  );
  const sommeTimeline = (pts: Array<{ transactions: number }>) =>
    pts.reduce((s, p) => s + p.transactions, 0);

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

    const admin = await seedUser({ role: UserRole.SUPER_ADMIN, phone: '+2250788880041' });
    tokenAdmin = await tokenFor(admin);

    const institution = await seedUser({ role: UserRole.INSTITUTION, phone: '+2250788880042' });
    await ds.query(
      `INSERT INTO institutions (nom, responsable_id, zone_id, modules, actif)
       VALUES ($1, $2::uuid, $3, $4::jsonb, true)`,
      ['Institution chiffres', institution.id, ZONE,
        JSON.stringify({ dashboard: 'lecture', acteurs: 'lecture', transactions: 'lecture' })],
    );
    tokenInstitution = await tokenFor(institution);

    // Mesures AVANT : `/admin/stats` et `/admin/timeline` sont globaux et la
    // base est partagée par toute la suite — on raisonne en DELTA.
    const s = await api().get('/api/v1/admin/stats').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(s.status).toBe(200);
    statsAvant = { montant: Number(s.body.montant_total), nombre: Number(s.body.total_transactions) };
    const t = await api().get('/api/v1/admin/timeline').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(t.status).toBe(200);
    timelineAvant = sommeTimeline(t.body);

    const marchande = await seedUser({
      role: UserRole.MARCHAND, phone: '+2250788880043', zoneId: ZONE, region: REGION,
    } as any);
    const tokenMarchande = await tokenFor(marchande);

    // Le bruit Keiwa : une écriture de portefeuille, hors pilote.
    await ds.getRepository(Wallet).save(
      ds.getRepository(Wallet).create({ userId: marchande.id, solde: 0 } as any),
    );
    // DEUX écritures, pour qu'aucun compte ne tombe juste par coïncidence
    // (une écriture de portefeuille contre une vente, c'est 1 = 1).
    for (const montant of [PORTEFEUILLE, PORTEFEUILLE]) {
      await ds.getRepository(WalletTransaction).save(
        ds.getRepository(WalletTransaction).create({
          userId: marchande.id, type: TransactionType.CREDIT, montant, statut: 'completed',
        } as any),
      );
    }

    const v1 = await api().post('/api/v1/caisse/vente').set('Authorization', `Bearer ${tokenMarchande}`)
      .send({ montant: String(VENTE), produits: [{ nom: 'Igname', quantite: 1 }], idempotency_key: 'CV-1' });
    expect([200, 201]).toContain(v1.status);
    const v2 = await api().post('/api/v1/caisse/vente').set('Authorization', `Bearer ${tokenMarchande}`)
      .send({ montant: String(VENTE_ANNULEE), produits: [{ nom: 'Igname', quantite: 1 }], idempotency_key: 'CV-2' });
    expect([200, 201]).toContain(v2.status);
    const annul = await api().patch(`/api/v1/caisse/transactions/${v2.body.transaction.id}/annuler`)
      .set('Authorization', `Bearer ${tokenMarchande}`).send({});
    expect([200, 201]).toContain(annul.status);
    const dep = await api().post('/api/v1/caisse/depense').set('Authorization', `Bearer ${tokenMarchande}`)
      .send({ montant: String(DEPENSE), description: 'Transport', idempotency_key: 'CV-D1' });
    expect([200, 201]).toContain(dep.status);
  }, 90000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('institution : « Transactions » et « Volume » = les ventes de caisse de sa zone, pas le portefeuille', async () => {
    const r = await api().get('/api/v1/institution/dashboard').set('Authorization', `Bearer ${tokenInstitution}`);
    expect(r.status).toBe(200);
    expect(r.body.macroKPIs.volumeTransactions).toBe(1);
    expect(r.body.macroKPIs.valeurMonetaire).toBe(VENTE);
    expect(r.body.macroKPIs.valeurMoyenne).toBe(VENTE);
    expect(r.body.resumeJour.transactionsDuJour).toBe(1);
  });

  it('institution : la liste des transactions est celle des ventes de caisse', async () => {
    const r = await api().get('/api/v1/institution/transactions').set('Authorization', `Bearer ${tokenInstitution}`);
    expect(r.status).toBe(200);
    expect(r.body.data.map((t: any) => t.montant)).toEqual([VENTE]);
  });

  it('/admin/stats (Rapports) : le volume ne mélange plus portefeuille, annulée ni dépense', async () => {
    const r = await api().get('/api/v1/admin/stats').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(r.status).toBe(200);
    expect(Number(r.body.montant_total) - statsAvant.montant).toBe(VENTE);
    expect(Number(r.body.total_transactions) - statsAvant.nombre).toBe(1);
  });

  it('/admin/timeline : compte les ventes de caisse, pas le portefeuille', async () => {
    const r = await api().get('/api/v1/admin/timeline').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(r.status).toBe(200);
    expect(sommeTimeline(r.body) - timelineAvant).toBe(1);
  });

  it('/transactions/all (Supervision) : le résumé suit la même définition, sur tout le filtre', async () => {
    const r = await api().get(`/api/v1/transactions/all?region=${REGION}&limit=1`)
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(r.status).toBe(200);
    // La liste montre tout (vente, annulée, dépense)…
    expect(r.body.total).toBe(3);
    // …le chiffre, lui, ne compte que la vente — indépendamment de la page.
    expect(r.body.resume).toEqual({ nombre_ventes: 1, volume_ventes: VENTE, montants_illisibles: 0 });
  });

  it('Acteurs : le compteur « Tous » compte ce que la liste montre', async () => {
    const liste = await api().get('/api/v1/users?limit=1').set('Authorization', `Bearer ${tokenAdmin}`);
    const compteurs = await api().get('/api/v1/users/counts-by-role').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(liste.status).toBe(200);
    expect(compteurs.status).toBe(200);
    expect(compteurs.body.all).toBe(liste.body.meta.total);

    const marchands = await api().get('/api/v1/users?role=marchand&limit=1').set('Authorization', `Bearer ${tokenAdmin}`);
    expect(compteurs.body.marchand).toBe(marchands.body.meta.total);
  });
});
