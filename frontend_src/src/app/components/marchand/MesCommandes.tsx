import React, { useState, useEffect, useMemo } from 'react';
import { nombreEnMotsFr } from '../../i18n/voice/argent/deuxFormes';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingBag, Clock, CheckCircle, XCircle,
  MapPin, Calendar, TrendingUp, Package,
  MessageSquare, ThumbsUp, ThumbsDown, ChevronRight,
  Eye, EyeOff, WifiOff, SlidersHorizontal,
} from 'lucide-react';
import { SubPageLayout } from '../layout/SubPageLayout';
import { useCommande } from '../../contexts/CommandeContext';
import { useApp } from '../../contexts/AppContext';
import { Button } from '../ui/button';
import { NotificationButton } from './NotificationButton';
import {
  fetchNegociations,
  marchandRepondreNegociation,
} from '../../services/api/commandes-api';
import { ReceptionPaiementModal } from '../shared/ReceptionPaiementModal';
import { NoterCommande } from '../shared/NoterCommande';
import { toast } from 'sonner';
import { t } from '../../i18n/voice/runtime';
import { causeEchec, reseauIndisponible, type CauseEchecReseau } from '../../services/actionReseauRequis';
import { montantPrive, useMontantsPrives } from '../../hooks/useMontantsPrives';

// ── Types ──────────────────────────────────────────────────────────────────────

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
  createdAt: string;
}

// ── Couleurs statut ────────────────────────────────────────────────────────────

