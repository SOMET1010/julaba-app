import { useApp } from '../../contexts/AppContext';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SubPageLayout } from '../layout/SubPageLayout';
import { useVoiceCore } from '../../hooks/useVoiceCore';
import { motion, AnimatePresence } from 'motion/react';
import { Montant, MontantCard } from '../shared/Montant';
import { ImagePickerField } from '../shared/ImagePickerField';
import { SelectWithAutre } from '../shared/SelectWithAutre';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import {
  Package,
  TrendingUp,
  AlertCircle,
  Plus,
  Search,
  Trash2,
  X,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Filter,
  SortAsc,
  Mic,
  MicOff,
  Volume2,
  Edit3,
  Leaf,
  Sprout,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useUser } from '../../contexts/UserContext';
import { useToast } from '../../hooks/useToast';
import { stopChunkedSpeaking } from '../../services/elevenlabs';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { NotificationButton } from '../marchand/NotificationButton';
import { SearchBar } from '../shared/SearchBar';
import { matchesSearch } from '../../utils/searchUtils';
import { API_URL } from '../../utils/api';
import { apiRequest } from '../../../imports/api-client';
import { toast } from 'sonner';
import {
  IMG_PRODUIT_TOMATE, IMG_PRODUIT_AUBERGINE, IMG_PRODUIT_OIGNON,
  IMG_PRODUIT_PIMENT, IMG_PRODUIT_IGNAME, IMG_PRODUIT_PLANTAIN,
  IMG_PRODUIT_GOMBO, IMG_PRODUIT_MAIS, IMG_PRODUIT_MANIOC, IMG_PRODUIT_RIZ
} from '../../assets/images';

interface Stock {
  id: string;
  name: string;
  image: string;
  quantity: number;
  unit: string;
  productionCost: number;
  salePrice: number;
  threshold: number;
  category: string;
}

type PendingAction =
  | { type: 'add'; name: string; quantity: number }
  | { type: 'update'; stock: Stock; quantity: number }
  | null;

const categories = [
  { id: 'tous', label: 'Tous' },
  { id: 'cereales', label: 'Céréales' },
  { id: 'legumes', label: 'Légumes' },
  { id: 'fruits', label: 'Fruits' },
  { id: 'tubercules', label: 'Tubercules' },
  { id: 'epices', label: 'Épices' },
];

const sortOptions = [
  { id: 'name', label: 'Nom (A-Z)' },
  { id: 'quantity_asc', label: 'Quantité (croissant)' },
  { id: 'quantity_desc', label: 'Quantité (décroissant)' },
  { id: 'margin', label: 'Marge (élevée)' },
];


