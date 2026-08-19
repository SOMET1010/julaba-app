// Invariant B2 — voie NÉGOCIATION couverte par la réservation de stock.
//
// Trou constaté le 13/08/2026 (JULABA_DECISIONS.md, "B2, voie negociation non
// couverte par la reservation") : les commandes nées d'une négociation acceptée
// (commandes-rest.controller.ts, repondreNegociation / marchandRepondreContreOffre)
// n'avaient jamais publicationId — StockReservationService (conditionné à
// cmd.publicationId) ne s'appliquait donc jamais sur cette voie. Une marchande
// pouvait accepter plusieurs négociations sur le même stock sans qu'aucune ne
// soit bloquée par indisponibilité.
//
// Ce lot fait porter publicationId par la négociation (colonne ajoutée), puis
// par la commande créée à l'acceptation, et RÉSERVE + CONVERTIT le stock dans
// la même transaction (blocage 409 si le disponible est insuffisant).
//
// Propriétés vérifiées :
//  - I-NEG-1 : négociation acceptée (repondreNegociation, vendeur accepte) →
//    disponible de la publication décrémenté, ligne stock_reservations
//    'convertie' liée à la commande créée.
//  - I-NEG-2 : un deuxième acheteur ne peut PAS sur-vendre le même stock déjà
//    consommé par une négociation acceptée → 409, négociation #2 inchangée,
//    aucune commande créée pour elle.
//  - I-NEG-3 : la voie marchandRepondreContreOffre (acceptation d'une
//    contre-offre du vendeur) réserve/bloque de la même façon.
//  - I-NEG-4 : le disponible restant après une négociation suit le MÊME cycle
//    réservation/libération qu'une commande classique sur la même publication
//    (le stock est une vérité partagée) ; annuler une commande née de
//    négociation (déjà vente ferme, ligne 'convertie') NE restitue PAS le
//    stock — cohérent avec la règle déjà actée pour les commandes confirmées
//    classiques (JULABA_DECISIONS.md, "annulation d'une commande deja
//    confirmee").
//  - I-NEG-5 (bonus, mission point 3) : le marchand peut désormais
//    RE-CONTRE-OFFRIR (PATCH .../marchand-repondre, statut 'contre_offre'),
//    dans la limite de 3 contre-offres partagée avec le vendeur — sans jamais
//    créer de commande ni toucher le stock tant que rien n'est accepté.

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

