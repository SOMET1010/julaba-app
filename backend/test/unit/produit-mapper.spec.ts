import {
  versJulaba,
  assurerDeviseJulaba,
  deviseDe,
  estArticleCatalogue,
  DeviseOdooInattendueError,
  DEVISE_JULABA,
  OdooProductRecord,
} from '../../src/odoo-gateway/produit-mapper';

/**
 * Mapping catalogue Odoo → JULABA. Test PUR (aucune base, aucun réseau).
 *
 * Le cœur de ce fichier n'est pas la recopie de champs, c'est le garde-fou de
 * devise. `list_price` est un nombre sans unité : recopié tel quel depuis une
 * instance en USD, il produit un prix faux d'un facteur ~650 sans qu'aucune
 * erreur ne soit levée. C'est le scénario que ces tests rendent impossible.
 */

function produit(surcharge: Partial<OdooProductRecord> = {}): OdooProductRecord {
  return {
    id: 101,
    name: 'Tomate',
    list_price: 500,
    qty_available: 42,
    default_code: 'TOM-001',
    currency_id: [1, 'XOF'],
    is_storable: true,
    ...surcharge,
  };
}

describe('produit-mapper — mapping catalogue Odoo → JULABA', () => {
  it('mappe un produit en XOF vers le format JULABA', () => {
    expect(versJulaba(produit())).toEqual({
      id: 'odoo-101',
      nom: 'Tomate',
      prix: 500,
      stock: 42,
      odooProductId: 101,
      codeOdoo: 'TOM-001',
    });
  });

  it('préfixe l\'identifiant pour ne pas collisionner avec un produit marchand', () => {
    expect(versJulaba(produit({ id: 7 })).id).toBe('odoo-7');
  });

  it('accepte un produit sans référence interne', () => {
    expect(versJulaba(produit({ default_code: undefined })).codeOdoo).toBeUndefined();
  });
});

describe('produit-mapper — garde-fou de devise', () => {
  it('XOF est la seule devise acceptée', () => {
    expect(DEVISE_JULABA).toBe('XOF');
    expect(() => assurerDeviseJulaba(produit())).not.toThrow();
  });

  it('refuse un prix en USD — le cas des bases de démonstration Odoo 19', () => {
    const enUsd = produit({ currency_id: [2, 'USD'], list_price: 400 });
    expect(() => versJulaba(enUsd)).toThrow(DeviseOdooInattendueError);
  });

  it('refuse un prix en EUR', () => {
    expect(() => versJulaba(produit({ currency_id: [3, 'EUR'] }))).toThrow(DeviseOdooInattendueError);
  });

  it('refuse quand le champ currency_id n\'a pas été demandé — le silence n\'autorise rien', () => {
    expect(() => versJulaba(produit({ currency_id: undefined }))).toThrow(DeviseOdooInattendueError);
  });

  it('refuse quand currency_id est vide côté Odoo (false)', () => {
    expect(() => versJulaba(produit({ currency_id: false }))).toThrow(DeviseOdooInattendueError);
  });

  it('ne convertit JAMAIS : aucun prix n\'est produit pour une devise étrangère', () => {
    // Le test qui compte vraiment. Un mapper « tolérant » renverrait ici
    // { prix: 400 } — 400 FCFA pour un produit valant 400 USD, soit environ
    // 260 000 FCFA. Un chiffre faux présenté à une marchande.
    let resultat: unknown = 'AUCUN RESULTAT';
    try {
      resultat = versJulaba(produit({ currency_id: [2, 'USD'], list_price: 400 }));
    } catch {
      /* attendu */
    }
    expect(resultat).toBe('AUCUN RESULTAT');
  });

  it('porte la devise fautive et le produit concerné dans l\'erreur', () => {
    try {
      versJulaba(produit({ id: 55, currency_id: [2, 'USD'] }));
      throw new Error('aurait dû lever');
    } catch (e) {
      expect(e).toBeInstanceOf(DeviseOdooInattendueError);
      const err = e as DeviseOdooInattendueError;
      expect(err.devise).toBe('USD');
      expect(err.odooProductId).toBe(55);
      expect(err.message).toContain('USD');
      expect(err.message).toContain('XOF');
    }
  });

  it('distingue devise absente et devise étrangère dans le message', () => {
    const sansDevise = new DeviseOdooInattendueError(null, 12);
    expect(sansDevise.devise).toBeNull();
    expect(sansDevise.message).toContain('currency_id');

    const etrangere = new DeviseOdooInattendueError('USD', 12);
    expect(etrangere.message).toContain('Aucune conversion');
  });

  it('deviseDe extrait le code ISO, ou null quand l\'information manque', () => {
    expect(deviseDe(produit())).toBe('XOF');
    expect(deviseDe(produit({ currency_id: [2, 'USD'] }))).toBe('USD');
    expect(deviseDe(produit({ currency_id: false }))).toBeNull();
    expect(deviseDe(produit({ currency_id: undefined }))).toBeNull();
  });
});

describe('produit-mapper — estArticleCatalogue (exclusion des produits techniques)', () => {
  it('un article suivi en stock entre au catalogue', () => {
    expect(estArticleCatalogue(produit({ is_storable: true }))).toBe(true);
  });

  it("is_storable=false écarte le produit — cas réel de Tips (créé par point_of_sale)", () => {
    // Valeurs MESUREES sur l'instance Odoo 19 du POC : le vrai Tips porte
    // sale_ok=true. Un filtre fondé sur sale_ok ne l'aurait pas écarté.
    const tips = produit({
      id: 999, name: 'Tips', default_code: 'TIPS', list_price: 1,
      qty_available: 0, is_storable: false,
    });
    expect(estArticleCatalogue(tips)).toBe(false);
  });

  it("écarte quand is_storable n'a pas été demandé — le silence n'autorise rien", () => {
    // Choix symétrique du garde-fou de devise, et pour la même raison : le
    // coût des deux erreurs n'est pas le même. Un catalogue vide se voit tout
    // de suite ; un produit technique présenté comme un article à vendre ne se
    // voit pas. C'est une allowlist, assumée comme telle.
    expect(estArticleCatalogue(produit({ is_storable: undefined }))).toBe(false);
  });

  it("n'accepte que le booléen true — aucune valeur approchante ne passe", () => {
    // Odoo renvoie de vrais booléens ; ce test verrouille l'absence de
    // coercition si un jour la réponse transite par un JSON moins strict.
    for (const valeur of [1, 'true', 'oui', {}] as unknown[]) {
      expect(estArticleCatalogue(produit({ is_storable: valeur as boolean }))).toBe(false);
    }
  });
});
