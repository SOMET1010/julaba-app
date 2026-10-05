/**
 * ARG-16 — une vente avec un article libre ne doit pas échouer.
 *
 * Reproduit le 24/09 contre un PostgreSQL 16 réel, avec la requête EXACTE du
 * décrément de stock :
 *
 *   SELECT id, COALESCE(stock,0) AS stock, unite FROM produits
 *    WHERE marchand_id = $1::text AND id = $2 AND actif = true LIMIT 1 FOR UPDATE
 *   -- $2 = 'libre-abc123'
 *   ERROR:  invalid input syntax for type uuid: "libre-abc123"
 *
 * L'erreur tombait DANS la transaction de la vente : rollback, 500, et la file
 * hors-ligne rejouait la vente à l'infini. Ni l'argent ni le stock n'entraient.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { identifiantProduit } from '../../src/commun/identifiant-produit';

describe('ARG-16 — ce qu’est un identifiant de produit', () => {
  it('LE DÉFAUT EXACT : un identifiant de ligne de panier n’en est pas un', () => {
    // Les trois fabriques d'articles libres du front (POSCaisse:296,
    // vendreVocalUnifie:312, MicroVenteCaisse:211).
    expect(identifiantProduit('libre-abc123')).toBeNull();
    expect(identifiantProduit('libre-1758712345678-42')).toBeNull();
    expect(identifiantProduit('libre-' + 'x'.repeat(40))).toBeNull();
  });

  it('un vrai identifiant de catalogue passe, intact', () => {
    const uuid = 'a32d43ac-d8d3-49e3-a7b8-62bc15de59d3';
    expect(identifiantProduit(uuid)).toBe(uuid);
    expect(identifiantProduit(uuid.toUpperCase())).toBe(uuid.toUpperCase());
    expect(identifiantProduit('  ' + uuid + '  ')).toBe(uuid);
  });

  it('l’absence reste l’absence — jamais une chaîne vide envoyée en base', () => {
    expect(identifiantProduit(undefined)).toBeNull();
    expect(identifiantProduit(null)).toBeNull();
    expect(identifiantProduit('')).toBeNull();
    expect(identifiantProduit('   ')).toBeNull();
    expect(identifiantProduit(42)).toBeNull();
    expect(identifiantProduit({ id: 'x' })).toBeNull();
  });

  it('rien qui RESSEMBLE à un uuid sans en être un ne passe', () => {
    expect(identifiantProduit('a32d43ac-d8d3-49e3-a7b8-62bc15de59d')).toBeNull();   // 11 au lieu de 12
    expect(identifiantProduit('a32d43ac-d8d3-49e3-a7b8-62bc15de59d33')).toBeNull(); // 13
    expect(identifiantProduit('zzzzzzzz-d8d3-49e3-a7b8-62bc15de59d3')).toBeNull();  // hors hexadécimal
    expect(identifiantProduit('a32d43acd8d349e3a7b862bc15de59d3')).toBeNull();      // sans tirets
  });
});

describe('ARG-16 — la ROUTE de la vente passe bien par la règle', () => {
  const source = readFileSync(
    resolve(__dirname, '../../src/caisse-rest/caisse-rest.controller.ts'), 'utf-8');

  it('plus aucun identifiant du corps de requête ne part brut en base', () => {
    // L'expression fautive, mot pour mot.
    expect(source).not.toMatch(/id:\s*p\.productId\s*\|\|\s*p\.produit_id/);
  });

  it('et la ligne vendue prend son identifiant par la règle partagée', () => {
    expect(source).toMatch(/id:\s*identifiantProduit\(/);
    expect(source).toMatch(/from '\.\.\/commun\/identifiant-produit'/);
  });
});
