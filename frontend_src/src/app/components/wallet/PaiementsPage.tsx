import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, Star } from 'lucide-react';

const C = '#C66A2C';
const BG = '#FFF2E9';

type CatId = 'tout' | 'factures' | 'sante' | 'education';

interface Service {
  logo: string;
  name: string;
  sub: string;
  color: string;
  cat: CatId;
}

const SERVICES: Service[] = [
  { logo: 'CNPS', name: 'CNPS',         sub: 'Cotisation sociale',     color: '#004a99', cat: 'factures'  },
  { logo: 'CMU',  name: 'CMU',          sub: 'Assurance maladie',      color: '#00874a', cat: 'factures'  },
  { logo: 'MR',   name: 'Mairie',       sub: 'Taxes municipales',      color: C,         cat: 'factures'  },
  { logo: 'CIE',  name: 'CIE',          sub: 'Électricité',            color: '#1a7abf', cat: 'factures'  },
  { logo: 'SDC',  name: 'SODECI',       sub: 'Eau potable',            color: '#1a8c5a', cat: 'factures'  },
  { logo: 'LNS',  name: 'LONASE',       sub: 'Loterie nationale',      color: '#7c3aed', cat: 'factures'  },
  { logo: 'CMU',  name: 'CMU',          sub: 'Assurance maladie',      color: '#00874a', cat: 'sante'     },
  { logo: 'PHM',  name: 'Pharmacie',    sub: 'Ordonnances en ligne',   color: '#10b981', cat: 'sante'     },
  { logo: 'CHU',  name: 'CHU Abidjan',  sub: 'Frais hospitaliers',     color: '#3b82f6', cat: 'sante'     },
  { logo: 'MED',  name: 'MedAfrique',   sub: 'Téléconsultation',       color: '#f59e0b', cat: 'sante'     },
  { logo: 'UNI',  name: 'Universités',  sub: 'Frais de scolarité',     color: '#7c3aed', cat: 'education' },
  { logo: 'LYC',  name: 'Lycées',       sub: "Frais d'inscription",    color: '#3b82f6', cat: 'education' },
  { logo: 'FPC',  name: 'Formation',    sub: 'Cours et certifications',color: '#f59e0b', cat: 'education' },
];

const FAVORIS = SERVICES.filter(s => ['CNPS', 'CMU', 'Mairie'].includes(s.name) && s.cat === 'factures');

const CATS: { id: CatId; label: string; icon: React.ReactNode }[] = [
  {
    id: 'tout',
    label: 'Tout',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>,
  },
  {
    id: 'factures',
    label: 'Factures',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>,
  },
  {
    id: 'sante',
    label: 'Santé',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  },
  {
    id: 'education',
    label: 'Éducation',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>,
  },
];

const SECTION_LABELS: Record<Exclude<CatId, 'tout'>, string> = {
  factures:  'Factures & Taxes',
  sante:     'Santé',
  education: 'Éducation',
};

