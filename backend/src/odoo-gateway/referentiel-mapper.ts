/**
 * Mapping du RÉFÉRENTIEL MAÎTRE Odoo → JULABA. Fonctions pures, aucune
 * dépendance NestJS.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  Odoo définit ce qu'EST le produit.                                  │
 * │  JULABA définit COMMENT cette marchande le vend.                     │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Ce module ne transporte donc NI PRIX NI STOCK, et c'est délibéré :
 *
 * - le prix se négocie au marché, il appartient à la marchande, jamais au
 *   référentiel. Les 198 références maîtres sont à `list_price = 0` par
 *   construction (voir infra/odoo-poc/scripts/seed_catalogue_maitre.py) ;
 * - un stock partagé n'aurait aucun sens : le stock est celui d'UNE
 *   marchande, dans SON magasin.
 *
 * Conséquence recherchée : **une référence maître ne peut pas être vendue**.
 * Il n'existe aucun chemin par lequel un « 0 » de ce référentiel deviendrait
 * un prix affiché à une cliente, parce qu'aucun prix ne traverse cette
 * frontière. Ce n'est pas un garde-fou qu'on pourrait oublier d'appeler,
 * c'est une absence de champ.
 *
 * Contrairement à `produit-mapper.ts`, il n'y a donc ici aucun garde-fou de
 * devise : `assurerDeviseJulaba` protège un MONTANT, et il n'y a pas de
 * montant à protéger. Ajouter un prix à ce mapper exigerait de rétablir ce
 * garde-fou — et de rouvrir la question d'un prix commun à toutes les
 * marchandes, ce que ce lot tranche par la négative.
 */

import { OdooMany2One } from './produit-mapper';

/** Enregistrement Odoo tel que lu par `product.product/search_read`, réduit
 *  aux seuls champs d'IDENTITÉ du produit. */
export interface OdooReferentielRecord {
  id: number;
  name: string;
  /** Référence stable JULABA (`VIV-TUB-001`…). Odoo renvoie `false` quand le
   *  champ est vide — un produit sans référence n'entre pas au référentiel. */
  default_code?: string | false;
  /** Many2one : `[id, "JULABA / Famille / Sous-famille"]`. */
  categ_id?: OdooMany2One;
  active?: boolean;
  /** Même critère que le catalogue (voir `estArticleCatalogue`) : seul un
   *  produit suivi en stock est un article réel, pas un produit technique de
   *  module. */
  is_storable?: boolean;
}

/** Une référence du référentiel maître, côté JULABA. Aucun prix, aucun stock. */
export interface ReferenceMaitre {
  /** Clé stable et lisible. C'est ELLE qui relie une référence maître au
   *  produit d'une marchande (`produits.default_code`), jamais l'identifiant
   *  technique Odoo, qui changerait si la base était reconstruite. */
  defaultCode: string;
  nom: string;
  /** Chemin de catégorie tel qu'Odoo l'affiche, ou `null`. */
  categorie: string | null;
  odooProductId: number;
  actif: boolean;
}

/** Catégorie lisible d'un enregistrement, ou `null` si l'information manque. */
export function categorieDe(r: OdooReferentielRecord): string | null {
  return Array.isArray(r.categ_id) ? r.categ_id[1] : null;
}

/**
 * Un enregistrement Odoo entre-t-il au référentiel maître ?
 *
 * Deux conditions, toutes deux nécessaires :
 *
 * - une `default_code` non vide. Sans référence stable, une ligne ne peut
 *   être ni retrouvée au rafraîchissement suivant, ni adoptée, ni reliée à un
 *   produit marchand. Une ligne sans clé n'est pas un référentiel, c'est du
 *   bruit ;
 * - `is_storable === true`, strictement. Même critère et même discipline que
 *   `estArticleCatalogue` : le silence n'autorise rien, et c'est ce champ —
 *   mesuré sur l'instance Odoo 19 — qui sépare un article réel d'un produit
 *   technique de module (`Tips` porte `sale_ok: true` mais
 *   `is_storable: false`).
 */
export function estReferenceMaitre(r: OdooReferentielRecord): boolean {
  const code = typeof r.default_code === 'string' ? r.default_code.trim() : '';
  return code.length > 0 && r.is_storable === true;
}

/**
 * Projette un enregistrement Odoo en référence maître.
 *
 * `active` absent est traité comme actif : Odoo ne renvoie les archivés que
 * si on les demande explicitement (`active_test`), donc un enregistrement
 * présent dans une lecture ordinaire est actif. Ici le silence dit quelque
 * chose, contrairement à `is_storable` où il ne dit rien.
 *
 * @throws Error si l'enregistrement n'a pas sa place au référentiel — appeler
 *   `estReferenceMaitre` avant, comme le fait le service de synchronisation.
 */
export function versReferenceMaitre(r: OdooReferentielRecord): ReferenceMaitre {
  if (!estReferenceMaitre(r)) {
    throw new Error(
      `Produit Odoo ${r.id} ("${r.name}") hors référentiel maître : ` +
        `default_code=${JSON.stringify(r.default_code)}, is_storable=${JSON.stringify(r.is_storable)}.`,
    );
  }
  return {
    defaultCode: (r.default_code as string).trim(),
    nom: r.name,
    categorie: categorieDe(r),
    odooProductId: r.id,
    actif: r.active !== false,
  };
}

/** Champs demandés à Odoo. Exactement ceux que consomme ce mapper — aucun
 *  champ de prix n'y figure, et c'est le point. */
export const CHAMPS_REFERENTIEL = ['id', 'name', 'default_code', 'categ_id', 'active', 'is_storable'];
