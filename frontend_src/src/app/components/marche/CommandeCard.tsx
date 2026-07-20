// ═══════════════════════════════════════════════════════════════════
//  CommandeCard — Carte commande croisée partagée entre les 3 profils
// ═══════════════════════════════════════════════════════════════════
import React from 'react';
import { motion } from 'motion/react';
import {
  Package, Banknote, Calendar, CheckCircle, Clock,
  XCircle, Truck, MessageSquare, Users, ArrowRight,
  BarChart3, Check, X,
} from 'lucide-react';
import { CommandeMarche, STATUT_CMD_LABELS, THEME_PROFIL } from './marketplace-data';

interface CommandeCardProps {
  commande: CommandeMarche;
  profil: 'producteur' | 'cooperative' | 'marchand';
  index?: number;
  /** Actions disponibles selon le profil destinataire */
  onAccepter?: (id: string) => void;
  onRefuser?: (id: string) => void;
  onDetails?: (commande: CommandeMarche) => void;
  /** Si true : pas d’Accepter/Refuser (ex. coop qui consulte ses achats chez les producteurs) */
  readOnly?: boolean;
}

export function CommandeCard({
  commande,
  profil,
  index = 0,
  onAccepter,
  onRefuser,
  onDetails,
  readOnly = false,
}: CommandeCardProps) {
  const theme = THEME_PROFIL[profil];
  const sc = STATUT_CMD_LABELS[commande.statut];
  const initiales = commande.produit.slice(0, 2).toUpperCase();
  const isTerminee = ['livree', 'refusee', 'annulee'].includes(commande.statut);

  const StatutIcon = {
    en_attente: Clock,
    acceptee: CheckCircle,
    en_negociation: BarChart3,
    refusee: XCircle,
    livree: Truck,
    annulee: XCircle,
  }[commande.statut];

  // Le libellé de la contrepartie selon le profil (coop / marchand en achat → vendeur)
  const contrepartieLabel =
    profil === 'marchand' || profil === 'cooperative'
      ? commande.vendeurNom
      : commande.acheteurNom;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.04 }}
      className="bg-white rounded-2xl overflow-hidden"
      style={{ border: `2px solid ${sc.border}` }}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-white text-sm"
              style={{ background: `linear-gradient(135deg, ${sc.color}, ${sc.color}BB)` }}
            >
              {initiales}
            </div>
            <div
              className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ backgroundColor: sc.color }}
            >
              <StatutIcon className="w-3 h-3 text-white" />
            </div>
          </div>

          {/* Infos */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-base truncate">{commande.produit}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span
                className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: sc.bg, color: sc.color }}
              >
                {sc.label}
              </span>
              <span
                className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: `${theme.primary}15`, color: theme.primary }}
              >
                {commande.vendeurType === 'cooperative' ? 'Via Coop' : 'Direct Producteur'}
              </span>
            </div>
            <div className="space-y-1 mt-2 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{contrepartieLabel}</span>
              </div>
              <div className="flex items-center gap-1">
                <Package className="w-3 h-3 flex-shrink-0" />
                <span className="font-bold text-gray-700">
                  {(commande.quantite || 0).toLocaleString()} {commande.unite}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Banknote className="w-3 h-3 flex-shrink-0" />
                <span className="font-bold text-gray-700">
                  {((commande as any).total || commande.montantTotal || 0).toLocaleString()} FCFA
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 flex-shrink-0" />
                <span>Livraison le {new Date(commande.dateLivraison).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
              </div>
            </div>
            {/* Message de négociation */}
            {commande.messageNegociation && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-2 p-2 rounded-xl border"
                style={{ backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' }}
              >
                <div className="flex items-start gap-1.5">
                  <MessageSquare className="w-3 h-3 text-violet-500 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-violet-700">{commande.messageNegociation}</p>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Boutons action — Accepter/Refuser masqués en readOnly (décision côté producteur) */}
      {!isTerminee && (onDetails || (!readOnly && (onAccepter || onRefuser))) && (
        <div className="px-4 pb-4 border-t-2 border-gray-50 pt-3">
          <div className="flex gap-2">
            {!readOnly && onAccepter && (
              <motion.button
                onClick={() => onAccepter(commande.id)}
                whileTap={{ scale: 0.97 }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-bold border-2 text-white"
                style={{ background: 'linear-gradient(135deg, #16A34A, #15803D)', borderColor: '#16A34A' }}
              >
                <Check className="w-3.5 h-3.5" /> Accepter
              </motion.button>
            )}
            {!readOnly && onRefuser && (
              <motion.button
                onClick={() => onRefuser(commande.id)}
                whileTap={{ scale: 0.97 }}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-bold border-2"
                style={{ borderColor: '#FECACA', color: '#DC2626', backgroundColor: '#FFF5F5' }}
              >
                <X className="w-3.5 h-3.5" /> Refuser
              </motion.button>
            )}
            {onDetails && (
              <motion.button
                onClick={() => onDetails(commande)}
                whileTap={{ scale: 0.97 }}
                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-2xl text-xs font-bold border-2 bg-gray-100 text-gray-700 border-gray-200"
              >
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}