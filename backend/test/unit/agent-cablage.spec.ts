import { UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AgentGuard, ENTETE_APPAREIL, ENTETE_MARCHAND, PorteeRequise } from '../../src/agent/agent.guard';
import { AgentCaisseController } from '../../src/agent/agent-caisse.controller';
import { JwtAgentStrategy } from '../../src/agent/jwt-agent.strategy';
import { JwtStrategy } from '../../src/auth/strategies/jwt.strategy';
import type { PrincipalAgent } from '../../src/agent/jwt-agent.strategy';

/**
 * AGENT — LE CÂBLAGE. Ce que les règles pures ne peuvent pas prouver : que
 * les décisions sont réellement BRANCHÉES, et qu'aucun chemin ne les
 * contourne.
 */
const config = (secret = 's') => ({ get: () => secret }) as any;

const principal = (p: Partial<PrincipalAgent> = {}): PrincipalAgent => ({
  id: 'ag-1', portees: ['ventes:ecrire'], actif: true,
  plafonds: { parOperation: 20_000, parJour: 100_000 }, estAgent: true, ...p,
});

const contexte = (req: any) => ({
  switchToHttp: () => ({ getRequest: () => req }),
  getHandler: () => () => {}, getClass: () => class {},
}) as any;

describe('AGENT-A1 — un jeton d’agent n’ouvre pas de session utilisateur', () => {
  it('LE CROISEMENT EST FERMÉ : JwtStrategy REFUSE typ=agent, même avec un sub de marchande', async () => {
    // Sans ce refus, un jeton d'agent forgé avec le `sub` d'une marchande
    // ouvrirait son compte ENTIER — bien au-delà des quatre gestes d'un agent.
    const depot = { findOne: jest.fn() } as any;
    const strategie = new JwtStrategy(config(), depot);
    await expect(
      strategie.validate({ url: '/caisse/vente' } as any, { typ: 'agent', agentId: 'ag-1', sub: 'm-1' }),
    ).rejects.toThrow(UnauthorizedException);
    // Et surtout : la base n'est même pas interrogée.
    expect(depot.findOne).not.toHaveBeenCalled();
  });

  it('un utilisateur normal passe toujours — le chemin humain est intact', async () => {
    const user = { id: 'm-1', status: 'actif' };
    const strategie = new JwtStrategy(config(), { findOne: async () => user } as any);
    await expect(strategie.validate({ url: '/caisse/vente' } as any, { sub: 'm-1' })).resolves.toBe(user);
  });
});

describe('AGENT-A1 — la stratégie d’agent', () => {
  const agents = (compte: any) => ({ compte: async () => compte }) as any;

  it('refuse un jeton qui n’est pas marqué agent', async () => {
    const s = new JwtAgentStrategy(config(), agents(null));
    await expect(s.validate({ sub: 'm-1' })).rejects.toThrow(UnauthorizedException);
  });

  it('refuse un agent inconnu, et un agent révoqué', async () => {
    const jeton = { typ: 'agent', agentId: 'ag-1', portees: ['ventes:ecrire'] };
    await expect(new JwtAgentStrategy(config(), agents(null)).validate(jeton))
      .rejects.toThrow(/inconnu/i);
    await expect(
      new JwtAgentStrategy(config(), agents({ id: 'ag-1', portees: ['ventes:ecrire'], actif: false, plafonds: {} }))
        .validate(jeton),
    ).rejects.toThrow(/révoqué/i);
  });

  it('LA PORTÉE EFFECTIVE EST L’INTERSECTION — une révocation est immédiate', async () => {
    // Le compte n'a plus que `lecture`. Un jeton ancien qui réclame
    // `ventes:ecrire` ne doit pas le garder jusqu'à son expiration.
    const s = new JwtAgentStrategy(config(), agents({
      id: 'ag-1', portees: ['lecture'], actif: true, plafonds: { parOperation: null, parJour: null },
    }));
    const r = await s.validate({ typ: 'agent', agentId: 'ag-1', portees: ['ventes:ecrire', 'lecture'] });
    expect(r.portees).toEqual(['lecture']);
  });

  it('un jeton ne peut pas s’ajouter une portée que le compte n’a pas', async () => {
    const s = new JwtAgentStrategy(config(), agents({
      id: 'ag-1', portees: ['lecture'], actif: true, plafonds: { parOperation: null, parJour: null },
    }));
    const r = await s.validate({ typ: 'agent', agentId: 'ag-1', portees: ['admin', 'stock:ecrire'] });
    expect(r.portees).toEqual([]);
  });
});

