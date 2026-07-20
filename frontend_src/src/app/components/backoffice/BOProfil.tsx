import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail, Bell, Globe, Save, ChevronRight, LogOut, X, Lock, Moon, Sun, Check, Smartphone, Monitor, Trash2, LogIn, Wifi,
} from 'lucide-react';
import { useBackOffice, BORoleType } from '../../contexts/BackOfficeContext';
import { BO_PRIMARY, BO_DARK, BO_MEDIUM, BO_TINT } from './bo-theme';
import { fadeInUp, springSnappy } from './bo-animations';
import { toast } from 'sonner';
import { useNavigate } from 'react-router';
import { useApp } from '../../contexts/AppContext';
import { stopChunkedSpeaking } from '../../services/elevenlabs';
import { PartenairesLogos } from '../shared/PartenairesLogos';
import { API_URL } from '../../utils/api';
import {
  uploadProfilePhoto,
  updateUserProfile,
  getMySessions,
  revokeSession,
  getMyLogs,
  updateUserPreferences,
} from '../../services/backoffice-api';

const parseUserAgent = (ua: string): string => {
  if (!ua || typeof ua !== 'string') return 'Appareil inconnu';

  // Détection OS
  let os = 'Inconnu';
  if (/Macintosh|Mac OS X/i.test(ua)) os = 'Mac';
  else if (/Windows NT 10/i.test(ua)) os = 'Windows 10';
  else if (/Windows NT 11/i.test(ua)) os = 'Windows 11';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/iPhone/i.test(ua)) os = 'iPhone';
  else if (/iPad/i.test(ua)) os = 'iPad';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/Linux/i.test(ua)) os = 'Linux';

  // Détection navigateur (ordre important: Edge avant Chrome, Chrome avant Safari)
  let browser = 'Navigateur';
  let version = '';

  if (/Edg\/(\d+\.?\d*)/i.test(ua)) {
    browser = 'Edge';
    const m = ua.match(/Edg\/(\d+\.?\d*)/i);
    version = m?.[1] || '';
  } else if (/OPR\/(\d+\.?\d*)/i.test(ua)) {
    browser = 'Opera';
    const m = ua.match(/OPR\/(\d+\.?\d*)/i);
    version = m?.[1] || '';
  } else if (/Firefox\/(\d+\.?\d*)/i.test(ua)) {
    browser = 'Firefox';
    const m = ua.match(/Firefox\/(\d+\.?\d*)/i);
    version = m?.[1] || '';
  } else if (/Chrome\/(\d+\.?\d*)/i.test(ua)) {
    browser = 'Chrome';
    const m = ua.match(/Chrome\/(\d+\.?\d*)/i);
    version = m?.[1] || '';
  } else if (/Version\/(\d+\.?\d*).*Safari/i.test(ua)) {
    browser = 'Safari';
    const m = ua.match(/Version\/(\d+\.?\d*)/i);
    version = m?.[1] || '';
  }

  return version ? `${os} - ${browser} ${version}` : `${os} - ${browser}`;
};

// ── Rôles config ──────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<BORoleType, string> = {
  super_admin: 'Super Administrateur',
  admin_national: 'Admin National',
  gestionnaire_zone: 'Gestionnaire de Zone',
  operateur_terrain: 'Analyste / Observateur',
  admin: 'Administrateur',
};

const ROLE_COLORS: Record<BORoleType, string> = {
  super_admin: BO_PRIMARY,
  admin_national: '#3B82F6',
  gestionnaire_zone: '#10B981',
  operateur_terrain: '#8B5CF6',
  admin: '#6366F1',
};

const ROLE_DESCRIPTIONS: Record<BORoleType, string> = {
  super_admin: 'Accès complet à tous les modules et paramètres',
  admin_national: 'Gestion opérationnelle nationale',
  gestionnaire_zone: 'Supervision de zone territoriale',
  operateur_terrain: 'Consultation et analyse de données',
  admin: 'Administrateur de la plateforme',
};

