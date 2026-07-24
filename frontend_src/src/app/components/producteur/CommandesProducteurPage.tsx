/**
 * CommandesProducteurPage — Menu "Commandes" du Producteur
 * Structure identique pixel-perfect à GestionStock du Marchand
 * Couleur primaire : #2E8B57 (vert producteur)
 */
/**
 * CommandesProducteurPage — Menu "Commandes" du Producteur
 */
import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { useVoiceCore } from '../../hooks/useVoiceCore';
import { matchesSearch } from '../../utils/searchUtils';
import { SearchBar } from '../shared/SearchBar';
import { ImagePickerField } from '../shared/ImagePickerField';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag,
  TrendingUp,
  AlertCircle,
  Plus,
  Search,
  Trash2,
  XCircle,
  X,
  ChevronRight,
  SlidersHorizontal,
  Mic,
  MicOff,
  CheckCircle,
  Clock,
  Truck,
  User,
  MapPin,
  Calendar,
  Phone,
  Package,
  Bell,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Banknote,
  Info,
  Check,
} from 'lucide-react';
import { Montant } from '../shared/Montant';
import { SubPageLayout } from '../layout/SubPageLayout';
import { useUser } from '../../contexts/UserContext';
import { useApp } from '../../contexts/AppContext';
import { useCommande, type Commande as ApiCommande } from '../../contexts/CommandeContext';
import { createCommande, cancelCommande } from '../../../imports/commandes-api';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { NotificationButton } from '../marchand/NotificationButton';
import { ReceptionPaiementModal } from '../shared/ReceptionPaiementModal';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { toast } from 'sonner';
import {
  IMG_PRODUIT_TOMATE, IMG_PRODUIT_AUBERGINE, IMG_PRODUIT_PIMENT, IMG_PRODUIT_GOMBO,
  IMG_PRODUIT_MANIOC, IMG_PRODUIT_IGNAME, IMG_PRODUIT_MAIS, IMG_PRODUIT_RIZ,
  IMG_PRODUIT_BANANE, IMG_PRODUIT_OIGNON, IMG_PRODUIT_AVOCAT, IMG_PRODUIT_AUTRE,
  IMG_PRODUIT_MANGUE, IMG_PRODUIT_ANANAS
} from '../../assets/images';


const COLOR = '#2E8B57';

const shimmerStyle = `
  @keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }
`;

const PRODUITS_ICONS: { id: string; img: string }[] = [
  { id: 'Tomate',          img: IMG_PRODUIT_TOMATE    },
  { id: 'Aubergine',       img: IMG_PRODUIT_AUBERGINE },
  { id: 'Piment',          img: IMG_PRODUIT_PIMENT    },
  { id: 'Gombo',           img: IMG_PRODUIT_GOMBO     },
  { id: 'Oignon',          img: IMG_PRODUIT_OIGNON    },
  { id: 'Manioc',          img: IMG_PRODUIT_MANIOC    },
  { id: 'Igname',          img: IMG_PRODUIT_IGNAME    },
  { id: 'Maïs',            img: IMG_PRODUIT_MAIS      },
  { id: 'Riz',             img: IMG_PRODUIT_RIZ       },
  { id: 'Banane plantain', img: IMG_PRODUIT_BANANE    },
  { id: 'Avocat',          img: IMG_PRODUIT_AVOCAT    },
  { id: 'Mangue',          img: IMG_PRODUIT_MANGUE    },
  { id: 'Ananas',          img: IMG_PRODUIT_ANANAS    },
  { id: 'Autre',           img: IMG_PRODUIT_AUTRE     },
];

/** Suggestions + saisie libre (datalist) — modal nouvelle vente */
const DATALIST_ADD_PRODUIT_VALUES: string[] = [
  'Tomate', 'Aubergine', 'Piment', 'Gombo', 'Manioc', 'Igname', 'Maïs', 'Riz',
  'Banane plantain', 'Oignon', 'Avocat', 'Arachide', 'Haricot', 'Soja', 'Mil',
  'Sorgho', 'Café', 'Cacao', 'Coton', 'Anacarde', 'Ananas', 'Mangue', 'Papaye',
  'Citron', 'Orange', 'Gingembre', 'Piment doux', 'Concombre', 'Courgette',
  'Poivron', 'Laitue', 'Chou', 'Carotte', 'Patate douce', 'Taro', 'Macabo',
  'Bissap', 'Kenaf', 'Palmier à huile', 'Cocotier', 'Plantain',
];

const ADD_PRODUIT_DATALIST_ID = 'add-vente-produit-datalist';

// ── Types ─────────────────────────────────────────────────────────────────────

type StatutType = 'nouvelle' | 'acceptee' | 'preparation' | 'livraison' | 'livree' | 'litige' | 'cloturee';

interface Commande {
  id: string;
  produit: string;
  image: string;
  /** Photo produit (Cloudinary / API) — prioritaire sur `image` */
  imageUrl?: string;
  acheteur: string;
  telephone: string;
  localite: string;
  quantite: number;
  unite: string;
  prixUnitaire: number;
  prixTotal: number;
  statut: StatutType;
  dateCommande: string;
  dateLivraison: string;
  categorie: string;
  /** progression livraison 0–100 */
  progression: number;
  /** prime de qualité en % */
  prime: number;
  /** vente enregistrée hors plateforme (API) */
  type?: string;
}

// ── Données statiques ──────────────────────────────────────────────────────────

const STATUT_CONFIG: Record<StatutType | 'en_livraison' | 'annulee', {
  label: string; color: string; bg: string; border: string;
  badgeBg: string; badgeText: string; progress: number
}> = {
  nouvelle:    { label: 'Nouvelle',       color: '#f97316', bg: '#fffbf566', border: '#fdba74', badgeBg: '#fed7aa', badgeText: '#9a3412',  progress: 10  },
  acceptee:    { label: 'Confirmée',      color: '#3b82f6', bg: '#f5f9ff66', border: '#93c5fd', badgeBg: '#bfdbfe', badgeText: '#1e40af',  progress: 25  },
  preparation: { label: 'En préparation', color: '#a855f7', bg: '#fdf8ff66', border: '#c084fc', badgeBg: '#e9d5ff', badgeText: '#6b21a8',  progress: 50  },
  livraison:   { label: 'En livraison',   color: '#0ea5e9', bg: '#f0f9ff66', border: '#7dd3fc', badgeBg: '#e0f2fe', badgeText: '#075985',  progress: 75  },
  en_livraison:{ label: 'En livraison',   color: '#0ea5e9', bg: '#f0f9ff66', border: '#7dd3fc', badgeBg: '#e0f2fe', badgeText: '#075985',  progress: 75  },
  livree:      { label: 'Livrée',         color: '#22c55e', bg: '#f4fdf666', border: '#4ade80', badgeBg: '#bbf7d0', badgeText: '#14532d',  progress: 100 },
  litige:      { label: 'Litige',         color: '#ef4444', bg: '#fff5f566', border: '#fca5a5', badgeBg: '#fee2e2', badgeText: '#991b1b',  progress: 50  },
  annulee:     { label: 'Annulée',        color: '#ef4444', bg: '#fff5f566', border: '#fca5a5', badgeBg: '#fee2e2', badgeText: '#991b1b',  progress: 0   },
  cloturee:    { label: 'Clôturée',       color: '#6b7280', bg: '#f9fafb66', border: '#d1d5db', badgeBg: '#f3f4f6', badgeText: '#6b7280',  progress: 100 },
};

const categories = [
  { id: 'tous',       label: 'Toutes' },
  { id: 'cereales',   label: 'Céréales' },
  { id: 'legumes',    label: 'Légumes' },
  { id: 'fruits',     label: 'Fruits' },
  { id: 'tubercules', label: 'Tubercules' },
  { id: 'epices',     label: 'Épices' },
];

const statuts = [
  { id: 'tous',       label: 'Tous les statuts' },
  { id: 'nouvelle',   label: 'Nouvelles' },
  { id: 'acceptee',   label: 'Confirmées' },
  { id: 'preparation',label: 'En préparation' },
  { id: 'livree',     label: 'Livrées' },
  { id: 'litige',     label: 'Litiges' },
  { id: 'cloturee',   label: 'Clôturées' },
];

const sortOptions = [
  { id: 'date_desc',    label: 'Plus récentes d\'abord' },
  { id: 'date_asc',     label: 'Plus anciennes d\'abord' },
  { id: 'montant_desc', label: 'Montant (élevé)' },
  { id: 'montant_asc',  label: 'Montant (faible)' },
  { id: 'priorite',     label: 'Priorité (nouvelles)' },
];


// ── Formulaire nouvelle commande ──────────────────────────────────────────────

const emptyForm = {
  produit: '',
  acheteur: '',
  telephone: '',
  localite: '',
  quantite: 0,
  unite: 'kg',
  prixUnitaire: 0,
  categorie: 'cereales',
  dateLivraison: '',
};

// ── Composant principal ────────────────────────────────────────────────────────

