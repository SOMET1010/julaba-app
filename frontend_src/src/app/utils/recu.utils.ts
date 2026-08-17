// ── Reçu numérique unitaire par vente (écart CDC 8.1.2 « facture/reçu numérique ») ──
// La marchande peut PARTAGER un reçu (WhatsApp via le partage natif) ou le
// TÉLÉCHARGER en PDF, pour chaque transaction. Zéro dépendance serveur.

interface RecuTx {
  id?: string;
  montant?: number;
  produits?: Array<{ nom?: string; produit?: string; quantite?: number; prix_unitaire?: number; prix?: number }> | any;
  date?: string;
  mode_paiement?: string;
  notes?: string;
}

function numeroRecu(tx: RecuTx): string {
  const base = (tx.id || '').toString().replace(/[^a-zA-Z0-9]/g, '');
  return base ? base.slice(-6).toUpperCase() : Math.abs(Math.round((tx.montant || 0))).toString().slice(-6);
}

function lignesProduits(tx: RecuTx): string[] {
  const arr = Array.isArray(tx.produits) ? tx.produits : [];
  if (arr.length === 0) return [];
  return arr.map((p) => {
    const nom = p.nom || p.produit || 'Produit';
    const q = p.quantite != null ? p.quantite : 1;
    // Lignes voix (prix_unitaire) ET panier (prix) : même reçu pour les deux circuits.
    const pu = p.prix_unitaire ?? p.prix ?? (tx.montant || 0);
    return `${q} × ${nom} — ${Number(pu).toLocaleString('fr-FR')} F`;
  });
}

/** Texte du reçu (pour partage natif / copie). */
export function texteRecu(tx: RecuTx, marchand: string): string {
  const d = tx.date ? new Date(tx.date) : new Date();
  const dateStr = d.toLocaleDateString('fr-FR') + ' à ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const lignes = lignesProduits(tx);
  const corps = lignes.length ? '\n' + lignes.join('\n') : '';
  return [
    '🧾 REÇU — Jùlaba',
    `Vendeuse : ${marchand || 'Marchande'}`,
    `Date : ${dateStr}`,
    corps.trim() ? corps.trim() : (tx.notes ? `Article : ${tx.notes}` : ''),
    `TOTAL : ${Number(tx.montant || 0).toLocaleString('fr-FR')} FCFA`,
    tx.mode_paiement ? `Paiement : ${tx.mode_paiement}` : '',
    `Reçu n° ${numeroRecu(tx)}`,
    'Merci et à bientôt !',
  ].filter(Boolean).join('\n');
}

/** Partage le reçu via le partage natif du téléphone (WhatsApp…), sinon copie. */
export async function partagerRecu(tx: RecuTx, marchand: string): Promise<'partage' | 'copie' | 'echec'> {
  const texte = texteRecu(tx, marchand);
  try {
    const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string }) => Promise<void> };
    if (nav.share) {
      await nav.share({ title: 'Reçu Jùlaba', text: texte });
      return 'partage';
    }
  } catch (e) {
    // partage annulé par l'utilisatrice → ne pas basculer en copie
    if (e instanceof DOMException && e.name === 'AbortError') return 'echec';
  }
  try {
    await navigator.clipboard.writeText(texte);
    return 'copie';
  } catch { return 'echec'; }
}

// Le reçu PDF « à lire » a été retiré : inadapté à des utilisatrices non-lectrices
// (et sa génération figeait l'écran). Le reçu se partage désormais en texte
// (WhatsApp / SMS), lisible/écoutable par le client. Cf. partagerRecu / texteRecu.
