import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Check, ChevronRight, ArrowLeft } from 'lucide-react';
import { verifierStatutBpayPublic } from '../../../imports/wallets-api';
import { IMG_LOGO_WAVE, IMG_LOGO_ORANGE_MONEY, IMG_LOGO_MTN, IMG_LOGO_MOOV } from '../../assets/images';
import { API_URL } from '../../utils/api';

const C = '#C66A2C';
const BG = '#FFF2E9';

function formatPhone(v: string): string {
  return v.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

interface Marchand {
  id: string;
  nom: string;
  phone: string;
  activity?: string;
  market?: string;
  commune?: string;
  photoUrl?: string;
}

const PROVIDERS = [
  { id: 'WAVE',   name: 'Wave',             logo: IMG_LOGO_WAVE },
  { id: 'ORANGE', name: 'Orange Money',     logo: IMG_LOGO_ORANGE_MONEY },
  { id: 'MTN',    name: 'MTN Mobile Money', logo: IMG_LOGO_MTN },
  { id: 'MOOV',   name: 'Moov Money',       logo: IMG_LOGO_MOOV },
];

export default function PayPage() {
  const { marchandId } = useParams<{ marchandId: string }>();
  const [marchand, setMarchand]     = useState<Marchand | null>(null);
  const [loading, setLoading]       = useState(true);
  const [etape, setEtape]           = useState<1 | 2 | 3>(1);
  const [provider, setProvider]     = useState<string | null>(null);
  const [montant, setMontant]       = useState('');
  const [telephone, setTelephone]   = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [polling, setPolling]       = useState(false);
  const [payToken, setPayToken]     = useState('');
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState(false);

  const telephoneDigits = telephone.replace(/\D/g, '');
  const isTelephoneValid = telephoneDigits.length === 10;

  useEffect(() => {
    if (!marchandId) { setLoading(false); return; }
    fetch(`${API_URL}/wallets/public/${marchandId}`)
      .then(r => r.json())
      .then(data => { setMarchand(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [marchandId]);

  useEffect(() => {
    if (!polling || !payToken) return;
    const interval = setInterval(async () => {
      try {
        const { statut } = await verifierStatutBpayPublic(payToken);
        if (statut === 'SUCCESS') { clearInterval(interval); setPolling(false); setSuccess(true); }
        else if (statut === 'FAILED') { clearInterval(interval); setPolling(false); setError('Paiement échoué. Réessaie.'); }
      } catch (e: any) {
        console.warn('[POLLING] Erreur réseau:', e?.message);
      }
    }, 5000);
    const timeout = setTimeout(() => { clearInterval(interval); setPolling(false); }, 180000);
    return () => { clearInterval(interval); clearTimeout(timeout); };
  }, [polling, payToken]);

  const handlePay = async () => {
    if (!isTelephoneValid) { setError('Numéro invalide (10 chiffres)'); return; }
    const montantNum = parseInt(montant, 10);
    if (!montantNum || isNaN(montantNum)) { setError('Montant invalide'); return; }
    if (!marchandId || !provider) { setError('Informations incomplètes'); return; }
    setSubmitting(true); setError('');
    try {
      const res = await fetch(`${API_URL}/wallets/public/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marchandId, provider, montant: montantNum, telephone: telephoneDigits }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Erreur');
      setPayToken(data.payToken);
      if (data.paymentUrl) { window.location.href = data.paymentUrl; return; }
      setPolling(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur inattendue');
    } finally {
      setSubmitting(false);
    }
  };

  // ── LOADING ──
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: BG }}>
      <motion.div style={{ width: 44, height: 44, borderRadius: '50%', border: `4px solid ${C}`, borderTopColor: 'transparent' }} animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }} />
    </div>
  );

  // ── MARCHAND INTROUVABLE ──
  if (!marchand) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: BG, gap: 16, padding: 24 }}>
      <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </div>
      <p style={{ fontSize: 18, fontWeight: 700, color: '#2a1a0a' }}>Marchand introuvable</p>
      <p style={{ fontSize: 14, color: '#b8956a', textAlign: 'center' }}>Ce lien de paiement est invalide ou a expiré.</p>
    </div>
  );

  // ── SUCCÈS ──
  if (success) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: BG, gap: 20, padding: 24 }}>
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}
        style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #34d399)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(16,185,129,0.35)' }}
      >
        <Check size={40} color="white" />
      </motion.div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: 24, fontWeight: 800, color: '#2a1a0a' }}>Paiement confirmé !</p>
        <p style={{ fontSize: 16, color: '#b8956a', marginTop: 8 }}>{parseInt(montant || '0', 10).toLocaleString('fr-FR')} FCFA envoyés</p>
        <p style={{ fontSize: 14, color: '#b8956a', marginTop: 4 }}>à {marchand.nom}</p>
      </div>
      <div style={{ background: 'white', borderRadius: 20, padding: '16px 24px', border: '1px solid rgba(198,106,44,0.1)', textAlign: 'center' }}>
        <p style={{ fontSize: 13, color: '#b8956a' }}>Julaba · Paiement sécurisé</p>
      </div>
    </div>
  );

  const selectedProvider = PROVIDERS.find(p => p.id === provider);

  return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 420, borderRadius: 28, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>

        {/* HEADER MARCHAND */}
        <div style={{ background: `linear-gradient(135deg, ${C}, #D4824A)`, padding: '24px 24px 20px', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to bottom, rgba(255,255,255,0.1), transparent)' }} />
          <motion.div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)' }} animate={{ x: ['-100%', '200%'] }} transition={{ duration: 3, repeat: Infinity }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginBottom: 4 }}>Payer</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {marchand.photoUrl ? (
                <img src={marchand.photoUrl} alt="" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.3)' }}/>
              ) : (
                <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                  {marchand.nom.charAt(0)}
                </div>
              )}
              <div>
                <p style={{ fontSize: 20, fontWeight: 800, color: 'white' }}>{marchand.nom}</p>
                {marchand.activity && <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{marchand.activity} · {marchand.commune}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* INDICATEUR ÉTAPES */}
        <div style={{ background: 'white', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 6, borderBottom: '1px solid rgba(198,106,44,0.08)' }}>
          {([1, 2, 3] as const).map(s => (
            <motion.div key={s} animate={{ width: s === etape ? 40 : 24, background: s === etape ? C : s < etape ? 'rgba(198,106,44,0.5)' : 'rgba(198,106,44,0.15)' }} style={{ height: 4, borderRadius: 2 }} transition={{ duration: 0.3 }} />
          ))}
          <span style={{ fontSize: 11, color: '#b8956a', marginLeft: 6, fontWeight: 600 }}>Étape {etape}/3</span>
        </div>

        {/* CORPS */}
        <div style={{ background: 'white', padding: 24 }}>
          <AnimatePresence mode="wait">

            {/* ÉTAPE 1 — Choisir opérateur */}
            {etape === 1 && (
              <motion.div key="e1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <p style={{ fontSize: 16, fontWeight: 700, color: '#2a1a0a', marginBottom: 16 }}>Choisir le service</p>
                {PROVIDERS.map(p => (
                  <motion.button key={p.id} onClick={() => { setProvider(p.id); setEtape(2); }}
                    style={{ width: '100%', padding: '14px 16px', marginBottom: 10, borderRadius: 16, border: '1.5px solid rgba(198,106,44,0.15)', background: 'white', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <motion.div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 35%, rgba(198,106,44,0.06) 50%, transparent 65%)' }} animate={{ x: ['-100%', '200%'] }} transition={{ duration: 2.5, repeat: Infinity }} />
                    <img src={p.logo} alt={p.name} style={{ height: 38, width: 'auto', objectFit: 'contain', flexShrink: 0 }}/>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#2a1a0a', flex: 1, textAlign: 'left' }}>{p.name}</span>
                    <ChevronRight size={16} color="#c8a882"/>
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* ÉTAPE 2 — Saisir montant */}
            {etape === 2 && (
              <motion.div key="e2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <motion.button onClick={() => setEtape(1)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(198,106,44,0.08)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} whileTap={{ scale: 0.9 }}>
                    <ArrowLeft size={14} color={C}/>
                  </motion.button>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#2a1a0a' }}>Saisir le montant</p>
                </div>

                {/* Affichage montant */}
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                  <p style={{ fontSize: 42, fontWeight: 800, color: montant ? '#2a1a0a' : 'rgba(198,106,44,0.25)', lineHeight: 1 }}>
                    {montant ? parseInt(montant, 10).toLocaleString('fr-FR') : '0'}
                  </p>
                  <p style={{ fontSize: 16, color: '#b8956a', fontWeight: 600, marginTop: 4 }}>FCFA</p>
                </div>

                {/* Clavier numérique */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
                  {['1','2','3','4','5','6','7','8','9','000','0','⌫'].map(k => (
                    <motion.button key={k}
                      onClick={() => {
                        if (k === '⌫') setMontant(m => m.slice(0, -1));
                        else if (k === '000') setMontant(m => m.length > 0 ? m + '000' : m);
                        else if (montant.length < 7) setMontant(m => m + k);
                      }}
                      style={{ height: 52, borderRadius: 14, border: '1px solid rgba(198,106,44,0.1)', background: 'white', fontSize: k === '⌫' ? 16 : 20, fontWeight: 500, color: '#2a1a0a', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      whileTap={{ scale: 0.93, backgroundColor: 'rgba(198,106,44,0.08)' }}
                    >{k}</motion.button>
                  ))}
                </div>

                <motion.button onClick={() => parseInt(montant, 10) >= 100 && setEtape(3)}
                  disabled={!montant || parseInt(montant, 10) < 100}
                  style={{ width: '100%', padding: 16, border: 'none', borderRadius: 16, background: montant && parseInt(montant, 10) >= 100 ? `linear-gradient(135deg, ${C}, #D4824A)` : 'rgba(198,106,44,0.2)', color: 'white', fontSize: 16, fontWeight: 700, cursor: montant && parseInt(montant, 10) >= 100 ? 'pointer' : 'not-allowed', position: 'relative', overflow: 'hidden', boxShadow: montant && parseInt(montant, 10) >= 100 ? '0 4px 16px rgba(198,106,44,0.35)' : 'none' }}
                  whileTap={montant && parseInt(montant, 10) >= 100 ? { scale: 0.98 } : {}}
                >
                  {montant && parseInt(montant, 10) >= 100 && <motion.div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)' }} animate={{ x: ['-100%', '200%'] }} transition={{ duration: 2.5, repeat: Infinity }}/>}
                  Continuer
                </motion.button>
              </motion.div>
            )}

            {/* ÉTAPE 3 — Numéro + confirmation */}
            {etape === 3 && (
              <motion.div key="e3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                  <motion.button onClick={() => setEtape(2)} style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(198,106,44,0.08)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} whileTap={{ scale: 0.9 }}>
                    <ArrowLeft size={14} color={C}/>
                  </motion.button>
                  <p style={{ fontSize: 16, fontWeight: 700, color: '#2a1a0a' }}>Votre numéro</p>
                </div>

                <p style={{ fontSize: 13, color: '#b8956a', marginBottom: 10 }}>Numéro Mobile Money (10 chiffres)</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span
                    style={{
                      fontSize: 16,
                      fontWeight: 900,
                      color: '#2a1a0a',
                      background: 'rgba(198,106,44,0.08)',
                      borderRadius: 12,
                      padding: '10px 12px',
                      letterSpacing: 0.5,
                      userSelect: 'none',
                      flexShrink: 0,
                    }}
                    aria-hidden
                  >
                    +225
                  </span>
                  <input
                    type="tel"
                    placeholder="07 00 00 00 00"
                    value={formatPhone(telephoneDigits)}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setTelephone(formatPhone(digits));
                    }}
                    maxLength={14}
                    inputMode="numeric"
                    style={{
                      width: '100%',
                      padding: '16px',
                      borderRadius: 16,
                      border: `2px solid ${isTelephoneValid ? C : 'rgba(198,106,44,0.2)'}`,
                      fontSize: 22,
                      fontWeight: 800,
                      textAlign: 'center',
                      letterSpacing: 4,
                      boxSizing: 'border-box',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      fontFamily: 'system-ui',
                    }}
                  />
                </div>

                {/* Récap */}
                <div style={{ background: BG, borderRadius: 16, padding: 16, marginBottom: 16 }}>
                  {[
                    { label: 'Marchand',  value: marchand.nom },
                    { label: 'Montant',   value: `${parseInt(montant || '0', 10).toLocaleString('fr-FR')} FCFA` },
                    { label: 'Service',   value: selectedProvider?.name || '' },
                  ].map(({ label, value }, i, arr) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < arr.length - 1 ? '1px solid rgba(198,106,44,0.1)' : 'none' }}>
                      <span style={{ fontSize: 13, color: '#b8956a' }}>{label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {label === 'Service' && selectedProvider && <img src={selectedProvider.logo} alt="" style={{ height: 20, width: 'auto', objectFit: 'contain' }}/>}
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#2a1a0a' }}>{value}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {error && <p style={{ color: '#dc2626', fontWeight: 600, marginBottom: 12, textAlign: 'center', fontSize: 13 }}>{error}</p>}

                <motion.button
                  onClick={handlePay}
                  disabled={submitting || polling || !isTelephoneValid}
                  style={{
                    width: '100%',
                    padding: 16,
                    border: 'none',
                    borderRadius: 16,
                    background: isTelephoneValid && !submitting && !polling
                      ? 'linear-gradient(135deg, #10b981, #34d399)'
                      : 'rgba(16,185,129,0.3)',
                    color: 'white',
                    fontSize: 16,
                    fontWeight: 800,
                    cursor: isTelephoneValid ? 'pointer' : 'not-allowed',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: isTelephoneValid ? '0 4px 16px rgba(16,185,129,0.35)' : 'none',
                  }}
                  whileTap={isTelephoneValid ? { scale: 0.98 } : {}}
                >
                  {isTelephoneValid && !submitting && !polling && (
                    <motion.div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)',
                      }}
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 2.5, repeat: Infinity }}
                    />
                  )}
                  {polling ? '⏳ En attente de confirmation...' : submitting ? 'Traitement...' : `Payer ${parseInt(montant || '0', 10).toLocaleString('fr-FR')} FCFA`}
                </motion.button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* FOOTER */}
        <div style={{ background: BG, padding: '12px 24px', textAlign: 'center', borderTop: '1px solid rgba(198,106,44,0.08)' }}>
          <p style={{ fontSize: 11, color: '#b8956a' }}>Paiement sécurisé · Julaba Keiwa</p>
        </div>

      </div>
    </div>
  );
}
