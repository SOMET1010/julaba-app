import { ChangeEvent, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  ChevronRight,
  FilterX,
  HelpCircle,
  Inbox,
  LogIn,
  Monitor,
  Search,
  Smartphone,
  Tablet,
  UserPlus,
} from 'lucide-react';
import { ActivityEvent } from '../../hooks/useRealtime';
import { LiveActivityDrawer } from './LiveActivityDrawer';

type LiveActivityType = 'connexion' | 'acteur' | 'transaction' | 'validation' | 'alerte';
type DeviceFamily = 'desktop' | 'mobile' | 'tablet' | 'app' | 'unknown';
type ActivityEventWithDevice = ActivityEvent & {
  device?: string;
  deviceFamily?: DeviceFamily;
  deviceBrowser?: string;
  deviceUserAgent?: string;
};

type Props = {
  events: ActivityEventWithDevice[];
  loading?: boolean;
  className?: string;
  totalCount?: number;
};

const FILTERS: Array<{ type: LiveActivityType; label: string; icon: any }> = [
  { type: 'connexion', label: 'Connexion', icon: LogIn },
  { type: 'acteur', label: 'Acteur', icon: UserPlus },
  { type: 'transaction', label: 'Transaction', icon: ArrowLeftRight },
  { type: 'validation', label: 'Validation', icon: CheckCircle2 },
  { type: 'alerte', label: 'Alerte', icon: AlertTriangle },
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  marchand: 'Marchand',
  producteur: 'Producteur',
  cooperative: 'Coopérative',
  cooperateur: 'Coopérateur',
  identificateur: 'Identificateur',
  institution: 'Institution',
};

function getTypeFromEvent(event: ActivityEventWithDevice): LiveActivityType {
  const raw = `${event.type} ${event.label} ${event.detail}`.toLowerCase();
  if (raw.includes('login') || raw.includes('logout') || raw.includes('connexion')) return 'connexion';
  if (raw.includes('user:created') || raw.includes('acteur') || raw.includes('inscription') || raw.includes('enrolement')) return 'acteur';
  if (raw.includes('transaction') || raw.includes('payment') || raw.includes('paiement') || raw.includes('vente')) return 'transaction';
  if (raw.includes('validation') || raw.includes('dossier:validated') || raw.includes('dossier:rejected') || raw.includes('rejet')) return 'validation';
  if (raw.includes('alerte') || raw.includes('alert') || raw.includes('doublon') || raw.includes('signalement')) return 'alerte';
  return 'connexion';
}

function getColorConfig(type: LiveActivityType) {
  if (type === 'transaction') return { iconBg: '#EAF3DE', iconColor: '#3B6D11' };
  if (type === 'validation' || type === 'acteur') return { iconBg: '#E6F1FB', iconColor: '#185FA5' };
  if (type === 'alerte') return { iconBg: '#FCEBEB', iconColor: '#A32D2D', rowBg: '#FCEBEB', textColor: '#501313', detailColor: '#791F1F' };
  return {
    iconBg: 'var(--color-background-secondary, #F3F4F6)',
    iconColor: 'var(--color-text-secondary, #6B7280)',
  };
}

