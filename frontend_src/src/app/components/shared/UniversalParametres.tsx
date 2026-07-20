import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell, Shield, Fingerprint, Lock, Mic, Globe, Smartphone,
  AlertTriangle, Save, Check, X, ChevronRight, LogOut, Trash2,
  MapPin, Target, BarChart3, Users, Leaf, Calendar, Download,
  Headphones,
  Building2, Store, UserCheck,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApp } from '../../contexts/AppContext';
import { useUser } from '../../contexts/UserContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useLangPref, LANG_FLAGS, LANG_LABELS, type AppLang } from '../../hooks/useLangPref';
import { SubPageLayout } from '../layout/SubPageLayout';
import { IdentificateurPinChangeSection } from '../identificateur/IdentificateurPinChangeSection';
import { VoiceLevelSelector } from './VoiceLevelSelector';
import { TextSizeSlider } from './TextSizeSlider';
import { ChangePasswordModal } from './ChangePasswordModal';
import { registerWebAuthn, verifyWebAuthnForKeiwa } from '../../hooks/useWebAuthn';
import { API_URL } from '../../utils/api';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────

export type ParametresRole =
  | 'marchand'
  | 'producteur'
  | 'cooperative'
  | 'identificateur'
  | 'institution';

// ─── Config couleurs ──────────────────────────────────────────

const ROLE_CONFIG: Record<ParametresRole, {
  color: string;
  label: string;
  version: string;
  profileIcon: React.ElementType;
  homeRoute: string;
  footerMsg: string;
}> = {
  marchand: {
    color: '#C66A2C',
    label: 'Marchand',
    version: 'Jùlaba Marchand v1.0',
    profileIcon: Store,
    homeRoute: '/marchand',
    footerMsg: 'Tes données et ton keiwa sont protégés localement sur cet appareil.',
  },
  producteur: {
    color: '#2E8B57',
    label: 'Producteur',
    version: 'Jùlaba Producteur v1.0',
    profileIcon: Leaf,
    homeRoute: '/producteur',
    footerMsg: 'Tes données et ton keiwa sont protégés localement sur cet appareil.',
  },
  cooperative: {
    color: '#2072AF',
    label: 'Coopérative',
    version: 'Jùlaba Coopérative v1.0',
    profileIcon: Users,
    homeRoute: '/cooperative',
    footerMsg: 'Tes données de vente et ton keiwa sont protégés localement sur cet appareil.',
  },
  identificateur: {
    color: '#9F8170',
    label: 'Identificateur',
    version: 'Jùlaba Identificateur v1.0',
    profileIcon: UserCheck,
    homeRoute: '/identificateur',
    footerMsg: 'Les données des acteurs identifiés sont protégées et ne sont accessibles qu\'au Back Office Jùlaba.',
  },
  institution: {
    color: '#712864',
    label: 'Institution',
    version: 'Jùlaba Institution v1.0',
    profileIcon: Building2,
    homeRoute: '/institution',
    footerMsg: 'Les données sont protégées localement sur cet appareil.',
  },
};

// ─── Composants UI internes ───────────────────────────────────

