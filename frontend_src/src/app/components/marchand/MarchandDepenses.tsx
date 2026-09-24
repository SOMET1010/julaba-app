import React, { useState, useMemo, useEffect, useRef } from 'react';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { TrendingUp, ShoppingBag, Calendar, Clock, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { useApp } from '../../contexts/AppContext';
import { format } from 'date-fns';
import { eventBus, EVENTS } from '../../services/eventBus';
import { fr } from 'date-fns/locale';
import TATA_BLEU from '../../../assets/images/tata-nanti-lou.png';
import { NotificationButton } from './NotificationButton';
import { SyncEchecsBanner } from './SyncEchecsBanner';
import { montantPrive, useMontantsPrives } from '../../hooks/useMontantsPrives';

const P = 'var(--commerce-action)';
const BG = 'var(--commerce-paper)';

type Period = 'today' | 'month' | 'all';

// ── LA CATÉGORIE : LUE, PLUS DEVINÉE — DEP-02 ──────────────────
//
// CE QUI ÉTAIT ICI. Une table de 8 catégories × ~15 mots-clés français, et un
// `detectCat(description)` qui cherchait ces mots dans le motif de la dépense
// pour en RECONSTRUIRE la catégorie — parce que personne ne l'avait
// enregistrée. C'est l'interdit central de ce dépôt : une information qui pèse
// sur l'argent est conservée, ou nommée perdue, jamais reconstruite en aval.
//
// ET ELLE SE TROMPAIT SUR L'ÉCRAN D'EN FACE. Le formulaire propose onze
// catégories ; cette table en connaissait neuf. « Taxe mairie » n'avait aucun
// mot-clé → « Autre ». « École » tombait sur le mot-clé `école` de FAMILLE →
// la dépense de scolarité devenait « Famille ». Deux des onze choix qu'elle
// peut toucher ne pouvaient PAS revenir tels qu'elle les avait faits.
//
// Le choix voyage maintenant jusqu'à la colonne `category`. Ici, on le lit.
// Il ne reste de l'ancienne table que ses COULEURS et ses ICÔNES — de la
// décoration, qui n'a jamais eu d'incidence sur l'argent.
import { CATEGORIES_DEPENSE, categorieDeLaDepense, type IdCategorieDepense } from '../../services/categorieDepense';

interface ApparenceCategorie { color: string; bg: string; border: string; icon: React.ReactNode }

const svg = (stroke: string, chemin: React.ReactNode): React.ReactNode => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round">{chemin}</svg>
);
const GENS = <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>;

