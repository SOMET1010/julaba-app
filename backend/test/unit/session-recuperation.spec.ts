/**
 * LOT-RECOVERY — la session de récupération : LE CODE SEUL NE SUFFIT JAMAIS.
 *
 * Ce que ce banc verrouille (SPEC-AUTH-CIBLE §3.1.3, décision du 16/08 §8.4) :
 *   1. une session naît à « code_valide » — la marche 1 seule n'ouvre rien d'autre ;
 *   2. le ré-enrôlement EXIGE l'étape « consentement » — sans le geste de la
 *      marchande, les options d'enrôlement sont murées (sessionVivante à
 *      'consentement' rend null) ;
 *   3. les étapes ne se sautent pas : poser un challenge sur une session
 *      'code_valide' est refusé ;
 *   4. la session est à usage unique — consommée au ré-enrôlement, morte ;
 *   5. la session meurt au TTL (10 min) — elle ne dort pas sur disque ;
 *   6. une NOUVELLE session du même compte écrase l'ancienne — une seule file
 *      active par marchande ;
 *   7. fermer les sessions d'un compte ferme TOUTES ses étapes.
 *
 * Lancer : npm run test:unit -- session-recuperation
 */
import {
  ouvrirSessionRecuperation,
  sessionVivante,
  poserConsentement,
  poserChallengeWebauthn,
  consommerSessionRecuperation,
  fermerSessionsDuCompte,
  sessionsVivantes,
  TTL_SESSION_RECUPERATION_MS,
} from '../../src/auth/session-recuperation';

describe('session-recuperation (le code seul ne suffit jamais)', () => {
  it('naît à code_valide : le jeton ouvre la marche 1, rien de plus', () => {
    const t = 1_000_000;
    const jeton = ouvrirSessionRecuperation('USER-A', 'CODE-1', t);
    expect(sessionVivante(jeton, 'code_valide', t + 1000)).toMatchObject({
      userId: 'USER-A',
      codeId: 'CODE-1',
      etape: 'code_valide',
      consentementLe: null,
    });
    // À ce stade, personne ne peut prétendre au consentement ni aux options.
    expect(sessionVivante(jeton, 'consentement', t + 1000)).toBeNull();
  });

  it('les options d\'enrôlement sont murées tant que le geste n\'est pas posé', () => {
    const t = 2_000_000;
    const jeton = ouvrirSessionRecuperation('USER-B', 'CODE-2', t);
    // Marche 3 demandée sans la marche 2 : refus — code ou pas.
    expect(poserChallengeWebauthn(jeton, 'CHALLENGE-X', t + 1000)).toBeNull();
    expect(sessionVivante(jeton, 'consentement', t + 1000)).toBeNull();
    // Après le geste, la marche 3 s'ouvre.
    expect(poserConsentement(jeton, t + 2000)).not.toBeNull();
    const session = sessionVivante(jeton, 'consentement', t + 3000);
    expect(session?.consentementLe).not.toBeNull();
    expect(poserChallengeWebauthn(jeton, 'CHALLENGE-X', t + 3000)).not.toBeNull();
  });

  it('consentement sans code : un jeton inconnu ne pose rien', () => {
    const t = 3_000_000;
    expect(poserConsentement('JETON-FANTOME', t)).toBeNull();
  });

  it('usage unique : consommée au ré-enrôlement, la session ne revient pas', () => {
    const t = 4_000_000;
    const jeton = ouvrirSessionRecuperation('USER-C', 'CODE-3', t);
    poserConsentement(jeton, t + 1000);
    consommerSessionRecuperation(jeton);
    expect(sessionVivante(jeton, 'consentement', t + 2000)).toBeNull();
    expect(sessionVivante(jeton, 'code_valide', t + 2000)).toBeNull();
    // Reposer quoi que ce soit sur un jeton mort : refusé.
    expect(poserConsentement(jeton, t + 3000)).toBeNull();
  });

  it('meurt au TTL de 10 minutes — la session ne dort pas', () => {
    const t = 5_000_000;
    const jeton = ouvrirSessionRecuperation('USER-D', 'CODE-4', t);
    expect(sessionVivante(jeton, 'code_valide', t + TTL_SESSION_RECUPERATION_MS - 1)).not.toBeNull();
    expect(sessionVivante(jeton, 'code_valide', t + TTL_SESSION_RECUPERATION_MS)).toBeNull();
  });

  it('une seule file active par compte : reposer le code écrase l\'ancienne session', () => {
    const t = 6_000_000;
    const jeton1 = ouvrirSessionRecuperation('USER-E', 'CODE-5', t);
    poserConsentement(jeton1, t + 1000);
    const jeton2 = ouvrirSessionRecuperation('USER-E', 'CODE-6', t + 1500); // nouvelle tentative
    expect(sessionVivante(jeton1, 'consentement', t + 2000)).toBeNull();
    expect(sessionVivante(jeton1, 'code_valide', t + 2000)).toBeNull();
    expect(sessionVivante(jeton2, 'code_valide', t + 2000)).not.toBeNull();
  });

  it('fermerSessionsDuCompte ferme toutes les étapes du compte — et rien d\'autrui', () => {
    const t = 7_000_000;
    const jetonA = ouvrirSessionRecuperation('USER-F', 'CODE-7', t);
    const jetonB = ouvrirSessionRecuperation('USER-G', 'CODE-8', t);
    fermerSessionsDuCompte('USER-F');
    expect(sessionVivante(jetonA, 'code_valide', t + 1000)).toBeNull();
    expect(sessionVivante(jetonB, 'code_valide', t + 1000)).not.toBeNull();
  });

  it('le registre purge ses morts : il ne grossit pas avec les tentatives', () => {
    const t = 8_000_000;
    for (let i = 0; i < 50; i++) ouvrirSessionRecuperation(`USER-X-${i}`, 'CODE-MORT', t);
    ouvrirSessionRecuperation('USER-VIVANT', 'CODE-VIVANT', t + 1_100_000); // expire à t+1,7M
    // 20 minutes après les MORT (mais avant l'expiration de VIVANT).
    ouvrirSessionRecuperation('USER-RECENT', 'CODE-RECENT', t + 1_200_000);
    expect(sessionsVivantes()).toBe(2); // VIVANT + RECENT seulement
  });

  it('refuse ce qui ne peut pas être un jeton', () => {
    const t = 9_000_000;
    expect(sessionVivante(undefined, 'code_valide', t)).toBeNull();
    expect(sessionVivante(null, 'code_valide', t)).toBeNull();
    expect(sessionVivante('', 'code_valide', t)).toBeNull();
    expect(sessionVivante(42 as unknown, 'code_valide', t)).toBeNull();
  });
});
