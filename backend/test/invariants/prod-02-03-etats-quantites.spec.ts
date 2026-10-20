// PROD-02 + PROD-03 — LES QUATRE ÉTATS DE QUANTITÉS DU DOCX OFFICIEL.
// (plan d'action audit workflow officiel §5 item 2, 20/10/2026)
//
// Le docx demande pour le producteur : produites / disponibles / COMMANDÉES /
// EFFECTIVEMENT LIVRÉES. Deux états manquaient à la restitution :
//
//  PROD-02 — « commandées » : le journal stock_reservations était écrit depuis
//  B2 (une ligne par commande : active/convertie/liberee) mais AUCUN endpoint
//  ne le lisait, et la barre « Réservé » de l'écran récolte lisait
//  recolte.stockReserve, champ jamais alimenté → toujours 0.
//  → GET /recoltes/:id/reservations expose les lignes + les agrégats.
//
//  PROD-03 — « livrées » : stock_vendu était incrémenté à la CONFIRMATION et
//  la livraison n'était qu'un statut texte → « livré » et « vendu » disaient
//  le même chiffre. → recoltes.stock_livre est incrémenté à la transition
//  livree (une seule fois — garde atomique), restitué si annulée/litige.
//  Livré ⊆ vendu : l'invariant I-C du spec stock-reservation reste vrai.
//
// Propriétés vérifiées (🟢 attendu) :
//  - P2-a : une commande en_attente apparaît dans GET /recoltes/:id/reservations
//    (ligne active, reserveActive = quantité).
//  - P2-b : après confirmation → convertie ; reserveActive retombe, le volume
//    passe dans reserveConvertie (l'historique reste lisible).
//  - P3-a : à la confirmation, stock_livre = 0 (vendu ≠ livré).
//  - P3-b : PATCH /commandes/:id/livrer → stock_livre = quantité ; disponible
//    et vendu INCHANGÉS (I-C).
//  - P3-c : rejeu ×2 de livrer → stock_livre reste une fois la quantité.
//  - P3-d : livrée puis litige → stock_livre restitué (borne 0).
//  - P2-c : le GET d'un AUTRE producteur → 404 (fail-closed).

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ThrottlerStorage } from '@nestjs/throttler';
import { JwtService } from '@nestjs/jwt';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { User, UserRole, UserStatus } from '../../src/users/entities/user.entity';

