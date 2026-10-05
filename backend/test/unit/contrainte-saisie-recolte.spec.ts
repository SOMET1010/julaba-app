// Le validateur de la frontière API, sur la table de cas partagée.
import {
  valideSaisieBrute,
  normaliseSaisieBrute,
  CHECK_SAISIE_BRUTE,
  NOM_CONTRAINTE_SAISIE_BRUTE,
  sqlAjoutIdempotent,
} from '../../src/database/contrainte-saisie-recolte';
import { CAS_SAISIE_BRUTE } from '../cas-saisie-brute';

describe('Saisie brute — le validateur de la frontière API', () => {
  it('la table de cas couvre les deux verdicts (non-vacuité)', () => {
    expect(CAS_SAISIE_BRUTE.filter((c) => c.accepte).length).toBeGreaterThanOrEqual(5);
    expect(CAS_SAISIE_BRUTE.filter((c) => !c.accepte).length).toBeGreaterThanOrEqual(10);
  });

  for (const cas of CAS_SAISIE_BRUTE) {
    it(`${cas.accepte ? 'ACCEPTE' : 'REFUSE'} — ${cas.libelle}`, () => {
      const refus = valideSaisieBrute(cas);
      if (cas.accepte) expect(refus).toBeNull();
      else expect(typeof refus).toBe('string');
    });
  }

  it('chaque refus est une phrase lisible, pas un code technique', () => {
    for (const cas of CAS_SAISIE_BRUTE.filter((c) => !c.accepte)) {
      const refus = valideSaisieBrute(cas)!;
      expect(refus.length).toBeGreaterThan(20);
      expect(refus).not.toMatch(/23514|CHECK|constraint|null value/i);
    }
  });

  // La normalisation précède la validation : sinon l'API accepterait 0,0004 que
  // la base, l'arrondissant à 0,000, refuserait ensuite.
  it('normalise à la précision du schéma AVANT de juger', () => {
    expect(normaliseSaisieBrute({ quantite: 30, quantiteSaisie: 3.00049, uniteSaisie: ' panier ', facteurSaisie: 9.999994 }))
      .toEqual({ quantite: 30, quantiteSaisie: 3.0, uniteSaisie: 'panier', facteurSaisie: 10.0 });
    // 0,0004 devient 0,000 : la valeur STOCKÉE n'est pas positive, donc on refuse.
    expect(valideSaisieBrute({ quantite: 30, quantiteSaisie: 0.0004, uniteSaisie: 'panier', facteurSaisie: 10 }))
      .toMatch(/strictement positive/);
  });

  it('le prédicat SQL est posé en NOT VALID, et porte le nom attendu', () => {
    const sql = sqlAjoutIdempotent();
    expect(sql).toContain('NOT VALID');
    expect(sql).toContain(NOM_CONTRAINTE_SAISIE_BRUTE);
    expect(sql).toContain('pg_constraint'); // idempotent : rejoué à chaque boot
  });

  // Les trois chemins de DDL doivent citer LE MÊME prédicat, pas une copie.
  it('entité, migration et db-init consomment la MÊME chaîne SQL', () => {
    const { readFileSync } = require('node:fs') as typeof import('node:fs');
    const { join } = require('node:path') as typeof import('node:path');
    const racine = join(__dirname, '..', '..', 'src');
    for (const f of [
      join(racine, 'producteur', 'recoltes', 'entities', 'recolte.entity.ts'),
      join(racine, 'database', 'migrations', '1782300000000-RecolteSaisieBrute.ts'),
    ]) {
      const src = readFileSync(f, 'utf8');
      expect(src).toContain('CHECK_SAISIE_BRUTE');
      // Aucune recopie du prédicat : seul l'import est autorisé.
      expect(src).not.toContain('btrim(unite_saisie)');
    }
    const dbInit = readFileSync(join(racine, 'database', 'db-init.service.ts'), 'utf8');
    expect(dbInit).toContain('sqlAjoutIdempotentSaisieBrute()');
    expect(dbInit).not.toContain('btrim(unite_saisie)');
  });

  it('le prédicat compare à 1 décimale — la précision que l’écran produit', () => {
    expect(CHECK_SAISIE_BRUTE).toContain('round(quantite_saisie * facteur_saisie, 1)');
    expect(CHECK_SAISIE_BRUTE).toContain('round(quantite, 1)');
  });
});
