import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreerRaccourciDto, UpdateRaccourciDto } from '../../src/caisse-rest/dto/raccourci.dto';

function proprietesEnErreur(cls: any, obj: any): string[] {
  const dto = plainToInstance(cls, obj);
  return validateSync(dto).map((e) => e.property);
}

describe('CreerRaccourciDto — validation (fini le 500 sur payload invalide)', () => {
  it('payload nominal → aucune erreur', () => {
    expect(
      proprietesEnErreur(CreerRaccourciDto, {
        nom: 'Vente tomate',
        declencheur: 'tomate',
        type: 'vente',
        action: { type: 'vendre', produit: 'Tomate', quantite: 1 },
      }),
    ).toEqual([]);
  });

  it('action absente → OK (optionnelle)', () => {
    expect(proprietesEnErreur(CreerRaccourciDto, { nom: 'X', declencheur: 'x', type: 'vente' })).toEqual([]);
  });

  it('payload exploratoire {label, produit, quantite} → 400 (nom/declencheur/type manquants)', () => {
    const e = proprietesEnErreur(CreerRaccourciDto, { label: 'x', produit: 'Tomate', quantite: 1 });
    expect(e).toEqual(expect.arrayContaining(['nom', 'declencheur', 'type']));
  });

  it('champs vides → erreur (NOT NULL protégé)', () => {
    const e = proprietesEnErreur(CreerRaccourciDto, { nom: '', declencheur: '', type: '' });
    expect(e).toEqual(expect.arrayContaining(['nom', 'declencheur', 'type']));
  });
});

describe('UpdateRaccourciDto — mise à jour partielle', () => {
  it('objet vide → aucune erreur (tout optionnel)', () => {
    expect(proprietesEnErreur(UpdateRaccourciDto, {})).toEqual([]);
  });

  it('seul actif fourni (booléen) → OK', () => {
    expect(proprietesEnErreur(UpdateRaccourciDto, { actif: false })).toEqual([]);
  });

  it('nom fourni mais vide → erreur', () => {
    expect(proprietesEnErreur(UpdateRaccourciDto, { nom: '' })).toEqual(expect.arrayContaining(['nom']));
  });
});
