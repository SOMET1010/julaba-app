// ── Réapprovisionnement automatique selon les seuils (écart CDC 8.1.2) ──
// L'app construit toute seule la liste des produits à recommander à partir des
// seuils d'alerte configurés par produit, avec une quantité suggérée. La
// marchande peut ENVOYER cette liste à son fournisseur (partage natif / WhatsApp)
// ou la TÉLÉCHARGER en PDF. Zéro dépendance serveur, zéro API fournisseur.

export interface ReapproSource {
  produit: string;
  quantite: number;
  unite?: string;
  seuilAlerte?: number;
  prixAchat?: number;
  prixUnitaire?: number;
}

export interface LigneReappro {
  produit: string;
  unite: string;
  quantite: number;      // stock actuel
  seuil: number;         // seuil d'alerte du produit
  suggere: number;       // quantité suggérée à commander
  coutEstime: number;    // suggere × prix d'achat unitaire (0 si inconnu)
  rupture: boolean;      // quantite === 0
}

const SEUIL_DEFAUT = 5;

/**
 * Construit la liste de réapprovisionnement à partir du stock.
 * Règle : on recommande tout produit dont la quantité est ≤ son seuil.
 * Quantité suggérée = de quoi remonter à 2× le seuil (cible de sécurité),
 * avec un minimum de 1 unité. Automatique, dérivée uniquement des seuils.
 */
export function construireReappro(stock: ReapproSource[]): LigneReappro[] {
  const lignes: LigneReappro[] = [];
  for (const s of stock) {
    const seuil = s.seuilAlerte != null && s.seuilAlerte > 0 ? s.seuilAlerte : SEUIL_DEFAUT;
    const q = Number(s.quantite) || 0;
    if (q > seuil) continue; // stock suffisant → pas de réappro
    const cible = seuil * 2;
    const suggere = Math.max(1, Math.ceil(cible - q));
    const pu = Number(s.prixAchat ?? s.prixUnitaire ?? 0) || 0;
    lignes.push({
      produit: s.produit,
      unite: s.unite || 'unité',
      quantite: q,
      seuil,
      suggere,
      coutEstime: Math.round(suggere * pu),
      rupture: q === 0,
    });
  }
  // Ruptures d'abord, puis les plus proches du seuil
  return lignes.sort((a, b) => {
    if (a.rupture !== b.rupture) return a.rupture ? -1 : 1;
    return a.quantite / a.seuil - b.quantite / b.seuil;
  });
}

/** Coût total estimé de la commande (0 si aucun prix d'achat connu). */
export function coutTotalReappro(lignes: LigneReappro[]): number {
  return lignes.reduce((sum, l) => sum + (l.coutEstime || 0), 0);
}

/** Texte de la liste de réappro (pour partage natif / copie). */
export function texteReappro(lignes: LigneReappro[], marchand: string): string {
  const d = new Date();
  const dateStr = d.toLocaleDateString('fr-FR');
  const corps = lignes.map((l) => {
    const etat = l.rupture ? ' (rupture)' : '';
    return `• ${l.produit} : commander ${l.suggere} ${l.unite}${etat}`;
  });
  const cout = coutTotalReappro(lignes);
  return [
    '🛒 LISTE DE RÉAPPRO — Jùlaba',
    `Vendeuse : ${marchand || 'Marchande'}`,
    `Date : ${dateStr}`,
    '',
    ...corps,
    '',
    cout > 0 ? `Coût estimé : ${cout.toLocaleString('fr-FR')} FCFA` : '',
    'Merci !',
  ].join('\n');
}

/** Partage la liste via le partage natif (WhatsApp…), sinon copie presse-papier. */
export async function partagerReappro(
  lignes: LigneReappro[],
  marchand: string,
): Promise<'partage' | 'copie' | 'echec'> {
  const texte = texteReappro(lignes, marchand);
  try {
    const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string }) => Promise<void> };
    if (nav.share) {
      await nav.share({ title: 'Réappro Jùlaba', text: texte });
      return 'partage';
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'echec';
  }
  try {
    await navigator.clipboard.writeText(texte);
    return 'copie';
  } catch { return 'echec'; }
}

/** Génère et télécharge la liste de réappro en PDF (jsPDF, chargé à la demande). */
export async function telechargerReapproPDF(lignes: LigneReappro[], marchand: string): Promise<void> {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
  const d = new Date();
  let y = 16;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor('#C66A2C');
  doc.text('Jùlaba', 14, y); y += 8;
  doc.setFontSize(13); doc.setTextColor('#222');
  doc.text('Liste de réapprovisionnement', 14, y); y += 8;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor('#666');
  doc.text(`Vendeuse : ${marchand || 'Marchande'}`, 14, y); y += 5;
  doc.text(`Date : ${d.toLocaleDateString('fr-FR')}`, 14, y); y += 7;
  doc.setDrawColor(210); doc.line(14, y, 134, y); y += 7;

  doc.setFontSize(10); doc.setTextColor('#111');
  for (const l of lignes) {
    doc.setFont('helvetica', 'bold');
    doc.text(l.produit.slice(0, 30), 14, y);
    doc.setFont('helvetica', 'normal'); doc.setTextColor('#333');
    const detail = `commander ${l.suggere} ${l.unite}` + (l.rupture ? ' (rupture)' : ` · stock ${l.quantite}`);
    doc.text(detail, 134, y, { align: 'right' });
    doc.setTextColor('#111');
    y += 7;
    if (y > 190) { doc.addPage(); y = 16; }
  }
  const cout = coutTotalReappro(lignes);
  if (cout > 0) {
    y += 2; doc.setDrawColor(210); doc.line(14, y, 134, y); y += 7;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('Coût estimé', 14, y);
    doc.text(`${cout.toLocaleString('fr-FR')} FCFA`, 134, y, { align: 'right' });
  }
  doc.save(`reappro-julaba-${d.toISOString().slice(0, 10)}.pdf`);
}
