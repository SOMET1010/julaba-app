import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../contexts/AppContext';
import { useCaisse } from '../../contexts/CaisseContext';
import { IMG_LOGO_JULABA } from '../../assets/images';
import { BrandSignature } from '../shared/BrandSignature';
import { VenteVocaleModal } from './VenteVocaleModal';
import { PropositionReconnaissance } from '../auth/PropositionReconnaissance';
import { getConfortVisuel, setConfortVisuel, CONFORT_EVENT } from '../../utils/confortVisuel';
import { ResumeModal, CloseDayModal, EditFondModal } from './MarchandModals';
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
function MarchandAccueilVoiceInner() {
  const navigate = useNavigate();
  const { user, speak, getTodayStats, currentSession } = useApp();
  const stats = getTodayStats();
  const caisse = stats?.caisse || 0;
  const prenom = user?.firstName || user?.prenoms || user?.prenom || user?.nom || '';

  const [soldeVisible, setSoldeVisible] = useState(true);
  // Mode SOLEIL (inclusion §2.4) : un seul geste, visible sur l'accueil — pas
  // caché dans les réglages. Tout devient plus grand et plus franc.
  const [soleil, setSoleil] = useState(() => getConfortVisuel() === 'soleil');
  const basculerSoleil = () => {
    const prochain = soleil ? 'normal' : 'soleil';
    setConfortVisuel(prochain); // exclusif : allumer le soleil éteint le sombre
    setSoleil(prochain === 'soleil');
    speak(prochain === 'soleil' ? 'Mode soleil : tout est plus grand.' : 'Mode normal.');
  };
  // Le mode peut changer ailleurs (Paramètres, mode sombre auto 18h) : on se
  // resynchronise sur l'événement de l'arbitre confortVisuel.
  useEffect(() => {
    const sync = () => setSoleil(getConfortVisuel() === 'soleil');
    window.addEventListener(CONFORT_EVENT, sync);
    return () => window.removeEventListener(CONFORT_EVENT, sync);
  }, []);
  const [showVente, setShowVente] = useState(false);
  const [showResume, setShowResume] = useState(false);
  const [showClose, setShowClose] = useState(false);
  const [showEditFond, setShowEditFond] = useState(false);

  // Panier en cours (Lot 3) : accès « Nouvelle vente » + bannière de reprise.
  const { venteEnCours, cart, getTotalCart, staleCart, resumeStaleCart, discardStaleCart, clearCart } = useCaisse();
  const nbItems = cart.reduce((s, i) => s + i.quantite, 0);
  const totalPanier = getTotalCart();
  const [showNewConfirm, setShowNewConfirm] = useState(false);
  const allerCaisse = () => navigate('/marchand/caisse');

  // « Nouvelle vente » : ne JAMAIS démarrer par-dessus un panier existant sans
  // demander. Panier récent → on propose reprendre/nouvelle. Panier ancien mis de
  // côté → « Nouvelle vente » choisit implicitement de ne pas le reprendre.
  const handleNouvelleVente = () => {
    if (venteEnCours) { setShowNewConfirm(true); return; }
    if (staleCart) discardStaleCart();
    allerCaisse();
  };
  const reprendreStale = () => { resumeStaleCart(); allerCaisse(); };

  const direCaisse = () => {
    if (!soldeVisible) return;
    speak(`Ta caisse : ${Math.round(caisse).toLocaleString('fr-FR')} francs`);
  };
  const bonjour = () => speak(prenom ? `Bonjour Maman ${prenom}` : 'Bonjour ma sœur');

  // Grosses tuiles : icônes vectorielles LOCALES (marchent hors-ligne, aucune
  // dépendance réseau) + un seul libellé clair. Avant : illustrations distantes
  // (Cloudinary) avec un mot incrusté → doublon de texte ET écran vide sans réseau.
  const svg = (d: ReactNode) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{d}</svg>
  );
  const tuiles: Array<{ icon: ReactNode; label: string; parle: string; go: () => void; teinte: string }> = [
    { icon: svg(<><path d="M21 8V16a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8z"/><path d="M3.27 6.96 12 12l8.73-5.04"/><path d="M12 22V12"/></>), label: 'Mon stock',    parle: 'Mon stock',    go: () => navigate('/marchand/stock'),          teinte: '#0E7A47' },
    { icon: svg(<><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></>), label: 'Mes dépenses', parle: 'Mes dépenses', go: () => navigate('/marchand/cahier'),         teinte: '#B74725' },
    { icon: svg(<><line x1="6" y1="20" x2="6" y2="14"/><line x1="12" y1="20" x2="12" y2="9"/><line x1="18" y1="20" x2="18" y2="4"/></>), label: 'Mes ventes',   parle: 'Mes ventes',   go: () => navigate('/marchand/ventes-passees'), teinte: '#2C6E9E' },
    { icon: svg(<><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></>), label: 'Mon argent',   parle: 'Mon argent Keiwa', go: () => navigate('/marchand/keiwa'),      teinte: '#7A3B12' },
  ];

  return (
    <div className="commerce-home">
      <div>
        <div className="commerce-home-header">
          <div className="commerce-home-heading">
            <button type="button" className="commerce-brand" onClick={bonjour} aria-label="Écouter le message de bienvenue">
              <img src={IMG_LOGO_JULABA} alt="JULABA" />
              <BrandSignature />
            </button>
            <h1>{prenom ? `Bonjour Maman ${prenom}` : 'Bonjour ma sœur'}</h1>
          </div>
          <motion.button whileTap={{ scale: 0.92 }} onClick={basculerSoleil}
            aria-label={soleil ? 'Repasser en affichage normal' : 'Mode soleil — tout plus grand'}
            style={{ width: 44, height: 44, borderRadius: 14, background: soleil ? '#F5A623' : '#F5D6BD', color: soleil ? '#fff' : '#8A5A34', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>
          </motion.button>
          <motion.button whileTap={{ scale: 0.92 }} onClick={() => navigate('/marchand/profil')} aria-label="Mon profil"
            style={{ width: 44, height: 44, borderRadius: 14, background: '#F5D6BD', color: '#8A5A34', border: 'none', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          </motion.button>
        </div>

        {/* Caisse — montant réel, résumé et lecture vocale */}
        <div className="commerce-balance">
          <button type="button" style={{ minWidth: 0, cursor: 'pointer', textAlign: 'left' }} onClick={() => setShowResume(true)} aria-label="Voir le résumé du jour">
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', opacity: 0.85 }}>Ma caisse aujourd'hui</div>
            <div style={{ fontSize: 34, fontWeight: 800, lineHeight: 1, marginTop: 4, fontVariantNumeric: 'tabular-nums', cursor: 'pointer' }}>
              {soldeVisible ? Math.round(caisse).toLocaleString('fr-FR') : '●●●●●'}<small style={{ fontSize: 16, fontWeight: 700, opacity: 0.85 }}> F</small>
            </div>
          </button>
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

        {/* Bannière de reprise (Lot 3) — deux états distincts */}
        {staleCart ? (
          <div style={{ marginTop: 16, borderRadius: 18, padding: '14px 16px', background: '#FFF4E5',
            border: '1.5px solid #F0C48A', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 150 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#8A4B12' }}>Une ancienne vente a été retrouvée</div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <motion.button whileTap={{ scale: 0.95 }} onClick={reprendreStale}
                style={{ padding: '9px 16px', borderRadius: 12, border: 'none', background: '#B74725', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                Reprendre
              </motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={discardStaleCart} aria-label="Effacer l'ancienne vente"
                style={{ padding: '9px 16px', borderRadius: 12, border: '1.5px solid #E0B58A', background: '#fff', color: '#8A4B12', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                Effacer
              </motion.button>
            </div>
          </div>
        ) : venteEnCours ? (
          <motion.button whileTap={{ scale: 0.98 }} onClick={allerCaisse} aria-label="Reprendre la vente en cours"
            style={{ width: '100%', boxSizing: 'border-box', marginTop: 16, borderRadius: 18, padding: '14px 16px',
              background: '#EAF7EE', border: '1.5px solid #A8D8B9', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0E7A47' }}>Vente en cours</div>
              <div style={{ fontSize: 13, color: '#2E6B4A', fontVariantNumeric: 'tabular-nums' }}>
                {nbItems} article{nbItems > 1 ? 's' : ''} · {Math.round(totalPanier).toLocaleString('fr-FR')} F
              </div>
            </div>
            <span style={{ padding: '8px 16px', borderRadius: 12, background: '#0E7A47', color: '#fff', fontWeight: 800, fontSize: 14 }}>Reprendre</span>
          </motion.button>
        ) : null}

        {/* ACTION PRINCIPALE — Nouvelle vente (→ caisse à panier) */}
        <motion.button
          whileTap={{ scale: 0.97 }} onClick={handleNouvelleVente} aria-label="Nouvelle vente"
          className="commerce-sell">
          <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
          <span>Nouvelle vente</span>
        </motion.button>

        {/* Secondaire — vente à la voix (comportement inchangé) */}
        <motion.button
          whileTap={{ scale: 0.97 }} onClick={() => setShowVente(true)} aria-label="Vendre à la voix"
          className="commerce-voice">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M12 17v4"/></svg>
          Vendre à la voix
        </motion.button>

        {/* Tuiles — icônes vectorielles locales + un seul libellé (hors-ligne) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
          {tuiles.map((t) => (
            <motion.button key={t.label} whileTap={{ scale: 0.94 }} onClick={() => { speak(t.parle); t.go(); }}
              className="commerce-home-tile">
              <span style={{ color: 'var(--commerce-green)', display: 'grid', placeItems: 'center', flexShrink: 0 }}>
                {t.icon}
              </span>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--encre)' }}>{t.label}</span>
            </motion.button>
          ))}
        </div>

      </div>

      {/* Garde : « Nouvelle vente » alors qu'un panier récent existe (Lot 3) */}
      <AnimatePresence>
        {showNewConfirm && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/50 p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowNewConfirm(false)}
            role="dialog" aria-modal="true" aria-label="Une vente est déjà en cours"
          >
            <motion.div
              className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl"
              initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-lg font-bold text-gray-900 mb-1">Une vente est déjà en cours.</p>
              <p className="text-gray-600 mb-5">
                {nbItems} article{nbItems > 1 ? 's' : ''} · {Math.round(totalPanier).toLocaleString('fr-FR')} F.
              </p>
              <button
                type="button"
                onClick={() => { setShowNewConfirm(false); allerCaisse(); }}
                className="w-full mb-2 py-4 rounded-2xl font-bold text-white"
                style={{ background: '#0E7A47' }}
              >
                Reprendre la vente
              </button>
              <button
                type="button"
                onClick={() => { clearCart(); setShowNewConfirm(false); allerCaisse(); }}
                className="w-full mb-2 py-4 rounded-2xl border-2 border-red-200 bg-red-50 text-red-600 font-bold"
              >
                Effacer et recommencer
              </button>
              <button
                type="button"
                onClick={() => setShowNewConfirm(false)}
                className="w-full py-3 rounded-2xl text-gray-500 font-semibold"
              >
                Annuler
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <VenteVocaleModal isOpen={showVente} onClose={() => setShowVente(false)} />

      {/* Résumé du jour — ouvert en touchant la carte caisse (Phase 2).
          La clôture de journée + le fond y sont relogés (Q-C). */}
      <ResumeModal
        isOpen={showResume}
        onClose={() => setShowResume(false)}
        stats={{ ventes: stats?.ventes || 0, cahier: stats?.cahier || 0, caisse: stats?.caisse || 0, nombreVentes: stats?.nombreVentes || 0 }}
        onFermerJournee={() => { setShowResume(false); setShowClose(true); }}
        onModifierFond={() => { setShowResume(false); setShowEditFond(true); }}
      />
      <CloseDayModal
        isOpen={showClose}
        onClose={() => setShowClose(false)}
        stats={{ ventes: stats?.ventes || 0, cahier: stats?.cahier || 0, caisse: stats?.caisse || 0, nombreVentes: stats?.nombreVentes || 0 }}
      />
      <EditFondModal
        isOpen={showEditFond}
        onClose={() => setShowEditFond(false)}
        currentFond={currentSession?.fondInitial || 0}
      />

      {/* « Tata propose de me reconnaître » (lot 2) : une seule fois, juste après
          une entrée par code — Oui = le téléphone apprend à la reconnaître. */}
      <PropositionReconnaissance />
    </div>
  );
}

// La vente vocale a besoin des contextes Raccourcis / Rapport / Objectif
// (mêmes providers que l'ancien accueil).
export function MarchandAccueilVoice() {
  const { getTodayStats } = useApp();
  const stats = getTodayStats();
  return (
    <RaccourcisProvider>
      <RapportHebdoProvider>
        <ObjectifProvider ventes={stats?.ventes || 0}>
          <MarchandAccueilVoiceInner />
        </ObjectifProvider>
      </RapportHebdoProvider>
    </RaccourcisProvider>
  );
}
