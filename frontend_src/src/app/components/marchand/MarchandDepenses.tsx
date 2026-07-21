import React, { useState, useMemo, useEffect, useRef } from 'react';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { TrendingUp, ShoppingBag, Calendar, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { useApp } from '../../contexts/AppContext';
import { format } from 'date-fns';
import { eventBus, EVENTS } from '../../services/eventBus';
import { fr } from 'date-fns/locale';
import { TATA_LOU_BLEU as TATA_BLEU } from '../../assets/cloudinary-images';

const P = '#AF5B23';
const BG = '#FFF2E9';

type Period = 'today' | 'month' | 'all';

// ── Détection catégorie par mots-clés ─────────────────────────
const CAT_RULES: { id: string; label: string; keywords: string[]; color: string; bg: string; border: string; icon: React.ReactNode }[] = [
  {
    id: 'transport', label: 'Transport', color: '#AF5B23', bg: '#FFF3EA', border: '#f5d5a8',
    keywords: ['transport','yango','taxi','moto','bus','gbaka','woro','carburant','essence','uber'],
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#AF5B23" strokeWidth="2" strokeLinecap="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
  },
  {
    id: 'repas', label: 'Repas', color: '#E24B4A', bg: '#FEF3F2', border: '#fca5a5',
    keywords: ['repas','manger','nourriture','restaurant','maquis','attiéké','attieke','riz','alloco','foutou','placali','kedjenou','soupe','dejeuner','dîner','petit-dejeuner'],
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E24B4A" strokeWidth="2" strokeLinecap="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
  },
  {
    id: 'loyer', label: 'Loyer', color: '#378ADD', bg: '#F0F4FF', border: '#b5d4f4',
    keywords: ['loyer','maison','chambre','studio','logement','appartement','location','propriétaire'],
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#378ADD" strokeWidth="2" strokeLinecap="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  },
  {
    id: 'tontine', label: 'Tontine', color: '#7F77DD', bg: '#FDF4FF', border: '#cecbf6',
    keywords: ['tontine','cotisation','association','nath','tour'],
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7F77DD" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  },
  {
    id: 'sante', label: 'Santé', color: '#1D9E75', bg: '#F0FFF4', border: '#9fe1cb',
    keywords: ['sante','santé','pharmacie','médicament','medicament','docteur','médecin','medecin','hôpital','hopital','clinique','ordonnance','consultation'],
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
  },
  {
    id: 'telephone', label: 'Téléphone', color: '#C46210', bg: '#FFF8F0', border: '#f5d5a8',
    keywords: ['telephone','téléphone','credit','crédit','forfait','airtime','mtn','orange','moov','wave','recharge'],
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C46210" strokeWidth="2" strokeLinecap="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
  },
  {
    id: 'famille', label: 'Famille', color: '#E24B4A', bg: '#FFF0F0', border: '#fca5a5',
    keywords: ['famille','enfant','enfants','fils','fille','mari','femme','parent','mère','mere','père','pere','frère','frere','sœur','soeur','school','école','ecole','scolarité','scolarite'],
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#E24B4A" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  },
  {
    id: 'marchandise', label: 'Marchandise', color: '#1D9E75', bg: '#F0FAF5', border: '#9fe1cb',
    keywords: ['marchandise','stock','achat','produit','légume','legume','tomate','piment','igname','manioc','banane','riz','oignon','gombo','aubergine'],
    icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
  },
];

const CAT_AUTRE = {
  id: 'autre', label: 'Autre', color: '#888', bg: '#F5F5F5', border: '#ddd',
  icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
};

function detectCat(description: string) {
  const d = (description || '').toLowerCase();
  for (const cat of CAT_RULES) {
    if (cat.keywords.some(k => d.includes(k))) return cat;
  }
  return CAT_AUTRE;
}

// ── Surlignage recherche ──────────────────────────────────────
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <>
      {parts.map((p, i) => (
        p.toLowerCase() === query.toLowerCase()
          ? <mark key={i} style={{ background:'rgba(175,91,35,0.2)', color:P, borderRadius:3, padding:'0 2px', fontStyle:'normal' }}>{p}</mark>
          : <span key={i}>{p}</span>
      ))}
    </>
  );
}

// ── Card dépense dépliable ────────────────────────────────────
function DepenseCard({ d, index, query }: { d: any; index: number; query: string }) {
  const [open, setOpen] = useState(false);
  const cat = detectCat(d.productName || d.description || '');
  const montant = d.montant || d.price || 0;
  const dateObj = new Date(d.date);

  return (
    <motion.div
      initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: index * 0.04 }}
      onClick={() => setOpen(v => !v)}
      style={{ background:'white', border:'1.5px solid #EDE7DE', borderRadius:16, overflow:'hidden', cursor:'pointer' }}>

      {/* Ligne principale */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 14px' }}>
        <div style={{ width:46, height:46, borderRadius:14, background:cat.bg, border:`1.5px solid ${cat.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          {cat.icon}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:800, color:'#1a1206', marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            <Highlight text={d.productName || d.description || cat.label} query={query} />
          </div>
          <div style={{ fontSize:11, color:'#aaa', fontWeight:600 }}>
            {cat.label} · {format(dateObj, 'HH:mm', { locale:fr })}
          </div>
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontSize:17, fontWeight:900, color:'#ef4444' }}>-{montant.toLocaleString('fr-FR')} F</div>
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration:0.25 }} style={{ display:'flex', justifyContent:'flex-end', marginTop:2 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
          </motion.div>
        </div>
      </div>

      {/* Détails dépliables */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
            transition={{ duration:0.25, ease:[0.4,0,0.2,1] }}
            style={{ overflow:'hidden' }}>
            <div style={{ borderTop:'1px solid #f5f0eb', padding:'12px 14px', background:'#FDFAF7', display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:'#aaa', fontWeight:600 }}>Date complète</span>
                <span style={{ fontSize:12, fontWeight:700, color:'#333' }}>{format(dateObj, 'dd MMMM yyyy à HH:mm', { locale:fr })}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:'#aaa', fontWeight:600 }}>Catégorie</span>
                <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:cat.bg, border:`1px solid ${cat.border}`, borderRadius:8, padding:'3px 8px' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:cat.color }}>{cat.label}</span>
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:'#aaa', fontWeight:600 }}>Montant</span>
                <span style={{ fontSize:14, fontWeight:900, color:'#ef4444' }}>{montant.toLocaleString('fr-FR')} FCFA</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Composant principal ───────────────────────────────────────
export function MarchandDepenses() {
  const navigate = useNavigate();
  const { transactions, reloadTransactions } = useApp();
  const [period, setPeriod] = useState<Period>('today');
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const sliderRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;
    reloadTransactions();
  }, [reloadTransactions]);

  // Recharger dès qu'une transaction est créée
  useEffect(() => {
    const unsub1 = eventBus.subscribe(EVENTS.CAISSE_VENTE, () => reloadTransactions());
    const unsub2 = eventBus.subscribe(EVENTS.TRANSACTION_CREATED, () => reloadTransactions());
    return () => { unsub1?.(); unsub2?.(); };
  }, [reloadTransactions]);

  const PERIODS: { id: Period; label: string }[] = [
    { id:'today', label:"Aujourd'hui" },
    { id:'month', label:'Par Mois' },
    { id:'all',   label:'Total' },
  ];

  const sliderIndex = PERIODS.findIndex(p => p.id === period);

  // Toutes les dépenses
  const allDepenses = useMemo(() =>
    (transactions as any[])
      .filter((t: any) => t.type === 'depense')
      .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()),
  [transactions]);

  // KPIs
  const now = new Date();
  const kpiToday = useMemo(() => allDepenses.filter((t: any) => new Date(t.date).toDateString() === now.toDateString()).reduce((s: number, t: any) => s + (t.montant || t.price || 0), 0), [allDepenses]);
  const kpiMonth = useMemo(() => allDepenses.filter((t: any) => { const d = new Date(t.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((s: number, t: any) => s + (t.montant || t.price || 0), 0), [allDepenses]);
  const kpiTotal = useMemo(() => allDepenses.reduce((s: number, t: any) => s + (t.montant || t.price || 0), 0), [allDepenses]);

  // Filtrage par période
  const byPeriod = useMemo(() => {
    return allDepenses.filter((t: any) => {
      const d = new Date(t.date);
      if (period === 'today') return d.toDateString() === now.toDateString();
      if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return true;
    });
  }, [allDepenses, period]);

  // Filtrage par recherche + dates
  const depenses = useMemo(() => {
    return byPeriod.filter((t: any) => {
      const txt = (t.productName || t.description || '').toLowerCase();
      const matchSearch = !search.trim() || txt.includes(search.toLowerCase());
      const matchStart = !startDate || new Date(t.date) >= new Date(startDate);
      const matchEnd = !endDate || new Date(t.date) <= new Date(endDate + 'T23:59:59');
      return matchSearch && matchStart && matchEnd;
    });
  }, [byPeriod, search, startDate, endDate]);

  const KPI_CONFIG = [
    { id:'today' as Period, label:"Aujourd'hui", value: kpiToday, color:P, border:'#f5d5b0', trend:'+12%', up:true },
    { id:'month' as Period, label:'Par Mois',    value: kpiMonth, color:'#378ADD', border:'#b5d4f4', trend:'-5%', up:false },
    { id:'all'   as Period, label:'Total',       value: kpiTotal, color:'#1D9E75', border:'#9fe1cb', trend:'+8%', up:true },
  ];

  return (
    <div style={{ minHeight:'100vh', background:BG, fontFamily:'Plus Jakarta Sans, system-ui, sans-serif', display:'flex', flexDirection:'column' }}>

      {/* HEADER */}
      <div style={{ background:`linear-gradient(160deg,${P} 0%,#8f4418 100%)`, padding:'0 16px 18px', flexShrink:0 }}>
        <div style={{ height:16 }} />
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <motion.button whileTap={{ scale:0.9 }} onClick={() => navigate(-1)}
              style={{ width:38, height:38, borderRadius:13, background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.28)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            </motion.button>
            <span style={{ fontSize:19, fontWeight:900, color:'white', letterSpacing:'-0.3px' }}>Mes dépenses</span>
          </div>
          <motion.button whileTap={{ scale:0.9 }} onClick={() => navigate('/marchand/alertes')}
            style={{ width:38, height:38, borderRadius:13, background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.28)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <span style={{ position:'absolute', top:8, right:8, width:7, height:7, background:'#FFD166', borderRadius:'50%', border:'1.5px solid #8f4418' }} />
          </motion.button>
        </div>
      </div>

      {/* CONTENU */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px 14px 100px', display:'flex', flexDirection:'column', gap:12 }}>

        {/* KPIs 2x2 standard */}
        <KPIGrid cols={2}>
          <UniversalKPI
            label="Aujourd'hui"
            animatedTarget={kpiToday}
            suffix="FCFA"
            icon={TrendingUp}
            color="#ea580c"
            bgColor="rgba(255,247,237,0.85)"
            borderColor="rgba(249,115,22,0.4)"
            iconAnimation="bounce"
            active={period === 'today'}
            onClick={() => setPeriod('today')}
            explication="Total de toutes les dépenses que tu as faites aujourd'hui."
            details={[{ label: 'Nombre de dépenses', value: allDepenses.filter((t: any) => new Date(t.date).toDateString() === new Date().toDateString()).length }]}
          />
          <UniversalKPI
            label="Ce mois"
            animatedTarget={kpiMonth}
            suffix="FCFA"
            icon={Calendar}
            color="#2563eb"
            bgColor="rgba(239,246,255,0.85)"
            borderColor="rgba(59,130,246,0.4)"
            iconAnimation="pulse"
            active={period === 'month'}
            onClick={() => setPeriod('month')}
            explication="Total de toutes tes dépenses du mois en cours."
          />
          <UniversalKPI
            label="Total général"
            animatedTarget={kpiTotal}
            suffix="FCFA"
            icon={ShoppingBag}
            color="#16a34a"
            bgColor="rgba(240,253,244,0.85)"
            borderColor="rgba(34,197,94,0.4)"
            iconAnimation="spin"
            active={period === 'all'}
            onClick={() => setPeriod('all')}
            explication="Cumul de toutes tes dépenses depuis le début. Utile pour voir combien tu dépenses en tout."
          />
          <UniversalKPI
            label="Moy. journalière"
            animatedTarget={Math.round(kpiMonth / Math.max(new Date().getDate(), 1))}
            suffix="FCFA"
            icon={Clock}
            color="#7c3aed"
            bgColor="rgba(245,243,255,0.85)"
            borderColor="rgba(139,92,246,0.4)"
            iconAnimation="float"
            explication="Combien tu dépenses en moyenne chaque jour ce mois-ci."
            formule="Moyenne = Dépenses du mois ÷ Nombre de jours écoulés"
          />
        </KPIGrid>

        {/* Barre recherche */}
        <div style={{ background:'white', border:'1.5px solid #EDE7DE', borderRadius:14, padding:'11px 14px', display:'flex', alignItems:'center', gap:8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une dépense..."
            style={{ flex:1, border:'none', outline:'none', fontSize:13, color:'#333', background:'transparent', fontFamily:'inherit' }}
          />
          {search && (
            <motion.button whileTap={{ scale:0.9 }} onClick={() => setSearch('')}
              style={{ background:'none', border:'none', cursor:'pointer', padding:0, color:'#aaa' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </motion.button>
          )}
        </div>

        {/* Sélecteur iOS */}
        <div ref={sliderRef} style={{ background:'white', border:'1.5px solid #EDE7DE', borderRadius:16, padding:4, display:'flex', position:'relative' }}>
          <motion.div
            style={{ position:'absolute', top:4, height:'calc(100% - 8px)', background:P, borderRadius:12, boxShadow:`0 2px 8px ${P}40` }}
            animate={{ left: `calc(${sliderIndex * 33.33}% + 4px)`, width:'calc(33.33% - 3px)' }}
            transition={{ type:'spring', stiffness:300, damping:30 }}
          />
          {PERIODS.map((p, i) => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              style={{ flex:1, padding:'9px 4px', fontSize:12, fontWeight:700, color: period===p.id ? 'white' : '#aaa', background:'none', border:'none', cursor:'pointer', position:'relative', zIndex:1, fontFamily:'inherit', transition:'color 0.2s' }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Filtres avancés */}
        <div>
          <motion.button whileTap={{ scale:0.99 }} onClick={() => setShowFilters(v => !v)}
            style={{ width:'100%', background:'white', border:'1.5px solid #EDE7DE', borderRadius:14, padding:'12px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', fontFamily:'inherit' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              <span style={{ fontSize:13, fontWeight:600, color:'#555' }}>Filtres avancés</span>
            </div>
            <motion.span animate={{ rotate: showFilters ? 180 : 0 }} transition={{ duration:0.25 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </motion.span>
          </motion.button>
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.25 }} style={{ overflow:'hidden' }}>
                <div style={{ background:'white', border:'1.5px solid #EDE7DE', borderTop:'none', borderRadius:'0 0 14px 14px', padding:'12px 14px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:'#aaa', display:'block', marginBottom:4 }}>Date début</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                      style={{ width:'100%', border:'1.5px solid #EDE7DE', borderRadius:10, padding:'8px 10px', fontSize:12, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:'#aaa', display:'block', marginBottom:4 }}>Date fin</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                      style={{ width:'100%', border:'1.5px solid #EDE7DE', borderRadius:10, padding:'8px 10px', fontSize:12, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }} />
                  </div>
                  {(startDate || endDate) && (
                    <motion.button whileTap={{ scale:0.97 }} onClick={() => { setStartDate(''); setEndDate(''); }}
                      style={{ gridColumn:'1/-1', background:'#f5f0eb', border:'none', borderRadius:10, padding:'8px', fontSize:12, fontWeight:700, color:'#888', cursor:'pointer', fontFamily:'inherit' }}>
                      Réinitialiser
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Liste */}
        {depenses.length === 0 ? (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, padding:'40px 24px', textAlign:'center' }}>
            <img src={TATA_BLEU} style={{ width:120, height:120, objectFit:'contain' }} alt="Tata Nanti Lou" />
            <p style={{ fontSize:16, fontWeight:800, color:'#333', margin:0 }}>
              {search ? 'Aucune dépense trouvée' : 'Aucune dépense'}
            </p>
            <p style={{ fontSize:13, color:'#aaa', lineHeight:1.5, margin:0 }}>
              {search ? `Aucun résultat pour "${search}"` : "Note tes dépenses pour mieux gérer ton argent"}
            </p>
          </motion.div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {depenses.map((d: any, i: number) => (
              <DepenseCard key={d.id || i} d={d} index={i} query={search} />
            ))}
          </div>
        )}
      </div>

      <div style={{ position:'fixed', bottom:0, left:0, right:0, padding:'12px 14px 28px', background:`linear-gradient(to top,${BG} 70%,transparent)`, zIndex:10 }}>
        <motion.button whileTap={{ scale:0.97 }} onClick={() => navigate('/marchand/depense')}
          style={{ width:'100%', background:P, color:'white', border:'none', borderRadius:20, padding:'17px 0', fontSize:16, fontWeight:800, cursor:'pointer', fontFamily:'inherit', boxShadow:`0 4px 16px ${P}55`, letterSpacing:'-0.2px' }}>
          + Noter une dépense
        </motion.button>
      </div>
    </div>
  );
}