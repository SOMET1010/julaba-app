import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, ShoppingCart, Heart, Star, MapPin, Minus, Plus, X, Package,
  Wheat, Leaf, Apple, Flame, Check, Trash2, TrendingDown, TrendingUp,
  Wallet, Banknote, ShoppingBag, MessageSquare, Zap, History, Users,
  Store, Smartphone, CreditCard, QrCode, Filter, Sprout, ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { useUser } from '../../contexts/UserContext';
import { useApp } from '../../contexts/AppContext';
import { useToast } from '../../hooks/useToast';
import { useVoiceCore } from '../../hooks/useVoiceCore';
import { NotificationButton } from './NotificationButton';
import { useCommande, type Commande as CommandeContextShape } from '../../contexts/CommandeContext';
import { proposerNegociation } from '../../../imports/commandes-api';
import { HistoriqueList } from '../marche/HistoriqueList';
import { CommandeMarche } from '../marche/marketplace-data';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import {
  PAYMENT_METHODS as ALL_PAYMENT_METHODS, MOBILE_OPERATORS, getPaymentLabel,
  type PaymentMethodId, type MobileOperatorId,
} from '../../types/payment';
import {
  IMG_PRODUIT_RIZ, IMG_PRODUIT_TOMATE, IMG_PRODUIT_IGNAME, IMG_PRODUIT_MAIS,
  IMG_PRODUIT_PLANTAIN, IMG_PRODUIT_PIMENT, IMG_PRODUIT_AUBERGINE, IMG_PRODUIT_GOMBO
} from '../../assets/images';
import { Montant } from '../shared/Montant';
import { SubPageLayout } from '../layout/SubPageLayout';
import { API_URL } from '../../utils/api';
import { apiRequest } from '../../../imports/api-client';

interface Product {
  id: string; name: string; emoji: string; image: string;
  sellerType: 'producteur' | 'cooperative'; sellerName: string; sellerId: string;
  cooperativeInfo?: { nombreMembres: number; certification?: string; };
  location: string; price: number; unit: string; stock: number;
  category: string; status: 'available' | 'low-stock' | 'out-of-stock'; description: string;
}

const categories = [
  { id: 'tous', label: 'Tous', icon: Package },
  { id: 'cereales', label: 'Céréales', icon: Wheat },
  { id: 'legumes', label: 'Légumes', icon: Leaf },
  { id: 'fruits', label: 'Fruits', icon: Apple },
  { id: 'epices', label: 'Épices', icon: Flame },
];

function getProduitFallbackImage(produit: string): string {
  const n = (produit || '').toLowerCase();
  if (n.includes('riz')) return IMG_PRODUIT_RIZ;
  if (n.includes('tomate')) return IMG_PRODUIT_TOMATE;
  if (n.includes('igname')) return IMG_PRODUIT_IGNAME;
  if (n.includes('maïs') || n.includes('mais')) return IMG_PRODUIT_MAIS;
  if (n.includes('banane') || n.includes('plantain')) return IMG_PRODUIT_PLANTAIN;
  if (n.includes('piment')) return IMG_PRODUIT_PIMENT;
  if (n.includes('aubergine')) return IMG_PRODUIT_AUBERGINE;
  if (n.includes('gombo')) return IMG_PRODUIT_GOMBO;
  return IMG_PRODUIT_RIZ;
}

const mockProducts: Product[] = [];

function isValidPhoneCI(phone: string): boolean {
  const digits = phone.replace(/\s+/g, '').replace(/^\+?225/, '');
  return /^(01|05|07|25|27)\d{8}$/.test(digits);
}

