/**
 * FicheActeurDetailModal — Modal universelle de consultation d'une fiche acteur
 * Utilisée par : Identificateur, Institution, Marchand, Producteur, Coopérative
 */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import {
  X, User, Phone, MapPin, Calendar, Activity,
  CheckCircle, Clock, XCircle, ShieldCheck,
  Building2, Sprout, Store, Users, Edit3,
  IdCard, Briefcase, FileText, Star, Lock,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { API_URL } from '../../utils/api';

/* ─── Config par rôle ───────────────────────────────────────── */
const ROLE_CONFIG: Record<string, {
  label: string; color: string; bgLight: string;
  borderLight: string; gradient: string; icon: React.FC<any>;
}> = {
  marchand: {
    label: 'Marchand', color: '#C66A2C', bgLight: '#FFF7ED',
    borderLight: '#FED7AA', gradient: 'linear-gradient(135deg,#C66A2C,#D97706)',
    icon: Store,
  },
  producteur: {
    label: 'Producteur', color: '#2E8B57', bgLight: '#F0FDF4',
    borderLight: '#BBF7D0', gradient: 'linear-gradient(135deg,#2E8B57,#3BA869)',
    icon: Sprout,
  },
  cooperative: {
    label: 'Coopérative', color: '#2072AF', bgLight: '#EFF6FF',
    borderLight: '#BFDBFE', gradient: 'linear-gradient(135deg,#2072AF,#3A8FCC)',
    icon: Building2,
  },
  identificateur: {
    label: 'Identificateur', color: '#9F8170', bgLight: '#FDF8F6',
    borderLight: '#D6C5BB', gradient: 'linear-gradient(135deg,#9F8170,#B39485)',
    icon: IdCard,
  },
  institution: {
    label: 'Institution', color: '#712864', bgLight: '#FDF4FF',
    borderLight: '#E9D5FF', gradient: 'linear-gradient(135deg,#712864,#9B3D8A)',
    icon: ShieldCheck,
  },
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  actif:         { label: 'Actif',           color: '#15803d', bg: '#dcfce7', border: '#bbf7d0', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  complement:    { label: 'Complément requis', color: '#2563eb', bg: '#dbeafe', border: '#bfdbfe', icon: <Clock className="w-3.5 h-3.5" /> },
  rejetee:       { label: 'Rejeté',           color: '#dc2626', bg: '#fee2e2', border: '#fecaca', icon: <XCircle className="w-3.5 h-3.5" /> },
  rejete:        { label: 'Rejeté',           color: '#dc2626', bg: '#fee2e2', border: '#fecaca', icon: <XCircle className="w-3.5 h-3.5" /> },
  approved:      { label: 'Validé',          color: '#15803d', bg: '#dcfce7', border: '#bbf7d0', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  soumis:        { label: 'En attente',        color: '#92400e', bg: '#fef3c7', border: '#fde68a', icon: <Clock className="w-3.5 h-3.5" /> },
  en_attente:    { label: 'En attente',      color: '#d97706', bg: '#fef3c7', border: '#fde68a', icon: <Clock className="w-3.5 h-3.5" /> },
  draft:         { label: 'Brouillon',       color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb', icon: <Edit3 className="w-3.5 h-3.5" /> },
  rejected:      { label: 'Rejeté',          color: '#dc2626', bg: '#fee2e2', border: '#fecaca', icon: <XCircle className="w-3.5 h-3.5" /> },
  suspendu:      { label: 'Suspendu',        color: '#dc2626', bg: '#fee2e2', border: '#fecaca', icon: <XCircle className="w-3.5 h-3.5" /> },
  inactif:       { label: 'Inactif',         color: '#6b7280', bg: '#f3f4f6', border: '#e5e7eb', icon: <Clock className="w-3.5 h-3.5" /> },
  valide:        { label: 'Validé par BO',   color: '#15803d', bg: '#dcfce7', border: '#bbf7d0', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
};

/* ─── Types ─────────────────────────────────────────────────── */
export interface FicheActeurData {
  id?: string;
  prenoms: string;
  nom: string;
  role?: string;         // marchand | producteur | cooperative | identificateur
  type?: string;         // alias de role pour certains contextes
  telephone?: string;
  email?: string;
  commune?: string;
  region?: string;
  marche?: string;
  village?: string;
  activite?: string;
  statut?: string;
  dateIdentification?: string;
  dateCreation?: string;
  dateModification?: string;
  activiteRecente?: string;
  numeroId?: string;
  identificateur?: string;
  // champs extra
  [key: string]: any;
}

interface Props {
  acteur: FicheActeurData;
  onClose: () => void;
  onEdit?: () => void;
  canEdit?: boolean;
  contextRole?: string; // rôle du profil qui consulte
}

/* ─── Helpers ───────────────────────────────────────────────── */
function InfoRow({ icon: Icon, label, value, color }: { icon: any; label: string; value?: string; color: string }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 p-3.5 bg-white rounded-2xl border-2" style={{ borderColor: `${color}20` }}>
      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${color}15` }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-semibold">{label}</p>
        <p className="font-bold text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}

function SectionTitle({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="flex-1 h-px" style={{ backgroundColor: `${color}30` }} />
      <span className="text-xs font-black uppercase tracking-widest px-2" style={{ color }}>{children}</span>
      <div className="flex-1 h-px" style={{ backgroundColor: `${color}30` }} />
    </div>
  );
}

/* ─── Composant principal ───────────────────────────────────── */
export function FicheActeurDetailModal({ acteur, onClose, onEdit, canEdit, contextRole }: Props) {
  const navigate = useNavigate();
  const { speak } = useApp();
  const [historiqueActeur, setHistoriqueActeur] = useState<Array<{id: string; date: string; type: string; description: string}>>([]);
  const [loadingHistorique, setLoadingHistorique] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinVerifyLoading, setPinVerifyLoading] = useState(false);

  const roleKey = acteur.role || acteur.type || contextRole || 'marchand';
  const cfg = ROLE_CONFIG[roleKey] || ROLE_CONFIG.marchand;
  const Icon = cfg.icon || User;

  const statusKey = acteur.statut || 'actif';
  const statusCfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.actif;

  const initials = `${(acteur.prenoms || '').charAt(0)}${(acteur.nom || '').charAt(0)}`.toUpperCase();

  const dateStr = acteur.dateIdentification || acteur.dateCreation;
  const dateFormatted = dateStr
    ? new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : undefined;
  const dateModifStr = acteur.dateModification || acteur.activiteRecente;
  const dateModifFormatted = dateModifStr
    ? new Date(dateModifStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    : undefined;

  // speak est stable par conception, acteur ne change pas après mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  React.useEffect(() => {
    speak(`Fiche de ${acteur.prenoms} ${acteur.nom}, ${cfg.label}`);
  }, []);

  useEffect(() => {
    if (!acteur?.id) return;
    const userId = (acteur as any).acteurId || (acteur as any).acteur_id || acteur.id;
    if (!userId) return;
    setLoadingHistorique(true);
    fetch(`${API_URL}/users/${userId}/historique`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => { if (data.historique) setHistoriqueActeur(data.historique); })
      .catch((e: any) => { console.warn('[FicheActeurDetailModal] historique failed:', e?.message); })
      .finally(() => setLoadingHistorique(false));
  }, [acteur?.id]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[400] flex items-end justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        {/* Sheet */}
        <motion.div
          className="relative w-full max-w-md rounded-t-3xl overflow-hidden flex flex-col shadow-2xl"
          style={{ maxHeight: '92dvh', backgroundColor: '#FAFAF8' }}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
        >
          {/* ── Header coloré ── */}
          <div
            className="relative flex-shrink-0 px-5 pt-5 pb-6"
            style={{ background: cfg.gradient }}
          >
            {/* Handle */}
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-white/40" />
            </div>

            {/* Bouton fermer */}
            <motion.button
              onClick={onClose}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center"
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.35)' }}
            >
              <X className="w-5 h-5 text-white" strokeWidth={2.5} />
            </motion.button>

            {/* Avatar + Nom */}
            <div className="flex items-end gap-4">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <motion.div
                  className="w-20 h-20 rounded-3xl bg-white/25 backdrop-blur-sm border-2 border-white/40 flex items-center justify-center shadow-xl overflow-hidden"
                  whileHover={{ scale: 1.05 }}
                >
                  {(acteur as any).photo ? (
                    <img src={(acteur as any).photo} alt={`${acteur.prenoms} ${acteur.nom}`} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl font-black text-white">{initials}</span>
                  )}
                </motion.div>
                {/* Badge rôle */}
                <div
                  className="absolute -bottom-2 -right-2 w-9 h-9 rounded-2xl border-2 border-white flex items-center justify-center shadow-md"
                  style={{ background: cfg.gradient }}
                >
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </div>

              {/* Infos header */}
              <div className="flex-1 min-w-0 pb-1">
                <h2 className="text-2xl font-black text-white leading-tight mb-1">
                  {acteur.prenoms} {acteur.nom}
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Badge rôle */}
                  <span className="px-3 py-1 rounded-full text-xs font-black bg-white/25 text-white border border-white/40">
                    {cfg.label}
                  </span>
                  {/* Badge statut */}
                  <span
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black border-2"
                    style={{ backgroundColor: statusCfg.bg, color: statusCfg.color, borderColor: statusCfg.border }}
                  >
                    {statusCfg.icon}
                    {statusCfg.label}
                  </span>
                </div>
              </div>
            </div>

            {/* N° de fiche si disponible */}
            {acteur.numeroId && (
              <motion.div
                className="mt-4 px-4 py-2 rounded-2xl bg-white/20 border border-white/30 inline-flex items-center gap-2"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
              >
                <IdCard className="w-4 h-4 text-white" />
                <span className="text-sm font-black text-white">{acteur.numeroId}</span>
              </motion.div>
            )}
          </div>

          {/* ── Corps scrollable ── */}
          <div className="flex-1 overflow-y-auto">
            <div className="px-5 py-5 space-y-5">

              {/* CONTACT */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <SectionTitle color={cfg.color}>Contact</SectionTitle>
                <div className="space-y-2">
                  <InfoRow icon={Phone}    label="Téléphone"  value={acteur.telephone}  color={cfg.color} />
                  <InfoRow icon={User}     label="Email"       value={acteur.email}       color={cfg.color} />
                </div>
              </motion.div>

              {/* LOCALISATION */}
              {(acteur.commune || acteur.region || acteur.marche || acteur.village) && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                >
                  <SectionTitle color={cfg.color}>Localisation</SectionTitle>
                  <div className="space-y-2">
                    <InfoRow icon={MapPin} label="Commune"     value={acteur.commune}    color={cfg.color} />
                    <InfoRow icon={MapPin} label="Région"      value={acteur.region}     color={cfg.color} />
                    <InfoRow icon={Store}  label="Marché"      value={acteur.marche}     color={cfg.color} />
                    <InfoRow icon={MapPin} label="Village"     value={acteur.village}    color={cfg.color} />
                  </div>
                </motion.div>
              )}

              {/* ACTIVITÉ */}
              {acteur.activite && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <SectionTitle color={cfg.color}>Activité</SectionTitle>
                  <div className="p-4 rounded-3xl border-2" style={{ borderColor: `${cfg.color}25`, backgroundColor: cfg.bgLight }}>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.gradient }}>
                        <Activity className="w-5 h-5 text-white" />
                      </div>
                      <p className="font-bold text-gray-900 pt-2">{acteur.activite}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* DATES */}
              {(dateFormatted || dateModifFormatted || acteur.identificateur) && (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <SectionTitle color={cfg.color}>Informations</SectionTitle>
                  <div className="space-y-2">
                    <InfoRow icon={Calendar}    label="Date d'identification" value={dateFormatted}         color={cfg.color} />
                    <InfoRow icon={Clock}       label="Dernière mise à jour"  value={dateModifFormatted}    color={cfg.color} />
                    <InfoRow icon={User}        label="Identificateur"        value={acteur.identificateur} color={cfg.color} />
                  </div>
                </motion.div>
              )}

              {/* Badge de certification */}
              <motion.div
                className="flex items-center gap-4 p-4 rounded-3xl border-2"
                style={{ borderColor: `${cfg.color}30`, background: cfg.bgLight }}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
              >
                <motion.div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-md"
                  style={{ background: cfg.gradient }}
                  animate={{ rotate: [0, 5, -5, 0] }}
                  transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <ShieldCheck className="w-6 h-6 text-white" />
                </motion.div>
                <div>
                  <p className="font-black text-gray-900" style={{ fontFamily: 'Calisga Bold, sans-serif' }}>
                    Acteur certifié Jùlaba
                  </p>
                  <p className="text-xs text-gray-500 font-medium">Plateforme Nationale d'Inclusion Économique</p>
                </div>
              </motion.div>

              {/* HISTORIQUE */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
              >
                <SectionTitle color={cfg.color}>Historique des modifications</SectionTitle>
                {loadingHistorique && <p className="text-sm text-gray-400 text-center py-2">Chargement...</p>}
                {!loadingHistorique && historiqueActeur.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-2">Aucun historique disponible</p>
                )}
                {!loadingHistorique && historiqueActeur.map((h) => (
                  <div key={h.id} className="flex gap-3 p-3 bg-gray-50 rounded-xl mb-2">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 text-sm">{h.description}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(h.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                        {' '}a{' '}
                        {new Date(h.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </motion.div>


            </div>
          </div>

          {/* ── Footer CTA ── */}
          <div className="flex-shrink-0 px-5 pb-6 pt-3 border-t border-gray-100 bg-white/90">
            <div className="flex gap-3">
              <motion.button
                onClick={onClose}
                className="flex-1 py-4 rounded-2xl font-bold text-gray-700 bg-gray-100 border-2 border-gray-200"
                whileTap={{ scale: 0.97 }}
              >
                Fermer
              </motion.button>
              {acteur.statut === 'complement' && (
                <motion.button
                  onClick={() => { 
                    const complementState = {
                      mode: 'complement',
                      identificationId: acteur.id,
                      acteurId: (acteur as any).acteurId || acteur.acteur_id || acteur.id || '',
                      typeActeur: acteur.role,
                    };
                    sessionStorage.setItem('complement_dossier', JSON.stringify(complementState));
                    navigate('/identificateur/fiche-identification', { state: {
                      mode: 'complement',
                      identificationId: acteur.id,
                      acteurId: (acteur as any).acteurId || acteur.acteur_id || acteur.id || '',
                      phone: acteur.telephone,
                      typeActeur: acteur.role,
                      nom: acteur.nom,
                      prenoms: acteur.prenoms,
                      commune: acteur.commune,
                      marche: acteur.marche,
                      activite: acteur.activite,
                    }});
                    onClose();
                  }}
                  className="flex-1 py-4 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center gap-2 bg-blue-600"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Clock className="w-5 h-5" />
                  Compléter le dossier
                </motion.button>
              )}
              {canEdit && onEdit && acteur.statut !== 'complement' && (
                <motion.button
                  onClick={() => { setShowPinModal(true); setPinCode(''); setPinError(''); }}
                  className="flex-1 py-4 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center gap-2"
                  style={{ background: cfg.gradient }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <Edit3 className="w-5 h-5" strokeWidth={2.5} />
                  Modifier
                </motion.button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
      {showPinModal && (
        <motion.div
          className="fixed inset-0 z-[500] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowPinModal(false)} />
          <motion.div
            className="relative bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${cfg.color}20` }}>
              <Lock className="w-8 h-8" style={{ color: cfg.color }} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Code de sécurité</h3>
            <p className="text-sm text-gray-600 text-center mb-6">Entre ton code à 4 chiffres pour modifier la fiche</p>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pinCode}
              onChange={(e) => { setPinCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setPinError(''); }}
              placeholder="••••"
              className="w-full text-2xl h-14 rounded-2xl text-center tracking-widest mb-2 border-2 border-gray-200 focus:outline-none focus:border-gray-400"
              autoFocus
            />
            {pinError && <p className="text-red-500 text-sm text-center mb-4">{pinError}</p>}
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => { setShowPinModal(false); setPinCode(''); setPinError(''); }}
                className="flex-1 h-12 rounded-2xl font-bold text-gray-700 bg-gray-100 border-2 border-gray-200"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={pinVerifyLoading}
                onClick={async () => {
                  if (pinCode.length !== 4) { setPinError('Le code doit contenir 4 chiffres'); return; }
                  setPinVerifyLoading(true);
                  try {
                    const res = await fetch(`${API_URL}/auth/identificateur/me/verify-pin`, {
                      method: 'POST',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ pin: pinCode }),
                    });
                    const data = await res.json();
                    if (!res.ok || !data.valid) {
                      setPinError(data.message || 'PIN incorrect');
                      return;
                    }
                    setShowPinModal(false);
                    setPinCode('');
                    setPinError('');
                    if (onEdit) onEdit();
                  } catch {
                    setPinError('Erreur de connexion');
                  } finally {
                    setPinVerifyLoading(false);
                  }
                }}
                className="flex-1 h-12 rounded-2xl font-bold text-white shadow-lg disabled:opacity-60"
                style={{ background: cfg.gradient }}
              >
                {pinVerifyLoading ? '…' : 'Valider'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}