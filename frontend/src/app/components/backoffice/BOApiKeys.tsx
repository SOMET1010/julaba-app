import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useBackOffice } from '../../contexts/BackOfficeContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertCircle,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Plus,
  Copy,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { BO_PRIMARY, BO_DARK } from './bo-theme';

type PartnerType = 'bank' | 'microfinance' | 'institution';

interface PartnerApiKeyRow {
  id: string;
  key: string;
  name: string;
  partner_type: string;
  is_active: boolean;
  usage_count: number;
  last_used_at: string | null;
  created_at?: string;
}

const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  bank: 'Banque',
  microfinance: 'Microfinance',
  institution: 'Institution',
};

function maskKey(key: string): string {
  if (key.length <= 14) return '••••••••';
  return `${key.slice(0, 8)}…${key.slice(-4)}`;
}

function parseUsageCount(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string') return parseInt(v, 10) || 0;
  return 0;
}

function normalizeRow(raw: Record<string, unknown>): PartnerApiKeyRow | null {
  if (typeof raw.id !== 'string' || typeof raw.key !== 'string') return null;
  return {
    id: raw.id,
    key: raw.key,
    name: typeof raw.name === 'string' ? raw.name : '',
    partner_type: typeof raw.partner_type === 'string' ? raw.partner_type : '',
    is_active: Boolean(raw.is_active),
    usage_count: parseUsageCount(raw.usage_count),
    last_used_at:
      raw.last_used_at === null || raw.last_used_at === undefined
        ? null
        : String(raw.last_used_at),
    created_at:
      raw.created_at !== undefined && raw.created_at !== null
        ? String(raw.created_at)
        : undefined,
  };
}

function parseListPayload(data: unknown): PartnerApiKeyRow[] {
  if (!Array.isArray(data)) return [];
  const out: PartnerApiKeyRow[] = [];
  for (const item of data) {
    if (item && typeof item === 'object') {
      const row = normalizeRow(item as Record<string, unknown>);
      if (row) out.push(row);
    }
  }
  return out;
}

