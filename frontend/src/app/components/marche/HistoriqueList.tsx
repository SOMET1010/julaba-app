// ═══════════════════════════════════════════════════════════════════
//  HistoriqueList — Liste historique partagée entre les 3 profils
// ═══════════════════════════════════════════════════════════════════
import React from 'react';
import { motion } from 'motion/react';
import {
  Clock, Package,
  Banknote, Calendar, ArrowDownLeft, ArrowUpRight,
  CreditCard,
  Flag,
} from 'lucide-react';
import { CommandeMarche, STATUT_CMD_LABELS, THEME_PROFIL } from './marketplace-data';
import { getPaymentLabel } from '../../types/payment';

interface HistoriqueListProps {
  commandes: CommandeMarche[];
  profil: 'producteur' | 'cooperative' | 'marchand';
  /** 'achat' = on filtre ce que ce profil A ACHETÉ
   *  'vente' = on filtre ce que ce profil A VENDU
   *  'tous'  = tout l'historique */
  sens?: 'achat' | 'vente' | 'tous';
  emptyLabel?: string;
  onSignaler?: (commande: CommandeMarche) => void;
}

export function HistoriqueList({
  commandes,
  profil,
  sens = 'tous',
  emptyLabel = 'Aucune transaction dans l\'historique',
  onSignaler,
}: HistoriqueListProps) {
  const theme = THEME_PROFIL[profil];

  // Filtrer selon le sens et le profil
  const filtrées = commandes.filter(c => {
    if (profil === 'producteur') {
      // Le producteur vend → vendeurType = 'producteur'
      if (sens === 'vente') return c.vendeurType === 'producteur';
      return c.vendeurType === 'producteur';
    }
    if (profil === 'cooperative') {
      // Déjà filtré côté parent (role=acheteur / role=vendeur) ; API peut renvoyer acheteurType/vendeurType null
      return true;
    }
    if (profil === 'marchand') {
      return c.acheteurType === 'marchand';
    }
    return true;
  });

  if (filtrées.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4"
          style={{ backgroundColor: theme.light }}
        >
          <Clock className="w-10 h-10" style={{ color: theme.primary }} />
        </div>
        <p className="font-bold text-gray-400">{emptyLabel}</p>
        <p className="text-xs text-gray-300 mt-1">Les transactions apparaîtront ici</p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Liste */}
      {filtrées.map((c, i) => {
        const sc = STATUT_CMD_LABELS[c.statut];
        const initiales = c.produit.slice(0, 2).toUpperCase();
        const isAchat = c.acheteurType === profil || 
          (profil === 'marchand' && c.acheteurType === 'marchand');

        return (
          <motion.div
            key={c.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-white rounded-2xl overflow-hidden relative"
            style={{ border: `2px solid ${sc.border}` }}
          >
            <div className="p-4 pb-12 flex items-start gap-3">
              {/* Avatar + sens */}
              <div className="relative flex-shrink-0">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-sm"
                  style={{ background: `linear-gradient(135deg, ${sc.color}, ${sc.color}BB)` }}
                >
                  {initiales}
                </div>
                <div
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center bg-white border"
                  style={{ borderColor: sc.color }}
                >
                  {isAchat
                    ? <ArrowDownLeft className="w-2.5 h-2.5" style={{ color: sc.color }} />
                    : <ArrowUpRight className="w-2.5 h-2.5" style={{ color: sc.color }} />}
                </div>
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-gray-900 text-sm truncate pr-2">{c.produit}</h3>
                  <span
                    className="flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{ backgroundColor: sc.bg, color: sc.color }}
                  >
                    {sc.label}
                  </span>
                </div>
                <div className="space-y-0.5 mt-1 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    <span>{(c.quantite || 0).toLocaleString()} {c.unite}</span>
                    <span className="mx-1">·</span>
                    <Banknote className="w-3 h-3" />
                    <span className="font-bold text-gray-700">{((c as any).total || c.montantTotal || 0).toLocaleString()} FCFA</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{new Date((c as any).createdAt || (c as any).dateCommande || c.dateCreation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <CreditCard className="w-3 h-3" />
                    <span>{c.modePaiement ? getPaymentLabel(c.modePaiement, c.operateurMobile) : 'Espèces'}</span>
                  </div>
                </div>
              </div>
            </div>
            {onSignaler && (
              <motion.button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSignaler(c);
                }}
                className="absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 shadow-sm"
                whileTap={{ scale: 0.95 }}
              >
                <Flag className="w-3 h-3" />
                Signaler
              </motion.button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}