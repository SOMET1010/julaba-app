import { BadRequestException, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class TransactionsExportService {
  private readonly logger = new Logger(TransactionsExportService.name);

  async generate(format: string, data: any[]): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

    switch (format) {
      case 'csv':
        return this.generateCsv(data, timestamp);
      case 'xlsx':
        return this.generateXlsx(data, timestamp);
      case 'pdf':
        return this.generatePdf(data, timestamp);
      default:
        throw new BadRequestException(`Format non supporté : ${format}`);
    }
  }

  private async generateCsv(data: any[], timestamp: string): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    const headers = ['ID', 'Acteur', 'Rôle', 'Produit', 'Montant FCFA', 'Statut', 'Motif', 'Région', 'Commune', 'Date'];
    const rows = data.map(t => [
      t.id,
      t.acteur_nom || '',
      t.acteur_role || '',
      t.produit || t.description || '',
      t.montant || 0,
      t.statut || '',
      t.motif || '',
      t.acteur_region || '',
      t.acteur_commune || '',
      t.created_at ? new Date(t.created_at).toISOString() : '',
    ]);

    const bom = '\uFEFF';
    const csv = bom + [headers, ...rows].map(row =>
      row.map(cell => {
        const str = String(cell ?? '');
        return str.includes(',') || str.includes('"') || str.includes('\n')
          ? `"${str.replace(/"/g, '""')}"`
          : str;
      }).join(','),
    ).join('\n');

    return {
      buffer: Buffer.from(csv, 'utf-8'),
      mimeType: 'text/csv; charset=utf-8',
      filename: `transactions-${timestamp}.csv`,
    };
  }

  private async generateXlsx(data: any[], timestamp: string): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'JULABA Backoffice';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Transactions');
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Acteur', key: 'acteur_nom', width: 25 },
      { header: 'Rôle', key: 'acteur_role', width: 15 },
      { header: 'Produit', key: 'produit', width: 20 },
      { header: 'Montant FCFA', key: 'montant', width: 15 },
      { header: 'Statut', key: 'statut', width: 12 },
      { header: 'Motif', key: 'motif', width: 30 },
      { header: 'Région', key: 'region', width: 15 },
      { header: 'Commune', key: 'commune', width: 15 },
      { header: 'Date', key: 'created_at', width: 20 },
    ];

    data.forEach(t => {
      worksheet.addRow({
        id: t.id,
        acteur_nom: t.acteur_nom || '',
        acteur_role: t.acteur_role || '',
        produit: t.produit || t.description || '',
        montant: t.montant || 0,
        statut: t.statut || '',
        motif: t.motif || '',
        region: t.acteur_region || '',
        commune: t.acteur_commune || '',
        created_at: t.created_at ? new Date(t.created_at).toLocaleString('fr-FR') : '',
      });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF5F3EF' },
    };

    const buffer = await workbook.xlsx.writeBuffer();
    return {
      buffer: Buffer.from(buffer),
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `transactions-${timestamp}.xlsx`,
    };
  }

  private async generatePdf(data: any[], timestamp: string): Promise<{ buffer: Buffer; mimeType: string; filename: string }> {
    const PDFDocument = require('pdfkit');

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => {
          resolve({
            buffer: Buffer.concat(chunks),
            mimeType: 'application/pdf',
            filename: `transactions-${timestamp}.pdf`,
          });
        });

        doc.fontSize(16).fillColor('#5B5248').text('JULABA - Export Transactions', { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(10).fillColor('#6B7280').text(`Généré le ${new Date().toLocaleString('fr-FR')}`, { align: 'center' });
        doc.moveDown(0.3);
        doc.fontSize(10).text(`${data.length} transaction(s)`, { align: 'center' });
        doc.moveDown(1);

        const colWidths = [80, 130, 80, 80, 80, 90, 100];
        const headers = ['Date', 'Acteur', 'Produit', 'Montant', 'Statut', 'Région', 'Motif'];
        let yPos = doc.y;

        doc.fontSize(9).fillColor('#1F1F1F');
        let xPos = 30;
        headers.forEach((header, index) => {
          doc.fillColor('#5B5248').text(header, xPos, yPos, { width: colWidths[index], align: 'left' });
          xPos += colWidths[index];
        });

        yPos += 18;
        doc.moveTo(30, yPos).lineTo(770, yPos).stroke('#D7CFC0');
        yPos += 6;

        data.forEach(t => {
          if (yPos > 540) {
            doc.addPage({ size: 'A4', layout: 'landscape', margin: 30 });
            yPos = 50;
          }

          xPos = 30;
          const rowData = [
            t.created_at ? new Date(t.created_at).toLocaleDateString('fr-FR') : '',
            t.acteur_nom || '',
            t.produit || t.description || '',
            `${t.montant || 0} FCFA`,
            t.statut || '',
            t.acteur_region || '',
            t.motif ? (t.motif.length > 30 ? `${t.motif.substring(0, 30)}...` : t.motif) : '',
          ];

          rowData.forEach((value, index) => {
            doc.fillColor('#1F1F1F').text(String(value), xPos, yPos, { width: colWidths[index], align: 'left' });
            xPos += colWidths[index];
          });

          yPos += 16;
        });

        doc.end();
      } catch (error) {
        this.logger.error('Export PDF transactions échoué', error instanceof Error ? error.stack : String(error));
        reject(error);
      }
    });
  }
}
