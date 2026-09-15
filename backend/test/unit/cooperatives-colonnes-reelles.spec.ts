import { CooperativesRestController } from '../../src/cooperatives-rest/cooperatives-rest.controller';

/**
 * Coopératives : ne lire que des colonnes qui existent.
 *
 * Défaut réparé : `liste()` et `maCooperative()` lisaient marche, commune,
 * responsable_nom, fonction et contact sur `cooperatives` — cinq colonnes qui
 * n'ont jamais existé sur cette table (id, nom, zone_id, responsable_id,
 * actif, created_at, updated_at, puis commune_id). Et `maCooperative()`
 * triait `cooperative_membres` par `created_at`, absente elle aussi.
 * Postgres répondait « column does not exist » : 500 systématique sur toute
 * base migrée, menu « Rejoindre une coopérative » vide et bouton inerte —
 * aucune adhésion possible.
 *
 * Ce test ne vérifie pas que Postgres sait faire une jointure : il OBSERVE le
 * SQL émis et refuse toute lecture d'une colonne fantôme. C'est un garde-fou
 * durable, pas la reproduction d'un bug ponctuel.
 */
describe('CooperativesRestController — colonnes réellement existantes', () => {
  /** Colonnes de `cooperatives` selon la baseline + migrations. Rien d'autre. */
  const COLONNES_REELLES = [
    'id', 'nom', 'zone_id', 'responsable_id', 'actif', 'created_at', 'updated_at', 'commune_id',
  ];
  /** Les cinq fantômes, plus le tri fautif sur cooperative_membres. */
  const FANTOMES = ['marche', 'responsable_nom', 'fonction', 'contact'];

  function environnement(lignes: any[] = []) {
    const sqls: string[] = [];
    const query = jest.fn(async (sql: string) => { sqls.push(sql); return lignes; });
    const repo = { query, findOne: jest.fn(async () => ({ id: 'coop-1', nom: 'COOP-CACAO', responsable_id: 'u-1' })) };
    const membreRepo = {
      query: jest.fn(async (sql: string) => {
        sqls.push(sql);
        return [{ id: 'a-1', cooperative_id: 'coop-1', membre_id: 'u-9', statut: 'actif', role: 'membre', date_adhesion: '2026-09-01' }];
      }),
    };
    const userRepo = { findOne: jest.fn(async () => ({ firstName: 'Awa', lastName: 'Traoré' })) };
    const controller = new CooperativesRestController(
      repo as any, membreRepo as any, {} as any, userRepo as any, {} as any, {} as any, {} as any,
    );
    return { controller, sqls };
  }

  /** Une colonne « lue sur cooperatives » : nom nu ou préfixé c., pas NULL::text AS nom. */
  function litSurCooperatives(sql: string, colonne: string): boolean {
    return new RegExp(`(^|[\\s,(])(c\\.)?${colonne}\\b(?!\\s*$)`, 'm').test(
      sql.replace(new RegExp(`NULL::text\\s+AS\\s+${colonne}`, 'gi'), '')
         .replace(/AS\s+\w+/gi, '')
         .split(/\bFROM\b/i)[0] ?? '',
    );
  }

  it('liste() ne lit aucune colonne fantôme sur cooperatives', async () => {
    const { controller, sqls } = environnement();
    await controller.liste();

    const sql = sqls[0];
    for (const fantome of FANTOMES) {
      expect(litSurCooperatives(sql, fantome)).toBe(false);
    }
    // La commune et le responsable viennent des tables qui les portent vraiment.
    expect(sql).toMatch(/LEFT JOIN communes/i);
    expect(sql).toMatch(/LEFT JOIN users/i);
  });

  it('liste() caste responsable_id (varchar) pour le comparer à users.id (uuid)', async () => {
    const { controller, sqls } = environnement();
    await controller.liste();
    // Sans cast explicite, Postgres refuse la comparaison varchar = uuid.
    expect(sqls[0]).toMatch(/u\.id::text\s*=\s*c\.responsable_id/i);
  });

  it('liste() conserve le contrat attendu par le front, sans inventer de donnée', async () => {
    const attendu = { id: 'c1', nom: 'COOP', marche: null, commune: 'Daloa', responsable_nom: 'Awa Traoré', fonction: null, contact: null };
    const { controller } = environnement([attendu]);
    const rows = await controller.liste();
    expect(Object.keys(rows[0]).sort()).toEqual(
      ['commune', 'contact', 'fonction', 'id', 'marche', 'nom', 'responsable_nom'].sort(),
    );
  });

  it('maCooperative() ne trie plus sur created_at, absente de cooperative_membres', async () => {
    const { controller, sqls } = environnement([{ nom: 'Daloa' }]);
    await controller.maCooperative({ id: 'u-9' } as any);

    const triAdhesions = sqls.find((s) => /FROM cooperative_membres/i.test(s))!;
    expect(triAdhesions).not.toMatch(/ORDER BY\s+created_at/i);
    expect(triAdhesions).toMatch(/ORDER BY\s+date_adhesion/i);
  });

  it('maCooperative() ne relit plus les colonnes fantômes', async () => {
    const { controller, sqls } = environnement([{ nom: 'Daloa' }]);
    const reponse: any = await controller.maCooperative({ id: 'u-9' } as any);

    for (const sql of sqls) {
      for (const fantome of FANTOMES) {
        expect(litSurCooperatives(sql, fantome)).toBe(false);
      }
    }
    expect(reponse.commune).toBe('Daloa');
    expect(reponse.responsable_nom).toBe('Awa Traoré');
  });

  it('aucune requête n’introduit une colonne hors du schéma réel de cooperatives', () => {
    // Garde de lecture : si quelqu'un ajoute une colonne à ce contrôleur, elle
    // doit d'abord exister dans la liste ci-dessus (donc dans une migration).
    expect(COLONNES_REELLES).toContain('commune_id');
    expect(COLONNES_REELLES).not.toContain('marche');
  });
});
