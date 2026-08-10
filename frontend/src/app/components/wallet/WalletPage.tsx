import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, EyeOff, Menu, ArrowLeft, ChevronRight, Shield, MessageCircle, MapPin, Lock, Monitor, CreditCard, Check, Fingerprint } from 'lucide-react';
import { QRCodeSVG as QRCode } from 'qrcode.react';
import { useUser } from '../../contexts/UserContext';
import { useApp } from '../../contexts/AppContext';
import { useWallet } from '../../contexts/WalletContext';
import { RechargeWalletModal } from './RechargeWalletModal';
import { WithdrawWalletModal } from './WithdrawWalletModal';
import { API_URL } from '../../utils/api';
import { verifyWebAuthnForKeiwa } from '../../hooks/useWebAuthn';

const C = '#C66A2C';
const BG = '#FFF2E9';
const KEIWA_SVG = (
  <svg viewBox="0 0 396.969 212.97" style={{ width: 120, height: 65 }}>
    <g>
      <path fill={C} d="M344.637,39.144c2.363,1.691,5.56,1.901,8.461,1.835,11.353-.122,24.938-1.31,30.141,8.29,1.943,3.499,2.451,7.547,2.685,11.516.454,8.321.382,20.098-.007,28.659-.231,4.867-.717,9.94-3.273,14.192-6.166,10.03-20.704,8.056-31.041,8.351-2.929.147-5.165,1.045-6.556,3.078-10.971,42.54-40.972,72.198-85.489,78.773-73.498,5.178-184.888,15.293-204.919-73.209-1.71-7.134-4.6-8.801-11.611-8.335-33.377.508-33.527-11.532-31.191-46.987.225-5.843.29-13.307,3.694-17.926,5.839-7.788,19.556-6.416,30.301-6.41,6.215.283,9.723-3.721,12.838-8.593,8.669-12.929,24.68-16.354,39.373-16.734,10.469-.552,20.93-.839,31.419-.96,57.052-.628,115.574,3.759,172.73,1.651,14.174-.754,29.198,4.594,37.103,16.645,1.518,2.163,3.124,4.637,5.204,6.07l.137.095ZM84.817,31.841c-25.269,6.925-19.571,40.36-19.026,60.25-1.916,95.192,104.195,93.699,177.761,88.174,16.289-.323,36.1-4.103,48.843-12.498,33.507-20.538,42.663-64.033,39.746-106.957-.358-11.526-4.304-23.003-15.65-27.515-2.911-1.236-7.225-2.384-9.608-2.303-12.273.427-177.433-.665-221.956.816l-.109.032ZM50.204,56.486c-.81-.503-2.595-.483-5.373-.494-2.593,0-5.95,0-8.856,0-3.579.147-6.403-.364-8.755,1.263-1.12,1.196-1.013,3.184-1.101,4.853-.011,6.589-.007,21.101-.002,27.69.072,3.828-.131,6.663,4.945,6.965,5.45.244,12.343.271,17.945-.003,2.14-.274,2.039-1.457,2.058-4.635.002-8.427,0-17.578,0-25.968.001-1.578,0-3.112,0-4.645-.029-2.826.138-4.374-.794-4.984l-.066-.042ZM370.019,95.765c1.383-1.168,1.201-2.531,1.383-4.607.058-1.378.03-3.062.036-5.125-.073-8.297.148-17.412-.092-25.741.013-4.441-3.809-4.139-7.407-4.293-4.155-.015-9.691-.03-13.609.016-3.784-.052-3.861,1.158-3.84,3.923,0,7.33-.015,27.025.008,33.63.032.945.014,1.908.548,2.556.352.396.945.587,1.879.682,1.273.128,3.245.099,5.647.105,4.553-.248,11.89.772,15.367-1.088l.082-.058Z"/>
      <path fill={C} d="M148.917,99.915c-.396,4.819-.095,11.872-.184,17.096.016,4.739.023,7.681-1.197,10.68-.991,2.477-2.582,4.78-4.546,6.62-5.888,5.192-15.931,5.652-23.384,3.745-13.419-3.745-12.404-18.948-11.861-30.807.102-3.448-.851-6.503-4.019-8.214-1.62-.962-3.72-1.68-5.533-2.472-20.769-9.469-15.377-40.054,6.864-43.565,17.032-.006,173.256.015,189.619.189,13.78,3.189,22.511,19.58,16.008,32.761-1.746,3.996-5.584,7.652-9.357,10.129-2.482,1.534-3.913,2.746-6.315,2.886-18.587.017-80.658-.003-106.959.005-19.29.009-34.459-.017-38.089.013-.597.038-.874.189-1.032.87l-.014.066ZM103.015,69.561c-7.695,7.345-.076,15.279,8.425,15.42,17.916.008,157.178.005,175.425.005,2.496.074,5.682-1.111,7.799-2.951,5.779-4.502,3.046-12.055-3.259-13.873-38.987-.609-107.024.124-148.858-.043-18.065.024-31.739.04-36.114.047-1.296.004-2.159.347-3.336,1.323l-.083.072ZM132.703,99.459c-1.559-.822-4.575-.626-6.518-.59-2.675.037-4.275.839-4.219,3.643-.085,3.49-.021,10.382-.038,14.676.026,1.404-.034,2.953.442,4.205,1.135,2.557,5.048,2.354,7.509,2.45,2.994.018,4.054-1.555,3.999-4.38.053-3.568.01-9.648.024-13.988-.022-3.205.144-5.185-1.104-5.957l-.095-.059Z"/>
    </g>
  </svg>
);