function Toggle({ value, onChange, color }: { value: boolean; onChange: (v: boolean) => void; color: string }) {
  return (
    <motion.button
      onClick={() => onChange(!value)}
      className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
      style={{ backgroundColor: value ? color : '#E5E7EB' }}
      whileTap={{ scale: 0.95 }}
    >
      <motion.div
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
        animate={{ x: value ? 24 : 4 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      />
    </motion.button>
  );
}

function Section({ title, icon: Icon, color, children }: {
  title: string; icon: React.ElementType; color: string; children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl border-2 border-gray-100 overflow-hidden"
    >
      <div
        className="flex items-center gap-3 px-5 py-4 border-b border-gray-100"
        style={{ background: `linear-gradient(90deg, ${color}10 0%, transparent 100%)` }}
      >
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <h3 className="font-bold text-gray-900">{title}</h3>
      </div>
      <div className="divide-y divide-gray-100">{children}</div>
    </motion.div>
  );
}

function RowToggle({ label, sublabel, value, onChange, color }: {
  label: string; sublabel?: string; value: boolean; onChange: (v: boolean) => void; color: string;
}) {
  return (
    <div className="flex items-center justify-between px-5 py-4">
      <div className="flex-1 pr-4">
        <p className="font-semibold text-gray-900">{label}</p>
        {sublabel && <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>}
      </div>
      <Toggle value={value} onChange={onChange} color={color} />
    </div>
  );
}

function RowAction({ label, sublabel, icon: Icon, danger, badge, onClick }: {
  label: string; sublabel?: string; icon?: React.ElementType;
  danger?: boolean; badge?: number; onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      className="w-full flex items-center justify-between px-5 py-4 text-left"
      whileTap={{ scale: 0.99 }}
    >
      <div className="flex-1">
        <p className="font-semibold" style={{ color: danger ? '#DC2626' : '#111827' }}>{label}</p>
        {sublabel && <p className="text-xs text-gray-500 mt-0.5">{sublabel}</p>}
      </div>
      <div className="flex items-center gap-2">
        {badge !== undefined && badge > 0 && (
          <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
            <span className="text-white text-xs font-bold">{badge}</span>
          </div>
        )}
        {Icon
          ? <Icon className="w-5 h-5" style={{ color: danger ? '#DC2626' : '#9CA3AF' }} />
          : <ChevronRight className="w-5 h-5 text-gray-400" />
        }
      </div>
    </motion.button>
  );
}

// ─── Modal Danger ─────────────────────────────────────────────

function ModalDanger({ isOpen, title, message, confirmLabel, onConfirm, onClose }: {
  isOpen: boolean; title: string; message: string;
  confirmLabel?: string; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-5"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-3xl p-6 w-full max-w-sm"
          >
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 text-center mb-2">{title}</h3>
            <p className="text-gray-500 text-center text-sm mb-6">{message}</p>
            <div className="flex gap-3">
              <motion.button
                onClick={onClose} whileTap={{ scale: 0.97 }}
                className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-700"
              >
                Annuler
              </motion.button>
              <motion.button
                onClick={() => { onConfirm(); onClose(); }} whileTap={{ scale: 0.97 }}
                className="flex-1 py-3 rounded-2xl bg-red-500 font-bold text-white"
              >
                {confirmLabel || 'Confirmer'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Modal Supprimer compte ───────────────────────────────────

function ModalDeleteAccount({ isOpen, onClose }: {
  isOpen: boolean; onClose: () => void;
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => { setStep(1); setPassword(''); setError(''); onClose(); };

  const handleDelete = async () => {
    if (!password || password.length < 4) { setError('Code requis (4 chiffres min)'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/account`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await res.json() as { success?: boolean; message?: string };
      if (!res.ok || !data.success) { setError(data.message || 'Erreur'); return; }
      toast.success('Compte supprimé');
      navigate('/');
    } catch { setError('Erreur réseau'); }
    finally { setLoading(false); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-t-3xl w-full p-6 pb-10"
          >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5" />
            {step === 1 ? (
              <>
                <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Supprimer mon compte</h3>
                <p className="text-sm text-gray-500 text-center mb-2">
                  Cette action est <span className="font-bold text-red-600">définitive et irréversible</span>.
                </p>
                <p className="text-xs text-gray-400 text-center mb-6">
                  Toutes tes données, transactions et historiques seront perdus.
                </p>
                <div className="flex gap-3">
                  <motion.button onClick={handleClose} whileTap={{ scale: 0.97 }}
                    className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-700">
                    Annuler
                  </motion.button>
                  <motion.button onClick={() => setStep(2)} whileTap={{ scale: 0.97 }}
                    className="flex-1 py-3 rounded-2xl bg-red-500 font-bold text-white">
                    Continuer
                  </motion.button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-xl font-bold text-gray-900 text-center mb-2">Confirme ton identité</h3>
                <p className="text-sm text-gray-500 text-center mb-6">Entre ton code de connexion pour confirmer la suppression</p>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={password}
                  onChange={e => setPassword(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  className="w-full text-center text-3xl font-bold tracking-widest border-2 border-gray-200 rounded-2xl py-4 mb-3 outline-none focus:border-red-400"
                />
                {error && <p className="text-red-500 text-sm text-center mb-3">{error}</p>}
                <div className="flex gap-3">
                  <motion.button onClick={() => setStep(1)} whileTap={{ scale: 0.97 }}
                    className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-700">
                    Retour
                  </motion.button>
                  <motion.button onClick={() => { void handleDelete(); }} disabled={loading} whileTap={{ scale: 0.97 }}
                    className="flex-1 py-3 rounded-2xl font-bold text-white"
                    style={{ backgroundColor: loading ? '#9CA3AF' : '#EF4444' }}>
                    {loading ? 'Suppression...' : 'Supprimer définitivement'}
                  </motion.button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Modal Sessions ───────────────────────────────────────────

function ModalSessions({ isOpen, onClose, color }: {
  isOpen: boolean; onClose: () => void; color: string;
}) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch(`${API_URL}/auth/sessions`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => setSessions(d.sessions || []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleRevoke = async (id: string) => {
    try {
      await fetch(`${API_URL}/auth/sessions/${id}`, { method: 'DELETE', credentials: 'include' });
      setSessions(prev => prev.filter(s => s.id !== id));
      toast.success('Session révoquée');
    } catch { toast.error('Erreur réseau'); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-t-3xl w-full max-h-[80vh] overflow-y-auto"
          >
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between rounded-t-3xl">
              <div className="w-12 h-1.5 bg-gray-200 rounded-full absolute top-3 left-1/2 -translate-x-1/2" />
              <h3 className="font-bold text-gray-900 text-lg mt-2">Historique des connexions</h3>
              <motion.button onClick={onClose} whileTap={{ scale: 0.9 }}
                className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center mt-2">
                <X className="w-4 h-4 text-gray-600" />
              </motion.button>
            </div>
            <div className="p-5 space-y-3">
              {loading ? (
                <p className="text-center text-gray-400 py-8">Chargement...</p>
              ) : sessions.length === 0 ? (
                <p className="text-center text-gray-400 py-8">Aucune session active</p>
              ) : sessions.map(s => (
                <div key={s.id}
                  className="flex items-center justify-between p-4 rounded-2xl border-2"
                  style={{ borderColor: s.isCurrent ? color : '#F3F4F6', backgroundColor: s.isCurrent ? `${color}08` : 'white' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: s.isCurrent ? `${color}15` : '#F9FAFB' }}>
                      <Smartphone className="w-5 h-5" style={{ color: s.isCurrent ? color : '#9CA3AF' }} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">{s.deviceInfo}</p>
                      <p className="text-xs text-gray-400">{s.ipAddress}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(s.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  {s.isCurrent ? (
                    <span className="text-xs font-bold px-3 py-1 rounded-full" style={{ color, backgroundColor: `${color}15` }}>
                      Actuelle
                    </span>
                  ) : (
                    <motion.button onClick={() => { void handleRevoke(s.id); }} whileTap={{ scale: 0.95 }}
                      className="text-xs font-bold text-red-500 px-3 py-1 rounded-full bg-red-50">
                      Révoquer
                    </motion.button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Modal PIN ────────────────────────────────────────────────

function ModalPIN({ isOpen, onClose, color, onSave, onDisable, mode }: {
  isOpen: boolean; onClose: () => void; color: string;
  onSave: (newPin: string, currentPin?: string) => Promise<void>;
  onDisable?: (currentPin: string) => Promise<void>;
  mode: 'create' | 'modify' | 'disable';
}) {
  const [current, setCurrent] = useState('');
  const [nouveau, setNouveau] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);

  const handleSave = async () => {
    setErr('');
    if (mode === 'disable') {
      if (current.length !== 4) { setErr('Entre ton PIN actuel (4 chiffres)'); return; }
      if (onDisable) await onDisable(current);
      setDone(true);
      setTimeout(() => { setDone(false); setCurrent(''); onClose(); }, 1800);
      return;
    }
    if (nouveau.length !== 4) { setErr('Le code PIN doit contenir exactement 4 chiffres'); return; }
    if (nouveau !== confirm) { setErr('Les codes ne correspondent pas'); return; }
    if (nouveau === '1234') { setErr('Code trop simple — choisis un autre'); return; }
    await onSave(nouveau, mode === 'modify' ? current : undefined);
    setDone(true);
    setTimeout(() => { setDone(false); setCurrent(''); setNouveau(''); setConfirm(''); onClose(); }, 1800);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-t-3xl w-full p-6 pb-10"
          >
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-5" />
            <h2 className="text-xl font-bold text-gray-900 mb-5">
              {mode === 'disable' ? 'Désactiver le PIN' : mode === 'modify' ? 'Modifier le PIN' : 'Créer un PIN'}
            </h2>
            {done ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-8 h-8 text-green-600" strokeWidth={3} />
                </div>
                <p className="font-bold text-gray-900">{mode === 'disable' ? 'PIN désactivé' : 'PIN enregistré'}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {mode !== 'create' && (
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-2">PIN actuel</label>
                    <input type="password" inputMode="numeric" maxLength={4} value={current}
                      onChange={e => setCurrent(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="••••"
                      className="w-full text-center text-3xl font-bold tracking-widest border-2 border-gray-200 rounded-2xl py-4 outline-none"
                      style={{ borderColor: current.length === 4 ? color : undefined }}
                    />
                  </div>
                )}
                {mode !== 'disable' && (
                  <>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2">Nouveau PIN</label>
                      <input type="password" inputMode="numeric" maxLength={4} value={nouveau}
                        onChange={e => setNouveau(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="••••"
                        className="w-full text-center text-3xl font-bold tracking-widest border-2 border-gray-200 rounded-2xl py-4 outline-none"
                        style={{ borderColor: nouveau.length === 4 ? color : undefined }}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-2">Confirmer le PIN</label>
                      <input type="password" inputMode="numeric" maxLength={4} value={confirm}
                        onChange={e => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="••••"
                        className="w-full text-center text-3xl font-bold tracking-widest border-2 border-gray-200 rounded-2xl py-4 outline-none"
                        style={{ borderColor: confirm.length === 4 && confirm === nouveau ? color : confirm.length === 4 ? '#EF4444' : undefined }}
                      />
                    </div>
                  </>
                )}
                {err && <p className="text-red-500 text-sm text-center">{err}</p>}
                <motion.button onClick={() => { void handleSave(); }} whileTap={{ scale: 0.97 }}
                  className="w-full py-4 rounded-2xl font-bold text-white text-lg"
                  style={{ backgroundColor: mode === 'disable' ? '#EF4444' : color }}>
                  {mode === 'disable' ? 'Désactiver le PIN' : 'Enregistrer le PIN'}
                </motion.button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Modal Langue ─────────────────────────────────────────────

const LANGS: AppLang[] = ['french', 'dioula', 'bambara'];

function ModalLang({ isOpen, onClose, lang, setLang, color }: {
  isOpen: boolean; onClose: () => void;
  lang: AppLang; setLang: (l: AppLang) => void; color: string;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-end"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 26 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-t-3xl w-full p-6 pb-10"
          >
            <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-5" />
            <h3 className="text-xl font-bold text-gray-900 mb-2">Langue de Tata Lou</h3>
            <p className="text-sm text-gray-500 mb-6">Dans quelle langue tu veux me parler aujourd&apos;hui ?</p>
            <div className="space-y-3">
              {LANGS.map(id => {
                const isActive = lang === id;
                return (
                  <motion.button key={id} onClick={() => { setLang(id); onClose(); }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left"
                    style={{ borderColor: isActive ? color : '#E5E7EB', backgroundColor: isActive ? `${color}08` : 'white' }}
                  >
                    <span className="text-3xl">{LANG_FLAGS[id]}</span>
                    <div>
                      <p className="font-bold text-gray-900">{LANG_LABELS[id]}</p>
                      {isActive && <p className="text-xs mt-0.5" style={{ color }}>Langue actuelle</p>}
                    </div>
                    {isActive && <Check className="w-5 h-5 ml-auto" style={{ color }} strokeWidth={3} />}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Composant principal ──────────────────────────────────────

interface UniversalParametresProps {
  role: ParametresRole;
}

export function UniversalParametres({ role }: UniversalParametresProps) {
  const navigate = useNavigate();
  const cfg = ROLE_CONFIG[role];
  const { color } = cfg;

  const { speak, isOnline, user, setUser, logout: appLogout } = useApp();
  const { updateUser, logout: userLogout } = useUser();
  const { isDark, toggleDark, mode, setMode } = useTheme();
  const { lang, setLang } = useLangPref();

  const prefs = (user as any)?.preferences || {};

  const [notifCommandes, setNotifCommandes] = useState<boolean>(prefs.notif_commandes ?? true);
  const [notifPaiements, setNotifPaiements] = useState<boolean>(prefs.notif_paiements ?? true);
  const [notifStockFaible, setNotifStockFaible] = useState<boolean>(prefs.notif_stock_faible ?? true);
  const [notifPromotions, setNotifPromotions] = useState<boolean>(prefs.notif_promotions ?? false);
  const [notifRecoltes, setNotifRecoltes] = useState<boolean>(prefs.notif_recoltes ?? true);
  const [rappelsRecolte, setRappelsRecolte] = useState<boolean>(prefs.rappels_recolte ?? true);
  const [notifEvaluations, setNotifEvaluations] = useState<boolean>(prefs.notif_evaluations ?? true);
  const [notifOffres, setNotifOffres] = useState<boolean>(prefs.notif_offres ?? false);
  const [notifMembres, setNotifMembres] = useState<boolean>(prefs.notif_membres ?? true);
  const [notifCotisations, setNotifCotisations] = useState<boolean>(prefs.notif_cotisations ?? true);
  const [notifDistributions, setNotifDistributions] = useState<boolean>(prefs.notif_distributions ?? true);
  const [rapportMensuel, setRapportMensuel] = useState<boolean>(prefs.rapport_mensuel ?? false);
  const [seuilCotisation, setSeuilCotisation] = useState<number>(prefs.seuil_cotisation ?? 0);
  const [notifDossiers, setNotifDossiers] = useState<boolean>(prefs.notif_dossiers ?? true);
  const [notifValidations, setNotifValidations] = useState<boolean>(prefs.notif_validations ?? true);
  const [notifRejets, setNotifRejets] = useState<boolean>(prefs.notif_rejets ?? true);
  const [notifObjectifs, setNotifObjectifs] = useState<boolean>(prefs.notif_objectifs ?? true);
  const [notifOffresFormation, setNotifOffresFormation] = useState<boolean>(prefs.notif_offres_formation ?? false);
  const [notifEmail, setNotifEmail] = useState<boolean>(prefs.notif_email ?? true);
  const [notifPush, setNotifPush] = useState<boolean>(prefs.notif_push ?? true);
  const [alertesFraude, setAlertesFraude] = useState<boolean>(prefs.alertes_fraude ?? true);
  const [alertesBaisseAct, setAlertesBaisseAct] = useState<boolean>(prefs.alertes_baisse_act ?? true);
  const [alertesPicTrans, setAlertesPicTrans] = useState<boolean>(prefs.alertes_pic_trans ?? true);
  const [rapportHebdo, setRapportHebdo] = useState<boolean>(prefs.rapport_hebdo ?? false);
  const [autoExport, setAutoExport] = useState<boolean>(prefs.auto_export ?? false);
  const [emailInstitution, setEmailInstitution] = useState<string>(prefs.email_institution ?? (user as any)?.email ?? '');
  const [voiceLevel, setVoiceLevel] = useState<number>(typeof prefs.voice_level === 'number' ? prefs.voice_level : 1);
  const [textSize, setTextSize] = useState<number>(typeof prefs.text_size === 'number' ? prefs.text_size : 3);
  const [reduceAnimations, setReduceAnimations] = useState<boolean>(prefs.reduce_animations ?? false);
  const [vibrations, setVibrations] = useState<boolean>(prefs.vibrations ?? true);
  const pinEnabled = !!user?.pinSecurityEnabled;
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinMode, setPinMode] = useState<'create' | 'modify' | 'disable'>('create');
  const [showChangePwd, setShowChangePwd] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [saved, setSaved] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const p = (user as any)?.preferences || {};
    setNotifCommandes(p.notif_commandes ?? true);
    setNotifPaiements(p.notif_paiements ?? true);
    setNotifStockFaible(p.notif_stock_faible ?? true);
    setNotifPromotions(p.notif_promotions ?? false);
    setNotifRecoltes(p.notif_recoltes ?? true);
    setRappelsRecolte(p.rappels_recolte ?? true);
    setNotifEvaluations(p.notif_evaluations ?? true);
    setNotifOffres(p.notif_offres ?? false);
    setNotifMembres(p.notif_membres ?? true);
    setNotifCotisations(p.notif_cotisations ?? true);
    setNotifDistributions(p.notif_distributions ?? true);
    setRapportMensuel(p.rapport_mensuel ?? false);
    setSeuilCotisation(p.seuil_cotisation ?? 0);
    setNotifDossiers(p.notif_dossiers ?? true);
    setNotifValidations(p.notif_validations ?? true);
    setNotifRejets(p.notif_rejets ?? true);
    setNotifObjectifs(p.notif_objectifs ?? true);
    setNotifOffresFormation(p.notif_offres_formation ?? false);
    setNotifEmail(p.notif_email ?? true);
    setNotifPush(p.notif_push ?? true);
    setAlertesFraude(p.alertes_fraude ?? true);
    setAlertesBaisseAct(p.alertes_baisse_act ?? true);
    setAlertesPicTrans(p.alertes_pic_trans ?? true);
    setRapportHebdo(p.rapport_hebdo ?? false);
    setAutoExport(p.auto_export ?? false);
    setEmailInstitution(p.email_institution ?? (user as any)?.email ?? '');
    setVoiceLevel(typeof p.voice_level === 'number' ? p.voice_level : 1);
    setTextSize(typeof p.text_size === 'number' ? p.text_size : 3);
    setReduceAnimations(p.reduce_animations ?? false);
    setVibrations(p.vibrations ?? true);
  }, [user]);

  const buildPrefs = useCallback(() => ({
    notif_commandes: notifCommandes, notif_paiements: notifPaiements,
    notif_stock_faible: notifStockFaible, notif_promotions: notifPromotions,
    notif_recoltes: notifRecoltes, rappels_recolte: rappelsRecolte,
    notif_evaluations: notifEvaluations, notif_offres: notifOffres,
    notif_membres: notifMembres, notif_cotisations: notifCotisations,
    notif_distributions: notifDistributions, rapport_mensuel: rapportMensuel,
    seuil_cotisation: seuilCotisation,
    notif_dossiers: notifDossiers, notif_validations: notifValidations,
    notif_rejets: notifRejets,
    notif_objectifs: notifObjectifs, notif_offres_formation: notifOffresFormation,
    notif_email: notifEmail, notif_push: notifPush,
    alertes_fraude: alertesFraude, alertes_baisse_act: alertesBaisseAct,
    alertes_pic_trans: alertesPicTrans, rapport_hebdo: rapportHebdo,
    auto_export: autoExport, email_institution: emailInstitution,
    voice_level: voiceLevel, text_size: textSize,
    reduce_animations: reduceAnimations, vibrations,
    dark_mode: isDark, theme_mode: mode,
  }), [
    notifCommandes, notifPaiements, notifStockFaible, notifPromotions,
    notifRecoltes, rappelsRecolte, notifEvaluations, notifOffres,
    notifMembres, notifCotisations, notifDistributions, rapportMensuel, seuilCotisation,
    notifDossiers, notifValidations, notifRejets, notifObjectifs, notifOffresFormation,
    notifEmail, notifPush, alertesFraude, alertesBaisseAct, alertesPicTrans,
    rapportHebdo, autoExport, emailInstitution,
    voiceLevel, textSize, reduceAnimations, vibrations, isDark, mode,
  ]);

  const handleSave = useCallback(async (silent = false) => {
    const newPrefs = buildPrefs();
    try {
      const res = await fetch(`${API_URL}/auth/preferences`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPrefs),
      });
      const data = await res.json() as { success?: boolean; message?: string };
      if (!res.ok || !data.success) { if (!silent) toast.error(data.message || 'Erreur'); return; }
      updateUser({ preferences: newPrefs });
      setSaved(true);
      if (!silent) { speak('Paramètres sauvegardés'); toast.success('Paramètres sauvegardés'); }
      setTimeout(() => setSaved(false), 2500);
    } catch { if (!silent) toast.error('Erreur réseau'); }
  }, [buildPrefs, speak, updateUser]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void handleSave(true); }, 2000);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [buildPrefs]);

  const handleSavePin = async (newPin: string, currentPin?: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/pin/set`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: newPin, currentPin }),
      });
      const data = await res.json() as { success?: boolean; message?: string };
      if (!res.ok || !data.success) { toast.error(data.message || 'Erreur PIN'); return; }
      if (user) setUser({ ...user, pinSecurityEnabled: true });
      toast.success('Code PIN activé');
    } catch { toast.error('Erreur réseau'); }
  };

  const handleDisablePin = async (currentPin: string) => {
    try {
      const res = await fetch(`${API_URL}/auth/pin/disable`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPin }),
      });
      const data = await res.json() as { success?: boolean; message?: string };
      if (!res.ok || !data.success) { toast.error(data.message || 'PIN incorrect'); return; }
      if (user) setUser({ ...user, pinSecurityEnabled: false });
      toast.success('Code PIN désactivé');
    } catch { toast.error('Erreur réseau'); }
  };

  const handleRegisterBiometric = async () => {
    const result = await registerWebAuthn();
    if (result.success) {
      toast.success('FaceID / Empreinte activé');
    } else {
      toast.error(result.error || 'Échec activation biométrie');
    }
  };

  const handleTestBiometric = async () => {
    const ok = await verifyWebAuthnForKeiwa();
    if (ok) {
      toast.success('Biométrie validée');
    } else {
      toast.error('Échec du test biométrique');
    }
  };

  const profileName = user
    ? `${(user as any).prenoms || (user as any).firstName || ''} ${(user as any).nom || (user as any).lastName || ''}`.trim() || cfg.label
    : cfg.label;

  const ProfileIcon = cfg.profileIcon;

  return (
    <>
      <SubPageLayout
        role={role}
        title="Paramètres"
        rightContent={
          <motion.button
            onClick={() => { void handleSave(false); }}
            className="w-11 h-11 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: saved ? '#16A34A' : 'rgba(255,255,255,0.2)' }}
            whileTap={{ scale: 0.9 }}
          >
            {saved
              ? <Check className="w-5 h-5 text-white" strokeWidth={3} />
              : <Save className="w-5 h-5 text-white" />
            }
          </motion.button>
        }
      >
        <div className="px-5 py-4 space-y-4 pb-36">

          <div className="flex items-center gap-3 p-4 rounded-2xl bg-white border-2 border-gray-100 shadow-sm">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
              <ProfileIcon className="w-6 h-6" style={{ color }} />
            </div>
            <div>
              <p className="font-bold text-gray-900">{profileName}</p>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
                <p className="text-gray-600 text-sm">{isOnline ? 'En ligne' : 'Hors ligne'}</p>
              </div>
            </div>
          </div>

          {role === 'identificateur' && <IdentificateurPinChangeSection />}

          <Section title="Notifications" icon={Bell} color={color}>
            {role === 'marchand' && <>
              <RowToggle color={color} label="Nouvelles commandes" sublabel="Alertes immédiates sur chaque commande" value={notifCommandes} onChange={setNotifCommandes} />
              <RowToggle color={color} label="Paiements" sublabel="Confirmation et échecs de paiement" value={notifPaiements} onChange={setNotifPaiements} />
              <RowToggle color={color} label="Alertes stock faible" sublabel="Quand un produit passe sous le seuil" value={notifStockFaible} onChange={setNotifStockFaible} />
              <RowToggle color={color} label="Promotions Jùlaba" sublabel="Offres et nouveautés de la plateforme" value={notifPromotions} onChange={setNotifPromotions} />
            </>}
            {role === 'producteur' && <>
              <RowToggle color={color} label="Nouvelles commandes" sublabel="Alertes immédiates" value={notifCommandes} onChange={setNotifCommandes} />
              <RowToggle color={color} label="Paiements reçus" sublabel="Confirmation de chaque paiement" value={notifPaiements} onChange={setNotifPaiements} />
              <RowToggle color={color} label="Alertes récolte" sublabel="Plantations arrivant à maturité" value={notifRecoltes} onChange={setNotifRecoltes} />
              <RowToggle color={color} label="Rappels avant récolte" sublabel="3 jours, 1 jour avant la date" value={rappelsRecolte} onChange={setRappelsRecolte} />
              <RowToggle color={color} label="Evaluations clients" sublabel="Notes reçues sur tes livraisons" value={notifEvaluations} onChange={setNotifEvaluations} />
              <RowToggle color={color} label="Nouvelles offres marché" sublabel="Opportunités de vente sur Jùlaba" value={notifOffres} onChange={setNotifOffres} />
            </>}
            {role === 'cooperative' && <>
              <RowToggle color={color} label="Nouveau membre" sublabel="Quand quelqu'un rejoint la coop" value={notifMembres} onChange={setNotifMembres} />
              <RowToggle color={color} label="Cotisations reçues" sublabel="Chaque paiement de cotisation" value={notifCotisations} onChange={setNotifCotisations} />
              <RowToggle color={color} label="Commandes groupées" sublabel="Validations et mises à jour" value={notifCommandes} onChange={setNotifCommandes} />
              <RowToggle color={color} label="Distributions prêtes" sublabel="Quand un lot est prêt à distribuer" value={notifDistributions} onChange={setNotifDistributions} />
            </>}
            {role === 'identificateur' && <>
              <RowToggle color={color} label="Dossiers assignés" sublabel="Quand un nouveau dossier t'est confié" value={notifDossiers} onChange={setNotifDossiers} />
              <RowToggle color={color} label="Validations BO" sublabel="Confirmation de tes soumissions" value={notifValidations} onChange={setNotifValidations} />
              <RowToggle color={color} label="Dossiers rejetés" sublabel="Avec la raison du rejet" value={notifRejets} onChange={setNotifRejets} />
              <RowToggle color={color} label="Objectif mensuel" sublabel="Rappel si tu es en retard" value={notifObjectifs} onChange={setNotifObjectifs} />
              <RowToggle color={color} label="Offres de formation" sublabel="Julaba Academy et certifications" value={notifOffresFormation} onChange={setNotifOffresFormation} />
            </>}
            {role === 'institution' && <>
              <div className="px-5 py-4">
                <p className="font-semibold text-gray-900 mb-1">Alertes par e-mail</p>
                <p className="text-xs text-gray-500 mb-2">Rapports et alertes critiques</p>
                <input
                  type="email"
                  value={emailInstitution}
                  onChange={e => setEmailInstitution(e.target.value)}
                  placeholder="votre@email.com"
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ borderColor: emailInstitution ? color + '60' : undefined }}
                />
                <div className="flex items-center justify-between mt-3">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">Activer les alertes e-mail</p>
                  </div>
                  <Toggle value={notifEmail} onChange={setNotifEmail} color={color} />
                </div>
              </div>
              <RowToggle color={color} label="Notifications push" sublabel="Sur cet appareil en temps réel" value={notifPush} onChange={setNotifPush} />
            </>}
          </Section>

          {role === 'marchand' && (
            <Section title="Sécurité" icon={Fingerprint} color={color}>
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex-1 pr-4">
                  <p className="font-semibold text-gray-900">Code PIN Keiwa</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {pinEnabled ? 'PIN activé — Keiwa sécurisé' : 'Active le PIN pour sécuriser ton Keiwa'}
                  </p>
                  {pinEnabled && (
                    <motion.button
                      onClick={() => { setPinMode('modify'); setShowPinModal(true); }}
                      className="mt-1 text-sm font-bold" style={{ color }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Mode de déverrouillage
                    </motion.button>
                  )}
                </div>
                <Toggle
                  value={pinEnabled}
                  color={color}
                  onChange={v => { if (v) { setPinMode('create'); setShowPinModal(true); } else { setPinMode('disable'); setShowPinModal(true); } }}
                />
              </div>
              <RowAction label="Historique des connexions" sublabel="Voir les accès récents" onClick={() => setShowSessions(true)} />
              <RowAction label="Activer FaceID / Empreinte" sublabel="Enregistrer cet appareil pour la biométrie" icon={Fingerprint} onClick={() => { void handleRegisterBiometric(); }} />
              <RowAction label="Tester biométrie" sublabel="Vérifier le déverrouillage biométrique" icon={Shield} onClick={() => { void handleTestBiometric(); }} />
              <RowAction label="Changer le code de connexion" sublabel="Modifier ton code à 4 chiffres" icon={Lock} onClick={() => setShowChangePwd(true)} />
            </Section>
          )}

          {role === 'producteur' && (<>
            <Section title="Production" icon={Leaf} color={color}>
              <RowAction label="Mes récoltes" sublabel="Voir et gérer toutes mes récoltes" onClick={() => navigate('/producteur/recoltes')} />
              <RowAction label="Mon calendrier agricole" sublabel="Plantations en cours et à venir" icon={Calendar} onClick={() => navigate('/producteur/production')} />
            </Section>
            <Section title="Sécurité" icon={Fingerprint} color={color}>
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex-1 pr-4">
                  <p className="font-semibold text-gray-900">Code PIN Keiwa</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {pinEnabled ? 'PIN activé — Keiwa sécurisé' : 'Active le PIN pour sécuriser ton Keiwa'}
                  </p>
                  {pinEnabled && (
                    <motion.button onClick={() => { setPinMode('modify'); setShowPinModal(true); }}
                      className="mt-1 text-sm font-bold" style={{ color }} whileTap={{ scale: 0.95 }}>
                      Mode de déverrouillage
                    </motion.button>
                  )}
                </div>
                <Toggle value={pinEnabled} color={color}
                  onChange={v => { if (v) { setPinMode('create'); setShowPinModal(true); } else { setPinMode('disable'); setShowPinModal(true); } }} />
              </div>
              <RowAction label="Historique des connexions" sublabel="Voir les accès récents" onClick={() => setShowSessions(true)} />
              <RowAction label="Activer FaceID / Empreinte" sublabel="Enregistrer cet appareil pour la biométrie" icon={Fingerprint} onClick={() => { void handleRegisterBiometric(); }} />
              <RowAction label="Tester biométrie" sublabel="Vérifier le déverrouillage biométrique" icon={Shield} onClick={() => { void handleTestBiometric(); }} />
              <RowAction label="Changer le code de connexion" sublabel="Modifier ton code à 4 chiffres" icon={Lock} onClick={() => setShowChangePwd(true)} />
            </Section>
          </>)}

          {role === 'cooperative' && (<>
            <Section title="Gestion" icon={Users} color={color}>
              <div className="px-5 py-4">
                <p className="font-semibold text-gray-900 mb-1">Seuil de cotisation mensuelle</p>
                <p className="text-xs text-gray-500 mb-2">Actuel : {seuilCotisation.toLocaleString('fr-FR')} FCFA</p>
                <input
                  type="number" inputMode="numeric" value={seuilCotisation}
                  onChange={e => setSeuilCotisation(Number(e.target.value))}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ borderColor: `${color}60` }}
                  placeholder="Ex: 5000"
                />
              </div>
              <RowToggle color={color} label="Rapport mensuel automatique" sublabel="Envoyé le 1er de chaque mois" value={rapportMensuel} onChange={setRapportMensuel} />
            </Section>
            <Section title="Sécurité" icon={Fingerprint} color={color}>
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex-1 pr-4">
                  <p className="font-semibold text-gray-900">Code PIN Keiwa</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {pinEnabled ? 'PIN activé — Keiwa sécurisé' : 'Active le PIN pour sécuriser ton Keiwa'}
                  </p>
                  {pinEnabled && (
                    <motion.button onClick={() => { setPinMode('modify'); setShowPinModal(true); }}
                      className="mt-1 text-sm font-bold" style={{ color }} whileTap={{ scale: 0.95 }}>
                      Mode de déverrouillage
                    </motion.button>
                  )}
                </div>
                <Toggle value={pinEnabled} color={color}
                  onChange={v => { if (v) { setPinMode('create'); setShowPinModal(true); } else { setPinMode('disable'); setShowPinModal(true); } }} />
              </div>
              <RowAction label="Historique des connexions" sublabel="Voir les accès récents" onClick={() => setShowSessions(true)} />
              <RowAction label="Activer FaceID / Empreinte" sublabel="Enregistrer cet appareil pour la biométrie" icon={Fingerprint} onClick={() => { void handleRegisterBiometric(); }} />
              <RowAction label="Tester biométrie" sublabel="Vérifier le déverrouillage biométrique" icon={Shield} onClick={() => { void handleTestBiometric(); }} />
              <RowAction label="Changer le code de connexion" sublabel="Modifier ton code à 4 chiffres" icon={Lock} onClick={() => setShowChangePwd(true)} />
            </Section>
          </>)}

          {role === 'identificateur' && (<>
            <Section title="Mes objectifs" icon={Target} color={color}>
              <RowAction
                label="Objectif d'identifications"
                sublabel="Taux de réalisation ce mois"
                onClick={() => navigate('/identificateur/suivi')}
              />
            </Section>
            <Section title="Zone de travail" icon={MapPin} color={color}>
              <RowAction label="Ma zone assignée" sublabel={(user as any)?.zone || 'Zone non définie'} icon={MapPin} onClick={() => navigate('/identificateur/suivi')} />
              <RowAction label="Historique des identifications" sublabel="Tous mes dossiers soumis" onClick={() => navigate('/identificateur/suivi')} />
            </Section>
            <Section title="Wallet et Commissions" icon={BarChart3} color={color}>
              <RowAction label="Mon Keiwa" sublabel="Solde et historique de commissions" onClick={() => navigate('/identificateur/keiwa')} />
            </Section>
            <Section title="Sécurité" icon={Fingerprint} color={color}>
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex-1 pr-4">
                  <p className="font-semibold text-gray-900">Code PIN Keiwa</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {pinEnabled ? 'PIN activé — Keiwa sécurisé' : 'Active le PIN pour sécuriser ton Keiwa'}
                  </p>
                  {pinEnabled && (
                    <motion.button onClick={() => { setPinMode('modify'); setShowPinModal(true); }}
                      className="mt-1 text-sm font-bold" style={{ color }} whileTap={{ scale: 0.95 }}>
                      Mode de déverrouillage
                    </motion.button>
                  )}
                </div>
                <Toggle value={pinEnabled} color={color}
                  onChange={v => { if (v) { setPinMode('create'); setShowPinModal(true); } else { setPinMode('disable'); setShowPinModal(true); } }} />
              </div>
              <RowAction label="Historique des connexions" sublabel="Voir les accès récents" onClick={() => setShowSessions(true)} />
              <RowAction label="Activer FaceID / Empreinte" sublabel="Enregistrer cet appareil pour la biométrie" icon={Fingerprint} onClick={() => { void handleRegisterBiometric(); }} />
              <RowAction label="Tester biométrie" sublabel="Vérifier le déverrouillage biométrique" icon={Shield} onClick={() => { void handleTestBiometric(); }} />
              <RowAction label="Changer le code de connexion" sublabel="Modifier ton code à 4 chiffres" icon={Lock} onClick={() => setShowChangePwd(true)} />
            </Section>
          </>)}

          {role === 'institution' && (<>
            <Section title="Alertes métier" icon={AlertTriangle} color={color}>
              <RowToggle color={color} label="Alertes fraude" sublabel="Transactions suspectes et anomalies" value={alertesFraude} onChange={setAlertesFraude} />
              <RowToggle color={color} label="Baisses d'activité" sublabel="Zones en déclin de plus de 30%" value={alertesBaisseAct} onChange={setAlertesBaisseAct} />
              <RowToggle color={color} label="Pics de transactions" sublabel="Volumes anormalement élevés" value={alertesPicTrans} onChange={setAlertesPicTrans} />
            </Section>
            <Section title="Rapports automatiques" icon={BarChart3} color={color}>
              <RowToggle color={color} label="Rapport hebdomadaire" sublabel="Envoyé le lundi à 08h00" value={rapportHebdo} onChange={setRapportHebdo} />
              <RowToggle color={color} label="Export automatique CSV" sublabel="Chaque fin de mois" value={autoExport} onChange={setAutoExport} />
              <RowAction label="Exporter les journaux maintenant" sublabel="Télécharger les 30 derniers jours"
                icon={Download}
                onClick={() => { speak('Export en cours'); toast.success('Export démarré — disponible dans 2 minutes'); }}
              />
            </Section>
            <Section title="Sécurité" icon={Shield} color={color}>
              <RowAction label="Historique des connexions" sublabel="Voir les accès récents" onClick={() => setShowSessions(true)} />
              <RowAction label="Activer FaceID / Empreinte" sublabel="Enregistrer cet appareil pour la biométrie" icon={Fingerprint} onClick={() => { void handleRegisterBiometric(); }} />
              <RowAction label="Tester biométrie" sublabel="Vérifier le déverrouillage biométrique" icon={Shield} onClick={() => { void handleTestBiometric(); }} />
              <RowAction label="Changer le code de connexion" sublabel="Modifier ton code à 4 chiffres" icon={Lock} onClick={() => setShowChangePwd(true)} />
            </Section>
          </>)}

          <Section title="Accessibilité" icon={Mic} color={color}>
            {role !== 'institution' && (
              <VoiceLevelSelector value={voiceLevel} onChange={setVoiceLevel} color={color} />
            )}
            <TextSizeSlider value={textSize} onChange={setTextSize} color={color} />
            <RowToggle color={color} label="Mode sombre" sublabel="Interface sombre" value={isDark} onChange={() => toggleDark()} />
            <div className="px-5 py-3">
              <p className="text-xs font-bold text-gray-500 mb-2">Planification</p>
              <div className="flex gap-2">
                {([{ key: 'manuel' as const, label: 'Manuel' }, { key: 'auto' as const, label: 'Auto (18h-6h)' }] as const).map(opt => (
                  <motion.button key={opt.key} onClick={() => setMode(opt.key)} whileTap={{ scale: 0.95 }}
                    className="flex-1 py-2 rounded-xl border-2 text-xs font-bold"
                    style={mode === opt.key
                      ? { backgroundColor: color, color: '#fff', borderColor: color }
                      : { borderColor: '#E5E7EB', color: '#6B7280' }}>
                    {opt.label}
                  </motion.button>
                ))}
              </div>
            </div>
            <RowToggle color={color} label="Réduire les animations" sublabel="Améliore les performances sur téléphones bas de gamme" value={reduceAnimations} onChange={setReduceAnimations} />
            <RowToggle color={color} label="Vibrations" sublabel="Retour haptique lors des actions" value={vibrations} onChange={setVibrations} />
            {role !== 'institution' && (
              <RowAction label="Langue de Tata Lou" sublabel={LANG_FLAGS[lang] + ' ' + LANG_LABELS[lang]} icon={Globe} onClick={() => setShowLang(true)} />
            )}
          </Section>

          <Section title="Compte" icon={Lock} color={color}>
            <RowAction
              label="Informations personnelles"
              sublabel="Modifier mon profil"
              onClick={() => navigate(`/${role === 'cooperative' ? 'cooperative' : role}/profil`)}
            />
            <RowAction label="Support et aide" sublabel="Contacter l'équipe JÙLABA" icon={Headphones}
              onClick={() => navigate(`/${role}/support`)} />
            <RowAction label="Supprimer mon compte" sublabel="Suppression définitive et irréversible" danger icon={Trash2}
              onClick={() => setShowDeleteAccount(true)} />
            <RowAction label="Se déconnecter" sublabel="Retour à la connexion" danger icon={LogOut}
              onClick={() => setShowLogout(true)} />
          </Section>

          <div className="p-4 rounded-2xl border-2 flex items-start gap-3"
            style={{ backgroundColor: `${color}08`, borderColor: `${color}20` }}>
            <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color }} />
            <p className="text-xs" style={{ color: `${color}CC` }}>
              <span className="font-bold">Sécurité :</span> {cfg.footerMsg}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 py-2">
            <Smartphone className="w-4 h-4 text-gray-400" />
            <p className="text-xs text-gray-400">{cfg.version} · By ICONE SOLUTION</p>
          </div>

        </div>
      </SubPageLayout>

      <ModalPIN
        isOpen={showPinModal} onClose={() => setShowPinModal(false)}
        color={color} mode={pinMode}
        onSave={handleSavePin} onDisable={handleDisablePin}
      />
      {showChangePwd && (
        <ChangePasswordModal onClose={() => setShowChangePwd(false)} speak={speak} />
      )}
      <ModalSessions isOpen={showSessions} onClose={() => setShowSessions(false)} color={color} />
      <ModalLang isOpen={showLang} onClose={() => setShowLang(false)} lang={lang} setLang={setLang} color={color} />
      <ModalDeleteAccount isOpen={showDeleteAccount} onClose={() => setShowDeleteAccount(false)} />
      <ModalDanger
        isOpen={showLogout}
        title="Se déconnecter ?"
        message="Tu seras redirigé vers la page de connexion Jùlaba."
        confirmLabel="Se déconnecter"
        onConfirm={async () => { speak('Déconnexion en cours'); await appLogout(); userLogout(); }}
        onClose={() => setShowLogout(false)}
      />
    </>
  );
}
