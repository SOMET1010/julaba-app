import * as fs from 'fs';
import * as path from 'path';
import {
  CONTRAINTES_ARGENT_STOCK,
  SQL_LIGNES_NON_CONFORMES,
  sqlAjoutIdempotent,
} from '../../src/database/contraintes-argent-stock';

/**
 * Garde-fou de NON-DÉRIVE entre les deux endroits qui portent la même DDL.
 *
 * `db-init` est la seule DDL garantie en production (`migrationsRun` est OFF) ;
 * la migration 1782200000000 porte le même SQL, figé, pour qu'une base neuve
 * reconstruite depuis les migrations soit identique (ADR-0002). Deux copies,
 * donc un risque de divergence — que ce test supprime au lieu de l'espérer.
 */
const MIGRATION = fs.readFileSync(
  path.join(__dirname, '../../src/database/migrations/1782200000000-ContraintesArgentStock.ts'),
  'utf8',
);

describe('contraintes argent/stock — la liste et la migration ne peuvent pas diverger', () => {
  it('chaque contrainte de la liste est présente dans la migration, nom ET expression', () => {
    for (const c of CONTRAINTES_ARGENT_STOCK) {
      expect(MIGRATION).toContain(c.nom);
      expect(MIGRATION).toContain(`CHECK (${c.check})`);
      expect(MIGRATION).toContain(`ALTER TABLE ${c.table}`);
    }
  });

  it('la migration ne contient AUCUNE contrainte absente de la liste', () => {
    const dansMigration = [...MIGRATION.matchAll(/ADD CONSTRAINT (ck_[a-z0-9_]+)/g)].map((m) => m[1]);
    expect([...new Set(dansMigration)].sort()).toEqual(CONTRAINTES_ARGENT_STOCK.map((c) => c.nom).sort());
  });

  it('toutes sont posées NOT VALID — l’historique n’est jamais inspecté au démarrage', () => {
    // Valider d'anciennes lignes ferait echouer le boot en prod sur une donnee
    // qu'on n'a pas encore regardee. C'est le point le plus important du lot.
    const ajouts = [...MIGRATION.matchAll(/ADD CONSTRAINT ck_[a-z0-9_]+ CHECK \([^)]*\)[^;]*/g)].map((m) => m[0]);
    expect(ajouts).toHaveLength(CONTRAINTES_ARGENT_STOCK.length);
    for (const a of ajouts) expect(a).toContain('NOT VALID');
    for (const c of CONTRAINTES_ARGENT_STOCK) expect(sqlAjoutIdempotent(c)).toContain('NOT VALID');
  });

  it('l’ajout est idempotent : il teste pg_constraint avant d’ALTER', () => {
    for (const c of CONTRAINTES_ARGENT_STOCK) {
      const sql = sqlAjoutIdempotent(c);
      expect(sql).toContain(`FROM pg_constraint WHERE conname = '${c.nom}'`);
      expect(sql).toContain('IF NOT EXISTS');
    }
  });

  it('la migration est reversible', () => {
    for (const c of CONTRAINTES_ARGENT_STOCK) {
      expect(MIGRATION).toContain(`DROP CONSTRAINT IF EXISTS ${c.nom}`);
    }
  });

  it('chaque contrainte explique POURQUOI elle ne casse rien', () => {
    // Une contrainte sans justification est une convention deguisee : si on ne
    // sait pas dire pourquoi le code la respecte deja, elle cree un 500.
    for (const c of CONTRAINTES_ARGENT_STOCK) {
      expect(c.pourquoi.length).toBeGreaterThan(40);
    }
  });

  it('le relevé de l’historique est en LECTURE SEULE', () => {
    expect(SQL_LIGNES_NON_CONFORMES).not.toMatch(/\b(update|insert|delete|truncate|drop|alter)\b/i);
    for (const c of CONTRAINTES_ARGENT_STOCK) {
      expect(SQL_LIGNES_NON_CONFORMES).toContain(c.nom);
      expect(SQL_LIGNES_NON_CONFORMES).toContain(`NOT (${c.check})`);
    }
  });

  it('`quantite_retranchee` reste libre d’être négative — une annulation en dépend', () => {
    // Garde-fou DIRECTIONNEL : si quelqu'un ajoutait un jour
    // `quantite_retranchee >= 0`, toute annulation et tout ajout de stock
    // deviendraient impossibles. Le ledger s'ecrit en NET, pas en absolu.
    const checks = CONTRAINTES_ARGENT_STOCK.map((c) => c.check).join(' | ');
    expect(checks).not.toMatch(/quantite_retranchee\s*>=\s*0/);
  });
});
