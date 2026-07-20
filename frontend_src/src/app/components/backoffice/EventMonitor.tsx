import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { eventBus, EVENTS } from "../../services/eventBus";
import { eventLogger, EventLog } from "../../services/eventLogger";
import { replayBuffer } from "../../services/eventReplayBuffer";
import { Activity, Filter, Download, Trash2, RefreshCw, Play, Search, ChevronDown, ChevronUp, Zap, List, AlertCircle, Database } from "lucide-react";
import { BO_PRIMARY } from "./bo-theme";
import { toast } from "sonner";
import { UniversalKPI, KPIGrid } from "../ui/UniversalKPI";
import { useBackOffice } from "../../contexts/BackOfficeContext";

const PRIORITY_COLORS: Record<string, { bg: string; text: string }> = {
  high:   { bg: "#fef2f2", text: "#991b1b" },
  medium: { bg: "#fffbeb", text: "#92400e" },
  low:    { bg: "#f0fdf4", text: "#166534" },
};

const SOURCE_COLORS: Record<string, { bg: string; text: string }> = {
  local:     { bg: "#eff6ff", text: "#1e40af" },
  remote:    { bg: "#faf5ff", text: "#6b21a8" },
  websocket: { bg: "#f0fdf4", text: "#166534" },
};

function PayloadViewer({ payload }: { payload: any }) {
  const [open, setOpen] = useState(false);
  if (!payload) return null;
  const str = JSON.stringify(payload, null, 2);
  if (str.length < 60 && !str.includes("\n")) {
    return <span className="font-mono text-xs text-gray-400">{str}</span>;
  }
  return (
    <div>
      <button onClick={() => setOpen(o => !o)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        {open ? "Masquer" : "Voir payload"}
      </button>
      {open && (
        <pre className="mt-1 p-2 bg-gray-50 rounded-xl text-xs font-mono text-gray-600 overflow-x-auto max-h-32 border border-gray-100">
          {str}
        </pre>
      )}
    </div>
  );
}

export function EventMonitor() {
  const { boUser } = useBackOffice();
  if (boUser?.role !== 'super_admin') {
    return (
      <div className="px-4 lg:px-8 py-12 max-w-2xl mx-auto text-center">
        <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="font-bold text-gray-700 mb-1">Accès réservé</p>
        <p className="text-sm text-gray-500">Cet outil de surveillance est réservé aux Super Administrateurs.</p>
      </div>
    );
  }

  const [logs, setLogs] = useState<EventLog[]>([]);
  const [filterEvent, setFilterEvent] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [search, setSearch] = useState("");
  const [paused, setPaused] = useState(false);
  const [bufferSize, setBufferSize] = useState(0);
  const [stats, setStats] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);

  const refresh = useCallback(() => {
    if (paused) return;
    const filters: any = {};
    if (filterEvent) filters.event = filterEvent;
    if (filterPriority) filters.priority = filterPriority;
    if (filterSource) filters.source = filterSource;
    if (search) filters.search = search;
    setLogs(eventLogger.getLogs(100, Object.keys(filters).length ? filters : undefined));
    setBufferSize(replayBuffer.size());
    setStats(eventLogger.getStats());
  }, [paused, filterEvent, filterPriority, filterSource, search]);

  useEffect(() => {
    refresh();
    const unsub = eventBus.subscribe("*", () => refresh());
    return unsub;
  }, [refresh]);

  const handleReplayLast = (n: number) => {
    const count = eventBus.replayLastN(n);
    toast.success(`${count} événements rejoués`);
  };

  const handleExport = () => {
    const data = eventBus.exportLogs();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "julaba-events-" + Date.now() + ".json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Logs exportés");
  };

  const handleClear = () => {
    eventLogger.clearLogs();
    replayBuffer.clear();
    setLogs([]);
    setStats(null);
    toast.info("Logs effacés");
  };

  const eventTypes = Object.values(EVENTS);

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: paused ? "#9CA3AF" : "#10B981" }} />
          <h1 className="text-2xl font-black text-gray-900">Event Monitor</h1>
          <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded-xl">{logs.length} events</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPaused(p => !p)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all"
            style={{ borderColor: paused ? "#EF4444" : "#e5e7eb", color: paused ? "#EF4444" : "#6b7280" }}>
            {paused ? "Reprendre" : "Pause"}
          </button>
          <button onClick={() => handleReplayLast(10)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50">
            <Play className="w-3 h-3" /> Replay 10
          </button>
          <button onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50">
            <Download className="w-3 h-3" /> Export
          </button>
          <button onClick={handleClear}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-gray-200 text-xs font-bold text-red-500 hover:bg-red-50">
            <Trash2 className="w-3 h-3" /> Clear
          </button>
        </div>
      </div>

      <KPIGrid cols={4}>
        <UniversalKPI label="Total logs" animatedTarget={stats?.total || logs.length} icon={List} color="#712864" />
        <UniversalKPI label="Erreurs" animatedTarget={stats?.errors || 0} icon={AlertCircle} color="#dc2626" />
        <UniversalKPI label="Buffer" animatedTarget={bufferSize} icon={Database} color="#2072AF" />
        <UniversalKPI label="Événements actifs" animatedTarget={stats?.recent || 0} icon={Activity} color="#16a34a" />
      </KPIGrid>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total émis", value: stats.total },
            { label: "En buffer", value: bufferSize },
            { label: "High", value: stats.byPriority?.high || 0 },
            { label: "Medium", value: stats.byPriority?.medium || 0 },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border-2 border-gray-100 p-4">
              <p className="text-xl font-black text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400 font-semibold">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filtres */}
      <div className="bg-white rounded-2xl border-2 border-gray-100 p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Search className="w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher dans les événements ou payloads..."
            className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400" />
          <button onClick={() => setShowFilters(f => !f)} className="flex items-center gap-1 text-xs font-bold text-gray-500">
            <Filter className="w-3.5 h-3.5" /> Filtres
          </button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
            <select value={filterEvent} onChange={e => setFilterEvent(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none">
              <option value="">Tous les événements</option>
              {eventTypes.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none">
              <option value="">Toutes priorités</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
              className="text-sm border border-gray-200 rounded-xl px-3 py-2 outline-none">
              <option value="">Toutes sources</option>
              <option value="local">Local</option>
              <option value="remote">Remote</option>
              <option value="websocket">WebSocket</option>
            </select>
          </div>
        )}
      </div>

      {/* Liste events */}
      <div className="bg-white rounded-2xl border-2 border-gray-100 overflow-hidden">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Activity className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-semibold">Aucun événement enregistré</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-100 bg-gray-50">
                  {["Heure", "Event", "Priorité", "Source", "Payload"].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-black text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {logs.map((log, i) => {
                    const pc = PRIORITY_COLORS[log.priority] || PRIORITY_COLORS.medium;
                    const sc = SOURCE_COLORS[log.source] || SOURCE_COLORS.local;
                    return (
                      <motion.tr key={log.id}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(i * 0.02, 0.3) }}
                        className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-gray-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit", fractionalSecondDigits: 3 as any })}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-bold text-gray-900 text-xs">{log.event}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: pc.bg, color: pc.text }}>
                            {log.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs font-bold px-2 py-1 rounded-lg" style={{ backgroundColor: sc.bg, color: sc.text }}>
                            {log.source}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs">
                          <PayloadViewer payload={log.payload} />
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}