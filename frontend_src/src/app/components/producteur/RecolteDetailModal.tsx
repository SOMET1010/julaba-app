import { ModifierPublicationModal } from './ModifierPublicationModal';
import React, { useState } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Sprout, Package, TrendingUp, TrendingDown, MapPin,
  Calendar, Star, ShoppingBag, CheckCircle, Clock, AlertTriangle,
  BarChart3, Banknote, Tag, Layers, Edit3
} from 'lucide-react';
import { useProducteur, type Recolte, type CycleAgricole } from '../../contexts/ProducteurContext';
import { useApp } from '../../contexts/AppContext';
import { Montant, MontantCard } from '../shared/Montant';

const COLOR = '#2E8B57';

const QUALITY_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  A:       { label: 'Excellente', color: '#16a34a', bg: '#dcfce7' },
  B:       { label: 'Bonne',      color: '#d97706', bg: '#fef3c7' },
  C:       { label: 'Moyenne',    color: '#dc2626', bg: '#fee2e2' },
  premium: { label: 'Premium',   color: '#16a34a', bg: '#dcfce7' },
  standard:{ label: 'Standard',  color: '#d97706', bg: '#fef3c7' },
  bio:     { label: 'Bio',       color: '#15803d', bg: '#dcfce7' },
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  draft:          { label: 'Brouillon',  color: '#6b7280', bg: '#f3f4f6', icon: <Clock className="w-4 h-4" /> },
  published:      { label: 'Publié',    color: '#16a34a', bg: '#dcfce7', icon: <CheckCircle className="w-4 h-4" /> },
  partially_sold: { label: 'En cours',  color: '#d97706', bg: '#fef3c7', icon: <TrendingUp className="w-4 h-4" /> },
  sold_out:       { label: 'Épuisé',   color: '#dc2626', bg: '#fee2e2', icon: <Package className="w-4 h-4" /> },
  declaree:       { label: 'Déclarée', color: '#1d4ed8', bg: '#dbeafe', icon: <Clock className="w-4 h-4" /> },
  validee:        { label: 'Validée',  color: '#16a34a', bg: '#dcfce7', icon: <CheckCircle className="w-4 h-4" /> },
  vendue:         { label: 'Vendue',   color: '#6b7280', bg: '#f3f4f6', icon: <Package className="w-4 h-4" /> },
};

interface Props {
  recolte: Recolte;
  cycle: CycleAgricole | undefined;
  onClose: () => void;
  onPublish: () => void | Promise<void>;
}

