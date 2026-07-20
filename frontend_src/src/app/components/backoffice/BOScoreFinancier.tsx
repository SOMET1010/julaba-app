import React, { useCallback, useState } from 'react';
import { useBackOffice } from '../../contexts/BackOfficeContext';
import { motion } from 'motion/react';
import { Calculator, Loader2, Search, AlertCircle, Download, Award, Target } from 'lucide-react';
import { BO_PRIMARY, BO_DARK } from './bo-theme';
import { BOProgressBar } from './BOProgressBar';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';

type FinancialNiveau =
  | 'Excellent'
  | 'Bon'
  | 'Moyen'
  | 'Faible'
  | 'Insuffisant';

interface FinancialDimension {
  score: number;
  details: string;
}

interface FinancialScorePayload {
  userId: string;
  scoreTotal: number;
  niveau: FinancialNiveau;
  recommandation: string;
  montantEligible: number;
  dimensions: {
    regularite: FinancialDimension;
    volume: FinancialDimension;
    equilibre: FinancialDimension;
    croissance: FinancialDimension;
    wallet: FinancialDimension;
    anciennete: FinancialDimension;
    diversification: FinancialDimension;
  };
  calculéLe: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DIMENSION_META: {
  key: keyof FinancialScorePayload['dimensions'];
  label: string;
}[] = [
  { key: 'regularite', label: 'Régularité' },
  { key: 'volume', label: 'Volume' },
  { key: 'equilibre', label: 'Équilibre' },
  { key: 'croissance', label: 'Croissance' },
  { key: 'wallet', label: 'Santé wallet' },
  { key: 'anciennete', label: 'Ancienneté' },
  { key: 'diversification', label: 'Diversification' },
];

function scoreTotalColor(score: number): string {
  if (score >= 800) return '#16a34a';
  if (score >= 600) return '#2563eb';
  if (score >= 400) return '#f59e0b';
  if (score >= 200) return '#ef4444';
  return '#991b1b';
}

/** Couleurs barres dimensions (score sur 100). */
function dimensionBarColor(score: number): string {
  if (score >= 80) return '#16a34a';
  if (score >= 60) return '#2563eb';
  if (score >= 40) return '#f59e0b';
  if (score >= 20) return '#ef4444';
  return '#991b1b';
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '').trim();
  if (h.length !== 6) return [0, 0, 0];
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

async function generateScoreFinancierPdf(
  result: FinancialScorePayload,
): Promise<void> {
  let jsPDF: import('jspdf').jsPDF['constructor'] | undefined;
  try {
    ({ jsPDF } = await import('jspdf'));
  } catch {
    throw new Error(
      'Impossible de charger le module PDF. Vérifie ta connexion et réessaie.',
    );
  }
  if (typeof jsPDF !== 'function') {
    throw new Error('Module jsPDF invalide.');
  }

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  const contentW = pageW - margin * 2;
  let y = 0;

  const headerH = 40;
  const [hr, hg, hb] = hexToRgb('#1B5E20');
  doc.setFillColor(hr, hg, hb);
  doc.rect(0, 0, pageW, headerH, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('JULABA', margin, 28);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text('Score Financier', margin + 120, 28);

  doc.setFontSize(9);
  doc.text('Rapport de solvabilité — Confidentiel', margin, 36);

  y = headerH + 28;
  doc.setTextColor(40, 40, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const genAt = new Date().toLocaleString('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  });
  doc.text(`Date de génération : ${genAt}`, margin, y);
  y += 28;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('ACTEUR ÉVALUÉ', margin, y);
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const uidLines = doc.splitTextToSize(`Identifiant : ${result.userId}`, contentW);
  uidLines.forEach((line: string, i: number) => {
    doc.text(line, margin, y + i * 12);
  });
  y += uidLines.length * 12 + 4;
  const calcStr = new Date(result.calculéLe).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  doc.text(`Date du calcul du score : ${calcStr}`, margin, y);
  y += 28;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(28);
  doc.setTextColor(30, 30, 30);
  doc.text(`${result.scoreTotal} / 1000`, margin, y);
  y += 20;

  const badgeColor = scoreTotalColor(result.scoreTotal);
  const [br, bg, bb] = hexToRgb(badgeColor);
  doc.setFillColor(br, bg, bb);
  const badgeW = 100;
  const badgeH = 22;
  doc.roundedRect(margin, y - 14, badgeW, badgeH, 4, 4, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(result.niveau.toUpperCase(), margin + 8, y);
  y += 28;
  doc.setTextColor(50, 50, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const recoLines = doc.splitTextToSize(result.recommandation, contentW);
  recoLines.forEach((line: string, i: number) => {
    doc.text(line, margin, y + i * 12.5);
  });
  y += recoLines.length * 12.5 + 8;
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Montant éligible : ${result.montantEligible.toLocaleString('fr-FR')} FCFA`,
    margin,
    y,
  );
  y += 32;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageH - 72) {
      doc.addPage();
      y = margin;
    }
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DÉTAIL DES 7 DIMENSIONS', margin, y);
  y += 20;

  for (const { key, label } of DIMENSION_META) {
    const dim = result.dimensions[key];
    const pct = Math.max(0, Math.min(100, dim.score));
    const barCol = dimensionBarColor(dim.score);
    const [dr, dg, db] = hexToRgb(barCol);

    ensureSpace(70);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(label, margin, y);
    y += 14;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(70, 70, 70);
    doc.text(`${dim.score.toFixed(1)} / 100`, margin, y);
    y += 12;
    const trackY = y;
    const trackW = contentW;
    const trackH = 8;
    doc.setFillColor(230, 230, 230);
    doc.roundedRect(margin, trackY, trackW, trackH, 2, 2, 'F');
    const fillW = (trackW * pct) / 100;
    if (fillW > 0) {
      doc.setFillColor(dr, dg, db);
      doc.roundedRect(margin, trackY, fillW, trackH, 2, 2, 'F');
    }
    y += trackH + 8;
    const detLines = doc.splitTextToSize(dim.details, contentW);
    ensureSpace(detLines.length * 11 + 16);
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    detLines.forEach((line: string, j: number) => {
      doc.text(line, margin, y + j * 10.5);
    });
    y += detLines.length * 10.5 + 18;
  }

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    const h = doc.internal.pageSize.getHeight();
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.setFont('helvetica', 'normal');
    doc.text('Document généré par Julaba — julaba.online', margin, h - 36);
    doc.text('Confidentiel — Usage bancaire uniquement', margin, h - 24);
  }

  const shortId = result.userId.replace(/-/g, '').slice(0, 8);
  const dateSlug = new Date().toISOString().slice(0, 10);
  doc.save(`julaba_score_financier_${shortId}_${dateSlug}.pdf`);
}

function normalizePhoneInput(raw: string): string {
  return raw.replace(/\s+/g, '').trim();
}

function isFinancialScorePayload(x: unknown): x is FinancialScorePayload {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.userId === 'string' &&
    typeof o.scoreTotal === 'number' &&
    typeof o.niveau === 'string' &&
    typeof o.recommandation === 'string' &&
    typeof o.montantEligible === 'number' &&
    typeof o.calculéLe === 'string' &&
    o.dimensions !== null &&
    typeof o.dimensions === 'object'
  );
}

async function resolveUserIdFromInput(input: string): Promise<string> {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('Saisis un identifiant ou un numéro de téléphone.');
  if (UUID_RE.test(trimmed)) return trimmed;

  const phone = normalizePhoneInput(trimmed);
  const res = await fetch(
    `/api/v1/users/by-phone/${encodeURIComponent(phone)}`,
    { credentials: 'include', headers: { Accept: 'application/json' } },
  );
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(
        'Aucun utilisateur trouvé pour ce numéro. Vérifie le téléphone ou utilise l’UUID.',
      );
    }
    throw new Error(`Impossible de résoudre le téléphone (HTTP ${res.status}).`);
  }
  const data: unknown = await res.json();
  const rec = data as Record<string, unknown>;
  const id =
    (typeof rec.id === 'string' && rec.id) ||
    (rec.user &&
      typeof rec.user === 'object' &&
      rec.user !== null &&
      typeof (rec.user as Record<string, unknown>).id === 'string' &&
      (rec.user as Record<string, unknown>).id) ||
    '';
  if (typeof id !== 'string' || !id) {
    throw new Error('Réponse serveur invalide : identifiant utilisateur absent.');
  }
  return id;
}

export function BOScoreFinancier() {
  const { boUser: _guardUser } = useBackOffice();
  if (_guardUser?.role !== 'super_admin') {
    return (
      <div className="px-4 lg:px-8 py-12 max-w-2xl mx-auto text-center">
        <p className="font-bold text-gray-700 mb-1">Accès réservé</p>
        <p className="text-sm text-gray-500">Cet écran est réservé aux Super Administrateurs.</p>
      </div>
    );
  }

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FinancialScorePayload | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const fetchScore = useCallback(async () => {
    setError(null);
    setPdfError(null);
    setResult(null);
    setLoading(true);
    try {
      const userId = await resolveUserIdFromInput(query);
      const res = await fetch(
        `/api/v1/financial-score/${encodeURIComponent(userId)}`,
        { credentials: 'include', headers: { Accept: 'application/json' } },
      );
      const body: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error(
            'Utilisateur introuvable ou aucune donnée pour calculer le score.',
          );
        }
        const msg =
          body &&
          typeof body === 'object' &&
          'message' in body &&
          typeof (body as { message: unknown }).message === 'string'
            ? (body as { message: string }).message
            : `Erreur serveur (HTTP ${res.status}).`;
        throw new Error(msg);
      }
      if (!isFinancialScorePayload(body)) {
        throw new Error('Réponse API invalide : format du score inattendu.');
      }
      setResult(body);
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : 'Une erreur est survenue.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const scoreColor = result ? scoreTotalColor(result.scoreTotal) : BO_PRIMARY;

  const handleDownloadPdf = useCallback(async () => {
    if (!result) return;
    setPdfLoading(true);
    setPdfError(null);
    try {
      await generateScoreFinancierPdf(result);
    } catch (e) {
      setPdfError(
        e instanceof Error ? e.message : 'Impossible de générer le PDF.',
      );
    } finally {
      setPdfLoading(false);
    }
  }, [result]);

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto overflow-hidden">
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl lg:text-3xl font-black text-gray-900">
          Score Financier Julaba
        </h1>
        <p className="text-sm text-gray-500 mt-0.5 max-w-2xl">
          Consulte le score crédit (0–1000) d’un acteur à partir de ses données
          réelles : caisse, wallet et ancienneté.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-5 lg:p-6 mb-6"
      >
        <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1">
            <label className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
              UUID utilisateur ou téléphone
            </label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ex. 550e8400-e29b… ou +2250707123456"
                disabled={loading}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:outline-none bg-gray-50 text-sm font-medium disabled:opacity-60"
                style={{
                  borderColor: query ? BO_PRIMARY : undefined,
                }}
              />
            </div>
          </div>
          <motion.button
            type="button"
            onClick={() => void fetchScore()}
            disabled={loading || !query.trim()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm text-white border-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(135deg, ${BO_PRIMARY}, ${BO_PRIMARY}CC)`,
              borderColor: BO_PRIMARY,
              boxShadow: `0 4px 14px ${BO_PRIMARY}40`,
            }}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: loading ? 1 : 0.97 }}
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Calculator className="w-5 h-5" />
            )}
            Calculer le score
          </motion.button>
        </div>

