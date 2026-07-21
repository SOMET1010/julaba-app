import { useLangPref, LANG_FLAGS, LANG_LABELS } from '../../hooks/useLangPref';
import { eventBus, EVENTS } from '../../services/eventBus';
import { usePredictiveTTS } from '../../services/predictiveTTS';
import React, { useState, useEffect, useRef } from 'react';
import { ObjectifProvider, useObjectif } from '../../contexts/ObjectifContext';
import { RapportHebdoProvider, useRapportHebdo } from '../../contexts/RapportHebdoContext';
import { RaccourcisProvider, useRaccourcis } from '../../contexts/RaccourcisContext';
import { RaccourcisModal } from './RaccourcisModal';
import { RapportHebdoModal } from './RapportHebdoModal';
import { ObjectifModal } from './ObjectifModal';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../contexts/AppContext';
import { ROLE_COLORS } from '../../config/roleConfig';
import { TATA_LOU_BLEU as TATA_BLEU, TATA_LOU_ORANGE as TATA_ORANGE, RACC_IMG as MOD_IMAGES } from '../../assets/cloudinary-images';
import { NotifBellButton, NotificationsPanel } from '../shared/NotificationsPanel';
import {
  OpenDayModal, EditFondModal, CloseDayModal,
  StatsVentesModal, StatsMargeModal, ScoreModal, ResumeModal,
} from './MarchandModals';
import { VenteVocaleModal } from './VenteVocaleModal';

const P = '#AF5B23';
const BG = '#FFF2E9';

const MODS_MAIN = [
  { id: 'marchandise', label: 'Marchandises', path: '/marchand/stock' },
  { id: 'bilan',       label: 'Cahier',       path: '/marchand/ventes-passees' },
  { id: 'cahier',      label: 'Dépenses',     path: '/marchand/cahier' },
];
const MODS_EXTRA = [
  { id: 'keiwa',      label: 'Keiwa',      path: '/marchand/keiwa' },
  { id: 'rapport',    label: 'Rapport',    path: null },
  { id: 'commandes',  label: 'Commandes',  path: '/marchand/commandes' },
  { id: 'score',      label: 'Mes Points', path: null },
  { id: 'raccourcis', label: 'Raccourcis', path: null },
  { id: 'academy',    label: 'Academy',    path: '/marchand/academy' },
];

const MODULES_SANS_SESSION = ['marchandise', 'commandes', 'keiwa', 'academy', 'score', 'raccourcis', 'rapport'];

function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  const prev = useRef(0);
  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) { setDisplay(to); return; }
    const start = performance.now();
    let rafId = 0;
    const tick = (now: number) => {
      const p = Math.min((now - start) / 1000, 1);
      const e = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * e));
      if (p < 1) rafId = requestAnimationFrame(tick);
      else setDisplay(to); // fige sur la valeur exacte à la fin
    };
    rafId = requestAnimationFrame(tick);
    // IMPORTANT : annuler l'animation en cours si `value` change à nouveau (les
    // données chargent en 2 temps : ventes puis session). Sans ça, plusieurs
    // boucles se chevauchaient et le montant affiché restait bloqué sur une
    // frame intermédiaire ALÉATOIRE (montant faux et différent à chaque fois).
    return () => cancelAnimationFrame(rafId);
  }, [value]);
  return <>{display.toLocaleString('fr-FR')}</>;
}

