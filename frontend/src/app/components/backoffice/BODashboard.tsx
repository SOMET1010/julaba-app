import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, TrendingUp, Wallet, Target, AlertTriangle,
  CheckCircle2, Clock, XCircle, BarChart3, MapPin,
  Activity, ShieldAlert, HelpCircle,
  UserCheck, Zap, Award, Bell,
  ChevronRight, ChevronDown, RefreshCw, Eye, HeartPulse,
} from 'lucide-react';
import { useBackOffice } from '../../contexts/BackOfficeContext';
import {
  kpisTableauDeBord, motDuKpi, nombreDuKpi, explicationDuKpi, sousTitreZones, lue,
  type AffichageKpi,
} from '../../services/etatLectureBO';
import {
  sectionDe, motDeSection, explicationDeSection, alertesBO, urgentes,
  objectifsBO, pourcentageBarre, type AffichageSection,
} from './etatSectionsBO';
import { BO_PRIMARY, BO_DARK, BO_LIGHT } from './bo-theme';
import { useNavigate } from 'react-router';
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { useRealtime } from '../../hooks/useRealtime';
import { useWebSocket } from '../../services/WebSocketTransport';
import { LiveActivityFeed } from './LiveActivityFeed';
import { SystemHealthPanel } from './SystemHealthPanel';
import { BOProgressBar } from './BOProgressBar';
import { UniversalDropdownMenuBO } from './universal/UniversalDropdownMenuBO';
import { UniversalSectionCardBO } from './universal/UniversalSectionCardBO';

/**
 * CE QU'UNE TUILE REÇOIT — BO-01.
 *
 * Un compteur rend l'un de TROIS états, et la tuile les sert différemment :
 *
 *   nombre        → `animatedTarget`, le compteur animé d'avant. ZÉRO COMPRIS :
 *                   un zéro lu est une réponse, et il s'affiche comme telle.
 *   chargement    → le mot « Lecture… », et AUCUN nombre. Pas de zéro qui
 *                   clignote en attendant la réponse.
 *   indisponible  → le mot « Indisponible », et la RAISON dans l'explication
 *                   (la tuile s'ouvre au clic) : l'agent doit pouvoir décider
 *                   quoi faire, pas seulement constater qu'il manque un chiffre.
 *
 * `animatedTarget` est laissé à `undefined` hors du cas « nombre » : c'est lui
 * qui, dans `UniversalKPI`, décide d'afficher un compteur plutôt qu'un texte.
 * Le laisser à `0` remettrait exactement le faux zéro qu'on ferme ici.
 */
function kpiTuile(kpi: AffichageKpi, format?: (n: number) => string) {
  const n = nombreDuKpi(kpi);
  const mot = motDuKpi(kpi);
  return {
    animatedTarget: format ? undefined : n,
    value: format && n !== undefined ? format(n) : (mot ?? undefined),
    explication: explicationDuKpi(kpi),
  };
}

/** Le volume, écrit court au-dessus du million — inchangé. */
function montantCourt(v: number): string {
  return v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v.toLocaleString('fr-FR');
}

function normalizePhone(p?: string | null): string {
  if (!p) return '';
  return String(p).replace(/[\s\-().]/g, '').replace(/^\+225/, '').replace(/^00225/, '').replace(/^225/, '');
}

/** Les couleurs des quatre barres. Elles n'appartiennent pas à la règle : une
 *  couleur ne dit rien de vrai ou de faux sur un chiffre. */
const COULEURS_OBJECTIFS: Record<string, string> = {
  'Acteurs enrôlés': BO_PRIMARY,
  'Digitalisation': '#3B82F6',
  'Taux validation': '#10B981',
  'Inclusion sociale': '#8B5CF6',
};

/**
 * CE QU'ON MONTRE À LA PLACE D'UNE SECTION QU'ON N'A PAS PU LIRE — BO-03.
 *
 * Surtout pas le vide, et surtout pas une phrase qui AFFIRME le vide :
 * « Aucune donnée disponible » et « Tout est en ordre » étaient les deux
 * mensonges de cet écran. On dit ce qu'on ne sait pas, et pourquoi.
 */
function SectionNonLue({ etat, hauteur }: { etat: AffichageSection<unknown>; hauteur?: string }) {
  const mot = motDeSection(etat);
  if (mot === null) return null;
  return (
    <div className={`${hauteur ?? 'py-8'} flex flex-col items-center justify-center text-center px-4 gap-1.5`}>
      <span className="text-sm font-bold text-gray-500">{mot}</span>
      <span className="text-xs text-gray-400 max-w-xs">{explicationDeSection(etat)}</span>
    </div>
  );
}

/** Le contenu n'est dessiné que sur `donnees` : la garantie de BO-01, appliquée
 *  à un bloc d'écran au lieu d'un compteur. */
function BlocSection<T>({ etat, hauteur, children }: {
  etat: AffichageSection<T>;
  hauteur?: string;
  children: (valeur: T) => ReactNode;
}) {
  if (etat.type !== 'donnees') return <SectionNonLue etat={etat} hauteur={hauteur} />;
  return <>{children(etat.valeur)}</>;
}

