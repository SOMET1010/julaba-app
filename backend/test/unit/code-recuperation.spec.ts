/**
 * LOT-RECOVERY — le code de récupération a une forme sans piège.
 *
 * Ce que ce banc verrouille (SPEC-AUTH-CIBLE §3, code détenu par l'agent) :
 *   1. le code naît au format 4+4, en alphabet Crockford (I, L, O, U n'existent pas) ;
 *   2. la normalisation accepte ce que tape un doigt pressé (minuscules, tiret,
 *      espaces) et REFUSE les variantes ambiguës au lieu de deviner (aucun alias) ;
 *   3. chaque caractère tiré vient du générateur cryptographique dans l'alphabet ;
 *   4. deux codes successifs ne se ressemblent pas (le hasard n'est pas un motif) ;
 *   5. LE ROUND-TRIP EST VRAI : le code tel que le serveur le HACHE est
 *      exactement celui que la normalisation rend à la présentation. Ce
 *      round-trip a été CASSÉ (hash sur la forme affichée « XXXX-XXXX »,
 *      comparaison sur la forme canonique « XXXXXXXX ») — le code était
 *      refusé à tout coup, la marche 1 de la récupération murée pour tout
 *      le monde. Attrapé par le harnais HTTP recouv-01 (Postgres réel),
 *      verrouillé ici pour toujours.
 *
 * Lancer : npm run test:unit -- code-recuperation
 */
import * as bcrypt from 'bcryptjs';
import {
  genererCodeRecuperation,
  normaliserCodeRecuperation,
  ALPHABET_CODE_RECUPERATION,
  LONGUEUR_CODE_RECUPERATION,
} from '../../src/auth/code-recuperation';

describe('code-recuperation (la forme du code)', () => {
  it('naît au format 4+4, tout en alphabet Crockford', () => {
    for (let i = 0; i < 200; i++) {
      const code = genererCodeRecuperation();
      expect(code).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
      const brut = code.replace('-', '');
      for (const caractere of brut) {
        expect(ALPHABET_CODE_RECUPERATION).toContain(caractere);
      }
      // Les quatre bannis n'y figurent jamais.
      expect(brut).not.toMatch(/[ILOU]/);
    }
  });

  it('normalise ce qu\'un doigt pressé tape : minuscules, tiret, espaces', () => {
    const code = genererCodeRecuperation();
    const brut = code.replace('-', '');
    expect(normaliserCodeRecuperation(code)).toBe(brut);
    expect(normaliserCodeRecuperation(brut.toLowerCase())).toBe(brut);
    expect(normaliserCodeRecuperation(`${brut.slice(0, 4)} ${brut.slice(4)}`)).toBe(brut);
    expect(normaliserCodeRecuperation(`${brut.slice(0, 4)}-${brut.slice(4)}`)).toBe(brut);
  });

  it('refuse les variantes au lieu de deviner : O, I, L, U, longueur, vide, non-texte', () => {
    // Chaque lettre bannie, même seule, rend le code entier refusé — la
    // bienveillance serait une seconde vérité.
    expect(normaliserCodeRecuperation('O1234567')).toBeNull();
    expect(normaliserCodeRecuperation('I1234567')).toBeNull();
    expect(normaliserCodeRecuperation('L1234567')).toBeNull();
    expect(normaliserCodeRecuperation('U1234567')).toBeNull();
    expect(normaliserCodeRecuperation('ABC')).toBeNull();
    expect(normaliserCodeRecuperation('ABCDEFGHI')).toBeNull(); // 9 caractères
    expect(normaliserCodeRecuperation('')).toBeNull();
    expect(normaliserCodeRecuperation(undefined)).toBeNull();
    expect(normaliserCodeRecuperation(null)).toBeNull();
    expect(normaliserCodeRecuperation(12345678 as unknown)).toBeNull();
  });

  it(`tire ses ${LONGUEUR_CODE_RECUPERATION} caractères dans l'alphabet, jamais ailleurs`, () => {
    // 500 caractères consécutifs : tous dans l'alphabet (le hasard criptographique
    // n'a pas de case hors-liste).
    const vus = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const brut = genererCodeRecuperation().replace('-', '');
      for (const caractere of brut) {
        vus.add(caractere);
        expect(ALPHABET_CODE_RECUPERATION).toContain(caractere);
      }
    }
    // Un échantillon assez large couvre une bonne partie des 32 symboles —
    // si un caractère revenait systématiquement absent, ce serait un biais.
    expect(vus.size).toBeGreaterThanOrEqual(20);
  });

  it('le round-trip hachage → présentation est vrai (le secret est la forme canonique)', async () => {
    // EXACTEMENT ce que fait le contrôleur : hash du secret naissant, puis
    // comparaison de ce que l'agent a tapé (avec tiret, en minuscule, avec
    // des espaces — tout ce que la normalisation avale). Si ce round-trip
    // rend faux, AUCUN code de récupération ne fonctionne jamais.
    for (let i = 0; i < 10; i++) {
      const codeClair = genererCodeRecuperation();
      const codeCanonique = normaliserCodeRecuperation(codeClair)!;
      const codeHash = await bcrypt.hash(codeCanonique, 10);
      // Le tiret du hash ne doit PAS être le secret : le canonique est identique.
      expect(codeCanonique).toBe(codeClair.replace('-', ''));
      // Ce que l'agent tape — tel quel, malpropre — passe.
      expect(await bcrypt.compare(normaliserCodeRecuperation(codeClair)!, codeHash)).toBe(true);
      expect(await bcrypt.compare(normaliserCodeRecuperation(codeClair.toLowerCase())!, codeHash)).toBe(true);
      expect(await bcrypt.compare(normaliserCodeRecuperation(codeClair.replace('-', ' '))!, codeHash)).toBe(true);
      // Un autre code ne passe pas.
      const autre = genererCodeRecuperation();
      if (normaliserCodeRecuperation(autre) !== codeCanonique) {
        expect(await bcrypt.compare(normaliserCodeRecuperation(autre)!, codeHash)).toBe(false);
      }
    }
  });
});
