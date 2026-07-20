import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Lock, Copy, Clock, Globe, Check, Shield } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { useWallet } from '../../contexts/WalletContext';
import { RechargeWalletModal } from './RechargeWalletModal';
import { IMG_LOGO_WAVE, IMG_LOGO_ORANGE_MONEY, IMG_LOGO_MTN, IMG_LOGO_MOOV } from '../../assets/images';

const C = '#C66A2C';
const BG = '#FFF2E9';

export function CartePage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { getAvailableBalance } = useWallet();
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [cardBlocked, setCardBlocked] = useState(false);
  const [showRecharge, setShowRecharge] = useState(false);

  const nomCarte = user
    ? `${(user.prenoms || '').toUpperCase()} ${(user.nom || '').toUpperCase()}`.trim()
    : 'FÉLICITE KONÉ';
  const solde = getAvailableBalance();
  const plafondTotal = 200000;
  const plafondUtilise = 70000;
  const plafondPct = Math.round((plafondUtilise / plafondTotal) * 100);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ACTIONS = [
    {
      label: cardBlocked ? 'Débloquer' : 'Bloquer',
      sub: cardBlocked ? 'Carte bloquée' : 'Carte active',
      color: 'rgba(239,68,68,0.1)',
      border: 'rgba(239,68,68,0.25)',
      textColor: '#dc2626',
      icon: <Lock size={22} color="#dc2626" />,
      action: () => setCardBlocked(v => !v),
      delay: 0,
    },
    {
      label: 'Plafond',
      sub: '200 000 FCFA',
      color: 'rgba(16,185,129,0.1)',
      border: 'rgba(16,185,129,0.25)',
      textColor: '#047857',
      icon: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth="2.2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
      action: () => {},
      delay: 0.7,
    },
    {
      label: 'Copier',
      sub: 'Numéro carte',
      color: 'rgba(59,130,246,0.1)',
      border: 'rgba(59,130,246,0.25)',
      textColor: '#1d4ed8',
      icon: copied ? <Check size={22} color="#1d4ed8" /> : <Copy size={22} color="#1d4ed8" />,
      action: handleCopy,
      delay: 1.4,
    },
    {
      label: 'Historique',
      sub: 'Transactions',
      color: 'rgba(139,92,246,0.1)',
      border: 'rgba(139,92,246,0.25)',
      textColor: '#6d28d9',
      icon: <Clock size={22} color="#6d28d9" />,
      action: () => navigate('../historique'),
      delay: 2.1,
    },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG }}>

      {/* HEADER */}
      <div style={{ background: C, padding: '22px 20px 26px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to bottom, rgba(255,255,255,0.1), transparent)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
          <motion.button
            onClick={() => navigate(-1)}
            style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            whileTap={{ scale: 0.9 }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </motion.button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>Ma carte</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>Carte virtuelle Julaba</p>
          </div>
          {/* Indicateur statut */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 20, padding: '5px 10px' }}>
            <motion.div
              style={{ width: 7, height: 7, borderRadius: '50%', background: cardBlocked ? '#f87171' : '#4ade80' }}
              animate={{ boxShadow: cardBlocked ? ['0 0 0 0 rgba(248,113,113,0.5)', '0 0 0 5px rgba(248,113,113,0)'] : ['0 0 0 0 rgba(74,222,128,0.5)', '0 0 0 5px rgba(74,222,128,0)'] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
            <span style={{ fontSize: 11, fontWeight: 600, color: 'white' }}>{cardBlocked ? 'Bloquée' : 'Active'}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 16px 40px' }}>

        {/* CARTE MÉTAL */}
        <div style={{ marginBottom: 20 }}>
          <motion.div
            style={{
              width: '100%', height: 200, borderRadius: 20,
              position: 'relative', overflow: 'hidden', cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(150,70,20,0.25), 0 8px 24px rgba(0,0,0,0.12)',
              opacity: cardBlocked ? 0.6 : 1,
            }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.15 }}
          >
            {/* Fond métal */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #8B4513 0%, #C66A2C 18%, #D4824A 30%, #9F5522 48%, #C66A2C 62%, #B8601E 76%, #D4924A 88%, #8B4513 100%)' }} />
            {/* Lignes métalliques */}
            <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(98deg, transparent 0px, rgba(255,255,255,0.03) 1px, transparent 2px, transparent 5px)' }} />
            {/* Reflet */}
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(125deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 35%, transparent 55%, rgba(0,0,0,0.08) 100%)' }} />
            {/* Shimmer */}
            <motion.div
              style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.2) 47%, rgba(255,240,200,0.25) 50%, rgba(255,255,255,0.2) 53%, transparent 70%)' }}
              animate={{ x: ['-100%', '200%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
            {/* Relief bas */}
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '30%', background: 'linear-gradient(to top, rgba(0,0,0,0.15), transparent)' }} />

            {/* Contenu carte */}
            <div style={{ position: 'relative', zIndex: 2, padding: '18px 20px', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              {/* Top */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div>
                  <p style={{ fontSize: 22, fontWeight: 900, color: 'white', letterSpacing: '-0.5px', textShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>Julaba</p>
                  <p style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.75)', letterSpacing: '0.12em', marginTop: 2 }}>CARTE VIRTUELLE</p>
                </div>
                {/* Chip */}
                <div style={{ width: 36, height: 28, borderRadius: 5, background: 'linear-gradient(135deg, #C8A84B, #F0D060, #B8922A, #E8C840)', boxShadow: '0 2px 4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', inset: 3, borderRadius: 3, background: 'linear-gradient(135deg, #B89030, #E0C050, #A07820)' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(90deg, transparent 0px, transparent 5px, rgba(0,0,0,0.12) 5px, rgba(0,0,0,0.12) 6px)', borderRadius: 5 }} />
                </div>
              </div>

              {/* Solde + numéro */}
              <div>
                {/* Solde */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: '0.06em' }}>SOLDE</span>
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'white', textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
                    {showDetails ? solde.toLocaleString('fr-FR') : '••••••'}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>FCFA</span>
                </div>
                {/* Numéro + oeil */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: "'Courier New', monospace", fontSize: 14, fontWeight: 600, color: 'white', letterSpacing: 3, textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}>
                    {showDetails ? '5274 8831 2290 4817' : '•••• •••• •••• ••••'}
                  </span>
                  <motion.button
                    onClick={() => setShowDetails(v => !v)}
                    style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {showDetails ? <Eye size={12} color="white" /> : <EyeOff size={12} color="white" />}
                  </motion.button>
                </div>
              </div>

              {/* Bas carte */}
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 }}>
                <div>
                  <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.1em', marginBottom: 2 }}>TITULAIRE</p>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'white', letterSpacing: '1px', textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>{nomCarte}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.65)', letterSpacing: '0.06em' }}>EXPIRE</p>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'white', marginTop: 1, letterSpacing: 1 }}>
                    {showDetails ? '08/28' : '••/••'}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 8, color: 'rgba(255,255,255,0.65)' }}>CVV</p>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'white', marginTop: 1 }}>
                    {showDetails ? '394' : '•••'}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,80,0,0.85)', boxShadow: '0 1px 4px rgba(0,0,0,0.3)' }} />
                  <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(255,160,0,0.75)', marginLeft: -7, boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* 4 ACTIONS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
          {ACTIONS.map(({ label, sub, color, border, textColor, icon, action, delay }) => (
            <motion.button
              key={label}
              onClick={action}
              style={{ borderRadius: 20, padding: '12px 6px 10px', cursor: 'pointer', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, background: color, border: `1.5px solid ${border}`, minHeight: 88 }}
              whileTap={{ scale: 0.93 }}
            >
              {/* Shimmer */}
              <motion.div
                style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.3) 50%, transparent 65%)' }}
                animate={{ x: ['-100%', '200%'] }}
                transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut', delay }}
              />
              <motion.div
                style={{ position: 'relative', zIndex: 1 }}
                animate={{ scale: [1, 1.15, 1.15, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay }}
              >
                {icon}
              </motion.div>
              <span style={{ position: 'relative', zIndex: 1, fontSize: 9, fontWeight: 700, color: textColor }}>{label}</span>
            </motion.button>
          ))}
        </div>

        {/* PLAFOND */}
        <div style={{ background: 'white', borderRadius: 16, padding: '14px 16px', border: '1px solid rgba(198,106,44,0.12)', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#047857" strokeWidth="2.2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: '#2a1a0a' }}>Mon plafond mensuel</p>
              <div style={{ width: 160, height: 5, background: 'rgba(198,106,44,0.12)', borderRadius: 3, marginTop: 6, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${plafondPct}%`, background: 'linear-gradient(to right, #10b981, #34d399)', borderRadius: 3 }} />
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: '#047857' }}>{plafondPct}%</p>
            <p style={{ fontSize: 10, color: '#b8956a' }}>{plafondUtilise.toLocaleString('fr-FR')} / {plafondTotal.toLocaleString('fr-FR')}</p>
          </div>
        </div>

        {/* RECHARGER MA CARTE */}
        <motion.button
          onClick={() => setShowRecharge(true)}
          style={{ width: '100%', borderRadius: 18, padding: 16, background: 'rgba(198,106,44,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: 10, border: '1.5px solid rgba(198,106,44,0.2)', position: 'relative', overflow: 'hidden' }}
          whileTap={{ scale: 0.98 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 42, height: 42, borderRadius: 14, background: 'rgba(198,106,44,0.12)', border: '1px solid rgba(198,106,44,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#2a1a0a' }}>Recharger ma carte</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                {[IMG_LOGO_WAVE, IMG_LOGO_ORANGE_MONEY, IMG_LOGO_MTN, IMG_LOGO_MOOV].map((logo, i) => (
                  <img key={i} src={logo} alt="" style={{ height: 16, width: 'auto', objectFit: 'contain' }}/>
                ))}
              </div>
            </div>
          </div>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(198,106,44,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </div>
        </motion.button>

        <RechargeWalletModal isOpen={showRecharge} onClose={() => setShowRecharge(false)} roleColor={C} />

        {/* PAYER EN LIGNE */}
        <motion.button
          style={{ width: '100%', border: 'none', borderRadius: 18, padding: 16, background: `linear-gradient(135deg, ${C}, #D4824A)`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', marginBottom: 14, position: 'relative', overflow: 'hidden', boxShadow: '0 4px 16px rgba(198,106,44,0.3)' }}
          whileTap={{ scale: 0.98 }}
        >
          <motion.div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)' }} animate={{ x: ['-100%', '200%'] }} transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
            <div style={{ width: 42, height: 42, borderRadius: 14, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Globe size={22} color="white" />
            </div>
            <div style={{ textAlign: 'left' }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>Payer en ligne</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 1 }}>Utilisez votre carte sur internet</p>
            </div>
          </div>
          <div style={{ position: 'relative', zIndex: 1, width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          </div>
        </motion.button>

        {/* DERNIERS PAIEMENTS */}
        <p style={{ fontSize: 13, fontWeight: 700, color: C, marginBottom: 10 }}>Derniers paiements</p>
        {[
          { logo: 'N', bg: '#E50914', name: 'Netflix', date: "Aujourd'hui · 08:00", amount: '-3 900' },
          { logo: 'A', bg: '#555555', name: 'iCloud', date: '15 avr · 12:30', amount: '-1 500' },
          { logo: 'D', bg: '#0061FE', name: 'Dropbox', date: '10 avr · 09:15', amount: '-2 500' },
        ].map(({ logo, bg, name, date, amount }) => (
          <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '0.5px solid rgba(198,106,44,0.1)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0 }}>{logo}</div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#2a1a0a' }}>{name}</p>
              <p style={{ fontSize: 11, color: '#b8956a', marginTop: 1 }}>{date}</p>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: C }}>{amount}</span>
          </div>
        ))}

        {/* BANNIÈRE PHYSIQUE */}
        <div style={{ borderRadius: 18, overflow: 'hidden', marginTop: 14, background: 'linear-gradient(135deg, #1A0A02, #2C1408, #1A0A02)', position: 'relative', padding: 16 }}>
          <motion.div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 30%, rgba(255,210,100,0.08) 50%, transparent 70%)' }} animate={{ x: ['-100%', '200%'] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} />
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 52, height: 34, borderRadius: 6, background: `linear-gradient(135deg, #8B4513, ${C}, #8B4513)`, boxShadow: '0 3px 10px rgba(0,0,0,0.4)', flexShrink: 0, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to bottom, rgba(255,255,255,0.15), transparent)' }} />
            </div>
            <div>
              <p style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Carte physique</p>
              <p style={{ fontSize: 11, color: 'rgba(255,200,100,0.7)', marginTop: 2 }}>Disponible bientôt</p>
            </div>
            <motion.button style={{ marginLeft: 'auto', background: `linear-gradient(135deg, ${C}, #D4824A)`, border: 'none', borderRadius: 20, padding: '8px 12px', fontSize: 10, fontWeight: 700, color: 'white', cursor: 'pointer', flexShrink: 0, boxShadow: '0 2px 8px rgba(198,106,44,0.4)' }} whileTap={{ scale: 0.95 }}>
              Liste d'attente
            </motion.button>
          </div>
        </div>

        {/* SÉCURITÉ */}
        <div style={{ background: 'white', borderRadius: 16, padding: '14px 16px', border: '1px solid rgba(198,106,44,0.1)', marginTop: 12 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#2a1a0a', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Shield size={14} color={C} /> Protection de la carte
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {[
              { label: 'Face ID', icon: <Eye size={15} color={C} /> },
              { label: 'Empreinte', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2"><path d="M12 10a2 2 0 0 0-2 2v3a2 2 0 0 0 4 0v-3a2 2 0 0 0-2-2z"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg> },
              { label: 'Code PIN', icon: <Lock size={15} color={C} /> },
            ].map(({ label, icon }) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 6px', borderRadius: 12, background: 'rgba(198,106,44,0.05)', border: '1px solid rgba(198,106,44,0.1)' }}>
                <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(198,106,44,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</div>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#7a5a3a', textAlign: 'center' }}>{label}</span>
                <span style={{ fontSize: 9, color: '#10b981', fontWeight: 600 }}>✓ Actif</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