describe('Invariant B2 — négociation couverte par la réservation de stock', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let vendeurId: string;
  let vendeurToken: string;
  let marchandId: string;
  let marchandToken: string;
  let marchand2Id: string;
  let marchand2Token: string;
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
    const signFor = async (u: any) =>
      jwt.signAsync({ sub: u.id, phone: u.phone, role: u.role }, { secret: process.env.JWT_SECRET });

    const vendeur: any = await repo.save(repo.create({
      phone: '+2250700050001', firstName: 'Vendeur', lastName: 'Neg', genre: 'homme',
      role: UserRole.PRODUCTEUR, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    vendeurId = vendeur.id;
    vendeurToken = await signFor(vendeur);

    const marchand: any = await repo.save(repo.create({
      phone: '+2250700050002', firstName: 'Marchand', lastName: 'Neg', genre: 'femme',
      role: UserRole.MARCHAND, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    marchandId = marchand.id;
    marchandToken = await signFor(marchand);

    const marchand2: any = await repo.save(repo.create({
      phone: '+2250700050003', firstName: 'Marchand2', lastName: 'Neg', genre: 'femme',
      role: UserRole.MARCHAND, status: UserStatus.ACTIF, passwordHash: await bcrypt.hash('1234', 10),
    } as any));
    marchand2Id = marchand2.id;
    marchand2Token = await signFor(marchand2);
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  let pubSeq = 0;
  async function creerPublication(dispo: number): Promise<string> {
    pubSeq += 1;
    const produit = `IgnameNeg-${pubSeq}`;
    const rows = await ds.query(
      `INSERT INTO publications
         (user_id, produit, culture, quantite_disponible, quantite_initiale, unite, prix_unitaire, qualite, localisation, active, statut, date_publication)
       VALUES ($1,$3,$3,$2,$2,'kg',400,'standard','Test',true,'disponible', NOW())
       RETURNING id`,
      [vendeurId, dispo, produit],
    );
    return rows[0].id;
  }

  const dispoDe = async (pubId: string): Promise<number> =>
    Number((await ds.query('SELECT quantite_disponible FROM publications WHERE id = $1', [pubId]))[0].quantite_disponible);
  const resaDe = async (cmdId: string): Promise<{ statut: string; publication_id: string; quantite: string } | null> =>
    (await ds.query('SELECT statut, publication_id, quantite FROM stock_reservations WHERE commande_id = $1', [cmdId]))[0] ?? null;
  const negRow = async (negId: string): Promise<any> =>
    (await ds.query('SELECT statut, nb_contre_offres, prix_propose, prix_contre_offre FROM negociations WHERE id = $1', [negId]))[0];

  const proposer = (token: string, pubId: string, quantite: number, prixPropose: number) =>
    api().post('/api/v1/commandes/negociation').set('Authorization', `Bearer ${token}`).send({
      vendeurId, produit: 'Igname', quantite, prixOriginal: 400, prixPropose, unite: 'kg', publicationId: pubId,
    });

  it('I-NEG-1 : négociation acceptée réserve ET convertit le stock de sa publication d\'origine', async () => {
    const pub = await creerPublication(100);
    const prop = await proposer(marchandToken, pub, 30, 350);
    expect([200, 201]).toContain(prop.status);
    const negId = prop.body.negociation.id;
    expect(prop.body.negociation.publicationId).toBe(pub);

    const rep = await api().patch(`/api/v1/commandes/negociation/${negId}/repondre`)
      .set('Authorization', `Bearer ${vendeurToken}`).send({ statut: 'accepte' });
    expect(rep.status).toBe(200);
    expect(rep.body.commande.publicationId).toBe(pub);

    expect(await dispoDe(pub)).toBe(70);
    const resa = await resaDe(rep.body.commande.id);
    expect(resa).not.toBeNull();
    expect(resa!.statut).toBe('convertie');
    expect(resa!.publication_id).toBe(pub);
    expect(Number(resa!.quantite)).toBe(30);
  });

  it('I-NEG-2 : un deuxième acheteur ne peut pas sur-vendre le stock déjà consommé par une négociation acceptée', async () => {
    const pub = await creerPublication(50);

    // Négociation #1 : consomme la quasi-totalité du disponible.
    const prop1 = await proposer(marchandToken, pub, 40, 350);
    const neg1Id = prop1.body.negociation.id;
    const rep1 = await api().patch(`/api/v1/commandes/negociation/${neg1Id}/repondre`)
      .set('Authorization', `Bearer ${vendeurToken}`).send({ statut: 'accepte' });
    expect(rep1.status).toBe(200);
    expect(await dispoDe(pub)).toBe(10);

    // Négociation #2 (autre marchand) : demande plus que le disponible restant.
    const prop2 = await proposer(marchand2Token, pub, 20, 340);
    const neg2Id = prop2.body.negociation.id;
    const rep2 = await api().patch(`/api/v1/commandes/negociation/${neg2Id}/repondre`)
      .set('Authorization', `Bearer ${vendeurToken}`).send({ statut: 'accepte' });

    expect(rep2.status).toBe(409);
    // Rien n'a bougé : le disponible reste intact...
    expect(await dispoDe(pub)).toBe(10);
    // ...la négociation #2 n'a pas été acceptée (rollback complet de la transaction)...
    const n2 = await negRow(neg2Id);
    expect(n2.statut).not.toBe('accepte');
    // ...et aucune commande n'a été créée pour elle.
    const cmds = await ds.query('SELECT count(*)::int c FROM commandes WHERE negociation_id = $1', [neg2Id]);
    expect(cmds[0].c).toBe(0);
  });

  it('I-NEG-3 : marchandRepondreContreOffre réserve/bloque de la même façon', async () => {
    const pub = await creerPublication(50);

    const prop = await proposer(marchandToken, pub, 45, 300);
    const negId = prop.body.negociation.id;
    // Le vendeur contre-offre.
    const contre = await api().patch(`/api/v1/commandes/negociation/${negId}/repondre`)
      .set('Authorization', `Bearer ${vendeurToken}`).send({ statut: 'contre_offre', prixContreOffre: 380 });
    expect(contre.status).toBe(200);

    // Le marchand accepte la contre-offre : stock réservé + converti.
    const acc = await api().patch(`/api/v1/commandes/negociation/${negId}/marchand-repondre`)
      .set('Authorization', `Bearer ${marchandToken}`).send({ statut: 'accepte' });
    expect(acc.status).toBe(200);
    expect(acc.body.commande.publicationId).toBe(pub);
    expect(await dispoDe(pub)).toBe(5);

    // Une seconde négociation, acceptée via la même route, demande plus que le
    // disponible restant (5) : doit être bloquée.
    const prop2 = await proposer(marchand2Token, pub, 10, 300);
    const neg2Id = prop2.body.negociation.id;
    const contre2 = await api().patch(`/api/v1/commandes/negociation/${neg2Id}/repondre`)
      .set('Authorization', `Bearer ${vendeurToken}`).send({ statut: 'contre_offre', prixContreOffre: 300 });
    expect(contre2.status).toBe(200);
    const acc2 = await api().patch(`/api/v1/commandes/negociation/${neg2Id}/marchand-repondre`)
      .set('Authorization', `Bearer ${marchand2Token}`).send({ statut: 'accepte' });
    expect(acc2.status).toBe(409);
    expect(await dispoDe(pub)).toBe(5); // inchangé
  });

  it('I-NEG-4 : le disponible restant suit le même cycle réservation/libération qu\'une commande classique ; annuler une négociation déjà convertie ne restitue pas le stock', async () => {
    const pub = await creerPublication(100);

    // Négociation acceptée : vente ferme immédiate (convertie), 40 consommés.
    const prop = await proposer(marchandToken, pub, 40, 350);
    const negId = prop.body.negociation.id;
    const rep = await api().patch(`/api/v1/commandes/negociation/${negId}/repondre`)
      .set('Authorization', `Bearer ${vendeurToken}`).send({ statut: 'accepte' });
    const cmdNegId = rep.body.commande.id;
    expect(await dispoDe(pub)).toBe(60);

    // Annuler la commande née de négociation (déjà confirmée/convertie) ne
    // restitue PAS le stock — même règle que pour une commande classique déjà
    // convertie (JULABA_DECISIONS.md). Comportement voulu, pas un oubli.
    const annulNeg = await api().patch(`/api/v1/commandes/${cmdNegId}`)
      .set('Authorization', `Bearer ${vendeurToken}`).send({ statut: 'annulee' });
    expect([200, 201]).toContain(annulNeg.status);
    expect(await dispoDe(pub)).toBe(60); // inchangé
    expect((await resaDe(cmdNegId))!.statut).toBe('convertie'); // pas 'liberee'

    // Le reste du disponible (60) suit le cycle CLASSIQUE normalement : une
    // commande en_attente sur ce même reste réserve, puis son annulation
    // restitue bien (preuve que le stock partagé continue de fonctionner
    // normalement après une négociation, et que la libération marche pour une
    // réservation encore 'active').
    const classique = await api().post('/api/v1/commandes').set('Authorization', `Bearer ${marchandToken}`).send({
      vendeur_id: vendeurId, publication_id: pub, type: 'achat', produit: 'Igname',
      quantite: 60, prix_unitaire: 350, total: 350 * 60,
    });
    expect([200, 201]).toContain(classique.status);
    const cmdClassiqueId = classique.body.commande.id;
    expect(await dispoDe(pub)).toBe(0);

    const annulClassique = await api().patch(`/api/v1/commandes/${cmdClassiqueId}`)
      .set('Authorization', `Bearer ${vendeurToken}`).send({ statut: 'annulee' });
    expect([200, 201]).toContain(annulClassique.status);
    expect(await dispoDe(pub)).toBe(60); // restitué
    expect((await resaDe(cmdClassiqueId))!.statut).toBe('liberee');
  });

  it('I-NEG-5 : le marchand peut re-contre-offrir dans la limite de 3 contre-offres, sans créer de commande ni toucher le stock', async () => {
    const pub = await creerPublication(100);
    const prop = await proposer(marchandToken, pub, 20, 300);
    const negId = prop.body.negociation.id;

    // Vendeur contre-offre #1.
    const c1 = await api().patch(`/api/v1/commandes/negociation/${negId}/repondre`)
      .set('Authorization', `Bearer ${vendeurToken}`).send({ statut: 'contre_offre', prixContreOffre: 380 });
    expect(c1.status).toBe(200);
    expect((await negRow(negId)).nb_contre_offres).toBe(1);

    // Avant ce lot : le marchand ne pouvait qu'accepter/refuser ici. Il peut
    // désormais RE-contre-offrir.
    const marchandContre = await api().patch(`/api/v1/commandes/negociation/${negId}/marchand-repondre`)
      .set('Authorization', `Bearer ${marchandToken}`).send({ statut: 'contre_offre', prixContreOffre: 330 });
    expect(marchandContre.status).toBe(200);
    let row = await negRow(negId);
    expect(row.statut).toBe('en_attente'); // balle renvoyée au vendeur
    expect(Number(row.prix_propose)).toBe(330);
    expect(row.prix_contre_offre).toBeNull();
    expect(row.nb_contre_offres).toBe(2);
    // Aucune commande créée, aucun stock touché par une simple contre-offre.
    expect(await dispoDe(pub)).toBe(100);
    const cmds = await ds.query('SELECT count(*)::int c FROM commandes WHERE negociation_id = $1', [negId]);
    expect(cmds[0].c).toBe(0);

    // Vendeur contre-offre #2 : nb_contre_offres atteint 3 (plafond).
    const c2 = await api().patch(`/api/v1/commandes/negociation/${negId}/repondre`)
      .set('Authorization', `Bearer ${vendeurToken}`).send({ statut: 'contre_offre', prixContreOffre: 360 });
    expect(c2.status).toBe(200);
    expect((await negRow(negId)).nb_contre_offres).toBe(3);

    // Le marchand tente une 3e contre-offre : plafond déjà atteint → refusé.
    const marchandContre2 = await api().patch(`/api/v1/commandes/negociation/${negId}/marchand-repondre`)
      .set('Authorization', `Bearer ${marchandToken}`).send({ statut: 'contre_offre', prixContreOffre: 340 });
    expect(marchandContre2.status).toBe(403);
    expect((await negRow(negId)).nb_contre_offres).toBe(3); // inchangé
  });
});