const STATUT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  en_attente: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  confirmee:  { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-300'   },
  en_cours:   { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  en_livraison: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300' },
  livree:     { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-300'  },
  annulee:    { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-300'    },
};

const STATUT_LABELS: Record<string, string> = {
  en_attente: 'En attente',
  confirmee:  'Confirmée',
  en_cours:   'En cours',
  en_livraison: 'En livraison',
  livree:     'Livrée',
  annulee:    'Annulée',
};

const NEG_STATUT_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  en_attente:   { label: 'En attente',      color: '#f59e0b', bg: '#fef3c7' },
  accepte:      { label: 'Acceptée',        color: '#10b981', bg: 'var(--color-green-100)' },
  refuse:       { label: 'Refusée',         color: 'var(--color-red-500)', bg: 'var(--color-red-100)' },
  contre_offre: { label: 'Contre-offre',    color: '#8b5cf6', bg: 'var(--color-purple-100)' },
};

// ── Composant principal ────────────────────────────────────────────────────────

export function MesCommandes() {
  const { commandes, annulerCommande, updateCommande, refreshCommandes, recupererPaiement } = useCommande();
  const { speak, user, isOnline } = useApp();
  const { montantsMasques, basculerMontants } = useMontantsPrives();
  const [filtreStatut, setFiltreStatut] = useState<string>('tous');
  const [filtreType, setFiltreType] = useState<'tous' | 'achat' | 'vente'>('tous');
  const [showMontantModal, setShowMontantModal] = useState(false);
  const [commandeReception, setCommandeReception] = useState<any>(null);
  const [confirmAnnulerCmd, setConfirmAnnulerCmd] = useState<string | null>(null);
  const [showFiltres, setShowFiltres] = useState(false);
  // Flux paiement actif : cloture hors enum (statut_paiement/paye_at), paiement cash via /paiement.
  const RECEPTION_PAIEMENT_ACTIF = true;

  // Négociations
  const [negociations, setNegociations] = useState<Negociation[]>([]);
  const [loadingNegs, setLoadingNegs]   = useState(false);
  const [submittingNeg, setSubmittingNeg] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapNegociation = (n: any): Negociation => ({
    id: n.id,
    marchandId: n.marchandId ?? n.marchand_id,
    vendeurId: n.vendeurId ?? n.vendeur_id,
    produit: n.produit,
    quantite: Number(n.quantite) || 0,
    prixOriginal: Number(n.prixOriginal ?? n.prix_original) || 0,
    prixPropose: Number(n.prixPropose ?? n.prix_propose) || 0,
    unite: n.unite,
    message: n.message ?? '',
    statut: n.statut,
    prixContreOffre: n.prixContreOffre ?? n.prix_contre_offre ?? null,
    messageReponse: n.messageReponse ?? n.message_reponse ?? null,
    createdAt: n.createdAt ?? n.created_at,
  });

  // Chargement négociations au montage
  useEffect(() => {
    const load = async () => {
      setLoadingNegs(true);
      try {
        const { negociations: data } = await fetchNegociations();
        setNegociations((data ?? []).map(mapNegociation));
      } catch {
        toast.error('Impossible de charger les négociations');
      } finally {
        setLoadingNegs(false);
      }
    };
    load();
  }, []);

  // Négociations du marchand courant
  const mesNegociations = negociations.filter(n => n.marchandId === user?.id);
  const negsActives = mesNegociations.filter(
    n => n.statut === 'en_attente' || n.statut === 'contre_offre'
  );

  // Commandes
  const mesCommandes = commandes.filter(
    c => c.acheteurId === user?.id || c.vendeurId === user?.id
  );
  const commandesParType = useMemo(() => {
    if (filtreType === 'achat') return mesCommandes.filter(c => c.acheteurId === user?.id);
    if (filtreType === 'vente') return mesCommandes.filter(c => c.vendeurId === user?.id);
    return mesCommandes;
  }, [mesCommandes, filtreType, user?.id]);
  const commandesFiltrees = filtreStatut === 'tous'
    ? commandesParType
    : commandesParType.filter(c => c.statut === filtreStatut);

  const statsCommandes = {
    total:        mesCommandes.length,
    enCours:      mesCommandes.filter(c => ['en_attente', 'confirmee', 'en_cours', 'en_livraison'].includes(c.statut)).length,
    livrees:      mesCommandes.filter(c => c.statut === 'livree').length,
    montantTotal: mesCommandes.filter(c => c.statut !== 'annulee').reduce((s, c) => s + c.total, 0),
  };
  const montantsParStatut = useMemo(() => ({
    enAttente: mesCommandes
      .filter(c => c.statut === 'en_attente')
      .reduce((s, c) => s + c.total, 0),
    confirmee: mesCommandes
      .filter(c => c.statut === 'confirmee')
      .reduce((s, c) => s + c.total, 0),
    enCours: mesCommandes
      .filter(c => ['en_cours', 'en_livraison'].includes(c.statut))
      .reduce((s, c) => s + c.total, 0),
    livree: mesCommandes
      .filter(c => c.statut === 'livree')
      .reduce((s, c) => s + c.total, 0),
    annulee: mesCommandes
      .filter(c => c.statut === 'annulee')
      .reduce((s, c) => s + c.total, 0),
    total: mesCommandes
      .filter(c => c.statut !== 'annulee')
      .reduce((s, c) => s + c.total, 0),
  }), [mesCommandes]);

  // ── Actions ────────────────────────────────────────────────────────────────

  // SANS RÉSEAU, ON REFUSE ET ON LE DIT — B4, 21/09/2026.
  //
  // Ces actions partaient droit au serveur. Sans réseau, `fetch` lève
  // « TypeError: Failed to fetch » et l'écran disait `e.message` : la marchande
  // entendait « Failed to fetch ». Elle ne pouvait ni comprendre, ni savoir que
  // son geste n'était pas parti, ni savoir qu'il fallait recommencer.
  //
  // RIEN N'EST MIS EN FILE, et c'est un choix : une action de commande se
  // négocie à deux, son sens dépend de l'état du serveur au moment où elle
  // part. La rejouer plus tard sans que la marchande le sache serait pire que
  // de lui dire non maintenant. Aucune commande ne peut donc être perdue ni
  // comptée deux fois : hors ligne, on n'appelle simplement pas le serveur.
  //
  // Le bandeau « Hors connexion » repris de Manus ci-dessous rend ce refus
  // VISIBLE ; il ne le remplace pas. Les boutons ne sont pas désactivés : un
  // bouton grisé ne dit rien à une marchande qui ne lit pas, le refus parlé si.
  const direEchecReseau = (cause: CauseEchecReseau) => {
    if (cause === 'hors_ligne') speak(t('MARCHAND_HORS_LIGNE_ACTION'));
    else speak(t('MARCHAND_ENVOI_TOMBE_ACTION'));
  };

  const handleAnnuler = async (id: string) => {
    if (reseauIndisponible()) { direEchecReseau('hors_ligne'); return; }
    try {
      await annulerCommande(id);
      speak('Commande annulée');
    } catch (e: unknown) {
      const cause = causeEchec(e);
      if (cause) { direEchecReseau(cause); return; }
      const message = e instanceof Error ? e.message : 'Erreur inattendue';
      speak(message);
    }
  };

  const handleConfirmerVente = async (id: string) => {
    if (reseauIndisponible()) { direEchecReseau('hors_ligne'); return; }
    try {
      await updateCommande(id, { statut: 'confirmee' });
      speak('Vente confirmée');
    } catch (e: unknown) {
      const cause = causeEchec(e);
      if (cause) { direEchecReseau(cause); return; }
      const message = e instanceof Error ? e.message : 'Erreur inattendue';
      speak(message);
    }
  };

  const handleRefuserVente = async (id: string) => {
    if (reseauIndisponible()) { direEchecReseau('hors_ligne'); return; }
    try {
      await updateCommande(id, { statut: 'annulee' });
      speak('Vente refusée');
    } catch (e: unknown) {
      const cause = causeEchec(e);
      if (cause) { direEchecReseau(cause); return; }
      const message = e instanceof Error ? e.message : 'Erreur inattendue';
      speak(message);
    }
  };

  const handleMarquerLivree = async (id: string) => {
    if (reseauIndisponible()) { direEchecReseau('hors_ligne'); return; }
    try {
      await updateCommande(id, { statut: 'livree' });
      speak('Commande marquée comme livrée');
    } catch (e: unknown) {
      const cause = causeEchec(e);
      if (cause) { direEchecReseau(cause); return; }
      const message = e instanceof Error ? e.message : 'Erreur inattendue';
      speak(message);
    }
  };

  const handleOuvrirReception = (commande: any) => {
    setCommandeReception(commande);
  };

  const handleAccepterContreOffre = async (neg: Negociation) => {
    if (!neg.prixContreOffre) return;
    if (reseauIndisponible()) { direEchecReseau('hors_ligne'); return; }
    setSubmittingNeg(neg.id);
    try {
      await marchandRepondreNegociation(neg.id, { statut: 'accepte' });
      speak(montantsMasques ? 'Contre-offre acceptée.' : `Contre-offre acceptée : ${nombreEnMotsFr(neg.prixContreOffre)} FCFA/${neg.unite}`);
      const { negociations: data } = await fetchNegociations();
      setNegociations((data ?? []).map(mapNegociation));
    } catch (e: unknown) {
      const cause = causeEchec(e);
      if (cause) { direEchecReseau(cause); return; }
      const message = e instanceof Error ? e.message : 'Erreur inattendue';
      speak(`Erreur : ${message}`);
    } finally {
      setSubmittingNeg(null);
    }
  };

  const handleRefuserContreOffre = async (neg: Negociation) => {
    if (reseauIndisponible()) { direEchecReseau('hors_ligne'); return; }
    setSubmittingNeg(neg.id);
    try {
      await marchandRepondreNegociation(neg.id, { statut: 'refuse' });
      setNegociations(prev => prev.filter(n => n.id !== neg.id));
      speak('Contre-offre refusée.');
    } catch (e: unknown) {
      const cause = causeEchec(e);
      if (cause) { direEchecReseau(cause); return; }
      const message = e instanceof Error ? e.message : 'Erreur inattendue';
      speak(`Erreur : ${message}`);
    } finally {
      setSubmittingNeg(null);
    }
  };

  // ── Rendu ──────────────────────────────────────────────────────────────────

  return (
    <SubPageLayout
      role="marchand"
      title="Mes commandes"
      subtitle="Achats, ventes et livraisons"
      rightContent={<div className="flex items-center gap-2"><button type="button" onClick={basculerMontants} aria-label={montantsMasques ? 'Afficher les montants' : 'Cacher les montants'} className="w-11 h-11 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center">{montantsMasques ? <EyeOff className="w-5 h-5 text-white" /> : <Eye className="w-5 h-5 text-white" />}</button><NotificationButton /></div>}
    >
      {!isOnline && (
        <div role="status" className="mt-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-3 flex items-start gap-3">
          <WifiOff className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-900"><strong>Hors connexion.</strong> Tu peux relire les commandes déjà chargées. Attends le réseau pour confirmer, refuser ou marquer une livraison.</p>
        </div>
      )}
      {/* KPIs */}
      <div style={{ padding: '14px 0 0' }}>
        <KPIGrid cols={2}>
          <UniversalKPI
            label="Total commandes"
            value={statsCommandes.total.toLocaleString('fr-FR')}
            icon={ShoppingBag}
            color="var(--color-orange-600)"
            bgColor="rgba(255,247,237,0.85)"
            borderColor="rgba(249,115,22,0.4)"
            iconAnimation="bounce"
            details={[{ label: 'En cours', value: statsCommandes.enCours }, { label: 'Livrées', value: statsCommandes.livrees }]}
          />
          <UniversalKPI
            label="En cours"
            value={statsCommandes.enCours.toLocaleString('fr-FR')}
            icon={Clock}
            color="#2563eb"
            bgColor="rgba(239,246,255,0.85)"
            borderColor="rgba(59,130,246,0.4)"
            iconAnimation="pulse"
          />
          <UniversalKPI
            label="Livrées"
            value={statsCommandes.livrees.toLocaleString('fr-FR')}
            icon={CheckCircle}
            color="var(--color-green-600)"
            bgColor="rgba(240,253,244,0.85)"
            borderColor="rgba(34,197,94,0.4)"
            iconAnimation="spin"
          />
          <div onClick={() => { if (!montantsMasques) setShowMontantModal(true); }} className="cursor-pointer">
            <UniversalKPI
              label="Montant total"
              value={statsCommandes.montantTotal.toLocaleString('fr-FR')}
              masque={montantsMasques}
              suffix="FCFA"
              icon={TrendingUp}
              color="#7c3aed"
              bgColor="rgba(245,243,255,0.85)"
              borderColor="rgba(139,92,246,0.4)"
              iconAnimation="float"
            />
          </div>
        </KPIGrid>
      </div>
      <AnimatePresence>
        {showMontantModal && !montantsMasques && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowMontantModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              className="bg-white rounded-3xl max-w-sm mx-auto mt-20 p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="font-black text-gray-900 text-xl mb-4">Détail des montants</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span style={{ color: '#f59e0b' }}>En attente</span>
                  <span style={{ color: '#f59e0b' }}>
                    {montantsParStatut.enAttente.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: '#2563eb' }}>Confirmées</span>
                  <span style={{ color: '#2563eb' }}>
                    {montantsParStatut.confirmee.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: '#7c3aed' }}>En cours</span>
                  <span style={{ color: '#7c3aed' }}>
                    {montantsParStatut.enCours.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--color-green-600)' }}>Livrées</span>
                  <span style={{ color: 'var(--color-green-600)' }}>
                    {montantsParStatut.livree.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span style={{ color: 'var(--color-red-500)' }}>Annulées</span>
                  <span style={{ color: 'var(--color-red-500)' }}>
                    {montantsParStatut.annulee.toLocaleString('fr-FR')} FCFA
                  </span>
                </div>
              </div>
              <div className="border-t mt-4 pt-4 flex items-center justify-between">
                <span className="font-black text-lg" style={{ color: 'var(--commerce-action)' }}>Total général</span>
                <span className="font-black text-xl" style={{ color: 'var(--commerce-action)' }}>
                  {montantsParStatut.total.toLocaleString('fr-FR')} FCFA
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowMontantModal(false)}
                className="w-full rounded-2xl bg-[var(--commerce-action)] text-white mt-4 py-3 font-semibold"
              >
                Fermer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══ NÉGOCIATIONS EN COURS ══════════════════════════════════════════════ */}
      {loadingNegs && (
        <p className="px-4 mt-3 text-xs text-gray-500">Chargement des négociations…</p>
      )}
      <AnimatePresence>
        {negsActives.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 mt-4"
          >
            <p className="font-black text-gray-900 text-base mb-3 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-purple-500" strokeWidth={2.5} />
              Négociations en cours
              <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full bg-purple-500">
                {negsActives.length}
              </span>
            </p>

            <div className="space-y-3">
              {negsActives.map(neg => {
                const info = NEG_STATUT_LABELS[neg.statut] || NEG_STATUT_LABELS['en_attente'];
                const isContreOffre = neg.statut === 'contre_offre';
                return (
                  <motion.div
                    key={neg.id}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 60 }}
                    className="bg-white rounded-3xl border-2 border-purple-200 overflow-hidden shadow-sm"
                  >
                    {/* Header */}
                    <div className="px-4 pt-3 pb-2 flex items-start justify-between"
                      style={{ background: 'linear-gradient(135deg, var(--color-purple-50), white)' }}
                    >
                      <div className="flex-1 min-w-0">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: info.bg, color: info.color }}
                        >
                          {info.label}
                        </span>
                        <p className="font-black text-gray-900 text-base mt-1">{neg.produit}</p>
                        <p className="text-xs text-gray-500">{neg.quantite} {neg.unite}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400 mt-1" />
                    </div>

                    {/* Prix */}
                    <div className="px-4 pb-3 grid grid-cols-2 gap-2">
                      <div className="bg-gray-50 rounded-xl p-2 text-center">
                        <p className="text-[10px] text-gray-500 font-semibold">Mon prix proposé</p>
                        <p className="font-bold text-gray-700 text-sm">
                          {montantPrive(neg.prixPropose || 0, montantsMasques, 'FCFA')}
                        </p>
                      </div>
                      {isContreOffre && neg.prixContreOffre && (
                        <div className="bg-purple-50 rounded-xl p-2 text-center border border-purple-200">
                          <p className="text-[10px] text-purple-600 font-semibold">Contre-offre reçue</p>
                          <p className="font-bold text-purple-700 text-sm">
                            {montantPrive(neg.prixContreOffre, montantsMasques, 'FCFA')}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Message réponse */}
                    {neg.messageReponse && (
                      <div className="px-4 pb-3">
                        <div className="bg-purple-50 rounded-2xl px-3 py-2 border border-purple-100">
                          <p className="text-xs text-purple-800 italic">&quot;{neg.messageReponse}&quot;</p>
                        </div>
                      </div>
                    )}

                    {/* Actions contre-offre */}
                    {isContreOffre && (
                      <div className="px-4 pb-4 grid grid-cols-2 gap-2">
                        <motion.button
                          onClick={() => handleAccepterContreOffre(neg)}
                          disabled={submittingNeg === neg.id}
                          className="py-3 rounded-2xl font-bold text-white text-xs flex items-center justify-center gap-1 disabled:opacity-50"
                          style={{ backgroundColor: '#10b981' }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" strokeWidth={2.5} />
                          Accepter
                        </motion.button>
                        <motion.button
                          onClick={() => handleRefuserContreOffre(neg)}
                          disabled={submittingNeg === neg.id}
                          className="py-3 rounded-2xl font-bold text-white text-xs flex items-center justify-center gap-1 bg-red-500 disabled:opacity-50"
                          whileTap={{ scale: 0.95 }}
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

      {/* ══ FILTRES TYPE + STATUT ═════════════════════════════════════════════ */}
      <div className="bg-white border-b sticky top-0 z-10 mt-4">
        <div className="px-4 py-3 flex items-center justify-between gap-3">
          <div>
            <p className="font-black text-gray-900">Tes commandes</p>
            <p className="text-xs text-gray-500">Les plus récentes d’abord</p>
          </div>
          <button type="button" onClick={() => setShowFiltres(v => !v)} aria-expanded={showFiltres} className="min-h-11 px-4 rounded-2xl border-2 border-gray-200 bg-white text-gray-700 font-bold text-sm flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4" /> Filtrer
          </button>
        </div>
        {showFiltres && <>
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex flex-wrap gap-2">
            {([
              { key: 'tous' as const, label: 'Tous', count: mesCommandes.length },
              { key: 'achat' as const, label: 'Achats', count: mesCommandes.filter(c => c.acheteurId === user?.id).length },
              { key: 'vente' as const, label: 'Ventes', count: mesCommandes.filter(c => c.vendeurId === user?.id).length },
            ]).map(f => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFiltreType(f.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium flex-1 min-w-[calc(33%-8px)] transition-colors ${
                  filtreType === f.key
                    ? 'bg-[var(--commerce-action)] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'tous',       label: 'Toutes',       count: commandesParType.length },
              { key: 'en_attente', label: 'En attente',   count: commandesParType.filter(c => c.statut === 'en_attente').length },
              { key: 'confirmee',  label: 'Confirmées',   count: commandesParType.filter(c => c.statut === 'confirmee').length },
              { key: 'en_cours',   label: 'En cours',     count: commandesParType.filter(c => c.statut === 'en_cours').length },
              { key: 'en_livraison', label: 'En livraison', count: commandesParType.filter(c => c.statut === 'en_livraison').length },
              { key: 'livree',     label: 'Livrées',      count: commandesParType.filter(c => c.statut === 'livree').length },
            ].map(f => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFiltreStatut(f.key)}
                className={`px-4 py-2 rounded-full text-sm font-medium flex-1 min-w-[calc(33%-8px)] transition-colors ${
                  filtreStatut === f.key
                    ? 'bg-[var(--commerce-action)] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label} ({f.count})
              </button>
            ))}
          </div>
        </div>
        </>}
      </div>

      {/* ══ LISTE COMMANDES ════════════════════════════════════════════════════ */}
      <div className="px-4 py-4 pb-24">
        {commandesFiltrees.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <ShoppingBag className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Aucune commande</h3>
            <p className="text-gray-500 text-sm">
              {filtreStatut === 'tous'
                ? "Vous n'avez pas encore passé de commandes"
                : `Aucune commande ${STATUT_LABELS[filtreStatut]?.toLowerCase() || ''}`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {commandesFiltrees.map((commande, index) => {
              const colors = STATUT_COLORS[commande.statut] || STATUT_COLORS['en_attente'];
              return (
                <motion.div
                  key={commande.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
                >
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Package className="w-4 h-4 text-gray-400" />
                          <span className="text-xs text-gray-500">
                            Commande #{commande.id.slice(0, 8)}
                          </span>
                        </div>
                        <h3 className="font-semibold text-gray-800">{commande.produit}</h3>
                      </div>
                      <div className={`px-3 py-1 rounded-full ${colors.bg} ${colors.border} border`}>
                        <span className={`text-xs font-medium ${colors.text}`}>
                          {STATUT_LABELS[commande.statut] || commande.statut}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                      <MapPin className="w-4 h-4" />
                      <span>Vendeur : {commande.vendeurNom?.trim() || 'Producteur'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {new Date(commande.dateCommande).toLocaleDateString('fr-FR', {
                          day: 'numeric', month: 'long', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-50">
                    <div className="flex justify-between items-center py-2">
                      <div>
                        <span className="font-medium text-gray-700">{commande.produit}</span>
                        <span className="text-gray-500 text-sm ml-2">×{commande.quantite}</span>
                      </div>
                      <div className="font-semibold text-gray-800">
                        {montantPrive(commande.prixUnitaire || 0, montantsMasques, 'FCFA')}
                        {commande.unite && !montantsMasques ? <span className="text-[10px] opacity-60">/{commande.unite}</span> : null}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-gray-100 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Montant total</span>
                      <span className="text-xl font-bold text-gray-800">
                        {montantPrive(commande.total || 0, montantsMasques, 'FCFA')}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2 mt-3">
                      {commande.statut === 'en_attente' && commande.acheteurId === user?.id && (
                        <Button
                          onClick={() => {
                            setConfirmAnnulerCmd(commande.id);
                            return;
                          }}
                          variant="outline"
                          className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                          size="sm"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Annuler
                        </Button>
                      )}
                      {commande.statut === 'en_attente' && commande.vendeurId === user?.id && (
                        <>
                          <Button
                            onClick={() => { void handleConfirmerVente(commande.id); }}
                            className="flex-1 bg-[#2072AF] text-white hover:bg-[#1a5d92]"
                            size="sm"
                          >
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Confirmer la vente
                          </Button>
                          <Button
                            onClick={() => { void handleRefuserVente(commande.id); }}
                            variant="outline"
                            className="flex-1 border-red-300 text-red-700 hover:bg-red-50"
                            size="sm"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Refuser
                          </Button>
                        </>
                      )}
                      {commande.statut === 'confirmee' && commande.vendeurId === user?.id && (
                        <Button
                          onClick={() => { void handleMarquerLivree(commande.id); }}
                          className="flex-1 bg-[var(--color-green-600)] text-white hover:bg-[var(--color-green-700)]"
                          size="sm"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Marquer comme livrée
                        </Button>
                      )}
                      {RECEPTION_PAIEMENT_ACTIF && commande.statut === 'livree' && commande.statutPaiement !== 'paye' && commande.vendeurId === user?.id && (
                        <Button
                          onClick={() => handleOuvrirReception(commande)}
                          className="flex-1 bg-[var(--color-green-600)] text-white hover:bg-[var(--color-green-700)]"
                          size="sm"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Marquer comme payée
                        </Button>
                      )}
                      {/* Notation de la contrepartie sur une commande livrée (CDC 8.1.5) */}
                      {commande.statut === 'livree' && (commande.acheteurId === user?.id || commande.vendeurId === user?.id) && (
                        <NoterCommande
                          commandeId={commande.id}
                          cibleNom={commande.acheteurId === user?.id
                            ? (commande.vendeurNom?.trim() || 'le vendeur')
                            : ((commande as any).acheteurNom?.trim() || "l'acheteur")}
                          color="#E67E22"
                          onNoted={() => { void refreshCommandes(); }}
                        />
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <ReceptionPaiementModal
        isOpen={!!commandeReception}
        onClose={() => setCommandeReception(null)}
        commande={commandeReception}
        role="marchand"
        onPaiement={async (commandeId) => {
          await recupererPaiement(commandeId);
        }}
        onSuccess={async () => {
          await refreshCommandes();
          setCommandeReception(null);
        }}
      />
      {confirmAnnulerCmd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl p-6 flex flex-col gap-4 max-w-sm w-full mx-4">
            <p className="text-lg font-semibold">Annuler cette commande ?</p>
            <div className="flex gap-3">
              <button onClick={() => { void handleAnnuler(confirmAnnulerCmd); setConfirmAnnulerCmd(null); }} className="flex-1 bg-red-500 text-white py-2 rounded-xl">Confirmer</button>
              <button onClick={() => setConfirmAnnulerCmd(null)} className="flex-1 bg-gray-100 py-2 rounded-xl">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </SubPageLayout>
  );
}
