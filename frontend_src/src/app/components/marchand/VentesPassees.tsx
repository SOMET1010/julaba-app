import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ChevronDown, Search, Filter, FileDown, TrendingUp, Banknote, Package, ShoppingBag } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useApp } from '../../contexts/AppContext';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { useCountUp } from '../../hooks/useCountUp';
import { format, isToday, isYesterday } from 'date-fns';
import { fetchCredits, marquerCreditPaye, type Credit } from '../../../imports/caisse-api';
import { fr } from 'date-fns/locale';
import { exportSimplePDF, formatCurrency, formatDate } from '../../utils/export.utils';
import { partagerRecu, telechargerRecuPDF } from '../../utils/recu.utils';
import { toast } from 'sonner';
import { NotificationButton } from './NotificationButton';
import { SubPageLayout } from '../layout/SubPageLayout';
import { toast } from 'sonner';

const P = '#AF5B23';
const BG = '#FFF2E9';

// ── Label jour ────────────────────────────────────────────────
function dayLabel(date: Date): string {
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return 'Hier';
  return format(date, 'dd MMMM yyyy', { locale: fr });
}

// ── Card vente dépliable ──────────────────────────────────────
function VenteCard({ sale, index, query }: { sale: any; index: number; query: string }) {
  const [open, setOpen] = useState(false);
  const { user } = useApp();
  const marchandNom = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || (user as any)?.nom || 'Marchande';
  const montant = sale.montant || sale.price || 0;
  const marge = sale.totalMargin || 0;
  const source = sale.source || 'kassa';
  const dateObj = new Date(sale.date);

  function Highlight({ text }: { text: string }) {
    if (!query.trim()) return <>{text}</>;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return <>{parts.map((p, i) => p.toLowerCase() === query.toLowerCase()
      ? <mark key={i} style={{ background:'rgba(175,91,35,0.2)', color:P, borderRadius:3, padding:'0 2px' }}>{p}</mark>
      : p)}</>;
  }

  return (
    <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} transition={{ delay: index * 0.04 }}
      onClick={() => setOpen(v => !v)}
      style={{ background:'white', border:'1.5px solid #EDE7DE', borderRadius:16, overflow:'hidden', cursor:'pointer', marginBottom:8 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 14px' }}>
        {/* Icône */}
        <div style={{ width:46, height:46, borderRadius:14, background:'#F0FAF5', border:'1.5px solid #9fe1cb', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round">
            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 0 1-8 0"/>
          </svg>
        </div>
        {/* Infos */}
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:800, color:'#1a1206', marginBottom:5, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            <Highlight text={sale.productName || 'Vente'} />
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ fontSize:11, color:'#aaa', fontWeight:600 }}>
              {format(dateObj, 'HH:mm', { locale:fr })}
            </span>
            {/* Badge source — espacé à droite */}
            <span style={{
              marginLeft:4,
              background: source === 'vocal' ? '#EBF3FD' : '#FFF3EA',
              color: source === 'vocal' ? '#378ADD' : P,
              border: `1px solid ${source === 'vocal' ? '#b5d4f4' : '#f5d5a8'}`,
              borderRadius:6, padding:'2px 8px', fontSize:10, fontWeight:700
            }}>
              {source === 'vocal' ? 'vocal' : 'kassa'}
            </span>
          </div>
        </div>
        {/* Montant + marge */}
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontSize:17, fontWeight:900, color:'#1D9E75' }}>+{montant.toLocaleString('fr-FR')} F</div>
          {marge > 0
            ? <div style={{ fontSize:10, color:'#16a34a', marginTop:2, fontWeight:700 }}>+{marge.toLocaleString('fr-FR')} F marge</div>
            : <div style={{ fontSize:10, color:'#ccc', marginTop:2 }}>marge —</div>
          }
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration:0.25 }} style={{ display:'flex', justifyContent:'flex-end', marginTop:2 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
          </motion.div>
        </div>
      </div>
      {/* Détails dépliables */}
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.25 }} style={{ overflow:'hidden' }}>
            <div style={{ borderTop:'1px solid #f5f0eb', padding:'12px 14px', background:'#FDFAF7', display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:'#aaa', fontWeight:600 }}>Date complète</span>
                <span style={{ fontSize:12, fontWeight:700, color:'#333' }}>{format(dateObj, 'dd MMMM yyyy à HH:mm', { locale:fr })}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:'#aaa', fontWeight:600 }}>Source</span>
                <span style={{ fontSize:12, fontWeight:700, color: source==='vocal' ? '#378ADD' : P }}>{source}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:'#aaa', fontWeight:600 }}>Montant</span>
                <span style={{ fontSize:14, fontWeight:900, color:'#1D9E75' }}>{montant.toLocaleString('fr-FR')} FCFA</span>
              </div>
              {marge > 0 && (
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:12, color:'#aaa', fontWeight:600 }}>Marge</span>
                  <span style={{ fontSize:12, fontWeight:700, color:'#16a34a' }}>+{marge.toLocaleString('fr-FR')} FCFA</span>
                </div>
              )}
              {/* Reçu numérique : partager (WhatsApp) ou télécharger en PDF */}
              <div style={{ display:'flex', gap:8, marginTop:4 }}>
                <button type="button"
                  onClick={async () => {
                    const r = await partagerRecu(sale, marchandNom);
                    if (r === 'copie') toast.success('Reçu copié'); else if (r === 'echec') toast.error('Partage indisponible');
                  }}
                  style={{ flex:1, display:'inline-flex', alignItems:'center', justifyContent:'center', gap:7, padding:'11px 0', borderRadius:14, border:'none', background:'#1FA463', color:'#fff', fontWeight:800, fontSize:13, cursor:'pointer' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                  Partager le reçu
                </button>
                <button type="button"
                  onClick={() => telechargerRecuPDF(sale, marchandNom).catch(() => toast.error('Téléchargement impossible'))}
                  aria-label="Télécharger le reçu en PDF"
                  style={{ width:48, display:'grid', placeItems:'center', borderRadius:14, border:'1.5px solid #EAD9C6', background:'#fff', color:'#B85C1B', cursor:'pointer' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Composant principal ───────────────────────────────────────
export function VentesPassees() {
  const navigate = useNavigate();
  const { getSalesHistory, reloadTransactions } = useApp();
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'tous'|'vocal'|'kassa'|'credits'>('tous');
  const [credits, setCredits] = useState<Credit[]>([]);
  const [totalDu, setTotalDu] = useState(0);
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [payingIds, setPayingIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => { reloadTransactions(); }, []);

  useEffect(() => {
    if (sourceFilter === 'credits') {
      setCreditsLoading(true);
      fetchCredits()
        .then(r => { setCredits(r.credits || []); setTotalDu(r.total_du || 0); })
        .catch((err: unknown) => {
          console.error('[VentesPassees] erreur chargement crédits', err);
        })
        .finally(() => setCreditsLoading(false));
    }
  }, [sourceFilter]);

  const handleMarquerPaye = async (id: string) => {
    try {
      await marquerCreditPaye(id);
      const r = await fetchCredits();
      setCredits(r.credits || []);
      setTotalDu(r.total_du || 0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors du marquage';
      toast.error(message);
    }
  };

  const allSales = useMemo(() => getSalesHistory({}), [getSalesHistory]);

  // KPIs
  const totalVentes = useMemo(() => allSales.reduce((s, t) => s + (t.montant || t.price || 0), 0), [allSales]);
  const totalMarges = useMemo(() => allSales.reduce((s, t) => s + (t.totalMargin || 0), 0), [allSales]);
  const totalCount  = useMemo(() => allSales.length, [allSales]);
  const totalBenefices = useMemo(() => allSales.reduce((s, t) => s + (t.totalBenefice || t.totalMargin || 0), 0), [allSales]);
  const panierMoyen = totalCount > 0 ? Math.round(totalVentes / totalCount) : 0;
  const animVentes    = useCountUp(totalVentes, 1000);
  const animBenefices = useCountUp(totalBenefices, 1000);
  const animCount     = useCountUp(totalCount, 800);
  const animPanier    = useCountUp(panierMoyen, 900);

  // Filtrage
  const filtered = useMemo(() => {
    return allSales.filter(t => {
      const txt = (t.productName || '').toLowerCase();
      const matchSearch = !search.trim() || txt.includes(search.toLowerCase());
      const matchSource = sourceFilter === 'tous' || (t.source || 'kassa') === sourceFilter;
      const matchStart  = !startDate || new Date(t.date) >= new Date(startDate);
      const matchEnd    = !endDate   || new Date(t.date) <= new Date(endDate + 'T23:59:59');
      return matchSearch && matchSource && matchStart && matchEnd;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [allSales, search, sourceFilter, startDate, endDate]);

  // Grouper par jour
  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    filtered.forEach(t => {
      const d = new Date(t.date);
      const key = format(d, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return Array.from(map.entries()).map(([key, sales]) => ({
      key,
      label: dayLabel(new Date(key)),
      sales,
      total: sales.reduce((s, t) => s + (t.montant || t.price || 0), 0),
    }));
  }, [filtered]);

  const handleExport = () => {
    const rows = allSales.map(t => ({
      label: formatDate(t.date) + ' — ' + (t.productName || 'Produit'),
      value: formatCurrency(t.montant || t.price || 0),
    }));
    rows.unshift(
      { label: 'Total ventes', value: formatCurrency(totalVentes) },
      { label: 'Nombre de ventes', value: String(totalCount) },
      { label: '─────────────', value: '─────────────' },
    );
    exportSimplePDF('Historique Ventes — JÙLABA', rows, `ventes_${new Date().toISOString().split('T')[0]}`);
  };

  const SOURCE_TABS: { id:'tous'|'vocal'|'kassa'|'credits'; label:string }[] = [
    { id:'tous',    label:'Toutes' },
    { id:'vocal',   label:'Par Tata Nanti Lou' },
    { id:'kassa',   label:'Par Kassa' },
    { id:'credits', label:'Crédits' },
  ];
  const sliderIndex = SOURCE_TABS.findIndex(t => t.id === sourceFilter);
  const ventesDuJour = allSales.filter(s => new Date(s.date).toDateString() === new Date().toDateString()).length;

  return (
    <SubPageLayout
      role="marchand"
      title="Ventes passées"
      subtitle={ventesDuJour > 0 ? `${ventesDuJour} vente${ventesDuJour > 1 ? 's' : ''} aujourd'hui` : undefined}
      rightContent={
        <div style={{ display:'flex', gap:7 }}>
          <motion.button whileTap={{ scale:0.9 }} onClick={handleExport}
            style={{ width:38, height:38, borderRadius:13, background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.28)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
            <FileDown size={16} color="white" />
          </motion.button>
          <motion.button whileTap={{ scale:0.9 }} onClick={() => navigate('/marchand/alertes')}
            style={{ width:38, height:38, borderRadius:13, background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.28)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
            <span style={{ position:'absolute', top:8, right:8, width:7, height:7, background:'#FFD166', borderRadius:'50%', border:'1.5px solid #8f4418' }} />
          </motion.button>
        </div>
      }
    >

      {/* CONTENU */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px 0 100px', display:'flex', flexDirection:'column', gap:12 }}>
        {/* KPIs 2x2 avec UniversalKPI */}
        <KPIGrid cols={2}>
          <UniversalKPI
            label="Ventes FCFA"
            animatedTarget={totalVentes}
            icon={TrendingUp}
            color="#ea580c"
            bgColor="rgba(255,247,237,0.85)"
            borderColor="rgba(249,115,22,0.4)"
            iconAnimation="bounce"
            explication="C'est le total de tout l'argent que tu as encaissé sur tes ventes pendant cette période."
            details={[
              { label: 'Nombre de ventes', value: totalCount },
              { label: "Aujourd'hui", value: allSales.filter(s => new Date(s.date).toDateString() === new Date().toDateString()).reduce((a,b) => a+(b.montant||0), 0).toLocaleString('fr-FR') + ' FCFA' },
            ]}
          />
          <UniversalKPI
            label="Bénéfices FCFA"
            animatedTarget={totalBenefices}
            icon={Banknote}
            color="#2563eb"
            bgColor="rgba(239,246,255,0.85)"
            borderColor="rgba(59,130,246,0.4)"
            iconAnimation="pulse"
            explication="C'est l'argent que tu gardes après avoir payé tes fournisseurs. Si tu achètes un produit à 300 FCFA et tu le vends à 500 FCFA, ton bénéfice est 200 FCFA."
            formule="Bénéfice = Prix de vente − Prix d'achat"
            details={[
              { label: 'Total ventes', value: totalVentes.toLocaleString('fr-FR') + ' FCFA' },
              { label: 'Total achats estimé', value: (totalVentes - totalBenefices).toLocaleString('fr-FR') + ' FCFA' },
            ]}
          />
          <UniversalKPI
            label="Transactions"
            animatedTarget={totalCount}
            icon={Package}
            color="#16a34a"
            bgColor="rgba(240,253,244,0.85)"
            borderColor="rgba(34,197,94,0.4)"
            iconAnimation="spin"
            explication="C'est le nombre de fois que tu as vendu quelque chose. Chaque fois qu'une cliente paie, c'est une transaction."
            details={[
              { label: "Aujourd'hui", value: allSales.filter(s => new Date(s.date).toDateString() === new Date().toDateString()).length },
              { label: 'Cette semaine', value: allSales.filter(s => { const d = new Date(s.date); const now = new Date(); return d >= new Date(now.getFullYear(), now.getMonth(), now.getDate()-7); }).length },
            ]}
          />
          <UniversalKPI
            label="Panier moyen FCFA"
            animatedTarget={panierMoyen}
            icon={ShoppingBag}
            color="#7c3aed"
            bgColor="rgba(245,243,255,0.85)"
            borderColor="rgba(139,92,246,0.4)"
            iconAnimation="float"
            explication="C'est combien chaque cliente dépense en moyenne chez toi. Plus ce chiffre est grand, mieux c'est !"
            formule="Panier moyen = Total ventes ÷ Nombre de ventes"
            details={[
              { label: 'Total ventes', value: totalVentes.toLocaleString('fr-FR') + ' FCFA' },
              { label: 'Nombre de ventes', value: totalCount },
              { label: 'Résultat', value: panierMoyen.toLocaleString('fr-FR') + ' FCFA', color: '#7c3aed' },
            ]}
          />
        </KPIGrid>


        {/* Recherche */}
        <div style={{ background:'white', border:'1.5px solid #EDE7DE', borderRadius:14, padding:'11px 14px', display:'flex', alignItems:'center', gap:8 }}>
          <Search size={14} color="#aaa" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une vente..."
            style={{ flex:1, border:'none', outline:'none', fontSize:13, color:'#333', background:'transparent', fontFamily:'inherit' }} />
          {search && <motion.button whileTap={{ scale:0.9 }} onClick={() => setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', padding:0 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </motion.button>}
        </div>

        {/* Sélecteur iOS */}
        <div style={{ background:'white', border:'1.5px solid #EDE7DE', borderRadius:16, padding:4, display:'flex', position:'relative' }}>
          <motion.div
            style={{ position:'absolute', top:4, height:'calc(100% - 8px)', background:P, borderRadius:12, boxShadow:`0 2px 8px ${P}40` }}
            animate={{ left:`calc(${sliderIndex * 25}% + 4px)`, width:'calc(25% - 6px)' }}
            transition={{ type:'spring', stiffness:300, damping:30 }}
          />
          {SOURCE_TABS.map(t => (
            <button key={t.id} onClick={() => setSourceFilter(t.id)}
              style={{ flex:1, padding:'9px 4px', fontSize:11, fontWeight:700, color: sourceFilter===t.id ? 'white' : '#aaa', background:'none', border:'none', cursor:'pointer', position:'relative', zIndex:1, fontFamily:'inherit', transition:'color 0.2s', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Filtres avancés */}
        <div>
          <motion.button whileTap={{ scale:0.99 }} onClick={() => setShowFilters(v => !v)}
            style={{ width:'100%', background:'white', border:'1.5px solid #EDE7DE', borderRadius:14, padding:'12px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', fontFamily:'inherit' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Filter size={14} color={P} />
              <span style={{ fontSize:13, fontWeight:600, color:'#555' }}>Filtres avancés</span>
            </div>
            <motion.span animate={{ rotate: showFilters ? 180 : 0 }} transition={{ duration:0.25 }}>
              <ChevronDown size={12} color="#aaa" />
            </motion.span>
          </motion.button>
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.25 }} style={{ overflow:'hidden' }}>
                <div style={{ background:'white', border:'1.5px solid #EDE7DE', borderTop:'none', borderRadius:'0 0 14px 14px', padding:'12px 14px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:'#aaa', display:'block', marginBottom:4 }}>Date début</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                      style={{ width:'100%', border:'1.5px solid #EDE7DE', borderRadius:10, padding:'8px 10px', fontSize:12, fontFamily:'inherit', outline:'none', boxSizing:'border-box' as any }} />
                  </div>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:'#aaa', display:'block', marginBottom:4 }}>Date fin</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                      style={{ width:'100%', border:'1.5px solid #EDE7DE', borderRadius:10, padding:'8px 10px', fontSize:12, fontFamily:'inherit', outline:'none', boxSizing:'border-box' as any }} />
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

        {/* ── ONGLET CRÉDITS ── */}
        {sourceFilter === 'credits' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {/* KPI total dû */}
            <div style={{ background:'white', border:'1.5px solid #fca5a5', borderRadius:16, padding:'14px 16px', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'#ef4444', borderRadius:'2px 2px 0 0' }} />
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, color:'#aaa', textTransform:'uppercase', marginBottom:4 }}>Total dû</div>
                  <div style={{ fontSize:24, fontWeight:900, color:'#ef4444' }}>{totalDu.toLocaleString('fr-FR')} <span style={{ fontSize:12 }}>FCFA</span></div>
                  <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>{credits.filter(c => c.statut !== 'paye').length} client(s) en attente</div>
                </div>
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fca5a5" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
            </div>

            {creditsLoading && <div style={{ textAlign:'center', color:'#aaa', padding:24 }}>Chargement...</div>}

            {!creditsLoading && credits.length === 0 && (
              <div style={{ textAlign:'center', padding:'40px 0' }}>
                <div style={{ fontSize:16, fontWeight:800, color:'#333', marginBottom:8 }}>Aucun crédit en cours</div>
                <div style={{ fontSize:13, color:'#aaa' }}>Les ventes à crédit apparaîtront ici</div>
              </div>
            )}

            {!creditsLoading && credits.length > 0 && credits.map(credit => {
              const statutColor = credit.statut_calcule === 'en_retard' ? '#ef4444'
                : credit.statut_calcule === 'bientot' ? '#f59e0b'
                : credit.statut_calcule === 'paye' ? '#1D9E75'
                : '#AF5B23';
              const statutBg = credit.statut_calcule === 'en_retard' ? '#FEF2F2'
                : credit.statut_calcule === 'bientot' ? '#FFFBEB'
                : credit.statut_calcule === 'paye' ? '#F0FAF5'
                : '#FFF3EA';
              const statutLabel = credit.statut_calcule === 'en_retard' ? 'En retard'
                : credit.statut_calcule === 'bientot' ? 'Bientôt'
                : credit.statut_calcule === 'paye' ? 'Payé'
                : `${credit.jours_restants}j restants`;

              return (
                <motion.div key={credit.id} initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
                  style={{ background:'white', border:'1.5px solid #EDE7DE', borderRadius:16, overflow:'hidden' }}>
                  <div style={{ padding:'13px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:40, height:40, borderRadius:12, background:statutBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={statutColor} strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                        </div>
                        <div>
                          <div style={{ fontSize:15, fontWeight:800, color:'#1a1206' }}>{credit.client_nom}</div>
                          {credit.client_phone && <div style={{ fontSize:11, color:'#aaa' }}>{credit.client_phone}</div>}
                        </div>
                      </div>
                      <span style={{ background:statutBg, color:statutColor, border:`1px solid ${statutColor}33`, borderRadius:8, padding:'3px 10px', fontSize:10, fontWeight:700 }}>
                        {statutLabel}
                      </span>
                    </div>

                    <div style={{ background:'#f9f9f9', borderRadius:10, padding:'10px 12px', marginBottom:10 }}>
                      {(credit.articles || []).length > 0 && (
                        <div style={{ fontSize:12, color:'#aaa', marginBottom:6 }}>
                          {credit.articles.map((a:any) => `${a.nom} ×${a.quantite}`).join(' · ')}
                        </div>
                      )}
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                        <span style={{ fontSize:12, color:'#aaa' }}>Acompte versé</span>
                        <span style={{ fontSize:12, fontWeight:700, color:'#1D9E75' }}>{Number(credit.acompte).toLocaleString('fr-FR')} FCFA</span>
                      </div>
                      <div style={{ display:'flex', justifyContent:'space-between' }}>
                        <span style={{ fontSize:13, fontWeight:700, color:'#1a1206' }}>Reste dû</span>
                        <span style={{ fontSize:16, fontWeight:900, color:statutColor }}>{Number(credit.montant_restant).toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    </div>

                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <span style={{ fontSize:10, color:statutColor, fontWeight:700 }}>
                        Échéance : {format(new Date(credit.echeance), 'dd MMMM yyyy', { locale:fr })}
                      </span>
                      {credit.statut !== 'paye' && (
                        <motion.button whileTap={{ scale:0.97 }}
                          onClick={async () => {
                            if (payingIds.has(credit.id)) return;
                            setPayingIds(prev => new Set(prev).add(credit.id));
                            await handleMarquerPaye(credit.id);
                            setPayingIds(prev => { const s = new Set(prev); s.delete(credit.id); return s; });
                          }}
                          disabled={payingIds.has(credit.id)}
                          style={{ background:P, border:'none', borderRadius:10, padding:'8px 14px', fontSize:12, fontWeight:700, color:'white', cursor:'pointer', fontFamily:'inherit' }}>
                          Marquer payé
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {sourceFilter !== 'credits' && (
        <>
        {/* Liste groupée par jour */}
        {grouped.length === 0 ? (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} style={{ textAlign:'center', padding:'48px 24px' }}>
            <p style={{ fontSize:16, fontWeight:800, color:'#333', margin:'0 0 8px' }}>Aucune vente trouvée</p>
            <p style={{ fontSize:13, color:'#aaa', margin:0 }}>{search ? `Aucun résultat pour "${search}"` : 'Pas encore de ventes enregistrées'}</p>
          </motion.div>
        ) : (
          grouped.map(group => (
            <div key={group.key}>
              {/* Header jour */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:11, fontWeight:700, color:P, textTransform:'uppercase', letterSpacing:'0.1em', padding:'4px 0 8px', borderBottom:'1px solid #EDE7DE', marginBottom:8 }}>
                <span>{group.label}</span>
                <span style={{ color:'#aaa', fontWeight:600 }}>{group.sales.length} vente{group.sales.length > 1 ? 's' : ''} · {group.total.toLocaleString('fr-FR')} F</span>
              </div>
              {group.sales.map((sale, i) => <VenteCard key={sale.id || i} sale={sale} index={i} query={search} />)}
            </div>
          ))
        )}
        </>
        )}
      </div>

      {/* BOUTON BAS */}
      <div style={{ flexShrink:0, padding:'8px 14px 32px', background:BG }}>
        <motion.button whileTap={{ scale:0.97 }} onClick={() => navigate('/marchand/caisse')}
          style={{ width:'100%', background:P, color:'white', border:'none', borderRadius:20, padding:'17px 0', fontSize:16, fontWeight:800, cursor:'pointer', fontFamily:'inherit', boxShadow:`0 4px 16px ${P}55` }}>
          + Noter une vente
        </motion.button>
      </div>
    </SubPageLayout>
  );
}