describe('AGENT-A2 — la garde', () => {
  const reflector = (portee?: string) => ({ getAllAndOverride: () => portee }) as any;
  const agents = (autorise: boolean) => ({ delegationValide: async () => autorise }) as any;
  const requete = (entetes: Record<string, string> = {}) => ({
    user: principal(),
    headers: { [ENTETE_MARCHAND]: 'm-1', [ENTETE_APPAREIL]: 'wa-1', ...entetes },
  });

  it('laisse passer un agent délégué, avec la bonne portée', async () => {
    const g = new AgentGuard(reflector('ventes:ecrire'), agents(true));
    const req = requete();
    await expect(g.canActivate(contexte(req))).resolves.toBe(true);
    expect(req).toMatchObject({ marchandDelegue: 'm-1', appareilDelegue: 'wa-1' });
  });

  it('UNE ROUTE NON QUALIFIÉE EST REFUSÉE — un oubli de câblage n’ouvre rien', async () => {
    const g = new AgentGuard(reflector(undefined), agents(true));
    await expect(g.canActivate(contexte(requete()))).rejects.toThrow(/non qualifiée/i);
  });

  it('refuse une portée insuffisante AVANT de lire la base', async () => {
    // On refuse au plus tôt : un agent sans droit d'écrire n'a aucune raison
    // qu'on aille chercher pour qui il prétend agir.
    const lectures: string[] = [];
    const g = new AgentGuard(reflector('stock:ecrire'), {
      delegationValide: async () => { lectures.push('lu'); return true; },
    } as any);
    await expect(g.canActivate(contexte(requete()))).rejects.toThrow(ForbiddenException);
    expect(lectures).toHaveLength(0);
  });

  it('refuse sans délégation active', async () => {
    const g = new AgentGuard(reflector('ventes:ecrire'), agents(false));
    await expect(g.canActivate(contexte(requete()))).rejects.toThrow(/délégation/i);
  });

  it('refuse si la marchande ou l’appareil n’est pas désigné', async () => {
    const g = new AgentGuard(reflector('ventes:ecrire'), agents(true));
    for (const manque of [{ [ENTETE_MARCHAND]: '' }, { [ENTETE_APPAREIL]: '' }]) {
      await expect(g.canActivate(contexte(requete(manque)))).rejects.toThrow(/non désigné/i);
    }
  });

  it('refuse un jeton qui n’est pas celui d’un agent', async () => {
    const g = new AgentGuard(reflector('ventes:ecrire'), agents(true));
    await expect(g.canActivate(contexte({ user: { id: 'm-1' }, headers: {} })))
      .rejects.toThrow(UnauthorizedException);
  });
});