export function RecolteDetailModal({ recolte, cycle, onClose, onPublish }: Props) {
  const { commandes } = useProducteur();
  const { speak } = useApp();
  const [showEditModal, setShowEditModal] = useState(false);
  const recolteStatus = recolte.statut ?? recolte.status ?? '';

  const commandesLiees = commandes.filter(c => c.recolteId === recolte.id);
  const commandesEnCours = commandesLiees.filter(c => ['new', 'accepted', 'preparing'].includes(c.status));
  const commandesLivrees = commandesLiees.filter(c => c.status === 'delivered');

  const quality  = QUALITY_LABELS[recolte.qualite] || QUALITY_LABELS.B;
  const statut   = STATUS_LABELS[recolteStatus] || STATUS_LABELS.declaree;

  const quantite        = Number((recolte as any).quantite || recolte.quantiteReelle || 0);
  const prix            = Number(recolte.prixUnitaire || (recolte as any).prix_unitaire || 0);
  const stockVendu      = Number((recolte as any).stockVendu || 0);
  const stockReserve    = Number((recolte as any).stockReserve || 0);
  const stockDispo      = Number((recolte as any).stockDisponible ?? quantite);
  const valeurStock     = stockDispo * prix;
  const valeurTotal     = quantite * prix;
  const revenuActuel    = stockVendu * prix;
  const pctVendu        = quantite > 0 ? (stockVendu / quantite) * 100 : 0;
  const pctReserve      = quantite > 0 ? (stockReserve / quantite) * 100 : 0;
  const pctDisponible   = quantite > 0 ? (stockDispo / quantite) * 100 : 100;
  const isLowStock      = stockDispo < quantite * 0.2;

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
      />

      <motion.div
        key="sheet"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
        className="fixed bottom-0 left-0 right-0 z-[210] bg-white rounded-t-3xl shadow-2xl overflow-hidden"
        style={{ maxHeight: '95dvh' }}
      >
        {/* Header avec image */}
        <div className="relative h-52 bg-gradient-to-br from-green-100 to-green-200 flex-shrink-0">
          {(recolte as any).photoUrl || (recolte as any).photo_url || cycle?.photoUrl ? (
            <img
              src={(recolte as any).photoUrl || (recolte as any).photo_url || cycle?.photoUrl || ''}
              alt={recolte.produit}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.warn('[RecolteDetailModal] image load failed');
                (e.currentTarget as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Sprout className="w-20 h-20 text-green-400" />
            </div>
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Bouton fermer */}
          <motion.button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center"
            whileTap={{ scale: 0.9 }}
          >
            <X className="w-5 h-5 text-white" strokeWidth={2.5} />
          </motion.button>

          {/* Badge statut */}
          <div
            className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-md"
            style={{ backgroundColor: statut.bg, color: statut.color }}
          >
            {statut.icon}
            {statut.label}
          </div>

          {/* Titre en bas de l'image */}
          <div className="absolute bottom-4 left-5 right-5">
            <h2 className="text-2xl font-black text-white mb-1">
              {recolte.produit || cycle?.culture || 'Récolte'}
            </h2>
            <div className="flex items-center gap-3">
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: quality.bg, color: quality.color }}
              >
                {quality.label}
              </span>
              {isLowStock && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-orange-500 text-white flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Stock bas
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Contenu scrollable */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(95dvh - 208px)' }}>
          <div className="px-5 pt-5 pb-28 space-y-5 max-w-md mx-auto">

            {/* ── Bloc prix ── */}
            <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-4 border-2 border-green-200">
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-0.5">Prix unitaire</p>
                <Montant value={prix} unit={(recolte as any).unite || 'kg'} size="xl" color={COLOR} />
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 font-semibold mb-0.5">Valeur totale estimée</p>
                <Montant value={valeurTotal} size="lg" color="#1f2937" />
              </div>
            </div>

            {/* ── Stocks visuels ── */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5" style={{ color: COLOR }} strokeWidth={2.5} />
                <p className="font-black text-gray-900">Répartition du stock</p>
              </div>

              {/* Barre empilée */}
              <div className="h-5 rounded-full overflow-hidden flex mb-3">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pctVendu}%` }}
                  transition={{ duration: 0.8, delay: 0.1 }}
                  className="bg-green-500 h-full"
                  title={`Vendu: ${pctVendu.toFixed(0)}%`}
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pctReserve}%` }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="bg-orange-400 h-full"
                  title={`Réservé: ${pctReserve.toFixed(0)}%`}
                />
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pctDisponible}%` }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="bg-blue-200 h-full"
                  title={`Disponible: ${pctDisponible.toFixed(0)}%`}
                />
              </div>

              {/* Légende */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Vendu',      value: stockVendu,   pct: pctVendu,      color: '#16a34a', bg: '#dcfce7' },
                  { label: 'Réservé',    value: stockReserve, pct: pctReserve,    color: '#d97706', bg: '#fef3c7' },
                  { label: 'Disponible', value: stockDispo,   pct: pctDisponible, color: '#3b82f6', bg: '#dbeafe' },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl p-3 text-center" style={{ backgroundColor: s.bg }}>
                    <p className="text-lg font-black" style={{ color: s.color }}>{(s.value || 0).toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-gray-600">kg {s.label}</p>
                    <p className="text-[10px] text-gray-500">{s.pct.toFixed(0)}%</p>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Revenus ── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Banknote className="w-4 h-4 text-green-600" strokeWidth={2.5} />
                  <p className="text-xs font-bold text-gray-600">Revenus encaissés</p>
                </div>
                <Montant value={revenuActuel} size="lg" color="#15803d" />
              </div>
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-4 h-4 text-blue-600" strokeWidth={2.5} />
                  <p className="text-xs font-bold text-gray-600">Valeur en stock</p>
                </div>
                <Montant value={valeurStock} size="lg" color="#1d4ed8" />
              </div>
            </div>

            {/* ── Infos générales ── */}
            <div className="bg-white rounded-2xl border-2 border-gray-200 p-4 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Layers className="w-5 h-5" style={{ color: COLOR }} strokeWidth={2.5} />
                <p className="font-black text-gray-900">Infos de la récolte</p>
              </div>

              {[
                { icon: <Package className="w-4 h-4 text-gray-400" />, label: 'Quantité totale récoltée', value: `${(quantite).toLocaleString()} ${(recolte as any).unite || 'kg'}` },
                { icon: <Star className="w-4 h-4 text-amber-400" />, label: 'Qualité', value: quality.label },
                { icon: <Tag className="w-4 h-4 text-gray-400" />, label: 'Prix unitaire', value: `${prix.toLocaleString('fr-FR')} FCFA/${(recolte as any).unite || 'kg'}` },
                { icon: <Calendar className="w-4 h-4 text-gray-400" />, label: 'Date de récolte', value: ((recolte as any).dateRecolte || (recolte as any).date_recolte ? new Date((recolte as any).dateRecolte || (recolte as any).date_recolte).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '') },
                ...(recolte.publishedAt ? [{ icon: <TrendingUp className="w-4 h-4 text-green-500" />, label: 'Publié le', value: (recolte.publishedAt ? new Date(recolte.publishedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '') }] : []),
                ...(cycle ? [
                  { icon: <MapPin className="w-4 h-4 text-gray-400" />, label: 'Superficie', value: `${cycle.surface} hectares` },
                  { icon: <Sprout className="w-4 h-4 text-green-500" />, label: 'Date de plantation', value: (cycle.datePlantation ? new Date(cycle.datePlantation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '') },
                ] : []),
              ].map((row, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2">
                    {row.icon}
                    <span className="text-sm text-gray-600">{row.label}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{row.value}</span>
                </div>
              ))}
            </div>

            {/* ── Commandes liées ── */}
            {commandesLiees.length > 0 && (
              <div className="bg-white rounded-2xl border-2 border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5" style={{ color: COLOR }} strokeWidth={2.5} />
                    <p className="font-black text-gray-900">Commandes</p>
                  </div>
                  <div className="flex gap-2">
                    {commandesEnCours.length > 0 && (
                      <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full">
                        {commandesEnCours.length} en cours
                      </span>
                    )}
                    {commandesLivrees.length > 0 && (
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2.5 py-1 rounded-full">
                        {commandesLivrees.length} livrées
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  {commandesLiees.slice(0, 4).map((cmd) => (
                    <motion.div
                      key={cmd.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{cmd.acheteur.nom}</p>
                        <p className="text-xs text-gray-500">{cmd.quantite} kg &bull; {(cmd.dateCommande ? new Date(cmd.dateCommande).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '') }</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-sm" style={{ color: COLOR }}>{(cmd.montant || 0).toLocaleString()} FCFA</p>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          cmd.status === 'delivered' ? 'bg-green-100 text-green-700' :
                          cmd.status === 'new'       ? 'bg-blue-100 text-blue-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          {cmd.status === 'delivered' ? 'Livré' :
                           cmd.status === 'new'       ? 'Nouveau' :
                           cmd.status === 'accepted'  ? 'Accepté' :
                           cmd.status === 'preparing' ? 'Préparation' : cmd.status}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* ── CTA bas ── */}
            <div className="flex gap-3 pt-2">
              <motion.button
                onClick={onClose}
                className="flex-1 py-4 rounded-2xl font-bold text-gray-700 bg-gray-100 border-2 border-gray-200 text-base"
                whileTap={{ scale: 0.97 }}
              >
                Fermer
              </motion.button>
              <motion.button
                onClick={() => { setShowEditModal(true); void speak('Modifier la récolte'); }}
                className="flex-1 py-4 rounded-2xl font-bold text-white shadow-lg text-base flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #C46210, #D97706)' }}
                whileTap={{ scale: 0.97 }}
                whileHover={{ scale: 1.02 }}
              >
                <Edit3 className="w-5 h-5" strokeWidth={2.5} />
                Modifier
              </motion.button>
              {(['declaree', 'validee', 'draft'].includes(recolteStatus)) && (
                <motion.button
                  onClick={async () => {
                    try {
                      await onPublish();
                      void speak('Publication sur le marché en cours');
                      onClose();
                    } catch (err: unknown) {
                      console.warn('[RecolteDetailModal] publish failed:', err instanceof Error ? err.message : err);
                      toast.error(err instanceof Error ? err.message : 'Erreur lors de la publication');
                    }
                  }}
                  className="flex-1 py-4 rounded-2xl font-bold text-white shadow-lg text-base flex items-center justify-center gap-2"
                  style={{ background: `linear-gradient(135deg, ${COLOR}, #3BA869)` }}
                  whileTap={{ scale: 0.97 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <TrendingUp className="w-5 h-5" strokeWidth={2.5} />
                  Publier
                </motion.button>
              )}
            </div>

          </div>
        </div>
      </motion.div>

      {/* Modal de modification */}
      <ModifierPublicationModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onSuccess={() => { setShowEditModal(false); onClose(); }}
        publication={{
          id: recolte.publicationId || recolte.id,
          produit: recolte.produit || recolte.culture || 'Produit',
          prix_unitaire: Number(recolte.prixUnitaire || recolte.prix_unitaire || prix || 0),
          quantite_disponible: Number(recolte.stockDisponible || recolte.quantiteDisponible || recolte.quantite_disponible || recolte.quantite || 0),
          description: recolte.description || '',
          localisation: recolte.localisation || recolte.village || '',
          photo_url: recolte.photoUrl || recolte.photo_url || recolte.photos?.[0] || null,
        }}
      />
    </AnimatePresence>
  );
}