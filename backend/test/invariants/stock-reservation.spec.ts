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
});
