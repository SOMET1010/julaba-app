import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, TrendingUp, TrendingDown, Calendar, Volume2, Loader, Star, BarChart3, BookOpen } from 'lucide-react';
import { useRapportHebdo } from '../../contexts/RapportHebdoContext';

const P = '#C46210';

interface Props { isOpen: boolean; onClose: () => void; }

const JOURS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

export function RapportHebdoModal({ isOpen, onClose }: Props) {
  const { rapport, loading, fetchRapport, playRapport } = useRapportHebdo();

  useEffect(() => {
    if (isOpen) fetchRapport();
  }, [isOpen, fetchRapport]);

  if (!isOpen) return null;

  const fmtFCFA = (n: number) => Math.round(n).toLocaleString('fr-FR') + ' FCFA';
  const maxVente = rapport ? Math.max(...Object.values(rapport.ventesParJour), 1) : 1;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-end justify-center"
        style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="w-full max-w-md bg-white rounded-t-3xl overflow-hidden"
          style={{ maxHeight: '90vh', overflowY: 'auto' }}>

          {/* Header */}
          <div className="px-6 pt-6 pb-4 flex items-center justify-between sticky top-0 z-10"
            style={{ background: `linear-gradient(135deg, ${P}, #A0541F)` }}>
            <div className="flex items-center gap-3">
              <BarChart3 className="w-6 h-6 text-white" />
              <div>
                <p className="text-white font-black text-lg">Rapport de la semaine</p>
                {rapport && (
                  <p className="text-white/70 text-xs">
                    {new Date(rapport.semaine.debut).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} - {new Date(rapport.semaine.fin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {rapport?.audioBase64 && (
                <motion.button whileTap={{ scale: 0.9 }} onClick={playRapport}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <Volume2 className="w-4 h-4 text-white" />
                </motion.button>
              )}
              <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <X className="w-4 h-4 text-white" />
              </motion.button>
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            {loading ? (
              <div className="flex flex-col items-center py-12 gap-4">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                  <Loader className="w-10 h-10" style={{ color: P }} />
                </motion.div>
                <p className="text-gray-500 font-medium">Tata Lou analyse ta semaine...</p>
              </div>
            ) : rapport ? (
              <>
                {/* KPIs principaux */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl p-4" style={{ background: 'rgba(22,163,74,0.08)', border: '1.5px solid rgba(22,163,74,0.2)' }}>
                    <p className="text-[10px] font-black text-green-700 uppercase tracking-widest mb-1">Ventes totales</p>
                    <p className="text-2xl font-black leading-none" style={{ color: '#16A34A' }}>{Math.round(rapport.ventes).toLocaleString('fr-FR')}</p>
                    <p className="text-[10px] text-green-600 mt-1">FCFA</p>
                  </div>
                  <div className="rounded-2xl p-4" style={{ background: 'rgba(220,38,38,0.08)', border: '1.5px solid rgba(220,38,38,0.2)' }}>
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Dépenses</p>
                    <p className="text-2xl font-black leading-none" style={{ color: '#DC2626' }}>{Math.round(rapport.depenses).toLocaleString('fr-FR')}</p>
                    <p className="text-[10px] text-red-500 mt-1">FCFA</p>
                  </div>
                </div>

                {/* Evolution */}
                <div className="rounded-2xl p-4 flex items-center gap-4"
                  style={{ background: rapport.evolution >= 0 ? 'rgba(22,163,74,0.08)' : 'rgba(220,38,38,0.08)', border: `1.5px solid ${rapport.evolution >= 0 ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)'}` }}>
                  {rapport.evolution >= 0
                    ? <TrendingUp className="w-8 h-8 text-green-600 flex-shrink-0" />
                    : <TrendingDown className="w-8 h-8 text-red-500 flex-shrink-0" />}
                  <div>
                    <p className="font-black text-lg" style={{ color: rapport.evolution >= 0 ? '#16A34A' : '#DC2626' }}>
                      {rapport.evolution > 0 ? '+' : ''}{rapport.evolution}% vs semaine dernière
                    </p>
                    <p className="text-xs text-gray-500">Semaine précédente: {fmtFCFA(rapport.ventesSemainePrecedente)}</p>
                  </div>
                </div>

                {/* Meilleur jour */}
                {rapport.meilleurJour && (
                  <div className="rounded-2xl p-4 flex items-center gap-3"
                    style={{ background: `${P}10`, border: `1.5px solid ${P}30` }}>
                    <Star className="w-6 h-6 flex-shrink-0" style={{ color: P }} />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Meilleur jour</p>
                      <p className="font-black text-base" style={{ color: P }}>{rapport.meilleurJour.nom} — {fmtFCFA(rapport.meilleurJour.montant)}</p>
                    </div>
                  </div>
                )}

                {/* Graphe barres par jour */}
                {Object.keys(rapport.ventesParJour).length > 0 && (
                  <div className="rounded-2xl p-4" style={{ background: '#F9FAFB', border: '1.5px solid #E5E7EB' }}>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Ventes par jour</p>
                    <div className="flex items-end gap-2 h-20">
                      {Object.entries(rapport.ventesParJour).map(([date, montant]) => {
                        const pct = (montant / maxVente) * 100;
                        const jour = JOURS[new Date(date).getDay()];
                        const isMax = montant === maxVente;
                        return (
                          <div key={date} className="flex-1 flex flex-col items-center gap-1">
                            <motion.div className="w-full rounded-t-lg"
                              initial={{ height: 0 }}
                              animate={{ height: `${Math.max(pct, 8)}%` }}
                              transition={{ delay: 0.2, type: 'spring' }}
                              style={{ background: isMax ? P : `${P}40`, minHeight: 4 }} />
                            <p className="text-[9px] font-bold text-gray-400">{jour}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Objectifs */}
                {rapport.totalObjectifs > 0 && (
                  <div className="rounded-2xl p-4 flex items-center gap-3"
                    style={{ background: 'rgba(124,58,237,0.08)', border: '1.5px solid rgba(124,58,237,0.2)' }}>
                    <Calendar className="w-6 h-6 text-purple-600 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-purple-500">Objectifs atteints</p>
                      <p className="font-black text-base text-purple-700">{rapport.objectifsAtteints} / {rapport.totalObjectifs} jours</p>
                    </div>
                  </div>
                )}

                {/* Rapport vocal Tata Lou */}
                {rapport.rapportVocal && (
                  <div className="rounded-2xl p-4" style={{ background: `${P}08`, border: `1.5px solid ${P}20` }}>
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="w-4 h-4" style={{ color: P }} />
                      <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: P }}>Message de Tata Lou</p>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">{rapport.rapportVocal}</p>
                    {rapport.audioBase64 && (
                      <motion.button whileTap={{ scale: 0.97 }} onClick={playRapport}
                        className="mt-3 w-full py-2.5 rounded-xl flex items-center justify-center gap-2 font-bold text-sm"
                        style={{ background: P, color: 'white' }}>
                        <Volume2 className="w-4 h-4" />
                        Écouter Tata Lou
                      </motion.button>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-center text-gray-400 py-12">Aucune donnée disponible</p>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}