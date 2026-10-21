import { SubPageLayout } from '../layout/SubPageLayout';
import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { AlertTriangle, Users, Target, Calendar, Award, MapPin, Package } from 'lucide-react';
import { useUser } from '../../contexts/UserContext';
import { useIdentificateur } from '../../contexts/IdentificateurContext';
import type { Identification } from '../../contexts/IdentificateurContext';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';

const PRIMARY_COLOR = '#9F8170';
const SECONDARY_COLOR = '#DAC8AE';
const COLORS = [PRIMARY_COLOR, SECONDARY_COLOR, '#E5C4A1', '#B89176'];
const DAY_LABELS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const CHART_TOOLTIP_STYLE = {
  backgroundColor: 'white',
  border: 'none',
  borderRadius: '12px',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
};
const prefersReducedMotion = typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type EvolutionPoint = { date: string; identifications: number };
type CommunePoint = { name: string; value: number };
type ProduitPoint = { produit: string; nombre: number };

function normalizeKey(s: string): string {
  return s.trim().toLowerCase();
}

function getEvolutionAriaLabel(data: EvolutionPoint[]): string {
  const details = data.map((d) => `${d.date} ${d.identifications}`).join(', ');
  return `Graphique d’activité par jour de la semaine. Total des identifications sur chaque jour : ${details}`;
}

function getCommuneAriaLabel(data: CommunePoint[]): string {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const details = data.map((d) => {
    const percent = total > 0 ? Math.round((d.value / total) * 100) : 0;
    return `${d.name} ${percent}%`;
  }).join(', ');
  return `Répartition par commune : ${details || 'aucune commune'}`;
}

function getProduitsAriaLabel(data: ProduitPoint[]): string {
  const details = data.map((d) => `${d.produit} (${d.nombre})`).join(', ');
  return `Top produits identifiés : ${details || 'aucun produit'}`;
}

