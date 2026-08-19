// Invariant TN — Tontine réelle (POST /tontines, GET /tontines/mes-tontines,
// GET /tontines/:id, POST /tontines/:id/cotiser) : ordre de réception fixé à
// la création, montant/cadence fixes pour tout le cycle, distribution
// automatique EXACTEMENT à la dernière cotisation d'un cycle, jamais avant,
// jamais deux fois. Module SACRÉ (déplace de l'argent réel entre wallets,
// cf. CONSTITUTION.md §7) : rigueur maximale, aucun raccourci.
//
// Contexte (audit) : la tontine n'existait dans AUCUNE entité, migration,
// endpoint ni écran avant ce lot — seules des occurrences non liées
// (libellé de catégorie de dépense, mot-clé vocal) contenaient le mot.
//
// Modèle produit (tranché, hors périmètre = renouvellement de cycle) : un
// cycle complet = chaque membre reçoit exactement une fois le pot, dans
// l'ordre fixé à la création. Le dernier tour termine la tontine.
//
// Propriétés vérifiées, contre un VRAI Postgres, via l'API HTTP réelle :
//  TNa) Création : ordre assigné selon l'ordre du tableau fourni.
//  TNb) Chaque cotisation débite réellement le wallet du cotisant, du
//       montant EXACT, jamais plus.
//  TNc) La distribution se déclenche automatiquement et EXACTEMENT quand le
//       dernier membre du cycle cotise — jamais avant, jamais deux fois — et
//       crédite le bénéficiaire du montant total exact (montant × nb
//       membres), une seule fois.
//  TNd) Double cotisation du même membre sur le même cycle refusée (400+),
//       wallet débité une seule fois.
//  TNe) Un cycle complet (3 membres, 3 tours) termine la tontine ; plus
//       aucune cotisation acceptée ensuite.
//  TNf) Solde insuffisant : refus propre, rien ne bouge (wallet, mouvement,
//       cycle).
//  TNg) Isolation stricte : ni lecture ni cotisation pour un tiers.
//  TNh) Concurrence réelle : deux membres cotisent au même instant pour le
//       même cycle — aucune double distribution, aucune corruption de
//       cycleCourant (même exigence que le transfert compte-à-compte,
//       PR #204).

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

