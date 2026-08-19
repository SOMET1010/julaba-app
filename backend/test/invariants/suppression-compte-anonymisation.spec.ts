// Invariant — Suppression de compte AVEC ANONYMISATION RÉELLE (conformité loi
// ivoirienne n°2013-450 sur la protection des données à caractère personnel).
//
// Contexte (audit) : DELETE /auth/account révoquait bien les sessions et
// anonymisait phone/passwordHash/firstName/lastName/status, mais TOUS les
// autres champs personnels identifiants de `users` (email, nin, photoUrl,
// dateNaissance, lieuNaissance, numCNPS, numCMU, recepisse, adresse/quartier/
// commune...) et la table liée `identifications` (photo/documents base64,
// coordonnées GPS personnelles) survivaient en clair. C'est un écart de
// conformité réel, pas cosmétique.
//
// Propriété prouvée ici, sur un VRAI Postgres via l'API HTTP réelle :
//  A) Après DELETE /auth/account, AUCUN champ personnel identifiant ne
//     survit en clair sur `users` (identité, contact, documents officiels,
//     état civil, adresse/localisation, métadonnées de référent nommé).
//  B) La table liée `identifications` (enrôlement de CET utilisateur en tant
//     qu'acteur) est anonymisée : photo/documents et GPS purgés.
//  C) L'ARGENT EST SACRÉ (CONSTITUTION §7) : le wallet et l'intégralité des
//     `wallet_transactions` de l'utilisateur restent INTACTS et rattachés au
//     même user_id — comptage et soldes inchangés. La suppression de compte
//     casse l'identité, jamais l'historique financier.

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
import { Identification } from '../../src/identifications/identification.entity';

