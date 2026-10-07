import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Check, Loader2 } from 'lucide-react';
import { useWallet } from '../../contexts/WalletContext';
import { useApp } from '../../contexts/AppContext';
import { toast } from 'sonner';
import {
  rechercherDestinataire,
  transfererVersCompte,
  type DestinataireTransfert,
} from '../../services/api/wallets-api';
import { HttpError } from '../../services/api/api-client';
import { RelectureArgent } from '../argent/RelectureArgent';
import { METHODS, type Method } from './methodsTransfert';
import { vibrerErreur, vibrerSucces } from '../../utils/haptique';
import { genererCleIdempotence } from '../../utils/idempotence';

const C = '#B74725';
const BG = '#F6F0E4';

type Step = 1 | 2 | 3;

// Trois situations, trois phrases (règle caisse POSCaisse 1331-1347, T3 de
// l'audit 06/10) : un numéro inconnu n'est pas une panne, une panne n'est pas
// un numéro inconnu, et hors ligne on n'accuse personne. 404 = le serveur a
// RÉPONDU que le compte n'existe pas ; tout le reste est réseau/hors ligne.
function causeRechercheDe(e: unknown, enLigne: boolean): '404' | 'reseau' | 'horsligne' {
  if (!enLigne) return 'horsligne';
  const status = (e as { status?: unknown } | null)?.status;
  if (typeof status === 'number' && status === 404) return '404';
  return 'reseau';
}

