// IDENT-02 — la neutralité monétique de l'identificateur est SERVEUR, plus
// une convention de navigation (20/10/2026).
//
// Constat (AUDIT-PARCOURS-IDENTIFICATEUR §IDENT-02) : wallets.controller.ts
// ne portait QUE JwtAuthGuard — recharge, retrait, transfert, historique
// étaient ouverts à TOUT compte authentifié. La neutralité de
// l'identificateur (IDENTIFICATEUR-16, arbitrage A-02 : PAS de réintégration
// KEIWA, l'acteur qui enrôle ne touche pas à l'argent) n'était garantie que
// par l'ABSENCE de liens dans routes.tsx — un identificateur avec le token
// d'un autre, ou simplement curl + son propre JWT, avait un wallet à portée
// de main.
//
// Correctif : whitelist @Roles sur tout WalletsController — marchand,
// producteur, cooperateur (les profils dont le wallet est une réalité du
// pilote). SONT EXCLUS par construction : identificateur (A-02, neutre),
// institution (le régulateur n'a pas de portefeuille — même logique que
// l'export de supervision honnête), comptes admin (doctrine
// blocage-wallet-admin : l'admin gère les blocages, il ne fait pas de
// mouvements). Fail-closed : tout nouveau rôle ajouté à l'ENUM sera refusé
// par défaut tant que personne ne l'ajoute explicitement à la whitelist.
//
// Propriétés vérifiées (🟢 attendu) :
//  - IDENT-02-a : identificateur → 403 sur les HUIT routes (lecture, écriture,
//    recherche de destinataire, transfert, statut de paiement).
//  - IDENT-02-b : institution et admin_general → 403 également (aucune
//    dérive « tout compte a un wallet » sans décision écrite).
//  - IDENT-02-c : marchand avec wallet → 200 sur ses routes de lecture
//    (non-régression du seul parcours réel : keiwa-paiement-commande).

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ThrottlerStorage } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { User, UserRole } from '../../src/users/entities/user.entity';

