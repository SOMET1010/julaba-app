/**
 * LES ALERTES DE STOCK, RELUES AU STOCK D'AUJOURD'HUI — 25/09/2026.
 *
 * `NotificationsProvider` est monté AU-DESSUS de `CaisseProvider` (App.tsx) :
 * il ne peut pas connaître l'étal. Le recalcul se fait donc chez les écrans
 * qui affichent, et ce hook existe pour qu'il n'y ait QU'UNE façon de le
 * faire — sinon deux écrans rediraient la même chose de deux manières, ce que
 * ce dépôt passe son temps à fermer.
 *
 * La règle elle-même est pure et testée : `services/alerteStockVivante.ts`.
 *
 * POURQUOI LE CONTEXTE DE STOCK, ET PAS CELUI DE LA CAISSE. Une alerte de
 * STOCK se relit sur le STOCK. Le contexte de la caisse est un symbole
 * d'argent surveillé par garde-argent (« UNE caisse : tout ce qui la
 * réimplémente ailleurs est une seconde caisse ») ; l'importer ici ferait
 * entrer un écran de notification dans le chemin d'argent, pour y lire une
 * quantité. Les deux lisent la même table `produits` — autant passer par
 * celui qui dit ce qu'on cherche.
 */
import { useMemo } from 'react';
import { useStock } from '../contexts/StockContext';
import { messageAlerteStock, type ProduitVivant } from '../services/alerteStockVivante';

/** Les types de notification qui parlent du stock, et eux seuls. */
const TYPES_STOCK = new Set(['stock_faible', 'stock_rupture']);

/**
 * Rend la liste reçue, avec :
 *  · le message des alertes de stock RECONSTRUIT sur le stock actuel ;
 *  · celles devenues caduques RETIRÉES (stock remonté, produit supprimé).
 *
 * Toute notification qui ne parle pas de stock passe telle quelle.
 */
export function useAlertesVivantes<T extends { type?: string; message?: string; metadata?: unknown }>(
  notifications: readonly T[],
): T[] {
  const { stock } = useStock();
  return useMemo(() => {
    const etal: ProduitVivant[] = (stock ?? []).map((s: any) => ({
      id: String(s.id),
      nom: String(s.produit ?? ''),
      stock: Number(s.quantite ?? 0),
      unite: s.unite ?? null,
      seuilAlerte: s.seuilAlerte ?? null,
    }));
    const sortie: T[] = [];
    for (const n of notifications) {
      if (!n.type || !TYPES_STOCK.has(n.type)) { sortie.push(n); continue; }
      const meta = (n.metadata ?? {}) as { reference?: unknown; produit?: unknown };
      const texte = messageAlerteStock(meta, etal);
      // `null` = l'alerte n'a plus lieu d'être : elle se ferme d'elle-même.
      if (texte === null) continue;
      sortie.push({ ...n, message: texte });
    }
    return sortie;
  }, [notifications, stock]);
}
