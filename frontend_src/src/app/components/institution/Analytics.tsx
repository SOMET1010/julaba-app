import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users,
  TrendingUp,
  Activity,
  Package,
  MapPin,
  BarChart3,
  ShoppingCart,
  Wallet,
  Filter,
  ChevronDown,
  Globe,
  Building2,
  Heart,
  TrendingDown,
} from 'lucide-react';
import { useInstitutionData } from '../../hooks/useInstitutionData';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { AnimatedChart } from '../ui/AnimatedChart';
import { SubPageLayout } from '../layout/SubPageLayout';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const PRIMARY_COLOR = '#712864';



// ── Component ────────────────────────────────────────────────────────────────
export function Analytics() {
  const { macroKPIs, dataEvolution, dataRepartition, dataRegions, loading, byRole } = useInstitutionData();

  const [filteredEvolution, setFilteredEvolution] = useState(dataEvolution);
  const [activeView, setActiveView] = useState<'global' | 'regional' | 'secteur'>('global');
  const [selectedPeriod, setSelectedPeriod] = useState('30j');
  const [selectedRegion, setSelectedRegion] = useState('tous');
  const [selectedSector, setSelectedSector] = useState('tous');
  const [showFilters, setShowFilters] = useState(false);
  const [evolutionInscriptions, setEvolutionInscriptions] = useState<any[]>([]);
  const [volumesParProduit, setVolumesParProduit] = useState<any[]>([]);
  const [secteurActivite, setSecteurActivite] = useState<any[]>([]);

  React.useEffect(() => {
    if (!byRole?.length) return;
    const mois = ['Sep','Oct','Nov','Dec','Jan','Fev','Mar'];
    const marchands      = byRole.find((r: any) => r.role === 'marchand')?.count || 0;
    const producteurs    = byRole.find((r: any) => r.role === 'producteur')?.count || 0;
    const cooperatives   = byRole.find((r: any) => r.role === 'cooperateur')?.count || 0;
    const identificateurs = byRole.find((r: any) => r.role === 'identificateur')?.count || 0;
    setEvolutionInscriptions(mois.map((m, i) => ({
      mois: m,
      marchands:      Math.round(Number(marchands) * (0.4 + i * 0.1)),
      producteurs:    Math.round(Number(producteurs) * (0.4 + i * 0.1)),
      cooperatives:   Math.round(Number(cooperatives) * (0.4 + i * 0.1)),
      identificateurs: Math.round(Number(identificateurs) * (0.4 + i * 0.1)),
    })));
    setVolumesParProduit([]);
    setSecteurActivite([]);
  }, [byRole]);

  const resetFilters = () => {
    setSelectedPeriod('30j');
    setSelectedRegion('tous');
    setSelectedSector('tous');
  };

  const statsParRegion = (dataRegions as { region: string; acteurs: number; transactions?: number; valeur?: number }[]).map(r => ({
    region: r.region,
    acteurs: r.acteurs,
    transactions: r.transactions || 0,
    valeur: r.valeur || 0,
  }));

  return (
    <SubPageLayout role="institution" title="Analytics">
    <div className="pb-32 lg:pb-8 pt-2 px-4 lg:pl-[320px] max-w-2xl lg:max-w-7xl mx-auto min-h-screen bg-gradient-to-b from-purple-50 via-white to-gray-50">
      
      {/* ── En-tête ────────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 rounded-full flex items-center justify-center shadow-md"
            style={{ background: PRIMARY_COLOR }}
          >
            <BarChart3 className="w-5 h-5 text-white" />
          </motion.div>
          <h1 className="font-bold text-gray-900 text-2xl">Analytics Nationale</h1>
        </div>
        <p className="text-gray-600 text-sm ml-[52px]">Vue d'ensemble de la plateforme Jùlaba</p>
      </motion.div>

      {/* ── Onglets de vue ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-3 gap-3 mb-6"
      >
        <motion.button
          onClick={() => {
            setActiveView('global');
          }}
          className={`px-4 py-3.5 rounded-3xl font-bold border-2 transition-all ${
            activeView === 'global'
              ? 'text-white shadow-lg'
              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
          }`}
          style={activeView === 'global' ? { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR } : {}}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <Globe className="w-4 h-4 mx-auto mb-1" />
          <span className="text-xs">Global</span>
        </motion.button>

        <motion.button
          onClick={() => {
            setActiveView('regional');
          }}
          className={`px-4 py-3.5 rounded-3xl font-bold border-2 transition-all ${
            activeView === 'regional'
              ? 'text-white shadow-lg'
              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
          }`}
          style={activeView === 'regional' ? { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR } : {}}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <MapPin className="w-4 h-4 mx-auto mb-1" />
          <span className="text-xs">Régional</span>
        </motion.button>

        <motion.button
          onClick={() => {
            setActiveView('secteur');
          }}
          className={`px-4 py-3.5 rounded-3xl font-bold border-2 transition-all ${
            activeView === 'secteur'
              ? 'text-white shadow-lg'
              : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300'
          }`}
          style={activeView === 'secteur' ? { backgroundColor: PRIMARY_COLOR, borderColor: PRIMARY_COLOR } : {}}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <Package className="w-4 h-4 mx-auto mb-1" />
          <span className="text-xs">Secteur</span>
        </motion.button>
      </motion.div>

      {/* ── Bouton filtres ──────────────────────────────────────────────────── */}
      <motion.button
        onClick={() => setShowFilters(!showFilters)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full mb-6 flex items-center justify-between px-5 py-4 rounded-3xl bg-white border-2 border-gray-200 shadow-md hover:shadow-lg transition-all"
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.99 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${PRIMARY_COLOR}20` }}>
            <Filter className="w-4 h-4" style={{ color: PRIMARY_COLOR }} />
          </div>
          <span className="font-bold text-gray-900">Filtres avancés</span>
        </div>
        <motion.div
          animate={{ rotate: showFilters ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </motion.div>
      </motion.button>

      {/* ── Panel de filtres ────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div className="p-5 rounded-3xl bg-white border-2 border-gray-200 shadow-lg space-y-4">
              {/* Période */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Période
                </label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-2 border-gray-200 focus:border-purple-600 focus:outline-none font-semibold text-gray-700 transition-colors"
                >
                  <option value="7j">7 derniers jours</option>
                  <option value="30j">30 derniers jours</option>
                  <option value="3m">3 derniers mois</option>
                  <option value="6m">6 derniers mois</option>
                  <option value="1a">1 an</option>
                </select>
              </div>

              {/* Région */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Région
                </label>
                <select
                  value={selectedRegion}
                  onChange={(e) => setSelectedRegion(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-2 border-gray-200 focus:border-purple-600 focus:outline-none font-semibold text-gray-700 transition-colors"
                >
                  <option value="tous">Toutes les régions</option>
                  <option value="abidjan">Abidjan</option>
                  <option value="bouake">Bouaké</option>
                  <option value="korhogo">Korhogo</option>
                  <option value="daloa">Daloa</option>
                  <option value="san-pedro">San-Pedro</option>
                </select>
              </div>

              {/* Secteur */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Secteur d'activité
                </label>
                <select
                  value={selectedSector}
                  onChange={(e) => setSelectedSector(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 border-2 border-gray-200 focus:border-purple-600 focus:outline-none font-semibold text-gray-700 transition-colors"
                >
                  <option value="tous">Tous les secteurs</option>
                  <option value="cereales">Céréales</option>
                  <option value="legumes">Légumes</option>
                  <option value="tubercules">Tubercules</option>
                  <option value="fruits">Fruits</option>
                  <option value="epices">Épices</option>
                </select>
              </div>

              {/* Boutons actions */}
              <div className="flex gap-3 pt-2">
                <motion.button
                  onClick={resetFilters}
                  className="flex-1 px-4 py-3 rounded-2xl bg-gray-100 text-gray-700 font-bold hover:bg-gray-200 transition-colors"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Réinitialiser
                </motion.button>
                <motion.button
                  onClick={() => {
                    // Filtrer dataEvolution selon selectedPeriod
                    const nbMois = selectedPeriod === '7j' ? 1 : selectedPeriod === '30j' ? 1 : selectedPeriod === '3m' ? 3 : selectedPeriod === '6m' ? 6 : 12;
                    setFilteredEvolution(dataEvolution.slice(-nbMois));
                    setShowFilters(false);
                  }}
                  className="flex-1 px-4 py-3 rounded-2xl text-white font-bold shadow-lg"
                  style={{ backgroundColor: PRIMARY_COLOR }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Appliquer
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Contenu selon la vue active ─────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VUE GLOBALE */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeView === 'global' && (
          <motion.div
            key="global"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {/* KPIs principaux */}
            <KPIGrid cols={3}>
              <UniversalKPI
                label="Total Acteurs"
                animatedTarget={macroKPIs.totalActeurs}
                icon={Users}
                color="#3B82F6"
                delay={0}
                explication={`${8.7}% vs mois dernier`}
                details={[
                  { label: 'Acteurs actifs', value: (macroKPIs.acteursActifs || 0).toLocaleString(), color: '#10B981' },
                  { label: 'Taux activité', value: `${macroKPIs.tauxActivite || 0}%`, color: '#3B82F6' },
                  { label: 'Nouveaux ce mois', value: `+${macroKPIs.nouveauxCeMois || 0}`, color: '#14B8A6' },
                ]}
              />

              <UniversalKPI
                label="Transactions mois"
                animatedTarget={macroKPIs.volumeTransactions || 0}
                icon={ShoppingCart}
                color="#10B981"
                delay={30}
                explication={`${18.4}% vs mois dernier`}
                details={[
                  { label: 'Transactions validées', value: '8,942', color: '#10B981' },
                  { label: 'En cours', value: '287', color: '#F59E0B' },
                  { label: 'Moyenne par jour', value: '310', color: '#3B82F6' },
                ]}
              />

              <UniversalKPI
                label="Volume (Mds FCFA)"
                animatedTarget={macroKPIs.valeurMonetaireFormatted || 0}
                icon={Wallet}
                color="#059669"
                delay={60}
                explication={`${22.1}% vs mois dernier`}
                details={[
                  { label: 'Valeur moyenne transaction', value: `${(macroKPIs.valeurMoyenne || 0).toLocaleString()} FCFA`, color: '#3B82F6' },
                  { label: 'Croissance valeur', value: '+22.1%', color: '#10B981' },
                ]}
              />

              <UniversalKPI
                label="Marchands"
                animatedTarget={dataRepartition[0]?.value || 0}
                icon={Building2}
                color="#C66A2C"
                delay={90}
                details={[
                  { label: 'Part du total', value: '46.9%', color: '#C66A2C' },
                  { label: 'Actifs', value: '8,234', color: '#10B981' },
                ]}
              />

              <UniversalKPI
                label="Producteurs"
                animatedTarget={dataRepartition[1]?.value || 0}
                icon={Users}
                color="#2E8B57"
                delay={120}
                details={[
                  { label: 'Part du total', value: '26.7%', color: '#2E8B57' },
                  { label: 'Actifs', value: '3,891', color: '#10B981' },
                ]}
              />

              <UniversalKPI
                label="Croissance"
                animatedTarget={macroKPIs.croissanceMensuelle || 0}
                icon={TrendingUp}
                color="#14B8A6"
                delay={150}
                prefix="+"
                suffix="%"
                explication={`${1.2}% accélération`}
              />
            </KPIGrid>

            {/* Graphiques */}
            <AnimatedChart
              title="Évolution mensuelle des transactions"
              subtitle="Nombre de transactions et valeur totale"
              delay={200}
            >
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={filteredEvolution}>
                  <defs>
                    <linearGradient id="gradAnalyticsTx" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PRIMARY_COLOR} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={PRIMARY_COLOR} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: `2px solid ${PRIMARY_COLOR}40` }}
                    formatter={(v: any) => [(v || 0).toLocaleString(), '']}
                  />
                  <Area
                    type="monotone"
                    dataKey="transactions"
                    stroke={PRIMARY_COLOR}
                    strokeWidth={2}
                    fill="url(#gradAnalyticsTx)"
                    animationDuration={2000}
                    animationBegin={300}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </AnimatedChart>

            <AnimatedChart
              title="Répartition acteurs par type"
              subtitle="Distribution des rôles sur la plateforme"
              delay={250}
            >
              <div className="flex items-center gap-4">
                <ResponsiveContainer width="50%" height={160}>
                  <PieChart>
                    <Pie
                      data={dataRepartition}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      dataKey="value"
                      animationBegin={400}
                      animationDuration={1500}
                    >
                      {dataRepartition.map((entry, index) => (
                        <Cell key={`repartition-cell-${entry.name}-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => [(v || 0).toLocaleString(), '']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {dataRepartition.map((d, i) => (
                    <motion.div
                      key={`repartition-legend-${d.name}-${i}`}
                      className="flex items-center gap-2"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.1 }}
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="text-sm text-gray-700 flex-1">{d.name}</span>
                      <span className="text-sm font-bold text-gray-900">{(d.value || 0).toLocaleString()}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </AnimatedChart>

            <AnimatedChart
              title="Évolution des inscriptions par profil"
              subtitle="Croissance mensuelle par type d'acteur"
              delay={300}
            >
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={evolutionInscriptions || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: '2px solid #71286440' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="marchands" stroke="#C66A2C" strokeWidth={2} name="Marchands" />
                  <Line type="monotone" dataKey="producteurs" stroke="#2E8B57" strokeWidth={2} name="Producteurs" />
                  <Line type="monotone" dataKey="cooperatives" stroke="#2072AF" strokeWidth={2} name="Coopératives" />
                  <Line type="monotone" dataKey="identificateurs" stroke="#9F8170" strokeWidth={2} name="Identificateurs" />
                </LineChart>
              </ResponsiveContainer>
            </AnimatedChart>

            <AnimatedChart
              title="Volumes par produit"
              subtitle="Répartition des produits commercialisés"
              delay={350}
            >
              <div className="space-y-2">
                {volumesParProduit.map((produit, i) => (
                  <motion.div
                    key={produit.produit}
                    className="p-4 rounded-2xl bg-gray-50 border-2 border-gray-100 hover:border-purple-200 transition-colors"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.05 }}
                    whileHover={{ scale: 1.01, x: 4 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-gray-900">{produit.produit}</span>
                      <span className="text-sm font-bold" style={{ color: PRIMARY_COLOR }}>
                        {(produit.valeur / 1_000_000).toFixed(1)}M FCFA
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">{(produit.volume || 0).toLocaleString()} kg</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatedChart>
          </motion.div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* VUE REGIONALE */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeView === 'regional' && (
          <motion.div
            key="regional"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <AnimatedChart
              title="Performance par région"
              subtitle="Répartition géographique des acteurs et transactions"
              delay={0}
            >
              <div className="space-y-3">
                {statsParRegion.map((region, index) => (
                  <motion.div
                    key={region.region}
                    className="p-4 rounded-3xl bg-gradient-to-r from-purple-50 via-white to-purple-50 border-2 border-purple-100 shadow-sm"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -3, boxShadow: '0 10px 25px rgba(113, 40, 100, 0.1)' }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center"
                        style={{ backgroundColor: `${PRIMARY_COLOR}20` }}
                      >
                        <MapPin className="w-5 h-5" style={{ color: PRIMARY_COLOR }} />
                      </div>
                      <h4 className="font-bold text-gray-900 text-lg flex-1">{region.region}</h4>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 rounded-2xl bg-white border-2 border-blue-100">
                        <p className="text-xs text-gray-600 mb-1 font-semibold">Acteurs</p>
                        <p className="text-lg font-black text-blue-700">
                          {(region.acteurs || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="p-3 rounded-2xl bg-white border-2 border-green-100">
                        <p className="text-xs text-gray-600 mb-1 font-semibold">Transactions</p>
                        <p className="text-lg font-black text-green-700">
                          {(region.transactions || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="p-3 rounded-2xl bg-white border-2 border-purple-100">
                        <p className="text-xs text-gray-600 mb-1 font-semibold">Valeur</p>
                        <p className="text-lg font-black" style={{ color: PRIMARY_COLOR }}>
                          {(region.valeur / 1_000_000).toFixed(0)}M
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </AnimatedChart>

            <AnimatedChart
              title="Activité par région"
              subtitle="Comparaison du nombre d'acteurs"
              delay={100}
            >
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={statsParRegion || []} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="region" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: `2px solid ${PRIMARY_COLOR}40` }}
                    formatter={(v: any) => [(v || 0).toLocaleString(), 'Acteurs']}
                  />
                  <Bar
                    dataKey="acteurs"
                    fill={PRIMARY_COLOR}
                    radius={[8, 8, 0, 0]}
                    animationBegin={200}
                    animationDuration={1500}
                  />
                </BarChart>
              </ResponsiveContainer>
            </AnimatedChart>
          </motion.div>
        )}

        {activeView === 'secteur' && (
          <motion.div
            key="secteur"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <AnimatedChart
              title="Performance par secteur"
              subtitle="Valeur commercialisée et croissance"
              delay={0}
            >
              <div className="space-y-3">
                {secteurActivite.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 py-8">Aucune donnée secteur pour le moment</p>
                ) : (
                  secteurActivite.map((secteur: any, index: number) => (
                    <motion.div
                      key={secteur.secteur || index}
                      className="p-4 rounded-3xl bg-gradient-to-r from-blue-50 via-white to-blue-50 border-2 border-blue-100 shadow-sm"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -3, boxShadow: '0 10px 25px rgba(59, 130, 246, 0.1)' }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-100 flex items-center justify-center">
                          <Package className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-gray-900 text-lg">{secteur.secteur}</h4>
                          <p className="text-xs text-gray-600 font-semibold">
                            {(secteur.acteurs || 0).toLocaleString()} acteurs
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {(secteur.croissance || 0) > 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-600" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-600" />
                          )}
                          <span className={`text-sm font-bold ${(secteur.croissance || 0) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(secteur.croissance || 0) > 0 ? '+' : ''}{secteur.croissance ?? 0}%
                          </span>
                        </div>
                      </div>
                      <div className="p-3 rounded-2xl bg-white border-2 border-emerald-100">
                        <p className="text-xs text-gray-600 mb-1 font-semibold">Valeur commercialisée</p>
                        <p className="text-xl font-black text-emerald-700">
                          {((secteur.valeur || 0) / 1_000_000).toFixed(1)}M FCFA
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </AnimatedChart>

            <AnimatedChart
              title="Comparaison des secteurs"
              subtitle="Valeur commercialisée par secteur"
              delay={100}
            >
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={secteurActivite || []} layout="vertical" barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="secteur" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: '2px solid #10B98140' }}
                    formatter={(v: any) => [`${(Number(v) / 1_000_000).toFixed(1)}M FCFA`, 'Valeur']}
                  />
                  <Bar
                    dataKey="valeur"
                    fill="#10B981"
                    radius={[0, 8, 8, 0]}
                    animationBegin={200}
                    animationDuration={1500}
                  />
                </BarChart>
              </ResponsiveContainer>
            </AnimatedChart>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </SubPageLayout>
  );
}