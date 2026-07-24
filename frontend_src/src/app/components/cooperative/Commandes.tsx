import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ImagePickerField } from '../shared/ImagePickerField';
import { SelectWithAutre } from '../shared/SelectWithAutre';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package,
  Users,
  Clock,
  Truck,
  CheckCircle,
  Calendar,
  MapPin,
  Plus,
  Search,
  Mic,
  MicOff,
  X,
  Send,
  ChevronRight,
  Phone,
  Wallet,
  FileText,
  AlertTriangle,
  ArrowRight,
  History,
  ShoppingBag,
  ShoppingCart,
  Edit3,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Bell,
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { useUser } from '../../contexts/UserContext';
import {
  fetchNegociations,
  repondreNegociation,
} from '../../../imports/commandes-api';
import { useModalRegister } from '../../contexts/ModalContext';
import { toast } from 'sonner';
import { SearchBar } from '../shared/SearchBar';
import { matchesSearch } from '../../utils/searchUtils';
import { SubPageLayout } from '../layout/SubPageLayout';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { API_URL } from '../../utils/api';
import { apiRequest } from '../../../imports/api-client';
import * as commandesApi from '../../../imports/commandes-api';
import { ReceptionPaiementModal } from '../shared/ReceptionPaiementModal';

const C = '#2072AF';
const C_DARK = '#1E5A8E';
const C_LIGHT = '#EBF4FB';

type StatutCommande = 'brouillon' | 'envoyee' | 'confirmee' | 'en_livraison' | 'livree';

interface Commande {
  id: string;
  produit: string;
  quantite: number;
  unite: string;
  nombreMembres: number;
  producteur: string;
  localisation: string;
  dateCreation: string;
  dateLivraison: string;
  statut: StatutCommande;
  montantTotal: number;
  statutPaiement?: string;
  telephone?: string;
}

const STATUT_CONFIG: Record<StatutCommande, { label: string; icon: React.ElementType; color: string; bg: string; border: string; gradient: string }> = {
  brouillon:    { label: 'Brouillon',    icon: Edit3,       color: '#9CA3AF', bg: 'bg-gray-100',   border: 'border-gray-300',  gradient: 'from-gray-50 via-white to-gray-50'   },
  envoyee:      { label: 'Envoyée',      icon: Send,        color: '#EA580C', bg: 'bg-orange-100', border: 'border-orange-300', gradient: 'from-orange-50 via-white to-orange-50' },
  confirmee:    { label: 'Confirmée',    icon: CheckCircle, color: '#2072AF', bg: 'bg-blue-100',   border: 'border-blue-300',   gradient: 'from-blue-50 via-white to-blue-50'   },
  en_livraison: { label: 'En livraison', icon: Truck,       color: '#8B5CF6', bg: 'bg-purple-100', border: 'border-purple-300', gradient: 'from-purple-50 via-white to-purple-50' },
  livree:       { label: 'Livrée',       icon: CheckCircle, color: '#16A34A', bg: 'bg-green-100',  border: 'border-green-300',  gradient: 'from-green-50 via-white to-green-50'  },
};

type FilterType = 'all' | StatutCommande;

type PageTab = 'commandes' | 'besoins_membres';
type CooperativeBesoinsRole = 'president' | 'membre';

interface CooperativeBesoin {
  id: string;
  commande_id?: string;
  membre_id: string;
  cooperative_id: string;
  produit: string;
  categorie: string;
  quantite: number;
  unite: string;
  prix_max: number | null;
  priorite: string;
  statut: string;
  notes: string | null;
  prix_achat: number | null;
  prix_dispatch: number | null;
  quantite_attribuee: number | null;
  created_at: string;
  updated_at: string;
}

const BESOIN_STATUT_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  en_cours: 'En cours',
  approuve: 'Approuvé',
  livre: 'Livré',
};

const BESOIN_STATUT_OPTIONS = ['en_attente', 'en_cours', 'approuve', 'livre'] as const;

interface Negociation {
  id: string;
  marchandId: string;
  vendeurId: string;
  produit: string;
  quantite: number;
  prixOriginal: number;
  prixPropose: number;
  unite: string;
  message: string;
  statut: 'en_attente' | 'accepte' | 'refuse' | 'contre_offre';
  prixContreOffre: number | null;
  messageReponse: string | null;
  nbContreOffres: number;
  createdAt: string;
}

const NEG_STATUT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  en_attente:   { label: 'En attente',   color: '#f59e0b', bg: '#fef3c7' },
  accepte:      { label: 'Acceptée',     color: '#10b981', bg: '#d1fae5' },
  refuse:       { label: 'Refusée',      color: '#ef4444', bg: '#fee2e2' },
  contre_offre: { label: 'Contre-offre', color: '#8b5cf6', bg: '#f3e8ff' },
};

