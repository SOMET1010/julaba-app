import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { MapPin, Calendar, Package, DollarSign, Image as ImageIcon, Upload } from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { API_URL } from '../../utils/api';
import { apiRequest } from '../../../imports/api-client';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { SubPageLayout } from '../layout/SubPageLayout';

const PRODUITS = [
  { id: 'tomate', name: 'Tomates', icon: '🍅' },
  { id: 'oignon', name: 'Oignons', icon: '🧅' },
  { id: 'aubergine', name: 'Aubergines', icon: '🍆' },
  { id: 'gombo', name: 'Gombo', icon: '🌿' },
  { id: 'piment', name: 'Piment', icon: '🌶️' },
  { id: 'banane-plantain', name: 'Banane plantain', icon: '🍌' },
  { id: 'manioc', name: 'Manioc', icon: '🥔' },
  { id: 'igname', name: 'Igname', icon: '🍠' },
  { id: 'mais', name: 'Maïs', icon: '🌽' },
  { id: 'riz', name: 'Riz', icon: '🌾' },
  { id: 'ananas', name: 'Ananas', icon: '🍍' },
  { id: 'autre', name: 'Autre', icon: '🌱' },
];

const UNITES = [
  { id: 'kg', name: 'Kilogramme (kg)' },
  { id: 'tonne', name: 'Tonne' },
  { id: 'sac', name: 'Sac' },
  { id: 'tas', name: 'Tas' },
];

