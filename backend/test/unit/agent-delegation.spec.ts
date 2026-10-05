import {
  PORTEES_AGENT, PORTEES_INTERDITES, agentPeut, porteeInterdite, porteesDuJeton,
} from '../../src/agent/portee-agent';
import {
  CODE_ESSAIS_MAX, CODE_VALIDITE_MS, delegationActive, etatDuCode, montantAutorise,
  type Delegation, type PlafondsAgent,
} from '../../src/agent/delegation-agent';

/**
 * AGENT-A1/A2 — ce qu'un agent serveur a le droit de faire, et pour qui.
 *
 * Bancs PURS : aucune base, aucune horloge système. Ce qu'ils protègent, ce
 * n'est pas du confort d'API — c'est la frontière entre « un agent compromis
 * enregistre de fausses ventes », qui est grave mais réparable et tracé, et
 * « un agent compromis prend le compte », qui ne se répare pas.
 */
describe('AGENT-A1 — la portée d’un agent', () => {
  it('ne couvre QUE les quatre gestes décidés le 05/10', () => {
    expect([...PORTEES_AGENT].sort()).toEqual(
      ['depenses:ecrire', 'lecture', 'stock:ecrire', 'ventes:ecrire'],
    );
  });

  it('L’INVARIANT : aucune portée ne touche au compte, au numéro ni à la récupération', () => {
    // « Le code SMS ne doit jamais être suffisant à lui seul pour changer
    // durablement le propriétaire, le numéro de téléphone ou les moyens de
    // récupération du compte. » — arbitrage du 05/10.
    for (const portee of PORTEES_AGENT) {
      expect(porteeInterdite(portee)).toBe(false);
    }
    for (const interdite of PORTEES_INTERDITES) {
      expect(porteeInterdite(interdite)).toBe(true);
      expect(porteeInterdite(`${interdite}:ecrire`)).toBe(true);
      expect(porteeInterdite(`${interdite}:lire`)).toBe(true);
    }
  });

  it('refuse les portées sensibles même écrites autrement', () => {
    for (const v of ['COMPTE', ' Telephone ', 'PIN:lire', 'delegation:ecrire', 'admin']) {
      expect(porteeInterdite(v)).toBe(true);
    }
  });

  it('un jeton forgé n’obtient aucun droit — il n’échoue même pas bruyamment', () => {
    // Échouer d'une façon particulière renseignerait l'auteur du jeton.
    expect(porteesDuJeton(['admin', 'compte:ecrire'])).toEqual([]);
    expect(porteesDuJeton('ventes:ecrire')).toEqual([]);
    expect(porteesDuJeton(null)).toEqual([]);
    expect(porteesDuJeton([{ portee: 'ventes:ecrire' }])).toEqual([]);
  });

  it('garde les portées valides et jette les autres, sans contaminer', () => {
    expect(porteesDuJeton(['ventes:ecrire', 'admin', 'lecture'])).toEqual(['ventes:ecrire', 'lecture']);
  });

  it('AUCUNE hiérarchie : lire n’autorise pas à écrire, et écrire n’autorise pas tout', () => {
    expect(agentPeut(['lecture'], 'ventes:ecrire')).toBe(false);
    expect(agentPeut(['ventes:ecrire'], 'depenses:ecrire')).toBe(false);
    expect(agentPeut(['ventes:ecrire'], 'stock:ecrire')).toBe(false);
    expect(agentPeut(['ventes:ecrire'], 'ventes:ecrire')).toBe(true);
  });
});

describe('AGENT-A2 — le code de délégation', () => {
  const T0 = 1_700_000_000_000;
  const code = (p: Partial<Parameters<typeof etatDuCode>[0]> = {}) =>
    ({ empreinte: 'x', creeLe: T0, essais: 0, ...p }) as NonNullable<Parameters<typeof etatDuCode>[0]>;

  it('est valide dans sa fenêtre, et plus après', () => {
    expect(etatDuCode(code(), T0 + 1000)).toEqual({ valide: true });
    expect(etatDuCode(code(), T0 + CODE_VALIDITE_MS - 1)).toEqual({ valide: true });
    expect(etatDuCode(code(), T0 + CODE_VALIDITE_MS)).toEqual({ valide: false, raison: 'expire' });
  });

  it('À USAGE UNIQUE : un code consommé ne revaut jamais, même dans sa fenêtre', () => {
    expect(etatDuCode(code({ utiliseLe: T0 + 10 }), T0 + 20)).toEqual({
      valide: false, raison: 'deja-utilise',
    });
  });

  it('un code consommé PUIS expiré se dit consommé — la raison la plus sévère', () => {
    expect(etatDuCode(code({ utiliseLe: T0 + 10 }), T0 + CODE_VALIDITE_MS * 3)).toEqual({
      valide: false, raison: 'deja-utilise',
    });
  });

  it('se ferme après trop d’essais — un code à 6 chiffres se devine, pas en cinq coups', () => {
    expect(etatDuCode(code({ essais: CODE_ESSAIS_MAX - 1 }), T0)).toEqual({ valide: true });
    expect(etatDuCode(code({ essais: CODE_ESSAIS_MAX }), T0)).toEqual({
      valide: false, raison: 'trop-d-essais',
    });
  });

  it('un code inconnu ne révèle pas qu’il est inconnu par un autre chemin', () => {
    expect(etatDuCode(null, T0).valide).toBe(false);
    expect(etatDuCode(undefined, T0).valide).toBe(false);
  });
});

