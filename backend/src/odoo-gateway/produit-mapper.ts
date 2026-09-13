/**
 * Mapping pur JULABA ↔ Odoo pour le domaine catalogue/stock du POC. Aucune
 * dépendance NestJS ici — fonctions testables isolément.
 */

export interface OdooProductRecord {
  id: number;
  name: string;
  list_price: number;
  qty_available: number;
  default_code?: string;
}

export interface JulabaProduitOdoo {
  /** Identifiant côté JULABA — préfixé pour ne jamais collisionner avec un id produit marchand existant. */
  id: string;
  nom: string;
  prix: number;
  stock: number;
  odooProductId: number;
  codeOdoo?: string;
}

export function versJulaba(p: OdooProductRecord): JulabaProduitOdoo {
  return {
    id: `odoo-${p.id}`,
    nom: p.name,
    prix: p.list_price,
    stock: p.qty_available,
    odooProductId: p.id,
    codeOdoo: p.default_code,
  };
}
