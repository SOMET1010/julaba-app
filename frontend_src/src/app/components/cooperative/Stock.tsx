import React, { useState, useEffect } from 'react';
import { useLangPref } from '../../hooks/useLangPref';
import { useVoiceCore } from '../../hooks/useVoiceCore';
import { motion, AnimatePresence } from 'motion/react';
import { UNITES_COURANTES } from '../../config/unites';
import { SelectWithAutre } from '../shared/SelectWithAutre';
import {
  Search,
  Package,
  Plus,
  X,
  Mic,
  MicOff,
  Send,
  Minus,
} from 'lucide-react';
import { SubPageLayout } from '../layout/SubPageLayout';
import { useToast } from '../../hooks/useToast';
import { NotificationButton } from '../marchand/NotificationButton';
import {
  fetchStockCommun,
  apporterStockCommun,
  distribuerStockCommun,
  fetchCooperativeMembres,
  type CooperativeStockItem,
} from '../../services/api/cooperatives-api';
import { useApp } from '../../contexts/AppContext';
import { useModalRegister } from '../../contexts/ModalContext';

import {
  IMG_PRODUIT_RIZ, IMG_PRODUIT_TOMATE, IMG_PRODUIT_OIGNON, IMG_PRODUIT_IGNAME,
  IMG_PRODUIT_PLANTAIN, IMG_PRODUIT_PIMENT, IMG_PRODUIT_GOMBO, IMG_PRODUIT_MAIS,
  IMG_PRODUIT_AUBERGINE, IMG_PRODUIT_MANIOC
} from '../../assets/images';

// Stock COMMUN de la coopérative (GET /cooperatives/stock) — pas le stock
// personnel de l'utilisateur (/stocks). Une ligne = le total courant réel
// d'un produit pour la coopérative, alimenté par les apports des membres et
// décrémenté par les distributions (jamais édité directement).
interface StockLigne {
  id: string;
  produit: string;
  categorie: string;
  quantite: number;
  unite: string;
}

interface MembreOption {
  id: string;
  nom: string;
}

const categories = [
  { id: 'tous', label: 'Tous' },
  { id: 'cereales', label: 'Céréales' },
  { id: 'legumes', label: 'Légumes' },
  { id: 'fruits', label: 'Fruits' },
  { id: 'tubercules', label: 'Tubercules' },
  { id: 'epices', label: 'Épices' },
];

const PRODUIT_IMAGES: Record<string, string> = {
  riz: IMG_PRODUIT_RIZ,
  tomate: IMG_PRODUIT_TOMATE,
  oignon: IMG_PRODUIT_OIGNON,
  igname: IMG_PRODUIT_IGNAME,
  plantain: IMG_PRODUIT_PLANTAIN,
  piment: IMG_PRODUIT_PIMENT,
  gombo: IMG_PRODUIT_GOMBO,
  mais: IMG_PRODUIT_MAIS,
  aubergine: IMG_PRODUIT_AUBERGINE,
  manioc: IMG_PRODUIT_MANIOC,
};

function imageForProduit(nom: string): string {
  const key = nom.trim().toLowerCase();
  return PRODUIT_IMAGES[key] || IMG_PRODUIT_RIZ;
}

function mapStockRow(s: CooperativeStockItem): StockLigne {
  return {
    id: s.id,
    produit: s.produit,
    categorie: s.categorie || 'autre',
    quantite: Number(s.quantite) || 0,
    unite: s.unite || 'kg',
  };
}

