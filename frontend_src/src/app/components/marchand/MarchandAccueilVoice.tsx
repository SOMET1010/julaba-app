import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { useApp } from '../../contexts/AppContext';
import { RACC_IMG as MOD_IMAGES } from '../../assets/cloudinary-images';
import tataNantiLou from '../../../assets/images/tata-nanti-lou.png';
import { VenteVocaleModal } from './VenteVocaleModal';
import { RaccourcisProvider } from '../../contexts/RaccourcisContext';
import { RapportHebdoProvider } from '../../contexts/RapportHebdoContext';
import { ObjectifProvider } from '../../contexts/ObjectifContext';

/**
 * Accueil marchand « voix & icônes d'abord ».
 *
 * Loi Julaba : chaque chose se VOIT, s'ENTEND, se TOUCHE — presque aucun texte.
 * Un seul geste évident (VENDRE), la caisse qui se dit à voix haute, et les
 * belles icônes existantes de l'app pour le reste. La vue riche complète reste
 * accessible via « Vue avancée ».
 */
function MarchandAccueilVoiceInner({ onSwitchToAdvanced }: { onSwitchToAdvanced: () => void }) {
  const navigate = useNavigate();
  const { user, speak, getTodayStats } = useApp();
  const stats = getTodayStats();
  const caisse = stats?.caisse || 0;
  const prenom = user?.firstName || user?.prenoms || user?.prenom || user?.nom || '';

  const [soldeVisible, setSoldeVisible] = useState(true);
  const [showVente, setShowVente] = useState(false);

  const direCaisse = () => {
    if (!soldeVisible) return;
    speak(`Ta caisse : ${Math.round(caisse).toLocaleString('fr-FR')} francs`);
  };
  const bonjour = () => speak(prenom ? `Bonjour Maman ${prenom}` : 'Bonjour ma sœur');

  // Grosses tuiles : on réutilise les belles icônes déjà présentes dans l'app.
  const tuiles: Array<{ img: string; label: string; parle: string; go: () => void; teinte: string }> = [
    { img: MOD_IMAGES.marchandise, label: 'Mon stock',    parle: 'Mon stock',    go: () => navigate('/marchand/stock'),          teinte: '#0E7A47' },
    { img: MOD_IMAGES.cahier,      label: 'Mes dépenses', parle: 'Mes dépenses', go: () => navigate('/marchand/cahier'),         teinte: '#B85C1B' },
    { img: MOD_IMAGES.bilan,       label: 'Mes ventes',   parle: 'Mes ventes',   go: () => navigate('/marchand/ventes-passees'), teinte: '#2C6E9E' },
    { img: MOD_IMAGES.keiwa,       label: 'Keiwa',        parle: 'Mon argent Keiwa', go: () => navigate('/marchand/keiwa'),      teinte: '#7A3B12' },
  ];

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'radial-gradient(120% 45% at 50% -6%, rgba(219,122,44,0.12), transparent 55%), #FFFDF9',
      display: 'flex', flexDirection: 'column', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif',
      position: 'relative', overflowX: 'hidden',
    }}>
      {/* Bandeau ivoirien */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, display: 'flex', zIndex: 20 }}>
        <div style={{ flex: 1, background: '#F77F00' }} />
        <div style={{ flex: 1, background: '#FFFFFF' }} />
        <div style={{ flex: 1, background: '#009E60' }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '26px 18px 40px', boxSizing: 'border-box' }}>

        {/* En-tête : Tata + prénom + profil */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16 }}>
          <motion.img
            src={tataNantiLou} alt="Tata Nanti Lou" onClick={bonjour}
            animate={{ scale: [1, 1.03, 1] }} transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
            style={{ width: 54, height: 54, borderRadius: '50%', objectFit: 'cover', cursor: 'pointer', boxShadow: '0 6px 14px -6px rgba(184,92,27,0.5), 0 0 0 3px #fff, 0 0 0 4px rgba(219,122,44,0.25)' }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(124,98,80,0.5)' }}>Tata Nanti Lou</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#2E1B10', lineHeight: 1.1 }}>{prenom ? `Bonjour Maman ${prenom}` : 'Bonjour ma sœur'}</div>
          </div>
          <motion.button whileTap={{ scale: 0.92 }} onClick={() => navigate('/marchand/profil')} aria-label="Mon profil"
            style={{ width: 44, height: 44, borderRadius: 14, background: '#F3E7D8', color: '#8A5A34', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          </motion.button>
        </div>

        {/* Caisse — verte, se dit à voix haute */}
        <div style={{ borderRadius: 22, padding: '16px 18px', background: 'linear-gradient(150deg,#1FA463,#0E7A47)', color: '#fff', boxShadow: '0 16px 30px -16px rgba(14,122,71,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ minWidth: 0 }} onClick={direCaisse}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.85 }}>Ma caisse aujourd'hui</div>
            <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1, marginTop: 4, fontVariantNumeric: 'tabular-nums', cursor: 'pointer' }}>
              {soldeVisible ? Math.round(caisse).toLocaleString('fr-FR') : '●●●●●'}<small style={{ fontSize: 16, fontWeight: 700, opacity: 0.85 }}> F</small>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <motion.button whileTap={{ scale: 0.9 }} onClick={direCaisse} aria-label="Écouter ma caisse"
              style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#fff' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a9 9 0 0 1 0 14"/></svg>
            </motion.button>
            <motion.button whileTap={{ scale: 0.9 }} onClick={() => setSoldeVisible(v => !v)} aria-label="Cacher ou montrer"
              style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#fff' }}>
              {soldeVisible
                ? <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                : <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>}
            </motion.button>
          </div>
        </div>

        {/* GRAND VENDRE */}
        <motion.button
          whileTap={{ scale: 0.97 }} onClick={() => setShowVente(true)} aria-label="Vendre — touche et parle"
          style={{ width: '100%', boxSizing: 'border-box', marginTop: 16, borderRadius: 26, padding: '24px', border: 'none', cursor: 'pointer',
            background: 'radial-gradient(130% 130% at 30% 15%, #EE8E3C, #C55C18)', color: '#fff',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
            boxShadow: '0 24px 44px -16px rgba(184,92,27,0.7), inset 0 3px 0 rgba(255,255,255,0.35)', position: 'relative', overflow: 'hidden' }}>
          <motion.span aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 26, border: '3px solid rgba(255,255,255,0.45)' }}
            animate={{ scale: [0.99, 1.02], opacity: [0.5, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }} />
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', display: 'grid', placeItems: 'center' }}>
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M12 17v4"/></svg>
          </div>
          <span style={{ fontSize: 24, fontWeight: 800 }}>Vendre</span>
          <span style={{ fontSize: 13, opacity: 0.92 }}>Touche et parle</span>
        </motion.button>

        {/* Tuiles — belles icônes de l'app */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
          {tuiles.map((t) => (
            <motion.button key={t.label} whileTap={{ scale: 0.94 }} onClick={() => { speak(t.parle); t.go(); }}
              style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(198,100,44,0.2)', cursor: 'pointer', padding: 0, fontFamily: 'inherit', position: 'relative', height: 132, background: '#fff' }}>
              <img src={t.img} alt={t.label} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.02) 30%, rgba(0,0,0,0.55) 100%)' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '9px 8px', textAlign: 'center' }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}>{t.label}</span>
              </div>
            </motion.button>
          ))}
        </div>

        {/* Accès à la vue riche complète */}
        <button type="button" onClick={onSwitchToAdvanced}
          style={{ display: 'block', margin: '20px auto 0', background: 'none', border: 'none', fontSize: 13, fontWeight: 700, color: 'rgba(124,98,80,0.7)', borderBottom: '2px dotted rgba(124,98,80,0.4)', padding: '2px 0', cursor: 'pointer' }}>
          Vue avancée
        </button>
      </div>

      <VenteVocaleModal isOpen={showVente} onClose={() => setShowVente(false)} />
    </div>
  );
}

// La vente vocale a besoin des contextes Raccourcis / Rapport / Objectif
// (mêmes providers que l'ancien accueil).
export function MarchandAccueilVoice({ onSwitchToAdvanced }: { onSwitchToAdvanced: () => void }) {
  const { getTodayStats } = useApp();
  const stats = getTodayStats();
  return (
    <RaccourcisProvider>
      <RapportHebdoProvider>
        <ObjectifProvider ventes={stats?.ventes || 0}>
          <MarchandAccueilVoiceInner onSwitchToAdvanced={onSwitchToAdvanced} />
        </ObjectifProvider>
      </RapportHebdoProvider>
    </RaccourcisProvider>
  );
}
