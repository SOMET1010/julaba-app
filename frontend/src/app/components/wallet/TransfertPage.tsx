import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Check } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { IMG_LOGO_WAVE, IMG_LOGO_ORANGE_MONEY, IMG_LOGO_MTN, IMG_LOGO_MOOV } from '../../assets/images';
import { toast } from 'sonner';

const C = '#C66A2C';
const BG = '#FFF2E9';

interface Contact {
  name: string;
  initials: string;
  color: string;
  phone: string;
  online: boolean;
  last: string;
}

interface Method {
  id: string;
  logo?: string;
  imgLogo?: string;
  color: string;
  textColor?: string;
  name: string;
  sub: string;
  featured: boolean;
  badge: string;
}

const CONTACTS: Contact[] = [
  { name: 'Awa Koné',      initials: 'AK', color: C,         phone: '07 01 02 03 04', online: true,  last: '5 000'  },
  { name: 'Mariam D.',     initials: 'MD', color: '#3b82f6', phone: '05 06 07 08 09', online: false, last: '2 500'  },
  { name: 'Fatoumata T.',  initials: 'FT', color: '#8b5cf6', phone: '07 23 45 67 89', online: true,  last: '10 000' },
  { name: 'Kadidia S.',    initials: 'KS', color: '#10b981', phone: '05 11 22 33 44', online: false, last: '1 000'  },
  { name: 'Binta C.',      initials: 'BC', color: '#f59e0b', phone: '07 55 66 77 88', online: true,  last: '7 500'  },
];

const METHODS: Method[] = [
  { id: 'julaba', logo: 'JL',  color: C,         name: 'Compte Julaba',    sub: 'Instantané · Sans frais', featured: true,  badge: 'Recommandé' },
  { id: 'wave',   logo: 'WV',  imgLogo: IMG_LOGO_WAVE,          color: '#00b9f5', name: 'Wave',             sub: 'Rapide · Sans frais',     featured: false, badge: '' },
  { id: 'orange', logo: 'OM',  imgLogo: IMG_LOGO_ORANGE_MONEY,  color: '#FF6600', name: 'Orange Money',     sub: 'Disponible partout',      featured: false, badge: '' },
  { id: 'mtn',    logo: 'MTN', imgLogo: IMG_LOGO_MTN,           color: '#FFCC00', textColor: '#333', name: 'MTN MoMo', sub: 'Réseau étendu', featured: false, badge: '' },
  { id: 'moov',   logo: 'MV',  imgLogo: IMG_LOGO_MOOV,          color: '#0057A8', name: 'Moov Money',       sub: 'Faibles commissions',     featured: false, badge: '' },
  { id: 'banque', logo: 'BQ',  color: '#2d7a4f', name: 'Virement bancaire', sub: 'Sous 24h ouvrées',       featured: false, badge: '' },
];

type Step = 1 | 2 | 3;

