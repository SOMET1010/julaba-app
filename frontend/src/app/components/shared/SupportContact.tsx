import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import {
  ArrowLeft, Phone, MessageCircle, Mail, ChevronDown, Send, CheckCircle,
  AlertCircle, HelpCircle, Clock, MapPin, X, Headphones,
  FileText, Wifi, Lock, CreditCard, User, WifiOff, Hash,
  Copy, ListChecks, Shield, MessageSquare, BellRing, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { getRoleColor } from '../../config/roleConfig';
import { useSupportConfig, ContactChannel } from '../../contexts/SupportConfigContext';
import { useTickets, Ticket } from '../../contexts/TicketsContext';

type RoleType = 'marchand' | 'producteur' | 'cooperative' | 'institution' | 'identificateur' | 'administrateur';

interface SupportContactProps {
  role: RoleType;
  userName?: string;
  showBack?: boolean;
}

const CATEGORIE_ICONS: Record<string, React.ElementType> = {
  connexion: Lock,
  solde: CreditCard,
  technique: Wifi,
  identite: User,
  transaction: FileText,
  autre: HelpCircle,
};

const CONTACT_TYPE_ICONS: Record<string, React.ElementType> = {
  phone: Phone,
  whatsapp: MessageCircle,
  email: Mail,
};

function getContactAction(channel: ContactChannel): () => void {
  if (channel.type === 'phone') return () => window.open(`tel:${channel.detail.replace(/\s/g, '')}`);
  if (channel.type === 'whatsapp') return () => window.open(`https://wa.me/225${channel.detail.replace(/\D/g, '')}`);
  if (channel.type === 'email') return () => window.open(`mailto:${channel.detail}`);
  return () => {};
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

const STATUT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  ouvert: { label: 'En attente', color: '#EF4444', bg: '#FEF2F2' },
  nouveau: { label: 'En attente', color: '#EF4444', bg: '#FEF2F2' },
  en_cours: { label: 'En traitement', color: '#F59E0B', bg: '#FFFBEB' },
  resolu: { label: 'Résolu', color: '#10B981', bg: '#F0FDF4' },
  ferme: { label: 'Fermé', color: '#6B7280', bg: '#F9FAFB' },
};

// ─── Vue Thread utilisateur (lecture seule) ───────────────────────────────────

interface UserThreadProps {
  ticket: Ticket;
  activeColor: string;
  onClose: () => void;
  onLu: () => void;
}

function UserThread({ ticket, activeColor, onClose, onLu }: UserThreadProps) {
  const messagesEnd = useRef<HTMLDivElement>(null);
  const statut = STATUT_LABELS[ticket.statut] ?? STATUT_LABELS.ouvert;
  const reponsesBO = (ticket.messages ?? []).filter((m: any) => m.auteur !== 'user');
  const hasNewResponse = reponsesBO.some((m: any) => !m.lu);

  useEffect(() => {
    if (hasNewResponse) onLu();
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-[200] flex flex-col bg-white"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b-2 border-gray-100 pt-safe"
        style={{ borderBottomColor: `${activeColor}30` }}>
        <motion.button whileTap={{ scale: 0.9 }} onClick={onClose}
          className="w-9 h-9 rounded-2xl flex items-center justify-center border-2"
          style={{ borderColor: `${activeColor}30` }}>
          <X className="w-4 h-4" style={{ color: activeColor }} />
        </motion.button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-black text-sm" style={{ color: activeColor }}>{ticket.numero}</span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: statut.bg, color: statut.color }}>
              {statut.label}
            </span>
          </div>
          <p className="font-bold text-gray-700 text-sm truncate">{ticket.sujet ?? ticket.titre}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">

        {/* Indicateur réponse BO */}
        {hasNewResponse && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-3 flex items-center gap-2 text-sm font-bold"
            style={{ backgroundColor: `${activeColor}15`, color: activeColor }}
          >
            <BellRing className="w-4 h-4" />
            Le support a répondu à votre ticket
          </motion.div>
        )}

        {(ticket.messages ?? []).map((msg: any, i: number) => {
          const isBO = msg.auteur !== 'user';
          return (
            <motion.div
              key={msg.id ?? i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`flex gap-3 ${isBO ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm"
                style={{ backgroundColor: isBO ? activeColor : '#E5E7EB' }}
              >
                {isBO ? <Shield className="w-4 h-4 text-white" /> : <User className="w-4 h-4 text-gray-500" />}
              </div>
              <div className={`max-w-[78%] flex flex-col gap-1 ${isBO ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-500">{msg.auteurNom}</span>
                  <span className="text-[10px] text-gray-400">{formatRelTime(msg.date)}</span>
                </div>
                <div
                  className="rounded-3xl px-4 py-3 shadow-sm"
                  style={{
                    backgroundColor: isBO ? activeColor : 'white',
                    color: isBO ? 'white' : '#1F2937',
                    borderBottomRightRadius: isBO ? '6px' : undefined,
                    borderBottomLeftRadius: !isBO ? '6px' : undefined,
                    border: !isBO ? `2px solid ${activeColor}18` : undefined,
                  }}
                >
                  <p className="text-sm leading-relaxed">{msg.texte}</p>
                </div>
                {isBO && (
                  <div className="flex items-center gap-1 text-[10px]" style={{ color: activeColor }}>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Support JÙLABA</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
        <div ref={messagesEnd} />
      </div>

      {/* Footer info */}
      <div className="px-4 py-4 border-t-2 border-gray-100 bg-white">
        {ticket.statut === 'ferme' ? (
          <div className="text-center">
            <p className="text-gray-500 text-sm font-bold">Ce ticket est fermé</p>
            <p className="text-gray-400 text-xs mt-0.5">Crée un nouveau ticket si le problème persiste</p>
          </div>
        ) : (
          <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-3">
            <Clock className="w-4 h-4 text-gray-400 shrink-0" />
            <p className="text-gray-600 text-xs">
              Pour ajouter des informations à ce ticket, contacte-nous par téléphone en mentionnant ton numéro <span className="font-black" style={{ color: activeColor }}>{ticket.numero}</span>
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export function SupportContact({ role, userName = 'Utilisateur', showBack = false }: SupportContactProps) {
  const navigate = useNavigate();
  const activeColor = getRoleColor(role);
  const { config } = useSupportConfig();
  const { createTicket, tickets } = useTickets();

  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'nouveau' | 'suivre'>('nouveau');
  const [formData, setFormData] = useState({ sujet: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState('');
  const [trackedTicket, setTrackedTicket] = useState<Ticket | null>(null);
  const [trackError, setTrackError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewThread, setViewThread] = useState<Ticket | null>(null);

  // Mes tickets récents (créés dans cette session via localStorage)
  const mesTickets = (tickets || []).slice(0, 3);

  const reponsesNonLues = (tickets || []).reduce((acc, t) => {
    const msgs = t.messages ?? [];
    return acc + msgs.filter((m: any) => m.auteur !== 'user' && !m.lu).length;
  }, 0);

  const handleSubmit = async () => {
    if (!formData.sujet || !formData.message) return;
    try {
      const created = await createTicket({
        titre: formData.sujet,
        description: formData.message,
        categorie: 'autre',
        priorite: 'moyenne',
      });
      const numero = created.numero?.trim() || created.id;
      setTicketNumber(numero);
      setSubmitted(true);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Impossible de créer le ticket';
      toast.error(msg);
    }
  };

  const handleClose = () => {
    setSubmitted(false);
    setShowForm(false);
    setFormData({ sujet: '', message: '' });
    setTicketNumber(null);
    setTrackingInput('');
    setTrackedTicket(null);
    setTrackError(false);
    setActiveTab('nouveau');
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTrack = () => {
    if (!trackingInput.trim()) return;
    const found = (tickets || []).find((t: any) => t.numero === trackingInput.trim());
    if (found) {
      setTrackedTicket(found);
      setTrackError(false);
    } else {
      setTrackedTicket(null);
      setTrackError(true);
    }
  };

  const activeContacts = (config?.contacts || []).filter(c => c.actif);
  const activeFAQ = (config?.faq || []).filter(f => f.actif).sort((a, b) => a.ordre - b.ordre);

  return (
    <div className="min-h-screen pb-32" style={{ backgroundColor: '#F5F5F5' }}>

      {/* Vue thread ticket */}
      <AnimatePresence>
        {viewThread && (
          <UserThread
            ticket={viewThread}
            activeColor={activeColor}
            onClose={() => setViewThread(null)}
            onLu={() => { /* L'acteur ne modifie pas le drapeau BO (lu_par_bo). */ }}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-b-3xl p-6 pt-10 mb-6 shadow-lg"
        style={{ background: `linear-gradient(135deg, ${activeColor} 0%, ${activeColor}CC 100%)` }}
      >
        <div className="flex items-center justify-between mb-2">
          {/* Gauche — bouton retour ou espace vide */}
          <div style={{ width: 44 }}>
            {showBack && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate(-1)}
                style={{
                  width: 44, height: 44,
                  borderRadius: 14,
                  background: 'rgba(255,255,255,0.2)',
                  border: '1.5px solid rgba(255,255,255,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </motion.button>
            )}
          </div>

          {/* Centre — titre + sous-titre */}
          <div style={{ flex: 1, textAlign: 'center' }}>
            <h1 className="text-white font-bold text-2xl">Support JÙLABA</h1>
            <p className="text-white/80 text-sm">{config.messageAccueil}</p>
          </div>

          {/* Droite — icône casque animée */}
          <motion.div
            animate={{ rotate: [0, -15, 15, -10, 10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
            style={{
              width: 52, height: 52,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.2)',
              border: '1.5px solid rgba(255,255,255,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Headphones className="w-7 h-7 text-white" />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3 flex items-center gap-3 border border-white/30"
        >
          {config.serviceActif ? (
            <>
              <motion.div
                className="w-3 h-3 rounded-full bg-green-400"
                animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span className="text-white text-sm font-medium">Service disponible</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-red-300" />
              <span className="text-white text-sm font-medium">Service temporairement indisponible</span>
            </>
          )}
          <div className="ml-auto flex items-center gap-1 text-white/70 text-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>{config.horairesDisponibilite}</span>
          </div>
        </motion.div>

        {/* Indicateur réponses non lues */}
        <AnimatePresence>
          {reponsesNonLues > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-3 bg-white rounded-2xl px-4 py-3 flex items-center gap-3"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              >
                <BellRing className="w-5 h-5" style={{ color: activeColor }} />
              </motion.div>
              <div className="flex-1">
                <p className="font-bold text-sm" style={{ color: activeColor }}>
                  {reponsesNonLues} nouvelle{reponsesNonLues > 1 ? 's' : ''} réponse{reponsesNonLues > 1 ? 's' : ''} du support
                </p>
                <p className="text-gray-500 text-xs">Consulte tes tickets ci-dessous</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="px-4 space-y-5">

        {/* Mes tickets récents avec réponses */}
        {mesTickets.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-5 h-5" style={{ color: activeColor }} />
              <h2 className="text-gray-700 font-bold text-lg">Mes tickets</h2>
            </div>
            <div className="space-y-2">
              {mesTickets.map((ticket, i) => {
                const statut = STATUT_LABELS[ticket.statut] ?? STATUT_LABELS.ouvert;
                const reponsesBO = (ticket.messages ?? []).filter((m: any) => m.auteur !== 'user');
                const hasNew = !ticket.luParBO && reponsesBO.some((m: any) => !m.lu);
                return (
                  <motion.button
                    key={ticket.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setViewThread(ticket)}
                    className="w-full bg-white rounded-3xl border-2 p-4 text-left shadow-sm"
                    style={{ borderColor: hasNew ? activeColor : `${activeColor}25` }}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${activeColor}15` }}
                      >
                        <Hash className="w-5 h-5" style={{ color: activeColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-black text-sm" style={{ color: activeColor }}>{ticket.numero || ticket.id?.slice(0, 8)}</span>
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: statut.bg, color: statut.color }}
                          >
                            {statut.label}
                          </span>
                          {hasNew && (
                            <motion.span
                              animate={{ scale: [1, 1.3, 1] }}
                              transition={{ duration: 1.2, repeat: Infinity }}
                              className="w-2 h-2 rounded-full ml-auto"
                              style={{ backgroundColor: activeColor }}
                            />
                          )}
                        </div>
                        <p className="font-bold text-gray-800 text-sm">{ticket.titre}</p>
                        {reponsesBO.length > 0 ? (
                          <div className="flex items-center gap-1.5 mt-1">
                            <Shield className="w-3 h-3 shrink-0" style={{ color: activeColor }} />
                            <p className="text-xs font-bold truncate" style={{ color: activeColor }}>
                              {hasNew ? 'Nouvelle réponse du support' : `${reponsesBO.length} réponse${reponsesBO.length > 1 ? 's' : ''} du support`}
                            </p>
                          </div>
                        ) : (
                          <p className="text-gray-400 text-xs mt-1">En attente de réponse...</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 bg-gray-100 rounded-xl px-2 py-1 shrink-0">
                        <MessageSquare className="w-3 h-3 text-gray-500" />
                        <span className="text-xs font-bold text-gray-600">{(ticket.messages ?? []).length}</span>
                      </div>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Canaux de contact */}
        {activeContacts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-gray-700 font-bold text-lg mb-3">Nous contacter</h2>
            <div className="space-y-3">
              {activeContacts.map((channel, index) => {
                const Icon = CONTACT_TYPE_ICONS[channel.type] || Phone;
                const action = getContactAction(channel);
                return (
                  <motion.button
                    key={channel.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.15 + index * 0.08 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={action}
                    className="w-full bg-white rounded-3xl border-2 p-4 flex items-center gap-4 shadow-sm text-left"
                    style={{ borderColor: `${activeColor}30` }}
                  >
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${activeColor}15` }}>
                      <Icon className="w-6 h-6" style={{ color: activeColor }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-sm">{channel.label}</p>
                      <p className="font-bold" style={{ color: activeColor }}>{channel.detail}</p>
                      <p className="text-gray-500 text-xs">{channel.sublabel}</p>
                    </div>
                    <motion.div
                      className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: activeColor }}
                      whileHover={{ scale: 1.1 }}
                    >
                      <Send className="w-4 h-4 text-white" />
                    </motion.div>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Point physique */}
        {config.pointPhysique.actif && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-3xl border-2 p-4 shadow-sm flex items-start gap-4"
            style={{ borderColor: `${activeColor}30` }}
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${activeColor}15` }}>
              <MapPin className="w-6 h-6" style={{ color: activeColor }} />
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm mb-1">Point JÙLABA le plus proche</p>
              <p className="text-gray-600 text-xs leading-relaxed">{config.pointPhysique.description}</p>
              <p className="text-xs font-bold mt-1" style={{ color: activeColor }}>{config.pointPhysique.horaires}</p>
            </div>
          </motion.div>
        )}

        {/* FAQ */}
        {activeFAQ.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle className="w-5 h-5" style={{ color: activeColor }} />
              <h2 className="text-gray-700 font-bold text-lg">Questions fréquentes</h2>
            </div>
            <div className="space-y-2">
              {activeFAQ.map((item, index) => {
                const Icon = CATEGORIE_ICONS[item.categorie] || HelpCircle;
                const isOpen = openFaq === item.id;
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + index * 0.05 }}
                    className="bg-white rounded-3xl border-2 overflow-hidden shadow-sm"
                    style={{ borderColor: isOpen ? activeColor : `${activeColor}25` }}
                  >
                    <button className="w-full flex items-center gap-3 p-4 text-left" onClick={() => setOpenFaq(isOpen ? null : item.id)}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${activeColor}15` }}>
                        <Icon className="w-4 h-4" style={{ color: activeColor }} />
                      </div>
                      <p className="flex-1 text-gray-800 text-sm font-bold">{item.question}</p>
                      <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                      </motion.div>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 ml-12 text-gray-600 text-sm leading-relaxed border-t pt-3" style={{ borderColor: `${activeColor}20` }}>
                            {item.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Boutons action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="pb-4 space-y-3"
        >
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { setShowForm(true); setActiveTab('nouveau'); }}
            className="w-full rounded-3xl border-2 py-4 px-5 flex items-center gap-3 font-bold text-white shadow-lg"
            style={{ background: `linear-gradient(135deg, ${activeColor}, ${activeColor}CC)`, borderColor: activeColor }}
          >
            <AlertCircle className="w-5 h-5" />
            <span>Signaler un problème</span>
            <Hash className="w-4 h-4 ml-auto" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { setShowForm(true); setActiveTab('suivre'); }}
            className="w-full rounded-3xl border-2 py-4 px-5 flex items-center gap-3 font-bold shadow-sm bg-white relative overflow-hidden"
            style={{ borderColor: `${activeColor}50`, color: activeColor }}
          >
            <ListChecks className="w-5 h-5" />
            <span>Suivre un ticket par numéro</span>
            {reponsesNonLues > 0 && (
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="ml-auto w-5 h-5 rounded-full text-white text-xs font-black flex items-center justify-center"
                style={{ backgroundColor: activeColor }}
              >
                {reponsesNonLues}
              </motion.span>
            )}
          </motion.button>
        </motion.div>
      </div>

      {/* Modal Ticket */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={handleClose} />
            <motion.div
              className="relative w-full max-w-md bg-white rounded-t-3xl p-6 shadow-2xl border-t-2"
              style={{ borderColor: activeColor }}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <div className="w-12 h-1.5 rounded-full bg-gray-200 mx-auto mb-5" />

              {/* Tabs */}
              <div className="flex gap-2 mb-5">
                {(['nouveau', 'suivre'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => { setActiveTab(tab); setSubmitted(false); setTicketNumber(null); setTrackedTicket(null); setTrackError(false); }}
                    className="flex-1 py-2 rounded-2xl text-sm font-bold transition-all"
                    style={{ backgroundColor: activeTab === tab ? activeColor : '#F3F4F6', color: activeTab === tab ? 'white' : '#6B7280' }}
                  >
                    {tab === 'nouveau' ? 'Nouveau ticket' : 'Suivre par numéro'}
                  </button>
                ))}
                <button onClick={handleClose} className="w-9 h-9 rounded-2xl bg-gray-100 flex items-center justify-center shrink-0">
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <AnimatePresence mode="wait">

                {/* ── NOUVEAU TICKET ── */}
                {activeTab === 'nouveau' && !submitted && (
                  <motion.div key="form" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-4">
                    <div>
                      <label className="text-gray-700 text-sm font-bold mb-1.5 block">Sujet</label>
                      <select value={formData.sujet} onChange={e => setFormData(f => ({ ...f, sujet: e.target.value }))}
                        className="w-full h-12 border-2 rounded-2xl px-3 text-gray-700 text-sm outline-none" style={{ borderColor: `${activeColor}40` }}>
                        <option value="">Choisir un sujet...</option>
                        <option>Problème de connexion</option>
                        <option>Erreur de solde</option>
                        <option>Transaction incorrecte</option>
                        <option>Données incorrectes</option>
                        <option>Application lente</option>
                        <option>Autre problème</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-gray-700 text-sm font-bold mb-1.5 block">Décris ton problème</label>
                      <textarea value={formData.message} onChange={e => setFormData(f => ({ ...f, message: e.target.value }))}
                        placeholder="Explique-nous ce qui se passe..."
                        rows={4} className="w-full border-2 rounded-2xl px-3 py-3 text-gray-700 text-sm outline-none resize-none" style={{ borderColor: `${activeColor}40` }} />
                    </div>
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit}
                      disabled={!formData.sujet || !formData.message}
                      className="w-full rounded-2xl py-3.5 font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                      style={{ backgroundColor: activeColor }}>
                      <Send className="w-4 h-4" /> Créer le ticket
                    </motion.button>
                  </motion.div>
                )}

                {/* ── TICKET CRÉÉ ── */}
                {activeTab === 'nouveau' && submitted && ticketNumber && (
                  <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center py-4 gap-4">
                    <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.6 }}>
                      <CheckCircle className="w-14 h-14" style={{ color: activeColor }} />
                    </motion.div>
                    <p className="font-bold text-gray-800 text-lg">Ticket créé avec succès</p>

                    <motion.div
                      className="w-full rounded-3xl border-2 p-4 flex items-center justify-between"
                      style={{ borderColor: activeColor, backgroundColor: `${activeColor}08` }}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                    >
                      <div>
                        <p className="text-xs text-gray-500 mb-0.5">Ton numéro de ticket</p>
                        <p className="font-black text-xl" style={{ color: activeColor }}>{ticketNumber}</p>
                      </div>
                      <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleCopy(ticketNumber)}
                        className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${activeColor}20` }}>
                        {copied ? <CheckCircle className="w-5 h-5" style={{ color: activeColor }} /> : <Copy className="w-5 h-5" style={{ color: activeColor }} />}
                      </motion.button>
                    </motion.div>

                    <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-3 w-full">
                      <p className="text-amber-700 text-xs text-center">
                        Note ce numéro. Tu pourras suivre les réponses du support depuis cette page.
                        Notre équipe te répond sous 24h.
                      </p>
                    </div>

                    <div className="flex gap-2 w-full">
                      <motion.button whileTap={{ scale: 0.97 }} onClick={() => {
                        const t = tickets.find(t => t.numero === ticketNumber);
                        if (t) { handleClose(); setTimeout(() => setViewThread(t), 100); }
                      }}
                        className="flex-1 rounded-2xl py-3 font-bold border-2 text-sm"
                        style={{ borderColor: activeColor, color: activeColor }}>
                        Voir mon ticket
                      </motion.button>
                      <motion.button whileTap={{ scale: 0.97 }} onClick={handleClose}
                        className="flex-1 rounded-2xl py-3 font-bold text-white text-sm" style={{ backgroundColor: activeColor }}>
                        Fermer
                      </motion.button>
                    </div>
                  </motion.div>
                )}

                {/* ── SUIVRE UN TICKET ── */}
                {activeTab === 'suivre' && (
                  <motion.div key="track" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-4">
                    <div>
                      <label className="text-gray-700 text-sm font-bold mb-1.5 block">Numéro de ticket</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          <input
                            value={trackingInput}
                            onChange={e => { setTrackingInput(e.target.value); setTrackError(false); setTrackedTicket(null); }}
                            onKeyDown={e => e.key === 'Enter' && handleTrack()}
                            placeholder="JLB-XXXXXX"
                            className="w-full h-12 border-2 rounded-2xl pl-9 pr-3 text-gray-700 text-sm outline-none font-mono"
                            style={{ borderColor: trackError ? '#EF4444' : `${activeColor}40` }}
                          />
                        </div>
                        <motion.button whileTap={{ scale: 0.95 }} onClick={handleTrack}
                          className="h-12 px-4 rounded-2xl font-bold text-white text-sm" style={{ backgroundColor: activeColor }}>
                          Chercher
                        </motion.button>
                      </div>
                      {trackError && (
                        <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Aucun ticket trouvé avec ce numéro
                        </p>
                      )}
                    </div>

                    <AnimatePresence>
                      {trackedTicket && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="rounded-3xl border-2 overflow-hidden"
                          style={{ borderColor: `${activeColor}40` }}
                        >
                          {/* Info ticket */}
                          <div className="p-4" style={{ backgroundColor: `${activeColor}06` }}>
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-black" style={{ color: activeColor }}>{trackedTicket.numero}</span>
                              <span
                                className="text-xs font-bold px-3 py-1 rounded-full"
                                style={{
                                  backgroundColor: (STATUT_LABELS[trackedTicket.statut] ?? STATUT_LABELS.ouvert).bg,
                                  color: (STATUT_LABELS[trackedTicket.statut] ?? STATUT_LABELS.ouvert).color,
                                }}
                              >
                                {(STATUT_LABELS[trackedTicket.statut] ?? STATUT_LABELS.ouvert).label}
                              </span>
                            </div>
                            <p className="font-bold text-gray-800 text-sm">{trackedTicket.sujet ?? trackedTicket.titre}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Créé le {new Date(trackedTicket.dateCreation).toLocaleDateString('fr-FR')}</span>
                            </div>

                            {/* Résumé messages */}
                            <div className="mt-3 flex items-center gap-3">
                              <div className="flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-gray-400" />
                                <span className="text-xs text-gray-500">{(trackedTicket.messages ?? []).filter((m: any) => m.auteur === 'user').length} message{(trackedTicket.messages ?? []).filter((m: any) => m.auteur === 'user').length > 1 ? 's' : ''}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5" style={{ color: activeColor }} />
                                <span className="text-xs font-bold" style={{ color: activeColor }}>
                                  {(trackedTicket.messages ?? []).filter((m: any) => m.auteur !== 'user').length} réponse{(trackedTicket.messages ?? []).filter((m: any) => m.auteur !== 'user').length > 1 ? 's' : ''} support
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Bouton voir thread */}
                          <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={() => { handleClose(); setTimeout(() => setViewThread(trackedTicket), 100); }}
                            className="w-full py-3 flex items-center justify-center gap-2 font-bold text-sm border-t"
                            style={{ borderColor: `${activeColor}20`, color: activeColor }}
                          >
                            <MessageSquare className="w-4 h-4" />
                            Voir la conversation
                          </motion.button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}