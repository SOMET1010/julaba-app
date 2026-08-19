import {
  calculerPointsGagnes, estEligibleRecompense, normaliserBareme, normaliserTel,
} from '../../src/fidelite-rest/fidelite-calcul';

describe('calculerPointsGagnes — points par tranche de 100 FCFA', () => {
  it('barème 1 point / 100 FCFA : 300 FCFA => 3 points', () => {
    expect(calculerPointsGagnes(300, 1)).toBe(3);
  });

  it('arrondit au point INFÉRIEUR (pas de point fractionnaire offert)', () => {
    expect(calculerPointsGagnes(250, 1)).toBe(2); // 2.5 -> 2
    expect(calculerPointsGagnes(99, 1)).toBe(0);
  });

  it('barème à plusieurs points par tranche', () => {
    expect(calculerPointsGagnes(400, 3)).toBe(12); // 4 * 3
  });

  it('montant ou barème négatif/NaN => 0 (jamais de points volés au marchand)', () => {
    expect(calculerPointsGagnes(-500, 1)).toBe(0);
    expect(calculerPointsGagnes(NaN, 1)).toBe(0);
    expect(calculerPointsGagnes(300, -1)).toBe(0);
  });

  it('barème désactivé (0 point/100F) => aucun point quel que soit le montant', () => {
    expect(calculerPointsGagnes(100000, 0)).toBe(0);
  });
});

describe('estEligibleRecompense — seuil de récompense', () => {
  const bareme = { points_par_cent: 1, seuil_points: 100, recompense_fcfa: 1000 };

  it('sous le seuil => pas éligible', () => {
    expect(estEligibleRecompense(99, bareme)).toBe(false);
  });

  it('exactement au seuil => éligible', () => {
    expect(estEligibleRecompense(100, bareme)).toBe(true);
  });

  it('au-dessus du seuil => éligible', () => {
    expect(estEligibleRecompense(250, bareme)).toBe(true);
  });

  it('récompense à 0 FCFA => jamais éligible même au-dessus du seuil (rien à donner)', () => {
    expect(estEligibleRecompense(500, { ...bareme, recompense_fcfa: 0 })).toBe(false);
  });
});

describe('normaliserBareme — bornes de sûreté du barème', () => {
  it('seuil jamais nul : 0 ou absent => 1', () => {
    expect(normaliserBareme({ seuil_points: 0 }).seuil_points).toBe(1);
    expect(normaliserBareme({}).seuil_points).toBe(1);
  });

  it('valeurs négatives ramenées à 0 (sauf seuil, ramené à 1)', () => {
    const b = normaliserBareme({ points_par_cent: -5, seuil_points: -10, recompense_fcfa: -1000 });
    expect(b.points_par_cent).toBe(0);
    expect(b.seuil_points).toBe(1);
    expect(b.recompense_fcfa).toBe(0);
  });

  it('valeurs valides conservées telles quelles', () => {
    const b = normaliserBareme({ points_par_cent: 2, seuil_points: 50, recompense_fcfa: 500 });
    expect(b).toEqual({ points_par_cent: 2, seuil_points: 50, recompense_fcfa: 500 });
  });
});

describe('normaliserTel — clé de recherche stable', () => {
  it('retire espaces et caractères non numériques (garde le +)', () => {
    expect(normaliserTel('07 00 00 00 00')).toBe('0700000000');
    expect(normaliserTel('+225 07 00 00 00 00')).toBe('+2250700000000');
    expect(normaliserTel('07-00-00-00-00')).toBe('0700000000');
  });

  it('valeur vide/nulle => chaîne vide', () => {
    expect(normaliserTel('')).toBe('');
    expect(normaliserTel(undefined as any)).toBe('');
  });
});
