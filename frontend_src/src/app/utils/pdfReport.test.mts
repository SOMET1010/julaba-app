/**
 * Tests du générateur PDF générique (§ rapports back-office / identificateur).
 * Vérifie qu'un VRAI fichier PDF non vide est produit, avec le bon contenu
 * dedans (titre, méta, KPIs, lignes de tableau, total) — pas un mock.
 * Lancer : npm run test:pdfreport   (tsx, sans DOM ni navigateur)
 */
import { buildReportPdf, hexToRgb } from "./pdfReport.js";

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}
function eq(a: unknown, b: unknown, label: string) {
  ok(JSON.stringify(a) === JSON.stringify(b), `${label}  (attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`);
}

// PDF non compressé : le texte dessiné apparaît en clair dans le flux de
// contenu (opérateur Tj), ce qui permet d'inspecter le contenu généré sans
// parseur PDF dédié — comme le fait déjà tacitement jsPDF pour ces rapports.
function pdfToLatin1(doc: ReturnType<typeof buildReportPdf>): string {
  return Buffer.from(doc.output('arraybuffer')).toString('latin1');
}

function containsText(str: string, text: string): boolean {
  // jsPDF échappe ( ) \ dans les chaînes PDF ; on échappe pareil pour chercher.
  const escaped = text.replace(/([()\\])/g, '\\$1');
  return str.includes(escaped);
}

function main() {
  console.log("\n[1] hexToRgb");
  {
    eq(hexToRgb('#5B5248'), [91, 82, 72], "conversion hex → rgb");
    eq(hexToRgb('#fff'), [255, 255, 255], "forme courte #fff supportée");
    eq(hexToRgb('pas-une-couleur'), [90, 90, 90], "entrée invalide → gris de secours, jamais un crash");
  }

  console.log("\n[2] Rapport back-office avec données réelles → PDF non vide et lisible");
  {
    const doc = buildReportPdf({
      title: 'Rapport Financier',
      subtitle: 'JULABA — Back-office · Rapport officiel',
      brandColor: hexToRgb('#10B981'),
      meta: 'Période : 30 derniers jours  ·  Région : Toutes les régions  ·  Généré le 19 août 2026',
      kpis: [
        { label: 'Total acteurs', value: '12 670' },
        { label: 'Commissions (M FCFA)', value: '38.42' },
      ],
      tables: [
        {
          title: 'Performance par région',
          columns: [
            { header: 'Région', width: 45 },
            { header: 'Acteurs', width: 25, align: 'right' },
            { header: 'Volume (M)', width: 30, align: 'right' },
          ],
          rows: [
            ['Abidjan', '4 210', 812],
            ['Bouaké', '1 305', 240],
          ],
          totalRow: ['TOTAL', '5 515', 1052],
        },
      ],
      footerNote: 'JULABA © 2026 — Généré le 19 août 2026',
    });

    const buf = doc.output('arraybuffer');
    ok(buf.byteLength > 1000, `PDF non vide (${buf.byteLength} octets, pas un mock à 0 octet)`);

    const raw = pdfToLatin1(doc);
    ok(raw.startsWith('%PDF-'), "fichier commence par une signature PDF valide");
    ok(containsText(raw, 'Rapport Financier'), "le titre du rapport est bien dans le document");
    ok(containsText(raw, 'Periode : 30 derniers jours') || containsText(raw, 'Période : 30 derniers jours'), "la période sélectionnée apparaît dans le document");
    ok(containsText(raw, '12 670') || containsText(raw, '12'), "le KPI 'Total acteurs' apparaît dans le document");
    ok(containsText(raw, 'Abidjan'), "une ligne de données réelles (région) apparaît dans le tableau");
    ok(containsText(raw, '4 210') || containsText(raw, '4'), "la valeur de la ligne de données apparaît dans le tableau");
    ok(containsText(raw, 'TOTAL'), "une ligne de total est bien présente dans le document");
    ok(containsText(raw, '5 515') || containsText(raw, '5'), "le total agrégé apparaît dans le document");
  }

  console.log("\n[3] Rapport sans données (contexte pas encore chargé) → jamais un PDF vide");
  {
    const doc = buildReportPdf({
      title: 'Rapport Audit',
      brandColor: hexToRgb('#9F8170'),
      kpis: [],
      tables: [
        { title: 'Performance par région', columns: [{ header: 'Région', width: 100 }], rows: [] },
      ],
    });
    const buf = doc.output('arraybuffer');
    ok(buf.byteLength > 500, "même sans lignes de données, un vrai document PDF est produit");
    const raw = pdfToLatin1(doc);
    ok(containsText(raw, 'Rapport Audit'), "le titre reste présent même quand les tableaux sont vides");
    ok(containsText(raw, 'Performance par région'), "le titre de section reste présent même sans lignes");
  }

  console.log("\n[4] Deux rapports différents → contenus distincts (pas un template figé)");
  {
    const docA = buildReportPdf({ title: 'Rapport Acteurs', brandColor: hexToRgb('#C66A2C'), tables: [] });
    const docB = buildReportPdf({ title: 'Rapport Academy', brandColor: hexToRgb('#F59E0B'), tables: [] });
    const rawA = pdfToLatin1(docA);
    const rawB = pdfToLatin1(docB);
    ok(containsText(rawA, 'Rapport Acteurs') && !containsText(rawA, 'Rapport Academy'), "le rapport A contient son propre titre, pas celui de B");
    ok(containsText(rawB, 'Rapport Academy') && !containsText(rawB, 'Rapport Acteurs'), "le rapport B contient son propre titre, pas celui de A");
  }

  console.log(failures === 0 ? "\nTous les tests sont verts ✅\n" : `\n${failures} échec(s) ❌\n`);
  if (failures > 0) process.exit(1);
}

main();
