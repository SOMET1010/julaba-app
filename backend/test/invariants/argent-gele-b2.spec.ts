// Invariant B2 — ARGENT GELE : le cycle de commande (creation, reservation,
// confirmation, annulation) ne touche JAMAIS le portefeuille.
//
// Regle actee (lot Marche, Option A) : dans ce lot, aucun mouvement d'argent.
// L'argent ne bouge qu'a POST /commandes/:id/paiement (branche Keiwa), jamais
// exercee ici. Ce garde-fou echoue si un futur changement introduisait une
// ecriture wallet (wallets.solde / solde_bloque ou wallet_transactions) sur
// create / reserver / convertir / liberer.
//
// Propriete verifiee : apres un parcours complet (2 commandes : une confirmee,
// une annulee), zero ligne wallet_transactions et soldes inchanges pour
// l'acheteur comme pour le vendeur.

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

describe('Invariant B2 — argent gele sur le cycle de commande', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let vendeurId: string;
  let vendeurToken: string;
  let acheteurId: string;
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
      phone: '+2250700030001', firstName: 'Vendeur', lastName: 'Gele', genre: 'homme',
      role: UserRole.PRODUCTEUR, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    vendeurId = vendeur.id;
    vendeurToken = await jwt.signAsync({ sub: vendeur.id, phone: vendeur.phone, role: vendeur.role }, { secret: process.env.JWT_SECRET });
    const acheteur: any = await repo.save(repo.create({
      phone: '+2250700030002', firstName: 'Acheteur', lastName: 'Gele', genre: 'femme',
      role: UserRole.MARCHAND, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    acheteurId = acheteur.id;
    acheteurToken = await jwt.signAsync({ sub: acheteur.id, phone: acheteur.phone, role: acheteur.role }, { secret: process.env.JWT_SECRET });

    // Portefeuilles a solde nul pour observer une eventuelle variation.
    await ds.query(`INSERT INTO wallets (user_id, solde, solde_bloque) VALUES ($1,0,0),($2,0,0)`, [vendeurId, acheteurId]);
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
      [vendeurId, dispo, `TomateGele-${seq}`],
    );
    return rows[0].id;
  }
  const passer = (pubId: string, q: number) =>
    api().post('/api/v1/commandes').set('Authorization', `Bearer ${acheteurToken}`).send({
      vendeur_id: vendeurId, publication_id: pubId, type: 'achat', produit: 'Tomate',
      quantite: q, prix_unitaire: 500, total: 500 * q,
    });
  const patch = (id: string, statut: string) =>
    api().patch(`/api/v1/commandes/${id}`).set('Authorization', `Bearer ${vendeurToken}`).send({ statut });

  const nbTxWallet = async (): Promise<number> =>
    (await ds.query('SELECT count(*)::int c FROM wallet_transactions WHERE user_id = ANY($1)', [[vendeurId, acheteurId]]))[0].c;
  const soldes = async (): Promise<Array<{ solde: string; solde_bloque: string }>> =>
    ds.query('SELECT solde, solde_bloque FROM wallets WHERE user_id = ANY($1) ORDER BY user_id', [[vendeurId, acheteurId]]);

  it('create + reserve + confirm + cancel ne touche aucun portefeuille', async () => {
    const txAvant = await nbTxWallet();
    const soldesAvant = await soldes();

    // Commande 1 : creee (reserve) puis confirmee (convertie).
    const pub1 = await creerPublication(100);
    const c1 = (await passer(pub1, 30)).body.commande.id;
    await patch(c1, 'confirmee');

    // Commande 2 : creee (reserve) puis annulee (liberee).
    const pub2 = await creerPublication(100);
    const c2 = (await passer(pub2, 40)).body.commande.id;
    await patch(c2, 'annulee');

    // Aucune ligne wallet_transactions, soldes inchanges : argent gele.
    expect(await nbTxWallet()).toBe(txAvant);
    expect(await nbTxWallet()).toBe(0);
    expect(await soldes()).toEqual(soldesAvant);
  });
});
