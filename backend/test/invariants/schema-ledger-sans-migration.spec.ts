// LE SCHÉMA QUE DbInit POSE DOIT SUFFIRE — invariant né du constat B1.
//
// En production, sur une base vierge, `computeBootDbFlags` renvoie
// `synchronize: true, migrationsRun: false`. La chaîne de migrations NE TOURNE
// PAS. Et `stock_mouvements` n'a aucune entité TypeORM : `synchronize` ne la
// crée pas non plus. **DbInit est donc le SEUL mécanisme garanti.**
//
// Le 19/09/2026, la colonne `type` du ledger manquait à DbInit : le code
// l'écrivait et la lisait, seule une migration la créait, et annuler une vente
// échouait sur toute base neuve — rollback, la vente redevenait valide,
// l'argent restait compté.
//
// Le défaut avait survécu parce que le test qui aurait dû l'attraper appliquait
// la migration lui-même pour se rendre vert. Ce test-ci ne répare RIEN : il
// boote l'application comme la production le fait, appelle `runInit()`, et
// constate. S'il échoue, c'est que du DDL a été ajouté à une migration sans
// être porté dans DbInit — et que le prochain déploiement neuf sera cassé.

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';

describe('Schéma — ce que DbInit pose suffit, sans aucune migration', () => {
  let app: INestApplication;
  let ds: DataSource;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    ds = app.get(DataSource);
    // Exactement ce que fait la production, et RIEN de plus.
    await app.get(DbInitService, { strict: false }).runInit();
  }, 60000);

  afterAll(async () => { if (app) await app.close(); });

  it('aucune migration n’a tourné — on vérifie bien le chemin de production', async () => {
    const [r] = await ds.query(
      `SELECT count(*)::int AS n FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'migrations'`,
    );
    expect(r.n).toBe(0);
  });

  it('le ledger porte toutes les colonnes que le code écrit et lit', async () => {
    const rows = await ds.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name = 'stock_mouvements'`,
    );
    const colonnes = rows.map((r: { column_name: string }) => r.column_name);

    // Écrites par caisse-rest.controller.ts et stock-restitution.ts,
    // lues par stocks-rest.controller.ts.
    for (const attendue of [
      'marchand_id', 'transaction_id', 'produit_id', 'produit_nom',
      'stock_avant', 'quantite_demandee', 'quantite_retranchee', 'manquant',
      'created_at',
      // Celle qui manquait, et qui cassait l'annulation d'une vente.
      'type',
    ]) {
      expect(colonnes).toContain(attendue);
    }
  });

  it('la requête réelle du panneau « Derniers mouvements » s’exécute', async () => {
    // C'est CETTE requête qui répondait 500 : « column sm.type does not exist ».
    await expect(
      ds.query(
        `SELECT sm.id, sm.produit_nom, sm.quantite_retranchee, sm.type, sm.created_at, p.unite
           FROM stock_mouvements sm
           LEFT JOIN produits p ON p.id = sm.produit_id
          WHERE sm.marchand_id = $1
            AND sm.quantite_retranchee <> 0
          ORDER BY sm.created_at DESC
          LIMIT 1`,
        ['aucun-marchand'],
      ),
    ).resolves.toEqual([]);
  });

  // ── STK-01 : la MÊME faute, une seconde fois ────────────────────────────
  //
  // `stock_operation_idempotency` n'est créée QUE par la migration
  // 1781500000000. DbInit ne la pose pas. Or `stocks-rest.controller.ts:190` y
  // insère dès qu'une clé d'idempotence est fournie — et `StockContext` en
  // envoie une à CHAQUE mise à jour de stock, en ligne comme hors ligne.
  //
  // Conséquence sur toute base neuve : TOUTE modification de stock échoue.
  // Ce n'est pas « une migration à appliquer en production » : c'est B1 à
  // nouveau, et le dépôt suffit à le démontrer.
  it('la table d’idempotence des opérations de stock existe', async () => {
    const [r] = await ds.query(
      `SELECT count(*)::int AS n FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'stock_operation_idempotency'`,
    );
    expect(r.n).toBe(1);
  });

  it('l’INSERT réel d’une clé d’idempotence de stock s’exécute', async () => {
    // C'est CET INSERT que fait le contrôleur dès qu'une clé est fournie.
    await expect(
      ds.query(
        `INSERT INTO stock_operation_idempotency (idempotency_key, stock_id, marchand_id)
         VALUES ($1, $2, $3) ON CONFLICT (idempotency_key) DO NOTHING
         RETURNING idempotency_key`,
        ['schema-test-key', 'stock-1', 'schema-test'],
      ),
    ).resolves.toHaveLength(1);
    await ds.query(`DELETE FROM stock_operation_idempotency WHERE marchand_id = 'schema-test'`);
  });

  // ── LE GARDE-FOU SYSTÉMATIQUE ───────────────────────────────────────────
  //
  // Deux fois en un jour, une table ou une colonne créée par une SEULE
  // migration a manqué à DbInit, et le défaut n'est apparu qu'à l'exécution :
  // B1 (`stock_mouvements.type`) puis STK-01 (`stock_operation_idempotency`).
  // Vérifier les tables une par une à chaque incident ne tient pas.
  //
  // On énumère donc les tables que le code ÉCRIT RÉELLEMENT en SQL brut — ce
  // sont celles que `synchronize` ne crée pas, faute d'entité — et on exige
  // qu'elles existent après DbInit seul.
  it('toutes les tables écrites en SQL brut par le code existent après DbInit seul', async () => {
    const { readdirSync, readFileSync, statSync } = require('node:fs') as typeof import('node:fs');
    const { join } = require('node:path') as typeof import('node:path');

    const fichiers = (dir: string, acc: string[] = []): string[] => {
      for (const e of readdirSync(dir)) {
        const p = join(dir, e);
        if (statSync(p).isDirectory()) { if (e !== 'migrations') fichiers(p, acc); }
        else if (p.endsWith('.ts') && !p.endsWith('.spec.ts')) acc.push(p);
      }
      return acc;
    };

    const tables = new Set<string>();
    const creeesAuVol = new Set<string>();
    for (const f of fichiers(join(__dirname, '..', '..', 'src'))) {
      const code = readFileSync(f, 'utf8');
      for (const m of code.matchAll(/INSERT\s+INTO\s+(?:public\.)?([a-z_][a-z0-9_]*)/gi)) {
        tables.add(m[1].toLowerCase());
      }
      // Certains services posent leur propre table au premier usage
      // (`CREATE TABLE IF NOT EXISTS` dans le service). Ce n'est pas un défaut
      // d'exécution — c'est une troisième façon de construire le schéma, et
      // elle est comptée comme telle dans SCHEMA-01, pas ici.
      for (const m of code.matchAll(/CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(?:public\.)?([a-z_][a-z0-9_]*)/gi)) {
        creeesAuVol.add(m[1].toLowerCase());
      }
    }
    expect(tables.size).toBeGreaterThan(3); // le balayage a bien trouvé quelque chose

    // DETTE CONNUE, INSCRITE AU REGISTRE. Ces tables sont écrites par du code
    // vivant et créées par AUCUN chemin qui s'exécute sur une base neuve. Elles
    // sont tolérées ici UNIQUEMENT parce qu'elles portent un identifiant de
    // dette : le jour où on les corrige, on retire la ligne. Toute table qui
    // apparaîtrait hors de cette liste fait échouer ce test immédiatement.
    const DETTE_CONNUE: Record<string, string> = {
      // Back-office partenaires — créée seulement par une migration ARCHIVÉE,
      // volontairement hors de la chaîne exécutable (ADR-0002).
      api_keys: 'SCHEMA-05',
      // Configuration Keiwa — lue, insérée, modifiée, supprimée par
      // admin-wallets.service.ts, et créée NULLE PART.
      keiwa_config_items: 'SCHEMA-06',
    };

    const existantes: string[] = (await ds.query(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    )).map((r: { table_name: string }) => r.table_name);

    const manquantes = [...tables]
      .filter((t) => !existantes.includes(t))
      .filter((t) => !creeesAuVol.has(t))
      .filter((t) => !(t in DETTE_CONNUE))
      .sort();
    expect(manquantes).toEqual([]);
  });

  it('l’insertion réelle de la restitution s’exécute', async () => {
    // C'est CET INSERT qui échouait et faisait échouer l'annulation entière.
    await expect(
      ds.query(
        `INSERT INTO stock_mouvements
           (marchand_id, transaction_id, produit_id, produit_nom, stock_avant,
            quantite_demandee, quantite_retranchee, manquant, type)
         VALUES ($1::text, NULL, NULL, $2, 0, 0, -1, 0, 'annulation')
         RETURNING id`,
        ['schema-ledger-test', 'Sonde'],
      ),
    ).resolves.toHaveLength(1);
    await ds.query(`DELETE FROM stock_mouvements WHERE marchand_id = 'schema-ledger-test'`);
  });
});
