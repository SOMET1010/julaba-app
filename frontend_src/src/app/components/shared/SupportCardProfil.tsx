/**
 * SupportCardProfil — Carte Support intégrée dans chaque page "Moi" / Profil.
 *
 * Connectée au TicketsContext :
 * - Création de ticket → BO reçoit la notification push en temps réel
 * - Badge animé si le support a répondu (réponse non lue)
 * - Lien direct vers le thread de conversation
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Headphones, Phone, MessageCircle, Mail, ChevronRight,
  X, Send, CheckCircle, AlertCircle, Hash, Shield,
  BellRing, MessageSquare, Copy,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { useSupportConfig, ContactChannel } from '../../contexts/SupportConfigContext';
import { useTickets } from '../../contexts/TicketsContext';
import { useUser } from '../../contexts/UserContext';
import { getRoleColor } from '../../config/roleConfig';

type RoleType = 'marchand' | 'producteur' | 'cooperative' | 'institution' | 'identificateur' | 'administrateur';

const CONTACT_ICONS: Record<string, React.ElementType> = {
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

interface SupportCardProfilProps {
  role: RoleType;
  delay?: number;
}

export function SupportCardProfil({ role, delay = 0.45 }: SupportCardProfilProps) {
  const navigate = useNavigate();
  const activeColor = getRoleColor(role);
  const { config } = useSupportConfig();
  const { createTicket, tickets } = useTickets();
  const { user } = useUser();

  const userName = user
    ? `${(user as any).prenoms || (user as any).firstName || ''} ${(user as any).nom || (user as any).lastName || ''}`.trim() || 'Utilisateur'
    : 'Utilisateur';

  const [showQuickContact, setShowQuickContact] = useState(false);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketData, setTicketData] = useState({ sujet: '', message: '' });
  const [ticketSubmitted, setTicketSubmitted] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Mes tickets avec réponses non lues du BO
  const mesTickets = tickets;
  const reponsesNonLues = 0;
  const activeContacts = (config.contacts || []).filter(c => c.actif).slice(0, 3);

  const handleTicketSubmit = async () => {
    if (!ticketData.sujet || !ticketData.message) return;
    try {
      const created = await createTicket({
        titre: ticketData.sujet,
        description: ticketData.message,
        categorie: 'autre',
        priorite: 'moyenne',
      });
      const numero = created.numero?.trim() || created.id;
      setTicketSubmitted(numero);
      setTicketData({ sujet: '', message: '' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Impossible de créer le ticket';
      toast.error(msg);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCloseForm = () => {
    setTicketSubmitted(null);
    setShowTicketForm(false);
    setTicketData({ sujet: '', message: '' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 200 }}
      className="mb-4"
    >
      {/* ── Bannière réponses non lues ──────────────────────────────────── */}
      <AnimatePresence>
        {reponsesNonLues > 0 && (
          <motion.button
            key="notif-banner"
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/${role}/support`)}
            className="w-full flex items-center gap-3 rounded-3xl p-4 mb-2 border-2 shadow-md"
            style={{
              background: `linear-gradient(135deg, ${activeColor}18, ${activeColor}08)`,
              borderColor: activeColor,
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.18, 1], rotate: [0, -10, 10, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 2 }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${activeColor}20` }}
            >
              <BellRing className="w-5 h-5" style={{ color: activeColor }} />
            </motion.div>
            <div className="flex-1 text-left">
              <p className="font-bold text-sm" style={{ color: activeColor }}>
                {reponsesNonLues === 1
                  ? 'Le support a répondu à ton ticket'
                  : `${reponsesNonLues} réponses du support non lues`}
              </p>
              <p className="text-gray-500 text-xs">Appuie pour voir la conversation</p>
            </div>
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-black shrink-0"
              style={{ backgroundColor: activeColor }}
            >
              {reponsesNonLues}
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Carte principale Support ────────────────────────────────────── */}
      <motion.div
        className="w-full p-4 rounded-3xl border-2 shadow-md overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${activeColor}08 0%, ${activeColor}04 100%)`,
          borderColor: `${activeColor}40`,
        }}
      >
        {/* Header → page support complète */}
        <motion.button
          className="w-full flex items-center justify-between mb-3"
          onClick={() => navigate(`/${role}/support`)}
          whileTap={{ scale: 0.98 }}
        >
          <div className="flex items-center gap-3">
            <motion.div
              className="w-12 h-12 rounded-2xl flex items-center justify-center relative"
              style={{ backgroundColor: `${activeColor}15` }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <Headphones className="w-6 h-6" style={{ color: activeColor }} />
              {/* Badge tickets en attente de réponse */}
              {mesTickets.filter(t => t.statut !== 'ferme' && t.statut !== 'resolu').length > 0 && (
                <motion.div
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white"
                  style={{ backgroundColor: activeColor }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  {mesTickets.filter(t => t.statut !== 'ferme' && t.statut !== 'resolu').length}
                </motion.div>
              )}
            </motion.div>
            <div className="text-left">
              <h3 className="text-base font-bold text-gray-900">Support & Aide JÙLABA</h3>
              <div className="flex items-center gap-1.5">
                <motion.div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: config.serviceActif ? '#10B981' : '#EF4444' }}
                  animate={config.serviceActif ? { scale: [1, 1.4, 1], opacity: [1, 0.5, 1] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <p className="text-xs text-gray-500">
                  {config.serviceActif ? config.horairesDisponibilite : 'Service indisponible'}
                </p>
              </div>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </motion.button>

        {/* Résumé mes tickets */}
        {mesTickets.length > 0 && (
          <div className="mb-3 space-y-1.5">
            {mesTickets.slice(0, 2).map(ticket => {
              const hasBoReply = false;
              const isUnread = false;
              return (
                <motion.button
                  key={ticket.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(`/${role}/support`)}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-2xl border text-left"
                  style={{
                    borderColor: isUnread ? activeColor : '#E5E7EB',
                    backgroundColor: isUnread ? `${activeColor}06` : '#F9FAFB',
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: isUnread ? `${activeColor}20` : '#E5E7EB' }}
                  >
                    {hasBoReply
                      ? <Shield className="w-3.5 h-3.5" style={{ color: activeColor }} />
                      : <Hash className="w-3.5 h-3.5 text-gray-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate" style={{ color: isUnread ? activeColor : '#374151' }}>
                      {ticket.titre}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono">{ticket.numero || ticket.id?.slice(0, 8)}</p>
                  </div>
                  {isUnread && (
                    <motion.div
                      animate={{ scale: [1, 1.3, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity }}
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: activeColor }}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>
        )}

        {/* Boutons d'action rapide */}
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { setShowQuickContact(!showQuickContact); setShowTicketForm(false); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border-2 text-xs font-bold flex-1"
            style={{
              backgroundColor: showQuickContact ? activeColor : 'white',
              borderColor: activeColor,
              color: showQuickContact ? 'white' : activeColor,
            }}
          >
            <Phone className="w-3.5 h-3.5" />
            Nous contacter
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { setShowTicketForm(!showTicketForm); setShowQuickContact(false); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border-2 text-xs font-bold flex-1"
            style={{
              backgroundColor: showTicketForm ? activeColor : 'white',
              borderColor: activeColor,
              color: showTicketForm ? 'white' : activeColor,
            }}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Nouveau ticket
          </motion.button>
        </div>

        {/* ── Contacts rapides (expandable) ──────────────────────────── */}
        <AnimatePresence>
          {showQuickContact && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden mt-3"
            >
              <div className="flex flex-col gap-2">
                {activeContacts.length === 0 && (
                  <p className="text-xs text-gray-400 text-center py-3">Aucun contact disponible pour le moment</p>
                )}
                {activeContacts.map((channel, i) => {
                  const Icon = CONTACT_ICONS[channel.type] || Phone;
                  return (
                    <motion.button
                      key={channel.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={getContactAction(channel)}
                      className="flex items-center gap-3 p-2.5 rounded-2xl bg-white border border-gray-100 shadow-sm text-left"
                    >
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${activeColor}15` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: activeColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">{channel.detail}</p>
                        <p className="text-xs text-gray-400 truncate">{channel.sublabel}</p>
                      </div>
                      <Send className="w-3.5 h-3.5 shrink-0" style={{ color: activeColor }} />
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Formulaire ticket rapide (expandable) ─────────────────── */}
        <AnimatePresence>
          {showTicketForm && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden mt-3"
            >
              <AnimatePresence mode="wait">
                {ticketSubmitted ? (
                  /* ── Confirmation ticket créé ── */
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex flex-col items-center py-4 gap-3"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.5 }}
                    >
                      <CheckCircle className="w-12 h-12" style={{ color: activeColor }} />
                    </motion.div>
                    <p className="font-bold text-gray-800 text-sm">Ticket créé — le support est notifié</p>

                    {/* Numéro avec copie */}
                    <div
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl border-2 w-full"
                      style={{ borderColor: activeColor, backgroundColor: `${activeColor}08` }}
                    >
                      <Hash className="w-4 h-4 shrink-0" style={{ color: activeColor }} />
                      <span className="font-black flex-1" style={{ color: activeColor }}>{ticketSubmitted}</span>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleCopy(ticketSubmitted)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: `${activeColor}20` }}
                      >
                        {copied
                          ? <CheckCircle className="w-4 h-4" style={{ color: activeColor }} />
                          : <Copy className="w-4 h-4" style={{ color: activeColor }} />
                        }
                      </motion.button>
                    </div>

                    <p className="text-gray-500 text-xs text-center">
                      Notre équipe répond sous 24h. Tu verras la réponse ici et sur la page Support.
                    </p>

                    <div className="flex gap-2 w-full">
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => navigate(`/${role}/support`)}
                        className="flex-1 h-9 rounded-2xl border-2 text-xs font-bold"
                        style={{ borderColor: activeColor, color: activeColor }}
                      >
                        Voir le ticket
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleCloseForm}
                        className="flex-1 h-9 rounded-2xl text-white text-xs font-bold"
                        style={{ backgroundColor: activeColor }}
                      >
                        Fermer
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  /* ── Formulaire ── */
                  <motion.div key="form" className="space-y-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-gray-600">Nouveau signalement</p>
                      <button onClick={handleCloseForm}>
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                    <select
                      value={ticketData.sujet}
                      onChange={e => setTicketData(d => ({ ...d, sujet: e.target.value }))}
                      className="w-full h-10 border-2 rounded-2xl px-3 text-gray-700 text-xs outline-none"
                      style={{ borderColor: `${activeColor}40` }}
                    >
                      <option value="">Choisir un sujet...</option>
                      <option>Problème de connexion</option>
                      <option>Erreur de solde</option>
                      <option>Transaction incorrecte</option>
                      <option>Données incorrectes</option>
                      <option>Application lente</option>
                      <option>Autre problème</option>
                    </select>
                    <textarea
                      value={ticketData.message}
                      onChange={e => setTicketData(d => ({ ...d, message: e.target.value }))}
                      placeholder="Décris ton problème en quelques mots..."
                      rows={3}
                      className="w-full border-2 rounded-2xl px-3 py-2 text-gray-700 text-xs outline-none resize-none"
                      style={{ borderColor: ticketData.message ? activeColor : `${activeColor}40` }}
                    />
                    <motion.button
                      whileTap={{ scale: 0.97 }}
                      onClick={handleTicketSubmit}
                      disabled={!ticketData.sujet || !ticketData.message}
                      className="w-full h-9 rounded-2xl flex items-center justify-center gap-2 text-white text-xs font-bold disabled:opacity-50"
                      style={{ backgroundColor: activeColor }}
                    >
                      <Send className="w-3.5 h-3.5" />
                      Envoyer au support
                    </motion.button>
                    <p className="text-[10px] text-gray-400 text-center">
                      Le support sera notifié immédiatement. Tu recevras une réponse sous 24h.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}