import React from 'react';
import { Copy, ExternalLink, Shield, User, Wallet } from 'lucide-react';
import { UniversalDrawerBO } from './universal/UniversalDrawerBO';
import { ActivityEvent } from '../../hooks/useRealtime';

export type ActivityEventV3 = ActivityEvent;

type LiveActivityDrawerProps = {
  event: ActivityEventV3 | null;
  onClose: () => void;
};

type ActivityFamily = 'connexion' | 'acteur' | 'transaction' | 'validation' | 'alerte';

const TYPE_LABELS: Record<ActivityFamily, string> = {
  connexion: 'Connexion',
  acteur: 'Acteur',
  transaction: 'Transaction',
  validation: 'Validation',
  alerte: 'Alerte',
};

const TYPE_COLORS: Record<ActivityFamily, { bg: string; color: string }> = {
  connexion: { bg: 'var(--color-background-secondary, #F3F4F6)', color: 'var(--color-text-secondary, #6B7280)' },
  acteur: { bg: '#E6F1FB', color: '#185FA5' },
  transaction: { bg: '#EAF3DE', color: '#3B6D11' },
  validation: { bg: '#E6F1FB', color: '#185FA5' },
  alerte: { bg: '#FCEBEB', color: '#A32D2D' },
};

function getTypeFromEvent(event: ActivityEventV3): ActivityFamily {
  const raw = `${event.type} ${event.label}`.toLowerCase();
  if (raw.includes('login') || raw.includes('logout') || raw.includes('connexion')) return 'connexion';
  if (raw.includes('user:created') || raw.includes('acteur') || raw.includes('inscription') || raw.includes('enrolement')) return 'acteur';
  if (raw.includes('transaction') || raw.includes('payment') || raw.includes('paiement') || raw.includes('vente')) return 'transaction';
  if (raw.includes('validation') || raw.includes('dossier:validated') || raw.includes('dossier:rejected') || raw.includes('rejet')) return 'validation';
  if (raw.includes('alerte') || raw.includes('alert') || raw.includes('doublon') || raw.includes('signalement')) return 'alerte';
  return 'connexion';
}

function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Date invalide';

  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startEvent = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  if (startEvent === startToday) return `Aujourd’hui à ${time}`;
  if (startEvent === startToday - 24 * 60 * 60 * 1000) return `Hier à ${time}`;
  return `${date.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })} à ${time}`;
}

function maskIp(ip?: string): string {
  if (!ip) return 'Non renseignée';
  const first = ip.split(',')[0].trim();
  const parts = first.split('.');
  if (parts.length === 4) return `${parts[0]}.${parts[1]}.x.x`;
  return first.replace(/[a-f0-9]{4,}$/i, 'xxxx');
}

function formatMoney(value?: number): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '';
  return `${value.toLocaleString('fr-FR')} FCFA`;
}

function getMetadataValue(metadata: Record<string, unknown> | undefined, keys: string[]): string | undefined {
  if (!metadata) return undefined;
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === 'string' && value.trim()) return value;
    if (typeof value === 'number') return String(value);
  }
  return undefined;
}

function getEventDevice(event: ActivityEventV3): string {
  const value = (event as ActivityEventV3 & { device?: string }).device;
  return typeof value === 'string' && value.trim() ? value.trim() : 'Non identifié';
}

function normalizeComparable(value?: string): string {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function isDetailRedundant(detail: string | undefined, actorName: string): boolean {
  const detailValue = normalizeComparable(detail);
  if (!detailValue) return true;
  const actorValue = normalizeComparable(actorName);
  return detailValue === actorValue;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3 py-1.5 text-xs">
      <span className="font-semibold text-gray-500">{label}</span>
      <span className="font-bold text-gray-900 min-w-0 break-words">{value || 'Non renseigné'}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-3">
      <h3 className="text-xs font-black uppercase tracking-[0.08em] text-gray-500 mb-2">{title}</h3>
      {children}
    </section>
  );
}

