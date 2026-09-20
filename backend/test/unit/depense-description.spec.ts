import { descriptionDepenseDepuisBody } from '../../src/caisse-rest/caisse-rest.controller';

describe('contrat du motif de dépense', () => {
  it('préfère le champ canonique description', () => {
    expect(descriptionDepenseDepuisBody({ description: '  Taxe mairie  ', notes: 'ancien motif' }))
      .toBe('Taxe mairie');
  });

  it('relit notes pour une opération offline créée avant la migration', () => {
    expect(descriptionDepenseDepuisBody({ notes: 'Transport marché' }))
      .toBe('Transport marché');
  });

  it('ne persiste pas les valeurs absentes ou non textuelles sans normalisation', () => {
    expect(descriptionDepenseDepuisBody({})).toBe('');
    expect(descriptionDepenseDepuisBody({ description: 1234 })).toBe('1234');
  });
});