export function IdentificateurStats() {
  const { user } = useUser();
  const { identifications, stats: ctxStats } = useIdentificateur();

  const typedIdentifications = identifications as Identification[];
  const total = ctxStats.total;
  const objectifMois = ctxStats.objectifMois;

  const evolutionData = useMemo<Array<EvolutionPoint>>(() => {
    const seed = DAY_LABELS.map((d) => ({ date: d, identifications: 0 }));
    typedIdentifications.forEach((ident) => {
      if (!ident.dateIdentification) return;
      const time = new Date(ident.dateIdentification).getTime();
      if (!Number.isFinite(time)) return;
      const dayIndex = new Date(time).getDay();
      if (dayIndex >= 0 && dayIndex < 7) seed[dayIndex].identifications += 1;
    });
    return seed;
  }, [typedIdentifications]);

  const communeData = useMemo<Array<CommunePoint>>(() => {
    const communeMap: Record<string, number> = {};
    const displayMap: Record<string, string> = {};
    typedIdentifications.forEach((ident) => {
      const rawCommune = String(ident.commune || '').trim();
      const display = rawCommune || 'Non renseigné';
      const key = normalizeKey(display);
      communeMap[key] = (communeMap[key] || 0) + 1;
      if (!displayMap[key]) displayMap[key] = display;
    });
    return Object.entries(communeMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, COLORS.length)
      .map(([key, value]) => ({ name: displayMap[key] || 'Non renseigné', value }));
  }, [typedIdentifications]);

  const produitsData = useMemo<Array<ProduitPoint>>(() => {
    const produitMap: Record<string, number> = {};
    const displayMap: Record<string, string> = {};
    typedIdentifications.forEach((ident) => {
      const activite = String(ident.activite || '').trim();
      if (!activite) return;
      activite
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((produit) => {
          const key = normalizeKey(produit);
          produitMap[key] = (produitMap[key] || 0) + 1;
          if (!displayMap[key]) displayMap[key] = produit;
        });
    });
    return Object.entries(produitMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, nombre]) => ({ produit: displayMap[key] || key, nombre }));
  }, [typedIdentifications]);

  const progressPercent = useMemo(
    () => (objectifMois > 0 ? (total / objectifMois) * 100 : 0),
    [objectifMois, total],
  );
  const progressBarPercent = Math.min(100, progressPercent);
  const roundedProgressPercent = Math.round(progressPercent);
  const isEvolutionEmpty = useMemo(
    () => evolutionData.every((d) => d.identifications === 0),
    [evolutionData],
  );
  const isCommuneEmpty = communeData.length === 0;
  const isProduitsEmpty = produitsData.length === 0;
  const evolutionAriaLabel = useMemo(() => getEvolutionAriaLabel(evolutionData), [evolutionData]);
  const communeAriaLabel = useMemo(() => getCommuneAriaLabel(communeData), [communeData]);
  const produitsAriaLabel = useMemo(() => getProduitsAriaLabel(produitsData), [produitsData]);

  if (!user) return null;

  return (
    <SubPageLayout role="identificateur" title="Statistiques">
      <div className="pb-32 lg:pb-8 pt-16 lg:pt-10 px-4 lg:pl-[320px] max-w-2xl lg:max-w-7xl mx-auto min-h-screen">

      <div
        role="status"
        aria-live="polite"
        className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6 flex items-start gap-3"
      >
        <AlertTriangle className="w-5 h-5 text-orange-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-sm text-orange-900">
          Statistiques en cours de calcul. Certaines métriques (croissance, moyenne) seront disponibles quand le backend dédié sera déployé. Si tu observes un total anormalement élevé, signale-le à ton superviseur.
        </p>
      </div>

      {/* Header */}
      <motion.div
        initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold text-gray-900">Statistiques</h1>
        <p className="text-gray-600 mt-1">
          Tes performances et KPIs
        </p>
      </motion.div>

      {/* KPIs principaux */}
      <motion.div
        initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? {} : { delay: 0.1 }}
      >
        <KPIGrid cols={2} className="mb-6">
          <UniversalKPI
            label="Total"
            animatedTarget={total}
            icon={Users}
            color={PRIMARY_COLOR}
            explication="Nombre total d’acteurs identifiés"
          />
          {objectifMois > 0 ? (
            <UniversalKPI
              label="Objectif"
              animatedTarget={objectifMois}
              icon={Target}
              color={PRIMARY_COLOR}
              explication="Objectif d’identifications ce mois"
            />
          ) : (
            <UniversalKPI
              label="Objectif"
              value="-"
              icon={Target}
              color={PRIMARY_COLOR}
              explication="Objectif d’identifications ce mois"
            />
          )}
        </KPIGrid>
      </motion.div>

      {/* Objectif du mois */}
      {objectifMois <= 0 ? (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? {} : { delay: 0.2 }}
          className="bg-blue-50 border border-blue-200 rounded-2xl shadow-md p-6 mb-6"
        >
          <div className="flex items-center gap-3 text-blue-900">
            <Target className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <p className="font-semibold">Objectif à définir avec ton superviseur</p>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={prefersReducedMotion ? {} : { delay: 0.2 }}
          className="bg-white rounded-2xl shadow-md p-6 mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5" style={{ color: PRIMARY_COLOR }} aria-hidden="true" />
              <h2 className="font-semibold text-gray-900">Objectif du mois</h2>
            </div>
            <span className="text-sm font-medium" style={{ color: PRIMARY_COLOR }}>
              {total} / {objectifMois}
            </span>
          </div>

          <div
            className="relative h-4 bg-gray-100 rounded-full overflow-hidden mb-2"
            role="progressbar"
            aria-valuenow={Math.min(100, Math.round(progressPercent))}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progression de l’objectif mensuel"
          >
            <motion.div
              initial={prefersReducedMotion ? { width: `${progressBarPercent}%` } : { width: 0 }}
              animate={{ width: `${progressBarPercent}%` }}
              transition={prefersReducedMotion ? {} : { duration: 1, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ backgroundColor: PRIMARY_COLOR }}
            />
          </div>

          <p className="text-sm text-gray-600">
            {total >= objectifMois ? (
              <span className="text-green-500 font-semibold inline-flex items-center gap-1">
                <Award className="w-5 h-5 text-green-500 inline-block" aria-hidden="true" />
                {total > objectifMois ? `Objectif dépassé\u2022 ${roundedProgressPercent}%` : 'Objectif atteint\u202f!'}
              </span>
            ) : (
              <>
                Plus que <span className="font-semibold" style={{ color: PRIMARY_COLOR }}>
                  {objectifMois - total}
                </span> identifications pour atteindre ton objectif
              </>
            )}
          </p>
        </motion.div>
      )}

      {/* Évolution des identifications */}
      <motion.div
        initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? {} : { delay: 0.3 }}
        className="bg-white rounded-2xl shadow-md p-6 mb-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold text-gray-900">Activité par jour de la semaine</h2>
          {/* Sélecteur Period retiré jusqu’à backend filtering périodique : Q5 audit */}
        </div>

        <div className="min-h-[250px]">
          {isEvolutionEmpty ? (
            <div className="flex flex-col items-center justify-center min-h-[250px] text-gray-400">
              <Calendar className="w-12 h-12 mb-3" aria-hidden="true" />
              <p className="font-semibold">Aucune identification cette semaine</p>
              <p className="text-sm mt-1">Identifie ton premier acteur pour voir tes statistiques</p>
            </div>
          ) : (
            <div role="img" aria-label={evolutionAriaLabel}>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={evolutionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="date" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Line
                    type="monotone"
                    dataKey="identifications"
                    stroke={PRIMARY_COLOR}
                    strokeWidth={3}
                    dot={{ fill: PRIMARY_COLOR, r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </motion.div>

      {/* Répartition par commune */}
      <motion.div
        initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? {} : { delay: 0.4 }}
        className="bg-white rounded-2xl shadow-md p-6 mb-6"
      >
        <h2 className="font-semibold text-gray-900 mb-6">Répartition par commune</h2>
        
        <div className="min-h-[250px]">
          {isCommuneEmpty ? (
            <div className="flex flex-col items-center justify-center min-h-[250px] text-gray-400">
              <MapPin className="w-12 h-12 mb-3" aria-hidden="true" />
              <p className="font-semibold">Aucune commune renseignée</p>
              <p className="text-sm mt-1">Les communes apparaîtront avec tes identifications</p>
            </div>
          ) : (
            <div role="img" aria-label={communeAriaLabel}>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={communeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${Number.isFinite(percent) ? (percent * 100).toFixed(0) : '0'}%`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {communeData.map((entry, index) => (
                      <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </motion.div>

      {/* Top produits identifiés */}
      <motion.div
        initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={prefersReducedMotion ? {} : { delay: 0.5 }}
        className="bg-white rounded-2xl shadow-md p-6"
      >
        <h2 className="font-semibold text-gray-900 mb-6">Top produits identifiés</h2>
        
        <div className="min-h-[300px]">
          {isProduitsEmpty ? (
            <div className="flex flex-col items-center justify-center min-h-[300px] text-gray-400">
              <Package className="w-12 h-12 mb-3" aria-hidden="true" />
              <p className="font-semibold">Aucun produit identifié</p>
              <p className="text-sm mt-1">Les produits apparaîtront avec tes identifications</p>
            </div>
          ) : (
            <div role="img" aria-label={produitsAriaLabel}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={produitsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="produit" stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <YAxis stroke="#9CA3AF" style={{ fontSize: '12px' }} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                  <Bar dataKey="nombre" fill={PRIMARY_COLOR} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </motion.div>
    </div>
    </SubPageLayout>
  );
}