// ── Modal Wrapper ──────────────────────────────────────────────────────────────
function ModalWrapper({ open, onClose, title, icon: Icon, color, children }: {
  open: boolean; onClose: () => void; title: string; icon: any; color: string; children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="bg-white rounded-t-3xl sm:rounded-3xl border-2 border-gray-100 shadow-2xl p-5 sm:p-6 w-full sm:max-w-lg sm:mx-4 max-h-[85vh] overflow-y-auto"
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={springSnappy}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <h2 className="font-black text-gray-900 text-lg">{title}</h2>
              </div>
              <motion.button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                whileTap={{ scale: 0.9 }}>
                <X className="w-4 h-4 text-gray-500" />
              </motion.button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════
export function BOProfil() {
  const _boCtx = useBackOffice();
  const { voiceMuted } = useApp();
  const { boUser, setBOUser } = _boCtx;
  const navigate = useNavigate();

  type ActiveTab = 'profil' | 'securite' | 'preferences';
  const [activeTab, setActiveTab] = useState<ActiveTab>('profil');

  // Préférences
  type Language = 'fr' | 'en';
  type Theme = 'light' | 'dark' | 'auto';

  const [language, setLanguage] = useState<Language>(
    ((boUser as any)?.preferences?.language as Language) || 'fr'
  );
  const [theme, setTheme] = useState<Theme>(
    ((boUser as any)?.preferences?.theme as Theme) || 'light'
  );
  const [emailNotifications, setEmailNotifications] = useState<boolean>(
    (boUser as any)?.preferences?.emailNotifications !== false
  );
  const [pushNotifications, setPushNotifications] = useState<boolean>(
    (boUser as any)?.preferences?.pushNotifications !== false
  );
  const [savingPrefs, setSavingPrefs] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState<Array<{
    id: string;
    deviceInfo: string;
    ipAddress: string;
    createdAt: string;
    expiresAt: string;
    isCurrent: boolean;
  }>>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);

  // Logs (audit_logs)
  const [logs, setLogs] = useState<Array<{
    id: string;
    action: string;
    ip: string;
    details: any;
    created_at: string;
  }>>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const [editing, setEditing] = useState(false);
  // Compte entite (admin_general) : la raison sociale est dans firstName et
  // les champs nom ne sont pas editables a cette etape (edition prevue etape D).
  const isEntite = boUser?.role === 'admin_general';
  const [profileForm, setProfileForm] = useState({
    firstName: boUser?.firstName || '',
    lastName: boUser?.lastName || '',
    email: boUser?.email || '',
    phone: boUser?.phone || '',
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const logoutTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal upload photo
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // ── État des modales ──
  const [showMDP, setShowMDP] = useState(false);
  const [savingMDP, setSavingMDP] = useState(false);
  const [revokeAllConfirmOpen, setRevokeAllConfirmOpen] = useState(false);
  const [revokingAll, setRevokingAll] = useState(false);

  // ── État du formulaire ──
  const [showPassword, setShowPassword] = useState(false);
  const [mdpForm, setMdpForm] = useState({ actuel: '', nouveau: '', confirmation: '' });

  React.useEffect(() => {
    if (boUser) {
      setProfileForm({
        firstName: boUser.firstName || '',
        lastName: boUser.lastName || '',
        email: boUser.email || '',
        phone: boUser.phone || '',
      });
    }
  }, [boUser?.id]);

  React.useEffect(() => {
    const p = (boUser as any)?.preferences;
    if (p) {
      if (p.language) setLanguage(p.language as Language);
      if (p.theme) setTheme(p.theme as Theme);
      if (typeof p.emailNotifications === 'boolean') setEmailNotifications(p.emailNotifications);
      if (typeof p.pushNotifications === 'boolean') setPushNotifications(p.pushNotifications);
    }
  }, [boUser?.id]);

  React.useEffect(() => {
    if (activeTab !== 'securite') return;

    const loadSessions = async () => {
      setLoadingSessions(true);
      try {
        const result = await getMySessions();
        setSessions(result.sessions || []);
      } catch (err) {
        console.warn('[BOProfil] loadSessions failed:', err instanceof Error ? err.message : err);
        toast.error('Impossible de charger les sessions');
      } finally {
        setLoadingSessions(false);
      }
    };

    const loadLogs = async () => {
      setLoadingLogs(true);
      try {
        const result = await getMyLogs(10);
        setLogs(result.logs || []);
      } catch (err) {
        console.warn('[BOProfil] loadLogs failed:', err instanceof Error ? err.message : err);
      } finally {
        setLoadingLogs(false);
      }
    };

    loadSessions();
    loadLogs();
  }, [activeTab]);

  React.useEffect(() => {
    return () => {
      if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    };
  }, []);

  if (!boUser) return null;

  // ── Synthèse vocale ──
  const speak = (text: string) => {
    if (voiceMuted) return;
    stopChunkedSpeaking();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  // ── Gestionnaires ──
  const handleChangeMDP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mdpForm.actuel.trim()) { toast.error('Saisis ton mot de passe actuel'); return; }
    if (mdpForm.nouveau !== mdpForm.confirmation) { toast.error('Les mots de passe ne correspondent pas'); return; }
    if (mdpForm.nouveau.length < 8) { toast.error('Le mot de passe doit contenir au moins 8 caractères'); return; }
    setSavingMDP(true);
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ oldPassword: mdpForm.actuel, newPassword: mdpForm.nouveau }),
      });
      const payload = await res.json().catch(() => ({} as any));
      if (!res.ok || payload?.success === false) {
        toast.error(payload?.message || 'Impossible de modifier le mot de passe');
        return;
      }
      toast.success('Mot de passe modifié avec succès');
      setMdpForm({ actuel: '', nouveau: '', confirmation: '' });
      setShowMDP(false);
    } catch (err) {
      console.warn('[BOProfil] handleChangeMDP failed:', err instanceof Error ? err.message : err);
      toast.error('Erreur réseau. Réessaie.');
    } finally {
      setSavingMDP(false);
    }
  };

  const handleLogout = () => {
    speak('Déconnexion en cours');
    setBOUser(null);
    localStorage.removeItem('julaba_bo_user');
    localStorage.removeItem('julaba_access_token');
    localStorage.removeItem('julaba_refresh_token');
    toast.success('Déconnexion réussie');
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    logoutTimerRef.current = setTimeout(() => navigate('/backoffice/login'), 500);
  };

  const handleSaveProfile = async () => {
    if (!boUser?.id) return;
    setSavingProfile(true);
    try {
      // Validation e-mail simple
      if (profileForm.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profileForm.email)) {
        toast.error('Adresse e-mail invalide');
        setSavingProfile(false);
        return;
      }
      // Pour un compte entite, firstName/lastName ne sont pas editables : on ne
      // les renvoie pas, afin de ne jamais ecraser la raison sociale.
      await updateUserProfile(boUser.id, {
        ...(isEntite
          ? {}
          : {
              firstName: profileForm.firstName.trim(),
              lastName: profileForm.lastName.trim(),
            }),
        email: profileForm.email.trim() || null,
        phone: profileForm.phone.trim(),
      });
      toast.success('Profil mis à jour avec succès');
      setEditing(false);
      // Note : le rechargement boUser via setBOUser sera corrigé au 2C
    } catch (err) {
      console.warn('[BOProfil] handleSaveProfile failed:', err instanceof Error ? err.message : err);
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Format de fichier invalide. Utilise une image (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image trop lourde. Max 5 Mo.');
      return;
    }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handlePhotoUpload = async () => {
    if (!photoFile || !boUser?.id) return;
    setUploadingPhoto(true);
    try {
      const result = await uploadProfilePhoto(boUser.id, photoFile);
      setBOUser({ ...boUser, photoUrl: result.photoUrl } as any);
      toast.success('Photo de profil mise à jour');
      setPhotoModalOpen(false);
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (err) {
      console.warn('[BOProfil] handlePhotoUpload failed:', err instanceof Error ? err.message : err);
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l’upload');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSessionId(sessionId);
    try {
      await revokeSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      toast.success('Session déconnectée');
    } catch (err) {
      console.warn('[BOProfil] handleRevokeSession failed:', err instanceof Error ? err.message : err);
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la déconnexion');
    } finally {
      setRevokingSessionId(null);
    }
  };

  const handleRevokeAllSessions = () => {
    const others = sessions.filter(s => !s.isCurrent);
    if (others.length === 0) {
      toast.info('Aucune autre session à déconnecter');
      return;
    }
    setRevokeAllConfirmOpen(true);
  };

  const confirmRevokeAllSessions = async () => {
    const others = sessions.filter(s => !s.isCurrent);
    if (others.length === 0) { setRevokeAllConfirmOpen(false); return; }
    setRevokingAll(true);
    try {
      const results = await Promise.allSettled(
        others.map(s => revokeSession(s.id))
      );
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      const current = sessions.find(s => s.isCurrent);
      setSessions(current ? [current] : []);

      if (failed === 0) {
        toast.success(`${succeeded} session${succeeded > 1 ? 's' : ''} déconnectée${succeeded > 1 ? 's' : ''}`);
      } else {
        toast.warning(`${succeeded} déconnectée(s), ${failed} en échec`);
      }
    } catch (err) {
      console.warn('[BOProfil] revokeAllSessions failed:', err instanceof Error ? err.message : err);
      toast.error(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setRevokingAll(false);
      setRevokeAllConfirmOpen(false);
    }
  };

  const handleSavePreferences = async () => {
    setSavingPrefs(true);
    try {
      await updateUserPreferences({
        language,
        theme,
        emailNotifications,
        pushNotifications,
      });
      toast.success('Préférences enregistrées');
    } catch (err) {
      console.warn('[BOProfil] handleSavePreferences failed:', err instanceof Error ? err.message : err);
      toast.error(err instanceof Error ? err.message : 'Erreur lors de l\u2019enregistrement');
    } finally {
      setSavingPrefs(false);
    }
  };

  const formatRelativeTime = (date: string | Date) => {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return 'À l’instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays < 7) return `Il y a ${diffDays} j`;
    return d.toLocaleDateString('fr-FR');
  };

  const getDeviceIcon = (deviceInfo: string) => {
    const lower = (deviceInfo || '').toLowerCase();
    if (lower.includes('mobile') || lower.includes('iphone') || lower.includes('android')) {
      return Smartphone;
    }
    return Monitor;
  };

  const formatLogAction = (action: string): string => {
    const labels: Record<string, string> = {
      // Auth
      login: 'Connexion',
      logout: 'Déconnexion',
      connexion: 'Connexion',
      password_change: 'Mot de passe modifié',

      // Profil
      modification: 'Modification du profil',
      profile_update: 'Mise à jour profil',
      photo_update: 'Photo modifiée',
      photo_modifiee: 'Photo modifiée',
      preferences_update: 'Préférences mises à jour',

      // CRUD génériques
      creation: 'Création',
      suppression: 'Suppression',
      validation: 'Validation',
      rejet: 'Rejet',
      soumission: 'Soumission',

      // Activité métier
      activite_modifiee: 'Activité modifiée',
      marche_modifie: 'Marché modifié',

      // Wallet (admin)
      CREDIT_MANUEL: 'Crédit manuel',
      DEBIT_MANUEL: 'Débit manuel',
      BLOQUER_WALLET: 'Wallet bloqué',
      DEBLOQUER_WALLET: 'Wallet débloqué',
      REINIT_SOLDE: 'Solde réinitialisé',
    };

    // Normalisation : trim + lowercase pour gérer les variations
    const key = (action || '').trim();
    if (labels[key]) return labels[key];

    const keyLower = key.toLowerCase();
    if (labels[keyLower]) return labels[keyLower];

    // Fallback : titlecase de la chaîne technique
    if (!key) return 'Action';
    return key
      .split('_')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  // ═════════════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen pb-12" style={{ background: '#FAFAF7' }}>
      {/* Header sticky avec tabs */}
      <div
        className="sticky top-0 z-10 bg-white border-b"
        style={{ borderColor: BO_TINT }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Mon profil</h1>

          {/* Tabs */}
          <div className="flex gap-1 border-b -mb-4" style={{ borderColor: BO_TINT }}>
            {(['profil', 'securite', 'preferences'] as const).map(tab => {
              const labels = { profil: 'Mon profil', securite: 'Sécurité', preferences: 'Préférences' };
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-4 py-2.5 text-sm font-semibold transition-colors relative"
                  style={{
                    color: isActive ? BO_DARK : '#6B5A4D',
                    background: 'transparent',
                    border: 'none',
                  }}
                >
                  {labels[tab]}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5"
                      style={{ background: BO_DARK }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
        <AnimatePresence mode="wait">
          {activeTab === 'profil' && (
            <motion.div
              key="profil"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Card photo + identite */}
              <div className="bg-white rounded-2xl p-6" style={{ border: `1px solid ${BO_TINT}` }}>
                <div className="flex items-start gap-5 flex-wrap">
                  {/* Avatar cliquable */}
                  <button
                    onClick={() => setPhotoModalOpen(true)}
                    className="relative group flex-shrink-0"
                    type="button"
                  >
                    <div
                      className="w-24 h-24 rounded-2xl flex items-center justify-center overflow-hidden"
                      style={{
                        background: boUser?.photoUrl ? '#fff' : `linear-gradient(135deg, ${BO_DARK}, ${BO_MEDIUM || '#8A7E70'})`,
                        backgroundImage: boUser?.photoUrl ? `url(${boUser.photoUrl})` : undefined,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        border: `2px solid ${BO_TINT}`,
                      }}
                    >
                      {!boUser?.photoUrl && (
                        <span className="text-white text-3xl font-bold">
                          {(boUser?.firstName?.[0] || '') + (boUser?.lastName?.[0] || '')}
                        </span>
                      )}
                    </div>
                    <div
                      className="absolute inset-0 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      style={{ background: 'rgba(0,0,0,0.5)' }}
                    >
                      <span className="text-white text-xs font-semibold">Modifier</span>
                    </div>
                  </button>

                  {/* Infos */}
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-bold text-gray-900">
                      {isEntite ? boUser?.firstName : `${boUser?.firstName ?? ''} ${boUser?.lastName ?? ''}`}
                    </h2>
                    <p className="text-sm mt-1" style={{ color: BO_DARK }}>
                      {ROLE_LABELS[boUser?.role as BORoleType] || boUser?.role}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      {ROLE_DESCRIPTIONS[boUser?.role as BORoleType] || ''}
                    </p>
                  </div>

                  {/* Bouton edit */}
                  {!editing && (
                    <button
                      onClick={() => setEditing(true)}
                      className="px-4 py-2 rounded-lg text-sm font-semibold flex-shrink-0"
                      style={{ background: BO_DARK, color: '#fff' }}
                    >
                      Modifier
                    </button>
                  )}
                </div>
              </div>

              {/* Card formulaire */}
              <div className="bg-white rounded-2xl p-6" style={{ border: `1px solid ${BO_TINT}` }}>
                <h3 className="text-base font-bold text-gray-900 mb-4">Informations personnelles</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Prénom */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      {isEntite ? 'Raison sociale' : 'Prénom'}
                    </label>
                    <input
                      type="text"
                      value={profileForm.firstName}
                      onChange={e => setProfileForm({ ...profileForm, firstName: e.target.value })}
                      disabled={!editing || isEntite}
                      className="w-full px-3 py-2.5 rounded-lg text-sm"
                      style={{
                        border: `1px solid ${BO_TINT}`,
                        background: (editing && !isEntite) ? '#fff' : '#FAFAF7',
                        color: '#1a1a1a',
                      }}
                    />
                  </div>

                  {/* Nom */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Nom
                    </label>
                    <input
                      type="text"
                      value={profileForm.lastName}
                      onChange={e => setProfileForm({ ...profileForm, lastName: e.target.value })}
                      disabled={!editing || isEntite}
                      className="w-full px-3 py-2.5 rounded-lg text-sm"
                      style={{
                        border: `1px solid ${BO_TINT}`,
                        background: (editing && !isEntite) ? '#fff' : '#FAFAF7',
                        color: '#1a1a1a',
                      }}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Adresse e-mail
                    </label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                      disabled={!editing}
                      placeholder="admin@julaba.com"
                      className="w-full px-3 py-2.5 rounded-lg text-sm"
                      style={{
                        border: `1px solid ${BO_TINT}`,
                        background: editing ? '#fff' : '#FAFAF7',
                        color: '#1a1a1a',
                      }}
                    />
                  </div>

                  {/* Telephone */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                      Téléphone
                    </label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                      disabled={!editing}
                      placeholder="+225 07 00 00 00 00"
                      className="w-full px-3 py-2.5 rounded-lg text-sm"
                      style={{
                        border: `1px solid ${BO_TINT}`,
                        background: editing ? '#fff' : '#FAFAF7',
                        color: '#1a1a1a',
                      }}
                    />
                  </div>
                </div>

                {/* Boutons sauvegarde */}
                {editing && (
                  <div className="flex justify-end gap-3 mt-5 pt-5 border-t" style={{ borderColor: BO_TINT }}>
                    <button
                      onClick={() => {
                        setEditing(false);
                        setProfileForm({
                          firstName: boUser?.firstName || '',
                          lastName: boUser?.lastName || '',
                          email: boUser?.email || '',
                          phone: boUser?.phone || '',
                        });
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-semibold"
                      style={{ color: '#6B5A4D', background: 'transparent', border: `1px solid ${BO_TINT}` }}
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                      style={{ background: BO_DARK, color: '#fff', opacity: savingProfile ? 0.6 : 1 }}
                    >
                      {savingProfile ? 'Enregistrement...' : 'Enregistrer'}
                      {!savingProfile && <Save size={14} />}
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'securite' && (
            <motion.div
              key="securite"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Section Mot de passe */}
              <div className="bg-white rounded-2xl p-6" style={{ border: `1px solid ${BO_TINT}` }}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">Mot de passe</h3>
                    <p className="text-xs text-gray-500">Modifie ton mot de passe pour sécuriser ton compte</p>
                  </div>
                  <button
                    onClick={() => setShowMDP(true)}
                    className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                    style={{ background: BO_DARK, color: '#fff' }}
                  >
                    <Lock size={14} />
                    Modifier
                  </button>
                </div>
              </div>

              {/* Section Sessions actives */}
              <div className="bg-white rounded-2xl p-6" style={{ border: `1px solid ${BO_TINT}` }}>
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">Appareils connectés</h3>
                    <p className="text-xs text-gray-500">
                      {sessions.length} {sessions.length > 1 ? 'sessions actives' : 'session active'}
                    </p>
                  </div>
                  {sessions.length > 1 && (
                    <button
                      onClick={handleRevokeAllSessions}
                      className="text-xs font-semibold"
                      style={{ color: '#DC2626' }}
                    >
                      Déconnecter les autres
                    </button>
                  )}
                </div>

                {loadingSessions ? (
                  <p className="text-sm text-gray-400 text-center py-4">Chargement...</p>
                ) : sessions.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Aucune session active</p>
                ) : (
                  <div className="space-y-2">
                    {sessions.map(session => {
                      const DeviceIcon = getDeviceIcon(session.deviceInfo);
                      return (
                        <div
                          key={session.id}
                          className="flex items-center gap-3 p-3 rounded-lg"
                          style={{ background: '#FAFAF7', border: `1px solid ${BO_TINT}` }}
                        >
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: BO_TINT }}
                          >
                            <DeviceIcon size={18} style={{ color: BO_DARK }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {parseUserAgent(session.deviceInfo)}
                              </p>
                              {session.isCurrent && (
                                <span
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                  style={{ background: '#10B981', color: '#fff' }}
                                >
                                  ACTUEL
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">
                              <Wifi size={11} className="inline mr-1" />
                              {session.ipAddress || 'IP inconnue'} · {formatRelativeTime(session.createdAt)}
                            </p>
                          </div>
                          {!session.isCurrent && (
                            <button
                              onClick={() => handleRevokeSession(session.id)}
                              disabled={revokingSessionId === session.id}
                              className="p-2 rounded-lg flex-shrink-0"
                              style={{ background: 'transparent', color: '#DC2626', opacity: revokingSessionId === session.id ? 0.5 : 1 }}
                              title="Déconnecter cet appareil"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Section Historique connexions */}
              <div className="bg-white rounded-2xl p-6" style={{ border: `1px solid ${BO_TINT}` }}>
                <div className="mb-4">
                  <h3 className="text-base font-bold text-gray-900 mb-1">Historique récent</h3>
                  <p className="text-xs text-gray-500">10 dernières activités sur ton compte</p>
                </div>

                {loadingLogs ? (
                  <p className="text-sm text-gray-400 text-center py-4">Chargement...</p>
                ) : logs.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Aucune activité récente</p>
                ) : (
                  <div className="space-y-1">
                    {logs.map(log => (
                      <div
                        key={log.id}
                        className="flex items-center gap-3 p-3 rounded-lg"
                        style={{ background: '#FAFAF7' }}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ background: BO_TINT }}
                        >
                          <LogIn size={14} style={{ color: BO_DARK }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {formatLogAction(log.action)}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {log.ip || 'IP inconnue'} · {formatRelativeTime(log.created_at)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'preferences' && (
            <motion.div
              key="preferences"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Section Langue */}
              <div className="bg-white rounded-2xl p-6" style={{ border: `1px solid ${BO_TINT}` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: BO_TINT }}
                  >
                    <Globe size={18} style={{ color: BO_DARK }} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Langue</h3>
                    <p className="text-xs text-gray-500">{'Choisis la langue de l\u2019interface'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {([
                    { value: 'fr' as Language, label: 'Français', flag: 'FR' },
                    { value: 'en' as Language, label: 'English', flag: 'EN' },
                  ]).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLanguage(opt.value)}
                      className="px-4 py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                      style={{
                        background: language === opt.value ? BO_DARK : '#FAFAF7',
                        color: language === opt.value ? '#fff' : '#6B5A4D',
                        border: `1px solid ${language === opt.value ? BO_DARK : BO_TINT}`,
                      }}
                    >
                      <span style={{ fontSize: 11, opacity: 0.7 }}>{opt.flag}</span>
                      {opt.label}
                      {language === opt.value && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Section Thème */}
              <div className="bg-white rounded-2xl p-6" style={{ border: `1px solid ${BO_TINT}` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: BO_TINT }}
                  >
                    <Moon size={18} style={{ color: BO_DARK }} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Thème</h3>
                    <p className="text-xs text-gray-500">{'Apparence de l\u2019interface'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {([
                    { value: 'light' as Theme, label: 'Clair', icon: Sun },
                    { value: 'dark' as Theme, label: 'Sombre', icon: Moon },
                    { value: 'auto' as Theme, label: 'Auto', icon: Monitor },
                  ]).map(opt => {
                    const Icon = opt.icon;
                    const isActive = theme === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setTheme(opt.value)}
                        className="px-3 py-3 rounded-lg text-sm font-semibold flex flex-col items-center gap-1.5 transition-colors"
                        style={{
                          background: isActive ? BO_DARK : '#FAFAF7',
                          color: isActive ? '#fff' : '#6B5A4D',
                          border: `1px solid ${isActive ? BO_DARK : BO_TINT}`,
                        }}
                      >
                        <Icon size={18} />
                        <span className="text-xs">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Le mode sombre sera disponible prochainement.
                </p>
              </div>

              {/* Section Notifications */}
              <div className="bg-white rounded-2xl p-6" style={{ border: `1px solid ${BO_TINT}` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: BO_TINT }}
                  >
                    <Bell size={18} style={{ color: BO_DARK }} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Notifications</h3>
                    <p className="text-xs text-gray-500">{'Comment souhaites-tu être alerté\u00A0?'}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <label
                    className="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors"
                    style={{
                      background: '#FAFAF7',
                      border: `1px solid ${BO_TINT}`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Mail size={16} style={{ color: BO_DARK }} />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Notifications par e-mail</p>
                        <p className="text-xs text-gray-500">Recevoir les alertes importantes par e-mail</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={emailNotifications}
                      onClick={() => setEmailNotifications(v => !v)}
                      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                      style={{
                        background: emailNotifications ? BO_DARK : '#D1CDC2',
                      }}
                    >
                      <span
                        className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                        style={{
                          transform: emailNotifications ? 'translateX(22px)' : 'translateX(4px)',
                        }}
                      />
                    </button>
                  </label>

                  <label
                    className="flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors"
                    style={{
                      background: '#FAFAF7',
                      border: `1px solid ${BO_TINT}`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Bell size={16} style={{ color: BO_DARK }} />
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Notifications push</p>
                        <p className="text-xs text-gray-500">Recevoir des alertes en temps réel dans le navigateur</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={pushNotifications}
                      onClick={() => setPushNotifications(v => !v)}
                      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                      style={{
                        background: pushNotifications ? BO_DARK : '#D1CDC2',
                      }}
                    >
                      <span
                        className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                        style={{
                          transform: pushNotifications ? 'translateX(22px)' : 'translateX(4px)',
                        }}
                      />
                    </button>
                  </label>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSavePreferences}
                  disabled={savingPrefs}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2"
                  style={{
                    background: BO_DARK,
                    color: '#fff',
                    opacity: savingPrefs ? 0.6 : 1,
                  }}
                >
                  {savingPrefs ? 'Enregistrement...' : 'Enregistrer les préférences'}
                  {!savingPrefs && <Check size={14} />}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          onClick={handleLogout}
          {...fadeInUp(0.2)}
          className="w-full mt-6 py-3 rounded-xl bg-red-500 text-white font-semibold shadow-sm flex items-center justify-center gap-2"
          whileHover={{ scale: 1.01, backgroundColor: '#DC2626' }}
          whileTap={{ scale: 0.98 }}
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </motion.button>
      </div>

      {/* Modal Mot de passe */}
      <AnimatePresence>
        {showMDP && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !savingMDP && setShowMDP(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 16,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center gap-3 mb-5">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: BO_TINT }}
                >
                  <Lock size={18} style={{ color: BO_DARK }} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Modifier le mot de passe</h3>
                  <p className="text-xs text-gray-500">{'Choisis un mot de passe d\u2019au moins 8 caractères'}</p>
                </div>
              </div>

              <form onSubmit={handleChangeMDP} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Mot de passe actuel
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={mdpForm.actuel}
                    onChange={(e) => setMdpForm({ ...mdpForm, actuel: e.target.value })}
                    autoComplete="current-password"
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={{ border: `1px solid ${BO_TINT}`, background: '#fff' }}
                    disabled={savingMDP}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Nouveau mot de passe
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={mdpForm.nouveau}
                    onChange={(e) => setMdpForm({ ...mdpForm, nouveau: e.target.value })}
                    autoComplete="new-password"
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={{ border: `1px solid ${BO_TINT}`, background: '#fff' }}
                    disabled={savingMDP}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Confirmer le nouveau mot de passe
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={mdpForm.confirmation}
                    onChange={(e) => setMdpForm({ ...mdpForm, confirmation: e.target.value })}
                    autoComplete="new-password"
                    className="w-full px-3 py-2.5 rounded-lg text-sm"
                    style={{ border: `1px solid ${BO_TINT}`, background: '#fff' }}
                    disabled={savingMDP}
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(e) => setShowPassword(e.target.checked)}
                    className="rounded"
                  />
                  Afficher les mots de passe
                </label>

                <div className="flex gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowMDP(false)}
                    disabled={savingMDP}
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold"
                    style={{ background: 'transparent', color: '#6B5A4D', border: `1px solid ${BO_TINT}` }}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={savingMDP}
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                    style={{ background: BO_DARK, color: '#fff', opacity: savingMDP ? 0.6 : 1 }}
                  >
                    {savingMDP ? 'Enregistrement...' : 'Enregistrer'}
                    {!savingMDP && <Check size={14} />}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal confirmation Déconnecter autres sessions */}
      <AnimatePresence>
        {revokeAllConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !revokingAll && setRevokeAllConfirmOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 16,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-sm"
            >
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: '#FEE2E2' }}
                >
                  <LogOut size={18} style={{ color: '#DC2626' }} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Déconnecter les autres appareils</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {(() => {
                      const n = sessions.filter(s => !s.isCurrent).length;
                      return `${n} session${n > 1 ? 's' : ''} active${n > 1 ? 's' : ''} sera${n > 1 ? 'ont' : ''} fermée${n > 1 ? 's' : ''}`;
                    })()}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-5">
                Tous les appareils connectés (sauf le tien actuellement) seront déconnectés. Cette action est immédiate.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => !revokingAll && setRevokeAllConfirmOpen(false)}
                  disabled={revokingAll}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ background: 'transparent', color: '#6B5A4D', border: `1px solid ${BO_TINT}` }}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={confirmRevokeAllSessions}
                  disabled={revokingAll}
                  className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: '#DC2626', color: '#fff', opacity: revokingAll ? 0.6 : 1 }}
                >
                  {revokingAll ? 'Déconnexion...' : 'Confirmer'}
                  {!revokingAll && <Check size={14} />}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal upload photo */}
      <AnimatePresence>
        {photoModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !uploadingPhoto && setPhotoModalOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: 16,
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
            >
              <h3 className="text-lg font-bold text-gray-900 mb-4">Photo de profil</h3>

              {/* Preview */}
              <div className="flex justify-center mb-5">
                <div
                  className="w-32 h-32 rounded-2xl flex items-center justify-center overflow-hidden"
                  style={{
                    background: photoPreview || boUser?.photoUrl ? '#fff' : `linear-gradient(135deg, ${BO_DARK}, #8A7E70)`,
                    backgroundImage: photoPreview ? `url(${photoPreview})` : (boUser?.photoUrl ? `url(${boUser.photoUrl})` : undefined),
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    border: `3px solid ${BO_TINT}`,
                  }}
                >
                  {!photoPreview && !boUser?.photoUrl && (
                    <span className="text-white text-4xl font-bold">
                      {(boUser?.firstName?.[0] || '') + (boUser?.lastName?.[0] || '')}
                    </span>
                  )}
                </div>
              </div>

              {/* Choisir / actions */}
              <div className="space-y-2.5">
                <label
                  className="block w-full px-4 py-2.5 rounded-lg text-sm font-semibold text-center cursor-pointer"
                  style={{ background: BO_DARK, color: '#fff' }}
                >
                  {photoFile ? 'Choisir une autre photo' : 'Choisir une photo'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="hidden"
                  />
                </label>

                {photoFile && (
                  <button
                    onClick={handlePhotoUpload}
                    disabled={uploadingPhoto}
                    className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                    style={{ background: '#10B981', color: '#fff', opacity: uploadingPhoto ? 0.6 : 1 }}
                  >
                    {uploadingPhoto ? 'Téléversement...' : 'Enregistrer la photo'}
                    {!uploadingPhoto && <Check size={14} />}
                  </button>
                )}

                <button
                  onClick={() => {
                    if (uploadingPhoto) return;
                    setPhotoModalOpen(false);
                    setPhotoFile(null);
                    setPhotoPreview(null);
                  }}
                  className="w-full px-4 py-2.5 rounded-lg text-sm font-semibold"
                  style={{ background: 'transparent', color: '#6B5A4D', border: `1px solid ${BO_TINT}` }}
                >
                  Annuler
                </button>
              </div>

              <p className="text-xs text-gray-400 text-center mt-4">
                Format JPG, PNG ou WebP · Max 5 Mo
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <PartenairesLogos />
      </div>
    </div>
  );
}