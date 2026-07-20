import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Headphones, Phone, MessageCircle, Mail, MapPin, HelpCircle,
  Plus, Trash2, Edit3, Save, RotateCcw, Check, X, ChevronUp,
  ChevronDown, AlertCircle, Clock, Info, Loader2, ArrowUpDown,
  Hash, CheckCircle2, Circle, RefreshCw, Ticket, Send, ArrowLeft,
  MessageSquare, User, Shield, ChevronRight, BellRing, CheckCircle,
} from 'lucide-react';
import { useSupportConfig, ContactChannel, FAQItem } from '../../contexts/SupportConfigContext';
import { useTickets, Ticket as TicketType, TicketStatut } from '../../contexts/TicketsContext';
import { useBackOffice } from '../../contexts/BackOfficeContext';
import { toast } from 'sonner';
import { BO_PRIMARY, BO_DARK } from './bo-theme';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CONTACT_TYPE_OPTIONS = [
  { value: 'phone', label: 'Téléphone' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'email', label: 'E-mail' },
];

const CATEGORIE_OPTIONS = [
  { value: 'connexion', label: 'Connexion' },
  { value: 'solde', label: 'Solde' },
  { value: 'technique', label: 'Technique' },
  { value: 'identite', label: 'Identité' },
  { value: 'transaction', label: 'Transaction' },
  { value: 'autre', label: 'Autre' },
];

const HORAIRE_OPTIONS = [
  { value: 'Lun-Ven 8h-18h', label: 'Lun-Ven 8h-18h' },
  { value: 'Lun-Ven 8h-20h', label: 'Lun-Ven 8h-20h' },
  { value: 'Lun-Sam 8h-18h', label: 'Lun-Sam 8h-18h' },
  { value: 'Lun-Sam 8h-13h', label: 'Lun-Sam 8h-13h' },
  { value: 'Lun-Dim 8h-18h', label: 'Lun-Dim 8h-18h' },
  { value: '24h/24 7j/7', label: '24h/24 7j/7' },
  { value: 'Réponse sous 24h', label: 'Réponse sous 24h' },
  { value: 'Réponse sous 48h', label: 'Réponse sous 48h' },
  { value: 'Réponse rapide', label: 'Réponse rapide' },
];

// Formate un numéro en "00 00 00 00 00" (10 chiffres max)
function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 10);
  return digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

// Valide qu'un numéro a exactement 10 chiffres
function isValidPhone(value: string): boolean {
  return value.replace(/\D/g, '').length === 10;
}

const CONTACT_ICONS: Record<string, React.ElementType> = {
  phone: Phone,
  whatsapp: MessageCircle,
  email: Mail,
};

const STATUT_CONFIG: Record<TicketStatut, { label: string; color: string; bg: string }> = {
  nouveau: { label: 'Nouveau', color: '#EF4444', bg: '#FEF2F2' },
  ouvert: { label: 'Nouveau', color: '#EF4444', bg: '#FEF2F2' },
  en_cours: { label: 'En cours', color: '#F59E0B', bg: '#FFFBEB' },
  resolu: { label: 'Résolu', color: '#10B981', bg: '#F0FDF4' },
  ferme: { label: 'Fermé', color: '#6B7280', bg: '#F9FAFB' },
};

const STATUT_FALLBACK = { label: 'Inconnu', color: '#6B7280', bg: '#F9FAFB' };

function getStatutConfig(statut: string) {
  return STATUT_CONFIG[statut as TicketStatut] || STATUT_FALLBACK;
}

function formatRelTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `il y a ${h}h`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
}

// ─── Sous-composants UI ───────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${BO_PRIMARY}20` }}>
        <Icon className="w-5 h-5" style={{ color: BO_PRIMARY }} />
      </div>
      <div>
        <h3 className="font-bold text-gray-900">{title}</h3>
        <p className="text-xs text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}>
      <motion.div
        className="relative w-11 h-6 rounded-full"
        style={{ backgroundColor: value ? BO_PRIMARY : '#D1D5DB' }}
        whileTap={{ scale: 0.95 }}
      >
        <motion.div
          className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
          animate={{ left: value ? '26px' : '4px' }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </motion.div>
    </button>
  );
}

function Badge({ children, color = BO_PRIMARY }: { children: React.ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
      style={{ backgroundColor: `${color}15`, color }}
    >
      {children}
    </span>
  );
}

// ─── Vue Thread ticket ────────────────────────────────────────────────────────

interface ThreadViewProps {
  ticket: TicketType;
  onBack: () => void;
  agentNom: string;
}

