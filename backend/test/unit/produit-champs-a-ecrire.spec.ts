// STK-01 — « ABSENT » N'EST PAS « ZÉRO ».
//
// La règle de `PUT /caisse/produits/:id`, isolée et testée seule : c'est la
// PRÉSENCE de la clé dans le corps qui décide qu'une colonne est écrite,
// jamais la vérité de sa valeur.
//
// Le défaut qu'elle ferme (recette terrain MAR-STK-002) : la route écrivait
// les six colonnes quoi qu'il arrive. `nom` étant NOT NULL, corriger un prix
// seul renvoyait un 500 — l'erreur que Patrick a vue. Et `prix` étant
// nullable, corriger un stock seul EFFAÇAIT le prix, sans erreur.

import { colonnesProduitAEcrire, premiereLigne } from '../../src/caisse-rest/caisse-rest.controller';

const colonnes = (body: any) => colonnesProduitAEcrire(body).map(c => c.colonne);
const valeurDe = (body: any, colonne: string) =>
  colonnesProduitAEcrire(body).find(c => c.colonne === colonne)?.valeur;

describe('STK-01 — les colonnes qu’une modification de produit écrit', () => {
  it('n’écrit QUE ce que le corps nomme', () => {
    expect(colonnes({ prix: 650 })).toEqual(['prix']);
    expect(colonnes({ stock: 8 })).toEqual(['stock']);
    // L'ordre suit la table, pas l'ordre du corps : la requête reste stable.
    expect(colonnes({ stock: 8, prix: 650, nom: 'Tomate' })).toEqual(['nom', 'prix', 'stock']);
  });

  it('un corps vide ne nomme aucune colonne', () => {
    expect(colonnesProduitAEcrire({})).toEqual([]);
    expect(colonnesProduitAEcrire(null)).toEqual([]);
    expect(colonnesProduitAEcrire(undefined)).toEqual([]);
  });

  it('ZÉRO EST UNE RÉPONSE : `prix: 0` s’écrit, `{}` ne touche pas au prix', () => {
    expect(colonnes({ prix: 0 })).toEqual(['prix']);
    expect(valeurDe({ prix: 0 }, 'prix')).toBe(0);
    expect(colonnes({})).not.toContain('prix');
    // C'est exactement ce qu'un `body.prix || 0` confondait.
    expect(valeurDe({ prix: 0 }, 'prix')).not.toBeNull();
  });

  it('un nombre illisible ne devient pas NULL dans une colonne d’argent', () => {
    expect(colonnes({ prix: 'abc' })).toEqual([]);
    expect(colonnes({ prix: NaN })).toEqual([]);
    expect(colonnes({ stock: 'douze' })).toEqual([]);
    // Une chaîne numérique, elle, reste une valeur (les formulaires en
    // envoient) — on la lit, on ne la refuse pas.
    expect(valeurDe({ prix: '650' }, 'prix')).toBe(650);
  });

  it('UN CHAMP VIDÉ N’EST PAS UN ZÉRO — le piège de `Number("")`', () => {
    // L'écran remet le champ à `''` quand la marchande l'efface
    // (`e.target.value === '' ? '' : Number(...)`, GestionStock). `Number('')`
    // vaut ZÉRO : sans cette règle, vider la case du prix l'aurait écrit à
    // zéro, et le produit serait parti en caisse à zéro franc.
    expect(colonnes({ prix: '' })).toEqual([]);
    expect(colonnes({ prix: '   ' })).toEqual([]);
    expect(colonnes({ prix_achat: '', stock: '' })).toEqual([]);
    expect(colonnes({ seuil_alerte: '' })).toEqual([]);
    // Et la distinction tient dans les deux sens : un zéro ÉCRIT passe.
    expect(valeurDe({ prix: 0 }, 'prix')).toBe(0);
    expect(valeurDe({ prix: '0' }, 'prix')).toBe(0);
  });

  it('`nom` est NOT NULL : un nom vide n’est pas un nom', () => {
    expect(colonnes({ nom: '' })).toEqual([]);
    expect(colonnes({ nom: '   ' })).toEqual([]);
    expect(valeurDe({ nom: 'Tomate' }, 'nom')).toBe('Tomate');
  });

  it('retirer la promo est une VALEUR, pas une absence', () => {
    expect(colonnes({ prix_promo: null })).toEqual(['prix_promo']);
    expect(valeurDe({ prix_promo: null }, 'prix_promo')).toBeNull();
    expect(valeurDe({ prix_promo: '' }, 'prix_promo')).toBeNull();
    expect(valeurDe({ prix_promo: 400 }, 'prix_promo')).toBe(400);
    // Sans la clé, la promo en cours n'est pas touchée.
    expect(colonnes({ prix: 500 })).not.toContain('prix_promo');
  });

  it('un corps ne choisit pas les colonnes de la base', () => {
    expect(colonnes({ marchand_id: 'quelqu-un-dautre', actif: false, id: 'x' })).toEqual([]);
    expect(colonnes({ 'prix; DROP TABLE produits': 1 })).toEqual([]);
  });

  it('premiereLigne lit la forme du résultat au lieu de la supposer', () => {
    // INSERT ... RETURNING → les lignes.
    expect(premiereLigne([{ id: 'a' }])).toEqual({ id: 'a' });
    // UPDATE ... RETURNING → [lignes, nombre]. C'est le piège : `result[0]`
    // rendait le TABLEAU, et l'écran recevait `{ produit: [ {…} ] }`.
    expect(premiereLigne([[{ id: 'b' }], 1])).toEqual({ id: 'b' });
    // Aucune ligne touchée, dans les deux formes.
    expect(premiereLigne([])).toBeUndefined();
    expect(premiereLigne([[], 0])).toBeUndefined();
    expect(premiereLigne(null)).toBeUndefined();
  });
});