describe("Invariant — suppression de compte avec anonymisation réelle (loi n°2013-450)", () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  let userId: string;
  let userToken: string;
  const api = () => request(app.getHttpServer());

  const PASSWORD = 'MotDePasse1234';
  const SOLDE_INITIAL = 12_500;

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

    // Utilisateur avec TOUS les champs personnels identifiants renseignés
    // (le pire cas : un dossier d'enrôlement complet).
    const repo = ds.getRepository(User);
    const user: any = await repo.save(
      repo.create({
        phone: '+2250700099001',
        email: 'awa.marchande@example.ci',
        genre: 'femme',
        passwordHash: await bcrypt.hash(PASSWORD, 10),
        firstName: 'Awa',
        lastName: 'Koné',
        role: UserRole.MARCHAND,
        status: UserStatus.ACTIF,
        region: 'Abidjan',
        commune: 'Yopougon',
        activity: 'Vente de tomates',
        market: 'Marché Gouro',
        photoUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/xxx==',
        nin: 'CI-NIN-1234567890',
        nationalite: 'Ivoirienne',
        situationMatrimoniale: 'Mariée',
        numCNPS: 'CNPS-998877',
        numCMU: 'CMU-556644',
        recepisse: 'RECEPISSE-2024-0099',
        dateNaissance: new Date('1990-05-14'),
        lieuNaissance: 'Bouaké',
        quartierVillage: 'Quartier Wassakara',
        regionAutre: 'Région Autre Test',
        communeAutre: 'Commune Autre Test',
        districtAutre: 'District Autre Test',
        departementAutre: 'Departement Autre Test',
        boitePostale: 'BP 4521 Abidjan 01',
        regionId: 'rg-01',
        communeId: 'cm-01',
        districtId: 'ds-01',
        departementId: 'dp-01',
        zoneId: 'zn-01',
        entiteMetadata: {
          sigle: 'ONG-X',
          typeEntite: 'ong',
          typePrecise: null,
          referentNom: 'Jean Referent',
          referentFonction: 'Coordinateur',
        },
      } as any),
    );
    userId = user.id;
    userToken = await jwt.signAsync(
      { sub: user.id, phone: user.phone, role: user.role },
      { secret: process.env.JWT_SECRET },
    );

    // Portefeuille + historique de transactions financières RATTACHÉS à cet
    // utilisateur — c'est ce qui NE DOIT JAMAIS être touché par la
    // suppression (argent gelé, CONSTITUTION §7).
    await ds.query(
      `INSERT INTO wallets (user_id, solde, solde_bloque) VALUES ($1, $2, 0)`,
      [userId, SOLDE_INITIAL],
    );
    await ds.query(
      `INSERT INTO wallet_transactions (user_id, type, montant, description, statut)
       VALUES ($1, 'credit', 5000, 'Vente marché', 'completed'),
              ($1, 'credit', 7500, 'Vente marché 2', 'completed')`,
      [userId],
    );

    // Enrôlement de cet utilisateur en tant qu'acteur identifié : photo/
    // documents (base64) + coordonnées GPS personnelles, table liée
    // `identifications` (acteur_id = userId).
    const identificateur: any = await repo.save(
      repo.create({
        phone: '+2250700099002',
        passwordHash: await bcrypt.hash('0000', 10),
        firstName: 'Identificateur',
        lastName: 'Terrain',
        role: UserRole.IDENTIFICATEUR,
        status: UserStatus.ACTIF,
        genre: 'homme',
      } as any),
    );
    await ds.getRepository(Identification).save(
      ds.getRepository(Identification).create({
        identificateur_id: identificateur.id,
        acteur_id: userId,
        type_acteur: 'marchand',
        statut: 'approuve',
        documents: { pieceIdentite: 'data:image/jpeg;base64,PHOTO_DOCUMENT_XYZ==' },
        zone_id: 'zn-01',
        commission: 500,
        commission_payee: true,
        acteur_nom: 'Awa Koné',
        region: 'Abidjan',
        commune: 'Yopougon',
        latitude: 5.345317,
        longitude: -4.024429,
        form_data: { firstName: 'Awa', lastName: 'Koné', nin: 'CI-NIN-1234567890' },
      } as any),
    );
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it("aucun champ personnel identifiant ne survit en clair, et l'historique d'argent reste intact", async () => {
    // Avant suppression : référence de l'état financier.
    const txAvant: number = (
      await ds.query('SELECT count(*)::int c FROM wallet_transactions WHERE user_id = $1', [userId])
    )[0].c;
    const soldeAvant = (
      await ds.query('SELECT solde, solde_bloque FROM wallets WHERE user_id = $1', [userId])
    )[0];
    expect(txAvant).toBe(2);

    const res = await api()
      .delete('/api/v1/auth/account')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ password: PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // --- A) Aucun champ personnel identifiant ne survit en clair sur `users` ---
    const after = await ds.getRepository(User).findOne({ where: { id: userId } });
    expect(after).toBeTruthy();

    // Identité directe déjà couverte historiquement.
    expect(after!.phone).toBe(`deleted_${userId}`);
    expect(after!.passwordHash).toBe('');
    expect(after!.firstName).toBe('Compte');
    expect(after!.lastName).toBe('Supprimé');
    expect(after!.status).toBe(UserStatus.SUPPRIME);

    // Contact direct + image.
    expect(after!.email).toBeFalsy();
    expect(after!.photoUrl).toBeFalsy();

    // Documents officiels.
    expect(after!.nin).toBeFalsy();
    expect(after!.numCNPS).toBeFalsy();
    expect(after!.numCMU).toBeFalsy();
    expect(after!.recepisse).toBeFalsy();

    // État civil.
    expect(after!.dateNaissance).toBeFalsy();
    expect(after!.lieuNaissance).toBeFalsy();
    expect(after!.situationMatrimoniale).toBeFalsy();

    // Adresse / localisation.
    expect(after!.region).toBeFalsy();
    expect(after!.commune).toBeFalsy();
    expect(after!.quartierVillage).toBeFalsy();
    expect(after!.regionAutre).toBeFalsy();
    expect(after!.communeAutre).toBeFalsy();
    expect(after!.districtAutre).toBeFalsy();
    expect(after!.departementAutre).toBeFalsy();
    expect(after!.boitePostale).toBeFalsy();
    expect(after!.regionId).toBeFalsy();
    expect(after!.communeId).toBeFalsy();
    expect(after!.districtId).toBeFalsy();
    expect(after!.departementId).toBeFalsy();
    expect(after!.zoneId).toBeFalsy();

    // Métadonnées d'identité (référent nommé pour comptes entité/admin).
    expect(after!.entiteMetadata).toBeFalsy();

    // --- B) Table liée `identifications` (enrôlement de CET utilisateur) ---
    const identif = await ds.getRepository(Identification).findOne({ where: { acteur_id: userId } });
    expect(identif).toBeTruthy();
    expect(identif!.documents).toBeFalsy();
    expect(identif!.form_data).toBeFalsy();
    expect(identif!.acteur_nom).not.toBe('Awa Koné');
    expect(identif!.region).toBeFalsy();
    expect(identif!.commune).toBeFalsy();
    expect(identif!.latitude).toBeFalsy();
    expect(identif!.longitude).toBeFalsy();
    // Le workflow non-identifiant (activité de l'identificateur, commission)
    // n'est PAS une donnée personnelle de cet utilisateur : conservé.
    expect(identif!.statut).toBe('approuve');
    expect(Number(identif!.commission)).toBe(500);
    expect(identif!.zone_id).toBe('zn-01');

    // --- C) Argent gelé : historique de transactions intact et rattaché ---
    const txApres: number = (
      await ds.query('SELECT count(*)::int c FROM wallet_transactions WHERE user_id = $1', [userId])
    )[0].c;
    const soldeApres = (
      await ds.query('SELECT solde, solde_bloque FROM wallets WHERE user_id = $1', [userId])
    )[0];
    expect(txApres).toBe(txAvant);
    expect(txApres).toBe(2);
    expect(soldeApres).toEqual(soldeAvant);
    expect(Number(soldeApres.solde)).toBe(SOLDE_INITIAL);
  });
});
