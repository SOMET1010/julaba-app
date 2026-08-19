import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { useParams } from 'react-router';
import { Crown, CheckCircle2, Clock, Gift, RefreshCw, Coins } from 'lucide-react';
import { toast } from 'sonner';
import { SubPageLayout } from '../layout/SubPageLayout';
import { useApp } from '../../contexts/AppContext';
import { API_URL } from '../../utils/api';
import { apiRequest, HttpError } from '../../services/api/api-client';

const COLOR = '#C46210';

interface MembreDetail {
  userId: string;
  ordre: number;
  aRecu: boolean;
  aCotiseCeCycle: boolean;
  nom: string | null;
  telephone: string | null;
}

interface TontineDetailData {
  id: string;
  nom: string;
  responsableId: string;
  montantCotisation: number;
  cadenceJours: number;
  dateDebut: string;
  statut: 'active' | 'terminee' | 'annulee';
  cycleCourant: number;
  nombreMembres: number;
  estResponsable: boolean;
  membres: MembreDetail[];
}

const CADENCE_LABEL: Record<number, string> = { 7: 'Hebdomadaire', 14: 'Toutes les 2 semaines', 30: 'Mensuelle' };

export function TontineDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, speak } = useApp();
  const [tontine, setTontine] = useState<TontineDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreurChargement, setErreurChargement] = useState('');
  const [cotisationEnCours, setCotisationEnCours] = useState(false);

  const charger = () => {
    if (!id) return;
    setLoading(true);
    setErreurChargement('');
    apiRequest<TontineDetailData>(API_URL, `/tontines/${id}`, { method: 'GET' })
      .then(setTontine)
      .catch((e: any) => {
        const message = e instanceof HttpError ? e.message : (e?.message || 'Impossible de charger cette tontine');
        setErreurChargement(message);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { charger(); }, [id]);

  const moi = tontine?.membres.find((m) => m.userId === user?.id) || null;
  const peutCotiser = !!tontine && tontine.statut === 'active' && !!moi && !moi.aCotiseCeCycle;

  const cotiser = async () => {
    if (!id || !peutCotiser) return;
    setCotisationEnCours(true);
    try {
      const res = await apiRequest<{ success: boolean; cycleCourant: number; statut: string; distribution: { beneficiaireUserId: string; montant: number } | null }>(
        API_URL,
        `/tontines/${id}/cotiser`,
        { method: 'POST' },
      );
      if (res.distribution) {
        const beneficiaireEstMoi = res.distribution.beneficiaireUserId === user?.id;
        toast.success(
          beneficiaireEstMoi
            ? `Cotisation enregistrée — tu as reçu ${res.distribution.montant.toLocaleString('fr-FR')} FCFA !`
            : `Cotisation enregistrée — le pot a été distribué à ${tontine?.membres.find((m) => m.userId === res.distribution?.beneficiaireUserId)?.nom || 'la bénéficiaire du tour'}`,
        );
        speak(beneficiaireEstMoi ? 'Tu as reçu le pot de la tontine' : 'Cotisation enregistrée, le pot a été distribué');
      } else {
        toast.success('Cotisation enregistrée');
        speak('Cotisation enregistrée');
      }
      charger();
    } catch (e: any) {
      // Message honnête — jamais de succès mensonger sur un mouvement d'argent
      // réel (même exigence que le stock commun coopérative).
      const message = e instanceof HttpError ? e.message : (e?.message || 'Cotisation impossible');
      toast.error(message);
    } finally {
      setCotisationEnCours(false);
    }
  };

  if (loading) {
    return (
      <SubPageLayout role="marchand" title="Tontine">
        <div className="flex justify-center py-16">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>
            <RefreshCw className="w-8 h-8" style={{ color: COLOR }} />
          </motion.div>
        </div>
      </SubPageLayout>
    );
  }

  if (erreurChargement || !tontine) {
    return (
      <SubPageLayout role="marchand" title="Tontine">
        <div className="text-center py-16 px-4">
          <p className="text-sm font-bold text-gray-700">{erreurChargement || 'Tontine introuvable'}</p>
        </div>
      </SubPageLayout>
    );
  }

  const statutCfg =
    tontine.statut === 'terminee'
      ? { label: 'Terminée', color: '#6B7280', bg: '#F3F4F6' }
      : tontine.statut === 'annulee'
        ? { label: 'Annulée', color: '#DC2626', bg: '#FEE2E2' }
        : { label: 'En cours', color: '#16A34A', bg: '#DCFCE7' };

  return (
    <SubPageLayout role="marchand" title={tontine.nom}>
      <motion.div className="pb-40 max-w-2xl mx-auto space-y-4">
        <div className="bg-white rounded-2xl border-2 p-4" style={{ borderColor: 'rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="px-2 py-1 rounded-full text-[10px] font-bold" style={{ background: statutCfg.bg, color: statutCfg.color }}>
              {statutCfg.label}
            </span>
            {tontine.statut === 'active' && (
              <span className="text-xs font-bold" style={{ color: COLOR }}>
                Tour {tontine.cycleCourant + 1} / {tontine.nombreMembres}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-500">Cotisation</p>
              <p className="text-sm font-bold text-gray-900">{tontine.montantCotisation.toLocaleString('fr-FR')} FCFA</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-500">Cadence</p>
              <p className="text-sm font-bold text-gray-900">{CADENCE_LABEL[tontine.cadenceJours] || `Tous les ${tontine.cadenceJours} j`}</p>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-2 px-1">Ordre de réception</p>
          <div className="space-y-2">
            {tontine.membres.map((m) => {
              const estBeneficiaireCeTour = tontine.statut === 'active' && m.ordre === tontine.cycleCourant;
              const estMoi = m.userId === user?.id;
              return (
                <div
                  key={m.userId}
                  className="bg-white rounded-2xl border-2 p-3 flex items-center gap-3"
                  style={{ borderColor: estBeneficiaireCeTour ? COLOR : 'rgba(0,0,0,0.06)' }}
                >
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0" style={{ background: m.aRecu ? '#9CA3AF' : COLOR }}>
                    {m.ordre + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {m.nom || 'Membre'}{estMoi ? ' (toi)' : ''}
                      {m.userId === tontine.responsableId && <Crown className="w-3.5 h-3.5 inline ml-1.5 text-amber-500" />}
                    </p>
                    <p className="text-xs text-gray-500">{m.telephone || ''}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {m.aRecu && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700">
                        <Gift className="w-3 h-3" /> A reçu
                      </span>
                    )}
                    {estBeneficiaireCeTour && !m.aRecu && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ background: `${COLOR}18`, color: COLOR }}>
                        <Coins className="w-3 h-3" /> Bénéficiaire du tour
                      </span>
                    )}
                    {tontine.statut === 'active' && (
                      m.aCotiseCeCycle ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-50 text-green-700">
                          <CheckCircle2 className="w-3 h-3" /> A cotisé
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700">
                          <Clock className="w-3 h-3" /> En attente
                        </span>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {moi && (
        <div className="fixed bottom-0 left-0 right-0 px-5 py-4 bg-white border-t border-gray-100 z-40">
          <div className="max-w-2xl mx-auto">
            {tontine.statut !== 'active' ? (
              <div className="text-center text-sm font-bold text-gray-500 py-3">
                {tontine.statut === 'terminee' ? 'Cette tontine est terminée — tous les membres ont reçu leur tour' : 'Cette tontine est annulée'}
              </div>
            ) : moi.aCotiseCeCycle ? (
              <div className="text-center text-sm font-bold text-green-700 py-3 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Tu as déjà cotisé pour ce tour
              </div>
            ) : (
              <motion.button
                type="button"
                onClick={() => void cotiser()}
                disabled={cotisationEnCours}
                className="w-full py-3.5 rounded-2xl text-white font-bold text-sm disabled:opacity-50"
                style={{ background: COLOR }}
                whileTap={{ scale: 0.97 }}
              >
                {cotisationEnCours ? 'Cotisation en cours…' : `Cotiser ${tontine.montantCotisation.toLocaleString('fr-FR')} FCFA`}
              </motion.button>
            )}
          </div>
        </div>
      )}
    </SubPageLayout>
  );
}
