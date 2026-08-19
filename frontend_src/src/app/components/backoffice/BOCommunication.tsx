import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Send, MessageSquare, Users, MapPin, Filter, Plus,
  Clock, CheckCircle2, XCircle, Search, X, Phone,
  Mail, Bell, FileText, BarChart3, Eye,
} from 'lucide-react';
import { BO_PRIMARY } from './bo-theme';
import { fadeInUp, hoverGlow, springSnappy } from './bo-animations';
import { useBackOffice } from '../../contexts/BackOfficeContext';
import { toast } from 'sonner';
import { API_URL } from '../../utils/api';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { boGetActeurs } from '../../services/backoffice-api';
import { sendBulkNotifications } from '../../services/api/notifications-api';
import { HttpError } from '../../services/api/api-client';
import { CIV_REGIONS_FILTER } from '../../data/civ-geography';

type Canal = 'sms' | 'push' | 'email';
type CampagneStatut = 'envoyee' | 'programmee' | 'brouillon';

interface Campagne {
  id: string;
  titre: string;
  message: string;
  canal: Canal;
  cible: string;
  nbDestinataires: number;
  tauxDelivrabilite: number;
  statut: CampagneStatut;
  dateEnvoi: string;
  creePar: string;
}

interface Template {
  id: string;
  nom: string;
  canal: Canal;
  contenu: string;
  variables: string[];
}

const CANAL_CONFIG: Record<Canal, { label: string; icon: any; color: string }> = {
  sms: { label: 'SMS', icon: Phone, color: '#10B981' },
  push: { label: 'Push', icon: Bell, color: '#3B82F6' },
  email: { label: 'Email', icon: Mail, color: '#8B5CF6' },
};

// Icône stockée sur chaque notification créée (metadata.icon), par canal choisi.
const CANAL_ICON: Record<Canal, string> = { sms: '📱', push: '🔔', email: '✉️' };

// Rôles acteurs terrain ciblables par une campagne (rôles BO/admin exclus :
// une campagne s'adresse aux acteurs, pas à l'équipe back-office elle-même).
const ROLE_CIBLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'producteur', label: 'Producteurs' },
  { value: 'marchand', label: 'Marchandes' },
  { value: 'cooperateur', label: 'Coopérateurs' },
  { value: 'institution', label: 'Institutions' },
  { value: 'identificateur', label: 'Identificateurs' },
];

// POST /notifications/send-bulk refuse au-delà de 500 destinataires par envoi
// (notifications.controller.ts). On résout la cible par pages de 100 (limite
// GET /users) jusqu'à ce plafond.
const MAX_BULK_RECIPIENTS = 500;
const RESOLVE_PAGE_SIZE = 100;

// Identifiant de regroupement de la campagne (metadata.campaignId), généré côté
// appelant — voir GET /communication qui le lit pour reconstituer l'historique.
function nouveauCampagneId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'camp-' + Date.now() + '-' + Math.random().toString(16).slice(2);
}