export function LiveActivityDrawer({ event, onClose }: LiveActivityDrawerProps) {
  if (!event) return null;

  const family = getTypeFromEvent(event);
  const colors = TYPE_COLORS[family];
  const actorName = event.acteurNom || event.label || 'Acteur non renseigné';
  const role = event.acteurRole || getMetadataValue(event.metadata, ['role', 'acteurRole']) || 'Non renseigné';
  const zone = event.zoneNom || getMetadataValue(event.metadata, ['zoneNom', 'zone']) || 'Non défini';
  const device = getEventDevice(event);
  const reference = event.reference || getMetadataValue(event.metadata, ['reference', 'ref', 'transactionRef', 'commandeId']);
  const relatedName = getMetadataValue(event.metadata, ['validateurNom', 'sourceNom', 'destinataireNom']);
  const relatedId = getMetadataValue(event.metadata, ['validateurId', 'sourceId', 'destinataireId']);
  const showDescription = !isDetailRedundant(event.detail, actorName);

  const title = (
    <div className="flex items-center gap-3 min-w-0">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: colors.bg, color: colors.color }}
      >
        <Shield className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-base font-black text-gray-900 truncate">
          {TYPE_LABELS[family]} - {actorName}
        </p>
        <p className="text-xs font-semibold text-gray-500">{formatTimestamp(event.timestamp)}</p>
      </div>
    </div>
  );

  return (
    <UniversalDrawerBO open={true} onClose={onClose} title={title} width={480} ariaLabel="Détail de l’événement">
      <div className="space-y-4">
        <Section title="Métadonnées">
          <DetailRow
            label="ID event"
            value={
              <span className="inline-flex items-start gap-2 min-w-0">
                <span className="font-mono break-all whitespace-normal">{event.id}</span>
                <button
                  type="button"
                  aria-label="Copier l’ID complet"
                  className="p-1 rounded hover:bg-gray-100"
                  onClick={() => void navigator.clipboard?.writeText(event.id)}
                >
                  <Copy className="w-3.5 h-3.5 text-gray-500" />
                </button>
              </span>
            }
          />
          <DetailRow
            label="Type"
            value={
              <span
                className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-black"
                style={{ backgroundColor: colors.bg, color: colors.color }}
              >
                {TYPE_LABELS[family]}
              </span>
            }
          />
          <DetailRow label="Horodatage" value={event.timestamp} />
          <DetailRow label="IP" value={maskIp(event.ip)} />
        </Section>

        <Section title="Contexte">
          <DetailRow label="Acteur" value={actorName} />
          <DetailRow label="Rôle" value={role} />
          <DetailRow label="Device" value={device} />
          <DetailRow label="Zone" value={zone} />
          <DetailRow label="Montant" value={formatMoney(event.montant)} />
          <DetailRow label="Référence" value={reference} />
          {showDescription && <DetailRow label="Description" value={event.detail} />}
        </Section>

        <Section title="Actions liées">
          {event.userId ? (
            <a
              href={`/backoffice/acteurs/${event.userId}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2 hover:bg-gray-50"
            >
              <span className="flex items-center gap-2 min-w-0">
                <User className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="text-xs font-bold text-gray-800 truncate">Voir fiche {actorName}</span>
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            </a>
          ) : null}
          {relatedName && relatedId ? (
            <a
              href={`/backoffice/acteurs/${relatedId}`}
              className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-3 py-2 hover:bg-gray-50"
            >
              <span className="flex items-center gap-2 min-w-0">
                <Wallet className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <span className="text-xs font-bold text-gray-800 truncate">Voir fiche {relatedName}</span>
              </span>
              <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            </a>
          ) : null}
          {!event.userId && !(relatedName && relatedId) ? (
            <p className="text-xs font-semibold text-gray-400">Aucune action liée disponible.</p>
          ) : null}
        </Section>
      </div>
    </UniversalDrawerBO>
  );
}
