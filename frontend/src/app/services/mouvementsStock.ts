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
  produit_nom: string | null;
  unite: string | null;
  date: string;
}

export interface MouvementUI {
  id: string;
  type: string;
  qty: number;
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
    name: m.produit_nom || '',
    unit: m.unite || '',
    day: jourLabel(m.date, now),
  }));
}
