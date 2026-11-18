// ── UNE SEULE SOURCE POUR LES ALERTES DE STOCK — P3 (rapport de tests du
// 17/11/2026) ────────────────────────────────────────────────────────────
//
// CE QUE LE RAPPORT A RELEVÉ : la page « Mes produits » affichait
// « 2 alertes » quand la page « Alertes » en affichait 3 (2 stock faible +
// 1 surstock). Deux compteurs construits chacun de son côté — l'un dans
// GestionStock (stock bas seulement, avec un seuil par défaut à 10),
// l'autre dans MarchandAlertes (tous types, seuil à 5) — et la marchande ne
// savait plus combien d'alertes demandent réellement son attention.
//
// LA CORRECTION DEMANDÉE : « harmoniser les compteurs ou préciser les types
// d'alertes pris en compte dans chaque affichage ». Les deux à la fois :
// UNE SEULE fonction construit la liste complète ; les deux pages lisent la
// MÊME liste et n'en choisissent que l'habillage. Les identifiants sont ceux
// que la page Alertes pose depuis toujours dans `julaba_alertes_dismissed` :
// une alerte masquée là-bas ne compte plus nulle part.
//
// LES RÈGLES ICI SONT CELLES DE LA PAGE ALERTES, au mot près :
//   • rupture : produit suivi dont la quantité vaut 0 ;
//   • stock bas : produit suivi, quantité > 0 et ≤ au SEUIL DU PRODUIT
//     (seuil_alerte configuré ; à défaut 5) ;
//   • péremption : date de péremption à ≤ 7 jours (ou dépassée) ;
//   • valeur stock élevée : une seule alerte au-delà de 500 000 FCFA
//     (quantité × prix de vente — la même formule que getValeurTotaleStock) ;
//   • surstock : une seule alerte dès qu'un produit dépasse 3× le seuil
//     par défaut (15) — la règle historique, lue sur tout le stock.
// Les urgences sont les siennes aussi : critique (rupture), haute/moyenne
// (stock bas selon la distance au seuil, péremption selon les jours),
// info (valeur, surstock).

export type TypeAlerteStock =
  | 'rupture'
  | 'stock-bas'
  | 'peremption'
  | 'valeur-elevee'
  | 'surstock';

export type UrgenceAlerteStock = 'critique' | 'haute' | 'moyenne' | 'info';

/** Ce qu'une alerte doit connaître du stock — la forme de StockItem, lue
 *  de façon structurelle pour que toute liste équivalente alimente la même
 *  liste d'alertes (GestionStock et MarchandAlertes passent TOUTES LES DEUX
 *  le `stock` du StockContext). */
export interface SourceAlerteStock {
  id: string;
  produit: string;
  quantite: number;
  unite?: string;
  seuilAlerte?: number;
  suiviStock?: boolean;
  datePeremption?: string | null;
  prixUnitaire: number;
}

/** La liste structurée — l'habillage (textes, icônes, actions) reste le
 *  travail de la page qui affiche. */
export interface AlerteStockStruct {
  id: string;
  type: TypeAlerteStock;
  urgence: UrgenceAlerteStock;
  /** Produit concerné — indéfini pour les alertes globales. */
  produit?: string;
  quantite?: number;
  unite?: string;
  seuil?: number;
  /** Péremption : jours restants (négatif = déjà périmé). */
  jours?: number;
  /** Surstock : combien de produits dépassent 3× le seuil. */
  nbProduits?: number;
  /** Valeur stock élevée : la valeur totale en FCFA. */
  valeur?: number;
}

export const SEUIL_DEFAUT_ALERTE = 5;
export const SEUIL_VALEUR_STOCK_ELEVEE = 500000;
export const JOURS_PEREMPTION_ALERTE = 7;

function seuilDe(s: SourceAlerteStock): number {
  return s.seuilAlerte != null && s.seuilAlerte > 0 ? s.seuilAlerte : SEUIL_DEFAUT_ALERTE;
}

export function construireAlertesStock(stock: SourceAlerteStock[]): AlerteStockStruct[] {
  const items: AlerteStockStruct[] = [];

  // Produits SUIVIS seulement pour rupture et stock bas — une quantité non
  // renseignée n'est pas un stock à zéro (même règle que getStockFaible).
  const suivis = stock.filter((s) => s.suiviStock !== false);

  // Ruptures (quantité = 0)
  suivis
    .filter((s) => (Number(s.quantite) || 0) === 0)
    .forEach((s) => {
      items.push({
        id: `rupture-${s.id}`,
        type: 'rupture',
        urgence: 'critique',
        produit: s.produit,
        quantite: 0,
        unite: s.unite,
      });
    });

  // Stock bas (quantité > 0 et ≤ seuil du produit)
  suivis
    .filter((s) => {
      const q = Number(s.quantite) || 0;
      return q > 0 && q <= seuilDe(s);
    })
    .forEach((s) => {
      const q = Number(s.quantite) || 0;
      const seuil = seuilDe(s);
      const pct = seuil > 0 ? Math.round((q / seuil) * 100) : 100;
      items.push({
        id: `stock-bas-${s.id}`,
        type: 'stock-bas',
        urgence: pct < 50 ? 'haute' : 'moyenne',
        produit: s.produit,
        quantite: q,
        unite: s.unite,
        seuil,
      });
    });

  // Péremption : ≤ 7 jours ou déjà périmée — lue sur tout le stock, comme
  // la page Alertes l'a toujours fait.
  const auj = new Date();
  auj.setHours(0, 0, 0, 0);
  stock.forEach((s) => {
    if (!s.datePeremption) return;
    const dp = new Date(s.datePeremption);
    if (isNaN(dp.getTime())) return;
    const jours = Math.ceil((dp.getTime() - auj.getTime()) / 86400000);
    if (jours > JOURS_PEREMPTION_ALERTE) return;
    items.push({
      id: `peremption-${s.id}`,
      type: 'peremption',
      urgence: jours < 0 || jours <= 2 ? 'haute' : 'moyenne',
      produit: s.produit,
      jours,
    });
  });

  // Valeur stock élevée — UNE alerte, la formule de getValeurTotaleStock.
  const valeurTotale = stock.reduce(
    (sum, s) => sum + (Number(s.quantite) || 0) * (Number(s.prixUnitaire) || 0),
    0,
  );
  if (valeurTotale > SEUIL_VALEUR_STOCK_ELEVEE) {
    items.push({
      id: 'stock-valeur-elevee',
      type: 'valeur-elevee',
      urgence: 'info',
      valeur: valeurTotale,
    });
  }

  // Surstock — UNE alerte dès qu'un produit dépasse 3× le seuil par défaut
  // (la règle historique de la page Alertes : quantité > 15).
  const nbSurstock = stock.filter(
    (s) => (Number(s.quantite) || 0) > SEUIL_DEFAUT_ALERTE * 3,
  ).length;
  if (nbSurstock > 0) {
    items.push({
      id: 'surstock',
      type: 'surstock',
      urgence: 'info',
      nbProduits: nbSurstock,
    });
  }

  return items;
}

/** Les identifiants d'alertes masquées par la marchande — la même clé que la
 *  page Alertes (`julaba_alertes_dismissed`), lue à chaque montage : deux
 *  pages qui comptent les alertes doivent ignorer les MÊMES alertes. */
export function lireAlertesMasquees(): Set<string> {
  try {
    const stored = localStorage.getItem('julaba_alertes_dismissed');
    return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
  } catch {
    return new Set();
  }
}