export function ProducteurCommandes() {
  const { user } = useUser();
  const { speak, setIsModalOpen } = useApp();
  const {
    commandes: ctxCommandes,
    loading,
    accepterCommande,
    refuserCommande,
    contreProposerPrix,
    livrerCommande,
    recupererPaiement,
    refreshCommandes,
    updateCommande,
  } = useCommande();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategorie, setSelectedCategorie] = useState('tous');
  const [selectedStatut, setSelectedStatut] = useState('tous');
  const [sortBy, setSortBy] = useState('date_desc');
  const [selectedCmd, setSelectedCmd] = useState<Commande | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showRevenusModal, setShowRevenusModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'urgentes' | 'livrees'>('all');
  const [newForm, setNewForm] = useState(emptyForm);
  const [newProduitImage, setNewProduitImage] = useState('');
  const [addStep, setAddStep] = useState(0);
  const prevAddStepRef = useRef(0);
  const stepDirection = addStep > prevAddStepRef.current ? 1 : addStep < prevAddStepRef.current ? -1 : 1;
  useLayoutEffect(() => {
    prevAddStepRef.current = addStep;
  }, [addStep]);

  const canNavigateToAddStep = useCallback(
    (target: number) => {
      if (target <= addStep) return true;
      const prodOk = newForm.produit.trim() !== '';
      const telOk = newForm.telephone.replace(/\s/g, '').length === 10;
      const acheteurOk = newForm.acheteur.trim() !== '';
      if (target === 1) return prodOk;
      if (target === 2) return prodOk && acheteurOk && telOk;
      return false;
    },
    [addStep, newForm.produit, newForm.acheteur, newForm.telephone],
  );

  const goToAddStep = useCallback(
    (n: number) => {
      if (!canNavigateToAddStep(n)) return;
      setAddStep(n);
    },
    [canNavigateToAddStep],
  );

  const closeAddModal = useCallback(() => {
    setShowAddModal(false);
    setAddStep(0);
    setNewForm(emptyForm);
    setNewProduitImage('');
  }, []);

  // ── États pour les demandes reçues (CommandeContext) ──────────────────────
  const [selectedDemande, setSelectedDemande] = useState<ApiCommande | null>(null);
  const [showDemandeDetailModal, setShowDemandeDetailModal] = useState(false);
  const [showContrePropoModal, setShowContrePropoModal] = useState(false);
  const [showRefusModal, setShowRefusModal] = useState(false);
  const [nouveauPrix, setNouveauPrix] = useState(0);
  const [messageContrePropo, setMessageContrePropo] = useState('');
  const [raisonRefus, setRaisonRefus] = useState('');
  const [isSubmittingDemande, setIsSubmittingDemande] = useState(false);
  const [isRecupererPaiementLoading, setIsRecupererPaiementLoading] = useState(false);
  const [isUpdatingStatut, setIsUpdatingStatut] = useState(false);
  const [showReceptionModal, setShowReceptionModal] = useState(false);
  const [selectedCmdForReception, setSelectedCmdForReception] = useState<ApiCommande | null>(null);

  // Voice
  const [isListening, setIsListening] = useState(false);
  const hasWelcomed = useRef(false);

  useEffect(() => {
    const isAnyOpen = showAddModal || showDetailModal || showFilterModal || showDemandeDetailModal || showContrePropoModal || showRefusModal;
    setIsModalOpen(isAnyOpen);
  }, [showAddModal, showDetailModal, showFilterModal, showDemandeDetailModal, showContrePropoModal, showRefusModal, setIsModalOpen]);

  // ── Demandes reçues depuis CommandeContext (marchands → ce producteur) ─────
  // On affiche toutes les commandes de type producteur pour la démo
  const demandesRecues = ctxCommandes.filter(c =>
    c.vendeurId === user?.id &&
    c.type !== 'vente_directe' &&
    [
      'en_attente', 'confirmee', 'en_cours', 'livree',
    ].includes(c.statut)
  );
  const demandesEnAttente = demandesRecues.filter(c => c.statut === 'en_attente');

  // ── Helpers affichage statut contexte ─────────────────────────────────────
  const getCtxStatutLabel = (statut: string) => {
    const map: Record<string, { label: string; color: string; bg: string }> = {
      en_attente: { label: 'En attente', color: '#f59e0b', bg: '#fef3c7' },
      confirmee:  { label: 'Confirmée',  color: '#3b82f6', bg: '#dbeafe' },
      en_cours:   { label: 'En cours',   color: '#a855f7', bg: '#f3e8ff' },
      livree:     { label: 'Livrée',     color: '#2E8B57', bg: '#dcfce7' },
      annulee:    { label: 'Annulée',    color: '#ef4444', bg: '#fee2e2' },
    };
    return map[statut] || { label: statut, color: '#6b7280', bg: '#f3f4f6' };
  };

  const formatCountdown = (expiresAt?: string) => {
    if (!expiresAt) return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    if (diff <= 0) return 'Expirée';
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${h}h ${m}min restantes`;
  };

  // ── Actions sur demandes ───────────────────────────────────────────────────
  const handleAccepterDemande = async (cmd: ApiCommande) => {
    setIsSubmittingDemande(true);
    try {
      await accepterCommande(cmd.id);
      await speak(`Commande de ${cmd.acheteurId} acceptée. Le marchand va maintenant payer.`);
      setShowDemandeDetailModal(false);
    } catch (e: any) {
      console.warn('[CommandesProducteur] handleAccepterDemande failed:', e?.message);
      speak(`Erreur : ${e.message}`);
    }
    setIsSubmittingDemande(false);
  };

  const handleRefuserDemande = async () => {
    if (!selectedDemande || !raisonRefus.trim()) return;
    setIsSubmittingDemande(true);
    try {
      await refuserCommande(selectedDemande.id, raisonRefus);
      await speak(`Commande refusée.`);
      setShowRefusModal(false);
      setShowDemandeDetailModal(false);
      setRaisonRefus('');
    } catch (e: any) {
      console.warn('[CommandesProducteur] handleRefuserDemande failed:', e?.message);
      speak(`Erreur : ${e.message}`);
    }
    setIsSubmittingDemande(false);
  };

  const handleContreProposer = async () => {
    if (!selectedDemande || nouveauPrix <= 0) return;
    setIsSubmittingDemande(true);
    try {
      await contreProposerPrix(selectedDemande.id, nouveauPrix, messageContrePropo);
      await speak(`Contre-proposition de ${(nouveauPrix || 0).toLocaleString('fr-FR')} FCFA envoyée au marchand.`);
      setShowContrePropoModal(false);
      setShowDemandeDetailModal(false);
      setNouveauPrix(0);
      setMessageContrePropo('');
    } catch (e: any) {
      console.warn('[CommandesProducteur] handleContreProposer failed:', e?.message);
      speak(`Erreur : ${e.message}`);
    }
    setIsSubmittingDemande(false);
  };

  const handleMarquerLivre = async (cmd: ApiCommande) => {
    setIsSubmittingDemande(true);
    try {
      await livrerCommande(cmd.id);
      await speak(`Livraison déclarée. Le marchand va confirmer la réception.`);
      setShowDemandeDetailModal(false);
    } catch (e: any) {
      console.warn('[CommandesProducteur] handleMarquerLivre failed:', e?.message);
      speak(`Erreur : ${e.message}`);
    }
    setIsSubmittingDemande(false);
  };

  const handleRecupererPaiement = async (cmd: ApiCommande) => {
    setIsRecupererPaiementLoading(true);
    try {
      await recupererPaiement(cmd.id);
      toast.success("Paiement récupéré ! L'argent est dans ton Keiwa.");
      await speak(`Paiement récupéré ! L'argent est dans ton Keiwa.`);
      setShowDemandeDetailModal(false);
    } catch (e: any) {
      console.warn('[CommandesProducteur] handleRecupererPaiement failed:', e?.message);
      toast.error(e?.message || 'Erreur lors de la récupération du paiement');
      speak(`Erreur : ${e.message}`);
    }
    setIsRecupererPaiementLoading(false);
  };

  useEffect(() => {
    if (!hasWelcomed.current && user) {
      hasWelcomed.current = true;
      setTimeout(() => {
        // speak auto désactivé — boucle audio
      }, 900);
    }
  }, [user]);

  // ── Conversion commandes API → Commande locale (grille standard) ───────────
  const apiStatutToLocal = (statut: ApiCommande['statut']): StatutType => {
    switch (statut as string) {
      case 'confirmee': return 'acceptee'; // UI label for confirmee
      case 'en_cours':  return 'preparation';
      case 'en_livraison': return 'livraison';
      case 'livree':    return 'livree';
      case 'refusee': return 'cloturee'; // refusee mapped to cloturee UI
      case 'annulee':   return 'cloturee';
      case 'en_attente':
      default:          return 'nouvelle';
    }
  };

  const toutesCommandesKPI = useMemo(
    () => ctxCommandes.filter(c => c.vendeurId === user?.id),
    [ctxCommandes, user?.id]
  );

  const commandes: Commande[] = useMemo(
    () =>
      ctxCommandes
        .filter(
          c =>
            c.vendeurId === user?.id &&
            !['annulee', 'en_attente'].includes(c.statut)
        )
        .map(c => {
          const statut = apiStatutToLocal(c.statut);
          const dc = c.dateCommande
            ? typeof c.dateCommande === 'string'
              ? c.dateCommande.split('T')[0]
              : new Date(c.dateCommande).toISOString().split('T')[0]
            : '';
          const dl = c.dateLivraison
            ? typeof c.dateLivraison === 'string'
              ? c.dateLivraison.split('T')[0]
              : new Date(c.dateLivraison).toISOString().split('T')[0]
            : '';
          return {
            id: c.id,
            produit: c.produit,
            image: PRODUITS_ICONS.find(p => p.id === c.produit)?.img ?? IMG_PRODUIT_AUTRE,
            imageUrl: c.imageUrl || undefined,
            acheteur: c.acheteurNom || c.acheteurId,
            telephone: c.acheteurTelephone || '',
            localite: c.localite || '',
            quantite: c.quantite,
            unite: 'kg',
            prixUnitaire: c.prixUnitaire,
            prixTotal: c.total,
            statut,
            dateCommande: dc,
            dateLivraison: dl,
            categorie: c.categorie ?? 'cereales',
            progression: STATUT_CONFIG[statut]?.progress ?? 0,
            prime: 0,
            type: c.type,
          } satisfies Commande;
        }),
    [ctxCommandes, user?.id]
  );

  const toutesCommandes = commandes;

  // ── KPIs (toutes les lignes producteur, y compris en_attente / vente_directe) ─
  const kpiUrgentesCount = toutesCommandesKPI.filter(c => c.statut === 'en_attente').length;
  const kpiLivreesOuEncaissees = toutesCommandesKPI.filter(c => c.statut === 'livree');
  const totalRevenusKPI = kpiLivreesOuEncaissees.reduce(
    (s, c) => s + (Number(c.total) || 0),
    0
  );
  const kpiLivreesCount = kpiLivreesOuEncaissees.length;

  // ── Filtrage + tri ─────────────────────────────────────────────────────────
  const filtered = toutesCommandes
    .filter(c => {
      const matchCat = selectedCategorie === 'tous' || c.categorie === selectedCategorie;
      const matchStat = selectedStatut === 'tous' || c.statut === selectedStatut;
      const matchSearch = matchesSearch(searchQuery, c.produit, c.acheteur);
      const matchActive =
        activeFilter === 'all' ? true :
        activeFilter === 'urgentes' ? (c.statut === 'nouvelle' || c.statut === 'litige') :
        activeFilter === 'livrees' ? (c.statut === 'livree' || c.statut === 'cloturee') :
        true;
      return matchCat && matchStat && matchSearch && matchActive;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':   return b.dateCommande.localeCompare(a.dateCommande);
        case 'date_asc':    return a.dateCommande.localeCompare(b.dateCommande);
        case 'montant_desc': return b.prixTotal - a.prixTotal;
        case 'montant_asc':  return a.prixTotal - b.prixTotal;
        case 'priorite':    return (a.statut === 'nouvelle' ? -1 : 1);
        default: return 0;
      }
    });

  const localStatutToApi = (s: StatutType): ApiCommande['statut'] => {
    switch (s as string) {
      case 'acceptee': return 'confirmee'; // API value for acceptee UI
      case 'preparation': return 'en_cours';
      case 'livraison': return 'en_livraison';
      case 'livree': return 'livree';
      case 'cloturee': return 'annulee';
      // 'refusee' not in StatutType yet; API fallback remains annulee when cloturee is used.
      case 'nouvelle': return 'en_attente';
      case 'litige':
      default: return 'en_cours';
    }
  };

  // ── Actions ────────────────────────────────────────────────────────────────
  const changerStatut = async (id: string, statut: StatutType) => {
    setIsUpdatingStatut(true);
    try {
      await updateCommande(id, { statut: localStatutToApi(statut) });
      toast.success('Statut mis à jour avec succès');
      setShowDetailModal(false);
      await speak(`Commande mise à jour : ${statut}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '';
      console.warn('[CommandesProducteur] changerStatut failed:', msg);
      speak(msg ? `Erreur : ${msg}` : 'Impossible de mettre à jour la commande');
    } finally {
      setIsUpdatingStatut(false);
    }
  };

  const processVoiceCommand = (_text: string) => {
    // Traitement vocal désactivé
  };

  const compressImage = async (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxW = 800;
        const ratio = Math.min(maxW / img.width, maxW / img.height, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.75));
      };
      img.onerror = () => resolve(base64);
      img.src = base64;
    });
  };

  const uploadToCloudinary = async (base64: string): Promise<string> => {
    const compressed = await compressImage(base64);
    // Convertir base64 en Blob pour éviter violation CSP
    const byteString = atob(compressed.split(',')[1]);
    const mimeString = compressed.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    const blob = new Blob([ab], { type: mimeString });
    const formData = new FormData();
    formData.append('file', blob, 'photo.jpg');
    formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_PRESET || 'julaba_preset');
    const res = await fetch(import.meta.env.VITE_CLOUDINARY_URL || 'https://api.cloudinary.com/v1_1/julaba/image/upload', {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Upload image échoué');
    const data = await res.json();
    if (!data.secure_url) {
      throw new Error('URL image non retournée par Cloudinary');
    }
    return data.secure_url;
  };

  const ajouterCommande = async () => {
    if (
      !newForm.produit ||
      !newForm.acheteur ||
      newForm.quantite === 0 ||
      newForm.prixUnitaire === 0 ||
      !user?.id
    )
      return;
    try {
      let imageUrl = '';
      if (newProduitImage) {
        imageUrl = await uploadToCloudinary(newProduitImage);
      }
      await createCommande({
        type: 'vente_directe',
        produit: newForm.produit,
        quantite: String(newForm.quantite),
        prix_unitaire: newForm.prixUnitaire,
        total: newForm.quantite * newForm.prixUnitaire,
        vendeur_id: user?.id || '',
        acheteur_id: '',
        acheteur_nom: newForm.acheteur,
        date_commande: new Date().toISOString(),
        statut: 'confirmee',
        image_url: imageUrl || undefined,
        acheteur_telephone: newForm.telephone || undefined,
        localite: newForm.localite || undefined,
        date_livraison: newForm.dateLivraison || undefined,
      });
      await refreshCommandes();
      speak(`Commande de ${newForm.produit} ajoutée`);
      setShowAddModal(false);
      setAddStep(0);
      setNewForm(emptyForm);
      setNewProduitImage('');
    } catch (e: any) {
      console.warn('[CommandesProducteur] ajouterCommande failed:', e?.message);
      speak(e?.message ? `Erreur : ${e.message}` : 'Impossible d\'ajouter la commande');
    }
  };

  // ── Voice ──────────────────────────────────────────────────────────────────
  // STT via Groq Whisper
  const { startRecording: _groqStart_startVoice, stopRecording: _groqStop_startVoice } = useVoiceCore({
    onError: () => setIsListening(false),
  });

  const startVoice = () => {
    if (isListening) { _groqStop_startVoice(); setIsListening(false); }
    else { setIsListening(true); _groqStart_startVoice(); }
  };

  // ── Rendu ─────────────────────────────────────────────���────────────────────
  return (
    <>
    <SubPageLayout
      role="producteur"
      title="Mes Commandes"
      rightContent={<NotificationButton />}
    >

      {/* ── CONTENU ─────────────────���─────────────────────────────────────── */}
      <div
        className="pb-32 lg:pb-8 max-w-2xl lg:max-w-7xl mx-auto min-h-screen"
        style={{ background: 'linear-gradient(to bottom, #f0fdf4, white)' }}
      >
        <style>{shimmerStyle}</style>

        {/* ── KPIs ── */}
        <div className="mb-4">
          <KPIGrid cols={2}>
            <UniversalKPI
              label="Commandes"
              animatedTarget={toutesCommandesKPI.length}
              icon={ShoppingBag}
              color="#2563eb"
              iconAnimation="bounce"
              active={activeFilter === 'all'}
              onClick={() => { setActiveFilter('all'); speak('Toutes les commandes'); }}
            />
            <UniversalKPI
              label="Urgentes"
              animatedTarget={kpiUrgentesCount}
              icon={AlertCircle}
              color="#f97316"
              iconAnimation={kpiUrgentesCount > 0 ? 'pulse' : 'none'}
              active={activeFilter === 'urgentes'}
              onClick={() => { setActiveFilter('urgentes'); speak('Commandes urgentes'); }}
            />
            <UniversalKPI
              label="Revenus"
              animatedTarget={totalRevenusKPI}
              suffix="FCFA"
              icon={TrendingUp}
              color="#2E8B57"
              iconAnimation="float"
              onClick={() => { setShowRevenusModal(true); speak('Mes revenus'); }}
            />
            <UniversalKPI
              label="Livrées"
              animatedTarget={kpiLivreesCount}
              icon={CheckCircle}
              color="#10b981"
              iconAnimation="float"
              active={activeFilter === 'livrees'}
              onClick={() => { setActiveFilter('livrees'); speak('Commandes livrées'); }}
            />
          </KPIGrid>
        </div>

        {/* ── Barre de recherche + filtres avancés ── */}
        <motion.div
          className="mb-4 flex gap-2 items-stretch"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex-1 min-w-0">
            <SearchBar
              value={searchQuery}
              onChange={(val) => setSearchQuery(val)}
              placeholder="Rechercher une commande ou un acheteur..."
              primaryColor={COLOR}
              isListening={isListening}
              onVoiceResult={(t) => { setSearchQuery(t); }}
            />
          </div>
          <motion.button
            type="button"
            onClick={() => setShowFilterModal(true)}
            className="flex-shrink-0 w-11 h-11 rounded-2xl bg-white border-2 border-gray-200 shadow-sm flex items-center justify-center self-center"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            aria-label="Filtres avancés"
          >
            <SlidersHorizontal className="w-5 h-5 text-gray-600" strokeWidth={2.5} />
          </motion.button>
        </motion.div>

        {/* ── Bouton d'action ── */}
        <div className="mb-4">
          <motion.button
            onClick={() => setShowAddModal(true)}
            className="w-full py-4 rounded-2xl bg-white border-2 font-bold flex items-center justify-center gap-2"
            style={{ borderColor: COLOR, color: COLOR }}
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.02 }}
          >
            <Plus className="w-5 h-5" strokeWidth={3} />
            Ajouter une commande
          </motion.button>
        </div>

        {/* ══ DEMANDES DE MARCHANDS — sous le bouton, disparaissent quand traitées ══ */}
        {loading ? (
          <div className="mb-5 space-y-3">
            {[0, 1, 2].map((idx) => (
              <div key={`skeleton-demande-${idx}`} className="bg-gray-200 rounded-2xl animate-pulse h-24" />
            ))}
          </div>
        ) : (
          <AnimatePresence>
            {demandesEnAttente.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ type: 'spring', stiffness: 280, damping: 28 }}
                className="mb-5"
              >
              <div className="flex items-center gap-2 mb-3">
                <div className="relative">
                  <Bell className="w-5 h-5" style={{ color: COLOR }} strokeWidth={2.5} />
                  <motion.span
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white"
                  />
                </div>
                <span className="font-black text-gray-900 text-base">Demandes de marchands</span>
                <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full bg-orange-500">
                  {demandesEnAttente.length} à traiter
                </span>
              </div>

              <div className="space-y-3">
                <AnimatePresence>
                  {demandesEnAttente.map((cmd, idx) => {
                    const statutInfo = getCtxStatutLabel(cmd.statut);
                    const countdown = formatCountdown(undefined);
                    const prixAffiche = cmd.prixUnitaire;
                    const lastMsg = null as string | null;

                    return (
                      <motion.div
                        key={cmd.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 60, height: 0, overflow: 'hidden' }}
                        transition={{ delay: idx * 0.07, type: 'spring', stiffness: 260, damping: 26 }}
                        onClick={() => { setSelectedDemande(cmd); setShowDemandeDetailModal(true); speak(`Demande de ${cmd.acheteurId} pour ${cmd.produit}`); }}
                        className="rounded-3xl border-2 overflow-hidden cursor-pointer shadow-md"
                        style={{
                          borderColor: '#f97316',
                          background: 'linear-gradient(135deg, #fff7ed, white)',
                        }}
                        whileHover={{ scale: 1.02, y: -3 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {/* Header */}
                        <div className="px-4 pt-3 pb-2 flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: statutInfo.bg, color: statutInfo.color }}
                              >
                                {statutInfo.label}
                              </span>
                              <motion.span
                                animate={{ opacity: [1, 0.4, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="text-[10px] font-bold text-orange-500"
                              >
                                {countdown}
                              </motion.span>
                            </div>
                            <p className="font-black text-gray-900 text-base leading-tight">{cmd.produit}</p>
                            <p className="text-sm text-gray-500 font-semibold">{cmd.acheteurNom || cmd.acheteurId}</p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 mt-1 flex-shrink-0" />
                        </div>

                        {/* Infos financières */}
                        <div className="px-4 pb-3 grid grid-cols-3 gap-2">
                          <div className="bg-white/80 rounded-2xl p-2 text-center">
                            <p className="text-[10px] text-gray-500 font-semibold">Quantité</p>
                            <p className="font-bold text-gray-900 text-sm">{(cmd.quantite || 0).toLocaleString('fr-FR')} kg</p>
                          </div>
                          <div className="bg-white/80 rounded-2xl p-2 text-center">
                            <p className="text-[10px] text-gray-500 font-semibold">Prix proposé</p>
                            <p className="font-bold text-sm text-orange-600">{Math.round(prixAffiche || 0).toLocaleString('fr-FR')} FCFA</p>
                          </div>
                          <div className="bg-white/80 rounded-2xl p-2 text-center">
                            <p className="text-[10px] text-gray-500 font-semibold">Total</p>
                            <p className="font-bold text-gray-900 text-sm">{Math.round(cmd.total || 0).toLocaleString('fr-FR')} FCFA</p>
                          </div>
                        </div>

                        {/* Message du marchand */}
                        {lastMsg && (
                          <div className="px-4 pb-3">
                            <div className="bg-orange-50 rounded-2xl px-3 py-2 border border-orange-200">
                              <p className="text-xs text-orange-800 italic leading-relaxed">"{lastMsg}"</p>
                            </div>
                          </div>
                        )}

                        {/* Boutons action — EN_ATTENTE */}
                        {cmd.statut === 'en_attente' && (
                          <div className="px-4 pb-4 grid grid-cols-3 gap-2">
                            <motion.button
                              onClick={e => { e.stopPropagation(); handleAccepterDemande(cmd); }}
                              className="py-2.5 rounded-2xl font-bold text-white text-xs flex items-center justify-center gap-1"
                              style={{ backgroundColor: COLOR }}
                              whileTap={{ scale: 0.93 }}
                            >
                              <ThumbsUp className="w-3.5 h-3.5" strokeWidth={2.5} />
                              Accepter
                            </motion.button>
                            <motion.button
                              onClick={e => { e.stopPropagation(); setSelectedDemande(cmd); setNouveauPrix(cmd.prixUnitaire); setShowContrePropoModal(true); }}
                              className="py-2.5 rounded-2xl font-bold text-white text-xs flex items-center justify-center gap-1 bg-purple-500"
                              whileTap={{ scale: 0.93 }}
                            >
                              <MessageSquare className="w-3.5 h-3.5" strokeWidth={2.5} />
                              Négocier
                            </motion.button>
                            <motion.button
                              onClick={e => { e.stopPropagation(); setSelectedDemande(cmd); setShowRefusModal(true); }}
                              className="py-2.5 rounded-2xl font-bold text-white text-xs flex items-center justify-center gap-1 bg-red-500"
                              whileTap={{ scale: 0.93 }}
                            >
                              <ThumbsDown className="w-3.5 h-3.5" strokeWidth={2.5} />
                              Refuser
                            </motion.button>
                          </div>
                        )}

                        {/* EN_NEGOCIATION — contre-proposition envoyée */}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* ── Liste de commandes ── */}
        <div className="space-y-3">
          {loading ? (
            <>
              {[0, 1, 2].map((idx) => (
                <div key={`skeleton-commande-${idx}`} className="bg-gray-200 rounded-2xl animate-pulse h-32" />
              ))}
            </>
          ) : filtered.length === 0 ? (
            <motion.div
              className="text-center py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-400 font-semibold">Aucune commande trouvée</p>
            </motion.div>
          ) : (
            filtered.map((cmd, index) => {
              const cfg = STATUT_CONFIG[cmd.statut];
              const isExterne = cmd.type === 'vente_directe';
              const apiCmd = ctxCommandes.find(c => c.id === cmd.id);
              const isFromNego = Boolean(
                ctxCommandes.find(c => c.id === cmd.id && c.negociationId)
              );
              const acheteurDisplay = cmd.acheteur?.length === 36 && cmd.acheteur.includes('-')
                ? 'Marchand'
                : cmd.acheteur || 'Marchand';

              return (
                <motion.div
                  key={cmd.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => { setSelectedCmd(cmd); setShowDetailModal(true); }}
                  className="rounded-3xl overflow-hidden cursor-pointer relative"
                  style={
                    isExterne
                      ? { background: '#EEEDFE99', border: '1.5px solid #7F77DD' }
                      : { background: cfg.bg, border: `1.5px solid ${cfg.border}` }
                  }
                  whileHover={{ scale: 1.01, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Shimmer */}
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                      zIndex: 1,
                    }}
                    initial={{ x: '-100%' }}
                    animate={{ x: '100%' }}
                    transition={{ duration: 0.8, delay: index * 0.05 + 0.2, ease: 'easeInOut' }}
                  />

                  {/* Header carte */}
                  <div className="relative z-[2] px-4 pt-4 pb-3 flex items-start gap-3">
                    {/* Image produit */}
                    <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0">
                      <ImageWithFallback
                        src={cmd.imageUrl || (PRODUITS_ICONS.find(p => p.id === cmd.produit)?.img ?? IMG_PRODUIT_AUTRE)}
                        alt={cmd.produit}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Infos principales */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-black text-gray-900 text-base leading-tight">{cmd.produit}</p>
                          <p className="text-sm text-gray-500 font-semibold mt-0.5 truncate">{acheteurDisplay}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{cmd.dateCommande} · {cmd.quantite} {cmd.unite}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span
                            className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                            style={
                              isExterne
                                ? { backgroundColor: '#E8E4FB', color: '#5B52B8' }
                                : { backgroundColor: cfg.badgeBg, color: cfg.badgeText }
                            }
                          >
                            {isExterne ? 'Externe' : cfg.label}
                          </span>
                          <span className="text-sm font-black" style={{ color: isExterne ? '#5B52B8' : COLOR }}>
                            {Math.round(cmd.prixTotal || 0).toLocaleString('fr-FR')} FCFA
                          </span>
                          {isFromNego && !isExterne && (
                            <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">Négo</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mini-blocs */}
                  <div
                    className={`relative z-[2] mx-4 grid grid-cols-2 gap-2 ${isExterne && apiCmd ? 'mb-2' : 'mb-4'}`}
                    style={{ borderTop: `1px solid ${isExterne ? '#7F77DD' : cfg.border}`, paddingTop: '10px' }}
                  >
                    <div className="bg-white rounded-2xl px-3 py-2">
                      <p className="text-[10px] text-gray-400 font-semibold">Quantité</p>
                      <p className="text-sm font-bold text-gray-800">{cmd.quantite} {cmd.unite}</p>
                    </div>
                    <div className="bg-white rounded-2xl px-3 py-2">
                      <p className="text-[10px] text-gray-400 font-semibold">Prix unitaire</p>
                      <p className="text-sm font-bold text-gray-800">{Math.round(cmd.prixUnitaire || 0).toLocaleString('fr-FR')} FCFA/{cmd.unite}</p>
                    </div>
                    <div className="bg-white rounded-2xl px-3 py-2">
                      <p className="text-[10px] text-gray-400 font-semibold">Acheteur</p>
                      <p className="text-sm font-bold text-gray-800 truncate">{acheteurDisplay}</p>
                    </div>
                    <div className="bg-white rounded-2xl px-3 py-2">
                      <p className="text-[10px] text-gray-400 font-semibold">Date</p>
                      <p className="text-sm font-bold text-gray-800">{cmd.dateCommande || '—'}</p>
                    </div>
                  </div>

                  {isExterne && apiCmd && (
                    <div
                      className="relative z-[2] px-4 pb-4 grid grid-cols-2 gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <motion.button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMarquerLivre(apiCmd);
                        }}
                        className="py-2.5 rounded-2xl font-bold text-white text-xs flex items-center justify-center gap-1"
                        style={{ backgroundColor: '#7F77DD' }}
                        whileTap={{ scale: 0.93 }}
                      >
                        <Truck className="w-3.5 h-3.5" strokeWidth={2.5} />
                        Marquer livré
                      </motion.button>
                      <motion.button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCmdForReception(apiCmd);
                          setShowReceptionModal(true);
                        }}
                        className="py-2.5 rounded-2xl font-bold text-white text-xs flex items-center justify-center gap-1"
                        style={{ backgroundColor: '#5B52B8' }}
                        whileTap={{ scale: 0.93 }}
                      >
                        <Banknote className="w-3.5 h-3.5" strokeWidth={2.5} />
                        Encaisser
                      </motion.button>
                    </div>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </SubPageLayout>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MODAL AJOUT — stepper 3 étapes                                     */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showAddModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeAddModal}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 30 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md bg-white rounded-3xl shadow-2xl z-[210] overflow-hidden flex flex-col"
              style={{ maxHeight: '90vh' }}
            >
              <div
                className="shrink-0 py-3 px-5 border-b border-white/20"
                style={{ backgroundColor: '#2E8B57' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="text-xl font-black text-white tracking-tight">Nouvelle vente</h2>
                  <button
                    type="button"
                    onClick={closeAddModal}
                    className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center hover:bg-white/40 transition-colors shrink-0"
                    aria-label="Fermer"
                  >
                    <X className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </button>
                </div>
                <p className="text-white/85 text-sm mt-1">Enregistre une vente manuellement</p>

                <div className="flex w-full items-center mt-4 px-0.5">
                  {[0, 1, 2].map((n) => (
                    <React.Fragment key={n}>
                      {n > 0 && (
                        <div
                          className={`flex-1 h-0.5 mx-1 rounded-full self-center min-w-[10px] ${
                            addStep >= n ? 'bg-white' : 'bg-white/30'
                          }`}
                        />
                      )}
                      <button
                        type="button"
                        onClick={() => goToAddStep(n)}
                        className={`w-9 h-9 rounded-full text-sm flex items-center justify-center shrink-0 transition-colors font-black ${
                          addStep === n
                            ? 'bg-white text-[#2E8B57] border-2 border-white'
                            : addStep > n
                              ? 'bg-white border-2 border-white text-[#2E8B57]'
                              : 'bg-transparent border-2 border-white/40 text-white/40'
                        }`}
                      >
                        {addStep > n ? <Check className="w-5 h-5" strokeWidth={3} /> : n + 1}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-1 mt-2 text-center">
                  {(['Produit', 'Acheteur', 'Détails'] as const).map((lab, n) => (
                    <button
                      key={lab}
                      type="button"
                      onClick={() => goToAddStep(n)}
                      className={`text-[10px] font-black ${addStep === n ? 'text-white' : 'text-white/60'}`}
                    >
                      {lab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-y-auto flex-1 min-h-0 bg-white">
                <motion.div
                  key={addStep}
                  initial={{ opacity: 0, x: stepDirection > 0 ? 40 : -40 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  className="p-5 space-y-5"
                >
                  {addStep === 0 && (
                    <>
                      <div>
                        <label className="block text-sm font-black text-gray-800 mb-2">Produit</label>
                        <input
                          type="text"
                          list={ADD_PRODUIT_DATALIST_ID}
                          value={newForm.produit}
                          onChange={(e) =>
                            setNewForm((prev) => ({ ...prev, produit: e.target.value }))
                          }
                          className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:outline-none focus:border-[#2E8B57] font-semibold text-gray-900"
                          placeholder="Rechercher ou saisir un produit..."
                          autoComplete="off"
                        />
                        <datalist id={ADD_PRODUIT_DATALIST_ID}>
                          {DATALIST_ADD_PRODUIT_VALUES.map((v) => (
                            <option key={v} value={v} />
                          ))}
                        </datalist>
                      </div>

                      <ImagePickerField
                        label="Photo du produit (facultatif)"
                        value={newProduitImage}
                        onChange={setNewProduitImage}
                        primaryColor={COLOR}
                        shape="rect"
                        size={88}
                        stretchRow
                      />

                      <motion.button
                        type="button"
                        onClick={() => goToAddStep(1)}
                        disabled={!newForm.produit.trim()}
                        className="w-full py-4 rounded-2xl font-bold text-white shadow-lg disabled:opacity-45 text-base"
                        style={{ backgroundColor: COLOR }}
                        whileTap={{ scale: 0.97 }}
                        whileHover={{ scale: 1.02 }}
                      >
                        Suivant →
                      </motion.button>
                    </>
                  )}

                  {addStep === 1 && (
                    <>
                      {(() => {
                        const telLen = newForm.telephone.replace(/\s/g, '').length;
                        const telHintInvalid = telLen > 0 && telLen < 10;
                        const step1SuivantDisabled =
                          newForm.acheteur.trim() === '' || telLen !== 10;
                        return (
                          <>
                            <div>
                              <label className="block text-sm font-black text-gray-800 mb-2">Nom complet</label>
                              <input
                                type="text"
                                value={newForm.acheteur}
                                onChange={(e) => setNewForm((prev) => ({ ...prev, acheteur: e.target.value }))}
                                className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 focus:outline-none font-semibold text-gray-900"
                                style={{ borderColor: newForm.acheteur ? COLOR : undefined }}
                                placeholder={"Nom de l'acheteur"}
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-black text-gray-800 mb-2">Téléphone</label>
                              <div className="flex rounded-2xl border-2 border-gray-200 overflow-hidden focus-within:border-[#2E8B57]">
                                <div className="px-3 flex items-center bg-gray-50 text-gray-700 font-bold text-sm border-r border-gray-200 shrink-0">
                                  +225
                                </div>
                                <input
                                  type="tel"
                                  inputMode="numeric"
                                  maxLength={14}
                                  value={newForm.telephone}
                                  onChange={(e) => {
                                    let v = e.target.value.replace(/\D/g, '');
                                    if (v.startsWith('225')) v = v.slice(3);
                                    v = v.slice(0, 10);
                                    const formatted = v.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
                                    setNewForm((prev) => ({ ...prev, telephone: formatted }));
                                  }}
                                  className="flex-1 min-w-0 px-3 py-3.5 font-semibold text-gray-900 outline-none"
                                  placeholder="07 00 00 00 00"
                                />
                              </div>
                              <p
                                className={`text-xs mt-1.5 font-medium ${
                                  telHintInvalid ? 'text-red-600' : 'text-gray-500'
                                }`}
                              >
                                10 chiffres obligatoires — format 07 00 00 00 00
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-black text-gray-800 mb-2">
                                Localité
                              </label>
                              <input
                                type="text"
                                value={newForm.localite}
                                onChange={(e) => setNewForm((prev) => ({ ...prev, localite: e.target.value }))}
                                className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 
    focus:outline-none focus:border-[#2E8B57] font-semibold text-gray-900"
                                placeholder="Ex: Abidjan, Bouaké, Yamoussoukro..."
                              />
                            </div>
                            <div className="flex gap-3 pt-1">
                              <button
                                type="button"
                                onClick={() => setAddStep(0)}
                                className="flex-1 py-4 rounded-2xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                              >
                                ← Retour
                              </button>
                              <motion.button
                                type="button"
                                onClick={() => goToAddStep(2)}
                                disabled={step1SuivantDisabled}
                                className="flex-1 py-4 rounded-2xl font-bold text-white shadow-lg text-base disabled:opacity-50"
                                style={{ backgroundColor: COLOR }}
                                whileTap={{ scale: 0.97 }}
                                whileHover={{ scale: 1.02 }}
                              >
                                Suivant →
                              </motion.button>
                            </div>
                          </>
                        );
                      })()}
                    </>
                  )}

                  {addStep === 2 && (
                    <>
                      <div>
                        <label className="block text-sm font-black text-gray-800 mb-2">Quantité</label>
                        <div className="flex items-center justify-center gap-4">
                          <motion.button
                            type="button"
                            onClick={() =>
                              setNewForm((prev) => ({
                                ...prev,
                                quantite: Math.max(0, prev.quantite - 1),
                              }))
                            }
                            className="w-12 h-12 rounded-full bg-gray-100 font-black text-xl text-gray-700"
                            whileTap={{ scale: 0.92 }}
                          >
                            −
                          </motion.button>
                          <span className="text-3xl font-bold tabular-nums min-w-[60px] text-center text-gray-900">
                            {newForm.quantite}
                          </span>
                          <motion.button
                            type="button"
                            onClick={() =>
                              setNewForm((prev) => ({
                                ...prev,
                                quantite: Math.max(0, prev.quantite + 1),
                              }))
                            }
                            className="w-12 h-12 rounded-full bg-gray-100 font-black text-xl text-gray-700"
                            whileTap={{ scale: 0.92 }}
                          >
                            +
                          </motion.button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-black text-gray-800 mb-2">Unité</label>
                        <select
                          value={['kg', 'tas', 'sac', 'L', 'régimes', 'unité'].includes(newForm.unite) ? newForm.unite : 'kg'}
                          onChange={(e) => setNewForm((prev) => ({ ...prev, unite: e.target.value }))}
                          className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 font-semibold text-gray-900 bg-white"
                        >
                          {['kg', 'tas', 'sac', 'L', 'régimes', 'unité'].map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-black text-gray-800 mb-2">Prix unitaire (FCFA)</label>
                        <input
                          type="number"
                          value={newForm.prixUnitaire || ''}
                          onChange={(e) =>
                            setNewForm((prev) => ({
                              ...prev,
                              prixUnitaire: e.target.value === '' ? '' : parseInt(e.target.value),
                            }))
                          }
                          className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 font-black text-2xl text-gray-900"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-black text-gray-800 mb-2">Date de livraison</label>
                        <input
                          type="date"
                          value={newForm.dateLivraison}
                          onChange={(e) => setNewForm((prev) => ({ ...prev, dateLivraison: e.target.value }))}
                          className="w-full px-4 py-3.5 rounded-2xl border-2 border-gray-200 font-semibold text-gray-900 bg-white"
                        />
                      </div>
                      <div className="rounded-2xl p-4 border border-[#A5D6A7] bg-[#E8F5E9]">
                        <p className="text-sm font-semibold text-[#1B5E20]/80">Total estimé</p>
                        <p className="text-2xl font-black mt-1 text-[#1B5E20]">
                          {Math.round(newForm.quantite * newForm.prixUnitaire).toLocaleString('fr-FR')} FCFA
                        </p>
                      </div>
                      <div className="flex gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => setAddStep(1)}
                          className="flex-1 py-4 rounded-2xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                        >
                          ← Retour
                        </button>
                        <motion.button
                          type="button"
                          onClick={() => void ajouterCommande()}
                          disabled={
                            !newForm.produit ||
                            !newForm.acheteur ||
                            newForm.quantite === 0 ||
                            newForm.prixUnitaire === 0
                          }
                          className="flex-1 py-4 rounded-2xl font-bold text-white shadow-lg text-base disabled:opacity-30 disabled:cursor-not-allowed"
                          style={{ backgroundColor: COLOR }}
                          whileTap={{ scale: 0.97 }}
                          whileHover={{ scale: 1.02 }}
                        >
                          Enregistrer
                        </motion.button>
                      </div>
                    </>
                  )}
                </motion.div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MODAL DÉTAIL COMMANDE                                              */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showDetailModal && selectedCmd && (() => {
          const cfg = STATUT_CONFIG[selectedCmd.statut];
          return (
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
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-h-[90vh] overflow-y-auto overflow-x-hidden"
              >
                {/* Header */}
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
                  <h2 className="text-xl font-bold">
                    {selectedCmd.type === 'vente_directe' ? 'Vente directe' : 'Détail commande'}
                  </h2>
                  <motion.button
                    onClick={() => setShowDetailModal(false)}
                    className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
                    whileHover={{ rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>

                <div className="w-full">
                  {/* Image hero */}
                  <div className="relative w-full h-40">
                    <ImageWithFallback
                      src={selectedCmd.imageUrl || selectedCmd.image}
                      alt={selectedCmd.produit}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-2xl font-bold text-white drop-shadow-2xl mb-2">{selectedCmd.produit}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className="text-xs px-3 py-1.5 rounded-full font-bold"
                          style={{
                            backgroundColor: selectedCmd.type === 'vente_directe'
                              ? '#7F77DD'
                              : cfg.color,
                            color: 'white',
                          }}
                        >
                          {selectedCmd.type === 'vente_directe'
                            ? (selectedCmd.statut === 'acceptee'
                              ? 'Confirmée'
                              : selectedCmd.statut === 'livree'
                                ? 'Livrée'
                                : selectedCmd.statut)
                            : cfg.label}
                        </span>
                        {selectedCmd.prime > 0 && (
                          <span className="text-xs bg-white/20 backdrop-blur-sm text-white px-3 py-1.5 rounded-full font-bold border border-white/30">
                            Prime +{selectedCmd.prime}%
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Corps */}
                  <div className="px-6 py-6 space-y-3">
                    {/* Barre de progression */}
                    {selectedCmd.type !== 'vente_directe' && (
                      <div className="rounded-2xl p-4" style={{ backgroundColor: `${cfg.color}10` }}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold text-gray-700">Progression</p>
                          <p className="font-bold text-sm" style={{ color: cfg.color }}>{cfg.label} — {selectedCmd.progression}%</p>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full rounded-full"
                            style={{ backgroundColor: cfg.color }}
                            initial={{ width: 0 }}
                            animate={{ width: `${selectedCmd.progression}%` }}
                            transition={{ duration: 1 }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Infos quantité */}
                    <div className="rounded-2xl p-4" style={{ backgroundColor: `${COLOR}08` }}>
                      <p className="text-sm font-semibold text-gray-700 mb-2">Quantité commandée</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold" style={{ color: COLOR }}>{selectedCmd.quantite}</span>
                        <span className="text-lg text-gray-500 font-semibold">{selectedCmd.unite}</span>
                      </div>
                    </div>

                    {/* Finances */}
                    <div className="bg-gray-50 rounded-2xl p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm text-gray-600">Prix unitaire</p>
                          <p className="font-bold text-gray-900">
                            <Montant value={selectedCmd.prixUnitaire} unit={selectedCmd.unite} size="sm" color="#1f2937" />
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">Montant total</p>
                          <p className="text-base font-bold" style={{ color: COLOR }}>
                            <Montant value={selectedCmd.prixTotal} size="md" color={COLOR} />
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Acheteur */}
                    <div className="bg-blue-50 rounded-2xl p-4 space-y-2">
                      <p className="text-sm font-bold text-gray-700 mb-1">Acheteur</p>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-gray-800">{selectedCmd.acheteur}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-blue-600" />
                        <a href={`tel:${selectedCmd.telephone}`} className="font-semibold text-blue-700">{selectedCmd.telephone}</a>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-gray-800">{selectedCmd.localite}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-blue-600" />
                        <span className="text-sm text-gray-600">Livraison : {selectedCmd.dateLivraison}</span>
                      </div>
                    </div>

                    {selectedCmd.type === 'vente_directe' ? (
                      (() => {
                        const apiCmd = ctxCommandes.find(c => c.id === selectedCmd.id);
                        if (!apiCmd) return null;
                        const st = apiCmd.statut;
                        return (
                          <div className="space-y-2">
                            {st === 'confirmee' && (
                              <motion.button
                                type="button"
                                onClick={async () => {
                                  try {
                                    await livrerCommande(selectedCmd.id);
                                    speak('Commande marquée comme livrée');
                                    setShowDetailModal(false);
                                  } catch (e: unknown) {
                                    const msg = e instanceof Error ? e.message : '';
                                    speak(msg ? `Erreur : ${msg}` : 'Impossible de marquer comme livrée');
                                  }
                                }}
                                className="w-full py-4 rounded-2xl text-white font-bold flex items-center justify-center gap-2"
                                style={{ backgroundColor: '#534AB7' }}
                                whileTap={{ scale: 0.97 }}
                                whileHover={{ scale: 1.02 }}
                              >
                                <Truck className="w-5 h-5" strokeWidth={2.5} />
                                Marquer livré
                              </motion.button>
                            )}
                            {st === 'livree' && (
                              <motion.button
                                type="button"
                                onClick={() => {
                                  const cmd = ctxCommandes.find(c => c.id === selectedCmd?.id);
                                  if (cmd) {
                                    setSelectedCmdForReception(cmd);
                                    setShowReceptionModal(true);
                                    setShowDetailModal(false);
                                  }
                                }}
                                className="w-full py-4 rounded-2xl text-white font-bold flex items-center justify-center gap-2"
                                style={{ backgroundColor: COLOR }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.97 }}
                              >
                                <Banknote className="w-5 h-5" strokeWidth={2.5} />
                                Encaisser
                              </motion.button>
                            )}
                          </div>
                        );
                      })()
                    ) : (
                      <>
                        {/* Changement de statut */}
                        {selectedCmd.statut !== 'cloturee' && selectedCmd.statut !== 'livree' && (
                          <div className="space-y-2">
                            <p className="text-sm font-bold text-gray-700">Mettre à jour le statut</p>
                            <div className="grid grid-cols-2 gap-2">
                              {selectedCmd.statut === 'nouvelle' && (
                                <motion.button
                                  onClick={() => changerStatut(selectedCmd.id, 'acceptee')}
                                  className="py-3 rounded-2xl text-white font-bold flex items-center justify-center gap-2"
                                  style={{ backgroundColor: '#3b82f6' }}
                                  whileTap={{ scale: 0.97 }}
                                >
                                  <CheckCircle className="w-4 h-4" /> Accepter
                                </motion.button>
                              )}
                              {(selectedCmd.statut === 'acceptee' || selectedCmd.statut === 'preparation') && (
                                <motion.button
                                  onClick={() => changerStatut(selectedCmd.id, 'livree')}
                                  className="py-3 rounded-2xl text-white font-bold flex items-center justify-center gap-2"
                                  style={{ backgroundColor: '#10b981' }}
                                  whileTap={{ scale: 0.97 }}
                                >
                                  <Truck className="w-4 h-4" /> Livrer
                                </motion.button>
                              )}
                              {selectedCmd.statut === 'litige' && (
                                <motion.button
                                  onClick={() => changerStatut(selectedCmd.id, 'cloturee')}
                                  className="py-3 rounded-2xl text-white font-bold flex items-center justify-center gap-2 col-span-2"
                                  style={{ backgroundColor: '#6b7280' }}
                                  whileTap={{ scale: 0.97 }}
                                >
                                  <CheckCircle className="w-4 h-4" /> Clôturer le litige
                                </motion.button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Annuler */}
                        {!['cloturee', 'livree'].includes(selectedCmd.statut) && (
                          selectedCmd.statut === 'acceptee' ? (
                            <div className="flex gap-3 px-4 pb-4">
                              <motion.button
                                onClick={() => changerStatut(selectedCmd.id, 'preparation')}
                                disabled={isUpdatingStatut}
                                className="flex-[65] py-3 rounded-2xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                                style={{ backgroundColor: '#4CAF50' }}
                                whileTap={{ scale: 0.97 }}
                              >
                                {isUpdatingStatut ? (
                                  <span className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Package className="w-4 h-4" />
                                )}
                                Préparer la commande
                              </motion.button>
                              <motion.button
                                onClick={async () => {
                                  try {
                                    await cancelCommande(selectedCmd.id);
                                    await refreshCommandes();
                                    speak('Commande annulée');
                                    setShowDetailModal(false);
                                  } catch (e: any) {
                                    console.warn('[CommandesProducteur] cancelCommande failed:', e?.message);
                                    speak(`Erreur : ${e.message}`);
                                  }
                                }}
                                className="flex-[35] py-3 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
                                style={{ backgroundColor: '#ef4444' }}
                                whileTap={{ scale: 0.97 }}
                              >
                                <XCircle className="w-5 h-5" />
                                Annuler
                              </motion.button>
                            </div>
                          ) : (
                            <motion.button
                              onClick={async () => {
                                try {
                                  await cancelCommande(selectedCmd.id);
                                  await refreshCommandes();
                                  speak('Commande annulée');
                                  setShowDetailModal(false);
                                } catch (e: any) {
                                  console.warn('[CommandesProducteur] cancelCommande failed:', e?.message);
                                  speak(`Erreur : ${e.message}`);
                                }
                              }}
                              className="w-full py-4 rounded-2xl bg-red-500 text-white font-bold flex items-center justify-center gap-2"
                              whileTap={{ scale: 0.95 }}
                              whileHover={{ scale: 1.02 }}
                            >
                              <Trash2 className="w-5 h-5" />
                              Annuler la commande
                            </motion.button>
                          )
                        )}
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MODAL FILTRES                                                       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showFilterModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end px-4 pb-4"
            onClick={() => setShowFilterModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-h-[85vh] overflow-y-auto"
            >
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="text-xl font-bold">Filtres et tri</h2>
                <motion.button
                  onClick={() => setShowFilterModal(false)}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
                  whileHover={{ rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="p-6 space-y-6">
                {/* Statut */}
                <div>
                  <h3 className="font-bold mb-3">Statut</h3>
                  <div className="space-y-2">
                    {statuts.map(st => (
                      <button
                        key={st.id}
                        onClick={() => { setSelectedStatut(st.id); setShowFilterModal(false); }}
                        className="w-full px-4 py-3 rounded-xl text-left font-semibold"
                        style={{
                          backgroundColor: selectedStatut === st.id ? COLOR : '#F3F4F6',
                          color: selectedStatut === st.id ? 'white' : '#374151',
                        }}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Catégorie */}
                <div>
                  <h3 className="font-bold mb-3">Catégorie</h3>
                  <div className="space-y-2">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => { setSelectedCategorie(cat.id); setShowFilterModal(false); }}
                        className="w-full px-4 py-3 rounded-xl text-left font-semibold"
                        style={{
                          backgroundColor: selectedCategorie === cat.id ? COLOR : '#F3F4F6',
                          color: selectedCategorie === cat.id ? 'white' : '#374151',
                        }}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tri */}
                <div>
                  <h3 className="font-bold mb-3">Trier par</h3>
                  <div className="space-y-2">
                    {sortOptions.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => { setSortBy(opt.id); setShowFilterModal(false); }}
                        className="w-full px-4 py-3 rounded-xl text-left font-semibold"
                        style={{
                          backgroundColor: sortBy === opt.id ? COLOR : '#F3F4F6',
                          color: sortBy === opt.id ? 'white' : '#374151',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MODAL REVENUS                                                       */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showRevenusModal && (() => {
          const enAttente = commandes.filter(c => !['livree','cloturee'].includes(c.statut));
          const encaisse = commandes.filter(c => ['livree','cloturee'].includes(c.statut));
          const revEnAttente = enAttente.reduce((s, c) => s + c.prixTotal, 0);
          const revEncaisse = encaisse.reduce((s, c) => s + c.prixTotal, 0);
          const revTotal = revEnAttente + revEncaisse;

          const catStats = categories
            .filter(c => c.id !== 'tous')
            .map(cat => {
              const items = commandes.filter(c => c.categorie === cat.id);
              const val = items.reduce((s, c) => s + c.prixTotal, 0);
              return { ...cat, val, count: items.length };
            })
            .filter(c => c.count > 0)
            .sort((a, b) => b.val - a.val);

          const maxCat = Math.max(...catStats.map(c => c.val), 1);

          const top3 = [...commandes]
            .sort((a, b) => b.prixTotal - a.prixTotal)
            .slice(0, 3);

          return (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end px-4 pb-4"
              onClick={() => setShowRevenusModal(false)}
            >
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25 }}
                onClick={e => e.stopPropagation()}
                className="bg-white rounded-3xl w-full max-h-[85vh] overflow-y-auto"
              >
                {/* Header */}
                <div
                  className="sticky top-0 px-6 py-5 flex items-center justify-between rounded-t-3xl z-10"
                  style={{ background: `linear-gradient(135deg, ${COLOR}, #1a5c38)` }}
                >
                  <div>
                    <h2 className="text-xl font-bold text-white">Revenus Commandes</h2>
                    <p className="text-sm mt-0.5" style={{ color: '#a7f3d0' }}>Analyse financière complète</p>
                  </div>
                  <motion.button
                    onClick={() => setShowRevenusModal(false)}
                    className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"
                    whileHover={{ rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <X className="w-5 h-5 text-white" />
                  </motion.button>
                </div>

                <div className="p-6 space-y-6">
                  {/* KPIs financiers */}
                  <div className="grid grid-cols-2 gap-3">
                    <motion.div
                      className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-2xl p-4 border-2 border-orange-200"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                          <Clock className="w-4 h-4 text-white" strokeWidth={2.5} />
                        </div>
                        <p className="text-xs font-semibold text-gray-700">En attente</p>
                      </div>
                      <p className="text-xl font-bold text-orange-600">
                        <Montant value={revEnAttente} size="lg" color="#d97706" />
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{enAttente.length} commande{enAttente.length > 1 ? 's' : ''}</p>
                    </motion.div>

                    <motion.div
                      className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-4 border-2 border-green-200"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-white" strokeWidth={2.5} />
                        </div>
                        <p className="text-xs font-semibold text-gray-700">Encaissé</p>
                      </div>
                      <p className="text-xl font-bold text-green-600">
                        <Montant value={revEncaisse} size="lg" color="#16a34a" />
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{encaisse.length} commande{encaisse.length > 1 ? 's' : ''}</p>
                    </motion.div>

                    <motion.div
                      className="col-span-2 rounded-2xl p-4 border-2"
                      style={{ background: `linear-gradient(135deg, ${COLOR}15, ${COLOR}08)`, borderColor: `${COLOR}40` }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: COLOR }}>
                          <TrendingUp className="w-4 h-4 text-white" strokeWidth={2.5} />
                        </div>
                        <p className="text-xs font-semibold text-gray-700">Portefeuille total</p>
                      </div>
                      <p className="text-2xl font-bold" style={{ color: COLOR }}>
                        <Montant value={revTotal} size="xl" color={COLOR} />
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{commandes.length} commandes au total</p>
                    </motion.div>
                  </div>

                  {/* Répartition par catégorie */}
                  <motion.div
                    className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-5 border-2 border-blue-200"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                        <SlidersHorizontal className="w-4 h-4 text-white" strokeWidth={2.5} />
                      </div>
                      Répartition par catégorie
                    </h3>
                    <div className="space-y-3">
                      {catStats.map((cat, i) => (
                        <motion.div
                          key={cat.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + i * 0.1 }}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-semibold text-gray-700">{cat.label}</span>
                            <span className="text-xs font-bold text-blue-600">
                              {(cat.val || 0).toLocaleString('fr-FR')} <span className="text-[10px] opacity-60 font-bold">FCFA</span>
                            </span>
                          </div>
                          <div className="h-2.5 bg-white rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: `linear-gradient(90deg, ${COLOR}, #1a5c38)` }}
                              initial={{ width: 0 }}
                              animate={{ width: `${(cat.val / maxCat) * 100}%` }}
                              transition={{ duration: 1, delay: 0.6 + i * 0.1 }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">{cat.count} commande{cat.count > 1 ? 's' : ''}</p>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>

                  {/* Top 3 commandes */}
                  <motion.div
                    className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl p-5 border-2 border-amber-200"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                  >
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-white" />
                      </div>
                      Top 3 commandes par valeur
                    </h3>
                    <div className="space-y-3">
                      {top3.map((cmd, i) => (
                        <motion.div
                          key={cmd.id}
                          className="bg-white rounded-xl p-3 flex items-center gap-3"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.8 + i * 0.1 }}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm ${
                            i === 0 ? 'bg-yellow-500' : i === 1 ? 'bg-gray-400' : 'bg-orange-600'
                          }`}>
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-800 text-sm truncate">{cmd.produit}</p>
                            <p className="text-xs text-gray-500 truncate">{cmd.acheteur}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-sm" style={{ color: COLOR }}>
                              <Montant value={cmd.prixTotal} size="xs" color={COLOR} />
                            </p>
                            <p className="text-xs text-gray-500">{cmd.quantite} {cmd.unite}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MODAL DÉTAIL DEMANDE MARCHAND                                      */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showDemandeDetailModal && selectedDemande && (() => {
          const statutInfo = getCtxStatutLabel(selectedDemande.statut);
          const prixAffiche = selectedDemande.prixUnitaire;
          const countdown = formatCountdown(undefined);
          return (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowDemandeDetailModal(false)}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.93, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.93, y: 30 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md bg-white rounded-3xl shadow-2xl z-[210] overflow-hidden"
                style={{ maxHeight: '90vh' }}
              >
                {/* Header */}
                <div
                  className="px-6 py-5 flex items-start justify-between"
                  style={{ background: `linear-gradient(135deg, ${COLOR}, #1a5c38)` }}
                >
                  <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5" strokeWidth={2.5} />
                      Demande de {selectedDemande.acheteurNom || 'Marchand'}
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowDemandeDetailModal(false)}
                    className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center hover:bg-white/40 transition-colors"
                  >
                    <X className="w-5 h-5 text-white" strokeWidth={2.5} />
                  </button>
                </div>

                <div className="overflow-y-auto" style={{ maxHeight: 'calc(90vh - 90px)' }}>
                  <div className="p-5 space-y-4">

                    {/* Statut + countdown */}
                    <div
                      className="rounded-2xl p-4 flex items-center justify-between border-2"
                      style={{ backgroundColor: statutInfo.bg, borderColor: `${statutInfo.color}40` }}
                    >
                      <div>
                        <p className="text-xs font-semibold text-gray-600">Statut de la demande</p>
                        <p className="font-black text-lg mt-0.5" style={{ color: statutInfo.color }}>{statutInfo.label}</p>
                      </div>
                      {countdown && (
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Expire dans</p>
                          <motion.p
                            animate={{ opacity: [1, 0.5, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="text-sm font-bold text-orange-500"
                          >
                            {countdown}
                          </motion.p>
                        </div>
                      )}
                    </div>

                    {/* Produit + montants */}
                    <div className="rounded-2xl p-4 border-2 border-gray-100 bg-gray-50 space-y-3">
                      <p className="font-black text-gray-900 text-lg">{selectedDemande.produit}</p>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-white rounded-xl p-2.5 text-center">
                          <p className="text-[10px] text-gray-500 font-semibold">Quantité</p>
                          <p className="font-bold text-gray-900">{(selectedDemande.quantite || 0).toLocaleString('fr-FR')}</p>
                          <p className="text-[10px] text-gray-400">kg</p>
                        </div>
                        <div className="bg-white rounded-xl p-2.5 text-center">
                          <p className="text-[10px] text-gray-500 font-semibold">Prix proposé</p>
                          <p className="font-bold" style={{ color: COLOR }}>{Math.round(selectedDemande.prixUnitaire || 0).toLocaleString('fr-FR')}</p>
                          <p className="text-[10px] text-gray-400">FCFA/kg</p>
                        </div>
                        <div className="bg-white rounded-xl p-2.5 text-center">
                          <p className="text-[10px] text-gray-500 font-semibold">Montant</p>
                          <p className="font-bold text-gray-900 text-sm">{Math.round(selectedDemande.total || 0).toLocaleString('fr-FR')}</p>
                          <p className="text-[10px] text-gray-400">FCFA</p>
                        </div>
                      </div>
                    </div>

                    {/* Acheteur */}
                    <div className="bg-blue-50 rounded-2xl p-4 border-2 border-blue-100">
                      <p className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-600" />
                        Acheteur
                      </p>
                      <p className="font-black text-gray-900">{selectedDemande.acheteurNom || selectedDemande.acheteurId}</p>
                      <p className="text-sm text-blue-600 font-semibold capitalize">{selectedDemande.acheteurRole || 'Marchand'}</p>
                    </div>

                    {/* Actions */}
                    {selectedDemande.statut === 'en_attente' && (
                      <div className="space-y-2 pt-2">
                        <motion.button
                          onClick={() => handleAccepterDemande(selectedDemande)}
                          disabled={isSubmittingDemande}
                          className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                          style={{ backgroundColor: COLOR }}
                          whileTap={{ scale: 0.97 }}
                        >
                          <ThumbsUp className="w-5 h-5" strokeWidth={2.5} />
                          {isSubmittingDemande ? 'Traitement...' : 'Accepter la demande'}
                        </motion.button>
                        <div className="grid grid-cols-2 gap-2">
                          <motion.button
                            onClick={() => { setNouveauPrix(selectedDemande.prixUnitaire); setShowContrePropoModal(true); }}
                            className="py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-1.5 bg-purple-500"
                            whileTap={{ scale: 0.97 }}
                          >
                            <MessageSquare className="w-4 h-4" strokeWidth={2.5} />
                            Négocier
                          </motion.button>
                          <motion.button
                            onClick={() => setShowRefusModal(true)}
                            className="py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-1.5 bg-red-500"
                            whileTap={{ scale: 0.97 }}
                          >
                            <ThumbsDown className="w-4 h-4" strokeWidth={2.5} />
                            Refuser
                          </motion.button>
                        </div>
                      </div>
                    )}

                    {selectedDemande.statut === 'confirmee' && (
                      <motion.button
                        onClick={() => handleMarquerLivre(selectedDemande)}
                        disabled={isSubmittingDemande}
                        className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 bg-emerald-500 disabled:opacity-50"
                        whileTap={{ scale: 0.97 }}
                      >
                        <Truck className="w-5 h-5" strokeWidth={2.5} />
                        {isSubmittingDemande ? 'Traitement...' : 'Confirmer la livraison'}
                      </motion.button>
                    )}

                    {selectedDemande.statut === 'livree' && (
                      <motion.button
                        onClick={() => handleRecupererPaiement(selectedDemande)}
                        disabled={isRecupererPaiementLoading}
                        className="w-full py-4 rounded-2xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                        style={{ backgroundColor: '#4CAF50' }}
                        whileTap={{ scale: 0.97 }}
                      >
                        <Banknote className="w-5 h-5" strokeWidth={2.5} />
                        {isRecupererPaiementLoading ? 'Traitement...' : 'Récupérer keiwa'}
                      </motion.button>
                    )}

                    {/* Infos status non-actionnable */}
                    {selectedDemande.statut === 'en_cours' && (
                      <div className="rounded-2xl bg-amber-50 border-2 border-amber-200 p-4 flex items-start gap-3">
                        <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" strokeWidth={2.5} />
                        <div>
                          <p className="font-bold text-amber-800 text-sm">
                            Commande en cours de traitement ou de livraison.
                          </p>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </motion.div>
            </>
          );
        })()}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MODAL CONTRE-PROPOSITION                                           */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showContrePropoModal && selectedDemande && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowContrePropoModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 30 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-sm bg-white rounded-3xl shadow-2xl z-[210] overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-purple-500 px-6 py-5 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" strokeWidth={2.5} />
                    Proposer ton prix
                  </h2>
                  <p className="text-white/80 text-sm mt-1">Prix actuel : {Math.round(selectedDemande.prixUnitaire || 0).toLocaleString('fr-FR')} FCFA/kg</p>
                </div>
                <button
                  onClick={() => setShowContrePropoModal(false)}
                  className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center hover:bg-white/40"
                >
                  <X className="w-5 h-5 text-white" strokeWidth={2.5} />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Saisie prix */}
                <div>
                  <label className="block font-black text-gray-900 text-base mb-3">
                    Ton prix (FCFA/kg)
                  </label>
                  <div className="flex items-center gap-3">
                    <motion.button
                      onClick={() => setNouveauPrix(p => Math.max(50, p - 50))}
                      className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center font-bold text-xl text-gray-700"
                      whileTap={{ scale: 0.9 }}
                    >
                      -
                    </motion.button>
                    <input
                      type="number"
                      value={nouveauPrix || ''}
                      onChange={e => setNouveauPrix(e.target.value === '' ? '' : parseInt(e.target.value))}
                      className="flex-1 px-4 py-4 rounded-2xl border-2 focus:outline-none font-black text-3xl text-gray-900 text-center bg-white"
                      style={{ borderColor: '#8b5cf6' }}
                    />
                    <motion.button
                      onClick={() => setNouveauPrix(p => p + 50)}
                      className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center font-bold text-xl text-gray-700"
                      whileTap={{ scale: 0.9 }}
                    >
                      +
                    </motion.button>
                  </div>
                  {/* Comparaison */}
                  {nouveauPrix > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-3 rounded-2xl p-3 bg-purple-50 border border-purple-200"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Prix marchand</span>
                        <span className="font-bold text-gray-400 line-through">{Math.round(selectedDemande.prixUnitaire || 0).toLocaleString('fr-FR')} FCFA</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-gray-600">Ton prix</span>
                        <span className="font-black text-purple-700">{(nouveauPrix || 0).toLocaleString('fr-FR')} FCFA</span>
                      </div>
                      <div className="flex items-center justify-between text-sm mt-1 border-t border-purple-200 pt-2">
                        <span className="text-gray-600">Nouveau total</span>
                        <span className="font-black text-purple-700">{(nouveauPrix * selectedDemande.quantite).toLocaleString('fr-FR')} FCFA</span>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Message optionnel */}
                <div>
                  <label className="block font-black text-gray-900 text-sm mb-2">Message (facultatif)</label>
                  <textarea
                    value={messageContrePropo}
                    onChange={e => setMessageContrePropo(e.target.value)}
                    placeholder="Ex: Ce prix correspond à la qualité extra de ma récolte..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none font-semibold text-sm text-gray-700 resize-none"
                  />
                </div>

                {/* Boutons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowContrePropoModal(false)}
                    className="flex-1 py-4 rounded-2xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    Annuler
                  </button>
                  <motion.button
                    onClick={handleContreProposer}
                    disabled={isSubmittingDemande || nouveauPrix <= 0}
                    className="flex-1 py-4 rounded-2xl font-bold text-white shadow-lg disabled:opacity-50 bg-purple-500"
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    {isSubmittingDemande ? 'Envoi...' : 'Envoyer'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* MODAL REFUS                                                         */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <AnimatePresence>
        {showRefusModal && selectedDemande && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowRefusModal(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 30 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-sm bg-white rounded-3xl shadow-2xl z-[210] overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-5 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <ThumbsDown className="w-5 h-5" strokeWidth={2.5} />
                    Refuser la demande
                  </h2>
                  <p className="text-white/80 text-sm mt-1">Indique pourquoi tu refuses</p>
                </div>
                <button
                  onClick={() => setShowRefusModal(false)}
                  className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center hover:bg-white/40"
                >
                  <X className="w-5 h-5 text-white" strokeWidth={2.5} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* Raisons rapides */}
                <div>
                  <label className="block font-black text-gray-900 text-sm mb-3">Raison du refus</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      'Stock épuisé pour ce produit',
                      'Prix proposé trop bas',
                      'Quantité trop importante',
                      'Délai de livraison impossible',
                      'Produit non disponible en ce moment',
                    ].map(raison => (
                      <motion.button
                        key={raison}
                        onClick={() => setRaisonRefus(raison)}
                        className={`py-3 px-4 rounded-2xl text-left font-semibold text-sm border-2 transition-all ${
                          raisonRefus === raison
                            ? 'border-red-400 bg-red-50 text-red-700'
                            : 'border-gray-200 bg-gray-50 text-gray-700'
                        }`}
                        whileTap={{ scale: 0.97 }}
                      >
                        {raison}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <textarea
                  value={raisonRefus}
                  onChange={e => setRaisonRefus(e.target.value)}
                  placeholder="Ou écris ta raison ici..."
                  rows={2}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none font-semibold text-sm text-gray-700 resize-none"
                />

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRefusModal(false)}
                    className="flex-1 py-4 rounded-2xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    Annuler
                  </button>
                  <motion.button
                    onClick={handleRefuserDemande}
                    disabled={isSubmittingDemande || !raisonRefus.trim()}
                    className="flex-1 py-4 rounded-2xl font-bold text-white shadow-lg disabled:opacity-50 bg-red-500"
                    whileTap={{ scale: 0.97 }}
                  >
                    {isSubmittingDemande ? 'Envoi...' : 'Confirmer le refus'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ReceptionPaiementModal
        isOpen={showReceptionModal}
        onClose={() => { setShowReceptionModal(false); setSelectedCmdForReception(null); }}
        commande={selectedCmdForReception ? {
          id: selectedCmdForReception.id,
          produit: selectedCmdForReception.produit,
          quantite: selectedCmdForReception.quantite,
          unite: 'kg',
          total: selectedCmdForReception.total,
          vendeurNom: user?.prenoms ? `${user.prenoms} ${user.nom ?? ''}`.trim() : undefined,
          acheteurNom: selectedCmdForReception.acheteurNom || selectedCmdForReception.acheteurId,
          dateLivraisonPrevue: selectedCmdForReception.dateLivraison,
        } : null}
        role="producteur"
        onPaiement={async (commandeId) => {
          await recupererPaiement(commandeId);
        }}
        onSuccess={async () => {
          setShowReceptionModal(false);
          setSelectedCmdForReception(null);
          await refreshCommandes();
          toast.success("Paiement encaissé avec succès !");
          speak("Paiement encaissé ! L'argent est dans ton Keiwa.");
        }}
      />

    </>
  );
}
