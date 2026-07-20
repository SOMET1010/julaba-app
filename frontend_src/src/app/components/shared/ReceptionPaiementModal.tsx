import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CheckCircle, AlertCircle, Smartphone, Banknote, RefreshCw, Lock, Clock, Users } from 'lucide-react';
import { useModalRegister } from '../../contexts/ModalContext';
import { useApp } from '../../contexts/AppContext';
import { PinConfirmModal } from '../marchand/PinConfirmModal';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Commande {
  id: string;
  produit: string;
  quantite: string | number;
  total: number;
  vendeurNom?: string;
  acheteurNom?: string;
  dateCommande?: string;
  dateLivraisonPrevue?: string;
  membres?: string[];
  unite?: string;
}

interface ReceptionPaiementModalProps {
  isOpen: boolean;
  onClose: () => void;
  commande: Commande | null;
  role: 'marchand' | 'producteur' | 'cooperative';
  onSuccess?: () => void;
  onPaiement?: (commandeId: string, modePaiement: string) => Promise<void>;
}

// ── Couleurs rôle ──────────────────────────────────────────────────────────────

const ROLE_COLORS: Record<string, string> = {
  marchand:    '#C66A2C',
  producteur:  '#2E8B57',
  cooperative: '#2072AF',
};

const ROLE_BG: Record<string, string> = {
  marchand:    '#FFF2E9',
  producteur:  '#F0FAF4',
  cooperative: '#EFF6FF',
};

// ── Modes paiement ─────────────────────────────────────────────────────────────

const MODES_PAIEMENT = [
  { id: 'keiwa',   label: 'Keiwa',   sub: 'Paiement mobile · immédiat',   icon: Smartphone },
  { id: 'especes', label: 'Espèces', sub: 'À la remise physique',          icon: Banknote   },
  { id: 'autre',   label: 'Autre',   sub: 'Virement, chèque…',            icon: RefreshCw  },
];

const MODES_PAIEMENT_COOP = [
  { id: 'keiwa',       label: 'Keiwa collectif',        sub: 'Paiement mobile groupé',    icon: Smartphone },
  { id: 'especes',     label: 'Espèces',                sub: 'Collecte physique',          icon: Banknote   },
  { id: 'tresorerie',  label: 'Trésorerie coopérative', sub: 'Débit du compte commun',    icon: RefreshCw  },
];

// ── Composant ──────────────────────────────────────────────────────────────────