export function PublierRecolte() {
  const navigate = useNavigate();
  const { user, speak } = useApp();
  
  const [formData, setFormData] = useState({
    produit: 'tomate',
    autreNom: '',
    quantite: '',
    unite: 'kg',
    prixUnitaire: '',
    stockDisponible: '',
    description: '',
    localisation: user?.commune || '',
    dateRecolte: new Date().toISOString().split('T')[0],
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.onerror = () => {
        console.warn('[PublierRecolte] FileReader error');
        toast.error('Impossible de lire l\'image');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.produit || !formData.quantite || !formData.prixUnitaire || !formData.stockDisponible) {
      await speak('Remplis tous les champs obligatoires');
      return;
    }
    if (Number(formData.stockDisponible) > Number(formData.quantite)) {
      await speak('Le stock disponible ne peut pas dépasser la quantité totale de la récolte');
      return;
    }

    if (formData.produit === 'autre' && !formData.autreNom) {
      await speak('Indique le nom du produit');
      return;
    }

    const produitName = formData.produit === 'autre'
      ? formData.autreNom
      : PRODUITS.find(p => p.id === formData.produit)?.name || formData.produit;

    try {
      // Compresser l'image si trop grande (> 500KB)
      let photoData = imagePreview;
      if (photoData && photoData.length > 500000) {
        const img = new Image();
        img.src = photoData;
        await new Promise(r => { img.onload = r; });
        const canvas = document.createElement('canvas');
        const MAX = 800;
        const ratio = Math.min(MAX/img.width, MAX/img.height, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        photoData = canvas.toDataURL('image/jpeg', 0.7);
      }
      const res = await apiRequest<any>(API_URL, '/publications', {
        method: 'POST',
        body: JSON.stringify({
          produit: produitName,
          culture: produitName,
          quantite_disponible: Number(formData.stockDisponible),
          unite: formData.unite,
          prix_unitaire: Number(formData.prixUnitaire),
          qualite: 'standard',
          localisation: formData.localisation,
          date_recolte: formData.dateRecolte,
          description: formData.description,
          photo_url: photoData || null,
        }),
      });

      await speak(`Récolte de ${produitName} publiée avec succès sur le marché virtuel`);
      toast.success('Publication créée ! Retrouve tes commandes dans l\'onglet Commandes.', {
        duration: 4000,
        action: {
          label: 'Voir commandes',
          onClick: () => navigate('/producteur/commandes'),
        },
      });
      navigate('/producteur/recoltes');
    } catch (e: any) {
      console.warn('[PublierRecolte] handleSubmit failed:', e?.message);
      toast.error('Erreur lors de la publication');
      void speak('Erreur lors de la publication, réessaie');
    }
  };

  const produitSelectionne = PRODUITS.find(p => p.id === formData.produit);
  const montantTotal = formData.quantite && formData.prixUnitaire 
    ? Number(formData.quantite) * Number(formData.prixUnitaire) 
    : 0;

  return (
    <SubPageLayout role="producteur" title="Publier une récolte" subtitle="Vends ta production sur le marché">
      <div className="max-w-md mx-auto pb-8">
        {/* Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 rounded-2xl mb-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Type de produit */}
              <div>
                <Label className="mb-3 block font-semibold text-gray-900">Type de produit</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PRODUITS.map((produit) => (
                    <button
                      key={produit.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, produit: produit.id })}
                      className={`p-3 rounded-xl border-2 transition-all ${
                        formData.produit === produit.id
                          ? 'border-[#2E8B57]'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      style={formData.produit === produit.id ? { backgroundColor: 'rgba(46, 139, 87, 0.06)' } : {}}
                    >
                      <span className="text-2xl block mb-1">{produit.icon}</span>
                      <span className="text-xs font-semibold text-gray-900 block leading-tight">
                        {produit.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Si "Autre" sélectionné */}
              {formData.produit === 'autre' && (
                <div>
                  <Label className="mb-2 block">Nom du produit</Label>
                  <Input
                    type="text"
                    value={formData.autreNom}
                    onChange={(e) => setFormData({ ...formData, autreNom: e.target.value })}
                    placeholder="Ex: Mangues, Papayes..."
                    className="rounded-xl"
                  />
                </div>
              )}

              {/* Quantité et Unité */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="mb-2 block">Quantité totale</Label>
                  <Input
                    type="number"
                    value={formData.quantite}
                    onChange={(e) => setFormData({ ...formData, quantite: e.target.value })}
                    placeholder="Ex: 1000"
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Unité</Label>
                  <select
                    value={formData.unite}
                    onChange={(e) => setFormData({ ...formData, unite: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {UNITES.map(unite => (
                      <option key={unite.id} value={unite.id}>{unite.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Prix unitaire */}
              <div>
                <Label className="mb-2 block">Prix unitaire (FCFA / {formData.unite})</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="number"
                    value={formData.prixUnitaire}
                    onChange={(e) => setFormData({ ...formData, prixUnitaire: e.target.value })}
                    placeholder="Ex: 750"
                    className="pl-10 rounded-xl"
                  />
                </div>
                {montantTotal > 0 && (
                  <p className="text-sm text-green-700 mt-2 font-semibold">
                    Montant total: {(montantTotal || 0).toLocaleString()} FCFA
                  </p>
                )}
              </div>

              {/* Stock disponible pour vente immédiate */}
              <div>
                <Label className="mb-2 block">Stock disponible pour vente ({formData.unite})</Label>
                <Input
                  type="number"
                  value={formData.stockDisponible}
                  onChange={(e) => setFormData({ ...formData, stockDisponible: e.target.value })}
                  placeholder="Ex: 500"
                  className="rounded-xl"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Quantité prête à être vendue immédiatement
                </p>
              </div>

              {/* Localisation */}
              <div>
                <Label className="mb-2 block">Localisation</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="text"
                    value={formData.localisation}
                    onChange={(e) => setFormData({ ...formData, localisation: e.target.value })}
                    placeholder="Ex: Korhogo, Bouaké..."
                    className="pl-10 rounded-xl"
                  />
                </div>
              </div>

              {/* Date de récolte */}
              <div>
                <Label className="mb-2 block">Date de récolte</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    type="date"
                    value={formData.dateRecolte}
                    onChange={(e) => setFormData({ ...formData, dateRecolte: e.target.value })}
                    className="pl-10 rounded-xl"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="mb-2 block">Description (optionnel)</Label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Qualité, conditions de stockage, informations supplémentaires..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  rows={3}
                />
              </div>

              {/* Upload Photo */}
              <div>
                <Label className="mb-2 block">Photo du produit (optionnel)</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-green-500 transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label htmlFor="photo-upload" className="cursor-pointer">
                    {imagePreview ? (
                      <div>
                        <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg mb-2" />
                        <p className="text-sm text-green-600 font-medium">Photo ajoutée</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-600">Clique pour ajouter une photo</p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-[#2E8B57] hover:bg-[#236B43] py-6 text-lg font-semibold rounded-xl"
              >
                <Package className="w-5 h-5 mr-2" />
                Publier sur le marché
              </Button>
            </form>
          </Card>
        </motion.div>
      </div>
    </SubPageLayout>
  );
}