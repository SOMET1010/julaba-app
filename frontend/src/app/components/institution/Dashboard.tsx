import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Users, DollarSign } from 'lucide-react';
import { Card } from '../ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { ProfileSwitcher } from '../dev/ProfileSwitcher';
import { SubPageLayout } from '../layout/SubPageLayout';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { useInstitutionData } from '../../hooks/useInstitutionData';

export function Dashboard() {
  const { macroKPIs, dataEvolution, dataRepartition } = useInstitutionData();
  const volumeData = dataEvolution.map(d => ({ month: d.mois, volume: d.valeur }));
  const roleData = dataRepartition;

  return (
    <SubPageLayout role="institution" title="Dashboard Analytics National">
      <div className="pb-32 lg:pb-8 pt-2 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <KPIGrid cols={4}>
            <UniversalKPI
              label="Utilisateurs actifs"
              animatedTarget={macroKPIs.acteursActifs}
              icon={Users}
              color="#712864"
              delay={0}
              explication={`${12}% ce mois`}
            />
            <UniversalKPI
              label="Transactions"
              animatedTarget={macroKPIs.volumeTransactions}
              icon={DollarSign}
              color="#2072AF"
              delay={30}
              explication={`${18}% ce mois`}
            />
            <UniversalKPI
              label="Volume (Mds FCFA)"
              animatedTarget={macroKPIs.valeurMonetaireFormatted}
              icon={TrendingUp}
              color="#2E8B57"
              delay={60}
              explication={`${24}% ce mois`}
            />
            <UniversalKPI
              label="Taux activité"
              animatedTarget={macroKPIs.tauxActivite}
              icon={Users}
              color="#F97316"
              delay={90}
              suffix="%"
            />
          </KPIGrid>
        </motion.div>

        {/* Charts Row 1 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8"
        >
          {/* Volume Evolution */}
          <Card className="p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Évolution du volume (Millions FCFA)</h3>
            <ResponsiveContainer key="chart-dashboard-volume" width="100%" height={300}>
              <LineChart data={volumeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="month" stroke="#6B7280" />
                <YAxis stroke="#6B7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                  }}
                />
                <Line type="monotone" dataKey="volume" stroke="#702963" strokeWidth={3} dot={{ fill: '#702963', r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          {/* Distribution by Role */}
          <Card className="p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Répartition par rôle</h3>
            <ResponsiveContainer key="chart-dashboard-pie" width="100%" height={300}>
              <PieChart>
                <Pie
                  data={roleData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {roleData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        {/* Regional Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Performance par région</h3>
            <ResponsiveContainer key="chart-dashboard-region" width="100%" height={400}>
              <BarChart data={[]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="region" stroke="#6B7280" />
                <YAxis yAxisId="left" orientation="left" stroke="#6B7280" />
                <YAxis yAxisId="right" orientation="right" stroke="#6B7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#FFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                  }}
                />
                <Bar yAxisId="left" dataKey="transactions" fill="#2072AF" radius={[8, 8, 0, 0]} />
                <Bar yAxisId="right" dataKey="volume" fill="#00563B" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center justify-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#2072AF' }} />
                <span className="text-sm text-gray-600">Transactions</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: '#00563B' }} />
                <span className="text-sm text-gray-600">Volume (M FCFA)</span>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Heatmap Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8"
        >
          <Card className="p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Carte de Côte d'Ivoire - Heatmap des transactions</h3>
            <div className="aspect-video bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300">
              <div className="text-center">
                <p className="text-gray-500 font-semibold mb-2">Carte interactive</p>
                <p className="text-sm text-gray-400">Visualisation géographique des activités</p>
                <p className="text-xs text-gray-400 mt-4">🗺️ Intégration carte prévue avec Leaflet/Mapbox</p>
              </div>
            </div>
          </Card>
        </motion.div>
        {/* Dev Profile Switcher - Only in development */}
        {import.meta.env.DEV && <ProfileSwitcher />}
      </div>
    </SubPageLayout>
  );
}