export function BODashboard() {
  const _bo = useBackOffice();

  const acteurs = Array.isArray(_bo.acteurs) ? _bo.acteurs : [];
  const transactions = Array.isArray(_bo.transactions) ? _bo.transactions : [];
  const dossiers = Array.isArray(_bo.dossiers) ? _bo.dossiers : [];
  const zonesMap = _bo.zonesMap || {};
  const navigate = useNavigate();
  const ws = useWebSocket(true);
  const rt = useRealtime(true);
  const isLiveActivity = rt.activity.length > 0 && !rt.error;

  const timelineChartData = useMemo(
    () => rt.timeline.map((p) => ({ transactions: p.transactions })),
    [rt.timeline],
  );

  const [activeAlerte, setActiveAlerte] = useState<number | null>(null);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [clockNow, setClockNow] = useState(new Date());
  const [monthsRange, setMonthsRange] = useState<number>(7);
  const normalizeRegion = (raw: any): string => {
    if (!raw) return 'Non défini';
    const s = String(raw).trim();
    if (!s) return 'Non défini';
    return s
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  // Horloge temps réel - tick chaque seconde
  useEffect(() => {
    const clock = setInterval(() => setClockNow(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  // ─── LES SEPT COMPTEURS — BO-01 ───────────────────────────────────────────
  //
  // CE QUI ÉTAIT ÉCRIT ICI, et le commentaire d'origine disait « KPIs - 100 %
  // données réelles » juste au-dessus des tuiles :
  //
  //   const acteurs  = Array.isArray(_bo.acteurs)  ? _bo.acteurs  : [];
  //   const dossiers = Array.isArray(_bo.dossiers) ? _bo.dossiers : [];
  //   const totalActeurs = effectiveStats?.total_acteurs ?? acteurs.length;
  //
  // Une lecture qui échouait laissait la liste à `[]`, et les sept compteurs
  // affichaient ZÉRO. « 0 marchande active dans cette zone » ne veut pas dire
  // la même chose selon qu'on l'a comptée ou qu'on n'a pas pu la lire — et une
  // institution taille un programme sur ce genre de nombre.
  //
  // La règle vit dans services/etatLectureBO, pure et testée seule : la mesure
  // n'est appelée QUE sur une lecture réussie. Un zéro LU s'affiche ; un zéro
  // fabriqué n'existe plus. Chaque source garde son propre échec : une panne
  // des zones n'efface pas le compte des acteurs.
  const kpis = kpisTableauDeBord({
    // Le temps réel prime sur les statistiques chargées, comme avant ; quand il
    // n'a rien, on retombe sur l'état de lecture du contexte — pas sur `null`.
    stats: rt.stats ? lue(rt.stats) : _bo.lectures.stats,
    acteurs: _bo.lectures.acteurs,
    dossiers: _bo.lectures.dossiers,
    zones: _bo.lectures.zones,
    transactions: _bo.lectures.transactions,
  });

  // ─── BO-03 : LE RESTE DE L'ÉCRAN PASSE PAR LA MÊME RÈGLE ─────────────────
  //
  // CE QUI ÉTAIT ÉCRIT ICI, et que BO-01 avait nommé sans le prendre :
  //
  //   const totalActeurs = effectiveStats?.total_acteurs ?? acteurs.length;
  //   const suspendus    = acteurs.filter(a => a.statut === 'suspendu').length;
  //   const enAttente    = dossiers.filter(d => d.statut === 'en_attente').length;
  //
  // Ces cinq nombres alimentaient les alertes, les graphiques et les barres de
  // progression. Quand la lecture échouait, les listes valaient `[]`, les cinq
  // valaient 0 — et l'écran affichait « Aucune alerte activée — Tout est en
  // ordre », « Taux validation 0 % », « Aucune donnée régionale disponible ».
  // Une panne se présentait comme une bonne nouvelle.
  //
  // Ils n'existent plus. Chaque section demande ses sources à `sectionDe` et
  // ne calcule QUE si elles ont toutes été lues.

  // ─── Données graphique : croissance mensuelle des acteurs ─────────────────
  // Deux sources, et il les faut TOUTES LES DEUX : un graphique « acteurs et
  // transactions par mois » tracé sur une seule des deux est faux. `sectionDe`
  // n'appelle le calcul que si les deux ont été lues.
  const sectionCroissance = useMemo(() => sectionDe([_bo.lectures.acteurs, _bo.lectures.transactions], () => {
    const moisLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const now = new Date();
    const months: { mois: string; acteurs: number; transactions: number; volume: number }[] = [];
    for (let i = monthsRange - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const nbActeurs = acteurs.filter(a => {
        const m = a.dateInscription?.slice(0, 7);
        return m === key;
      }).length;
      const nbTx = transactions.filter(t => t.date?.slice(0, 7) === key).length;
      const vol = transactions
        .filter(t => t.date?.slice(0, 7) === key)
        .reduce((s, t) => s + (t.montant || 0), 0);
      months.push({
        mois: moisLabels[d.getMonth()],
        acteurs: nbActeurs,
        transactions: nbTx,
        volume: Math.round(vol / 1000000),
      });
    }
    return months;
  }), [_bo.lectures.acteurs, _bo.lectures.transactions, acteurs, transactions, monthsRange]);

  // ─── Répartition par région ───────────────────────────────────────────────
  const sectionRegions = useMemo(() => sectionDe([_bo.lectures.acteurs, _bo.lectures.transactions], () => {
    const REGION_COLORS = [BO_PRIMARY, '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4'];
    const map: Record<string, { name: string; count: number; volume: number }> = {};
    acteurs.forEach(a => {
      const region = normalizeRegion(a.region);
      if (!map[region]) map[region] = { name: region, count: 0, volume: 0 };
      map[region].count += 1;
    });
    transactions.forEach(t => {
      const region = normalizeRegion(t.region);
      if (region === 'Non défini') return;
      if (!map[region]) map[region] = { name: region, count: 0, volume: 0 };
      map[region].volume += Number(t.montant || 0);
    });
    return Object.values(map)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((d, i) => ({
        region: d.name,
        acteurs: d.count,
        volume: Math.round(d.volume / 1000000),
        color: REGION_COLORS[i % REGION_COLORS.length],
      }));
  }), [_bo.lectures.acteurs, _bo.lectures.transactions, acteurs, transactions]);

  // ─── Répartition par type d'acteur ───────────────────────────────────────
  const sectionRepartition = useMemo(() => sectionDe([_bo.lectures.acteurs], () => {
    const TYPE_CONFIG: Record<string, { label: string; color: string }> = {
      marchand: { label: 'Marchands', color: '#B74725' },
      producteur: { label: 'Producteurs', color: '#2E8B57' },
      cooperative: { label: 'Coopératives', color: '#1D4ED8' },
      super_admin: { label: 'Super Admins', color: 'var(--encre-3)' },
      cooperateur: { label: 'Coopérateurs', color: '#1D9E75' },
      identificateur: { label: 'Identificateurs', color: BO_PRIMARY },
      institution: { label: 'Institutions', color: '#8B5CF6' },
    };
    const map: Record<string, number> = {};
    acteurs.forEach(a => { map[`${a.type}`] = (map[`${a.type}`] || 0) + 1; });
    return Object.entries(map)
      .filter(([_, v]) => v > 0)
      .map(([type, value]) => ({
        name: TYPE_CONFIG[type]?.label || type,
        value,
        color: TYPE_CONFIG[type]?.color || 'var(--encre-4)',
      }))
      .sort((a, b) => b.value - a.value);
  }), [_bo.lectures.acteurs, acteurs]);

  // ─── Alertes — la seule section qui tolère une lecture partielle ──────────
  //
  // AVANT : les trois compteurs valaient 0 en cas de panne, la liste restait
  // vide, et l'écran affichait « Aucune alerte activée — Tout est en ordre.
  // Aucune action urgente requise. » sur un back-office qui n'avait rien lu.
  //
  // MAINTENANT : une source lue produit ses alertes ; une source qu'on n'a pas
  // pu lire produit une alerte qui LE DIT, avec sa raison ; et la phrase
  // rassurante n'est produite que si les trois ont répondu.
  const alertes = useMemo(() => alertesBO({
    dossiers: _bo.lectures.dossiers,
    acteurs: _bo.lectures.acteurs,
    missions: _bo.lectures.missions,
  }), [_bo.lectures.dossiers, _bo.lectures.acteurs, _bo.lectures.missions]);

  // ─── Ticker : dernières transactions réelles ──────────────────────────────
  const tickerItems = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime()).slice(0, 10);
    if (sorted.length === 0) return [{ nom: 'Aucune transaction', type: '', montant: '0', region: '', positif: true }];
    return sorted.map(t => ({
      nom: t.acteurNom || 'Acteur',
      type: t.acteurType || '',
      montant: (t.montant || 0).toLocaleString('fr-FR'),
      region: t.region || '',
      positif: (t.montant || 0) >= 0,
    }));
  }, [transactions]);

  // ─── Top 5 identificateurs ────────────────────────────────────────────────
  const sectionIdentificateurs = useMemo(() => sectionDe([_bo.lectures.acteurs, _bo.lectures.dossiers], () => {
    const identActeurs = acteurs.filter(a => a.type === 'identificateur');
    if (identActeurs.length === 0) return [];
    const dossiersParIdent: Record<string, number> = {};
    dossiers.forEach(d => {
      const key = typeof d.identificateurNom === 'string' ? d.identificateurNom : '';
      if (key && key !== 'Non assigné') {
        dossiersParIdent[key] = (dossiersParIdent[key] || 0) + 1;
      }
    });
    return identActeurs
      .map(a => {
        const nom = `${a.prenoms} ${a.nom}`.trim();
        const nbDossiers = dossiersParIdent[nom] || 0;
        const zoneId = typeof a.zoneId === 'string' ? a.zoneId : '';
        const resolvedZone = a.region || (zoneId ? zonesMap[zoneId] : '') || 'Non défini';
        return {
          nom,
          zone: resolvedZone,
          dossiers: nbDossiers,
          taux: 0,
        };
      })
      .sort((a, b) => b.dossiers - a.dossiers)
      .slice(0, 5);
  }), [_bo.lectures.acteurs, _bo.lectures.dossiers, acteurs, dossiers, zonesMap]);

  // ─── Objectifs nationaux — les quatre barres de progression ──────────────
  //
  // Trois des quatre sont des POURCENTAGES d'un total. Sans le total, elles
  // n'existent pas — et l'écran écrivait `totalActeurs > 0 ? … : 0`, donc 0 %
  // quand rien n'avait été lu. Une barre à 0 % face à une cible de 95 % se lit
  // comme un échec de terrain, pas comme une absence de mesure.
  //
  // Les couleurs restent ici : la règle dit ce qui est vrai, l'écran dit à
  // quoi ça ressemble.
  const sectionObjectifs = useMemo(
    () => objectifsBO(kpis.totalActeurs, kpis.actifs, _bo.lectures.acteurs),
    [kpis.totalActeurs, kpis.actifs, _bo.lectures.acteurs],
  );

  // ─── Actions rapides ─────────────────────────────────────────────────────
  const quickActions = [
    { label: 'Valider dossiers', icon: CheckCircle2, path: '/backoffice/enrolement', color: '#10B981', badge: kpis.enAttente.type === 'nombre' && kpis.enAttente.valeur > 0 ? kpis.enAttente.valeur : null },
    { label: 'Supervision', icon: Eye, path: '/backoffice/supervision', color: '#3B82F6' },
    { label: 'Rapports', icon: BarChart3, path: '/backoffice/rapports', color: '#8B5CF6' },
    { label: 'Acteurs', icon: Users, path: '/backoffice/acteurs', color: BO_PRIMARY },
    { label: 'Missions', icon: Target, path: '/backoffice/missions', color: '#10B981', badge: _bo.lectures.missions.type === 'lue'
        ? (_bo.lectures.missions.valeur.filter(m => m.statut === 'en_cours').length || null)
        : null },
  ];

  // ─── Ticker auto-scroll ───────────────────────────────────────────────────
  useEffect(() => {
    if (tickerItems.length <= 1) return;
    const interval = setInterval(() => {
      setTickerIndex(i => (i + 1) % tickerItems.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [tickerItems.length]);

  const currentTicker = tickerItems[tickerIndex] || tickerItems[0];

  const liveStatus = (() => {
    if (rt.connected && ws.isConnected && !rt.error) {
      return {
        wrapper: 'bg-green-50 border-green-200',
        dot: 'bg-green-500',
        text: 'text-green-700',
        label: 'En direct',
      };
    }
    if (!rt.connected && !ws.isConnected) {
      return {
        wrapper: 'bg-red-50 border-red-200',
        dot: 'bg-red-500',
        text: 'text-red-700',
        label: 'Hors ligne',
      };
    }
    return {
      wrapper: 'bg-orange-50 border-orange-200',
      dot: 'bg-orange-500',
      text: 'text-orange-700',
      label: 'Synchronisation',
    };
  })();

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto space-y-6 overflow-hidden">
      {rt.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg mb-4 text-sm">
          Connexion temps réel dégradée - les données peuvent ne pas être à jour.
        </div>
      )}

      {/* Header */}
      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
        className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-gray-900">Tableau de bord</h1>
          <p className="text-sm text-gray-500 font-medium mt-0.5">
            Vue nationale - {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <motion.div className={`flex items-center gap-2 px-3 py-2 rounded-2xl border-2 ${liveStatus.wrapper}`}
          animate={{ opacity: [1, 0.7, 1] }} transition={{ duration: 2, repeat: Infinity }}>
          <div className={`w-2 h-2 rounded-full ${liveStatus.dot}`} />
          <span className={`text-xs font-bold ${liveStatus.text}`}>{liveStatus.label}</span>
        </motion.div>
      </motion.div>

      {/* Ticker live - dernières transactions réelles */}
      {_bo.hasPermission('dashboard.live') && (
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border-2 overflow-hidden shadow-lg"
        style={{ backgroundColor: BO_DARK, borderColor: `${BO_PRIMARY}30` }}>
        <div className="flex items-stretch">
          {/* Badge LIVE */}
          <motion.div
            className="px-3 py-2 lg:px-5 lg:py-3.5 flex items-center gap-1.5 lg:gap-2.5 flex-shrink-0"
            style={{ backgroundColor: `${BO_PRIMARY}CC`, borderRight: `2px solid ${BO_PRIMARY}50` }}
            animate={{ opacity: [1, 0.85, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Activity className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-white" />
            <span className="text-white text-[10px] lg:text-xs font-black uppercase tracking-[0.15em]">En direct</span>
          </motion.div>

          {/* Contenu ticker */}
          <div className="flex-1 px-3 py-2 lg:px-5 lg:py-3.5 flex items-center overflow-hidden min-w-0">
            <AnimatePresence mode="wait">
              <motion.div key={tickerIndex}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4 }}
                className="flex items-center gap-2 lg:gap-3 text-xs lg:text-sm min-w-0">
                {transactions.length > 0 ? (
                  <>
                    <span className="text-white/50 flex-shrink-0 hidden sm:inline">{'Dernière transaction\u00a0:'}</span>
                    <span className="font-bold text-white truncate">{currentTicker.nom}</span>
                    {currentTicker.type && <span className="text-white/40 truncate hidden md:inline">({currentTicker.type}{currentTicker.region ? ` - ${currentTicker.region}` : ''})</span>}
                    <span className={`font-black flex-shrink-0 ${currentTicker.positif ? 'text-green-400' : 'text-red-400'}`}>
                      {currentTicker.positif ? '+' : ''}{currentTicker.montant} FCFA
                    </span>
                  </>
                ) : (
                  <span className="text-white/60 font-medium text-xs">Aucune transaction enregistrée</span>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Horloge + sparkline timeline 2h */}
          <div className="flex items-stretch flex-shrink-0">
            <div
              className="px-3 py-2 lg:px-5 lg:py-3.5 flex items-center"
              style={{ borderLeft: `2px solid ${BO_PRIMARY}25` }}
            >
              <span className="text-sm lg:text-base font-black tabular-nums text-white">
                {clockNow.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
            <div
              className="flex items-center gap-1.5 px-2 py-1 lg:px-3 flex-shrink-0"
              style={{ borderLeft: `2px solid ${BO_PRIMARY}25`, maxHeight: 44 }}
            >
              <span className="text-xs text-white/60 flex-shrink-0">2h</span>
              <div className="flex-shrink-0" style={{ width: 120, height: 32 }}>
                {timelineChartData.length > 0 ? (
                  <ResponsiveContainer width={120} height={32}>
                    <LineChart data={timelineChartData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
                      <Line
                        type="monotone"
                        dataKey="transactions"
                        stroke={BO_LIGHT}
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
      )}

      {/* LES SEPT COMPTEURS — BO-01.
          Chacun passe par `kpiTuile` : un nombre LU s'affiche (zéro compris),
          une lecture en cours dit « Lecture… », une lecture échouée dit
          « Indisponible » et porte sa raison dans l'explication. Aucun de ces
          trois cas ne peut plus en devenir un autre. */}
      {_bo.hasPermission('dashboard.read') && (
      <KPIGrid>
        <UniversalKPI label="Total acteurs" {...kpiTuile(kpis.totalActeurs)} sub="enregistrés" icon={Users} color={BO_PRIMARY} onClick={() => navigate('/backoffice/acteurs')} delay={0} />
        <UniversalKPI label="Acteurs actifs" {...kpiTuile(kpis.actifs)} sub="du total" icon={UserCheck} color="#10B981" onClick={() => navigate('/backoffice/acteurs')} delay={0.04} />
        <UniversalKPI
          label="Volume total"
          {...kpiTuile(kpis.volumeTotal, montantCourt)}
          suffix={kpis.volumeTotal.type === 'nombre' ? 'FCFA' : undefined}
          sub="toutes transactions"
          icon={Wallet}
          color="#3B82F6"
          onClick={() => navigate('/backoffice/supervision')}
          delay={0.08}
        />
        <UniversalKPI label="Suspendus" {...kpiTuile(kpis.suspendus)} sub="acteurs" icon={XCircle} color="#EF4444" iconAnimation="pulse" onClick={() => navigate('/backoffice/acteurs')} delay={0.16} />
        <UniversalKPI label="En attente" {...kpiTuile(kpis.enAttente)} sub="dossiers à valider"
          icon={Clock} color="#F59E0B"
          iconAnimation={kpis.enAttente.type === 'nombre' && kpis.enAttente.valeur > 0 ? 'pulse' : 'float'}
          onClick={() => navigate('/backoffice/enrolement')} delay={0.2} />
        <UniversalKPI label="Transactions" {...kpiTuile(kpis.transactions)} sub="enregistrées" icon={Activity} color={BO_DARK} onClick={() => navigate('/backoffice/supervision')} delay={0.24} />
        <UniversalKPI
          label="Zones actives"
          {...kpiTuile(kpis.zonesActives)}
          sub={sousTitreZones(kpis.zonesTotal)}
          icon={MapPin}
          color="#B74725"
          onClick={() => navigate('/backoffice/zones')}
          delay={0.28}
        />
      </KPIGrid>
      )}

      {/* Actions rapides */}
      {_bo.hasPermission('dashboard.acces_rapide') && (
      <UniversalSectionCardBO
        title="Accès rapide"
        icon={Zap}
        iconAnimated={true}
        variant="default"
        delay={0.05}
      >
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {quickActions.map(action => {
            const Icon = action.icon || Zap;
            return (
              <motion.button
                key={action.label}
                onClick={() => navigate(action.path)}
                className="flex flex-col items-center gap-2 p-3 rounded-2xl border-2 border-gray-100 hover:border-gray-200 transition-all relative"
                whileHover={{ y: -3, boxShadow: `0 8px 20px ${action.color}20` }}
                whileTap={{ scale: 0.95 }}
              >
                {action.badge !== null && action.badge !== undefined && action.badge > 0 && (
                  <motion.span
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center z-10"
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    {action.badge}
                  </motion.span>
                )}
                <motion.div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ backgroundColor: `${action.color}15` }}
                  whileHover={{ rotate: [0, -5, 5, 0] }}
                  transition={{ duration: 0.4 }}
                >
                  <Icon className="w-5 h-5" style={{ color: action.color }} />
                </motion.div>
                <span className="text-[10px] font-bold text-gray-700 text-center leading-tight">{action.label}</span>
              </motion.button>
            );
          })}
        </div>
      </UniversalSectionCardBO>
      )}

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

        {/* Croissance mensuelle - données réelles */}
        {_bo.hasPermission('dashboard.inscriptions') && (
        <div className="lg:col-span-2 h-full">
          <UniversalSectionCardBO
            title="Inscriptions mensuelles"
            icon={TrendingUp}
            iconAnimated={true}
            variant="info"
            delay={0.1}
            shimmer={true}
            className="h-full"
            headerActions={
              <UniversalDropdownMenuBO
                trigger={
                  <motion.button
                    type="button"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full border-2"
                    style={{ borderColor: BO_PRIMARY, color: BO_PRIMARY }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-xs font-bold">{monthsRange} derniers mois</span>
                    <ChevronDown className="w-3 h-3" />
                  </motion.button>
                }
                triggerAriaLabel="Sélecteur de période"
                items={[
                  { id: '3m', label: '3 derniers mois', onClick: () => setMonthsRange(3) },
                  { id: '6m', label: '6 derniers mois', onClick: () => setMonthsRange(6) },
                  { id: '7m', label: '7 derniers mois', onClick: () => setMonthsRange(7) },
                  { id: '12m', label: '12 derniers mois', onClick: () => setMonthsRange(12) },
                ]}
                align="right"
                minWidth={180}
              />
            }
          >
            <p className="text-xs text-gray-700 mb-4">Nouveaux acteurs et transactions par mois</p>
            <BlocSection etat={sectionCroissance} hauteur="h-[210px]">{(monthlyData) => (
            monthlyData.every(m => m.acteurs === 0 && m.transactions === 0) ? (
              <div className="h-[210px] flex items-center justify-center text-gray-400 text-sm font-semibold">
                Aucune donnée disponible
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart data={Array.isArray(monthlyData) ? monthlyData : []}>
                    <defs>
                      <linearGradient id="colorActeurs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={BO_PRIMARY} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={BO_PRIMARY} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorTx" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="mois" tick={{ fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[(dataMin: number) => 0, (dataMax: number) => Math.max(dataMax, 1)]} allowDataOverflow={false} />
                    <Tooltip contentStyle={{ borderRadius: '16px', border: `2px solid ${BO_PRIMARY}20`, fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }} />
                    <Area type="monotone" dataKey="acteurs" stroke={BO_PRIMARY} fill="url(#colorActeurs)" strokeWidth={2.5} name="Acteurs" isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
                    <Area type="monotone" dataKey="transactions" stroke="#3B82F6" fill="url(#colorTx)" strokeWidth={2.5} name="Transactions" isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" animationBegin={300} />
                  </AreaChart>
                </ResponsiveContainer>
                <motion.div
                  className="flex justify-around items-center mt-3 pt-3 border-t border-gray-100"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: BO_PRIMARY }} />
                    <span className="text-xs text-gray-700">
                      Total acteurs sur la période :
                      <strong className="ml-1 text-gray-900">
                        {monthlyData.reduce((s, m) => s + m.acteurs, 0).toLocaleString('fr-FR')}
                      </strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#3B82F6' }} />
                    <span className="text-xs text-gray-700">
                      Total transactions :
                      <strong className="ml-1 text-gray-900">
                        {monthlyData.reduce((s, m) => s + m.transactions, 0).toLocaleString('fr-FR')}
                      </strong>
                    </span>
                  </div>
                </motion.div>
              </motion.div>
            )
            )}</BlocSection>
          </UniversalSectionCardBO>
        </div>
        )}

        {/* Répartition par type - données réelles */}
        {_bo.hasPermission('dashboard.repartition') && (
        <div className="h-full">
          <UniversalSectionCardBO
            title="Répartition"
            icon={BarChart3}
            iconAnimated={true}
            variant="warm"
            delay={0.15}
            shimmer={true}
            className="h-full"
          >
            <p className="text-xs text-gray-700 mb-4">Par type d'acteur</p>
            <BlocSection etat={sectionRepartition} hauteur="h-[150px]">{(typeData) => (
            typeData.length === 0 ? (
              <div className="h-[150px] flex items-center justify-center text-gray-400 text-sm font-semibold">
                Aucun acteur enregistré
              </div>
            ) : (
              <>
                <motion.div
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.25, duration: 0.6, type: 'spring', stiffness: 200 }}
                >
                  <div
                    style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
                  >
                    <ResponsiveContainer width="100%" height={150}>
                      <PieChart>
                        <Pie
                          data={Array.isArray(typeData) ? typeData : []}
                          cx="50%"
                          cy="50%"
                          innerRadius={42}
                          outerRadius={68}
                          dataKey="value"
                          paddingAngle={3}
                          isAnimationActive={true}
                          animationDuration={1200}
                          animationBegin={300}
                          animationEasing="ease-out"
                          label={(props: any) => {
                            const { cx, cy, midAngle, innerRadius, outerRadius, value } = props;
                            const total = typeData.reduce((s, t) => s + t.value, 0);
                            const pct = total > 0 ? (value / total) * 100 : 0;
                            if (pct < 5) return null;
                            const RADIAN = Math.PI / 180;
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            return (
                              <text
                                x={x}
                                y={y}
                                fill="white"
                                textAnchor="middle"
                                dominantBaseline="central"
                                style={{ fontSize: 11, fontWeight: 700, pointerEvents: 'none' }}
                              >
                                {pct.toFixed(0)}%
                              </text>
                            );
                          }}
                          labelLine={false}
                        >
                          {typeData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '12px', fontSize: 12 }} formatter={(v: number) => (v || 0).toLocaleString('fr-FR')} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </motion.div>
                <div className="divide-y divide-gray-100 mt-3">
                  {typeData.map((d, i) => (
                    <motion.div
                      key={d.name}
                      className="flex items-center justify-between py-1.5"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.08 }}
                    >
                      <div className="flex items-center gap-2">
                        <motion.div
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: d.color }}
                          animate={{ scale: [1, 1.2, 1] }}
                          transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                        />
                        <span className="text-xs font-semibold text-gray-800">{d.name}</span>
                      </div>
                      <span className="text-xs font-bold text-gray-900">{(d.value || 0).toLocaleString('fr-FR')}</span>
                    </motion.div>
                  ))}
                </div>
              </>
            )
            )}</BlocSection>
          </UniversalSectionCardBO>
        </div>
        )}
      </div>

      {/* Objectifs nationaux - calculés depuis les vraies données */}
      {_bo.hasPermission('dashboard.objectifs') && (
      <UniversalSectionCardBO
        title="Objectifs nationaux 2026"
        icon={Target}
        iconAnimated={true}
        variant="success"
        delay={0.18}
        shimmer={true}
        headerActions={
          <span className="px-3 py-1.5 rounded-full text-xs font-bold border-2" style={{ borderColor: BO_PRIMARY, color: BO_PRIMARY }}>
            {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </span>
        }
      >
        <p className="text-xs text-gray-700 mb-4">Progression vers les cibles fixées</p>
        <BlocSection etat={sectionObjectifs}>{(objectifs) => (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {objectifs.map((obj, i) => {
            const pct = pourcentageBarre(obj);
            const couleur = COULEURS_OBJECTIFS[obj.label] ?? BO_PRIMARY;
            return (
              <motion.div
                key={obj.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + Math.min(i * 0.06, 0.25) }}
                whileHover={{ y: -2 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-gray-600">{obj.label}</span>
                    {obj.estimation && (
                      <span className="text-[9px] font-semibold text-gray-400 italic">(estimation)</span>
                    )}
                  </div>
                  <motion.span
                    className="text-xs font-black"
                    style={{ color: couleur }}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.06, type: 'spring', stiffness: 300 }}
                  >
                    {pct}%
                  </motion.span>
                </div>
                <BOProgressBar value={pct} color={couleur} height="md" delay={0.3 + i * 0.1} className="mb-2" />
                <div className="flex justify-between text-[10px] text-gray-400">
                  <span>{obj.suffix ? `${obj.current}${obj.suffix}` : (obj.current || 0).toLocaleString()}</span>
                  <span>Cible : {obj.suffix ? `${obj.target}${obj.suffix}` : (obj.target || 0).toLocaleString()}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
        )}</BlocSection>
      </UniversalSectionCardBO>
      )}

      {/* Activité régionale + Alertes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

        {/* Activité par région - données réelles */}
        {_bo.hasPermission('dashboard.activite_region') && (
        <UniversalSectionCardBO
          title="Activité par région"
          icon={MapPin}
          iconAnimated={true}
          variant="warning"
          delay={0.2}
          shimmer={true}
          className="h-full"
          headerActions={
            <motion.button
              onClick={() => navigate('/backoffice/zones')}
              className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl border-2"
              style={{ borderColor: `${BO_PRIMARY}40`, color: BO_PRIMARY }}
              whileTap={{ scale: 0.95 }}
              whileHover={{ x: 2 }}
            >
              Voir tout <ChevronRight className="w-3 h-3" />
            </motion.button>
          }
        >
          <p className="text-xs text-gray-700 mb-4">Acteurs et volume (M FCFA)</p>
          <BlocSection etat={sectionRegions} hauteur="h-32">{(regionData) => {
          const maxRegionActeurs = regionData[0]?.acteurs || 1;
          return (
          regionData.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-gray-400 text-sm font-semibold">
              Aucune donnée régionale disponible
            </div>
          ) : (
            <div className="space-y-6">
              {regionData.map((r, i) => (
                <motion.div
                  key={r.region}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + 0.05 * i }}
                  whileHover={{ y: -2 }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <motion.div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: r.color }}
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                      />
                      <span className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                        {r.region}
                        {(r.region === 'Non défini' || r.region === 'Non défini') && (
                          <span
                            className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full bg-orange-100 cursor-help"
                            title="Acteurs sans région définie - vérifier les enregistrements"
                          >
                            <AlertTriangle className="w-3 h-3 text-orange-600" />
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-semibold text-gray-500">
                      <span>{(r.acteurs || 0).toLocaleString()} acteurs</span>
                      <span className="font-black" style={{ color: r.color }}>{r.volume} M FCFA</span>
                    </div>
                  </div>
                  <BOProgressBar
                    value={(r.acteurs / maxRegionActeurs) * 100}
                    color={r.color}
                    height="sm"
                    delay={0.3 + 0.1 * i}
                  />
                </motion.div>
              ))}
            </div>
          )
          );
          }}</BlocSection>
        </UniversalSectionCardBO>
        )}

        {/* Alertes générées depuis les données réelles */}
        {_bo.hasPermission('dashboard.alertes') && (
        <UniversalSectionCardBO
          title="Alertes activées"
          icon={Bell}
          iconAnimated={true}
          variant={
            alertes.some(a => a.ton === 'critical') ? 'danger'
              : alertes.some(a => a.ton === 'warning') ? 'warning'
                : 'info'
          }
          delay={0.25}
          shimmer={true}
          className="h-full"
          headerActions={
            urgentes(alertes) > 0 ? (
              <motion.div
                className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-50 border-2 border-red-200"
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Zap className="w-3.5 h-3.5 text-red-600" />
                <span className="text-xs font-bold text-red-600">
                  {urgentes(alertes)} urgentes
                </span>
              </motion.div>
            ) : null
          }
        >
          <div className="space-y-3">
            {alertes.map((alerte, i) => {
              // Une source qu'on n'a pas pu lire a son propre ton : ni rouge
              // (ce n'est pas une urgence constatée), ni bleu (ce n'est pas une
              // information rassurante). C'est un trou, et il se voit.
              const isInconnu = alerte.ton === 'inconnu';
              const Icon = isInconnu ? HelpCircle
                : alerte.ton === 'critical' ? ShieldAlert
                  : alerte.ton === 'warning' ? Clock
                    : alerte.id === 4 ? Target : CheckCircle2;
              const isCritical = alerte.ton === 'critical';
              const isWarning = alerte.ton === 'warning';
              return (
                <motion.button
                  key={alerte.id}
                  onClick={() => setActiveAlerte(activeAlerte === alerte.id ? null : alerte.id)}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${isInconnu ? 'bg-gray-50 border-gray-300 border-dashed' : isCritical ? 'bg-red-50 border-red-200' : isWarning ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-start gap-3">
                    <motion.div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isInconnu ? 'bg-gray-200' : isCritical ? 'bg-red-100' : isWarning ? 'bg-orange-100' : 'bg-blue-100'}`}
                      animate={isCritical ? { scale: [1, 1.1, 1], opacity: [1, 0.85, 1] } : {}} transition={{ duration: 1.5, repeat: Infinity }}>
                      <Icon className={`w-5 h-5 ${isInconnu ? 'text-gray-600' : isCritical ? 'text-red-600' : isWarning ? 'text-orange-600' : 'text-blue-600'}`} />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <p className="font-bold text-sm text-gray-900">{alerte.titre}</p>
                        <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{alerte.temps}</span>
                      </div>
                      <AnimatePresence>
                        {activeAlerte === alerte.id && (
                          <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                            className="text-xs text-gray-600 mt-1">{alerte.desc}</motion.p>
                        )}
                      </AnimatePresence>
                      {activeAlerte !== alerte.id && (
                        <p className="text-xs text-gray-500 truncate">{alerte.desc}</p>
                      )}
                      <div className="flex items-center gap-1 mt-1.5">
                        <MapPin className="w-3 h-3 text-gray-400" />
                        <span className="text-[10px] text-gray-400 font-semibold">{alerte.region}</span>
                      </div>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </UniversalSectionCardBO>
        )}
      </div>

      {/* Performance identificateurs - données réelles */}
      {_bo.hasPermission('dashboard.perf_identificateurs') && (
      <UniversalSectionCardBO
        title="Performance des identificateurs"
        icon={Award}
        iconAnimated={true}
        variant="default"
        delay={0.28}
        headerActions={
          <motion.button
            onClick={() => navigate('/backoffice/acteurs')}
            className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl border-2"
            style={{ borderColor: `${BO_PRIMARY}40`, color: BO_PRIMARY }}
            whileTap={{ scale: 0.95 }}
            whileHover={{ x: 2 }}
          >
            Tous les identificateurs <ChevronRight className="w-3 h-3" />
          </motion.button>
        }
      >
        <p className="text-xs text-gray-700 mb-4">Top identificateurs - dossiers traités</p>
        <BlocSection etat={sectionIdentificateurs}>{(topIdentificateurs) => (
        topIdentificateurs.length === 0 ? (
          <div className="py-10 flex flex-col items-center justify-center text-gray-400">
            <Users className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm font-semibold">Aucun identificateur enregistré</p>
          </div>
        ) : (
          <div className="space-y-3">
            {topIdentificateurs.map((ident, i) => {
              const maxDossiers = topIdentificateurs[0]?.dossiers || 1;
              const medalColor = i === 0 ? '#F59E0B' : i === 1 ? '#9CA3AF' : i === 2 ? '#B74725' : BO_DARK;
              return (
                <motion.div
                  key={ident.nom}
                  className="flex items-center gap-4 p-3 rounded-2xl bg-gray-50 border-2 border-gray-100"
                  initial={{ opacity: 0, x: -15 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + Math.min(i * 0.04, 0.25) }}
                  whileHover={{ y: -2, scale: 1.01 }}
                >
                  <motion.div
                    className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 text-white"
                    style={{ backgroundColor: medalColor }}
                    animate={i === 0 ? { rotate: [0, 5, -5, 0] } : {}}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    {i + 1}
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-bold text-sm text-gray-900 truncate">{ident.nom}</p>
                    </div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                      <span className="text-[10px] text-gray-500 truncate">{ident.zone}</span>
                      <span className="text-[10px] font-bold text-gray-700 flex-shrink-0 ml-auto">{ident.dossiers} dossiers</span>
                    </div>
                    <BOProgressBar
                      value={maxDossiers > 0 ? (ident.dossiers / maxDossiers) * 100 : 0}
                      color={BO_PRIMARY}
                      height="xs"
                      delay={0.4 + i * 0.08}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )
        )}</BlocSection>
      </UniversalSectionCardBO>
      )}

      {/* Widget Qualité des données */}
      {_bo.hasPermission('dashboard.qualite_donnees') && (
      <UniversalSectionCardBO
        title="Qualité des données"
        icon={Activity}
        iconAnimated={true}
        variant="success"
        delay={0.32}
        shimmer={true}
        headerActions={(() => {
          const profilsComplets = acteurs.filter(a => a.nom && a.prenoms && a.telephone && a.region).length;
          const total = acteurs.length || 1;
          const pct = Math.round((profilsComplets / total) * 100);
          return (
            <motion.div
              className="px-3 py-1.5 rounded-full border-2 flex items-center gap-1.5"
              style={{ borderColor: `${BO_PRIMARY}40`, backgroundColor: `${BO_PRIMARY}08` }}
              animate={{ scale: [1, 1.03, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <Activity className="w-3.5 h-3.5" style={{ color: BO_PRIMARY }} />
              <span className="text-xs font-black" style={{ color: BO_PRIMARY }}>
                {pct}%
              </span>
            </motion.div>
          );
        })()}
      >
        <p className="text-xs text-gray-700 mb-4">État de santé de la base de données</p>
        <KPIGrid cols={4}>
          <UniversalKPI
            label="Profils complets"
            value={`${acteurs.length > 0 ? Math.round((acteurs.filter(a => a.nom && a.prenoms && a.telephone && a.region).length / acteurs.length) * 100) : 0}%`}
            icon={CheckCircle2}
            color="#10B981"
            delay={0.4}
          />
          <UniversalKPI
            label="Doublons détectés"
            value={(() => {
              const phones = acteurs.map(a => normalizePhone(a.telephone)).filter(Boolean);
              const dupes = phones.length - new Set(phones).size;
              return String(dupes);
            })()}
            icon={AlertTriangle}
            color="#EF4444"
            delay={0.45}
          />
          <UniversalKPI
            label="Dossiers > 72h"
            value={String(dossiers.filter(d => d.statut === 'en_attente' && (Date.now() - new Date(typeof d.dateCreation === 'string' ? d.dateCreation : '').getTime()) > 72 * 3600000).length)}
            icon={Clock}
            color="#F59E0B"
            delay={0.5}
          />
          <UniversalKPI
            label="Score global"
            value={(() => {
              const profilsComplets = acteurs.length > 0 ? (acteurs.filter(a => a.nom && a.prenoms && a.telephone && a.region).length / acteurs.length) * 100 : 0;
              const phones = acteurs.map(a => normalizePhone(a.telephone)).filter(Boolean);
              const dupes = phones.length - new Set(phones).size;
              const dupePenalty = dupes > 5 ? 20 : dupes > 0 ? 10 : 0;
              const score = Math.max(0, Math.round(profilsComplets - dupePenalty));
              return `${score}/100`;
            })()}
            icon={Activity}
            color={BO_PRIMARY}
            delay={0.55}
          />
        </KPIGrid>
      </UniversalSectionCardBO>
      )}


      {/* Temps réel : activité + santé système */}
      <motion.div
        className="pt-4 mt-2 border-t-2 border-dashed border-gray-200"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Monitoring temps réel
        </p>
      </motion.div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">

        {/* Fil d'activité live */}
        {_bo.hasPermission('dashboard.activite_directe') && (
        <UniversalSectionCardBO
          title="Activité en direct"
          icon={Activity}
          iconAnimated={true}
          variant="info"
          delay={0.4}
          noPadding={true}
          className="h-full"
          headerActions={
            <div className="flex items-center gap-2">
              {isLiveActivity
                ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 px-2 py-1 rounded-xl">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    En direct
                  </span>
                )
                : <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-xl">Sync</span>
              }
              <button onClick={rt.refresh} className="p-1.5 rounded-xl hover:bg-gray-100 transition-colors" aria-label="Rafraîchir">
                <RefreshCw className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          }
        >
          <LiveActivityFeed events={rt.activity} loading={rt.loading} totalCount={rt.activity.length} />
        </UniversalSectionCardBO>
        )}

        {/* Santé système */}
        {_bo.hasPermission('dashboard.sante_systeme') && (
        <UniversalSectionCardBO
          title="Santé système"
          icon={HeartPulse}
          iconAnimated={true}
          variant={rt.health?.status === 'ok' ? 'success' : 'danger'}
          delay={0.45}
          className="h-full"
          headerActions={
            <div className="flex items-center gap-2">
              <motion.div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: rt.health?.status === 'ok' ? '#10B981' : '#EF4444' }}
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <span
                className={`text-[10px] font-bold px-2 py-1 rounded-xl ${
                  rt.health?.status === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}
              >
                {rt.health?.status === 'ok' ? 'Opérationnel' : rt.health?.status === 'degraded' ? 'Dégradé' : 'Hors ligne'}
              </span>
            </div>
          }
        >
          <SystemHealthPanel health={rt.health} connected={rt.connected} lastUpdate={rt.lastUpdate} />
        </UniversalSectionCardBO>
        )}

      </div>

    </div>
  );
}