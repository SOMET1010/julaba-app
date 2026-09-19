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
