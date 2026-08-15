// Invariant B2 — RESERVATION DE STOCK sur commande, sans mouvement d'argent.
//
// Regle (lot Marche B2) : creer une commande en_attente reserve le stock sur la
// publication (le disponible baisse tout de suite) ; l'annulation libere ;
// la confirmation convertit en vente ferme. Reserver bloque si le disponible est
// insuffisant. Aucun argent ne bouge (le paiement reste isole dans /paiement).
//
// Proprietes verifiees :
//  - reserve : disponible -= q, ligne stock_reservations 'active' ;
//  - blocage : demande > disponible => 409, aucun effet ;
//  - liberation : annulation restitue le disponible, ligne 'liberee' ;
//  - conversion : confirmation garde le decrement, ligne 'convertie' ;
//  - idempotence : confirmer deux fois ne double pas le decrement.

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

describe('Invariant B2 — reservation de stock sur commande', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let vendeurId: string;
  let vendeurToken: string;
  let acheteurToken: string;
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
      phone: '+2250700020001', firstName: 'Vendeur', lastName: 'Prod', genre: 'homme',
      role: UserRole.PRODUCTEUR, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    vendeurId = vendeur.id;
    vendeurToken = await jwt.signAsync(
      { sub: vendeur.id, phone: vendeur.phone, role: vendeur.role },
      { secret: process.env.JWT_SECRET },
    );
    const acheteur: any = await repo.save(repo.create({
      phone: '+2250700020002', firstName: 'Acheteur', lastName: 'March', genre: 'femme',
      role: UserRole.MARCHAND, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    acheteurToken = await jwt.signAsync(
      { sub: acheteur.id, phone: acheteur.phone, role: acheteur.role },
      { secret: process.env.JWT_SECRET },
    );
  }, 60000);

  afterAll(async () => {
    // Nettoyage impératif : cette suite est la seule à insérer dans `recoltes`.
    // Or TypeORM re-`ADD user_id NOT NULL` sur recoltes à chaque synchronize
    // (drift de schéma pré-existant — dette #10) ; l'ADD échoue si la table
    // contient des lignes. On vide donc ce qu'on a créé pour ne pas casser la
    // synchronisation des suites suivantes (ordre enfant → parent, pas de FK
    // garantie mais on respecte l'ordre par prudence).
    try {
      await ds?.query('DELETE FROM stock_reservations');
      await ds?.query('DELETE FROM commandes');
      await ds?.query('DELETE FROM publications');
      await ds?.query('DELETE FROM recoltes');
    } catch {
      /* best-effort : le teardown ne doit pas masquer un échec de test */
    }
    if (app) await app.close();
  });

  // Cree une publication avec un disponible connu, renvoie son id.
  // NB1 : on omet type_marche (defaut 'producteur' cote entite). Sous synchronize
  // le type enum n'a pas le nom de la migration (marche_virtuel_type_enum), donc
  // aucun cast explicite ici.
  // NB2 : la base d'invariants est partagee entre specs. On garantit un produit
  // unique par publication pour ne pas creer de doublon (user_id, LOWER(produit))
  // qui casserait l'index unique ux_publications_user_produit du spec B1.
  let pubSeq = 0;
  async function creerPublication(dispo: number): Promise<string> {
    pubSeq += 1;
    const produit = `TomateB2-${pubSeq}`;
    const rows = await ds.query(
      `INSERT INTO publications
         (user_id, produit, culture, quantite_disponible, quantite_initiale, unite, prix_unitaire, qualite, localisation, active, statut, date_publication)
       VALUES ($1,$3,$3,$2,$2,'kg',500,'standard','Test',true,'disponible', NOW())
       RETURNING id`,
      [vendeurId, dispo, produit],
    );
    return rows[0].id;
  }

  const dispoDe = async (pubId: string): Promise<number> =>
    Number((await ds.query('SELECT quantite_disponible FROM publications WHERE id = $1', [pubId]))[0].quantite_disponible);
  const statutResa = async (cmdId: string): Promise<string | null> =>
    (await ds.query('SELECT statut FROM stock_reservations WHERE commande_id = $1', [cmdId]))[0]?.statut ?? null;

  const passerCommande = (pubId: string, quantite: number) =>
    api().post('/api/v1/commandes').set('Authorization', `Bearer ${acheteurToken}`).send({
      vendeur_id: vendeurId, publication_id: pubId, type: 'achat', produit: 'Tomate',
      quantite, prix_unitaire: 500, total: 500 * quantite,
    });

  it('creer en_attente reserve le stock (disponible -= q, ligne active)', async () => {
    const pub = await creerPublication(100);
    const res = await passerCommande(pub, 30);
    expect([200, 201]).toContain(res.status);
    const cmdId = res.body.commande.id;
    expect(await dispoDe(pub)).toBe(70);
    expect(await statutResa(cmdId)).toBe('active');
  });

  it('bloque (409) si la demande depasse le disponible, sans effet', async () => {
    const pub = await creerPublication(20);
    const res = await passerCommande(pub, 50);
    expect(res.status).toBe(409);
    expect(await dispoDe(pub)).toBe(20); // inchange
    const n = (await ds.query('SELECT count(*)::int c FROM stock_reservations WHERE publication_id = $1', [pub]))[0].c;
    expect(n).toBe(0);
  });

  it('annuler libere la reservation (disponible restitue, ligne liberee)', async () => {
    const pub = await creerPublication(100);
    const cmdId = (await passerCommande(pub, 40)).body.commande.id;
    expect(await dispoDe(pub)).toBe(60);
    // annulee est reserve au vendeur (statutsVendeur dans update()).
    const res = await api().patch(`/api/v1/commandes/${cmdId}`)
      .set('Authorization', `Bearer ${vendeurToken}`).send({ statut: 'annulee' });
    expect([200, 201]).toContain(res.status);
    expect(await dispoDe(pub)).toBe(100); // restitue
    expect(await statutResa(cmdId)).toBe('liberee');
  });

  it('confirmer convertit (decrement garde, ligne convertie) et est idempotent', async () => {
    const pub = await creerPublication(100);
    const cmdId = (await passerCommande(pub, 25)).body.commande.id;
    expect(await dispoDe(pub)).toBe(75);

    const c1 = await api().patch(`/api/v1/commandes/${cmdId}`)
      .set('Authorization', `Bearer ${vendeurToken}`).send({ statut: 'confirmee' });
    expect([200, 201]).toContain(c1.status);
    expect(await dispoDe(pub)).toBe(75); // inchange (deja reduit a la reservation)
    expect(await statutResa(cmdId)).toBe('convertie');

    // Rejeu : confirmer a nouveau ne double pas le decrement.
    await api().patch(`/api/v1/commandes/${cmdId}`)
      .set('Authorization', `Bearer ${vendeurToken}`).send({ statut: 'confirmee' });
    expect(await dispoDe(pub)).toBe(75);
    expect(await statutResa(cmdId)).toBe('convertie');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // #12 — décrément de stock à la vente (cf docs/adr/ADR-0001-decrement-stock-vente.md)
  // ─────────────────────────────────────────────────────────────────────────

  let recSeq = 0;
  async function creerRecolte(quantite: number): Promise<string> {
    recSeq += 1;
    const rows = await ds.query(
      `INSERT INTO recoltes
         (user_id, produit, quantite, unite, qualite, date_recolte, statut, prix_unitaire, stock_disponible, stock_vendu)
       VALUES ($1, $2, $3, 'kg', 'standard', CURRENT_DATE, 'declaree', 500, $3, 0)
       RETURNING id`,
      [vendeurId, `RecolteB2-${recSeq}`, quantite],
    );
    return rows[0].id;
  }
  async function creerPublicationRecolte(dispo: number, recolteId: string): Promise<string> {
    pubSeq += 1;
    const produit = `TomateB2R-${pubSeq}`;
    const rows = await ds.query(
      `INSERT INTO publications
         (user_id, recolte_id, produit, culture, quantite_disponible, quantite_initiale, unite, prix_unitaire, qualite, localisation, active, statut, date_publication)
       VALUES ($1,$2,$3,$3,$4,$4,'kg',500,'standard','Test',true,'disponible', NOW())
       RETURNING id`,
      [vendeurId, recolteId, produit, dispo],
    );
    return rows[0].id;
  }
  const recolteStock = async (id: string): Promise<{ dispo: number; vendu: number; statut: string }> => {
    const r = (await ds.query('SELECT stock_disponible, stock_vendu, statut FROM recoltes WHERE id = $1', [id]))[0];
    return { dispo: Number(r.stock_disponible), vendu: Number(r.stock_vendu), statut: r.statut };
  };
  const patchStatut = (cmdId: string, statut: string) =>
    api().patch(`/api/v1/commandes/${cmdId}`).set('Authorization', `Bearer ${vendeurToken}`).send({ statut });
  const venteDirecte = (recolteId: string | null, quantite: number) =>
    api().post('/api/v1/commandes').set('Authorization', `Bearer ${vendeurToken}`).send({
      vendeur_id: vendeurId, type: 'vente_directe', produit: 'Tomate',
      ...(recolteId ? { recolte_id: recolteId } : {}),
      quantite, prix_unitaire: 500, total: 500 * quantite, statut: 'confirmee',
    });

  it('I-B(recolte): confirmer une vente marche decremente la recolte liee (une fois)', async () => {
    const rec = await creerRecolte(30);
    const pub = await creerPublicationRecolte(100, rec);
    const cmdId = (await passerCommande(pub, 10)).body.commande.id;
    // Reserve : le disponible de la publication baisse, la recolte reste intacte.
    expect(await dispoDe(pub)).toBe(90);
    expect((await recolteStock(rec)).dispo).toBe(30);
    // Confirme : decrement ferme de la recolte.
    await patchStatut(cmdId, 'confirmee');
    const s = await recolteStock(rec);
    expect(s.dispo).toBe(20);
    expect(s.vendu).toBe(10);
  });

  it('I-C: en_livraison puis livree ne modifie ni disponible ni recolte', async () => {
    const rec = await creerRecolte(30);
    const pub = await creerPublicationRecolte(100, rec);
    const cmdId = (await passerCommande(pub, 10)).body.commande.id;
    await patchStatut(cmdId, 'confirmee');
    const dispoApres = await dispoDe(pub);
    const recApres = (await recolteStock(rec)).dispo;
    await patchStatut(cmdId, 'en_livraison');
    await patchStatut(cmdId, 'livree');
    expect(await dispoDe(pub)).toBe(dispoApres);      // inchange
    expect((await recolteStock(rec)).dispo).toBe(recApres); // inchange
  });

  it('D2-a: vente directe (recolte_id, confirmee) decremente la recolte + trace le mouvement', async () => {
    const rec = await creerRecolte(20);
    const res = await venteDirecte(rec, 8);
    expect([200, 201]).toContain(res.status);
    const cmdId = res.body.commande.id;
    const s = await recolteStock(rec);
    expect(s.dispo).toBe(12);
    expect(s.vendu).toBe(8);
    expect(await statutResa(cmdId)).toBe('convertie');
    const row = (await ds.query('SELECT publication_id, recolte_id FROM stock_reservations WHERE commande_id = $1', [cmdId]))[0];
    expect(row.publication_id).toBeNull();
    expect(row.recolte_id).toBe(rec);
  });

  it('D2-b: vente directe SANS recolte_id est refusee (400), aucun stock touche', async () => {
    const rec = await creerRecolte(20);
    const res = await venteDirecte(null, 8);
    expect(res.status).toBe(400);
    const s = await recolteStock(rec);
    expect(s.dispo).toBe(20); // intacte
    expect(s.vendu).toBe(0);
  });

  it('D3: une reservation en_attente reste active (pas de TTL / expiration)', async () => {
    const pub = await creerPublication(50);
    const cmdId = (await passerCommande(pub, 10)).body.commande.id;
    expect(await statutResa(cmdId)).toBe('active');
    // Aucune action : la reservation ne s'auto-libere pas.
    expect(await statutResa(cmdId)).toBe('active');
    expect(await dispoDe(pub)).toBe(40);
  });
});
