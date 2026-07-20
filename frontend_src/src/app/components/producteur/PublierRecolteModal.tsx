import React, { useState } from 'react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { X, Package, DollarSign } from 'lucide-react';
import { useProducteur, type Recolte, type Cycle } from '../../contexts/ProducteurContext';
import { useApp } from '../../contexts/AppContext';

interface PublierRecolteModalProps {
  recolte: Recolte;
  cycle: Cycle;
  isOpen: boolean;
  onClose: () => void;
}

export function PublierRecolteModal({ recolte, cycle, isOpen, onClose }: PublierRecolteModalProps) {
  const { createPublication } = useProducteur();
  const { speak } = useApp();
  const stockMax = Number(recolte.stockDisponible ?? recolte.quantite ?? 0);

  // États MODIFIABLES
  const [quantite, setQuantite] = useState(stockMax);
  const [prixUnitaire, setPrixUnitaire] = useState(Number(recolte.prixUnitaire || 0));
  const [dureeJours, setDureeJours] = useState(7);
  const [localisation] = useState(recolte.parcelle || cycle?.parcelle || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePublier = async () => {
    if (quantite <= 0) {
      void speak('La quantité doit être supérieure à zéro');
      return;
    }
    if (quantite > stockMax) {
      void speak(`La quantité ne peut pas dépasser le stock disponible de ${stockMax}`);
      return;
    }

    if (prixUnitaire <= 0) {
      void speak('Prix invalide');
      return;
    }

    setIsSubmitting(true);
    void speak('Publication en cours...');

    try {
      await createPublication({
        recolte_id: recolte.id,
        produit: recolte.produit || cycle?.culture || 'Produit',
        culture: cycle?.culture || recolte.produit || 'Culture',
        quantite_disponible: quantite,
        quantite_initiale: quantite,
        unite: recolte.unite || 'kg',
        prix_unitaire: prixUnitaire,
        qualite: recolte.qualite || 'standard',
        localisation: localisation || '',
        photo_url: recolte.photoUrl || null,
        date_expiration: new Date(Date.now() + dureeJours * 86400000).toISOString().split('T')[0],
      });
      void speak('Récolte publiée avec succès !');
      onClose();
    } catch (e: unknown) {
      console.warn('[PublierRecolteModal] publication failed:', e instanceof Error ? e.message : e);
      void speak('Erreur lors de la publication');
      toast.error('Erreur lors de la publication');
    } finally {
      setIsSubmitting(false);
    }
  };

  const montantTotal = quantite * prixUnitaire;
  const unite = recolte.unite || 'kg';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
          />

          {/* Modal - CENTRÉ */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-white rounded-3xl shadow-2xl z-[210] overflow-hidden max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#2E8B57] to-[#3BA869] px-6 py-5 flex items-center justify-between sticky top-0 z-10">
              <div>
                <h2 className="text-xl font-black text-white">Publier sur le marché</h2>
                <p className="text-white/90 text-sm mt-1">{cycle.culture} - Grade {recolte.qualite}</p>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5 text-white" strokeWidth={2.5} />
              </button>
            </div>

            {/* Contenu */}
            <div className="p-6 space-y-5">
              {/* Stock disponible - INFO */}
              <div className="bg-green-50 rounded-2xl p-4 text-center border-2 border-green-200">
                <p className="text-sm text-gray-600 mb-1">Stock total disponible</p>
                <p className="text-3xl font-black text-green-700">
                  {stockMax} <span className="text-base">{unite}</span>
                </p>
              </div>

              {/* Quantité à publier - MODIFIABLE */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Quantité à publier ({unite})
                </label>
                <div className="relative">
                  <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    value={quantite}
                    onChange={(e) => setQuantite(Math.min(Number(e.target.value), stockMax))}
                    max={stockMax || 999999}
                    min={1}
                    className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 focus:border-green-500 focus:outline-none font-bold text-2xl text-gray-900 bg-white"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Tu peux publier de 1 à {stockMax} {unite}
                </p>
              </div>

              {/* Prix unitaire - MODIFIABLE */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Prix de vente (FCFA/{unite})
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    value={prixUnitaire}
                    onChange={(e) => setPrixUnitaire(Number(e.target.value))}
                    min={1}
                    className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none font-bold text-2xl text-gray-900 bg-white"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Prix initial : {recolte.prixUnitaire} FCFA/{unite}
                </p>
              </div>

              {/* Durée - 3 BOUTONS */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-3 text-center">
                  Durée de publication
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[3, 7, 14].map((jours) => (
                    <button
                      key={jours}
                      onClick={() => setDureeJours(jours)}
                      className={`py-3 rounded-xl font-bold transition-all ${
                        dureeJours === jours
                          ? 'text-white shadow-lg scale-105'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                      style={dureeJours === jours ? { backgroundColor: '#2E8B57' } : undefined}
                    >
                      {jours}j
                    </button>
                  ))}
                </div>
              </div>

              {/* Montant total - SANS COMMISSION */}
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl p-5 border-2 border-yellow-300">
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">Montant total si tout vendu</p>
                  <p className="text-4xl font-black text-green-600">
                    {(montantTotal || 0).toLocaleString()} <span className="text-lg">FCFA</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    {quantite} {unite} × {prixUnitaire} FCFA
                  </p>
                </div>
              </div>

              {/* Boutons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="flex-1 py-4 rounded-2xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handlePublier}
                  disabled={isSubmitting || quantite <= 0 || prixUnitaire <= 0}
                  className="flex-1 py-4 rounded-2xl font-bold text-white shadow-lg hover:shadow-xl disabled:opacity-50 transition-all"
                  style={{ backgroundColor: '#C66A2C' }}
                >
                  {isSubmitting ? 'Publication...' : 'Publier'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}