describe('AGENT-A4 — ce que le serveur impose', () => {
  const caisse = (recu: any[]) => ({
    enregistrerVente: async (body: any, user: any) => { recu.push({ body, user }); return { transaction: {} }; },
    enregistrerDepense: async (body: any, user: any) => { recu.push({ body, user }); return { transaction: {} }; },
  }) as any;
  const agents = (cumul = 0) => ({ cumulDuJour: async () => cumul }) as any;
  const req = (body: any = {}) => ({ user: principal(), marchandDelegue: 'm-1', body });

  it('`source` EST IMPOSÉ À whatsapp, même si le corps dit autre chose', async () => {
    const recu: any[] = [];
    const c = new AgentCaisseController(caisse(recu), agents(), {} as any);
    await c.vente({ montant: 2000, idempotency_key: 'k', source: 'kassa' }, req());
    expect(recu[0].body.source).toBe('whatsapp');
  });

  it('LA MARCHANDE EST CELLE DE LA GARDE, jamais celle que le corps désigne', async () => {
    const recu: any[] = [];
    const c = new AgentCaisseController(caisse(recu), agents(), {} as any);
    await c.vente(
      { montant: 2000, idempotency_key: 'k', user_id: 'm-999', marchand_id: 'm-999' },
      req(),
    );
    expect(recu[0].user.id).toBe('m-1');
  });

  it('refuse une écriture sans idempotency_key — un rejeu serait indiscernable', async () => {
    const c = new AgentCaisseController(caisse([]), agents(), {} as any);
    await expect(c.vente({ montant: 2000 }, req())).rejects.toThrow(BadRequestException);
    await expect(c.depense({ montant: 500 }, req())).rejects.toThrow(BadRequestException);
  });

  it('PLAFOND NON DÉFINI : rien n’est écrit, et le refus le dit', async () => {
    const recu: any[] = [];
    const c = new AgentCaisseController(caisse(recu), agents(), {} as any);
    const sansPlafond = { ...req(), user: principal({ plafonds: { parOperation: null, parJour: null } }) };
    await expect(c.vente({ montant: 100, idempotency_key: 'k' }, sansPlafond))
      .rejects.toThrow(/non défini/i);
    expect(recu).toHaveLength(0);
  });

  it('refuse au-dessus du plafond, et au-dessus du cumul du jour', async () => {
    const recu: any[] = [];
    const c = new AgentCaisseController(caisse(recu), agents(0), {} as any);
    await expect(c.vente({ montant: 20_001, idempotency_key: 'k' }, req()))
      .rejects.toThrow(/par opération/i);

    const cPlein = new AgentCaisseController(caisse(recu), agents(99_000), {} as any);
    await expect(cPlein.vente({ montant: 5_000, idempotency_key: 'k' }, req()))
      .rejects.toThrow(/journalier/i);
    expect(recu).toHaveLength(0);
  });

  it('LA LECTURE MARCHE SANS PLAFOND — c’est l’étape (b), et elle n’écrit rien', async () => {
    // Patrick veut (b) consultation d'abord. Un plafond non défini bloque les
    // ÉCRITURES ; il ne doit pas empêcher de répondre « ta caisse ».
    const base = {
      query: async (sql: string) =>
        /caisse_sessions/.test(sql) ? [{ fond_initial: 1000 }] : [{ ventes: 2500, depenses: 500, nb_ventes: 3 }],
    } as any;
    const c = new AgentCaisseController(caisse([]), agents(), base);
    const r: any = await c.aujourdhui({ user: principal({ plafonds: { parOperation: null, parJour: null } }), marchandDelegue: 'm-1' });
    expect(r).toMatchObject({ etat: 'connue', montant: 3000, journeeOuverte: true, nbVentes: 3 });
  });

  it('JOURNÉE NON OUVERTE : la caisse vaut les ventes, et c’est une RÉPONSE', async () => {
    const base = {
      query: async (sql: string) =>
        /caisse_sessions/.test(sql) ? [] : [{ ventes: 800, depenses: 0, nb_ventes: 2 }],
    } as any;
    const c = new AgentCaisseController(caisse([]), agents(), base);
    const r: any = await c.aujourdhui({ user: principal(), marchandDelegue: 'm-1' });
    expect(r).toMatchObject({ etat: 'connue', montant: 800, journeeOuverte: false });
  });

  it('UN MONTANT NON FINI N’EST PAS RENDU — l’agent ne dira jamais « NaN francs »', async () => {
    // La leçon du 03/10 : « Ta caisse aujourd'hui : zéro franc » pour 100 F
    // réels. Une phrase dite ne se reprend pas. `montant` est ABSENT, pas 0.
    const base = {
      query: async (sql: string) =>
        /caisse_sessions/.test(sql) ? [{ fond_initial: 'illisible' }] : [{ ventes: NaN, depenses: 0, nb_ventes: 0 }],
    } as any;
    const c = new AgentCaisseController(caisse([]), agents(), base);
    const r: any = await c.aujourdhui({ user: principal(), marchandDelegue: 'm-1' });
    expect(r.etat).toBe('illisible');
    expect(r).not.toHaveProperty('montant');
  });

  it('la lecture ne porte QUE sur la marchande déléguée', async () => {
    let params: unknown[] = [];
    const base = { query: async (_s: string, p: unknown[]) => { params = p; return []; } } as any;
    const c = new AgentCaisseController(caisse([]), agents(), base);
    await c.ventesDuJour({ user: principal(), marchandDelegue: 'm-7' });
    expect(params).toEqual(['m-7']);
  });

  it('UN SEUL CHEMIN DE VENTE : le contrôleur d’agent APPELLE celui de la caisse', () => {
    // Garde de source. Réimplémenter la vente ici perdrait l'idempotence, le
    // mouvement de stock dans la même transaction et la marge ligne par ligne.
    const src = readFileSync(
      join(__dirname, '..', '..', 'src', 'agent', 'agent-caisse.controller.ts'), 'utf8',
    );
    expect(src).toMatch(/this\.caisse\.enregistrerVente/);
    expect(src).toMatch(/this\.caisse\.enregistrerDepense/);
    // Aucun SQL, aucun dépôt : la vente ne s'écrit pas ici.
    // Les SELECT de lecture sont permis ; une ÉCRITURE ici serait un second
    // chemin de vente, et c'est ce qu'on interdit.
    expect(src).not.toMatch(/INSERT INTO|UPDATE |repo\.save|queryRunner/);
  });

  it('AUCUNE route d’agent ne touche compte, PIN, mot de passe ni récupération', () => {
    const dossier = join(__dirname, '..', '..', 'src', 'agent');
    for (const f of ['agent-caisse.controller.ts', 'agent-delegation.controller.ts']) {
      const src = readFileSync(join(dossier, f), 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
      expect(src).not.toMatch(/password|motDePasse|\bpin\b|recuperation|changePhone/i);
    }
  });
});