const TYPE_LABELS: Record<string, { label: string; isCredit: boolean }> = {
  RECHARGE:         { label: 'Rechargement',    isCredit: true  },
  recharge:         { label: 'Rechargement',    isCredit: true  },
  RETRAIT:          { label: 'Retrait',          isCredit: false },
  retrait:          { label: 'Retrait',          isCredit: false },
  PAIEMENT_ENVOYE:  { label: 'Paiement envoyé', isCredit: false },
  paiement_envoye:  { label: 'Paiement envoyé', isCredit: false },
  PAIEMENT_RECU:    { label: 'Paiement reçu',   isCredit: true  },
  paiement_recu:    { label: 'Paiement reçu',   isCredit: true  },
  ESCROW_BLOQUE:    { label: 'En attente',       isCredit: false },
  ESCROW_LIBERE:    { label: 'Libéré',           isCredit: true  },
  ESCROW_REMBOURSE: { label: 'Remboursé',        isCredit: true  },
  COMMISSION:       { label: 'Commission',       isCredit: true  },
  credit:           { label: 'Crédit',           isCredit: true  },
  debit:            { label: 'Débit',            isCredit: false },
  CREDIT:           { label: 'Crédit',           isCredit: true  },
  DEBIT:            { label: 'Débit',            isCredit: false },
};

function formatDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