export function TransfertPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [phone, setPhone] = useState('');
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<Method | null>(null);
  const [amount, setAmount] = useState('');
  const [done, setDone] = useState(false);

  const stepLabels: Record<Step, string> = {
    1: 'À qui envoyer ?',
    2: 'Comment envoyer ?',
    3: 'Combien envoyer ?',
  };

  const handleSelectContact = (c: Contact) => {
    setSelectedContact(c);
    setPhone(c.phone);
  };

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    if (val.length >= 8) {
      setSelectedContact({ name: val, initials: val.slice(0, 2).toUpperCase(), color: C, phone: val, online: false, last: '' });
    } else {
      setSelectedContact(null);
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

  const goBack = () => {
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
    else navigate(-1);
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
          <p style={{ fontSize: 13, color: '#b8956a', marginTop: 4 }}>à {selectedContact?.name}</p>
        </div>
        <motion.button
          onClick={() => { setStep(1); setPhone(''); setSelectedContact(null); setSelectedMethod(null); setAmount(''); setDone(false); }}
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
            <div style={{ position: 'relative', marginBottom: 20 }}>
              <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={e => handlePhoneChange(e.target.value)}
                placeholder="Numéro ou code Julaba"
                style={{ width: '100%', padding: '16px 20px 16px 50px', borderRadius: 18, border: `2px solid ${phone.length >= 8 ? C : 'rgba(198,106,44,0.2)'}`, background: 'white', fontSize: 15, color: '#2a1a0a', outline: 'none', fontFamily: 'system-ui, sans-serif', transition: 'border-color 0.2s' }}
              />
              {phone.length > 0 && (
                <motion.button
                  onClick={() => { setPhone(''); setSelectedContact(null); }}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', width: 26, height: 26, borderRadius: '50%', background: 'rgba(198,106,44,0.1)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  whileTap={{ scale: 0.9 }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </motion.button>
              )}
            </div>

            {/* Contacts récents */}
            <p style={{ fontSize: 13, fontWeight: 700, color: C, marginBottom: 10 }}>Envois récents</p>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
              {CONTACTS.map(c => (
                <motion.div
                  key={c.name}
                  onClick={() => handleSelectContact(c)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0, width: 60 }}
                  whileTap={{ scale: 0.92 }}
                >
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'white', position: 'relative', border: selectedContact?.phone === c.phone ? `3px solid ${C}` : '2.5px solid white', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                    {c.initials}
                    {c.online && <div style={{ position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: '50%', background: '#4ade80', border: '2px solid white' }} />}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#2a1a0a', textAlign: 'center', lineHeight: 1.3 }}>{c.name.split(' ')[0]}</span>
                  <span style={{ fontSize: 9, color: '#b8956a' }}>{c.last} F</span>
                </motion.div>
              ))}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(198,106,44,0.15)' }} />
              <span style={{ fontSize: 12, color: '#b8956a', fontWeight: 500 }}>ou saisissez un numéro</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(198,106,44,0.15)' }} />
            </div>

            <motion.button
              onClick={() => selectedContact && setStep(2)}
              disabled={!selectedContact}
              style={{ width: '100%', padding: 16, border: 'none', borderRadius: 18, background: selectedContact ? `linear-gradient(135deg, ${C}, #D4824A)` : 'rgba(198,106,44,0.2)', color: 'white', fontSize: 16, fontWeight: 700, cursor: selectedContact ? 'pointer' : 'not-allowed', position: 'relative', overflow: 'hidden', boxShadow: selectedContact ? '0 4px 16px rgba(198,106,44,0.35)' : 'none' }}
              whileTap={selectedContact ? { scale: 0.98 } : {}}
            >
              {selectedContact && <motion.div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)' }} animate={{ x: ['-100%', '200%'] }} transition={{ duration: 2.5, repeat: Infinity }} />}
              Continuer
            </motion.button>
          </motion.div>
        )}

        {/* ── ÉTAPE 2 ── */}
        {step === 2 && selectedContact && (
          <motion.div key="step2" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} style={{ padding: '20px 16px' }}>

            {/* Récap destinataire */}
            <div style={{ background: 'white', borderRadius: 16, padding: '14px 16px', border: '1px solid rgba(198,106,44,0.12)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: selectedContact.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                {selectedContact.initials}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#2a1a0a' }}>{selectedContact.name}</p>
                <p style={{ fontSize: 12, color: '#b8956a', marginTop: 1 }}>{selectedContact.phone}</p>
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
                <div style={{ width: 42, height: 42, borderRadius: 13, background: m.imgLogo ? 'white' : m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: m.textColor || 'white', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.15)', overflow: 'hidden', position: 'relative', zIndex: 1 }}>
                  {m.imgLogo
                    ? <img src={m.imgLogo} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}/>
                    : m.logo}
                </div>
                <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#2a1a0a' }}>{m.name}</p>
                  <p style={{ fontSize: 11, color: '#b8956a', marginTop: 1 }}>{m.sub}</p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: C, background: 'rgba(198,106,44,0.1)', padding: '3px 8px', borderRadius: 10, position: 'relative', zIndex: 1 }}>{m.badge}</span>
              </motion.div>
            ))}
            <div style={{ marginTop: -2, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#92400e', background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 999, padding: '4px 10px' }}>
                Bientôt
              </span>
            </div>

            {/* Via Mobile Money */}
            <p style={{ fontSize: 11, fontWeight: 700, color: '#b8956a', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, marginTop: 16 }}>Via Mobile Money</p>
            {METHODS.filter(m => ['wave', 'orange', 'mtn', 'moov'].includes(m.id)).map(m => (
              <motion.div key={m.id} onClick={() => { setSelectedMethod(m); setStep(3); }} style={{ background: 'white', borderRadius: 16, padding: '13px 16px', border: '1px solid rgba(198,106,44,0.1)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginBottom: 8 }} whileTap={{ scale: 0.98 }}>
                <div style={{ width: 42, height: 42, borderRadius: 13, background: m.imgLogo ? 'white' : m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: m.textColor || 'white', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
                  {m.imgLogo
                    ? <img src={m.imgLogo} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}/>
                    : m.logo}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#2a1a0a' }}>{m.name}</p>
                  <p style={{ fontSize: 11, color: '#b8956a', marginTop: 1 }}>{m.sub}</p>
                </div>
                <ChevronRight size={16} color="#c8a882" />
              </motion.div>
            ))}

            {/* Via Banque */}
            <p style={{ fontSize: 11, fontWeight: 700, color: '#b8956a', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8, marginTop: 16 }}>Via Banque</p>
            {METHODS.filter(m => m.id === 'banque').map(m => (
              <motion.div key={m.id} onClick={() => { setSelectedMethod(m); setStep(3); }} style={{ background: 'white', borderRadius: 16, padding: '13px 16px', border: '1px solid rgba(198,106,44,0.1)', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} whileTap={{ scale: 0.98 }}>
                <div style={{ width: 42, height: 42, borderRadius: 13, background: m.imgLogo ? 'white' : m.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'white', flexShrink: 0, boxShadow: '0 2px 6px rgba(0,0,0,0.15)', overflow: 'hidden' }}>
                  {m.imgLogo
                    ? <img src={m.imgLogo} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 4 }}/>
                    : m.logo}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: '#2a1a0a' }}>{m.name}</p>
                  <p style={{ fontSize: 11, color: '#b8956a', marginTop: 1 }}>{m.sub}</p>
                </div>
                <ChevronRight size={16} color="#c8a882" />
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* ── ÉTAPE 3 ── */}
        {step === 3 && selectedContact && selectedMethod && (
          <motion.div key="step3" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} style={{ padding: '20px 16px' }}>

            {/* Récap mini */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '12px 14px', background: 'white', borderRadius: 14, border: '1px solid rgba(198,106,44,0.1)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: selectedContact.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 }}>{selectedContact.initials}</div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#2a1a0a' }}>{selectedContact.name}</p>
                <p style={{ fontSize: 11, color: '#b8956a', marginTop: 1 }}>via {selectedMethod.name}</p>
              </div>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: selectedMethod.imgLogo ? 'white' : selectedMethod.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: selectedMethod.textColor || 'white', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.12)' }}>
                {selectedMethod.imgLogo
                  ? <img src={selectedMethod.imgLogo} alt={selectedMethod.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }}/>
                  : selectedMethod.logo}
              </div>
            </div>

            {/* Montant */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <p style={{ fontSize: 13, color: '#b8956a', marginBottom: 10 }}>Montant à envoyer</p>
              <p style={{ fontSize: 42, fontWeight: 800, color: amountNum > 0 ? '#2a1a0a' : 'rgba(198,106,44,0.25)', lineHeight: 1 }}>
                {amountNum > 0 ? amountNum.toLocaleString('fr-FR') : '0'}
              </p>
              <p style={{ fontSize: 16, color: '#b8956a', fontWeight: 600, marginTop: 4 }}>FCFA</p>
            </div>

            {/* Clavier numérique */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
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

            {/* Récap final */}
            {amountNum >= 100 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ background: 'white', borderRadius: 16, padding: 16, border: '1px solid rgba(198,106,44,0.1)', marginBottom: 16 }}>
                {[
                  { label: 'Destinataire', value: selectedContact.name },
                  { label: 'Via', value: selectedMethod.name },
                  { label: 'Frais', value: selectedMethod.id === 'julaba' ? 'Gratuit' : 'Inclus' },
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
              onClick={() => {
                toast.error('Transfert entre comptes Julaba bientôt disponible');
              }}
              disabled
              style={{ width: '100%', padding: 16, border: 'none', borderRadius: 18, background: 'rgba(198,106,44,0.2)', color: 'white', fontSize: 16, fontWeight: 700, cursor: 'not-allowed', position: 'relative', overflow: 'hidden', boxShadow: 'none', opacity: 0.5 }}
            >
              Envoyer maintenant
            </motion.button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
