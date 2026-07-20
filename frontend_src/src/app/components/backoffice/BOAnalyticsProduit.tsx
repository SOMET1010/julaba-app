import React, { useState, useMemo } from 'react';
import { useBackOffice } from '../../contexts/BackOfficeContext';
import { motion } from 'motion/react';
import { Users, Target, Repeat, ArrowRight, Award } from 'lucide-react';
import { BO_PRIMARY } from './bo-theme';
import { fadeInUp } from './bo-animations';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { API_URL } from '../../utils/api';
import { toast } from 'sonner';

const FUNNEL_FILLS = ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

export function BOAnalyticsProduit() {
  const { boUser: _guardUser } = useBackOffice();
  if (_guardUser?.role !== 'super_admin') {
    return (
      <div className="px-4 lg:px-8 py-12 max-w-2xl mx-auto text-center">
        <p className="font-bold text-gray-700 mb-1">Accès réservé</p>
        <p className="text-sm text-gray-500">Cet écran est réservé aux Super Administrateurs.</p>
      </div>
    );
  }

  const [analyticsData, setAnalyticsData] = React.useState<any>(null);
  const [tab, setTab] = useState<'funnel' | 'retention' | 'features' | 'dropoff'>('funnel');

  React.useEffect(() => {
    fetch(`${API_URL}/admin/analytics`, {
      credentials: 'include',
      headers: {},
    })
      .then(r => { if (!r.ok) throw new Error(`Erreur HTTP ${r.status}`); return r.json(); })
      .then(d => {
        const itemsFromApi = Array.isArray(d?.items) ? d.items : Array.isArray(d) ? d : [];
        const payload =
          d && typeof d === 'object' && !Array.isArray(d)
            ? { ...d, items: Array.isArray((d as any).items) ? (d as any).items : itemsFromApi }
            : { items: itemsFromApi };
        setAnalyticsData(payload);
        const items = Array.isArray((payload as any)?.items) ? (payload as any).items : [];
        const funnelLen = Array.isArray((payload as any)?.funnel) ? (payload as any).funnel.length : 0;
        const dailyLen = Array.isArray((payload as any)?.daily_active) ? (payload as any).daily_active.length : 0;
        const retentionLen = Array.isArray((payload as any)?.retention) ? (payload as any).retention.length : 0;
        const featuresLen = Array.isArray((payload as any)?.feature_engagement) ? (payload as any).feature_engagement.length : 0;
        const dropLen = Array.isArray((payload as any)?.drop_off) ? (payload as any).drop_off.length : 0;
        if (items.length === 0 && funnelLen === 0 && dailyLen === 0 && retentionLen === 0 && featuresLen === 0 && dropLen === 0) {
          toast.info('Aucune donnée analytics disponible');
        }
      })
      .catch((err: unknown) => {
        toast.error(err instanceof Error ? err.message : 'Erreur chargement analytics produit');
      });
  }, []);

  const funnelSeries = useMemo(() => {
    const d = analyticsData;
    const raw = Array.isArray(d?.funnel) ? d.funnel : [];
    return raw.map((item: any, i: number) => ({
      name: item.name || item.label || item.etape || `Étape ${i + 1}`,
      value: Number(item.value ?? item.count ?? 0),
      fill: item.fill || FUNNEL_FILLS[i % FUNNEL_FILLS.length],
    }));
  }, [analyticsData]);

  const retentionSeries = useMemo(() => {
    const d = analyticsData;
    const raw = Array.isArray(d?.retention)
      ? d.retention
      : Array.isArray(d?.retention_curve)
        ? d.retention_curve
        : [];
    return raw.map((item: any, i: number) => ({
      semaine: item.semaine ?? item.week ?? `S${i + 1}`,
      taux: Number(item.taux ?? item.rate ?? item.value ?? 0),
    }));
  }, [analyticsData]);

  const featureEngagement = useMemo(() => {
    const d = analyticsData;
    if (Array.isArray(d?.feature_engagement) && d.feature_engagement.length > 0) {
      return d.feature_engagement.map((item: any) => ({
        feature: item.feature || item.name || 'Feature',
        tauxUtilisation: Number(item.tauxUtilisation ?? item.taux ?? 0),
        sessions: Number(item.sessions ?? item.count ?? 0),
      }));
    }
    const byRole = Array.isArray(d?.by_role) ? d.by_role : [];
    const max = Math.max(...byRole.map((r: any) => Number(r.count ?? r.count_ ?? 0)), 1);
    return byRole.map((r: any) => {
      const sessions = Number(r.count ?? r.count_ ?? 0);
      return {
        feature: String(r.role ?? 'role'),
        tauxUtilisation: Math.round((sessions / max) * 100),
        sessions,
      };
    });
  }, [analyticsData]);

  const dropOffSeries = useMemo(() => {
    const d = analyticsData;
    const raw = Array.isArray(d?.drop_off) ? d.drop_off : Array.isArray(d?.dropoff) ? d.dropoff : [];
    return raw.map((item: any, i: number) => ({
      etape: item.etape || item.step || `Étape ${i + 1}`,
      drop: Number(item.drop ?? item.drop_pct ?? 0),
      pourcent: Number(item.pourcent ?? item.percent ?? item.pct ?? 0),
    }));
  }, [analyticsData]);

  const dailyActiveSeries = useMemo(() => {
    const d = analyticsData;
    const raw = Array.isArray(d?.daily_active) ? d.daily_active : [];
    return raw.map((item: any) => ({
      jour: item.jour || item.day || String(item.day ?? ''),
      dau: Number(item.dau ?? item.count ?? 0),
    }));
  }, [analyticsData]);

  const funnelFirstValue = Math.max(funnelSeries[0]?.value || 0, 1);

  const conversionRate = analyticsData?.conversion_rate || 0;

  const dauMoyenne = useMemo(() => {
    if (!dailyActiveSeries.length) return 0;
    const sum = dailyActiveSeries.reduce((s: number, row: typeof dailyActiveSeries[number]) => s + row.dau, 0);
    return Math.round(sum / dailyActiveSeries.length);
  }, [dailyActiveSeries]);

  const retentionS4 = retentionSeries[3]?.taux ?? retentionSeries[3]?.value ?? null;

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto overflow-hidden">
      <motion.div {...fadeInUp(0)} className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-black text-gray-900">Analytics produit</h1>
        <p className="text-sm text-gray-500 mt-0.5">Funnels, retention, engagement et parcours utilisateur</p>
      </motion.div>

      {/* KPIs */}
      <KPIGrid cols={4} className="mb-6">
        <UniversalKPI label="DAU (moy.)" animatedTarget={dauMoyenne} icon={Users} color="#3B82F6" />
        <UniversalKPI label="Conversion" value={`${conversionRate}%`} icon={Target} color="#10B981" />
        <UniversalKPI label="Rétention S4" value={retentionS4 !== null ? `${retentionS4}%` : '--'} icon={Repeat} color={BO_PRIMARY} />
        <UniversalKPI label="NPS estimé" value="--" icon={Award} color="#8B5CF6" />
      </KPIGrid>

      {/* Tabs */}
      <motion.div {...fadeInUp(0.2)} className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'funnel', label: 'Funnel conversion' },
          { key: 'retention', label: 'Retention' },
          { key: 'features', label: 'Engagement features' },
          { key: 'dropoff', label: 'Drop-off onboarding' },
        ].map(t => (
          <motion.button key={t.key} onClick={() => setTab(t.key as any)} whileTap={{ scale: 0.95 }}
            className="px-4 py-2.5 rounded-2xl border-2 text-xs font-bold"
            style={tab === t.key ? { backgroundColor: BO_PRIMARY, color: '#fff', borderColor: BO_PRIMARY } : { borderColor: '#E5E7EB', color: '#6B7280' }}>
            {t.label}
          </motion.button>
        ))}
      </motion.div>

      {/* Contenu tab */}
      {tab === 'funnel' && (
        <motion.div {...fadeInUp(0.3)} className="bg-white rounded-3xl border-2 border-gray-100 p-5 shadow-sm">
          <h3 className="font-black text-gray-900 mb-5">Funnel de conversion</h3>
          {funnelSeries.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">Aucune donnée disponible pour cet onglet</p>
          ) : (
          <div className="space-y-3">
            {funnelSeries.map((step: typeof funnelSeries[number], i: number) => {
              const pct = Math.round((step.value / funnelFirstValue) * 100);
              const prevVal = i > 0 ? funnelSeries[i - 1].value : step.value;
              const dropPct = i > 0 && prevVal > 0 ? Math.round(((prevVal - step.value) / prevVal) * 100) : 0;
              return (
                <div key={step.name}>
                  {i > 0 && (
                    <div className="flex items-center gap-2 py-1 pl-4">
                      <ArrowRight className="w-3 h-3 text-gray-300" />
                      <span className="text-[10px] font-bold text-red-400">-{dropPct}% perdus</span>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    <div className="w-40 text-sm font-bold text-gray-700 flex-shrink-0">{step.name}</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-8 overflow-hidden">
                      <motion.div className="h-full rounded-full flex items-center px-3"
                        style={{ backgroundColor: step.fill }}
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, delay: i * 0.15 }}>
                        <span className="text-xs font-black text-white">{(step.value || 0).toLocaleString('fr-FR')}</span>
                      </motion.div>
                    </div>
                    <span className="text-sm font-black text-gray-900 w-12 text-right">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
          )}
        </motion.div>
      )}

      {tab === 'retention' && (
        <motion.div {...fadeInUp(0.3)} className="bg-white rounded-3xl border-2 border-gray-100 p-5 shadow-sm">
          <h3 className="font-black text-gray-900 mb-4">Courbe de retention</h3>
          {retentionSeries.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">Aucune donnée disponible pour cet onglet</p>
          ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={retentionSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="semaine" fontSize={12} tick={{ fill: '#6B7280' }} />
              <YAxis fontSize={12} tick={{ fill: '#6B7280' }} unit="%" domain={[(dataMin: number) => 0, (dataMax: number) => Math.max(dataMax, 1)]} allowDataOverflow={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '2px solid #E5E7EB', fontSize: '12px' }} formatter={(v: any) => `${v}%`} />
              <Area type="monotone" dataKey="taux" stroke={BO_PRIMARY} fill={`${BO_PRIMARY}30`} strokeWidth={3} name="Retention" />
            </AreaChart>
          </ResponsiveContainer>
          )}
        </motion.div>
      )}

      {tab === 'features' && (
        <motion.div {...fadeInUp(0.3)} className="bg-white rounded-3xl border-2 border-gray-100 p-5 shadow-sm">
          <h3 className="font-black text-gray-900 mb-4">Engagement par feature</h3>
          {featureEngagement.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">Aucune donnée disponible pour cet onglet</p>
          ) : (
          <div className="space-y-3">
            {featureEngagement.map((f: typeof featureEngagement[number], i: number) => (
              <motion.div key={f.feature} {...fadeInUp(i * 0.05)} className="flex items-center gap-4">
                <span className="w-32 text-sm font-bold text-gray-700 flex-shrink-0">{f.feature}</span>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ backgroundColor: BO_PRIMARY }}
                    initial={{ width: 0 }} animate={{ width: `${f.tauxUtilisation}%` }}
                    transition={{ duration: 0.6, delay: i * 0.08 }} />
                </div>
                <span className="text-xs font-black text-gray-900 w-16 text-right">{f.tauxUtilisation}%</span>
                <span className="text-xs text-gray-500 w-20 text-right">{(f.sessions || 0).toLocaleString('fr-FR')} sess.</span>
              </motion.div>
            ))}
          </div>
          )}
        </motion.div>
      )}

      {tab === 'dropoff' && (
        <motion.div {...fadeInUp(0.3)} className="bg-white rounded-3xl border-2 border-gray-100 p-5 shadow-sm">
          <h3 className="font-black text-gray-900 mb-4">Points de drop-off - Onboarding</h3>
          {dropOffSeries.length === 0 ? (
            <p className="text-center text-gray-400 py-8 text-sm">Aucune donnée disponible pour cet onglet</p>
          ) : (
          <div className="space-y-2">
            {dropOffSeries.map((step: typeof dropOffSeries[number], i: number) => (
              <motion.div key={step.etape} {...fadeInUp(i * 0.06)} className="flex items-center gap-4 p-3 rounded-2xl bg-gray-50 border border-gray-100">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs text-white" style={{ backgroundColor: step.drop > 10 ? '#EF4444' : step.drop > 5 ? '#F59E0B' : '#10B981' }}>
                  {i + 1}
                </div>
                <span className="w-40 text-sm font-bold text-gray-700 flex-shrink-0">{step.etape}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ backgroundColor: step.drop > 10 ? '#EF4444' : step.drop > 5 ? '#F59E0B' : '#10B981' }}
                    initial={{ width: 0 }} animate={{ width: `${step.pourcent}%` }}
                    transition={{ duration: 0.6, delay: i * 0.1 }} />
                </div>
                <span className="text-sm font-black text-gray-900 w-12 text-right">{step.pourcent}%</span>
                {step.drop > 0 && <span className="text-xs font-bold text-red-500 w-16 text-right">-{step.drop}%</span>}
              </motion.div>
            ))}
          </div>
          )}
        </motion.div>
      )}

      {/* DAU chart */}
      <motion.div {...fadeInUp(0.4)} className="bg-white rounded-3xl border-2 border-gray-100 p-5 shadow-sm mt-6">
        <h3 className="font-black text-gray-900 mb-4">Utilisateurs actifs quotidiens (DAU)</h3>
        {dailyActiveSeries.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Aucune donnée disponible pour cet onglet</p>
        ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={dailyActiveSeries}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="jour" fontSize={12} tick={{ fill: '#6B7280' }} />
            <YAxis fontSize={12} tick={{ fill: '#6B7280' }} domain={[(dataMin: number) => 0, (dataMax: number) => Math.max(dataMax, 1)]} allowDataOverflow={false} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: '2px solid #E5E7EB', fontSize: '12px' }} />
            <Bar dataKey="dau" fill={`${BO_PRIMARY}90`} radius={[8, 8, 0, 0]} name="DAU" />
          </BarChart>
        </ResponsiveContainer>
        )}
      </motion.div>
    </div>
  );
}
