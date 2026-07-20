/**
 * ═══════════════════════════════════════════════════════════════════
 * JÙLABA — Page de Récupération Super Admin
 * ═══════════════════════════════════════════════════════════════════
 *
 * Outil d'urgence pour diagnostiquer et réparer le compte Super Admin.
 * 3 modes :
 *   1. Diagnostic — Vérifie l'état du SA dans la DB et Supabase Auth
 *   2. Reset mot de passe — Change uniquement le mdp (profil conservé)
 *   3. Récupération complète — Recrée tout le compte (nucléaire)
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldAlert, Search, RefreshCw, KeyRound, Trash2,
  CheckCircle, XCircle, AlertCircle, ChevronRight,
  Eye, EyeOff, Loader2, User, Lock, Database, ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { API_URL } from '../utils/api';
const RECOVERY_KEY = 'JULABA_RECOVERY_2026';

type Step = 'menu' | 'diagnostic' | 'reset-pwd' | 'full-recover' | 'test-login' | 'clear-storage';

interface StatusBadge {
  ok: boolean;
  label: string;
}

function Badge({ ok, label }: StatusBadge) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-xl text-xs font-semibold border-2 ${
      ok
        ? 'bg-green-50 border-green-300 text-green-800'
        : 'bg-red-50 border-red-300 text-red-800'
    }`}>
      {ok ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {label}
    </span>
  );
}

function ResultBox({ data, error }: { data?: any; error?: string }) {
  if (error) return (
    <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-4">
      <p className="text-red-800 font-semibold text-sm flex items-center gap-2">
        <XCircle className="w-4 h-4 flex-shrink-0" /> Erreur
      </p>
      <p className="text-red-700 text-xs mt-1">{error}</p>
    </div>
  );
  if (!data) return null;
  return (
    <div className="bg-gray-50 border-2 border-gray-200 rounded-3xl p-4 overflow-auto">
      <pre className="text-xs text-gray-800 font-mono whitespace-pre-wrap">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

// ── Diagnostic Panel ───────────────────────────────────────────────────────

function DiagnosticPanel({ onBack }: { onBack: () => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const run = async () => {
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const res = await fetch(`${API_URL}/auth/super-admin-status`, { credentials: 'include',
        headers: { }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Database className="w-5 h-5 text-blue-600" /> Diagnostic Super Admin
      </h2>
      <p className="text-sm text-gray-500">Vérifie l'état du compte Super Admin dans Supabase et users_julaba.</p>

      <button
        onClick={run}
        disabled={loading}
        className="w-full py-4 rounded-3xl bg-blue-600 text-white font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50 border-2 border-blue-700"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
        {loading ? 'Analyse en cours...' : 'Lancer le diagnostic'}
      </button>

      <AnimatePresence>
        {(result || error) && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            {error && <ResultBox error={error} />}
            {result && (
              <>
                <div className={`p-4 rounded-3xl border-2 ${
                  result.count === 1
                    ? 'bg-green-50 border-green-300'
                    : result.count === 0
                    ? 'bg-red-50 border-red-300'
                    : 'bg-yellow-50 border-yellow-300'
                }`}>
                  <p className={`font-bold text-sm ${
                    result.count === 1 ? 'text-green-900' : result.count === 0 ? 'text-red-900' : 'text-yellow-900'
                  }`}>
                    {result.diagnosis}
                  </p>
                  <p className="text-xs mt-1 text-gray-600">{result.count} profil(s) Super Admin dans users_julaba</p>
                </div>

                {result.profiles?.map((p: any, i: number) => (
                  <div key={i} className="bg-white border-2 border-gray-200 rounded-3xl p-4 space-y-2">
                    <p className="font-semibold text-gray-900 text-sm">
                      {p.first_name} {p.last_name} — {p.phone}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Badge ok={!!p.auth_user_id} label="auth_user_id lié" />
                      <Badge ok={p.authExists} label="Compte Auth existe" />
                      <Badge ok={p.validated} label="Profil validé" />
                    </div>
                    {p.authEmail && (
                      <p className="text-xs text-gray-500">Email Auth: {p.authEmail}</p>
                    )}
                    {p.last_login_at && (
                      <p className="text-xs text-gray-500">Dernier login: {new Date(p.last_login_at).toLocaleString('fr-FR')}</p>
                    )}
                    {p.auth_user_id && !p.authExists && (
                      <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-2xl p-2">
                        <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0" />
                        <p className="text-xs text-orange-800">auth_user_id present mais le compte Auth est introuvable. Compte desynchronise — utilisez la recuperation complete.</p>
                      </div>
                    )}
                    {!p.auth_user_id && (
                      <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-2xl p-2">
                        <AlertCircle className="w-4 h-4 text-orange-600 flex-shrink-0" />
                        <p className="text-xs text-orange-800">Aucun auth_user_id — le profil existe mais n'est pas lie a Supabase Auth. Utilisez la recuperation complete.</p>
                      </div>
                    )}
                  </div>
                ))}

                {result.count === 0 && (
                  <div className="flex items-center gap-2 bg-red-50 border-2 border-red-200 rounded-3xl p-4">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <p className="text-sm text-red-800">Aucun Super Admin. Utilisez la recuperation complete pour en creer un.</p>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Test Login Panel ──────────────────────────────────────────────────────────

function TestLoginPanel({ onBack }: { onBack: () => void }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const run = async () => {
    if (!phone || !password) { setError('Champs requis'); return; }
    setLoading(true); setResult(null); setError('');
    try {
      const res = await fetch(`${API_URL}/auth/test-login`, { credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const d = result?.diagnosis;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Search className="w-5 h-5 text-indigo-600" /> Test de connexion
      </h2>
      <p className="text-sm text-gray-500">Diagnostique pourquoi la connexion echoue en montrant chaque etape.</p>

      <div className="space-y-3">
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Numero de telephone (ex: 0700000001)"
            className="w-full pl-10 pr-4 py-3 rounded-3xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-0 text-sm"
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mot de passe"
            className="w-full pl-10 pr-12 py-3 rounded-3xl border-2 border-gray-200 focus:border-indigo-500 focus:ring-0 text-sm"
          />
          <button onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <button
        onClick={run}
        disabled={loading}
        className="w-full py-4 rounded-3xl bg-indigo-600 text-white font-semibold flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-50 border-2 border-indigo-700"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
        {loading ? 'Test en cours...' : 'Tester la connexion'}
      </button>

      <AnimatePresence>
        {(d || error) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {error && <ResultBox error={error} />}
            {d && (
              <div className="bg-white border-2 border-gray-200 rounded-3xl p-4 space-y-3">
                <p className="font-semibold text-gray-900 text-sm">Resultats :</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Profil dans users_julaba</span>
                    <Badge ok={d.profileExists} label={d.profileExists ? `role: ${d.profileRole}` : 'Introuvable'} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">auth_user_id lie</span>
                    <Badge ok={d.authUserIdLinked} label={d.authUserIdLinked ? 'Oui' : 'Non'} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Compte Supabase Auth existe</span>
                    <Badge ok={d.authUserExists} label={d.authUserExists ? 'Oui' : 'Non'} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">Login reussi</span>
                    <Badge ok={d.loginSuccess} label={d.loginSuccess ? 'Connexion OK' : 'Echec'} />
                  </div>
                </div>
                {d.loginError && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-3">
                    <p className="text-xs font-semibold text-red-900">Erreur login:</p>
                    <p className="text-xs text-red-700 mt-1">{d.loginError}</p>
                    {d.loginError.includes('Invalid login credentials') && (
                      <p className="text-xs text-orange-700 mt-2 font-medium">
                        Mot de passe incorrect pour ce compte. Utilisez "Reset mot de passe" ou "Recuperation complete".
                      </p>
                    )}
                  </div>
                )}
                {d.loginSuccess && (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-3">
                    <p className="text-xs text-green-800 font-semibold">
                      Connexion reussie ! Si vous n'arrivez toujours pas a acceder au backoffice, le probleme est dans localStorage. Utilisez "Nettoyer le cache".
                    </p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Reset Password Panel ──────────────────────────────────────────────────────

function ResetPasswordPanel({ onBack }: { onBack: () => void }) {
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const run = async () => {
    if (!phone || !newPassword || !confirm) { setError('Tous les champs sont requis'); return; }
    if (!newPassword.trim()) { setError('Le mot de passe ne peut pas être vide'); return; }
    if (newPassword !== confirm) { setError('Les mots de passe ne correspondent pas'); return; }
    setLoading(true); setResult(null); setError('');
    try {
      const res = await fetch(`${API_URL}/auth/reset-super-admin-password`, { credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, newPassword, secretKey: RECOVERY_KEY })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error + (data.details ? ` — ${data.details}` : ''));
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <KeyRound className="w-5 h-5 text-amber-600" /> Reset mot de passe
      </h2>
      <p className="text-sm text-gray-500">Change uniquement le mot de passe. Le profil et les donnees sont conserves.</p>

      <div className="space-y-3">
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Telephone du Super Admin"
            className="w-full pl-10 pr-4 py-3 rounded-3xl border-2 border-gray-200 focus:border-amber-500 focus:ring-0 text-sm"
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type={showPwd ? 'text' : 'password'}
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            placeholder="Nouveau mot de passe"
            className="w-full pl-10 pr-12 py-3 rounded-3xl border-2 border-gray-200 focus:border-amber-500 focus:ring-0 text-sm"
          />
          <button onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type={showPwd ? 'text' : 'password'}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Confirmer le mot de passe"
            className="w-full pl-10 pr-4 py-3 rounded-3xl border-2 border-gray-200 focus:border-amber-500 focus:ring-0 text-sm"
          />
        </div>
      </div>

      <button
        onClick={run}
        disabled={loading}
        className="w-full py-4 rounded-3xl bg-amber-600 text-white font-semibold flex items-center justify-center gap-2 hover:bg-amber-700 transition-colors disabled:opacity-50 border-2 border-amber-700"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <KeyRound className="w-5 h-5" />}
        {loading ? 'Reset en cours...' : 'Changer le mot de passe'}
      </button>

      <AnimatePresence>
        {(result || error) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            {error && <ResultBox error={error} />}
            {result?.success && (
              <div className="bg-green-50 border-2 border-green-300 rounded-3xl p-4">
                <p className="text-green-900 font-semibold flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4" /> Mot de passe reinitialise
                </p>
                <p className="text-green-700 text-xs mt-1">{result.message}</p>
                <p className="text-green-700 text-xs mt-1">Connectez-vous maintenant avec: <strong>{phone}</strong></p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Full Recovery Panel ───────────────────────────────────────────────────────

function FullRecoveryPanel({ onBack }: { onBack: () => void }) {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [confirmed, setConfirmed] = useState(false);

  const run = async () => {
    if (!confirmed) { setError('Cochez la case de confirmation d\'abord'); return; }
    if (!phone || !password || !confirm || !firstName || !lastName) { setError('Tous les champs sont requis'); return; }
    if (!password.trim()) { setError('Le mot de passe ne peut pas être vide'); return; }
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return; }
    setLoading(true); setResult(null); setError('');
    try {
      const res = await fetch(`${API_URL}/auth/recover-super-admin`, { credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password, firstName, lastName, secretKey: RECOVERY_KEY })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error + (data.details ? ` — ${data.details}` : ''));
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Trash2 className="w-5 h-5 text-red-600" /> Recuperation complete
      </h2>

      <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-4">
        <p className="text-red-900 font-bold text-sm flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" /> Attention
        </p>
        <ul className="text-red-700 text-xs mt-2 space-y-1">
          <li>- Supprime l'ancien compte Super Admin (Auth + profil)</li>
          <li>- Cree un nouveau compte avec vos nouvelles informations</li>
          <li>- Irreversible — les donnees BO liees au SA seront orphelines</li>
          <li>- A utiliser uniquement si le reset de mot de passe echoue</li>
        </ul>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <input
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            placeholder="Prenom"
            className="w-full px-4 py-3 rounded-3xl border-2 border-gray-200 focus:border-red-400 focus:ring-0 text-sm"
          />
          <input
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            placeholder="Nom"
            className="w-full px-4 py-3 rounded-3xl border-2 border-gray-200 focus:border-red-400 focus:ring-0 text-sm"
          />
        </div>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="Nouveau numero de telephone"
            className="w-full pl-10 pr-4 py-3 rounded-3xl border-2 border-gray-200 focus:border-red-400 focus:ring-0 text-sm"
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type={showPwd ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Nouveau mot de passe"
            className="w-full pl-10 pr-12 py-3 rounded-3xl border-2 border-gray-200 focus:border-red-400 focus:ring-0 text-sm"
          />
          <button onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type={showPwd ? 'text' : 'password'}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Confirmer le mot de passe"
            className="w-full pl-10 pr-4 py-3 rounded-3xl border-2 border-gray-200 focus:border-red-400 focus:ring-0 text-sm"
          />
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={e => setConfirmed(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded accent-red-600"
          />
          <span className="text-xs text-gray-700">
            Je comprends que cette action supprime definitivement l'ancien Super Admin et cree un nouveau compte.
          </span>
        </label>
      </div>

      <button
        onClick={run}
        disabled={loading || !confirmed}
        className="w-full py-4 rounded-3xl bg-red-600 text-white font-semibold flex items-center justify-center gap-2 hover:bg-red-700 transition-colors disabled:opacity-50 border-2 border-red-700"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
        {loading ? 'Recuperation en cours...' : 'Lancer la recuperation complete'}
      </button>

      <AnimatePresence>
        {(result || error) && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {error && <ResultBox error={error} />}
            {result?.success && (
              <div className="bg-green-50 border-2 border-green-300 rounded-3xl p-4 space-y-3">
                <p className="text-green-900 font-bold flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4" /> Recuperation reussie
                </p>
                <p className="text-green-700 text-xs">{result.message}</p>
                <div className="bg-white rounded-2xl p-3 border border-green-200">
                  <p className="text-xs font-semibold text-gray-700 mb-1">Nouveaux identifiants :</p>
                  <p className="text-xs text-gray-600">Telephone: <strong>{result.credentials?.phone}</strong></p>
                  <p className="text-xs text-gray-600">Email Auth: <strong>{result.credentials?.email}</strong></p>
                </div>
                {result.steps?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-1">Etapes executees :</p>
                    <ul className="space-y-1">
                      {result.steps.map((s: string, i: number) => (
                        <li key={i} className="text-xs text-gray-500 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-green-500" /> {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p className="text-xs font-semibold text-green-800">
                  Vous pouvez maintenant vous connecter sur /backoffice/login
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Clear Storage Panel ───────────────────────────────────────────────────────

function ClearStoragePanel({ onBack }: { onBack: () => void }) {
  const [done, setDone] = useState(false);

  const KEYS_TO_CLEAR = [
    'julaba_access_token',
    'julaba_refresh_token',
    'julaba_user_id',
    'julaba_bo_user',
    'julaba_app_user',
    'julaba_seen_splash',
    'julaba_completed_onboarding',
  ];

  const clearAll = () => {
    KEYS_TO_CLEAR.forEach(k => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    setDone(true);
  };

  const clearBOOnly = () => {
    ['julaba_access_token', 'julaba_refresh_token', 'julaba_user_id', 'julaba_bo_user'].forEach(k => {
      localStorage.removeItem(k);
      sessionStorage.removeItem(k);
    });
    setDone(true);
  };

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors text-sm">
        <ArrowLeft className="w-4 h-4" /> Retour
      </button>
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Trash2 className="w-5 h-5 text-purple-600" /> Nettoyer le cache local
      </h2>
      <p className="text-sm text-gray-500">Supprime les tokens et donnees de session stockes localement. Utile si la connexion reussit mais que la redirection ne fonctionne pas.</p>

      <div className="bg-gray-50 border-2 border-gray-200 rounded-3xl p-4">
        <p className="text-xs font-semibold text-gray-700 mb-2">Cles localStorage/sessionStorage :</p>
        <div className="flex flex-wrap gap-1">
          {KEYS_TO_CLEAR.map(k => (
            <span key={k} className="text-xs bg-white border border-gray-200 rounded-xl px-2 py-0.5 text-gray-600 font-mono">
              {k}
            </span>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={clearBOOnly}
          className="py-3 rounded-3xl bg-purple-100 text-purple-800 font-semibold text-sm hover:bg-purple-200 transition-colors border-2 border-purple-200"
        >
          Nettoyer session BO
        </button>
        <button
          onClick={clearAll}
          className="py-3 rounded-3xl bg-gray-800 text-white font-semibold text-sm hover:bg-gray-900 transition-colors border-2 border-gray-900"
        >
          Tout effacer
        </button>
      </div>

      <AnimatePresence>
        {done && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className="bg-green-50 border-2 border-green-300 rounded-3xl p-4">
              <p className="text-green-900 font-bold flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4" /> Cache nettoye
              </p>
              <p className="text-green-700 text-xs mt-1">
                Rechargez la page et reconnectez-vous.
              </p>
              <button
                onClick={() => window.location.href = '/backoffice/login'}
                className="mt-3 w-full py-2 rounded-2xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors"
              >
                Aller au login
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AdminRecovery() {
  const [step, setStep] = useState<Step>('menu');
  const navigate = useNavigate();

  const tools = [
    {
      id: 'diagnostic' as Step,
      icon: <Database className="w-6 h-6 text-blue-600" />,
      label: 'Diagnostic',
      desc: 'Verifier l\'etat du compte Super Admin dans la DB',
      color: 'bg-blue-50 border-blue-200',
      btn: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
    },
    {
      id: 'test-login' as Step,
      icon: <Search className="w-6 h-6 text-indigo-600" />,
      label: 'Tester la connexion',
      desc: 'Savoir exactement pourquoi le login echoue',
      color: 'bg-indigo-50 border-indigo-200',
      btn: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200',
    },
    {
      id: 'clear-storage' as Step,
      icon: <Trash2 className="w-6 h-6 text-purple-600" />,
      label: 'Nettoyer le cache',
      desc: 'Effacer les tokens corrompus dans localStorage',
      color: 'bg-purple-50 border-purple-200',
      btn: 'bg-purple-100 text-purple-800 hover:bg-purple-200',
    },
    {
      id: 'reset-pwd' as Step,
      icon: <KeyRound className="w-6 h-6 text-amber-600" />,
      label: 'Reset mot de passe',
      desc: 'Changer le mdp sans toucher au profil',
      color: 'bg-amber-50 border-amber-200',
      btn: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
    },
    {
      id: 'full-recover' as Step,
      icon: <ShieldAlert className="w-6 h-6 text-red-600" />,
      label: 'Recuperation complete',
      desc: 'Supprimer et recreer entierement le compte SA',
      color: 'bg-red-50 border-red-200',
      btn: 'bg-red-100 text-red-800 hover:bg-red-200',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="bg-white rounded-3xl shadow-2xl border-2 border-gray-200 p-6 max-w-lg w-full"
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow">
            <ShieldAlert className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Recuperation Admin</h1>
            <p className="text-xs text-gray-500">Julaba — Outils d'urgence</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {step === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-3"
            >
              <p className="text-sm text-gray-600 mb-4">
                Choisissez un outil pour diagnostiquer et reparer la connexion Super Admin.
                Commencez par le <strong>Diagnostic</strong> puis le <strong>Test de connexion</strong>.
              </p>

              {tools.map(t => (
                <button
                  key={t.id}
                  onClick={() => setStep(t.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-3xl border-2 ${t.color} hover:shadow-md transition-all`}
                >
                  <div className="flex-shrink-0">{t.icon}</div>
                  <div className="text-left flex-1">
                    <p className="font-semibold text-gray-900 text-sm">{t.label}</p>
                    <p className="text-xs text-gray-500">{t.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                </button>
              ))}

              <div className="border-t-2 border-gray-100 pt-3 mt-3 flex gap-3">
                <button
                  onClick={() => navigate('/backoffice/login')}
                  className="flex-1 py-3 rounded-3xl bg-amber-500 text-white font-semibold text-sm hover:bg-amber-600 transition-colors border-2 border-amber-600"
                >
                  Aller au login
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="flex-1 py-3 rounded-3xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors border-2 border-gray-200"
                >
                  Accueil
                </button>
              </div>
            </motion.div>
          )}

          {step === 'diagnostic' && (
            <motion.div key="diag" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <DiagnosticPanel onBack={() => setStep('menu')} />
            </motion.div>
          )}

          {step === 'test-login' && (
            <motion.div key="tl" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <TestLoginPanel onBack={() => setStep('menu')} />
            </motion.div>
          )}

          {step === 'clear-storage' && (
            <motion.div key="cs" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <ClearStoragePanel onBack={() => setStep('menu')} />
            </motion.div>
          )}

          {step === 'reset-pwd' && (
            <motion.div key="rp" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <ResetPasswordPanel onBack={() => setStep('menu')} />
            </motion.div>
          )}

          {step === 'full-recover' && (
            <motion.div key="fr" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <FullRecoveryPanel onBack={() => setStep('menu')} />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