        {error && (
          <div
            className="mt-4 flex items-start gap-3 rounded-2xl border-2 px-4 py-3 bg-red-50"
            style={{ borderColor: '#fecaca' }}
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <p className="text-sm font-semibold text-red-800">{error}</p>
          </div>
        )}
      </motion.div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
          <Loader2
            className="w-10 h-10 animate-spin"
            style={{ color: BO_PRIMARY }}
          />
          <p className="text-sm font-bold">Calcul du score en cours…</p>
        </div>
      )}

      {!loading && result && (
        <div className="space-y-5">
          <KPIGrid cols={2}>
            <UniversalKPI
              label="Score total"
              animatedTarget={result.scoreTotal}
              suffix="/1000"
              icon={Award}
              color={scoreColor}
            />
            <UniversalKPI
              label="Niveau"
              value={result.niveau}
              icon={Target}
              color={scoreColor}
            />
          </KPIGrid>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-6 space-y-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex px-3 py-1 rounded-xl text-xs font-black text-white"
                style={{ backgroundColor: scoreColor }}
              >
                {result.niveau}
              </span>
              <span className="text-xs font-mono text-gray-500">
                userId : {result.userId}
              </span>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed font-semibold">
              {result.recommandation}
            </p>
            <div
              className="rounded-2xl border-2 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              style={{
                borderColor: `${BO_PRIMARY}35`,
                background: `linear-gradient(135deg, ${BO_PRIMARY}10, ${BO_PRIMARY}04)`,
              }}
            >
              <span className="text-xs font-black text-gray-600 uppercase tracking-wide">
                Montant éligible (FCFA)
              </span>
              <span
                className="text-xl font-black tabular-nums"
                style={{ color: BO_DARK }}
              >
                {result.montantEligible.toLocaleString('fr-FR')}
              </span>
            </div>
            <p className="text-xs text-gray-400 font-semibold">
              Calculé le{' '}
              {new Date(result.calculéLe).toLocaleString('fr-FR', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </p>
          </motion.div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-2">
            <motion.button
              type="button"
              onClick={() => void handleDownloadPdf()}
              disabled={pdfLoading}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-black text-sm border-2 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                borderColor: BO_PRIMARY,
                color: BO_DARK,
                boxShadow: `0 2px 10px ${BO_PRIMARY}22`,
              }}
              whileHover={{ scale: pdfLoading ? 1 : 1.02 }}
              whileTap={{ scale: pdfLoading ? 1 : 0.98 }}
            >
              {pdfLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: BO_PRIMARY }} />
              ) : (
                <Download className="w-5 h-5" style={{ color: BO_PRIMARY }} />
              )}
              Télécharger rapport PDF
            </motion.button>
          </div>
          {pdfError && (
            <div
              className="flex items-start gap-3 rounded-2xl border-2 px-4 py-3 bg-amber-50"
              style={{ borderColor: '#fcd34d' }}
            >
              <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <p className="text-sm font-semibold text-amber-900">{pdfError}</p>
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-6"
          >
            <h2 className="font-black text-gray-900 text-lg mb-5">
              Détail des dimensions
            </h2>
            <div className="space-y-5">
              {DIMENSION_META.map(({ key, label }, i) => {
                const dim = result.dimensions[key];
                const pct = Math.max(0, Math.min(100, dim.score));
                const barColor = scoreTotalColor(Math.round(dim.score * 10));
                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.04 * i }}
                    className="rounded-2xl border-2 border-gray-100 p-4 bg-gray-50/80"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                      <span className="font-black text-gray-900 text-sm">
                        {label}
                      </span>
                      <span
                        className="text-sm font-black tabular-nums"
                        style={{ color: barColor }}
                      >
                        {dim.score.toFixed(1)} / 100
                      </span>
                    </div>
                    <BOProgressBar
                      value={pct}
                      color={barColor}
                      height="md"
                      delay={0.02 * i}
                    />
                    <p className="text-xs text-gray-600 mt-2 leading-relaxed">
                      {dim.details}
                    </p>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
