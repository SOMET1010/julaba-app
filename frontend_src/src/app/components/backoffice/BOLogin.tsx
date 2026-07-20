// BOLogin.tsx - Direction À Pro institutionnel
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, ArrowRight, Lock, AlertCircle, X, User } from 'lucide-react';
import { motion } from 'motion/react';
import { useApp } from '../../contexts/AppContext';
import { startAuthentication } from '@simplewebauthn/browser';
import {
  boLogin,
  formatBoLoginIdentifier,
  boGetContactsRecoveryBo,
  boWebAuthnAuthenticateOptions,
  boWebAuthnAuthenticateVerify,
  type BOUser,
} from '../../services/backoffice-api';
import { BO_ROLES } from '../../types/constants';
import logoJulabaSvg from '../../../assets/images/logo-julaba.svg?raw';
import { BO_DARK, BO_MEDIUM, BO_LIGHT, BO_TINT } from './bo-theme';

const LOGO_SVG_INNER_HTML = logoJulabaSvg.replace(/<\?xml[^?]*\?>\s*/i, '').trim();

const ICON_BRAND = '#9F8170';
const LOGO_FILL = '#4A3F38';

function BoFingerprintIcon({ color }: { color: string }) {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <path
        d="M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm-4 0a4 4 0 0 1 8 0M8 14h8M9 18h6M10 6h4"
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const RE_PHONE_CI = /^(\+225)?\s?(0?[1-9]\d{8})$/;
const RE_EMAIL =
  /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

function identifierFormatInvalid(value: string): boolean {
  const t = value.trim();
  if (!t) return false;
  if (RE_EMAIL.test(t)) return false;
  const compact = t.replace(/\s/g, '');
  if (RE_PHONE_CI.test(compact)) return false;
  return true;
}

const LAST_PHONE_KEY = 'julaba:bo:last-phone';

/**
 * BACKLOG ESCALATION P0 BACKEND (à traiter côté serveur, hors périmètre frontend) :
 * 1. /auth/login : rate limit serveur OBLIGATOIRE (clientside contournable)
 * 2. /auth/login : sanitization messages erreur (ne pas leak stack/path)
 * 3. RBAC strict serveur : validation rôle clientside L37 redondante
 * 4. Politique mot de passe BO côté serveur (>=6 chars insuffisant pour comptes admin)
 */

export function BOLogin() {
  const navigate = useNavigate();
  const { speak: appSpeak } = useApp();
  const speak = (text: string) => (typeof appSpeak === 'function' ? appSpeak(text) : Promise.resolve());
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);
  const [prefersDarkScheme, setPrefersDarkScheme] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [recoveryContacts, setRecoveryContacts] = useState<Array<{ id: string; firstName: string; lastName: string; phone: string }>>([]);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [canUseBiometric, setCanUseBiometric] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const navigateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const identifierInputRef = useRef<HTMLInputElement | null>(null);
  const passwordInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
      if (navigateTimeoutRef.current) clearTimeout(navigateTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    let restored = false;
    try {
      const last = localStorage.getItem(LAST_PHONE_KEY);
      if (last?.trim()) {
        setIdentifier(last.trim());
        restored = true;
        setRestoredFromStorage(true);
      }
    } catch {
      /* stockage indisponible */
    }
    const id = requestAnimationFrame(() => {
      if (restored) passwordInputRef.current?.focus();
      else identifierInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => setPrefersDarkScheme(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useEffect(() => {
    try {
      const pk = typeof PublicKeyCredential !== 'undefined';
      const get =
        typeof navigator !== 'undefined' &&
        navigator.credentials &&
        typeof navigator.credentials.get === 'function';
      const raw = localStorage.getItem(LAST_PHONE_KEY);
      const okStored = !!raw?.trim() && !raw.includes('@');
      setCanUseBiometric(Boolean(pk && get && okStored));
    } catch {
      setCanUseBiometric(false);
    }
  }, [restoredFromStorage]);

  const openForgotModal = () => {
    setShowForgotModal(true);
    setRecoveryLoading(true);
    void boGetContactsRecoveryBo()
      .then((data) => setRecoveryContacts(data.contacts ?? []))
      .catch(() => setRecoveryContacts([]))
      .finally(() => setRecoveryLoading(false));
  };

  const handleBiometricLogin = async () => {
    setError(null);
    if (bioLoading || loading) return;
    setBioLoading(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      let raw = '';
      try {
        raw = localStorage.getItem(LAST_PHONE_KEY)?.trim() ?? '';
      } catch {
        raw = '';
      }
      if (!raw) raw = identifier.trim();
      const normalized = formatBoLoginIdentifier(raw);
      if (!normalized.phone) {
        setError('Enregistre un numéro de téléphone (pas un e-mail) pour utiliser la biométrie.');
        return;
      }
      const opts = await boWebAuthnAuthenticateOptions(normalized.phone, abortRef.current.signal);
      const { userId, error: oe, ...optsJson } = opts as Record<string, unknown> & {
        userId?: string;
        error?: string;
      };
      if (!userId) throw new Error('Session biométrique invalide');
      if (typeof oe === 'string') throw new Error(oe);
      const assertion = await startAuthentication({ optionsJSON: optsJson });
      const ver = await boWebAuthnAuthenticateVerify(
        userId,
        assertion as unknown as Record<string, unknown>,
        abortRef.current.signal,
      );
      if (!ver.verified || !ver.user) {
        throw new Error(ver.error || 'Vérification biométrique échouée');
      }
      const bu = ver.user as BOUser;
      if (!BO_ROLES.includes(bu.role)) {
        throw new Error('ROLE_NOT_AUTHORIZED');
      }
      window.dispatchEvent(new Event('julaba:bo-login'));
      if (navigateTimeoutRef.current) clearTimeout(navigateTimeoutRef.current);
      navigateTimeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        setPassword('');
        if (bu.mustChangePassword) navigate('/change-password');
        else navigate('/backoffice/dashboard');
      }, 300);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : 'Connexion biométrique impossible.';
      setError(msg);
    } finally {
      if (mountedRef.current) setBioLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!identifier.trim() || !password.trim()) {
      setError('Identifiant et mot de passe requis.');
      return;
    }
    if (loading) return;
    setLoading(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const result = await boLogin(identifier.trim(), password, abortRef.current.signal);
      if (!mountedRef.current) return;
      const user = result.user;
      if (!BO_ROLES.includes(user.role)) {
        throw new Error('ROLE_NOT_AUTHORIZED');
      }
      try {
        localStorage.setItem(LAST_PHONE_KEY, identifier.trim());
      } catch {
        /* stockage indisponible */
      }
      window.dispatchEvent(new Event('julaba:bo-login'));
      // Délai 300ms volontaire : laisse propager l'event aux listeners contexte (BackOffice/AppContext).
      // Cleanup via navigateTimeoutRef en cas d'unmount.
      if (navigateTimeoutRef.current) clearTimeout(navigateTimeoutRef.current);
      navigateTimeoutRef.current = setTimeout(() => {
        if (!mountedRef.current) return;
        setPassword('');
        const u = user as BOUser;
        if (u.mustChangePassword) navigate('/change-password');
        else navigate('/backoffice/dashboard');
      }, 300);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (!mountedRef.current) return;
      console.warn('[BOLogin] login failed:', err instanceof Error ? err.message : err);
      let userMsg: string;
      const rawMsg = err instanceof Error ? err.message : '';
      const loginExtra = err as Error & { attemptsRemaining?: number; httpStatus?: number };
      const attemptsRemaining = loginExtra.attemptsRemaining;
      const httpStatus = loginExtra.httpStatus;
      if (typeof attemptsRemaining === 'number') {
        userMsg =
          attemptsRemaining <= 1
            ? `Connexion échouée. Vérifie tes identifiants. (${attemptsRemaining} tentative restante)`
            : `Connexion échouée. Vérifie tes identifiants. (${attemptsRemaining} tentatives restantes)`;
      } else if (rawMsg === 'ROLE_NOT_AUTHORIZED') {
        userMsg = 'Accès réservé aux administrateurs.';
      } else if (
        httpStatus === 401 ||
        rawMsg.includes('401') ||
        rawMsg.toLowerCase().includes('unauthorized')
      ) {
        userMsg = 'Identifiant ou mot de passe incorrect.';
      } else if (rawMsg.includes('429') || rawMsg.toLowerCase().includes('too many')) {
        userMsg = 'Trop de tentatives. Réessaie dans quelques minutes.';
      } else if (rawMsg.includes('500') || rawMsg.includes('502') || rawMsg.includes('503')) {
        userMsg = 'Erreur serveur. Réessaie dans un instant.';
      } else if (rawMsg.toLowerCase().includes('network') || rawMsg.toLowerCase().includes('failed to fetch')) {
        userMsg = 'Connexion impossible. Vérifie ta connexion réseau.';
      } else {
        userMsg = 'Connexion échouée. Vérifie tes identifiants.';
      }
      setError(userMsg);
      if (
        httpStatus === 401 ||
        typeof attemptsRemaining === 'number' ||
        rawMsg.includes('401') ||
        rawMsg.toLowerCase().includes('unauthorized')
      ) {
        setPassword('');
      }
      await speak('Connexion refusée. Vérifie tes identifiants.');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  const showFormatHint = identifierFormatInvalid(identifier);

  const clearStoredIdentifier = () => {
    setIdentifier('');
    setRestoredFromStorage(false);
    try {
      localStorage.removeItem(LAST_PHONE_KEY);
    } catch {
      /* stockage indisponible */
    }
    identifierInputRef.current?.focus();
  };

  return (
    <div
      className={`bo-login-page-dark-aware${prefersDarkScheme ? ' dark' : ''}`}
      style={styles.page}
    >
      <div style={styles.bgDecor1}></div>
      <div style={styles.bgDecor2}></div>

      <motion.div
        className="bo-login-card"
        style={styles.card}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <div
            style={{ color: LOGO_FILL, width: 200, lineHeight: 0 }}
            role="img"
            aria-label="JULABA"
            dangerouslySetInnerHTML={{ __html: LOGO_SVG_INNER_HTML }}
          />
        </div>

        <div style={styles.intro}>
          <h1 id="bo-login-title" style={styles.title}>Bienvenue dans le Back-Office</h1>
          <p style={styles.subtitle}>Accès réservé aux comptes Back-Office</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form} aria-labelledby="bo-login-title">
          <div style={styles.field}>
            <label htmlFor="bo-login-identifier" style={styles.label}>Téléphone ou e-mail</label>
            <div style={styles.identifierWrap}>
              <span
                className="bo-login-icon-user"
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  zIndex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  color: ICON_BRAND,
                }}
              >
                <User size={17} strokeWidth={2.2} />
              </span>
              <input
                ref={identifierInputRef}
                id="bo-login-identifier"
                type="text"
                inputMode={identifier.includes('@') ? 'email' : 'tel'}
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="Saisis ton téléphone ou e-mail"
                style={{
                  ...styles.input,
                  paddingLeft: 42,
                  paddingRight: restoredFromStorage ? 44 : 14,
                }}
                disabled={loading}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
              />
              {restoredFromStorage && (
                <button
                  type="button"
                  onClick={clearStoredIdentifier}
                  style={styles.clearStoredBtn}
                  aria-label="Effacer l'identifiant mémorisé"
                >
                  <X size={16} color={BO_MEDIUM} />
                </button>
              )}
            </div>
            {showFormatHint && (
              <div style={styles.formatWarning}>Format de téléphone ou e-mail invalide</div>
            )}
            <div style={styles.fieldHint}>
              Saisis ton numéro de téléphone ou ton adresse e-mail
            </div>
          </div>

          <div style={styles.field}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 8,
              }}
            >
              <label htmlFor="bo-login-password" style={{ ...styles.label, marginBottom: 0 }}>
                Mot de passe
              </label>
              <button
                type="button"
                onClick={openForgotModal}
                style={styles.forgotLinkInline}
              >
                Mot de passe oublié ?
              </button>
            </div>
            <div style={styles.passwordRow}>
              <span
                className="bo-login-icon-lock"
                style={{
                  position: 'absolute',
                  left: 14,
                  top: '50%',
                  zIndex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  color: ICON_BRAND,
                }}
              >
                <Lock size={17} strokeWidth={2.2} />
              </span>
              <input
                ref={passwordInputRef}
                id="bo-login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Entre ton mot de passe"
                style={{ ...styles.input, paddingLeft: 42, paddingRight: 44 }}
                disabled={loading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={styles.eyeBtn}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={16} color={BO_MEDIUM} /> : <Eye size={16} color={BO_MEDIUM} />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              style={styles.errorBox}
              role="alert"
              aria-live="assertive"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <AlertCircle size={14} color="#DC2626" />
              <span>{error}</span>
            </motion.div>
          )}

          <motion.button
            type="submit"
            style={{ ...styles.submitBtn, opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer' }}
            disabled={loading}
            aria-busy={loading}
            whileTap={loading ? {} : { scale: 0.98 }}
            whileHover={loading ? {} : { scale: 1.01 }}
          >
            {loading ? (
              <span style={styles.spinner} role="status" aria-label="Connexion en cours" />
            ) : (
              <>
                Se connecter
                <ArrowRight size={14} strokeWidth={2.5} />
              </>
            )}
          </motion.button>

          {canUseBiometric && (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
                <span
                  style={{
                    fontSize: 11,
                    color: '#9CA3AF',
                    fontWeight: 700,
                    letterSpacing: 1,
                  }}
                >
                  ── ou ──
                </span>
                <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
              </div>
              <motion.button
                type="button"
                onClick={() => void handleBiometricLogin()}
                style={{
                  width: '100%',
                  padding: 13,
                  background: 'linear-gradient(135deg, rgba(159,129,112,0.08), rgba(159,129,112,0.04))',
                  color: LOGO_FILL,
                  border: '2px solid rgba(159,129,112,0.2)',
                  borderRadius: 14,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: bioLoading || loading ? 'wait' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                  opacity: bioLoading || loading ? 0.7 : 1,
                }}
                disabled={loading || bioLoading}
                whileTap={bioLoading || loading ? {} : { scale: 0.98 }}
                whileHover={bioLoading || loading ? {} : { scale: 1.01 }}
              >
                {bioLoading ? (
                  <span style={styles.spinnerBiometric} role="status" aria-label="Biométrie en cours" />
                ) : (
                  <>
                    <BoFingerprintIcon color={ICON_BRAND} />
                    Connexion biométrique
                  </>
                )}
              </motion.button>
            </>
          )}
        </form>

        <div style={styles.secureRow}>
          <Lock size={11} color={BO_MEDIUM} />
          <span style={styles.secureRowText}>Connexion sécurisée · cookies HttpOnly</span>
        </div>

        <div
          style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: '1px solid #f3f4f6',
            textAlign: 'center',
            fontSize: 11,
            fontWeight: 600,
            color: '#9CA3AF',
            letterSpacing: '0.3px',
            whiteSpace: 'nowrap',
          }}
        >
          Julaba BackOffice v1.0 By ICONE SOLUTION
        </div>
      </motion.div>

      {showForgotModal && (
        <div style={styles.modalOverlay} role="dialog" aria-modal="true" aria-labelledby="bo-forgot-title">
          <div style={styles.modalCard}>
            <h2 id="bo-forgot-title" style={styles.modalTitle}>
              Mot de passe oublié
            </h2>
            <p style={styles.modalText}>
              Pour réinitialiser votre mot de passe, contactez l&apos;un de vos super administrateurs :
            </p>
            {recoveryLoading ? (
              <p style={styles.modalText}>Chargement...</p>
            ) : recoveryContacts.length === 0 ? (
              <p style={styles.modalText}>Aucun contact disponible pour le moment.</p>
            ) : (
              <ul style={styles.modalList}>
                {recoveryContacts.map((c) => (
                  <li key={c.id} style={styles.modalLi}>
                    <span style={{ fontWeight: 600 }}>
                      {c.firstName} {c.lastName}
                    </span>
                    {' · '}
                    <a href={`tel:${c.phone.replace(/\s/g, '')}`} style={{ color: ICON_BRAND }}>
                      {c.phone}
                    </a>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" onClick={() => setShowForgotModal(false)} style={styles.modalClose}>
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: BO_DARK,
    padding: '1rem',
    position: 'relative',
    overflow: 'hidden',
  },
  bgDecor1: {
    position: 'absolute',
    top: '10%',
    left: '15%',
    width: 400,
    height: 400,
    background: BO_LIGHT,
    borderRadius: '50%',
    opacity: 0.04,
    filter: 'blur(80px)',
    pointerEvents: 'none',
  },
  bgDecor2: {
    position: 'absolute',
    bottom: '15%',
    right: '20%',
    width: 350,
    height: 350,
    background: BO_MEDIUM,
    borderRadius: '50%',
    opacity: 0.05,
    filter: 'blur(80px)',
    pointerEvents: 'none',
  },
  card: {
    background: '#fff',
    borderRadius: 20,
    padding: '36px 30px 24px',
    width: '100%',
    maxWidth: 400,
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)',
    position: 'relative',
    zIndex: 1,
    boxSizing: 'border-box',
  },
  intro: {
    marginBottom: 22,
  },
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: '#1a1a1a',
    margin: '0 0 6px',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: BO_MEDIUM,
    margin: 0,
    lineHeight: 1.5,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: BO_DARK,
  },
  fieldHint: {
    fontSize: 11,
    color: BO_MEDIUM,
    marginTop: 4,
    fontWeight: 500,
  },
  input: {
    padding: '12px 14px',
    borderRadius: 10,
    border: `1.5px solid ${BO_LIGHT}`,
    fontSize: 14,
    background: '#FAFAF7',
    color: '#1a1a1a',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    fontFamily: 'inherit',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  },
  passwordRow: {
    position: 'relative',
    width: '100%',
  },
  identifierWrap: {
    position: 'relative',
    width: '100%',
  },
  clearStoredBtn: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  formatWarning: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: 500,
    marginTop: 2,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    background: '#FEF2F2',
    border: '1px solid #FCA5A5',
    borderRadius: 9,
    padding: '10px 12px',
    fontSize: 12.5,
    color: '#B91C1C',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontWeight: 500,
  },
  submitBtn: {
    width: '100%',
    padding: 13,
    background: BO_DARK,
    color: '#fff',
    border: 'none',
    borderRadius: 11,
    fontSize: 14,
    fontWeight: 700,
    cursor: 'pointer',
    marginTop: 4,
    boxShadow: `0 4px 14px ${BO_DARK}59`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    fontFamily: 'inherit',
    minHeight: 46,
  },
  spinner: {
    width: 18,
    height: 18,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid #fff',
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.6s linear infinite',
  },
  spinnerBiometric: {
    width: 18,
    height: 18,
    border: '2px solid rgba(74,63,56,0.2)',
    borderTop: `2px solid ${LOGO_FILL}`,
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'spin 0.6s linear infinite',
  },
  secureRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '10px 12px',
    background: BO_TINT,
    borderRadius: 9,
    marginTop: 16,
    justifyContent: 'center',
  },
  secureRowText: {
    fontSize: 11,
    color: BO_MEDIUM,
    fontWeight: 500,
  },
  forgotLinkInline: {
    fontSize: 12,
    color: ICON_BRAND,
    fontWeight: 700,
    textDecoration: 'none',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    padding: 0,
    fontFamily: 'inherit',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    background: '#fff',
    borderRadius: 16,
    padding: '22px 20px',
    maxWidth: 420,
    width: '100%',
    boxShadow: '0 20px 50px rgba(0,0,0,0.25)',
  },
  modalTitle: {
    margin: '0 0 10px',
    fontSize: 18,
    fontWeight: 700,
    color: '#1a1a1a',
  },
  modalText: {
    margin: '0 0 12px',
    fontSize: 13,
    color: BO_MEDIUM,
    lineHeight: 1.5,
  },
  modalList: {
    margin: '0 0 14px',
    paddingLeft: 18,
    fontSize: 13,
    color: '#1a1a1a',
  },
  modalLi: {
    marginBottom: 8,
  },
  modalClose: {
    width: '100%',
    padding: 10,
    borderRadius: 10,
    border: 'none',
    background: BO_DARK,
    color: '#fff',
    fontWeight: 700,
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};