describe('Invariant IDENT-02 — neutralité monétique servée sur wallets (🟢 attendu)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;

  let tokenIdentificateur: string;
  let tokenInstitution: string;
  let tokenAdminGeneral: string;
  let tokenMarchand: string;
  let identId: string;

  const api = () => request(app.getHttpServer());

  const seedUser = async (role: UserRole, phone: string): Promise<{ id: string; token: string }> => {
    const repo = ds.getRepository(User);
    const u = repo.create({
      phone, firstName: 'Agent', lastName: role, genre: 'homme',
      role, status: 'actif' as any, passwordHash: await bcrypt.hash('1234', 10),
    } as any);
    const saved: any = await repo.save(u as any);
    const token = await jwt.signAsync(
      { sub: saved.id, phone: saved.phone, role: saved.role },
      { secret: process.env.JWT_SECRET },
    );
    return { id: saved.id, token };
  };

  const seedWallet = async (userId: string, solde: number): Promise<void> => {
    await ds.query(
      `INSERT INTO wallets (user_id, solde, solde_bloque) VALUES ($1, $2, 0)`,
      [userId, solde],
    );
  };

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
    jwt = app.get(JwtService);
    await app.get(DbInitService, { strict: false }).runInit();

    // L'identificateur : PAS de wallet seedé — sa neutralité n'a pas besoin
    // d'un solde à zéro pour tenir, elle tient SANS portefeuille.
    const ident = await seedUser(UserRole.IDENTIFICATEUR, '+2250700000910');
    tokenIdentificateur = ident.token;
    identId = ident.id;

    const inst = await seedUser(UserRole.INSTITUTION, '+2250700000911');
    tokenInstitution = inst.token;

    const admin = await seedUser(UserRole.ADMIN_GENERAL, '+2250700000912');
    tokenAdminGeneral = admin.token;

    // Le marchand, seul profil dont le wallet est réel au pilote.
    const marchand = await seedUser(UserRole.MARCHAND, '+2250700000913');
    tokenMarchand = marchand.token;
    await seedWallet(marchand.id, 5000);
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
  });

  const ROUTES_LECTURE: Array<[string, string]> = [
    ['GET', '/api/v1/wallets/me'],
    ['GET', '/api/v1/wallets/me/transactions'],
    ['GET', '/api/v1/wallets/me/pending'],
  ];
  const ROUTES_ECRITURE: Array<[string, string, any]> = [
    ['POST', '/api/v1/wallets/me/recharge-mobile', { provider: 'orange_ci', montant: 500, telephone: '+2250700000910' }],
    ['POST', '/api/v1/wallets/me/retrait-mobile', { provider: 'orange_ci', montant: 500, telephone: '+2250700000910' }],
    ['POST', '/api/v1/wallets/me/rechercher-destinataire', { telephone: '+2250700000913' }],
    ['POST', '/api/v1/wallets/me/transfert', { destinataire: '+2250700000913', montant: 500 }],
    ['POST', '/api/v1/wallets/me/statut-paiement', { merchantTransactionId: 'RCH-fake-1' }],
  ];

  it('IDENT-02-a : identificateur → 403 sur TOUTES les routes wallet (lecture ET écriture)', async () => {
    for (const [methode, route] of ROUTES_LECTURE) {
      const r = await api()
        [methode.toLowerCase() as 'get'](route)
        .set('Authorization', `Bearer ${tokenIdentificateur}`);
      expect({ route, statut: r.status }).toEqual({ route, statut: 403 });
    }
    for (const [methode, route, corps] of ROUTES_ECRITURE) {
      const r = await api()
        [methode.toLowerCase() as 'post'](route)
        .set('Authorization', `Bearer ${tokenIdentificateur}`)
        .send(corps);
      expect({ route, statut: r.status }).toEqual({ route, statut: 403 });
    }

    // Zéro écriture n'a eu lieu : LE compte identificateur de ce test n'a ni
    // wallet ni transaction en base.
    //
    // (20/10/2026, rang banc unitaire) L'assertion comptait les wallets de
    // TOUS les identificateurs de la base. Sur la base partagée des
    // invariants, la propriété dépendait de l'ORDRE des suites : un signup
    // d'identificateur fait ailleurs (m6-m8 — auth.service.signup appelle
    // createForUser pour tout rôle) allouait un wallet, et ce test devenait
    // rouge ou vert selon le tri de jest — le syndrome « instable » exact
    // que le garde telephones-tests-uniques décrit. Ce que ce test prouve
    // est la neutralité SERVEUR face à SES huit appels : l'ident seedé ici
    // reste sans portefeuille. La largeur « aucun identificateur de la base
    // n'a de ligne » est une question de doctrine différente (lignes wallet
    // fantômes des rôles exclus), consignée au registre — pas à prouver
    // ici, où elle ne dépend d'aucune des huit routes sous test.
    const wallets = await ds.query(
      `SELECT COUNT(*)::int AS n FROM wallets WHERE user_id = $1`,
      [identId],
    );
    expect(wallets[0].n).toBe(0);
  });

  it('IDENT-02-b : institution et admin_general → 403 (le régulateur et l\u2019admin ne portent pas de wallet)', async () => {
    const rInst = await api()
      .get('/api/v1/wallets/me')
      .set('Authorization', `Bearer ${tokenInstitution}`);
    expect(rInst.status).toBe(403);

    const rAdmin = await api()
      .get('/api/v1/wallets/me')
      .set('Authorization', `Bearer ${tokenAdminGeneral}`);
    expect(rAdmin.status).toBe(403);

    const rAdminTransfert = await api()
      .post('/api/v1/wallets/me/transfert')
      .set('Authorization', `Bearer ${tokenAdminGeneral}`)
      .send({ destinataire: '+2250700000913', montant: 500 });
    expect(rAdminTransfert.status).toBe(403);
  });

  it('IDENT-02-c : non-régression — le marchand lit SON wallet et SES transactions', async () => {
    const me = await api()
      .get('/api/v1/wallets/me')
      .set('Authorization', `Bearer ${tokenMarchand}`);
    expect(me.status).toBe(200);
    expect(Number(me.body?.solde ?? me.body?.solde ?? 0)).toBeGreaterThanOrEqual(0);

    const tx = await api()
      .get('/api/v1/wallets/me/transactions')
      .set('Authorization', `Bearer ${tokenMarchand}`);
    expect(tx.status).toBe(200);
  });
});
