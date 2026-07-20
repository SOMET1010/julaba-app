import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sprout, 
  Package, 
  Heart,
  TrendingDown,
  Plus,
  TrendingUp, CheckCircle,
  Edit3,
  AlertTriangle,
  Mic,
  SlidersHorizontal,
  ChevronDown,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useProducteur } from '../../contexts/ProducteurContext';
import { useApp } from '../../contexts/AppContext';
import { useCountUp } from '../../hooks/useCountUp';
import { NotificationButton } from '../marchand/NotificationButton';
import { CommandeMarche } from '../marche/marketplace-data';
import { useCommande } from '../../contexts/CommandeContext';
import { PublierRecolteModal } from './PublierRecolteModal';
import { ModifierPublicationModal } from './ModifierPublicationModal';
import { CreerPlantationModal } from './CreerPlantationModal';
import { RecolteDetailModal } from './RecolteDetailModal';
import { ProductionKPIBar } from './ProductionKPIBar';
import { PlantationDetailModal } from './PlantationDetailModal';
import { SubPageLayout } from '../layout/SubPageLayout';
import { SearchBar } from '../shared/SearchBar';
import {
  IMG_PRODUIT_TOMATE, IMG_PRODUIT_AUBERGINE, IMG_PRODUIT_PIMENT, IMG_PRODUIT_GOMBO,
  IMG_PRODUIT_MANIOC, IMG_PRODUIT_IGNAME, IMG_PRODUIT_MAIS, IMG_PRODUIT_RIZ,
  IMG_PRODUIT_BANANE, IMG_PRODUIT_OIGNON, IMG_PRODUIT_AVOCAT, IMG_PRODUIT_AUTRE
} from '../../assets/images';
const imgTomate    = IMG_PRODUIT_TOMATE;
const imgAubergine = IMG_PRODUIT_AUBERGINE;
const imgPiment    = IMG_PRODUIT_PIMENT;
const imgGombo     = IMG_PRODUIT_GOMBO;
const imgManioc    = IMG_PRODUIT_MANIOC;
const imgIgname    = IMG_PRODUIT_IGNAME;
const imgMais      = IMG_PRODUIT_MAIS;
const imgRiz       = IMG_PRODUIT_RIZ;
const imgBanane    = IMG_PRODUIT_BANANE;
const imgOignon    = IMG_PRODUIT_OIGNON;
const imgAvocat    = IMG_PRODUIT_AVOCAT;
const imgAutre     = IMG_PRODUIT_AUTRE;

const PRIMARY_COLOR = '#2E8B57';

const FILTRES_PRODUITS = [
  { id: 'tous',          label: 'Tous',           img: null },
  { id: 'Tomate',        label: 'Tomate',         img: imgTomate },
  { id: 'Aubergine',     label: 'Aubergine',      img: imgAubergine },
  { id: 'Piment',        label: 'Piment',         img: imgPiment },
  { id: 'Gombo',         label: 'Gombo',          img: imgGombo },
  { id: 'Manioc',        label: 'Manioc',         img: imgManioc },
  { id: 'Igname',        label: 'Igname',         img: imgIgname },
  { id: 'Maïs',          label: 'Maïs',           img: imgMais },
  { id: 'Riz',           label: 'Riz',            img: imgRiz },
  { id: 'Banane plantain', label: 'Banane',       img: imgBanane },
  { id: 'Oignon',        label: 'Oignon',         img: imgOignon },
  { id: 'Avocat',        label: 'Avocat',         img: imgAvocat },
  { id: 'Autre',         label: 'Autre',          img: imgAutre },
];