describe('Invariant PROD-02/03 — commandées visibles, livrées distinctes de vendues', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let vendeurId: string;
  let vendeurToken: string;
  let acheteurToken: string;
  let autreProductId: string;
  let autreProductToken: string;

  const api = () => request(app.getHttpServer());

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
      phone: '+2250700020301', firstName: 'Vendeur', lastName: 'Quant', genre: 'homme',
      role: UserRole.PRODUCTEUR, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    vendeurId = vendeur.id;
    vendeurToken = await jwt.signAsync(
      { sub: vendeur.id, phone: vendeur.phone, role: vendeur.role },
      { secret: process.env.JWT_SECRET },
    );
    const acheteur: any = await repo.save(repo.create({
      phone: '+2250700020302', firstName: 'Acheteur', lastName: 'Quant', genre: 'femme',
      role: UserRole.MARCHAND, sousProfilMarchand: 'grossiste', status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    acheteurToken = await jwt.signAsync(
      { sub: acheteur.id, phone: acheteur.phone, role: acheteur.role },
      { secret: process.env.JWT_SECRET },
    );
    const autre: any = await repo.save(repo.create({
      phone: '+2250700020303', firstName: 'Autre', lastName: 'Prod', genre: 'homme',
      role: UserRole.PRODUCTEUR, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    autreProductId = autre.id;
    autreProductToken = await jwt.signAsync(
      { sub: autre.id, phone: autre.phone, role: autre.role },
      { secret: process.env.JWT_SECRET },
    );
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
  });

  let recSeq = 0;
  async function creerRecolte(quantite: number): Promise<string> {
    recSeq += 1;
    const rows = await ds.query(
      `INSERT INTO recoltes
         (user_id, produit, quantite, unite, qualite, date_recolte, statut, prix_unitaire, stock_disponible, stock_vendu)
       VALUES ($1, $2, $3, 'kg', 'standard', CURRENT_DATE, 'declaree', 500, $3, 0)
       RETURNING id`,
      [vendeurId, `RecolteQuant-${recSeq}`, quantite],
    );
    return rows[0].id;
  }
  async function creerPublicationRecolte(dispo: number, recolteId: string): Promise<string> {
    recSeq += 1;
    const produit = `TomateQuant-${recSeq}`;
    const rows = await ds.query(
      `INSERT INTO publications
         (user_id, recolte_id, produit, culture, quantite_disponible, quantite_initiale, unite, prix_unitaire, qualite, localisation, active, statut, date_publication)
       VALUES ($1,$2,$3,$3,$4,$4,'kg',500,'standard','Test',true,'disponible', NOW())
       RETURNING id`,
      [vendeurId, recolteId, produit, dispo],
    );
    return rows[0].id;
  }
  const recolteStock = async (id: string): Promise<{ dispo: number; vendu: number; livre: number; statut: string }> => {
    const r = (await ds.query(
      'SELECT stock_disponible, stock_vendu, stock_livre, statut FROM recoltes WHERE id = $1', [id],
    ))[0];
    return { dispo: Number(r.stock_disponible), vendu: Number(r.stock_vendu), livre: Number(r.stock_livre ?? 0), statut: r.statut };
  };
  const passerCommande = (pubId: string, quantite: number) =>
    api().post('/api/v1/commandes').set('Authorization', `Bearer ${acheteurToken}`).send({
      vendeur_id: vendeurId, publication_id: pubId, type: 'achat', produit: 'Tomate',
      quantite, prix_unitaire: 500, total: 500 * quantite,
    });
  const patchStatut = (cmdId: string, statut: string) =>
    api().patch(`/api/v1/commandes/${cmdId}`).set('Authorization', `Bearer ${vendeurToken}`).send({ statut });
  const livrer = (cmdId: string) =>
    api().patch(`/api/v1/commandes/${cmdId}/livrer`).set('Authorization', `Bearer ${vendeurToken}`).send({});
  const reservations = (recId: string, token: string = vendeurToken) =>
    api().get(`/api/v1/recoltes/${recId}/reservations`).set('Authorization', `Bearer ${token}`);

  it('P2-a : la commande en_attente apparaît dans GET /recoltes/:id/reservations', async () => {
    const rec = await creerRecolte(30);
    const pub = await creerPublicationRecolte(100, rec);
    const res = await passerCommande(pub, 10);
    expect([200, 201]).toContain(res.status);
    const cmdId = res.body.commande.id;

    const r = await reservations(rec);
    expect(r.status).toBe(200);
    expect(r.body.data.length).toBe(1);
    expect(r.body.data[0].statut).toBe('active');
    expect(Number(r.body.data[0].quantite)).toBe(10);
    expect(r.body.data[0].commande_id).toBe(cmdId);
    expect(r.body.meta.reserveActive).toBe(10);
  });

  it('P2-b + P3-a : après confirmation — convertie visible, stock_livre encore 0 (vendu ≠ livré)', async () => {
    const rec = await creerRecolte(30);
    const pub = await creerPublicationRecolte(100, rec);
    const cmdId = (await passerCommande(pub, 10)).body.commande.id;
    const conf = await patchStatut(cmdId, 'confirmee');
    expect([200, 201]).toContain(conf.status);

    const r = await reservations(rec);
    expect(r.status).toBe(200);
    expect(r.body.data[0].statut).toBe('convertie');
    expect(r.body.meta.reserveActive).toBe(0);
    expect(r.body.meta.reserveConvertie).toBe(10);

    // PROD-03 : la confirmation est une PROMESSE ferme — vendu bouge, livré non.
    const st = await recolteStock(rec);
    expect(st.dispo).toBe(20);
    expect(st.vendu).toBe(10);
    expect(st.livre).toBe(0);
  });

  it('P3-b : livrer écrit le LIVRÉ (une fois) — disponible et vendu inchangés (I-C)', async () => {
    const rec = await creerRecolte(30);
    const pub = await creerPublicationRecolte(100, rec);
    const cmdId = (await passerCommande(pub, 12)).body.commande.id;
    await patchStatut(cmdId, 'confirmee');

    const liv = await livrer(cmdId);
    expect([200, 201]).toContain(liv.status);

    const st = await recolteStock(rec);
    expect(st.livre).toBe(12);
    expect(st.dispo).toBe(18); // I-C : la livraison ne touche pas le disponible
    expect(st.vendu).toBe(12); // I-C : ni le vendu
  });

  it('P3-c : rejeu ×2 de livrer — stock_livre reste une fois la quantité', async () => {
    const rec = await creerRecolte(30);
    const pub = await creerPublicationRecolte(100, rec);
    const cmdId = (await passerCommande(pub, 8)).body.commande.id;
    await patchStatut(cmdId, 'confirmee');
    await livrer(cmdId);
    // Rejeus : double-clic, retry réseau.
    await livrer(cmdId);
    const rejoue = await livrer(cmdId);
    expect([200, 201]).toContain(rejoue.status);

    const st = await recolteStock(rec);
    expect(st.livre).toBe(8);
  });

  it('P3-d : livrée puis litige — le LIVRÉ est restitué (borné à 0)', async () => {
    const rec = await creerRecolte(30);
    const pub = await creerPublicationRecolte(100, rec);
    const cmdId = (await passerCommande(pub, 9)).body.commande.id;
    await patchStatut(cmdId, 'confirmee');
    await livrer(cmdId);
    expect((await recolteStock(rec)).livre).toBe(9);

    const lit = await patchStatut(cmdId, 'litige');
    expect([200, 201]).toContain(lit.status);

    const st = await recolteStock(rec);
    expect(st.livre).toBe(0);
    // Le vendu (promesse confirmée) reste : le litige se règle hors stock.
    expect(st.vendu).toBe(9);
  });

  it('P2-c : le GET d\u2019un AUTRE producteur → 404 (fail-closed)', async () => {
    const rec = await creerRecolte(30);
    const r = await reservations(rec, autreProductToken);
    expect(r.status).toBe(404);
  });
});
