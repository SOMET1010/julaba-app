/**
 * INBOX NÉGOCIATIONS côté VENDEUR (producteur, coopérative…).
 *
 * Un marchand propose un prix sur un produit du marché (`POST /commandes/negociation`) ;
 * le vendeur voit ici les demandes qui LE concernent et peut ACCEPTER (→ le backend
 * crée la commande confirmée), NÉGOCIER (contre-offre, limite 3) ou REFUSER.
 *
 * Pourquoi ce composant : la cartographie du parcours marché a montré que le
 * PRODUCTEUR recevait la notification d'une négociation mais n'avait AUCUN écran
 * pour y répondre (seule la coopérative avait son inbox, dans Commandes.tsx).
 * Ce composant partagé, calqué sur ce modèle coop recetté, comble ce trou —
 * autonome (fetch + actions + modales), il se pose dans n'importe quelle page vendeur.
 *
 * S'appuie sur services/negociation.ts (module pur testé) pour les règles :
 * statuts actifs, limite de contre-offres. La normalisation contre_propose→
 * contre_offre est faite dans commandes-api (fix #166).
 */
import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, MessageSquare, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../contexts/AppContext';
import { useUser } from '../../contexts/UserContext';
import { fetchNegociations, repondreNegociation } from '../../services/api/commandes-api';
import { estNegociationActive, peutContreOffrir, MAX_CONTRE_OFFRES } from '../../services/negociation';

interface Negociation {
  id: string;
  marchandId: string;
  vendeurId: string;
  produit: string;
  quantite: number;
  prixOriginal: number;
  prixPropose: number;
  unite: string;
  message: string;
  statut: 'en_attente' | 'accepte' | 'refuse' | 'contre_offre';
  prixContreOffre: number | null;
  messageReponse: string | null;
  nbContreOffres: number;
  createdAt: string;
}

const STATUT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  en_attente:   { label: 'En attente',   color: '#f59e0b', bg: '#fef3c7' },
  accepte:      { label: 'Acceptée',     color: '#10b981', bg: '#d1fae5' },
  refuse:       { label: 'Refusée',      color: '#ef4444', bg: '#fee2e2' },
  contre_offre: { label: 'Contre-offre', color: '#8b5cf6', bg: '#f3e8ff' },
};

const RAISONS_REFUS = [
  'Stock insuffisant',
  'Prix proposé trop bas',
  'Quantité trop importante',
  'Produit non disponible actuellement',
  'Délai de livraison impossible',
];

interface Props {
  /** Couleur d'accent du rôle hôte (icône cloche). */
  accent?: string;
  /** Appelé après une acceptation (le backend a créé la commande) — pour recharger la liste des commandes de la page hôte. */
  onAccepted?: () => void;
}