function ThreadView({ ticket, onBack, agentNom }: ThreadViewProps) {
  const { envoyerReponseBO, changerStatut, marquerLuParBO } = useTickets();
  const [reponse, setReponse] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const statut = getStatutConfig(ticket.statut);

  useEffect(() => {
    marquerLuParBO(ticket.id);
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket.id, marquerLuParBO]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket.messages?.length]);

  const handleEnvoyer = async () => {
    if (!reponse.trim()) return;
    setSending(true);
    try {
      await envoyerReponseBO(ticket.id, reponse.trim(), agentNom);
      toast.success('Réponse envoyée — l\'utilisateur sera notifié');
    } catch {
      toast.error('Impossible d\'envoyer la réponse');
    } finally {
      setReponse('');
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnvoyer();
    }
  };

  // Réponses rapides
  const REPONSES_RAPIDES = [
    'Bonjour, nous avons bien reçu votre demande et nous la traitons en priorité.',
    'Votre problème a été identifié et sera résolu sous 2h. Merci pour votre patience.',
    'Pouvez-vous nous donner plus de détails sur le problème rencontré ?',
    'Le problème est maintenant résolu. N\'hésitez pas à nous recontacter si besoin.',
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Header thread */}
      <div className="flex items-center gap-3 p-4 bg-white border-b-2 border-gray-100">
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="w-9 h-9 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0"
        >
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </motion.button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-black text-sm" style={{ color: BO_PRIMARY }}>{ticket.numero}</span>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: statut.bg, color: statut.color }}
            >
              {statut.label}
            </span>
          </div>
          <p className="font-bold text-gray-800 text-sm truncate">{ticket.sujet}</p>
          <p className="text-gray-400 text-xs">{ticket.role} · {ticket.messages?.[0]?.auteurNom} · {formatRelTime(ticket.dateCreation)}</p>
        </div>

        {/* Changement statut rapide */}
        <div className="flex gap-1.5 shrink-0">
          {(ticket.statut === 'ouvert' || ticket.statut === 'nouveau') && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { changerStatut(ticket.id, 'en_cours'); toast.success('Ticket pris en charge'); }}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold border-2"
              style={{ borderColor: '#F59E0B', color: '#F59E0B', backgroundColor: '#FFFBEB' }}
            >
              Prendre
            </motion.button>
          )}
          {ticket.statut === 'en_cours' && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { changerStatut(ticket.id, 'resolu'); toast.success('Ticket marqué résolu'); }}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold border-2"
              style={{ borderColor: '#10B981', color: '#10B981', backgroundColor: '#F0FDF4' }}
            >
              Résoudre
            </motion.button>
          )}
          {(ticket.statut === 'resolu' || ticket.statut === 'en_cours') && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => { changerStatut(ticket.id, 'ferme'); toast.success('Ticket fermé'); }}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold border-2 border-gray-200 text-gray-500 bg-gray-50"
            >
              Fermer
            </motion.button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {(ticket.messages || []).map((msg, i) => {
          const isBO = msg.auteur === 'bo';
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`flex gap-3 ${isBO ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm"
                style={{ backgroundColor: isBO ? BO_PRIMARY : '#E5E7EB' }}
              >
                {isBO
                  ? <Shield className="w-4 h-4 text-white" />
                  : <User className="w-4 h-4 text-gray-500" />
                }
              </div>

              {/* Bulle */}
              <div className={`max-w-[75%] ${isBO ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-500">{msg.auteurNom}</span>
                  <span className="text-[10px] text-gray-400">{formatRelTime(msg.date)}</span>
                </div>
                <div
                  className="rounded-3xl px-4 py-3 shadow-sm"
                  style={{
                    backgroundColor: isBO ? BO_PRIMARY : 'white',
                    color: isBO ? 'white' : '#1F2937',
                    borderBottomRightRadius: isBO ? '6px' : undefined,
                    borderBottomLeftRadius: !isBO ? '6px' : undefined,
                  }}
                >
                  <p className="text-sm leading-relaxed">{msg.texte}</p>
                </div>
                {isBO && (
                  <div className="flex items-center gap-1 text-[10px] text-gray-400">
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                    <span>Envoyé</span>
                    {!msg.lu && <span className="text-amber-500 font-bold">· Non lu par l'utilisateur</span>}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEnd} />
      </div>

      {/* Réponses rapides */}
      <div className="px-4 py-2 bg-white border-t border-gray-100 overflow-x-auto">
        <div className="flex gap-2">
          {REPONSES_RAPIDES.map((r, i) => (
            <motion.button
              key={i}
              whileTap={{ scale: 0.95 }}
              onClick={() => setReponse(r)}
              className="shrink-0 px-3 py-1.5 rounded-2xl border-2 text-xs font-bold whitespace-nowrap"
              style={{ borderColor: `${BO_PRIMARY}40`, color: BO_PRIMARY, backgroundColor: `${BO_PRIMARY}08` }}
            >
              {r.slice(0, 30)}...
            </motion.button>
          ))}
        </div>
      </div>

      {/* Zone de saisie */}
      {ticket.statut !== 'ferme' ? (
        <div className="p-4 bg-white border-t-2 border-gray-100">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <textarea
                value={reponse}
                onChange={e => setReponse(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Tape ta réponse... (Entrée pour envoyer)"
                rows={3}
                className="w-full border-2 rounded-2xl px-4 py-3 text-sm outline-none resize-none"
                style={{ borderColor: reponse ? BO_PRIMARY : '#E5E7EB' }}
              />
              <span className="absolute bottom-3 right-3 text-[10px] text-gray-400">
                {reponse.length} car.
              </span>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.05 }}
              onClick={handleEnvoyer}
              disabled={!reponse.trim() || sending}
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md disabled:opacity-40 shrink-0"
              style={{ backgroundColor: BO_PRIMARY }}
            >
              {sending
                ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                : <Send className="w-5 h-5 text-white" />
              }
            </motion.button>
          </div>
          <p className="text-[10px] text-gray-400 mt-1.5 px-1">
            L'utilisateur verra ta réponse dans son espace "Suivre mon ticket" sur la page Support.
          </p>
        </div>
      ) : (
        <div className="p-4 bg-gray-50 border-t border-gray-200 text-center">
          <p className="text-gray-400 text-sm font-bold">Ce ticket est fermé. Réouvre-le pour répondre.</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => changerStatut(ticket.id, 'en_cours')}
            className="mt-2 px-4 py-2 rounded-2xl border-2 text-xs font-bold"
            style={{ borderColor: BO_PRIMARY, color: BO_PRIMARY }}
          >
            Réouvrir le ticket
          </motion.button>
        </div>
      )}
    </div>
  );
}

// ─── Composant principal BOSupport ────────────────────────────────────────────

export function BOSupport() {
  const {
    config, updateConfig, updateContact, addContact, removeContact,
    updateFAQ, addFAQ, removeFAQ, reorderFAQ, updatePointPhysique,
    resetToDefault, isSaving,
  } = useSupportConfig();

  const { tickets, nouveauxCount, changerStatut, marquerLuParBO, creerTicketDemo } = useTickets();
  const { boUser } = useBackOffice();
  const agentNom = boUser ? `${boUser.prenom} ${boUser.nom}` : 'Support JÙLABA';

  const [activeTab, setActiveTab] = useState<'general' | 'contacts' | 'faq' | 'point' | 'tickets'>('tickets');
  const [selectedTicket, setSelectedTicket] = useState<TicketType | null>(null);
  const [ticketFilter, setTicketFilter] = useState<'tous' | 'nouveau' | 'en_cours' | 'resolu'>('tous');
  const [editingContact, setEditingContact] = useState<string | null>(null);
  const [editingFAQ, setEditingFAQ] = useState<string | null>(null);
  const [showNewContact, setShowNewContact] = useState(false);
  const [showNewFAQ, setShowNewFAQ] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [editContactData, setEditContactData] = useState<Partial<ContactChannel>>({});
  const [editFAQData, setEditFAQData] = useState<Partial<FAQItem>>({});
  const [newContact, setNewContact] = useState<Omit<ContactChannel, 'id'>>({ label: '', detail: '', sublabel: '', type: 'phone', actif: true });
  const [newFAQ, setNewFAQ] = useState<Omit<FAQItem, 'id' | 'ordre'>>({ question: '', answer: '', categorie: 'autre', actif: true });

  // Écoute l'event de BOLayout pour ouvrir directement un ticket
  useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent).detail?.ticketId;
      if (id) {
        const t = tickets.find(t => t.id === id);
        if (t) { setSelectedTicket(t); setActiveTab('tickets'); }
      }
    };
    window.addEventListener('bo-open-ticket', handler);
    return () => window.removeEventListener('bo-open-ticket', handler);
  }, [tickets]);

  // Sync ticket sélectionné si les données changent
  useEffect(() => {
    if (selectedTicket) {
      const updated = tickets.find(t => t.id === selectedTicket.id);
      if (updated) setSelectedTicket(updated);
    }
  }, [tickets]);

  const handleSaveContact = (id: string) => {
    if (editContactData.type !== 'email' && editContactData.detail && !isValidPhone(editContactData.detail)) {
      toast.error('Le numéro doit contenir exactement 10 chiffres');
      return;
    }
    updateContact(id, editContactData);
    setEditingContact(null);
    toast.success('Contact mis à jour — synchronisé sur tous les profils');
  };

  const handleSaveFAQ = (id: string) => {
    updateFAQ(id, editFAQData);
    setEditingFAQ(null);
    toast.success('Question mise à jour');
  };

  const handleAddContact = () => {
    if (!newContact.label || !newContact.detail) { toast.error('Remplis tous les champs obligatoires'); return; }
    if (newContact.type !== 'email' && !isValidPhone(newContact.detail)) {
      toast.error('Le numéro doit contenir exactement 10 chiffres');
      return;
    }
    addContact({ ...newContact, id: `contact-${Date.now()}` });
    setNewContact({ label: '', detail: '', sublabel: '', type: 'phone', actif: true });
    setShowNewContact(false);
    toast.success('Contact ajouté');
  };

  const handleAddFAQ = () => {
    if (!newFAQ.question || !newFAQ.answer) { toast.error('Remplis la question et la réponse'); return; }
    addFAQ(newFAQ);
    setNewFAQ({ question: '', answer: '', categorie: 'autre', actif: true });
    setShowNewFAQ(false);
    toast.success('Question ajoutée');
  };

  const handleReset = () => {
    resetToDefault();
    setShowResetConfirm(false);
    toast.success('Configuration réinitialisée');
  };

  const sortedFAQ = [...config.faq].sort((a, b) => a.ordre - b.ordre);
  const totalTickets = tickets.length;
  const ticketsOuverts = tickets.filter(t => t.statut === 'ouvert' || t.statut === 'nouveau').length;
  const ticketsEnCours = tickets.filter(t => t.statut === 'en_cours').length;
  const ticketsResolus = tickets.filter(t => t.statut === 'resolu').length;
  const filteredTickets =
    ticketFilter === 'tous'
      ? tickets
      : tickets.filter(t =>
          ticketFilter === 'nouveau' ? t.statut === 'ouvert' || t.statut === 'nouveau' : t.statut === ticketFilter,
        );

  const TABS = [
    { id: 'tickets', label: 'Tickets', icon: Ticket, badge: nouveauxCount, badgeColor: '#EF4444' },
    { id: 'contacts', label: 'Contacts', icon: Phone, badge: config.contacts.filter(c => c.actif).length, badgeColor: BO_PRIMARY },
    { id: 'faq', label: 'FAQ', icon: HelpCircle, badge: config.faq.filter(f => f.actif).length, badgeColor: BO_PRIMARY },
    { id: 'general', label: 'Général', icon: Info, badge: 0, badgeColor: BO_PRIMARY },
    { id: 'point', label: 'Lieu', icon: MapPin, badge: 0, badgeColor: BO_PRIMARY },
  ] as const;

  // ── Vue thread si ticket sélectionné ──────────────────────────────────────
  if (activeTab === 'tickets' && selectedTicket) {
    return (
      <div className="h-[calc(100vh-4rem)] flex flex-col max-w-3xl mx-auto">
        <ThreadView
          ticket={selectedTicket}
          onBack={() => setSelectedTicket(null)}
          agentNom={agentNom}
        />
      </div>
    );
  }

  return (
    <div className="px-4 lg:px-8 py-6 pb-24 max-w-4xl mx-auto overflow-hidden">

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl p-5 mb-6 text-white shadow-lg"
        style={{ background: `linear-gradient(135deg, ${BO_DARK} 0%, #4B4C45 100%)` }}
      >
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center">
              <Headphones className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-xl">Gestion du Support</h1>
              <p className="text-white/70 text-sm">Modifications synchronisées sur tous les profils</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-white/10 rounded-2xl px-3 py-2">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: config.serviceActif ? '#4ADE80' : '#F87171' }} />
              <span className="text-sm text-white/90">{config.serviceActif ? 'Service actif' : 'Service inactif'}</span>
              <Toggle value={config.serviceActif} onChange={v => { updateConfig({ serviceActif: v }); toast.success(v ? 'Service activé' : 'Service désactivé'); }} />
            </div>
            <AnimatePresence>
              {isSaving && (
                <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1.5 bg-white/10 rounded-2xl px-3 py-2">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                  <span className="text-white/80 text-xs">Synchronisation...</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Contacts actifs', value: config.contacts.filter(c => c.actif).length },
            { label: 'FAQ visibles', value: config.faq.filter(f => f.actif).length },
            { label: 'Tickets nouveaux', value: tickets.filter(t => t.statut === 'ouvert' || t.statut === 'nouveau').length },
            { label: 'En traitement', value: tickets.filter(t => t.statut === 'en_cours').length },
          ].map((s, i) => (
            <div key={i} className="bg-white/10 rounded-2xl p-2.5 text-center">
              <p className="text-white font-black text-lg">{s.value}</p>
              <p className="text-white/60 text-xs leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2 text-white/50 text-xs">
          <Clock className="w-3.5 h-3.5" />
          <span>Dernière modification : {config.derniereMaj ? new Date(config.derniereMaj).toLocaleString('fr-FR') : '—'}</span>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => setActiveTab(tab.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border-2 text-sm font-bold whitespace-nowrap transition-all"
              style={{
                backgroundColor: isActive ? BO_PRIMARY : 'white',
                borderColor: isActive ? BO_PRIMARY : '#E5E7EB',
                color: isActive ? 'white' : '#374151',
              }}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.badge > 0 && (
                <motion.span
                  animate={tab.id === 'tickets' && nouveauxCount > 0 ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold"
                  style={{
                    backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : `${tab.badgeColor}18`,
                    color: isActive ? 'white' : tab.badgeColor,
                  }}
                >
                  {tab.badge}
                </motion.span>
              )}
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">

        {/* ── TAB TICKETS ──────────────────────────────────────────────── */}
        {activeTab === 'tickets' && (
          <motion.div key="tickets" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">

            {/* Filtre + bouton simulation */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-2 overflow-x-auto pb-1 flex-1">
                {([
                  { key: 'tous', label: 'Tous' },
                  { key: 'nouveau', label: 'Nouveaux' },
                  { key: 'en_cours', label: 'En cours' },
                  { key: 'resolu', label: 'Résolus' },
                ] as const).map(f => (
                  <motion.button
                    key={f.key}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setTicketFilter(f.key)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border-2 text-xs font-bold whitespace-nowrap"
                    style={{
                      backgroundColor: ticketFilter === f.key ? BO_PRIMARY : 'white',
                      borderColor: ticketFilter === f.key ? BO_PRIMARY : '#E5E7EB',
                      color: ticketFilter === f.key ? 'white' : '#374151',
                    }}
                  >
                    {f.label}
                    {f.key !== 'tous' && (
                      <span
                        className="w-4 h-4 rounded-full text-xs flex items-center justify-center font-black"
                        style={{
                          backgroundColor: ticketFilter === f.key ? 'rgba(255,255,255,0.3)' : '#F3F4F6',
                          color: ticketFilter === f.key ? 'white' : '#6B7280',
                        }}
                      >
                        {tickets.filter(t => f.key === 'nouveau' ? (t.statut === 'nouveau' || t.statut === 'ouvert') : t.statut === f.key).length}
                      </span>
                    )}
                  </motion.button>
                ))}
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { creerTicketDemo(); toast.success('Nouveau ticket entrant simulé'); }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border-2 text-xs font-bold border-dashed shrink-0"
                style={{ borderColor: '#EF4444', color: '#EF4444' }}
              >
                <BellRing className="w-3.5 h-3.5" />
                Simuler
              </motion.button>
            </div>

            <KPIGrid cols={4}>
              <UniversalKPI
                label="Total tickets"
                animatedTarget={totalTickets}
                icon={MessageSquare}
                color="#712864"
              />
              <UniversalKPI
                label="Ouverts"
                animatedTarget={ticketsOuverts}
                icon={AlertCircle}
                color="#f59e0b"
              />
              <UniversalKPI
                label="En cours"
                animatedTarget={ticketsEnCours}
                icon={Clock}
                color="#2072AF"
              />
              <UniversalKPI
                label="Résolus"
                animatedTarget={ticketsResolus}
                icon={CheckCircle}
                color="#16a34a"
              />
            </KPIGrid>

            {/* Liste tickets */}
            <div className="space-y-3">
              {filteredTickets.map((ticket, i) => {
                const statut = getStatutConfig(ticket.statut);
                const dernier = ticket.messages?.[((ticket.messages?.length) || 0) - 1];
                const hasUnread = !ticket.luParBO && ticket.statut !== 'ferme';
                return (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className="bg-white rounded-3xl border-2 p-4 cursor-pointer transition-all"
                    style={{ borderColor: hasUnread ? '#EF4444' : '#E5E7EB' }}
                    onClick={() => { setSelectedTicket(ticket); marquerLuParBO(ticket.id); }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: statut.bg }}>
                        <Hash className="w-5 h-5" style={{ color: statut.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-black text-sm" style={{ color: BO_PRIMARY }}>{ticket.numero}</span>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: statut.bg, color: statut.color }}
                          >
                            {statut.label}
                          </span>
                          {hasUnread && (
                            <motion.span
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ duration: 1.2, repeat: Infinity }}
                              className="w-2 h-2 rounded-full bg-red-500 ml-auto shrink-0"
                            />
                          )}
                        </div>
                        <p className="font-bold text-gray-800 text-sm">{ticket.sujet}</p>
                        <p className="text-gray-500 text-xs">{ticket.role} · {dernier?.auteurNom}</p>
                        {dernier && (
                          <p className="text-gray-400 text-xs mt-1 line-clamp-1 italic">
                            "{dernier.texte}"
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-[10px] text-gray-400">{formatRelTime(ticket.dateCreation)}</span>
                        <div className="flex items-center gap-1 bg-gray-100 rounded-xl px-2 py-1">
                          <MessageSquare className="w-3 h-3 text-gray-500" />
                          <span className="text-xs font-bold text-gray-600">{ticket.messages?.length || 0}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {filteredTickets.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                  <Ticket className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 font-bold">Aucun ticket dans cette catégorie</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── TAB CONTACTS ─────────────────────────────────────────────── */}
        {activeTab === 'contacts' && (
          <motion.div key="contacts" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
            <div className="flex items-center gap-2 bg-green-50 border-2 border-green-100 rounded-2xl px-4 py-2.5">
              <motion.div className="w-2 h-2 rounded-full bg-green-500" animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 2, repeat: Infinity }} />
              <p className="text-green-700 text-xs font-bold">Toute modification est visible en temps réel sur tous les profils</p>
            </div>

            {config.contacts.map((channel, index) => {
              const Icon = CONTACT_ICONS[channel.type] || Phone;
              const isEditing = editingContact === channel.id;
              return (
                <motion.div key={channel.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}
                  className="bg-white rounded-3xl border-2 overflow-hidden"
                  style={{ borderColor: isEditing ? BO_PRIMARY : (channel.actif ? '#E5E7EB' : '#F3F4F6') }}>
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: channel.actif ? `${BO_PRIMARY}15` : '#F3F4F6' }}>
                      <Icon className="w-5 h-5" style={{ color: channel.actif ? BO_PRIMARY : '#9CA3AF' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-sm truncate">{channel.label}</p>
                      <p className="font-bold truncate text-xs" style={{ color: BO_PRIMARY }}>{channel.detail}</p>
                      <p className="text-gray-400 text-xs truncate">{channel.sublabel}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge color={channel.actif ? '#10B981' : '#6B7280'}>{channel.actif ? 'Actif' : 'Inactif'}</Badge>
                      <Toggle value={channel.actif} onChange={v => { updateContact(channel.id, { actif: v }); toast.success(v ? 'Activé' : 'Désactivé'); }} />
                      <motion.button whileTap={{ scale: 0.9 }}
                        onClick={() => { if (isEditing) { setEditingContact(null); } else { setEditingContact(channel.id); setEditContactData({ ...channel }); } }}
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: isEditing ? `${BO_PRIMARY}20` : '#F3F4F6' }}>
                        {isEditing ? <X className="w-4 h-4" style={{ color: BO_PRIMARY }} /> : <Edit3 className="w-4 h-4 text-gray-500" />}
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.9 }}
                        onClick={() => { removeContact(channel.id); toast.success('Contact supprimé'); }}
                        className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </motion.button>
                    </div>
                  </div>
                  <AnimatePresence>
                    {isEditing && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-gray-100">
                        <div className="p-4 space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xs font-bold text-gray-600 mb-1 block">Libellé</label>
                              <input value={editContactData.label || ''} onChange={e => setEditContactData(d => ({ ...d, label: e.target.value }))}
                                className="w-full h-10 border-2 rounded-xl px-2.5 text-sm outline-none" style={{ borderColor: `${BO_PRIMARY}40` }} />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-gray-600 mb-1 block">Type</label>
                              <select value={editContactData.type || 'phone'} onChange={e => setEditContactData(d => ({ ...d, type: e.target.value as any }))}
                                className="w-full h-10 border-2 rounded-xl px-2.5 text-sm outline-none" style={{ borderColor: `${BO_PRIMARY}40` }}>
                                {CONTACT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-600 mb-1 block">Numéro / Adresse</label>
                            <input
                              value={editContactData.detail || ''}
                              onChange={e => {
                                const formatted = editContactData.type === 'email'
                                  ? e.target.value
                                  : formatPhone(e.target.value);
                                setEditContactData(d => ({ ...d, detail: formatted }));
                              }}
                              placeholder={editContactData.type === 'email' ? 'ex: support@julaba.ci' : '00 00 00 00 00'}
                              className="w-full h-10 border-2 rounded-xl px-2.5 text-sm outline-none"
                              style={{ borderColor: editContactData.type !== 'email' && editContactData.detail && !isValidPhone(editContactData.detail) ? '#EF4444' : `${BO_PRIMARY}40` }} />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-600 mb-1 block">Horaire / Délai</label>
                            <select value={editContactData.sublabel || ''} onChange={e => setEditContactData(d => ({ ...d, sublabel: e.target.value }))}
                              className="w-full h-10 border-2 rounded-xl px-2.5 text-sm outline-none" style={{ borderColor: `${BO_PRIMARY}40` }}>
                              <option value="">Choisir un horaire...</option>
                              {HORAIRE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          </div>
                          <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleSaveContact(channel.id)}
                            className="w-full h-10 rounded-2xl flex items-center justify-center gap-2 text-white font-bold text-sm"
                            style={{ backgroundColor: BO_PRIMARY }}>
                            <Save className="w-4 h-4" /> Enregistrer et synchroniser
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            <AnimatePresence>
              {showNewContact ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-3xl border-2 p-4 space-y-3" style={{ borderColor: BO_PRIMARY }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-gray-800">Nouveau canal de contact</p>
                    <button onClick={() => setShowNewContact(false)}><X className="w-5 h-5 text-gray-400" /></button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-600 mb-1 block">Libellé *</label>
                      <input value={newContact.label} onChange={e => setNewContact(d => ({ ...d, label: e.target.value }))}
                        className="w-full h-10 border-2 rounded-xl px-2.5 text-sm outline-none" style={{ borderColor: `${BO_PRIMARY}40` }} />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 mb-1 block">Type</label>
                      <select value={newContact.type} onChange={e => setNewContact(d => ({ ...d, type: e.target.value as any }))}
                        className="w-full h-10 border-2 rounded-xl px-2.5 text-sm outline-none" style={{ borderColor: `${BO_PRIMARY}40` }}>
                        {CONTACT_TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Numéro / Adresse *</label>
                    <input
                      value={newContact.detail}
                      onChange={e => {
                        const formatted = newContact.type === 'email'
                          ? e.target.value
                          : formatPhone(e.target.value);
                        setNewContact(d => ({ ...d, detail: formatted }));
                      }}
                      placeholder={newContact.type === 'email' ? 'ex: support@julaba.ci' : '00 00 00 00 00'}
                      className="w-full h-10 border-2 rounded-xl px-2.5 text-sm outline-none"
                      style={{ borderColor: newContact.type !== 'email' && newContact.detail && !isValidPhone(newContact.detail) ? '#EF4444' : `${BO_PRIMARY}40` }} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Horaire / Délai</label>
                    <select value={newContact.sublabel} onChange={e => setNewContact(d => ({ ...d, sublabel: e.target.value }))}
                      className="w-full h-10 border-2 rounded-xl px-2.5 text-sm outline-none" style={{ borderColor: `${BO_PRIMARY}40` }}>
                      <option value="">Choisir un horaire...</option>
                      {HORAIRE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={handleAddContact}
                    className="w-full h-10 rounded-2xl flex items-center justify-center gap-2 text-white font-bold text-sm" style={{ backgroundColor: BO_PRIMARY }}>
                    <Check className="w-4 h-4" /> Ajouter
                  </motion.button>
                </motion.div>
              ) : (
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowNewContact(true)}
                  className="w-full py-3.5 rounded-3xl border-2 border-dashed flex items-center justify-center gap-2 font-bold text-sm"
                  style={{ borderColor: BO_PRIMARY, color: BO_PRIMARY }}>
                  <Plus className="w-4 h-4" /> Ajouter un canal
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── TAB FAQ ─────────────────────────────────────────────────── */}
        {activeTab === 'faq' && (
          <motion.div key="faq" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
            <div className="flex items-center gap-2 text-xs text-gray-500 px-1">
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>Utilise les flèches pour réordonner</span>
            </div>
            {sortedFAQ.map((item, index) => {
              const isEditing = editingFAQ === item.id;
              return (
                <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-3xl border-2 overflow-hidden"
                  style={{ borderColor: isEditing ? BO_PRIMARY : (item.actif ? '#E5E7EB' : '#F3F4F6') }}>
                  <div className="flex items-start gap-3 p-4">
                    <div className="flex flex-col gap-1 shrink-0 mt-0.5">
                      <button onClick={() => reorderFAQ(item.id, 'up')} disabled={index === 0}
                        className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center" style={{ opacity: index === 0 ? 0.3 : 1 }}>
                        <ChevronUp className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                      <button onClick={() => reorderFAQ(item.id, 'down')} disabled={index === sortedFAQ.length - 1}
                        className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center" style={{ opacity: index === sortedFAQ.length - 1 ? 0.3 : 1 }}>
                        <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge>{item.categorie}</Badge>
                        <Badge color={item.actif ? '#10B981' : '#6B7280'}>{item.actif ? 'Visible' : 'Masqué'}</Badge>
                      </div>
                      <p className="font-bold text-gray-800 text-sm">{item.question}</p>
                      <p className="text-gray-500 text-xs mt-1 line-clamp-2">{item.answer}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Toggle value={item.actif} onChange={v => updateFAQ(item.id, { actif: v })} />
                      <motion.button whileTap={{ scale: 0.9 }}
                        onClick={() => { if (isEditing) { setEditingFAQ(null); } else { setEditingFAQ(item.id); setEditFAQData({ ...item }); } }}
                        className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: isEditing ? `${BO_PRIMARY}20` : '#F3F4F6' }}>
                        {isEditing ? <X className="w-4 h-4" style={{ color: BO_PRIMARY }} /> : <Edit3 className="w-4 h-4 text-gray-500" />}
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => { removeFAQ(item.id); toast.success('Question supprimée'); }}
                        className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </motion.button>
                    </div>
                  </div>
                  <AnimatePresence>
                    {isEditing && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-gray-100">
                        <div className="p-4 space-y-3">
                          <div>
                            <label className="text-xs font-bold text-gray-600 mb-1 block">Catégorie</label>
                            <select value={editFAQData.categorie || 'autre'} onChange={e => setEditFAQData(d => ({ ...d, categorie: e.target.value as any }))}
                              className="w-full h-10 border-2 rounded-xl px-2.5 text-sm outline-none" style={{ borderColor: `${BO_PRIMARY}40` }}>
                              {CATEGORIE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-600 mb-1 block">Question</label>
                            <input value={editFAQData.question || ''} onChange={e => setEditFAQData(d => ({ ...d, question: e.target.value }))}
                              className="w-full h-10 border-2 rounded-xl px-2.5 text-sm outline-none" style={{ borderColor: `${BO_PRIMARY}40` }} />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-600 mb-1 block">Réponse</label>
                            <textarea value={editFAQData.answer || ''} onChange={e => setEditFAQData(d => ({ ...d, answer: e.target.value }))}
                              rows={4} className="w-full border-2 rounded-xl px-2.5 py-2 text-sm outline-none resize-none" style={{ borderColor: `${BO_PRIMARY}40` }} />
                          </div>
                          <motion.button whileTap={{ scale: 0.97 }} onClick={() => handleSaveFAQ(item.id)}
                            className="w-full h-10 rounded-2xl flex items-center justify-center gap-2 text-white font-bold text-sm" style={{ backgroundColor: BO_PRIMARY }}>
                            <Save className="w-4 h-4" /> Enregistrer
                          </motion.button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
            <AnimatePresence>
              {showNewFAQ ? (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="bg-white rounded-3xl border-2 p-4 space-y-3" style={{ borderColor: BO_PRIMARY }}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-bold text-gray-800">Nouvelle question FAQ</p>
                    <button onClick={() => setShowNewFAQ(false)}><X className="w-5 h-5 text-gray-400" /></button>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Catégorie</label>
                    <select value={newFAQ.categorie} onChange={e => setNewFAQ(d => ({ ...d, categorie: e.target.value as any }))}
                      className="w-full h-10 border-2 rounded-xl px-2.5 text-sm outline-none" style={{ borderColor: `${BO_PRIMARY}40` }}>
                      {CATEGORIE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Question *</label>
                    <input value={newFAQ.question} onChange={e => setNewFAQ(d => ({ ...d, question: e.target.value }))}
                      className="w-full h-10 border-2 rounded-xl px-2.5 text-sm outline-none" style={{ borderColor: `${BO_PRIMARY}40` }} />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 mb-1 block">Réponse *</label>
                    <textarea value={newFAQ.answer} onChange={e => setNewFAQ(d => ({ ...d, answer: e.target.value }))}
                      rows={4} className="w-full border-2 rounded-xl px-2.5 py-2 text-sm outline-none resize-none" style={{ borderColor: `${BO_PRIMARY}40` }} />
                  </div>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={handleAddFAQ}
                    className="w-full h-10 rounded-2xl flex items-center justify-center gap-2 text-white font-bold text-sm" style={{ backgroundColor: BO_PRIMARY }}>
                    <Check className="w-4 h-4" /> Ajouter
                  </motion.button>
                </motion.div>
              ) : (
                <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowNewFAQ(true)}
                  className="w-full py-3.5 rounded-3xl border-2 border-dashed flex items-center justify-center gap-2 font-bold text-sm"
                  style={{ borderColor: BO_PRIMARY, color: BO_PRIMARY }}>
                  <Plus className="w-4 h-4" /> Ajouter une question
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── TAB GÉNÉRAL ─────────────────────────────────────────────── */}
        {activeTab === 'general' && (
          <motion.div key="general" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
            <div className="bg-white rounded-3xl border-2 border-gray-100 p-5">
              <SectionHeader icon={Info} title="Informations générales" subtitle="Textes affichés en haut de la page support" />
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1.5 block">Message d'accueil</label>
                  <input value={config.messageAccueil} onChange={e => updateConfig({ messageAccueil: e.target.value })}
                    className="w-full h-11 border-2 rounded-2xl px-3 text-gray-700 text-sm outline-none" style={{ borderColor: `${BO_PRIMARY}40` }} />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1.5 block">Horaires de disponibilité</label>
                  <input value={config.horairesDisponibilite} onChange={e => updateConfig({ horairesDisponibilite: e.target.value })}
                    className="w-full h-11 border-2 rounded-2xl px-3 text-gray-700 text-sm outline-none" style={{ borderColor: `${BO_PRIMARY}40` }} />
                </div>
              </div>
            </div>
            {/* Aperçu */}
            <div className="bg-white rounded-3xl border-2 border-dashed border-gray-200 p-5">
              <p className="text-xs font-bold text-gray-400 mb-3">Aperçu header support</p>
              <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: `linear-gradient(135deg, ${BO_PRIMARY}25, ${BO_PRIMARY}10)` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${BO_PRIMARY}25` }}>
                  <Headphones className="w-5 h-5" style={{ color: BO_PRIMARY }} />
                </div>
                <div>
                  <p className="font-bold text-gray-900">Support JÙLABA</p>
                  <p className="text-sm text-gray-600">{config.messageAccueil}</p>
                  <p className="text-xs text-gray-400">{config.horairesDisponibilite}</p>
                </div>
              </div>
            </div>
            <div className="bg-red-50 rounded-3xl border-2 border-red-100 p-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-bold text-red-700">Réinitialiser la configuration</p>
                  <p className="text-red-600 text-xs mt-1">Remet tous les contacts et FAQ à leurs valeurs d'origine.</p>
                  <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowResetConfirm(true)}
                    className="mt-3 flex items-center gap-2 bg-red-500 text-white text-sm font-bold px-4 py-2 rounded-2xl">
                    <RotateCcw className="w-4 h-4" /> Réinitialiser
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── TAB POINT PHYSIQUE ───────────────────────────────────────── */}
        {activeTab === 'point' && (
          <motion.div key="point" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            <div className="bg-white rounded-3xl border-2 border-gray-100 p-5">
              <SectionHeader icon={MapPin} title="Point physique JÙLABA" subtitle="Informations sur le lieu d'accueil" />
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3">
                  <div>
                    <p className="font-bold text-gray-800 text-sm">Afficher le point physique</p>
                    <p className="text-gray-500 text-xs">Visible sur la page support de tous les profils</p>
                  </div>
                  <Toggle value={config.pointPhysique.actif} onChange={v => updatePointPhysique({ actif: v })} />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1.5 block">Description</label>
                  <textarea value={config.pointPhysique.description} onChange={e => updatePointPhysique({ description: e.target.value })}
                    rows={4} className="w-full border-2 rounded-2xl px-3 py-3 text-gray-700 text-sm outline-none resize-none" style={{ borderColor: `${BO_PRIMARY}40` }} />
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700 mb-1.5 block">Horaires</label>
                  <input value={config.pointPhysique.horaires} onChange={e => updatePointPhysique({ horaires: e.target.value })}
                    className="w-full h-11 border-2 rounded-2xl px-3 text-gray-700 text-sm outline-none" style={{ borderColor: `${BO_PRIMARY}40` }} />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal reset */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div className="fixed inset-0 z-[200] flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowResetConfirm(false)} />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white rounded-3xl border-2 border-red-200 p-6 w-full max-w-sm shadow-xl">
              <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <h3 className="font-bold text-gray-800 text-center text-lg mb-2">Confirmer la réinitialisation</h3>
              <p className="text-gray-600 text-sm text-center mb-5">Tous les contacts et FAQ personnalisés seront remis à leurs valeurs d'origine.</p>
              <div className="flex gap-3">
                <button onClick={() => setShowResetConfirm(false)} className="flex-1 h-11 rounded-2xl border-2 border-gray-200 font-bold text-gray-600 text-sm">Annuler</button>
                <motion.button whileTap={{ scale: 0.97 }} onClick={handleReset} className="flex-1 h-11 rounded-2xl bg-red-500 font-bold text-white text-sm flex items-center justify-center gap-2">
                  <RotateCcw className="w-4 h-4" /> Réinitialiser
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}