const APPARENCE: Readonly<Record<IdCategorieDepense, ApparenceCategorie>> = {
  transport:   { color:'var(--commerce-action)', bg:'var(--commerce-orange-50)', border:'var(--color-orange-200)', icon: svg('var(--commerce-action)', <><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></>) },
  repas:       { color:'var(--herite-rouge)', bg:'var(--color-red-50)', border:'var(--color-red-300)', icon: svg('var(--herite-rouge)', <><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></>) },
  taxe_mairie: { color:'#7F77DD', bg:'#F4F3FE', border:'#cecbf6', icon: svg('#7F77DD', <><line x1="3" y1="21" x2="21" y2="21"/><line x1="5" y1="21" x2="5" y2="10"/><line x1="19" y1="21" x2="19" y2="10"/><line x1="12" y1="21" x2="12" y2="10"/><polygon points="3 10 12 3 21 10"/></>) },
  loyer:       { color:'#378ADD', bg:'var(--color-gray-100)', border:'#b5d4f4', icon: svg('#378ADD', <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>) },
  famille:     { color:'var(--herite-rouge)', bg:'var(--color-red-50)', border:'var(--color-red-300)', icon: svg('var(--herite-rouge)', GENS) },
  tontine:     { color:'#7F77DD', bg:'var(--color-purple-50)', border:'#cecbf6', icon: svg('#7F77DD', GENS) },
  sante:       { color:'var(--herite-vert-eau)', bg:'var(--color-green-50)', border:'var(--herite-vert-pale)', icon: svg('var(--herite-vert-eau)', <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>) },
  telephone:   { color:'var(--commerce-action)', bg:'var(--commerce-paper)', border:'var(--color-orange-200)', icon: svg('var(--commerce-action)', <><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></>) },
  marchandise: { color:'var(--herite-vert-eau)', bg:'var(--color-green-50)', border:'var(--herite-vert-pale)', icon: svg('var(--herite-vert-eau)', <><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></>) },
  ecole:       { color:'#378ADD', bg:'var(--color-gray-100)', border:'#b5d4f4', icon: svg('#378ADD', <><path d="M22 10L12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></>) },
  autre:       { color:'var(--herite-gris-53)', bg:'var(--muted)', border:'var(--herite-gris-87)', icon: svg('var(--herite-gris-53)', <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>) },
};

// L'APPARENCE DU « PAS NOTÉ ». Volontairement DIFFÉRENTE de celle d'« Autre » :
// une non-lectrice distingue les pastilles, pas les mots. Confondre les deux
// remettrait les deux sens sur une même donnée.
const SANS_CATEGORIE: ApparenceCategorie = {
  color:'#9A8F84', bg:'var(--caisse-ivoire)', border:'#E4DCD2',
  icon: svg('#9A8F84', <><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></>),
};

/** Ce qu'il faut pour PEINDRE une dépense — son libellé de catégorie et ses
 *  couleurs. Rien n'est déduit du texte : on lit ce qui a été enregistré. */
function apparenceDepense(d: any): ApparenceCategorie & { label: string } {
  const lue = categorieDeLaDepense(d);
  return lue.connue
    ? { ...APPARENCE[lue.id], label: lue.libelle }
    : { ...SANS_CATEGORIE, label: lue.libelle };
}

/** Les catégories vraiment présentes dans une liste — pour les filtres, si un
 *  jour on en ajoute. Exportée nulle part : elle documente l'ordre canonique. */
void CATEGORIES_DEPENSE;

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
function DepenseCard({ d, index, query, montantsMasques }: { d: any; index: number; query: string; montantsMasques: boolean }) {
  const [open, setOpen] = useState(false);
  const cat = apparenceDepense(d);
  const montant = d.montant || d.price || 0;
  const dateObj = new Date(d.date);

  return (
    <motion.div
      initial={{ opacity:0, y:10 }} animate={{ opacity:1, y:0 }} transition={{ delay: index * 0.04 }}
      onClick={() => setOpen(v => !v)}
      style={{ background:'white', border:'1.5px solid var(--trait)', borderRadius:16, overflow:'hidden', cursor:'pointer' }}>

      {/* Ligne principale */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 14px' }}>
        <div style={{ width:46, height:46, borderRadius:14, background:cat.bg, border:`1.5px solid ${cat.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          {cat.icon}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:15, fontWeight:800, color:'var(--encre)', marginBottom:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
            <Highlight text={d.productName || d.description || cat.label} query={query} />
          </div>
          <div style={{ fontSize:11, color:'var(--encre-4)', fontWeight:600 }}>
            {cat.label} · {format(dateObj, 'HH:mm', { locale:fr })}
          </div>
        </div>
        <div style={{ textAlign:'right', flexShrink:0 }}>
          <div style={{ fontSize:17, fontWeight:900, color:'var(--color-red-500)' }}>{montantsMasques ? '••••• F' : `-${montant.toLocaleString('fr-FR')} F`}</div>
          <motion.div animate={{ rotate: open ? 180 : 0 }} transition={{ duration:0.25 }} style={{ display:'flex', justifyContent:'flex-end', marginTop:2 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--herite-gris-80)" strokeWidth="2.5"><path d="M6 9l6 6 6-6"/></svg>
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
            <div style={{ borderTop:'1px solid var(--commerce-paper)', padding:'12px 14px', background:'var(--commerce-surface)', display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:'var(--encre-4)', fontWeight:600 }}>Date complète</span>
                <span style={{ fontSize:12, fontWeight:700, color:'var(--encre)' }}>{format(dateObj, 'dd MMMM yyyy à HH:mm', { locale:fr })}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:'var(--encre-4)', fontWeight:600 }}>Catégorie</span>
                <div style={{ display:'inline-flex', alignItems:'center', gap:5, background:cat.bg, border:`1px solid ${cat.border}`, borderRadius:8, padding:'3px 8px' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:cat.color }}>{cat.label}</span>
                </div>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ fontSize:12, color:'var(--encre-4)', fontWeight:600 }}>Montant</span>
                <span style={{ fontSize:14, fontWeight:900, color:'var(--color-red-500)' }}>{montantPrive(montant, montantsMasques, 'FCFA')}</span>
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
  const { transactions, reloadTransactions, speak } = useApp();
  const [period, setPeriod] = useState<Period>('today');
  const [search, setSearch] = useState('');
  const [showOutils, setShowOutils] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const sliderRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  const { montantsMasques, basculerMontants } = useMontantsPrives();

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

  // Écran « Mes dépenses » : on annonce à voix haute les dépenses du jour dès que
  // les données arrivent (une seule fois) -> une non-lectrice sait sans lire.
  const dejaAnnonce = useRef(false);
  useEffect(() => {
    if (dejaAnnonce.current || allDepenses.length === 0 || montantsMasques) return;
    dejaAnnonce.current = true;
    speak(kpiToday > 0
      ? `Aujourd'hui tu as dépensé ${kpiToday.toLocaleString('fr-FR')} francs.`
      : "Tu n'as pas encore de dépense aujourd'hui.");
  }, [allDepenses, kpiToday, speak, montantsMasques]);

  const direTotal = () => {
    if (montantsMasques) { speak('Tes montants sont cachés.'); return; }
    speak(kpiToday > 0
      ? `Aujourd'hui tu as dépensé ${kpiToday.toLocaleString('fr-FR')} francs.`
      : "Tu n'as pas encore de dépense aujourd'hui.");
  };

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

  return (
    <div style={{ minHeight:'100vh', background:BG, fontFamily:'Plus Jakarta Sans, system-ui, sans-serif', display:'flex', flexDirection:'column' }}>

      {/* HEADER */}
      <div style={{ background:`linear-gradient(160deg,${P} 0%,var(--commerce-orange-700) 100%)`, padding:'0 16px 18px', flexShrink:0 }}>
        <div style={{ height:16 }} />
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <motion.button whileTap={{ scale:0.9 }} onClick={() => navigate(-1)} aria-label="Revenir en arrière"
              style={{ width:44, height:44, borderRadius:13, background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.28)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
            </motion.button>
            <span style={{ fontSize:19, fontWeight:900, color:'white', letterSpacing:'-0.3px' }}>Mes dépenses</span>
          </div>
          <div style={{ display:'flex', gap:7 }}>
            <motion.button whileTap={{ scale:0.9 }} onClick={basculerMontants}
              aria-label={montantsMasques ? 'Montrer mes montants' : 'Cacher mes montants'}
              style={{ width:44, height:44, borderRadius:13, background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.28)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              {montantsMasques ? <EyeOff size={19} color="white" /> : <Eye size={19} color="white" />}
            </motion.button>
            <motion.button whileTap={{ scale:0.9 }} onClick={direTotal} aria-label="Écouter les dépenses du jour"
              style={{ width:44, height:44, borderRadius:13, background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.28)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
            </motion.button>
            {/* Cloche « Notifications » standard — l'« Alertes » stock (même
                icône avant) est spécifique à Mon stock, pas pertinente ici
                (audit accueil/tuiles). */}
            <NotificationButton />
          </div>
        </div>
      </div>

      {/* CONTENU */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px 14px 100px', display:'flex', flexDirection:'column', gap:12 }}>

        <SyncEchecsBanner />

        <motion.button whileTap={{ scale:0.99 }} onClick={() => setShowOutils(v => !v)}
          aria-expanded={showOutils}
          style={{ width:'100%', minHeight:54, background:'white', border:'1.5px solid var(--trait)', borderRadius:16, padding:'10px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, cursor:'pointer', fontFamily:'inherit', textAlign:'left' }}>
          <div>
            <div style={{ fontSize:15, fontWeight:900, color:'var(--encre)' }}>Mes chiffres et filtres</div>
            <div style={{ fontSize:12, color:'var(--encre-4)', marginTop:2 }}>
              {montantsMasques ? 'Montants cachés' : `Aujourd'hui : ${kpiToday.toLocaleString('fr-FR')} F`}
            </div>
          </div>
          <motion.span animate={{ rotate: showOutils ? 180 : 0 }} style={{ display:'flex', flexShrink:0 }}>
            <ChevronDown size={22} color={P} />
          </motion.span>
        </motion.button>

        <AnimatePresence initial={false}>
        {showOutils && (
        <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }}
          style={{ overflow:'hidden', display:'flex', flexDirection:'column', gap:12 }}>
        {/* KPIs 2x2 standard */}
        {montantsMasques ? (
          <div style={{ minHeight:76, borderRadius:16, border:'1.5px dashed var(--commerce-line)', background:'rgba(255,255,255,0.7)', display:'flex', alignItems:'center', justifyContent:'center', gap:10, color:'var(--encre-3)', fontWeight:800 }}>
            <EyeOff size={22} /> Montants cachés
          </div>
        ) : <KPIGrid cols={2}>
          <UniversalKPI
            label="Aujourd'hui"
            value={kpiToday.toLocaleString('fr-FR')}
            suffix="FCFA"
            icon={TrendingUp}
            color="var(--color-orange-600)"
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
            value={kpiMonth.toLocaleString('fr-FR')}
            suffix="FCFA"
            icon={Calendar}
            color="var(--herite-bleu-vif)"
            bgColor="rgba(239,246,255,0.85)"
            borderColor="rgba(59,130,246,0.4)"
            iconAnimation="pulse"
            active={period === 'month'}
            onClick={() => setPeriod('month')}
            explication="Total de toutes tes dépenses du mois en cours."
          />
          <UniversalKPI
            label="Total général"
            value={kpiTotal.toLocaleString('fr-FR')}
            suffix="FCFA"
            icon={ShoppingBag}
            color="var(--color-green-600)"
            bgColor="rgba(240,253,244,0.85)"
            borderColor="rgba(34,197,94,0.4)"
            iconAnimation="spin"
            active={period === 'all'}
            onClick={() => setPeriod('all')}
            explication="Cumul de toutes tes dépenses depuis le début. Utile pour voir combien tu dépenses en tout."
          />
          <UniversalKPI
            label="Moy. journalière"
            value={Math.round(kpiMonth / Math.max(new Date().getDate(), 1)).toLocaleString('fr-FR')}
            suffix="FCFA"
            icon={Clock}
            color="var(--herite-violet)"
            bgColor="rgba(245,243,255,0.85)"
            borderColor="rgba(139,92,246,0.4)"
            iconAnimation="float"
            explication="Combien tu dépenses en moyenne chaque jour ce mois-ci."
            formule="Moyenne = Dépenses du mois ÷ Nombre de jours écoulés"
          />
        </KPIGrid>}

        {/* Barre recherche */}
        {/* height 46 + padding horizontal seul : la zone tapable du champ suit
            alors la hauteur de la barre (alignSelf stretch). Avec un padding
            VERTICAL, la boite de contenu restait celle du texte — 20px — et
            l'etirement ne donnait rien. Meme forme que la recherche du stock. */}
        <div style={{ background:'white', border:'1.5px solid var(--trait)', borderRadius:14, padding:'0 14px', height:46, display:'flex', alignItems:'center', gap:8 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--herite-gris-40)" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher une dépense..."
            style={{ flex:1, alignSelf:'stretch', minWidth:0, border:'none', outline:'none', fontSize:13, color:'var(--encre)', background:'transparent', fontFamily:'inherit' }}
          />
          {search && (
            <motion.button whileTap={{ scale:0.9 }} onClick={() => setSearch('')} aria-label="Effacer la recherche"
              style={{ flexShrink:0, width:44, height:44, display:'flex', alignItems:'center', justifyContent:'center', background:'none', border:'none', cursor:'pointer', padding:0, color:'var(--encre-4)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--herite-gris-40)" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </motion.button>
          )}
        </div>

        {/* Sélecteur iOS */}
        <div ref={sliderRef} style={{ background:'white', border:'1.5px solid var(--trait)', borderRadius:16, padding:4, display:'flex', position:'relative' }}>
          <motion.div
            style={{ position:'absolute', top:4, height:'calc(100% - 8px)', background:P, borderRadius:12, boxShadow:`0 2px 8px ${P}40` }}
            animate={{ left: `calc(${sliderIndex * 33.33}% + 4px)`, width:'calc(33.33% - 3px)' }}
            transition={{ type:'spring', stiffness:300, damping:30 }}
          />
          {PERIODS.map((p, i) => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              // minHeight 44 : cible tactile mesurée à 36px (390×844). Le
              // surépais glissant suit (height: calc(100% - 8px)).
              style={{ flex:1, minHeight:44, padding:'9px 4px', fontSize:12, fontWeight:700, color: period===p.id ? 'white' : 'var(--encre-4)', background:'none', border:'none', cursor:'pointer', position:'relative', zIndex:1, fontFamily:'inherit', transition:'color 0.2s' }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Filtres avancés */}
        <div>
          <motion.button whileTap={{ scale:0.99 }} onClick={() => setShowFilters(v => !v)}
            style={{ width:'100%', background:'white', border:'1.5px solid var(--trait)', borderRadius:14, padding:'12px 14px', display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', fontFamily:'inherit' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={P} strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
              <span style={{ fontSize:13, fontWeight:600, color:'var(--herite-gris-33)' }}>Filtres avancés</span>
            </div>
            <motion.span animate={{ rotate: showFilters ? 180 : 0 }} transition={{ duration:0.25 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--herite-gris-40)" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
            </motion.span>
          </motion.button>
          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration:0.25 }} style={{ overflow:'hidden' }}>
                <div style={{ background:'white', border:'1.5px solid var(--trait)', borderTop:'none', borderRadius:'0 0 14px 14px', padding:'12px 14px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:'var(--encre-4)', display:'block', marginBottom:4 }}>Date début</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                      style={{ width:'100%', border:'1.5px solid var(--trait)', borderRadius:10, padding:'8px 10px', fontSize:12, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }} />
                  </div>
                  <div>
                    <label style={{ fontSize:11, fontWeight:700, color:'var(--encre-4)', display:'block', marginBottom:4 }}>Date fin</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                      style={{ width:'100%', border:'1.5px solid var(--trait)', borderRadius:10, padding:'8px 10px', fontSize:12, fontFamily:'inherit', outline:'none', boxSizing:'border-box' }} />
                  </div>
                  {(startDate || endDate) && (
                    <motion.button whileTap={{ scale:0.97 }} onClick={() => { setStartDate(''); setEndDate(''); }}
                      style={{ gridColumn:'1/-1', background:'var(--commerce-paper)', border:'none', borderRadius:10, padding:'8px', fontSize:12, fontWeight:700, color:'var(--encre-3)', cursor:'pointer', fontFamily:'inherit' }}>
                      Réinitialiser
                    </motion.button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </motion.div>
        )}
        </AnimatePresence>

        {/* Liste */}
        {depenses.length === 0 ? (
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, padding:'40px 24px', textAlign:'center' }}>
            <img src={TATA_BLEU} style={{ width:120, height:120, objectFit:'contain' }} alt="Tantie Nanti Lou" />
            <p style={{ fontSize:16, fontWeight:800, color:'var(--encre)', margin:0 }}>
              {search ? 'Aucune dépense trouvée' : 'Aucune dépense'}
            </p>
            <p style={{ fontSize:13, color:'var(--encre-4)', lineHeight:1.5, margin:0 }}>
              {search ? `Aucun résultat pour "${search}"` : "Note tes dépenses pour mieux gérer ton argent"}
            </p>
          </motion.div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {depenses.map((d: any, i: number) => (
              <DepenseCard key={d.id || i} d={d} index={i} query={search} montantsMasques={montantsMasques} />
            ))}
          </div>
        )}
      </div>

      <div style={{ position:'fixed', bottom:0, left:0, right:0, padding:'12px 14px 28px', background:`linear-gradient(to top,${BG} 70%,transparent)`, zIndex:10 }}>
        <motion.button whileTap={{ scale:0.97 }} onClick={() => navigate('/marchand/depense')}
          style={{ width:'100%', background:P, color:'white', border:'none', borderRadius:20, padding:'17px 0', fontSize:16, fontWeight:800, cursor:'pointer', fontFamily:'inherit', boxShadow:`0 4px 16px ${P}55`, letterSpacing:'-0.2px' }}>
          + Faire une dépense
        </motion.button>
      </div>
    </div>
  );
}
