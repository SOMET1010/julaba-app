// IDENT-09 — la soumission d'un dossier est IDEMPOTENTE : un réseau qui
// tombe au mauvais moment ne crée plus ni doublon ni faux échec (20/10/2026).
//
// Constat (AUDIT-PARCOURS-IDENTIFICATEUR §IDENT-09, reconduisant
// IDENTIFICATEUR-11) : POST /identifications/create-with-acteur créait
// acteur + user + dossier dans une transaction, SANS clé d'idempotence. En
// terrain, la réalité est brutale : le réseau ivoirien coupe, l'app retry —
// et l'identificateur essuie soit un « Ce numero de telephone est deja
// utilise » (la PREMIÈRE soumission avait réussi, le dossier existe, mais le
// message dit échec), soit pire un DOUBLON complet. Le brouillon localStorage
// protège la saisie, pas la soumission.
//
// Correctif : le client génère UNE clé d'idempotence par soumission (persistée
// avec le brouillon, réutilisée à chaque reprise) et l'envoie dans le body.
// Le serveur : première arrivée = création normale + la clé est posée sur le
// dossier ; reprise avec la MÊME clé = renvoi du dossier EXISTANT (même id,
// zéro acteur supplémentaire, zéro SMS, flag `dejaSoumis`) — la réponse
// ressemble à un succès parce que c'en est un. Sans clé : comportement
// inchangé (rétrocompatibilité).
//
// Propriétés vérifiées (🟢 attendu) :
//  - IDENT-09-a : soumission initiale avec clé → dossier créé, clé persistée.
//  - IDENT-09-b : REJEU avec la même clé → MÊME dossier (même id), ni
//    dossier ni acteur supplémentaire en base, flag dejaSoumis — le faux
//    « numéro déjà utilisé » du retry est mort.
//  - IDENT-09-c : une AUTRE clé = une AUTRE soumission (idempotence ≠
//    interdiction de soumettre plusieurs acteurs).
//  - IDENT-09-d : sans clé → comportement inchangé (un dossier créé).

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

const PHONE_ACTEUR = '+2250700000801';

describe('Invariant IDENT-09 — soumission de dossier idempotente (🟢 attendu)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;

  let tokenIdentificateur: string;

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

  const soumettre = (key?: string) => api()
    .post('/api/v1/identifications/create-with-acteur')
    .set('Authorization', `Bearer ${tokenIdentificateur}`)
    .send({
      ...(key ? { idempotencyKey: key } : {}),
      acteur: {
        firstName: 'Awa', lastName: 'Kone', phone: PHONE_ACTEUR,
        password: 'secret-inconnu', role: 'marchand', genre: 'femme',
      },
      identification: {
        type_acteur: 'marchand',
        acteur_nom: 'Awa Kone',
        commune: 'Abobo', region: 'Abidjan',
        currentStep: 3, formData: { nom: 'Awa' },
        documents: null,
      },
    });

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

    const ident = await seedUser(UserRole.IDENTIFICATEUR, '+2250700000800');
    tokenIdentificateur = ident.token;
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('IDENT-09-a : soumission initiale avec clé → dossier créé, clé persistée', async () => {
    const r = await soumettre('IDEM-9-test-0001');
    expect([200, 201]).toContain(r.status);
    expect(r.body?.identification?.id).toBeTruthy();

    const enBase = await ds.query(
      `SELECT idempotency_key FROM identifications WHERE id = $1`,
      [r.body.identification.id],
    );
    expect(enBase[0]?.idempotency_key).toBe('IDEM-9-test-0001');
  });

  it('IDENT-09-b : le rejeu avec la MÊME clé renvoie le MÊME dossier, zéro doublon', async () => {
    const premier = await ds.query(
      `SELECT id::text AS id, acteur_id::text AS acteur FROM identifications WHERE idempotency_key = 'IDEM-9-test-0001'`,
    );
    expect(premier.length).toBe(1);

    const r = await soumettre('IDEM-9-test-0001'); // le client retry après coupure réseau
    expect([200, 201]).toContain(r.status);
    expect(r.body?.identification?.id ?? r.body?.id).toBe(premier[0].id);
    expect(r.body?.dejaSoumis).toBe(true);

    // Ni dossier ni acteur supplémentaire en base.
    const dossiers = await ds.query(
      `SELECT COUNT(*)::int AS n FROM identifications WHERE idempotency_key = 'IDEM-9-test-0001'`,
    );
    expect(dossiers[0].n).toBe(1);
    const acteurs = await ds.query(
      `SELECT COUNT(*)::int AS n FROM users WHERE phone = $1`,
      [PHONE_ACTEUR],
    );
    expect(acteurs[0].n).toBe(1);
  });

  it('IDENT-09-c : une AUTRE clé = une AUTRE soumission (nouveau numéro)', async () => {
    const r = await api()
      .post('/api/v1/identifications/create-with-acteur')
      .set('Authorization', `Bearer ${tokenIdentificateur}`)
      .send({
        idempotencyKey: 'IDEM-9-test-0002',
        acteur: {
          firstName: 'Yao', lastName: 'Kouassi', phone: '+2250700000802',
          password: 'secret-inconnu', role: 'producteur', genre: 'homme',
        },
        identification: {
          type_acteur: 'producteur',
          acteur_nom: 'Yao Kouassi',
          commune: 'Anyama', region: 'Abidjan',
          currentStep: 3, formData: { nom: 'Yao' },
          documents: null,
        },
      });
    expect([200, 201]).toContain(r.status);
    expect(r.body?.dejaSoumis).toBeUndefined();

    const dossiers = await ds.query(
      `SELECT COUNT(*)::int AS n FROM identifications WHERE idempotency_key = 'IDEM-9-test-0002'`,
    );
    expect(dossiers[0].n).toBe(1);
  });

  it('IDENT-09-d : sans clé → comportement inchangé (rétrocompatibilité)', async () => {
    const r = await api()
      .post('/api/v1/identifications/create-with-acteur')
      .set('Authorization', `Bearer ${tokenIdentificateur}`)
      .send({
        acteur: {
          firstName: 'Fatou', lastName: 'Diarra', phone: '+2250700000803',
          password: 'secret-inconnu', role: 'marchand', genre: 'femme',
        },
        identification: {
          type_acteur: 'marchand',
          acteur_nom: 'Fatou Diarra',
          commune: 'Bingerville', region: 'Abidjan',
          currentStep: 3, formData: { nom: 'Fatou' },
          documents: null,
        },
      });
    expect([200, 201]).toContain(r.status);
    expect(r.body?.identification?.id).toBeTruthy();
  });
});
