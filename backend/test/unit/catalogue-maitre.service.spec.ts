import { CatalogueMaitreService } from '../../src/catalogue-maitre/catalogue-maitre.service';
import { ReferenceMaitre } from '../../src/odoo-gateway/referentiel-mapper';

/**
 * Synchronisation du miroir Odoo → Postgres. Test PUR : le SQL n'est pas
 * exécuté, il est OBSERVÉ. Ce qu'on vérifie ici n'est pas que Postgres sait
 * faire un upsert, c'est que ce service dit la vérité sur ce qu'il a fait et
 * n'écrit jamais ce qu'il ne doit pas écrire.
 *
 * Le premier test est une RÉGRESSION. TypeORM renvoie les lignes d'un
 * `INSERT ... RETURNING` directement, mais celles d'un `UPDATE ... RETURNING`
 * sous la forme `[lignes, nombreAffecté]`. Ce service comptait `.length` sur
 * le second : il annonçait donc « 2 désactivées » en toute circonstance, y
 * compris quand il n'avait rien désactivé. Le défaut a été vu en exécutant la
 * synchronisation pour de vrai, pas en relisant le code.
 */

type Requete = { sql: string; params: unknown[] };

function fauxEnvironnement(options: {
  references: ReferenceMaitre[];
  /** Lignes que l'UPDATE de désactivation prétend avoir touchées. */
  desactivees?: string[];
  /** true → l'upsert répond « créée », false → « mise à jour ». */
  creation?: boolean;
  /** Forme renvoyée par l'UPDATE : le piège TypeORM. */
  formeUpdate?: 'tuple' | 'lignes';
}) {
  const requetes: Requete[] = [];
  const desactivees = (options.desactivees ?? []).map((c) => ({ default_code: c }));

  const query = async (sql: string, params: unknown[] = []) => {
    requetes.push({ sql, params });
    if (/INSERT INTO catalogue_maitre/i.test(sql)) {
      return [{ creee: options.creation ?? true }];
    }
    if (/UPDATE catalogue_maitre/i.test(sql)) {
      return options.formeUpdate === 'lignes' ? desactivees : [desactivees, desactivees.length];
    }
    return [];
  };

  const queryRunner = {
    connect: async () => undefined,
    startTransaction: async () => undefined,
    commitTransaction: async () => { requetes.push({ sql: 'COMMIT', params: [] }); },
    rollbackTransaction: async () => { requetes.push({ sql: 'ROLLBACK', params: [] }); },
    release: async () => undefined,
    manager: { query },
  };

  const dataSource = { createQueryRunner: () => queryRunner, query } as never;
  const gateway = { listerReferentielMaitre: async () => options.references } as never;
  return { service: new CatalogueMaitreService(dataSource, gateway), requetes };
}

const REF = (code: string, nom = 'Igname'): ReferenceMaitre => ({
  defaultCode: code, nom, categorie: 'JULABA / Tubercules', odooProductId: 1, actif: true,
});

describe('CatalogueMaitreService — comptage honnête de la synchronisation', () => {
  it('ne compte pas les désactivations quand il n\'y en a aucune (régression)', async () => {
    // L'UPDATE renvoie `[[], 0]` : deux éléments, zéro ligne. Compter
    // `.length` sur ce tuple annonçait « 2 désactivées ».
    const { service } = fauxEnvironnement({ references: [REF('VIV-1'), REF('VIV-2')], formeUpdate: 'tuple' });
    const r = await service.synchroniser();
    expect(r.desactivees).toBe(0);
    expect(r.lues).toBe(2);
  });

  it('compte les vraies désactivations, quelle que soit la forme renvoyée', async () => {
    for (const forme of ['tuple', 'lignes'] as const) {
      const { service } = fauxEnvironnement({
        references: [REF('VIV-1')], desactivees: ['VIV-DISPARU', 'VIV-AUTRE'], formeUpdate: forme,
      });
      expect((await service.synchroniser()).desactivees).toBe(2);
    }
  });

  it('distingue création et mise à jour — c\'est ce qui prouve l\'idempotence', async () => {
    const premier = await fauxEnvironnement({ references: [REF('VIV-1'), REF('VIV-2')], creation: true }).service.synchroniser();
    expect(premier).toMatchObject({ lues: 2, creees: 2, majs: 0 });

    const second = await fauxEnvironnement({ references: [REF('VIV-1'), REF('VIV-2')], creation: false }).service.synchroniser();
    expect(second).toMatchObject({ lues: 2, creees: 0, majs: 2 });
  });
});

