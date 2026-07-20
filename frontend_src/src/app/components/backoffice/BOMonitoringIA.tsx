import React, { useState, useMemo } from 'react';
import { useBackOffice } from '../../contexts/BackOfficeContext';
import { motion } from 'motion/react';
import { Zap, AlertTriangle, Clock, Banknote } from 'lucide-react';
import { BO_PRIMARY } from './bo-theme';
import { fadeInUp, hoverGlow } from './bo-animations';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import { API_URL } from '../../utils/api';
import { toast } from 'sonner';

export function BOMonitoringIA() {
  const { boUser: _guardUser } = useBackOffice();
  if (_guardUser?.role !== 'super_admin') {
    return (
      <div className="px-4 lg:px-8 py-12 max-w-2xl mx-auto text-center">
        <p className="font-bold text-gray-700 mb-1">Accès réservé</p>
        <p className="text-sm text-gray-500">Cet écran est réservé aux Super Administrateurs.</p>
      </div>
    );
  }

  const [monitoringData, setMonitoringData] = React.useState<any>(null);

  React.useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_URL}/admin/monitoring`, {
      credentials: 'include',
      signal: controller.signal,
    })
      .then(r => { if (!r.ok) throw new Error(`Erreur HTTP ${r.status}`); return r.json(); })
      .then(d => {
        const data = Array.isArray(d?.items) ? d.items : Array.isArray(d) ? d : [];
        const payload =
          d && typeof d === 'object' && !Array.isArray(d)
            ? { ...d, items: Array.isArray((d as any).items) ? (d as any).items : data }
            : { items: data };
        const hasObjCharts =
          Array.isArray((payload as any).daily_requests) && (payload as any).daily_requests.length > 0
          || Array.isArray((payload as any).error_data) && (payload as any).error_data.length > 0
          || Array.isArray((payload as any).pie_data) && (payload as any).pie_data.length > 0
          || Array.isArray((payload as any).services) && (payload as any).services.length > 0;
        if (data.length === 0 && !hasObjCharts) {
          toast.info('Aucune donnée monitoring disponible');
        }
        setMonitoringData(payload);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        console.warn('[BOMonitoringIA] fetch monitoring failed:', err instanceof Error ? err.message : err);
        toast.error('Erreur chargement monitoring');
      });
    return () => controller.abort();
  }, []);

  const servicesNormalized = useMemo(() => {
    const raw = Array.isArray(monitoringData?.services) ? monitoringData.services : [];
    return raw.map((s: any, idx: number) => {
      const statutOk =
        s.statut === 'operationnel'
        || s.status === 'operationnel'
        || s.status === 'ok'
        || s.status === 'up';
      const rawLat = s.latence ?? s.latency ?? s.latence_ms;
      let latence: string;
      if (rawLat == null || rawLat === '') latence = '--';
      else if (typeof rawLat === 'number') latence = `${rawLat}ms`;
      else {
        const str = String(rawLat);
        latence = str.toLowerCase().endsWith('ms') ? str : `${str}ms`;
      }
      const up = s.uptime ?? s.uptime_pct ?? s.uptimePercent;
      const uptimeStr =
        up == null || up === ''
          ? '--'
          : typeof up === 'number'
            ? `${up}%`
            : String(up).includes('%')
              ? String(up)
              : `${up}%`;
      return {
        id: String(s.id ?? s.name ?? s.nom ?? idx),
        nom: String(s.nom ?? s.name ?? s.nom_service ?? `Service ${idx + 1}`),
        statut: statutOk ? 'operationnel' as const : 'erreur' as const,
        latence,
        uptime: uptimeStr,
        requetes30j: Number(s.requetes30j ?? s.requests30j ?? s.requetes_30j ?? 0),
        cout30j: Number(s.cout30j ?? s.cost30j ?? s.cost ?? 0),
      };
    });
  }, [monitoringData]);

  const dailyRequests = useMemo(() => {
    const raw = Array.isArray(monitoringData?.daily_requests) ? monitoringData.daily_requests : [];
    return raw.map((item: any, idx: number) => ({
      jour: item?.jour || item?.day || item?.date || `J${idx + 1}`,
      openai: Number(item?.openai ?? item?.open_ai ?? item?.openai_requests ?? item?.requests ?? item?.count ?? 0),
      elevenlabs: Number(item?.elevenlabs ?? item?.eleven_labs ?? item?.elevenlabs_requests ?? 0),
    }));
  }, [monitoringData]);

  const errorData = useMemo(() => {
    const raw = Array.isArray(monitoringData?.error_data) ? monitoringData.error_data : [];
    return raw.map((item: any, idx: number) => ({
      jour: item?.jour || item?.day || item?.date || `J${idx + 1}`,
      erreurs: Number(item?.erreurs ?? item?.errors ?? item?.count ?? 0),
    }));
  }, [monitoringData]);

  const pieData = useMemo(() => {
    const fromPie = Array.isArray(monitoringData?.pie_data) ? monitoringData.pie_data : [];
    const raw = fromPie.length > 0 ? fromPie : servicesNormalized;
    return raw.map((item: any, idx: number) => ({
      name: item?.name || item?.nom || item?.service || item?.nom || `Service ${idx + 1}`,
      value: Number(item?.value ?? item?.cout30j ?? item?.cost30j ?? item?.cost ?? 0),
      color: item?.color || ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'][idx % 5],
    })).filter((item: { value: number }) => item.value > 0);
  }, [monitoringData, servicesNormalized]);

  const [period, setPeriod] = useState<'7j' | '30j'>('7j');

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto overflow-hidden">
      <motion.div {...fadeInUp(0)} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-gray-900">Monitoring IA</h1>
          <p className="text-sm text-gray-500 mt-0.5">Suivi OpenAI, ElevenLabs et services IA</p>
        </div>
        <div className="flex gap-2">
          {(['7j', '30j'] as const).map(p => (
            <motion.button key={p} onClick={() => setPeriod(p)} whileTap={{ scale: 0.95 }}
              className="px-4 py-2 rounded-2xl border-2 text-xs font-bold"
              style={period === p ? { backgroundColor: BO_PRIMARY, color: '#fff', borderColor: BO_PRIMARY } : { borderColor: '#E5E7EB', color: '#6B7280' }}>
              {p === '7j' ? '7 derniers jours' : '30 derniers jours'}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* KPIs */}
      <KPIGrid cols={4} className="mb-6">
        <UniversalKPI label="Requêtes / jour" animatedTarget={monitoringData?.requetes_jour || 0} icon={Zap} color="#3B82F6" />
        <UniversalKPI label="Coût cumulé (30j)" animatedTarget={monitoringData?.cout_cumule || 0} suffix="FCFA" icon={Banknote} color="#10B981" />
        <UniversalKPI label="Temps réponse moy." value={String(monitoringData?.temps_reponse || '--')} icon={Clock} color={BO_PRIMARY} />
        <UniversalKPI label="Taux erreur" value={`${monitoringData?.taux_erreur || 0}%`} icon={AlertTriangle} color="#F59E0B" />
      </KPIGrid>

      {/* Services status */}
      <motion.div {...fadeInUp(0.2)} className="bg-white rounded-3xl border-2 border-gray-100 p-5 shadow-sm mb-6">
        <h2 className="font-black text-gray-900 mb-4">Statut des services</h2>
        <div className="space-y-3">
          {servicesNormalized.map((service: typeof servicesNormalized[number]) => {
            const isOk = service.statut === 'operationnel';
            return (
              <motion.div key={service.id} className="flex items-center gap-4 p-3 rounded-2xl bg-gray-50 border-2 border-gray-100"
                {...hoverGlow(BO_PRIMARY)}>
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: isOk ? '#F0FDF4' : '#FEF2F2' }}>
                  <Zap className="w-5 h-5" style={{ color: isOk ? '#10B981' : '#EF4444' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-gray-900">{service.nom}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {isOk ? 'Opérationnel' : 'Erreur'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-0.5 text-xs text-gray-500">
                    <span>Latence: {service.latence}</span>
                    <span>Uptime: {service.uptime}</span>
                    <span>{(service.requetes30j || 0).toLocaleString('fr-FR')} req/30j</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-sm text-gray-900">{(service.cout30j || 0).toLocaleString('fr-FR')} FCFA</p>
                  <p className="text-[10px] text-gray-400">/ 30 jours</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Graphique requetes */}
        <motion.div {...fadeInUp(0.3)} className="bg-white rounded-3xl border-2 border-gray-100 p-5 shadow-sm">
          <h3 className="font-black text-gray-900 mb-4">Requêtes par jour</h3>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={dailyRequests}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="jour" fontSize={11} tick={{ fill: '#6B7280' }} />
              <YAxis fontSize={11} tick={{ fill: '#6B7280' }} domain={[(dataMin: number) => 0, (dataMax: number) => Math.max(dataMax, 1)]} allowDataOverflow={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '2px solid #E5E7EB', fontSize: '12px' }} />
              <Area type="monotone" dataKey="openai" stackId="1" stroke="#10B981" fill="#10B98130" name="OpenAI" />
              <Area type="monotone" dataKey="elevenlabs" stackId="1" stroke="#3B82F6" fill="#3B82F630" name="ElevenLabs" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Graphique erreurs */}
        <motion.div {...fadeInUp(0.35)} className="bg-white rounded-3xl border-2 border-gray-100 p-5 shadow-sm">
          <h3 className="font-black text-gray-900 mb-4">Erreurs par jour</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={errorData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="jour" fontSize={11} tick={{ fill: '#6B7280' }} />
              <YAxis fontSize={11} tick={{ fill: '#6B7280' }} domain={[(dataMin: number) => 0, (dataMax: number) => Math.max(dataMax, 1)]} allowDataOverflow={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '2px solid #E5E7EB', fontSize: '12px' }} />
              <Bar dataKey="erreurs" fill="#EF444480" radius={[8, 8, 0, 0]} name="Erreurs" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* Répartition des coûts */}
      <motion.div {...fadeInUp(0.4)} className="bg-white rounded-3xl border-2 border-gray-100 p-5 shadow-sm">
        <h3 className="font-black text-gray-900 mb-4">Répartition des coûts (30 jours)</h3>
        <div className="flex flex-col lg:flex-row items-center gap-6">
          <ResponsiveContainer width={200} height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4}>
                {pieData.map((entry: typeof pieData[number], i: number) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: '12px', border: '2px solid #E5E7EB', fontSize: '12px' }} formatter={(v: any) => `${(v || 0).toLocaleString('fr-FR')} FCFA`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex-1 space-y-3">
            {pieData.map((item: typeof pieData[number]) => (
              <div key={item.name} className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-sm font-bold text-gray-700 flex-1">{item.name}</span>
                <span className="font-black text-gray-900">{(item.value || 0).toLocaleString('fr-FR')} FCFA</span>
              </div>
            ))}
            <div className="pt-2 border-t-2 border-gray-100 flex items-center justify-between">
              <span className="font-bold text-gray-700">Total</span>
              <span className="font-black text-gray-900 text-lg">{pieData.reduce((a: number, b: typeof pieData[number]) => a + b.value, 0).toLocaleString('fr-FR')} FCFA</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