describe('Invariant TN — tontine réelle (ordre fixe, distribution automatique tracée)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let jwt: JwtService;
  const api = () => request(app.getHttpServer());

  const MONTANT = 5_000;

  type Acteur = { id: string; token: string; phone: string };

  const creerUtilisateur = async (phone: string, prenom: string, nom: string): Promise<Acteur> => {
    const repo = ds.getRepository(User);
    const user: any = await repo.save(
      repo.create({
        phone,
        firstName: prenom,
        lastName: nom,
        genre: 'femme',
        role: UserRole.MARCHAND,
        status: UserStatus.ACTIF,
        passwordHash: await bcrypt.hash('1234', 10),
      } as any),
    );
    const token = await jwt.signAsync(
      { sub: user.id, phone: user.phone, role: user.role },
      { secret: process.env.JWT_SECRET },
    );
    await ds.query(`INSERT INTO wallets (user_id, solde, solde_bloque) VALUES ($1, 0, 0)`, [user.id]);
    return { id: user.id, token, phone };
  };

  const crediter = async (userId: string, montant: number) =>
    ds.query(`UPDATE wallets SET solde = solde + $2 WHERE user_id = $1`, [userId, montant]);

  const soldeDe = async (userId: string): Promise<number> =>
    Number((await ds.query('SELECT solde FROM wallets WHERE user_id = $1', [userId]))[0].solde);

  const mouvementsCycle = async (tontineId: string, cycleNumero: number) =>
    ds.query(
      `SELECT type, membre_id, montant, wallet_transaction_id FROM tontine_mouvements
       WHERE tontine_id = $1 AND cycle_numero = $2 ORDER BY type, membre_id`,
      [tontineId, cycleNumero],
    );

  const tontineDb = async (id: string) =>
    (await ds.query(`SELECT cycle_courant, statut FROM tontines WHERE id = $1`, [id]))[0];

  const creerTontine = (token: string, body: any) =>
    api().post('/api/v1/tontines').set('Authorization', `Bearer ${token}`).send(body);

  const detailTontine = (id: string, token: string) =>
    api().get(`/api/v1/tontines/${id}`).set('Authorization', `Bearer ${token}`);

  const cotiser = (id: string, token: string) =>
    api().post(`/api/v1/tontines/${id}/cotiser`).set('Authorization', `Bearer ${token}`);

  let A: Acteur, B: Acteur, C: Acteur; // tontine1 — cycle complet 3 membres
  let D: Acteur, E: Acteur; // tontine2 — solde insuffisant
  let F: Acteur; // isolation — n'appartient à AUCUNE tontine du test
  let J: Acteur, K: Acteur; // tontine3 — concurrence réelle

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

    // Plage de téléphones dédiée à ce fichier — jamais utilisée ailleurs dans
    // test/invariants (vérifié par grep avant écriture, cf. consigne).
    A = await creerUtilisateur('+2250700080001', 'Aya', 'TontineA');
    B = await creerUtilisateur('+2250700080002', 'Awa', 'TontineB');
    C = await creerUtilisateur('+2250700080003', 'Adjoua', 'TontineC');
    D = await creerUtilisateur('+2250700080004', 'Drissa', 'TontineD');
    E = await creerUtilisateur('+2250700080005', 'Emma', 'TontineE');
    F = await creerUtilisateur('+2250700080006', 'Fatou', 'TontineF');
    J = await creerUtilisateur('+2250700080007', 'Jeanne', 'TontineJ');
    K = await creerUtilisateur('+2250700080008', 'Kadi', 'TontineK');

    // A, B, C : de quoi cotiser 3 cycles complets (3 × MONTANT chacun),
    // largement au-delà pour ne jamais confondre avec un solde insuffisant.
    for (const u of [A, B, C]) await crediter(u.id, MONTANT * 5);
    // D : volontairement insuffisant pour UNE seule cotisation.
    await crediter(D.id, 100);
    await crediter(E.id, MONTANT * 5);
    // J, K : de quoi cotiser une fois chacun (tontine à 2 membres, 1 cycle).
    await crediter(J.id, MONTANT * 5);
    await crediter(K.id, MONTANT * 5);
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  it('TNa — création : ordre assigné selon l’ordre du tableau fourni', async () => {
    const res = await creerTontine(A.token, {
      nom: 'Tontine du marché — A/B/C',
      montantCotisation: MONTANT,
      cadenceJours: 30,
      dateDebut: '2026-09-01',
      membres: [{ userId: A.id }, { userId: B.id }, { userId: C.id }],
    });
    expect(res.status).toBe(201);
    expect(res.body.statut).toBe('active');
    expect(res.body.cycleCourant).toBe(0);
    const tontineId = res.body.id as string;

    const rows = await ds.query(
      `SELECT user_id, ordre FROM tontine_membres WHERE tontine_id = $1 ORDER BY ordre ASC`,
      [tontineId],
    );
    expect(rows).toHaveLength(3);
    expect(rows.map((r: any) => r.user_id)).toEqual([A.id, B.id, C.id]);
    expect(rows.map((r: any) => Number(r.ordre))).toEqual([0, 1, 2]);

    // GET mes-tontines : visible pour le responsable ET pour un simple membre.
    const mesA = await api().get('/api/v1/tontines/mes-tontines').set('Authorization', `Bearer ${A.token}`);
    expect(mesA.status).toBe(200);
    expect(mesA.body.some((t: any) => t.id === tontineId)).toBe(true);
    const mesB = await api().get('/api/v1/tontines/mes-tontines').set('Authorization', `Bearer ${B.token}`);
    expect(mesB.body.some((t: any) => t.id === tontineId)).toBe(true);

    (global as any).__tontine1Id = tontineId;
  });

  it('TNb+TNc+TNd+TNe — cycle complet : débit exact, distribution auto au bon moment, double cotisation refusée, terminaison', async () => {
    const tontineId = (global as any).__tontine1Id as string;
    const totalMembres = 3;
    const montantTotal = MONTANT * totalMembres;

    // ── Cycle 0 : bénéficiaire = A (ordre 0) ──────────────────────────────
    const soldeAAvant = await soldeDe(A.id);
    const r1 = await cotiser(tontineId, A.token);
    expect(r1.status).toBe(201);
    expect(r1.body.distribution).toBeNull();
    // TNb : débit EXACT, jamais plus.
    expect(await soldeDe(A.id)).toBe(soldeAAvant - MONTANT);
    // TNc (jamais avant) : pas de distribution avec 1/3 cotisations.
    expect((await tontineDb(tontineId)).cycle_courant).toBe(0);

    // TNd — double cotisation du MÊME membre sur le MÊME cycle : refusée.
    const soldeAApresPremiere = await soldeDe(A.id);
    const rDouble = await cotiser(tontineId, A.token);
    expect(rDouble.status).toBeGreaterThanOrEqual(400);
    expect(rDouble.status).toBeLessThan(500);
    expect(await soldeDe(A.id)).toBe(soldeAApresPremiere); // wallet inchangé
    const mvtsA0 = await mouvementsCycle(tontineId, 0);
    expect(mvtsA0.filter((m: any) => m.type === 'cotisation' && m.membre_id === A.id)).toHaveLength(1);

    const soldeBAvant = await soldeDe(B.id);
    const r2 = await cotiser(tontineId, B.token);
    expect(r2.status).toBe(201);
    expect(r2.body.distribution).toBeNull();
    expect(await soldeDe(B.id)).toBe(soldeBAvant - MONTANT);
    expect((await tontineDb(tontineId)).cycle_courant).toBe(0); // toujours pas, 2/3

    const soldeCAvant = await soldeDe(C.id);
    const soldeABeneficiaireAvantDistribution = await soldeDe(A.id);
    const r3 = await cotiser(tontineId, C.token); // dernière cotisation du cycle 0
    expect(r3.status).toBe(201);
    // TNc : distribution déclenchée EXACTEMENT ici, bénéficiaire = A (ordre 0).
    expect(r3.body.distribution).not.toBeNull();
    expect(r3.body.distribution.beneficiaireUserId).toBe(A.id);
    expect(r3.body.distribution.montant).toBe(montantTotal);
    expect(r3.body.cycleCourant).toBe(1);
    expect(r3.body.statut).toBe('active'); // cycle 1/3 seulement

    expect(await soldeDe(C.id)).toBe(soldeCAvant - MONTANT);
    // A a cotisé (−MONTANT) PUIS reçu la distribution totale (+montantTotal),
    // une seule fois — vérifié via le solde net exact.
    expect(await soldeDe(A.id)).toBe(soldeABeneficiaireAvantDistribution + montantTotal);

    const distribCycle0 = await mouvementsCycle(tontineId, 0);
    expect(distribCycle0.filter((m: any) => m.type === 'distribution')).toHaveLength(1);
    expect(distribCycle0.filter((m: any) => m.type === 'cotisation')).toHaveLength(3);
    expect((await tontineDb(tontineId)).cycle_courant).toBe(1);
    expect((await tontineDb(tontineId)).statut).toBe('active');

    // ── Cycle 1 : bénéficiaire = B (ordre 1) ──────────────────────────────
    let last: any;
    for (const acteur of [A, B, C]) {
      last = await cotiser(tontineId, acteur.token);
      expect(last.status).toBe(201);
    }
    expect(last.body.distribution.beneficiaireUserId).toBe(B.id);
    expect(last.body.distribution.montant).toBe(montantTotal);
    expect(last.body.cycleCourant).toBe(2);
    expect(last.body.statut).toBe('active');

    // ── Cycle 2 (dernier tour) : bénéficiaire = C (ordre 2) → TERMINÉE ────
    for (const acteur of [A, B]) {
      const r = await cotiser(tontineId, acteur.token);
      expect(r.status).toBe(201);
      expect(r.body.distribution).toBeNull();
    }
    const dernier = await cotiser(tontineId, C.token);
    expect(dernier.status).toBe(201);
    expect(dernier.body.distribution.beneficiaireUserId).toBe(C.id);
    expect(dernier.body.distribution.montant).toBe(montantTotal);
    expect(dernier.body.cycleCourant).toBe(3);
    // TNe : cycle complet (3 membres, 3 tours) → tontine TERMINÉE.
    expect(dernier.body.statut).toBe('terminee');
    expect((await tontineDb(tontineId)).statut).toBe('terminee');

    // Exactement 3 distributions sur toute la tontine, jamais plus.
    const toutesDistributions = await ds.query(
      `SELECT membre_id, cycle_numero FROM tontine_mouvements WHERE tontine_id = $1 AND type = 'distribution' ORDER BY cycle_numero`,
      [tontineId],
    );
    expect(toutesDistributions).toHaveLength(3);
    expect(toutesDistributions.map((d: any) => d.membre_id)).toEqual([A.id, B.id, C.id]);

    // Plus AUCUNE cotisation acceptée après terminaison.
    const apresTerminaison = await cotiser(tontineId, A.token);
    expect(apresTerminaison.status).toBeGreaterThanOrEqual(400);
    expect(apresTerminaison.status).toBeLessThan(500);
    expect((await tontineDb(tontineId)).cycle_courant).toBe(3); // inchangé

    // GET détail : membres tous marqués aRecu, ordre conservé.
    const detail = await detailTontine(tontineId, A.token);
    expect(detail.status).toBe(200);
    expect(detail.body.membres.every((m: any) => m.aRecu === true)).toBe(true);
    expect(detail.body.membres.map((m: any) => m.ordre)).toEqual([0, 1, 2]);
  }, 30000);

  it('TNf — solde insuffisant : refus propre, rien ne bouge (wallet, mouvement, cycle)', async () => {
    const res = await creerTontine(D.token, {
      nom: 'Tontine D/E — solde insuffisant',
      montantCotisation: MONTANT,
      cadenceJours: 30,
      dateDebut: '2026-09-01',
      membres: [{ userId: D.id }, { userId: E.id }],
    });
    expect(res.status).toBe(201);
    const tontineId = res.body.id as string;

    const soldeDAvant = await soldeDe(D.id); // 100, insuffisant pour MONTANT=5000
    expect(soldeDAvant).toBeLessThan(MONTANT);

    const r = await cotiser(tontineId, D.token);
    expect(r.status).toBeGreaterThanOrEqual(400);
    expect(r.status).toBeLessThan(500);

    expect(await soldeDe(D.id)).toBe(soldeDAvant); // wallet intact
    const mvts = await mouvementsCycle(tontineId, 0);
    expect(mvts).toHaveLength(0); // aucun mouvement tracé
    expect((await tontineDb(tontineId)).cycle_courant).toBe(0); // cycle intact
  });

  it('TNg — isolation stricte : un tiers ne peut ni lire ni cotiser', async () => {
    const tontineId = (global as any).__tontine1Id as string;

    const lecture = await detailTontine(tontineId, F.token);
    expect(lecture.status).toBe(403);

    const cotisation = await cotiser(tontineId, F.token);
    expect(cotisation.status).toBe(403);
  });

  it('TNh — concurrence réelle : deux membres cotisent au même instant → aucune double distribution, aucune corruption de cycleCourant', async () => {
    const res = await creerTontine(J.token, {
      nom: 'Tontine J/K — concurrence',
      montantCotisation: MONTANT,
      cadenceJours: 30,
      dateDebut: '2026-09-01',
      membres: [{ userId: J.id }, { userId: K.id }],
    });
    expect(res.status).toBe(201);
    const tontineId = res.body.id as string;
    const montantTotal = MONTANT * 2;

    const soldeJAvant = await soldeDe(J.id);
    const soldeKAvant = await soldeDe(K.id);

    // Deux requêtes CONCURRENTES sur le MÊME cycle — course réelle sur le
    // verrou pessimiste posé sur la ligne `tontines` (cf. TontinesService.cotiser).
    const [r1, r2] = await Promise.all([cotiser(tontineId, J.token), cotiser(tontineId, K.token)]);

    expect([r1.status, r2.status]).toEqual([201, 201]);

    // Exactement UNE des deux réponses porte la distribution (celle qui a
    // été sérialisée en second par le verrou) — jamais les deux, jamais aucune.
    const distributions = [r1.body.distribution, r2.body.distribution].filter((d) => d !== null);
    expect(distributions).toHaveLength(1);
    expect(distributions[0].beneficiaireUserId).toBe(J.id); // ordre 0
    expect(distributions[0].montant).toBe(montantTotal);

    // Persisté en base : cycleCourant a avancé UNE seule fois (jamais 2, pas
    // de corruption par la course). Tontine à 2 membres : après le tour de J
    // (ordre 0), K (ordre 1) n'a pas encore reçu son tour — encore ACTIVE,
    // pas terminée (le renouvellement multi-cycle n'est pas testé ici, cf.
    // TNe pour la terminaison complète avec 3 membres).
    const etat = await tontineDb(tontineId);
    expect(etat.cycle_courant).toBe(1);
    expect(etat.statut).toBe('active');

    const distribsDb = await ds.query(
      `SELECT membre_id, montant FROM tontine_mouvements WHERE tontine_id = $1 AND type = 'distribution'`,
      [tontineId],
    );
    expect(distribsDb).toHaveLength(1); // jamais deux distributions pour le même cycle
    expect(distribsDb[0].membre_id).toBe(J.id);
    expect(Number(distribsDb[0].montant)).toBe(montantTotal);

    // Soldes exacts : chacun débité une fois de MONTANT, J (bénéficiaire,
    // ordre 0) crédité une seule fois du total.
    expect(await soldeDe(K.id)).toBe(soldeKAvant - MONTANT);
    expect(await soldeDe(J.id)).toBe(soldeJAvant - MONTANT + montantTotal);
  }, 30000);
});
