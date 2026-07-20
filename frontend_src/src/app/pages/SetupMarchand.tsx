/**
 * JULABA - Page de Setup et Connexion Marchand
 * Permet de tester la connexion NestJS et créer des comptes marchands de test
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CheckCircle, XCircle, RefreshCw, UserPlus, Database,
  Wifi, WifiOff, Eye, EyeOff, ArrowRight, Loader2,
  AlertCircle, Info, Copy, CheckCheck, ShieldCheck
} from 'lucide-react';
import { API_URL } from '../utils/api';

type Status = 'idle' | 'loading' | 'success' | 'error';

interface TestResult {
  label: string;
  status: Status;
  message: string;
  details?: string;
}

const REGIONS_CI = [
  'Abidjan', 'Bouaké', 'Daloa', 'Yamoussoukro', 'San-Pédro',
  'Korhogo', 'Man', 'Divo', 'Gagnoa', 'Abengourou',
  'Agboville', 'Adzopé', 'Anyama', 'Bassam', 'Bingerville'
];

const ACTIVITES_MARCHAND = [
  'Vente de riz', 'Vente de maïs', 'Vente de manioc', 'Vente d\'igname',
  'Vente de banane', 'Vente de légumes', 'Vente de fruits',
  'Commerce général vivrier', 'Vente de poisson', 'Vente de viande'
];

export default function SetupMarchand() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [testRunning, setTestRunning] = useState(false);
  const [testDone, setTestDone] = useState(false);

  // Formulaire création marchand
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    region: 'Abidjan',
    commune: '',
    activity: 'Vente de riz',
    market: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [createStatus, setCreateStatus] = useState<Status>('idle');
  const [createResult, setCreateResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const updateTest = (index: number, update: Partial<TestResult>) => {
    setTests(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...update };
      return next;
    });
  };

  const runTests = async () => {
    setTestRunning(true);
    setTestDone(false);
    setTests([
      { label: 'Connexion Edge Function', status: 'loading', message: 'Test en cours...' },
      { label: 'Base de données KV', status: 'idle', message: 'En attente...' },
      { label: 'Table users_julaba', status: 'idle', message: 'En attente...' },
      { label: 'Auth NestJS', status: 'idle', message: 'En attente...' },
    ]);

    // Test 1 : Health check
    try {
      const res = await fetch(`${API_URL}/health`, { credentials: 'include',
        headers: { }
      });
      const data = await res.json();
      if (res.ok) {
        updateTest(0, {
          status: 'success',
          message: 'Edge Function accessible',
          details: `Backend NestJS connecté`
        });
      } else {
        updateTest(0, { status: 'error', message: 'Edge Function inaccessible', details: JSON.stringify(data) });
        setTestRunning(false);
        setTestDone(true);
        return;
      }
    } catch (e: any) {
      updateTest(0, { status: 'error', message: 'Impossible de joindre le serveur', details: e.message });
      setTestRunning(false);
      setTestDone(true);
      return;
    }

    // Test 2 : KV Store
    updateTest(1, { status: 'loading', message: 'Test KV...' });
    try {
      const res = await fetch(`${API_URL}/health`, { credentials: 'include',
        headers: { }
      });
      const data = await res.json();
      if (res.ok && data.status === 'success') {
        updateTest(1, { status: 'success', message: 'KV Store opérationnel', details: data.kv_test?.message });
      } else {
        updateTest(1, { status: 'error', message: 'Erreur KV Store', details: data.message });
      }
    } catch (e: any) {
      updateTest(1, { status: 'error', message: 'Erreur KV Store', details: e.message });
    }

    // Test 3 : Table users_julaba via une tentative de login fictive
    updateTest(2, { status: 'loading', message: 'Test table utilisateurs...' });
    try {
      const res = await fetch(`${API_URL}/auth/login`, { credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone: '0000000000', password: 'test_diagnostic_xyz' })
      });
      const data = await res.json();
      // Si on reçoit "Identifiants incorrects" (401) ou "Profil introuvable" (404), la table existe
      // Si on reçoit une erreur 500 avec "relation does not exist", la table n'existe pas
      if (data.details && (data.details.includes('does not exist') || data.details.includes('relation'))) {
        updateTest(2, {
          status: 'error',
          message: 'Table users_julaba inexistante',
          details: 'Vérifier la connexion à la base de données'
        });
      } else {
        updateTest(2, {
          status: 'success',
          message: 'Table users_julaba accessible',
          details: `Réponse: ${data.error || 'OK'}`
        });
      }
    } catch (e: any) {
      updateTest(2, { status: 'error', message: 'Erreur réseau', details: e.message });
    }

    // Test 4 : Auth NestJS
    updateTest(3, { status: 'loading', message: 'Test NestJS Auth...' });
    try {
      const res = await fetch(`${API_URL}/health`, { credentials: 'include',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        updateTest(3, { status: 'success', message: 'Backend NestJS opérationnel', details: 'API connectée' });
      } else {
        updateTest(3, { status: 'error', message: 'NestJS Auth inaccessible', details: `HTTP ${res.status}` });
      }
    } catch (e: any) {
      updateTest(3, { status: 'error', message: 'Erreur Auth', details: e.message });
    }

    setTestRunning(false);
    setTestDone(true);
  };

  const handleCreateMarchand = async () => {
    if (!form.firstName || !form.lastName || form.phone.length !== 10 || form.password.length < 6) {
      setCreateResult({ error: 'Remplis tous les champs (téléphone 10 chiffres, mot de passe 6+ caractères)' });
      return;
    }

    setCreateStatus('loading');
    setCreateResult(null);

    try {
      const res = await fetch(`${API_URL}/auth/users/create`, { credentials: 'include',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          phone: form.phone,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
          role: 'marchand',
          region: form.region,
          commune: form.commune,
          activity: form.activity,
          market: form.market
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setCreateStatus('success');
        setCreateResult({
          success: true,
          phone: form.phone,
          password: form.password,
          name: `${form.firstName} ${form.lastName}`,
          role: 'marchand',
          message: 'Compte marchand créé avec succès !'
        });
        // Reset form
        setForm(prev => ({ ...prev, firstName: '', lastName: '', phone: '', password: '', commune: '', market: '' }));
      } else {
        setCreateStatus('error');
        setCreateResult({ error: data.error || 'Erreur lors de la création', details: data.details });
      }
    } catch (e: any) {
      setCreateStatus('error');
      setCreateResult({ error: 'Erreur réseau : ' + e.message });
    }
  };

  const copyCredentials = () => {
    if (!createResult?.success) return;
    navigator.clipboard.writeText(
      `Identifiants Jùlaba Marchand\nTéléphone: ${createResult.phone}\nMot de passe: ${createResult.password}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 p-4">
      <div className="max-w-2xl mx-auto space-y-6 py-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Database className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Configuration Jùlaba</h1>
          <p className="text-gray-500 text-sm mt-1">Diagnostic et création de comptes marchands</p>
        </motion.div>

        {/* Bloc Diagnostic */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl border-2 border-orange-100 shadow-sm p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Diagnostic de connexion</h2>
              <p className="text-xs text-gray-500">Vérifie que tout est bien connecté</p>
            </div>
          </div>

          {/* Tests list */}
          {tests.length > 0 && (
            <div className="space-y-2 mb-4">
              {tests.map((test, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-start gap-3 p-3 rounded-2xl border-2 ${
                    test.status === 'success' ? 'bg-green-50 border-green-200' :
                    test.status === 'error' ? 'bg-red-50 border-red-200' :
                    test.status === 'loading' ? 'bg-blue-50 border-blue-200' :
                    'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="shrink-0 mt-0.5">
                    {test.status === 'loading' && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                    {test.status === 'success' && <CheckCircle className="w-5 h-5 text-green-500" />}
                    {test.status === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
                    {test.status === 'idle' && <div className="w-5 h-5 rounded-full border-2 border-gray-300" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${
                      test.status === 'success' ? 'text-green-800' :
                      test.status === 'error' ? 'text-red-800' :
                      test.status === 'loading' ? 'text-blue-800' : 'text-gray-500'
                    }`}>{test.label}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{test.message}</p>
                    {test.details && (
                      <p className="text-xs text-gray-500 mt-0.5 font-mono break-all">{test.details}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          <motion.button
            onClick={runTests}
            disabled={testRunning}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full h-12 rounded-2xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #3B82F6, #06B6D4)' }}
          >
            {testRunning
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Test en cours...</>
              : <><RefreshCw className="w-5 h-5" /> Lancer le diagnostic</>
            }
          </motion.button>

          {testDone && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-3 p-3 rounded-2xl bg-amber-50 border-2 border-amber-200"
            >
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-800">Si "Table users_julaba inexistante"</p>
                  <p className="text-xs text-amber-700 mt-1">
                    Vérifier la connexion à la base de données NestJS.
                    Contacte l'équipe technique pour le script SQL complet.
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>

        {/* Formulaire création marchand */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl border-2 border-orange-100 shadow-sm p-6"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Créer un compte Marchand</h2>
              <p className="text-xs text-gray-500">Inscription directe sans passer par l'identificateur</p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Prénom + Nom */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Prénom</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={e => setForm(p => ({ ...p, firstName: e.target.value }))}
                  placeholder="Kofi"
                  className="w-full h-12 px-4 rounded-2xl border-2 border-gray-200 focus:border-orange-400 outline-none text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Nom</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={e => setForm(p => ({ ...p, lastName: e.target.value }))}
                  placeholder="Yao"
                  className="w-full h-12 px-4 rounded-2xl border-2 border-gray-200 focus:border-orange-400 outline-none text-sm"
                />
              </div>
            </div>

            {/* Téléphone */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Numéro de téléphone (10 chiffres)</label>
              <div className="flex items-center h-12 border-2 border-gray-200 rounded-2xl focus-within:border-orange-400 overflow-hidden">
                <span className="px-3 text-sm font-medium text-white bg-orange-500 h-full flex items-center shrink-0">+225</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  placeholder="07 00 00 00 00"
                  className="flex-1 h-full px-3 outline-none text-sm"
                  inputMode="numeric"
                />
                {form.phone.length === 10 && <CheckCircle className="w-5 h-5 text-green-500 mr-3 shrink-0" />}
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Mot de passe (6+ caractères)</label>
              <div className="flex items-center h-12 border-2 border-gray-200 rounded-2xl focus-within:border-orange-400 overflow-hidden">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="Mot de passe sécurisé"
                  className="flex-1 h-full px-4 outline-none text-sm"
                />
                <button type="button" onClick={() => setShowPassword(p => !p)} className="px-3">
                  {showPassword ? <EyeOff className="w-5 h-5 text-gray-400" /> : <Eye className="w-5 h-5 text-gray-400" />}
                </button>
              </div>
            </div>

            {/* Région */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Région</label>
              <select
                value={form.region}
                onChange={e => setForm(p => ({ ...p, region: e.target.value }))}
                className="w-full h-12 px-4 rounded-2xl border-2 border-gray-200 focus:border-orange-400 outline-none text-sm bg-white"
              >
                {REGIONS_CI.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Commune */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Commune / Ville (optionnel)</label>
              <input
                type="text"
                value={form.commune}
                onChange={e => setForm(p => ({ ...p, commune: e.target.value }))}
                placeholder="Cocody, Adjamé..."
                className="w-full h-12 px-4 rounded-2xl border-2 border-gray-200 focus:border-orange-400 outline-none text-sm"
              />
            </div>

            {/* Activité */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Activité principale</label>
              <select
                value={form.activity}
                onChange={e => setForm(p => ({ ...p, activity: e.target.value }))}
                className="w-full h-12 px-4 rounded-2xl border-2 border-gray-200 focus:border-orange-400 outline-none text-sm bg-white"
              >
                {ACTIVITES_MARCHAND.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            {/* Marché */}
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Nom du marché (optionnel)</label>
              <input
                type="text"
                value={form.market}
                onChange={e => setForm(p => ({ ...p, market: e.target.value }))}
                placeholder="Marché d'Adjamé, Marché de Cocody..."
                className="w-full h-12 px-4 rounded-2xl border-2 border-gray-200 focus:border-orange-400 outline-none text-sm"
              />
            </div>
          </div>

          {/* Résultat */}
          <AnimatePresence>
            {createResult && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`mt-4 p-4 rounded-2xl border-2 ${
                  createResult.success
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}
              >
                {createResult.success ? (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <p className="font-bold text-green-800">{createResult.message}</p>
                    </div>
                    <div className="bg-white rounded-2xl p-3 space-y-1 border border-green-200">
                      <p className="text-sm font-bold text-gray-800">Identifiants de connexion :</p>
                      <p className="text-sm text-gray-700">Nom : <strong>{createResult.name}</strong></p>
                      <p className="text-sm text-gray-700">Téléphone : <strong className="font-mono">{createResult.phone}</strong></p>
                      <p className="text-sm text-gray-700">Mot de passe : <strong className="font-mono">{createResult.password}</strong></p>
                      <p className="text-sm text-gray-700">Rôle : <strong className="text-orange-600">Marchand</strong></p>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={copyCredentials}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-100 hover:bg-green-200 transition-colors text-green-800 text-sm font-semibold"
                      >
                        {copied ? <CheckCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'Copié !' : 'Copier les identifiants'}
                      </button>
                      <a
                        href="/login"
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 transition-colors text-white text-sm font-semibold"
                      >
                        <ArrowRight className="w-4 h-4" />
                        Aller se connecter
                      </a>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-red-800">{createResult.error}</p>
                        {createResult.details && (
                          <p className="text-xs text-red-600 mt-1 font-mono">{createResult.details}</p>
                        )}
                      </div>
                    </div>
                    {createResult.details?.includes('does not exist') && (
                      <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-xs font-bold text-amber-800">Table manquante dans la base de données</p>
                        <p className="text-xs text-amber-700 mt-1">
                          La table <code>users_julaba</code> n'existe pas encore dans ta base de données.
                          Lance d'abord le diagnostic puis vérifie la base de données NestJS.
                        </p>
                      </div>
                    )}
                    {(createResult.details?.includes('already registered') || createResult.error?.includes('déjà enregistré')) && (
                      <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <p className="text-xs font-bold text-blue-800">Numéro déjà utilisé</p>
                        <p className="text-xs text-blue-700 mt-1">
                          Ce numéro est déjà enregistré. Essaie avec un autre numéro ou connecte-toi directement.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            onClick={handleCreateMarchand}
            disabled={createStatus === 'loading'}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full h-14 rounded-2xl font-bold text-white flex items-center justify-center gap-2 mt-4 disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #F97316, #C46210)' }}
          >
            {createStatus === 'loading'
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Création en cours...</>
              : <><UserPlus className="w-5 h-5" /> Créer le compte Marchand</>
            }
          </motion.button>
        </motion.div>

        {/* Info connexion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-3xl border-2 border-blue-100 shadow-sm p-5"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
            </div>
            <h2 className="font-bold text-gray-900">Comment se connecter</h2>
          </div>
          <ol className="space-y-2">
            {[
              'Va sur https://julabacom.vercel.app/login',
              'Entre le numéro de téléphone du marchand (10 chiffres)',
              'Entre le mot de passe choisi lors de la création',
              'Appuie sur "Se connecter" → accès direct à l\'interface Marchand'
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-700">
                <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <div className="mt-4 pt-4 border-t border-gray-100 text-center">
            <a
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-white text-sm"
              style={{ backgroundColor: '#C46210' }}
            >
              <ArrowRight className="w-4 h-4" />
              Aller à la page de connexion
            </a>
          </div>
        </motion.div>

        <p className="text-center text-xs text-gray-400 pb-4">
          Page d'administration Jùlaba
        </p>
      </div>
    </div>
  );
}