export function MarcheVirtuel() {
  const navigate = useNavigate();
  const { user } = useUser();
  const { showToast, ToastContainer } = useToast();
  const { creerCommandeDirecte, commandes, loading: commandesLoading } = useCommande();
  const { accessToken, user: appUser } = useApp();
  const isGrossiste = appUser?.sousProfilMarchand === 'grossiste';
  const sousProfil = appUser?.sousProfilMarchand ?? null;
  const isDemiGrossiste = sousProfil === 'demi_grossiste';
  const isMarchand = appUser?.role === 'marchand';
  const visibleTabs = React.useMemo<Array<'cooperatives' | 'producteurs' | 'historique'>>(() => {
    if (isMarchand && isGrossiste) return ['producteurs', 'historique'];
    if (isMarchand && isDemiGrossiste) return ['cooperatives', 'historique'];
    if (isMarchand && !isGrossiste && !isDemiGrossiste) return ['historique'];
    return ['cooperatives', 'producteurs', 'historique'];
  }, [isMarchand, isGrossiste, isDemiGrossiste]);

  const [activeTab, setActiveTab] = useState<'cooperatives' | 'producteurs' | 'historique'>('producteurs');
  React.useEffect(() => {
    if (!visibleTabs.includes(activeTab)) setActiveTab(visibleTabs[0]);
  }, [visibleTabs, activeTab]);
  const [selectedCategory, setSelectedCategory] = useState('tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [showFavorites, setShowFavorites] = useState(false);
  const [conversationState, setConversationState] = useState<'welcome' | 'waiting' | 'confirming' | 'idle'>('welcome');
  const [pendingProduct, setPendingProduct] = useState<{product: Product; quantity: number} | null>(null);
  const [apiProducts, setApiProducts] = useState<Product[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodId | null>(null);
  const [selectedOperator, setSelectedOperator] = useState<MobileOperatorId | null>(null);
  const [livraisonTierce, setLivraisonTierce] = useState(false);
  const [modeReception, setModeReception] = useState<'livraison' | 'enlevement'>('livraison');
  const [livraisonNom, setLivraisonNom] = useState('');
  const [livraisonTelephone, setLivraisonTelephone] = useState('');
  const [livraisonTelephoneTouched, setLivraisonTelephoneTouched] = useState(false);
  const [livraisonLocalite, setLivraisonLocalite] = useState('');
  const [livraisonDate, setLivraisonDate] = useState('');
  const [livraisonNotes, setLivraisonNotes] = useState('');
  const [keiwaBalance, setKeiwaBalance] = useState(0);
  React.useEffect(() => {
    apiRequest<{ solde?: number } | null>(API_URL, '/wallets/me', { method: 'GET' })
      .then(d => { if (d) setKeiwaBalance(Number(d.solde || 0)); })
      .catch((e: any) => console.warn('[MarcheVirtuel] wallets/me failed:', e?.message));
  }, []);
  React.useEffect(() => {
    if (livraisonTierce) return;
    const nomProfil = `${user?.prenoms || ''} ${user?.nom || ''}`.trim();
    setLivraisonNom(nomProfil);
    setLivraisonTelephone(user?.telephone || '');
    setLivraisonLocalite(user?.commune || '');
  }, [user?.prenoms, user?.nom, user?.telephone, user?.commune, livraisonTierce]);
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinCode, setPinCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [showMobileOperators, setShowMobileOperators] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showNegotiationModal, setShowNegotiationModal] = useState(false);
  const [productToNegotiate, setProductToNegotiate] = useState<Product | null>(null);
  const [negotiationQuantity, setNegotiationQuantity] = useState(1);
  const [negotiationPrice, setNegotiationPrice] = useState(0);
  const [negotiationMessage, setNegotiationMessage] = useState('');
  const [showNegotiationSuccess, setShowNegotiationSuccess] = useState(false);
  const [paidTotal, setPaidTotal] = useState(0);
  const [showRepublierModal, setShowRepublierModal] = useState(false);
  const [produitARepublier, setProduitARepublier] = useState<Product | null>(null);
  const [republierPrix, setRepublierPrix] = useState(0);
  const [republierQuantite, setRepublierQuantite] = useState(1);
  const [savingRepublier, setSavingRepublier] = useState(false);
  const [showSignalementModal, setShowSignalementModal] = useState(false);
  const [signalementCommande, setSignalementCommande] = useState<CommandeMarche | null>(null);
  const [signalementType, setSignalementType] = useState<string>('fraude');
  const [signalementDescription, setSignalementDescription] = useState('');
  const [signalementLoading, setSignalementLoading] = useState(false);

  // ── Hook vocal unifié (STT OpenAI + TTS ElevenLabs) ────────────────────────
  const { speak: voiceSpeak } = useVoiceCore({
    onAction: async (response) => {
      if (response.transcript) processVoiceCommand(response.transcript);
    },
  });

  // TTS (pas d'affichage bulle)
  const speakSilent = (text: string) => {
    voiceSpeak(text);
  };

  const allProducts = React.useMemo(() => apiProducts, [apiProducts]);

  React.useEffect(() => {
    apiRequest<{ publications?: any[] } | null>(API_URL, '/publications/marche', { method: 'GET' })
    .then(data => {
      if (!data) return;
      const pubs = data.publications || [];
      if (pubs.length > 0) {
        const mapped: Product[] = pubs.map((p: any) => ({
          id: p.id, name: p.produit, emoji: '', image: p.photo_url || getProduitFallbackImage(p.produit),
          sellerType: (p.type_marche === 'cooperative' ? 'cooperative' : 'producteur') as 'producteur' | 'cooperative',
          sellerName: `${p.producteur_prenom || ''} ${p.producteur_nom || ''}`.trim() || 'Producteur',
          sellerId: p.user_id,
          location: p.localisation || p.producteur_commune || "Côte d'Ivoire",
          price: Number(p.prix_unitaire), unit: p.unite,
          stock: Number(p.quantite_disponible), category: (() => {
            const n = (p.produit || '').toLowerCase();
            if (['riz','maïs','mais','mil','sorgho','blé'].some(k => n.includes(k))) return 'cereales';
            if (['tomate','piment','aubergine','gombo','oignon','carotte'].some(k => n.includes(k))) return 'legumes';
            if (['banane','plantain','mangue','ananas','orange','citron','papaye'].some(k => n.includes(k))) return 'fruits';
            if (['poivre','gingembre','épice','epice','piment'].some(k => n.includes(k))) return 'epices';
            return 'autres';
          })(),
          status: 'available' as const, description: p.description || '',
        }));
        setApiProducts(mapped);
      }
    })
    .catch((e: any) => console.warn('[MarcheVirtuel] publications/marche failed:', e?.message));
  }, [accessToken]);

  // Message de bienvenue
  useEffect(() => {
    const hasPlayed = localStorage.getItem('tantieMarketWelcomePlayed');
    if (!hasPlayed && user) {
      localStorage.setItem('tantieMarketWelcomePlayed', 'true');
      setTimeout(() => {
        // speak automatique désactivé
        setConversationState('waiting');
      }, 1000);
    }
  }, [user]);

  const findProductByName = (text: string): Product | null => {
    const keywords: Record<string, string[]> = {
      'riz': ['riz', 'ri'], 'igname': ['igname', 'ignames', 'ignam'],
      'tomate': ['tomate', 'tomates'], 'maïs': ['maïs', 'mais'],
      'banane': ['banane', 'bananes', 'plantain'], 'piment': ['piment', 'piments'],
      'aubergine': ['aubergine', 'aubergines'], 'gombo': ['gombo', 'gombos'],
    };
    for (const [productKey, variants] of Object.entries(keywords)) {
      if (variants.some(v => text.includes(v))) {
        if (activeTab === 'historique') return allProducts.find(p => p.name.toLowerCase().includes(productKey)) || null;
        const filteredByTab = allProducts.filter(p =>
          activeTab === 'producteurs' ? p.sellerType === 'producteur' : p.sellerType === 'cooperative'
        );
        return filteredByTab.find(p => p.name.toLowerCase().includes(productKey)) ||
               allProducts.find(p => p.name.toLowerCase().includes(productKey)) || null;
      }
    }
    return null;
  };

  const extractQuantity = (text: string): number => {
    const numberWords: Record<string, number> = {
      'un': 1, 'une': 1, 'deux': 2, 'trois': 3, 'quatre': 4, 'cinq': 5,
      'six': 6, 'sept': 7, 'huit': 8, 'neuf': 9, 'dix': 10,
    };
    const m = text.match(/(\d+)/);
    if (m) return parseInt(m[1]);
    for (const [word, num] of Object.entries(numberWords)) if (text.includes(word)) return num;
    return 1;
  };

  const processVoiceCommand = (command: string) => {
    const lc = command.toLowerCase();
    if (conversationState === 'waiting') {
      if (lc.includes('aide') || lc.includes('aider') || lc.includes('choisir')) {

        setConversationState('idle'); return;
      } else if (lc.includes('seul') || lc.includes('moi-même') || lc.includes('non')) {

        setConversationState('idle'); return;
      }
    }
    if (conversationState === 'confirming' && pendingProduct) {
      if (lc.includes('oui') || lc.includes('confirme') || lc.includes('ok')) {
        addToCart(pendingProduct.product.id, pendingProduct.quantity);
        const total = pendingProduct.product.price * pendingProduct.quantity;

        showToast(`${pendingProduct.quantity} ${pendingProduct.product.unit} de ${pendingProduct.product.name} ajouté (${(total || 0).toLocaleString()} FCFA)`, 'success');
        setPendingProduct(null); setConversationState('idle'); return;
      } else if (lc.includes('non') || lc.includes('annule')) {

        setPendingProduct(null); setConversationState('idle'); return;
      }
    }
    if (lc.includes('vide') && lc.includes('panier')) {
      setCart({});  showToast('Panier vidé', 'info'); return;
    }
    if (lc.includes('montre') || lc.includes('affiche') || lc.includes('voir')) {
      if (lc.includes('légume')) { setSelectedCategory('legumes');  return; }
      if (lc.includes('fruit')) { setSelectedCategory('fruits');  return; }
      if (lc.includes('céréale') || lc.includes('cereale')) { setSelectedCategory('cereales');  return; }
      if (lc.includes('épice') || lc.includes('epice')) { setSelectedCategory('epices');  return; }
      if (lc.includes('tout')) { setSelectedCategory('tous');  return; }
    }
    if (lc.includes('combien') && (lc.includes('coûte') || lc.includes('coute') || lc.includes('prix'))) {
      const product = findProductByName(lc);

      return;
    }
    if (lc.includes('veux') || lc.includes('ajoute') || lc.includes('prend')) {
      const product = findProductByName(lc);
      const quantity = extractQuantity(lc);
      if (product) {
        const total = product.price * quantity;

        setPendingProduct({ product, quantity }); setConversationState('confirming');
      } else {

      }
      return;
    }
    const product = findProductByName(lc);
    if (product) { setSearchQuery(product.name);  return; }

  };

  const filteredProducts = allProducts.filter(product => {
    const matchesCategory = selectedCategory === 'tous' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.sellerName.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'historique') return false;
    // TODO: filtrage coopératives à déplacer côté API
    // GET /publications?source=cooperative
    const matchesTab = activeTab === 'producteurs' ? product.sellerType === 'producteur' : activeTab === 'cooperatives' ? product.sellerType === 'cooperative' : false;
    return matchesCategory && matchesSearch && matchesTab;
  });

  const addToCart = (productId: string, quantity: number = 1) => {
    setCart(prev => ({ ...prev, [productId]: (prev[productId] || 0) + quantity }));
  };

  const toggleFavorite = (productId: string) => {
    setFavorites(prev => {
      const n = new Set(prev);
      n.has(productId) ? n.delete(productId) : n.add(productId);
      return n;
    });
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) { const c = { ...cart }; delete c[productId]; setCart(c); }
    else setCart(prev => ({ ...prev, [productId]: quantity }));
  };

  const handleRepublierSubmit = async () => {
    if (!produitARepublier) return;
    if (republierQuantite <= 0) { showToast('La quantité doit être supérieure à 0', 'error'); return; }
    if (republierPrix <= 0) { showToast('Le prix doit être supérieur à 0', 'error'); return; }
    setSavingRepublier(true);
    try {
      await apiRequest(API_URL, '/publications/republier', {
        method: 'POST',
        body: JSON.stringify({
          produit: produitARepublier.name,
          quantite_disponible: republierQuantite,
          unite: produitARepublier.unit || 'kg',
          prix_unitaire: republierPrix,
          localisation: user?.commune || '',
        }),
      });
      setShowRepublierModal(false);
      setProduitARepublier(null);
      showToast('Offre republiée sur le marché coopératif', 'success');
    } catch (e: any) {
      showToast(e?.message || 'Republication impossible', 'error');
    } finally {
      setSavingRepublier(false);
    }
  };

  const handleNegotiationSubmit = async () => {
    try {
      if (!user || !productToNegotiate) throw new Error('Informations manquantes');
      if (negotiationQuantity <= 0) throw new Error('La quantité doit être supérieure à 0');
      if (negotiationPrice <= 0) throw new Error('Le prix proposé doit être supérieur à 0');
      await proposerNegociation({
        vendeurId: productToNegotiate.sellerId,
        produit: productToNegotiate.name,
        quantite: negotiationQuantity,
        prixOriginal: productToNegotiate.price,
        prixPropose: negotiationPrice,
        unite: productToNegotiate.unit || 'kg',
      message: negotiationMessage.trim(),
      });
      setShowNegotiationModal(false); setProductToNegotiate(null); setShowNegotiationSuccess(true);
      speakSilent(`Proposition de prix envoyée à ${productToNegotiate.sellerName}. Tu recevras une réponse bientôt`);
      showToast('Proposition envoyée ! Tu recevras une notification dès la réponse', 'success');
    } catch (error: any) {
      setErrorMessage(error.message); setShowErrorModal(true);
      speakSilent('Erreur lors de l\'envoi de la proposition');
    }
  };

  const handlePayment = async () => {
    if (!livraisonNom.trim()) {
      setErrorMessage(modeReception === 'livraison' ? 'Nom complet obligatoire' : 'Nom du livreur obligatoire');
      setShowErrorModal(true);
      return;
    }
    if (!livraisonTelephone.trim()) {
      setErrorMessage(modeReception === 'livraison' ? 'Téléphone obligatoire' : 'Téléphone du livreur obligatoire');
      setShowErrorModal(true);
      return;
    }
    if (!isValidPhoneCI(livraisonTelephone)) {
      setLivraisonTelephoneTouched(true);
      setErrorMessage('Numéro de téléphone invalide. Format attendu : 07XXXXXXXX');
      setShowErrorModal(true);
      return;
    }
    if (modeReception === 'livraison' && !livraisonLocalite.trim()) {
      setErrorMessage('Saisis l’adresse ou la localité de livraison');
      setShowErrorModal(true);
      return;
    }
    if (!paymentMethod) return;
    if (paymentMethod === 'mobile_money') {
      if (!selectedOperator) { setErrorMessage('Choisis un opérateur Mobile Money'); setShowErrorModal(true); return; }
      if (phoneNumber.length < 10) { setErrorMessage('Saisis un numéro de téléphone valide'); setShowErrorModal(true); return; }
    }
    if (paymentMethod === 'card' && cardNumber.length < 16) {
      setErrorMessage('Saisis un numéro de carte valide'); setShowErrorModal(true); return;
    }
    if (paymentMethod === 'keiwa') {
      if (cartTotal > keiwaBalance) {
        setErrorMessage('Solde Wallet insuffisant pour cette commande'); setShowErrorModal(true);
        speakSilent('Désolé, ton solde Wallet est insuffisant pour cette commande'); return;
      }
      if (user?.pinSecurityEnabled) {
        setShowPaymentModal(false); setShowPinModal(true);
        speakSilent('Entre ton code PIN à 4 chiffres pour confirmer le paiement'); return;
      }
    }
    const label = getPaymentLabel(paymentMethod, selectedOperator || undefined);
    const ok = await createOrdersFromCart();
    if (!ok) {
      setErrorMessage('Erreur lors de la création des commandes. Réessaie.');
      setShowErrorModal(true);
      return;
    }
    speakSilent(`Paiement de ${(cartTotal || 0).toLocaleString()} francs CFA par ${label} effectué avec succès`);
    resetPaymentState();
  };

  const resetPaymentState = () => {
    setPaidTotal(cartTotal);
    setCart({}); setShowPaymentModal(false); setShowCart(false); setShowSuccessModal(true);
    setPaymentMethod(null); setSelectedOperator(null); setPhoneNumber(''); setCardNumber(''); setShowMobileOperators(false);
    setLivraisonTierce(false);
    setModeReception('livraison');
    setLivraisonDate('');
    setLivraisonNotes('');
    setLivraisonTelephoneTouched(false);
    setLivraisonNom(`${user?.prenoms || ''} ${user?.nom || ''}`.trim());
    setLivraisonTelephone(user?.telephone || '');
    setLivraisonLocalite(user?.commune || '');
  };

  const handlePinValidation = async () => {
    if (pinCode.length !== 4) { setErrorMessage('Le code PIN doit contenir 4 chiffres'); setShowErrorModal(true); speakSilent('Le code PIN doit contenir 4 chiffres'); return; }
    try {
      const data = await apiRequest<{ valid?: boolean }>(API_URL, '/auth/pin/verify', {
        method: 'POST',
        body: JSON.stringify({ pin: pinCode }),
      });
      if (!data?.valid) { setErrorMessage('Code PIN incorrect. Réessaye'); setShowErrorModal(true); speakSilent('Code PIN incorrect'); setPinCode(''); return; }
    } catch { setErrorMessage('Erreur réseau. Réessaye.'); setShowErrorModal(true); return; }
    const ok = await createOrdersFromCart();
    if (!ok) {
      setErrorMessage('Erreur lors de la création des commandes. Réessaie.');
      setShowErrorModal(true);
      return;
    }
    speakSilent(`Paiement de ${(cartTotal || 0).toLocaleString()} francs CFA effectué avec succès depuis ton Wallet`);
    setShowPinModal(false); setPinCode(''); resetPaymentState();
  };

  const handleSignaler = (commande: CommandeMarche) => {
    setSignalementCommande(commande);
    setSignalementType('fraude');
    setSignalementDescription('');
    setShowSignalementModal(true);
  };

  const handleSubmitSignalement = async () => {
    if (!signalementCommande || !signalementDescription.trim()) return;
    setSignalementLoading(true);
    try {
      const data = await apiRequest<{ success?: boolean; message?: string } | null>(API_URL, '/signalements', {
        method: 'POST',
        body: JSON.stringify({
          type: signalementType,
          description: signalementDescription.trim(),
          commande_id: signalementCommande.id,
          signale_par: user?.id ?? '',
          acteur_nom: (signalementCommande.vendeurNom?.trim() || signalementCommande.vendeurId || '').trim(),
        }),
      });
      if (data?.success === false) {
        showToast(data.message || 'Erreur lors de l\'envoi du signalement', 'error');
        return;
      }
      showToast('Signalement envoyé au service de modération', 'success');
      setShowSignalementModal(false);
      setSignalementCommande(null);
      setSignalementDescription('');
      setSignalementType('fraude');
    } catch {
      showToast('Erreur réseau', 'error');
    } finally {
      setSignalementLoading(false);
    }
  };

  const commandesMarcheFromContext: CommandeMarche[] = commandes
    .filter(c => c.acheteurId === user?.id)
    .map(c => {
      const produitCatalogue = allProducts.find(p => p.sellerId === c.vendeurId);
      return {
        id: c.id, acheteurType: 'marchand' as const, acheteurNom: user?.prenoms || 'Marchand',
        vendeurType: (produitCatalogue?.sellerType || 'producteur') as 'producteur' | 'cooperative',
        vendeurId: c.vendeurId, vendeurNom: produitCatalogue?.sellerName || c.vendeurId,
        produit: c.produit, quantite: c.quantite, unite: produitCatalogue?.unit || 'kg',
        prixUnitaire: c.prixUnitaire, montantTotal: c.total,
        statut: c.statut === 'confirmee' ? 'acceptee' as const : c.statut === 'en_cours' ? 'acceptee' as const : c.statut as any,
        dateCreation: c.dateCommande, dateLivraison: c.dateLivraison || '',
        modePaiement: c.modePaiement, operateurMobile: c.operateurMobile,
      };
    });

  const cartItems = Object.entries(cart)
    .map(([id, quantity]) => ({ product: allProducts.find(p => p.id === id), quantity }))
    .filter((i): i is { product: Product; quantity: number } => Boolean(i.product));

  const createOrdersFromCart = async (): Promise<boolean> => {
    const telephoneNormalise = livraisonTelephone.replace(/\s+/g, '');
    let success = 0;
    let attempted = 0;
    for (const item of cartItems) {
      if (!item.product) continue;
      attempted++;
      try {
        type CreateCommandePayload = Omit<CommandeContextShape, 'id' | 'dateCommande'> & {
          acheteur_nom?: string;
          acheteur_telephone?: string;
          date_livraison?: string;
        };
        const payload: CreateCommandePayload = {
          acheteurId: user?.id || '', vendeurId: item.product.sellerId,
          type: 'achat', produit: item.product.name, quantite: item.quantity, publicationId: item.product.id,
          prixUnitaire: item.product.price, total: item.product.price * item.quantity,
          statut: 'en_attente', modePaiement: paymentMethod || undefined, operateurMobile: selectedOperator || undefined,
          acheteur_nom: livraisonNom.trim(),
          acheteur_telephone: telephoneNormalise,
          localite: modeReception === 'enlevement' ? 'Enlèvement' : livraisonLocalite.trim(),
          date_livraison: livraisonDate || undefined,
          notes: livraisonNotes.trim() || undefined,
        };
        await creerCommandeDirecte(payload);
        success++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erreur commande';
        console.error(`[createOrdersFromCart] ${message}`, item.product?.name);
        // Ne pas incrémenter success - l'échec sera détecté par attempted > success
      }
    }
    return attempted > 0 && success === attempted;
  };

  // Auto-close SuccessModal après 2s
  React.useEffect(() => {
    if (showSuccessModal) {
      const t = setTimeout(() => setShowSuccessModal(false), 2000);
      return () => clearTimeout(t);
    }
  }, [showSuccessModal]);

  const cartTotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const cartCount = Object.keys(cart).length;
  const favoritesCount = favorites.size;

  return (
    <SubPageLayout
      role="marchand"
      title="Marché virtuel"
      rightContent={(
        <div className="flex items-center gap-2">
          <NotificationButton />
          <motion.button onClick={() => setShowCart(true)} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
            style={{ width:40, height:40, borderRadius:13, background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.28)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative', flexShrink:0 }}>
            <ShoppingCart className="w-[17px] h-[17px]" style={{ color:'rgba(255,255,255,0.9)' }} />
            {(cartCount ?? 0) > 0 && (
              <span style={{ position:'absolute', top:-3, right:-3, minWidth:18, height:18, padding:'0 3px', background:'#FFD166', borderRadius:'50%', fontSize:9, fontWeight:900, color:'#7a3800', display:'flex', alignItems:'center', justifyContent:'center', border:'1.5px solid rgba(143,68,24,0.9)' }}>
                {cartCount}
              </span>
            )}
          </motion.button>
          <motion.button onClick={() => setShowFavorites(true)} whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.9 }}
            style={{ width:40, height:40, borderRadius:13, background:'rgba(255,255,255,0.18)', border:'1px solid rgba(255,255,255,0.28)', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative', flexShrink:0 }}>
            <Heart className="w-[17px] h-[17px]" style={{ color:'rgba(255,255,255,0.9)' }} />
            {(favoritesCount ?? 0) > 0 && (
              <span style={{ position:'absolute', top:-3, right:-3, minWidth:18, height:18, padding:'0 3px', background:'#FFD166', borderRadius:'50%', fontSize:9, fontWeight:900, color:'#7a3800', display:'flex', alignItems:'center', justifyContent:'center', border:'1.5px solid rgba(143,68,24,0.9)' }}>
                {favoritesCount}
              </span>
            )}
          </motion.button>
        </div>
      )}
    >
      <div className="pt-2 pb-32 lg:pb-8 lg:pl-[320px] max-w-2xl lg:max-w-7xl mx-auto min-h-screen"
        style={{ backgroundColor: '#FFF2E9' }}>
        <KPIGrid cols={2}>
          <UniversalKPI
            label={activeTab === 'cooperatives' ? 'Coopératives' : activeTab === 'producteurs' ? 'Producteurs' : 'Commandes'}
            animatedTarget={activeTab === 'cooperatives' ? allProducts.filter(p => p.sellerType === 'cooperative').length : activeTab === 'producteurs' ? allProducts.filter(p => p.sellerType === 'producteur').length : commandesMarcheFromContext.length}
            icon={Users}
            color="#2563eb"
            iconAnimation="pulse"
            delay={0.1}
          />
          <UniversalKPI
            label="Produits disponibles"
            animatedTarget={activeTab === 'historique' ? allProducts.length : activeTab === 'cooperatives' ? allProducts.filter(p => p.sellerType === 'cooperative').length : allProducts.filter(p => p.sellerType === 'producteur').length}
            icon={ShoppingBag}
            color="#ea580c"
            iconAnimation="bounce"
            delay={0.2}
          />
          <UniversalKPI
            label={activeTab === 'historique' ? 'Total dépensé' : 'Commandes'}
            animatedTarget={activeTab === 'historique' ? commandesMarcheFromContext.reduce((s, c) => s + c.montantTotal, 0) : commandesMarcheFromContext.length}
            suffix={activeTab === 'historique' ? 'FCFA' : undefined}
            icon={TrendingUp}
            color="#16a34a"
            iconAnimation="float"
            delay={0.3}
          />
          <UniversalKPI
            label="Négociations en cours"
            animatedTarget={commandesMarcheFromContext.filter(c => c.statut === 'en_attente').length}
            icon={MessageSquare}
            color="#7c3aed"
            iconAnimation="pulse"
            delay={0.4}
            explication="Nombre de propositions de prix envoyées aux vendeurs en attente de réponse."
          />
        </KPIGrid>

        <motion.div className={`grid ${visibleTabs.length === 1 ? 'grid-cols-1' : visibleTabs.length === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-3 mb-4`} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {visibleTabs.includes('cooperatives') && (
          <motion.button onClick={() => { setActiveTab('cooperatives'); }} className={`flex items-center justify-center px-4 py-3.5 rounded-2xl border-2 transition-colors ${activeTab === 'cooperatives' ? 'bg-[#C46210] border-[#C46210] text-white' : 'bg-white border-gray-200 hover:border-[#C46210] text-gray-700'}`} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
            <span className="font-semibold text-xs">Coopératives</span>
          </motion.button>
          )}
          {visibleTabs.includes('producteurs') && (
          <motion.button onClick={() => { setActiveTab('producteurs'); }} className={`flex items-center justify-center px-4 py-3.5 rounded-2xl border-2 transition-colors ${activeTab === 'producteurs' ? 'bg-[#C46210] border-[#C46210] text-white' : 'bg-white border-gray-200 hover:border-[#C46210] text-gray-700'}`} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
            <span className="font-semibold text-xs">Producteurs</span>
          </motion.button>
          )}
          {visibleTabs.includes('historique') && (
          <motion.button onClick={() => { setActiveTab('historique'); }} className={`flex items-center justify-center px-4 py-3.5 rounded-2xl border-2 transition-colors ${activeTab === 'historique' ? 'bg-[#C46210] border-[#C46210] text-white' : 'bg-white border-gray-200 hover:border-[#C46210] text-gray-700'}`} whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}>
            <span className="font-semibold text-xs">Historique</span>
          </motion.button>
          )}
        </motion.div>

        <motion.p key={activeTab} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 text-sm text-gray-600 text-center">
          {activeTab === 'cooperatives' ? 'Achète en volume auprès des coopératives agricoles' : activeTab === 'producteurs' ? 'Achète directement auprès des producteurs individuels' : 'Toutes tes commandes passées'}
        </motion.p>

        {isGrossiste && (
          <motion.button
            type="button"
            onClick={() => navigate('/marchand/recoltes-prevues')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileTap={{ scale: 0.98 }}
            className="w-full mb-4 flex items-center gap-3 p-4 rounded-3xl border-2 border-[#C46210] bg-gradient-to-br from-orange-50 via-white to-orange-50 text-left shadow-sm"
          >
            <span className="w-11 h-11 rounded-2xl bg-green-100 flex items-center justify-center flex-shrink-0">
              <Sprout className="w-5 h-5 text-green-700" />
            </span>
            <span className="flex-1 min-w-0">
              <span className="block font-bold text-gray-900 text-sm">Voir les récoltes prévues</span>
              <span className="block text-xs text-gray-600">Producteurs avec récolte à venir, triés par distance</span>
            </span>
            <ChevronRight className="w-5 h-5 text-[#C46210] flex-shrink-0" />
          </motion.button>
        )}

        <motion.div className="mb-4 relative" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Rechercher un produit..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-white border-2 border-gray-200 focus:border-[#C46210] focus:outline-none text-base placeholder:text-gray-400 shadow-sm" />
            <motion.button onClick={() => setShowCategoryFilter(!showCategoryFilter)} className={`absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-colors ${selectedCategory !== 'tous' ? 'bg-[#C46210] text-white' : 'hover:bg-orange-100 text-gray-400'}`} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <Filter className="w-5 h-5" />
            </motion.button>
          </div>
          <AnimatePresence>
            {showCategoryFilter && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border-2 border-gray-200 shadow-lg overflow-hidden z-50">
                <div className="p-2">
                  <motion.button onClick={() => { setSelectedCategory('tous'); setShowCategoryFilter(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${selectedCategory === 'tous' ? 'bg-[#C46210] text-white' : 'hover:bg-orange-50 text-gray-700'}`} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Package className="w-5 h-5" /><span className="font-semibold">Tous les produits</span>
                  </motion.button>
                  {categories.filter(c => c.id !== 'tous').map((category) => {
                    const Icon = category.icon || Zap;
                    return (
                      <motion.button key={category.id} onClick={() => { setSelectedCategory(category.id); setShowCategoryFilter(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${selectedCategory === category.id ? 'bg-[#C46210] text-white' : 'hover:bg-orange-50 text-gray-700'}`} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Icon className="w-5 h-5" /><span className="font-semibold">{category.label}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {activeTab === 'historique' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {commandesLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-10 h-10 border-4 border-[#C46210] border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-gray-500">Chargement de l'historique...</p>
              </div>
            ) : (
              <HistoriqueList
                commandes={commandesMarcheFromContext}
                profil="marchand"
                sens="achat"
                emptyLabel="Aucune commande dans ton historique"
                onSignaler={handleSignaler}
              />
            )}
          </motion.div>
        )}

        {activeTab !== 'historique' && (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product, index) => (
              <motion.div key={product.id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }} onClick={() => setSelectedProduct(product)} className={`relative bg-gradient-to-br from-orange-50 via-white to-orange-50 rounded-3xl overflow-hidden shadow-md border-2 cursor-pointer ${product.status === 'low-stock' ? 'border-orange-400' : 'border-gray-200'}`} whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02, y: -4 }}>
                {product.status === 'low-stock' && <div className="absolute top-2 right-2 z-10 bg-orange-500 text-white px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1"><TrendingDown className="w-3 h-3" />Stock bas</div>}
                <motion.button onClick={(e) => { e.stopPropagation(); toggleFavorite(product.id); const isFav = favorites.has(product.id); showToast(isFav ? `${product.name} retiré des favoris` : `${product.name} ajouté aux favoris`, isFav ? 'info' : 'success'); }} className="absolute top-2 left-2 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-md flex items-center justify-center" whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.1 }}>
                  <Heart className={`w-4 h-4 ${favorites.has(product.id) ? 'text-red-500 fill-red-500' : 'text-gray-600'}`} />
                </motion.button>
                <div className="relative w-full h-40 bg-gray-100">
                  <ImageWithFallback src={product.image} alt={product.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-3">
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold mb-2 ${product.sellerType === 'producteur' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {product.sellerType === 'producteur' ? 'Producteur' : 'Coopérative'}
                    {product.cooperativeInfo && <span className="text-[9px]">• {product.cooperativeInfo.nombreMembres} membres</span>}
                  </div>
                  <h3 className="font-bold text-sm text-gray-900 mb-0.5 leading-tight">{product.name}</h3>
                  <p className="text-[10px] text-gray-500 mb-1.5">{product.sellerName}</p>
                  <p className="text-2xl font-bold text-[#C46210] mb-3"><Montant value={product.price} unit={product.unit} size="xl" color="#C46210" /></p>
                  <motion.button onClick={(e) => { e.stopPropagation(); addToCart(product.id); showToast(`${product.name} ajouté au panier`, 'success'); speakSilent(`${product.name} ajouté au panier`); }} className="w-full py-2.5 rounded-xl bg-[#C46210] text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-md" whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02, boxShadow: '0 8px 20px rgba(196, 98, 16, 0.3)' }}>
                    <Plus className="w-4 h-4" strokeWidth={3} />Ajouter
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Détail Produit */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center px-4" onClick={() => setSelectedProduct(null)}>
            <motion.div initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 25 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] flex flex-col">
              <div className="flex-shrink-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl">
                <h2 className="text-xl font-bold text-gray-900">Détails</h2>
                <motion.button onClick={() => setSelectedProduct(null)} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center" whileHover={{ rotate: 90, scale: 1.1 }} whileTap={{ scale: 0.9 }}><X className="w-5 h-5 text-gray-600" /></motion.button>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
                <div className="relative w-full h-48 bg-gray-100 rounded-2xl overflow-hidden"><ImageWithFallback src={selectedProduct.image} alt={selectedProduct.name} className="w-full h-full object-cover" /></div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{selectedProduct.name}</h3>
                  <p className="text-3xl font-bold text-[#C46210]"><Montant value={selectedProduct.price} unit={selectedProduct.unit} size="2xl" color="#C46210" /></p>
                </div>
                <div className={`rounded-2xl p-3 space-y-2.5 ${selectedProduct.sellerType === 'producteur' ? 'bg-green-50' : 'bg-blue-50'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base ${selectedProduct.sellerType === 'producteur' ? 'bg-green-200 text-green-700' : 'bg-blue-200 text-blue-700'}`}>{selectedProduct.sellerType === 'producteur' ? 'P' : 'C'}</div>
                    <div>
                      <p className="text-xs text-gray-500">{selectedProduct.sellerType === 'producteur' ? 'Producteur' : 'Coopérative'}</p>
                      <p className="font-bold text-gray-900 text-sm">{selectedProduct.sellerName}</p>
                      {selectedProduct.cooperativeInfo && <p className="text-xs text-gray-600 mt-0.5">{selectedProduct.cooperativeInfo.nombreMembres} membres{selectedProduct.cooperativeInfo.certification ? ` • ${selectedProduct.cooperativeInfo.certification}` : ''}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3"><MapPin className="w-5 h-5 text-[#C46210]" /><div><p className="text-xs text-gray-500">Localisation</p><p className="font-bold text-gray-900 text-sm">{selectedProduct.location}</p></div></div>
                  <div className="flex items-center gap-3"><Package className="w-5 h-5 text-gray-600" /><div><p className="text-xs text-gray-500">Stock disponible</p><p className="font-bold text-gray-900 text-sm">{selectedProduct.stock} {selectedProduct.unit}</p></div></div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3"><p className="text-sm text-gray-600 leading-relaxed">{selectedProduct.description}</p></div>
              </div>
              <div className="flex-shrink-0 bg-white border-t border-gray-100 px-6 py-4 space-y-3 rounded-b-3xl">
                <motion.button onClick={() => { addToCart(selectedProduct.id); showToast(`${selectedProduct.name} ajouté au panier`, 'success'); speakSilent(`${selectedProduct.name} ajouté au panier`); setSelectedProduct(null); }} className="w-full py-3.5 rounded-2xl bg-[#C46210] text-white font-bold text-base shadow-lg flex items-center justify-center gap-2" whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
                  <Plus className="w-5 h-5" strokeWidth={3} />Ajouter au panier
                </motion.button>
                <motion.button onClick={() => { setProductToNegotiate(selectedProduct); setNegotiationPrice(selectedProduct.price); setNegotiationQuantity(1); setNegotiationMessage(''); setSelectedProduct(null); setShowNegotiationModal(true); speakSilent('Propose ton prix et ta quantité'); }} className="w-full py-3.5 rounded-2xl bg-white border-2 border-[#C46210] text-[#C46210] font-bold text-base shadow-sm flex items-center justify-center gap-2" whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
                  <MessageSquare className="w-5 h-5" />Négocier le prix
                </motion.button>
                {isGrossiste && selectedProduct.sellerType === 'producteur' && (
                  <motion.button onClick={() => { setProduitARepublier(selectedProduct); setRepublierPrix(selectedProduct.price); setRepublierQuantite(1); setSelectedProduct(null); setShowRepublierModal(true); }} className="w-full py-3.5 rounded-2xl bg-white border-2 border-[#2072AF] text-[#2072AF] font-bold text-base shadow-sm flex items-center justify-center gap-2" whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
                    <Store className="w-5 h-5" />Republier sur le marché coopératif
                  </motion.button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Panier */}
      <AnimatePresence>
        {showCart && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end px-4 pb-4" onClick={() => setShowCart(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><ShoppingCart className="w-6 h-6 text-[#C46210]" />Panier ({cartCount})</h2>
                <motion.button onClick={() => setShowCart(false)} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center" whileHover={{ rotate: 90, scale: 1.1 }} whileTap={{ scale: 0.9 }}><X className="w-5 h-5 text-gray-600" /></motion.button>
              </div>
              <div className="p-6 space-y-4 pb-8">
                {cartItems.length === 0 ? (
                  <div className="text-center py-12"><ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-500">Votre panier est vide</p></div>
                ) : (
                  <>
                    {cartItems.map((item, index) => (
                      <motion.div key={item.product.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className="bg-gray-50 rounded-2xl p-4">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-16 h-16 bg-gray-200 rounded-xl overflow-hidden flex-shrink-0"><ImageWithFallback src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" /></div>
                          <div className="flex-1">
                            <h3 className="font-bold text-gray-900">{item.product.name}</h3>
                            <p className="text-sm text-gray-500">{item.product.sellerName}</p>
                            <p className="text-lg font-bold text-[#C46210] mt-1"><Montant value={item.product.price} unit={item.product.unit} size="md" color="#C46210" /></p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <motion.button onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)} className="w-8 h-8 rounded-full bg-white border-2 border-gray-200 flex items-center justify-center" whileTap={{ scale: 0.9 }}><Minus className="w-4 h-4" /></motion.button>
                            <span className="w-12 text-center font-bold">{item.quantity}</span>
                            <motion.button onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)} className="w-8 h-8 rounded-full bg-[#C46210] text-white flex items-center justify-center" whileTap={{ scale: 0.9 }}><Plus className="w-4 h-4" /></motion.button>
                          </div>
                          <p className="text-xl font-bold text-gray-900">{(item.product.price * item.quantity).toLocaleString()} F</p>
                        </div>
                      </motion.div>
                    ))}
                    <div className="border-t-2 border-gray-200 pt-4">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-lg font-bold text-gray-900">Total</span>
                        <span className="text-3xl font-bold text-[#C46210]"><Montant value={cartTotal} size="2xl" color="#C46210" /></span>
                      </div>
                      <motion.button onClick={() => { speakSilent('Choisis ton mode de paiement'); setShowPaymentModal(true); }} className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#C46210] to-[#D97706] text-white font-bold text-lg shadow-lg" whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
                        <span className="flex items-center justify-center gap-2"><Zap className="w-5 h-5" />Commander maintenant</span>
                      </motion.button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Favoris */}
      <AnimatePresence>
        {showFavorites && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end px-4 pb-4" onClick={() => setShowFavorites(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl w-full max-h-[85vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2"><Heart className="w-6 h-6 text-[#C46210]" />Favoris ({favoritesCount})</h2>
                <motion.button onClick={() => setShowFavorites(false)} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center" whileHover={{ rotate: 90, scale: 1.1 }} whileTap={{ scale: 0.9 }}><X className="w-5 h-5 text-gray-600" /></motion.button>
              </div>
              <div className="p-6 space-y-4 pb-8">
                {favoritesCount === 0 ? (
                  <div className="text-center py-12"><Heart className="w-16 h-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-500 font-semibold mb-2">Aucun favori pour le moment</p><p className="text-sm text-gray-400">Appuie sur le cœur pour ajouter des produits</p></div>
                ) : (
                  allProducts.filter(p => favorites.has(p.id)).map((product, index) => (
                    <motion.div key={product.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }} className="bg-gradient-to-br from-orange-50 via-white to-orange-50 rounded-2xl p-4 border-2 border-gray-200">
                      <div className="flex items-start gap-3 mb-3">
                        <div className="w-20 h-20 bg-gray-200 rounded-xl overflow-hidden flex-shrink-0"><ImageWithFallback src={product.image} alt={product.name} className="w-full h-full object-cover" /></div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-1">
                            <h3 className="font-bold text-gray-900 text-lg">{product.name}</h3>
                            <motion.button onClick={() => { toggleFavorite(product.id); showToast(`${product.name} retiré des favoris`, 'info'); }} className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center" whileTap={{ scale: 0.9 }}><Heart className="w-4 h-4 text-red-500 fill-red-500" /></motion.button>
                          </div>
                          <p className="text-sm text-gray-500 mb-2 flex items-center gap-1"><MapPin className="w-3 h-3" /> {product.location}</p>
                          <p className="text-2xl font-bold text-[#C46210]">{product.price} F<span className="text-sm text-gray-500 ml-1">/{product.unit}</span></p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <motion.button onClick={() => { addToCart(product.id); showToast(`${product.name} ajouté au panier`, 'success'); }} className="flex-1 py-3 rounded-xl bg-[#C46210] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-md" whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}><ShoppingCart className="w-4 h-4" />Ajouter au panier</motion.button>
                        <motion.button onClick={() => setSelectedProduct(product)} className="px-4 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm" whileTap={{ scale: 0.95 }}>Détails</motion.button>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Paiement */}
      <AnimatePresence>
        {showPaymentModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end px-4 pb-4" onClick={() => { setShowPaymentModal(false); setPaymentMethod(null); setSelectedOperator(null); setPhoneNumber(''); setCardNumber(''); setShowMobileOperators(false); }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl w-full max-w-2xl mx-auto shadow-2xl overflow-hidden">
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
                <h2 className="text-xl font-bold text-gray-900">Mode de paiement</h2>
                <motion.button onClick={() => { setShowPaymentModal(false); setPaymentMethod(null); setSelectedOperator(null); setPhoneNumber(''); setCardNumber(''); setShowMobileOperators(false); }} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center" whileHover={{ rotate: 90, scale: 1.1 }} whileTap={{ scale: 0.9 }}><X className="w-5 h-5 text-gray-600" /></motion.button>
              </div>
              <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
                <div className="bg-orange-50 rounded-2xl p-4 mb-4"><p className="text-sm text-gray-600 mb-1">Montant à payer</p><p className="text-3xl font-bold text-[#C46210]"><Montant value={cartTotal} size="2xl" color="#C46210" /></p></div>
                <div className="rounded-2xl bg-gray-50 p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-gray-700">Informations de livraison</p>
                    <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700">
                      <input
                        type="checkbox"
                        checked={livraisonTierce}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setLivraisonTierce(checked);
                          if (checked) {
                            setLivraisonNom('');
                            setLivraisonTelephone('');
                          } else {
                            setLivraisonNom(`${user?.prenoms || ''} ${user?.nom || ''}`.trim());
                            setLivraisonTelephone(user?.telephone || '');
                          }
                        }}
                        className="accent-[#C46210]"
                      />
                      Livrer à une autre personne
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setModeReception('livraison')}
                      className={`py-2.5 rounded-2xl text-sm font-semibold transition-colors ${
                        modeReception === 'livraison'
                          ? 'bg-[#C66A2C] text-white'
                          : 'bg-white border-2 border-gray-200 text-gray-700'
                      }`}
                    >
                      Je veux être livré(e)
                    </button>
                    <button
                      type="button"
                      onClick={() => setModeReception('enlevement')}
                      className={`py-2.5 rounded-2xl text-sm font-semibold transition-colors ${
                        modeReception === 'enlevement'
                          ? 'bg-[#C66A2C] text-white'
                          : 'bg-white border-2 border-gray-200 text-gray-700'
                      }`}
                    >
                      J'envoie récupérer
                    </button>
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">
                      {modeReception === 'livraison' ? 'Nom complet' : 'Nom du livreur'}
                    </label>
                    <input
                      type="text"
                      value={livraisonNom}
                      onChange={(e) => setLivraisonNom(e.target.value)}
                      disabled={!livraisonTierce}
                      className={`w-full px-4 py-3 rounded-2xl border-2 focus:outline-none text-sm ${livraisonTierce ? 'bg-white border-gray-200 focus:border-[#C46210]' : 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'}`}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">
                      {modeReception === 'livraison' ? 'Téléphone' : 'Téléphone du livreur'}
                    </label>
                    <input
                      type="tel"
                      value={livraisonTelephone}
                      onChange={(e) => {
                        setLivraisonTelephone(e.target.value);
                        if (!livraisonTelephoneTouched) setLivraisonTelephoneTouched(true);
                      }}
                      onBlur={() => setLivraisonTelephoneTouched(true)}
                      disabled={!livraisonTierce}
                      className={`w-full px-4 py-3 rounded-2xl border-2 focus:outline-none text-sm ${
                        livraisonTierce
                          ? `${livraisonTelephoneTouched && !isValidPhoneCI(livraisonTelephone) ? 'border-red-400' : 'border-gray-200'} focus:border-[#C46210] bg-white`
                          : 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                    />
                    {livraisonTierce && livraisonTelephoneTouched && !isValidPhoneCI(livraisonTelephone) && (
                      <p className="text-xs text-red-500 mt-1">Numéro de téléphone invalide. Format attendu : 07XXXXXXXX</p>
                    )}
                  </div>
                  {modeReception === 'livraison' && (
                    <div>
                      <label className="text-sm font-semibold text-gray-700 block mb-1">Adresse / Localité</label>
                      <input
                        type="text"
                        value={livraisonLocalite}
                        onChange={(e) => setLivraisonLocalite(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#C46210] focus:outline-none text-sm bg-white"
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">Date de livraison (optionnel)</label>
                    <input
                      type="date"
                      value={livraisonDate}
                      onChange={(e) => setLivraisonDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#C46210] focus:outline-none text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">Notes (optionnel)</label>
                    <textarea
                      value={livraisonNotes}
                      onChange={(e) => setLivraisonNotes(e.target.value)}
                      rows={2}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#C46210] focus:outline-none text-sm bg-white resize-none"
                    />
                  </div>
                </div>
                {ALL_PAYMENT_METHODS.map((method) => {
                  const isSelected = paymentMethod === method.id;
                  const IconComp = method.icon || Zap;
                  return (
                    <div key={method.id}>
                      <motion.button onClick={() => { setPaymentMethod(method.id); if (method.id === 'mobile_money') { setShowMobileOperators(true); } else { setShowMobileOperators(false); setSelectedOperator(null); } }} className={`w-full p-4 rounded-2xl border-2 transition-all ${isSelected ? `border-[${method.borderColor}]` : 'bg-white border-gray-200'}`} style={isSelected ? { backgroundColor: method.bgColor, borderColor: method.borderColor } : {}} whileTap={{ scale: 0.98 }}>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: isSelected ? `${method.color}20` : '#F3F4F6' }}><IconComp className="w-6 h-6" style={{ color: isSelected ? method.color : '#6B7280' }} /></div>
                          <div className="flex-1 text-left"><h3 className="font-bold text-gray-900">{method.label}</h3><p className="text-xs text-gray-500 mt-0.5">{method.id === 'keiwa' ? `Solde: ${(keiwaBalance || 0).toLocaleString('fr-FR')} FCFA` : method.sublabel}</p></div>
                          {isSelected && <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500 }}><Check className="w-6 h-6" style={{ color: method.color }} /></motion.div>}
                        </div>
                      </motion.button>
                      <AnimatePresence>
                        {method.id === 'mobile_money' && isSelected && showMobileOperators && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                            <div className="grid grid-cols-2 gap-2 pt-2 px-1">
                              {MOBILE_OPERATORS.map((op) => (
                                <motion.button key={op.id} onClick={() => setSelectedOperator(op.id)} className={`p-3 rounded-xl border-2 transition-all ${selectedOperator === op.id ? 'border-current' : 'border-gray-200 bg-white'}`} style={selectedOperator === op.id ? { borderColor: op.color, backgroundColor: `${op.color}15` } : {}} whileTap={{ scale: 0.95 }}>
                                  <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: op.color }}><Smartphone className="w-4 h-4" style={{ color: op.textColor }} /></div><span className="text-sm font-bold text-gray-800">{op.name}</span></div>
                                </motion.button>
                              ))}
                            </div>
                            {selectedOperator && <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mt-2 px-1"><input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value.replace(/[^0-9+\s]/g, ''))} placeholder="+225 07 XX XX XX XX" className="w-full px-4 py-3 rounded-xl bg-white border-2 border-gray-200 focus:border-[#F59E0B] focus:outline-none text-base" maxLength={20} /></motion.div>}
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <AnimatePresence>
                        {method.id === 'card' && isSelected && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden pt-2 px-1">
                            <input type="text" value={cardNumber} onChange={(e) => setCardNumber(e.target.value.replace(/[^0-9]/g, '').slice(0, 16))} placeholder="Numéro de carte (16 chiffres)" className="w-full px-4 py-3 rounded-xl bg-white border-2 border-gray-200 focus:border-[#2563EB] focus:outline-none text-base" maxLength={16} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
                <motion.button onClick={handlePayment} disabled={!paymentMethod} className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg mt-4 ${paymentMethod ? 'bg-gradient-to-r from-[#C46210] to-[#D97706] text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`} whileTap={paymentMethod ? { scale: 0.95 } : {}} whileHover={paymentMethod ? { scale: 1.02 } : {}}>
                  {paymentMethod ? 'Valider la commande' : 'Choisir un mode de paiement'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal PIN */}
      <AnimatePresence>
        {showPinModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end px-4 pb-4" onClick={() => { setShowPinModal(false); setPinCode(''); }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl w-full max-w-2xl mx-auto shadow-2xl overflow-hidden">
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
                <h2 className="text-xl font-bold text-gray-900">Confirmer le paiement</h2>
                <motion.button onClick={() => { setShowPinModal(false); setPinCode(''); }} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center" whileHover={{ rotate: 90, scale: 1.1 }} whileTap={{ scale: 0.9 }}><X className="w-5 h-5 text-gray-600" /></motion.button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-orange-50 rounded-2xl p-4 mb-6"><p className="text-sm text-gray-600 mb-1">Montant à payer</p><p className="text-3xl font-bold text-[#C46210]">{(cartTotal || 0).toLocaleString('fr-FR')} FCFA</p></div>
                <div className="bg-gray-50 rounded-2xl p-4"><p className="text-sm text-gray-600 mb-1">Entrez votre code PIN à 4 chiffres</p><input type="password" value={pinCode} onChange={(e) => setPinCode(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-white border-2 border-gray-200 focus:border-[#C46210] focus:outline-none text-base placeholder:text-gray-400 shadow-sm" maxLength={4} /></div>
                <motion.button onClick={handlePinValidation} className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#C46210] to-[#D97706] text-white font-bold text-lg shadow-lg" whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>Valider</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Succès */}
      <AnimatePresence>
        {showSuccessModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end px-4 pb-4" onClick={() => setShowSuccessModal(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl w-full max-w-2xl mx-auto shadow-2xl overflow-hidden">
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
                <h2 className="text-xl font-bold text-gray-900">Commande validée</h2>
                <motion.button onClick={() => setShowSuccessModal(false)} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center" whileHover={{ rotate: 90, scale: 1.1 }} whileTap={{ scale: 0.9 }}><X className="w-5 h-5 text-gray-600" /></motion.button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-orange-50 rounded-2xl p-4 mb-6"><p className="text-sm text-gray-600 mb-1">Montant payé</p><p className="text-3xl font-bold text-[#C46210]">{(paidTotal || 0).toLocaleString('fr-FR')} FCFA</p></div>
                <div className="bg-gray-50 rounded-2xl p-4"><p className="text-sm text-gray-600 mb-1">Votre commande a été validée avec succès</p><p className="text-lg font-bold text-gray-900">Merci pour votre achat !</p></div>
                <motion.button onClick={() => setShowSuccessModal(false)} className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#C46210] to-[#D97706] text-white font-bold text-lg shadow-lg" whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>Fermer</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Erreur */}
      <AnimatePresence>
        {showErrorModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end px-4 pb-4" onClick={() => setShowErrorModal(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl w-full max-w-2xl mx-auto shadow-2xl overflow-hidden">
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
                <h2 className="text-xl font-bold text-gray-900">Erreur</h2>
                <motion.button onClick={() => setShowErrorModal(false)} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center" whileHover={{ rotate: 90, scale: 1.1 }} whileTap={{ scale: 0.9 }}><X className="w-5 h-5 text-gray-600" /></motion.button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-orange-50 rounded-2xl p-4 mb-6"><p className="text-sm text-gray-600 mb-1">Montant à payer</p><p className="text-3xl font-bold text-[#C46210]">{(cartTotal || 0).toLocaleString('fr-FR')} FCFA</p></div>
                <div className="bg-gray-50 rounded-2xl p-4"><p className="text-sm text-gray-600 mb-1">Une erreur s'est produite</p><p className="text-lg font-bold text-red-500">{errorMessage}</p></div>
                <motion.button onClick={() => setShowErrorModal(false)} className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#C46210] to-[#D97706] text-white font-bold text-lg shadow-lg" whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>Fermer</motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Négociation */}
      <AnimatePresence>
        {showNegotiationModal && productToNegotiate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end px-4 pb-4" onClick={() => { setShowNegotiationModal(false); setProductToNegotiate(null); }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl w-full max-w-2xl mx-auto shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
                <div><h2 className="text-xl font-bold text-gray-900">Négocier le prix</h2><p className="text-sm text-gray-500 mt-1">Propose ton prix à {productToNegotiate.sellerName}</p></div>
                <motion.button onClick={() => { setShowNegotiationModal(false); setProductToNegotiate(null); }} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center" whileHover={{ rotate: 90, scale: 1.1 }} whileTap={{ scale: 0.9 }}><X className="w-5 h-5 text-gray-600" /></motion.button>
              </div>
              <div className="p-6 space-y-5 overflow-y-auto">
                <div className={`rounded-2xl p-4 ${productToNegotiate.sellerType === 'producteur' ? 'bg-green-50' : 'bg-blue-50'}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-white rounded-2xl overflow-hidden shadow-sm"><ImageWithFallback src={productToNegotiate.image} alt={productToNegotiate.name} className="w-full h-full object-cover" /></div>
                    <div className="flex-1"><h3 className="text-lg font-bold text-gray-900">{productToNegotiate.name}</h3><p className="text-sm text-gray-600">{productToNegotiate.sellerName}</p><p className="text-xl font-bold text-[#C46210] mt-1">{productToNegotiate.price} FCFA<span className="text-sm text-gray-500">/{productToNegotiate.unit}</span></p></div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <label className="text-sm font-semibold text-gray-700 mb-3 block">Quantité ({productToNegotiate.unit})</label>
                  <div className="flex items-center gap-3">
                    <motion.button onClick={() => setNegotiationQuantity(Math.max(1, negotiationQuantity - 1))} className="w-12 h-12 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-center" whileTap={{ scale: 0.9 }}><Minus className="w-5 h-5 text-gray-600" /></motion.button>
                    <input type="number" value={negotiationQuantity} onChange={(e) => setNegotiationQuantity(Math.max(1, parseInt(e.target.value) || 1))} className="flex-1 px-4 py-3 rounded-xl bg-white border-2 border-gray-200 focus:border-[#C46210] focus:outline-none text-center font-bold text-xl" />
                    <motion.button onClick={() => setNegotiationQuantity(negotiationQuantity + 1)} className="w-12 h-12 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-center" whileTap={{ scale: 0.9 }}><Plus className="w-5 h-5 text-gray-600" /></motion.button>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <label className="text-sm font-semibold text-gray-700 mb-3 block">Ton prix proposé (FCFA/{productToNegotiate.unit})</label>
                  <div className="flex items-center gap-3">
                    <motion.button onClick={() => setNegotiationPrice(Math.max(50, negotiationPrice - 50))} className="w-12 h-12 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-center" whileTap={{ scale: 0.9 }}><Minus className="w-5 h-5 text-gray-600" /></motion.button>
                    <input type="number" value={negotiationPrice} onChange={(e) => setNegotiationPrice(Math.max(0, parseInt(e.target.value) || 0))} className="flex-1 px-4 py-3 rounded-xl bg-white border-2 border-gray-200 focus:border-[#C46210] focus:outline-none text-center font-bold text-xl" />
                    <motion.button onClick={() => setNegotiationPrice(negotiationPrice + 50)} className="w-12 h-12 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-center" whileTap={{ scale: 0.9 }}><Plus className="w-5 h-5 text-gray-600" /></motion.button>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                    <div><p className="text-sm text-gray-600">Prix catalogue</p><p className="text-lg font-bold text-gray-400 line-through">{(productToNegotiate.price * negotiationQuantity).toLocaleString()} <span className="text-[11px] opacity-60">FCFA</span></p></div>
                    <div className="text-right"><p className="text-sm text-gray-600">Ton total</p><p className="text-2xl font-bold text-[#C46210]"><Montant value={negotiationPrice * negotiationQuantity} size="xl" color="#C46210" /></p></div>
                  </div>
                  {negotiationPrice < productToNegotiate.price && <div className="mt-3 bg-green-100 rounded-lg p-3 text-center"><p className="text-sm font-bold text-green-700">Économie: {(((productToNegotiate.price - negotiationPrice) / productToNegotiate.price) * 100).toFixed(0)}%</p></div>}
                </div>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <label className="text-sm font-semibold text-gray-700 mb-3 block">Message (optionnel)</label>
                  <textarea value={negotiationMessage} onChange={(e) => setNegotiationMessage(e.target.value)} placeholder="Ajoute un message pour justifier ton prix..." className="w-full px-4 py-3 rounded-xl bg-white border-2 border-gray-200 focus:border-[#C46210] focus:outline-none text-sm resize-none" rows={3} />
                </div>
                <motion.button onClick={handleNegotiationSubmit} className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#C46210] to-[#D97706] text-white font-bold text-lg shadow-lg flex items-center justify-center gap-2" whileTap={{ scale: 0.95 }} whileHover={{ scale: 1.02 }}>
                  <MessageSquare className="w-5 h-5" />Envoyer la proposition
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Succès Négociation */}
      <AnimatePresence>
        {showNegotiationSuccess && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end px-4 pb-4" onClick={() => { setShowNegotiationSuccess(false); setShowCart(false); }}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl w-full max-w-2xl mx-auto shadow-2xl overflow-hidden">
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
                <h2 className="text-xl font-bold text-gray-900">Proposition envoyée</h2>
                <motion.button onClick={() => { setShowNegotiationSuccess(false); setShowCart(false); }} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center" whileHover={{ rotate: 90, scale: 1.1 }} whileTap={{ scale: 0.9 }}><X className="w-5 h-5 text-gray-600" /></motion.button>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-center mb-4"><div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center"><MessageSquare className="w-10 h-10 text-green-600" /></div></div>
                <div className="bg-gray-50 rounded-2xl p-4 text-center"><p className="text-lg font-bold text-gray-900 mb-2">Ta proposition a été envoyée</p><p className="text-sm text-gray-600">Le vendeur va étudier ton prix et te répondra bientôt. Tu recevras une notification dès qu'il aura fait une contre-proposition.</p></div>
                <div className="bg-orange-50 rounded-2xl p-4"><p className="text-sm text-gray-700"><strong>Astuce:</strong> Va dans <strong>Mes Commandes</strong> pour suivre l'état de tes négociations</p></div>
                <div className="grid grid-cols-2 gap-3">
                  <motion.button onClick={() => { setShowNegotiationSuccess(false); setShowCart(false); navigate('/marchand/commandes'); }} className="py-3 rounded-xl bg-[#C46210] text-white font-bold" whileTap={{ scale: 0.95 }}>Mes Commandes</motion.button>
                  <motion.button onClick={() => { setShowNegotiationSuccess(false); setShowCart(false); }} className="py-3 rounded-xl bg-white border-2 border-gray-200 text-gray-700 font-bold" whileTap={{ scale: 0.95 }}>Continuer</motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Republication marche cooperatif */}
      <AnimatePresence>
        {showRepublierModal && produitARepublier && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end px-4 pb-4" onClick={() => { setShowRepublierModal(false); setProduitARepublier(null); }} role="dialog" aria-modal="true" aria-labelledby="republier-titre">
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25 }} onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl w-full max-w-2xl mx-auto shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
                <div><h2 id="republier-titre" className="text-xl font-bold text-gray-900">Republier sur le marché coopératif</h2><p className="text-sm text-gray-500 mt-1">Fixe ton prix et ta quantité de revente</p></div>
                <motion.button type="button" onClick={() => { setShowRepublierModal(false); setProduitARepublier(null); }} className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center" whileHover={{ rotate: 90, scale: 1.1 }} whileTap={{ scale: 0.9 }}><X className="w-5 h-5 text-gray-600" /></motion.button>
              </div>
              <div className="p-6 space-y-5 overflow-y-auto">
                <div className="bg-blue-50 rounded-2xl p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-white rounded-2xl overflow-hidden shadow-sm"><ImageWithFallback src={produitARepublier.image} alt={produitARepublier.name} className="w-full h-full object-cover" /></div>
                    <div className="flex-1"><h3 className="text-lg font-bold text-gray-900">{produitARepublier.name}</h3><p className="text-sm text-gray-600">Prix producteur : {produitARepublier.price} <span className="text-xs">FCFA</span>/{produitARepublier.unit}</p></div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <label className="text-sm font-semibold text-gray-700 mb-3 block">Quantité ({produitARepublier.unit})</label>
                  <div className="flex items-center gap-3">
                    <motion.button type="button" onClick={() => setRepublierQuantite(Math.max(1, republierQuantite - 1))} className="w-12 h-12 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-center" whileTap={{ scale: 0.9 }}><Minus className="w-5 h-5 text-gray-600" /></motion.button>
                    <input type="number" value={republierQuantite} onChange={(e) => setRepublierQuantite(Math.max(1, parseInt(e.target.value) || 1))} className="flex-1 px-4 py-3 rounded-xl bg-white border-2 border-gray-200 focus:border-[#2072AF] focus:outline-none text-center font-bold text-xl" />
                    <motion.button type="button" onClick={() => setRepublierQuantite(republierQuantite + 1)} className="w-12 h-12 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-center" whileTap={{ scale: 0.9 }}><Plus className="w-5 h-5 text-gray-600" /></motion.button>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4">
                  <label className="text-sm font-semibold text-gray-700 mb-3 block">Ton prix de revente (FCFA/{produitARepublier.unit})</label>
                  <div className="flex items-center gap-3">
                    <motion.button type="button" onClick={() => setRepublierPrix(Math.max(50, republierPrix - 50))} className="w-12 h-12 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-center" whileTap={{ scale: 0.9 }}><Minus className="w-5 h-5 text-gray-600" /></motion.button>
                    <input type="number" value={republierPrix} onChange={(e) => setRepublierPrix(Math.max(0, parseInt(e.target.value) || 0))} className="flex-1 px-4 py-3 rounded-xl bg-white border-2 border-gray-200 focus:border-[#2072AF] focus:outline-none text-center font-bold text-xl" />
                    <motion.button type="button" onClick={() => setRepublierPrix(republierPrix + 50)} className="w-12 h-12 rounded-xl bg-white border-2 border-gray-200 flex items-center justify-center" whileTap={{ scale: 0.9 }}><Plus className="w-5 h-5 text-gray-600" /></motion.button>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                    <div><p className="text-sm text-gray-600">Quantité totale</p><p className="text-lg font-bold text-gray-900">{republierQuantite} {produitARepublier.unit}</p></div>
                    <div className="text-right"><p className="text-sm text-gray-600">Valeur totale</p><p className="text-2xl font-bold text-[#2072AF]"><Montant value={republierPrix * republierQuantite} size="xl" color="#2072AF" /></p></div>
                  </div>
                </div>
                <motion.button type="button" onClick={handleRepublierSubmit} disabled={savingRepublier || republierPrix <= 0 || republierQuantite <= 0} className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 ${savingRepublier || republierPrix <= 0 || republierQuantite <= 0 ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-[#2072AF] text-white'}`} whileTap={savingRepublier ? {} : { scale: 0.95 }}>
                  <Store className="w-5 h-5" />{savingRepublier ? 'Publication...' : 'Republier'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal signalement */}
      {showSignalementModal && signalementCommande && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, zIndex: 1000 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="signalement-titre"
          onClick={() => { if (!signalementLoading) { setShowSignalementModal(false); setSignalementCommande(null); } }}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 border-2 border-gray-100"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="signalement-titre" className="text-lg font-black text-gray-900 mb-1">
              Signaler une commande
            </h2>
            <p className="text-sm font-bold text-gray-800 mb-0.5">{signalementCommande.produit}</p>
            <p className="text-sm text-gray-600 mb-4">
              Montant :{' '}
              <span className="font-black text-[#C46210]">
                {((signalementCommande as { total?: number }).total ?? signalementCommande.montantTotal ?? 0).toLocaleString('fr-FR')} FCFA
              </span>
            </p>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Type de signalement</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {(
                [
                  { id: 'fraude', label: 'Fraude' },
                  { id: 'spam', label: 'Spam' },
                  { id: 'contenu_abusif', label: 'Contenu abusif' },
                  { id: 'doublon', label: 'Doublon' },
                  { id: 'usurpation', label: 'Usurpation' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSignalementType(opt.id)}
                  className={`px-3 py-2 rounded-full text-xs font-bold border-2 transition-colors ${
                    signalementType === opt.id
                      ? 'bg-[#C46210] border-[#C46210] text-white'
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:border-[#C46210]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Description</label>
            <textarea
              value={signalementDescription}
              onChange={(e) => setSignalementDescription(e.target.value)}
              placeholder="Décris le problème rencontré…"
              rows={4}
              className="w-full px-3 py-2 rounded-xl border-2 border-gray-200 text-sm focus:border-[#C46210] focus:outline-none resize-none mb-4"
            />
            <div className="flex gap-3">
              <button
                type="button"
                disabled={signalementLoading}
                onClick={() => { setShowSignalementModal(false); setSignalementCommande(null); }}
                className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-700 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={signalementLoading || !signalementDescription.trim()}
                onClick={() => { void handleSubmitSignalement(); }}
                className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {signalementLoading ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tata Lou */}

      <ToastContainer />
    </SubPageLayout>
  );
}
