// Invariant — les règles d'argent et de stock sont tenues par la BASE.
//
// Avant ce lot, la base entière ne portait que deux `CHECK`, toutes deux sur
// `evaluations.note`. Chaque règle d'argent vivait dans le code : une écriture
// directe, un script d'exploitation ou une future route les contournaient en
// silence. Ici on vérifie ce qui compte vraiment — non pas que la contrainte
// EXISTE, mais qu'elle REFUSE.
//
// Et symétriquement, qu'elle n'interdit PAS ce que le métier exige : une
// `quantite_retranchee` négative, qui est la façon même dont une annulation ou
// un ajout de stock s'écrit au ledger.

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import {
  CONTRAINTES_ARGENT_STOCK,
  SQL_LIGNES_NON_CONFORMES,
} from '../../src/database/contraintes-argent-stock';

describe('Invariant — argent et stock contraints par la base', () => {
  let app: INestApplication;
  let ds: DataSource;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    ds = app.get(DataSource);
    await app.get(DbInitService, { strict: false }).runInit();
  }, 60000);

  afterAll(async () => {
    if (app) await app.close();
  });

  const MARCHAND = 'contrainte-marchand-1';
  const insererMouvement = (champs: Partial<Record<string, number>>) =>
    ds.query(
      `INSERT INTO stock_mouvements
         (marchand_id, produit_nom, stock_avant, quantite_demandee, quantite_retranchee, manquant, type)
       VALUES ($1::text, 'Test-CK', $2, $3, $4, $5, 'vente')`,
      [MARCHAND, champs.stock_avant ?? 10, champs.quantite_demandee ?? 1,
       champs.quantite_retranchee ?? 1, champs.manquant ?? 0],
    );

  it('les quatre contraintes existent, et toutes en NOT VALID', async () => {
    const rows = await ds.query(
      `SELECT conname, convalidated FROM pg_constraint
        WHERE conname = ANY($1::text[]) AND contype = 'c'`,
      [CONTRAINTES_ARGENT_STOCK.map((c) => c.nom)],
    );
    expect(rows).toHaveLength(CONTRAINTES_ARGENT_STOCK.length);
    // `convalidated = false` : l'historique n'a pas ete inspecte au demarrage.
    for (const r of rows) expect(r.convalidated).toBe(false);
  }, 60000);

  it('REFUSE une quantité demandée négative', async () => {
    await expect(insererMouvement({ quantite_demandee: -1, quantite_retranchee: -1 }))
      .rejects.toThrow(/ck_stock_mouvements_demandee_non_negative/);
  }, 60000);

  it('REFUSE un manquant négatif', async () => {
    await expect(insererMouvement({ manquant: -3 }))
      .rejects.toThrow(/ck_stock_mouvements_manquant_non_negatif/);
  }, 60000);

  it('REFUSE de retrancher plus que demandé', async () => {
    await expect(insererMouvement({ quantite_demandee: 2, quantite_retranchee: 5 }))
      .rejects.toThrow(/ck_stock_mouvements_retranchee_bornee/);
  }, 60000);

  it('REFUSE un montant négatif en caisse', async () => {
    await expect(
      ds.query(
        `INSERT INTO caisse_transactions (type, montant, user_id, marchand_id, statut)
         VALUES ('vente', -500, $1, $1, 'validee')`, [MARCHAND],
      ),
    ).rejects.toThrow(/ck_caisse_transactions_montant_non_negatif/);
  }, 60000);

  it('AUTORISE une quantité retranchée négative — sinon plus aucune annulation', async () => {
    // Le cas le plus important du lot : une contrainte trop zelee ici
    // casserait `restituerStock` et tout ajustement a la hausse.
    await expect(insererMouvement({ quantite_demandee: 4, quantite_retranchee: -4 })).resolves.toBeDefined();
    await expect(
      ds.query(
        `INSERT INTO caisse_transactions (type, montant, user_id, marchand_id, statut)
         VALUES ('ajustement', NULL, $1, $1, 'validee')`, [MARCHAND],
      ),
    ).resolves.toBeDefined();   // montant NULL reste tolere
  }, 60000);

  it('le relevé de l’historique tourne et ne trouve rien sur une base neuve', async () => {
    const releve = await ds.query(SQL_LIGNES_NON_CONFORMES);
    expect(releve).toHaveLength(CONTRAINTES_ARGENT_STOCK.length);
    for (const r of releve) expect(Number(r.lignes)).toBe(0);
  }, 60000);
});
