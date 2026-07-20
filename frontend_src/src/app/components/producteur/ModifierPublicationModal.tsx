import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Edit3, Upload, DollarSign, Package } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { API_URL } from '../../utils/api';
import { apiRequest } from '../../../imports/api-client';
import { toast } from 'sonner';

interface ModifierPublicationModalProps {
  publication: any;
  cycle?: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function ModifierPublicationModal({ publication, cycle, isOpen, onClose, onSuccess }: ModifierPublicationModalProps) {
  const { speak } = useApp();

  const [prixUnitaire, setPrixUnitaire]       = useState<number>(Number(publication?.prix_unitaire || publication?.prixUnitaire || 0));
  const [quantite, setQuantite]               = useState<number>(Number(publication?.quantite_disponible || publication?.stockDisponible || 0));
  const [description, setDescription]         = useState<string>(publication?.description || '');
  const [localisation, setLocalisation]       = useState<string>(publication?.localisation || publication?.village || '');
  const [imagePreview, setImagePreview]       = useState<string | null>(publication?.photo_url || publication?.image || null);
  const [isSubmitting, setIsSubmitting]       = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = async () => {
      let data = reader.result as string;
      // Compresser si > 500KB
      if (data.length > 500000) {
        const img = new Image();
        img.src = data;
        await new Promise(r => { img.onload = r; });
        const canvas = document.createElement('canvas');
        const MAX = 800;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        data = canvas.toDataURL('image/jpeg', 0.7);
      }
      setImagePreview(data);
    };
    reader.onerror = () => {
      console.warn('[ModifierPublicationModal] FileReader error');
      toast.error('Impossible de lire l\'image');
    };
    reader.readAsDataURL(file);
  };

  const handleModifier = async () => {
    if (prixUnitaire <= 0) { await speak('Prix invalide'); return; }
    if (quantite <= 0)     { await speak('Quantité invalide'); return; }

    setIsSubmitting(true);
    await speak('Modification en cours...');

    try {
      const pubId = publication?.id;
      if (!pubId) throw new Error('ID publication manquant');

      await apiRequest(API_URL, `/publications/${pubId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          prix_unitaire: prixUnitaire,
          quantite_disponible: quantite,
          description,
          localisation,
          photo_url: imagePreview || null,
        }),
      });

      await speak('Publication modifiée avec succès !');
      onSuccess?.();
      onClose();
    } catch (e: any) {
      console.warn('[ModifierPublicationModal] handleModifier failed:', e?.message);
      toast.error('Erreur lors de la modification');
      void speak('Erreur lors de la modification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const produitNom = publication?.produit || cycle?.culture || 'Produit';

  const handleDeletePublication = async () => {
    if (!publication?.id) return;
    try {
      await apiRequest(API_URL, `/publications/${publication.id}`, { method: 'DELETE' });
      toast.success('Publication supprimée');
      setShowConfirmDelete(false);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur lors de la suppression';
      console.warn('[ModifierPublicationModal] handleDeletePublication failed:', message);
      toast.error(message);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md bg-white rounded-3xl shadow-2xl z-[210] overflow-hidden"
            style={{ maxHeight: '90vh' }}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#C66A2C] to-[#D97706] px-6 py-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5" />
                  Modifier la publication
                </h2>
                <p className="text-white/90 text-sm mt-1">{produitNom}</p>
              </div>
              <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors">
                <X className="w-5 h-5 text-white" strokeWidth={2.5} />
              </button>
            </div>

            {/* Contenu scrollable */}
            <div className="overflow-y-auto p-5 space-y-4" style={{ maxHeight: 'calc(90vh - 100px)' }}>

              {/* Photo */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Photo du produit</label>
                <div className="border-2 border-dashed border-gray-300 rounded-2xl overflow-hidden cursor-pointer hover:border-orange-400 transition-colors">
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="photo-modifier" />
                  <label htmlFor="photo-modifier" className="cursor-pointer block">
                    {imagePreview ? (
                      <div className="relative">
                        <img src={imagePreview} alt="Aperçu" className="w-full h-40 object-cover" />
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <p className="text-white font-bold text-sm">Changer la photo</p>
                        </div>
                      </div>
                    ) : (
                      <div className="h-32 flex flex-col items-center justify-center gap-2">
                        <Upload className="w-8 h-8 text-gray-400" />
                        <p className="text-sm text-gray-500">Ajouter une photo</p>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* Prix */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Prix unitaire (FCFA)</label>
                <div className="relative">
                  <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number" value={prixUnitaire} min={1}
                    onChange={(e) => setPrixUnitaire(Number(e.target.value))}
                    className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none font-bold text-xl text-gray-900"
                  />
                </div>
              </div>

              {/* Quantité */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Quantité disponible (kg)</label>
                <div className="relative">
                  <Package className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number" value={quantite} min={1}
                    onChange={(e) => setQuantite(Number(e.target.value))}
                    className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none font-bold text-xl text-gray-900"
                  />
                </div>
              </div>

              {/* Localisation */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Localisation</label>
                <input
                  type="text" value={localisation}
                  onChange={(e) => setLocalisation(e.target.value)}
                  placeholder="Ex: Abidjan, Bouaké..."
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none font-medium text-gray-900"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Qualité, conditions..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-500 focus:outline-none font-medium text-gray-900 resize-none"
                />
              </div>

              {/* Montant total */}
              {prixUnitaire > 0 && quantite > 0 && (
                <div className="bg-orange-50 rounded-2xl p-4 border-2 border-orange-200 text-center">
                  <p className="text-sm text-gray-600 mb-1">Montant total estimé</p>
                  <p className="text-3xl font-black text-green-600">
                    {(prixUnitaire * quantite).toLocaleString()} <span className="text-base">FCFA</span>
                  </p>
                </div>
              )}

              {/* Retirer du marché */}
              <motion.button
                onClick={() => setShowConfirmDelete(true)}
                disabled={isSubmitting}
                className="w-full py-3 rounded-2xl font-bold text-red-600 border-2 border-red-200 bg-red-50 hover:bg-red-100 disabled:opacity-50 transition-colors"
                whileTap={{ scale: 0.97 }}
              >
                Retirer du marché définitivement
              </motion.button>

              <AnimatePresence>
                {showConfirmDelete && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="rounded-2xl border-2 border-red-200 bg-red-50 p-4"
                  >
                    <p className="text-sm font-bold text-red-700 mb-1">Confirmer la suppression</p>
                    <p className="text-xs text-red-600 mb-3">
                      Supprimer définitivement "{produitNom}" du marché ? Cette action est irréversible.
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowConfirmDelete(false)}
                        className="flex-1 py-2.5 rounded-xl font-bold text-gray-700 bg-white border border-gray-200 hover:bg-gray-50"
                      >
                        Annuler
                      </button>
                      <motion.button
                        type="button"
                        onClick={handleDeletePublication}
                        className="flex-1 py-2.5 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700"
                        whileTap={{ scale: 0.97 }}
                      >
                        Supprimer
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Boutons */}
              <div className="flex gap-3 pt-2 pb-2">
                <button onClick={onClose} disabled={isSubmitting}
                  className="flex-1 py-4 rounded-2xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors">
                  Annuler
                </button>
                <motion.button onClick={handleModifier} disabled={isSubmitting || prixUnitaire <= 0 || quantite <= 0}
                  className="flex-1 py-4 rounded-2xl font-bold text-white shadow-lg disabled:opacity-50 transition-all"
                  style={{ backgroundColor: '#C66A2C' }}
                  whileTap={{ scale: 0.97 }}>
                  {isSubmitting ? 'Modification...' : 'Sauvegarder'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}