/**
 * Utilitaires Export CSV/PDF - JÙLABA
 * Fonctions pour exporter les données analytics et tableaux
 */

// ============================================================================
// EXPORT CSV
// ============================================================================

/**
 * Convertir données en CSV et télécharger
 */
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: { key: keyof T; label: string }[]
) {
  if (data.length === 0) {
    return;
  }

  // Déterminer colonnes automatiquement si non fournies
  const cols = columns || Object.keys(data[0]).map(key => ({
    key: key as keyof T,
    label: key,
  }));

  // Générer header CSV
  const header = cols.map(col => col.label).join(',');

  // Générer lignes CSV
  const rows = data.map(item => {
    return cols.map(col => {
      const value = item[col.key];
      
      // Échapper les valeurs contenant des virgules ou guillemets
      if (value === null || value === undefined) {
        return '';
      }
      
      const stringValue = String(value);
      
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    }).join(',');
  });

  // Combiner header + rows
  const csv = [header, ...rows].join('\n');

  // Télécharger
  downloadFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8;');
}

// ============================================================================
// EXPORT PDF (Simple - Text-based)
// ============================================================================

/**
 * Générer PDF simple (texte uniquement, sans dépendances lourdes)
 * Pour PDF avancés avec graphiques, utiliser jspdf + html2canvas
 */
export function exportSimplePDF(
  title: string,
  data: { label: string; value: string | number }[],
  filename: string
) {
  // Générer contenu HTML simple
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      color: #712864;
      border-bottom: 3px solid #712864;
      padding-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 12px;
      text-align: left;
    }
    th {
      background-color: #712864;
      color: white;
    }
    tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <table>
    <thead>
      <tr>
        <th>Indicateur</th>
        <th>Valeur</th>
      </tr>
    </thead>
    <tbody>
      ${data.map(item => `
        <tr>
          <td><strong>${item.label}</strong></td>
          <td>${item.value}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <div class="footer">
    <p>Document généré le ${new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })}</p>
    <p><strong>JÙLABA</strong> - Plateforme Nationale d'Inclusion Économique des Acteurs Vivriers</p>
  </div>
</body>
</html>
  `;

  // Ouvrir dans nouvelle fenêtre et déclencher impression
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    
    // Attendre chargement puis imprimer
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

// ============================================================================
// EXPORT PDF AVANCÉ (avec graphiques)
// ============================================================================

/**
 * Exporter une page complète en PDF (capture HTML → PDF)
 * Nécessite installation de jspdf et html2canvas
 */
export async function exportPageToPDF(
  elementId: string,
  filename: string,
  options?: {
    orientation?: 'portrait' | 'landscape';
    format?: 'a4' | 'letter';
  }
) {
  try {
    // Import dynamique pour éviter de charger les libs si non utilisé
    const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
      import('jspdf'),
      import('html2canvas'),
    ]);

    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element avec id "${elementId}" non trouvé`);
    }

    // Capturer l'élément HTML en canvas
    const canvas = await html2canvas(element, {
      scale: 2, // Haute qualité
      useCORS: true,
      logging: false,
    });

    // Convertir canvas en image
    const imgData = canvas.toDataURL('image/png');

    // Créer PDF
    const pdf = new jsPDF({
      orientation: options?.orientation || 'portrait',
      unit: 'mm',
      format: options?.format || 'a4',
    });

    // Calculer dimensions pour ajuster image au PDF
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

    const scaledWidth = imgWidth * ratio;
    const scaledHeight = imgHeight * ratio;

    // Centrer image
    const x = (pdfWidth - scaledWidth) / 2;
    const y = 10; // Marge top

    pdf.addImage(imgData, 'PNG', x, y, scaledWidth, scaledHeight);

    // Télécharger
    pdf.save(`${filename}.pdf`);
  } catch (error) {
    
    // Fallback : impression navigateur
    window.print();
  }
}

// ============================================================================
// UTILITAIRES
// ============================================================================

/**
 * Télécharger un fichier
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Formater nombre pour export
 */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Formater montant FCFA
 */
export function formatCurrency(value: number): string {
  return `${formatNumber(value, 0)} FCFA`;
}

/**
 * Formater date pour export
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ============================================================================
// TEMPLATES PRÉDÉFINIS
// ============================================================================

/**
 * Exporter Analytics Institution
 */
export function exportInstitutionAnalytics(data: {
  acteursActifs: number;
  acteursInactifs: number;
  acteursSuspendus: number;
  transactionsMois: number;
  volumeTransactionsFCFA: number;
  tauxActivite: number;
}) {
  const rows = [
    { label: 'Acteurs Actifs', value: formatNumber(data.acteursActifs) },
    { label: 'Acteurs Inactifs', value: formatNumber(data.acteursInactifs) },
    { label: 'Acteurs Suspendus', value: formatNumber(data.acteursSuspendus) },
    { label: 'Transactions (ce mois)', value: formatNumber(data.transactionsMois) },
    { label: 'Volume Transactions', value: formatCurrency(data.volumeTransactionsFCFA) },
    { label: 'Taux d\'Activité', value: `${data.tauxActivite.toFixed(1)}%` },
  ];

  exportSimplePDF(
    'Rapport Analytics Institution - JÙLABA',
    rows,
    `analytics_institution_${new Date().toISOString().split('T')[0]}`
  );
}

/**
 * Exporter liste acteurs
 */
export function exportActeursList(acteurs: any[]) {
  const columns = [
    { key: 'nom' as const, label: 'Nom' },
    { key: 'prenom' as const, label: 'Prénom' },
    { key: 'telephone' as const, label: 'Téléphone' },
    { key: 'role' as const, label: 'Rôle' },
    { key: 'region' as const, label: 'Région' },
    { key: 'statut' as const, label: 'Statut' },
    { key: 'score' as const, label: 'Mes Points' },
  ];

  exportToCSV(
    acteurs,
    `acteurs_${new Date().toISOString().split('T')[0]}`,
    columns
  );
}

/**
 * Exporter transactions
 */
export function exportTransactions(transactions: any[]) {
  const columns = [
    { key: 'numero' as const, label: 'N° Commande' },
    { key: 'date' as const, label: 'Date' },
    { key: 'acheteur' as const, label: 'Acheteur' },
    { key: 'vendeur' as const, label: 'Vendeur' },
    { key: 'produit' as const, label: 'Produit' },
    { key: 'quantite' as const, label: 'Quantité' },
    { key: 'montant' as const, label: 'Montant (FCFA)' },
    { key: 'statut' as const, label: 'Statut' },
  ];

  exportToCSV(
    transactions,
    `transactions_${new Date().toISOString().split('T')[0]}`,
    columns
  );
}
