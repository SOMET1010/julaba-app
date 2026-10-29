/**
 * LOT-WA-01 — le challenge usernameless est à usage unique et meurt vite.
 *
 * Ce que ce banc verrouille (SPEC-AUTH-CIBLE §2.1, connexion sans numéro) :
 *   1. un challenge posé est consommé par UNE assertion, puis mort — rejeu impossible ;
 *   2. un challenge inconnu, vide, ou non-string est refusé ;
 *   3. un challenge périmé (TTL 3 min) est refusé, comme s'il n'avait jamais existé ;
 *   4. le registre purge ses morts — il ne grossit pas avec les tentatives.
 *
 * Lancer : npm run test:unit -- challenge-usernameless
 */
import {
  enregistrerChallengeSansIdentifiant,
  consommerChallengeSansIdentifiant,
  challengesVivants,
  TTL_CHALLENGE_SANS_IDENTIFIANT_MS,
} from '../../src/auth/challenge-usernameless';

describe('challenge-usernameless (connexion sans numéro)', () => {
  it('consomme un challenge posé, exactement une fois', () => {
    const t = 1_000_000;
    enregistrerChallengeSansIdentifiant('CH1', t);
    expect(consommerChallengeSansIdentifiant('CH1', t + 1000)).toBe(true);
    expect(consommerChallengeSansIdentifiant('CH1', t + 1000)).toBe(false); // usage unique
  });

  it('refuse ce qui ne peut pas être un challenge', () => {
    const t = 2_000_000;
    expect(consommerChallengeSansIdentifiant(undefined, t)).toBe(false);
    expect(consommerChallengeSansIdentifiant(null, t)).toBe(false);
    expect(consommerChallengeSansIdentifiant('', t)).toBe(false);
    expect(consommerChallengeSansIdentifiant(12345 as unknown, t)).toBe(false);
    expect(consommerChallengeSansIdentifiant('INCONNU', t)).toBe(false);
  });

  it('refuse un challenge périmé au-delà du TTL de 3 minutes', () => {
    const t = 3_000_000;
    enregistrerChallengeSansIdentifiant('CH2', t);
    expect(consommerChallengeSansIdentifiant('CH2', t + TTL_CHALLENGE_SANS_IDENTIFIANT_MS - 1)).toBe(true);

    enregistrerChallengeSansIdentifiant('CH3', t);
    expect(consommerChallengeSansIdentifiant('CH3', t + TTL_CHALLENGE_SANS_IDENTIFIANT_MS)).toBe(false);
  });

  it('purge ses morts : le registre ne grossit pas avec les tentatives', () => {
    const t = 4_000_000;
    enregistrerChallengeSansIdentifiant('VIVANT', t);
    for (let i = 0; i < 50; i++) enregistrerChallengeSansIdentifiant(`MORT-${i}`, t);
    // 1 000 000 ms plus tard, tous les MORT-* sont expirés, VIVANT aussi.
    enregistrerChallengeSansIdentifiant('NOUVEAU', t + 2_000_000);
    expect(challengesVivants()).toBe(1); // seulement NOUVEAU — les autres sont purgés
    expect(consommerChallengeSansIdentifiant('NOUVEAU', t + 2_000_000)).toBe(true);
  });
});
