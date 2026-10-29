// SEC-BESOIN-01 — la consolidation des besoins est SCOPÉE À LA COOPÉRATIVE
// RÉSOLUE CÔTÉ SERVEUR (audit workflow officiel, 20/10/2026).
//
// Trou constaté le 20/10/2026 (AUDIT-WORKFLOW-OFFICIEL-2026-10-20.md §4) :
// POST /cooperatives/besoins/consolider acceptait `body.cooperative_id` fourni
// par le client (`cooperative_id = body.cooperative_id || coop.id`), en
// contradiction avec createBesoin qui force la coopérative résolue serveur.
// Un président de coopérative pouvait consolider (et donc clôturer en masse)
// les besoins d'une AUTRE coopérative en postant son id.
//
// Propriétés vérifiées (🟢 attendu) :
//  - SEC-BESOIN-1 : un président B qui poste consolidation avec
//    cooperative_id = coop A ne modifie AUCUN besoin de la coop A — seuls les
//    besoins EN ATTENTE de SA coopérative (coop B) passent à 'consolide'.
//  - SEC-BESOIN-2 : la consolidation SANS cooperative_id ne touche que SA
//    coopérative (le comportement légitime reste intact, filtrage produit+unité).
//  - SEC-BESOIN-3 : createBesoin reste verrouillé serveur (régression zéro) —
//    un besoin posté avec un cooperative_id étranger tombe dans SA coopérative.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';

