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

describe('CatalogueMaitreService — adoption', () => {
  function envAdoption(options: {
    reference?: Record<string, unknown> | null;
    existant?: Record<string, unknown> | null;
    /** Simule la course : l'INSERT échoue avec une violation d'unicité
     *  Postgres (23505), comme si une adoption concurrente venait d'écrire
     *  la même (marchand_id, default_code) entre le SELECT et l'INSERT. */
    courseConcurrente?: Record<string, unknown>;
  } = {}) {
    const requetes: Requete[] = [];
    let selectProduitsAppels = 0;
    const query = async (sql: string, params: unknown[] = []) => {
      requetes.push({ sql, params });
      if (/FROM catalogue_maitre WHERE default_code/i.test(sql)) {
        return options.reference === null ? [] : [options.reference ?? { default_code: 'VIV-1', nom: 'Igname Kponan', categorie: 'JULABA / Tubercules' }];
      }
      if (/FROM produits\s+WHERE marchand_id/i.test(sql)) {
        selectProduitsAppels++;
        // 1er appel (avant l'INSERT) : rien encore, c'est la course qu'on simule.
        // 2e appel (après l'échec de l'INSERT) : la ligne que le concurrent a écrite.
        if (selectProduitsAppels >= 2 && options.courseConcurrente) {
          return [options.courseConcurrente];
        }
        return options.existant ? [options.existant] : [];
      }
      if (/INSERT INTO produits/i.test(sql)) {
        if (options.courseConcurrente) {
          const err: any = new Error(
            'duplicate key value violates unique constraint "ux_produits_marchand_default_code"',
          );
          err.code = '23505';
          throw err;
        }
        return [{ id: 'p1', nom: 'Igname Kponan', prix: params[2], stock: params[5], unite: params[6], categorie: params[4], default_code: params[7] }];
      }
      return [];
    };
    const service = new CatalogueMaitreService({ query } as never, {} as never);
    return { service, requetes };
  }

  it('crée un produit marchand portant le lien vers la référence Odoo', async () => {
    const { service } = envAdoption();
    const { produit } = await service.adopter('marchande-1', { default_code: 'VIV-1', prix: 500, unite: 'tas', stock: 12 });
    expect(produit).toMatchObject({ nom: 'Igname Kponan', prix: 500, unite: 'tas', stock: 12, default_code: 'VIV-1' });
  });

  it('reprend le NOM et la CATÉGORIE d\'Odoo, jamais son prix', async () => {
    // Odoo dit ce qu'EST le produit ; la marchande dit à combien elle le vend.
    const { service, requetes } = envAdoption();
    await service.adopter('marchande-1', { default_code: 'VIV-1', prix: 500 });
    const insert = requetes.find((r) => /INSERT INTO produits/i.test(r.sql));
    expect(insert?.params).toContain('Igname Kponan');
    expect(insert?.params).toContain('JULABA / Tubercules');
    expect(insert?.params).toContain(500);
  });

  it('refuse une référence inconnue ou retirée du référentiel', async () => {
    const { service } = envAdoption({ reference: null });
    await expect(service.adopter('marchande-1', { default_code: 'VIV-INCONNUE', prix: 500 }))
      .rejects.toThrow(/inconnue ou retirée/);
  });

  it('refuse une seconde adoption et RENVOIE le produit déjà présent', async () => {
    // Créer silencieusement un doublon donnerait deux articles identiques en
    // caisse, à deux prix possiblement différents : la marchande ne saurait
    // plus lequel est le bon.
    const { service } = envAdoption({ existant: { id: 'deja', nom: 'Igname Kponan', prix: '500' } });
    await expect(service.adopter('marchande-1', { default_code: 'VIV-1', prix: 900 }))
      .rejects.toMatchObject({ response: { produit: { id: 'deja' } } });
  });

  it('n\'insère aucun produit quand l\'adoption est refusée', async () => {
    const { service, requetes } = envAdoption({ existant: { id: 'deja' } });
    await service.adopter('marchande-1', { default_code: 'VIV-1', prix: 900 }).catch(() => undefined);
    expect(requetes.some((r) => /INSERT INTO produits/i.test(r.sql))).toBe(false);
  });

  it('accepte un stock nul — on adopte souvent avant de recevoir la marchandise', async () => {
    const { service } = envAdoption();
    const { produit } = await service.adopter('marchande-1', { default_code: 'VIV-1', prix: 500 });
    expect(produit.stock).toBe(0);
    expect(Number(produit.prix)).toBeGreaterThan(0);
  });

  it('course concurrente : deux adoptions simultanées de la même référence → 409 + produit existant, jamais un 500 brut', async () => {
    // Les deux requêtes passent le SELECT « pas encore adoptée » avant que
    // l'une des deux n'écrive. La 2e INSERT viole donc
    // ux_produits_marchand_default_code — sans le filet, cette erreur SQL
    // brute remonterait telle quelle jusqu'à l'appelante.
    const { service } = envAdoption({
      courseConcurrente: { id: 'gagnant-de-la-course', nom: 'Igname Kponan', prix: '500', default_code: 'VIV-1' },
    });
    await expect(service.adopter('marchande-1', { default_code: 'VIV-1', prix: 500 }))
      .rejects.toMatchObject({ response: { produit: { id: 'gagnant-de-la-course' } } });
  });

  it('propage toute autre erreur SQL de l\'INSERT sans la confondre avec une adoption déjà faite', async () => {
    const service = new CatalogueMaitreService(
      {
        query: async (sql: string) => {
          if (/FROM catalogue_maitre WHERE default_code/i.test(sql)) {
            return [{ default_code: 'VIV-1', nom: 'Igname Kponan', categorie: 'JULABA / Tubercules' }];
          }
          if (/FROM produits\s+WHERE marchand_id/i.test(sql)) return [];
          if (/INSERT INTO produits/i.test(sql)) throw new Error('connexion perdue');
          return [];
        },
      } as never,
      {} as never,
    );
    await expect(service.adopter('marchande-1', { default_code: 'VIV-1', prix: 500 }))
      .rejects.toThrow('connexion perdue');
  });
});