export function Commandes() {
  const { speak } = useApp();
  const { user } = useUser();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedCommande, setSelectedCommande] = useState<Commande | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newStep, setNewStep] = useState(1);

  // Form nouvelle commande
  const [newProduit, setNewProduit] = useState('');
  const [newProduitImage, setNewProduitImage] = useState('');
  const [newQuantite, setNewQuantite] = useState('');
  const [newUnite, setNewUnite] = useState('kg');
  const [newProducteur, setNewProducteur] = useState('');
  const [newLocalisation, setNewLocalisation] = useState('');
  const [newDateLivraison, setNewDateLivraison] = useState('');
  const [newNombreMembres, setNewNombreMembres] = useState('');
  const [newPrixUnitaire, setNewPrixUnitaire] = useState('');
  const [livraisonNom, setLivraisonNom] = useState('');
  const [livraisonTelephone, setLivraisonTelephone] = useState('');
  const [livraisonLocalite, setLivraisonLocalite] = useState('');
  const [livraisonNotes, setLivraisonNotes] = useState('');
  const [livraisonTierce, setLivraisonTierce] = useState(false);
  const [modeReceptionCmd, setModeReceptionCmd] = useState<'livraison' | 'enlevement'>('livraison');

  const [commandes, setCommandes] = useState<Commande[]>([]);

  const [negociations, setNegociations] = useState<Negociation[]>([]);
  const [loadingNegs, setLoadingNegs] = useState(false);
  const [selectedNeg, setSelectedNeg] = useState<Negociation | null>(null);
  const [showContrePropoModal, setShowContrePropoModal] = useState(false);
  const [showRefusModal, setShowRefusModal] = useState(false);
  const [nouveauPrix, setNouveauPrix] = useState(0);
  const [messageContrePropo, setMessageContrePropo] = useState('');
  const [raisonRefus, setRaisonRefus] = useState('');
  const [submittingNeg, setSubmittingNeg] = useState(false);

  const [pageTab, setPageTab] = useState<PageTab>('commandes');
  const [besoinsCoop, setBesoinsCoop] = useState<CooperativeBesoin[]>([]);
  const [besoinsRole, setBesoinsRole] = useState<CooperativeBesoinsRole | null>(null);
  const [loadingBesoinsCoop, setLoadingBesoinsCoop] = useState(false);
  const [besoinDispatchTarget, setBesoinDispatchTarget] = useState<CooperativeBesoin | null>(null);
  const [dispatchQuantiteAttrib, setDispatchQuantiteAttrib] = useState('');
  const [dispatchPrixAchat, setDispatchPrixAchat] = useState('');
  const [dispatchPrixDispatch, setDispatchPrixDispatch] = useState('');
  const [dispatchStatut, setDispatchStatut] = useState<string>('en_attente');
  const [dispatchNotes, setDispatchNotes] = useState('');
  const [submittingBesoinPatch, setSubmittingBesoinPatch] = useState(false);
  const [showReceptionModal, setShowReceptionModal] = useState(false);
  const [selectedCmdForReception, setSelectedCmdForReception] = useState<Commande | null>(null);

  const reloadCommandes = useCallback(async () => {
    try {
      const d = await apiRequest<{ commandes?: unknown[] } | null>(API_URL, '/commandes', { method: 'GET' });
      if (d?.commandes) {
        const list = (d.commandes as any[]).map((c) => ({
          ...c,
          statutPaiement: c.statutPaiement ?? c.statut_paiement,
        }));
        setCommandes(list as Commande[]);
      }
    } catch {
      // silent
    }
  }, []);

  const negsRecues = negociations.filter(
    n =>
      n.vendeurId === user?.id &&
      (n.statut === 'en_attente' || n.statut === 'contre_offre'),
  );

  useEffect(() => {
    const loadNegs = async () => {
      setLoadingNegs(true);
      try {
        const { negociations: data } = await fetchNegociations();
        setNegociations((data ?? []) as Negociation[]);
      } catch (e) {
        void e;
      } finally {
        setLoadingNegs(false);
      }
    };
    loadNegs();
  }, []);

  const loadBesoinsCoop = useCallback(async () => {
    setLoadingBesoinsCoop(true);
    try {
      const data = await apiRequest<{ besoins?: unknown[]; role?: string } | null>(API_URL, '/cooperatives/besoins', { method: 'GET' });
      if (!data) {
        toast.error('Impossible de charger les besoins');
        return;
      }
      const list = Array.isArray(data.besoins) ? data.besoins : [];
      setBesoinsCoop(list as CooperativeBesoin[]);
      const r = data.role;
      setBesoinsRole(r === 'president' || r === 'membre' ? r : 'membre');
    } catch (e) {
      void e;
      toast.error('Erreur réseau (besoins)');
    } finally {
      setLoadingBesoinsCoop(false);
    }
  }, []);

  useEffect(() => {
    if (pageTab !== 'besoins_membres') return;
    void loadBesoinsCoop();
  }, [pageTab, loadBesoinsCoop]);

  useEffect(() => {
    void reloadCommandes();
  }, [reloadCommandes]);

  useEffect(() => {
    if (livraisonTierce) return;
    setLivraisonNom(`${user?.prenoms || ''} ${user?.nom || ''}`.trim());
    setLivraisonTelephone(user?.telephone || '');
    setLivraisonLocalite(user?.commune || '');
  }, [user?.prenoms, user?.nom, user?.telephone, user?.commune, livraisonTierce]);

  // Stats
  const stats = useMemo(() => ({
    total: commandes.length,
    brouillons: commandes.filter(c => c.statut === 'brouillon').length,
    enCours: commandes.filter(c => ['envoyee', 'confirmee', 'en_livraison'].includes(c.statut)).length,
    livrees: commandes.filter(c => c.statut === 'livree').length,
  }), [commandes]);

  // Filtrage — fonction unifiée
  const commandesFiltrees = useMemo(() => {
    return commandes.filter(c => {
      const match = matchesSearch(searchQuery, c.produit, c.producteur, c.localisation);
      const matchFilter = activeFilter === 'all' || c.statut === activeFilter;
      return match && matchFilter;
    });
  }, [commandes, searchQuery, activeFilter]);

  // Grouper par statut (ordre workflow)
  const grouped = useMemo(() => {
    const order: StatutCommande[] = ['brouillon', 'envoyee', 'confirmee', 'en_livraison', 'livree'];
    return order
      .map(s => ({ statut: s, items: commandesFiltrees.filter(c => c.statut === s) }))
      .filter(g => g.items.length > 0);
  }, [commandesFiltrees]);

  const handleAccepterNeg = async (neg: Negociation) => {
    setSubmittingNeg(true);
    try {
      await repondreNegociation(neg.id, { statut: 'accepte' });
      await speak('Demande acceptée');
      const { negociations: data } = await fetchNegociations();
      setNegociations((data ?? []) as Negociation[]);
    } catch (e: any) {
      toast.error(e?.message || 'Erreur');
      speak(e?.message || 'Erreur');
    } finally {
      setSubmittingNeg(false);
    }
  };

  const handleContreProposer = async () => {
    if (!selectedNeg) return;
    setSubmittingNeg(true);
    try {
      await repondreNegociation(selectedNeg.id, {
        statut: 'contre_propose',
        prixContreOffre: nouveauPrix,
        messageReponse: messageContrePropo.trim() || undefined,
      });
      await speak('Contre-proposition envoyée');
      setShowContrePropoModal(false);
      setSelectedNeg(null);
      setMessageContrePropo('');
      const { negociations: data } = await fetchNegociations();
      setNegociations((data ?? []) as Negociation[]);
    } catch (e: any) {
      toast.error(e?.message || 'Erreur');
      speak(e?.message || 'Erreur');
    } finally {
      setSubmittingNeg(false);
    }
  };

  const handleRefuserNeg = async () => {
    if (!selectedNeg || !raisonRefus.trim()) return;
    setSubmittingNeg(true);
    try {
      await repondreNegociation(selectedNeg.id, {
        statut: 'refuse',
        messageReponse: raisonRefus.trim(),
      });
      await speak('Demande refusée');
      setShowRefusModal(false);
      setSelectedNeg(null);
      setRaisonRefus('');
      const { negociations: data } = await fetchNegociations();
      setNegociations((data ?? []) as Negociation[]);
    } catch (e: any) {
      toast.error(e?.message || 'Erreur');
      speak(e?.message || 'Erreur');
    } finally {
      setSubmittingNeg(false);
    }
  };

  const openDispatchModal = (b: CooperativeBesoin) => {
    setBesoinDispatchTarget(b);
    setDispatchQuantiteAttrib(
      b.quantite_attribuee != null ? String(b.quantite_attribuee) : String(b.quantite),
    );
    setDispatchPrixAchat(b.prix_achat != null ? String(b.prix_achat) : '');
    setDispatchPrixDispatch(b.prix_dispatch != null ? String(b.prix_dispatch) : '');
    setDispatchStatut(
      (BESOIN_STATUT_OPTIONS as readonly string[]).includes(b.statut) ? b.statut : 'en_attente',
    );
    setDispatchNotes(b.notes ?? '');
  };

  const closeDispatchModal = () => {
    setBesoinDispatchTarget(null);
  };

  const submitBesoinDispatch = async () => {
    if (!besoinDispatchTarget) return;
    const qa = parseFloat(String(dispatchQuantiteAttrib).replace(',', '.'));
    if (Number.isNaN(qa) || qa < 0) {
      toast.error('Indiquez une quantité attribuée valide');
      return;
    }
    setSubmittingBesoinPatch(true);
    try {
      const body: Record<string, unknown> = {
        statut: dispatchStatut,
        notes: dispatchNotes.trim() || null,
        quantite_attribuee: qa,
      };
      const pa = parseFloat(dispatchPrixAchat.replace(',', '.'));
      if (dispatchPrixAchat.trim() !== '' && !Number.isNaN(pa)) body.prix_achat = pa;
      const pd = parseFloat(dispatchPrixDispatch.replace(',', '.'));
      if (dispatchPrixDispatch.trim() !== '' && !Number.isNaN(pd)) body.prix_dispatch = pd;

      try {
        await apiRequest(API_URL, `/cooperatives/besoins/${besoinDispatchTarget.id}`, {
          method: 'PATCH',
          body: JSON.stringify(body),
        });
      } catch (e: any) {
        toast.error(e?.message || 'Mise à jour refusée');
        return;
      }
      const distributionRes = await apiRequest<unknown>(API_URL, '/cooperatives/distribution', {
        method: 'POST',
        body: JSON.stringify({
          commande_id: (besoinDispatchTarget as CooperativeBesoin & { commande_id?: string }).commande_id ?? besoinDispatchTarget.id,
          distributions: [
            {
              membre_id: besoinDispatchTarget.membre_id,
              quantite: qa,
            },
          ],
        }),
      }).catch(() => null);
      if (!distributionRes) {
        // La distribution n'a PAS été enregistrée : ne pas annoncer un succès
        // mensonger (le manager croirait la marchandise répartie alors que non).
        toast.error('La distribution n\'a pas pu être enregistrée. Réessaie.');
        speak("La distribution n'a pas marché. Réessaie, s'il te plaît.");
        return;
      }
      toast.success('Besoin mis à jour');
      speak('Besoin mis à jour.');
      closeDispatchModal();
      await loadBesoinsCoop();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setSubmittingBesoinPatch(false);
    }
  };

  const besoinsAffiche = useMemo(() => {
    if (besoinsRole === 'president') return besoinsCoop;
    if (besoinsRole === 'membre') {
      const uid = user?.id;
      if (!uid) return [];
      return besoinsCoop.filter(b => String(b.membre_id) === String(uid));
    }
    return [];
  }, [besoinsCoop, besoinsRole, user?.id]);

  // Sync Bottom Bar
  useModalRegister(
    selectedCommande !== null ||
      showNewModal ||
      showContrePropoModal ||
      showRefusModal ||
      showReceptionModal ||
      besoinDispatchTarget !== null,
  );

  const doCreateCommande = async () => {
    if (!newProduit || !newQuantite || !newProducteur || !newDateLivraison) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    if (!livraisonNom.trim() || !livraisonTelephone.trim()) {
      toast.error('Nom et téléphone sont obligatoires');
      return;
    }
    const telephoneNormalise = livraisonTelephone.replace(/\s+/g, '');
    if (!/^(01|05|07|25|27)\d{8}$/.test(telephoneNormalise)) {
      toast.error('Numéro invalide. Format : 07XXXXXXXX');
      return;
    }
    try {
      await commandesApi.createCommande({
        type: 'achat',
        produit: newProduit,
        quantite: newQuantite,
        prix_unitaire: parseInt(newPrixUnitaire || '0') || 0,
        total: parseInt(newQuantite) * parseInt(newPrixUnitaire || '0'),
        date_commande: new Date().toISOString(),
        notes: livraisonNotes.trim() || `Membres: ${newNombreMembres || '5'} | Producteur: ${newProducteur} | ${newLocalisation}`,
        acheteur_telephone: telephoneNormalise,
        localite: modeReceptionCmd === 'enlevement' ? 'Enlèvement' : livraisonLocalite,
        date_livraison: newDateLivraison,
        acheteur_nom: livraisonNom,
      });
      await reloadCommandes();
      toast.success(`Commande "${newProduit}" créée`);
      speak(`Commande groupée pour ${newProduit} créée.`);
      setShowNewModal(false);
      setNewStep(1);
      setNewProduit(''); setNewQuantite(''); setNewProducteur('');
      setNewLocalisation(''); setNewDateLivraison(''); setNewNombreMembres(''); setNewPrixUnitaire('');
      setLivraisonTierce(false);
      setModeReceptionCmd('livraison');
      setLivraisonNom(`${user?.prenoms || ''} ${user?.nom || ''}`.trim());
      setLivraisonTelephone(user?.telephone || '');
      setLivraisonLocalite(user?.commune || '');
      setLivraisonNotes('');
    } catch (e: any) {
      toast.error(e?.message || 'Erreur lors de la création');
    }
  };

  const doProgressStatut = async (c: Commande) => {
    const order: StatutCommande[] = ['brouillon', 'envoyee', 'confirmee', 'en_livraison', 'livree'];
    const idx = order.indexOf(c.statut);
    if (idx < order.length - 1) {
      const nextStatut = order[idx + 1];
      try {
        await commandesApi.updateCommande(c.id, { statut: nextStatut as any });
        setCommandes(prev => prev.map(cmd => cmd.id === c.id ? { ...cmd, statut: nextStatut } : cmd));
        toast.success(`Commande passée en "${STATUT_CONFIG[nextStatut].label}"`);
        await speak(`Statut mis à jour : ${STATUT_CONFIG[nextStatut].label}`);
        setSelectedCommande(null);
      } catch (e: any) {
        toast.error(e?.message || 'Erreur mise à jour statut');
      }
    }
  };

  const handlePaiementCollectif = async (commandeId: string) => {
    const res = await apiRequest<{ success?: boolean; message?: string } | null>(
      API_URL,
      `/cooperatives/commandes/${commandeId}/cloture`,
      { method: 'POST' },
    );
    if (!res?.success) {
      throw new Error(res?.message || 'Clôture impossible');
    }
    await reloadCommandes();
  };


  return (
    <SubPageLayout role="cooperateur" title="Commandes">
      {/* Contenu */}
      <div className="pb-32 lg:pb-8 min-h-screen bg-gradient-to-b from-[#F5F0ED] to-white">

        <KPIGrid cols={2} className="mb-4">
          <UniversalKPI
            label="Total"
            animatedTarget={stats.total}
            icon={ShoppingCart}
            color="#2072AF"
            bgColor="rgba(239,246,255,0.9)"
            borderColor="rgba(59,130,246,0.35)"
            iconAnimation="bounce"
          />
          <UniversalKPI
            label="En cours"
            animatedTarget={stats.enCours}
            icon={Clock}
            color="#a855f7"
            bgColor="rgba(250,245,255,0.9)"
            borderColor="rgba(168,85,247,0.35)"
            iconAnimation="pulse"
          />
          <UniversalKPI
            label="Livrées"
            animatedTarget={stats.livrees}
            icon={CheckCircle}
            color="#16a34a"
            bgColor="rgba(240,253,244,0.9)"
            borderColor="rgba(34,197,94,0.35)"
            iconAnimation="float"
          />
          <UniversalKPI
            label="Brouillons"
            animatedTarget={stats.brouillons}
            icon={Package}
            color="#6b7280"
            bgColor="rgba(249,250,251,0.9)"
            borderColor="rgba(107,114,128,0.35)"
            iconAnimation="float"
          />
        </KPIGrid>

        <div className="flex gap-2 mb-4">
          {([
            { id: 'commandes' as PageTab, label: 'Commandes' },
            { id: 'besoins_membres' as PageTab, label: 'Besoins membres' },
          ]).map(({ id, label }) => (
            <motion.button
              key={id}
              type="button"
              onClick={() => setPageTab(id)}
              className="flex-1 py-3 rounded-2xl text-sm font-bold border-2 transition-colors"
              style={
                pageTab === id
                  ? { backgroundColor: C, borderColor: C, color: '#fff' }
                  : { backgroundColor: '#fff', borderColor: '#E5E7EB', color: '#4B5563' }
              }
              whileTap={{ scale: 0.98 }}
            >
              {label}
            </motion.button>
          ))}
        </div>

        {pageTab === 'commandes' && (
        <>

        {/* ══ NÉGOCIATIONS MARCHANDS ══════════════════════════════════════════════ */}
        {loadingNegs && (
          <p className="text-xs text-gray-500 mb-2">Chargement des demandes…</p>
        )}
        <AnimatePresence>
          {negsRecues.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="relative">
                  <Bell className="w-5 h-5" style={{ color: C }} strokeWidth={2.5} />
                  <motion.span
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full border-2 border-white"
                  />
                </div>
                <span className="font-black text-gray-900 text-base">Demandes de marchands</span>
                <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full bg-orange-500">
                  {negsRecues.length} à traiter
                </span>
              </div>

              <div className="space-y-3">
                {negsRecues.map((neg, idx) => {
                  const info = NEG_STATUT_LABELS[neg.statut] || NEG_STATUT_LABELS['en_attente'];
                  const restant = 3 - (neg.nbContreOffres || 0);
                  return (
                    <motion.div
                      key={neg.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.07 }}
                      className="rounded-3xl border-2 overflow-hidden shadow-md"
                      style={{ borderColor: '#f97316', background: 'linear-gradient(135deg, #fff7ed, white)' }}
                    >
                      <div className="px-4 pt-3 pb-2 flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: info.bg, color: info.color }}
                          >
                            {info.label}
                          </span>
                          <p className="font-black text-gray-900 text-base mt-1">{neg.produit}</p>
                          <p className="text-xs text-gray-500">Marchand · {neg.marchandId.slice(0, 8)}…</p>
                        </div>
                      </div>

                      <div className="px-4 pb-3 grid grid-cols-3 gap-2">
                        <div className="bg-white/80 rounded-2xl p-2 text-center">
                          <p className="text-[10px] text-gray-500 font-semibold">Quantité</p>
                          <p className="font-bold text-gray-900 text-sm">{(neg.quantite || 0).toLocaleString('fr-FR')} {neg.unite}</p>
                        </div>
                        <div className="bg-white/80 rounded-2xl p-2 text-center">
                          <p className="text-[10px] text-gray-500 font-semibold">Prix proposé</p>
                          <p className="font-bold text-sm text-orange-600">{(neg.prixPropose || 0).toLocaleString('fr-FR')} F</p>
                        </div>
                        <div className="bg-white/80 rounded-2xl p-2 text-center">
                          <p className="text-[10px] text-gray-500 font-semibold">Total</p>
                          <p className="font-bold text-gray-900 text-sm">
                            {((neg.prixPropose || 0) * (neg.quantite || 0)).toLocaleString('fr-FR')}
                          </p>
                        </div>
                      </div>

                      {neg.statut === 'en_attente' && neg.nbContreOffres > 0 && (
                        <div className="px-4 pb-2">
                          <p className="text-xs text-purple-600 font-semibold">
                            Il te reste {restant} contre-offre{restant > 1 ? 's' : ''}
                          </p>
                        </div>
                      )}

                      {neg.message && (
                        <div className="px-4 pb-3">
                          <div className="bg-orange-50 rounded-2xl px-3 py-2 border border-orange-200">
                            <p className="text-xs text-orange-800 italic">&quot;{neg.message}&quot;</p>
                          </div>
                        </div>
                      )}

                      {neg.statut === 'en_attente' && (
                        <div className="px-4 pb-4 grid grid-cols-3 gap-2">
                          <motion.button
                            type="button"
                            onClick={() => handleAccepterNeg(neg)}
                            disabled={submittingNeg}
                            className="py-2.5 rounded-2xl font-bold text-white text-xs flex items-center justify-center gap-1 disabled:opacity-50"
                            style={{ backgroundColor: '#10b981' }}
                            whileTap={{ scale: 0.93 }}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" strokeWidth={2.5} />
                            Accepter
                          </motion.button>
                          <motion.button
                            type="button"
                            onClick={() => {
                              if (restant <= 0) {
                                toast.error('Limite de 3 contre-offres atteinte');
                                return;
                              }
                              setSelectedNeg(neg);
                              setNouveauPrix(neg.prixPropose);
                              setShowContrePropoModal(true);
                            }}
                            disabled={submittingNeg || restant <= 0}
                            className="py-2.5 rounded-2xl font-bold text-white text-xs flex items-center justify-center gap-1 bg-purple-500 disabled:opacity-40"
                            whileTap={{ scale: 0.93 }}
                          >
                            <MessageSquare className="w-3.5 h-3.5" strokeWidth={2.5} />
                            Négocier
                          </motion.button>
                          <motion.button
                            type="button"
                            onClick={() => {
                              setSelectedNeg(neg);
                              setShowRefusModal(true);
                            }}
                            disabled={submittingNeg}
                            className="py-2.5 rounded-2xl font-bold text-white text-xs flex items-center justify-center gap-1 bg-red-500 disabled:opacity-50"
                            whileTap={{ scale: 0.93 }}
                          >
                            <ThumbsDown className="w-3.5 h-3.5" strokeWidth={2.5} />
                            Refuser
                          </motion.button>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* KPI Cards — 3 colonnes style Identificateur */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Total */}
          <motion.button
            onClick={() => setActiveFilter('all')}
            className={`relative bg-gradient-to-br from-blue-50 via-white to-blue-50 rounded-3xl p-3 shadow-md overflow-hidden border-2 text-left cursor-pointer ${activeFilter === 'all' ? 'border-blue-500 ring-2 ring-blue-300' : 'border-blue-200'}`}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.95 }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 font-semibold">Total</p>
              <motion.div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: C_LIGHT }}
                animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 2, repeat: Infinity }}
              ><FileText className="w-5 h-5" style={{ color: C }} strokeWidth={2.5} /></motion.div>
            </div>
            <motion.p className="text-3xl font-bold" style={{ color: C }}
              animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}
            >{stats.total}</motion.p>
            {activeFilter === 'all' && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full" style={{ backgroundColor: C }} />}
          </motion.button>

          {/* Brouillons */}
          <motion.button
            onClick={() => setActiveFilter('brouillon')}
            className={`relative bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-3xl p-3 shadow-md overflow-hidden border-2 text-left cursor-pointer ${activeFilter === 'brouillon' ? 'border-gray-500 ring-2 ring-gray-300' : 'border-gray-300'}`}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.95 }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 font-semibold">Brouillons</p>
              <motion.div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
                animate={stats.brouillons > 0 ? { scale: [1, 1.1, 1] } : {}} transition={{ duration: 1.5, repeat: Infinity }}
              ><Edit3 className="w-5 h-5 text-gray-600" strokeWidth={2.5} /></motion.div>
            </div>
            <motion.p className="text-3xl font-bold text-gray-700"
              animate={stats.brouillons > 0 ? { scale: [1, 1.1, 1] } : {}} transition={{ duration: 1.5, repeat: Infinity }}
            >{stats.brouillons}</motion.p>
            {activeFilter === 'brouillon' && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-gray-500 rounded-full" />}
          </motion.button>

          {/* Livrées */}
          <motion.button
            onClick={() => setActiveFilter('livree')}
            className={`relative bg-gradient-to-br from-green-50 via-white to-green-50 rounded-3xl p-3 shadow-md overflow-hidden border-2 text-left cursor-pointer ${activeFilter === 'livree' ? 'border-green-500 ring-2 ring-green-300' : 'border-green-200'}`}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            whileHover={{ scale: 1.05, y: -4 }} whileTap={{ scale: 0.95 }}
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-600 font-semibold">Livrées</p>
              <motion.div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"
                animate={{ y: [0, -2, 0] }} transition={{ duration: 2, repeat: Infinity }}
              ><CheckCircle className="w-5 h-5 text-green-600" strokeWidth={2.5} /></motion.div>
            </div>
            <motion.p className="text-3xl font-bold text-green-600"
              animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}
            >{stats.livrees}</motion.p>
            {activeFilter === 'livree' && <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-green-500 rounded-full" />}
          </motion.button>
        </div>

        {/* Boutons d'actions — style Identificateur */}
        <motion.div className="grid grid-cols-2 gap-3 mb-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <motion.button
            onClick={() => { setActiveFilter('all'); }}
            className="flex items-center justify-center gap-2 px-3 py-3.5 rounded-2xl bg-white border-2 border-gray-200 hover:border-[#2072AF] transition-colors whitespace-nowrap"
            whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
          >
            <History className="w-5 h-5 flex-shrink-0" style={{ color: C }} />
            <span className="font-semibold text-gray-700">Commandes</span>
          </motion.button>
          <motion.button
            onClick={() => { setShowNewModal(true); setNewStep(1); }}
            className="flex items-center justify-center gap-2 px-3 py-3.5 rounded-2xl text-white border-2 whitespace-nowrap"
            style={{ background: `linear-gradient(135deg, ${C}, ${C_DARK})`, borderColor: C }}
            whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-5 h-5 flex-shrink-0" />
            <span className="font-semibold">Nouvelle cmd</span>
          </motion.button>
        </motion.div>

        {/* Tabs workflow — style Identificateur */}
        <motion.div className="mb-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 overflow-x-auto">
            <div className="flex gap-1.5 min-w-max">
              {([
                { id: 'all' as FilterType, label: 'Toutes', activeClass: `from-[${C}] to-[${C_DARK}]` },
                { id: 'brouillon' as FilterType, label: 'Brouillons', activeClass: 'from-gray-500 to-gray-700' },
                { id: 'envoyee' as FilterType, label: 'Envoyées', activeClass: 'from-orange-500 to-orange-600' },
                { id: 'confirmee' as FilterType, label: 'Confirmées', activeClass: 'from-blue-500 to-blue-700' },
                { id: 'en_livraison' as FilterType, label: 'Livraison', activeClass: 'from-purple-500 to-purple-700' },
                { id: 'livree' as FilterType, label: 'Livrées', activeClass: 'from-green-600 to-green-700' },
              ]).map(({ id, label, activeClass }) => (
                <motion.button
                  key={id}
                  onClick={() => setActiveFilter(id)}
                  className={`relative flex-shrink-0 flex items-center justify-center px-4 py-3 rounded-xl font-bold text-xs transition-all ${activeFilter === id ? `bg-gradient-to-r ${activeClass} text-white shadow-md` : 'bg-transparent text-gray-600 hover:bg-gray-50'}`}
                  whileTap={{ scale: 0.98 }}
                >
                  {label}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Barre de recherche */}
        <motion.div className="mb-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <SearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Rechercher par produit, producteur..."
          />
        </motion.div>

        {/* Sections par statut — style Identificateur */}
        {commandesFiltrees.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <ShoppingBag className="w-14 h-14 mx-auto mb-3 text-gray-200" />
            <p className="text-gray-500 font-semibold">Aucune commande trouvée</p>
            <p className="text-xs text-gray-400 mt-1">Créez votre première commande groupée</p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ statut, items }) => {
              const cfg = STATUT_CONFIG[statut];
              const StatusIcon = cfg.icon || Edit3;
              return (
                <div key={statut}>
                  <div className="flex items-center gap-2 mb-3 px-1">
                    <StatusIcon className="w-5 h-5" style={{ color: cfg.color }} />
                    <h2 className="font-bold text-gray-900 text-lg">{cfg.label}</h2>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{ backgroundColor: `${cfg.color}20`, color: cfg.color }}
                    >{items.length}</span>
                  </div>
                  <div className="space-y-3">
                    <AnimatePresence mode="popLayout">
                      {items.map((commande, index) => {
                        const StatIcon = STATUT_CONFIG[commande.statut].icon;
                        const statCfg = STATUT_CONFIG[commande.statut];
                        return (
                          <motion.div
                            key={commande.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            transition={{ delay: index * 0.04 }}
                            className="bg-white rounded-2xl overflow-hidden"
                            style={{ border: `2px solid ${statCfg.color}30` }}
                          >
                            <motion.div
                              className="p-4"
                              onClick={() => { setSelectedCommande(commande); }}
                              style={{ backgroundColor: '#ffffff' }}
                              whileHover={{ backgroundColor: '#FAFAFA' }}
                            >
                              <div className="flex items-start gap-3">
                                {/* Avatar produit */}
                                <div
                                  className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 border-2"
                                  style={{ backgroundColor: `${statCfg.color}15`, borderColor: `${statCfg.color}40` }}
                                >
                                  <Package className="w-7 h-7" style={{ color: statCfg.color }} />
                                </div>

                                {/* Infos */}
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-gray-900 text-base truncate">{commande.produit}</h3>
                                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <div className="px-2 py-0.5 rounded-full text-xs font-bold"
                                      style={{ backgroundColor: `${C}15`, color: C }}
                                    >
                                      {commande.quantite} {commande.unite}
                                    </div>
                                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold`}
                                      style={{ backgroundColor: `${statCfg.color}10`, color: statCfg.color, borderColor: `${statCfg.color}30` }}
                                    >
                                      <StatIcon className="w-3 h-3" />
                                      {statCfg.label}
                                    </div>
                                  </div>
                                  <div className="space-y-1 mt-2 text-xs text-gray-500">
                                    <div className="flex items-center gap-1">
                                      <Users className="w-3 h-3" />
                                      <span>{commande.nombreMembres} membres concernés</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3" />
                                      <span className="truncate">{commande.producteur} — {commande.localisation}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Calendar className="w-3 h-3" />
                                      <span>Livraison le {new Date(commande.dateLivraison).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Montant */}
                                <div className="flex-shrink-0 text-right">
                                  <p className="font-black text-sm" style={{ color: C }}>
                                    {(commande.montantTotal || 0).toLocaleString('fr-FR')}
                                  </p>
                                  <p className="text-[10px] text-gray-400">FCFA</p>
                                  <ChevronRight className="w-4 h-4 text-gray-400 mt-2 ml-auto" />
                                </div>
                              </div>
                            </motion.div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </>
        )}

        {pageTab === 'besoins_membres' && (
          <div className="space-y-4">
            {loadingBesoinsCoop && (
              <p className="text-xs text-gray-500">Chargement des besoins…</p>
            )}
            {besoinsRole === 'president' && !loadingBesoinsCoop && (
              <p className="text-xs font-semibold text-gray-600">
                Vue président — {besoinsCoop.length} besoin{besoinsCoop.length !== 1 ? 's' : ''}
              </p>
            )}
            {besoinsRole === 'membre' && !loadingBesoinsCoop && (
              <p className="text-xs font-semibold text-gray-600">Mes besoins (lecture seule)</p>
            )}
            {!loadingBesoinsCoop && besoinsAffiche.length === 0 && (
              <p className="text-sm text-gray-500 py-8 text-center">Aucun besoin à afficher</p>
            )}
            <div className="space-y-3">
              {besoinsAffiche.map(b => {
                const statLabel = BESOIN_STATUT_LABELS[b.statut] || b.statut;
                return (
                  <div
                    key={b.id}
                    className="bg-white rounded-2xl border-2 border-gray-100 p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900">{b.produit}</p>
                        <p className="text-sm text-gray-600 mt-1">
                          <span className="font-semibold">{b.quantite} {b.unite}</span>
                          {besoinsRole === 'president' && (
                            <span className="text-gray-400"> · membre {String(b.membre_id).slice(0, 8)}…</span>
                          )}
                        </p>
                        <p className="text-xs mt-2 text-gray-700">
                          <span className="font-semibold text-gray-500">Statut :</span>{' '}
                          <span className="font-bold" style={{ color: C }}>{statLabel}</span>
                        </p>
                        {b.prix_dispatch != null && (
                          <p className="text-xs text-gray-600 mt-1">
                            Prix dispatch :{' '}
                            <span className="font-semibold">
                              {Number(b.prix_dispatch).toLocaleString('fr-FR')} FCFA
                            </span>
                          </p>
                        )}
                        {b.quantite_attribuee != null && (
                          <p className="text-xs text-gray-600 mt-1">
                            Quantité attribuée :{' '}
                            <span className="font-semibold">
                              {b.quantite_attribuee} {b.unite}
                            </span>
                          </p>
                        )}
                      </div>
                      {besoinsRole === 'president' && (
                        <button
                          type="button"
                          onClick={() => openDispatchModal(b)}
                          className="mt-2 sm:mt-0 px-4 py-2.5 rounded-xl text-white text-sm font-bold shrink-0"
                          style={{ backgroundColor: C }}
                        >
                          Dispatcher
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Drawer détail commande */}
      <AnimatePresence>
        {selectedCommande && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end"
            onClick={() => setSelectedCommande(null)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-12 h-1.5 rounded-full bg-gray-300" />
              </div>

              {/* Header drawer */}
              <div className="px-5 pb-4 border-b border-gray-100 flex items-center gap-4">
                <div className="w-14 h-14 rounded-full flex items-center justify-center border-2 flex-shrink-0"
                  style={{ backgroundColor: `${STATUT_CONFIG[selectedCommande.statut].color}15`, borderColor: `${STATUT_CONFIG[selectedCommande.statut].color}40` }}
                >
                  <Package className="w-7 h-7" style={{ color: STATUT_CONFIG[selectedCommande.statut].color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-gray-900 text-lg truncate">{selectedCommande.produit}</h2>
                  <p className="text-sm text-gray-500">{selectedCommande.quantite} {selectedCommande.unite} — {selectedCommande.producteur}</p>
                  <div className="flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full border text-xs font-bold w-fit"
                    style={{ backgroundColor: `${STATUT_CONFIG[selectedCommande.statut].color}10`, color: STATUT_CONFIG[selectedCommande.statut].color, borderColor: `${STATUT_CONFIG[selectedCommande.statut].color}30` }}
                  >
                    {React.createElement(STATUT_CONFIG[selectedCommande.statut].icon, { className: 'w-3 h-3' })}
                    <span className="ml-1">{STATUT_CONFIG[selectedCommande.statut].label}</span>
                  </div>
                </div>
                <motion.button onClick={() => setSelectedCommande(null)}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0"
                  whileHover={{ rotate: 90 }} whileTap={{ scale: 0.9 }}
                ><X className="w-4 h-4 text-gray-600" /></motion.button>
              </div>

              {/* Contenu drawer */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Workflow statuts */}
                <div className="bg-gray-50 rounded-2xl border-2 border-gray-100 p-4">
                  <p className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-3">Workflow commande</p>
                  <div className="flex items-center gap-1">
                    {(['brouillon', 'envoyee', 'confirmee', 'en_livraison', 'livree'] as StatutCommande[]).map((s, i, arr) => {
                      const cfg = STATUT_CONFIG[s];
                      const order = arr.indexOf(selectedCommande.statut);
                      const isDone = i <= order;
                      const isCurrent = s === selectedCommande.statut;
                      return (
                        <React.Fragment key={s}>
                          <div className="flex flex-col items-center flex-shrink-0">
                            <motion.div
                              className="w-8 h-8 rounded-full flex items-center justify-center border-2"
                              style={isDone ? { backgroundColor: cfg.color, borderColor: cfg.color } : { backgroundColor: '#F3F4F6', borderColor: '#D1D5DB' }}
                              animate={isCurrent ? { scale: [1, 1.15, 1] } : {}}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            >
                              {React.createElement(cfg.icon, { className: 'w-4 h-4', style: { color: isDone ? '#fff' : '#9CA3AF' } })}
                            </motion.div>
                            <p className="text-[9px] font-bold mt-1 text-center leading-tight" style={{ color: isDone ? cfg.color : '#9CA3AF', maxWidth: 40 }}>{cfg.label}</p>
                          </div>
                          {i < arr.length - 1 && (
                            <div className="flex-1 h-0.5 mb-4 rounded-full" style={{ backgroundColor: i < order ? STATUT_CONFIG[arr[i]].color : '#E5E7EB' }} />
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Infos commande */}
                <div className="space-y-2">
                  {[
                    { icon: Package, label: 'Produit', value: `${selectedCommande.produit} — ${selectedCommande.quantite} ${selectedCommande.unite}` },
                    { icon: Users, label: 'Membres concernés', value: `${selectedCommande.nombreMembres} membres` },
                    { icon: MapPin, label: 'Producteur', value: `${selectedCommande.producteur} — ${selectedCommande.localisation}` },
                    { icon: Phone, label: 'Téléphone', value: selectedCommande.telephone || '+225 — —' },
                    { icon: Calendar, label: 'Date de création', value: new Date(selectedCommande.dateCreation).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) },
                    { icon: Calendar, label: 'Date de livraison', value: new Date(selectedCommande.dateLivraison).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) },
                    { icon: Wallet, label: 'Montant total', value: `${(selectedCommande.montantTotal || 0).toLocaleString('fr-FR')} FCFA` },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="flex items-center gap-3 bg-gray-50 rounded-2xl border border-gray-100 p-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: C_LIGHT }}>
                        <Icon className="w-4 h-4" style={{ color: C }} />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-500">{label}</p>
                        <p className="text-sm font-bold text-gray-900">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Wallet info */}
                {selectedCommande.statut === 'livree' && selectedCommande.statutPaiement !== 'paye' && (
                <div className="p-4 rounded-2xl border-2" style={{ borderColor: `${C}30`, backgroundColor: `${C}08` }}>
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-4 h-4" style={{ color: C }} />
                    <p className="text-xs font-bold" style={{ color: C }}>Paiement via Wallet Jùlaba</p>
                  </div>
                  <motion.button
                    type="button"
                    onClick={() => {
                      setSelectedCmdForReception(selectedCommande);
                      setShowReceptionModal(true);
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-white"
                    style={{ background: `linear-gradient(135deg, ${C}, ${C_DARK})` }}
                    whileTap={{ scale: 0.97 }}
                  >
                    Payer maintenant
                  </motion.button>
                </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-5 py-4 border-t border-gray-100 bg-white">
                {selectedCommande.statut !== 'livree' && (
                  <div className="space-y-2">
                    <motion.button
                      onClick={() => void doProgressStatut(selectedCommande)}
                      className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-white font-bold"
                      style={{ background: `linear-gradient(135deg, ${C}, ${C_DARK})` }}
                      whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    >
                      <ArrowRight className="w-5 h-5" />
                      {selectedCommande.statut === 'brouillon' ? 'Envoyer la commande' :
                       selectedCommande.statut === 'envoyee' ? 'Marquer comme confirmée' :
                       selectedCommande.statut === 'confirmee' ? 'Démarrer la livraison' :
                       'Confirmer la livraison'}
                    </motion.button>
                  </div>
                )}
                {selectedCommande.statut === 'livree' && (
                  <div className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-green-50 border-2 border-green-200">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-bold text-green-700">Commande livrée avec succès</span>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Nouvelle commande */}
      <AnimatePresence>
        {showNewModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end"
            onClick={() => setShowNewModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-12 h-1.5 rounded-full bg-gray-300" />
              </div>
              <div className="px-5 pb-4 flex items-center justify-between border-b border-gray-100">
                <div>
                  <h2 className="font-bold text-gray-900 text-lg">Nouvelle commande groupée</h2>
                  <p className="text-xs text-gray-500">Étape {newStep} sur 3</p>
                </div>
                <motion.button onClick={() => setShowNewModal(false)}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center"
                  whileHover={{ rotate: 90 }}
                ><X className="w-4 h-4 text-gray-600" /></motion.button>
              </div>

              {/* Barre progression */}
              <div className="px-5 pt-3">
                <div className="flex gap-1.5">
                  {[1, 2, 3].map(s => (
                    <div key={s} className="flex-1 h-1.5 rounded-full overflow-hidden bg-gray-100">
                      <motion.div className="h-full rounded-full" style={{ backgroundColor: C }}
                        animate={{ width: s <= newStep ? '100%' : '0%' }} transition={{ duration: 0.4 }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-1">
                  {['Produit', 'Producteur', 'Confirmation'].map((l, i) => (
                    <span key={l} className={`text-[10px] font-semibold ${i + 1 <= newStep ? 'text-blue-600' : 'text-gray-400'}`}>{l}</span>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Étape 1 : Produit */}
                {newStep === 1 && (
                  <>
                    <p className="text-sm text-gray-600">Renseignez les informations du produit commandé :</p>

                    <ImagePickerField
                      label="Photo du produit (facultatif)"
                      value={newProduitImage}
                      onChange={setNewProduitImage}
                      primaryColor={C}
                      shape="rect"
                      size={88}
                    />

                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-2">Nom du produit <span className="text-red-500">*</span></label>
                      <input type="text" placeholder="Ex: Riz local, Ignames, Tomates..."
                        value={newProduit} onChange={(e) => setNewProduit(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none text-sm"
                        style={{ borderColor: newProduit ? C : undefined }}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-gray-700 block mb-2">Quantité <span className="text-red-500">*</span></label>
                        <input type="number" placeholder="Ex: 500"
                          value={newQuantite} onChange={(e) => setNewQuantite(e.target.value)}
                          className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none text-sm"
                          style={{ borderColor: newQuantite ? C : undefined }}
                        />
                      </div>
                      <SelectWithAutre
                        label="Unité"
                        value={newUnite}
                        onChange={setNewUnite}
                        options={['kg', 'tonnes', 'régimes', 'sacs', 'caisses', 'litre']}
                        primaryColor={C}
                        placeholder="Ex: barrique, carton..."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-bold text-gray-700 block mb-2">Prix unitaire (FCFA)</label>
                        <input type="number" placeholder="Ex: 650"
                          value={newPrixUnitaire} onChange={(e) => setNewPrixUnitaire(e.target.value)}
                          className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-bold text-gray-700 block mb-2">Nb membres</label>
                        <input type="number" placeholder="Ex: 10"
                          value={newNombreMembres} onChange={(e) => setNewNombreMembres(e.target.value)}
                          className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none text-sm"
                        />
                      </div>
                    </div>
                    {newQuantite && newPrixUnitaire && (
                      <div className="p-4 rounded-2xl border-2" style={{ borderColor: `${C}30`, backgroundColor: `${C}08` }}>
                        <p className="text-xs text-gray-500 mb-1">Montant estimé</p>
                        <p className="font-black text-xl" style={{ color: C }}>
                          {(parseInt(newQuantite) * parseInt(newPrixUnitaire)).toLocaleString('fr-FR')} FCFA
                        </p>
                      </div>
                    )}
                  </>
                )}

                {/* Étape 2 : Producteur */}
                {newStep === 2 && (
                  <>
                    <p className="text-sm text-gray-600">Indiquez le producteur et la date de livraison souhaitée :</p>
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-2">Producteur <span className="text-red-500">*</span></label>
                      <input type="text" placeholder="Nom du producteur..."
                        value={newProducteur} onChange={(e) => setNewProducteur(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none text-sm"
                        style={{ borderColor: newProducteur ? C : undefined }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-2">Localisation</label>
                      <input type="text" placeholder="Ville / Zone..."
                        value={newLocalisation} onChange={(e) => setNewLocalisation(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-700 block mb-2">Date de livraison souhaitée <span className="text-red-500">*</span></label>
                      <input type="date" value={newDateLivraison} onChange={(e) => setNewDateLivraison(e.target.value)}
                        className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none text-sm bg-white"
                        style={{ borderColor: newDateLivraison ? C : undefined }}
                      />
                    </div>
                  </>
                )}

                {/* Étape 3 : Confirmation */}
                {newStep === 3 && (
                  <>
                    <div className="text-center py-4">
                      <motion.div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center"
                        style={{ backgroundColor: C_LIGHT }} animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                      ><ShoppingBag className="w-8 h-8" style={{ color: C }} /></motion.div>
                      <h3 className="font-bold text-gray-900 text-lg mb-2">Prête à créer la commande</h3>
                      <p className="text-sm text-gray-500">La commande sera créée en brouillon. Vous pourrez l'envoyer quand vous le souhaitez.</p>
                    </div>
                    <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 space-y-2">
                      {[
                        { label: 'Produit', value: `${newProduit} — ${newQuantite} ${newUnite}` },
                        { label: 'Producteur', value: `${newProducteur}${newLocalisation ? ` — ${newLocalisation}` : ''}` },
                        { label: 'Membres', value: `${newNombreMembres || '5'} membres` },
                        { label: 'Livraison', value: newDateLivraison ? new Date(newDateLivraison).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : '—' },
                        { label: 'Montant estimé', value: newQuantite && newPrixUnitaire ? `${(parseInt(newQuantite) * parseInt(newPrixUnitaire)).toLocaleString('fr-FR')} FCFA` : '—' },
                      ].map(({ label, value }) => (
                        <div key={label} className="flex justify-between text-xs">
                          <span className="text-gray-500">{label}</span>
                          <span className="font-bold text-gray-900">{value}</span>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-2xl bg-gray-50 p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setModeReceptionCmd('livraison')}
                          className={`py-2.5 rounded-2xl text-sm font-semibold transition-colors ${
                            modeReceptionCmd === 'livraison'
                              ? 'bg-[#2E7D32] text-white'
                              : 'bg-white border-2 border-gray-200 text-gray-700'
                          }`}
                        >
                          Je veux être livré(e)
                        </button>
                        <button
                          type="button"
                          onClick={() => setModeReceptionCmd('enlevement')}
                          className={`py-2.5 rounded-2xl text-sm font-semibold transition-colors ${
                            modeReceptionCmd === 'enlevement'
                              ? 'bg-[#2E7D32] text-white'
                              : 'bg-white border-2 border-gray-200 text-gray-700'
                          }`}
                        >
                          J'envoie récupérer
                        </button>
                      </div>
                      <label className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700">
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
                          className="accent-[#2E7D32]"
                        />
                        Livrer à une autre personne
                      </label>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-1">Nom</label>
                        <input
                          type="text"
                          value={livraisonNom}
                          onChange={(e) => setLivraisonNom(e.target.value)}
                          disabled={!livraisonTierce}
                          className={`w-full px-4 py-3 rounded-2xl border-2 text-sm ${livraisonTierce ? 'bg-white border-gray-200 focus:border-[#2E7D32]' : 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'} focus:outline-none`}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-1">Téléphone</label>
                        <input
                          type="tel"
                          value={livraisonTelephone}
                          onChange={(e) => setLivraisonTelephone(e.target.value)}
                          disabled={!livraisonTierce}
                          className={`w-full px-4 py-3 rounded-2xl border-2 text-sm ${livraisonTierce ? 'bg-white border-gray-200 focus:border-[#2E7D32]' : 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'} focus:outline-none`}
                        />
                      </div>
                      {modeReceptionCmd === 'livraison' && (
                        <div>
                          <label className="text-sm font-semibold text-gray-700 block mb-1">Localité</label>
                          <input
                            type="text"
                            value={livraisonLocalite}
                            onChange={(e) => setLivraisonLocalite(e.target.value)}
                            className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#2E7D32] focus:outline-none text-sm bg-white"
                          />
                        </div>
                      )}
                      <div>
                        <label className="text-sm font-semibold text-gray-700 block mb-1">Notes</label>
                        <textarea
                          value={livraisonNotes}
                          onChange={(e) => setLivraisonNotes(e.target.value)}
                          rows={2}
                          className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#2E7D32] focus:outline-none text-sm bg-white resize-none"
                        />
                      </div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">Le paiement via Wallet Jùlaba sera déclenché à la confirmation de la livraison.</p>
                    </div>
                  </>
                )}
              </div>

              {/* Navigation */}
              <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
                {newStep > 1 && (
                  <motion.button onClick={() => setNewStep(s => s - 1)}
                    className="flex items-center gap-1.5 px-5 py-3 rounded-2xl bg-gray-100 text-gray-700 font-bold text-sm"
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                  >Retour</motion.button>
                )}
                <motion.button
                  onClick={() => {
                    if (newStep < 3) {
                      if (newStep === 1 && (!newProduit || !newQuantite)) { toast.error('Renseignez le produit et la quantité'); return; }
                      if (newStep === 2 && (!newProducteur || !newDateLivraison)) { toast.error('Renseignez le producteur et la date'); return; }
                      setNewStep(s => s + 1);
                    } else {
                      doCreateCommande();
                    }
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl text-white font-bold text-sm"
                  style={{ background: `linear-gradient(135deg, ${C}, ${C_DARK})` }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                >
                  {newStep === 3 ? (<><ShoppingBag className="w-4 h-4" /> Créer la commande</>) : (<>Suivant <ChevronRight className="w-4 h-4" /></>)}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL CONTRE-PROPOSITION ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showContrePropoModal && selectedNeg && (
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
              <div className="bg-gradient-to-r from-purple-600 to-purple-500 px-6 py-5 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" strokeWidth={2.5} />
                    Proposer un prix
                  </h2>
                  <p className="text-white/80 text-sm mt-1">
                    Prix actuel : {(selectedNeg.prixPropose || 0).toLocaleString('fr-FR')} FCFA/{selectedNeg.unite}
                  </p>
                  <p className="text-purple-200 text-xs mt-0.5">
                    Il reste {3 - (selectedNeg.nbContreOffres || 0)} contre-offre(s) possible(s)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowContrePropoModal(false)}
                  className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center hover:bg-white/40"
                >
                  <X className="w-5 h-5 text-white" strokeWidth={2.5} />
                </button>
              </div>

              <div className="p-5 space-y-5">
                <div>
                  <label className="block font-black text-gray-900 text-base mb-3">
                    Ton prix (FCFA/{selectedNeg.unite})
                  </label>
                  <div className="flex items-center gap-3">
                    <motion.button
                      type="button"
                      onClick={() => setNouveauPrix(p => Math.max(50, p - 50))}
                      className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center font-bold text-xl text-gray-700"
                      whileTap={{ scale: 0.9 }}
                    >
                      -
                    </motion.button>
                    <input
                      type="number"
                      value={nouveauPrix || ''}
                      onChange={e => setNouveauPrix(parseInt(e.target.value, 10) || 0)}
                      className="flex-1 px-4 py-4 rounded-2xl border-2 focus:outline-none font-black text-3xl text-gray-900 text-center bg-white"
                      style={{ borderColor: '#8b5cf6' }}
                    />
                    <motion.button
                      type="button"
                      onClick={() => setNouveauPrix(p => p + 50)}
                      className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center font-bold text-xl text-gray-700"
                      whileTap={{ scale: 0.9 }}
                    >
                      +
                    </motion.button>
                  </div>
                </div>

                <div>
                  <label className="block font-black text-gray-900 text-sm mb-2">Message (facultatif)</label>
                  <textarea
                    value={messageContrePropo}
                    onChange={e => setMessageContrePropo(e.target.value)}
                    placeholder="Ex: Ce prix correspond à notre coût de revient..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none font-semibold text-sm text-gray-700 resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowContrePropoModal(false)}
                    className="flex-1 py-4 rounded-2xl font-bold text-gray-700 bg-gray-100"
                  >
                    Annuler
                  </button>
                  <motion.button
                    type="button"
                    onClick={() => void handleContreProposer()}
                    disabled={submittingNeg || nouveauPrix <= 0}
                    className="flex-1 py-4 rounded-2xl font-bold text-white shadow-lg disabled:opacity-50 bg-purple-500"
                    whileTap={{ scale: 0.97 }}
                  >
                    {submittingNeg ? 'Envoi...' : 'Envoyer'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── MODAL REFUS ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showRefusModal && selectedNeg && (
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
              <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-5 flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-black text-white flex items-center gap-2">
                    <ThumbsDown className="w-5 h-5" strokeWidth={2.5} />
                    Refuser la demande
                  </h2>
                  <p className="text-white/80 text-sm mt-1">Indique pourquoi tu refuses</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowRefusModal(false)}
                  className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center hover:bg-white/40"
                >
                  <X className="w-5 h-5 text-white" strokeWidth={2.5} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <label className="block font-black text-gray-900 text-sm mb-3">Raison du refus</label>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      'Stock insuffisant',
                      'Prix proposé trop bas',
                      'Quantité trop importante',
                      'Produit non disponible actuellement',
                      'Délai de livraison impossible',
                    ].map(raison => (
                      <motion.button
                        key={raison}
                        type="button"
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
                    type="button"
                    onClick={() => setShowRefusModal(false)}
                    className="flex-1 py-4 rounded-2xl font-bold text-gray-700 bg-gray-100"
                  >
                    Annuler
                  </button>
                  <motion.button
                    type="button"
                    onClick={() => void handleRefuserNeg()}
                    disabled={submittingNeg || !raisonRefus.trim()}
                    className="flex-1 py-4 rounded-2xl font-bold text-white shadow-lg disabled:opacity-50 bg-red-500"
                    whileTap={{ scale: 0.97 }}
                  >
                    {submittingNeg ? 'Envoi...' : 'Confirmer'}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {besoinDispatchTarget && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => closeDispatchModal()}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.93, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.93, y: 30 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[92%] max-w-md bg-white rounded-3xl shadow-2xl z-[210] overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-gray-900 truncate">Dispatcher le besoin</h2>
                  <p className="text-sm text-gray-600 truncate">{besoinDispatchTarget.produit}</p>
                </div>
                <button
                  type="button"
                  onClick={() => closeDispatchModal()}
                  className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center shrink-0"
                  aria-label="Fermer"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <div className="p-5 space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Quantité attribuée</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={dispatchQuantiteAttrib}
                    onChange={e => setDispatchQuantiteAttrib(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm font-semibold"
                    style={{ borderColor: dispatchQuantiteAttrib ? C : undefined }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Prix achat (FCFA)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={dispatchPrixAchat}
                      onChange={e => setDispatchPrixAchat(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Prix dispatch (FCFA)</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={dispatchPrixDispatch}
                      onChange={e => setDispatchPrixDispatch(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Statut</label>
                  <select
                    value={dispatchStatut}
                    onChange={e => setDispatchStatut(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm font-semibold bg-white"
                  >
                    {BESOIN_STATUT_OPTIONS.map(s => (
                      <option key={s} value={s}>
                        {BESOIN_STATUT_LABELS[s] || s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={dispatchNotes}
                    onChange={e => setDispatchNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm resize-none"
                    placeholder="Notes internes…"
                  />
                </div>
              </div>
              <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
                <button
                  type="button"
                  onClick={() => closeDispatchModal()}
                  className="flex-1 py-3 rounded-2xl font-bold text-gray-700 bg-gray-100"
                >
                  Annuler
                </button>
                <motion.button
                  type="button"
                  onClick={() => void submitBesoinDispatch()}
                  disabled={submittingBesoinPatch}
                  className="flex-1 py-3 rounded-2xl font-bold text-white disabled:opacity-50"
                  style={{ backgroundColor: C }}
                  whileTap={{ scale: 0.97 }}
                >
                  {submittingBesoinPatch ? 'Enregistrement…' : 'Enregistrer'}
                </motion.button>
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
          unite: selectedCmdForReception.unite,
          total: selectedCmdForReception.montantTotal,
          vendeurNom: selectedCmdForReception.producteur,
          dateLivraisonPrevue: selectedCmdForReception.dateLivraison,
          membres: besoinsCoop
            .filter(b => String(b.commande_id ?? '') === String(selectedCmdForReception.id))
            .map(b => String(b.membre_id).slice(0, 8) + '…'),
        } : null}
        role="cooperative"
        onPaiement={async (commandeId) => {
          await handlePaiementCollectif(commandeId);
        }}
        onSuccess={async () => {
          setShowReceptionModal(false);
          setSelectedCmdForReception(null);
          setSelectedCommande(null);
          await reloadCommandes();
          toast.success("Commande clôturée et payée");
          speak("C'est fait ! La commande est clôturée et payée.");
        }}
      />

    </SubPageLayout>
  );
}