export function Stocks() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { showToast, ToastContainer } = useToast();

  const { speak } = useApp();
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        const d = await apiRequest<any>(API_URL, '/stocks', { method: 'GET' });
        if (!d) return;
        const raw = d.stocks || d.data || (Array.isArray(d) ? d : []);
        setStocks(raw.map((s: any): Stock => ({
          id: s.id,
          name: s.name ?? s.nom ?? s.produit ?? '',
          image: s.image ?? '',
          quantity: Number(s.quantity ?? s.quantite) || 0,
          unit: s.unit ?? s.unite ?? 'kg',
          productionCost: Number(s.productionCost ?? s.prix_achat) || 0,
          salePrice: Number(s.salePrice ?? s.prix_vente ?? s.prix) || 0,
          threshold: Number(s.threshold ?? s.seuil_alerte) || 10,
          category: s.category ?? s.categorie ?? 'General',
        })));
      } catch (e: any) {
        console.warn('[Stocks] fetch /stocks error:', e?.message);
        setStocks([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('tous');
  const [sortBy, setSortBy] = useState('name');
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [confirmDeleteStockId, setConfirmDeleteStockId] = useState<string | null>(null);
  const [showValueModal, setShowValueModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'alerts' | 'value'>('all');
  
  // Tata Nanti Lou
  const [isListening, setIsListening] = useState(false);
  const [tantieSpeaking, setTantieSpeaking] = useState(false);
  const [tantieMessage, setTantieMessage] = useState('');
  const [conversationState, setConversationState] = useState<'welcome' | 'waiting' | 'confirming' | 'idle'>('welcome');
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const hasWelcomed = useRef(false);

  // Formulaire ajout
  const [newStock, setNewStock] = useState({
    name: '',
    image: '📦',
    quantity: 0,
    unit: 'kg',
    productionCost: 0,
    salePrice: 0,
    threshold: 10,
    category: 'cereales',
  });

  // TTS - speak vient de useApp()

  // Fonction pour arrêter le TTS
  const stopSpeaking = () => {
    window.speechSynthesis?.cancel?.();
    stopChunkedSpeaking();
    setTantieSpeaking(false);
    setIsListening(false);
  };

  // Message de bienvenue
  useEffect(() => {
    if (!hasWelcomed.current && user) {
      hasWelcomed.current = true;
      setTimeout(() => {
        speak(`Bienvenue ${user.prenoms} dans ta gestion de production. Je peux t'aider à gérer tes récoltes. Que veux-tu faire ?`);
        setConversationState('waiting');
      }, 1000);
    }
  }, [user, speak]);

  // Trouver produit par nom
  const findStockByName = (text: string): Stock | null => {
    const keywords: Record<string, string[]> = {
      'riz': ['riz', 'ri'],
      'tomate': ['tomate', 'tomates'],
      'oignon': ['oignon', 'oignons'],
      'igname': ['igname', 'ignames'],
      'plantain': ['plantain', 'banane'],
      'piment': ['piment', 'piments'],
      'gombo': ['gombo', 'gombos'],
      'maïs': ['maïs', 'mais'],
      'aubergine': ['aubergine', 'aubergines'],
      'manioc': ['manioc'],
    };

    for (const [productKey, variants] of Object.entries(keywords)) {
      if (variants.some(variant => text.includes(variant))) {
        return stocks.find(s => s.name.toLowerCase().includes(productKey)) || null;
      }
    }
    return null;
  };

  // Extraire quantité
  const extractQuantity = (text: string): number => {
    const numberWords: Record<string, number> = {
      'un': 1, 'une': 1, 'deux': 2, 'trois': 3, 'quatre': 4, 'cinq': 5,
      'six': 6, 'sept': 7, 'huit': 8, 'neuf': 9, 'dix': 10,
      'vingt': 20, 'trente': 30, 'quarante': 40, 'cinquante': 50,
      'cent': 100, 'mille': 1000,
    };

    const numberMatch = text.match(/(\d+)/);
    if (numberMatch) return parseInt(numberMatch[1]);

    for (const [word, num] of Object.entries(numberWords)) {
      if (text.includes(word)) return num;
    }
    return 1;
  };

  // Traiter commande vocale
  const processVoiceCommand = (command: string) => {
    if (coreSpeaking) return;
    const lowerCommand = command.toLowerCase();

    // Réponse à la question d'aide
    if (conversationState === 'waiting') {
      if (lowerCommand.includes('aide') || lowerCommand.includes('aider')) {
        void speak('D\'accord ! Dis-moi ce que tu veux faire : ajouter une récolte, modifier une quantité, ou consulter ta production');
        setConversationState('idle');
        return;
      } else if (lowerCommand.includes('rien') || lowerCommand.includes('non')) {
        void speak('D\'accord ! Je reste là si tu as besoin');
        setConversationState('idle');
        return;
      }
    }

    // Confirmation d'action
    if (conversationState === 'confirming' && pendingAction) {
      if (lowerCommand.includes('oui') || lowerCommand.includes('confirme') || lowerCommand.includes('ok')) {
        if (pendingAction.type === 'add') {
          const { name, quantity } = pendingAction;
          const newId = (stocks.length + 1).toString();
          const newProduct: Stock = {
            id: newId,
            name: name,
            image: '📦',
            quantity: quantity,
            unit: 'kg',
            productionCost: 0,
            salePrice: 0,
            threshold: 10,
            category: 'cereales',
          };
          setStocks([...stocks, newProduct]);
          void speak(`Parfait ! ${quantity} kg de ${name} ajouté à ta production`);
          showToast(`✅ ${quantity} kg de ${name} ajouté`, 'success');
        } else if (pendingAction.type === 'update') {
          const { stock, quantity } = pendingAction;
          setStocks(stocks.map(s => s.id === stock.id ? { ...s, quantity: s.quantity + quantity } : s));
          void speak(`Production mise à jour ! ${stock.name} : ${stock.quantity + quantity} ${stock.unit}`);
          showToast(`✅ Production mise à jour : ${stock.name}`, 'success');
        }
        setPendingAction(null);
        setConversationState('idle');
        return;
      } else if (lowerCommand.includes('non') || lowerCommand.includes('annule')) {
        void speak('D\'accord, action annulée');
        setPendingAction(null);
        setConversationState('idle');
        return;
      }
    }

    // Consulter stock d'un produit
    if (lowerCommand.includes('combien') && (lowerCommand.includes('stock') || lowerCommand.includes('j\'ai') || lowerCommand.includes('jai'))) {
      const stock = findStockByName(lowerCommand);
      if (stock) {
        void speak(`Tu as ${stock.quantity} ${stock.unit} de ${stock.name} en stock`);
        return;
      } else {
        void speak('Je n\'ai pas trouvé ce produit dans ta production');
        return;
      }
    }

    // Valeur totale du stock
    if (lowerCommand.includes('valeur') && lowerCommand.includes('totale')) {
      const totalValue = stocks.reduce((sum, s) => sum + (s.quantity * s.productionCost), 0);
      void speak(`La valeur totale de ta production est de ${(totalValue || 0).toLocaleString()} francs CFA`);
      return;
    }

    // Nombre de produits
    if (lowerCommand.includes('combien') && lowerCommand.includes('produit')) {
      void speak(`Tu as ${stocks.length} produits différents en production`);
      return;
    }

    // Alertes stock bas
    if (lowerCommand.includes('alerte') || (lowerCommand.includes('stock') && lowerCommand.includes('bas'))) {
      const lowStocks = stocks.filter(s => s.quantity < s.threshold);
      if (lowStocks.length === 0) {
        void speak('Toute ta production est au-dessus du seuil. Tout va bien !');
      } else {
        void speak(`Tu as ${lowStocks.length} produits en stock bas : ${lowStocks.map(s => s.name).join(', ')}`);
      }
      return;
    }

    // Ajouter au stock
    if (lowerCommand.includes('ajoute') || lowerCommand.includes('veux ajouter')) {
      const stock = findStockByName(lowerCommand);
      const quantity = extractQuantity(lowerCommand);

      if (stock) {
        // Produit existe déjà, on augmente la quantité
        void speak(`Tu veux ajouter ${quantity} ${stock.unit} de ${stock.name} à ta production actuelle de ${stock.quantity} ${stock.unit}. Je confirme ?`);
        setPendingAction({ type: 'update', stock, quantity });
        setConversationState('confirming');
        return;
      } else {
        // Nouveau produit (extraction du nom)
        const words = lowerCommand.split(' ');
        const productName = words[words.length - 1];
        void speak(`Tu veux ajouter ${quantity} kg de ${productName} à ta production. Je confirme ?`);
        setPendingAction({ type: 'add', name: productName, quantity });
        setConversationState('confirming');
        return;
      }
    }

    // Filtrer par catégorie
    if (lowerCommand.includes('montre') || lowerCommand.includes('affiche')) {
      if (lowerCommand.includes('légume')) {
        setSelectedCategory('legumes');
        void speak('Voici tes légumes en production');
        return;
      } else if (lowerCommand.includes('fruit')) {
        setSelectedCategory('fruits');
        void speak('Voici tes fruits en production');
        return;
      } else if (lowerCommand.includes('céréale') || lowerCommand.includes('cereale')) {
        setSelectedCategory('cereales');
        void speak('Voici tes céréales en production');
        return;
      } else if (lowerCommand.includes('tubercule')) {
        setSelectedCategory('tubercules');
        void speak('Voici tes tubercules en production');
        return;
      } else if (lowerCommand.includes('tout')) {
        setSelectedCategory('tous');
        void speak('Voici tous tes produits en production');
        return;
      }
    }

    // Recherche générale
    const stock = findStockByName(lowerCommand);
    if (stock) {
      setSearchQuery(stock.name);
      void speak(`Voici ${stock.name}`);
      return;
    }

    void speak('Je n\'ai pas compris. Demande-moi d\'ajouter une récolte, de consulter ta production, ou de filtrer par catégorie');
  };

  // STT via Groq Whisper
  const { startRecording: _groqStartVoice, stopRecording: _groqStopVoice, isSpeaking: coreSpeaking } = useVoiceCore({
    onTranscript: (text) => { processVoiceCommand(text); setIsListening(false); },
    onError: () => setIsListening(false),
  });

  const startVoiceCommand = () => {
    if (isListening) { _groqStopVoice(); setIsListening(false); }
    else { setIsListening(true); _groqStartVoice(); }
  };

  // Filtrage et tri
  const filteredStocks = stocks
    .filter(stock => {
      const matchesCategory = selectedCategory === 'tous' || stock.category === selectedCategory;
      const matchesSearchQuery = matchesSearch(searchQuery, stock.name);
      
      // Appliquer le filtre actif des KPIs
      let matchesActiveFilter = true;
      if (activeFilter === 'alerts') {
        matchesActiveFilter = stock.quantity < stock.threshold;
      } else if (activeFilter === 'value') {
        matchesActiveFilter = true;
      }
      
      return matchesCategory && matchesSearchQuery && matchesActiveFilter;
    })
    .sort((a, b) => {
      // Si le filtre "value" est actif, trier par valeur totale
      if (activeFilter === 'value') {
        const valueA = a.quantity * a.salePrice;
        const valueB = b.quantity * b.salePrice;
        return valueB - valueA; // Décroissant
      }
      
      // Sinon, utiliser le tri sélectionné
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'quantity_asc':
          return a.quantity - b.quantity;
        case 'quantity_desc':
          return b.quantity - a.quantity;
        case 'margin':
          const marginA = a.salePrice - a.productionCost;
          const marginB = b.salePrice - b.productionCost;
          return marginB - marginA;
        default:
          return 0;
      }
    });

  const lowStocks = stocks.filter(s => s.quantity < s.threshold);
  const totalValue = stocks.reduce((sum, s) => sum + (s.quantity * s.productionCost), 0);

  const addStock = async () => {
    const name = newStock.name;
    const quantity = newStock.quantity;
    const salePrice = newStock.salePrice;
    if (!name.trim()) {
      toast.error('Le nom du produit est requis');
      return;
    }
    if (quantity <= 0) {
      toast.error('La quantité doit être supérieure à zéro');
      return;
    }
    if (salePrice <= 0) {
      toast.error('Le prix de vente doit être supérieur à zéro');
      return;
    }
    try {
      const res = await apiRequest<any>(API_URL, '/stocks', {
        method: 'POST',
        body: JSON.stringify({
          nom: newStock.name,
          quantite: newStock.quantity,
          unite: newStock.unit,
          prix_achat: newStock.productionCost,
          prix_vente: newStock.salePrice,
          seuil_alerte: newStock.threshold,
          categorie: newStock.category,
          image: newStock.image || null,
        }),
      });
      const created = res;
      const newProduct: Stock = {
        id: created.id,
        name: created.produit || newStock.name,
        image: created.image || newStock.image,
        quantity: Number(created.quantite) || newStock.quantity,
        unit: created.unite || newStock.unit,
        productionCost: Number(created.prix_achat) || newStock.productionCost,
        salePrice: Number(created.prix_vente) || newStock.salePrice,
        threshold: Number(created.seuil_alerte) || newStock.threshold,
        category: created.categorie || newStock.category,
      };
      setStocks(prev => [...prev, newProduct]);
      showToast(`✅ ${newStock.name} ajouté à ta production`, 'success');
      speak(`${newStock.name} ajouté avec succès`);
      setShowAddModal(false);
      setNewStock({ name: '', image: '', quantity: 0, unit: 'kg', productionCost: 0, salePrice: 0, threshold: 10, category: 'cereales' });
    } catch (e: any) {
      console.warn('[Stocks] addStock failed:', e?.message);
      showToast('Erreur lors de l\'ajout du stock', 'error');
    }
  };

  const updateStock = async (id: string, quantity: number) => {
    try {
      await apiRequest(API_URL, `/stocks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ quantite: quantity }),
      });
      setStocks(prev => prev.map(s => s.id === id ? { ...s, quantity } : s));
      showToast('✅ Production mise à jour', 'success');
    } catch (e: any) {
      console.warn('[Stocks] updateStock failed:', e?.message);
      showToast('Erreur lors de la mise à jour', 'error');
    }
  };

  const deleteStock = async (id: string) => {
    const stock = stocks.find(s => s.id === id);
    try {
      await apiRequest(API_URL, `/stocks/${id}`, { method: 'DELETE' });
      setStocks(prev => prev.filter(s => s.id !== id));
      showToast(`🗑️ ${stock?.name} supprimé de la production`, 'info');
      speak(`${stock?.name} supprimé de la production`);
      setShowEditModal(false);
    } catch (e: any) {
      console.warn('[Stocks] deleteStock failed:', e?.message);
      showToast('Erreur lors de la suppression', 'error');
    }
  };

  const valeurTotale = stocks.reduce((sum, s) => sum + (s.quantity * (s.productionCost || s.salePrice || 0)), 0);

  return (
    <>
    <SubPageLayout role="producteur" title="Mes stocks" rightContent={<NotificationButton />}>
      {/* Stats Cards - HARMONISÉES avec le Dashboard */}
      <KPIGrid cols={3}>
        <UniversalKPI
          label="Produits"
          animatedTarget={stocks.length}
          icon={Package}
          color="#3B82F6"
          iconAnimation="spin"
          active={activeFilter === 'all'}
          onClick={() => {
            setActiveFilter('all');
            showToast('Affichage de tous les produits', 'info');
          }}
          delay={0.05}
        />
        <UniversalKPI
          label="Alertes"
          animatedTarget={lowStocks.length}
          icon={AlertCircle}
          color="#F97316"
          iconAnimation={lowStocks.length > 0 ? 'pulse' : 'none'}
          active={activeFilter === 'alerts'}
          onClick={() => {
            setActiveFilter('alerts');
            if (lowStocks.length === 0) {
              showToast('Aucune alerte stock', 'success');
            } else {
              showToast(`${lowStocks.length} produit${lowStocks.length > 1 ? 's' : ''} en stock bas`, 'warning');
            }
          }}
          delay={0.1}
        />
        <UniversalKPI
          label="Valeur"
          value={`${(totalValue || 0).toLocaleString('fr-FR')}`}
          suffix="FCFA"
          icon={TrendingUp}
          color="#22C55E"
          iconAnimation="float"
          active={showValueModal}
          onClick={() => setShowValueModal(true)}
          delay={0.15}
        />
      </KPIGrid>

      {/* Boutons d'actions stratégiques */}
      <motion.div
        className="grid grid-cols-2 gap-3 mb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <motion.button
          onClick={() => navigate('/producteur/declarer-recolte')}
          className="flex items-center justify-center gap-2 px-3 py-3.5 rounded-2xl bg-white border-2 border-gray-200 hover:border-[#2E8B57] transition-colors whitespace-nowrap"
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <Sprout className="w-5 h-5 text-[#2E8B57] flex-shrink-0" />
          <span className="font-semibold text-gray-700">Déclarer</span>
        </motion.button>

        <motion.button
          onClick={() => navigate('/producteur/revenus')}
          className="flex items-center justify-center gap-2 px-3 py-3.5 rounded-2xl bg-white border-2 border-gray-200 hover:border-[#2E8B57] transition-colors whitespace-nowrap"
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <TrendingUp className="w-5 h-5 text-[#2E8B57] flex-shrink-0" />
          <span className="font-semibold text-gray-700">Revenus</span>
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
            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white border-2 border-gray-200 focus:border-[#2E8B57] focus:outline-none"
          />
          <motion.button
            onClick={startVoiceCommand}
            className="absolute right-4 top-1/2 -translate-y-1/2"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {isListening ? <MicOff className="w-5 h-5 text-[#2E8B57]" /> : <Mic className="w-5 h-5 text-gray-400" />}
          </motion.button>
        </div>
      </motion.div>

      {/* Boutons d'action - Alignés horizontalement */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <motion.button
          onClick={() => setShowAddModal(true)}
          className="py-4 px-3 rounded-2xl bg-white border-2 border-[#2E8B57] text-[#2E8B57] font-bold flex items-center justify-center gap-2 whitespace-nowrap"
          whileTap={{ scale: 0.98 }}
          whileHover={{ scale: 1.02 }}
        >
          <Plus className="w-5 h-5 flex-shrink-0" strokeWidth={3} />
          Ajouter
        </motion.button>

        <motion.button
          onClick={() => navigate('/producteur/declarer-recolte')}
          className="py-4 px-3 rounded-2xl bg-[#2E8B57] text-white font-bold flex items-center justify-center gap-2 whitespace-nowrap"
          whileTap={{ scale: 0.98 }}
          whileHover={{ scale: 1.02 }}
        >
          <Leaf className="w-5 h-5 flex-shrink-0" strokeWidth={3} />
          Récolte
        </motion.button>
      </div>

      {/* Liste des stocks */}
      <div className="grid grid-cols-2 gap-3">
        {filteredStocks.map((stock, index) => {
          const isLow = stock.quantity < stock.threshold;
          const margin = stock.salePrice - stock.productionCost;
          const marginPercent = stock.productionCost > 0
            ? ((margin / stock.productionCost) * 100).toFixed(0)
            : '0';

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
                isLow ? 'from-red-50 via-white to-red-50 border-red-300' : 'from-green-50 via-white to-green-50 border-gray-200'
              } rounded-3xl overflow-hidden shadow-md border-2 cursor-pointer`}
              whileHover={{ scale: 1.02, y: -4, boxShadow: '0 10px 30px rgba(46, 139, 87, 0.15)' }}
              whileTap={{ scale: 0.97 }}
            >
              {/* Image en haut - grande et mise en avant */}
              <div className="relative w-full h-36 overflow-hidden">
                <ImageWithFallback 
                  src={stock.image} 
                  alt={stock.name}
                  className="w-full h-full object-cover"
                />
                {/* Badge alerte par-dessus l'image */}
                {isLow && (
                  <div className="absolute top-2 right-2">
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="inline-flex items-center gap-1 bg-red-500 text-white px-2 py-1 rounded-lg text-xs font-bold shadow-lg"
                    >
                      <AlertCircle className="w-3 h-3" />
                      Bas
                    </motion.span>
                  </div>
                )}
                {/* Badge marge par-dessus l'image */}
                <div className="absolute top-2 left-2">
                  <span className="text-xs bg-green-600 text-white px-2 py-1 rounded-lg font-bold shadow-lg">
                    +{marginPercent}%
                  </span>
                </div>
                {/* Gradient overlay au bas de l'image */}
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
                {/* Nom du produit sur l'image */}
                <div className="absolute bottom-2 left-2 right-2">
                  <h3 className="font-bold text-white text-sm drop-shadow-lg">{stock.name}</h3>
                </div>
              </div>

              {/* Informations compactes sous l'image */}
              <div className="p-3 space-y-2">
                {/* Quantité en grand */}
                <div className="flex items-baseline justify-center gap-1">
                  <span className={`text-3xl font-bold ${isLow ? 'text-red-600' : 'text-[#2E8B57]'}`}>
                    {stock.quantity}
                  </span>
                  <span className="text-sm text-gray-500 font-semibold">{stock.unit}</span>
                </div>

                {/* Prix et marge en compact */}
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  <div className="bg-red-50 rounded-lg p-1.5 text-center">
                    <p className="text-red-600 font-semibold mb-0.5">Coût</p>
                    <Montant value={stock.productionCost} size="xs" color="#374151" />
                  </div>
                  <div className="bg-green-50 rounded-lg p-1.5 text-center">
                    <p className="text-green-600 font-semibold mb-0.5">Vente</p>
                    <Montant value={stock.salePrice} size="xs" color="#374151" />
                  </div>
                </div>

                {/* Barre de progression du stock */}
                <div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${isLow ? 'bg-red-500' : 'bg-green-500'}`}
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
    </SubPageLayout>

      {/* Modal Ajout */}
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
                <h2 className="text-xl font-bold">Ajouter un produit</h2>
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
                {/* Photo du produit */}
                <ImagePickerField
                  label="Photo du produit"
                  value={newStock.image?.startsWith('data:') || newStock.image?.startsWith('http') ? newStock.image : ''}
                  onChange={(url) => setNewStock({ ...newStock, image: url })}
                  primaryColor="#2E8B57"
                  shape="rect"
                  size={96}
                />

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nom du produit</label>
                  <input
                    type="text"
                    value={newStock.name}
                    onChange={(e) => setNewStock({ ...newStock, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#2E8B57] focus:outline-none"
                    placeholder="Ex: Tomates fraîches"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Quantité</label>
                    <input
                      type="number"
                      value={newStock.quantity}
                      onChange={(e) => setNewStock({ ...newStock, quantity: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#2E8B57] focus:outline-none"
                    />
                  </div>
                  <SelectWithAutre
                    label="Unité"
                    value={newStock.unit}
                    onChange={(v) => setNewStock({ ...newStock, unit: v })}
                    options={['kg', 'L', 'tas', 'régimes', 'sac', 'tonne', 'carton']}
                    primaryColor="#2E8B57"
                    placeholder="Ex: caisse, panier..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Coût production (FCFA)</label>
                    <input
                      type="number"
                      value={newStock.productionCost}
                      onChange={(e) => setNewStock({ ...newStock, productionCost: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#2E8B57] focus:outline-none"
                      placeholder="Ex: 500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Prix de vente (FCFA)</label>
                    <input
                      type="number"
                      value={newStock.salePrice}
                      onChange={(e) => setNewStock({ ...newStock, salePrice: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#2E8B57] focus:outline-none"
                      placeholder="Ex: 600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Catégorie</label>
                  <SelectWithAutre
                    label="Catégorie"
                    value={newStock.category}
                    onChange={(v) => setNewStock({ ...newStock, category: v })}
                    options={categories.filter(c => c.id !== 'tous').map(cat => cat.id)}
                    primaryColor="#2E8B57"
                    placeholder="Ex: épices, fleurs..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Seuil d'alerte</label>
                  <input
                    type="number"
                    value={newStock.threshold}
                    onChange={(e) => setNewStock({ ...newStock, threshold: parseInt(e.target.value) || 10 })}
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#2E8B57] focus:outline-none"
                  />
                </div>

                <motion.button
                  onClick={addStock}
                  className="w-full py-4 rounded-2xl bg-[#2E8B57] text-white font-bold"
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                >
                  Ajouter à la production
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
                      onClick={() => updateStock(selectedStock.id, Math.max(0, selectedStock.quantity - 10))}
                      className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border-2 border-red-200"
                      whileTap={{ scale: 0.9 }}
                    >
                      <Minus className="w-5 h-5" />
                    </motion.button>
                    <input
                      type="number"
                      value={selectedStock.quantity}
                      onChange={(e) => updateStock(selectedStock.id, parseInt(e.target.value) || 0)}
                      className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-[#2E8B57] focus:outline-none text-center text-2xl font-bold"
                    />
                    <span className="text-gray-500 font-semibold">{selectedStock.unit}</span>
                    <motion.button
                      onClick={() => updateStock(selectedStock.id, selectedStock.quantity + 10)}
                      className="w-12 h-12 rounded-xl bg-green-50 text-green-600 flex items-center justify-center border-2 border-green-200"
                      whileTap={{ scale: 0.9 }}
                    >
                      <Plus className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Coût production</span>
                    <span className="font-bold text-gray-900"><Montant value={selectedStock.productionCost} unit={selectedStock.unit} size="sm" color="#374151" /></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Prix de vente</span>
                    <span className="font-bold text-green-600"><Montant value={selectedStock.salePrice} unit={selectedStock.unit} size="sm" color="#16a34a" /></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Marge unitaire</span>
                    <span className="font-bold text-[#2E8B57]">
                      <Montant value={selectedStock.salePrice - selectedStock.productionCost} size="sm" color="#2E8B57" showPlus />
                      <span className="text-xs ml-1">
                        (+{(((selectedStock.salePrice - selectedStock.productionCost) / selectedStock.productionCost) * 100).toFixed(0)}%)
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Valeur totale</span>
                    <span className="font-bold text-lg text-[#2E8B57]">
                      <Montant value={selectedStock.quantity * selectedStock.salePrice} size="lg" color="#2E8B57" />
                    </span>
                  </div>
                </div>

                <motion.button
                  onClick={() => {
                    setConfirmDeleteStockId(selectedStock.id);
                    return;
                  }}
                  className="w-full py-4 rounded-2xl bg-red-50 text-red-600 font-bold flex items-center justify-center gap-2 border-2 border-red-200"
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <Trash2 className="w-5 h-5" />
                  Supprimer de la production
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {confirmDeleteStockId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 flex flex-col gap-4 max-w-sm w-full mx-4">
            <p className="text-lg font-semibold">Supprimer ce produit ?</p>
            <div className="flex gap-3">
              <button onClick={() => { deleteStock(confirmDeleteStockId); setConfirmDeleteStockId(null); }} className="flex-1 bg-red-500 text-white py-2 rounded-xl">Supprimer</button>
              <button onClick={() => setConfirmDeleteStockId(null)} className="flex-1 bg-gray-100 py-2 rounded-xl">Annuler</button>
            </div>
          </div>
        </div>
      )}

      {showValueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowValueModal(false)}>
          <div className="bg-white rounded-2xl p-6 flex flex-col gap-3 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold">Valeur totale du stock</h3>
            <p className="text-3xl font-bold text-green-600">{valeurTotale.toLocaleString()} FCFA</p>
            <button onClick={() => setShowValueModal(false)} className="mt-2 bg-gray-100 py-2 rounded-xl">Fermer</button>
          </div>
        </div>
      )}

      {/* Toast Container */}
      <ToastContainer />
    </>
  );
}
