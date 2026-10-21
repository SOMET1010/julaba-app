import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Users,
  Filter,
  X,
  Check,
  Clock,
  Ban,
  Download,
  Eye,
} from 'lucide-react';
import { useCooperative } from '../../contexts/CooperativeContext';
import { useApp } from '../../contexts/AppContext';
import { useModalRegister } from '../../contexts/ModalContext';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Montant, MontantCard } from '../shared/Montant';
import { SubPageLayout } from '../layout/SubPageLayout';
import { toast } from 'sonner';

const COOPERATIVE_COLOR = '#2072AF';

type FiltrePeriode = 'tout' | '7jours' | '30jours' | '3mois';
type FiltreCategorie = 'tout' | 'cotisation' | 'vente_groupee' | 'achat_groupe' | 'commission' | 'frais' | 'subvention' | 'autre';

export function TresorerieCooperative() {
  const {
    tresorerie,
    soldeActuel,
    ajouterTransaction,
    validerTransaction,
    annulerTransaction,
    getTotalCotisations,
    membres,
  } = useCooperative();
  const { speak } = useApp();

  const [filtrePeriode, setFiltrePeriode] = useState<FiltrePeriode>('tout');
  const [filtreCategorie, setFiltreCategorie] = useState<FiltreCategorie>('tout');
  const [showAjoutModal, setShowAjoutModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [transactionSelectionnee, setTransactionSelectionnee] = useState<any>(null);

  // Sync ModalContext
  useModalRegister(showAjoutModal || showDetailModal);

  // Formulaire nouvelle transaction
  const [typeTransaction, setTypeTransaction] = useState<'entree' | 'sortie'>('entree');
  const [categorieTransaction, setCategorieTransaction] = useState('cotisation');
  const [montantTransaction, setMontantTransaction] = useState('');
  const [descriptionTransaction, setDescriptionTransaction] = useState('');
  const [membreIdTransaction, setMembreIdTransaction] = useState('');

  // Filtrer les transactions
  const transactionsFiltrees = tresorerie.filter(t => {
    // Filtre période
    if (filtrePeriode !== 'tout') {
      const dateTransaction = new Date(t.date);
      const maintenant = new Date();
      const diffJours = Math.floor((maintenant.getTime() - dateTransaction.getTime()) / (1000 * 60 * 60 * 24));

      if (filtrePeriode === '7jours' && diffJours > 7) return false;
      if (filtrePeriode === '30jours' && diffJours > 30) return false;
      if (filtrePeriode === '3mois' && diffJours > 90) return false;
    }

    // Filtre catégorie
    if (filtreCategorie !== 'tout' && t.categorie !== filtreCategorie) return false;

    return true;
  });

  // Calculer totaux entrées/sorties
  const totalEntrees = transactionsFiltrees
    .filter(t => t.type === 'entree' && t.statut === 'validee')
    .reduce((acc, t) => acc + t.montant, 0);

  const totalSorties = transactionsFiltrees
    .filter(t => t.type === 'sortie' && t.statut === 'validee')
    .reduce((acc, t) => acc + t.montant, 0);

  const transactionsEnAttente = tresorerie.filter(t => t.statut === 'en_attente').length;

  const handleAjouterTransaction = async () => {
    if (!montantTransaction || !descriptionTransaction) {
      speak('Remplis tous les champs obligatoires');
      return;
    }

    const montant = parseFloat(montantTransaction);
    if (isNaN(montant) || montant <= 0) {
      speak('Entre un montant valide');
      return;
    }

    const membreSelectionne = membreIdTransaction ? membres.find(m => m.id === membreIdTransaction) : undefined;

    try {
      await ajouterTransaction({
        type: typeTransaction,
        categorie: categorieTransaction as any,
        montant,
        description: descriptionTransaction,
        membreId: membreIdTransaction || undefined,
        membreNom: membreSelectionne ? `${membreSelectionne.prenom} ${membreSelectionne.nom}` : undefined,
        date: new Date().toISOString(),
        statut: 'en_attente', // Validé automatiquement pour l'instant
      });
      toast.success('Transaction enregistrée');
    } catch {
      toast.error('Impossible d\'enregistrer la transaction. Réessaie.');
      return;
    }

    speak(`Transaction ${typeTransaction === 'entree' ? 'entrée' : 'sortie'} de ${(montant || 0).toLocaleString()} francs CFA enregistrée`);

    // Reset
    setShowAjoutModal(false);
    setMontantTransaction('');
    setDescriptionTransaction('');
    setMembreIdTransaction('');
    setCategorieTransaction('cotisation');
  };

  const handleVoirDetail = (transaction: any) => {
    setTransactionSelectionnee(transaction);
    setShowDetailModal(true);
  };

  const getCategorieLabel = (categorie: string) => {
    const labels: Record<string, string> = {
      cotisation: 'Cotisation',
      vente_groupee: 'Vente groupée',
      achat_groupe: 'Achat groupé',
      commission: 'Commission',
      frais: 'Frais',
      subvention: 'Subvention',
      autre: 'Autre',
    };
    return labels[categorie] || categorie;
  };

  const getCategorieColor = (categorie: string) => {
    const colors: Record<string, string> = {
      cotisation: '#10B981',
      vente_groupee: '#2072AF',
      achat_groupe: '#F59E0B',
      commission: '#8B5CF6',
      frais: '#EF4444',
      subvention: '#06B6D4',
      autre: '#6B7280',
    };
    return colors[categorie] || '#6B7280';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const aujourdhui = new Date();
    const hier = new Date(aujourdhui);
    hier.setDate(hier.getDate() - 1);

    if (date.toDateString() === aujourdhui.toDateString()) {
      return `Aujourd'hui, ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === hier.toDateString()) {
      return `Hier, ${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    }
  };

  return (
    <SubPageLayout role="cooperative" title="Trésorerie">
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white pb-32">
        {/* Header Stats */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-6 shadow-lg">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Solde principal */}
            <div className="text-center">
              <p className="text-blue-200 text-sm font-medium mb-1">Solde de la trésorerie</p>
              <motion.h1
                className="text-4xl font-bold text-white"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <Montant value={soldeActuel} size="2xl" color="white" />
              </motion.h1>
            </div>

            {/* Entrées/Sorties */}
            <div className="grid grid-cols-2 gap-3">
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                    <ArrowDownRight className="w-4 h-4 text-green-400" />
                  </div>
                  <p className="text-xs text-blue-100">Entrées</p>
                </div>
                <p className="text-xl font-bold text-white">{(totalEntrees || 0).toLocaleString()} <span className="text-sm opacity-70">FCFA</span></p>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-white/10 backdrop-blur-sm rounded-2xl p-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-red-400" />
                  </div>
                  <p className="text-xs text-blue-100">Sorties</p>
                </div>
                <p className="text-xl font-bold text-white">{(totalSorties || 0).toLocaleString()} <span className="text-sm opacity-70">FCFA</span></p>
              </motion.div>
            </div>

            {/* Transactions en attente */}
            {transactionsEnAttente > 0 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-amber-500/20 backdrop-blur-sm rounded-xl p-3 flex items-center gap-2"
              >
                <Clock className="w-5 h-5 text-amber-300" />
                <p className="text-sm text-amber-100">
                  {transactionsEnAttente} transaction{transactionsEnAttente > 1 ? 's' : ''} en attente de validation
                </p>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Actions rapides */}
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Actions rapides</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setTypeTransaction('entree');
                setShowAjoutModal(true);
              }}
              className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 text-left shadow-lg"
            >
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-2">
                <ArrowDownRight className="w-5 h-5 text-white" />
              </div>
              <p className="text-white font-bold text-sm">Nouvelle entrée</p>
              <p className="text-green-100 text-xs mt-1">Cotisation, vente...</p>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setTypeTransaction('sortie');
                setShowAjoutModal(true);
              }}
              className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-4 text-left shadow-lg"
            >
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mb-2">
                <ArrowUpRight className="w-5 h-5 text-white" />
              </div>
              <p className="text-white font-bold text-sm">Nouvelle sortie</p>
              <p className="text-red-100 text-xs mt-1">Achat, frais...</p>
            </motion.button>
          </div>
        </div>

        {/* Filtres */}
        <div className="px-4 pb-4 space-y-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {(['tout', '7jours', '30jours', '3mois'] as FiltrePeriode[]).map(periode => (
              <motion.button
                key={periode}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFiltrePeriode(periode)}
                className="px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
                style={{
                  backgroundColor: filtrePeriode === periode ? COOPERATIVE_COLOR : 'white',
                  color: filtrePeriode === periode ? 'white' : COOPERATIVE_COLOR,
                  border: `2px solid ${COOPERATIVE_COLOR}`,
                }}
              >
                {periode === 'tout' ? 'Toutes' : periode === '7jours' ? '7 jours' : periode === '30jours' ? '30 jours' : '3 mois'}
              </motion.button>
            ))}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {(['tout', 'cotisation', 'vente_groupee', 'achat_groupe', 'commission'] as FiltreCategorie[]).map(cat => (
              <motion.button
                key={cat}
                whileTap={{ scale: 0.95 }}
                onClick={() => setFiltreCategorie(cat)}
                className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors border-2"
                style={{
                  backgroundColor: filtreCategorie === cat ? getCategorieColor(cat) : 'white',
                  color: filtreCategorie === cat ? 'white' : getCategorieColor(cat),
                  borderColor: getCategorieColor(cat),
                }}
              >
                {getCategorieLabel(cat)}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Liste des transactions */}
        <div className="px-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">
              Historique ({transactionsFiltrees.length})
            </h2>
          </div>

          <AnimatePresence mode="popLayout">
            {transactionsFiltrees.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center py-12"
              >
                <Wallet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Aucune transaction pour cette période</p>
              </motion.div>
            ) : (
              transactionsFiltrees.map((transaction, index) => (
                <motion.div
                  key={transaction.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => handleVoirDetail(transaction)}
                  className="bg-white rounded-2xl p-4 shadow-md cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Icône */}
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${getCategorieColor(transaction.categorie)}20` }}
                      >
                        {transaction.type === 'entree' ? (
                          <ArrowDownRight className="w-6 h-6" style={{ color: getCategorieColor(transaction.categorie) }} />
                        ) : (
                          <ArrowUpRight className="w-6 h-6" style={{ color: getCategorieColor(transaction.categorie) }} />
                        )}
                      </div>

                      {/* Infos */}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-900 truncate">{transaction.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${getCategorieColor(transaction.categorie)}20`,
                              color: getCategorieColor(transaction.categorie),
                            }}
                          >
                            {getCategorieLabel(transaction.categorie)}
                          </span>
                          {transaction.membreNom && (
                            <span className="text-xs text-gray-500 truncate flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {transaction.membreNom}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{formatDate(transaction.date)}</p>
                      </div>
                    </div>

                    {/* Montant + Statut */}
                    <div className="text-right ml-2">
                      <p
                        className="text-lg font-bold"
                        style={{ color: transaction.type === 'entree' ? '#10B981' : '#EF4444' }}
                      >
                        {transaction.type === 'entree' ? '+' : '-'}{(transaction.montant || 0).toLocaleString()} <span className="text-xs opacity-70">FCFA</span>
                      </p>
                      {transaction.statut === 'en_attente' && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full mt-1">
                          <Clock className="w-3 h-3" />
                          En attente
                        </span>
                      )}
                      {transaction.statut === 'annulee' && (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded-full mt-1">
                          <Ban className="w-3 h-3" />
                          Annulée
                        </span>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Modal Ajouter Transaction */}
      <AnimatePresence>
        {showAjoutModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end px-4 pb-4"
            onClick={() => setShowAjoutModal(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-2xl mx-auto shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  Nouvelle {typeTransaction === 'entree' ? 'entrée' : 'sortie'}
                </h2>
                <motion.button
                  onClick={() => setShowAjoutModal(false)}
                  whileHover={{ rotate: 90, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </motion.button>
              </div>

              {/* Formulaire */}
              <div className="p-6 space-y-4">
                {/* Catégorie */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">Catégorie</Label>
                  <select
                    value={categorieTransaction}
                    onChange={(e) => setCategorieTransaction(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-200 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="cotisation">Cotisation</option>
                    <option value="vente_groupee">Vente groupée</option>
                    <option value="achat_groupe">Achat groupé</option>
                    <option value="commission">Commission</option>
                    <option value="frais">Frais</option>
                    <option value="subvention">Subvention</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>

                {/* Montant */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">Montant (FCFA)</Label>
                  <Input
                    type="number"
                    value={montantTransaction}
                    onChange={(e) => setMontantTransaction(e.target.value)}
                    placeholder="0"
                    className="h-16 text-3xl font-bold text-center rounded-xl border-2"
                    style={{
                      borderColor: typeTransaction === 'entree' ? '#10B981' : '#EF4444',
                      color: typeTransaction === 'entree' ? '#10B981' : '#EF4444',
                    }}
                  />
                </div>

                {/* Description */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">Description</Label>
                  <Input
                    type="text"
                    value={descriptionTransaction}
                    onChange={(e) => setDescriptionTransaction(e.target.value)}
                    placeholder="Ex: Cotisation mensuelle Mars 2026"
                    className="h-12 rounded-xl border-2 border-gray-200 focus:border-blue-500"
                  />
                </div>

                {/* Membre (optionnel) */}
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-2 block">
                    Membre concerné (optionnel)
                  </Label>
                  <select
                    value={membreIdTransaction}
                    onChange={(e) => setMembreIdTransaction(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-gray-50 border-2 border-gray-200 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Aucun membre spécifique</option>
                    {membres.map(membre => (
                      <option key={membre.id} value={membre.id}>
                        {membre.prenom} {membre.nom} - {membre.specialite}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Bouton Enregistrer */}
                <motion.button
                  onClick={handleAjouterTransaction}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-4 rounded-2xl text-white font-bold text-lg shadow-lg flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: typeTransaction === 'entree' ? '#10B981' : '#EF4444',
                  }}
                >
                  <Check className="w-5 h-5" />
                  Enregistrer la transaction
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Détail Transaction */}
      <AnimatePresence>
        {showDetailModal && transactionSelectionnee && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center px-4"
            onClick={() => setShowDetailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div
                className="px-6 py-4 text-white"
                style={{ backgroundColor: getCategorieColor(transactionSelectionnee.categorie) }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold">Détails de la transaction</h3>
                  <motion.button
                    onClick={() => setShowDetailModal(false)}
                    whileHover={{ rotate: 90 }}
                    className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
                <p className="text-3xl font-bold">
                  {transactionSelectionnee.type === 'entree' ? '+' : '-'}
                  {(transactionSelectionnee.montant || 0).toLocaleString()} <span className="text-lg opacity-70 font-bold">FCFA</span>
                </p>
              </div>

              {/* Détails */}
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Description</p>
                  <p className="font-semibold text-gray-900">{transactionSelectionnee.description}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Catégorie</p>
                  <span
                    className="inline-block px-3 py-1 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: `${getCategorieColor(transactionSelectionnee.categorie)}20`,
                      color: getCategorieColor(transactionSelectionnee.categorie),
                    }}
                  >
                    {getCategorieLabel(transactionSelectionnee.categorie)}
                  </span>
                </div>

                {transactionSelectionnee.membreNom && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Membre</p>
                    <p className="font-semibold text-gray-900">{transactionSelectionnee.membreNom}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-gray-500 mb-1">Date</p>
                  <p className="font-semibold text-gray-900">{formatDate(transactionSelectionnee.date)}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Statut</p>
                  <span
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor:
                        transactionSelectionnee.statut === 'validee'
                          ? '#10B98120'
                          : transactionSelectionnee.statut === 'en_attente'
                          ? '#F59E0B20'
                          : '#EF444420',
                      color:
                        transactionSelectionnee.statut === 'validee'
                          ? '#10B981'
                          : transactionSelectionnee.statut === 'en_attente'
                          ? '#F59E0B'
                          : '#EF4444',
                    }}
                  >
                    {transactionSelectionnee.statut === 'validee' && <Check className="w-4 h-4" />}
                    {transactionSelectionnee.statut === 'en_attente' && <Clock className="w-4 h-4" />}
                    {transactionSelectionnee.statut === 'annulee' && <Ban className="w-4 h-4" />}
                    {transactionSelectionnee.statut === 'validee'
                      ? 'Validée'
                      : transactionSelectionnee.statut === 'en_attente'
                      ? 'En attente'
                      : 'Annulée'}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </SubPageLayout>
  );
}