function formatHourKey(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'date-invalide';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}`;
}

function formatMinuteKey(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'date-invalide';
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function formatHourLabel(key: string): string {
  if (key === 'date-invalide') return 'Date invalide';
  const [datePart, hour] = key.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startKey = date.getTime();
  const hourLabel = `${Number(hour)} h`;
  if (startKey === startToday) return `${hourLabel} · aujourd’hui`;
  if (startKey === startToday - 24 * 60 * 60 * 1000) return `${hourLabel} · hier`;
  return `${date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} · ${hourLabel}`;
}

function formatItemTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatMontantFCFA(value: number): string {
  return `${value.toLocaleString('fr-FR')} FCFA`;
}

function formatRoleLabel(role?: string): string {
  if (!role) return 'Rôle non renseigné';
  return ROLE_LABELS[role.toLowerCase()] || role;
}

function getActorName(event: ActivityEventWithDevice): string {
  return event.acteurNom || event.label || 'Acteur non renseigné';
}

function getEventDevice(event: ActivityEventWithDevice): string {
  const value = event.device;
  return typeof value === 'string' && value.trim() ? value.trim() : 'Non identifié';
}

function getDeviceIcon(family: string | undefined) {
  switch (family) {
    case 'desktop':
      return Monitor;
    case 'mobile':
      return Smartphone;
    case 'tablet':
      return Tablet;
    case 'app':
      return Smartphone;
    default:
      return HelpCircle;
  }
}

function getDeviceBrowser(event: ActivityEventWithDevice): string | undefined {
  return typeof event.deviceBrowser === 'string' && event.deviceBrowser.trim()
    ? event.deviceBrowser.trim()
    : undefined;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return '??';
}

function getActorColor(userId?: string): string {
  const palette = ['#7C3AED', '#0F766E', '#C2410C', '#DB2777', '#4B5563', '#D97706', '#2563EB', '#16A34A'];
  const seed = userId || 'unknown';
  const hash = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return palette[hash % palette.length];
}

function getTypeLabel(type: LiveActivityType): string {
  return FILTERS.find((f) => f.type === type)?.label || 'Événement';
}

function getLineOneDetail(event: ActivityEventWithDevice, type: LiveActivityType): string {
  const actor = getActorName(event);
  const showMontant = (type === 'transaction' || event.type === 'paiement')
    && typeof event.montant === 'number'
    && Number.isFinite(event.montant);
  const amount = showMontant
    ? ` - ${formatMontantFCFA(event.montant)}`
    : '';
  return `${actor}${amount}`;
}

function SkeletonRows() {
  return (
    <div className="p-4 space-y-3">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="animate-pulse"
          style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
        >
          <div
            className="rounded-full bg-gray-200"
            style={{ width: 28, height: 28 }}
          />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-3/4" />
            <div className="h-2.5 bg-gray-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LiveActivityFeed({ events, loading = false, className = '', totalCount }: Props) {
  const [activeTypes, setActiveTypes] = useState<Set<LiveActivityType>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<ActivityEventWithDevice | null>(null);

  const hasActiveFilters = activeTypes.size > 0 || searchQuery.trim().length > 0;

  const dedupedEvents = useMemo(() => {
    const byKey = new Map<string, ActivityEventWithDevice>();
    events.forEach((event) => {
      const type = getTypeFromEvent(event);
      const key = type === 'connexion'
        ? `${event.userId || event.id}-${formatMinuteKey(event.timestamp)}-${getEventDevice(event)}`
        : event.id;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, event);
        return;
      }
      const existingTime = new Date(existing.timestamp).getTime();
      const eventTime = new Date(event.timestamp).getTime();
      if ((Number.isNaN(existingTime) ? -Infinity : existingTime) <= (Number.isNaN(eventTime) ? -Infinity : eventTime)) {
        byKey.set(key, event);
      }
    });
    return Array.from(byKey.values());
  }, [events]);

  const filteredEvents = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return dedupedEvents.filter((event) => {
      const type = getTypeFromEvent(event);
      const typeMatches = activeTypes.size === 0 || activeTypes.has(type);
      const searchTarget = [
        event.acteurNom,
        event.zoneNom,
        event.detail,
        event.label,
        event.acteurRole,
        getEventDevice(event),
      ].filter(Boolean).join(' ').toLowerCase();
      return typeMatches && (!query || searchTarget.includes(query));
    });
  }, [dedupedEvents, activeTypes, searchQuery]);

  const groupedByHour = useMemo(() => {
    const groups = new Map<string, ActivityEventWithDevice[]>();
    filteredEvents.forEach((event) => {
      const key = formatHourKey(event.timestamp);
      const list = groups.get(key) || [];
      list.push(event);
      groups.set(key, list);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredEvents]);

  const toggleType = (type: LiveActivityType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const openDetail = (event: ActivityEventWithDevice) => {
    setSelectedEvent(event);
  };

  const closeDrawer = () => {
    setSelectedEvent(null);
  };

  const resetFilters = () => {
    setActiveTypes(new Set());
    setSearchQuery('');
  };

  return (
    <div
      className={className}
      style={{
        height: '500px',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-background-primary, #FFFFFF)',
      }}
    >
      <div
        style={{
          flexShrink: 0,
          padding: '14px 18px',
          backgroundColor: '#E6F1FB',
          borderBottom: '0.5px solid #F3F4F6',
        }}
      >
        <p className="font-bold text-gray-600" style={{ fontSize: 12 }}>
          {(totalCount ?? events.length).toLocaleString('fr-FR')} événements - dernières 24 h
        </p>
      </div>

      <div
        style={{
          flexShrink: 0,
          padding: '10px 14px',
          borderBottom: '0.5px solid #F3F4F6',
          background: 'var(--color-background-primary, #FFFFFF)',
        }}
      >
        <div className="relative" style={{ marginBottom: 8 }}>
          <Search
            className="text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
            style={{ width: '14px', height: '14px' }}
          />
          <input
            type="search"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Rechercher un acteur..."
            className="w-full h-8 pl-8 pr-3 rounded-xl border border-gray-200 font-semibold outline-none focus:border-blue-300"
            style={{ fontSize: 12 }}
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
          {FILTERS.map((filter) => {
            const active = activeTypes.has(filter.type);
            const Icon = filter.icon;
            const colors = getColorConfig(filter.type);
            return (
              <button
                key={filter.type}
                type="button"
                onClick={() => toggleType(filter.type)}
                className="rounded-full border font-bold transition-colors"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  height: 28,
                  padding: '0 10px',
                  fontSize: 11,
                  flexShrink: 0,
                  backgroundColor: active ? colors.iconBg : 'var(--color-background-secondary, #F9FAFB)',
                  borderColor: active ? colors.iconColor : 'var(--color-border-tertiary, #E5E7EB)',
                  color: active ? colors.iconColor : 'var(--color-text-secondary, #6B7280)',
                }}
              >
                <Icon style={{ width: '14px', height: '14px' }} />
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          background: 'var(--color-background-primary, #FFFFFF)',
        }}
      >
        {loading ? (
          <SkeletonRows />
        ) : filteredEvents.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center px-6 text-center text-gray-400">
            {hasActiveFilters ? <FilterX className="w-10 h-10 mb-3 opacity-40" /> : <Inbox className="w-10 h-10 mb-3 opacity-40" />}
            <p className="text-sm font-bold text-gray-500">
              {hasActiveFilters ? 'Aucun événement pour les filtres sélectionnés' : 'Aucun événement récent'}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="mt-3 font-bold text-blue-700 hover:text-blue-900"
                style={{ fontSize: 12 }}
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {groupedByHour.map(([hourKey, hourEvents]) => (
              <div key={hourKey}>
                <div
                  style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                    padding: '6px 14px',
                    fontSize: '11px',
                    fontWeight: 500,
                    letterSpacing: '0.5px',
                    color: 'var(--color-text-secondary, #6B7280)',
                    background: 'var(--color-background-secondary, #F9FAFB)',
                    borderBottom: '0.5px solid #F3F4F6',
                  }}
                >
                  {formatHourLabel(hourKey)}
                </div>
                {hourEvents.map((event) => {
                  const type = getTypeFromEvent(event);
                  const colors = getColorConfig(type);
                  const filter = FILTERS.find((item) => item.type === type) || FILTERS[0];
                  const Icon = filter.icon;
                  const actorName = getActorName(event);
                  const deviceBrowser = getDeviceBrowser(event);
                  const DeviceIcon = getDeviceIcon(event.deviceFamily);
                  return (
                    <motion.button
                      key={event.id}
                      type="button"
                      onClick={() => openDetail(event)}
                      style={{
                        width: '100%',
                        padding: '9px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        textAlign: 'left',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: '0.5px solid var(--color-border-tertiary, #E5E7EB)',
                        cursor: 'pointer',
                        transition: 'background-color 150ms ease',
                      }}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.16 }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          flexShrink: 0,
                        }}
                      >
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            backgroundColor: colors.iconBg,
                          }}
                        >
                          <Icon style={{ width: '14px', height: '14px', color: colors.iconColor }} />
                        </div>
                        <div
                          style={{
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            fontSize: '9px',
                            fontWeight: 600,
                            backgroundColor: getActorColor(event.userId || actorName),
                            color: '#FFFFFF',
                          }}
                        >
                          {getInitials(actorName)}
                        </div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          style={{
                            margin: 0,
                            fontSize: '12px',
                            lineHeight: 1.3,
                            color: colors.textColor || 'var(--color-text-primary, #111827)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          <span style={{ fontWeight: 500 }}>{getTypeLabel(type)}</span>
                          {(() => {
                            const rest = getLineOneDetail(event, type);
                            return rest ? ` · ${rest}` : '';
                          })()}
                        </p>
                        <p
                          style={{
                            margin: '2px 0 0 0',
                            fontSize: '10px',
                            lineHeight: 1.3,
                            color: colors.detailColor || 'var(--color-text-secondary, #6B7280)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {formatRoleLabel(event.acteurRole)} · {event.zoneNom || 'Non défini'}
                        </p>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          flexShrink: 0,
                        }}
                      >
                        {deviceBrowser && (
                          <div
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                            title={event.deviceUserAgent || event.device || 'Non identifié'}
                          >
                            <DeviceIcon style={{ width: '12px', height: '12px', color: 'var(--color-text-tertiary, #9CA3AF)' }} />
                            <span
                              style={{
                                fontSize: '10px',
                                color: 'var(--color-text-tertiary, #9CA3AF)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {deviceBrowser}
                            </span>
                          </div>
                        )}
                        <span
                          style={{
                            fontSize: '10px',
                            color: 'var(--color-text-tertiary, #9CA3AF)',
                            flexShrink: 0,
                          }}
                        >
                          {formatItemTime(event.timestamp)}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div
        className="text-center"
        style={{
          padding: '8px 14px',
          borderTop: '0.5px solid #F3F4F6',
          flexShrink: 0,
          background: 'var(--color-background-primary, #FFFFFF)',
        }}
      >
        <button
          type="button"
          aria-disabled="true"
          disabled
          title="Bientôt disponible"
          className="inline-flex items-center justify-center gap-1 font-bold text-gray-500 opacity-50 cursor-not-allowed"
          style={{ fontSize: 12 }}
        >
          Voir toute l’activité
          <ChevronRight style={{ width: '14px', height: '14px' }} />
        </button>
      </div>

      <LiveActivityDrawer event={selectedEvent} onClose={closeDrawer} />
    </div>
  );
}