export function Stock() {
  const { showToast, ToastContainer } = useToast();
  const { speak } = useApp();

  const [stocks, setStocks] = useState<StockLigne[]>([]);
  const [membres, setMembres] = useState<MembreOption[]>([]);
  const [loading, setLoading] = useState(true);

  const reloadStocks = () =>
    fetchStockCommun()
      .then((d) => setStocks((d.stocks || []).map(mapStockRow)))
      .catch(() => setStocks([]));

  useEffect(() => {
    setLoading(true);
    Promise.all([
      reloadStocks(),
      fetchCooperativeMembres()
        .then((d) =>
          setMembres(
            (d.membres || []).map((m: any) => ({
              id: String(m.id || ''),
              nom: `${m.firstName || m.first_name || ''} ${m.lastName || m.last_name || ''}`.trim() || m.phone || 'Membre',
            })).filter((m: MembreOption) => m.id),
          ),
        )
        .catch(() => setMembres([])),
    ]).finally(() => setLoading(false));
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('tous');
  const [selectedStock, setSelectedStock] = useState<StockLigne | null>(null);
  const [showApportModal, setShowApportModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDistributionModal, setShowDistributionModal] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [submittingApport, setSubmittingApport] = useState(false);
  const [submittingDistribution, setSubmittingDistribution] = useState(false);

  useModalRegister(showApportModal || showDetailModal || showDistributionModal);

  // ── Apport de stock (formulaire produit / quantité / unité) ──
  const [apportForm, setApportForm] = useState({
    produit: '',
    quantite: 0,
    unite: 'kg',
    categorie: 'cereales',
  });

  // ── Distribution : produit + lignes {membre, quantité} ───────
  const [distProduit, setDistProduit] = useState('');
  const [distLignes, setDistLignes] = useState<{ membreId: string; quantite: number }[]>([
    { membreId: '', quantite: 0 },
  ]);

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

  const filteredStocks = stocks.filter((stock) => {
    const matchesCategory = selectedCategory === 'tous' || stock.categorie === selectedCategory;
    const matchesSearchTerm = stock.produit.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearchTerm;
  });

  const openApportModal = () => {
    setApportForm({ produit: '', quantite: 0, unite: 'kg', categorie: 'cereales' });
    setShowApportModal(true);
  };

  const submitApport = async () => {
    const produit = apportForm.produit.trim();
    if (!produit) {
      showToast('Indique le produit apporté', 'error');
      return;
    }
    if (!(apportForm.quantite > 0)) {
      showToast('Indique une quantité valide', 'error');
      return;
    }
    setSubmittingApport(true);
    try {
      await apporterStockCommun({
        produit,
        quantite: apportForm.quantite,
        unite: apportForm.unite,
        categorie: apportForm.categorie,
      });
      showToast(`${produit} ajouté au stock commun`, 'success');
      speak(`${produit} ajouté au stock commun.`);
      setShowApportModal(false);
      await reloadStocks();
    } catch (e: any) {
      showToast(e?.message || "L'apport n'a pas pu être enregistré. Réessaie.", 'error');
    } finally {
      setSubmittingApport(false);
    }
  };

  const openDistributionModal = (produit?: string) => {
    setDistProduit(produit || stocks[0]?.produit || '');
    setDistLignes([{ membreId: '', quantite: 0 }]);
    setShowDistributionModal(true);
  };

  const stockDisponible = stocks.find((s) => s.produit === distProduit)?.quantite ?? 0;
  const totalDemande = distLignes.reduce((sum, l) => sum + (Number(l.quantite) || 0), 0);

  const submitDistribution = async () => {
    if (!distProduit) {
      showToast('Choisis un produit à distribuer', 'error');
      return;
    }
    const lignesValides = distLignes.filter((l) => l.membreId && Number(l.quantite) > 0);
    if (!lignesValides.length) {
      showToast('Ajoute au moins un membre destinataire avec une quantité', 'error');
      return;
    }
    if (totalDemande > stockDisponible) {
      showToast(`Stock disponible insuffisant (${stockDisponible} restant)`, 'error');
      return;
    }
    setSubmittingDistribution(true);
    try {
      const res = await distribuerStockCommun({
        produit: distProduit,
        distributions: lignesValides.map((l) => ({ membreId: l.membreId, quantite: Number(l.quantite) })),
      });
      if (!res?.persisted) {
        showToast("La distribution n'a pas pu être enregistrée. Réessaie.", 'error');
        speak("La distribution n'a pas marché. Réessaie, s'il te plaît.");
        return;
      }
      showToast('Distribution enregistrée', 'success');
      speak('Distribution enregistrée avec succès.');
      setShowDistributionModal(false);
      await reloadStocks();
    } catch (e: any) {
      showToast(e?.message || "Impossible de planifier la distribution. Réessaie.", 'error');
    } finally {
      setSubmittingDistribution(false);
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
        </div>
      }
    >
      <div className="pb-32 lg:pb-8 max-w-2xl lg:max-w-7xl mx-auto min-h-screen bg-gradient-to-b from-blue-50 to-white">

        {/* Stat produits */}
        <motion.div
          className="bg-gradient-to-br from-blue-50 via-white to-blue-50 rounded-3xl p-4 shadow-md border-2 border-blue-200 mb-4 flex items-center justify-between"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        >
          <div>
            <p className="text-xs text-gray-600 font-semibold mb-1">Produits dans le stock commun</p>
            <p className="text-3xl font-bold text-blue-600">{stocks.length}</p>
          </div>
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
            <Package className="w-7 h-7 text-blue-600" strokeWidth={2.5} />
          </div>
        </motion.div>

        {/* Boutons d'action */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <motion.button
            onClick={openApportModal}
            className="py-4 px-3 rounded-2xl bg-white border-2 border-[#2072AF] text-[#2072AF] font-bold flex items-center justify-center gap-2 whitespace-nowrap"
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.02 }}
          >
            <Plus className="w-5 h-5 flex-shrink-0" strokeWidth={3} />
            Apporter du stock
          </motion.button>

          <motion.button
            onClick={() => openDistributionModal()}
            disabled={!stocks.length}
            className="py-4 rounded-2xl bg-[#2072AF] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.02 }}
          >
            <Send className="w-5 h-5" strokeWidth={3} />
            Distribuer
          </motion.button>
        </div>

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
              {isListening ? <MicOff className="w-5 h-5 text-[#2072AF]" /> : <Mic className="w-5 h-5 text-gray-400" />}
            </motion.button>
          </div>
        </motion.div>

        {/* Catégories */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap border-2 transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-[#2072AF] border-[#2072AF] text-white'
                  : 'bg-white border-gray-200 text-gray-600'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Liste du stock commun */}
        {!loading && filteredStocks.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-semibold">Le stock commun est vide pour l'instant</p>
            <p className="text-sm">Apporte le premier produit pour démarrer le pot commun.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {filteredStocks.map((stock, index) => (
            <motion.div
              key={stock.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => {
                setSelectedStock(stock);
                setShowDetailModal(true);
              }}
              className="bg-gradient-to-br from-blue-50 via-white to-blue-50 rounded-3xl overflow-hidden shadow-md border-2 border-gray-200 cursor-pointer"
              whileHover={{ scale: 1.02, y: -4, boxShadow: '0 10px 30px rgba(32, 114, 175, 0.15)' }}
              whileTap={{ scale: 0.97 }}
            >
              <div className="relative w-full h-32 overflow-hidden">
                <img src={imageForProduit(stock.produit)} alt={stock.produit} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-2 left-2 right-2">
                  <h3 className="font-bold text-white text-sm drop-shadow-lg">{stock.produit}</h3>
                </div>
              </div>

              <div className="p-3 space-y-1">
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl font-bold text-[#2072AF]">{stock.quantite}</span>
                  <span className="text-sm text-gray-500 font-semibold">{stock.unite}</span>
                </div>
                <p className="text-center text-xs text-gray-500 capitalize">{stock.categorie}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </SubPageLayout>

      {/* Modal Apporter du stock */}
      <AnimatePresence>
        {showApportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end px-4 pb-4"
            onClick={() => setShowApportModal(false)}
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
                <h2 className="text-xl font-bold">Apporter du stock</h2>
                <motion.button
                  onClick={() => setShowApportModal(false)}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
                  whileHover={{ rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600">
                  Ce produit rejoint le pot commun de la coopérative — visible et distribuable par tous les membres.
                </p>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Produit</label>
                  <input
                    type="text"
                    value={apportForm.produit}
                    onChange={(e) => setApportForm({ ...apportForm, produit: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#2072AF] focus:outline-none"
                    placeholder="Ex: Riz local"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Quantité</label>
                    <input
                      type="number"
                      min={0}
                      value={apportForm.quantite}
                      onChange={(e) => setApportForm({ ...apportForm, quantite: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#2072AF] focus:outline-none"
                    />
                  </div>
                  <SelectWithAutre
                    label="Unité"
                    value={apportForm.unite}
                    onChange={(v) => setApportForm({ ...apportForm, unite: v })}
                    options={UNITES_COURANTES}
                    primaryColor="#2072AF"
                    placeholder="Ex: caisse, panier..."
                  />
                </div>

                <SelectWithAutre
                  label="Catégorie"
                  value={apportForm.categorie}
                  onChange={(v) => setApportForm({ ...apportForm, categorie: v })}
                  options={categories.filter((c) => c.id !== 'tous').map((cat) => cat.id)}
                  primaryColor="#2072AF"
                  placeholder="Ex: épices, fleurs..."
                />

                <motion.button
                  onClick={submitApport}
                  disabled={submittingApport}
                  className="w-full py-4 rounded-2xl bg-[#2072AF] text-white font-bold disabled:opacity-60"
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                >
                  {submittingApport ? 'Enregistrement...' : 'Ajouter au stock commun'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Détail (lecture seule — le stock commun ne se modifie que via apport/distribution) */}
      <AnimatePresence>
        {showDetailModal && selectedStock && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end px-4 pb-4"
            onClick={() => setShowDetailModal(false)}
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
                <h2 className="text-xl font-bold">{selectedStock.produit}</h2>
                <motion.button
                  onClick={() => setShowDetailModal(false)}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
                  whileHover={{ rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="p-6 space-y-4">
                <div className="relative w-full h-56 bg-gray-100 rounded-2xl overflow-hidden">
                  <img src={imageForProduit(selectedStock.produit)} alt={selectedStock.produit} className="w-full h-full object-cover" />
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Quantité disponible (stock commun)</span>
                    <span className="font-bold text-lg text-[#2072AF]">
                      {selectedStock.quantite} {selectedStock.unite}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Catégorie</span>
                    <span className="font-bold text-gray-900 capitalize">{selectedStock.categorie}</span>
                  </div>
                </div>

                <motion.button
                  onClick={() => {
                    setShowDetailModal(false);
                    openDistributionModal(selectedStock.produit);
                  }}
                  className="w-full py-4 rounded-2xl bg-[#2072AF] text-white font-bold flex items-center justify-center gap-2"
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Send className="w-5 h-5" />
                  Distribuer ce produit
                </motion.button>
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
                  Distribution aux membres
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
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Produit à distribuer</label>
                  <select
                    value={distProduit}
                    onChange={(e) => setDistProduit(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#2072AF] focus:outline-none"
                  >
                    <option value="" disabled>Choisir un produit</option>
                    {stocks.map((s) => (
                      <option key={s.id} value={s.produit}>
                        {s.produit} ({s.quantite} {s.unite} disponible)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="bg-blue-50 rounded-2xl p-3 flex items-center justify-between text-sm">
                  <span className="text-gray-700">Disponible</span>
                  <span className="font-bold text-[#2072AF]">{stockDisponible}</span>
                </div>

                <div className="space-y-3">
                  {distLignes.map((ligne, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={ligne.membreId}
                        onChange={(e) => {
                          const next = [...distLignes];
                          next[idx] = { ...next[idx], membreId: e.target.value };
                          setDistLignes(next);
                        }}
                        className="flex-1 px-3 py-3 rounded-xl border-2 border-gray-200 focus:border-[#2072AF] focus:outline-none"
                      >
                        <option value="" disabled>Membre</option>
                        {membres.map((m) => (
                          <option key={m.id} value={m.id}>{m.nom}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={0}
                        value={ligne.quantite}
                        onChange={(e) => {
                          const next = [...distLignes];
                          next[idx] = { ...next[idx], quantite: parseFloat(e.target.value) || 0 };
                          setDistLignes(next);
                        }}
                        className="w-24 px-3 py-3 rounded-xl border-2 border-gray-200 focus:border-[#2072AF] focus:outline-none text-center"
                      />
                      <motion.button
                        onClick={() => setDistLignes(distLignes.filter((_, i) => i !== idx))}
                        className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border-2 border-red-200 flex-shrink-0"
                        whileTap={{ scale: 0.9 }}
                      >
                        <Minus className="w-4 h-4" />
                      </motion.button>
                    </div>
                  ))}

                  <motion.button
                    onClick={() => setDistLignes([...distLignes, { membreId: '', quantite: 0 }])}
                    className="w-full py-3 rounded-xl border-2 border-dashed border-gray-300 text-gray-600 font-semibold flex items-center justify-center gap-2"
                    whileTap={{ scale: 0.98 }}
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter un membre
                  </motion.button>
                </div>

                {totalDemande > stockDisponible && (
                  <p className="text-sm text-red-600 font-semibold text-center">
                    Total demandé ({totalDemande}) supérieur au stock disponible ({stockDisponible})
                  </p>
                )}

                <motion.button
                  onClick={submitDistribution}
                  disabled={submittingDistribution}
                  className="w-full py-4 rounded-2xl bg-[#2072AF] text-white font-bold disabled:opacity-60"
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                >
                  {submittingDistribution ? 'Enregistrement...' : 'Planifier la distribution'}
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
