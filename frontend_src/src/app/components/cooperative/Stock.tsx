import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLangPref } from '../../hooks/useLangPref';
import { useVoiceCore } from '../../hooks/useVoiceCore';
import { motion, AnimatePresence } from 'motion/react';
import { ImagePickerField } from '../shared/ImagePickerField';
import { SelectWithAutre } from '../shared/SelectWithAutre';
import {
  Search,
  Package,
  TrendingUp,
  AlertTriangle,
  Plus,
  Edit3,
  Trash2,
  Download,
  Upload,
  Filter,
  X,
  DollarSign,
  ChevronRight,
  Mic,
  MicOff,
  Calendar,
  User as UserIcon,
  Truck,
  Send,
  History,
  Minus,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { SubPageLayout } from '../layout/SubPageLayout';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../hooks/useToast';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { NotificationButton } from '../marchand/NotificationButton';
import { Montant } from '../shared/Montant';
import { fetchStocks, upsertStock, updateStock as apiUpdateStock, deleteStock as apiDeleteStock } from '../../../imports/stocks-api';
import { useApp } from '../../contexts/AppContext';
import { useModalRegister } from '../../contexts/ModalContext';
import { API_URL } from '../../utils/api';
import { apiRequest } from '../../../imports/api-client';

import {
  IMG_PRODUIT_RIZ, IMG_PRODUIT_TOMATE, IMG_PRODUIT_OIGNON, IMG_PRODUIT_IGNAME,
  IMG_PRODUIT_PLANTAIN, IMG_PRODUIT_PIMENT, IMG_PRODUIT_GOMBO, IMG_PRODUIT_MAIS,
  IMG_PRODUIT_AUBERGINE, IMG_PRODUIT_MANIOC
} from '../../assets/images';

interface Stock {
  id: string;
  name: string;
  image: string;
  quantity: number;
  unit: string;
  purchasePrice: number;
  salePrice: number;
  threshold: number;
  category: string;
  collectedFrom?: string;
  lastCollection?: string;
}

const categories = [
  { id: 'tous', label: 'Tous' },
  { id: 'cereales', label: 'Céréales' },
  { id: 'legumes', label: 'Légumes' },
  { id: 'fruits', label: 'Fruits' },
  { id: 'tubercules', label: 'Tubercules' },
  { id: 'epices', label: 'Épices' },
];

export function Stock() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { showToast, ToastContainer } = useToast();
  const { speak } = useApp();

  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);
  React.useEffect(() => {
    fetchStocks()
      .then(d => setStocks((d.stocks || []).map((s: any) => ({
        id: s.id,
        name: s.produit || s.nom || '',
        image: s.image || '',
        quantity: Number(s.quantite) || Number(s.stock) || 0,
        unit: s.unite || 'kg',
        purchasePrice: Number(s.prix_achat) || 0,
        salePrice: Number(s.prix_vente) || Number(s.prix) || 0,
        threshold: Number(s.seuil_alerte) || 10,
        category: s.categorie || 'cereales',
        collectedFrom: '',
        lastCollection: s.created_at ? new Date(s.created_at).toLocaleDateString('fr-FR') : '',
      }))))
      .catch(() => setStocks([]))
      .finally(() => setLoading(false));
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('tous');
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showDistributionModal, setShowDistributionModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'alerts' | 'value'>('all');
  const [isListening, setIsListening] = useState(false);

  // Sync ModalContext
  useModalRegister(showAddModal || showEditModal || showCollectionModal || showDistributionModal);

  const [newStock, setNewStock] = useState({
    name: '',
    quantity: 0,
    unit: 'kg',
    purchasePrice: 0,
    salePrice: 0,
    threshold: 10,
    category: 'cereales',
    collectedFrom: '',
  });

  // Reconnaissance vocale
  // STT via Groq Whisper
  const { lang: voiceLang } = useLangPref();
  const { startRecording: _groqStart_startVoiceCommand, stopRecording: _groqStop_startVoiceCommand } = useVoiceCore({
    onTranscript: (text) => { setSearchQuery(text); setIsListening(false); },
    context: { module: 'stock', lang: voiceLang },
    onError: () => setIsListening(false),
  });

  const startVoiceCommand = () => {
    if (isListening) { _groqStop_startVoiceCommand(); setIsListening(false); }
    else { setIsListening(true); _groqStart_startVoiceCommand(); }
  };

  // Filtrage et tri
  const filteredStocks = stocks
    .filter(stock => {
      const matchesCategory = selectedCategory === 'tous' || stock.category === selectedCategory;
      const matchesSearch = stock.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesActiveFilter = true;
      if (activeFilter === 'alerts') {
        matchesActiveFilter = stock.quantity < stock.threshold;
      }
      
      return matchesCategory && matchesSearch && matchesActiveFilter;
    });

  const lowStocks = stocks.filter(s => s.quantity < s.threshold);
  const totalValue = stocks.reduce((sum, s) => sum + (s.quantity * s.purchasePrice), 0);

  const addStock = async () => {
    try {
      await upsertStock({
        produit: newStock.name,
        quantite: newStock.quantity,
        unite: newStock.unit,
        prix_achat: newStock.purchasePrice,
        prix: newStock.salePrice,
        seuil_alerte: newStock.threshold,
        categorie: newStock.category,
        image: (newStock as any).image || null,
      } as any);
      showToast(`${newStock.name} ajouté au stock`, 'success');
      speak(`${newStock.name} collecté avec succès`);
      setShowAddModal(false);
      setNewStock({ name: '', quantity: 0, unit: 'kg', purchasePrice: 0, salePrice: 0, threshold: 10, category: 'cereales', collectedFrom: '' });
      const d = await fetchStocks();
      setStocks((d.stocks || []).map((s: any) => ({
        id: s.id, name: s.produit || s.nom || '', image: s.image || '',
        quantity: Number(s.quantite) || Number(s.stock) || 0, unit: s.unite || 'kg',
        purchasePrice: Number(s.prix_achat) || 0, salePrice: Number(s.prix_vente) || Number(s.prix) || 0,
        threshold: Number(s.seuil_alerte) || 10, category: s.categorie || 'cereales',
        collectedFrom: '', lastCollection: s.created_at ? new Date(s.created_at).toLocaleDateString('fr-FR') : '',
      })));
    } catch {
      showToast('Erreur lors de l\'ajout', 'error');
    }
  };

  const handleUpdateStock = async (id: string, quantity: number) => {
    try {
      await apiUpdateStock(id, { quantite: quantity } as any);
      setStocks(stocks.map(s => s.id === id ? { ...s, quantity } : s));
      setSelectedStock((prev) => (prev && prev.id === id ? { ...prev, quantity } : prev));
      showToast('Stock mis à jour', 'success');
    } catch {
      showToast('Erreur mise à jour', 'error');
    }
  };

  const handleDeleteStock = async (id: string) => {
    try {
      const stock = stocks.find(s => s.id === id);
      await apiDeleteStock(id);
      setStocks(stocks.filter(s => s.id !== id));
      showToast(`${stock?.name} supprimé du stock`, 'info');
      speak(`${stock?.name} supprimé du stock`);
      setShowEditModal(false);
    } catch {
      showToast('Erreur suppression', 'error');
    }
  };

  return (
    <>
    <SubPageLayout
      role="cooperateur"
      title="Stock commun"
      rightContent={
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <NotificationButton />
          <motion.button
            onClick={() => setShowCollectionModal(true)}
            className="w-11 h-11 rounded-full bg-white/90 backdrop-blur-sm shadow-sm flex items-center justify-center"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Filter className="w-5 h-5 text-gray-700" />
          </motion.button>
        </div>
      }
    >
      <div className="pb-32 lg:pb-8 max-w-2xl lg:max-w-7xl mx-auto min-h-screen bg-gradient-to-b from-blue-50 to-white">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <motion.button
            onClick={() => {
              setActiveFilter('all');
              showToast('📦 Affichage de tous les produits', 'info');
            }}
            className={`relative bg-gradient-to-br from-blue-50 via-white to-blue-50 rounded-3xl p-3 shadow-md overflow-hidden border-2 ${
              activeFilter === 'all' ? 'border-blue-500 ring-2 ring-blue-300' : 'border-blue-200'
            } text-left cursor-pointer`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            whileHover={{ scale: 1.05, y: -4, boxShadow: '0 10px 30px rgba(59, 130, 246, 0.15)' }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 font-semibold">Produits</p>
              <motion.div
                className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Package className="w-5 h-5 text-blue-600" strokeWidth={2.5} />
              </motion.div>
            </div>
            <motion.p
              className="text-3xl font-bold text-blue-600"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {stocks.length}
            </motion.p>
            {activeFilter === 'all' && (
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-500 rounded-full" />
            )}
          </motion.button>

          <motion.button
            onClick={() => {
              setActiveFilter('alerts');
              if (lowStocks.length === 0) {
                showToast('✅ Aucune alerte stock', 'success');
              } else {
                showToast(`⚠️ ${lowStocks.length} produit${lowStocks.length > 1 ? 's' : ''} en stock bas`, 'warning');
              }
            }}
            className={`relative bg-gradient-to-br from-orange-50 via-white to-orange-50 rounded-3xl p-3 shadow-md overflow-hidden border-2 ${
              activeFilter === 'alerts' ? 'border-orange-500 ring-2 ring-orange-300' : 'border-orange-300'
            } text-left cursor-pointer`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            whileHover={{ scale: 1.05, y: -4, boxShadow: '0 10px 30px rgba(249, 115, 22, 0.15)' }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 font-semibold">Alertes</p>
              <motion.div
                className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center"
                animate={lowStocks.length > 0 ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <AlertTriangle className="w-5 h-5 text-orange-600" strokeWidth={2.5} />
              </motion.div>
            </div>
            <motion.p
              className="text-3xl font-bold text-orange-600"
              animate={lowStocks.length > 0 ? { scale: [1, 1.1, 1] } : {}}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              {lowStocks.length}
            </motion.p>
            {activeFilter === 'alerts' && (
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-orange-500 rounded-full" />
            )}
          </motion.button>

          <motion.button
            onClick={() => {
              showToast(`💰 Valeur: ${(totalValue || 0).toLocaleString()} FCFA`, 'info');
            }}
            className={`relative bg-gradient-to-br from-green-50 via-white to-green-50 rounded-3xl p-3 shadow-md overflow-hidden border-2 border-green-200 text-left cursor-pointer`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            whileHover={{ scale: 1.05, y: -4, boxShadow: '0 10px 30px rgba(34, 197, 94, 0.15)' }}
            whileTap={{ scale: 0.95 }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 font-semibold">Valeur</p>
              <motion.div
                className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <TrendingUp className="w-5 h-5 text-green-600" strokeWidth={2.5} />
              </motion.div>
            </div>
            <motion.p
              className="text-base font-bold text-green-600 leading-tight"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              {(totalValue || 0).toLocaleString('fr-FR')} FCFA
            </motion.p>
          </motion.button>
        </div>

        {/* Boutons d'actions stratégiques */}
        <motion.div
          className="grid grid-cols-2 gap-3 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.button
            onClick={() => setShowCollectionModal(true)}
            className="flex items-center justify-center gap-2 px-3 py-3.5 rounded-2xl bg-white border-2 border-gray-200 hover:border-[#2072AF] transition-colors whitespace-nowrap"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Truck className="w-5 h-5 text-[#2072AF] flex-shrink-0" />
            <span className="font-semibold text-gray-700">Collectes</span>
          </motion.button>

          <motion.button
            onClick={() => setShowDistributionModal(true)}
            className="flex items-center justify-center gap-2 px-3 py-3.5 rounded-2xl bg-white border-2 border-gray-200 hover:border-[#2072AF] transition-colors whitespace-nowrap"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Send className="w-5 h-5 text-[#2072AF] flex-shrink-0" />
            <span className="font-semibold text-gray-700">Distribution</span>
          </motion.button>
        </motion.div>

        {/* Barre de recherche */}
        <motion.div
          className="mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border-2 border-gray-200 focus:border-[#2072AF] focus:outline-none"
            />
            <motion.button
              onClick={startVoiceCommand}
              className="absolute right-4 top-1/2 -translate-y-1/2"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isListening ? <MicOff className="w-5 h-5 text-[#2072AF]" /> : null}
            </motion.button>
          </div>
        </motion.div>

        {/* Boutons d'action */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <motion.button
            onClick={() => setShowAddModal(true)}
            className="py-4 px-3 rounded-2xl bg-white border-2 border-[#2072AF] text-[#2072AF] font-bold flex items-center justify-center gap-2 whitespace-nowrap"
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.02 }}
          >
            <Plus className="w-5 h-5 flex-shrink-0" strokeWidth={3} />
            Ajouter
          </motion.button>

          <motion.button
            onClick={() => setShowDistributionModal(true)}
            className="py-4 rounded-2xl bg-[#2072AF] text-white font-bold flex items-center justify-center gap-2"
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.02 }}
          >
            <Send className="w-5 h-5" strokeWidth={3} />
            Distribuer
          </motion.button>
        </div>

        {/* Liste des stocks */}
        <div className="grid grid-cols-2 gap-3">
          {filteredStocks.map((stock, index) => {
            const isLow = stock.quantity < stock.threshold;
            const margin = stock.salePrice - stock.purchasePrice;
            const marginPercent = (stock.purchasePrice > 0 ? ((margin / stock.purchasePrice) * 100) : 0).toFixed(0);

            return (
              <motion.div
                key={stock.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => {
                  setSelectedStock(stock);
                  setShowEditModal(true);
                }}
                className={`bg-gradient-to-br ${
                  isLow ? 'from-red-50 via-white to-red-50 border-red-300' : 'from-blue-50 via-white to-blue-50 border-gray-200'
                } rounded-3xl overflow-hidden shadow-md border-2 cursor-pointer`}
                whileHover={{ scale: 1.02, y: -4, boxShadow: '0 10px 30px rgba(32, 114, 175, 0.15)' }}
                whileTap={{ scale: 0.97 }}
              >
                <div className="relative w-full h-36 overflow-hidden">
                  <ImageWithFallback 
                    src={stock.image} 
                    alt={stock.name}
                    className="w-full h-full object-cover"
                  />
                  {isLow && (
                    <div className="absolute top-2 right-2">
                      <motion.span 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="inline-flex items-center gap-1 bg-red-500 text-white px-2 py-1 rounded-lg text-xs font-bold shadow-lg"
                      >
                        <AlertTriangle className="w-3 h-3" />
                        Bas
                      </motion.span>
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-lg font-bold shadow-lg">
                      +{marginPercent}%
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-2 left-2 right-2">
                    <h3 className="font-bold text-white text-sm drop-shadow-lg">{stock.name}</h3>
                  </div>
                </div>

                <div className="p-3 space-y-2">
                  <div className="flex items-baseline justify-center gap-1">
                    <span className={`text-3xl font-bold ${isLow ? 'text-red-600' : 'text-[#2072AF]'}`}>
                      {stock.quantity}
                    </span>
                    <span className="text-sm text-gray-500 font-semibold">{stock.unit}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 text-xs">
                    <div className="bg-red-50 rounded-lg p-1.5 text-center">
                      <p className="text-red-600 font-semibold mb-0.5">Achat</p>
                      <p className="font-bold text-gray-900 text-[10px] leading-tight">{(stock.purchasePrice || 0).toLocaleString('fr-FR')} <span className="text-[9px] opacity-60">FCFA</span></p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-1.5 text-center">
                      <p className="text-green-600 font-semibold mb-0.5">Vente</p>
                      <p className="font-bold text-gray-900 text-[10px] leading-tight">{(stock.salePrice || 0).toLocaleString('fr-FR')} <span className="text-[9px] opacity-60">FCFA</span></p>
                    </div>
                  </div>

                  <div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full ${isLow ? 'bg-red-500' : 'bg-blue-500'}`}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((stock.quantity / (stock.threshold * 2)) * 100, 100)}%` }}
                        transition={{ duration: 1, delay: index * 0.05 }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </SubPageLayout>

      {/* Modal Ajout Collecte */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end px-4 pb-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-h-[85vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
                <h2 className="text-xl font-bold">Nouvelle collecte</h2>
                <motion.button
                  onClick={() => setShowAddModal(false)}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
                  whileHover={{ rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="p-6 space-y-4">
                {/* Photo du produit collecté */}
                <ImagePickerField
                  label="Photo du produit"
                  value={(newStock as any).image?.startsWith('data:') || (newStock as any).image?.startsWith('http') ? (newStock as any).image : ''}
                  onChange={(url) => setNewStock({ ...newStock, image: url } as any)}
                  primaryColor="#2072AF"
                  shape="rect"
                  size={96}
                />

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Produit collecté</label>
                  <input
                    type="text"
                    value={newStock.name}
                    onChange={(e) => setNewStock({ ...newStock, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#2072AF] focus:outline-none"
                    placeholder="Ex: Riz local"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Collecté auprès de</label>
                  <input
                    type="text"
                    value={newStock.collectedFrom}
                    onChange={(e) => setNewStock({ ...newStock, collectedFrom: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#2072AF] focus:outline-none"
                    placeholder="Ex: Kouassi Jean"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Quantité</label>
                    <input
                      type="number"
                      value={newStock.quantity}
                      onChange={(e) => setNewStock({ ...newStock, quantity: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#2072AF] focus:outline-none"
                    />
                  </div>
                  <SelectWithAutre
                    label="Unité"
                    value={newStock.unit}
                    onChange={(v) => setNewStock({ ...newStock, unit: v })}
                    options={['kg', 'L', 'tas', 'régimes', 'sac', 'tonne', 'carton']}
                    primaryColor="#2072AF"
                    placeholder="Ex: caisse, panier..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Prix achat membre (FCFA)</label>
                    <input
                      type="number"
                      value={newStock.purchasePrice}
                      onChange={(e) => setNewStock({ ...newStock, purchasePrice: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#2072AF] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Prix revente (FCFA)</label>
                    <input
                      type="number"
                      value={newStock.salePrice}
                      onChange={(e) => setNewStock({ ...newStock, salePrice: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#2072AF] focus:outline-none"
                    />
                  </div>
                </div>

                <SelectWithAutre
                  label="Catégorie"
                  value={newStock.category}
                  onChange={(v) => setNewStock({ ...newStock, category: v })}
                  options={categories.filter((c) => c.id !== 'tous').map((cat) => cat.id)}
                  primaryColor="#2072AF"
                  placeholder="Ex: épices, fleurs..."
                />

                <motion.button
                  onClick={addStock}
                  className="w-full py-4 rounded-2xl bg-[#2072AF] text-white font-bold"
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                >
                  Enregistrer la collecte
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Edition */}
      <AnimatePresence>
        {showEditModal && selectedStock && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end px-4 pb-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-h-[85vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
                <h2 className="text-xl font-bold">{selectedStock.name}</h2>
                <motion.button
                  onClick={() => setShowEditModal(false)}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
                  whileHover={{ rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="p-6 space-y-4">
                <div className="relative w-full h-64 bg-gray-100 rounded-2xl overflow-hidden">
                  <ImageWithFallback
                    src={selectedStock.image}
                    alt={selectedStock.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Quantité actuelle</label>
                  <div className="flex items-center gap-3">
                    <motion.button
                      onClick={() => handleUpdateStock(selectedStock.id, Math.max(0, selectedStock.quantity - 10))}
                      className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border-2 border-red-200"
                      whileTap={{ scale: 0.9 }}
                    >
                      <Minus className="w-5 h-5" />
                    </motion.button>
                    <input
                      type="number"
                      value={selectedStock.quantity}
                      onChange={(e) => setSelectedStock({ ...selectedStock, quantity: parseInt(e.target.value, 10) || 0 })}
                      onBlur={() => handleUpdateStock(selectedStock.id, selectedStock.quantity)}
                      className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#2072AF] focus:outline-none text-center text-2xl font-bold"
                    />
                    <span className="text-gray-500 font-semibold">{selectedStock.unit}</span>
                    <motion.button
                      onClick={() => handleUpdateStock(selectedStock.id, selectedStock.quantity + 10)}
                      className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center border-2 border-green-200"
                      whileTap={{ scale: 0.9 }}
                    >
                      <Plus className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  {selectedStock.collectedFrom && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Collecté auprès de</span>
                      <span className="font-bold text-gray-900">{selectedStock.collectedFrom}</span>
                    </div>
                  )}
                  {selectedStock.lastCollection && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Dernière collecte</span>
                      <span className="font-bold text-gray-900">{selectedStock.lastCollection}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Prix achat membre</span>
                    <span className="font-bold text-gray-900">
                      <Montant value={selectedStock.purchasePrice} unit={selectedStock.unit} size="sm" color="#1f2937" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Prix de revente</span>
                    <span className="font-bold text-green-600">
                      <Montant value={selectedStock.salePrice} unit={selectedStock.unit} size="sm" color="#16a34a" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Marge unitaire</span>
                    <span className="font-bold text-[#2072AF]">
                      {(selectedStock.salePrice - selectedStock.purchasePrice).toLocaleString()}{' '}
                      <span className="text-[10px] opacity-60">FCFA</span>
                      <span className="text-xs ml-1">
                        (+
                        {(
                          selectedStock.purchasePrice > 0
                            ? ((selectedStock.salePrice - selectedStock.purchasePrice) / selectedStock.purchasePrice * 100)
                            : 0
                        ).toFixed(0)}
                        %)
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Valeur totale</span>
                    <span className="font-bold text-lg text-[#2072AF]">
                      {(selectedStock.quantity * selectedStock.salePrice).toLocaleString()}{' '}
                      <span className="text-xs opacity-60">FCFA</span>
                    </span>
                  </div>
                </div>

                <motion.button
                  onClick={() => handleDeleteStock(selectedStock.id)}
                  className="w-full py-4 rounded-2xl bg-red-50 text-red-600 font-bold flex items-center justify-center gap-2 border-2 border-red-200"
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Trash2 className="w-5 h-5" />
                  Supprimer du stock
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Historique Collectes */}
      <AnimatePresence>
        {showCollectionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end px-4 pb-4"
            onClick={() => setShowCollectionModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-h-[85vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <History className="w-6 h-6 text-[#2072AF]" />
                  Historique des collectes
                </h2>
                <motion.button
                  onClick={() => setShowCollectionModal(false)}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
                  whileHover={{ rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="p-6 space-y-3">
                {stocks
                  .filter((s) => s.collectedFrom)
                  .map((stock, index) => (
                    <motion.div
                      key={stock.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="bg-blue-50 rounded-2xl p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-gray-900">{stock.name}</h3>
                        <span className="text-sm text-gray-600">{stock.lastCollection}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">👨🏾‍🌾 {stock.collectedFrom}</span>
                        <span className="font-bold text-[#2072AF]">
                          {stock.quantity} {stock.unit}
                        </span>
                      </div>
                    </motion.div>
                  ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Distribution */}
      <AnimatePresence>
        {showDistributionModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end px-4 pb-4"
            onClick={() => setShowDistributionModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-h-[85vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Send className="w-6 h-6 text-[#2072AF]" />
                  Redistribution aux membres
                </h2>
                <motion.button
                  onClick={() => setShowDistributionModal(false)}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
                  whileHover={{ rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-blue-50 rounded-2xl p-4">
                  <p className="text-sm text-gray-700">
                    Sélectionnez les produits et les membres pour organiser une distribution.
                  </p>
                </div>

                <motion.button
                  onClick={async () => {
                    try {
                      await apiRequest(API_URL, '/cooperatives/distribution', {
                        method: 'POST',
                        body: JSON.stringify({ stockId: selectedStock?.id, quantite: distributionQty }),
                      });
                      showToast('Distribution planifiée avec succès', 'success');
                      setShowDistributionModal(false);
                    } catch {
                      showToast('Impossible de planifier la distribution. Réessaie.', 'error');
                    }
                  }}
                  className="w-full py-4 rounded-2xl bg-[#2072AF] text-white font-bold"
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                >
                  Planifier la distribution
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ToastContainer />
    </>
  );
}