// ── DRAWER ───────────────────────────────────────────────────────────────────
function DrawerMenu({ isOpen, onClose, solde, showSolde, onToggleSolde, onOpenRecharge, onOpenRetrait }: {
  isOpen: boolean; onClose: () => void;
  solde: number; showSolde: boolean; onToggleSolde: () => void;
  onOpenRecharge?: () => void;
  onOpenRetrait?: () => void;
}) {
  const navigate = useNavigate();
  const { user } = useUser();

  const items: { icon: React.ReactNode; label: string; sub: string; action: () => void; disabled?: boolean }[] = [
    {
      icon: <motion.svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 3, repeat: Infinity, delay: 0 }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></motion.svg>,
      label: 'Mon profil', sub: 'Informations personnelles',
      action: () => { onClose(); navigate('../profil'); },
    },
    {
      icon: <motion.svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2" animate={{ rotate: [0, 360] }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></motion.svg>,
      label: 'Historique complet', sub: 'Toutes vos transactions',
      action: () => { onClose(); navigate('historique'); },
    },
    {
      icon: <motion.svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></motion.svg>,
      label: 'Sécurité', sub: 'FaceID · Empreinte · PIN',
      action: () => { onClose(); navigate('../parametres'); },
    },
    {
      icon: <motion.svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2" animate={{ x: [0, 2, -2, 0] }} transition={{ duration: 1.5, repeat: Infinity, delay: 1 }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></motion.svg>,
      label: 'Service client', sub: 'Disponible 8h – 20h',
      action: () => { onClose(); navigate('../support'); },
    },
    {
      icon: <motion.svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></motion.svg>,
      label: 'Agents à proximité', sub: 'Bientôt disponible',
      action: () => {}, disabled: true,
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200]" style={{ background: 'rgba(0,0,0,0.45)' }}
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed top-0 right-0 bottom-0 z-[210] flex flex-col"
            style={{ width: '78%', maxWidth: 300, backgroundColor: BG }}
          >
            {/* Header drawer */}
            <div style={{ background: `linear-gradient(135deg, ${C}, #D4824A)`, padding: '28px 18px 22px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to bottom, rgba(255,255,255,0.12), transparent)' }} />
              <motion.button
                onClick={onClose}
                style={{ position: 'absolute', top: 18, left: 14, width: 30, height: 30, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </motion.button>
              <p style={{ fontSize: 20, fontWeight: 900, color: 'white', position: 'relative', zIndex: 1, marginTop: 4 }}>Keiwa</p>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.75)', position: 'relative', zIndex: 1 }}>Mon espace wallet</p>

              {/* Solde */}
              <div style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 14, padding: '11px 14px', marginTop: 14, position: 'relative', zIndex: 1 }}>
                <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Solde disponible</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>
                    {showSolde ? solde.toLocaleString('fr-FR') : '••••••'}
                  </span>
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)' }}>FCFA</span>
                  <motion.button onClick={onToggleSolde} style={{ marginLeft: 'auto', width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} whileTap={{ scale: 0.9 }}>
                    {showSolde ? <Eye className="w-3 h-3 text-white" /> : <EyeOff className="w-3 h-3 text-white" />}
                  </motion.button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '14px 0 0', position: 'relative', zIndex: 1 }}>
                <motion.button
                  onClick={() => { onClose(); onOpenRecharge?.(); }}
                  style={{ borderRadius: 14, padding: 12, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)', cursor: 'pointer', backdropFilter: 'blur(8px)' }}
                  whileTap={{ scale: 0.95, backgroundColor: 'rgba(255,255,255,0.25)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'white', position: 'relative', zIndex: 1 }}>Recharger</span>
                </motion.button>
                <motion.button
                  onClick={() => { onClose(); onOpenRetrait?.(); }}
                  style={{ borderRadius: 14, padding: 12, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)', cursor: 'pointer', backdropFilter: 'blur(8px)' }}
                  whileTap={{ scale: 0.95, backgroundColor: 'rgba(255,255,255,0.25)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/></svg>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'white', position: 'relative', zIndex: 1 }}>Retirer</span>
                </motion.button>
              </div>
            </div>

            {/* Navigation */}
            <div style={{ flex: 1, padding: '8px 12px 20px', overflowY: 'auto' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#b8956a', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '14px 4px 8px' }}>Menu</p>
              {items.map((item) => (
                <motion.div
                  key={item.label}
                  onClick={item.disabled ? undefined : item.action}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 10px', borderRadius: 16, cursor: item.disabled ? 'not-allowed' : 'pointer', opacity: item.disabled ? 0.4 : 1, marginBottom: 2 }}
                  whileHover={item.disabled ? {} : { backgroundColor: 'rgba(198,106,44,0.07)' }}
                  whileTap={item.disabled ? {} : { scale: 0.98 }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 12, background: 'rgba(198,106,44,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                    {item.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#2a1a0a' }}>{item.label}</p>
                    <p style={{ fontSize: 11, color: '#b8956a', marginTop: 1 }}>{item.sub}</p>
                  </div>
                  {!item.disabled
                    ? <ChevronRight className="w-3.5 h-3.5" style={{ color: '#c8a882' }} />
                    : <span style={{ fontSize: 10, fontWeight: 600, color: C, background: 'rgba(198,106,44,0.1)', padding: '2px 8px', borderRadius: 8 }}>Bientôt</span>
                  }
                </motion.div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── MODAL QR ─────────────────────────────────────────────────────────────────
function ModalQR({ isOpen, onClose, userId, userName }: {
  isOpen: boolean; onClose: () => void; userId: string; userName: string;
}) {
  const [mode, setMode] = useState<'scanner' | 'qr'>('scanner');
  const [timeLeft, setTimeLeft] = useState(60);
  const [qrToken, setQrToken] = useState(`JULABA-${userId.slice(0, 8).toUpperCase()}`);
  const [fullscreen, setFullscreen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [torchOn, setTorchOn] = useState(false);

  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torchOn } as any] });
      setTorchOn(v => !v);
    } catch { /* torch non supporté */ }
  };

  useEffect(() => {
    if (!isOpen || mode !== 'scanner') return;
    setCameraAvailable(true);
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (err) {
        void err;
        setCameraAvailable(false);
      }
    };
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [isOpen, mode]);

  useEffect(() => {
    if (!isOpen) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          setQrToken(`JULABA-${userId.slice(0, 6).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`);
          return 60;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isOpen, userId]);

  const timerPct = (timeLeft / 60) * 100;
  const timerColor = timeLeft > 20 ? '#4ade80' : timeLeft > 10 ? '#fbbf24' : '#f87171';
  const qrUrl = `https://julaba.online/pay/${userId}?token=${qrToken}`;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'absolute', inset: 0, zIndex: 50, background: '#000', isolation: 'isolate' }}
        >
          {/* Fond caméra (scanner) */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: mode === 'qr' ? 'none' : 'block' }}
          />
          {mode === 'scanner' && <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />}
          {mode === 'scanner' && !cameraAvailable && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, zIndex: 2 }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              <p style={{ fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>Caméra non disponible</p>
              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '0 32px' }}>Autorisez l'accès à la caméra dans les paramètres de votre navigateur</p>
            </div>
          )}

          <AnimatePresence mode="wait">
            {mode === 'scanner' ? (
              <motion.div key="scanner" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                {/* Masques overlay plein écran */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 'calc(50% + 115px)', background: 'rgba(0,0,0,0.7)', zIndex: 1 }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, top: 'calc(50% + 115px)', background: 'rgba(0,0,0,0.7)', zIndex: 1 }} />
                <div style={{ position: 'absolute', top: 'calc(50% - 115px)', left: 0, width: 'calc(50% - 115px)', height: 230, background: 'rgba(0,0,0,0.7)', zIndex: 1 }} />
                <div style={{ position: 'absolute', top: 'calc(50% - 115px)', right: 0, width: 'calc(50% - 115px)', height: 230, background: 'rgba(0,0,0,0.7)', zIndex: 1 }} />
                {/* Header */}
                <div style={{ position: 'relative', zIndex: 2, width: '100%', padding: '24px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <motion.button onClick={onClose} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} whileTap={{ scale: 0.9 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
                  </motion.button>
                  <p style={{ fontSize: 16, fontWeight: 700, color: 'white' }}>Scanner un QR</p>
                  <motion.button onClick={toggleTorch} whileTap={{ scale: 0.9 }} style={{ width: 40, height: 40, borderRadius: '50%', background: torchOn ? 'rgba(255,220,100,0.4)' : 'rgba(255,255,255,0.15)', border: `1px solid ${torchOn ? 'rgba(255,220,100,0.6)' : 'rgba(255,255,255,0.25)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                  </motion.button>
                </div>
                {/* Viewfinder */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, position: 'relative', zIndex: 2 }}>
                  <div style={{ width: 230, height: 230, position: 'relative' }}>
                    {[
                      { top: 0, left: 0, borderWidth: '3px 0 0 3px', borderRadius: '10px 0 0 0' },
                      { top: 0, right: 0, borderWidth: '3px 3px 0 0', borderRadius: '0 10px 0 0' },
                      { bottom: 0, left: 0, borderWidth: '0 0 3px 3px', borderRadius: '0 0 0 10px' },
                      { bottom: 0, right: 0, borderWidth: '0 3px 3px 0', borderRadius: '0 0 10px 0' },
                    ].map((s, i) => (
                      <div key={i} style={{ position: 'absolute', width: 36, height: 36, borderColor: C, borderStyle: 'solid', ...s }} />
                    ))}
                    <motion.div
                      style={{ position: 'absolute', left: 4, right: 4, height: 2, background: `linear-gradient(to right, transparent, ${C}, #FFB347, ${C}, transparent)`, borderRadius: 1, boxShadow: `0 0 10px rgba(198,106,44,0.7)` }}
                      animate={{ top: [4, 224, 4] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  </div>
                  <div style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)', backdropFilter: 'blur(12px)', borderRadius: 24, padding: '10px 20px', textAlign: 'center' }}>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.9)', fontWeight: 500 }}>Pointez vers un QR code</p>
                  </div>
                </div>
              </motion.div>
) : (
  <motion.div key="qr" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
    style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}
  >
    <div style={{ position: 'absolute', inset: 0, background: C }} />
    <motion.div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.06) 38%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.06) 62%, transparent 80%)' }} animate={{ x: ['-100%', '200%'] }} transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }} />

    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '24px 20px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 }}>
      <motion.button onClick={onClose} style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} whileTap={{ scale: 0.9 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
      </motion.button>
      <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <p style={{ fontSize: 17, fontWeight: 700, color: 'white' }}>Mon QR Keiwa</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>Montrez pour recevoir</p>
      </div>
      <div style={{ width: 40 }} />
    </div>

    <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '0 20px', marginTop: 16 }}>
      <div style={{ width: '100%', maxWidth: 280, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: timerColor, display: 'inline-block' }} />
            QR sécurisé · Se régénère
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: timerColor }}>{timeLeft}s</span>
        </div>
        <div style={{ width: '100%', height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${timerPct}%`, background: timerColor, borderRadius: 2, transition: 'width 1s linear, background 0.5s' }} />
        </div>
      </div>

      <motion.div onClick={() => setFullscreen(true)} style={{ background: 'rgba(255,255,255,0.18)', border: '1.5px solid rgba(255,255,255,0.35)', backdropFilter: 'blur(12px)', borderRadius: 28, padding: 18, boxShadow: '0 8px 32px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.4)', cursor: 'pointer' }} whileTap={{ scale: 0.97 }}>
        <QRCode value={qrUrl} size={220} fgColor={C} bgColor="white" level="M" />
      </motion.div>

      <div style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.28)', backdropFilter: 'blur(10px)', borderRadius: 20, padding: '12px 28px', textAlign: 'center', width: '100%', maxWidth: 280 }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>{userName}</p>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>{qrToken}</p>
      </div>

      <motion.button onClick={() => { if (navigator.share) { navigator.share({ title: 'Mon QR Keiwa', text: `Payer ${userName} via Julaba`, url: qrUrl }); } else { navigator.clipboard?.writeText(qrUrl); } }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', borderRadius: 24, background: 'rgba(255,255,255,0.2)', border: '1.5px solid rgba(255,255,255,0.35)', color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }} whileTap={{ scale: 0.95 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        Partager mon QR
      </motion.button>
    </div>

    <AnimatePresence>
      {fullscreen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setFullscreen(false)}
          style={{ position: 'absolute', inset: 0, background: C, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10, cursor: 'pointer' }}
        >
          <motion.div style={{ background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.4)', backdropFilter: 'blur(16px)', borderRadius: 32, padding: 20 }} initial={{ scale: 0.5 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12 }}>
            <QRCode value={qrUrl} size={280} fgColor={C} bgColor="white" level="M" />
          </motion.div>
          <p style={{ marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>Appuyez pour fermer</p>
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
)}
          </AnimatePresence>

          {/* Toggle */}
          <div style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 10, background: mode === 'qr' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.4)', border: `1px solid ${mode === 'qr' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.15)'}`, borderRadius: 32, padding: 5, display: 'flex', gap: 2, backdropFilter: 'blur(16px)', whiteSpace: 'nowrap' }}>
            {(['scanner', 'qr'] as const).map(m => (
              <motion.button
                key={m}
                onClick={() => setMode(m)}
                style={{ padding: '10px 20px', borderRadius: 26, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', background: mode === m ? 'white' : 'transparent', color: mode === m ? C : 'rgba(255,255,255,0.75)', boxShadow: mode === m ? '0 2px 12px rgba(0,0,0,0.15)' : 'none' }}
                whileTap={{ scale: 0.95 }}
              >
                {m === 'scanner' ? 'Scanner' : 'Mon QR'}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ── WALLET PAGE ───────────────────────────────────────────────────────────────
export function WalletPage() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { user: appUser, setUser: setAppUser } = useApp();
  const { getAvailableBalance, transactions, getTransactionHistory, refreshKeiwa } = useWallet();

  const [showBalance, setShowBalance] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showRecharge, setShowRecharge] = useState(false);
  const [showRetrait, setShowRetrait] = useState(false);
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [pinLocked, setPinLocked] = useState<boolean>(user?.pinSecurityEnabled || false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [showCreatePin, setShowCreatePin] = useState<boolean>(!user?.pinSecurityEnabled);
  const [createPin1, setCreatePin1] = useState('');
  const [createPin2, setCreatePin2] = useState('');
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [createPinError, setCreatePinError] = useState('');
  const [createPinLoading, setCreatePinLoading] = useState(false);
  const [createPinSuccess, setCreatePinSuccess] = useState(false);
  useEffect(() => {
    if (user?.pinSecurityEnabled && pinLocked) return;
    setPinLocked(user?.pinSecurityEnabled || false);
  }, [user?.id, user?.pinSecurityEnabled]);

  const handleBiometricKeiwa = async () => {
    try {
      const ok = await verifyWebAuthnForKeiwa();
      if (ok) {
        setPinLocked(false);
      } else {
        setPinError('Authentification biométrique échouée');
      }
    } catch {
      setPinError('Biométrie non disponible');
    }
  };

  const handleCreatePinPress = (digit: string) => {
    if (createStep === 1) {
      if (createPin1.length < 4) {
        const next = createPin1 + digit;
        setCreatePin1(next);
        setCreatePinError('');
        if (next.length === 4) {
          setTimeout(() => setCreateStep(2), 300);
        }
      }
    } else {
      if (createPin2.length < 4) {
        const next = createPin2 + digit;
        setCreatePin2(next);
        setCreatePinError('');
        if (next.length === 4) {
          setTimeout(() => handleCreatePin(createPin1, next), 300);
        }
      }
    }
  };

  const handleCreatePinDelete = () => {
    if (createStep === 1) setCreatePin1(p => p.slice(0, -1));
    else setCreatePin2(p => p.slice(0, -1));
  };

  const handleCreatePin = async (pin1: string, pin2: string) => {
    const PINS_INTERDITS = ['0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', '1234', '4321', '0123', '9876'];
    const tousIdentiques = new Set(pin1.split('')).size === 1;
    if (pin1 !== pin2) {
      setCreatePinError('Les codes ne correspondent pas');
      setCreatePin2('');
      setCreateStep(1);
      setCreatePin1('');
      return;
    }
    if (PINS_INTERDITS.includes(pin1) || tousIdentiques) {
      setCreatePinError('Code trop simple — choisis un code plus sécurisé');
      setCreatePin2('');
      setCreateStep(1);
      setCreatePin1('');
      return;
    }
    setCreatePinLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/pin/set`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin1 }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setCreatePinError(data.message || 'Erreur lors de la création du PIN');
        setCreatePin2('');
        setCreateStep(1);
        setCreatePin1('');
        return;
      }
      if (appUser) setAppUser({ ...appUser, pinSecurityEnabled: true });
      setCreatePinSuccess(true);
      setTimeout(() => {
        setShowCreatePin(false);
        setCreatePinSuccess(false);
        setPinLocked(false);
      }, 1800);
    } catch {
      setCreatePinError('Erreur réseau, veuillez réessayer');
      setCreatePin2('');
      setCreateStep(1);
      setCreatePin1('');
    } finally {
      setCreatePinLoading(false);
    }
  };

  const handleLockPinPress = (digit: string) => {
    if (pinInput.length < 4) {
      const next = pinInput + digit;
      setPinInput(next);
      setPinError('');
      if (next.length === 4) {
        setTimeout(() => handleVerifyPinWithCode(next), 300);
      }
    }
  };

  const handleLockPinDelete = () => setPinInput(p => p.slice(0, -1));

  const handleVerifyPinWithCode = async (code: string) => {
    setPinLoading(true);
    setPinError('');
    try {
      const res = await fetch(`${API_URL}/auth/pin/verify`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: code }),
      });
      const data = await res.json();
      if (data.valid) {
        setPinLocked(false);
      } else {
        setPinError('Code PIN incorrect');
        setPinInput('');
      }
    } catch {
      setPinError('Erreur réseau, veuillez réessayer');
      setPinInput('');
    } finally {
      setPinLoading(false);
    }
  };

  const available = getAvailableBalance();
  const recentTx = getTransactionHistory(5);
  const userId = user?.id || 'JULABA';
  const userName = user ? `${user.prenoms || ''} ${user.nom || ''}`.trim() : 'Utilisateur';

  const ACTIONS = [
    {
      label: 'Transfert',
      color: 'rgba(59,130,246,0.12)',
      border: 'rgba(59,130,246,0.28)',
      icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
      action: () => navigate('transfert'),
      textColor: '#1d4ed8',
    },
    {
      label: 'Paiements',
      color: 'rgba(16,185,129,0.12)',
      border: 'rgba(16,185,129,0.28)',
      icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
      action: () => navigate('paiements'),
      textColor: '#047857',
    },
    {
      label: 'Banque',
      color: 'rgba(139,92,246,0.12)',
      border: 'rgba(139,92,246,0.28)',
      icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
      action: () => navigate('banque'),
      textColor: '#6d28d9',
    },
    {
      label: 'Carte',
      color: 'rgba(245,158,11,0.12)',
      border: 'rgba(245,158,11,0.28)',
      icon: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
      action: () => navigate('carte'),
      textColor: '#b45309',
    },
  ];

  const PinNumpad = ({ onPress, onDelete }: { onPress: (d: string) => void; onDelete: () => void }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(d => (
        <motion.button key={d} onClick={() => onPress(d)} style={{ height: 52, borderRadius: 14, background: '#f9fafb', border: '0.5px solid #ebebeb', fontSize: 22, fontWeight: 600, color: '#111', cursor: 'pointer' }} whileTap={{ scale: 0.92 }}>{d}</motion.button>
      ))}
      <div style={{ height: 52 }} />
      <motion.button onClick={() => onPress('0')} style={{ height: 52, borderRadius: 14, background: '#f9fafb', border: '0.5px solid #ebebeb', fontSize: 22, fontWeight: 600, color: '#111', cursor: 'pointer' }} whileTap={{ scale: 0.92 }}>0</motion.button>
      <motion.button onClick={onDelete} style={{ height: 52, borderRadius: 14, background: '#f9fafb', border: '0.5px solid #ebebeb', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} whileTap={{ scale: 0.92 }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
      </motion.button>
    </div>
  );

  const PinDots = ({ value, color = C }: { value: string; color?: string }) => (
    <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 5 }}>
      {[0, 1, 2, 3].map(i => (
        <motion.div key={i} style={{ width: 14, height: 14, borderRadius: '50%', background: i < value.length ? color : 'transparent', border: `2px solid ${i < value.length ? color : '#e5e7eb'}` }}
          animate={i < value.length ? { scale: [1, 1.2, 1] } : {}}
          transition={{ duration: 0.2 }}
        />
      ))}
    </div>
  );

  if (showCreatePin) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ minHeight: '100vh', backgroundColor: BG, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
          onClick={() => {}}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ background: '#fff', borderRadius: '28px 28px 0 0', padding: '0 20px 32px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e5e7eb', margin: '12px auto 14px' }} />
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 10 }}>
              <div style={{ height: 3, width: 28, borderRadius: 2, background: C }} />
              <div style={{ height: 3, width: 28, borderRadius: 2, background: createStep === 2 ? C : '#e5e7eb', transition: 'background 0.3s' }} />
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, textAlign: 'center', color: C, marginBottom: 14 }}>
              {createStep === 1 ? 'Crée ton code PIN' : 'Confirme ton code PIN'}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
              {KEIWA_SVG}
              <p style={{ fontSize: 18, fontWeight: 700, color: '#111', marginTop: 10, textAlign: 'center' }}>
                {createStep === 1 ? 'Sécurise ton Keiwa' : 'Encore une fois'}
              </p>
              <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 3 }}>
                {createStep === 1 ? 'Choisis un code à 4 chiffres' : 'Saisis-le à nouveau pour confirmer'}
              </p>
            </div>
            <AnimatePresence mode="wait">
              {createPinSuccess ? (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 0 40px' }}>
                  <PinDots value="1234" color="#2E8B57" />
                  <p style={{ fontSize: 11, color: '#2E8B57', textAlign: 'center', marginBottom: 20 }}>Accès dans un instant…</p>
                </motion.div>
              ) : (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <PinDots value={createStep === 1 ? createPin1 : createPin2} />
                  <p style={{ fontSize: 11, color: createPinError ? '#dc2626' : '#9ca3af', textAlign: 'center', marginBottom: 14, minHeight: 16 }}>
                    {createPinError || (createStep === 1 ? 'Nouveau PIN' : 'Confirmer le PIN')}
                  </p>
                  <PinNumpad onPress={handleCreatePinPress} onDelete={handleCreatePinDelete} />
                  <motion.button onClick={() => void handleBiometricKeiwa()} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer' }} whileTap={{ scale: 0.97 }}>
                    <Fingerprint style={{ width: 14, height: 14, color: C }} />
                    <span style={{ fontSize: 12, fontWeight: 600, color: C }}>FaceID / Empreinte</span>
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (pinLocked) {
    const prenom = user?.prenoms || user?.nom || '';
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{ minHeight: '100vh', backgroundColor: BG, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ background: '#fff', borderRadius: '28px 28px 0 0', padding: '0 20px 32px' }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: '#e5e7eb', margin: '12px auto 14px' }} />
            <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 10 }}>
              <div style={{ height: 3, width: 28, borderRadius: 2, background: C }} />
              <div style={{ height: 3, width: 28, borderRadius: 2, background: C }} />
            </div>
            <p style={{ fontSize: 13, fontWeight: 700, textAlign: 'center', color: C, marginBottom: 14 }}>Entre ton code PIN</p>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 16 }}>
              {KEIWA_SVG}
              {prenom ? <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 8 }}>Bonjour {prenom}</p> : null}
              <p style={{ fontSize: 18, fontWeight: 700, color: '#111', marginTop: 4, textAlign: 'center' }}>Keiwa verrouillé</p>
              <p style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center', marginTop: 3 }}>Entre ton code pour accéder</p>
            </div>
            <PinDots value={pinInput} />
            <p style={{ fontSize: 11, color: pinError ? '#dc2626' : '#9ca3af', textAlign: 'center', marginBottom: 14, minHeight: 16 }}>
              {pinError || 'Code PIN'}
            </p>
            <PinNumpad onPress={handleLockPinPress} onDelete={handleLockPinDelete} />
            <motion.button onClick={() => void handleBiometricKeiwa()} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', background: 'none', border: 'none', cursor: 'pointer' }} whileTap={{ scale: 0.97 }}>
              <Fingerprint style={{ width: 14, height: 14, color: C }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: C }}>FaceID / Empreinte</span>
            </motion.button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG, position: 'relative' }}>

      {/* HEADER */}
      <div style={{ background: C, padding: '22px 20px 36px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to bottom, rgba(255,255,255,0.1), transparent)' }} />

        {/* Top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1, marginBottom: 20 }}>
          <motion.button
            onClick={() => navigate(-1)}
            style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            whileTap={{ scale: 0.9 }}
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </motion.button>
          <motion.button
            onClick={() => setShowBalance(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer' }}
            whileTap={{ scale: 0.97 }}
          >
            <span style={{ fontSize: 28, fontWeight: 700, color: 'white', letterSpacing: '-1px' }}>
              {showBalance ? available.toLocaleString('fr-FR') : '•••••'}
            </span>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)' }}>FCFA</span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {showBalance ? <Eye className="w-3.5 h-3.5 text-white" /> : <EyeOff className="w-3.5 h-3.5 text-white" />}
            </div>
          </motion.button>
          <motion.button
            onClick={() => setShowDrawer(true)}
            style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            whileTap={{ scale: 0.9 }}
          >
            <Menu className="w-4 h-4 text-white" />
          </motion.button>
        </div>

        {/* QR code */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'center', opacity: showQR ? 0 : 1, transition: 'opacity 0.2s' }}>
          <motion.div
            onClick={() => setShowQR(true)}
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.28)', borderRadius: 22, padding: 14, cursor: 'pointer', width: '62%' }}
            whileTap={{ scale: 0.97 }}
          >
            <div style={{ background: 'white', borderRadius: 12, padding: 10, display: 'flex', justifyContent: 'center' }}>
              <QRCode value={`https://julaba.online/pay/${userId}`} size={120} fgColor={C} bgColor="white" level="M" />
            </div>
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 8 }}>Toucher pour payer</p>
          </motion.div>
        </div>

        {/* BOUTONS RECHARGER / RETIRER */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 12, marginTop: 16 }}>
          <motion.button
            onClick={() => setShowRecharge(true)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)', cursor: 'pointer', backdropFilter: 'blur(8px)' }}
            whileTap={{ scale: 0.96, backgroundColor: 'rgba(255,255,255,0.25)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="8" x2="12" y2="16"/></svg>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Recharger</span>
          </motion.button>
          <motion.button
            onClick={() => setShowRetrait(true)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)', cursor: 'pointer', backdropFilter: 'blur(8px)' }}
            whileTap={{ scale: 0.96, backgroundColor: 'rgba(255,255,255,0.25)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/></svg>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>Retirer</span>
          </motion.button>
        </div>
      </div>

      {/* 4 BOUTONS */}
      <div style={{ backgroundColor: BG, padding: '18px 16px 16px', borderBottom: '1px solid rgba(198,106,44,0.08)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {ACTIONS.map(({ label, color, border, icon, action, textColor }) => (
            <motion.button
              key={label}
              onClick={action}
              style={{ borderRadius: 20, padding: '14px 6px 12px', cursor: 'pointer', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: color, border: `1.5px solid ${border}`, minHeight: 88 }}
              whileTap={{ scale: 0.93 }}
            >
              <motion.div animate={{ scale: [1, 1.15, 1.15, 1] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
                {icon}
              </motion.div>
              <span style={{ position: 'relative', zIndex: 1, fontSize: 10, fontWeight: 700, color: textColor }}>{label}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* HISTORIQUE */}
      <div style={{ padding: '18px 16px 16px' }}>
        <p style={{ fontSize: 15, fontWeight: 600, color: C, marginBottom: 14 }}>Historique</p>
        {recentTx.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <p style={{ color: '#b8956a', fontSize: 13 }}>Aucune transaction. Rechargez votre Keiwa.</p>
            <motion.button
              onClick={() => setShowRecharge(true)}
              style={{ marginTop: 12, padding: '10px 24px', borderRadius: 16, background: C, color: 'white', fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' }}
              whileTap={{ scale: 0.97 }}
            >
              Recharger maintenant
            </motion.button>
          </div>
        ) : (
          recentTx.map(tx => {
            const cfg = TYPE_LABELS[tx.type] || { label: tx.type, isCredit: false };
            const montant = Math.round(Number(tx.amount || 0));
            return (
              <motion.div
                key={tx.id}
                onClick={() => setSelectedTx(tx)}
                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '0.5px solid rgba(198,106,44,0.1)', cursor: 'pointer' }}
                whileTap={{ scale: 0.99 }}
              >
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: cfg.isCredit ? '#E8FAF0' : '#FEE8D6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={cfg.isCredit ? '#1a8c5a' : C} strokeWidth="2.5">
                    {cfg.isCredit
                      ? <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></>
                      : <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>
                    }
                  </svg>
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#2a1a0a' }}>{cfg.label}</p>
                  <p style={{ fontSize: 11, color: '#b8956a', marginTop: 1 }}>{formatDate(tx.createdAt)}</p>
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: cfg.isCredit ? '#1a8c5a' : C, flexShrink: 0 }}>
                  {cfg.isCredit ? '+' : '-'}{montant.toLocaleString('fr-FR')} FCFA
                </p>
              </motion.div>
            );
          })
        )}
      </div>

      {/* VOIR TOUTES */}
      {recentTx.length > 0 && (
        <div style={{ position: 'sticky', bottom: 0, left: 0, right: 0, background: `linear-gradient(to top, ${BG} 70%, transparent)`, padding: '12px 16px 20px', zIndex: 10 }}>
          <motion.button
            onClick={() => navigate('historique')}
            style={{ width: '100%', textAlign: 'center', fontSize: 13, fontWeight: 700, color: C, background: 'none', border: 'none', cursor: 'pointer' }}
            whileTap={{ scale: 0.98 }}
          >
            Voir toutes les transactions
          </motion.button>
        </div>
      )}

      {/* MODAL DÉTAIL TX */}
      <AnimatePresence>
        {selectedTx && (() => {
          const cfg = TYPE_LABELS[selectedTx.type] || { label: selectedTx.type, isCredit: false };
          const montant = Math.round(Number(selectedTx.amount || 0));
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.5)' }} onClick={() => setSelectedTx(null)}>
              <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }} style={{ width: '100%', maxWidth: 480, background: 'white', borderRadius: '24px 24px 0 0', paddingBottom: 32 }} onClick={e => e.stopPropagation()}>
                <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12, paddingBottom: 8 }}>
                  <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e5e7eb' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 16, paddingBottom: 24, paddingLeft: 24, paddingRight: 24 }}>
                  <div style={{ width: 64, height: 64, borderRadius: '50%', background: cfg.isCredit ? '#E8FAF0' : '#FEE8D6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={cfg.isCredit ? '#1a8c5a' : C} strokeWidth="2.5">
                      {cfg.isCredit ? <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></> : <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>}
                    </svg>
                  </div>
                  <p style={{ fontSize: 36, fontWeight: 800, color: cfg.isCredit ? '#1a8c5a' : C, lineHeight: 1 }}>
                    {cfg.isCredit ? '+' : '-'}{montant.toLocaleString('fr-FR')} FCFA
                  </p>
                  <p style={{ fontSize: 14, color: '#b8956a', marginTop: 4 }}>{cfg.label}</p>
                </div>
                <div style={{ margin: '0 16px', borderRadius: 16, border: '1px solid rgba(198,106,44,0.15)', overflow: 'hidden' }}>
                  {[
                    { label: 'Date',        value: formatDate(selectedTx.createdAt) },
                    { label: 'Type',        value: TYPE_LABELS[selectedTx.type]?.label || selectedTx.type },
                    { label: 'Montant',     value: `${(TYPE_LABELS[selectedTx.type]?.isCredit ? '+' : '-')}${Math.round(Number(selectedTx.amount || 0)).toLocaleString('fr-FR')} FCFA` },
                    { label: 'Solde avant', value: `${Math.round(Number(selectedTx.balanceBefore || 0)).toLocaleString('fr-FR')} FCFA` },
                    { label: 'Solde après', value: `${Math.round(Number(selectedTx.balanceAfter || 0)).toLocaleString('fr-FR')} FCFA` },
                    { label: 'Statut',      value: selectedTx.status || selectedTx.statut || 'completed' },
                    { label: 'Référence',   value: selectedTx.id?.slice(0, 16) || '—' },
                    { label: 'Description', value: selectedTx.description || '—' },
                  ].map(({ label, value }, i, arr) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < arr.length - 1 ? '1px solid rgba(198,106,44,0.08)' : 'none' }}>
                      <span style={{ fontSize: 14, color: '#888' }}>{label}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: label === 'Statut' ? ((value === 'completed' || value === 'COMPLETED') ? '#1a8c5a' : '#e53e3e') : label === 'Montant' ? C : '#111', maxWidth: '55%', textAlign: 'right' }}>
                        {label === 'Statut' ? ((value === 'completed' || value === 'COMPLETED') ? '✓ Effectué' : '✗ Rejeté') : value}
                      </span>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '16px 16px 0' }}>
                  <motion.button onClick={() => setSelectedTx(null)} style={{ width: '100%', padding: '14px', borderRadius: 16, background: C, color: 'white', fontSize: 15, fontWeight: 700, border: 'none', cursor: 'pointer' }} whileTap={{ scale: 0.97 }}>
                    Fermer
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* DRAWER + MODALS */}
      <DrawerMenu
        isOpen={showDrawer}
        onClose={() => setShowDrawer(false)}
        solde={available}
        showSolde={showBalance}
        onToggleSolde={() => setShowBalance(v => !v)}
        onOpenRecharge={() => setShowRecharge(true)}
        onOpenRetrait={() => setShowRetrait(true)}
      />
      <ModalQR isOpen={showQR} onClose={() => setShowQR(false)} userId={userId} userName={userName} />
      <RechargeWalletModal isOpen={showRecharge} onClose={() => setShowRecharge(false)} roleColor={C} />
      <WithdrawWalletModal isOpen={showRetrait} onClose={() => setShowRetrait(false)} roleColor={C} />
    </div>
  );
}
