/**
 * JULABA — Mouvements de stock (fiche produit / accueil stock)
 *
 * Formatage PUR des mouvements renvoyés par l'API (`GET /stocks/mouvements` et
 * `GET /stocks/:id/mouvements`) vers la forme d'affichage. Le SIGNE de la
 * quantité est déjà calculé et testé côté backend (mouvement-mapper) : ici on
 * ne fait que formater (libellé de jour, valeurs par défaut). Aucune invention
 * de donnée — fini le mock « stocks.slice(0,3) ».
 */

export interface MouvementApi {
  id: string;
  type: string;
  /** Delta de stock SIGNÉ (négatif = sorti/vente, positif = rentré/annulation). */
  quantite: number;
  /** Ce qui est réellement sorti (ou rentré), même si le stock ne le couvrait pas. */
  quantite_affichee?: number;
  /** Ce que le stock enregistré ne couvrait pas. */
  manquant?: number;
  /** Vrai quand le stock ne couvrait pas la sortie. */
  hors_stock?: boolean;
  produit_nom: string | null;
  unite: string | null;
  date: string;
}

export interface MouvementUI {
  id: string;
  type: string;
  /** Signe du mouvement : négatif = sorti, positif = rentré. Porte la COULEUR. */
  qty: number;
  /**
   * Le NOMBRE affiché, toujours positif — ce qui est sorti de la boutique.
   *
   * Une vente de 4 kg faite sur un stock à zéro reste une vente de 4 kg. Avant
   * le 19/09/2026 elle n'apparaissait pas du tout (le backend la filtrait), et
   * la marchande ne pouvait pas savoir ce qu'elle avait écoulé.
   */
  qtyAffichee: number;
  /** Le stock enregistré ne couvrait pas cette sortie — l'écran doit le DIRE. */
  horsStock: boolean;
  name: string;
  unit: string;
  day: string;
}

/** Libellé de jour relatif, en heure LOCALE de l'appareil (affichage seul). */
export function jourLabel(iso: string, now: Date = new Date()): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const jour = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((jour(now) - jour(d)) / 86400000);
  if (diff <= 0) return "aujourd'hui";
  if (diff === 1) return 'hier';
  if (diff < 7) return `il y a ${diff} jours`;
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function mapApiMouvements(rows: MouvementApi[] | null | undefined, now: Date = new Date()): MouvementUI[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((m) => ({
    id: m.id,
    type: m.type || 'vente',
    qty: Number(m.quantite) || 0,
    // Repli sur |quantite| pour les réponses d'un backend plus ancien : mieux
    // vaut l'ancien affichage qu'un zéro fabriqué.
    qtyAffichee: Math.abs(Number(m.quantite_affichee ?? m.quantite) || 0),
    horsStock: m.hors_stock === true || (Number(m.manquant) || 0) > 0,
    name: m.produit_nom || '',
    unit: m.unite || '',
    day: jourLabel(m.date, now),
  }));
}