describe('AGENT-A2 — la délégation elle-même', () => {
  const T0 = 1_700_000_000_000;
  const base: Delegation = { agentId: 'ag-1', marchandId: 'm-1', appareil: 'wa-225xx', creeLe: T0 };
  const demande = { agentId: 'ag-1', marchandId: 'm-1', appareil: 'wa-225xx' };

  it('autorise l’agent nommé, pour la marchande nommée, depuis l’appareil nommé', () => {
    expect(delegationActive(base, demande, T0 + 1000)).toBe(true);
  });

  it('LES TROIS DOIVENT CORRESPONDRE — un seul qui change, et c’est non', () => {
    expect(delegationActive(base, { ...demande, agentId: 'ag-2' }, T0)).toBe(false);
    expect(delegationActive(base, { ...demande, marchandId: 'm-2' }, T0)).toBe(false);
    expect(delegationActive(base, { ...demande, appareil: 'autre' }, T0)).toBe(false);
  });

  it('RÉVOCABLE, et la révocation vaut dès l’instant où elle est posée', () => {
    const revoquee = { ...base, revoqueeLe: T0 + 500 };
    expect(delegationActive(revoquee, demande, T0 + 499)).toBe(true);
    expect(delegationActive(revoquee, demande, T0 + 500)).toBe(false);
    expect(delegationActive(revoquee, demande, T0 + 10_000)).toBe(false);
  });

  it('sans délégation, rien n’est permis — jamais de repli silencieux', () => {
    expect(delegationActive(null, demande, T0)).toBe(false);
    expect(delegationActive(undefined, demande, T0)).toBe(false);
  });
});

describe('AGENT-A3 — les plafonds', () => {
  const definis: PlafondsAgent = { parOperation: 20_000, parJour: 100_000 };

  it('NON RENSEIGNÉ VEUT DIRE « RIEN NE PASSE », jamais « illimité »', () => {
    // Patrick, 05/10 : les montants se choisissent sur des données réelles,
    // pas dans le code. Refuser force la décision ; laisser passer ouvrirait
    // une porte que personne n'aurait choisi d'ouvrir.
    expect(montantAutorise({ parOperation: null, parJour: null }, 100, 0))
      .toEqual({ permis: false, raison: 'non-defini' });
    expect(montantAutorise({ parOperation: 20_000, parJour: null }, 100, 0))
      .toEqual({ permis: false, raison: 'non-defini' });
    expect(montantAutorise({ parOperation: null, parJour: 100_000 }, 100, 0))
      .toEqual({ permis: false, raison: 'non-defini' });
  });

  it('laisse passer sous les deux plafonds', () => {
    expect(montantAutorise(definis, 20_000, 0)).toEqual({ permis: true });
    expect(montantAutorise(definis, 1, 99_999)).toEqual({ permis: true });
  });

  it('refuse au-dessus du plafond par opération', () => {
    expect(montantAutorise(definis, 20_001, 0)).toEqual({ permis: false, raison: 'operation' });
  });

  it('refuse quand le CUMUL du jour dépasse, même si l’opération seule passait', () => {
    expect(montantAutorise(definis, 5_000, 96_000)).toEqual({ permis: false, raison: 'journalier' });
  });

  it('UN DÉPASSEMENT N’EST PAS UN ÉCRÊTEMENT — la vente est refusée ENTIÈRE', () => {
    // Écrêter écrirait un chiffre faux dans la caisse d'une marchande.
    const verdict = montantAutorise(definis, 50_000, 0);
    expect(verdict.permis).toBe(false);
    expect(verdict).not.toHaveProperty('montantRetenu');
  });

  it('refuse un montant nul, négatif ou non fini', () => {
    for (const m of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(montantAutorise(definis, m, 0).permis).toBe(false);
    }
  });
});
