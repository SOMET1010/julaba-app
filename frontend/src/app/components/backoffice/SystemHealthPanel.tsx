import React from "react";
import { SystemHealth } from "../../hooks/useRealtime";
import { CheckCircle2, AlertTriangle, XCircle, Database, Clock, Activity, Server } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  if (status === "ok") return (
    <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded-xl">
      <CheckCircle2 className="w-3 h-3" /> OK
    </span>
  );
  if (status === "degraded") return (
    <span className="flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-xl">
      <AlertTriangle className="w-3 h-3" /> Dégradé
    </span>
  );
  return (
    <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-2 py-1 rounded-xl">
      <XCircle className="w-3 h-3" /> Hors ligne
    </span>
  );
}

function formatUptime(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? h + "h " + m + "m" : m + "m";
}

function HealthMetricCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl border-2"
      style={{
        padding: '14px',
        borderColor: `${color}30`,
        backgroundColor: `${color}10`,
        minWidth: 0,
      }}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <span
          className="font-black"
          style={{ color, fontSize: 12, lineHeight: 1.2 }}
        >
          {label}
        </span>
        <div
          className="rounded-full flex items-center justify-center flex-shrink-0"
          style={{ width: 32, height: 32, backgroundColor: `${color}20` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <p className="font-black text-gray-900" style={{ fontSize: 22, lineHeight: 1.1 }}>
        {value}
      </p>
    </div>
  );
}

interface Props {
  health: SystemHealth | null;
  connected: boolean;
  lastUpdate: Date | null;
}

export function SystemHealthPanel({ health, connected, lastUpdate }: Props) {
  if (!health) return (
    <div className="flex items-center justify-center py-8 text-gray-400">
      <Server className="w-8 h-8 opacity-30 mr-2" />
      <span className="text-sm">{'Chargement\u2026'}</span>
    </div>
  );

  const latency = health.db?.latency_ms ?? 0;
  const latencyColor = latency < 50 ? "#10B981" : latency < 200 ? "#F59E0B" : "#EF4444";

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <HealthMetricCard
          label="Latence base de données"
          value={`${health.db?.latency_ms ?? 0}ms`}
          icon={Database}
          color={latencyColor}
        />
        <HealthMetricCard
          label="Transactions par heure"
          value={health.api?.transactions_last_hour ?? 0}
          icon={Activity}
          color="#2072AF"
        />
        <HealthMetricCard
          label="Uptime"
          value={formatUptime(health.uptime_seconds ?? 0)}
          icon={Clock}
          color="#16a34a"
        />
        <HealthMetricCard
          label="Backend NestJS"
          value={connected ? "En ligne" : "Hors ligne"}
          icon={Server}
          color={connected ? "#16a34a" : "#dc2626"}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-bold text-gray-700">Backend NestJS</span>
        </div>
        <StatusBadge status={connected ? "ok" : "down"} />
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-bold text-gray-700">Base de données</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold" style={{ color: latencyColor }}>
            {latency}ms
          </span>
          <StatusBadge status={health.db?.status ?? "ok"} />
        </div>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-bold text-gray-700">Transactions / heure</span>
        </div>
        <span className="text-sm font-black text-gray-900">
          {health.api?.transactions_last_hour ?? 0}
        </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-bold text-gray-700">Uptime</span>
        </div>
        <span className="text-sm font-black text-gray-900">
          {formatUptime(health.uptime_seconds ?? 0)}
        </span>
        </div>

        {lastUpdate && (
          <p className="text-xs text-gray-400 text-center pt-1">
            Mis à jour&nbsp;: {lastUpdate.toLocaleTimeString("fr-FR")}
          </p>
        )}
      </div>
    </div>
  );
}