export function ProducteurProduction() {
  const navigate = useNavigate();
  const { stats, cycles, recoltes, publications, refreshAllData } = useProducteur();
  const { speak, user } = useApp();
  const { commandes } = useCommande();
  const speakThrottleRef = useRef<number>(0);

  useEffect(() => {
    let isRunning = false;
    const interval = setInterval(async () => {
      if (isRunning || document.hidden) return;
      isRunning = true;
      try { await refreshAllData(); }
      catch (e: any) { console.warn('[ProducteurProduction] refreshAllData failed:', e?.message); }
      finally { isRunning = false; }
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshAllData]);

  const totalAlertes = (stats?.commandesEnCours ?? 0);

  // Commandes du context uniquement
  const commandesMarcheFromContext: CommandeMarche[] = commandes
    .filter(c => c.vendeurId === user?.id)
    .map(c => ({
      id: c.id,
      acheteurType: 'marchand' as const,
      acheteurNom: c.acheteurNom || 'Marchand',
      vendeurType: 'producteur' as const,
      vendeurId: c.vendeurId,
      vendeurNom: user?.prenoms || user?.nom || 'Producteur',
      produit: c.produit,
      quantite: c.quantite,
      unite: 'kg',
      prixUnitaire: c.prixUnitaire,
      montantTotal: Number(c.total) || 0,
      statut: c.statut === 'confirmee' ? 'acceptee' as const : c.statut as typeof c.statut,
      dateCreation: c.dateCommande,
      dateLivraison: c.dateLivraison || '',
      modePaiement: c.modePaiement,
      operateurMobile: c.operateurMobile,
    }));

  const historiqueCommandes = commandesMarcheFromContext;

  const [activeTab, setActiveTab] = useState<'cycles' | 'recoltes' | 'publications' | 'historique'>('cycles');
  const [historiqueTab, setHistoriqueTab] = useState<'ventes' | 'saisons'>('ventes');
  const [selectedCategory, setSelectedCategory] = useState('tous');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [showFilterPanel, setShowFilterPanel] = useState(false);

  const toggleFavorite = (id: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(id)) newFavorites.delete(id);
    else newFavorites.add(id);
    setFavorites(newFavorites);
  };

  // Filtre dynamique : par recherche texte ET par catégorie produit
  const filterItems = (items: any[], getCulture: (item: any) => string) =>
    items.filter((item) => {
      const culture = getCulture(item)?.toLowerCase() ?? '';
      const matchSearch = searchQuery.trim() === '' || culture.includes(searchQuery.toLowerCase());
      const matchCat = selectedCategory === 'tous' || getCulture(item) === selectedCategory;
      return matchSearch && matchCat;
    });

  const cyclesActifs     = cycles.filter(c => c.status !== 'completed');
  const cyclesTermines   = cycles.filter(c => c.status === 'completed');
  const cyclesFiltres    = filterItems(cyclesActifs, (c) => c.culture);
  const recoltesFiltrees = filterItems(recoltes, (r) => r.produit ?? '');
  const publicationsFiltrees = filterItems(publications, (p) => {
    const cycle = cycles.find((c) => c.id === p.cycleId);
    return cycle?.culture ?? '';
  });

  return (
    <SubPageLayout
      role="producteur"
      title="Marché Producteur"
      rightContent={
        <div className="flex items-center gap-2">
          {totalAlertes > 0 && (
            <motion.button
              onClick={() => navigate('/producteur/alertes')}
              className="relative w-11 h-11 rounded-2xl flex items-center justify-center bg-orange-50 border-2 border-orange-200"
              whileTap={{ scale: 0.9 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              <motion.div
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring' }}
              >
                <span className="text-white text-xs font-bold">{totalAlertes}</span>
              </motion.div>
            </motion.button>
          )}
          <NotificationButton />
        </div>
      }
    >
      <div className="pb-32 lg:pb-8">

        {/* ── KPIs dynamiques — toutes les vues ── */}
        <ProductionKPIBar activeTab={activeTab} historiqueTab={historiqueTab} />

        {/* 2. Barre de recherche + filtre produits */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5"
        >
          <div className="flex gap-2 items-stretch">
            <div className="flex-1 min-w-0">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Recherche une culture, une récolte..."
                primaryColor="#2E8B57"
                voiceEnabled={false}
              />
            </div>
            <motion.button
              type="button"
              onClick={() => setShowFilterPanel(!showFilterPanel)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 self-stretch ${
                selectedCategory !== 'tous' || showFilterPanel
                  ? 'bg-[#2E8B57] border-[#2E8B57] text-white shadow-md'
                  : 'bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200'
              }`}
              whileTap={{ scale: 0.92 }}
            >
              <SlidersHorizontal className="w-4 h-4" strokeWidth={2.5} />
              {selectedCategory !== 'tous' ? (
                <img
                  src={FILTRES_PRODUITS.find(f => f.id === selectedCategory)?.img ?? undefined}
                  alt={selectedCategory}
                  className="w-5 h-5 object-contain"
                />
              ) : (
                <span className="text-xs font-bold">Filtre</span>
              )}
              <ChevronDown
                className={`w-3 h-3 transition-transform ${showFilterPanel ? 'rotate-180' : ''}`}
                strokeWidth={2.5}
              />
            </motion.button>
          </div>

          {/* Panneau filtre déroulant */}
          <AnimatePresence>
            {showFilterPanel && (
              <motion.div
                initial={{ opacity: 0, y: -8, scaleY: 0.95 }}
                animate={{ opacity: 1, y: 0, scaleY: 1 }}
                exit={{ opacity: 0, y: -8, scaleY: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="mt-2 bg-white rounded-2xl border-2 border-gray-200 shadow-xl p-3 origin-top"
              >
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {FILTRES_PRODUITS.map((f, index) => {
                    const isActive = selectedCategory === f.id;
                    return (
                      <motion.button
                        key={f.id}
                        onClick={() => {
                          setSelectedCategory(f.id);
                          const now = Date.now();
                          if (now - speakThrottleRef.current > 500) {
                            speakThrottleRef.current = now;
                            speak(f.label);
                          }
                          setShowFilterPanel(false);
                        }}
                        className={`flex-shrink-0 flex flex-col items-center gap-1 rounded-2xl px-3 py-2 border-2 transition-all ${
                          isActive
                            ? 'border-[#2E8B57] shadow-md'
                            : 'bg-gray-50 border-transparent hover:border-green-300'
                        }`}
                        style={isActive ? { backgroundColor: `${PRIMARY_COLOR}15`, borderColor: PRIMARY_COLOR } : {}}
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.025 }}
                        whileTap={{ scale: 0.88 }}
                        whileHover={{ scale: 1.06, y: -2 }}
                      >
                        {f.img ? (
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-white shadow-sm' : 'bg-white'}`}>
                            <img src={f.img} alt={f.label} className="w-7 h-7 object-contain" />
                          </div>
                        ) : (
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isActive ? 'bg-white shadow-sm' : 'bg-gray-100'}`}>
                            <Package className="w-5 h-5" style={{ color: isActive ? PRIMARY_COLOR : '#9ca3af' }} strokeWidth={2.5} />
                          </div>
                        )}
                        <span
                          className="text-[10px] font-bold"
                          style={{ color: isActive ? PRIMARY_COLOR : '#6b7280' }}
                        >
                          {f.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* 3. Tabs Cycles/Récoltes/Publications */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-4"
        >
          <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-1.5 shadow-sm border border-gray-200">
            <div className="grid grid-cols-4 gap-1">
              {/* Tab Ma Plantation */}
              <motion.button
                onClick={() => {
                  setActiveTab('cycles');
                  const now = Date.now();
                  if (now - speakThrottleRef.current > 500) {
                    speakThrottleRef.current = now;
                    speak('Ma Plantation');
                  }
                }}
                className={`relative flex items-center justify-center text-center px-2 py-4 rounded-xl font-bold transition-all ${
                  activeTab === 'cycles'
                    ? 'bg-gradient-to-r from-[#2E8B57] to-[#3BA869] text-white shadow-md'
                    : 'bg-transparent text-gray-600 hover:bg-gray-50'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-[13px] leading-tight">Ma Plantation</span>
                {activeTab === 'cycles' && (
                  <motion.div
                    className="absolute inset-0 bg-white/20 rounded-xl"
                    layoutId="activeTab"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>

              {/* Tab Récoltes */}
              <motion.button
                onClick={() => {
                  setActiveTab('recoltes');
                  const now = Date.now();
                  if (now - speakThrottleRef.current > 500) {
                    speakThrottleRef.current = now;
                    speak('Mes récoltes');
                  }
                }}
                className={`relative flex items-center justify-center text-center px-2 py-4 rounded-xl font-bold transition-all ${
                  activeTab === 'recoltes'
                    ? 'bg-gradient-to-r from-[#2E8B57] to-[#3BA869] text-white shadow-md'
                    : 'bg-transparent text-gray-600 hover:bg-gray-50'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-[13px] leading-tight">Mes Récoltes</span>
                {activeTab === 'recoltes' && (
                  <motion.div
                    className="absolute inset-0 bg-white/20 rounded-xl"
                    layoutId="activeTab"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>

              {/* Tab Publications */}
              <motion.button
                onClick={() => {
                  setActiveTab('publications');
                  const now = Date.now();
                  if (now - speakThrottleRef.current > 500) {
                    speakThrottleRef.current = now;
                    speak('Mon Marché');
                  }
                }}
                className={`relative flex items-center justify-center text-center px-2 py-4 rounded-xl font-bold transition-all ${
                  activeTab === 'publications'
                    ? 'bg-gradient-to-r from-[#2E8B57] to-[#3BA869] text-white shadow-md'
                    : 'bg-transparent text-gray-600 hover:bg-gray-50'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-[13px] leading-tight">Mon Marché</span>
                {activeTab === 'publications' && (
                  <motion.div
                    className="absolute inset-0 bg-white/20 rounded-xl"
                    layoutId="activeTab"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>

              {/* Tab Historique Ventes */}
              <motion.button
                onClick={() => {
                  setActiveTab('historique');
                  const now = Date.now();
                  if (now - speakThrottleRef.current > 500) {
                    speakThrottleRef.current = now;
                    speak('Mon Historique de ventes');
                  }
                }}
                className={`relative flex items-center justify-center text-center px-2 py-4 rounded-xl font-bold transition-all ${
                  activeTab === 'historique'
                    ? 'bg-gradient-to-r from-[#2E8B57] to-[#3BA869] text-white shadow-md'
                    : 'bg-transparent text-gray-600 hover:bg-gray-50'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                <span className="text-[13px] leading-tight">Mon Historique</span>
                {activeTab === 'historique' && (
                  <motion.div
                    className="absolute inset-0 bg-white/20 rounded-xl"
                    layoutId="activeTab"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            </div>
          </div>

          {/* Description de la vue active */}
          <motion.p
            key={activeTab}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-sm text-gray-600 text-center"
          >
            {activeTab === 'cycles' 
              ? 'Gère tes plantations de la mise en terre à la récolte'
              : activeTab === 'recoltes'
              ? 'Consulte et valorise tes récoltes disponibles'
              : activeTab === 'publications'
              ? 'Produits actuellement visibles sur le marché'
              : 'Toutes tes transactions de vente'
            }
          </motion.p>
        </motion.div>

        {/* 5. Contenu selon le tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'cycles' && (
            <CyclesView
              key="cycles"
              cycles={cyclesFiltres}
              onPlantationCloture={() => setActiveTab('historique')}
            />
          )}
          {activeTab === 'recoltes' && (
            <RecoltesView 
              key="recoltes" 
              recoltes={recoltesFiltrees} 
              favorites={favorites}
              toggleFavorite={toggleFavorite}
            />
          )}
          {activeTab === 'publications' && (
            <PublicationsView 
              key="publications"
              publications={publicationsFiltrees}
            />
          )}
          {activeTab === 'historique' && (
            <motion.div
              key="historique"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <HistoriqueView
                historiqueCommandes={historiqueCommandes}
                cyclesTermines={cyclesTermines}
                recoltes={recoltes}
                sousTab={historiqueTab}
                setSousTab={setHistoriqueTab}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </SubPageLayout>
  );
}

// Vue Plantations
function CyclesView({ cycles, onPlantationCloture }: { cycles: any[]; onPlantationCloture?: () => void }) {
  const { speak } = useApp();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<any | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-4"
    >
      {/* Bouton Créer */}
      <motion.button
        onClick={() => {
          speak('Suivre une nouvelle plantation');
          setShowCreateModal(true);
        }}
        className="w-full bg-gradient-to-r from-[#2E8B57] to-[#3BA869] text-white rounded-2xl p-5 flex items-center justify-center gap-3 shadow-lg font-bold text-lg"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
        Nouvelle plantation
      </motion.button>

      {/* Liste des cycles */}
      {cycles.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
          <Sprout className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Aucune plantation</p>
          <p className="text-sm text-gray-500 mt-2">Crée ta première plantation pour démarrer</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {cycles.map((cycle, index) => {
            const recolteDate = cycle.dateRecolteEstimee && !isNaN(new Date(cycle.dateRecolteEstimee).getTime()) ? new Date(cycle.dateRecolteEstimee).getTime() : null;
            const plantationDate = cycle.datePlantation && !isNaN(new Date(cycle.datePlantation).getTime()) ? new Date(cycle.datePlantation).getTime() : null;
            const daysUntilHarvest = recolteDate ? Math.floor((recolteDate - Date.now()) / (1000 * 60 * 60 * 24)) : null;
            const isOverdue = daysUntilHarvest !== null && daysUntilHarvest < 0 && cycle.status === 'active';
            const isUrgent = daysUntilHarvest !== null && daysUntilHarvest >= 0 && daysUntilHarvest <= 7 && cycle.status === 'active';
            const daysSincePlanting = plantationDate ? Math.floor((Date.now() - plantationDate) / (1000 * 60 * 60 * 24)) : 0;
            const totalDays = recolteDate && plantationDate ? Math.floor((recolteDate - plantationDate) / (1000 * 60 * 60 * 24)) : 0;
            const progressPercent = totalDays > 0 ? Math.min(100, Math.max(0, (daysSincePlanting / totalDays) * 100)) : 0;

            return (
              <motion.div
                key={cycle.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="bg-gradient-to-br from-green-50 via-white to-green-50 rounded-3xl p-5 shadow-lg border-2 border-green-200 cursor-pointer"
                whileHover={{ scale: 1.01, y: -4, boxShadow: '0 12px 30px rgba(46, 139, 87, 0.2)' }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSelectedCycle(cycle);
                  speak(`Détails de ta plantation de ${cycle.culture}`);
                }}
              >
                {/* Header avec icône et statut */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    {/* Grande icône */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2E8B57] to-[#3BA869] flex items-center justify-center shadow-lg overflow-hidden">
                      {(() => {
                        const produitImg = FILTRES_PRODUITS.find(f => f.id === cycle.culture)?.img;
                        return produitImg ? (
                          <img src={produitImg} alt={cycle.culture} className="w-full h-full object-cover" />
                        ) : cycle.photoUrl ? (
                          <img src={cycle.photoUrl} alt={cycle.culture} className="w-full h-full object-cover" />
                        ) : (
                          <Sprout className="w-16 h-16 text-green-500" />
                        );
                      })()}
                    </div>
                    
                    <div>
                      <h3 className="font-black text-gray-900 text-2xl mb-1">{cycle.culture}</h3>
                      <p className="text-base font-bold text-gray-900">{cycle.surface ? `${cycle.surface} hectares` : '— hectares'}</p>
                    </div>
                  </div>
                  
                  {/* Badge statut progressif */}
                  <span className="px-4 py-2 rounded-full text-xs font-bold shadow-md text-white" style={{
                    backgroundColor:
                      cycle.status === 'completed' ? '#3b82f6' :
                      cycle.status !== 'active' ? '#9ca3af' :
                      isOverdue ? '#ef4444' :
                      isUrgent ? '#f97316' :
                      progressPercent >= 75 ? '#15803d' :
                      progressPercent >= 50 ? '#16a34a' :
                      progressPercent >= 25 ? '#34d399' :
                      '#38bdf8'
                  }}>
                    {cycle.status === 'completed' ? 'Récolté' :
                     cycle.status !== 'active' ? 'Préparation' :
                     isOverdue ? 'En retard' :
                     isUrgent ? 'Récolter bientôt' :
                     progressPercent >= 75 ? 'Presque prêt' :
                     progressPercent >= 50 ? 'Bien avancé' :
                     progressPercent >= 25 ? 'En croissance' :
                     'Démarrage'}
                  </span>
                </div>

                {/* Barre de progression */}
                {cycle.status === 'active' && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-gray-700">Croissance</span>
                      <span className="text-sm font-black text-green-600">{Math.round(progressPercent)}%</span>
                    </div>
                    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 1, delay: index * 0.1 }}
                        className="h-full bg-gradient-to-r from-[#2E8B57] to-[#3BA869] rounded-full"
                      />
                    </div>
                  </div>
                )}

                {/* Infos en grille - SIMPLIFIÉES */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Date de récolte */}
                  <div className={`rounded-2xl p-4 ${
                    isOverdue ? 'bg-red-100 border-2 border-red-400' :
                    isUrgent ? 'bg-orange-100 border-2 border-orange-400' : 'bg-white border-2 border-gray-200'
                  }`}>
                    <p className="text-xs text-gray-600 font-bold mb-1">Récolte prévue</p>
                    <p className="text-lg font-black text-gray-900">
                      {recolteDate ? new Date(recolteDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '—'}
                    </p>
                    {daysUntilHarvest === null ? (
                      <p className="text-xs text-gray-400 font-medium mt-1">Date non définie</p>
                    ) : daysUntilHarvest !== null && daysUntilHarvest < 0 ? (
                      <p className="text-xs text-red-600 font-black mt-1">
                        En retard ({Math.abs(daysUntilHarvest)}j)
                      </p>
                    ) : isUrgent ? (
                      <p className="text-xs text-orange-600 font-black mt-1">
                        Bientôt ! ({daysUntilHarvest}j)
                      </p>
                    ) : (
                      <p className="text-xs text-gray-500 font-medium mt-1">
                        Dans {daysUntilHarvest} jours
                      </p>
                    )}
                  </div>

                  {/* Quantité estimée */}
                  <div className="bg-white rounded-2xl p-4 border-2 border-gray-200">
                    <p className="text-xs text-gray-600 font-bold mb-1">Récolte attendue</p>
                    <p className="text-lg font-black text-green-600">
                      {(cycle.quantiteEstimee || 0).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 font-medium mt-1">
                      kilogrammes
                    </p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal de création de cycle */}
      {showCreateModal && (
        <CreerPlantationModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {/* Modal détail plantation */}
      {selectedCycle && (
        <PlantationDetailModal
          cycle={selectedCycle}
          onClose={() => setSelectedCycle(null)}
          onCloture={() => {
            setSelectedCycle(null);
            onPlantationCloture?.();
          }}
        />
      )}
    </motion.div>
  );
}

// Vue Récoltes - GRILLE 2 COLONNES IDENTIQUE au Marché Virtuel
interface RecoltesViewProps {
  recoltes: any[];
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
}

function RecoltesView({ recoltes, favorites, toggleFavorite }: RecoltesViewProps) {
  const { speak } = useApp();
  const { cycles, publications } = useProducteur();
  const [selectedRecolte, setSelectedRecolte] = useState<any | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<any | null>(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [detailRecolte, setDetailRecolte] = useState<any | null>(null);
  const [detailCycle, setDetailCycle] = useState<any | null>(null);
  const navigate = useNavigate();

  const handlePublish = (recolte: any, cycle: any) => {
    setSelectedRecolte(recolte);
    setSelectedCycle(cycle);
    setShowPublishModal(true);
  };

  const handleCardClick = (recolte: any, cycle: any) => {
    setDetailRecolte(recolte);
    setDetailCycle(cycle);
    speak(`Détails de ${cycle?.culture || 'la récolte'}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {/* Bouton Déclarer récolte */}
      <motion.button
        onClick={() => {
          speak('Déclarer une récolte');
          navigate('/producteur/declarer-recolte');
        }}
        className="w-full mb-4 bg-gradient-to-r from-[#2E8B57] to-[#3BA869] text-white rounded-2xl p-5 flex items-center justify-center gap-3 shadow-lg font-bold text-lg"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <Mic className="w-6 h-6" strokeWidth={2.5} />
        Déclarer récolte
      </motion.button>

      {recoltes.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Aucune récolte</p>
          <p className="text-sm text-gray-500 mt-2">Tes récoltes apparaîtront ici</p>
        </div>
      ) : (
        <>
          {/* GRILLE 2 COLONNES - IDENTIQUE AU MARCHÉ VIRTUEL */}
          <div className="grid grid-cols-2 gap-3">
            {recoltes.map((recolte, index) => {
              const cycle = cycles.find(c => c.id === recolte.cycleId); const recolteProduit = recolte.produit || cycle?.culture || 'Culture';
              const isLowStock = recolte.quantiteDisponible < ((recolte.quantiteReelle ?? recolte.quantite ?? 0) * 0.2);

              return (
                <motion.div
                  key={recolte.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`relative bg-gradient-to-br from-orange-50 via-white to-orange-50 rounded-3xl overflow-hidden shadow-md border-2 cursor-pointer ${
                    isLowStock ? 'border-orange-400' : 'border-gray-200'
                  }`}
                  onClick={() => handleCardClick(recolte, cycle)}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02, y: -4, boxShadow: '0 10px 30px rgba(196, 98, 16, 0.15)' }}
                >
                  {/* Badge Stock Bas */}
                  {isLowStock && (
                    <div className="absolute top-2 right-2 z-10 bg-orange-500 text-white px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" />
                      Stock bas
                    </div>
                  )}

                  {/* Bouton Favori - IDENTIQUE */}
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(recolte.id);
                    }}
                    className="absolute top-2 left-2 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md"
                    whileTap={{ scale: 0.9 }}
                    whileHover={{ scale: 1.1 }}
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        favorites.has(recolte.id)
                          ? 'fill-red-500 text-red-500'
                          : 'text-gray-600'
                      }`}
                    />
                  </motion.button>

                  {/* Image */}
                  <div className="relative w-full aspect-square flex items-center justify-center overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)' }}>
                    {(() => {
                      const produitImg = FILTRES_PRODUITS.find(f => f.id === (recolte.produit || cycle?.culture))?.img;
                      return produitImg ? (
                        <img src={produitImg} alt={recolte.produit} className="w-full h-full object-cover" />
                      ) : recolte.photoUrl ? (
                        <img src={recolte.photoUrl} alt={recolte.produit} className="w-full h-full object-cover" />
                      ) : (
                        <Sprout className="w-16 h-16 text-green-400" />
                      );
                    })()}
                  </div>

                  {/* Info produit */}
                  <div className="p-3">
                    {/* Nom */}
                    <h3 className="font-black text-gray-900 text-base mb-1 line-clamp-1">
                      {recolte.produit || cycle?.culture || 'Culture'}
                    </h3>

                    {/* Localisation */}
                    <div className="flex items-center gap-1 mb-2">
                      <Package className="w-3 h-3 text-gray-400" />
                      <p className="text-[11px] text-gray-600">
                        {recolte.quantite || recolte.stockDisponible || 0} kg disponibles
                      </p>
                    </div>

                    {/* Prix - STYLE IDENTIQUE */}
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-2xl font-black text-[#C46210]">
                        {recolte.prixUnitaire || 0}
                      </span>
                      <span className="text-xs text-gray-600 font-semibold">FCFA/kg</span>
                    </div>

                    {/* Bouton Publier sur le marché */}
                    {(publications || []).some((p: any) => p.recolteId === recolte.id || p.recolte_id === recolte.id) ? (
                      <div className="w-full bg-green-100 text-green-700 py-2.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border-2 border-green-300">
                        <CheckCircle className="w-4 h-4" />
                        Publiée
                      </div>
                    ) : (
                      <motion.button
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePublish(recolte, cycle);
                        }}
                        className="w-full bg-gradient-to-r from-[#C46210] to-[#D97706] text-white py-2.5 px-4 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2"
                        whileTap={{ scale: 0.95 }}
                      >
                        <TrendingUp className="w-4 h-4" />
                        Publier
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Modal de publication */}
          {selectedRecolte && (
            <PublierRecolteModal
              recolte={selectedRecolte}
              cycle={selectedCycle || { culture: selectedRecolte?.produit, id: null }}
              isOpen={showPublishModal}
              onClose={() => {
                setShowPublishModal(false);
                setSelectedRecolte(null);
                setSelectedCycle(null);
              }}
            />
          )}

          {detailRecolte && (
            <RecolteDetailModal
              recolte={detailRecolte}
              cycle={detailCycle}
              onClose={() => { setDetailRecolte(null); setDetailCycle(null); }}
              onPublish={() => handlePublish(detailRecolte, detailCycle)}
            />
          )}
        </>
      )}
    </motion.div>
  );
}

// Vue Publications
interface PublicationsViewProps {
  publications: any[];
}

function PublicationsView({ publications }: PublicationsViewProps) {
  const { speak } = useApp();
  const { cycles, fetchPublications } = useProducteur();
  const [selectedPublication, setSelectedPublication] = useState<any | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<any | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const handleEdit = (publication: any, cycle: any) => {
    setSelectedPublication(publication);
    setSelectedCycle(cycle);
    setShowEditModal(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      {publications.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Aucune publication</p>
          <p className="text-sm text-gray-500 mt-2">Tes publications apparaîtront ici</p>
        </div>
      ) : (
        <>
          {/* GRILLE 2 COLONNES - IDENTIQUE AU MARCHÉ VIRTUEL */}
          <div className="grid grid-cols-2 gap-3">
            {publications.map((publication, index) => {
              const cycle = cycles.find(c => c.id === publication.cycleId);
              const isLowStock = publication.stockDisponible < (publication.quantiteDisponible * 0.2);

              return (
                <motion.div
                  key={publication.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className={`relative bg-gradient-to-br from-orange-50 via-white to-orange-50 rounded-3xl overflow-hidden shadow-md border-2 cursor-pointer ${
                    isLowStock ? 'border-orange-400' : 'border-gray-200'
                  }`}
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.02, y: -4, boxShadow: '0 10px 30px rgba(196, 98, 16, 0.15)' }}
                >
                  {/* Badge Stock Bas */}
                  {isLowStock && (
                    <div className="absolute top-2 right-2 z-10 bg-orange-500 text-white px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" />
                      Stock bas
                    </div>
                  )}

                  {/* Image */}
                  <div className="relative w-full aspect-square flex items-center justify-center overflow-hidden"
                    style={{ background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)' }}>
                    {(() => {
                      const produitImg = FILTRES_PRODUITS.find(f => f.id === (publication.produit || publication.culture || cycle?.culture))?.img;
                      const photoUrl = publication.photoUrl || publication.photo_url;
                      return produitImg ? (
                        <img src={produitImg} alt={publication.produit} className="w-full h-full object-cover" />
                      ) : photoUrl ? (
                        <img src={photoUrl} alt={publication.produit} className="w-full h-full object-cover" />
                      ) : (
                        <Sprout className="w-16 h-16 text-green-400" />
                      );
                    })()}
                  </div>

                  {/* Info produit */}
                  <div className="p-3">
                    {/* Nom */}
                    <h3 className="font-black text-gray-900 text-base mb-1 line-clamp-1">
                      {publication.produit || publication.culture || cycle?.culture || 'Produit'}
                    </h3>

                    {/* Localisation */}
                    <div className="flex items-center gap-1 mb-2">
                      <Package className="w-3 h-3 text-gray-400" />
                      <p className="text-[11px] text-gray-600">
                        {Math.round(Number(publication.quantiteDisponible || publication.stockDisponible || 0)).toLocaleString('fr-FR')} kg disponibles
                      </p>
                    </div>

                    {/* Prix - STYLE IDENTIQUE */}
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-2xl font-black text-[#C46210]">
                        {Math.round(Number(publication.prixUnitaire || publication.prix_unitaire || 0)).toLocaleString('fr-FR')}
                      </span>
                      <span className="text-xs text-gray-600 font-semibold">FCFA/kg</span>
                    </div>

                    {/* Bouton Modifier le prix */}
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(publication, cycle);
                      }}
                      className="w-full bg-gradient-to-r from-[#C66A2C] to-[#D97706] text-white py-2.5 px-4 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2"
                      whileTap={{ scale: 0.95 }}
                    >
                      <Edit3 className="w-4 h-4" />
                      Modifier
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Modal de modification */}
          {selectedPublication && (
            <ModifierPublicationModal
              publication={{
                id: selectedPublication.id,
                produit: selectedPublication.produit || selectedPublication.culture || selectedCycle?.culture || 'Produit',
                prix_unitaire: selectedPublication.prixUnitaire || selectedPublication.prix_unitaire || 0,
                quantite_disponible: selectedPublication.stockDisponible || selectedPublication.quantiteDisponible || selectedPublication.quantite_disponible || 0,
                description: selectedPublication.description || '',
                localisation: selectedPublication.localisation || selectedPublication.village || '',
                photo_url: selectedPublication.photos?.[0] || selectedPublication.photo_url || selectedPublication.image || null,
              }}
              isOpen={showEditModal}
              onClose={() => {
                setShowEditModal(false);
                setSelectedPublication(null);
                setSelectedCycle(null);
              }}
              onSuccess={() => {
                setShowEditModal(false);
                setSelectedPublication(null);
                setSelectedCycle(null);
                fetchPublications();
              }}
            />
          )}
        </>
      )}
    </motion.div>
  );
}

interface HistoriqueViewProps {
  historiqueCommandes: any[];
  cyclesTermines: any[];
  recoltes: any[];
  sousTab: 'ventes' | 'saisons';
  setSousTab: (tab: 'ventes' | 'saisons') => void;
}

function HistoriqueView({ historiqueCommandes, cyclesTermines, recoltes, sousTab, setSousTab }: HistoriqueViewProps) {
  return (
    <div>
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-1.5 shadow-sm border border-gray-200 mb-4">
        <div className="grid grid-cols-2 gap-1">
          {(['ventes', 'saisons'] as const).map(tab => (
            <motion.button
              key={tab}
              onClick={() => setSousTab(tab)}
              className={`relative flex items-center justify-center px-2 py-3 rounded-xl font-bold transition-all ${
                sousTab === tab
                  ? 'text-white shadow-md'
                  : 'bg-transparent text-gray-600'
              }`}
              style={sousTab === tab ? { background: 'linear-gradient(135deg, #2E8B57, #3BA869)' } : {}}
              whileTap={{ scale: 0.98 }}
            >
              <span className="text-[13px] leading-tight">
                {tab === 'ventes' ? 'Ventes' : 'Saisons passées'}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {sousTab === 'ventes' && (
          <motion.div
            key="ventes"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="space-y-3"
          >
            {historiqueCommandes.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
                <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Aucune vente dans ton historique</p>
              </div>
            ) : (
              historiqueCommandes.map((c, index) => (
                <VenteAccordeonCard key={c.id} commande={c} index={index} />
              ))
            )}
          </motion.div>
        )}

        {sousTab === 'saisons' && (
          <motion.div
            key="saisons"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="space-y-3"
          >
            {cyclesTermines.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-200">
                <CheckCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Aucune saison terminée</p>
                <p className="text-sm text-gray-500 mt-2">Tes saisons clôturées apparaîtront ici</p>
              </div>
            ) : (
              cyclesTermines.map((cycle, index) => {
                const recoltesLiees = recoltes.filter(r => r.cycleId === cycle.id);
                const totalRecolte = recoltesLiees.reduce((s, r) => s + Number(r.quantite), 0);
                const prixMoyen = recoltesLiees.length > 0
                  ? Math.round(recoltesLiees.reduce((s, r) => s + Number(r.prixUnitaire), 0) / recoltesLiees.length)
                  : 0;
                const revenus = Math.round(recoltesLiees.reduce((s, r) => s + Number(r.quantite) * Number(r.prixUnitaire), 0));
                const duree = cycle.datePlantation && cycle.dateRecolteReelle
                  ? Math.floor((new Date(cycle.dateRecolteReelle).getTime() - new Date(cycle.datePlantation).getTime()) / 86400000)
                  : null;
                const produitImg = FILTRES_PRODUITS.find(f => f.id === cycle.culture)?.img;
                const sansRecolte = totalRecolte === 0;
                return (
                  <SaisonAccordeonCard
                    key={cycle.id}
                    cycle={cycle}
                    index={index}
                    recoltesLiees={recoltesLiees}
                    totalRecolte={totalRecolte}
                    prixMoyen={prixMoyen}
                    revenus={revenus}
                    duree={duree}
                    produitImg={produitImg ?? undefined}
                    sansRecolte={sansRecolte}
                  />
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const STATUT_COLORS: Record<string, { border: string; bg: string; text: string; label: string }> = {
  en_attente:  { border: '#f97316', bg: '#fff3e0', text: '#c2410c', label: 'En attente' },
  confirmee:   { border: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8', label: 'Confirmée' },
  livree:      { border: '#16a34a', bg: '#dcfce7', text: '#166534', label: 'Livrée' },
  annulee:     { border: '#d1d5db', bg: '#f3f4f6', text: '#6b7280', label: 'Annulée' },
  acceptee:    { border: '#8b5cf6', bg: '#f5f3ff', text: '#6d28d9', label: 'Acceptée' },
};

function VenteAccordeonCard({ commande: c, index }: { commande: any; index: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const sc = STATUT_COLORS[c.statut] ?? STATUT_COLORS['en_attente'];
  const produitImg = FILTRES_PRODUITS.find(f => f.id === c.produit)?.img;

  const montant = useCountUp(isOpen ? (c.montantTotal || 0) : 0, 1000, 0, 0);
  const quantite = useCountUp(isOpen ? (c.quantite || 0) : 0, 800, 0, 60);
  const prixUnit = useCountUp(isOpen ? (c.prixUnitaire || 0) : 0, 800, 0, 120);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 280, damping: 26 }}
      className="rounded-2xl overflow-hidden"
      style={{ border: `1.5px solid ${sc.border}` }}
    >
      <motion.button
        className="w-full flex items-center gap-3 p-3 text-left"
        onClick={() => setIsOpen(o => !o)}
        whileTap={{ scale: 0.99 }}
      >
        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
          style={{ background: produitImg ? 'transparent' : '#dcfce7' }}>
          {produitImg
            ? <img src={produitImg} alt={c.produit} className="w-full h-full object-cover" />
            : <Sprout className="w-6 h-6 text-green-500" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm truncate">{c.produit}</p>
          <p className="text-xs text-gray-500">{(c.quantite || 0).toLocaleString('fr-FR')} kg · {(c.montantTotal || 0).toLocaleString('fr-FR')} FCFA</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] font-bold px-2 py-1 rounded-full"
            style={{ background: sc.bg, color: sc.text }}>
            {sc.label}
          </span>
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
            <ChevronDown className="w-4 h-4" style={{ color: sc.border }} />
          </motion.div>
        </div>
      </motion.button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-3 pb-3" style={{
              background: 'rgba(255,255,255,0.75)',
              backdropFilter: 'blur(12px)',
              borderTop: `1px solid ${sc.border}40`,
            }}>
              <motion.div
                className="h-px mb-3"
                style={{ background: `linear-gradient(90deg, transparent, ${sc.border}60, transparent)` }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Montant', value: montant.toLocaleString('fr-FR'), suffix: 'FCFA' },
                  { label: 'Quantité', value: quantite.toLocaleString('fr-FR'), suffix: 'kg' },
                  { label: 'Prix unitaire', value: prixUnit.toLocaleString('fr-FR'), suffix: 'FCFA/kg' },
                  { label: 'Paiement', value: c.modePaiement || 'Espèces', suffix: '' },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, type: 'spring', stiffness: 300 }}
                    className="rounded-xl p-2.5"
                    style={{ background: 'rgba(255,255,255,0.85)', border: `0.5px solid ${sc.border}30` }}
                  >
                    <p className="text-[11px] mb-1" style={{ color: sc.text }}>{item.label}</p>
                    <p className="text-sm font-bold text-gray-900">{item.value} <span className="text-xs font-normal text-gray-500">{item.suffix}</span></p>
                  </motion.div>
                ))}
              </div>
              {c.dateCommande && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.28 }}
                  className="text-xs text-gray-400 mt-2 text-center"
                >
                  {new Date(c.dateCommande).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface SaisonAccordeonCardProps {
  cycle: any;
  index: number;
  recoltesLiees: any[];
  totalRecolte: number;
  prixMoyen: number;
  revenus: number;
  duree: number | null;
  produitImg: string | undefined;
  sansRecolte: boolean;
}

function SaisonAccordeonCard({
  cycle, index, recoltesLiees, totalRecolte, prixMoyen, revenus, duree, produitImg, sansRecolte,
}: SaisonAccordeonCardProps) {
  const [isOpen, setIsOpen] = useState(false);

  const borderColor = sansRecolte ? '#ef4444' : '#16a34a';
  const bgColor = sansRecolte ? 'rgba(254,242,242,0.75)' : 'rgba(240,253,244,0.75)';
  const textColor = sansRecolte ? '#991b1b' : '#166534';
  const borderLight = sansRecolte ? '#fecaca' : '#bbf7d0';

  const animRevenus = useCountUp(isOpen ? revenus : 0, 1200, 0, 0);
  const animRecolte = useCountUp(isOpen ? totalRecolte : 0, 1000, 0, 60);
  const animEstimee = useCountUp(isOpen ? (cycle.quantiteEstimee || 0) : 0, 900, 0, 120);
  const animPrixMoyen = useCountUp(isOpen ? prixMoyen : 0, 800, 0, 180);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 280, damping: 26 }}
      className="rounded-2xl overflow-hidden"
      style={{ border: `1.5px solid ${borderColor}` }}
    >
      <motion.button
        className="w-full flex items-center gap-3 p-3 text-left"
        onClick={() => setIsOpen(o => !o)}
        whileTap={{ scale: 0.99 }}
      >
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
          style={{ background: produitImg ? 'transparent' : sansRecolte ? '#fee2e2' : '#dcfce7' }}>
          {produitImg
            ? <img src={produitImg} alt={cycle.culture} className="w-full h-full object-cover" />
            : <Sprout className="w-7 h-7" style={{ color: sansRecolte ? '#ef4444' : '#16a34a' }} />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-base">{cycle.culture}</p>
          <p className="text-xs text-gray-500">{cycle.surface} ha{duree ? ` · ${duree} jours` : ''}</p>
          {cycle.datePlantation && (
            <p className="text-[11px] text-gray-400">
              {new Date(cycle.datePlantation).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              {cycle.dateRecolteReelle ? ` → ${new Date(cycle.dateRecolteReelle).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
            </p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-[11px] font-bold px-2 py-1 rounded-full"
            style={{ background: sansRecolte ? '#fee2e2' : '#dcfce7', color: textColor }}>
            {sansRecolte ? 'Sans récolte' : 'Récolté'}
          </span>
          {!sansRecolte && (
            <span className="text-xs font-bold" style={{ color: '#2E8B57' }}>
              {revenus.toLocaleString('fr-FR')} FCFA
            </span>
          )}
          <motion.div animate={{ rotate: isOpen ? 180 : 0 }} transition={{ type: 'spring', stiffness: 400, damping: 30 }}>
            <ChevronDown className="w-4 h-4" style={{ color: borderColor }} />
          </motion.div>
        </div>
      </motion.button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="px-3 pb-3" style={{
              background: bgColor,
              backdropFilter: 'blur(12px)',
              borderTop: `1px solid ${borderColor}40`,
            }}>
              <motion.div
                className="h-px mb-3"
                style={{ background: `linear-gradient(90deg, transparent, ${borderColor}60, transparent)` }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />

              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { label: 'Estimée', value: animEstimee.toLocaleString('fr-FR'), suffix: 'kg' },
                  { label: 'Récoltée', value: animRecolte.toLocaleString('fr-FR'), suffix: 'kg', green: true },
                  { label: 'Prix moyen', value: animPrixMoyen.toLocaleString('fr-FR'), suffix: 'FCFA/kg' },
                  { label: 'Nb récoltes', value: recoltesLiees.length.toString(), suffix: `récolte${recoltesLiees.length > 1 ? 's' : ''}`, blue: true },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, type: 'spring', stiffness: 300 }}
                    className="rounded-xl p-2.5"
                    style={{ background: 'rgba(255,255,255,0.85)', border: `0.5px solid ${borderLight}` }}
                  >
                    <p className="text-[11px] mb-1" style={{ color: textColor }}>{item.label}</p>
                    <p className="text-sm font-bold" style={{ color: item.green ? '#2E8B57' : item.blue ? '#3b82f6' : '#111827' }}>
                      {item.value} <span className="text-xs font-normal text-gray-500">{item.suffix}</span>
                    </p>
                  </motion.div>
                ))}
              </div>

              {!sansRecolte && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.28, type: 'spring' }}
                  className="rounded-xl p-3 mb-3 flex justify-between items-center"
                  style={{ background: 'rgba(255,255,255,0.85)', border: `1px solid ${borderLight}` }}
                >
                  <p className="text-xs font-bold" style={{ color: textColor }}>Revenus générés</p>
                  <p className="text-lg font-black" style={{ color: '#2E8B57' }}>
                    {animRevenus.toLocaleString('fr-FR')} <span className="text-sm font-bold">FCFA</span>
                  </p>
                </motion.div>
              )}

              {recoltesLiees.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.34 }}
                >
                  <p className="text-[11px] font-bold uppercase tracking-wide mb-2" style={{ color: textColor }}>
                    Récoltes déclarées
                  </p>
                  <div className="space-y-1.5">
                    {recoltesLiees.map((r, i) => (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.38 + i * 0.05, type: 'spring', stiffness: 300 }}
                        className="flex items-center gap-2 rounded-xl px-3 py-2"
                        style={{ background: 'rgba(255,255,255,0.85)', border: `0.5px solid ${borderLight}` }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: '#2E8B57' }} />
                        <span className="text-xs text-gray-700 flex-1">
                          {r.produit} · {r.dateRecolte ? new Date(r.dateRecolte).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                        </span>
                        <span className="text-xs font-bold" style={{ color: '#2E8B57' }}>
                          {Number(r.quantite).toLocaleString('fr-FR')} kg
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {sansRecolte && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="rounded-xl p-3"
                  style={{ background: 'rgba(255,255,255,0.85)', border: '0.5px solid #fecaca' }}
                >
                  <p className="text-xs font-bold text-red-600">Aucune récolte déclarée sur cette saison.</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}