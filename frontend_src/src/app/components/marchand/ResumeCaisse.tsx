import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
  ShoppingBag,
  Clock,
} from 'lucide-react';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { SubPageLayout } from '../layout/SubPageLayout';
import { useApp } from '../../contexts/AppContext';
import { useStock } from '../../contexts/StockContext';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

import { Montant, MontantCard } from '../shared/Montant';
import { useSpeakMessage } from '../../i18n/voice/speakMessage';
import { t } from '../../i18n/voice/runtime';
import {
  ouverturePhrasePeriode, complementPeriode, type PeriodeResume,
} from '../../services/resumePeriode';
import { categorieDeLaDepense } from '../../services/categorieDepense';

/**
 * HIS-01 — LA PÉRIODE N'EST PLUS ÉCRITE EN DUR.
 *
 * La liste des périodes vit désormais dans `services/resumePeriode.ts`, avec
 * les mots qui les nomment. Deux endroits qui énuméraient les mêmes quatre
 * valeurs finissaient par diverger : c'est ainsi qu'« Aujourd'hui » s'est
 * retrouvé collé au total d'un mois.
 */
type Period = PeriodeResume;

export function ResumeCaisse() {
  const { getFinancialSummary, getSalesHistory, transactions, currentSession, isOnline } = useApp();
  const { stocks } = useStock();
  // La voix passe par le catalogue : c'est le SEUL chemin qui produise la
  // forme PARLÉE des montants (« trente-trois mille six cents francs »).
  // `speak(texte)` envoyait « 33 600 », que le moteur épelait « trois zéro
  // zéro zéro » — la faute fermée le 22/09 sur la caisse, encore vivante ici.
  const speakMessage = useSpeakMessage();
  
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('today');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [expandedTransactionId, setExpandedTransactionId] = useState<string | null>(null);

  // Récupérer le résumé financier
  const financialData = useMemo(() => {
    return getFinancialSummary(selectedPeriod, customStart, customEnd);
  }, [getFinancialSummary, selectedPeriod, customStart, customEnd]);

  // Préparer les données pour le graphique d'évolution
  const evolutionData = useMemo(() => {
    let filteredTransactions = transactions;
    const today = new Date();
    const startDate = new Date(today);

    switch (selectedPeriod) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        filteredTransactions = transactions.filter(
          (t) => new Date(t.date) >= startDate
        );
        break;
      case '7days':
        startDate.setDate(today.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        filteredTransactions = transactions.filter(
          (t) => new Date(t.date) >= startDate
        );
        break;
      case '30days':
        startDate.setDate(today.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
        filteredTransactions = transactions.filter(
          (t) => new Date(t.date) >= startDate
        );
        break;
      case 'custom':
        if (customStart && customEnd) {
          filteredTransactions = transactions.filter(
            (t) =>
              new Date(t.date) >= new Date(customStart) &&
              new Date(t.date) <= new Date(customEnd)
          );
        }
        break;
    }

    // Grouper par jour
    const groupedByDay: Record<string, { ventes: number; cahier: number; solde: number }> = {};
    filteredTransactions.forEach((t) => {
      const day = format(new Date(t.date), 'dd/MM', { locale: fr });
      if (!groupedByDay[day]) {
        groupedByDay[day] = { ventes: 0, cahier: 0, solde: 0 };
      }
      if (t.type === 'vente') {
        groupedByDay[day].ventes += t.price * t.quantity;
      } else if (t.type === 'depense') {
        groupedByDay[day].cahier += t.price * t.quantity;
      }
    });

    // Convertir en array pour le graphique
    let cumulativeSolde = currentSession?.fondInitial || 0;
    return Object.entries(groupedByDay).map(([day, data]) => {
      cumulativeSolde += data.ventes - data.cahier;
      return {
        day,
        ventes: data.ventes,
        cahier: data.cahier,
        solde: cumulativeSolde,
      };
    });
  }, [transactions, selectedPeriod, customStart, customEnd, currentSession]);

  // Préparer les données pour le camembert des cahier
  const cahierData = useMemo(() => {
    let filteredTransactions = transactions;
    const today = new Date();
    const startDate = new Date(today);

    switch (selectedPeriod) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case '7days':
        startDate.setDate(today.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '30days':
        startDate.setDate(today.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'custom':
        if (customStart) {
          startDate.setTime(new Date(customStart).getTime());
        }
        break;
    }

    filteredTransactions = filteredTransactions.filter(
      (t) => t.type === 'depense' && new Date(t.date) >= startDate
    );

    // GROUPER PAR CATÉGORIE — DEP-02.
    //
    // Cette boucle groupait sur `t.category`, qui contenait en réalité le MOTIF
    // de la dépense en minuscules (« taxe mairie », « médicaments »). Le
    // camembert affichait donc une part par texte saisi, sous le titre
    // « catégories ». Il lit maintenant la catégorie réellement enregistrée, et
    // les dépenses qui n'en ont pas font une part À PART, nommée — pas une
    // part « Autres » qu'on confondrait avec la catégorie « Autre ».
    const groupedByCategory: Record<string, number> = {};
    filteredTransactions.forEach((t) => {
      const lue = categorieDeLaDepense({ category: t.category });
      groupedByCategory[lue.libelle] = (groupedByCategory[lue.libelle] || 0) + t.price * t.quantity;
    });

    return Object.entries(groupedByCategory).map(([name, value]) => ({
      name,
      value,
    }));
  }, [transactions, selectedPeriod, customStart]);

  // Obtenir les transactions récentes filtrées
  const recentTransactions = useMemo(() => {
    let filteredTransactions = transactions;
    const today = new Date();
    const startDate = new Date(today);

    switch (selectedPeriod) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case '7days':
        startDate.setDate(today.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        break;
      case '30days':
        startDate.setDate(today.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'custom':
        if (customStart && customEnd) {
          return transactions.filter(
            (t) =>
              new Date(t.date) >= new Date(customStart) &&
              new Date(t.date) <= new Date(customEnd)
          );
        }
        return [];
    }

    return transactions.filter((t) => new Date(t.date) >= startDate).slice(0, 20);
  }, [transactions, selectedPeriod, customStart, customEnd]);

  const soldeActuel = (currentSession?.fondInitial || 0) + financialData.totalVentes - financialData.totalCahier;

  const COLORS = ['var(--commerce-action)', 'var(--commerce-green)', '#2072AF', '#702963', '#F59E0B', 'var(--color-red-500)'];

  const periodLabels: Record<Period, string> = {
    today: "Aujourd'hui",
    '7days': '7 derniers jours',
    '30days': '30 derniers jours',
    custom: 'Personnalisé',
  };

  // Données top produits pour affichage
  const topProduits = financialData.topProduits || [];
  const produitStar = topProduits[0] || null;

  const heurePointe = useMemo(() => {
    const history = getSalesHistory(
      selectedPeriod === 'custom'
        ? { startDate: customStart, endDate: customEnd }
        : selectedPeriod === 'today'
        ? { startDate: new Date().toISOString().split('T')[0] }
        : selectedPeriod === '7days'
        ? { startDate: new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0] }
        : { startDate: new Date(Date.now() - 29 * 86400000).toISOString().split('T')[0] }
    );
    if (!history || history.length === 0) return 'Pas de données';
    const heures: Record<number, number> = {};
    history.forEach((s: any) => {
      const h = new Date(s.date || s.createdAt || s.timestamp || '').getHours();
      if (!isNaN(h)) heures[h] = (heures[h] || 0) + (s.montant || s.total || 0);
    });
    const maxH = Object.entries(heures).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
    if (!maxH) return 'Pas de données';
    const h = Number(maxH[0]);
    return `${h}h – ${h + 2}h`;
  }, [getSalesHistory, selectedPeriod, customStart, customEnd]);

  const alerteStock = useMemo(() => {
    if (!stocks || stocks.length === 0) return null;
    return stocks.find((s: any) =>
      Number(s.quantity || s.stock || 0) <= Number(s.alertThreshold || s.seuilAlerte || 5)
    ) || null;
  }, [stocks]);

  // ── LE BILAN DE TANTIE LOU — HIS-01 ────────────────────────────────────────
  //
  // LE DÉFAUT FERMÉ ICI, mot pour mot depuis la recette terrain (MAR-HIS-001) :
  // « je sélectionne la périodicité "Ce mois" et il est affiché "Aujourd'hui tu
  // as gagné 33 600 francs" ». Les chiffres, eux, étaient justes — ils venaient
  // bien de la période choisie. C'est la PHRASE qui mentait sur ce qu'ils
  // comptaient, parce que « Aujourd'hui » et « du jour » étaient écrits en dur.
  // Une marchande qui lit ça sur le total d'un mois croit avoir fait une
  // journée exceptionnelle.
  //
  // UNE SEULE SOURCE POUR L'ŒIL ET POUR L'OREILLE. Les deux phrases se
  // construisent maintenant à partir des MÊMES clés du catalogue, avec la
  // MÊME période. Elles ne peuvent plus diverger : c'était le cas avant, la
  // phrase affichée et la phrase dite se recopiaient l'une l'autre à la main.
  const variablesBilan = {
    periode: ouverturePhrasePeriode(selectedPeriod),
    ventes: financialData.totalVentes,
    depenses: financialData.totalCahier,
  };
  const phraseBilan = financialData.beneficeNet >= 0
    ? (financialData.totalCahier === 0
        ? t('RESUME_BILAN_SANS_DEPENSE', variablesBilan)
        : t('RESUME_BILAN_GAGNE', variablesBilan))
    : t('RESUME_BILAN_PERTE', { periode: ouverturePhrasePeriode(selectedPeriod) });

  const direLeResume = () => {
    const vars = {
      complement: complementPeriode(selectedPeriod),
      ventes: financialData.totalVentes,
      depenses: financialData.totalCahier,
      solde: soldeActuel,
    };
    if (financialData.beneficeNet >= 0) speakMessage('RESUME_DETAIL', { ...vars, heure: heurePointe });
    else speakMessage('RESUME_DETAIL_PERTE', vars);
  };

  return (
    <SubPageLayout role="marchand" title="Résumé détaillé">
        <div style={{ padding:'14px 0 0', display:'flex', flexDirection:'column', gap:12 }}>

          {/* ── KPIs 2x2 JUSTE SOUS LE HEADER ── */}
          <KPIGrid cols={2}>
            <UniversalKPI
              label="Tu as gagné"
              animatedTarget={financialData.totalVentes}
              suffix="FCFA"
              icon={TrendingUp}
              color="var(--color-green-600)"
              bgColor="rgba(240,253,244,0.85)"
              borderColor="rgba(34,197,94,0.4)"
              iconAnimation="bounce"
              explication="C'est tout l'argent que tu as encaissé sur tes ventes pendant cette période."
              details={[{ label: 'Nombre de ventes', value: financialData.nombreVentes }]}
            />
            <UniversalKPI
              label="Tu as dépensé"
              animatedTarget={financialData.totalCahier}
              suffix="FCFA"
              icon={TrendingDown}
              color="var(--destructive)"
              bgColor="rgba(254,242,242,0.85)"
              borderColor="rgba(239,68,68,0.4)"
              iconAnimation="pulse"
              explication="C'est tout ce que tu as sorti de ta caisse pour payer tes dépenses."
              details={[{ label: 'Nombre de dépenses', value: financialData.nombreCahier }]}
            />
            <UniversalKPI
              label="Tu as gagné net"
              animatedTarget={Math.abs(financialData.beneficeNet)}
              suffix="FCFA"
              icon={Banknote}
              color={financialData.beneficeNet >= 0 ? '#2563eb' : 'var(--destructive)'}
              bgColor={financialData.beneficeNet >= 0 ? 'rgba(239,246,255,0.85)' : 'rgba(254,242,242,0.85)'}
              borderColor={financialData.beneficeNet >= 0 ? 'rgba(59,130,246,0.4)' : 'rgba(239,68,68,0.4)'}
              iconAnimation="spin"
              explication={financialData.beneficeNet >= 0 ? "Bravo ! Tu as gagné plus que tu as dépensé." : "Attention ! Tu as dépensé plus que tu as gagné."}
              formule="Bénéfice = Ventes − Dépenses"
            />
            <UniversalKPI
              label="Dans ta caisse"
              animatedTarget={soldeActuel}
              suffix="FCFA"
              icon={Wallet}
              color="var(--color-orange-600)"
              bgColor="rgba(255,247,237,0.85)"
              borderColor="rgba(249,115,22,0.4)"
              iconAnimation="float"
              explication="C'est l'argent total que tu as dans ta caisse en ce moment."
              formule="Caisse = Fond initial + Ventes − Dépenses"
              details={[{ label: 'Fond initial', value: (currentSession?.fondInitial || 0).toLocaleString('fr-FR') + ' FCFA' }]}
            />
          </KPIGrid>

          {/* ── SÉLECTEUR PÉRIODE iOS ── */}
          <div style={{ background:'white', border:'1.5px solid var(--trait)', borderRadius:16, padding:4, display:'flex', position:'relative' }}>
            <motion.div
              style={{ position:'absolute', top:4, height:'calc(100% - 8px)', background:'#AF5B23', borderRadius:12, boxShadow:'0 2px 8px rgba(175,91,35,0.3)' }}
              animate={{
                left: selectedPeriod === 'today' ? '4px' : selectedPeriod === '7days' ? 'calc(25% + 1px)' : selectedPeriod === '30days' ? 'calc(50% + 1px)' : 'calc(75% + 1px)',
                width: 'calc(25% - 3px)'
              }}
              transition={{ type:'spring', stiffness:300, damping:30 }}
            />
            {(['today','7days','30days','custom'] as Period[]).map((p) => (
              <button key={p} onClick={() => { setSelectedPeriod(p); }}
                style={{ flex:1, padding:'10px 4px', fontSize:11, fontWeight:800, color: selectedPeriod===p ? 'white' : 'var(--encre-4)', background:'none', border:'none', cursor:'pointer', position:'relative', zIndex:1, fontFamily:'inherit', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                {p === 'today' ? "Aujourd'hui" : p === '7days' ? '7 jours' : p === '30days' ? 'Ce mois' : 'Perso'}
              </button>
            ))}
          </div>

          {/* Dates personnalisées */}
          <AnimatePresence>
            {selectedPeriod === 'custom' && (
              <motion.div initial={{ opacity:0, height:0 }} animate={{ opacity:1, height:'auto' }} exit={{ opacity:0, height:0 }}
                style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                  style={{ padding:'10px 12px', borderRadius:12, border:'1.5px solid var(--trait)', fontSize:13, outline:'none', fontFamily:'inherit' }} />
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                  style={{ padding:'10px 12px', borderRadius:12, border:'1.5px solid var(--trait)', fontSize:13, outline:'none', fontFamily:'inherit' }} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── TANTIE LOU ── */}
          <div style={{ background:'white', border:'1.5px solid var(--trait)', borderRadius:18, padding:'12px 14px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:'50%', background:'#FFF3EA', border:'2px solid #AF5B23', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#AF5B23" strokeWidth="2" strokeLinecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--encre)', lineHeight:1.5 }}>
                {phraseBilan}
              </div>
              <div style={{ fontSize:10, color:'var(--encre-4)', marginTop:2 }}>Tantie Nanti Lou · appuie sur lecture</div>
            </div>
            <motion.button whileTap={{ scale:0.9 }} onClick={direLeResume}
              style={{ width:36, height:36, borderRadius:'50%', background:'#AF5B23', border:'none', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="none"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            </motion.button>
          </div>

          {/* ── HEURE DE POINTE ── */}
          <div style={{ background:'white', border:'1.5px solid var(--trait)', borderRadius:16, padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:38, height:38, borderRadius:'50%', background:'#FFF3EA', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <Clock size={18} color="#AF5B23" />
            </div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12, fontWeight:900, color:'var(--encre)' }}>Tu vends le plus à cette heure</div>
              <div style={{ fontSize:11, color:'#888', marginTop:2 }}>Sois bien approvisionnée</div>
            </div>
            <div style={{ background:'#AF5B23', color:'white', fontSize:12, fontWeight:900, padding:'5px 12px', borderRadius:20, whiteSpace:'nowrap' }}>{heurePointe}</div>
          </div>

          {/* ── GRAPHE ANIMÉ ── */}
          {evolutionData.length > 0 && (
            <div style={{ background:'white', borderRadius:18, padding:14, border:'1.5px solid var(--trait)' }}>
              <div style={{ fontSize:13, fontWeight:900, color:'var(--encre)', marginBottom:4 }}>Évolution de tes ventes</div>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--color-green-600)', marginBottom:10, display:'flex', alignItems:'center', gap:4 }}>
                <TrendingUp size={13} color="var(--color-green-600)" />
                {financialData.totalVentes > 0 ? "Tu vends bien !" : "Pas encore de ventes"}
              </div>
              <div style={{ height:120 }}>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={evolutionData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f0eb" />
                    <XAxis dataKey="day" stroke="#ddd" style={{ fontSize:'10px' }} tick={{ fill:'#aaa' }} />
                    <YAxis stroke="#ddd" style={{ fontSize:'10px' }} tick={{ fill:'#aaa' }} width={40} />
                    <Tooltip contentStyle={{ backgroundColor:'white', border:'1.5px solid var(--trait)', borderRadius:12, fontSize:11 }}
                      formatter={(v: number) => `${(v||0).toLocaleString('fr-FR')} FCFA`} />
                    <Line type="monotone" dataKey="solde" stroke="#AF5B23" strokeWidth={2.5}
                      dot={{ fill:'#AF5B23', r:3 }} activeDot={{ r:5 }}
                      animationDuration={1500} animationEasing="ease-out" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── PRODUIT STAR ── */}
          {produitStar && (
            <div style={{ background:'white', border:'2px solid #AF5B23', borderRadius:18, padding:14, display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:56, height:56, borderRadius:14, background:'#FFF3EA', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#AF5B23" strokeWidth="2" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:10, fontWeight:900, color:'#AF5B23', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:2 }}>Produit star du jour</div>
                <div style={{ fontSize:18, fontWeight:900, color:'var(--encre)' }}>{produitStar.productName}</div>
                <div style={{ fontSize:11, color:'#888', fontWeight:700, marginTop:2 }}>{produitStar.quantity} vente{produitStar.quantity > 1 ? 's' : ''}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:20, fontWeight:900, color:'#AF5B23' }}>{(produitStar.total||0).toLocaleString('fr-FR')}</div>
                <div style={{ fontSize:11, fontWeight:700, color:'#AF5B23' }}>FCFA</div>
              </div>
            </div>
          )}

          {/* ── TOP PRODUITS ── */}
          {topProduits.length > 0 && (
            <div style={{ background:'white', borderRadius:18, padding:14, border:'1.5px solid var(--trait)' }}>
              <div style={{ fontSize:13, fontWeight:900, color:'var(--encre)', marginBottom:10, display:'flex', alignItems:'center', gap:6 }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#AF5B23" strokeWidth="2.5" strokeLinecap="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                Tes meilleurs produits
              </div>
              {topProduits.slice(0,5).map((p, i) => (
                <div key={p.productName} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 0', borderBottom: i < Math.min(topProduits.length,5)-1 ? '1px solid #f5f0eb' : 'none' }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background: i===0?'#AF5B23':i===1?'#888':'#b45309', color:'white', fontSize:13, fontWeight:900, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{i+1}</div>
                  <div style={{ flex:1, fontSize:14, fontWeight:900, color:'var(--encre)' }}>{p.productName}</div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:14, fontWeight:900, color:'#AF5B23' }}>{(p.total||0).toLocaleString('fr-FR')} FCFA</div>
                    <div style={{ fontSize:10, fontWeight:700, color:'var(--encre-4)' }}>{p.quantity} vente{p.quantity>1?'s':''}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
    </SubPageLayout>
  );
}