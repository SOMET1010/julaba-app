import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Check } from 'lucide-react';

const C = '#C66A2C';
const BG = '#FFF2E9';

interface Banque {
  id: string;
  logo: string;
  name: string;
  sub: string;
  color: string;
}

const BANQUES: Banque[] = [
  { id: 'sib',   logo: 'SIB',   name: 'SIB',             sub: 'Société Ivoirienne de Banque', color: '#e8000d' },
  { id: 'eco',   logo: 'ECO',   name: 'Ecobank',          sub: 'Réseau panafricain',           color: '#003087' },
  { id: 'uba',   logo: 'UBA',   name: 'UBA',              sub: 'United Bank for Africa',       color: '#e2001a' },
  { id: 'vs',    logo: 'VS',    name: 'Versus Bank',      sub: 'Banque ivoirienne',            color: '#0057a8' },
  { id: 'sg',    logo: 'SG',    name: 'Société Générale', sub: 'Banque internationale',        color: '#e60028' },
  { id: 'biao',  logo: 'BIAO',  name: 'BIAO-CI',          sub: 'Banque Internationale',        color: '#00447c' },
  { id: 'bni',   logo: 'BNI',   name: 'BNI',              sub: "Banque Nationale d'Invest.",   color: '#006633' },
  { id: 'sgbci', logo: 'SGBCI', name: 'SGBCI',            sub: 'Société Générale CI',          color: '#c8102e' },
  { id: 'nsia',  logo: 'NSIA',  name: 'NSIA Banque',      sub: 'Groupe NSIA',                  color: '#f77f00' },
];

// Icône cloche SVG animée
function BellIcon({ ringing }: { ringing: boolean }) {
  return (
    <motion.svg
      width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
      animate={ringing ? { rotate: [0, 18, -16, 14, -10, 6, 0] } : { rotate: 0 }}
      transition={ringing ? { duration: 1.8, repeat: Infinity, repeatDelay: 0.5 } : {}}
      style={{ transformOrigin: 'top center', display: 'inline-block' }}
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
      <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </motion.svg>
  );
}

