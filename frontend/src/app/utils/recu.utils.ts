// ── Reçu numérique unitaire par vente (écart CDC 8.1.2 « facture/reçu numérique ») ──
// La marchande peut PARTAGER un reçu (WhatsApp via le partage natif) ou le
// TÉLÉCHARGER en PDF, pour chaque transaction. Zéro dépendance serveur.

interface RecuTx {
  id?: string;
  montant?: number;
  produits?: Array<{ nom?: string; produit?: string; quantite?: number; prix_unitaire?: number }> | any;
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
    const pu = p.prix_unitaire != null ? p.prix_unitaire : (tx.montant || 0);
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

/** Génère et télécharge le reçu en PDF (jsPDF, chargé à la demande). */
export async function telechargerRecuPDF(tx: RecuTx, marchand: string): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: [80, 120] }); // format ticket
  const d = tx.date ? new Date(tx.date) : new Date();
  let y = 12;
  const line = (txt: string, size = 9, bold = false, color = '#222') => {
    doc.setFontSize(size); doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setTextColor(color);
    doc.text(txt, 40, y, { align: 'center' }); y += size * 0.5 + 2.5;
  };
  line('Jùlaba', 16, true, '#C66A2C');
  line('REÇU', 10, true);
  y += 1; doc.setDrawColor(200); doc.line(8, y, 72, y); y += 5;
  doc.setFont('helvetica', 'normal');
  const left = (label: string, val: string, bold = false) => {
    doc.setFontSize(8); doc.setTextColor('#666'); doc.text(label, 8, y);
    doc.setTextColor('#111'); doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(val, 72, y, { align: 'right' }); doc.setFont('helvetica', 'normal'); y += 5;
  };
  left('Vendeuse', (marchand || 'Marchande').slice(0, 22));
  left('Date', d.toLocaleDateString('fr-FR'));
  left('Heure', d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }));
  for (const l of lignesProduits(tx)) { doc.setFontSize(8); doc.setTextColor('#333'); doc.text(l.slice(0, 34), 8, y); y += 4.5; }
  y += 1; doc.line(8, y, 72, y); y += 6;
  left('TOTAL', `${Number(tx.montant || 0).toLocaleString('fr-FR')} FCFA`, true);
  left('Reçu n°', numeroRecu(tx));
  y += 3; line('Merci et à bientôt !', 8, false, '#C66A2C');
  doc.save(`recu-julaba-${numeroRecu(tx)}.pdf`);
}
