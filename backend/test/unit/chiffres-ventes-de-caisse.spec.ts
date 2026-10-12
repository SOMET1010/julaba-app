import { readFileSync } from 'fs';
import { join } from 'path';
import { InstitutionDashboardController } from '../../src/institutions/institution-dashboard.controller';
import { AdminService } from '../../src/admin/admin.service';
import { montantLisible } from '../../src/commun/vente-de-caisse';

/**
 * LES CHIFFRES DES TABLEAUX DE BORD — défauts relevés sur la stack de démo.
 *
 * 1. Une erreur de lecture rendait des ZÉROS (`catch { return { …: 0 } }`) :
 *    « aucune vente » et « je n'ai pas pu lire » devenaient la même réponse.
 *    C'est ACC-03 côté institution. Une erreur doit sortir en 5xx.
 * 2. `Number(t.montant || 0)` déguisait un montant illisible en zéro.
 *
 * La définition de ce qui est compté (ventes de caisse, pas le portefeuille
 * Keiwa hors pilote) est prouvée en base, dans
 * test/invariants/chiffres-ventes-de-caisse.spec.ts.
 */
describe('montantLisible — un montant illisible n’est pas zéro', () => {
  it.each([[null], [undefined], [''], ['  '], ['abc'], [NaN], [Infinity]])(
    '%p est illisible (null), jamais 0',
    (brut) => {
      expect(montantLisible(brut)).toBeNull();
    },
  );

  it.each([[0, 0], ['0', 0], ['40000.00', 40000], [1500, 1500]])(
    '%p se lit %p',
    (brut, attendu) => {
      expect(montantLisible(brut)).toBe(attendu);
    },
  );
});

describe('InstitutionDashboardController — une erreur sort en erreur, jamais en zéros', () => {
  const panne = new Error('connexion perdue');
  const institution: any = { id: 'i-1', role: 'institution' };
  const scope: any = { zoneId: 'zone-1' };

  function controleur() {
    const usersRepo: any = { find: jest.fn(async () => { throw panne; }) };
    const ventesRepo: any = { createQueryBuilder: jest.fn(() => { throw panne; }) };
    return new InstitutionDashboardController(usersRepo, ventesRepo);
  }

  it('GET /institution/dashboard : rejette au lieu de rendre des KPI à zéro', async () => {
    await expect(controleur().getDashboard(institution, scope)).rejects.toThrow();
  });

  it('GET /institution/acteurs : rejette au lieu de rendre une liste vide', async () => {
    await expect(controleur().getActeurs(institution, scope)).rejects.toThrow();
  });

  it('GET /institution/transactions : rejette au lieu de rendre une liste vide', async () => {
    await expect(controleur().getTransactions(institution, scope)).rejects.toThrow();
  });
});

describe('AdminService.getStats — une erreur sort en erreur, jamais en zéros', () => {
  it('rejette au lieu de rendre montant_total: 0', async () => {
    const panne = async () => { throw new Error('connexion perdue'); };
    const qb: any = new Proxy({}, { get: (_t, p) => (p === 'then' ? undefined : () => qb) });
    qb.getCount = panne; qb.getRawOne = panne; qb.getRawMany = panne;
    const repo: any = { count: panne, createQueryBuilder: () => qb, query: panne };
    const dataSource: any = { query: panne, getRepository: () => repo };
    const service = new AdminService(repo, repo, repo, dataSource);
    await expect(service.getStats()).rejects.toThrow();
  });
});

describe('Seed de démo — la coopérative est vivrière', () => {
  const source = readFileSync(join(__dirname, '../../src/database/seed-demo.service.ts'), 'utf8');

  it('ne présente plus une coopérative de cacao', () => {
    expect(source).not.toMatch(/COOP-CACAO/);
  });

  it('nomme la coopérative « Coopérative vivrière de Daloa »', () => {
    expect(source).toContain("'Coopérative vivrière de Daloa'");
  });
});
