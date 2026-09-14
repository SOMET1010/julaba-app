/**
 * Mapping pur JULABA ↔ Odoo pour le domaine catalogue/stock du POC. Aucune
 * dépendance NestJS ici — fonctions testables isolément.
 */

/** Devise de référence JULABA. Le franc CFA est la seule devise dans laquelle
 *  une marchande compte : tout montant présenté dans l'application est en XOF,
 *  sans exception et sans conversion implicite. */
export const DEVISE_JULABA = 'XOF';

/** Forme d'un many2one lu via `search_read`/`read` : `[id, display_name]`,
 *  ou `false` quand le champ est vide. Pour `res.currency`, `display_name`
 *  vaut le code ISO (« XOF », « USD »). */
export type OdooMany2One = [number, string] | false;

export interface OdooProductRecord {
  id: number;
  name: string;
  list_price: number;
  qty_available: number;
  default_code?: string;
  /** OBLIGATOIRE à l'usage : sans ce champ, `list_price` est un nombre sans
   *  unité et `versJulaba` refuse de le mapper. Voir `assurerDeviseJulaba`. */
  currency_id?: OdooMany2One;
  /** Champ Odoo 19 « Suivi en stock ». OBLIGATOIRE à l'usage : c'est lui qui
   *  distingue un article réel d'un produit technique de module, et c'est lui
   *  qui rend `qty_available` signifiant. Absent/`undefined` = produit écarté
   *  (voir `estArticleCatalogue`). */
  is_storable?: boolean;
}

export interface JulabaProduitOdoo {
  /** Identifiant côté JULABA — préfixé pour ne jamais collisionner avec un id produit marchand existant. */
  id: string;
  nom: string;
  /** En XOF, garanti par `assurerDeviseJulaba`. */
  prix: number;
  stock: number;
  odooProductId: number;
  codeOdoo?: string;
}

/**
 * Refus de mapper un produit dont le prix n'est pas exprimé en XOF.
 *
 * `devise` vaut `null` quand l'information est absente — champ non demandé
 * dans le `search_read`, ou `currency_id` vide côté Odoo.
 */
export class DeviseOdooInattendueError extends Error {
  constructor(
    public readonly devise: string | null,
    public readonly odooProductId: number,
  ) {
    super(
      devise === null
        ? `Produit Odoo ${odooProductId} : devise inconnue (champ "currency_id" absent ou vide). ` +
            `Le prix ne peut pas être interprété — demander "currency_id" dans le search_read.`
        : `Produit Odoo ${odooProductId} : prix libellé en ${devise}, or JULABA n'affiche que des montants ` +
            `en ${DEVISE_JULABA}. Aucune conversion n'est appliquée : un prix converti à la volée serait ` +
            `un chiffre inventé.`,
    );
    this.name = 'DeviseOdooInattendueError';
  }
}

/** Code ISO de la devise d'un produit, ou `null` si l'information manque. */
export function deviseDe(p: OdooProductRecord): string | null {
  return Array.isArray(p.currency_id) ? p.currency_id[1] : null;
}

/**
 * Garde-fou de devise — la raison d'être de ce module autant que le mapping
 * lui-même.
 *
 * `list_price` est un nombre nu : Odoo ne l'accompagne d'aucune unité. Recopié
 * tel quel, un produit à `400.00` sur une instance en USD s'affiche « 400 FCFA »
 * dans JULABA alors qu'il en vaut environ 260 000. L'erreur est invisible —
 * aucune exception, aucun avertissement, juste un chiffre faux sous les yeux
 * d'une marchande. Les bases de démonstration d'Odoo 19 sont précisément en USD,
 * ce qui rend le piège très facile à rencontrer.
 *
 * Deux choix explicites ici :
 *
 * - **Refuser plutôt que convertir.** Une conversion demanderait un taux, donc
 *   une source de taux, sa fraîcheur et sa panne : autant de façons de produire
 *   un chiffre faux avec l'air d'être juste. Pas de prix vaut mieux qu'un faux
 *   prix (CONSTITUTION, principe 8).
 * - **Refuser aussi quand la devise est inconnue.** Un `currency_id` non demandé
 *   ne prouve pas que l'instance est en XOF ; il prouve seulement qu'on n'a pas
 *   regardé. Le silence n'est pas une autorisation.
 *
 * @throws DeviseOdooInattendueError si la devise n'est pas XOF, ou est absente.
 */
export function assurerDeviseJulaba(p: OdooProductRecord): void {
  const devise = deviseDe(p);
  if (devise !== DEVISE_JULABA) {
    throw new DeviseOdooInattendueError(devise, p.id);
  }
}

/**
 * Filtre catalogue — écarte les produits TECHNIQUES qu'un module Odoo crée
 * pour son propre usage interne (ex. `Tips`, injecté par `point_of_sale`,
 * jamais un article qu'une marchande vend), avant tout mapping vers JULABA.
 *
 * Critère retenu : `is_storable`, et lui seul. Il a été MESURÉ sur l'instance
 * Odoo 19 du POC (`product.product/search_read` en lecture seule, juillet
 * 2025), et c'est le seul champ qui sépare réellement les deux populations :
 *
 *     champ         Tips        les 7 vivriers seedés
 *     sale_ok       true        true        → ne discrimine PAS
 *     type          'consu'     'consu'     → ne discrimine PAS
 *     is_storable   false       true        → discrimine
 *
 * Le critère précédent — `sale_ok !== false` — était une hypothèse jamais
 * vérifiée, et la mesure l'a réfutée : le vrai `Tips` porte `sale_ok: true`.
 * Le filtre laissait donc passer exactement le produit qu'il prétendait
 * écarter. Deux autres critères avaient été envisagés et écartés : une
 * catégorie Odoo (dépend de la configuration de l'instance, jamais garantie)
 * et une convention de référence `JULABA-*` (ne vaut que pour un catalogue
 * provisionné PAR JULABA — un vrai catalogue Odoo d'un fournisseur existant
 * n'a aucune raison de la connaître).
 *
 * `undefined` (champ non demandé, ou absent d'un enregistrement) écarte le
 * produit — même discipline que le garde-fou de devise : le silence n'est pas
 * une autorisation. Le coût des deux erreurs n'est pas symétrique. Un
 * catalogue vide est bruyant et inoffensif : on le voit tout de suite. Un
 * produit technique laissé passer est silencieux et faux : il s'affiche à une
 * marchande comme un article à vendre. Et `JulabaProduitOdoo` porte un champ
 * `stock` : un produit non suivi en stock n'a pas de `qty_available` qui
 * veuille dire quelque chose — il n'a rien à faire dans ce format.
 */
export function estArticleCatalogue(p: OdooProductRecord): boolean {
  return p.is_storable === true;
}

export function versJulaba(p: OdooProductRecord): JulabaProduitOdoo {
  assurerDeviseJulaba(p);
  return {
    id: `odoo-${p.id}`,
    nom: p.name,
    prix: p.list_price,
    stock: p.qty_available,
    odooProductId: p.id,
    codeOdoo: p.default_code,
  };
}