export function BOApiKeys() {
  const { boUser: _guardUser } = useBackOffice();
  if (_guardUser?.role !== 'super_admin') {
    return (
      <div className="px-4 lg:px-8 py-12 max-w-2xl mx-auto text-center">
        <p className="font-bold text-gray-700 mb-1">Accès réservé</p>
        <p className="text-sm text-gray-500">Cet écran est réservé aux Super Administrateurs.</p>
      </div>
    );
  }

  const abortRef = useRef<AbortController | null>(null);
  const [rows, setRows] = useState<PartnerApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [partnerType, setPartnerType] = useState<PartnerType>('bank');
  const [saving, setSaving] = useState(false);
  const [patchingId, setPatchingId] = useState<string | null>(null);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [newSecret, setNewSecret] = useState<{
    key: string;
    name: string;
    partner_type: string;
  } | null>(null);

  const loadKeys = useCallback(async () => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/v1/partner/api-keys', {
        credentials: 'include',
        headers: { Accept: 'application/json' },
        signal: abortRef.current.signal,
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          data &&
          typeof data === 'object' &&
          'message' in data &&
          typeof (data as { message: unknown }).message === 'string'
            ? (data as { message: string }).message
            : `Erreur ${res.status}`;
        throw new Error(msg);
      }
      setRows(parseListPayload(data));
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setRows([]);
      setError(e instanceof Error ? e.message : 'Chargement impossible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadKeys();
    return () => {
      abortRef.current?.abort();
    };
  }, [loadKeys]);

  const toggleReveal = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const generateKey = async () => {
    setError(null);
    const name = partnerName.trim();
    if (!name) {
      setError('Indique le nom du partenaire.');
      return;
    }
    setSaving(true);
    const controller = new AbortController();
    try {
      const res = await fetch('/api/v1/partner/api-keys', {
        method: 'POST',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, partner_type: partnerType }),
        signal: controller.signal,
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          data &&
          typeof data === 'object' &&
          'message' in data &&
          typeof (data as { message: unknown }).message === 'string'
            ? (data as { message: string }).message
            : `Erreur ${res.status}`;
        throw new Error(msg);
      }
      if (!data || typeof data !== 'object') {
        throw new Error('Réponse serveur invalide.');
      }
      const row = normalizeRow(data as Record<string, unknown>);
      if (!row?.key) throw new Error('Clé non renvoyée par le serveur.');
      setNewSecret({
        key: row.key,
        name: row.name,
        partner_type: row.partner_type,
      });
      setRows((prev) => [row, ...prev]);
      setPartnerName('');
      setPartnerType('bank');
      setFormOpen(false);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'Création impossible.');
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (id: string, isActive: boolean) => {
    setError(null);
    setPatchingId(id);
    const controller = new AbortController();
    try {
      const res = await fetch(`/api/v1/partner/api-keys/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: isActive }),
        signal: controller.signal,
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          data &&
          typeof data === 'object' &&
          'message' in data &&
          typeof (data as { message: unknown }).message === 'string'
            ? (data as { message: string }).message
            : `Erreur ${res.status}`;
        throw new Error(msg);
      }
      if (!data || typeof data !== 'object') {
        throw new Error('Réponse serveur invalide.');
      }
      const updated = normalizeRow(data as Record<string, unknown>);
      if (!updated) throw new Error('Mise à jour invalide.');
      setRows((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'Mise à jour impossible.');
    } finally {
      setPatchingId(null);
    }
  };

  const copyNewSecret = async () => {
    if (!newSecret) return;
    try {
      await navigator.clipboard.writeText(newSecret.key);
      toast.success('Clé copiée dans le presse-papiers');
    } catch (err) {
      console.warn(
        '[BOApiKeys] copy clipboard failed:',
        err instanceof Error ? err.message : err
      );
      toast.error('Copie impossible : copie manuellement la clé');
    }
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto overflow-hidden">
      <motion.div
        initial={{ opacity: 0, x: -12 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl lg:text-3xl font-black text-gray-900">
            Clés API Partenaires
          </h1>
          <p className="text-sm text-gray-500 mt-0.5 max-w-2xl">
            Génère et gère les clés d’accès pour les partenaires (banques,
            microfinances, institutions). Les appels API partenaires utilisent
            le header <span className="font-mono text-xs">x-api-key</span>.
          </p>
        </div>
        <motion.button
          type="button"
          onClick={() => {
            setFormOpen((o) => !o);
            setError(null);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-black text-sm text-white border-2 shrink-0"
          style={{
            background: `linear-gradient(135deg, ${BO_PRIMARY}, ${BO_PRIMARY}CC)`,
            borderColor: BO_PRIMARY,
            boxShadow: `0 4px 14px ${BO_PRIMARY}40`,
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          aria-expanded={formOpen}
          aria-controls="new-key-form"
        >
          <Plus className="w-5 h-5" />
          Nouvelle clé
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {newSecret && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6 rounded-3xl border-2 p-5 lg:p-6 bg-amber-50"
            style={{ borderColor: '#f59e0b' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-secret-title"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-start gap-3">
                <Key className="w-6 h-6 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <p id="new-secret-title" className="font-black text-amber-950 text-sm">
                    Copie cette clé maintenant : elle ne sera plus affichée en
                    clair après fermeture de ce message.
                  </p>
                  <p className="text-xs text-amber-900/80 mt-1 font-semibold">
                    {newSecret.name} ·{' '}
                    {PARTNER_TYPE_LABELS[newSecret.partner_type as PartnerType] ??
                      newSecret.partner_type}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNewSecret(null)}
                className="w-9 h-9 rounded-2xl bg-white/80 border-2 border-amber-200 flex items-center justify-center shrink-0"
                aria-label="Fermer"
              >
                <X className="w-4 h-4 text-amber-900" />
              </button>
            </div>
            <div className="rounded-2xl border-2 border-amber-200 bg-white p-4 font-mono text-xs break-all text-gray-900 mb-3">
              {newSecret.key}
            </div>
            <div className="flex flex-wrap gap-2">
              <motion.button
                type="button"
                onClick={() => void copyNewSecret()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm border-2 bg-white"
                style={{ borderColor: BO_PRIMARY, color: BO_DARK }}
                whileTap={{ scale: 0.97 }}
              >
                <Copy className="w-4 h-4" style={{ color: BO_PRIMARY }} />
                Copier la clé
              </motion.button>
              <motion.button
                type="button"
                onClick={() => setNewSecret(null)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm border-2 border-gray-200 text-gray-600 bg-white"
                whileTap={{ scale: 0.97 }}
              >
                J’ai sauvegardé la clé
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {formOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <div id="new-key-form" className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-5 lg:p-6 space-y-4">
              <h2 className="font-black text-gray-900 text-lg">
                Nouvelle clé partenaire
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="partner-name" className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
                    Nom du partenaire
                  </label>
                  <input
                    id="partner-name"
                    type="text"
                    value={partnerName}
                    onChange={(e) => setPartnerName(e.target.value)}
                    placeholder="ex. BICICI, SIB, UNACOOPEC"
                    disabled={saving}
                    className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:outline-none bg-gray-50 text-sm font-medium disabled:opacity-60"
                    style={{
                      borderColor: partnerName.trim() ? BO_PRIMARY : undefined,
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="partner-type" className="block text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
                    Type
                  </label>
                  <select
                    id="partner-type"
                    value={partnerType}
                    onChange={(e) =>
                      setPartnerType(e.target.value as PartnerType)
                    }
                    disabled={saving}
                    className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:outline-none bg-gray-50 text-sm font-bold text-gray-800 disabled:opacity-60"
                    style={{ borderColor: BO_PRIMARY }}
                  >
                    <option value="bank">Banque</option>
                    <option value="microfinance">Microfinance</option>
                    <option value="institution">Institution</option>
                  </select>
                </div>
              </div>
              <motion.button
                type="button"
                onClick={() => void generateKey()}
                disabled={saving || !partnerName.trim()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl font-black text-sm text-white border-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: `linear-gradient(135deg, ${BO_PRIMARY}, ${BO_PRIMARY}CC)`,
                  borderColor: BO_PRIMARY,
                  boxShadow: `0 4px 14px ${BO_PRIMARY}40`,
                }}
                whileTap={{ scale: saving ? 1 : 0.97 }}
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Key className="w-5 h-5" />
                )}
                Générer la clé
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div
          className="mb-6 flex items-start gap-3 rounded-2xl border-2 px-4 py-3 bg-red-50"
          style={{ borderColor: '#fecaca' }}
        >
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <p className="text-sm font-semibold text-red-800">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-gray-500">
          <Loader2
            className="w-10 h-10 animate-spin"
            style={{ color: BO_PRIMARY }}
          />
          <p className="text-sm font-bold">Chargement des clés…</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm overflow-hidden"
        >
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: `${BO_DARK}08` }}>
                <tr>
                  {[
                    'Partenaire',
                    'Type',
                    'Clé',
                    'Statut',
                    'Appels',
                    'Dernière utilisation',
                    'Actions',
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left py-4 px-4 text-xs font-black text-gray-500 uppercase tracking-wider whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-12 text-center text-gray-400 font-bold"
                    >
                      Aucune clé API pour le moment.
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <motion.tr
                      key={r.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="border-b border-gray-50 hover:bg-gray-50/80"
                    >
                      <td className="py-3.5 px-4 font-bold text-gray-900">
                        {r.name}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-700">
                        {PARTNER_TYPE_LABELS[r.partner_type as PartnerType] ??
                          r.partner_type}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 min-w-0 max-w-xs">
                          <span className="font-mono text-xs truncate text-gray-800">
                            {revealedIds.has(r.id) ? r.key : maskKey(r.key)}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleReveal(r.id)}
                            className="w-8 h-8 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0"
                            aria-label={revealedIds.has(r.id) ? 'Masquer la clé' : 'Afficher la clé'}
                            aria-pressed={revealedIds.has(r.id)}
                            title={revealedIds.has(r.id) ? 'Masquer' : 'Afficher'}
                          >
                            {revealedIds.has(r.id) ? (
                              <EyeOff className="w-4 h-4 text-gray-600" />
                            ) : (
                              <Eye className="w-4 h-4 text-gray-600" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-xl text-xs font-black ${
                            r.is_active
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                          }`}
                        >
                          {r.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-black tabular-nums text-gray-900">
                        {r.usage_count.toLocaleString('fr-FR')}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-500 font-medium whitespace-nowrap">
                        {r.last_used_at
                          ? new Date(r.last_used_at).toLocaleString('fr-FR', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : '-'}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-2">
                          {r.is_active ? (
                            <motion.button
                              type="button"
                              disabled={patchingId === r.id}
                              onClick={() => void setActive(r.id, false)}
                              className="px-3 py-1.5 rounded-xl text-xs font-black border-2 border-red-200 text-red-700 bg-red-50 disabled:opacity-50"
                              whileTap={{ scale: 0.97 }}
                            >
                              Désactiver
                            </motion.button>
                          ) : (
                            <motion.button
                              type="button"
                              disabled={patchingId === r.id}
                              onClick={() => void setActive(r.id, true)}
                              className="px-3 py-1.5 rounded-xl text-xs font-black border-2 border-green-200 text-green-800 bg-green-50 disabled:opacity-50"
                              whileTap={{ scale: 0.97 }}
                            >
                              Activer
                            </motion.button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="lg:hidden p-4 space-y-3">
            {rows.length === 0 ? (
              <p className="text-center py-8 text-gray-400 font-bold">
                Aucune clé API.
              </p>
            ) : (
              rows.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-2xl border-2 border-gray-100 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-black text-gray-900">{r.name}</p>
                      <p className="text-xs text-gray-500 font-semibold">
                        {PARTNER_TYPE_LABELS[r.partner_type as PartnerType] ??
                          r.partner_type}
                      </p>
                    </div>
                    <span
                      className={`inline-flex px-2 py-1 rounded-xl text-[10px] font-black shrink-0 ${
                        r.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {r.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] break-all text-gray-800 flex-1">
                      {revealedIds.has(r.id) ? r.key : maskKey(r.key)}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleReveal(r.id)}
                      className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0"
                      aria-label={revealedIds.has(r.id) ? 'Masquer la clé' : 'Afficher la clé'}
                      aria-pressed={revealedIds.has(r.id)}
                    >
                      {revealedIds.has(r.id) ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">
                    Appels :{' '}
                    <span className="font-black text-gray-900">
                      {r.usage_count.toLocaleString('fr-FR')}
                    </span>
                    {' · '}
                    Dernier :{' '}
                    {r.last_used_at
                      ? new Date(r.last_used_at).toLocaleString('fr-FR', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })
                      : '-'}
                  </p>
                  {r.is_active ? (
                    <button
                      type="button"
                      disabled={patchingId === r.id}
                      onClick={() => void setActive(r.id, false)}
                      className="w-full py-2.5 rounded-2xl text-xs font-black border-2 border-red-200 text-red-700 bg-red-50 disabled:opacity-50"
                    >
                      Désactiver
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={patchingId === r.id}
                      onClick={() => void setActive(r.id, true)}
                      className="w-full py-2.5 rounded-2xl text-xs font-black border-2 border-green-200 text-green-800 bg-green-50 disabled:opacity-50"
                    >
                      Activer
                    </button>
                  )}
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}
