// pdfReport.ts - Générateur PDF générique, côté client, réutilisable pour tout
// écran JULABA qui produit un rapport "titre + KPIs + tableaux + total".
//
// Patron repris de la génération jsPDF déjà fonctionnelle dans
// RapportsIdentificateur.tsx (bandeau de marque, cartes KPI, tableau zébré,
// pied de page) mais factorisé ici pour que les autres écrans (ex: BORapports)
// n'aient pas à ré-implémenter la même mise en page à la main.
//
// Testé sans DOM via `npm run test:pdfreport` (tsx) — voir pdfReport.test.mts.

import { jsPDF } from 'jspdf';

export type RgbColor = [number, number, number];

/** Convertit une couleur hex (#RRGGBB) en triplet RGB pour jsPDF. */
export function hexToRgb(hex: string): RgbColor {
  const clean = hex.replace('#', '').trim();
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const bigint = Number.parseInt(full, 16);
  if (!Number.isFinite(bigint) || full.length !== 6) return [90, 90, 90];
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

export interface PdfKpi {
  label: string;
  value: string;
}

export interface PdfTableColumn {
  header: string;
  /** Largeur relative (mm indicatifs, redimensionnés pour tenir la page). */
  width: number;
  align?: 'left' | 'right';
}

export interface PdfTableSection {
  title: string;
  columns: PdfTableColumn[];
  rows: Array<Array<string | number>>;
  /** Ligne de total optionnelle, affichée en surbrillance. */
  totalRow?: Array<string | number>;
}

export interface BuildReportPdfOptions {
  title: string;
  subtitle?: string;
  brandColor: RgbColor;
  /** Ligne de contexte (période, région, filtre…) affichée sous l'en-tête. */
  meta?: string;
  kpis?: PdfKpi[];
  tables: PdfTableSection[];
  footerNote?: string;
}

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 20;

/**
 * Construit un document jsPDF prêt à être `.save()`, avec un vrai contenu
 * (bandeau de marque, KPIs, tableaux de données avec total) — jamais un PDF
 * vide même si les tables/KPIs passés sont vides (le titre et l'entête
 * restent toujours présents).
 */
export function buildReportPdf(opts: BuildReportPdfOptions): jsPDF {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const [r, g, b] = opts.brandColor;

  // Bandeau de marque
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, PAGE_W, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(opts.title, MARGIN, 16);
  if (opts.subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(opts.subtitle, MARGIN, 24);
  }

  let y = 42;

  if (opts.meta) {
    doc.setTextColor(90, 90, 90);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(opts.meta, MARGIN, y);
    y += 9;
  }

  if (opts.kpis?.length) {
    const cols = Math.min(4, opts.kpis.length);
    const gap = 4;
    const cardW = (PAGE_W - 2 * MARGIN - (cols - 1) * gap) / cols;
    const cardH = 20;
    opts.kpis.forEach((kpi, i) => {
      const cx = MARGIN + (i % cols) * (cardW + gap);
      const cy = y + Math.floor(i / cols) * (cardH + gap);
      doc.setFillColor(248, 247, 245);
      doc.roundedRect(cx, cy, cardW, cardH, 2, 2, 'F');
      doc.setDrawColor(r, g, b);
      doc.setLineWidth(0.4);
      doc.roundedRect(cx, cy, cardW, cardH, 2, 2, 'S');
      doc.setTextColor(r, g, b);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(String(kpi.value), cx + cardW / 2, cy + 10, { align: 'center' });
      doc.setTextColor(90, 90, 90);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.text(kpi.label, cx + cardW / 2, cy + 16, { align: 'center' });
    });
    y += Math.ceil(opts.kpis.length / cols) * (cardH + gap) + 4;
  }

  const ensureSpace = (needed: number) => {
    if (y + needed > PAGE_H - 24) {
      doc.addPage();
      y = 20;
    }
  };

  opts.tables.forEach((table) => {
    ensureSpace(20);
    doc.setTextColor(r, g, b);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(table.title, MARGIN, y);
    y += 7;

    const totalWidth = table.columns.reduce((s, c) => s + c.width, 0) || 1;
    const scale = (PAGE_W - 2 * MARGIN) / totalWidth;
    const colWidths = table.columns.map(c => c.width * scale);

    const drawRow = (values: Array<string | number>, opts2: { header?: boolean; total?: boolean }) => {
      const rowH = 6.5;
      ensureSpace(rowH + 2);
      if (opts2.header || opts2.total) {
        doc.setFillColor(r, g, b);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setTextColor(50, 50, 50);
        doc.setFont('helvetica', 'normal');
      }
      doc.setFontSize(8);
      if (!opts2.header && !opts2.total) {
        doc.setFillColor(250, 249, 247);
      }
      doc.rect(MARGIN, y - 4.5, PAGE_W - 2 * MARGIN, rowH, 'F');
      let cx = MARGIN;
      values.forEach((val, ci) => {
        const col = table.columns[ci];
        const cw = colWidths[ci] ?? 20;
        const text = String(val ?? '');
        if (col?.align === 'right') {
          doc.text(text, cx + cw - 2, y, { align: 'right' });
        } else {
          doc.text(text, cx + 2, y);
        }
        cx += cw;
      });
      y += rowH;
    };

    drawRow(table.columns.map(c => c.header), { header: true });
    table.rows.forEach((row) => drawRow(row, {}));
    if (table.totalRow) drawRow(table.totalRow, { total: true });

    y += 6;
  });

  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(opts.footerNote || 'Généré par JULABA', PAGE_W / 2, PAGE_H - 10, { align: 'center' });

  return doc;
}
