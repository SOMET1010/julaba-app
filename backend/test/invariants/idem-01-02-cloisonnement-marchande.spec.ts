// IDEM-01/02 — LE CLOISONNEMENT PAR MARCHANDE, PROUVÉ CONTRE UNE VRAIE BASE.
//
// Pourquoi ce banc existe. Le correctif IDEM-01/02 n'était prouvé que par
// LECTURE DE SOURCE : `test/unit/idempotence-par-marchande.spec.ts` relit les
// migrations et les contrôleurs sans jamais exécuter une requête. Or les deux
// défauts corrigés sont des défauts de BASE, pas de texte :
//
//   - `ON CONFLICT (marchand_id, idempotency_key)` n'est légal que s'il
//     existe un index unique sur EXACTEMENT ces colonnes. S'il manque,
//     Postgres renvoie 42P10 et TOUTE correction de stock échoue — un test
//     qui lit la source ne peut pas voir ça ;
//   - le rattrapage `23505` ne se vérifie qu'en provoquant la violation.
//
// « Sur l'argent, la preuve doit TRAVERSER. » On passe donc par les vraies
// routes, et on relit la base derrière.

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';

describe('IDEM-01/02 — une clé d’idempotence se juge par marchande', () => {
  let app: INestApplication;
  let ds: DataSource;

  type Marchande = { token: string; id: string; produitId: string };
  const marchandes: Record<'A' | 'B', Marchande> = {} as any;

  const PRODUIT = 'Gombo-IDEM';

  const inscrire = async (phone: string, prenom: string): Promise<Marchande> => {
    const su = await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({ phone, firstName: prenom, lastName: 'Idem', role: 'marchand', genre: 'femme' });
    expect([200, 201]).toContain(su.status);
    const token = su.body.accessToken as string;
    expect(token).toBeTruthy();
    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ oldPassword: '0000', newPassword: '1234' });
    const p = await request(app.getHttpServer())
      .post('/api/v1/caisse/produits')
      .set('Authorization', `Bearer ${token}`)
      .send({ nom: PRODUIT, stock: 100, prix: 200, unite: 'kg' });
    expect([200, 201]).toContain(p.status);
    return { token, id: su.body.user.id, produitId: String(p.body?.id ?? p.body?.produit?.id ?? '') };
  };

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    ds = app.get(DataSource);
    await app.get(DbInitService, { strict: false }).runInit();

    marchandes.A = await inscrire('+2250700009001', 'Awa');
    marchandes.B = await inscrire('+2250700009002', 'Bintou');
  }, 120000);

  afterAll(async () => {
    if (app) await app.close();
  });

  const nbTx = async (key: string, userId: string): Promise<number> => {
    const r = await ds.query(
      'SELECT count(*)::int AS n FROM caisse_transactions WHERE idempotency_key = $1 AND user_id = $2',
      [key, userId],
    );
    return r[0].n;
  };
  const stock = async (userId: string): Promise<number> => {
    const r = await ds.query(
      'SELECT stock FROM produits WHERE marchand_id = $1::text AND lower(nom) = lower($2)',
      [userId, PRODUIT],
    );
    return Number(r[0]?.stock);
  };
  const vendre = (m: Marchande, key: string) =>
    request(app.getHttpServer())
      .post('/api/v1/caisse/vente')
      .set('Authorization', `Bearer ${m.token}`)
      .send({ montant: '1000', produits: [{ nom: PRODUIT, quantite: 5 }], idempotency_key: key });

  // ── L'INDEX, TEL QUE LA BASE LE REND ──────────────────────────────────────

  it('caisse_transactions : l’index d’idempotence est UNIQUE et porte user_id', async () => {
    const r = await ds.query(
      `SELECT indexname, indexdef FROM pg_indexes
       WHERE tablename = 'caisse_transactions' AND indexdef ILIKE '%idempotency_key%'`,
    );
    const defs = r.map((x: any) => x.indexdef as string);
    expect(defs.length).toBeGreaterThan(0);
    // Aucun index ne protège la clé SEULE : c'était le défaut IDEM-01.
    for (const def of defs) {
      expect(def).toMatch(/CREATE UNIQUE INDEX/i);
      expect(def).toMatch(/\(\s*user_id\s*,\s*idempotency_key\s*\)/i);
    }
  });

  it('stock_operation_idempotency : unique sur (marchand_id, idempotency_key), plus de PK sur la clé seule', async () => {
    const idx = await ds.query(
      `SELECT indexname, indexdef FROM pg_indexes
       WHERE tablename = 'stock_operation_idempotency'`,
    );
    const composite = idx.find((x: any) =>
      /CREATE UNIQUE INDEX/i.test(x.indexdef) &&
      /\(\s*marchand_id\s*,\s*idempotency_key\s*\)/i.test(x.indexdef),
    );
    expect(composite).toBeDefined();
    // La clé primaire sur `idempotency_key` seule ne doit plus exister : c'est
    // elle qui rendait le faux « replayed: true » possible.
    const pk = await ds.query(
      `SELECT conname FROM pg_constraint
       WHERE conrelid = 'stock_operation_idempotency'::regclass AND contype = 'p'`,
    );
    expect(pk).toHaveLength(0);
  });

  // ── LE CLOISONNEMENT, DANS LES DEUX SENS ──────────────────────────────────

  it('caisse : la MÊME clé passe pour DEUX marchandes — deux ventes, deux décréments', async () => {
    const KEY = 'IDEM-PARTAGEE-001';
    expect(await stock(marchandes.A.id)).toBe(100);
    expect(await stock(marchandes.B.id)).toBe(100);

    const rA = await vendre(marchandes.A, KEY);
    expect([200, 201]).toContain(rA.status);
    const rB = await vendre(marchandes.B, KEY);
    // AVANT IDEM-01 : cette seconde vente violait l'index global, le
    // rattrapage relisait avec SON user_id, ne trouvait rien, et l'erreur
    // remontait. La vente de Bintou était perdue sans explication.
    expect([200, 201]).toContain(rB.status);

    expect(await nbTx(KEY, marchandes.A.id)).toBe(1);
    expect(await nbTx(KEY, marchandes.B.id)).toBe(1);
    expect(await stock(marchandes.A.id)).toBe(95);
    expect(await stock(marchandes.B.id)).toBe(95);
  });

  it('caisse : la même clé rejouée par la MÊME marchande ne produit rien de plus', async () => {
    const KEY = 'IDEM-REJEU-001';
    const avant = await stock(marchandes.A.id);
    expect([200, 201]).toContain((await vendre(marchandes.A, KEY)).status);
    expect([200, 201]).toContain((await vendre(marchandes.A, KEY)).status);
    expect(await nbTx(KEY, marchandes.A.id)).toBe(1);
    expect(await stock(marchandes.A.id)).toBe(avant - 5);
  });

  it('caisse : la violation 23505 est bien rattrapée (deux ventes concurrentes, même clé)', async () => {
    const KEY = 'IDEM-COURSE-001';
    const avant = await stock(marchandes.A.id);
    // Lancées ensemble : les deux lectures préalables peuvent ne rien trouver,
    // et c'est alors l'index unique — seule protection qui tienne sous la
    // concurrence — qui refuse la seconde. Le rattrapage doit rendre la
    // transaction déjà enregistrée, pas une erreur.
    const [r1, r2] = await Promise.all([vendre(marchandes.A, KEY), vendre(marchandes.A, KEY)]);
    expect([200, 201]).toContain(r1.status);
    expect([200, 201]).toContain(r2.status);
    expect(await nbTx(KEY, marchandes.A.id)).toBe(1);
    expect(await stock(marchandes.A.id)).toBe(avant - 5);
  });

  it('caisse : la base refuse réellement un doublon (user_id, idempotency_key) — SQLSTATE 23505', async () => {
    const KEY = 'IDEM-DOUBLON-SQL-001';
    expect([200, 201]).toContain((await vendre(marchandes.A, KEY)).status);
    const ligne = await ds.query(
      `SELECT * FROM caisse_transactions WHERE idempotency_key = $1 AND user_id = $2`,
      [KEY, marchandes.A.id],
    );
    expect(ligne).toHaveLength(1);
    // On tente l'insertion interdite à la main : c'est la preuve que la garde
    // vit en base et pas seulement dans le contrôleur.
    let code = '';
    try {
      await ds.query(
        `INSERT INTO caisse_transactions (user_id, type, montant, idempotency_key)
         VALUES ($1, $2, $3, $4)`,
        [marchandes.A.id, 'vente', 100, KEY],
      );
    } catch (e: any) {
      code = e?.code || '';
    }
    expect(code).toBe('23505');
    // La même clé, pour l'AUTRE marchande, passe : l'unicité est cloisonnée.
    await ds.query(
      `INSERT INTO caisse_transactions (user_id, type, montant, idempotency_key)
       VALUES ($1, $2, $3, $4)`,
      [marchandes.B.id, 'vente', 100, KEY],
    );
    expect(await nbTx(KEY, marchandes.B.id)).toBe(1);
  });

  it('stock : la même clé pour deux marchandes corrige LES DEUX stocks (pas de faux « replayed »)', async () => {
    const KEY = 'IDEM-STOCK-PARTAGEE-001';
    const majStock = (m: Marchande, quantite: number) =>
      request(app.getHttpServer())
        .patch(`/api/v1/stocks/${m.produitId}`)
        .set('Authorization', `Bearer ${m.token}`)
        .send({ quantite, idempotency_key: KEY });

    const rA = await majStock(marchandes.A, 42);
    expect([200, 201]).toContain(rA.status);
    expect(rA.body).toMatchObject({ success: true, replayed: false });

    const rB = await majStock(marchandes.B, 37);
    // AVANT IDEM-02 : `replayed: true`, stock de Bintou JAMAIS écrit, et
    // l'écart ne sortait qu'à l'inventaire.
    expect([200, 201]).toContain(rB.status);
    expect(rB.body).toMatchObject({ success: true, replayed: false });

    expect(await stock(marchandes.A.id)).toBe(42);
    expect(await stock(marchandes.B.id)).toBe(37);

    // Et le vrai rejeu — même marchande, même clé — reste un rejeu.
    const rejeu = await majStock(marchandes.A, 7);
    expect(rejeu.body).toMatchObject({ success: true, replayed: true });
    expect(await stock(marchandes.A.id)).toBe(42);
  });

  // ── LES TABLES D'AGENT EXISTENT VRAIMENT (AGENT-A1/A2) ────────────────────

  it('AGENT-A1/A2 : les trois tables d’agent et leur index existent en base', async () => {
    const t = await ds.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name IN ('agent_service','agent_code_delegation','agent_delegation')
       ORDER BY table_name`,
    );
    expect(t.map((x: any) => x.table_name)).toEqual([
      'agent_code_delegation',
      'agent_delegation',
      'agent_service',
    ]);
    const i = await ds.query(
      `SELECT indexdef FROM pg_indexes
       WHERE tablename = 'agent_delegation' AND indexname = 'ix_agent_delegation_marchand'`,
    );
    expect(i).toHaveLength(1);
  });
});
