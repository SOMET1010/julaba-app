/**
 * FINANCIAL SCORE DETAIL MODAL
 *
 * Écran de détail du VRAI score financier (0-1000, FinancialScoreService,
 * GET /financial-score/:userId) — distinct du score de gamification Jùlaba
 * (0-100). Ouvert depuis l'étape « Bénéfices » de ScoreOnboardingModal quand
 * l'utilisatrice clique sur l'item microcrédit.
 *
 * Jùlaba ne décide pas et ne décaisse pas de microcrédit : elle calcule un
 * score et le partage, sur choix de l'utilisatrice, avec des partenaires
 * financiers externes (GET /partner/financial-score/:userId). La décision
 * d'octroi appartient au partenaire. Ce module n'introduit donc ni entité
 * prêt, ni décaissement, ni échéancier — lecture seule du score existant.
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Volume2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { SharedModal } from './Modal';
import {
  fetchFinancialScore,
  FinancialScoreResult,
} from '../../services/api/financial-score-api';
import { HttpError } from '../../services/api/api-client';

interface FinancialScoreDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId?: string;
  primaryColor: string;
  speak?: (text: string) => void;
}

// Libellés humains des dimensions (mêmes clés que FinancialScoreResult.dimensions
// côté backend — ne pas ré-inventer le calcul, seulement l'habiller pour l'écran).
const DIMENSION_LABELS: Record<keyof FinancialScoreResult['dimensions'], string> = {
  regularite: 'Régularité de tes ventes',
  volume: 'Volume de tes ventes',
  equilibre: 'Équilibre ventes / dépenses',
  croissance: 'Croissance de ton activité',
  wallet: 'Épargne dans ton Wallet',
  anciennete: 'Ancienneté de ton compte',
  diversification: 'Diversité de tes produits',
};

const DIMENSION_ORDER: Array<keyof FinancialScoreResult['dimensions']> = [
  'regularite',
  'volume',
  'equilibre',
  'croissance',
  'wallet',
  'anciennete',
  'diversification',
];

function formatFcfa(montant: number): string {
  return `${Math.round(montant).toLocaleString('fr-FR')} FCFA`;
}

function niveauColor(niveau: FinancialScoreResult['niveau']): string {
  switch (niveau) {
    case 'Excellent':
      return '#16A34A';
    case 'Bon':
      return '#2E8B57';
    case 'Moyen':
      return '#F59E0B';
    case 'Faible':
      return '#EA580C';
    default:
      return '#9CA3AF';
  }
}

function buildSpeechSummary(data: FinancialScoreResult): string {
  const montant =
    data.montantEligible > 0
      ? `Tu peux être éligible jusqu'à ${formatFcfa(data.montantEligible)} de microcrédit.`
      : "Ton score n'est pas encore suffisant pour un microcrédit, continue à utiliser Jùlaba.";
  return `Ton score financier réel est de ${data.scoreTotal} sur 1000, niveau ${data.niveau}. ${montant}`;
}

export function FinancialScoreDetailModal({
  isOpen,
  onClose,
  userId,
  primaryColor,
  speak,
}: FinancialScoreDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FinancialScoreResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !userId) return;
    let cancelled = false;
    setLoading(true);
    setErrorMessage(null);
    fetchFinancialScore(userId)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        speak?.(buildSpeechSummary(result));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof HttpError && err.status === 400) {
          setErrorMessage(
            "Le score financier réel est disponible pour les marchands, producteurs et coopérateurs actifs sur le terrain.",
          );
        } else {
          setErrorMessage(
            "Impossible de récupérer ton score financier réel pour le moment. Réessaie un peu plus tard.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, userId]);

  // Reset au ferme pour ne pas montrer les anciennes données au prochain open.
  useEffect(() => {
    if (!isOpen) {
      setData(null);
      setErrorMessage(null);
    }
  }, [isOpen]);

  return (
    <SharedModal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title="Ton score financier réel"
      description="Le score utilisé pour évaluer ton éligibilité au microcrédit"
    >
      <div className="space-y-5">
        {loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
            <p className="text-sm text-gray-600">Calcul de ton score en cours…</p>
          </div>
        )}

        {!loading && errorMessage && (
          <div className="flex flex-col items-center text-center gap-3 py-6 px-2">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            <p className="text-sm text-gray-700 font-medium">{errorMessage}</p>
          </div>
        )}

        {!loading && !errorMessage && data && (
          <AnimatePresence>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-5"
            >
              {/* Score et niveau */}
              <div className="flex flex-col items-center gap-2 py-2">
                <div
                  className="w-28 h-28 rounded-full flex flex-col items-center justify-center border-4"
                  style={{ borderColor: niveauColor(data.niveau) }}
                >
                  <p className="text-3xl font-black" style={{ color: niveauColor(data.niveau) }}>
                    {data.scoreTotal}
                  </p>
                  <p className="text-xs text-gray-500 font-semibold">/ 1000</p>
                </div>
                <div
                  className="px-4 py-1.5 rounded-full text-white font-bold text-sm"
                  style={{ backgroundColor: niveauColor(data.niveau) }}
                >
                  Niveau {data.niveau}
                </div>
                {speak && (
                  <button
                    type="button"
                    onClick={() => speak(buildSpeechSummary(data))}
                    className="mt-1 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border-2"
                    style={{ borderColor: primaryColor, color: primaryColor }}
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                    Écouter
                  </button>
                )}
              </div>

              {/* Montant éligible */}
              <div
                className="rounded-2xl p-4 text-center"
                style={{ backgroundColor: `${primaryColor}10` }}
              >
                <p className="text-xs font-semibold text-gray-600 mb-1">
                  Montant de microcrédit auquel tu peux être éligible
                </p>
                <p className="text-2xl font-black" style={{ color: primaryColor }}>
                  {data.montantEligible > 0 ? formatFcfa(data.montantEligible) : 'Pas encore'}
                </p>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed">{data.recommandation}</p>
              </div>

              {/* Dimensions du score */}
              <div className="space-y-2">
                <p className="text-sm font-bold text-gray-900">Comment ce score est calculé</p>
                {DIMENSION_ORDER.map((key) => {
                  const dim = data.dimensions[key];
                  if (!dim) return null;
                  return (
                    <div key={key} className="rounded-xl bg-gray-50 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-bold text-gray-800">{DIMENSION_LABELS[key]}</p>
                        <p className="text-xs font-black" style={{ color: primaryColor }}>
                          {dim.score}/100
                        </p>
                      </div>
                      <p className="text-xs text-gray-600 leading-snug">{dim.details}</p>
                    </div>
                  );
                })}
              </div>

              {/* Message honnête sur le rôle de Jùlaba */}
              <div className="flex items-start gap-2.5 rounded-2xl border-2 border-gray-200 p-3.5 bg-white">
                <ShieldCheck className="w-5 h-5 flex-shrink-0 text-gray-500 mt-0.5" />
                <p className="text-xs text-gray-600 leading-relaxed">
                  Ce score est partagé avec nos partenaires financiers si tu le souhaites.
                  L'octroi d'un microcrédit dépend ensuite de leur décision — Jùlaba calcule
                  ton score, mais ne décide pas et ne verse pas d'argent.
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </SharedModal>
  );
}