export function PaiementsPage() {
  const navigate = useNavigate();
  const [activeCat, setActiveCat] = useState<CatId>('tout');
  const [search, setSearch] = useState('');
  const [modalService, setModalService] = useState<Service | null>(null);
  const [reference, setReference] = useState('');
  const [montant, setMontant] = useState('');

  const getFiltered = (cat: Exclude<CatId, 'tout'>): Service[] => {
    const base = SERVICES.filter(s => s.cat === cat);
    const seen = new Set<string>();
    return base.filter(s => {
      if (seen.has(s.name)) return false;
      seen.add(s.name);
      if (!search) return true;
      return s.name.toLowerCase().includes(search.toLowerCase()) || s.sub.toLowerCase().includes(search.toLowerCase());
    });
  };

  const sections: { label: string; items: Service[] }[] =
    activeCat === 'tout'
      ? (['factures', 'sante', 'education'] as Exclude<CatId, 'tout'>[])
          .map(cat => ({ label: SECTION_LABELS[cat], items: getFiltered(cat) }))
          .filter(s => s.items.length > 0)
      : [{ label: SECTION_LABELS[activeCat as Exclude<CatId, 'tout'>], items: getFiltered(activeCat as Exclude<CatId, 'tout'>) }];

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
            <p style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>Paiements</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>Payez vos services facilement</p>
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
            placeholder="Rechercher un service..."
            style={{ width: '100%', padding: '13px 16px 13px 44px', borderRadius: 16, border: 'none', background: 'rgba(255,255,255,0.18)', color: 'white', fontSize: 14, outline: 'none', fontFamily: 'system-ui, sans-serif' }}
          />
        </div>
      </div>

      <div style={{ padding: '20px 16px 40px' }}>

        {/* CATÉGORIES */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 20 }}>
          {CATS.map(({ id, label, icon }) => {
            const active = activeCat === id;
            return (
              <motion.button
                key={id}
                onClick={() => setActiveCat(id)}
                style={{ borderRadius: 16, padding: '12px 6px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, border: `1.5px solid ${active ? C : 'rgba(198,106,44,0.15)'}`, background: active ? `linear-gradient(135deg, ${C}, #D4824A)` : 'white', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                whileTap={{ scale: 0.93 }}
              >
                {active && (
                  <motion.div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.3) 50%, transparent 65%)' }} animate={{ x: ['-100%', '200%'] }} transition={{ duration: 2.8, repeat: Infinity }} />
                )}
                <div style={{ width: 36, height: 36, borderRadius: 11, background: active ? 'rgba(255,255,255,0.2)' : 'rgba(198,106,44,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? 'white' : C, position: 'relative', zIndex: 1 }}>
                  {icon}
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: active ? 'white' : '#7a5a3a', position: 'relative', zIndex: 1 }}>{label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* FAVORIS */}
        <p style={{ fontSize: 13, fontWeight: 700, color: C, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Star size={14} fill={C} color={C} /> Vos favoris
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 }}>
          {FAVORIS.map((s, i) => {
            const glassColors: Record<string, { bg: string; border: string; text: string }> = {
              CNPS:   { bg: 'rgba(0,74,153,0.12)',   border: 'rgba(0,74,153,0.28)',   text: '#003d80' },
              CMU:    { bg: 'rgba(0,135,74,0.12)',   border: 'rgba(0,135,74,0.28)',   text: '#005c32' },
              Mairie: { bg: 'rgba(198,106,44,0.12)', border: 'rgba(198,106,44,0.28)', text: '#8B4513' },
            };
            const g = glassColors[s.name] || { bg: 'rgba(198,106,44,0.1)', border: 'rgba(198,106,44,0.25)', text: '#8B4513' };
            const FAV_ICONS: React.ReactNode[] = [
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#004a99" strokeWidth="2.2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#005c32" strokeWidth="2.2" strokeLinecap="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#8B4513" strokeWidth="2.2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
            ];
            return (
              <motion.button
                key={s.name}
                onClick={() => setModalService(s)}
                style={{ borderRadius: 20, padding: '14px 8px 12px', cursor: 'pointer', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7, border: `1.5px solid ${g.border}`, background: g.bg, minHeight: 88 }}
                whileTap={{ scale: 0.93 }}
              >
                <motion.div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.3) 50%, transparent 65%)' }} animate={{ x: ['-100%', '200%'] }} transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.6 }} />
                <motion.div style={{ position: 'relative', zIndex: 1 }} animate={{ scale: [1, 1.15, 1.15, 1] }} transition={{ duration: 3, repeat: Infinity, delay: i * 0.6 }}>
                  {FAV_ICONS[i]}
                </motion.div>
                <span style={{ position: 'relative', zIndex: 1, fontSize: 11, fontWeight: 700, color: g.text, textAlign: 'center', lineHeight: 1.3 }}>{s.name}</span>
                <span style={{ position: 'relative', zIndex: 1, fontSize: 9, fontWeight: 500, color: '#b8956a', textAlign: 'center' }}>{s.sub}</span>
              </motion.button>
            );
          })}
        </div>

        {/* LISTE SERVICES */}
        <AnimatePresence mode="wait">
          <motion.div key={activeCat + search} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
            {sections.map(({ label, items }) => (
              <div key={label}>
                <p style={{ fontSize: 13, fontWeight: 700, color: C, marginBottom: 8 }}>{label}</p>
                <div style={{ marginBottom: 16 }}>
                  {items.map(s => (
                    <motion.div
                      key={s.name + s.cat}
                      onClick={() => setModalService(s)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 0', borderBottom: '0.5px solid rgba(198,106,44,0.1)', cursor: 'pointer' }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: 14, background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white', flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>{s.logo}</div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: '#2a1a0a' }}>{s.name}</p>
                        <p style={{ fontSize: 11, color: '#b8956a', marginTop: 1 }}>{s.sub}</p>
                      </div>
                      <ChevronRight size={16} color="#c8a882" />
                    </motion.div>
                  ))}
                  {items.length === 0 && (
                    <p style={{ fontSize: 13, color: '#b8956a', textAlign: 'center', padding: '20px 0' }}>Aucun service trouvé</p>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

      </div>

      {/* MODAL PAIEMENT */}
      <AnimatePresence>
        {modalService && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            onClick={() => { setModalService(null); setReference(''); setMontant(''); }}
          >
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              style={{ background: BG, borderRadius: '28px 28px 0 0', width: '100%', maxWidth: 480, padding: '24px 20px 36px' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ width: 40, height: 4, background: 'rgba(198,106,44,0.2)', borderRadius: 2, margin: '0 auto 20px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 48, height: 48, borderRadius: 16, background: modalService.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: 'white', boxShadow: '0 3px 10px rgba(0,0,0,0.15)' }}>{modalService.logo}</div>
                <div>
                  <p style={{ fontSize: 18, fontWeight: 800, color: '#2a1a0a' }}>{modalService.name}</p>
                  <p style={{ fontSize: 12, color: '#b8956a', marginTop: 2 }}>{modalService.sub}</p>
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#7a5a3a', marginBottom: 6 }}>Numéro de référence</p>
                <input
                  type="text"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  placeholder="Ex: 12345678"
                  style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: `1.5px solid ${reference ? C : 'rgba(198,106,44,0.2)'}`, background: 'white', fontSize: 16, color: '#2a1a0a', outline: 'none', fontFamily: 'system-ui, sans-serif', transition: 'border-color 0.2s' }}
                />
              </div>
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: '#7a5a3a', marginBottom: 6 }}>Montant (FCFA)</p>
                <input
                  type="number"
                  value={montant}
                  onChange={e => setMontant(e.target.value)}
                  placeholder="Ex: 25 000"
                  style={{ width: '100%', padding: '14px 16px', borderRadius: 14, border: `1.5px solid ${montant ? C : 'rgba(198,106,44,0.2)'}`, background: 'white', fontSize: 16, color: '#2a1a0a', outline: 'none', fontFamily: 'system-ui, sans-serif', transition: 'border-color 0.2s' }}
                />
              </div>
              <motion.button
                onClick={() => { setModalService(null); setReference(''); setMontant(''); }}
                style={{ width: '100%', padding: 16, border: 'none', borderRadius: 16, background: `linear-gradient(135deg, ${C}, #D4824A)`, color: 'white', fontSize: 16, fontWeight: 700, cursor: 'pointer', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 16px rgba(198,106,44,0.35)', marginTop: 6 }}
                whileTap={{ scale: 0.98 }}
              >
                <motion.div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.2) 50%, transparent 70%)' }} animate={{ x: ['-100%', '200%'] }} transition={{ duration: 2.5, repeat: Infinity }} />
                Payer maintenant
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
