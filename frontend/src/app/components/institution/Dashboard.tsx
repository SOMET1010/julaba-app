import React from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Users, DollarSign } from 'lucide-react';
import { Card } from '../ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ProfileSwitcher } from '../dev/ProfileSwitcher';
import { SubPageLayout } from '../layout/SubPageLayout';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { useInstitutionData } from '../../hooks/useInstitutionData';
import { kpiDepuis, texteDuKpi } from '../../services/etatLectureBO';
import { kpiTuile } from '../../services/tuileKpi';
import { GraphiqueIndisponible } from '../shared/GraphiqueIndisponible';
import { RAISON_HISTORIQUE_ABSENT } from '../../services/accueilInstitution';

export function Dashboard() {
  const { lectureDashboard, dataRepartition } = useInstitutionData();
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
              {...kpiTuile(kpiDepuis(lectureDashboard, d => d.macroKPIs.acteursActifs))}
              icon={Users}
              color="#712864"
              delay={0}
            />
            <UniversalKPI
              label="Transactions"
              {...kpiTuile(kpiDepuis(lectureDashboard, d => d.macroKPIs.volumeTransactions))}
              icon={DollarSign}
              color="#2072AF"
              delay={30}
            />
            <UniversalKPI
              label="Volume"
              {...kpiTuile(kpiDepuis(lectureDashboard, d => d.macroKPIs.valeurMonetaire), undefined, { suffix: 'FCFA' })}
              icon={TrendingUp}
              color="#2E8B57"
              delay={60}
            />
            <UniversalKPI
              label="Taux activité"
              {...kpiTuile(kpiDepuis(lectureDashboard, d => d.macroKPIs.tauxActivite), undefined, { suffix: '%' })}
              icon={Users}
              color="#F97316"
              delay={90}
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
            <GraphiqueIndisponible raison={RAISON_HISTORIQUE_ABSENT} hauteur={300} />
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
            <div className="h-[400px] flex flex-col items-center justify-center text-center gap-2">
              {/* DGE-08 — le graphique « Performance par région » se rendait
                  avec data={[]} : une coquille vide censée représenter des
                  transactions régionales qu'aucun agrégat ne fournit. Tant
                  qu'aucun axe régional agrégé n'existe côté serveur, l'état
                  vide est dit explicitement — jamais un graphique mort. */}
              <p className="text-sm font-semibold text-gray-600">Aucune donnée régionale agrégée pour l'instant</p>
              <p className="text-xs text-gray-400">L'agrégat régional arrive avec les listes groupées de la DGE.</p>
            </div>
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