export function InboxNegociations({ accent = '#f97316', onAccepted }: Props) {
  const { speak } = useApp();
  const { user } = useUser();

  const [negociations, setNegociations] = useState<Negociation[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState<Negociation | null>(null);
  const [showContre, setShowContre] = useState(false);
  const [showRefus, setShowRefus] = useState(false);
  const [nouveauPrix, setNouveauPrix] = useState(0);
  const [messageContre, setMessageContre] = useState('');
  const [raisonRefus, setRaisonRefus] = useState('');

  const recharger = useCallback(async () => {
    try {
      const { negociations: data } = await fetchNegociations();
      setNegociations((data ?? []) as Negociation[]);
    } catch { /* silencieux : l'inbox est un plus, pas un bloqueur de page */ }
  }, []);

  useEffect(() => {
    setLoading(true);
    void recharger().finally(() => setLoading(false));
  }, [recharger]);

  // Demandes reçues par CE vendeur, encore actives.
  const recues = negociations.filter(
    n => n.vendeurId === user?.id && estNegociationActive(n.statut),
  );

  const accepter = async (neg: Negociation) => {
    setSubmitting(true);
    try {
      await repondreNegociation(neg.id, { statut: 'accepte' });
      toast.success('Demande acceptée — commande créée');
      speak('Demande acceptée');
      await recharger();
      onAccepted?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur';
      toast.error(msg); speak(msg);
    } finally { setSubmitting(false); }
  };

  const contreProposer = async () => {
    if (!selected || nouveauPrix <= 0) return;
    setSubmitting(true);
    try {
      await repondreNegociation(selected.id, {
        statut: 'contre_offre',
        prixContreOffre: nouveauPrix,
        messageReponse: messageContre.trim() || undefined,
      });
      toast.success('Contre-proposition envoyée');
      speak('Contre-proposition envoyée');
      setShowContre(false); setSelected(null); setMessageContre('');
      await recharger();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur';
      toast.error(msg); speak(msg);
    } finally { setSubmitting(false); }
  };

  const refuser = async () => {
    if (!selected || !raisonRefus.trim()) return;
    setSubmitting(true);
    try {
      await repondreNegociation(selected.id, { statut: 'refuse', messageReponse: raisonRefus.trim() });
      toast.success('Demande refusée');
      speak('Demande refusée');
      setShowRefus(false); setSelected(null); setRaisonRefus('');
      await recharger();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur';
      toast.error(msg); speak(msg);
    } finally { setSubmitting(false); }
  };

  return (
    <>
      {loading && <p className="text-xs text-gray-500 mb-2">Chargement des demandes…</p>}
      <AnimatePresence>
        {recues.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="relative">
                <Bell className="w-5 h-5" style={{ color: accent }} strokeWidth={2.5} />
                <motion.span
                  animate={{ scale: [1, 1.4, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white"
                />
              </div>
              <span className="font-black text-gray-900 text-base">Demandes de marchands</span>
              <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full bg-orange-500">
                {recues.length} à traiter
              </span>
            </div>

            <div className="space-y-3">
              {recues.map((neg, idx) => {
                const info = STATUT_LABELS[neg.statut] || STATUT_LABELS['en_attente'];
                const restant = MAX_CONTRE_OFFRES - (neg.nbContreOffres || 0);
                return (
                  <motion.div
                    key={neg.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.07 }}
                    className="rounded-3xl border-2 overflow-hidden shadow-md"
                    style={{ borderColor: '#f97316', background: 'linear-gradient(135deg, #fff7ed, white)' }}
                  >
                    <div className="px-4 pt-3 pb-2 flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: info.bg, color: info.color }}
                        >
                          {info.label}
                        </span>
                        <p className="font-black text-gray-900 text-base mt-1">{neg.produit}</p>
                        <p className="text-xs text-gray-500">Marchand · {neg.marchandId.slice(0, 8)}…</p>
                      </div>
                    </div>

                    <div className="px-4 pb-3 grid grid-cols-3 gap-2">
                      <div className="bg-white/80 rounded-2xl p-2 text-center">
                        <p className="text-[10px] text-gray-500 font-semibold">Quantité</p>
                        <p className="font-bold text-gray-900 text-sm">{(neg.quantite || 0).toLocaleString('fr-FR')} {neg.unite}</p>
                      </div>
                      <div className="bg-white/80 rounded-2xl p-2 text-center">
                        <p className="text-[10px] text-gray-500 font-semibold">Prix proposé</p>
                        <p className="font-bold text-sm text-orange-600">{(neg.prixPropose || 0).toLocaleString('fr-FR')} F</p>
                      </div>
                      <div className="bg-white/80 rounded-2xl p-2 text-center">
                        <p className="text-[10px] text-gray-500 font-semibold">Total</p>
                        <p className="font-bold text-gray-900 text-sm">
                          {((neg.prixPropose || 0) * (neg.quantite || 0)).toLocaleString('fr-FR')}
                        </p>
                      </div>
                    </div>

                    {neg.statut === 'en_attente' && neg.nbContreOffres > 0 && (
                      <div className="px-4 pb-2">
                        <p className="text-xs text-purple-600 font-semibold">
                          Il te reste {restant} contre-offre{restant > 1 ? 's' : ''}
                        </p>
                      </div>
                    )}

                    {neg.message && (
                      <div className="px-4 pb-3">
                        <div className="bg-orange-50 rounded-2xl px-3 py-2 border border-orange-200">
                          <p className="text-xs text-orange-800 italic">&quot;{neg.message}&quot;</p>
                        </div>
                      </div>
                    )}

                    {neg.statut === 'en_attente' && (
                      <div className="px-4 pb-4 grid grid-cols-3 gap-2">
                        <motion.button
                          type="button"
                          onClick={() => void accepter(neg)}
                          disabled={submitting}
                          className="min-h-[44px] rounded-2xl font-bold text-white text-xs flex items-center justify-center gap-1 disabled:opacity-50"
                          style={{ backgroundColor: '#10b981' }}
                          whileTap={{ scale: 0.93 }}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" strokeWidth={2.5} />
                          Accepter
                        </motion.button>
                        <motion.button
                          type="button"
                          onClick={() => {
                            if (!peutContreOffrir(neg.nbContreOffres || 0)) {
                              toast.error(`Limite de ${MAX_CONTRE_OFFRES} contre-offres atteinte`);
                              return;
                            }
                            setSelected(neg);
                            setNouveauPrix(neg.prixPropose);
                            setShowContre(true);
                          }}
                          disabled={submitting || !peutContreOffrir(neg.nbContreOffres || 0)}
                          className="min-h-[44px] rounded-2xl font-bold text-white text-xs flex items-center justify-center gap-1 bg-purple-500 disabled:opacity-40"
                          whileTap={{ scale: 0.93 }}
                        >
                          <MessageSquare className="w-3.5 h-3.5" strokeWidth={2.5} />
                          Négocier
                        </motion.button>
                        <motion.button
                          type="button"
                          onClick={() => { setSelected(neg); setShowRefus(true); }}
                          disabled={submitting}
                          className="min-h-[44px] rounded-2xl font-bold text-white text-xs flex items-center justify-center gap-1 bg-red-500 disabled:opacity-50"
                          whileTap={{ scale: 0.93 }}
                        >
                          <ThumbsDown className="w-3.5 h-3.5" strokeWidth={2.5} />
                          Refuser
                        </motion.button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL CONTRE-PROPOSITION ── */}
      <AnimatePresence>
        {showContre && selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowContre(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 30 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-sm bg-white rounded-3xl shadow-2xl z-[210] overflow-hidden"
            >
              <div className="bg-gradient-to-r from-purple-600 to-purple-500 px-6 py-5 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" strokeWidth={2.5} />
                    Proposer un prix
                  </h2>
                  <p className="text-white/80 text-sm mt-1">
                    Prix actuel : {(selected.prixPropose || 0).toLocaleString('fr-FR')} FCFA/{selected.unite}
                  </p>
                  <p className="text-purple-200 text-xs mt-0.5">
                    Il reste {MAX_CONTRE_OFFRES - (selected.nbContreOffres || 0)} contre-offre(s) possible(s)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowContre(false)}
                  className="w-11 h-11 rounded-full bg-white/25 flex items-center justify-center hover:bg-white/40"
                >
                  <X className="w-5 h-5 text-white" strokeWidth={2.5} />
                </button>
              </div>

              <div className="p-5 space-y-5">
                <div>
                  <label className="block font-black text-gray-900 text-base mb-3">
                    Ton prix (FCFA/{selected.unite})
                  </label>
                  <div className="flex items-center gap-3">
                    <motion.button
                      type="button"
                      onClick={() => setNouveauPrix(p => Math.max(50, p - 50))}
                      className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center font-bold text-xl text-gray-700"
                      whileTap={{ scale: 0.9 }}
                    >
                      -
                    </motion.button>
                    <input
                      type="number"
                      value={nouveauPrix || ''}
                      onChange={e => setNouveauPrix(parseInt(e.target.value, 10) || 0)}
                      className="flex-1 min-w-0 px-4 py-4 rounded-2xl border-2 focus:outline-none font-black text-3xl text-gray-900 text-center bg-white"
                      style={{ borderColor: '#8b5cf6' }}
                    />
                    <motion.button
                      type="button"
                      onClick={() => setNouveauPrix(p => p + 50)}
                      className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center font-bold text-xl text-gray-700"
                      whileTap={{ scale: 0.9 }}
                    >
                      +
                    </motion.button>
                  </div>
                </div>

                <div>
                  <label className="block font-black text-gray-900 text-sm mb-2">Message (facultatif)</label>
                  <textarea
                    value={messageContre}
                    onChange={e => setMessageContre(e.target.value)}
                    placeholder="Ex : Ce prix correspond à mon coût de revient…"
                    rows={3}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none font-semibold text-sm text-gray-700 resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowContre(false)}
                    className="flex-1 py-4 rounded-2xl font-bold text-gray-700 bg-gray-100"
                  >
                    Annuler
                  </button>
                  <motion.button
                    type="button"
                    onClick={() => void contreProposer()}
                    disabled={submitting || nouveauPrix <= 0}
                    className="flex-1 py-4 rounded-2xl font-bold text-white shadow-lg disabled:opacity-50 bg-purple-500"
                    whileTap={{ scale: 0.97 }}
                  >
                    {submitting ? 'Envoi…' : 'Envoyer'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MODAL REFUS ── */}
      <AnimatePresence>
        {showRefus && selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowRefus(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 30 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-sm bg-white rounded-3xl shadow-2xl z-[210] overflow-hidden"
            >
              <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-5 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <ThumbsDown className="w-5 h-5" strokeWidth={2.5} />
                    Refuser la demande
                  </h2>
                  <p className="text-white/80 text-sm mt-1">Indique pourquoi tu refuses</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRefus(false)}
                  className="w-11 h-11 rounded-full bg-white/25 flex items-center justify-center hover:bg-white/40"
                >
                  <X className="w-5 h-5 text-white" strokeWidth={2.5} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block font-black text-gray-900 text-sm mb-3">Raison du refus</label>
                  <div className="grid grid-cols-1 gap-2">
                    {RAISONS_REFUS.map(raison => (
                      <motion.button
                        key={raison}
                        type="button"
                        onClick={() => setRaisonRefus(raison)}
                        className={`py-3 px-4 rounded-2xl text-left font-semibold text-sm border-2 transition-all ${
                          raisonRefus === raison
                            ? 'border-red-400 bg-red-50 text-red-700'
                            : 'border-gray-200 bg-gray-50 text-gray-700'
                        }`}
                        whileTap={{ scale: 0.97 }}
                      >
                        {raison}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <textarea
                  value={raisonRefus}
                  onChange={e => setRaisonRefus(e.target.value)}
                  placeholder="Ou écris ta raison ici…"
                  rows={2}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none font-semibold text-sm text-gray-700 resize-none"
                />

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRefus(false)}
                    className="flex-1 py-4 rounded-2xl font-bold text-gray-700 bg-gray-100"
                  >
                    Annuler
                  </button>
                  <motion.button
                    type="button"
                    onClick={() => void refuser()}
                    disabled={submitting || !raisonRefus.trim()}
                    className="flex-1 py-4 rounded-2xl font-bold text-white shadow-lg disabled:opacity-50 bg-red-500"
                    whileTap={{ scale: 0.97 }}
                  >
                    {submitting ? 'Envoi…' : 'Refuser'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
