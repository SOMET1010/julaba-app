import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CaisseRestController } from '../../src/caisse-rest/caisse-rest.controller';

/**
 * Le fond de caisse déclaré par la marchande doit arriver jusqu'à la base.
 *
 * Défaut réparé (argent, module sacré) : `ensureSessionOuverte` ouvre la
 * journée automatiquement à 0 quand elle vend avant d'avoir ouvert sa caisse.
 * Quand elle déclarait ensuite son vrai fond, l'ancien `session/ouvrir` voyait
 * une ligne existante et la renvoyait TELLE QUELLE : les 5 000 F saisis
 * n'étaient jamais écrits. Son téléphone affichait 5 000, la base gardait 0,
 * et la caisse théorique était fausse d'autant.
 *
 * Règle métier (décision Patrick, 15/09/2026) : une journée créée
 * automatiquement à 0 est « fond non encore déclaré » ; la première saisie
 * manuelle remplace ce 0 ; ensuite toute correction passe par « Modifier le
 * fond » et est journalisée.
 *
 * Le SQL n'est pas exécuté ici, il est OBSERVÉ — ce qu'on vérifie, c'est que
 * le contrôleur écrit ce qu'il doit écrire et n'écrit jamais ce qu'il ne doit
 * pas.
 */
describe('CaisseRestController — fond de caisse déclaré', () => {
  const user = { id: 'marchande-1', role: 'marchand' } as any;

  type Requete = { sql: string; params: unknown[] };

  function environnement(ligneExistante: any, formeUpdate: 'tuple' | 'lignes' = 'tuple') {
    const requetes: Requete[] = [];
    const query = jest.fn(async (sql: string, params: unknown[] = []) => {
      requetes.push({ sql, params });
      if (/SELECT \* FROM caisse_sessions/i.test(sql)) return ligneExistante ? [ligneExistante] : [];
      if (/INSERT INTO caisse_fond_journal/i.test(sql)) return [];
      if (/INSERT INTO caisse_sessions/i.test(sql)) {
        return [{ id: 'session-neuve', fond_initial: params[2], ouvert: true }];
      }
      if (/UPDATE caisse_sessions/i.test(sql)) {
        const ligne = { ...ligneExistante, fond_initial: params[0], ouvert: true };
        return formeUpdate === 'lignes' ? [ligne] : [[ligne], 1];
      }
      return [];
    });
    const controller = new CaisseRestController({} as any, { query } as any);
    return { controller, requetes, query };
  }

  const ecritures = (r: Requete[]) => r.filter((q) => /INSERT|UPDATE/i.test(q.sql));
  const journal = (r: Requete[]) => r.filter((q) => /caisse_fond_journal/i.test(q.sql));

  it('crée la journée avec le fond déclaré quand aucune n’existe', async () => {
    const { controller, requetes } = environnement(null);
    const { session } = await controller.ouvrirSession({ fond_initial: 5000 }, user);

    expect(session.fond_initial).toBe(5000);
    const insert = requetes.find((q) => /INSERT INTO caisse_sessions/i.test(q.sql))!;
    expect(insert.sql).toMatch(/fond_declare_at/);
    expect(journal(requetes)[0].params).toEqual(['session-neuve', 'marchande-1', null, 5000, 'declaration']);
  });

  it('RÉGRESSION — le fond saisi remplace le 0 posé par une première vente', async () => {
    const { controller, requetes } = environnement({
      id: 'session-auto', fond_initial: '0', ouvert: true, fond_declare_at: null,
    });
    const { session } = await controller.ouvrirSession({ fond_initial: 5000 }, user);

    // Avant le correctif : la session revenait inchangée, à 0, sans aucune écriture.
    expect(session.fond_initial).toBe(5000);
    const maj = requetes.find((q) => /UPDATE caisse_sessions/i.test(q.sql))!;
    expect(maj.params[0]).toBe(5000);
    expect(maj.sql).toMatch(/fond_declare_at = NOW\(\)/);
    expect(journal(requetes)[0].params).toEqual(['session-auto', 'marchande-1', 0, 5000, 'declaration']);
  });

  it('ne touche JAMAIS un fond déjà déclaré, et le dit', async () => {
    const { controller, requetes } = environnement({
      id: 'session-1', fond_initial: '2000', ouvert: true, fond_declare_at: '2026-09-15T06:00:00Z',
    });
    const reponse = await controller.ouvrirSession({ fond_initial: 9999 }, user);

    expect(reponse.session.fond_initial).toBe('2000');
    expect(reponse.fond_conserve).toBe(true);
    expect(ecritures(requetes)).toHaveLength(0); // aucune écriture, aucun journal
  });

  it('rouvre une journée fermée sans toucher à son fond', async () => {
    const { controller, requetes } = environnement({
      id: 'session-1', fond_initial: '2000', ouvert: false, fond_declare_at: '2026-09-15T06:00:00Z',
    });
    const reponse = await controller.ouvrirSession({ fond_initial: 9999 }, user);

    expect(reponse.fond_conserve).toBe(true);
    const maj = requetes.find((q) => /UPDATE caisse_sessions/i.test(q.sql))!;
    expect(maj.sql).toMatch(/ouvert = true/);
    expect(maj.sql).not.toMatch(/fond_initial/); // son fond du jour est intouchable ici
    expect(journal(requetes)).toHaveLength(0);
  });

  it('« Modifier le fond » écrit le nouveau montant ET le journalise', async () => {
    const { controller, requetes } = environnement({
      id: 'session-1', fond_initial: '2000', ouvert: true, fond_declare_at: '2026-09-15T06:00:00Z',
    });
    const { session } = await controller.corrigerFond({ fond_initial: 3500 }, user);

    expect(session.fond_initial).toBe(3500);
    expect(journal(requetes)[0].params).toEqual(['session-1', 'marchande-1', 2000, 3500, 'correction']);
  });

  it('refuse de corriger une journée qui n’existe pas', async () => {
    const { controller } = environnement(null);
    await expect(controller.corrigerFond({ fond_initial: 3500 }, user)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuse un montant négatif ou illisible', async () => {
    const { controller, requetes } = environnement(null);
    await expect(controller.ouvrirSession({ fond_initial: -1 }, user)).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.corrigerFond({ fond_initial: 'beaucoup' }, user)).rejects.toBeInstanceOf(BadRequestException);
    expect(ecritures(requetes)).toHaveLength(0);
  });

  it('PIÈGE TypeORM — un UPDATE RETURNING renvoie [lignes, n], jamais les lignes', async () => {
    for (const forme of ['tuple', 'lignes'] as const) {
      const { controller } = environnement(
        { id: 'session-auto', fond_initial: '0', ouvert: true, fond_declare_at: null },
        forme,
      );
      const { session } = await controller.ouvrirSession({ fond_initial: 5000 }, user);
      // Sans normalisation, la forme « tuple » renvoyait un TABLEAU comme session :
      // l'écran n'aurait affiché aucun fond.
      expect(Array.isArray(session)).toBe(false);
      expect(session.fond_initial).toBe(5000);
    }
  });
});