describe('Invariant SEC-BESOIN-01 — consolidation des besoins scopée serveur (🟢 attendu)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let presidentAToken: string;
  let presidentBToken: string;
  let coopAId: string;
  let coopBId: string;

  const PHONE_A = '+2250700000925';
  const PHONE_B = '+2250700000926';

  const signup = async (phone: string, role: string, firstName: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({ phone, firstName, lastName: 'SecBesoin', role, genre: 'femme' });
    expect([200, 201]).toContain(res.status);
    const token = res.body.accessToken as string;
    // Mot de passe acteur par défaut « 0000 » + mustChangePassword=true : la
    // garde JWT bloque tout sauf change-password tant qu'il n'est pas levé.
    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: '0000', newPassword: '1234' });
    return { token, id: res.body.user.id as string };
  };

  const lireBesoins = async (token: string) => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/cooperatives/besoins')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    return res.body.besoins as Array<{ id: string; produit: string; statut: string }>;
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    await app.get(DbInitService, { strict: false }).runInit();

    // Signup role=cooperateur crée AUTOMATIQUEMENT la coopérative dont
    // l'utilisateur est responsable (AuthService.signup) : deux présidentes,
    // donc deux coopératives indépendantes.
    const presidentA = await signup(PHONE_A, 'cooperateur', 'Adjoua');
    presidentAToken = presidentA.token;
    const presidentB = await signup(PHONE_B, 'cooperateur', 'Bintou');
    presidentBToken = presidentB.token;

    // La coopérative d'une présidente est celle dont elle est responsable
    // (responsable_id — résolution serveur, cf. resolveUserCooperative).
    const coopRowsA = await ds.query(
      `SELECT id FROM cooperatives WHERE responsable_id = $1 LIMIT 1`,
      [presidentA.id],
    );
    const coopRowsB = await ds.query(
      `SELECT id FROM cooperatives WHERE responsable_id = $1 LIMIT 1`,
      [presidentB.id],
    );
    coopAId = coopRowsA[0]?.id as string;
    coopBId = coopRowsB[0]?.id as string;
    expect(coopAId).toBeTruthy();
    expect(coopBId).toBeTruthy();
    expect(coopAId).not.toBe(coopBId);

    // Chaque coopérative exprime DEUX besoins en attente.
    for (const [token, produit] of [
      [presidentAToken, 'igname'],
      [presidentAToken, 'gombo'],
      [presidentBToken, 'tomate'],
      [presidentBToken, 'aubergine'],
    ] as Array<[string, string]>) {
      const r = await request(app.getHttpServer())
        .post('/api/v1/cooperatives/besoins')
        .set('Authorization', `Bearer ${token}`)
        .send({ produit, categorie: 'autre', quantite: 10, unite: 'sac' });
      expect([200, 201]).toContain(r.status);
      expect(r.body.success).toBe(true);
    }
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('SEC-BESOIN-1 : cooperative_id étranger ignoré — la coop A reste intacte, seuls les besoins de la coop B sont consolidés', async () => {
    // ATTAQUE : la présidente B cible la coop A dans le body.
    const attaque = await request(app.getHttpServer())
      .post('/api/v1/cooperatives/besoins/consolider')
      .set('Authorization', `Bearer ${presidentBToken}`)
      .send({ cooperative_id: coopAId });
    expect([200, 201]).toContain(attaque.status);
    expect(attaque.body.success).toBe(true);

    const besoinsA = await lireBesoins(presidentAToken);
    expect(besoinsA.length).toBe(2);
    for (const b of besoinsA) {
      // Aucun besoin de la coop A ne doit avoir bougé.
      expect(b.statut).toBe('en_attente');
    }

    const besoinsB = await lireBesoins(presidentBToken);
    expect(besoinsB.length).toBe(2);
    for (const b of besoinsB) {
      // La consolidation légitime de B a bien eu lieu, chez B seulement.
      expect(b.statut).toBe('consolide');
    }
  });

  it('SEC-BESOIN-2 : consolidation sans cooperative_id — filtrage produit+unité limité à SA coopérative', async () => {
    // B recrée un besoin (les siens sont consolidés) puis ne consolide QUE
    // « piment / sac » : le second besoin reste en attente.
    const r = await request(app.getHttpServer())
      .post('/api/v1/cooperatives/besoins')
      .set('Authorization', `Bearer ${presidentBToken}`)
      .send({ produit: 'piment', quantite: 5, unite: 'sac' });
    expect([200, 201]).toContain(r.status);

    const cons = await request(app.getHttpServer())
      .post('/api/v1/cooperatives/besoins/consolider')
      .set('Authorization', `Bearer ${presidentBToken}`)
      .send({ produit: 'piment', unite: 'sac' });
    expect([200, 201]).toContain(cons.status);
    expect(cons.body.success).toBe(true);

    const besoinsB = await lireBesoins(presidentBToken);
    const piment = besoinsB.find((b) => b.produit === 'piment');
    const aubergine = besoinsB.find((b) => b.produit === 'aubergine');
    expect(piment?.statut).toBe('consolide');
    expect(aubergine?.statut).toBe('consolide'); // déjà consolidé au test 1

    // La coop A n'a JAMAIS été touchée par les appels de B.
    const besoinsA = await lireBesoins(presidentAToken);
    expect(besoinsA.every((b) => b.statut === 'en_attente')).toBe(true);
  });

  it('SEC-BESOIN-3 : createBesoin place TOUJOURS le besoin dans la coopérative serveur, même avec un cooperative_id étranger', async () => {
    // Tentative d'injection : B crée un besoin en se réclamant de la coop A.
    const r = await request(app.getHttpServer())
      .post('/api/v1/cooperatives/besoins')
      .set('Authorization', `Bearer ${presidentBToken}`)
      .send({
        cooperative_id: coopAId,
        produit: 'manioc',
        categorie: 'autre',
        quantite: 7,
        unite: 'sac',
      });
    expect([200, 201]).toContain(r.status);

    // En base, le besoin « manioc » est rattaché à la coop B, pas à la coop A.
    const rows = await ds.query(
      `SELECT cooperative_id FROM cooperative_besoins WHERE produit = 'manioc' AND unite = 'sac'`,
    );
    expect(rows.length).toBe(1);
    expect(rows[0].cooperative_id).toBe(coopBId);

    // Et la coop A n'a toujours que ses deux besoins initiaux.
    const besoinsA = await lireBesoins(presidentAToken);
    expect(besoinsA.length).toBe(2);
    expect(besoinsA.some((b) => b.produit === 'manioc')).toBe(false);
  });
});