export function BanquePage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [notified, setNotified] = useState<Set<string>>(new Set());
  const [allNotified, setAllNotified] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const handleNotify = (id: string) => {
    if (notified.has(id)) return;
    // POST /notifications simulé — en prod: fetch('/api/notifications', { method: 'POST', body: JSON.stringify({ type: 'bank_available', bankId: id }) })
    const next = new Set(notified);
    next.add(id);
    setNotified(next);
    if (next.size === BANQUES.length) setAllNotified(true);
    showToast('✓ Vous serez avertie dès que cette banque est disponible');
  };

  const handleNotifyAll = () => {
    if (allNotified) return;
    const all = new Set(BANQUES.map(b => b.id));
    setNotified(all);
    setAllNotified(true);
    showToast('✓ Alertes activées pour toutes les banques');
  };

  const filtered = BANQUES.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.sub.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: BG }}>

      {/* HEADER */}
      <div style={{ background: C, padding: '22px 20px 28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '50%', background: 'linear-gradient(to bottom, rgba(255,255,255,0.1), transparent)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1, marginBottom: 16 }}>
          <motion.button
            onClick={() => navigate(-1)}
            style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            whileTap={{ scale: 0.9 }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="white" strokeWidth="2.5"><polyline points="15 18 9 12 15 6"/></svg>
          </motion.button>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>Lier ma banque</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>Connectez votre compte bancaire</p>
          </div>
          <div style={{ width: 38 }} />
        </div>

        {/* Recherche */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher votre banque..."
            style={{ width: '100%', padding: '13px 16px 13px 44px', borderRadius: 16, border: 'none', background: 'rgba(255,255,255,0.18)', color: 'white', fontSize: 14, outline: 'none', fontFamily: 'system-ui, sans-serif' }}
          />
        </div>
      </div>

      <div style={{ padding: '20px 16px 40px' }}>

        {/* BANNIÈRE */}
        <div style={{ borderRadius: 20, padding: 16, marginBottom: 20, background: 'rgba(198,106,44,0.08)', border: '1.5px solid rgba(198,106,44,0.2)', display: 'flex', alignItems: 'center', gap: 12, position: 'relative', overflow: 'hidden' }}>
          <motion.div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.4) 50%, transparent 65%)' }} animate={{ x: ['-100%', '200%'] }} transition={{ duration: 3, repeat: Infinity }} />
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(198,106,44,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative', zIndex: 1 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#2a1a0a' }}>Fonctionnalité en cours de déploiement</p>
            <p style={{ fontSize: 11, color: '#b8956a', marginTop: 2, lineHeight: 1.4 }}>Bientôt vous pourrez lier votre compte bancaire directement à Keiwa.</p>
          </div>
        </div>

        {/* BANQUE LIÉE */}
        <p style={{ fontSize: 13, fontWeight: 700, color: C, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          Banque liée
        </p>
        <div style={{ background: 'white', borderRadius: 18, padding: '14px 16px', border: '1.5px solid rgba(16,185,129,0.25)', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
          <motion.div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.5) 50%, transparent 65%)' }} animate={{ x: ['-100%', '200%'] }} transition={{ duration: 3, repeat: Infinity }} />
          <div style={{ width: 44, height: 44, borderRadius: 14, background: '#004a99', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.12)', position: 'relative', zIndex: 1 }}>BICICI</div>
          <div style={{ flex: 1, position: 'relative', zIndex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#2a1a0a' }}>BICICI</p>
            <p style={{ fontSize: 11, color: '#b8956a', marginTop: 1 }}>CI•• •••• •••• 4892</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
              <motion.div
                style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80' }}
                animate={{ boxShadow: ['0 0 0 0 rgba(74,222,128,0.5)', '0 0 0 4px rgba(74,222,128,0)'] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              />
              <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>Connectée</span>
            </div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c8a882" strokeWidth="2" style={{ position: 'relative', zIndex: 1 }}><polyline points="9 18 15 12 9 6"/></svg>
        </div>

        {/* LISTE BANQUES */}
        <p style={{ fontSize: 13, fontWeight: 700, color: C, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C} strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
          Banques disponibles
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AnimatePresence>
            {filtered.length === 0 ? (
              <p style={{ fontSize: 13, color: '#b8956a', textAlign: 'center', padding: '20px 0' }}>Aucune banque trouvée</p>
            ) : (
              filtered.map(b => {
                const isNotified = notified.has(b.id);
                return (
                  <motion.div
                    key={b.id}
                    layout
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    style={{ background: 'white', borderRadius: 18, padding: '13px 14px', border: '1px solid rgba(198,106,44,0.08)', display: 'flex', alignItems: 'center', gap: 12 }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 14, background: b.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>{b.logo}</div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: '#2a1a0a' }}>{b.name}</p>
                      <p style={{ fontSize: 11, color: '#b8956a', marginTop: 1 }}>{b.sub}</p>
                    </div>
                    <motion.button
                      onClick={() => handleNotify(b.id)}
                      style={{
                        padding: '7px 12px', borderRadius: 20,
                        border: `1.5px solid ${isNotified ? 'rgba(16,185,129,0.3)' : 'rgba(198,106,44,0.3)'}`,
                        background: isNotified ? 'rgba(16,185,129,0.1)' : 'rgba(198,106,44,0.08)',
                        color: isNotified ? '#047857' : C,
                        fontSize: 11, fontWeight: 700, cursor: isNotified ? 'default' : 'pointer',
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        flexShrink: 0, whiteSpace: 'nowrap',
                      }}
                      whileTap={isNotified ? {} : { scale: 0.95 }}
                    >
                      {isNotified
                        ? <><Check size={11} /> Averti</>
                        : <><BellIcon ringing={true} /> M'avertir</>
                      }
                    </motion.button>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>

        {/* CTA GLOBAL */}
        <div style={{ marginTop: 20 }}>
          <motion.button
            onClick={handleNotifyAll}
            style={{
              width: '100%', padding: 16, border: 'none', borderRadius: 18,
              background: allNotified
                ? 'linear-gradient(135deg, #10b981, #34d399)'
                : `linear-gradient(135deg, ${C}, #D4824A)`,
              color: 'white', fontSize: 15, fontWeight: 700, cursor: allNotified ? 'default' : 'pointer',
              position: 'relative', overflow: 'hidden',
              boxShadow: '0 4px 16px rgba(198,106,44,0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            }}
            whileTap={allNotified ? {} : { scale: 0.98 }}
          >
            <motion.div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)' }} animate={{ x: ['-100%', '200%'] }} transition={{ duration: 2.5, repeat: Infinity }} />
            <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {allNotified
                ? <><Check size={18} /> Toutes les alertes activées</>
                : <><BellIcon ringing={!allNotified} /> M'avertir pour toutes les banques</>
              }
            </span>
          </motion.button>
          <p style={{ textAlign: 'center', fontSize: 11, color: '#b8956a', marginTop: 8 }}>
            {allNotified
              ? 'Vous serez notifiée pour chaque nouvelle banque disponible'
              : 'Soyez la première informée dès qu\'une banque est disponible'}
          </p>
        </div>

      </div>

      {/* TOAST */}
      <AnimatePresence>
        {toast !== '' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{ position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)', background: '#2a1a0a', color: 'white', fontSize: 13, fontWeight: 600, padding: '10px 20px', borderRadius: 20, whiteSpace: 'nowrap', zIndex: 100 }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
