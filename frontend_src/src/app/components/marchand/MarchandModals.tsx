import React, { useState, useEffect, useRef, useMemo } from 'react';
import { nombreEnMotsFr } from '../../i18n/voice/argent/deuxFormes';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import {
  Calendar, DollarSign, AlertCircle, Package, Wallet,
  TrendingUp, Award, FileText, X, Check, ChevronDown, ChevronUp,
  ArrowRight, Star, Clock, User, Phone, MapPin, Search, Plus,
  Minus, Trash2, Edit2, Eye, Download, Share2, Info, Loader2,
  RefreshCw, BarChart2, PieChart, TrendingDown, Send, Printer
} from 'lucide-react';
import { useApp } from '../../contexts/AppContext';
import { droitDeFermerLaJournee, type EtatCaisseAccueil } from '../../services/etatCaisseAccueil';
import { stopAllAudio } from '../../services/elevenlabs';
import { Montant, MontantCard } from '../shared/Montant';
// MONTANTS PRIVÉS — le même geste que sur les autres écrans marchand
// (MarchandAlertes, MarchandDepenses, GestionStock, MarcheVirtuel) : quand
// elle a masqué ses montants, ils le restent DANS LES MODALES aussi. Un
// récapitulatif de journée ouvert devant une cliente était jusqu'ici le seul
// endroit où le chiffre d'affaires réapparaissait en grand. Le hook et la
// prop `masque` existent déjà : on ne fait que les brancher ici.
import { useMontantsPrives } from '../../hooks/useMontantsPrives';

import {
  IMG_BILLET_500, IMG_BILLET_1000, IMG_BILLET_2000, IMG_BILLET_5000, IMG_BILLET_10000,
  IMG_PIECE_25, IMG_PIECE_50, IMG_PIECE_100, IMG_PIECE_200
} from '../../assets/images';

// Billets et pieces CFA depuis le registre central
const billet500 = IMG_BILLET_500;
const billet1000 = IMG_BILLET_1000;
const billet2000 = IMG_BILLET_2000;
const billet5000 = IMG_BILLET_5000;
const billet10000 = IMG_BILLET_10000;

const piece25 = IMG_PIECE_25;
const piece50 = IMG_PIECE_50;
const piece100 = IMG_PIECE_100;
const piece200 = IMG_PIECE_200;

const formatMontantFR = (n: number): string => {
  return Math.round(n).toLocaleString('fr-FR').replace(/,/g, ' ');
};

// ==== COMPOSANTS DE BASE ====

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

function BaseModal({ isOpen, onClose, children }: BaseModalProps) {
  const { setIsModalOpen } = useApp();
  React.useEffect(() => {
    setIsModalOpen(isOpen);
    return () => setIsModalOpen(false);
  }, [isOpen]);
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop avec blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[200]"
            onClick={onClose}
          />
          
          {/* Contenu du modal */}
          <div className="fixed inset-0 z-[210] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="w-full max-w-md pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

interface StyledButtonProps {
  onClick: () => void;
  variant?: 'primary' | 'outline' | 'danger' | 'success';
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

function StyledButton({ onClick, variant = 'primary', disabled, children, className = '', fullWidth }: StyledButtonProps) {
  const baseStyle = 'px-6 py-3.5 rounded-2xl font-semibold text-base transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantStyles = {
    primary: 'text-white shadow-lg hover:shadow-xl',
    outline: 'bg-white border text-gray-700 hover:bg-gray-50',
    danger: 'bg-red-600 text-white shadow-lg hover:bg-red-700 hover:shadow-xl',
    success: 'text-white shadow-lg hover:shadow-xl',
  };

  let bgColor = 'var(--commerce-action)';
  if (variant === 'danger') bgColor = 'var(--destructive)';
  if (variant === 'success') bgColor = 'var(--color-green-600)';

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variantStyles[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      style={variant === 'primary' || variant === 'success' ? { backgroundColor: bgColor } : variant === 'outline' ? { borderWidth: '2px', borderColor: 'var(--border)' } : undefined}
      whileHover={!disabled ? { scale: 1.02 } : {}}
      whileTap={!disabled ? { scale: 0.98 } : {}}
    >
      {children}
    </motion.button>
  );
}

interface StyledInputProps {
  id?: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
}

function StyledInput({ id, type, placeholder, value, onChange, error, autoFocus, disabled }: StyledInputProps) {
  return (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      autoFocus={autoFocus}
      disabled={disabled}
      className={`w-full px-4 py-4 rounded-2xl border text-lg font-medium transition-all duration-200 focus:outline-none focus:ring-4 ${
        error
          ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
          : 'border-gray-300 focus:ring-orange-100'
      } disabled:bg-gray-100 disabled:cursor-not-allowed`}
      style={!error ? { borderWidth: '2px', borderColor: 'var(--color-gray-300)' } : undefined}
    />
  );
}

interface MontantFCFAInputProps {
  id?: string;
  value: string;
  onChange: (rawValue: string) => void;
  placeholder?: string;
  error?: boolean;
  autoFocus?: boolean;
  disabled?: boolean;
}

function MontantFCFAInput({ id, value, onChange, placeholder, error, autoFocus, disabled }: MontantFCFAInputProps) {
  const displayValue = value ? `${formatMontantFR(Number(value))} FCFA` : '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '').slice(0, 9);
    onChange(rawValue);
  };

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      placeholder={placeholder}
      value={displayValue}
      onChange={handleChange}
      autoFocus={autoFocus}
      disabled={disabled}
      className={`w-full px-4 py-4 rounded-2xl border text-lg font-medium transition-all duration-200 focus:outline-none focus:ring-4 ${
        error
          ? 'border-red-500 focus:border-red-500 focus:ring-red-100'
          : 'border-gray-300 focus:ring-orange-100'
      } disabled:bg-gray-100 disabled:cursor-not-allowed`}
      style={!error ? { borderWidth: '2px', borderColor: 'var(--color-gray-300)' } : undefined}
    />
  );
}

