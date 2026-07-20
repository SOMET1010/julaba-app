import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Users, CheckCircle, RefreshCw, Package } from 'lucide-react';
import { SubPageLayout } from '../layout/SubPageLayout';
import { useApp } from '../../contexts/AppContext';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { API_URL } from '../../utils/api';
import { apiRequest } from '../../../imports/api-client';
import { useCooperativesListe } from '../../hooks/useCooperativesListe';

const COLOR = '#C46210';

/** Réponse `GET /api/v1/cooperatives/ma-cooperative` (objet plat) */
interface MaCooperativeInfo {
  id: string;
  nom: string;
  statut_membre: string;
  role_membre: string;
  responsable_nom?: string;
  marche?: string;
  commune?: string;
  fonction?: string;
  contact?: string;
  date_adhesion?: string;
  actif?: boolean;
}

export function MaCooperative() {
  const { speak } = useApp();
  const navigate = useNavigate();
  const { cooperatives: cooperativesListe } = useCooperativesListe();
  const [selectedCoopId, setSelectedCoopId] = useState('');
  const [maCoopInfo, setMaCoopInfo] = useState<MaCooperativeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  useEffect(() => {
    apiRequest<MaCooperativeInfo | null>(API_URL, '/cooperatives/ma-cooperative', { method: 'GET' })
      .then(d => { setMaCoopInfo(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleRejoindreListe = async () => {
    if (!selectedCoopId) return;
    setJoining(true);
    try {
      await apiRequest<unknown>(API_URL, `/cooperatives/rejoindre/${selectedCoopId}`, {
        method: 'POST',
      });
      toast.success('Demande envoyée à la coopérative');
      speak('Ta demande a été envoyée');
      const d = await apiRequest<MaCooperativeInfo | null>(API_URL, '/cooperatives/ma-cooperative', { method: 'GET' }).catch(() => null);
      setMaCoopInfo(d);
      setSelectedCoopId('');
    } catch (e: any) {
      console.warn('[MaCooperative] handleRejoindreListe failed:', e?.message);
      toast.error('Erreur lors de la demande');
    } finally {
      setJoining(false);
    }
  };

  const STATUT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    actif: { label: 'Membre actif', color: '#16A34A', bg: '#DCFCE7' },
    en_attente: { label: 'En attente de validation', color: '#D97706', bg: '#FEF3C7' },
    suspendu: { label: 'Suspendu', color: '#DC2626', bg: '#FEE2E2' },
  };

  return (
    <SubPageLayout role="marchand" title="Ma coopérative">
      <motion.div className="pb-32 max-w-2xl mx-auto space-y-4">

        {loading ? (
          <motion.div className="flex justify-center py-16">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}>
              <RefreshCw className="w-8 h-8" style={{ color: COLOR }} />
            </motion.div>
          </motion.div>
        ) : maCoopInfo?.nom ? (
          <>
            {/* Carte coop actuelle */}
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-3xl border-2 p-5 shadow-sm"
              style={{ borderColor: `${COLOR}40` }}>
              <motion.div className="flex items-center gap-4 mb-4">
                <motion.div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: `${COLOR}15` }}>
                  <Users className="w-7 h-7" style={{ color: COLOR }} />
                </motion.div>
                <motion.div>
                  <p className="font-bold text-gray-900 text-lg">
                    {maCoopInfo.nom || 'Coopérative'}
                  </p>
                  {(maCoopInfo.marche || maCoopInfo.commune) && (
                    <p className="text-sm text-gray-500">
                      {[maCoopInfo.marche, maCoopInfo.commune].filter(Boolean).join('\u00A0\u00B7 ')}
                    </p>
                  )}
                  {maCoopInfo.responsable_nom && (
                    <p className="text-sm text-gray-500">Responsable{'\u00A0'}: {maCoopInfo.responsable_nom}</p>
                  )}
                  {maCoopInfo.fonction && (
                    <p className="text-xs text-gray-400">{maCoopInfo.fonction}</p>
                  )}
                  {maCoopInfo.contact && (
                    <p className="text-xs text-gray-400">{maCoopInfo.contact}</p>
                  )}
                </motion.div>
              </motion.div>

              {/* Statut */}
              {(() => {
                const st = (maCoopInfo.statut_membre || 'en_attente').toLowerCase();
                const sc = STATUT_CONFIG[st] || STATUT_CONFIG['en_attente'];
                return (
                  <motion.div className="flex items-center gap-2 px-3 py-2 rounded-xl w-fit"
                    style={{ backgroundColor: sc.bg }}>
                    <CheckCircle className="w-4 h-4" style={{ color: sc.color }} />
                    <span className="text-sm font-bold" style={{ color: sc.color }}>{sc.label}</span>
                  </motion.div>
                );
              })()}

              {maCoopInfo.date_adhesion && (
                <p className="text-xs text-gray-400 mt-3">
                  Adhésion{'\u00A0'}: {new Date(maCoopInfo.date_adhesion).toLocaleDateString('fr-FR')}
                </p>
              )}
            </motion.div>


            {maCoopInfo.statut_membre?.toLowerCase() === 'actif' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl border-2 p-5 shadow-sm"
                style={{ borderColor: '#16A34A40' }}
              >
                <p className="font-bold text-gray-900 mb-2">Cotisation coopérative</p>
                <p className="text-xs text-gray-500 mb-3">
                  Paie ta cotisation mensuelle pour rester membre actif.
                </p>
                <motion.button
                  onClick={async () => {
                    try {
                      await apiRequest<unknown>(API_URL, '/cooperatives/cotisation', {
                        method: 'POST',
                        body: JSON.stringify({ montant: 25000 }),
                      });
                      toast.success('Cotisation payée avec succès');
                    } catch (err: any) {
                      console.warn('[MaCooperative] cotisation failed:', err?.message);
                      toast.error('Erreur lors du paiement');
                    }
                  }}
                  className="w-full py-3 rounded-2xl text-white font-bold text-sm"
                  style={{ backgroundColor: '#16A34A' }}
                  whileTap={{ scale: 0.97 }}
                >
                  Payer ma cotisation{'\u00A0'}: 25{'\u00A0'}000 FCFA
                </motion.button>
              </motion.div>
            )}

            {maCoopInfo.statut_membre?.toLowerCase() === 'actif' && (
              <motion.button
                onClick={() => navigate('/marchand/commandes')}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="w-full p-4 rounded-2xl bg-white border-2 flex items-center justify-between shadow-sm"
                style={{ borderColor: `${COLOR}40` }}
                whileTap={{ scale: 0.97 }}
              >
                <motion.div className="flex items-center gap-3">
                  <motion.div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${COLOR}15` }}>
                    <Package className="w-6 h-6" style={{ color: COLOR }} />
                  </motion.div>
                  <motion.div className="text-left">
                    <p className="font-bold text-gray-900">Mes commandes</p>
                    <p className="text-xs text-gray-500">Suivre mes achats auprès des producteurs</p>
                  </motion.div>
                </motion.div>
                <span className="text-gray-400">›</span>
              </motion.button>
            )}

            {/* Bouton soumettre un besoin */}
            {maCoopInfo.statut_membre?.toLowerCase() === 'actif' && (
              <motion.button
                onClick={() => navigate('/marchand/cooperative/besoin')}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full p-4 rounded-2xl bg-white border-2 flex items-center justify-between shadow-sm"
                style={{ borderColor: `${COLOR}40` }}
                whileTap={{ scale: 0.97 }}>
                <motion.div className="flex items-center gap-3">
                  <motion.div className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${COLOR}15` }}>
                    <Package className="w-6 h-6" style={{ color: COLOR }} />
                  </motion.div>
                  <motion.div className="text-left">
                    <p className="font-bold text-gray-900">Soumettre un besoin</p>
                    <p className="text-xs text-gray-500">Demande groupée à ma coopérative</p>
                  </motion.div>
                </motion.div>
                <span className="text-gray-400">›</span>
              </motion.button>
            )}
          </>
        ) : (
          <>
            {/* Pas encore membre */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center py-10 gap-3">
              <motion.div className="w-20 h-20 rounded-full flex items-center justify-center"
                style={{ backgroundColor: `${COLOR}15` }}>
                <Users className="w-10 h-10" style={{ color: COLOR }} />
              </motion.div>
              <p className="font-bold text-gray-700 text-lg">Pas encore membre</p>
              <p className="text-sm text-gray-500 text-center px-4">
                Rejoins une coopérative pour accéder aux achats groupés et soumettre tes besoins.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border-2 border-gray-100 p-5 space-y-4">
              <p className="font-bold text-gray-900">Choisir ta coopérative</p>
              <p className="text-xs text-gray-500">Sélectionne ta coopérative dans la liste officielle.</p>
              <select
                value={selectedCoopId}
                onChange={e => setSelectedCoopId(e.target.value)}
                className="w-full h-12 px-4 rounded-xl border-2 border-gray-200 text-sm focus:outline-none"
                onFocus={e => (e.target.style.borderColor = COLOR)}
                onBlur={e => (e.target.style.borderColor = '#E5E7EB')}
              >
                <option value="">Choisis une coopérative…</option>
                {cooperativesListe.map(c => {
                  const lieu = [c.marche, c.commune].filter(Boolean).join(', ');
                  const label = lieu ? `${c.nom} (${lieu})` : c.nom;
                  return (
                    <option key={c.id} value={c.id}>{label}</option>
                  );
                })}
              </select>
              <motion.button
                onClick={handleRejoindreListe}
                disabled={joining || !selectedCoopId}
                className="h-12 w-full px-4 rounded-xl text-white text-sm font-bold disabled:opacity-50"
                style={{ backgroundColor: COLOR }}
                whileTap={{ scale: 0.95 }}
              >
                {joining ? 'Envoi…' : 'Rejoindre cette coopérative'}
              </motion.button>
            </motion.div>
          </>
        )}
      </motion.div>
    </SubPageLayout>
  );
}
