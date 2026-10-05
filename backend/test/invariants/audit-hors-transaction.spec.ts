// L'AUDIT N'APPARTIENT PAS A LA TRANSACTION QUI L'ENTOURE.
//
// `AuditService.log` ecrit via `this.dataSource.query(...)` — la DataSource,
// pas le manager d'une transaction en cours. La ligne part donc sur une AUTRE
// connexion, et aucun ROLLBACK ne la reprend.
//
// POURQUOI CET INVARIANT EST ECRIT NOIR SUR BLANC. En combinant deux lots
// (T6, qui enveloppe la modification d'un produit dans UNE transaction, et TB,
// qui journalise le changement de prix), la journalisation s'est retrouvee
// A L'INTERIEUR de la transaction. Consequence : si le COMMIT echouait, la
// ligne d'audit restait — un audit decrivant un changement de prix qui n'a
// jamais eu lieu. Un journal qui enregistre des non-evenements est pire
// qu'absent sur la question « ce prix a-t-il change ? ».
//
// Ce test fixe la PROPRIETE du mecanisme. C'est elle qui impose, dans
// `caisse-rest.controller.ts`, de journaliser APRES le commit et jamais avant.

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { AuditService } from '../../src/audit/audit.service';

describe('Audit — il n’appartient pas à la transaction englobante', () => {
  let app: INestApplication;
  let ds: DataSource;
  let audit: AuditService;
  const SONDE = 'sonde-audit-hors-transaction';

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    ds = app.get(DataSource);
    audit = app.get(AuditService);
    await app.get(DbInitService, { strict: false }).runInit();
    await ds.query(`DELETE FROM audit_logs WHERE entite_id = $1`, [SONDE]);
  }, 60000);

  afterAll(async () => {
    if (ds?.isInitialized) await ds.query(`DELETE FROM audit_logs WHERE entite_id = $1`, [SONDE]);
    if (app) await app.close();
  });

  const compte = async (): Promise<number> =>
    (await ds.query(`SELECT count(*)::int AS n FROM audit_logs WHERE entite_id = $1`, [SONDE]))[0].n;

  it('une ligne d’audit ecrite dans une transaction ANNULEE survit', async () => {
    expect(await compte()).toBe(0);

    await expect(
      ds.transaction(async (m) => {
        await m.query('SELECT 1');
        await audit.log({ userId: null, action: 'sonde', entite: 'produit', entiteId: SONDE, details: {} });
        throw new Error('annulation volontaire APRES journalisation');
      }),
    ).rejects.toThrow('annulation volontaire');

    // 1, et non 0 : l'audit n'est pas revenu en arriere avec la transaction.
    // C'EST LA RAISON pour laquelle on ne journalise jamais avant le commit.
    expect(await compte()).toBe(1);
  }, 60000);

  // Le corollaire, verifie sur la SOURCE : dans la route qui modifie un
  // produit, la journalisation doit venir APRES la fermeture de la
  // transaction. Une fonction peut etre parfaite et l'appelant mal place.
  it('`updateProduit` journalise APRES le commit, jamais dedans', () => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const { join } = require('node:path') as typeof import('node:path');
    const src = readFileSync(
      join(__dirname, '..', '..', 'src', 'caisse-rest', 'caisse-rest.controller.ts'), 'utf8');

    const finTransaction = src.indexOf('return { brut: result, lignes: lignesRetournees(result) };');
    const journalisation = src.indexOf("action: 'produit.modifie'");
    expect(finTransaction).toBeGreaterThan(-1);   // non-vacuite du reperage
    expect(journalisation).toBeGreaterThan(-1);
    expect(journalisation).toBeGreaterThan(finTransaction);
  });
});