// Selecteur de billets
interface BilletsSelecteurProps {
  onBilletClick: (montant: number) => void;
}

function BilletsSelecteur({ onBilletClick }: BilletsSelecteurProps) {
  // AUCUN défilement automatique : décision Patrick du 15/09/2026.
  //
  // Ces rangées défilaient en boucle infinie, et leur pause était branchée sur
  // onMouseEnter — un événement de SOURIS, qui n'existe pas sur un téléphone.
  // Sur l'appareil d'une marchande, elles ne s'arrêtaient donc jamais : il
  // fallait toucher une cible en mouvement POUR SAISIR DE L'ARGENT. Mesuré :
  // 59 px par seconde, un billet en fait 85 — une coupure passe sous le doigt
  // en une seconde et demie, on se trompe de billet et le fond de caisse est
  // faux.
  //
  // Sur une saisie d'argent, une cible qui bouge n'apporte aucun bénéfice et
  // ajoute un risque réel. La rangée reste immobile et se fait glisser à la
  // main (overflow-x-auto, déjà en place). Aucun timer, aucune reprise.

  const billets = [
    { valeur: 500, image: billet500 },
    { valeur: 1000, image: billet1000 },
    { valeur: 2000, image: billet2000 },
    { valeur: 5000, image: billet5000 },
    { valeur: 10000, image: billet10000 },
  ];

  return (
    <div className="mb-6">
      <p className="text-sm font-semibold mb-3 text-gray-700">
        Sélectionne tes billets (clique pour ajouter)
      </p>
      <div 
        className="relative overflow-x-auto overflow-y-hidden -mx-1 px-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div className="flex gap-2 pb-2">
          {billets.map((billet, index) => (
            <motion.button
              key={`${billet.valeur}-${index}`}
              onClick={() => onBilletClick(billet.valeur)}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className="flex-shrink-0 relative group"
            >
              <img
                src={billet.image}
                alt={`${billet.valeur} FCFA`}
                className="h-12 w-auto rounded-lg shadow-lg transition-shadow group-hover:shadow-xl"
              />
              <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs font-bold px-2 py-0.5 rounded">
                {billet.valeur}
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Selecteur de pieces
interface PiecesSelecteurProps {
  onPieceClick: (montant: number) => void;
}

function PiecesSelecteur({ onPieceClick }: PiecesSelecteurProps) {
  // AUCUN défilement automatique : décision Patrick du 15/09/2026.
  //
  // Ces rangées défilaient en boucle infinie, et leur pause était branchée sur
  // onMouseEnter — un événement de SOURIS, qui n'existe pas sur un téléphone.
  // Sur l'appareil d'une marchande, elles ne s'arrêtaient donc jamais : il
  // fallait toucher une cible en mouvement POUR SAISIR DE L'ARGENT. Mesuré :
  // 59 px par seconde, un billet en fait 85 — une coupure passe sous le doigt
  // en une seconde et demie, on se trompe de billet et le fond de caisse est
  // faux.
  //
  // Sur une saisie d'argent, une cible qui bouge n'apporte aucun bénéfice et
  // ajoute un risque réel. La rangée reste immobile et se fait glisser à la
  // main (overflow-x-auto, déjà en place). Aucun timer, aucune reprise.

  const pieces = [
    { valeur: 25, image: piece25 },
    { valeur: 50, image: piece50 },
    { valeur: 100, image: piece100 },
    { valeur: 200, image: piece200 },
  ];

  return (
    <div className="mb-6">
      <p className="text-sm font-semibold mb-3 text-gray-700">
        Sélectionne tes pièces (clique pour ajouter)
      </p>
      <div 
        className="relative overflow-x-auto overflow-y-hidden -mx-1 px-1 h-20 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div className="flex gap-2 pb-2">
          {pieces.map((piece, index) => (
            <motion.button
              key={`${piece.valeur}-${index}`}
              onClick={() => onPieceClick(piece.valeur)}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              className="flex-shrink-0 relative group"
            >
              <img
                src={piece.image}
                alt={`${piece.valeur} FCFA`}
                className="h-12 w-auto rounded-full shadow-lg transition-shadow group-hover:shadow-xl"
              />
              <div className="absolute bottom-1 right-1 bg-black/70 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                {piece.valeur}
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==== MODALES ====

interface OpenDayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OpenDayModal({ isOpen, onClose }: OpenDayModalProps) {
  const { openDay, speak } = useApp();
  const [fondInitial, setFondInitial] = useState('');
  const [error, setError] = useState('');

  const handleBilletClick = (montant: number) => {
    const currentValue = parseFloat(fondInitial) || 0;
    const newValue = currentValue + montant;
    setFondInitial(newValue.toString());
    setError('');
    void speak(`${nombreEnMotsFr(montant)} Francs CFA ajoutés. Total : ${nombreEnMotsFr(newValue || 0)} Francs CFA`);
  };

  const handlePieceClick = (montant: number) => {
    const currentValue = parseFloat(fondInitial) || 0;
    const newValue = currentValue + montant;
    setFondInitial(newValue.toString());
    setError('');
    void speak(`${nombreEnMotsFr(montant)} Francs CFA ajoutés. Total : ${nombreEnMotsFr(newValue || 0)} Francs CFA`);
  };

  const handleInputChange = (value: string) => {
    setFondInitial(value);
    const montant = parseFloat(value);
    
    if (value && !isNaN(montant) && montant % 5 !== 0) {
      setError('Le montant doit être un multiple de 5 FCFA');
    } else {
      setError('');
    }
  };

  const handleSubmit = () => {
    const montant = parseFloat(fondInitial);
    if (isNaN(montant) || montant < 0) {
      void speak('Le montant saisi est invalide');
      setError('Le montant saisi est invalide');
      return;
    }
    
    if (montant % 5 !== 0) {
      void speak('Le montant doit être un multiple de 5 francs');
      setError('Le montant doit être un multiple de 5 FCFA');
      return;
    }
    
    openDay(montant);
    onClose();
    stopAllAudio();
    setTimeout(() => { void speak(`Ta journée est ouverte avec ${nombreEnMotsFr(montant || 0)} Francs CFA`); }, 500);
    setFondInitial('');
    setError('');
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-3xl border-4 shadow-2xl overflow-hidden" style={{ borderColor: 'var(--commerce-action)' }}>
        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-4 mb-3">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(196, 98, 16, 0.15)' }}
            >
              <Calendar className="w-7 h-7" style={{ color: 'var(--commerce-action)' }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--commerce-action)' }}>
                Ouvre ta journée
              </h2>
            </div>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">
            Combien tu as en caisse ce matin ?
          </p>
        </div>

        {/* Body */}
        <div className="px-6 pb-6">
          <BilletsSelecteur onBilletClick={handleBilletClick} />
          <PiecesSelecteur onPieceClick={handlePieceClick} />

          <div className="mb-2">
            <label htmlFor="fondInitial" className="text-sm font-semibold mb-2 block text-gray-700">
              Fond de caisse initial
            </label>
            <MontantFCFAInput
              id="fondInitial"
              placeholder="Montant en FCFA (multiple de 5)"
              value={fondInitial}
              onChange={(rawValue) => handleInputChange(rawValue)}
              error={!!error}
            />
            {error && (
              <p className="text-sm text-red-600 mt-2 font-medium">{error}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <StyledButton
            variant="outline"
            onClick={onClose}
          >
            Annuler
          </StyledButton>
          <StyledButton
            onClick={handleSubmit}
            disabled={!!error || !fondInitial}
            className="flex-1"
          >
            Ouvrir la journée
          </StyledButton>
        </div>
      </div>
    </BaseModal>
  );
}

interface EditFondModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** ACC-02 — ABSENT veut dire INCONNU, et c'est le point. La prop valait
   *  `currentSession?.fondInitial || 0` : sans session lue, l'écran proposait
   *  « Fond actuel : 0 FCFA » et pré-remplissait le champ avec zéro. Une
   *  marchande qui valide sans y penser écrase son vrai fond par zéro — et
   *  toute sa caisse théorique du jour avec. C'est le « montant toujours 0 F »
   *  que la recette terrain a relevé (MAR-CAI-001). */
  currentFond?: number;
}

export function EditFondModal({ isOpen, onClose, currentFond }: EditFondModalProps) {
  const { updateFondInitial, speak } = useApp();
  const fondConnu = typeof currentFond === 'number' && Number.isFinite(currentFond);
  // Champ VIDE quand on ne sait pas : elle tape son vrai fond, elle ne
  // confirme pas un zéro qu'on lui a soufflé.
  const [nouveauFond, setNouveauFond] = useState(fondConnu ? String(currentFond) : '');
  useEffect(() => {
    if (isOpen) setNouveauFond(fondConnu ? String(currentFond) : '');
  }, [isOpen, currentFond, fondConnu]);

  const handleBilletClick = (montant: number) => {
    const currentValue = parseFloat(nouveauFond) || 0;
    const newValue = currentValue + montant;
    setNouveauFond(newValue.toString());
    void speak(`${nombreEnMotsFr(montant)} Francs CFA ajoutés. Total : ${nombreEnMotsFr(newValue || 0)} Francs CFA`);
  };

  const handlePieceClick = (montant: number) => {
    const currentValue = parseFloat(nouveauFond) || 0;
    const newValue = currentValue + montant;
    setNouveauFond(newValue.toString());
    void speak(`${nombreEnMotsFr(montant)} Francs CFA ajoutés. Total : ${nombreEnMotsFr(newValue || 0)} Francs CFA`);
  };

  const handleSubmit = () => {
    const montant = parseFloat(nouveauFond);
    if (isNaN(montant) || montant < 0) {
      void speak('Le montant saisi est invalide');
      return;
    }
    updateFondInitial(montant);
    void speak(`Ton fond de caisse est maintenant de ${nombreEnMotsFr(montant || 0)} Francs CFA`);
    onClose();
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-3xl border-4 shadow-2xl overflow-hidden" style={{ borderColor: 'var(--commerce-action)' }}>
        <div className="p-6 pb-4">
          <div className="flex items-center gap-4 mb-3">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(196, 98, 16, 0.15)' }}
            >
              <DollarSign className="w-7 h-7" style={{ color: 'var(--commerce-action)' }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--commerce-action)' }}>
                Modifier le fond
              </h2>
            </div>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">
            Modifie le montant de ton fond de caisse initial.
          </p>
        </div>

        <div className="px-6 pb-6">
          <BilletsSelecteur onBilletClick={handleBilletClick} />
          <PiecesSelecteur onPieceClick={handlePieceClick} />

          <div className="mb-2">
            <label htmlFor="nouveauFond" className="text-sm font-semibold mb-2 block text-gray-700">
              Nouveau fond de caisse
            </label>
            <MontantFCFAInput
              id="nouveauFond"
              placeholder="Montant en FCFA"
              value={nouveauFond}
              onChange={(rawValue) => setNouveauFond(rawValue)}
            />
            <p className="text-sm text-gray-500 mt-2 font-medium">
              Fond actuel : {fondConnu ? `${formatMontantFR(currentFond as number)} FCFA` : '— (pas encore lu)'}
            </p>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <StyledButton variant="outline" onClick={onClose}>
            Annuler
          </StyledButton>
          <StyledButton onClick={handleSubmit} className="flex-1">
            Modifier
          </StyledButton>
        </div>
      </div>
    </BaseModal>
  );
}

interface CloseDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: {
    ventes: number;
    cahier: number;
    caisse: number;
    nombreVentes: number;
  };
  /** ACC-02 — d'où viennent ces chiffres, et ce qu'on a le droit d'en faire.
   *  La clôture est un CONSTAT daté : la refuser sur des chiffres non lus est
   *  la seule position tenable (services/etatCaisseAccueil). */
  etatCaisse?: EtatCaisseAccueil;
}

export function CloseDayModal({ isOpen, onClose, stats, etatCaisse }: CloseDayModalProps) {
  const { closeDay, speak, getSalesHistory, getFinancialSummary } = useApp();
  const { montantsMasques } = useMontantsPrives();
  const navigate = useNavigate();
  // LE CHAMP DE COMPTAGE PART VIDE, ET C'EST ESSENTIEL.
  //
  // Il était pré-rempli avec `stats.caisse` — la caisse THÉORIQUE, c'est-à-dire
  // très exactement la valeur que le comptage est censé vérifier. Remonté en
  // recette le 16/09/2026. Conséquence : l'écart affiché valait zéro avant même
  // qu'elle ait ouvert sa boîte, et valider sans rien changer confirmait un faux
  // zéro. Une caisse qui propose d'avance la réponse attendue ne peut plus
  // révéler le moindre écart — or détecter l'écart est la raison d'être de la
  // fermeture. Le pré-remplissage ne faisait pas gagner du temps : il rendait la
  // mesure inutile.
  const [comptageReel, setComptageReel] = useState('');
  const [isClosing, setIsClosing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const handleClose = async () => {
    // Champ vide = elle n'a pas compté. On ne ferme pas une caisse sur une
    // absence de mesure : sans ce garde-fou, le champ vide partirait comme un
    // zéro et écrirait « caisse vide » dans le journal du jour.
    if (!comptageReel.trim()) {
      toast.error('Compte ton argent et entre le montant trouvé.');
      speak("Compte l'argent de ta boîte, puis entre le montant que tu as trouvé.");
      return;
    }
    const montant = Number(comptageReel);
    if (Number.isNaN(montant) || montant < 0) {
      toast.error('Montant invalide. Vérifie la saisie.');
      return;
    }
    setIsClosing(true);
    try {
      await closeDay(montant);
      toast.success('Journée clôturée avec succès');
      onClose();
    } catch (e: any) {
      console.warn('[CloseDayModal] closeDay failed:', e?.message);
      toast.error('Impossible de clôturer la journée. Réessaie.');
    } finally {
      setIsClosing(false);
    }
  };

  const handleNavigateToCaisse = () => {
    onClose();
    navigate('/marchand/resume-caisse');
  };

  // ACC-02 — LE DROIT DE FERMER. Sans état fourni (appelants historiques), le
  // comportement d'avant reste : on ne casse aucun écran qu'on n'a pas mesuré.
  const droit = etatCaisse ? droitDeFermerLaJournee(etatCaisse) : null;
  const fermetureInterdite = droit ? !droit.permis : false;
  const chiffresIncomplets = droit?.permis === true && droit.exact === false;

  const marge = stats.ventes - stats.cahier;
  // `null` tant qu'elle n'a rien compté : pas d'écart AVANT la mesure. Avec le
  // repli `|| '0'` d'avant, un champ vide affichait un écart égal à moins la
  // caisse entière — un chiffre alarmant et faux, montré avant tout comptage.
  // Et il ne se calcule PAS DU TOUT sur une caisse théorique inconnue : le
  // résultat serait « tout ce que tu as compté est un excédent ».
  const ecart = (comptageReel.trim() === '' || fermetureInterdite)
    ? null
    : parseFloat(comptageReel) - stats.caisse;

  const day = new Date().toISOString().split('T')[0];

  // Récupérer les ventes du jour pour analyse
  const todaySales = useMemo(
    () => getSalesHistory({ startDate: day, endDate: day }),
    [getSalesHistory, day]
  );

  // Top 3 produits vendus
  const topProducts = useMemo(
    () => todaySales.reduce((acc, sale) => {
      const existing = acc.find(p => p.name === sale.productName);
      if (existing) {
        existing.quantity += sale.quantity;
        existing.total += sale.price * sale.quantity;
      } else {
        acc.push({ name: sale.productName, quantity: sale.quantity, total: sale.price * sale.quantity });
      }
      return acc;
    }, [] as { name: string; quantity: number; total: number }[])
      .sort((a, b) => b.total - a.total)
      .slice(0, 3),
    [todaySales]
  );

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-3xl border-4 shadow-2xl overflow-hidden border-red-500 max-h-[90vh] overflow-y-auto">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-red-600">
                Fermer la caisse
              </h2>
            </div>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">
            Voici le résumé de ta journée avant de fermer.
          </p>
        </div>

        {/* ACC-02 — ON DIT POURQUOI, ET CE QU'IL FAUT FAIRE. Un bouton grisé
            sans explication est un mur ; une marchande en conclut que
            l'application est cassée et ferme autrement. */}
        {fermetureInterdite && (
          <div role="alert" className="mx-6 mb-4 p-4 rounded-2xl border bg-amber-50" style={{ borderColor: '#FCD34D' }}>
            <p className="text-sm font-semibold text-gray-900">
              Je n’ai pas pu lire les chiffres de ta journée.
            </p>
            <p className="text-sm text-gray-700 mt-1">
              Ce n’est pas zéro. Fermer maintenant écrirait un écart faux, pour toujours.
              Réessaie quand le réseau revient.
            </p>
          </div>
        )}
        {chiffresIncomplets && (
          <div role="status" className="mx-6 mb-4 p-4 rounded-2xl border bg-amber-50" style={{ borderColor: '#FCD34D' }}>
            <p className="text-sm text-gray-800">
              Ces chiffres sont <strong>incomplets</strong> : des ventes sont encore gardées sur ce
              téléphone. Tu peux fermer, mais l’écart sera approximatif.
            </p>
          </div>
        )}

        <div className="px-6 pb-6 space-y-3">
          <div className="p-4 rounded-2xl border bg-green-50" style={{ borderColor: 'var(--color-green-300)' }}>
            <p className="text-xs font-semibold text-gray-600 mb-1">Ventes du jour</p>
            <MontantCard accentColor="var(--herite-vert-menthe)" className="rounded-xl">
              <Montant value={stats.ventes} size="xl" color="var(--color-green-700)" masque={montantsMasques} />
            </MontantCard>
            <p className="text-xs text-gray-500 mt-1">{stats.nombreVentes} vente{stats.nombreVentes > 1 ? 's' : ''}</p>
          </div>

          <div className="p-4 rounded-2xl border bg-red-50" style={{ borderColor: 'var(--color-red-300)' }}>
            <p className="text-xs font-semibold text-gray-600 mb-1">Cahier du jour</p>
            <MontantCard accentColor="var(--color-red-500)" className="rounded-xl">
              <Montant value={stats.cahier} size="xl" color="var(--color-red-700)" masque={montantsMasques} />
            </MontantCard>
          </div>

          <div className={`p-4 rounded-2xl border ${marge >= 0 ? 'bg-green-50' : 'bg-red-50'}`} style={{ borderColor: marge >= 0 ? 'var(--color-green-300)' : 'var(--color-red-300)' }}>
            <p className="text-xs font-semibold text-gray-600 mb-1">Marge</p>
            <MontantCard accentColor={marge >= 0 ? 'var(--herite-vert-menthe)' : 'var(--color-red-500)'} className="rounded-xl">
              <Montant value={marge} size="xl" color={marge >= 0 ? 'var(--color-green-700)' : 'var(--color-red-700)'} showPlus masque={montantsMasques} />
            </MontantCard>
          </div>

          <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--color-orange-50)', borderColor: 'var(--color-orange-200)' }}>
            <p className="text-xs font-semibold text-gray-600 mb-1">Caisse théorique</p>
            <MontantCard accentColor="var(--commerce-action)" className="rounded-xl">
              <Montant value={stats.caisse} size="xl" color="var(--commerce-action)" masque={montantsMasques} />
            </MontantCard>
          </div>

          <div className="p-4 rounded-2xl bg-gray-50 border border-gray-300">
            <p className="text-xs font-semibold text-gray-700 mb-2">Comptage réel</p>
            <MontantFCFAInput
              placeholder="Montant en FCFA"
              value={comptageReel}
              onChange={(rawValue) => setComptageReel(rawValue)}
              autoFocus
              disabled={isClosing}
            />
            {ecart !== null && ecart !== 0 && (
              <p className={`text-xs font-medium mt-2 ${ecart > 0 ? 'text-green-600' : 'text-red-600'}`}>
                Écart: <Montant value={ecart} size="sm" color={ecart > 0 ? 'var(--color-green-600)' : 'var(--destructive)'} showPlus masque={montantsMasques} />
              </p>
            )}
          </div>

          {/* Analyse détaillée */}
          {topProducts.length > 0 && (
            <motion.div
              className="p-4 rounded-2xl bg-white border border-gray-200"
              whileHover={{ scale: 1.01 }}
            >
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" style={{ color: 'var(--commerce-action)' }} />
                  <p className="text-xs font-bold text-gray-700">Analyse détaillée</p>
                </div>
                <motion.div
                  animate={{ rotate: showDetails ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-gray-400"
                >
                  ▼
                </motion.div>
              </button>
              
              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 space-y-2"
                  >
                    <p className="text-xs font-semibold text-gray-600 mb-2">Top 3 produits vendus:</p>
                    {topProducts.map((product, index) => (
                      <div key={product.name} className="flex items-center justify-between p-2 rounded-xl bg-gray-50">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                            style={{ backgroundColor: 'var(--commerce-action)' }}
                          >
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-800">{product.name}</p>
                            <p className="text-xs text-gray-500">{product.quantity} unité{product.quantity > 1 ? 's' : ''}</p>
                          </div>
                        </div>
                        <p className="text-xs font-bold" style={{ color: 'var(--commerce-action)' }}>
                          {montantsMasques ? '••••• FCFA' : `${formatMontantFR(product.total || 0)} FCFA`}
                        </p>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* UNE SEULE PORTE VERS LES CHIFFRES — 24/09/2026.
              Il y en avait deux ici, côte à côte, même taille et même icône
              orange : « Ventes » et « Résumé caisse ». Deux écrans de chiffres
              différents, indiscernables pour une marchande qui ne lit pas.
              Le résumé est la réponse à « combien j'ai fait » ; le détail
              vente par vente s'ouvre DEPUIS ce résumé. */}
          <div className="pt-2">
            <motion.button
              onClick={handleNavigateToCaisse}
              className="w-full flex items-center justify-center gap-2 px-2 py-2.5 rounded-xl bg-white border border-gray-300 hover:border-[var(--commerce-action)] transition-colors whitespace-nowrap"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isClosing}
            >
              <Wallet className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--commerce-action)' }} />
              <span className="text-xs font-semibold text-gray-700">Combien j'ai fait aujourd'hui</span>
            </motion.button>
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <StyledButton variant="outline" onClick={onClose} disabled={isClosing}>
            Annuler
          </StyledButton>
          <StyledButton
            variant="danger"
            onClick={handleClose}
            disabled={isClosing || fermetureInterdite}
            className="flex-1"
          >
            {isClosing ? 'Fermeture...' : 'Fermer la caisse'}
          </StyledButton>
        </div>
      </div>
    </BaseModal>
  );
}

interface StatsVentesModalProps {
  isOpen: boolean;
  onClose: () => void;
  montant: number;
}

export function StatsVentesModal({ isOpen, onClose, montant }: StatsVentesModalProps) {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-3xl border-4 shadow-2xl overflow-hidden border-green-500">
        <div className="p-6 pb-4">
          <div className="flex items-center gap-4 mb-3">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-7 h-7 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-green-700">
                Ventes du jour
              </h2>
            </div>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">
            Détails de tes ventes d'aujourd'hui.
          </p>
        </div>

        <div className="px-6 pb-6">
          <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 border" style={{ borderColor: 'var(--color-green-300)' }}>
            <p className="text-sm font-semibold text-gray-600 mb-2">Total des ventes</p>
            <MontantCard accentColor="var(--herite-vert-menthe)" className="rounded-xl">
              <motion.div
                className="flex justify-center"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <Montant value={montant} size="2xl" color="var(--color-green-700)" />
              </motion.div>
            </MontantCard>
          </div>
        </div>

        <div className="px-6 pb-6">
          <StyledButton variant="success" onClick={onClose} fullWidth>
            OK
          </StyledButton>
        </div>
      </div>
    </BaseModal>
  );
}

interface StatsMargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  marge: number;
}

export function StatsMargeModal({ isOpen, onClose, marge }: StatsMargeModalProps) {
  const isPositive = marge >= 0;
  
  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className={`bg-white rounded-3xl border-4 shadow-2xl overflow-hidden ${isPositive ? 'border-green-500' : 'border-red-500'}`}>
        <div className="p-6 pb-4">
          <div className="flex items-center gap-4 mb-3">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center ${isPositive ? 'bg-green-100' : 'bg-red-100'}`}>
              <TrendingUp className={`w-7 h-7 ${isPositive ? 'text-green-600' : 'text-red-600 rotate-180'}`} />
            </div>
            <div>
              <h2 className={`text-2xl font-bold ${isPositive ? 'text-green-700' : 'text-red-700'}`}>
                Marge du jour
              </h2>
            </div>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">
            {isPositive
              ? 'Bravo ! Ta marge est positive.'
              : 'Attention, tes cahiers dépassent tes ventes.'}
          </p>
        </div>

        <div className="px-6 pb-6">
          <div className={`text-center p-8 rounded-2xl bg-gradient-to-br border ${isPositive ? 'from-green-50 to-green-100' : 'from-red-50 to-red-100'}`} style={{ borderColor: isPositive ? 'var(--color-green-300)' : 'var(--color-red-300)' }}>
            <p className="text-sm font-semibold text-gray-600 mb-2">Marge</p>
            <MontantCard accentColor={isPositive ? 'var(--herite-vert-menthe)' : 'var(--color-red-500)'} className="rounded-xl">
              <div className="flex justify-center">
                <Montant value={marge} size="2xl" color={isPositive ? 'var(--color-green-700)' : 'var(--color-red-700)'} showPlus />
              </div>
            </MontantCard>
          </div>
        </div>

        <div className="px-6 pb-6">
          <StyledButton
            variant={isPositive ? 'success' : 'danger'}
            onClick={onClose}
            fullWidth
          >
            OK
          </StyledButton>
        </div>
      </div>
    </BaseModal>
  );
}

interface ScoreModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ScoreModal({ isOpen, onClose }: ScoreModalProps) {
  const { user } = useApp();
  const [score, setScore] = React.useState<number>(0);
  React.useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      try {
        const { fetchScore } = await import('../../services/api/scores-api');
        const { score } = await fetchScore(user.id);
        if (!cancelled) setScore(score.score_total || 0);
      } catch (e: any) {
        console.warn('[ScoreModal] fetchScore failed:', e?.message);
        toast.error('Impossible de charger le score');
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-3xl border-4 shadow-2xl overflow-hidden" style={{ borderColor: 'var(--commerce-action)' }}>
        <div className="p-6 pb-4">
          <div className="flex items-center gap-4 mb-3">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(196, 98, 16, 0.15)' }}
            >
              <Award className="w-7 h-7" style={{ color: 'var(--commerce-action)' }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--commerce-action)' }}>
                Mes Points JULABA
              </h2>
            </div>
          </div>
          <p className="text-gray-600 text-sm leading-relaxed">
            Détails de ton score de crédit.
          </p>
        </div>

        <div className="px-6 pb-6">
          <div className="text-center p-8 rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100 border mb-6" style={{ borderColor: 'var(--color-orange-200)' }}>
            <motion.p
              className="text-6xl font-bold"
              style={{ color: 'var(--commerce-action)' }}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              {score}
            </motion.p>
            <p className="text-2xl font-bold text-gray-600 mt-2">/100</p>
          </div>

          <div className="space-y-2.5 mb-6">
            <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 border border-green-200">
              <p className="text-sm font-semibold text-gray-700">Régularité des ventes</p>
              <p className="text-sm font-bold text-green-700">Excellent</p>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-green-50 border border-green-200">
              <p className="text-sm font-semibold text-gray-700">Gestion de caisse</p>
              <p className="text-sm font-bold text-green-700">Très bien</p>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-yellow-50 border border-yellow-200">
              <p className="text-sm font-semibold text-gray-700">Épargne</p>
              <p className="text-sm font-bold text-yellow-700">Bien</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--color-orange-50)', borderColor: 'var(--color-orange-200)' }}>
            <p className="text-sm font-bold mb-2" style={{ color: 'var(--commerce-action)' }}>
              C'est déjà !
            </p>
            <p className="text-sm text-gray-600 leading-relaxed">
              Continue à enregistrer tes ventes pour améliorer ton score et débloquer des crédits.
            </p>
          </div>
        </div>

        <div className="px-6 pb-6">
          <StyledButton onClick={onClose} fullWidth>
            OK
          </StyledButton>
        </div>
      </div>
    </BaseModal>
  );
}

interface ResumeModalProps {
  /** ACC-02 — même règle que la clôture : ces chiffres viennent d'une lecture
   *  qui a pu échouer. On ne les présente pas comme des faits acquis. */
  etatCaisse?: EtatCaisseAccueil;
  isOpen: boolean;
  onClose: () => void;
  stats: {
    ventes: number;
    cahier: number;
    caisse: number;
    nombreVentes: number;
  };
  /** Ouvre la clôture de journée (relogée dans le Résumé — Phase 2, Q-C). */
  onFermerJournee?: () => void;
  /** Ouvre l'ajustement du fond de caisse. */
  onModifierFond?: () => void;
}

export function ResumeModal({ isOpen, onClose, stats, onFermerJournee, onModifierFond, etatCaisse }: ResumeModalProps) {
  // Les chiffres sont-ils lus ? Sans état fourni, on ne change rien.
  const chiffresLus = etatCaisse ? droitDeFermerLaJournee(etatCaisse).permis : true;
  const marge = stats.ventes - stats.cahier;
  const { montantsMasques } = useMontantsPrives();

  return (
    <BaseModal isOpen={isOpen} onClose={onClose}>
      <div className="bg-white rounded-3xl border-4 shadow-2xl overflow-hidden" style={{ borderColor: 'var(--commerce-action)' }}>
        <div className="p-6 pb-4">
          <div className="flex items-center gap-4 mb-3">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ backgroundColor: 'rgba(196, 98, 16, 0.15)' }}
            >
              <FileText className="w-7 h-7" style={{ color: 'var(--commerce-action)' }} />
            </div>
            <div>
              <h2 className="text-2xl font-bold" style={{ color: 'var(--commerce-action)' }}>
                Résumé du jour
              </h2>
            </div>
          </div>
          {!chiffresLus && (
            <div role="alert" className="mb-3 p-3 rounded-2xl border bg-amber-50" style={{ borderColor: '#FCD34D' }}>
              <p className="text-sm font-semibold text-gray-900">Je n’ai pas pu lire tes chiffres.</p>
              <p className="text-sm text-gray-700 mt-1">
                Ce n’est pas zéro — ton argent est là. Réessaie quand le réseau revient.
              </p>
            </div>
          )}
          <p className="text-gray-600 text-sm leading-relaxed">
            Voici un aperçu complet de ta journée.
          </p>
        </div>

        <div className="px-6 pb-6 space-y-3">
          <div className="p-4 rounded-2xl border bg-green-50" style={{ borderColor: 'var(--color-green-300)' }}>
            <p className="text-xs font-semibold text-gray-600 mb-1">Ventes du jour</p>
            <MontantCard accentColor="var(--herite-vert-menthe)" className="rounded-xl">
              <Montant value={stats.ventes} size="xl" color="var(--color-green-700)" masque={montantsMasques} />
            </MontantCard>
            <p className="text-xs text-gray-500 mt-1">{stats.nombreVentes} vente{stats.nombreVentes > 1 ? 's' : ''}</p>
          </div>

          <div className="p-4 rounded-2xl border bg-red-50" style={{ borderColor: 'var(--color-red-300)' }}>
            <p className="text-xs font-semibold text-gray-600 mb-1">Cahier du jour</p>
            <MontantCard accentColor="var(--color-red-500)" className="rounded-xl">
              <Montant value={stats.cahier} size="xl" color="var(--color-red-700)" masque={montantsMasques} />
            </MontantCard>
          </div>

          <div className={`p-4 rounded-2xl border ${marge >= 0 ? 'bg-green-50' : 'bg-red-50'}`} style={{ borderColor: marge >= 0 ? 'var(--color-green-300)' : 'var(--color-red-300)' }}>
            <p className="text-xs font-semibold text-gray-600 mb-1">Marge</p>
            <MontantCard accentColor={marge >= 0 ? 'var(--herite-vert-menthe)' : 'var(--color-red-500)'} className="rounded-xl">
              <Montant value={marge} size="xl" color={marge >= 0 ? 'var(--color-green-700)' : 'var(--color-red-700)'} showPlus masque={montantsMasques} />
            </MontantCard>
          </div>

          <div className="p-4 rounded-2xl border" style={{ backgroundColor: 'var(--color-orange-50)', borderColor: 'var(--color-orange-200)' }}>
            <p className="text-xs font-semibold text-gray-600 mb-1">Caisse théorique</p>
            <MontantCard accentColor="var(--commerce-action)" className="rounded-xl">
              <Montant value={stats.caisse} size="xl" color="var(--commerce-action)" masque={montantsMasques} />
            </MontantCard>
          </div>

        </div>

        <div className="px-6 pb-6 space-y-2">
          {onFermerJournee && (
            <button
              type="button"
              onClick={onFermerJournee}
              className="w-full py-4 rounded-2xl border-2 border-red-200 bg-red-50 text-red-600 font-bold"
            >
              Compter et fermer ma journée
            </button>
          )}
          {onModifierFond && (
            <button
              type="button"
              onClick={onModifierFond}
              className="w-full py-2 text-sm font-semibold text-gray-500"
            >
              Modifier le fond de caisse
            </button>
          )}
          <StyledButton onClick={onClose} fullWidth>
            OK
          </StyledButton>
        </div>
      </div>
    </BaseModal>
  );
}