export function BOCommunication() {
  const { hasPermission } = useBackOffice();
  const canWrite = hasPermission('communication.write');
  const [tab, setTab] = useState<'campagnes' | 'templates' | 'nouvelle'>('campagnes');
  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);

  const fetchCommunication = React.useCallback(() => {
    fetch(`${API_URL}/communication`, {
      credentials: 'include',
    })
      .then(r => {
        if (!r.ok) throw new Error('Erreur chargement communication');
        return r.json();
      })
      .then(d => {
        setCampagnes(Array.isArray(d?.campagnes) ? d.campagnes : []);
        if (d?.templates?.length) setTemplates(d.templates);
      })
      .catch(() => { toast.error('Impossible de charger les campagnes'); });
  }, []);

  React.useEffect(() => { fetchCommunication(); }, [fetchCommunication]);

  // Nouvelle campagne
  const [newCanal, setNewCanal] = useState<Canal>('sms');
  const [newTitre, setNewTitre] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newRegion, setNewRegion] = useState('all');
  const [sending, setSending] = useState(false);

  // Résout la cible (rôle + région optionnelle) en liste réelle de userId, via
  // l'annuaire acteurs (GET /users, déjà utilisé partout ailleurs en BO) filtré
  // sur les comptes actifs. Ne fabrique jamais de destinataire : une cible sans
  // acteur retourne une liste vide.
  const resolveDestinataires = async (role: string, region: string): Promise<{ ids: string[]; total: number }> => {
    const ids: string[] = [];
    let total = 0;
    for (let page = 1; ids.length < MAX_BULK_RECIPIENTS; page++) {
      const res = await boGetActeurs({
        page,
        limit: RESOLVE_PAGE_SIZE,
        role,
        region: region === 'all' ? undefined : region,
        statut: 'actif',
      });
      total = res.total;
      for (const acteur of res.data) {
        if (acteur?.id) ids.push(String(acteur.id));
      }
      if (res.data.length < RESOLVE_PAGE_SIZE || ids.length >= res.total) break;
    }
    return { ids: ids.slice(0, MAX_BULK_RECIPIENTS), total };
  };

  const handleEnvoyer = async () => {
    if (!newTitre.trim() || !newMessage.trim()) { toast.error('Titre et message requis'); return; }
    if (!newRole) { toast.error('Choisissez un rôle à cibler'); return; }
    setSending(true);
    try {
      const { ids, total } = await resolveDestinataires(newRole, newRegion);
      if (ids.length === 0) {
        toast.error('Aucun destinataire actif pour ce ciblage — rien n\'a été envoyé');
        return;
      }
      const roleLabel = ROLE_CIBLE_OPTIONS.find(r => r.value === newRole)?.label || newRole;
      const regionLabel = newRegion === 'all' ? '' : ` — ${newRegion}`;
      const result = await sendBulkNotifications({
        userIds: ids,
        type: 'communication',
        titre: newTitre.trim(),
        message: newMessage.trim(),
        category: 'communication',
        icon: CANAL_ICON[newCanal],
        metadata: {
          canal: newCanal,
          cible: `${roleLabel}${regionLabel}`,
          campaignId: nouveauCampagneId(),
        },
      });
      if (result.sent === 0) {
        toast.error('Échec de l\'envoi : aucune notification créée');
        return;
      }
      if (result.failed > 0) {
        toast.warning(`Campagne envoyée à ${result.sent}/${result.total} destinataires (${result.failed} échec(s))`);
      } else {
        toast.success(`Campagne envoyée à ${result.sent} destinataire(s)`);
      }
      if (ids.length < total) {
        toast.info(`Ciblage plafonné à ${MAX_BULK_RECIPIENTS} destinataires sur ${total} correspondant au filtre`);
      }
      setTab('campagnes');
      setNewTitre('');
      setNewMessage('');
      setNewRole('');
      setNewRegion('all');
      fetchCommunication();
    } catch (e) {
      const message = e instanceof HttpError && e.status === 403
        ? 'Votre rôle ne permet pas d\'envoyer de campagnes groupées'
        : e instanceof Error ? e.message : 'Échec de l\'envoi de la campagne';
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const counts = {
    envoyees: campagnes.filter(c => c.statut === 'envoyee').length,
    programmees: campagnes.filter(c => c.statut === 'programmee').length,
    destinataires_total: campagnes.reduce((a, c) => a + c.nbDestinataires, 0),
    taux_moyen: campagnes.filter(c => c.tauxDelivrabilite > 0).length > 0 ? Math.round(campagnes.filter(c => c.tauxDelivrabilite > 0).reduce((a, c) => a + c.tauxDelivrabilite, 0) / campagnes.filter(c => c.tauxDelivrabilite > 0).length) : 0,
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto overflow-hidden">
      <motion.div {...fadeInUp(0)} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl lg:text-3xl font-black text-gray-900">Communication</h1>
          <p className="text-sm text-gray-500 mt-0.5">SMS, push et campagnes ciblées vers les acteurs terrain</p>
        </div>
        {canWrite && (
          <motion.button onClick={() => setTab('nouvelle')} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl text-white font-bold text-sm flex-shrink-0 self-start sm:self-auto"
            style={{ backgroundColor: BO_PRIMARY }}>
            <Plus className="w-4 h-4" /> Nouvelle campagne
          </motion.button>
        )}
      </motion.div>

      {/* KPIs */}
      <KPIGrid cols={4} className="mb-6">
        <UniversalKPI label="Envoyées" animatedTarget={counts.envoyees} icon={Send} color="#10B981" />
        <UniversalKPI label="Programmées" animatedTarget={counts.programmees} icon={Clock} color="#F59E0B" />
        <UniversalKPI label="Destinataires" animatedTarget={counts.destinataires_total} icon={Users} color="#3B82F6" />
        <UniversalKPI label="Délivrabilité" value={`${counts.taux_moyen}%`} icon={CheckCircle2} color={BO_PRIMARY} />
      </KPIGrid>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[{ key: 'campagnes', label: 'Campagnes' }, { key: 'templates', label: 'Templates' }].map(t => (
          <motion.button key={t.key} onClick={() => setTab(t.key as any)} whileTap={{ scale: 0.95 }}
            className="px-4 py-2.5 rounded-2xl border-2 text-sm font-bold"
            style={tab === t.key ? { backgroundColor: BO_PRIMARY, color: '#fff', borderColor: BO_PRIMARY } : { borderColor: '#E5E7EB', color: 'var(--encre-3)' }}>
            {t.label}
          </motion.button>
        ))}
      </div>

      {tab === 'campagnes' && (
        <div className="space-y-3">
          {campagnes.map((c, i) => {
            const canal = CANAL_CONFIG[c.canal];
            const CanalIcon = canal.icon;
            return (
              <motion.div key={c.id} {...fadeInUp(i * 0.05)} className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-4" {...hoverGlow(BO_PRIMARY)}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${canal.color}15` }}>
                    <CanalIcon className="w-5 h-5" style={{ color: canal.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-black text-gray-900 text-sm">{c.titre}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${canal.color}15`, color: canal.color }}>{canal.label}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.statut === 'envoyee' ? 'bg-green-100 text-green-700' : c.statut === 'programmee' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                        {c.statut === 'envoyee' ? 'Envoyée' : c.statut === 'programmee' ? 'Programmée' : 'Brouillon'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-1">{c.message}</p>
                    <div className="flex items-center gap-4 mt-1.5 text-[11px] text-gray-400">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{c.cible}</span>
                      <span className="font-bold">{c.nbDestinataires} destinataires</span>
                      {c.tauxDelivrabilite > 0 && <span className="text-green-600 font-bold">{c.tauxDelivrabilite}% délivré</span>}
                      {c.dateEnvoi && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(c.dateEnvoi).toLocaleDateString('fr-FR')}</span>}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {tab === 'templates' && (
        <div className="space-y-3">
          {templates.map((t, i) => {
            const canal = CANAL_CONFIG[t.canal];
            return (
              <motion.div key={t.id} {...fadeInUp(i * 0.06)} className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${canal.color}15` }}>
                    <FileText className="w-5 h-5" style={{ color: canal.color }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-black text-gray-900 text-sm">{t.nom}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${canal.color}15`, color: canal.color }}>{canal.label}</span>
                    </div>
                    <p className="text-xs text-gray-600 font-mono bg-gray-50 rounded-xl p-2">{t.contenu}</p>
                    <div className="flex gap-1 mt-2">
                      {t.variables.map(v => (
                        <span key={v} className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{`{${v}}`}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {tab === 'nouvelle' && (
        <motion.div {...fadeInUp(0.1)} className="bg-white rounded-3xl border-2 border-gray-100 shadow-sm p-6">
          <h2 className="font-black text-gray-900 mb-5">Nouvelle campagne</h2>
          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Canal</label>
              <div className="flex gap-2">
                {Object.entries(CANAL_CONFIG).map(([k, v]) => {
                  const Icon = v.icon;
                  return (
                    <motion.button key={k} onClick={() => setNewCanal(k as Canal)} whileTap={{ scale: 0.95 }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 text-sm font-bold"
                      style={newCanal === k ? { backgroundColor: v.color, color: '#fff', borderColor: v.color } : { borderColor: '#E5E7EB', color: 'var(--encre-3)' }}>
                      <Icon className="w-4 h-4" /> {v.label}
                    </motion.button>
                  );
                })}
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Titre</label>
              <input value={newTitre} onChange={e => setNewTitre(e.target.value)} placeholder="Titre de la campagne"
                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Rôle ciblé</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm bg-white">
                  <option value="">Sélectionner un rôle…</option>
                  {ROLE_CIBLE_OPTIONS.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Région (optionnel)</label>
                <select value={newRegion} onChange={e => setNewRegion(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm bg-white">
                  <option value="all">Toutes les régions</option>
                  {CIV_REGIONS_FILTER.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Message</label>
              <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)} rows={4} placeholder="Corps du message..."
                className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm resize-none" />
              <p className="text-[11px] text-gray-400 mt-1">Envoyé comme notification in-app (+ push si l'appareil du destinataire est enregistré). Le canal choisi ci-dessus sert à catégoriser la campagne.</p>
            </div>
            <div className="flex gap-3">
              <motion.button onClick={() => setTab('campagnes')} whileTap={{ scale: 0.97 }} disabled={sending}
                className="px-6 py-3 rounded-2xl border-2 border-gray-200 font-bold text-sm text-gray-600 disabled:opacity-50">Annuler</motion.button>
              <motion.button onClick={handleEnvoyer} whileTap={{ scale: 0.97 }} disabled={sending}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-white disabled:opacity-60" style={{ backgroundColor: BO_PRIMARY }}>
                <Send className="w-4 h-4" /> {sending ? 'Envoi…' : 'Envoyer'}
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}