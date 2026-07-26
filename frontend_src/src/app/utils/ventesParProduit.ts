/**
 * Ventile les ventes PAR PRODUIT à partir des lignes du panier (`details`).
 *
 * Problème corrigé : une vente à plusieurs articles était stockée comme UNE
 * transaction avec `quantity = 1` et un nom concaténé (« Riz, Tomate »). Les
 * classements « produit star » / « quantité vendue » comptaient donc 1 vente
 * d'un pseudo-produit inexistant au lieu des vraies quantités par produit.
 *
 * Ici on lit les lignes `details` = [{ nom, quantite, prix, total }] pour
 * attribuer correctement quantités et montants à CHAQUE produit. Repli sur le
 * niveau transaction quand `details` est absent (vente vocale, ancienne donnée)
 * -> aucune régression.
 */
export interface VenteProduit {
  productName: string;
  quantity: number;
  total: number;
}

function parseDetails(d: unknown): any[] | null {
  if (!d) return null;
  if (Array.isArray(d)) return d;
  if (typeof d === 'string') {
    try {
      const p = JSON.parse(d);
      return Array.isArray(p) ? p : null;
    } catch {
      return null;
    }
  }
  return null;
}

export function agregerVentesParProduit(transactions: any[]): VenteProduit[] {
  const map = new Map<string, VenteProduit>();
  const ajouter = (nom: string, quantity: number, total: number) => {
    const cle = nom;
    const cur = map.get(cle) || { productName: nom, quantity: 0, total: 0 };
    cur.quantity += quantity;
    cur.total += total;
    map.set(cle, cur);
  };

  for (const t of transactions || []) {
    if (t?.type !== 'vente') continue;
    const lignes = parseDetails(t.details);
    if (lignes && lignes.length) {
      for (const l of lignes) {
        const nom = String(l.nom || l.name || t.productName || t.produit || 'Article');
        const q = Number(l.quantite ?? l.quantity ?? 1) || 1;
        const total = Number(l.total ?? (Number(l.prix ?? l.price ?? 0) * q)) || 0;
        ajouter(nom, q, total);
      }
    } else {
      const nom = String(t.productName || t.produit || 'Article');
      const q = Number(t.quantity ?? t.quantite ?? 1) || 1;
      const total = Number(t.montant ?? (Number(t.price ?? 0) * q)) || 0;
      ajouter(nom, q, total);
    }
  }

  return [...map.values()].sort((a, b) => b.total - a.total);
}