export function TransfertPage() {
  const navigate = useNavigate();
  const { getAvailableBalance, refreshKeiwa } = useWallet();
  const { speak } = useApp();
  const [step, setStep] = useState<Step>(1);
  const [phone, setPhone] = useState('');
  const [destinataire, setDestinataire] = useState<DestinataireTransfert | null>(null);
  const [recherche, setRecherche] = useState<'idle' | 'loading' | 'error'>('idle');
  // Pourquoi la recherche a échoué — l'écran ne dit plus « compte introuvable »
  // à une panne (M-P1-1 : hors ligne, on accusait un numéro valide d'être absent).
  const [causeRecherche, setCauseRecherche] = useState<'404' | 'reseau' | 'horsligne'>('404');
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  // M-P0-3 (AUDIT-UX-ROLES-2026-10-06) : le transfert est IRRÉVERSIBLE — il
  // passe désormais par une relecture « Tu envoies X à Y — tu confirms ? »
  // avant l'appel, et un verrou SYNCHRONE anti double-tap (le pattern caisse :
  // l'état React ne se met à jour qu'au render suivant, un ref bloque le 2e
  // tap dès la même frame). La clé d'idempotence rattrape déjà le doublon
  // côté backend ; ici on empêche le geste lui-même.
  const envoiEnCoursRef = useRef(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [soldeApres, setSoldeApres] = useState<number | null>(null);

  // Clé d'idempotence — une par TENTATIVE (contrat dans utils/idempotence).
  const idempotencyKeyRef = useRef<string>(genererCleIdempotence());

  const stepLabels: Record<Step, string> = {
    1: 'À qui envoyer ?',
    2: 'Comment envoyer ?',
    3: 'Combien envoyer ?',
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    setDestinataire(null);
    setRecherche('idle');
  };

  // Recherche du destinataire par téléphone, débouncée : dès que le numéro
  // ressemble à un numéro complet, on interroge le vrai backend
  // (POST /wallets/me/rechercher-destinataire) — plus de contacts fictifs.
  useEffect(() => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 8) {
      setRecherche('idle');
      return;
    }
    let annule = false;
    setRecherche('loading');
    const timer = setTimeout(async () => {
      // Hors ligne, on ne part pas en erreur de réseau : la cause est dite.
      if (!navigator.onLine) {
        if (!annule) {
          setDestinataire(null);
          setCauseRecherche('horsligne');
          setRecherche('error');
        }
        return;
      }
      try {
        const trouve = await rechercherDestinataire(phone);
        if (!annule) {
          setDestinataire(trouve);
          setRecherche('idle');
        }
      } catch (e: unknown) {
        if (!annule) {
          setDestinataire(null);
          setCauseRecherche(causeRechercheDe(e, navigator.onLine));
          setRecherche('error');
        }
      }
    }, 450);
    return () => { annule = true; clearTimeout(timer); };
  }, [phone]);

  // Réessayer : la même recherche, hors du debounce — le bouton porte le
  // numéro courant de son render (pas de closure périmée).
  const relancerRecherche = async () => {
    setDestinataire(null);
    setRecherche('loading');
    try {
      const trouve = await rechercherDestinataire(phone);
      setDestinataire(trouve);
      setRecherche('idle');
    } catch (e: unknown) {
      setDestinataire(null);
      setCauseRecherche(causeRechercheDe(e, navigator.onLine));
      setRecherche('error');
    }
  };

  const handleNumpad = (key: string) => {
    if (key === '⌫') {
      setAmount(a => a.slice(0, -1));
    } else if (key === '000') {
      setAmount(a => a.length > 0 ? a + '000' : a);
    } else {
      if (amount.length < 8) setAmount(a => a + key);
    }
  };

  const amountNum = parseInt(amount || '0', 10);
  const soldeDisponible = getAvailableBalance();

  const goBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
    else navigate(-1);
  };

  const initialesDe = (d: DestinataireTransfert) =>
    `${d.prenom?.[0] || ''}${d.nom?.[0] || ''}`.toUpperCase() || '??';
  const nomCompletDe = (d: DestinataireTransfert) => `${d.prenom} ${d.nom}`.trim();

  const handleEnvoyer = async () => {
    if (!destinataire || envoiEnCoursRef.current) return;
    if (amountNum < 100) return;
    if (amountNum > soldeDisponible) {
      toast.error('Solde insuffisant pour ce transfert');
      setShowConfirm(false);
      return;
    }
    envoiEnCoursRef.current = true;
    setEnvoiEnCours(true);
    try {
      const resultat = await transfererVersCompte({
        destinataireUserId: destinataire.id,
        montant: amountNum,
        note: note || undefined,
        idempotencyKey: idempotencyKeyRef.current,
      });
      setSoldeApres(resultat.solde);
      setShowConfirm(false);
      // Triple canal (inclusion) : l'envoi réussi se SENT, en plus de se
      // voir (écran « Envoi réussi ») et se lire (solde).
      vibrerSucces();
      setDone(true);
      // Rafraîchit le solde affiché ailleurs dans l'app (accueil, etc.).
      refreshKeiwa().catch(() => {});
    } catch (e: any) {
      // T7 (F-V2/N-4 audit voix) : l'issue de l'irréversible se DIT et
      // s'ÉCRIT — la raison métier 4xx du serveur (déjà écrite pour
      // l'utilisateur, doctrine caisse), un générique honnête sinon (on ne
      // dicte pas « Failed to fetch »).
      const status = (e as { status?: unknown } | null)?.status;
      const message = typeof status === 'number' && status >= 400 && status < 500 && e instanceof HttpError && e.message?.trim()
        ? e.message
        : "Le transfert n'a pas passé. Vérifie ton réseau et réessaie.";
      toast.error(message);
      speak(message);
      vibrerErreur();
      setShowConfirm(false);
    } finally {
      envoiEnCoursRef.current = false;
      setEnvoiEnCours(false);
    }
  };

  const resetTout = () => {
    idempotencyKeyRef.current = genererCleIdempotence();
    setStep(1);
    setPhone('');
    setDestinataire(null);
    setRecherche('idle');
    setSelectedMethod(null);
    setAmount('');
    setNote('');
    setSoldeApres(null);
    setDone(false);
    setShowConfirm(false);
  };

  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-5" style={{ backgroundColor: BG, padding: '0 20px' }}>
        <motion.div
          initial={{ scale: 0 }} animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 12 }}
          style={{ width: 80, height: 80, borderRadius: '50%', background: `linear-gradient(135deg, ${C}, #D4824A)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(198,106,44,0.35)' }}
        >
          <Check size={40} color="white" />
        </motion.div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 22, fontWeight: 800, color: '#2a1a0a' }}>Envoi réussi !</p>
          <p style={{ fontSize: 15, color: '#b8956a', marginTop: 6 }}>{amountNum.toLocaleString('fr-FR')} FCFA envoyés</p>
          <p style={{ fontSize: 13, color: '#b8956a', marginTop: 4 }}>à {destinataire ? nomCompletDe(destinataire) : ''}</p>
          {soldeApres !== null && (
            <p style={{ fontSize: 13, color: '#2a1a0a', fontWeight: 700, marginTop: 12, background: 'white', borderRadius: 12, padding: '8px 16px', display: 'inline-block' }}>
              Nouveau solde : {soldeApres.toLocaleString('fr-FR')} FCFA
            </p>
          )}
        </div>
        <motion.button
          onClick={resetTout}
          style={{ padding: '14px 32px', borderRadius: 18, background: `linear-gradient(135deg, ${C}, #D4824A)`, color: 'white', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer', boxShadow: '0 4px 16px rgba(198,106,44,0.3)' }}
          whileTap={{ scale: 0.97 }}
        >
          Nouveau transfert
        </motion.button>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG }}>

      {/* HEADER */}
      <div style={{ background: C, padding: '22px 20px 28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to bottom, rgba(255,255,255,0.1), transparent)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1, marginBottom: 16 }}>
          <motion.button
            onClick={goBack}
            style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            whileTap={{ scale: 0.9 }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </motion.button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>Transfert</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{stepLabels[step]}</p>
          </div>
          <div style={{ width: 38 }} />
        </div>

        {/* Indicateur étapes */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, position: 'relative', zIndex: 1 }}>
          {([1, 2, 3] as Step[]).map(s => (
            <motion.div
              key={s}
              animate={{ width: s === step ? 40 : 28, background: s === step ? 'white' : s < step ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.3)' }}
              style={{ height: 4, borderRadius: 2 }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: 8, position: 'relative', zIndex: 1 }}>
          Étape {step} sur 3
        </p>
      </div>

      <AnimatePresence mode="wait">

        {/* ── ÉTAPE 1 ── */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} style={{ padding: '20px 16px' }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: C, marginBottom: 12 }}>Destinataire</p>

            {/* Champ saisie */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={e => handlePhoneChange(e.target.value)}
                placeholder="Numéro de téléphone Julaba"
                style={{ width: '100%', padding: '16px 20px 16px 50px', borderRadius: 18, border: `2px solid ${destinataire ? '#10b981' : recherche === 'error' ? '#ef4444' : phone.length >= 8 ? C : 'rgba(198,106,44,0.2)'}`, background: 'white', fontSize: 15, color: '#2a1a0a', outline: 'none', fontFamily: 'system-ui, sans-serif', transition: 'border-color 0.2s' }}
              />
              {phone.length > 0 && (
                <motion.button
                  onClick={() => handlePhoneChange('')}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 26, height: 26, borderRadius: '50%', background: 'rgba(198,106,44,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  whileTap={{ scale: 0.9 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </motion.button>
              )}
            </div>

            {/* État de la recherche */}
            {recherche === 'loading' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, color: '#b8956a', fontSize: 13 }}>
                <Loader2 size={16} className="animate-spin" />
                Recherche du compte Julaba…
              </div>
            )}
            {recherche === 'error' && (
              <div style={{ marginBottom: 16 }}>
                {causeRecherche === '404' && (
                  <p style={{ color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
                    Aucun compte Julaba trouvé pour ce numéro.
                  </p>
                )}
                {causeRecherche === 'horsligne' && (
                  <p style={{ color: '#b8956a', fontSize: 13, fontWeight: 600 }}>
                    Tu es hors ligne — impossible de vérifier ce numéro. Reconnecte-toi, puis réessaie.
                  </p>
                )}
                {causeRecherche === 'reseau' && (
                  <p style={{ color: '#ef4444', fontSize: 13, fontWeight: 600 }}>
                    Impossible de vérifier ce numéro — problème de réseau.
                  </p>
                )}
                {causeRecherche !== '404' && (
                  <button
                    type="button"
                    onClick={relancerRecherche}
                    style={{ marginTop: 8, background: 'none', border: 'none', padding: 0, color: C, fontSize: 13, fontWeight: 700, minHeight: 44, cursor: 'pointer' }}
                  >
                    Réessayer
                  </button>
                )}
              </div>
            )}
            {destinataire && (
              <motion.div
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                style={{ background: 'white', borderRadius: 16, padding: '14px 16px', border: `1.5px solid #10b981`, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}
              >
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: C, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                  {initialesDe(destinataire)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#2a1a0a' }}>{nomCompletDe(destinataire)}</p>
                  <p style={{ fontSize: 12, color: '#b8956a', marginTop: 1 }}>{destinataire.telephone}</p>
                </div>
                <Check size={20} color="#10b981" />
              </motion.div>
            )}

            <p style={{ fontSize: 12, color: '#b8956a', marginBottom: 20 }}>
              Entrez le numéro de téléphone du destinataire — son compte Julaba est vérifié automatiquement.
            </p>

            <motion.button
              onClick={() => destinataire && setStep(2)}
              disabled={!destinataire}
              style={{ width: '100%', padding: 16, border: 'none', borderRadius: 18, background: destinataire ? `linear-gradient(135deg, ${C}, #D4824A)` : 'rgba(198,106,44,0.2)', color: 'white', fontSize: 16, fontWeight: 700, cursor: destinataire ? 'pointer' : 'not-allowed', position: 'relative', overflow: 'hidden', boxShadow: destinataire ? '0 4px 16px rgba(198,106,44,0.35)' : 'none' }}
              whileTap={destinataire ? { scale: 0.98 } : {}}
            >
              {destinataire && <motion.div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)' }} animate={{ x: ['-100%', '200%'] }} transition={{ duration: 2.5, repeat: Infinity }} />}
              Continuer
            </motion.button>
          </motion.div>
        )}

        {/* ── ÉTAPE 2 ── */}
        {step === 2 && destinataire && (
          <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} style={{ padding: '20px 16px' }}>

            {/* Récap destinataire */}
            <div style={{ background: 'white', borderRadius: 16, padding: '14px 16px', border: '1px solid rgba(198,106,44,0.12)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: C, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                {initialesDe(destinataire)}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#2a1a0a' }}>{nomCompletDe(destinataire)}</p>
                <p style={{ fontSize: 12, color: '#b8956a', marginTop: 1 }}>{destinataire.telephone}</p>
              </div>
              <motion.button onClick={() => setStep(1)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(198,106,44,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} whileTap={{ scale: 0.9 }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </motion.button>
            </div>

            {/* Via Julaba */}
            <p style={{ fontSize: 11, fontWeight: 700, color: '#b8956a', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Via Julaba</p>
            {METHODS.filter(m => m.featured).map(m => (
              <motion.div key={m.id} onClick={() => { setSelectedMethod(m); setStep(3); }} style={{ background: 'rgba(198,106,44,0.04)', borderRadius: 16, padding: '14px 16px', border: `1.5px solid ${C}`, display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 8, position: 'relative', overflow: 'hidden' }} whileTap={{ scale: 0.98 }}>
                <motion.div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.4) 50%, transparent 65%)' }} animate={{ x: ['-100%', '200%'] }} transition={{ duration: 3, repeat: Infinity }} />
                <div style={{ width: 42, height: 42, borderRadius: 13, background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: m.textColor || 'white', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.15)', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
                  {m.logo}
                </div>
                <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#2a1a0a' }}>{m.name}</p>
                  <p style={{ fontSize: 11, color: '#b8956a', marginTop: 1 }}>{m.sub}</p>
                </div>
                <ChevronRight size={16} color={C} style={{ position: 'relative', zIndex: 1 }} />
              </motion.div>
            ))}

            {/* Via Mobile Money (hors périmètre — pas de partenaire externe branché) */}
            <p style={{ fontSize: 11, fontWeight: 700, color: '#b8956a', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, marginTop: 16 }}>Via Mobile Money</p>
            {METHODS.filter(m => ['wave', 'orange', 'mtn', 'moov'].includes(m.id)).map(m => (
              <motion.div
                key={m.id}
                onClick={() => toast.error(`${m.name} : bientôt disponible`)}
                style={{ background: 'white', borderRadius: 16, padding: '13px 16px', border: '1px solid rgba(198,106,44,0.1)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 8, opacity: 0.55 }}
                whileTap={{ scale: 0.98 }}
              >
                <div style={{ width: 42, height: 42, borderRadius: 13, background: m.imgLogo ? 'white' : m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: m.textColor || 'white', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
                  {m.imgLogo
                    ? <img src={m.imgLogo} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}/>
                    : m.logo}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#2a1a0a' }}>{m.name}</p>
                  <p style={{ fontSize: 11, color: '#b8956a', marginTop: 1 }}>{m.sub}</p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#92400e', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 999, padding: '3px 8px' }}>
                  {m.badge}
                </span>
              </motion.div>
            ))}

            {/* Via Banque (hors périmètre) */}
            <p style={{ fontSize: 11, fontWeight: 700, color: '#b8956a', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, marginTop: 16 }}>Via Banque</p>
            {METHODS.filter(m => m.id === 'banque').map(m => (
              <motion.div
                key={m.id}
                onClick={() => toast.error(`${m.name} : bientôt disponible`)}
                style={{ background: 'white', borderRadius: 16, padding: '13px 16px', border: '1px solid rgba(198,106,44,0.1)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', opacity: 0.55 }}
                whileTap={{ scale: 0.98 }}
              >
                <div style={{ width: 42, height: 42, borderRadius: 13, background: m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'white', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
                  {m.logo}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#2a1a0a' }}>{m.name}</p>
                  <p style={{ fontSize: 11, color: '#b8956a', marginTop: 1 }}>{m.sub}</p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#92400e', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 999, padding: '3px 8px' }}>
                  {m.badge}
                </span>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ── ÉTAPE 3 ── */}
        {step === 3 && destinataire && selectedMethod && (
          <motion.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} style={{ padding: '20px 16px' }}>

            {/* Récap mini */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, padding: '12px 14px', background: 'white', borderRadius: 14, border: '1px solid rgba(198,106,44,0.1)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: C, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 }}>{initialesDe(destinataire)}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#2a1a0a' }}>{nomCompletDe(destinataire)}</p>
                <p style={{ fontSize: 11, color: '#b8956a', marginTop: 1 }}>via {selectedMethod.name}</p>
              </div>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: selectedMethod.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: selectedMethod.textColor || 'white', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}>
                {selectedMethod.logo}
              </div>
            </div>

            <p style={{ fontSize: 11, color: '#b8956a', textAlign: 'center', marginBottom: 10 }}>
              Solde disponible : {soldeDisponible.toLocaleString('fr-FR')} FCFA
            </p>

            {/* Montant */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <p style={{ fontSize: 13, color: '#b8956a', marginBottom: 10 }}>Montant à envoyer</p>
              <p style={{ fontSize: 42, fontWeight: 800, color: amountNum > 0 ? '#2a1a0a' : 'rgba(198,106,44,0.25)', lineHeight: 1 }}>
                {amountNum > 0 ? amountNum.toLocaleString('fr-FR') : '0'}
              </p>
              <p style={{ fontSize: 16, color: '#b8956a', fontWeight: 600, marginTop: 4 }}>FCFA</p>
            </div>

            {/* Clavier numérique */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
              {['1','2','3','4','5','6','7','8','9','000','0','⌫'].map(k => (
                <motion.button
                  key={k}
                  onClick={() => handleNumpad(k)}
                  style={{ height: 56, borderRadius: 16, border: '1px solid rgba(198,106,44,0.1)', background: 'white', fontSize: k === '⌫' ? 16 : 22, fontWeight: 500, color: '#2a1a0a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  whileTap={{ scale: 0.95, backgroundColor: 'rgba(198,106,44,0.08)' }}
                >
                  {k}
                </motion.button>
              ))}
            </div>

            {/* Note optionnelle */}
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value.slice(0, 200))}
              placeholder="Ajouter une note (facultatif)"
              style={{ width: '100%', padding: '12px 16px', borderRadius: 14, border: '1px solid rgba(198,106,44,0.15)', background: 'white', fontSize: 13, color: '#2a1a0a', outline: 'none', marginBottom: 16, fontFamily: 'system-ui, sans-serif' }}
            />

            {/* Récap final */}
            {amountNum >= 100 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'white', borderRadius: 16, padding: 16, border: '1px solid rgba(198,106,44,0.1)', marginBottom: 16 }}>
                {[
                  { label: 'Destinataire', value: nomCompletDe(destinataire) },
                  { label: 'Via', value: selectedMethod.name },
                  { label: 'Frais', value: 'Gratuit' },
                  { label: 'Total', value: `${amountNum.toLocaleString('fr-FR')} FCFA` },
                ].map(({ label, value }, i, arr) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < arr.length - 1 ? '0.5px solid rgba(198,106,44,0.1)' : 'none' }}>
                    <span style={{ fontSize: 13, color: '#b8956a' }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: label === 'Total' ? C : label === 'Frais' ? '#10b981' : '#2a1a0a' }}>{value}</span>
                  </div>
                ))}
              </motion.div>
            )}

            <motion.button
              onClick={() => setShowConfirm(true)}
              disabled={amountNum < 100 || amountNum > soldeDisponible || envoiEnCours}
              style={{
                width: '100%', padding: 16, border: 'none', borderRadius: 18,
                background: (amountNum >= 100 && amountNum <= soldeDisponible && !envoiEnCours) ? `linear-gradient(135deg, ${C}, #D4824A)` : 'rgba(198,106,44,0.2)',
                color: 'white', fontSize: 16, fontWeight: 700,
                cursor: (amountNum >= 100 && amountNum <= soldeDisponible && !envoiEnCours) ? 'pointer' : 'not-allowed',
                position: 'relative', overflow: 'hidden',
                boxShadow: (amountNum >= 100 && amountNum <= soldeDisponible) ? '0 4px 16px rgba(198,106,44,0.35)' : 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
              whileTap={!envoiEnCours ? { scale: 0.98 } : {}}
            >
              {envoiEnCours && <Loader2 size={18} className="animate-spin" />}
              {amountNum > soldeDisponible && amountNum >= 100 ? 'Solde insuffisant' : envoiEnCours ? 'Envoi en cours…' : 'Envoyer maintenant'}
            </motion.button>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Relecture avant l'irréversible (M-P0-3) — la primitive maison T8
          (R1-3 : extraite, plus de copie inline) : dite ET affichée depuis la
          même source (R1-4), Radix focus-trap/ESC (R1-5 / AUTH-05), vibration
          d'attente pendant l'envoi. Le verrou synchrone reste ICI
          (envoiEnCoursRef), la primitive n'appelle jamais à notre place. */}
      <RelectureArgent
        ouvert={showConfirm && destinataire !== null && selectedMethod !== null}
        enCours={envoiEnCours}
        onFermer={() => setShowConfirm(false)}
        onConfirmer={handleEnvoyer}
        titre="Tu envoies"
        montant={amountNum}
        sousLigne={destinataire && selectedMethod
          ? `à ${nomCompletDe(destinataire)} via ${selectedMethod.name}${note ? `, note : « ${note} »` : ''}`
          : undefined}
        avertissement="Un transfert est définitif : vérifie bien le nom avant de confirmer."
        libelleConfirmer="Confirmer l'envoi"
        libelleEnCours="Envoi…"
        accent={C}
        accentConfirmer={`linear-gradient(135deg, ${C}, #D4824A)`}
      />
    </div>
  );
}