describe('CatalogueMaitreService — ce que le miroir n\'écrit jamais', () => {
  it('n\'écrit ni prix ni stock — la garantie est dans le SQL lui-même', async () => {
    // Le point central de PILOTE-3 : une ligne du référentiel ne peut pas
    // être vendue parce qu'elle ne porte aucun prix. Si un jour quelqu'un
    // ajoute une colonne de prix à cet INSERT, ce test tombe.
    const { service, requetes } = fauxEnvironnement({ references: [REF('VIV-1')] });
    await service.synchroniser();
    const inserts = requetes.filter((r) => /INSERT INTO catalogue_maitre/i.test(r.sql));
    expect(inserts).toHaveLength(1);
    expect(inserts[0].sql).not.toMatch(/prix|price|stock|qty/i);
  });

  it('ne supprime jamais une référence disparue — elle est désactivée', async () => {
    // Une marchande a pu adopter cette référence : son produit porte ce
    // default_code. Supprimer la ligne rendrait son article orphelin sans
    // qu'elle ait rien fait.
    const { service, requetes } = fauxEnvironnement({ references: [REF('VIV-1')], desactivees: ['VIV-PARTI'] });
    await service.synchroniser();
    expect(requetes.some((r) => /DELETE/i.test(r.sql))).toBe(false);
    expect(requetes.some((r) => /UPDATE catalogue_maitre SET actif = false/i.test(r.sql))).toBe(true);
  });

  it('valide la synchronisation par un COMMIT unique', async () => {
    const { service, requetes } = fauxEnvironnement({ references: [REF('VIV-1'), REF('VIV-2')] });
    await service.synchroniser();
    expect(requetes.filter((r) => r.sql === 'COMMIT')).toHaveLength(1);
    expect(requetes.some((r) => r.sql === 'ROLLBACK')).toBe(false);
  });

  it('annule tout si une écriture échoue — jamais de miroir à moitié rafraîchi', async () => {
    const { requetes } = fauxEnvironnement({ references: [REF('VIV-1')] });
    const casse = new CatalogueMaitreService(
      { createQueryRunner: () => ({
        connect: async () => undefined,
        startTransaction: async () => undefined,
        commitTransaction: async () => undefined,
        rollbackTransaction: async () => { requetes.push({ sql: 'ROLLBACK', params: [] }); },
        release: async () => undefined,
        manager: { query: async () => { throw new Error('base indisponible'); } },
      }) } as never,
      { listerReferentielMaitre: async () => [REF('VIV-1')] } as never,
    );
    await expect(casse.synchroniser()).rejects.toThrow('base indisponible');
    expect(requetes.some((r) => r.sql === 'ROLLBACK')).toBe(true);
  });
});

describe('CatalogueMaitreService — recherche', () => {
  it('ne propose que des références actives', async () => {
    const { service, requetes } = fauxEnvironnement({ references: [] });
    await service.rechercher('tomate');
    const select = requetes.find((r) => /SELECT/i.test(r.sql));
    expect(select?.sql).toMatch(/actif = true/);
    expect(select?.params[0]).toBe('%tomate%');
  });

  it('borne le nombre de résultats, même si on demande l\'infini', async () => {
    const { service, requetes } = fauxEnvironnement({ references: [] });
    await service.rechercher('x', 100000);
    expect(requetes[0].params[1]).toBe(200);
    await service.rechercher('x', 0);        // 0 ou absent → défaut
    expect(requetes[1].params[1]).toBe(50);
  });

  it('interroge le miroir, JAMAIS Odoo', async () => {
    // Si la recherche parlait à Odoo, une marchande ne pourrait plus chercher
    // un produit dès qu'Odoo est éteint. C'est la dépendance temps réel que
    // toute l'architecture refuse.
    let odooAppele = false;
    const service = new CatalogueMaitreService(
      { query: async () => [] } as never,
      { listerReferentielMaitre: async () => { odooAppele = true; return []; } } as never,
    );
    await service.rechercher('tomate');
    await service.etat();
    expect(odooAppele).toBe(false);
  });
});