function ObjBar({ progression, objectif, ventes }: { progression: number; objectif: number; ventes: number }) {
  const [width, setWidth] = useState(0);
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const target = Math.min(progression, 100);
    setTimeout(() => {
      setWidth(target);
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min((now - start) / 1800, 1);
        const e = 1 - Math.pow(1 - p, 3);
        setPct(Math.round(e * target));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, 300);
  }, [progression]);
  return (
    <>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
        <span style={{ fontSize:10, fontWeight:600, color:'rgba(255,255,255,0.55)' }}>Objectif du jour</span>
        <span style={{ fontSize:11, fontWeight:800, color:'#FFD166' }}>{pct}%</span>
      </div>
      <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:6, height:4, overflow:'hidden', marginBottom:5 }}>
        <div style={{ height:'100%', borderRadius:6, background:'linear-gradient(90deg,#FFD166,#ffb347)', width:`${width}%`, transition:'width 1.8s cubic-bezier(0.4,0,0.2,1)' }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:9, color:'rgba(255,255,255,0.38)' }}>
        <span>{ventes.toLocaleString('fr-FR')} FCFA</span>
        <span>{objectif.toLocaleString('fr-FR')} FCFA</span>
      </div>
    </>
  );
}

function MarchandAccueilInner({ onSwitchToAdvanced }: { onSwitchToAdvanced: () => void }) {
  const navigate = useNavigate();
  const { lang, setLang } = useLangPref();
  const [showLangModal, setShowLangModal] = useState(false);
  const { user, speak, currentSession, getTodayStats, reloadTransactions, setIsModalOpen } = useApp();
  const [statsVersion, setStatsVersion] = useState(0);
  const stats = getTodayStats();

  useEffect(() => {
    const unsub = eventBus.subscribe(EVENTS.CAISSE_VENTE, () => {
      reloadTransactions()
        .then(() => setStatsVersion(v => v + 1))
        .catch((e: any) => console.warn('[MarchandAccueil] reloadTransactions failed:', e?.message));
    });
    return () => unsub?.();
  }, [reloadTransactions]);

  const sessionOpen = !!(currentSession?.opened);

  usePredictiveTTS({
    module: 'dashboard',
    sessionOpen,
    hasVentes: (stats?.ventes || 0) > 0,
    prenom: user?.firstName || user?.prenoms || 'ma chère',
    recentIntents: [],
  });

  const prenom = user?.firstName || user?.prenoms || user?.prenom || user?.nom || 'toi';

  const [soldeVisible, setSoldeVisible] = useState(false);
  const [showAllMods, setShowAllMods] = useState(false);
  const [showOpenDayModal, setShowOpenDayModal] = useState(false);
  const [showVenteVocaleModal, setShowVenteVocaleModal] = useState(false);
  const [showObjectifModal, setShowObjectifModal] = useState(false);
  const [showRapportModal, setShowRapportModal] = useState(false);
  const [showRaccourcisModal, setShowRaccourcisModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [showCloseDayModal, setShowCloseDayModal] = useState(false);
  const [showEditFondModal, setShowEditFondModal] = useState(false);
  const [showStatsVentesModal, setShowStatsVentesModal] = useState(false);
  const [showStatsMargeModal, setShowStatsMargeModal] = useState(false);

  useEffect(() => {
    const isAnyModalOpen = showLangModal || showOpenDayModal || showVenteVocaleModal ||
                          showObjectifModal || showRapportModal || showRaccourcisModal ||
                          showScoreModal || showResumeModal || showCloseDayModal ||
                          showEditFondModal || showStatsVentesModal || showStatsMargeModal;
    setIsModalOpen(isAnyModalOpen);
    return () => setIsModalOpen(false);
  }, [showLangModal, showOpenDayModal, showVenteVocaleModal, showObjectifModal,
      showRapportModal, showRaccourcisModal, showScoreModal, showResumeModal,
      showCloseDayModal, showEditFondModal, showStatsVentesModal, showStatsMargeModal,
      setIsModalOpen]);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [navVisible, setNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const currentY = el.scrollTop;
      if (currentY > lastScrollY.current + 8) setNavVisible(false);
      else if (currentY < lastScrollY.current - 8) setNavVisible(true);
      lastScrollY.current = currentY;
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const { matchRaccourci } = useRaccourcis();
  const { fetchRapport } = useRapportHebdo();
  const { objectif, progression } = useObjectif();

  const caisse = stats.caisse || 0;
  const ventes = stats.ventes || 0;
  const cahier = stats.cahier || 0;

  const showToast = (msg: string) => { setToastMsg(msg); setTimeout(() => setToastMsg(null), 2500); };

  const goMod = (id: string, path: string | null) => {
    if (id === 'rapport') { setShowRapportModal(true); return; }
    if (id === 'score') { setShowScoreModal(true); return; }
    if (id === 'raccourcis') { setShowRaccourcisModal(true); return; }
    if (!sessionOpen && !MODULES_SANS_SESSION.includes(id) && id !== 'aide') { showToast("Ouvre d'abord ta journée"); return; }
    if (path) navigate(path);
  };

  const allMods = [...MODS_MAIN, ...MODS_EXTRA];

  return (
    <>
      <NotificationsPanel
        userId={user?.id || ''}
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        accentColor={ROLE_COLORS.marchand}
        userRole="marchand"
      />
      <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', fontFamily:'Plus Jakarta Sans, system-ui, sans-serif', background: BG }}>

        {/* ── HERO ── */}
        <div style={{ background: `linear-gradient(160deg, ${P} 0%, #8f4418 100%)`, padding:'0 16px 22px', position:'relative', overflow:'hidden' }}>
          {/* Cercles décoratifs */}
          <div style={{ position:'absolute', width:260, height:260, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,255,255,0.07) 0%,transparent 70%)', top:-80, right:-50, pointerEvents:'none' }} />
          <div style={{ position:'absolute', width:160, height:160, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,160,60,0.1) 0%,transparent 70%)', bottom:-20, left:-30, pointerEvents:'none' }} />

          {/* Safe area */}
          <div style={{ height:16 }} />

          {/* TOP BAR : profil | prénom centré | cloche + drapeau */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, position:'relative', zIndex:1 }}>
            <motion.button whileTap={{ scale:0.9 }} onClick={() => navigate('/marchand/profil')}
              style={{ width:40, height:40, borderRadius:13, background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.28)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
            </motion.button>

            <div style={{ position:'absolute', left:'50%', transform:'translateX(-50%)', textAlign:'center', whiteSpace:'nowrap' }}>
              <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.65)', letterSpacing:'0.08em', marginBottom:1 }}>Bonjour</div>
              <div style={{ fontSize:22, fontWeight:900, color:'#fff', letterSpacing:'-0.5px', lineHeight:1 }}>{prenom}</div>
            </div>

            <div style={{ display:'flex', gap:7, flexShrink:0 }}>
              <NotifBellButton
                userId={user?.id || ''}
                accentColor={ROLE_COLORS.marchand}
                variant="ghost"
                onOpen={() => setShowNotifications(true)}
              />
              <motion.button whileTap={{ scale:0.9 }} onClick={() => setShowLangModal(true)}
                style={{ width:40, height:40, borderRadius:13, background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.28)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                <span style={{ fontSize:18, lineHeight:1 }}>{LANG_FLAGS[lang as keyof typeof LANG_FLAGS] || '🇫🇷'}</span>
              </motion.button>
            </div>
          </div>

          {/* CAISSE CARD */}
          <div style={{ background:'rgba(255,255,255,0.13)', border:'1.5px solid rgba(255,255,255,0.25)', borderRadius:20, padding:'14px 16px', position:'relative', zIndex:1 }}>

            {/* Ligne 1 : label + badge Journée ouverte */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.6)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Caisse du jour</span>
              {sessionOpen ? (
                <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:'rgba(74,222,128,0.14)', border:'1px solid rgba(74,222,128,0.3)', borderRadius:20, padding:'3px 10px' }}>
                  <motion.div style={{ width:6, height:6, background:'#4ade80', borderRadius:'50%' }} animate={{ opacity:[1,0.4,1] }} transition={{ duration:2, repeat:Infinity }} />
                  <span style={{ fontSize:10, fontWeight:700, color:'#4ade80' }}>Journée ouverte</span>
                </div>
              ) : (
                <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.25)', borderRadius:20, padding:'3px 10px' }}>
                  <div style={{ width:6, height:6, background:'rgba(255,255,255,0.6)', borderRadius:'50%' }} />
                  <span style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.8)' }}>Journée fermée</span>
                </div>
              )}
            </div>

            {/* Ligne 2 : montant + FCFA + œil */}
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10 }}>
              <span style={{ fontSize:38, fontWeight:800, color:'#fff', letterSpacing:'-2px', lineHeight:1 }}>
                {soldeVisible && sessionOpen ? <CountUp value={caisse} /> : '●●●●●'}
              </span>
              <span style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.6)', alignSelf:'flex-end', marginBottom:4 }}>FCFA</span>
              <motion.button whileTap={{ scale:0.9 }} onClick={() => setSoldeVisible(v => !v)}
                style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                {soldeVisible
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                }
              </motion.button>
            </div>

            {/* Objectif / bouton ouvrir */}
            {sessionOpen ? (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {objectif > 0 ? (
                  <ObjBar progression={progression} objectif={objectif} ventes={ventes} />
                ) : (
                  <motion.button whileTap={{ scale:0.97 }} onClick={() => setShowObjectifModal(true)}
                    style={{ width:'100%', background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.15)', borderRadius:12, padding:'9px 14px', cursor:'pointer', textAlign:'center', fontFamily:'inherit' }}>
                    <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.55)' }}>Fixer mon objectif du jour</span>
                  </motion.button>
                )}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                  <motion.button
                    whileTap={{ scale:0.97 }}
                    onClick={() => setShowEditFondModal(true)}
                    style={{
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      gap:6,
                      padding:'9px 10px',
                      borderRadius:12,
                      border:'1px solid rgba(255,255,255,0.3)',
                      background:'rgba(255,255,255,0.12)',
                      color:'#fff',
                      cursor:'pointer',
                      fontSize:11,
                      fontWeight:700,
                      fontFamily:'inherit',
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                    </svg>
                    Modifier le fond
                  </motion.button>
                  <motion.button
                    whileTap={{ scale:0.97 }}
                    onClick={() => setShowCloseDayModal(true)}
                    style={{
                      display:'flex',
                      alignItems:'center',
                      justifyContent:'center',
                      gap:6,
                      padding:'9px 10px',
                      borderRadius:12,
                      border:'1px solid rgba(248,113,113,0.6)',
                      background:'rgba(239,68,68,0.18)',
                      color:'#FECACA',
                      cursor:'pointer',
                      fontSize:11,
                      fontWeight:700,
                      fontFamily:'inherit',
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="m15 9-6 6" />
                      <path d="m9 9 6 6" />
                    </svg>
                    Fermer la caisse
                  </motion.button>
                </div>
              </div>
            ) : (
              <motion.button whileTap={{ scale:0.95 }} onClick={() => setShowOpenDayModal(true)}
                style={{ width:'100%', background:'#fff', border:'none', borderRadius:14, padding:12, cursor:'pointer', fontWeight:800, fontSize:14, color:P, fontFamily:'inherit' }}>
                Ouvrir ma journée
              </motion.button>
            )}
          </div>
        </div>

        {/* ── BODY ── */}
        <div ref={scrollRef} style={{ flex:1, overflowY:'auto', overflowX:'hidden' }}>
          <div style={{ padding:'16px 14px 0' }}>

            {/* PARLER / ECRIRE */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>

              {/* PARLER */}
              <motion.button whileTap={{ scale:0.96 }}
                onClick={() => { if (!sessionOpen) { showToast("Ouvre d'abord ta journée"); return; } setShowVenteVocaleModal(true); }}
                style={{ background: `linear-gradient(145deg, ${P}, #8f4418)`, borderRadius:18, padding:'24px 12px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:8, cursor:'pointer', border:'none', fontFamily:'inherit', position:'relative', overflow:'hidden' }}>
                {/* Shimmer ponctuel */}
                <motion.div style={{ position:'absolute', top:0, left:0, width:'45%', height:'100%', background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.28),transparent)', pointerEvents:'none' }}
                  animate={{ x:['-130%','-130%','-130%','280%'], skewX:[-20,-20,-20,-20], opacity:[0,0,1,0] }}
                  transition={{ duration:4, repeat:Infinity, ease:'linear', times:[0,0.68,0.70,1] }} />
                {/* Halo pulsant */}
                <motion.div style={{ position:'absolute', top:-15, left:-15, width:80, height:80, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,200,100,0.3),transparent 70%)', pointerEvents:'none' }}
                  animate={{ scale:[1,1.2,1], opacity:[0.15,0.35,0.15] }}
                  transition={{ duration:2.8, repeat:Infinity, ease:'easeInOut' }} />
                <motion.img src={TATA_BLEU} alt="Tata Lou"
                  style={{ width:96, height:96, objectFit:'contain', filter:'drop-shadow(0 4px 12px rgba(0,0,0,0.3))', position:'relative', zIndex:1 }}
                  animate={{ y:[0,-4,0] }} transition={{ duration:2.5, repeat:Infinity, ease:'easeInOut' }} />
                <span style={{ fontSize:12, fontWeight:700, color:'white', letterSpacing:'0.5px', position:'relative', zIndex:1 }}>Parler pour vendre</span>
              </motion.button>

              {/* ECRIRE */}
              <motion.button whileTap={{ scale:0.96 }}
                onClick={() => { if (!sessionOpen) { showToast("Ouvre d'abord ta journée"); return; } navigate('/marchand/caisse'); }}
                style={{ background:'rgba(255,255,255,0.75)', backdropFilter:'blur(12px)', WebkitBackdropFilter:'blur(12px)', border:'1.5px solid rgba(198,100,44,0.35)', borderRadius:18, padding:'24px 12px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:8, cursor:'pointer', fontFamily:'inherit', position:'relative', overflow:'hidden', boxShadow:'0 4px 20px rgba(175,91,35,0.12), inset 0 0 0 1px rgba(198,100,44,0.15)' }}>
                {/* Shimmer ponctuel */}
                <motion.div style={{ position:'absolute', top:0, left:0, width:'38%', height:'100%', background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.45),transparent)', pointerEvents:'none' }}
                  animate={{ x:['-130%','-130%','-130%','280%'], opacity:[0,0,1,0] }}
                  transition={{ duration:5, repeat:Infinity, ease:'linear', times:[0,0.72,0.74,1], delay:1.5 }} />
                {/* Halo pulsant */}
                <motion.div style={{ position:'absolute', top:-15, right:-10, width:75, height:75, borderRadius:'50%', background:`radial-gradient(circle,rgba(175,91,35,0.2),transparent 70%)`, pointerEvents:'none' }}
                  animate={{ scale:[1,1.25,1], opacity:[0.12,0.3,0.12] }}
                  transition={{ duration:3.2, repeat:Infinity, ease:'easeInOut', delay:0.8 }} />
                <motion.img src={TATA_ORANGE} alt="Tata Lou"
                  style={{ width:96, height:96, objectFit:'contain', filter:`drop-shadow(0 4px 12px rgba(175,91,35,0.25))`, position:'relative', zIndex:1 }}
                  animate={{ y:[0,-4,0] }} transition={{ duration:2.5, repeat:Infinity, ease:'easeInOut', delay:0.4 }} />
                <span style={{ fontSize:12, fontWeight:700, color:P, letterSpacing:'0.5px', position:'relative', zIndex:1 }}>Saisir pour vendre</span>
              </motion.button>
            </div>

            {/* MODULES */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
              <span style={{ fontSize:10, fontWeight:700, color:'#b8937a', textTransform:'uppercase', letterSpacing:'0.12em' }}>Mes modules</span>
              <motion.button whileTap={{ scale:0.95 }} onClick={() => setShowAllMods(v => !v)}
                style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, color:P, fontFamily:'inherit', display:'flex', alignItems:'center', gap:3 }}>
                {showAllMods ? 'Voir moins' : 'Voir plus'}
                <motion.span animate={{ rotate: showAllMods ? 180 : 0 }} transition={{ duration:0.3 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2.5" strokeLinecap="round"><path d="M6 9l6 6 6-6"/></svg>
                </motion.span>
              </motion.button>
            </div>

            {/* Grille modules — 3 par ligne */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:8 }}>
              {MODS_MAIN.map((m, i) => (
                <motion.button key={m.id} whileTap={{ scale:0.93 }} onClick={() => goMod(m.id, m.path)}
                  style={{ borderRadius:14, overflow:'hidden', border:'1px solid rgba(255,255,255,0.35)', cursor:'pointer', padding:0, fontFamily:'inherit', position:'relative', height:140 }}>
                  <img src={MOD_IMAGES[m.id]} alt={m.label} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                  {/* Gradient overlay */}
                  <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.04) 30%,rgba(0,0,0,0.58) 100%)' }} />
                  {/* Halo */}
                  <div style={{ position:'absolute', top:4, left:4, width:36, height:36, borderRadius:'50%', background:'radial-gradient(circle,rgba(255,255,255,0.18),transparent 70%)', pointerEvents:'none' }} />
                  {/* Shimmer ponctuel — angle + délai uniques par carte */}
                  <motion.div style={{ position:'absolute', top:0, left:0, width: i===0 ? '42%' : i===1 ? '35%' : '48%', height:'100%', background:'linear-gradient(90deg,transparent,rgba(255,255,255,0.32),transparent)', pointerEvents:'none' }}
                    animate={{ x:['-130%','-130%','-130%','280%'], opacity:[0,0,1,0] }}
                    transition={{ duration: i===0 ? 3.8 : i===1 ? 4.4 : 5, repeat:Infinity, ease:'linear', times:[0,0.65,0.67,1], delay: i*0.4 }} />
                  <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'7px 6px', textAlign:'center' }}>
                    <span style={{ fontSize:13, fontWeight:800, color:'white', textShadow:'0 1px 4px rgba(0,0,0,0.5)' }}>{m.label}</span>
                  </div>
                </motion.button>
              ))}
            </div>

            <AnimatePresence>
              {showAllMods && (
                <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} style={{ overflow:'hidden' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:16 }}>
                    {MODS_EXTRA.map((m) => (
                      <motion.button key={m.id} whileTap={{ scale:0.93 }} onClick={() => goMod(m.id, m.path)}
                        style={{ borderRadius:14, overflow:'hidden', border:'1px solid rgba(198,100,44,0.25)', cursor:'pointer', padding:0, fontFamily:'inherit', position:'relative', height:128, background:'#fff' }}>
                        <img src={MOD_IMAGES[m.id] || MOD_IMAGES.raccourcis} alt={m.label} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
                        <div style={{ position:'absolute', inset:0, background:'linear-gradient(to bottom,rgba(0,0,0,0.02) 30%,rgba(0,0,0,0.55) 100%)' }} />
                        <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'7px 6px', textAlign:'center' }}>
                          <span style={{ fontSize:12, fontWeight:800, color:'white', textShadow:'0 1px 4px rgba(0,0,0,0.5)' }}>{m.label}</span>
                        </div>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ background:'white', borderRadius:20, border:'1.5px solid #EDE7DE', padding:16, marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <span style={{ fontSize:13, fontWeight:700, color:'#1a1206' }}>Résumé du jour</span>
                <motion.button whileTap={{ scale:0.95 }} onClick={() => setShowResumeModal(true)}
                  style={{ background:'none', border:'none', fontSize:12, fontWeight:700, color:P, cursor:'pointer', fontFamily:'inherit' }}>
                  Détails
                </motion.button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <motion.button whileTap={{ scale:0.97 }} onClick={() => setShowStatsVentesModal(true)}
                  style={{ background:'#f0faf4', border:'1.5px solid #a7f3c4', borderRadius:16, padding:'16px 12px', display:'flex', flexDirection:'column', alignItems:'center', gap:4, cursor:'pointer', fontFamily:'inherit' }}>
                  <span style={{ fontSize:11, fontWeight:800, color:'#16a34a', textTransform:'uppercase', letterSpacing:'0.1em' }}>Ventes</span>
                  <span style={{ fontSize:36, fontWeight:800, color:'#16a34a', lineHeight:1 }}><CountUp value={ventes} /></span>
                  <span style={{ fontSize:11, fontWeight:600, color:'#86efac' }}>FCFA</span>
                </motion.button>
                <motion.button whileTap={{ scale:0.97 }} onClick={() => setShowStatsMargeModal(true)}
                  style={{ background:'#fef2f2', border:'1.5px solid #fca5a5', borderRadius:16, padding:'16px 12px', display:'flex', flexDirection:'column', alignItems:'center', gap:4, cursor:'pointer', fontFamily:'inherit' }}>
                  <span style={{ fontSize:11, fontWeight:800, color:'#dc2626', textTransform:'uppercase', letterSpacing:'0.1em' }}>Dépenses</span>
                  <span style={{ fontSize:36, fontWeight:800, color:'#dc2626', lineHeight:1 }}><CountUp value={cahier} /></span>
                  <span style={{ fontSize:11, fontWeight:600, color:'#fca5a5' }}>FCFA</span>
                </motion.button>
              </div>
            </div>

            <motion.button whileTap={{ scale:0.97 }} onClick={onSwitchToAdvanced}
              style={{ width:'100%', padding:'14px', borderRadius:20, border:'2px solid #EDE7DE', background:'white', fontSize:13, fontWeight:700, color:P, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontFamily:'inherit', marginBottom:120 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg>
              Vue avancée
            </motion.button>
          </div>
        </div>

        <AnimatePresence>
          {toastMsg && (
            <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:20 }}
              style={{ position:'fixed', bottom:112, left:'50%', transform:'translateX(-50%)', zIndex:50, padding:'10px 20px', borderRadius:20, background:`linear-gradient(135deg,${P},#8f4418)`, color:'#fff', fontSize:13, fontWeight:700, whiteSpace:'nowrap', boxShadow:'0 4px 20px rgba(175,91,35,0.4)' }}>
              {toastMsg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>


      <OpenDayModal isOpen={showOpenDayModal} onClose={() => setShowOpenDayModal(false)} />
      <EditFondModal isOpen={showEditFondModal} onClose={() => setShowEditFondModal(false)} currentFond={currentSession?.fondInitial || 0} />
      <CloseDayModal isOpen={showCloseDayModal} onClose={() => setShowCloseDayModal(false)} stats={stats} />
      <StatsVentesModal isOpen={showStatsVentesModal} onClose={() => setShowStatsVentesModal(false)} montant={stats.ventes} />
      <StatsMargeModal isOpen={showStatsMargeModal} onClose={() => setShowStatsMargeModal(false)} marge={stats.ventes - stats.cahier} />
      <ScoreModal isOpen={showScoreModal} onClose={() => setShowScoreModal(false)} />
      <ResumeModal isOpen={showResumeModal} onClose={() => setShowResumeModal(false)} stats={stats} />
      <VenteVocaleModal isOpen={showVenteVocaleModal} onClose={() => setShowVenteVocaleModal(false)} />
      <ObjectifModal isOpen={showObjectifModal} onClose={() => setShowObjectifModal(false)} />
      <RapportHebdoModal isOpen={showRapportModal} onClose={() => setShowRapportModal(false)} />
      <RaccourcisModal isOpen={showRaccourcisModal} onClose={() => setShowRaccourcisModal(false)} />

      {showLangModal && (
        <div style={{ position:'fixed', inset:0, zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', padding:'0 16px', background:'rgba(0,0,0,0.72)', backdropFilter:'blur(8px)' }}
          onClick={() => setShowLangModal(false)}>
          <div style={{ background:'#fff', borderRadius:28, width:'100%', maxWidth:400, overflow:'hidden' }} onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div style={{ width:40, height:4, borderRadius:2, background:'#E5E5E5', margin:'14px auto 0' }} />
            <div style={{ padding:'18px 22px 16px', display:'flex', alignItems:'flex-start', gap:14 }}>
              <img src={TATA_BLEU} style={{ width:62, height:62, objectFit:'contain', flexShrink:0, marginTop:-4 }} alt="Tata Lou" />
              <div style={{ flex:1 }}>
                <p style={{ fontSize:20, fontWeight:700, color:'#111', letterSpacing:'-0.3px', lineHeight:1.2, margin:0 }}>Langue de Tata Lou</p>
                <p style={{ fontSize:13, color:'#999', marginTop:4, lineHeight:1.4, margin:'4px 0 0' }}>Dans quelle langue tu veux me parler aujourd&apos;hui ?</p>
              </div>
              <button type="button" onClick={() => setShowLangModal(false)}
                style={{ width:30, height:30, borderRadius:'50%', background:'#F2F2F2', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:2, border:'none', cursor:'pointer' }}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><line x1="1" y1="1" x2="9" y2="9" stroke="#888" strokeWidth="1.6" strokeLinecap="round"/><line x1="9" y1="1" x2="1" y2="9" stroke="#888" strokeWidth="1.6" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div style={{ padding:'0 16px 28px', display:'flex', flexDirection:'column', gap:10 }}>
              {(['french','dioula','bambara'] as const).map(id => {
                const isActive = lang === id;
                const phrases: Record<string,string> = { french:'"Bonjour, comment ça va ?"', dioula:'"I ni ce — bonjour !"', bambara:'"I ni sogoma — bonjour !"' };
                return (
                  <button key={id} type="button" onClick={() => { setLang(id); setShowLangModal(false); }}
                    style={{ width:'100%', display:'flex', alignItems:'center', gap:14, padding:'14px 16px', borderRadius:18, cursor:'pointer', textAlign:'left', background: isActive ? '#8B3A0F' : '#F8F8F8', border: isActive ? 'none' : '1px solid #EFEFEF', fontFamily:'inherit' }}>
                    <div style={{ width:46, height:46, borderRadius:14, flexShrink:0, background: isActive ? 'rgba(255,255,255,0.15)' : '#FFF0E6', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24 }}>
                      {LANG_FLAGS[id]}
                    </div>
                    <div style={{ flex:1 }}>
                      <p style={{ fontSize:15, fontWeight:700, color: isActive ? '#fff' : '#111', margin:0, letterSpacing:'-0.2px' }}>{LANG_LABELS[id]}</p>
                      <p style={{ fontSize:12, color: isActive ? 'rgba(255,255,255,0.55)' : '#bbb', margin:'2px 0 0', fontStyle:'italic' }}>{phrases[id]}</p>
                    </div>
                    {isActive && (
                      <div style={{ width:24, height:24, borderRadius:'50%', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <svg width="11" height="9" viewBox="0 0 11 9" fill="none"><polyline points="1,4.5 4,8 10,1" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function MarchandAccueil({ onSwitchToAdvanced }: { onSwitchToAdvanced: () => void }) {
  const { getTodayStats } = useApp();
  const stats = getTodayStats();
  return (
    <RaccourcisProvider>
      <RapportHebdoProvider>
        <ObjectifProvider ventes={stats.ventes || 0}>
          <MarchandAccueilInner onSwitchToAdvanced={onSwitchToAdvanced} />
        </ObjectifProvider>
      </RapportHebdoProvider>
    </RaccourcisProvider>
  );
}