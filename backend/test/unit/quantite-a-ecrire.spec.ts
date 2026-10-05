/**
 * STK-06 — un champ vidé n'efface pas le stock.
 *
 * Terrain du 24/09 : « en lieu et place d'ajout, il a remis à zéro le stock ».
 * Reproduit : l'écran envoie `quantite: ''`, `'' != null` est vrai,
 * `Number('')` vaut 0, et `COALESCE(0, stock)` écrit 0.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { quantiteAEcrire } from '../../src/commun/quantite-a-ecrire';

describe('STK-06 — ce qu’une modification de quantité écrit', () => {
  it('un champ VIDÉ ne touche pas au stock', () => {
    // LE DÉFAUT EXACT : avant, ces trois-là écrivaient 0.
    expect(quantiteAEcrire('')).toBeNull();
    expect(quantiteAEcrire('   ')).toBeNull();
    expect(quantiteAEcrire(undefined)).toBeNull();
    expect(quantiteAEcrire(null)).toBeNull();
  });

  it('mais un ZÉRO TAPÉ passe — c’est un geste, pas un oubli', () => {
    expect(quantiteAEcrire(0)).toBe(0);
    expect(quantiteAEcrire('0')).toBe(0);
  });

  it('une vraie quantité passe, en nombre comme en texte', () => {
    expect(quantiteAEcrire(12)).toBe(12);
    expect(quantiteAEcrire('12')).toBe(12);
    expect(quantiteAEcrire('12.5')).toBe(12.5);
  });

  it('ce qui n’est pas un nombre ne touche à rien', () => {
    // Mieux vaut ne rien écrire que d’écrire NaN dans une colonne de stock.
    expect(quantiteAEcrire('abc')).toBeNull();
    expect(quantiteAEcrire({})).toBeNull();
    expect(quantiteAEcrire(Infinity)).toBeNull();
  });
});

describe('STK-06 — la ROUTE passe bien par la règle', () => {
  const source = readFileSync(
    resolve(__dirname, '../../src/stocks-rest/stocks-rest.controller.ts'), 'utf-8');

  it('plus aucune branche ne convertit la quantité à la main', () => {
    // L'expression fautive, mot pour mot. Elle vivait dans QUATRE branches :
    // coopérateur, producteur, et deux fois marchand. Une seule des deux
    // routes qui écrivent `produits` avait reçu le correctif STK-01d.
    expect(source).not.toMatch(/body\.quantite\s*!=\s*null\s*\?\s*Number\(body\.quantite\)/);
  });

  it('et toutes passent par la règle partagée', () => {
    const branches = source.match(/quantiteAEcrire\(body\.quantite\)/g) ?? [];
    expect(branches.length).toBeGreaterThanOrEqual(4);
  });
});
