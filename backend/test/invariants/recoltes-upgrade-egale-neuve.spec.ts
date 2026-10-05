// GATE PERMANENT — mettre à niveau une base existante doit donner EXACTEMENT
// la table qu'une base neuve obtient.
//
// POURQUOI CE GATE EXISTE. En production, sur une base EXISTANTE,
// `computeBootDbFlags` renvoie `synchronize: 'false'` et `DB_MIGRATIONS_RUN`
// vaut explicitement "false" (render.yaml:154) : `db-init` est le SEUL
// mécanisme qui fait évoluer une table déjà créée. Sur une base NEUVE, c'est
// `synchronize` qui bâtit depuis les entités. Deux mécanismes, un seul
// résultat attendu — et rien ne le vérifiait.
//
// La revue contradictoire du lot « saisie brute » a montré que ce n'était pas
// théorique : `db-init` écrivait `numeric` nu là où l'entité déclare
// numeric(12,3). Les deux chemins divergeaient, et AUCUN gate ne le voyait —
// `verify:dbinit-subsumed` compare migration ↔ db-init (tous deux nus), et
// l'empreinte du pilote ne retient que les NOMS de colonnes.
//
// Ce test porte sur la table `recoltes` ENTIÈRE : colonnes, types, précision,
// échelle, longueur, nullabilité, défauts, contraintes et index. Pas seulement
// sur les colonnes du dernier lot.

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { DbInitService } from '../../src/database/db-init.service';
import { NOM_CONTRAINTE_SAISIE_BRUTE } from '../../src/database/contrainte-saisie-recolte';

/** La définition complète de `recoltes`, sous une forme comparable. */
const DEFINITION = `
  SELECT 'col:' || column_name || '|' || data_type
         || '|p=' || coalesce(numeric_precision::text, '-')
         || '|s=' || coalesce(numeric_scale::text, '-')
         || '|len=' || coalesce(character_maximum_length::text, '-')
         || '|null=' || is_nullable
         || '|def=' || coalesce(column_default, '-') AS d
    FROM information_schema.columns WHERE table_name = 'recoltes'
  UNION ALL
  SELECT 'con:' || conname || '|' || contype::text || '|' || pg_get_constraintdef(oid)
    FROM pg_constraint WHERE conrelid = 'recoltes'::regclass
  UNION ALL
  SELECT 'idx:' || indexname || '|' || indexdef
    FROM pg_indexes WHERE tablename = 'recoltes'
  ORDER BY 1`;

// Ce que le lot « saisie brute » ajoute, et que l'on retire pour simuler
// l'état d'une base antérieure.
const COLONNES_DU_LOT = ['quantite_saisie', 'unite_saisie', 'facteur_saisie'];

describe('Schéma — mettre à niveau une base existante == en créer une neuve', () => {
  let app: INestApplication;
  let ds: DataSource;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    await app.init();
    ds = app.get(DataSource);
    await app.get(DbInitService, { strict: false }).runInit();
  }, 60000);

  afterAll(async () => { if (app) await app.close(); });

  // L'ÉTAT DE VALIDATION N'EST PAS UNE DIVERGENCE, C'EST LA RÈGLE.
  // Sur une base NEUVE, `synchronize` crée la contrainte VALIDÉE : il n'y a
  // aucune ligne à épargner. Sur une base EXISTANTE, `db-init` la pose
  // `NOT VALID` : l'historique ne doit pas être jugé. Le PRÉDICAT, lui, doit
  // être le même — c'est lui qu'on compare. (Mesuré : ce test a trouvé cette
  // différence à sa première exécution.)
  const sansEtatDeValidation = (d: string) => d.replace(/ NOT VALID$/, '');

  const definition = async (): Promise<string[]> =>
    (await ds.query(DEFINITION)).map((r: { d: string }) => sansEtatDeValidation(r.d));

  const etatValidation = async (): Promise<boolean> =>
    (await ds.query(
      `SELECT convalidated FROM pg_constraint
        WHERE conrelid = 'recoltes'::regclass AND conname = $1`,
      [NOM_CONTRAINTE_SAISIE_BRUTE],
    ))[0]?.convalidated;

  it('le balayage voit bien une table peuplée (non-vacuité)', async () => {
    const d = await definition();
    expect(d.filter((x) => x.startsWith('col:')).length).toBeGreaterThanOrEqual(20);
    expect(d.some((x) => x.includes(NOM_CONTRAINTE_SAISIE_BRUTE))).toBe(true);
  });

  it('la table ENTIÈRE est identique après une mise à niveau par db-init seul', async () => {
    const neuve = await definition();

    // On ramène `recoltes` à son état d'avant le lot : les colonnes et la
    // contrainte disparaissent, comme sur une base de production qui n'a pas
    // encore reçu ce déploiement.
    await ds.query(`ALTER TABLE recoltes DROP CONSTRAINT IF EXISTS ${NOM_CONTRAINTE_SAISIE_BRUTE}`);
    for (const c of COLONNES_DU_LOT) {
      await ds.query(`ALTER TABLE recoltes DROP COLUMN IF EXISTS ${c}`);
    }
    const avant = await definition();
    // Prémisse : on a bien retiré quelque chose, sinon le test ne prouve rien.
    expect(avant.length).toBeLessThan(neuve.length);

    // LE CHEMIN DE PRODUCTION, ET RIEN D'AUTRE.
    await app.get(DbInitService, { strict: false }).runInit();
    const misEAJour = await definition();

    const perdues = neuve.filter((x) => !misEAJour.includes(x));
    const enTrop = misEAJour.filter((x) => !neuve.includes(x));
    expect({ perdues, enTrop }).toEqual({ perdues: [], enTrop: [] });
    expect(misEAJour.length).toBe(neuve.length);

    // Et la seule chose qui diffère légitimement : après une mise à niveau, la
    // contrainte est NOT VALID — l'historique de production n'est pas scanné,
    // donc aucune ligne antérieure ne peut être rejetée.
    expect(await etatValidation()).toBe(false);
  }, 90000);

  it('une seconde mise à niveau ne change plus rien (idempotence)', async () => {
    const avant = await definition();
    await app.get(DbInitService, { strict: false }).runInit();
    expect(await definition()).toEqual(avant);
  }, 90000);
});
