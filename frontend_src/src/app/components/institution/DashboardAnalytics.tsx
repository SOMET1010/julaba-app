import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  ShoppingCart,
  Package,
  BarChart3,
  PieChart,
  Calendar,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { useInstitution } from '../../contexts/InstitutionContext';
import { Card } from '../ui/card';
import { SubPageLayout } from '../layout/SubPageLayout';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { useInstitutionData } from '../../hooks/useInstitutionData';

const INSTITUTION_COLOR = '#712864';
const COLORS = ['#712864', '#2072AF', '#2E8B57', '#C66A2C', '#9F8170'];

type PeriodeGraphique = '7jours' | '30jours' | '90jours' | '1an';

export function DashboardAnalytics() {
  const { macroKPIs } = useInstitutionData();
  const {
    getKPINationaux,
    getStatistiquesParRole,
    getTopProduits,
    getDonneesGraphique,
    getAlertes,
  } = useInstitution();

  const [periodeGraphique, setPeriodeGraphique] = useState<PeriodeGraphique>('30jours');
  const [kpis, setKpis] = useState<any>(null);
  const [statsRoles, setStatsRoles] = useState<any>({
    marchands: { total: 0, actifs: 0, volumeVentes: 0, panierMoyen: 0 },
    producteurs: { total: 0, actifs: 0, nombreRecoltes: 0, prixMoyenKg: 0 },
    cooperatives: { total: 0, actives: 0, membresTotal: 0, tresorerieTotal: 0 },
    identificateurs: { total: 0, actifs: 0, identificationsEffectuees: 0, tauxValidation: 0 },
  });
  const [topProduits, setTopProduits] = useState<any[]>([]);
  const [alertes, setAlertes] = useState<any[]>([]);
  const [donneesGraphique, setDonneesGraphique] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      getKPINationaux(),
      getStatistiquesParRole(),
      getTopProduits(5),
      getAlertes(),
      getDonneesGraphique('30j'),
    ]).then(([k, s, t, a, d]) => {
      setKpis(k);
      setStatsRoles(s);
      setTopProduits(t);
      setAlertes(a.filter((al: any) => !al.lue));
      setDonneesGraphique(d);
    }).catch(() => {});
  }, []);

  // Données pour graphiques
  const joursMap: Record<PeriodeGraphique, number> = {
    '7jours': 7,
    '30jours': 30,
    '90jours': 90,
    '1an': 365,
  };
  // Données pour graphique par rôle (répartition acteurs)
  const donneesRepartitionActeurs = [
    { name: 'Marchands', value: statsRoles.marchands.total, color: '#C66A2C' },
    { name: 'Producteurs', value: statsRoles.producteurs.total, color: '#2E8B57' },
    { name: 'Coopératives', value: statsRoles.cooperatives.total, color: '#2072AF' },
    { name: 'Identificateurs', value: statsRoles.identificateurs.total, color: '#9F8170' },
  ];

  // Format nombre avec K/M
  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return (num || 0).toLocaleString();
  };

  // Format FCFA
  const formatFCFA = (num: number) => {
    return `${formatNumber(num)} FCFA`;
  };

  const handleExportRapport = () => {
    const rows = [
      ['Indicateur', 'Valeur'],
      ['Acteurs actifs', kpis?.acteursActifs ?? 0],
      ['Transactions', kpis?.totalTransactions ?? 0],
      ['Volume', kpis?.volumeTotal ?? 0],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rapport_julaba.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <SubPageLayout role="institution" title="Analytics Nationaux">
      <div className="pb-32 lg:pb-8 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics Nationaux</h1>
          <p className="text-gray-500 mt-1">Tableau de bord JULABA - Côte d'Ivoire</p>
        </div>
        <motion.button
          onClick={handleExportRapport}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium shadow-lg"
          style={{ backgroundColor: INSTITUTION_COLOR }}
        >
          <Download className="w-5 h-5" />
          Exporter rapport
        </motion.button>
      </div>

      {/* Alertes non lues */}
      {alertes.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <h3 className="font-bold text-blue-900">
              {alertes.length} nouvelle{alertes.length > 1 ? 's' : ''} alerte{alertes.length > 1 ? 's' : ''}
            </h3>
          </div>
          {alertes.slice(0, 2).map(alerte => (
            <p key={alerte.id} className="text-sm text-blue-700 ml-4">
              • {alerte.titre}
            </p>
          ))}
        </motion.div>
      )}

      <KPIGrid cols={3} className="mb-6">
        <UniversalKPI
          label="Volume Total (FCFA)"
          animatedTarget={macroKPIs.valeurMonetaire}
          icon={DollarSign}
          color="#712864"
          delay={0}
        />
        <UniversalKPI
          label="Transactions"
          animatedTarget={macroKPIs.volumeTransactions}
          icon={ShoppingCart}
          color="#2072AF"
          delay={30}
        />
        <UniversalKPI
          label="Acteurs Actifs"
          animatedTarget={macroKPIs.acteursActifs}
          icon={Users}
          color="#2E8B57"
          delay={60}
          suffix={`  (${macroKPIs.tauxActivite}% actif)`}
        />
      </KPIGrid>

      {/* Filtres période */}
      <div className="flex items-center gap-2">
        <Calendar className="w-5 h-5 text-gray-500" />
        <div className="flex gap-2">
          {(['7jours', '30jours', '90jours', '1an'] as PeriodeGraphique[]).map(periode => (
            <motion.button
              key={periode}
              whileTap={{ scale: 0.95 }}
              onClick={() => setPeriodeGraphique(periode)}
              className="px-4 py-2 rounded-xl font-medium text-sm transition-colors"
              style={{
                backgroundColor: periodeGraphique === periode ? INSTITUTION_COLOR : 'white',
                color: periodeGraphique === periode ? 'white' : INSTITUTION_COLOR,
                border: `2px solid ${INSTITUTION_COLOR}`,
              }}
            >
              {periode === '7jours' ? '7 jours' : periode === '30jours' ? '30 jours' : periode === '90jours' ? '90 jours' : '1 an'}
            </motion.button>
          ))}
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graphique Évolution Volume */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" style={{ color: INSTITUTION_COLOR }} />
            Évolution du Volume (FCFA)
          </h3>
          <ResponsiveContainer key="chart-inst-volume" width="100%" height={300}>
            <AreaChart data={donneesGraphique || []}>
              <defs>
                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={INSTITUTION_COLOR} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={INSTITUTION_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getDate()}/${date.getMonth() + 1}`;
                }}
              />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatNumber(value)} />
              <Tooltip
                formatter={(value: number) => [formatFCFA(value), 'Volume']}
                labelFormatter={(label) => {
                  const date = new Date(label);
                  return date.toLocaleDateString('fr-FR');
                }}
              />
              <Area
                type="monotone"
                dataKey="volumeFCFA"
                stroke={INSTITUTION_COLOR}
                strokeWidth={3}
                fill="url(#colorVolume)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Graphique Nombre de Transactions */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            Nombre de Transactions
          </h3>
          <ResponsiveContainer key="chart-inst-transactions" width="100%" height={300}>
            <BarChart data={donneesGraphique || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return `${date.getDate()}/${date.getMonth() + 1}`;
                }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                formatter={(value: number) => [value, 'Transactions']}
                labelFormatter={(label) => {
                  const date = new Date(label);
                  return date.toLocaleDateString('fr-FR');
                }}
              />
              <Bar dataKey="nombreTransactions" fill="#2072AF" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Répartition des Acteurs */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-green-600" />
            Répartition des Acteurs
          </h3>
          <ResponsiveContainer key="chart-inst-acteurs" width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={donneesRepartitionActeurs}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {donneesRepartitionActeurs.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [(value || 0).toLocaleString(), 'Acteurs']} />
            </RechartsPieChart>
          </ResponsiveContainer>
        </Card>

        {/* Top 5 Produits */}
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Package className="w-5 h-5 text-orange-600" />
            Top 5 Produits
          </h3>
          <div className="space-y-3">
            {topProduits.map((produit, index) => (
              <div key={produit.id} className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                >
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{produit.nom}</p>
                  <p className="text-xs text-gray-500">{produit.categorie}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">{formatFCFA(produit.volumeVentes)}</p>
                  <p className="text-xs text-gray-500">{produit.nombreVentes} ventes</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Stats par Rôle */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Marchands */}
        <Card className="p-6 border-l-4" style={{ borderLeftColor: '#C66A2C' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Marchands</h3>
            <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-orange-600 mb-2">{statsRoles.marchands.total}</p>
          <div className="space-y-1 text-sm text-gray-600">
            <p>Actifs: {statsRoles.marchands.actifs}</p>
            <p>Volume: {formatFCFA(statsRoles.marchands.volumeVentes)}</p>
            <p>Panier moyen: {formatFCFA(statsRoles.marchands.panierMoyen)}</p>
          </div>
        </Card>

        {/* Producteurs */}
        <Card className="p-6 border-l-4" style={{ borderLeftColor: '#2E8B57' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Producteurs</h3>
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-green-600 mb-2">{statsRoles.producteurs.total}</p>
          <div className="space-y-1 text-sm text-gray-600">
            <p>Actifs: {statsRoles.producteurs.actifs}</p>
            <p>Récoltes: {statsRoles.producteurs.nombreRecoltes}</p>
            <p>Prix moyen: {statsRoles.producteurs.prixMoyenKg.toFixed(0)} FCFA/kg</p>
          </div>
        </Card>

        {/* Coopératives */}
        <Card className="p-6 border-l-4" style={{ borderLeftColor: '#2072AF' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Coopératives</h3>
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-blue-600 mb-2">{statsRoles.cooperatives.total}</p>
          <div className="space-y-1 text-sm text-gray-600">
            <p>Actives: {statsRoles.cooperatives.actives}</p>
            <p>Membres: {statsRoles.cooperatives.membresTotal}</p>
            <p>Trésorerie: {formatFCFA(statsRoles.cooperatives.tresorerieTotal)}</p>
          </div>
        </Card>

        {/* Identificateurs */}
        <Card className="p-6 border-l-4" style={{ borderLeftColor: '#9F8170' }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-900">Identificateurs</h3>
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <Users className="w-5 h-5 text-gray-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-600 mb-2">{statsRoles.identificateurs.total}</p>
          <div className="space-y-1 text-sm text-gray-600">
            <p>Actifs: {statsRoles.identificateurs.actifs}</p>
            <p>IDs créées: {statsRoles.identificateurs.identificationsEffectuees}</p>
            <p>Taux validation: {statsRoles.identificateurs.tauxValidation}%</p>
          </div>
        </Card>
      </div>
      </div>
    </SubPageLayout>
  );
}