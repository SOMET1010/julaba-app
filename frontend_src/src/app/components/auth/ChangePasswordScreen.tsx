import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { API_URL } from '../../utils/api';
import { normalizeRole, ROLE_ROUTES } from '../../types/constants';

const ROLE_COLORS: Record<string, { primary: string; bg: string; border: string }> = {
  marchand: { primary: '#C66A2C', bg: 'rgba(255,247,237,0.9)', border: 'rgba(198,106,44,0.3)' },
  producteur: { primary: '#4CAF50', bg: 'rgba(240,253,244,0.9)', border: 'rgba(76,175,80,0.3)' },
  cooperateur: { primary: '#2E7D32', bg: 'rgba(232,245,233,0.9)', border: 'rgba(46,125,50,0.3)' },
  identificateur: { primary: '#8B5CF6', bg: 'rgba(245,243,255,0.9)', border: 'rgba(139,92,246,0.3)' },
  institution: { primary: '#2563EB', bg: 'rgba(239,246,255,0.9)', border: 'rgba(37,99,235,0.3)' },
  admin: { primary: '#374151', bg: 'rgba(249,250,251,0.9)', border: 'rgba(55,65,81,0.3)' },
  super_admin: { primary: '#374151', bg: 'rgba(249,250,251,0.9)', border: 'rgba(55,65,81,0.3)' },
};

export function ChangePasswordScreen() {
  const navigate = useNavigate();
  const { user, setUser } = useApp();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const role = user?.role || 'marchand';
  const boRoles = ['super_admin', 'admin'];
  const palette = ROLE_COLORS[role] || ROLE_COLORS.marchand;

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!oldPassword.trim()) {
      setError('Veuillez saisir votre mot de passe actuel');
      return;
    }
    if (!newPassword.trim() || newPassword.length < 4) {
      setError('Mot de passe trop court, minimum 4 caractères.');
      return;
    }
    if (newPassword !== confirm) { setError('Les mots de passe ne correspondent pas'); return; }
    setLoading(true);
    setError('');
    try {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
        signal: abortRef.current.signal,
      });
      if (!res.ok) {
        let backendMsg = '';
        try {
          const d = await res.json();
          backendMsg = typeof d?.message === 'string' ? d.message : '';
        } catch (err) {
          console.warn('[ChangePasswordScreen] error response parse failed:', err instanceof Error ? err.message : err);
        }
        let userMsg: string;
        if (res.status === 401) {
          userMsg = 'Mot de passe actuel incorrect';
          setOldPassword('');
          setNewPassword('');
          setConfirm('');
        } else if (res.status === 400) {
          userMsg = backendMsg || 'Données invalides';
        } else if (res.status === 429) {
          userMsg = 'Trop de tentatives. Réessaie dans quelques minutes.';
        } else if (res.status >= 500) {
          userMsg = 'Erreur serveur. Réessaie dans un instant.';
        } else {
          userMsg = 'Erreur lors du changement de mot de passe';
        }
        setError(userMsg);
        setLoading(false);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setUser(prev => prev ? { ...prev, mustChangePassword: false } : prev);
        setOldPassword('');
        setNewPassword('');
        setConfirm('');
        setSuccess(true);
        if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
        successTimeoutRef.current = setTimeout(() => {
          if (role === 'cooperative' || role === 'cooperateur') {
            navigate('/cooperative');
            return;
          }
          const normalizedRole = normalizeRole(String(role));
          const target = ROLE_ROUTES[normalizedRole]
            ?? (boRoles.includes(normalizedRole) ? '/backoffice/dashboard' : '/');
          navigate(target);
        }, 2000);
      } else {
        setError('Erreur lors du changement de mot de passe');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.warn('[ChangePasswordScreen] change-password failed:', err instanceof Error ? err.message : err);
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: palette.bg }}>
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center" role="status" aria-live="polite">
        <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-black text-gray-900">Mot de passe mis à jour !</h2>
        <p className="text-gray-500 mt-2">Redirection en cours...</p>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: palette.bg }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: palette.border }}>
            <Lock className="w-10 h-10" style={{ color: palette.primary }} />
          </div>
          <h1 id="change-pwd-title" className="text-2xl font-black text-gray-900">
            Définissez votre mot de passe
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            Choisissez un mot de passe d’au moins 4 caractères pour sécuriser votre compte.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          aria-labelledby="change-pwd-title"
          className="bg-white rounded-3xl p-6 shadow-xl border-2 space-y-4"
          style={{ borderColor: palette.border }}
        >
          <div>
            <label htmlFor="change-pwd-old" className="block text-sm font-bold text-gray-700 mb-2">Mot de passe actuel</label>
            <input
              id="change-pwd-old"
              type="password"
              value={oldPassword}
              onChange={e => setOldPassword(e.target.value)}
              placeholder="Mot de passe actuel"
              className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:outline-none text-lg font-bold tracking-widest"
              style={{ borderColor: palette.border }}
            />
          </div>
          <div>
            <label htmlFor="change-pwd-new" className="block text-sm font-bold text-gray-700 mb-2">Nouveau mot de passe</label>
            <div className="relative">
              <input
                id="change-pwd-new"
                type={showPwd ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Nouveau mot de passe (minimum 4 caractères)"
                className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:outline-none text-lg font-bold tracking-widest"
                style={{ borderColor: palette.border }}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                aria-label={showPwd ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                aria-pressed={showPwd}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                {showPwd ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
              </button>
            </div>
          </div>
          <div>
            <label htmlFor="change-pwd-confirm" className="block text-sm font-bold text-gray-700 mb-2">
              Confirmer le mot de passe
            </label>
            <input
              id="change-pwd-confirm"
              type={showPwd ? 'text' : 'password'}
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              placeholder="Confirmez le mot de passe"
              className="w-full px-4 py-4 rounded-2xl border-2 border-gray-200 focus:outline-none text-lg font-bold tracking-widest"
              style={{ borderColor: palette.border }}
            />
          </div>
          {error && (
            <p role="alert" aria-live="assertive" className="text-red-500 text-sm font-semibold">
              {error}
            </p>
          )}
          <motion.button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl font-black text-white text-lg disabled:opacity-50"
            style={{ backgroundColor: palette.primary }}
            whileHover={loading ? {} : { scale: 1.02 }}
            whileTap={loading ? {} : { scale: 0.98 }}
          >
            {loading ? 'Enregistrement...' : 'Confirmer'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
