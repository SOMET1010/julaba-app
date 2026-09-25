/**
 * STK-21 — un produit entre dans l'étal avec un nom et une unité.
 *
 * Agent de test du 25/09 : un produit nommé « A », 0 kg, en rupture. Une
 * dictée mal comprise, entrée telle quelle dans l'étal de la marchande.
 * `POST /caisse/produits` n'exigeait rien.
 *
 * Arbitrage de Patrick : « un nom d'au moins 2 caractères et une unité
 * obligatoire, pour éviter que ça se reproduise en production. »
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { nomDeProduitSaisi, uniteDeProduitSaisie } from '../../src/commun/produit-saisi';

describe('STK-21 — ce qu’un produit doit porter', () => {
  it('LE DÉFAUT EXACT : « A » n’est pas un nom de produit', () => {
    expect(() => nomDeProduitSaisi('A')).toThrow();
    expect(() => nomDeProduitSaisi('a')).toThrow();
  });

  it('ni le vide, ni les espaces, ni l’absence', () => {
    expect(() => nomDeProduitSaisi('')).toThrow();
    expect(() => nomDeProduitSaisi('   ')).toThrow();
    expect(() => nomDeProduitSaisi(undefined)).toThrow();
    expect(() => nomDeProduitSaisi(null)).toThrow();
  });

  it('mais un vrai nom du marché passe, même court', () => {
    expect(nomDeProduitSaisi('riz')).toBe('riz');
    expect(nomDeProduitSaisi('ka')).toBe('ka');
    expect(nomDeProduitSaisi('  gombo  ')).toBe('gombo');
    expect(nomDeProduitSaisi('attiéké')).toBe('attiéké');
  });

  it('l’unité est OBLIGATOIRE — sans elle, une quantité ne veut rien dire', () => {
    expect(() => uniteDeProduitSaisie('')).toThrow();
    expect(() => uniteDeProduitSaisie('   ')).toThrow();
    expect(() => uniteDeProduitSaisie(undefined)).toThrow();
    expect(() => uniteDeProduitSaisie(null)).toThrow();
  });

  it('et les unités du marché passent', () => {
    for (const u of ['tas', 'kg', 'unité', 'sac', 'bassine', 'cuvette', 'régime']) {
      expect(uniteDeProduitSaisie(u)).toBe(u);
    }
    expect(uniteDeProduitSaisie('  tas  ')).toBe('tas');
  });

  it('les refus se disent à la marchande, pas en jargon', () => {
    // Elle ne lit pas : ces phrases sont faites pour être DITES.
    expect(() => nomDeProduitSaisi('A')).toThrow(/nom du produit est trop court/i);
    expect(() => uniteDeProduitSaisie('')).toThrow(/au tas, au kilo/i);
  });
});

describe('STK-21 — la ROUTE passe bien par la règle', () => {
  const source = readFileSync(
    resolve(__dirname, '../../src/caisse-rest/caisse-rest.controller.ts'), 'utf-8');

  it('plus aucune unité fabriquée à la création', () => {
    // L'expression fautive, mot pour mot : elle inventait « unité ».
    expect(source).not.toMatch(/body\.unite \|\| 'unité'/);
  });

  it('et la création passe par les deux règles partagées', () => {
    expect(source).toMatch(/nomDeProduitSaisi\(body\.nom\)/);
    expect(source).toMatch(/uniteDeProduitSaisie\(body\.unite\)/);
  });
});