export function ReceptionPaiementModal({
  isOpen,
  onClose,
  commande,
  role,
  onSuccess,
  onPaiement,
}: ReceptionPaiementModalProps) {
  useModalRegister(isOpen);

  const { speak, user } = useApp();
  const [etape, setEtape] = useState<1 | 2>(1);
  const [qualite, setQualite] = useState<'conforme' | 'non_conforme' | null>(null);
  const [modePaiement, setModePaiement] = useState<string>('keiwa');
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const color  = ROLE_COLORS[role] ?? ROLE_COLORS.marchand;
  const bg     = ROLE_BG[role]     ?? ROLE_BG.marchand;
  const modes  = role === 'cooperative' ? MODES_PAIEMENT_COOP : MODES_PAIEMENT;
  const numRef = commande ? `CMD-${commande.id.slice(0, 8).toUpperCase()}` : '';
  const montantFormate = commande
    ? commande.total.toLocaleString('fr-FR') + ' FCFA'
    : '';

  // Date livraison prévue vs réelle
  const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  const datePrevue = commande?.dateLivraisonPrevue
    ? new Date(commande.dateLivraisonPrevue).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
    : '—';

  const handleConfirmerReception = async () => {
    if (!commande) return;
    if (!qualite) {
      toast.error('Veuillez indiquer la qualité reçue');
      return;
    }
    speak('Réception confirmée. Passons au paiement.');
    setEtape(2);
  };

  const handleValiderPaiement = () => {
    if (!commande) return;
    // PIN requis uniquement pour keiwa (mouvement wallet). Especes/autre/tresorerie : marquage direct.
    if (modePaiement === 'keiwa' && user?.pinSecurityEnabled) {
      setShowPin(true);
    } else {
      handlePaiementConfirme();
    }
  };

  const handlePaiementConfirme = async () => {
    setShowPin(false);
    if (!commande) return;
    setLoading(true);
    try {
      await onPaiement?.(commande.id, modePaiement);
      speak(`Paiement de ${montantFormate} validé par ${modePaiement}.`);
      toast.success('Paiement confirmé avec succès');
      onSuccess?.();
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erreur lors du paiement';
      toast.error(msg);
      speak(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEtape(1);
    setQualite(null);
    setModePaiement('keiwa');
    setShowPin(false);
    onClose();
  };

  if (!isOpen || !commande) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end justify-center"
            onClick={handleClose}
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            {/* Modal sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="relative w-full max-w-lg bg-white rounded-t-3xl p-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs text-gray-400 tracking-widest uppercase mb-0.5">{numRef}</p>
                  <h2 className="text-xl font-bold text-gray-900">
                    {etape === 1 ? 'Réception de commande' : 'Mode de paiement'}
                  </h2>
                </div>
                <motion.button
                  onClick={handleClose}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5 text-gray-600" />
                </motion.button>
              </div>

              {/* Barre progression */}
              <div className="flex gap-1 mb-4">
                <div className="h-1 flex-1 rounded-full transition-all duration-500"
                  style={{ background: color }} />
                <div className="h-1 flex-1 rounded-full transition-all duration-500"
                  style={{ background: etape === 2 ? color : '#e5e7eb' }} />
              </div>

              {/* Badge étape */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4"
                style={{ background: bg, color }}>
                <motion.span
                  className="w-2 h-2 rounded-full"
                  style={{ background: color }}
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                />
                Étape {etape} sur 2 · {etape === 1 ? 'Réception' : 'Paiement'}
              </div>

              {/* ── ÉTAPE 1 ── */}
              {etape === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* Infos commande */}
                  <div className="bg-gray-50 rounded-2xl p-4 mb-4 border border-gray-100">
                    <div className="flex justify-between py-1.5 text-sm">
                      <span className="text-gray-500">Produit</span>
                      <span className="font-semibold text-gray-900">{commande.produit}</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-sm">
                      <span className="text-gray-500">Quantité</span>
                      <span className="font-semibold text-gray-900">
                        {commande.quantite} {commande.unite ?? ''}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 text-sm">
                      <span className="text-gray-500">
                        {role === 'producteur' ? 'Acheteur' : 'Fournisseur'}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {role === 'producteur' ? commande.acheteurNom : commande.vendeurNom ?? 'Producteur'}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 text-sm">
                      <span className="text-gray-500">Livraison prévue</span>
                      <span className="font-semibold text-gray-900">{datePrevue}</span>
                    </div>
                    <div className="flex justify-between py-1.5 text-sm">
                      <span className="text-gray-500">Livraison réelle</span>
                      <span className="font-semibold flex items-center gap-1" style={{ color: '#2E8B57' }}>
                        {today}
                        <CheckCircle className="w-3.5 h-3.5" />
                      </span>
                    </div>
                    {role === 'cooperative' && commande.membres && commande.membres.length > 0 && (
                      <>
                        <div className="border-t border-gray-200 my-2" />
                        <div className="flex items-center gap-2 py-1">
                          <Users className="w-4 h-4" style={{ color }} />
                          <span className="text-xs font-semibold" style={{ color }}>
                            Membres concernés ({commande.membres.length})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {commande.membres.map((m, i) => (
                            <span key={i} className="text-xs font-semibold px-2 py-1 rounded-lg"
                              style={{ background: bg, color }}>
                              {m}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                    <div className="border-t border-gray-200 my-2" />
                    <div className="flex justify-between items-center py-1">
                      <span className="text-gray-500 text-sm">Montant total</span>
                      <span className="text-2xl font-bold" style={{ color }}>{montantFormate}</span>
                    </div>
                  </div>

                  {/* Qualité */}
                  <p className="text-sm font-semibold text-gray-700 mb-2">Qualité reçue</p>
                  <div className="flex gap-3 mb-5">
                    <motion.button
                      onClick={() => setQualite('conforme')}
                      className="flex-1 py-3 rounded-xl border-2 text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                      style={{
                        borderColor: qualite === 'conforme' ? '#2E8B57' : '#e5e7eb',
                        color: qualite === 'conforme' ? '#2E8B57' : '#6b7280',
                        background: qualite === 'conforme' ? '#F0FAF4' : '#fff',
                      }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <CheckCircle className="w-4 h-4" />
                      Conforme
                    </motion.button>
                    <motion.button
                      onClick={() => setQualite('non_conforme')}
                      className="flex-1 py-3 rounded-xl border-2 text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                      style={{
                        borderColor: qualite === 'non_conforme' ? '#dc2626' : '#e5e7eb',
                        color: qualite === 'non_conforme' ? '#dc2626' : '#6b7280',
                        background: qualite === 'non_conforme' ? '#FEF2F2' : '#fff',
                      }}
                      whileTap={{ scale: 0.97 }}
                    >
                      <AlertCircle className="w-4 h-4" />
                      Non conforme
                    </motion.button>
                  </div>

                  {/* CTA */}
                  <motion.button
                    onClick={handleConfirmerReception}
                    disabled={loading || !qualite}
                    className="w-full py-4 rounded-2xl text-white font-bold text-base disabled:opacity-50 mb-3"
                    style={{ background: color }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {loading ? 'Confirmation…' : 'Confirmer la réception'}
                  </motion.button>

                  <button
                    onClick={() => {
                      speak('Signalement de problème');
                      toast('Fonctionnalité de litige bientôt disponible.');
                    }}
                    className="w-full text-center text-sm text-gray-400 flex items-center justify-center gap-1.5 py-1"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    Signaler un problème
                  </button>
                </motion.div>
              )}

              {/* ── ÉTAPE 2 ── */}
              {etape === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  {/* Récap montant */}
                  <div className="rounded-2xl p-4 text-center mb-4" style={{ background: bg }}>
                    <p className="text-xs text-gray-500 mb-1">Montant à régler</p>
                    <p className="text-3xl font-bold" style={{ color }}>{montantFormate}</p>
                    {role === 'cooperative' && commande.membres && commande.membres.length > 0 && (
                      <p className="text-xs font-semibold mt-1" style={{ color }}>
                        {Math.round(commande.total / commande.membres.length).toLocaleString('fr-FR')} FCFA par membre
                      </p>
                    )}
                  </div>

                  {/* Modes paiement */}
                  <div className="space-y-3 mb-5">
                    {modes.map((mode) => {
                      const Icon = mode.icon;
                      const selected = modePaiement === mode.id;
                      return (
                        <motion.button
                          key={mode.id}
                          onClick={() => setModePaiement(mode.id)}
                          className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 transition-all text-left"
                          style={{
                            borderColor: selected ? color : '#e5e7eb',
                            background: selected ? bg : '#fff',
                          }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: selected ? color + '22' : '#f3f4f6' }}>
                            <Icon className="w-5 h-5" style={{ color: selected ? color : '#6b7280' }} />
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-sm text-gray-900">{mode.label}</p>
                            <p className="text-xs text-gray-400">{mode.sub}</p>
                          </div>
                          <div className="w-5 h-5 rounded-full border-2 transition-all flex items-center justify-center"
                            style={{ borderColor: selected ? color : '#d1d5db' }}>
                            {selected && (
                              <motion.div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ background: color }}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 400 }}
                              />
                            )}
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>

                  {/* Délai encaissement */}
                  {modePaiement === 'keiwa' && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 mb-4 text-xs text-gray-500"
                    >
                      <Clock className="w-3.5 h-3.5 flex-shrink-0" />
                      Encaissement immédiat via Keiwa
                    </motion.div>
                  )}

                  {/* CTA PIN */}
                  <motion.button
                    onClick={handleValiderPaiement}
                    disabled={loading}
                    className="w-full py-4 rounded-2xl text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: color }}
                    whileTap={{ scale: 0.97 }}
                  >
                    {modePaiement === 'keiwa' && <Lock className="w-4 h-4" />}
                    {modePaiement === 'keiwa' ? 'Valider · Confirmer le PIN' : 'Valider le paiement'}
                  </motion.button>
                </motion.div>
              )}
            </motion.div>
          </motion.div>

          {/* PIN Modal */}
          <AnimatePresence>
            {showPin && (
              <PinConfirmModal
                title="Confirmer le paiement"
                message={`Saisissez votre code pour valider ${montantFormate}`}
                successMessage={`Paiement de ${montantFormate} confirmé`}
                subText="Le paiement sera traité immédiatement"
                onClose={() => setShowPin(false)}
                onConfirm={handlePaiementConfirme}
                speak={speak}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
