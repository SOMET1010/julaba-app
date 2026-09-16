import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useBackOfficeOptional } from '../../contexts/BackOfficeContext';
import { getBoAccessToken } from '../../services/backoffice-api';
import { API_URL } from '../../utils/api';
import { normalizeRole, ROLE_ROUTES } from '../../types/constants';
import { glyphePourChiffre } from '../../services/clavierImage';
import { tataUiClipForText } from '../../services/tataUiClips';
import { speakClipOrText } from '../../services/audioManager';
import { guidageVocal } from '../../utils/accessMode';
import { vibrerErreur, vibrerSucces } from '../../utils/haptique';

// Rôles qui se connectent avec un CODE À 4 CHIFFRES (pavé, glyphes images,
// voix). Le back-office garde un vrai mot de passe texte : on ne ramène pas
// l'accès d'un super_admin à quatre chiffres pour une question d'ergonomie.
const ROLES_A_CODE = ['marchand', 'producteur', 'cooperateur', 'cooperative'];

const ROLE_COLORS: Record<string, { primary: string; bg: string; border: string }> = {
  marchand: { primary: '#B74725', bg: 'rgba(255,247,237,0.9)', border: 'rgba(198,106,44,0.3)' },
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
  const bo = useBackOfficeOptional();
  const location = useLocation();
  // Le code que la personne VIENT de taper pour ouvrir sa session. L'écran de
  // connexion nous le passe : lui redemander « ton mot de passe actuel » cinq
  // secondes après l'avoir saisi n'apporte aucune sécurité (la session est
  // déjà ouverte) et bloque net quelqu'un qui ne lit pas.
  const codeDeConnexion = (location.state as { codeActuel?: string } | null)?.codeActuel || '';
  const [oldPassword, setOldPassword] = useState(codeDeConnexion);
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  // Parcours à 4 chiffres (acteurs) : on saisit, puis on redit pour confirmer.
  const [etape, setEtape] = useState<'nouveau' | 'confirme'>('nouveau');
  const [pin, setPin] = useState('');
  const [premierPin, setPremierPin] = useState('');
  const [pinEnImages, setPinEnImages] = useState<boolean>(() => {
    // MÊME clé que l'écran de connexion : si elle a choisi les images pour
    // entrer, elle les retrouve pour choisir son nouveau code. Une seule
    // source de vérité, pas une préférence de plus.
    try { return localStorage.getItem('julaba_pin_images') === '1'; } catch { return false; }
  });
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // BackOfficeContext ne peuple son user que pour les rôles BO (après
  // l'évènement julaba:bo-login) ; AppContext porte le rôle acteur. Un login
  // BOLogin ne peuple jamais AppContext, donc se fier uniquement à `user` ici
  // faisait retomber tout compte BO sur le rôle par défaut 'marchand' et
  // renvoyait la redirection post-changement vers /marchand au lieu de
  // /backoffice/dashboard (écran qui semblait « rester bloqué »).
  const role = bo?.user?.role || user?.role || 'marchand';
  const boRoles = ['super_admin', 'admin'];
  const palette = ROLE_COLORS[role] || ROLE_COLORS.marchand;

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    };
  }, []);


  const estRoleACode = ROLES_A_CODE.includes(normalizeRole(String(role))) || ROLES_A_CODE.includes(String(role));

  // Tata dit d'abord une phrase RÉELLEMENT ENREGISTRÉE (garantie audible même
  // si la synthèse est muette dans l'APK), puis la précision par synthèse.
  // Les prises de parole s'enchaînent : audioManager ne sert qu'un créneau à
  // la fois et toute nouvelle demande annule la précédente.
  const direSuite = async (...textes: (string | null | undefined)[]) => {
    if (!guidageVocal()) return;
    for (const texte of textes) {
      if (!texte) continue;
      let clip: string | null = null;
      try { clip = tataUiClipForText(texte); } catch { /* ignore */ }
      try { await speakClipOrText({ clipUrl: clip ?? undefined, text: texte }); } catch { /* ignore */ }
    }
  };

  // L'ENVOI PREND SES VALEURS EN PARAMÈTRE, jamais dans l'état : le parcours à
  // 4 chiffres conclut dans la foulée d'un setState, dont la valeur n'est pas
  // encore lisible. Lire l'état ici enverrait le code précédent.
  const envoyerChangement = async (ancien: string, nouveau: string) => {
    setLoading(true);
    setError('');
    try {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      // En-tête Authorization en secours du cookie de session : sur julaba-web/
      // julaba-api (domaines différents), le cookie cross-domaine est bloqué
      // par défaut par plusieurs navigateurs même correctement configuré côté
      // serveur — un login BO qui « réussissait » (écran suivant affiché) était
      // ensuite rejeté en 401 sur ce premier appel authentifié, affiché à tort
      // comme « mot de passe actuel incorrect ».
      const boToken = getBoAccessToken();
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(boToken ? { Authorization: `Bearer ${boToken}` } : {}),
        },
        body: JSON.stringify({ oldPassword: ancien, newPassword: nouveau }),
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
          setPin(''); setPremierPin(''); setEtape('nouveau');
        } else if (res.status === 400) {
          userMsg = backendMsg || 'Données invalides';
        } else if (res.status === 429) {
          userMsg = 'Trop de tentatives. Réessaie dans quelques minutes.';
        } else if (res.status >= 500) {
          userMsg = 'Ça n\'a pas marché. Réessaie dans un instant.';
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

  // Formulaire texte (back-office) : mêmes contrôles qu'avant, un seul envoi.
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!oldPassword.trim()) { setError('Veuillez saisir votre mot de passe actuel'); return; }
    if (!newPassword.trim() || newPassword.length < 4) { setError('Mot de passe trop court, minimum 4 caractères.'); return; }
    if (newPassword !== confirm) { setError('Les mots de passe ne correspondent pas'); return; }
    setError('');
    await envoyerChangement(oldPassword, newPassword);
  };

  // ── Parcours à 4 chiffres ────────────────────────────────────────────────
  // Deux temps : elle choisit son code, puis le redit. La double saisie n'est
  // pas un zèle — un code mal tapé qu'on ne peut plus récupérer, c'est la
  // caisse perdue (aucun « code oublié » n'existe aujourd'hui).
  const toucheChiffre = (d: string) => {
    if (loading || pin.length >= 4) return;
    const suite = pin + d;
    setPin(suite);
    setError('');
    if (suite.length < 4) return;
    if (etape === 'nouveau') {
      setPremierPin(suite);
      setNewPassword(suite);
      setPin('');
      setEtape('confirme');
      try { vibrerSucces(); } catch { /* ignore */ }
      void direSuite('Entre ton code secret à 4 chiffres', 'Redis le même code, pour être sûre.');
      return;
    }
    if (suite !== premierPin) {
      try { vibrerErreur(); } catch { /* ignore */ }
      setPin(''); setPremierPin(''); setEtape('nouveau');
      setError("Les deux codes sont différents. Recommence 👇");
      void direSuite("Erreur, réessaie", 'Les deux codes ne sont pas les mêmes. Choisis à nouveau ton code.');
      return;
    }
    try { vibrerSucces(); } catch { /* ignore */ }
    void envoyerChangement(oldPassword, suite);
  };

  // Tata annonce l'écran. On arrive ici APRÈS une connexion réussie, donc un
  // geste a forcément eu lieu : l'audio n'est pas bloqué, pas besoin du filet
  // de rattrapage utilisé sur les écrans qui peuvent être les premiers d'une
  // page fraîchement chargée.
  useEffect(() => {
    if (!estRoleACode) return;
    void direSuite('Entre ton code secret à 4 chiffres', 'Choisis ton nouveau code, celui que tu utiliseras tous les jours.');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [estRoleACode]);

  const effacerChiffre = () => { if (!loading) { setPin((v) => v.slice(0, -1)); setError(''); } };

  const basculerImages = () => {
    setPinEnImages((v) => {
      const next = !v;
      try { localStorage.setItem('julaba_pin_images', next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
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

  // ÉCRAN À 4 CHIFFRES — défaut remonté en recette le 16/09/2026 : juste après
  // une connexion entièrement pensée pour qui ne lit pas (pavé, glyphes
  // images, voix, vibration), l'application servait TROIS champs de texte
  // libre en français, dont le mot de passe qu'elle venait de taper. Toute
  // marchande nouvellement identifiée passe par cet écran à sa première
  // connexion : elle s'y arrêtait avant d'avoir vu sa caisse.
  if (estRoleACode) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: palette.bg }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: palette.border }}>
            <Lock className="w-10 h-10" style={{ color: palette.primary }} />
          </div>
          <h1 id="change-pwd-title" className="text-2xl font-black text-gray-900">
            {etape === 'nouveau' ? 'Ton nouveau code' : 'Redis ton code'}
          </h1>
          <p className="text-gray-500 mt-2 text-sm">
            {etape === 'nouveau' ? 'Quatre chiffres, ceux que tu utiliseras tous les jours.' : 'Une deuxième fois, pour être sûre.'}
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-xl border-2" style={{ borderColor: palette.border }}>
          {/* Les ronds se remplissent : le seul retour lisible sans savoir lire. */}
          <div className="flex justify-center gap-3 mb-6" role="status" aria-live="polite"
            aria-label={`${pin.length} chiffre${pin.length > 1 ? 's' : ''} sur 4`}>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} style={{
                width: 18, height: 18, borderRadius: 9,
                background: i < pin.length ? palette.primary : 'transparent',
                border: `2px solid ${palette.primary}`, display: 'inline-block',
              }} />
            ))}
          </div>

          {error && (
            <p className="text-center text-sm font-bold mb-4" style={{ color: '#B91C1C' }} role="alert">{error}</p>
          )}

          <div className="grid grid-cols-3 gap-3">
            {['1','2','3','4','5','6','7','8','9'].map((d) => (
              <button key={d} type="button" disabled={loading}
                onPointerDown={(e) => e.preventDefault()} onClick={() => toucheChiffre(d)}
                aria-label={pinEnImages ? glyphePourChiffre(d, true) : `Chiffre ${d}`}
                style={{ minHeight: 56, borderRadius: 16, fontSize: 24, fontWeight: 800,
                  background: '#fff', border: `2px solid ${palette.border}`, color: '#1f2937' }}>
                {glyphePourChiffre(d, pinEnImages)}
              </button>
            ))}
            <span />
            <button type="button" disabled={loading}
              onPointerDown={(e) => e.preventDefault()} onClick={() => toucheChiffre('0')}
              aria-label={pinEnImages ? glyphePourChiffre('0', true) : 'Chiffre 0'}
              style={{ minHeight: 56, borderRadius: 16, fontSize: 24, fontWeight: 800,
                background: '#fff', border: `2px solid ${palette.border}`, color: '#1f2937' }}>
              {glyphePourChiffre('0', pinEnImages)}
            </button>
            <button type="button" disabled={loading} onClick={effacerChiffre} aria-label="Effacer le dernier chiffre"
              style={{ minHeight: 56, borderRadius: 16, fontSize: 22, fontWeight: 800,
                background: '#fff', border: `2px solid ${palette.border}`, color: '#1f2937' }}>
              ⌫
            </button>
          </div>

          {/* Elle a choisi son code avec des images : elle doit pouvoir en
              choisir un nouveau de la même façon. Même préférence que l'écran
              de connexion (julaba_pin_images), pas un réglage de plus. */}
          <button type="button" onClick={basculerImages}
            aria-label={pinEnImages ? 'Revenir aux chiffres' : 'Afficher des images à la place des chiffres'}
            style={{ display: 'block', margin: '18px auto 0', minHeight: 44, padding: '0 12px',
              background: 'transparent', border: 'none', fontWeight: 700, color: palette.primary }}>
            {pinEnImages ? '🔢 Revenir aux chiffres' : '🍅 Utiliser des images'}
          </button>

          {loading && <p className="text-center text-sm text-gray-500 mt-4">Enregistrement…</p>}
        </div>
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
