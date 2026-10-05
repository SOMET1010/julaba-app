import * as fs from 'fs';
import * as path from 'path';

/**
 * Garde-fou de NON-DÉRIVE : `db-init` et la migration portent la même DDL.
 *
 * `db-init` est la seule DDL garantie en production (`migrationsRun` est OFF) ;
 * la migration existe pour qu'une base neuve reconstruite depuis les migrations
 * soit identique (ADR-0002). Deux copies, donc un risque de divergence — que ce
 * test supprime au lieu de l'espérer. Même discipline que
 * `contraintes-argent-stock.spec.ts`.
 */
const lire = (p: string) => fs.readFileSync(path.join(__dirname, '../../src/database/', p), 'utf8');
const MIGRATION = lire('migrations/1782300000000-RecolteSaisieBrute.ts');
const DB_INIT = lire('db-init.service.ts');

const COLONNES = [
  { nom: 'quantite_saisie', type: 'numeric' },
  { nom: 'unite_saisie', type: 'character varying(50)' },
  { nom: 'facteur_saisie', type: 'numeric' },
];

describe('saisie brute d’une récolte — DDL sans dérive', () => {
  it('les trois colonnes sont dans la migration, avec leur type', () => {
    for (const c of COLONNES) {
      expect(MIGRATION).toContain(`ADD COLUMN IF NOT EXISTS ${c.nom} ${c.type}`);
    }
  });

  it('les trois colonnes sont AUSSI dans db-init, avec le MÊME type', () => {
    for (const c of COLONNES) {
      expect(DB_INIT).toContain(`ALTER TABLE recoltes ADD COLUMN IF NOT EXISTS ${c.nom} ${c.type}`);
    }
  });

  it('la migration ne pose AUCUNE colonne absente de cette liste', () => {
    const posees = [...MIGRATION.matchAll(/ADD COLUMN IF NOT EXISTS ([a-z_]+)/g)].map((m) => m[1]);
    expect([...new Set(posees)].sort()).toEqual(COLONNES.map((c) => c.nom).sort());
  });

  it('ADDITIF : la migration ne touche ni `quantite` ni `unite`', () => {
    // Reinterpréter une colonne deja peuplee serait pire que le defaut qu'on
    // corrige. Garde-fou DIRECTIONNEL.
    expect(MIGRATION).not.toMatch(/ALTER COLUMN|DROP COLUMN (?!IF EXISTS (quantite_saisie|unite_saisie|facteur_saisie))|UPDATE recoltes/i);
    expect(MIGRATION).not.toMatch(/RENAME/i);
  });

  it('réversible : chaque colonne a son DROP', () => {
    for (const c of COLONNES) {
      expect(MIGRATION).toContain(`DROP COLUMN IF EXISTS ${c.nom}`);
    }
  });
});
