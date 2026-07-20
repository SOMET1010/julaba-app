import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useLangPref } from '../../hooks/useLangPref';
import { useVoiceCore } from '../../hooks/useVoiceCore';
import { useLocation } from 'react-router';
import { ImagePickerField } from '../shared/ImagePickerField';
import { SelectWithAutre } from '../shared/SelectWithAutre';
import { Montant, MontantCard } from '../shared/Montant';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, Mic, MicOff, X, Plus, ChevronRight, ArrowLeft,
  Package, ShoppingCart, Store, Banknote, Wallet,
  MapPin, Calendar, Send,
  CheckCircle, CheckCircle2, Clock, Truck,
  XCircle, Info, Volume2, Filter,
  RefreshCw, History,
  ArrowDownLeft,
  ChevronDown,
  LayoutGrid,
} from 'lucide-react';
import { SubPageLayout } from '../layout/SubPageLayout';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { useApp } from '../../contexts/AppContext';
import { useUser } from '../../contexts/UserContext';
import { useModalRegister } from '../../contexts/ModalContext';
import { NotificationButton } from '../marchand/NotificationButton';
import { API_URL } from '../../utils/api';
import { apiRequest } from '../../../imports/api-client';
import { toast } from 'sonner';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import {
  PRODUITS_PRODUCTEURS,
  ProduitMarche, CommandeMarche as CmdMarche, StatutCommande,
  Q_LABELS, STATUT_CMD_LABELS,
} from '../marche/marketplace-data';
import {
  IMG_PRODUIT_TOMATE,
  IMG_PRODUIT_AUBERGINE,
  IMG_PRODUIT_PIMENT,
  IMG_PRODUIT_GOMBO,
  IMG_PRODUIT_MANIOC,
  IMG_PRODUIT_IGNAME,
  IMG_PRODUIT_MAIS,
  IMG_PRODUIT_RIZ,
  IMG_PRODUIT_BANANE,
  IMG_PRODUIT_OIGNON,
  IMG_PRODUIT_AVOCAT,
  IMG_PRODUIT_AUTRE,
  IMG_PRODUIT_MANGUE,
  IMG_PRODUIT_ANANAS,
} from '../../assets/images';

// ─── Couleurs ─────────────────────────────────────────────────────────────────
const C       = '#2072AF';
const C_LIGHT = '#EBF4FB';
const C_DARK  = '#1E5A8E';

/** Aligné sur CommandesProducteurPage — pas de module partagé pour l’instant */
const PRODUITS_ICONS: { id: string; img: string }[] = [
  { id: 'Tomate', img: IMG_PRODUIT_TOMATE },
  { id: 'Aubergine', img: IMG_PRODUIT_AUBERGINE },
  { id: 'Piment', img: IMG_PRODUIT_PIMENT },
  { id: 'Gombo', img: IMG_PRODUIT_GOMBO },
  { id: 'Oignon', img: IMG_PRODUIT_OIGNON },
  { id: 'Manioc', img: IMG_PRODUIT_MANIOC },
  { id: 'Igname', img: IMG_PRODUIT_IGNAME },
  { id: 'Maïs', img: IMG_PRODUIT_MAIS },
  { id: 'Riz', img: IMG_PRODUIT_RIZ },
  { id: 'Banane plantain', img: IMG_PRODUIT_BANANE },
  { id: 'Avocat', img: IMG_PRODUIT_AVOCAT },
  { id: 'Mangue', img: IMG_PRODUIT_MANGUE },
  { id: 'Ananas', img: IMG_PRODUIT_ANANAS },
  { id: 'Autre', img: IMG_PRODUIT_AUTRE },
];

function findProduitIconImg(produit: string | undefined): string | undefined {
  const n = (produit || '').toLowerCase().trim();
  return PRODUITS_ICONS.find((p) => p.id.toLowerCase().trim() === n)?.img;
}

const STATUTS_CMD_VALID: StatutCommande[] = [
  'en_attente', 'acceptee', 'en_negociation', 'refusee', 'livree', 'annulee',
];

function parseStatutCommandeApi(v: unknown): StatutCommande {
  const s = String(v ?? 'en_attente').toLowerCase().replace(/\s+/g, '_');
  return STATUTS_CMD_VALID.includes(s as StatutCommande) ? (s as StatutCommande) : 'en_attente';
}

/** Normalise une ligne API vers `CommandeMarche` (snake_case / camelCase). */
function mapApiCommandeToCmdMarche(row: unknown, mode: 'acheteur' | 'vendeur'): CmdMarche & { statutPaiement?: string } {
  const r = row as Record<string, unknown>;
  const quantite = Number(r.quantite ?? r.quantite_demandee ?? 0) || 0;
  const prixUnitaire = Number(r.prix_unitaire ?? r.prixUnitaire ?? 0) || 0;
  const montantTotal =
    Number(r.montant_total ?? r.montantTotal ?? r.total ?? quantite * prixUnitaire) || 0;
  const acheteurNom = String(r.acheteur_nom ?? r.acheteurNom ?? r.client_nom ?? r.acheteur ?? '—');
  const vendeurNom = String(r.vendeur_nom ?? r.vendeurNom ?? r.producteur_nom ?? r.vendeur ?? '—');
  const vendeurId = String(r.vendeur_id ?? r.vendeurId ?? r.user_id ?? '');
  const produit = String(r.produit ?? r.culture ?? r.produit_nom ?? 'Autre');
  const unite = String(r.unite ?? r.unit ?? 'kg');
  const dc = r.date_creation ?? r.dateCreation ?? r.created_at;
  const dateCreation =
    typeof dc === 'string'
      ? dc.slice(0, 10)
      : (dc instanceof Date ? dc.toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
  const dl = r.date_livraison ?? r.dateLivraison ?? r.date_livraison_prevue;
  const dateLivraison =
    typeof dl === 'string' ? dl.slice(0, 10) : (dl ? String(dl) : '');

  const acheteurType: CmdMarche['acheteurType'] =
    mode === 'acheteur'
      ? 'cooperative'
      : (String(r.acheteur_type ?? r.acheteurType ?? '') === 'cooperative' ? 'cooperative' : 'marchand');
  const vendeurType: CmdMarche['vendeurType'] =
    mode === 'acheteur'
      ? (String(r.vendeur_type ?? r.vendeurType ?? '') === 'cooperative' ? 'cooperative' : 'producteur')
      : 'cooperative';

  return {
    id: String(r.id ?? ''),
    acheteurType,
    acheteurNom,
    vendeurType,
    vendeurId,
    vendeurNom,
    produit,
    quantite,
    unite,
    prixUnitaire,
    montantTotal,
    statut: parseStatutCommandeApi(r.statut ?? r.status),
    statutPaiement: String(r.statut_paiement ?? r.statutPaiement ?? 'non_paye'),
    dateCreation,
    dateLivraison: dateLivraison || '—',
  };
}

function getProduitFallbackImage(produit: string): string {
  const n = (produit || '').toLowerCase();
  if (n.includes('tomate')) return IMG_PRODUIT_TOMATE;
  if (n.includes('aubergine')) return IMG_PRODUIT_AUBERGINE;
  if (n.includes('piment')) return IMG_PRODUIT_PIMENT;
  if (n.includes('gombo')) return IMG_PRODUIT_GOMBO;
  if (n.includes('manioc')) return IMG_PRODUIT_MANIOC;
  if (n.includes('igname')) return IMG_PRODUIT_IGNAME;
  if (n.includes('maïs') || n.includes('mais')) return IMG_PRODUIT_MAIS;
  if (n.includes('riz')) return IMG_PRODUIT_RIZ;
  if (n.includes('banane') || n.includes('plantain')) return IMG_PRODUIT_BANANE;
  if (n.includes('oignon')) return IMG_PRODUIT_OIGNON;
  if (n.includes('avocat')) return IMG_PRODUIT_AVOCAT;
  if (n.includes('mangue')) return IMG_PRODUIT_MANGUE;
  if (n.includes('ananas')) return IMG_PRODUIT_ANANAS;
  return IMG_PRODUIT_AUTRE;
}

// ─── Types ────────────────────────────────────────────────────────────────────
type TabVue        = 'achats' | 'ventes' | 'historique';
type TabAchat      = 'marketplace' | 'mes_achats' | 'groupe';
type TabVente      = 'ma_marketplace' | 'commandes_recues';
type TabHistorique = 'h_achats' | 'h_ventes';

// ─── Score Ring ────────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;
  const color = score >= 71 ? '#16A34A' : score >= 41 ? '#EA580C' : '#DC2626';
  return (
    <div className="relative flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#E5E7EB" strokeWidth={6} />
        <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeLinecap="round" strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - filled }}
          transition={{ duration: 1.2, ease: 'easeOut' }} />
      </svg>
      <span className="absolute text-[10px] font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

// ─── Chip de comptage (lecture seule) ─────────────────────────────────────────
function CountChip({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border" style={{ backgroundColor: bg, borderColor: `${color}30` }}>
      <span className="text-xs font-bold" style={{ color }}>{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

// ─── Onglet principal ─────────────────────────────────────────────────────────
function OngletBtn({ label, Icon, active, onClick }: {
  label: string; Icon: React.ElementType; active: boolean; onClick: () => void;
}) {
  return (
    <motion.button onClick={onClick}
      className="relative flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl transition-all"
      style={active ? { background: `linear-gradient(135deg, ${C}, ${C_DARK})` } : { backgroundColor: 'white' }}
      whileTap={{ scale: 0.97 }}>
      <Icon className="w-5 h-5" style={{ color: active ? 'white' : '#9CA3AF' }} />
      <span className="text-[11px] font-bold" style={{ color: active ? 'white' : '#6B7280' }}>{label}</span>
    </motion.button>
  );
}

// ─── Sous-onglet ──────────────────────────────────────────────────────────────
function SousOnglet({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <motion.button onClick={onClick} whileTap={{ scale: 0.97 }}
      className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all text-center"
      style={active ? { background: `linear-gradient(135deg, ${C}, ${C_DARK})`, color: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' } : { color: '#6B7280', background: 'transparent' }}>
      {label}
    </motion.button>
  );
}

// ─── Accordéon commande marché (style VenteAccordeonCard, local à MarcheHub) ─
function MarcheCommandeAccordeonCard({
  commande: c,
  index,
  actions,
  onDetails,
}: {
  commande: CmdMarche;
  index: number;
  actions?: { onAccepter?: () => void; onRefuser?: () => void };
  onDetails?: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const sl = STATUT_CMD_LABELS[c.statut] ?? STATUT_CMD_LABELS.en_attente;
  const resume = `${c.quantite} ${c.unite} · ${Math.round(c.montantTotal).toLocaleString('fr-FR')} FCFA`;
  const produitImg = findProduitIconImg(c.produit);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, type: 'spring', stiffness: 280, damping: 26 }}
      className="rounded-2xl overflow-hidden bg-white"
      style={{ border: `1.5px solid ${sl.border}` }}
    >
      <motion.button
        type="button"
        className="w-full flex items-center gap-3 p-3 text-left"
        onClick={() => setIsOpen((o) => !o)}
        whileTap={{ scale: 0.99 }}
      >
        <div
          className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
          style={{ background: `${C_LIGHT}` }}
        >
          {produitImg ? (
            <img src={produitImg} alt={c.produit} className="w-full h-full object-cover" />
          ) : (
            <Package className="w-6 h-6" style={{ color: C }} strokeWidth={2} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm truncate">{c.produit}</p>
          <p className="text-xs text-gray-500 truncate">{resume}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className="text-[11px] font-bold px-2 py-1 rounded-full"
            style={{ background: sl.bg, color: sl.color, border: `1px solid ${sl.border}` }}
          >
            {sl.label}
          </span>
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <ChevronDown className="w-4 h-4" style={{ color: sl.color }} />
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
            <div
              className="px-3 pb-3 pt-1"
              style={{
                background: 'rgba(255,255,255,0.92)',
                borderTop: `1px solid ${sl.border}66`,
              }}
            >
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Montant', value: `${Math.round(c.montantTotal).toLocaleString('fr-FR')} FCFA` },
                  { label: 'Quantité', value: `${c.quantite} ${c.unite}` },
                  { label: 'Prix unitaire', value: `${Math.round(c.prixUnitaire).toLocaleString('fr-FR')} FCFA/${c.unite}` },
                  { label: 'Acheteur', value: c.acheteurNom || '—' },
                ].map((cell) => (
                  <div
                    key={cell.label}
                    className="rounded-xl p-2.5 border border-gray-100 bg-white/90"
                  >
                    <p className="text-[11px] font-semibold text-gray-500 mb-0.5">{cell.label}</p>
                    <p className="text-sm font-bold text-gray-900 break-words">{cell.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex flex-col gap-2">
                {actions?.onAccepter && actions?.onRefuser && (
                  <div className="grid grid-cols-2 gap-2">
                    <motion.button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        actions.onAccepter?.();
                      }}
                      className="py-2.5 rounded-xl text-white text-xs font-bold"
                      style={{ backgroundColor: '#16a34a' }}
                      whileTap={{ scale: 0.97 }}
                    >
                      Accepter
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        actions.onRefuser?.();
                      }}
                      className="py-2.5 rounded-xl bg-red-500 text-white text-xs font-bold"
                      whileTap={{ scale: 0.97 }}
                    >
                      Refuser
                    </motion.button>
                  </div>
                )}
                {onDetails && (
                  <motion.button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDetails();
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-bold border-2"
                    style={{ borderColor: C, color: C }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Voir le détail
                  </motion.button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Carte Produit style Marchand (grille 2 colonnes avec image) ──────────────
function ProduitCardGrid({ produit, index, onAction, actionLabel, onSecondary, secondaryLabel }: {
  produit: ProduitMarche;
  index: number;
  onAction: (p: ProduitMarche) => void;
  actionLabel: string;
  onSecondary?: (p: ProduitMarche) => void;
  secondaryLabel?: string;
}) {
  const ql = Q_LABELS[produit.qualite as 'A'|'B'|'C'] || Q_LABELS['B'];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="relative bg-gradient-to-br from-blue-50 via-white to-blue-50 rounded-3xl overflow-hidden shadow-md border-2 border-gray-200 flex flex-col"
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.02, y: -4, boxShadow: '0 10px 30px rgba(32,114,175,0.15)' }}
    >
      {/* Image */}
      <div className="relative w-full h-36 bg-gray-100 flex-shrink-0">
        {produit.image ? (
          <ImageWithFallback
            src={produit.image}
            alt={produit.produit}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${C}, ${C_DARK})` }}>
            <span className="text-4xl font-black text-white/40">
              {produit.produit.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
        {/* Badge qualité */}
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold"
          style={{ backgroundColor: ql.bg, color: ql.color }}>
          {ql.label}
        </div>
        {/* Badge vendeur type */}
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
          produit.vendeurType === 'producteur' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
        }`}>
          {produit.vendeurType === 'producteur' ? 'Producteur' : 'Coop'}
        </div>
      </div>

      {/* Infos */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-bold text-sm text-gray-900 leading-tight mb-0.5 truncate">
          {produit.produit}
        </h3>
        <p className="text-[10px] text-gray-500 mb-1 truncate">{produit.vendeurNom}</p>
        <div className="flex items-center gap-1 text-[10px] text-gray-400 mb-2">
          <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
          <span className="truncate">{produit.village}</span>
        </div>
        <p className="text-xl font-bold mb-1" style={{ color: C }}>
          <Montant value={produit.prixUnitaire} unit={produit.unite} size="lg" color={C} />
        </p>
        <p className="text-[10px] text-gray-400 mb-3">
          {(produit.quantite || 0).toLocaleString()} {produit.unite} dispo.
        </p>
        <motion.button
          onClick={(e) => { e.stopPropagation(); onAction(produit); }}
          className="w-full py-2.5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm"
          style={{ background: `linear-gradient(135deg, ${C}, ${C_DARK})` }}
          whileTap={{ scale: 0.95 }}>
          <Plus className="w-3.5 h-3.5" strokeWidth={3} />
          {actionLabel}
        </motion.button>
        {onSecondary && secondaryLabel && (
          <motion.button
            onClick={(e) => { e.stopPropagation(); onSecondary(produit); }}
            className="w-full mt-1.5 py-2 rounded-xl border-2 text-xs font-bold flex items-center justify-center gap-1.5"
            style={{ borderColor: C, color: C, backgroundColor: C_LIGHT }}
            whileTap={{ scale: 0.95 }}>
            <Store className="w-3 h-3" />
            {secondaryLabel}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Carte produit coop "Ma Marketplace" (grille 2 colonnes avec image) ───────
function ProduitCoopCardGrid({ produit, index, onRetirer }: {
  produit: ProduitMarche; index: number; onRetirer: (id: string) => void;
}) {
  const marge = produit.prixOrigine ? produit.prixUnitaire - produit.prixOrigine : null;
  const margePct = (marge && produit.prixOrigine) ? Math.round((marge / produit.prixOrigine) * 100) : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05 }}
      className="relative bg-gradient-to-br from-blue-50 via-white to-blue-50 rounded-3xl overflow-hidden shadow-md border-2 border-blue-100 flex flex-col"
      whileHover={{ scale: 1.02, y: -4 }}
    >
      {/* Image */}
      <div className="relative w-full h-36 bg-gray-100 flex-shrink-0">
        {produit.image ? (
          <ImageWithFallback
            src={produit.image}
            alt={produit.produit}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${C}, ${C_DARK})` }}>
            <span className="text-4xl font-black text-white/40">
              {produit.produit.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
        {margePct !== null && (
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
            +{margePct}%
          </div>
        )}
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
          Publié
        </div>
      </div>

      {/* Infos */}
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-bold text-sm text-gray-900 leading-tight mb-0.5 truncate">
          {produit.produit}
        </h3>
        {produit.vendeurOrigineNom && (
          <p className="text-[10px] text-gray-400 mb-1 truncate">
            Source : {produit.vendeurOrigineNom}
          </p>
        )}
        <p className="text-xl font-bold mb-0.5" style={{ color: C }}>
          <Montant value={produit.prixUnitaire} unit={produit.unite} size="lg" color={C} />
        </p>
        {produit.prixOrigine && (
          <p className="text-[10px] text-gray-400 mb-2">
            Achat : {(produit.prixOrigine || 0).toLocaleString()} FCFA/{produit.unite}
          </p>
        )}
        <p className="text-[10px] text-gray-400 mb-3">
          {(produit.quantite || 0).toLocaleString()} {produit.unite} en stock
        </p>
        <motion.button
          onClick={(e) => { e.stopPropagation(); onRetirer(produit.id); }}
          className="w-full py-2 rounded-xl border-2 border-red-200 text-red-500 text-xs font-bold flex items-center justify-center gap-1.5"
          whileTap={{ scale: 0.95 }}>
          <X className="w-3 h-3" />
          Retirer
        </motion.button>
      </div>
    </motion.div>
  );
}

// ─── Carte commande reçue d'un marchand ───────────────────────────────────────
function CommandeRecueCard({ commande, index, onAccepter, onRefuser, onDetails }: {
  commande: CmdMarche; index: number;
  onAccepter: () => void; onRefuser: () => void; onDetails: () => void;
}) {
  const sc = STATUT_CMD_LABELS[commande.statut] || STATUT_CMD_LABELS['en_attente'];
  const isPending = commande.statut === 'en_attente';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white rounded-3xl overflow-hidden shadow-sm"
      style={{ border: `2px solid ${sc.border}` }}
    >
      {/* Bandeau statut */}
      <div className="flex items-center gap-2 px-4 py-2" style={{ backgroundColor: sc.bg }}>
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: sc.color }} />
        <span className="text-xs font-bold" style={{ color: sc.color }}>{sc.label}</span>
        {isPending && (
          <motion.span
            animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
            className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
            Action requise
          </motion.span>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-gray-100">
            <ShoppingCart className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-base truncate">{commande.produit}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {commande.acheteurNom}
            </p>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm font-bold text-gray-900">
                {(commande.quantite || 0).toLocaleString()} {commande.unite}
              </span>
              <span className="text-gray-300">·</span>
              <span className="text-sm font-bold" style={{ color: C }}>
                {((commande as CmdMarche & { total?: number }).total || commande.montantTotal || 0).toLocaleString()} FCFA
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-gray-400">
              <Calendar className="w-3 h-3" />
              <span>Livraison : {new Date(commande.dateLivraison).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-3">
          <motion.button onClick={onDetails}
            className="flex-1 py-2.5 rounded-2xl border-2 border-gray-200 text-xs font-bold text-gray-600 flex items-center justify-center gap-1"
            whileTap={{ scale: 0.97 }}>
            <Info className="w-3.5 h-3.5" />
            Détails
          </motion.button>
          {isPending ? (
            <>
              <motion.button onClick={onRefuser}
                className="flex-1 py-2.5 rounded-2xl border-2 border-red-200 text-red-600 text-xs font-bold flex items-center justify-center gap-1"
                whileTap={{ scale: 0.97 }}>
                <XCircle className="w-3.5 h-3.5" />
                Refuser
              </motion.button>
              <motion.button onClick={onAccepter}
                className="flex-[1.5] py-2.5 rounded-2xl text-white text-xs font-bold flex items-center justify-center gap-1"
                style={{ background: 'linear-gradient(135deg, #16A34A, #15803d)' }}
                whileTap={{ scale: 0.97 }}>
                <CheckCircle className="w-3.5 h-3.5" />
                Accepter
              </motion.button>
            </>
          ) : (
            <div className="flex-[2] py-2.5 rounded-2xl text-center text-xs font-bold"
              style={{ backgroundColor: sc.bg, color: sc.color }}>
              {sc.label}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export function MarcheHub() {
  const { speak, user: appUser } = useApp();
  const { user } = useUser();
  const location = useLocation();

  // ── Vue principale - Initialisée depuis location.state si présent
  const initialVue = (location.state as any)?.vue === 'ventes' ? 'ventes' : 'achats';
  const [vue, setVue] = useState<TabVue>(initialVue);

  // ── Sous-tabs
  const [tabAchat,      setTabAchat]      = useState<TabAchat>('marketplace');
  const [tabVente,      setTabVente]      = useState<TabVente>('ma_marketplace');
  const [tabHistorique, setTabHistorique] = useState<TabHistorique>('h_achats');

  // ── Données partagées
  const [produitsMarche,    setProduitsMarche]    = useState<ProduitMarche[]>([]);

  useEffect(() => {
    let alive = true;
    const doFetch = async () => {
      try {
        const d = await apiRequest<{ publications?: any[] } | null>(API_URL, '/publications/marche', { method: 'GET' });
        if (!alive || !d) return;
        const pubs: any[] = d.publications || [];
        setProduitsMarche(pubs.map((p: any) => ({
            id: p.id,
            producteurId: p.user_id,
            vendeurId: p.user_id,
            vendeurNom: (`${p.producteur_prenom || ''} ${p.producteur_nom || ''}`).trim() || 'Producteur',
            vendeurType: 'producteur' as const,
            categorie: p.culture || p.produit || 'Autre',
            produit: p.produit || p.culture || '',
            culture: p.culture || p.produit || '',
            quantite: Number(p.quantite_disponible) || 0,
            quantiteDispo: Number(p.quantite_disponible) || 0,
            unite: p.unite || 'kg',
            prixUnitaire: Number(p.prix_unitaire) || 0,
            prixOrigine: Number(p.prix_unitaire) || 0,
            qualite: p.qualite || 'standard',
            localisation: p.localisation || '',
            village: p.localisation || '',
            statut: p.statut || 'disponible',
            dateRecolte: p.date_recolte || p.created_at,
            description: p.description || '',
            photoUrl: p.photo_url || null,
            image: p.photo_url || getProduitFallbackImage(p.produit || p.culture || ''),
          })));
      } catch {
        // silent
      }
    };
    doFetch();
    return () => { alive = false; };
  }, [appUser?.id]);

  const [produitsCoopLive,  setProduitsCoopLive]  = useState<ProduitMarche[]>([]);
  const [commandesMarche,   setCommandesMarche]   = useState<CmdMarche[]>([]);
  const [commandesRecues,   setCommandesRecues]   = useState<CmdMarche[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const d = await apiRequest<any>(API_URL, '/publications', { method: 'GET' });
        if (!d) return;
        const pubs: any[] = d.publications || d.data || d || [];
        setProduitsCoopLive(pubs.map((p: any) => ({
          id: p.id,
          produit: p.produit || p.culture || '',
          culture: p.culture || p.produit || '',
          categorie: p.culture || p.produit || 'Autre',
          quantite: Number(p.quantite_disponible) || 0,
          quantiteDispo: Number(p.quantite_disponible) || 0,
          unite: p.unite || 'kg',
          prixUnitaire: Number(p.prix_unitaire) || 0,
          prixOrigine: Number(p.prix_unitaire) || 0,
          qualite: p.qualite || 'standard',
          image: p.photo_url || getProduitFallbackImage(p.produit || p.culture || ''),
          village: p.localisation || '',
          localisation: p.localisation || '',
          vendeurType: 'cooperative' as const,
          vendeurNom: (`${p.user_prenom || p.prenoms || ''} ${p.user_nom || p.nom || ''}`).trim() || 'Coopérative',
          vendeurId: p.user_id || '',
          scoreVendeur: 0,
          datePublication: p.created_at || new Date().toISOString().split('T')[0],
        })));
      } catch {
        // silent
      }
    })();
  }, [appUser?.id]);

  useEffect(() => {
    (async () => {
      try {
        const d = await apiRequest<any>(API_URL, '/commandes?role=acheteur', { method: 'GET' });
        if (!d) return;
        const cmds = d.commandes || d.data || [];
        setCommandesMarche((Array.isArray(cmds) ? cmds : []).map((row: unknown) => mapApiCommandeToCmdMarche(row, 'acheteur')));
      } catch {
        // silent
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const d = await apiRequest<any>(API_URL, '/commandes?role=vendeur', { method: 'GET' });
        if (!d) return;
        const raw = d.commandes || d.data || [];
        setCommandesRecues((Array.isArray(raw) ? raw : []).map((row: unknown) => mapApiCommandeToCmdMarche(row, 'vendeur')));
      } catch {
        // silent
      }
    })();
  }, []);

  // ── Recherche / filtre
  const [searchQuery,     setSearchQuery]     = useState('');
  const [isListening,     setIsListening]     = useState(false);
  const [showFilters,     setShowFilters]     = useState(false);
  const [filterCategorie, setFilterCategorie] = useState<string>('');

  // ── Modals
  const [showPublierModal,  setShowPublierModal]  = useState(false);
  const [produitAPublier,   setProduitAPublier]   = useState<ProduitMarche | null>(null);
  const [selectedCmdMarche, setSelectedCmdMarche] = useState<CmdMarche | null>(null);
  const [cmdANegocier, setCmdANegocier] = useState<CmdMarche | null>(null);
  const [modalCommande, setModalCommande] = useState<ProduitMarche | null>(null);
  const [quantiteChoisie, setQuantiteChoisie] = useState<number>(1);
  const [livraisonNom, setLivraisonNom] = useState('');
  const [livraisonTelephone, setLivraisonTelephone] = useState('');
  const [livraisonLocalite, setLivraisonLocalite] = useState('');
  const [livraisonDate, setLivraisonDate] = useState('');
  const [livraisonNotes, setLivraisonNotes] = useState('');
  const [livraisonTierce, setLivraisonTierce] = useState(false);
  const [modeReception, setModeReception] = useState<'livraison' | 'enlevement'>('livraison');
  /** true = détail ouvert depuis « Mes commandes aux producteurs » (coop acheteur) → pas d’actions accepter/refuser */
  const [selectedCmdReadOnly, setSelectedCmdReadOnly] = useState(false);
  const [showNouvelleAnnonce, setShowNouvelleAnnonce] = useState(false);

  // ── Sync modal via ModalContext
  useModalRegister(showPublierModal || !!selectedCmdMarche || showNouvelleAnnonce);

  // ── KPIs
  const commandesVersProducteurs = useMemo(() =>
    commandesMarche, [commandesMarche]);

  const commandesEnAttente = useMemo(() =>
    commandesRecues.filter(c => c.statut === 'en_attente').length, [commandesRecues]);

  const commandesAchatsEnAttente = useMemo(
    () => commandesMarche.filter(c => c.statut === 'en_attente').length,
    [commandesMarche],
  );
  const commandesAchatsLivrees = useMemo(
    () => commandesMarche.filter(c => c.statut === 'livree').length,
    [commandesMarche],
  );
  const commandesRecuesTerminees = useMemo(
    () => commandesRecues.filter(c => ['livree', 'refusee', 'annulee'].includes(c.statut)).length,
    [commandesRecues],
  );
  const historiqueLivrees = useMemo(
    () =>
      commandesMarche.filter(c => c.statut === 'livree').length +
      commandesRecues.filter(c => c.statut === 'livree').length,
    [commandesMarche, commandesRecues],
  );
  const historiqueValeurTotaleAchats = useMemo(
    () => Math.round(commandesMarche.reduce((s, c) => s + (Number(c.montantTotal) || 0), 0)),
    [commandesMarche],
  );

  const produitsMarcheSansMoi = useMemo(() => {
    const uid = appUser?.id;
    if (!uid) return produitsMarche;
    return produitsMarche.filter(p => {
      const ext = p as ProduitMarche & { userId?: string };
      if (String(p.vendeurId || '') === String(uid)) return false;
      if (ext.userId && String(ext.userId) === String(uid)) return false;
      if (String(p.producteurId || '') === String(uid)) return false;
      return true;
    });
  }, [produitsMarche, appUser?.id]);

  const produitsFiltrés = useMemo(() => {
    let list = produitsMarcheSansMoi;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(p => p.produit.toLowerCase().includes(q) || p.vendeurNom.toLowerCase().includes(q) || p.categorie.toLowerCase().includes(q));
    }
    if (filterCategorie) list = list.filter(p => p.categorie === filterCategorie);
    return list;
  }, [produitsMarcheSansMoi, searchQuery, filterCategorie]);

  const commandesCoopFiltrées = useMemo(() => {
    let list = commandesVersProducteurs;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => c.produit.toLowerCase().includes(q) || c.vendeurNom.toLowerCase().includes(q));
    }
    return list;
  }, [commandesVersProducteurs, searchQuery]);

  /** Quantités et montants cumulés par produit (vue Groupé). */
  const achatsGroupesParProduit = useMemo(() => {
    const map = new Map<
      string,
      { produit: string; unite: string; quantite: number; montant: number; nbCommandes: number }
    >();
    for (const c of commandesCoopFiltrées) {
      const key = `${(c.produit || '').trim().toLowerCase()}|${(c.unite || '').trim()}`;
      const q = Number(c.quantite) || 0;
      const m = Number(c.montantTotal) || 0;
      const prev = map.get(key);
      if (!prev) {
        map.set(key, {
          produit: c.produit || '—',
          unite: c.unite || 'kg',
          quantite: q,
          montant: m,
          nbCommandes: 1,
        });
      } else {
        map.set(key, {
          ...prev,
          quantite: prev.quantite + q,
          montant: prev.montant + m,
          nbCommandes: prev.nbCommandes + 1,
        });
      }
    }
    return [...map.values()].sort((a, b) => b.quantite - a.quantite);
  }, [commandesCoopFiltrées]);

  const produitsCoopFiltrés = useMemo(() => {
    if (!searchQuery) return produitsCoopLive;
    const q = searchQuery.toLowerCase();
    return produitsCoopLive.filter(p => p.produit.toLowerCase().includes(q) || p.categorie.toLowerCase().includes(q));
  }, [produitsCoopLive, searchQuery]);

  const commandesMarchandsFiltrées = useMemo(() => {
    let list = commandesRecues;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(c => c.produit.toLowerCase().includes(q) || c.acheteurNom.toLowerCase().includes(q));
    }
    return list;
  }, [commandesRecues, searchQuery]);

  const categories = useMemo(() => [...new Set(produitsMarcheSansMoi.map(p => p.categorie))], [produitsMarcheSansMoi]);

  // ── Voix
  // STT via Groq Whisper
  const { lang: voiceLang } = useLangPref();
  const { startRecording: _groqStart_startVoiceSearch, stopRecording: _groqStop_startVoiceSearch } = useVoiceCore({
    onTranscript: (text) => { setSearchQuery(text); setIsListening(false); },
    context: { module: 'marche', lang: voiceLang },
    onError: () => setIsListening(false),
  });

  const startVoiceSearch = () => {
    if (isListening) { _groqStop_startVoiceSearch(); setIsListening(false); }
    else { setIsListening(true); _groqStart_startVoiceSearch(); }
  };

  const voiceLecture = () => {
    const msg = `Marché Coopérative. ${produitsMarcheSansMoi.length} produits producteurs disponibles. Votre marketplace a ${produitsCoopLive.length} produits publiés. ${commandesEnAttente} commande${commandesEnAttente > 1 ? 's' : ''} en attente de votre réponse.`;
    // speak(msg); // Désactivé — causait boucle audio infinie
  };

  // ── Actions
  const handleCommander = (produit: ProduitMarche) => {
    const nomProfil = `${user?.prenoms || ''} ${user?.nom || ''}`.trim();
    setQuantiteChoisie(1);
    setLivraisonTierce(false);
    setModeReception('livraison');
    setLivraisonNom(nomProfil);
    setLivraisonTelephone(user?.telephone || '');
    setLivraisonLocalite(user?.commune || '');
    setLivraisonDate('');
    setLivraisonNotes('');
    setModalCommande(produit);
  };

  const handleConfirmerCommande = async () => {
    if (!modalCommande) return;
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
      const saved = await apiRequest<any>(API_URL, '/commandes', {
        method: 'POST',
        body: JSON.stringify({
          vendeurId: modalCommande.vendeurId || (modalCommande as any).userId || (modalCommande as any).producteurId,
          produit: modalCommande.produit,
          quantite: quantiteChoisie,
          unite: modalCommande.unite,
          prixUnitaire: modalCommande.prixUnitaire,
          total: quantiteChoisie * modalCommande.prixUnitaire,
          type: 'achat',
          statut: 'en_attente',
          dateCommande: new Date().toISOString(),
          acheteur_telephone: telephoneNormalise,
          localite: modeReception === 'enlevement' ? 'Enlèvement' : livraisonLocalite,
          date_livraison: livraisonDate || undefined,
          notes: livraisonNotes || undefined,
          acheteur_nom: livraisonNom,
        }),
      });
      const normalized = mapApiCommandeToCmdMarche(saved.commande ?? saved, 'acheteur');
      setCommandesMarche(prev => [normalized, ...prev]);
      toast.success(`Commande envoyée à ${modalCommande.vendeurNom}`);
      speak(`Commande de ${modalCommande.produit} envoyée.`);
      setModalCommande(null);
      setTabAchat('mes_achats');
    } catch {
      toast.error('Erreur lors de la commande. Réessaie.');
    }
  };

  const handlePublierSurCoop = (produit: ProduitMarche) => {
    setProduitAPublier(produit);
    setShowPublierModal(true);
  };

  const handleRetirerProduit = async (id: string) => {
    try {
      await apiRequest(API_URL, `/publications/${id}`, { method: 'DELETE' });
      setProduitsCoopLive(prev => prev.filter(p => p.id !== id));
      toast.success('Produit retiré de votre marketplace');
      speak('Le produit a été retiré de votre marketplace.');
    } catch {
      toast.error("Impossible de retirer le produit pour l'instant.");
    }
  };

  const handleAccepterCmd = async (id: string) => {
    try {
      await apiRequest(API_URL, `/commandes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ statut: 'acceptee' }),
      });
      setCommandesRecues(prev => prev.map(c => c.id === id ? { ...c, statut: 'acceptee' as StatutCommande } : c));
      toast.success('Commande acceptée');
      speak('La commande du marchand a été acceptée.');
    } catch {
      toast.error("Impossible d'accepter la commande.");
    }
  };

  const handleRefuserCmd = async (id: string) => {
    try {
      await apiRequest(API_URL, `/commandes/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ statut: 'refusee' }),
      });
      setCommandesRecues(prev => prev.map(c => c.id === id ? { ...c, statut: 'refusee' as StatutCommande } : c));
      toast.error('Commande refusée');
    } catch {
      toast.error('Impossible de refuser la commande.');
    }
  };

  const handleCloturerCmd = async (id: string) => {
    try {
      const res = await apiRequest<{ success?: boolean; message?: string } | null>(
        API_URL,
        `/cooperatives/commandes/${id}/cloture`,
        { method: 'POST' },
      );
      if (!res?.success) {
        toast.error(res?.message || 'Clôture impossible');
        return;
      }
      setCommandesMarche(prev =>
        prev.map(c => c.id === id
          ? ({ ...c, statutPaiement: 'paye' } as CmdMarche & { statutPaiement?: string })
          : c));
      toast.success('Commande clôturée et payée');
    } catch {
      toast.error('Clôture impossible');
    }
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <>
    <SubPageLayout role="cooperateur" title="Marché Coopérative" rightContent={<NotificationButton />}>
      <div className="pb-32 lg:pb-8 max-w-2xl lg:max-w-7xl mx-auto min-h-screen">
        <KPIGrid cols={2} className="mb-3">
          {vue === 'achats' && (
            <>
              <UniversalKPI
                label="Produits dispo"
                animatedTarget={produitsMarcheSansMoi.length}
                icon={Package}
                color="#16a34a"
                bgColor="rgba(240,253,244,0.9)"
                borderColor="rgba(34,197,94,0.35)"
                iconAnimation="bounce"
              />
              <UniversalKPI
                label="Mes commandes"
                animatedTarget={commandesVersProducteurs.length}
                icon={ShoppingCart}
                color="#2072AF"
                bgColor="rgba(239,246,255,0.9)"
                borderColor="rgba(59,130,246,0.35)"
                iconAnimation="float"
              />
              <UniversalKPI
                label="En attente"
                animatedTarget={commandesAchatsEnAttente}
                icon={Clock}
                color="#ea580c"
                bgColor="rgba(255,247,237,0.9)"
                borderColor="rgba(249,115,22,0.35)"
                iconAnimation="pulse"
              />
              <UniversalKPI
                label="Livrées"
                animatedTarget={commandesAchatsLivrees}
                icon={Truck}
                color="#a855f7"
                bgColor="rgba(250,245,255,0.9)"
                borderColor="rgba(168,85,247,0.35)"
                iconAnimation="pulse"
              />
            </>
          )}
          {vue === 'ventes' && (
            <>
              <UniversalKPI
                label="Mes produits publiés"
                animatedTarget={produitsCoopLive.length}
                icon={Package}
                color="#16a34a"
                bgColor="rgba(240,253,244,0.9)"
                borderColor="rgba(34,197,94,0.35)"
                iconAnimation="bounce"
              />
              <UniversalKPI
                label="Commandes reçues"
                animatedTarget={commandesRecues.length}
                icon={ShoppingCart}
                color="#2072AF"
                bgColor="rgba(239,246,255,0.9)"
                borderColor="rgba(59,130,246,0.35)"
                iconAnimation="float"
              />
              <UniversalKPI
                label="En attente"
                animatedTarget={commandesEnAttente}
                icon={Clock}
                color="#ea580c"
                bgColor="rgba(255,247,237,0.9)"
                borderColor="rgba(249,115,22,0.35)"
                iconAnimation="pulse"
              />
              <UniversalKPI
                label="Commandes terminées"
                animatedTarget={commandesRecuesTerminees}
                icon={CheckCircle}
                color="#a855f7"
                bgColor="rgba(250,245,255,0.9)"
                borderColor="rgba(168,85,247,0.35)"
                iconAnimation="pulse"
              />
            </>
          )}
          {vue === 'historique' && (
            <>
              <UniversalKPI
                label="Mes achats"
                animatedTarget={commandesMarche.length}
                icon={ShoppingCart}
                color="#2072AF"
                bgColor="rgba(239,246,255,0.9)"
                borderColor="rgba(59,130,246,0.35)"
                iconAnimation="float"
              />
              <UniversalKPI
                label="Mes ventes"
                animatedTarget={commandesRecues.length}
                icon={Store}
                color="#16a34a"
                bgColor="rgba(240,253,244,0.9)"
                borderColor="rgba(34,197,94,0.35)"
                iconAnimation="bounce"
              />
              <UniversalKPI
                label="Livrées"
                animatedTarget={historiqueLivrees}
                icon={Truck}
                color="#ea580c"
                bgColor="rgba(255,247,237,0.9)"
                borderColor="rgba(249,115,22,0.35)"
                iconAnimation="pulse"
              />
              <UniversalKPI
                label="Valeur totale"
                animatedTarget={historiqueValeurTotaleAchats}
                suffix=" FCFA"
                icon={Banknote}
                color="#a855f7"
                bgColor="rgba(250,245,255,0.9)"
                borderColor="rgba(168,85,247,0.35)"
                iconAnimation="pulse"
              />
            </>
          )}
        </KPIGrid>

        {/* ── 3 Onglets principaux ── */}
        <div className="bg-white rounded-2xl p-1.5 border-2 border-gray-100 flex gap-1.5 shadow-sm mb-4">
          <OngletBtn
            label="J'achète"
            Icon={ShoppingCart}
            active={vue === 'achats'}
            onClick={() => { setVue('achats'); setSearchQuery(''); }}
          />
          <OngletBtn
            label="Je vends"
            Icon={Store}
            active={vue === 'ventes'}
            onClick={() => { setVue('ventes'); setSearchQuery(''); }}
          />
          <OngletBtn
            label="Historique"
            Icon={History}
            active={vue === 'historique'}
            onClick={() => { setVue('historique'); setSearchQuery(''); }}
          />
        </div>

        <AnimatePresence mode="wait">
          {/* ══════════════════════════════════════
              VUE "J'ACHÈTE"
          ══════════════════════════════════════ */}
          {vue === 'achats' && (
            <motion.div key="achats"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}>

              {/* Sous-onglets — pleine largeur */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <motion.button
                  type="button"
                  onClick={() => setTabAchat('marketplace')}
                  className={`w-full py-3 rounded-2xl text-xs sm:text-sm font-bold transition-colors ${
                    tabAchat === 'marketplace'
                      ? 'bg-[#2072AF] text-white shadow-md'
                      : 'bg-white border border-gray-200 text-gray-600'
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  Produits disponibles
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => setTabAchat('mes_achats')}
                  className={`w-full py-3 rounded-2xl text-xs sm:text-sm font-bold transition-colors ${
                    tabAchat === 'mes_achats'
                      ? 'bg-[#2072AF] text-white shadow-md'
                      : 'bg-white border border-gray-200 text-gray-600'
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  Mes commandes
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => setTabAchat('groupe')}
                  className={`w-full py-3 rounded-2xl text-xs sm:text-sm font-bold transition-colors ${
                    tabAchat === 'groupe'
                      ? 'bg-[#2072AF] text-white shadow-md'
                      : 'bg-white border border-gray-200 text-gray-600'
                  }`}
                  whileTap={{ scale: 0.98 }}
                >
                  Groupé
                </motion.button>
              </div>

              {/* Barre de recherche */}
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text"
                  placeholder={
                    tabAchat === 'marketplace'
                      ? 'Chercher un produit ou producteur...'
                      : tabAchat === 'mes_achats'
                        ? 'Chercher une commande...'
                        : 'Chercher un produit groupé...'
                  }
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-20 py-3 rounded-2xl bg-white border-2 border-gray-200 focus:outline-none text-sm placeholder:text-gray-400 shadow-sm"
                  style={{ borderColor: searchQuery ? C : undefined }}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <motion.button onClick={startVoiceSearch}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: isListening ? C_LIGHT : undefined }}
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    {isListening
                      ? <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
                          <MicOff className="w-4 h-4" style={{ color: C }} />
                        </motion.div>
                      : <Mic className="w-4 h-4 text-gray-400" />}
                  </motion.button>
                  {tabAchat === 'marketplace' && (
                    <motion.button onClick={() => setShowFilters(!showFilters)}
                      className="w-8 h-8 rounded-full flex items-center justify-center border-2"
                      style={showFilters ? { backgroundColor: C, borderColor: C } : { borderColor: '#E5E7EB', backgroundColor: 'white' }}
                      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                      <Filter className="w-3.5 h-3.5" style={{ color: showFilters ? 'white' : '#9CA3AF' }} />
                    </motion.button>
                  )}
                </div>
              </div>

              {/* Panel filtres */}
              <AnimatePresence>
                {showFilters && tabAchat === 'marketplace' && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden mb-4">
                    <div className="bg-white rounded-2xl border-2 border-gray-100 p-4 shadow-sm">
                      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5">Catégorie</label>
                      <select value={filterCategorie} onChange={e => setFilterCategorie(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border-2 border-gray-200 text-xs focus:outline-none bg-white"
                        style={{ borderColor: filterCategorie ? C : undefined }}>
                        <option value="">Toutes les catégories</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      {filterCategorie && (
                        <motion.button whileTap={{ scale: 0.95 }} onClick={() => setFilterCategorie('')}
                          className="mt-2 text-xs font-bold px-3 py-1.5 rounded-xl"
                          style={{ color: C, backgroundColor: C_LIGHT }}>
                          Effacer le filtre
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Contenu sous-tab */}
              <AnimatePresence mode="wait">
                {tabAchat === 'marketplace' && (
                  <motion.div key="mp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4" style={{ color: C }} />
                      <span className="text-sm font-bold text-gray-900">Produits des producteurs</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: C_LIGHT, color: C }}>
                        {produitsFiltrés.length}
                      </span>
                    </div>
                    {produitsFiltrés.length === 0
                      ? <EmptyState icon={<Package className="w-10 h-10" style={{ color: C }} />} message="Aucun produit trouvé" />
                      : (
                        <div className="grid grid-cols-2 gap-3">
                          {produitsFiltrés.map((p, i) => (
                            <ProduitCardGrid
                              key={p.id}
                              produit={p}
                              index={i}
                              onAction={handleCommander}
                              actionLabel="Commander"
                              onSecondary={handlePublierSurCoop}
                              secondaryLabel="Publier"
                            />
                          ))}
                        </div>
                      )
                    }
                  </motion.div>
                )}

                {tabAchat === 'mes_achats' && (
                  <motion.div key="ma" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <ShoppingCart className="w-4 h-4 text-violet-500" />
                      <span className="text-sm font-bold text-gray-900">Mes commandes aux producteurs</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-100 text-violet-700">
                        {commandesCoopFiltrées.length}
                      </span>
                    </div>
                    {commandesCoopFiltrées.length === 0
                      ? <EmptyState icon={<ShoppingCart className="w-10 h-10 text-violet-300" />} message="Aucune commande en cours" />
                      : commandesCoopFiltrées.map((c, i) => (
                        <MarcheCommandeAccordeonCard
                          key={c.id}
                          commande={c}
                          index={i}
                          onDetails={() => {
                            setSelectedCmdReadOnly(true);
                            setSelectedCmdMarche(c);
                          }}
                        />
                      ))}
                  </motion.div>
                )}

                {tabAchat === 'groupe' && (
                  <motion.div key="grp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="space-y-3">
                    <div className="flex items-center gap-2 mb-2">
                      <LayoutGrid className="w-4 h-4" style={{ color: C }} />
                      <span className="text-sm font-bold text-gray-900">Achats groupés par produit</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: C_LIGHT, color: C }}>
                        {achatsGroupesParProduit.length}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-2">
                      Synthèse des quantités et montants cumulés sur tes commandes aux producteurs (filtrées par la recherche).
                    </p>
                    {achatsGroupesParProduit.length === 0
                      ? (
                        <EmptyState
                          icon={<LayoutGrid className="w-10 h-10" style={{ color: C }} />}
                          message="Aucune donnée groupée pour l’instant"
                        />
                      )
                      : (
                        <div className="space-y-2">
                          {achatsGroupesParProduit.map((row, i) => (
                            <motion.div
                              key={`${row.produit}-${row.unite}-${i}`}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.03 }}
                              className="bg-white rounded-2xl border-2 border-gray-100 p-4 shadow-sm"
                            >
                              <p className="font-bold text-gray-900">{row.produit}</p>
                              <p className="text-xs text-gray-500 mt-1">
                                {row.quantite.toLocaleString('fr-FR')} {row.unite} cumulés · {row.nbCommandes} commande{row.nbCommandes > 1 ? 's' : ''}
                              </p>
                              <p className="text-sm font-black mt-2" style={{ color: C }}>
                                {row.montant.toLocaleString('fr-FR')} FCFA
                              </p>
                              <motion.button
                                onClick={() => {
                                  toast.info('Consolider cette commande groupée depuis la page Commandes');
                                }}
                                className="mt-2 w-full py-2 rounded-xl text-xs font-bold"
                                style={{ backgroundColor: C_LIGHT, color: C }}
                                whileTap={{ scale: 0.97 }}
                              >
                                Créer commande groupée
                              </motion.button>
                            </motion.div>
                          ))}
                        </div>
                      )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ══════════════════════════════════════
              VUE "JE VENDS"
          ══════════════════════════════════════ */}
          {vue === 'ventes' && (
            <motion.div key="ventes"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}>

              {/* Sous-onglets */}
              <div className="bg-white rounded-2xl p-1.5 border border-gray-100 grid grid-cols-2 gap-2 shadow-sm mb-4">
                <SousOnglet
                  label="Ma marketplace"
                  active={tabVente === 'ma_marketplace'}
                  onClick={() => setTabVente('ma_marketplace')}
                />
                <SousOnglet
                  label="Commandes reçues"
                  active={tabVente === 'commandes_recues'}
                  onClick={() => setTabVente('commandes_recues')}
                />
              </div>

              {/* Barre de recherche */}
              <div className="relative mb-4">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text"
                  placeholder={tabVente === 'ma_marketplace' ? 'Chercher un produit publié...' : 'Chercher une commande reçue...'}
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-12 py-3 rounded-2xl bg-white border-2 border-gray-200 focus:outline-none text-sm placeholder:text-gray-400 shadow-sm"
                  style={{ borderColor: searchQuery ? C : undefined }}
                />
                <motion.button onClick={startVoiceSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: isListening ? C_LIGHT : undefined }}
                  whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  {isListening
                    ? <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}>
                        <MicOff className="w-4 h-4" style={{ color: C }} />
                      </motion.div>
                    : <Mic className="w-4 h-4 text-gray-400" />}
                </motion.button>
              </div>

              <AnimatePresence mode="wait">
                {/* ── Ma Marketplace ── */}
                {tabVente === 'ma_marketplace' && (
                  <motion.div key="mm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="space-y-3">

                    {/* En-tête + bouton publier */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Store className="w-4 h-4" style={{ color: C }} />
                        <span className="text-sm font-bold text-gray-900">Mes produits publiés</span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{ backgroundColor: C_LIGHT, color: C }}>
                          {produitsCoopFiltrés.length}
                        </span>
                      </div>
                      <motion.button
                        onClick={() => setShowNouvelleAnnonce(true)}
                        className="w-10 h-10 rounded-full text-white flex items-center justify-center shadow-md flex-shrink-0"
                        style={{ background: `linear-gradient(135deg, ${C}, ${C_DARK})` }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}>
                        <Plus className="w-5 h-5" />
                      </motion.button>
                    </div>

                    {/* Info pour l'utilisateur */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      className="bg-blue-50 rounded-2xl border border-blue-100 p-3 flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-blue-700">
                        Ces produits sont visibles par tous les marchands sur la marketplace Jùlaba.
                      </p>
                    </motion.div>

                    {produitsCoopFiltrés.length === 0
                      ? (
                        <EmptyState
                          icon={<Store className="w-10 h-10" style={{ color: C }} />}
                          message="Votre marketplace est vide"
                          sub='Publiez un produit avec le bouton "Publier" ou depuis un produit producteur'
                        />
                      )
                      : (
                        <div className="grid grid-cols-2 gap-3">
                          {produitsCoopFiltrés.map((p, i) => (
                            <ProduitCoopCardGrid
                              key={p.id}
                              produit={p}
                              index={i}
                              onRetirer={handleRetirerProduit}
                            />
                          ))}
                        </div>
                      )
                    }
                  </motion.div>
                )}

                {/* ── Commandes reçues des marchands ── */}
                {tabVente === 'commandes_recues' && (
                  <motion.div key="cr" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="space-y-3">

                    <div className="flex items-center gap-2 mb-2">
                      <ArrowDownLeft className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-bold text-gray-900">Commandes des marchands</span>
                      {commandesEnAttente > 0 && (
                        <motion.span
                          animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-600">
                          {commandesEnAttente} en attente
                        </motion.span>
                      )}
                    </div>

                    {commandesMarchandsFiltrées.length === 0
                      ? <EmptyState icon={<ShoppingCart className="w-10 h-10 text-green-300" />} message="Aucune commande reçue" />
                      : commandesMarchandsFiltrées.map((c, i) => (
                        <CommandeRecueCard
                          key={c.id}
                          commande={c}
                          index={i}
                          onAccepter={() => handleAccepterCmd(c.id)}
                          onRefuser={() => handleRefuserCmd(c.id)}
                          onDetails={() => {
                            setSelectedCmdReadOnly(false);
                            setSelectedCmdMarche(c);
                          }}
                        />
                      ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* ══════════════════════════════════════
              VUE "HISTORIQUE"
          ══════════════════════════════════════ */}
          {vue === 'historique' && (
            <motion.div key="historique"
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}>

              {/* Sous-onglets */}
              <div className="bg-white rounded-2xl p-1.5 border border-gray-100 grid grid-cols-2 gap-2 shadow-sm mb-4">
                <SousOnglet
                  label="Mes achats"
                  active={tabHistorique === 'h_achats'}
                  onClick={() => setTabHistorique('h_achats')}
                />
                <SousOnglet
                  label="Mes ventes"
                  active={tabHistorique === 'h_ventes'}
                  onClick={() => setTabHistorique('h_ventes')}
                />
              </div>

              <div className="flex items-center gap-2 mb-3">
                <History className="w-4 h-4" style={{ color: C }} />
                <span className="text-sm font-bold text-gray-900">
                  {tabHistorique === 'h_achats' ? 'Historique de mes achats producteurs' : 'Historique de mes ventes aux marchands'}
                </span>
              </div>

              {(() => {
                const histList = tabHistorique === 'h_achats' ? commandesMarche : commandesRecues;
                if (histList.length === 0) {
                  return (
                    <EmptyState
                      icon={<History className="w-10 h-10 text-gray-300" />}
                      message={tabHistorique === 'h_achats' ? "Aucun achat dans l'historique" : "Aucune vente dans l'historique"}
                    />
                  );
                }
                return (
                  <div className="space-y-3">
                    {histList.map((c, i) => (
                      <MarcheCommandeAccordeonCard
                        key={c.id}
                        commande={c}
                        index={i}
                        onDetails={() => {
                          setSelectedCmdReadOnly(true);
                          setSelectedCmdMarche(c);
                        }}
                      />
                    ))}
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SubPageLayout>

      {/* ════ MODAL Publier sur Coop ════ */}
      <AnimatePresence>{showPublierModal && produitAPublier && (
        <ModalPublierSurCoop
          produit={produitAPublier}
          onClose={() => { setShowPublierModal(false); setProduitAPublier(null); }}
          onPublier={async (prixCoop) => {
            try {
              const payload = await apiRequest<any>(API_URL, '/publications', {
                method: 'POST',
                body: JSON.stringify({
                  produit: produitAPublier.produit,
                  culture: produitAPublier.culture || produitAPublier.produit,
                  quantite_disponible: produitAPublier.quantite || produitAPublier.quantiteDispo || 0,
                  unite: produitAPublier.unite || 'kg',
                  prix_unitaire: prixCoop,
                  qualite: produitAPublier.qualite || 'standard',
                  localisation: produitAPublier.village || produitAPublier.localisation || '',
                  photo_url: produitAPublier.image || produitAPublier.photoUrl || null,
                }),
              }).catch(() => null);
              const p = payload?.publication;
              if (!p) throw new Error('missing_publication');
              const nouveau: ProduitMarche = {
                ...produitAPublier,
                id: p.id,
                produit: p.produit || produitAPublier.produit,
                culture: p.culture || produitAPublier.culture || produitAPublier.produit,
                categorie: p.culture || p.produit || produitAPublier.categorie || 'Autre',
                quantite: Number(p.quantite_disponible) || 0,
                quantiteDispo: Number(p.quantite_disponible) || 0,
                unite: p.unite || produitAPublier.unite || 'kg',
                prixOrigine: produitAPublier.prixUnitaire,
                prixUnitaire: Number(p.prix_unitaire) || prixCoop,
                qualite: p.qualite || produitAPublier.qualite || 'standard',
                image: p.photo_url || produitAPublier.image || produitAPublier.photoUrl || null,
                photoUrl: p.photo_url || produitAPublier.photoUrl || produitAPublier.image || null,
                village: p.localisation || '',
                localisation: p.localisation || '',
                vendeurOrigineNom: produitAPublier.vendeurNom,
                vendeurType: 'cooperative',
                vendeurNom: (`${appUser?.prenoms || ''} ${appUser?.nom || ''}`).trim() || produitAPublier.vendeurNom,
                vendeurId: p.user_id || appUser?.id || '',
                scoreVendeur: produitAPublier.scoreVendeur || 0,
                datePublication: (p.created_at || new Date().toISOString()).slice(0, 10),
              };
              setProduitsCoopLive(prev => [nouveau, ...prev]);
              toast.success(`${produitAPublier.produit} publié sur votre marketplace`);
              speak(`${produitAPublier.produit} est maintenant visible par tous les marchands.`);
              setShowPublierModal(false);
              setProduitAPublier(null);
              // Aller directement voir le produit publié
              setVue('ventes');
              setTabVente('ma_marketplace');
            } catch {
              toast.error("Erreur lors de la publication sur votre marketplace.");
            }
          }}
        />
      )}</AnimatePresence>

      {/* ════ MODAL Nouvelle annonce indépendante ════ */}
      <AnimatePresence>{showNouvelleAnnonce && (
        <ModalNouvelleAnnonce
          onClose={() => setShowNouvelleAnnonce(false)}
          onPublier={async (produit) => {
            try {
              const payload = await apiRequest<any>(API_URL, '/publications', {
                method: 'POST',
                body: JSON.stringify({
                  produit: produit.produit,
                  culture: produit.culture || produit.produit,
                  quantite_disponible: produit.quantite || 0,
                  unite: produit.unite || 'kg',
                  prix_unitaire: produit.prixUnitaire,
                  qualite: produit.qualite || 'standard',
                  localisation: produit.village || '',
                  photo_url: produit.image || null,
                }),
              }).catch(() => null);
              const p = payload?.publication;
              if (!p) throw new Error('missing_publication');
              const nouveau: ProduitMarche = {
                ...produit,
                id: p.id,
                produit: p.produit || produit.produit,
                culture: p.culture || produit.culture || produit.produit,
                categorie: p.culture || p.produit || produit.categorie || 'Autre',
                quantite: Number(p.quantite_disponible) || 0,
                quantiteDispo: Number(p.quantite_disponible) || 0,
                unite: p.unite || produit.unite || 'kg',
                prixUnitaire: Number(p.prix_unitaire) || produit.prixUnitaire,
                prixOrigine: Number(p.prix_unitaire) || produit.prixUnitaire,
                qualite: p.qualite || produit.qualite || 'standard',
                image: p.photo_url || produit.image || null,
                photoUrl: p.photo_url || produit.photoUrl || produit.image || null,
                village: p.localisation || '',
                localisation: p.localisation || '',
                vendeurType: 'cooperative',
                vendeurNom: (`${appUser?.prenoms || ''} ${appUser?.nom || ''}`).trim() || produit.vendeurNom,
                vendeurId: p.user_id || appUser?.id || produit.vendeurId || '',
                scoreVendeur: produit.scoreVendeur || 0,
                datePublication: (p.created_at || new Date().toISOString()).slice(0, 10),
              };
              setProduitsCoopLive(prev => [nouveau, ...prev]);
              toast.success(`${produit.produit} publié sur votre marketplace`);
              speak(`${produit.produit} est maintenant visible par tous les marchands.`);
              setShowNouvelleAnnonce(false);
            } catch {
              toast.error("Erreur lors de la publication de l'annonce.");
            }
          }}
        />
      )}</AnimatePresence>

      {/* ════ DRAWER Détail commande ════ */}
      <AnimatePresence>{selectedCmdMarche && (
        <DrawerDetailCmdMarche
          commande={selectedCmdMarche}
          readOnly={selectedCmdReadOnly}
          onClose={() => {
            setSelectedCmdReadOnly(false);
            setSelectedCmdMarche(null);
          }}
          onAccepter={() => {
            if (selectedCmdMarche) handleAccepterCmd(selectedCmdMarche.id);
            setSelectedCmdReadOnly(false);
            setSelectedCmdMarche(null);
          }}
          onRefuser={() => {
            if (selectedCmdMarche) handleRefuserCmd(selectedCmdMarche.id);
            setSelectedCmdReadOnly(false);
            setSelectedCmdMarche(null);
          }}
          onNegocier={() => {
            setCmdANegocier(selectedCmdMarche);
          }}
          onCloturer={() => {
            if (selectedCmdMarche) void handleCloturerCmd(selectedCmdMarche.id);
            setSelectedCmdReadOnly(false);
            setSelectedCmdMarche(null);
          }}
        />
      )}</AnimatePresence>

      <AnimatePresence>
        {cmdANegocier && (
          <ModalNegocier
            commande={cmdANegocier}
            onClose={() => setCmdANegocier(null)}
            onEnvoyer={(message, prix) => {
              void (async () => {
                try {
                  await apiRequest(API_URL, `/commandes/${cmdANegocier.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                      statut: 'en_negociation',
                      messageNegociation: message,
                      prixNegocie: prix,
                    }),
                  });
                  setCommandesMarche(prev =>
                    prev.map(c => c.id === cmdANegocier.id
                      ? { ...c, statut: 'en_negociation' as StatutCommande, messageNegociation: message, prixNegocie: prix }
                      : c));
                  toast.success('Proposition envoyée au producteur');
                  setCmdANegocier(null);
                } catch {
                  toast.error("Erreur réseau lors de l'envoi de la négociation");
                }
              })();
            }}
          />
        )}
      </AnimatePresence>

      {modalCommande && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setModalCommande(null)}>
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={e => e.stopPropagation()}
            className="bg-white rounded-t-3xl p-6 w-full max-w-md shadow-xl">
            <h3 className="font-bold text-gray-900 text-lg mb-1">{modalCommande.produit}</h3>
            <p className="text-sm text-gray-500 mb-4">{modalCommande.vendeurNom} · {modalCommande.prixUnitaire.toLocaleString()} FCFA/{modalCommande.unite}</p>
            <label className="text-sm font-bold text-gray-700 mb-2 block">Quantité ({modalCommande.unite})</label>
            <div className="flex items-center gap-3 mb-2">
              <motion.button whileTap={{ scale: 0.9 }}
                onClick={() => setQuantiteChoisie(q => Math.max(1, q - 1))}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold">−</motion.button>
              <input type="number" min={1} max={modalCommande.quantite || 9999}
                value={quantiteChoisie}
                onChange={e => setQuantiteChoisie(Math.max(1, Number(e.target.value)))}
                className="flex-1 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl py-2 focus:outline-none focus:border-blue-500" />
              <motion.button whileTap={{ scale: 0.9 }}
                onClick={() => setQuantiteChoisie(q => Math.min(modalCommande.quantite || 9999, q + 1))}
                className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold">+</motion.button>
            </div>
            <div className="rounded-2xl bg-gray-50 p-4 space-y-3 mb-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setModeReception('livraison')}
                  className={`py-2.5 rounded-2xl text-sm font-semibold transition-colors ${
                    modeReception === 'livraison'
                      ? 'bg-[#2E7D32] text-white'
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
                  onChange={e => setLivraisonNom(e.target.value)}
                  disabled={!livraisonTierce}
                  className={`w-full px-4 py-3 rounded-2xl border-2 text-sm ${livraisonTierce ? 'bg-white border-gray-200 focus:border-[#2E7D32]' : 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'} focus:outline-none`}
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={livraisonTelephone}
                  onChange={e => setLivraisonTelephone(e.target.value)}
                  disabled={!livraisonTierce}
                  className={`w-full px-4 py-3 rounded-2xl border-2 text-sm ${livraisonTierce ? 'bg-white border-gray-200 focus:border-[#2E7D32]' : 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'} focus:outline-none`}
                />
              </div>
              {modeReception === 'livraison' && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-1">Localité</label>
                  <input
                    type="text"
                    value={livraisonLocalite}
                    onChange={e => setLivraisonLocalite(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm focus:outline-none focus:border-[#2E7D32] bg-white"
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Date livraison</label>
                <input
                  type="date"
                  value={livraisonDate}
                  onChange={e => setLivraisonDate(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm focus:outline-none focus:border-[#2E7D32] bg-white"
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">Notes</label>
                <textarea
                  value={livraisonNotes}
                  onChange={e => setLivraisonNotes(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm focus:outline-none focus:border-[#2E7D32] bg-white resize-none"
                />
              </div>
            </div>
            <p className="text-center text-sm text-gray-500 mb-4">
              Total : <span className="font-bold text-blue-600">{(quantiteChoisie * modalCommande.prixUnitaire).toLocaleString()} FCFA</span>
            </p>
            <motion.button whileTap={{ scale: 0.97 }}
              onClick={handleConfirmerCommande}
              className="w-full py-3.5 rounded-2xl text-white font-bold text-sm"
              style={{ background: `linear-gradient(135deg, ${C}, ${C_DARK})` }}>
              Confirmer la commande
            </motion.button>
            <button onClick={() => setModalCommande(null)}
              className="w-full mt-2 py-2.5 text-sm text-gray-500 font-medium">
              Annuler
            </button>
          </motion.div>
        </div>
      )}

    </>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ icon, message, sub }: { icon: React.ReactNode; message: string; sub?: string }) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-4 bg-blue-50">
        {icon}
      </div>
      <p className="font-bold text-gray-400">{message}</p>
      {sub && <p className="text-xs text-gray-300 mt-1 max-w-xs">{sub}</p>}
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════
// MODAL PUBLIER SUR COOP (depuis un produit producteur)
// ════════════════════════════════════════════════════════
const C_OP    = '#2072AF';
const C_LIGHT_OP = '#EBF4FB';

function ModalPublierSurCoop({ produit, onClose, onPublier }: {
  produit: ProduitMarche;
  onClose: () => void;
  onPublier: (prixCoop: number) => void;
}) {
  const [prixCoop, setPrixCoop] = useState(String(Math.round(produit.prixUnitaire * 1.15)));
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const marge = parseInt(prixCoop || '0') - produit.prixUnitaire;
  const margePct = produit.prixUnitaire > 0 ? Math.round((marge / produit.prixUnitaire) * 100) : 0;

  const handlePublier = () => {
    if (!prixCoop || parseInt(prixCoop) < produit.prixUnitaire) {
      toast.error('Le prix doit être supérieur au prix producteur'); return;
    }
    setSubmitting(true);
    setTimeout(() => { onPublier(parseInt(prixCoop)); }, 600);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-center pt-3 pb-1"><div className="w-12 h-1.5 rounded-full bg-gray-300" /></div>

        <div className="px-5 pb-4 flex items-center justify-between border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Publier sur ma marketplace</h2>
            <p className="text-xs text-gray-500">{produit.produit} — {produit.vendeurNom}</p>
          </div>
          <motion.button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center" whileHover={{ rotate: 90 }}>
            <X className="w-4 h-4 text-gray-600" />
          </motion.button>
        </div>

        {/* Barre de progression */}
        <div className="px-5 pt-3">
          <div className="flex gap-1.5">
            {['Prix de vente', 'Confirmation'].map((_, i) => (
              <div key={i} className="flex-1 h-1.5 rounded-full overflow-hidden bg-gray-100">
                <motion.div className="h-full rounded-full" style={{ backgroundColor: C_OP }}
                  animate={{ width: i + 1 <= step ? '100%' : '0%' }} transition={{ duration: 0.4 }} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {step === 1 && (
            <>
              {/* Prix producteur */}
              <div className="bg-gray-50 rounded-2xl border border-gray-100 p-4 space-y-2">
                <h3 className="font-bold text-gray-900">{produit.produit}</h3>
                <p className="text-xs text-gray-500">{produit.vendeurNom} — {produit.village}</p>
                <div className="flex items-center gap-2">
                  <Banknote className="w-4 h-4 text-gray-400" />
                  <span className="text-sm font-bold text-gray-700">
                    Prix producteur : {(produit.prixUnitaire || 0).toLocaleString()} FCFA/{produit.unite}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">Stock : {(produit.quantite || 0).toLocaleString()} {produit.unite}</span>
                </div>
              </div>

              {/* Votre prix */}
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1.5">
                  Votre prix de vente (FCFA / {produit.unite}) <span className="text-red-500">*</span>
                </label>
                <input type="number" value={prixCoop} onChange={e => setPrixCoop(e.target.value)}
                  placeholder={`Ex : ${Math.round(produit.prixUnitaire * 1.15)}`}
                  className="w-full px-4 h-12 rounded-2xl border-2 border-gray-200 text-sm focus:outline-none bg-white"
                  onFocus={e => (e.target.style.borderColor = C_OP)} onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
              </div>

              {/* Calcul marge */}
              {prixCoop && parseInt(prixCoop) > 0 && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="rounded-2xl p-4 border-2 space-y-2"
                  style={{ backgroundColor: marge >= 0 ? '#F0FDF4' : '#FEF2F2', borderColor: marge >= 0 ? '#86EFAC' : '#FECACA' }}>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Prix producteur</span>
                    <span className="text-xs font-bold text-gray-700">{(produit.prixUnitaire || 0).toLocaleString()} FCFA/{produit.unite}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Votre prix</span>
                    <span className="text-xs font-bold" style={{ color: C_OP }}>{parseInt(prixCoop || '0').toLocaleString()} FCFA/{produit.unite}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between">
                    <span className="text-xs font-bold text-gray-600">Marge</span>
                    <span className={`text-xs font-bold ${marge >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {marge >= 0 ? '+' : ''}{(marge || 0).toLocaleString()} FCFA ({margePct}%)
                    </span>
                  </div>
                </motion.div>
              )}

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-3 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700">Ce produit sera visible par tous les marchands sur votre marketplace.</p>
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">Vérifiez avant de publier :</p>
              <div className="rounded-3xl border-2 overflow-hidden" style={{ borderColor: C_OP }}>
                <div className="px-4 py-3 flex items-center gap-2" style={{ backgroundColor: C_OP }}>
                  <Store className="w-5 h-5 text-white" />
                  <p className="font-bold text-white text-sm">Aperçu de la publication</p>
                </div>
                <div className="p-4 space-y-2.5 bg-white">
                  {[
                    { label: 'Produit',        value: produit.produit },
                    { label: 'Fournisseur',     value: produit.vendeurNom },
                    { label: 'Marchandise',           value: `${(produit.quantite || 0).toLocaleString()} ${produit.unite}` },
                    { label: 'Prix producteur', value: `${(produit.prixUnitaire || 0).toLocaleString()} FCFA/${produit.unite}` },
                    { label: 'Votre prix',      value: `${parseInt(prixCoop).toLocaleString()} FCFA/${produit.unite}` },
                    { label: 'Marge',           value: `+${(marge || 0).toLocaleString()} FCFA (${margePct}%)` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-500">{label}</span>
                      <span className="text-xs font-bold text-gray-900 text-right">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <motion.div className="rounded-2xl p-3 flex items-start gap-2 bg-green-50 border border-green-100"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-green-700 font-semibold">
                  Après publication, les marchands verront ce produit immédiatement.
                </p>
              </motion.div>
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 bg-white grid grid-cols-2 gap-3">
          {step > 1 && (
            <motion.button onClick={() => setStep(s => s - 1)} whileTap={{ scale: 0.97 }}
              className="py-3.5 rounded-2xl border-2 border-gray-200 text-sm font-bold text-gray-700 flex items-center justify-center gap-2 whitespace-nowrap">
              <ArrowLeft className="w-4 h-4 flex-shrink-0" /> Retour
            </motion.button>
          )}
          {step < 2 ? (
            <motion.button
              onClick={() => {
                if (!prixCoop || parseInt(prixCoop) <= 0) { toast.error('Saisissez un prix valide'); return; }
                if (parseInt(prixCoop) < produit.prixUnitaire) { toast.error('Le prix doit dépasser le prix producteur'); return; }
                setStep(2);
              }}
              whileTap={{ scale: 0.97 }}
              className="py-3.5 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2"
              style={{ background: `linear-gradient(135deg, ${C_OP}, ${C_DARK})`, gridColumn: step > 1 ? undefined : '1 / -1' }}>
              Suivant <ChevronRight className="w-4 h-4" />
            </motion.button>
          ) : (
            <motion.button onClick={handlePublier} disabled={submitting} whileTap={{ scale: 0.97 }}
              className="py-3.5 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-70"
              style={{ background: 'linear-gradient(135deg, #16A34A, #15803d)' }}>
              {submitting
                ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}><RefreshCw className="w-4 h-4" /></motion.div>
                : <Store className="w-4 h-4" />}
              {submitting ? 'Publication...' : 'Publier maintenant'}
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════
// MODAL NOUVELLE ANNONCE INDÉPENDANTE
// ════════════════════════════════════════════════════════
function ModalNouvelleAnnonce({ onClose, onPublier }: {
  onClose: () => void;
  onPublier: (produit: ProduitMarche) => void;
}) {
  const [produit,   setProduit]   = useState('');
  const [categorie, setCategorie] = useState('');
  const [quantite,  setQuantite]  = useState('');
  const [unite,     setUnite]     = useState('kg');
  const [prix,      setPrix]      = useState('');
  const [qualite,   setQualite]   = useState<'A'|'B'|'C'>('A');
  const [image,     setImage]     = useState('');

  const doPublier = () => {
    if (!produit || !quantite || !prix) { toast.error('Remplis tous les champs obligatoires'); return; }
    const nouveau: ProduitMarche = {
      id: `pc${Date.now()}`,
      produit, categorie: categorie || 'Autres',
      quantite: parseInt(quantite),
      unite, prixUnitaire: parseInt(prix), qualite,
      vendeurType: 'cooperative', vendeurNom: 'Coopérative', vendeurId: '',
      village: '', region: '', telephone: '',
      scoreVendeur: 91, datePublication: new Date().toISOString().split('T')[0],
      image: image || undefined,
    };
    onPublier(nouveau);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-center pt-3 pb-1"><div className="w-12 h-1.5 rounded-full bg-gray-300" /></div>

        <div className="px-5 pb-4 flex items-center justify-between border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Nouvelle annonce</h2>
            <p className="text-xs text-gray-500">Publier un produit sur votre marketplace</p>
          </div>
          <motion.button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center" whileHover={{ rotate: 90 }}>
            <X className="w-4 h-4 text-gray-600" />
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Photo du produit */}
          <ImagePickerField
            label="Photo du produit (facultatif)"
            value={image}
            onChange={setImage}
            primaryColor={C_OP}
            shape="rect"
            size={88}
          />

          {[
            { label: 'Nom du produit', val: produit, set: setProduit, ph: 'Ex : Riz local, Ignames...', req: true },
            { label: 'Catégorie', val: categorie, set: setCategorie, ph: 'Ex : Céréales, Tubercules...' },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">
                {f.label}{f.req && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              <input type="text" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph}
                className="w-full px-4 h-12 rounded-2xl border-2 border-gray-200 text-sm focus:outline-none bg-white"
                onFocus={e => (e.target.style.borderColor = C_OP)} onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-600 mb-1.5">Quantité <span className="text-red-500">*</span></label>
              <input type="number" value={quantite} onChange={e => setQuantite(e.target.value)} placeholder="Ex : 500"
                className="w-full px-4 h-12 rounded-2xl border-2 border-gray-200 text-sm focus:outline-none bg-white"
                onFocus={e => (e.target.style.borderColor = C_OP)} onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
            </div>
            <SelectWithAutre
              label="Unité"
              value={unite}
              onChange={setUnite}
              options={['kg', 'tonne', 'régimes', 'sac', 'litre', 'carton']}
              primaryColor={C_OP}
              placeholder="Ex: barrique, panier..."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Prix de vente (FCFA) <span className="text-red-500">*</span></label>
            <input type="number" value={prix} onChange={e => setPrix(e.target.value)} placeholder="Ex : 750"
              className="w-full px-4 h-12 rounded-2xl border-2 border-gray-200 text-sm focus:outline-none bg-white"
              onFocus={e => (e.target.style.borderColor = C_OP)} onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2">Qualité</label>
            <div className="flex gap-2">
              {(['A', 'B', 'C'] as const).map(q => (
                <motion.button key={q} onClick={() => setQualite(q)} whileTap={{ scale: 0.95 }}
                  className="flex-1 py-2.5 rounded-xl border-2 text-xs font-bold transition-all"
                  style={{
                    borderColor: qualite === q ? Q_LABELS[q].color : '#E5E7EB',
                    backgroundColor: qualite === q ? Q_LABELS[q].bg : 'white',
                    color: qualite === q ? Q_LABELS[q].color : '#9CA3AF',
                  }}>
                  {Q_LABELS[q].label}
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 bg-white">
          <motion.button onClick={doPublier} whileTap={{ scale: 0.97 }}
            className="w-full py-3.5 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: `linear-gradient(135deg, ${C_OP}, ${C_DARK})` }}>
            <Store className="w-4 h-4" /> Publier sur ma marketplace
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════
// MODAL NÉGOCIER
// ════════════════════════════════════════════════════════
function ModalNegocier({ commande, onClose, onEnvoyer }: {
  commande: CmdMarche;
  onClose: () => void;
  onEnvoyer: (message: string, prix: number) => void;
}) {
  const [prixPropose, setPrixPropose] = useState(String(commande.prixUnitaire));
  const [message, setMessage] = useState('');

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-t-3xl w-full max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex justify-center pt-3 pb-1"><div className="w-12 h-1.5 rounded-full bg-gray-300" /></div>
        <div className="px-5 pb-4 flex items-center justify-between border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Proposer une négociation</h2>
            <p className="text-xs text-gray-500">{commande.produit} — {commande.vendeurNom}</p>
          </div>
          <motion.button onClick={onClose} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center" whileHover={{ rotate: 90 }}>
            <X className="w-4 h-4 text-gray-600" />
          </motion.button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="bg-gray-50 rounded-2xl border border-gray-100 p-3 flex gap-3">
            <Banknote className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-gray-500">Prix actuel</p>
              <p className="text-sm font-bold text-gray-900">{(commande.prixUnitaire || 0).toLocaleString()} FCFA / {commande.unite}</p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Votre prix proposé (FCFA / {commande.unite})</label>
            <input type="number" value={prixPropose} onChange={e => setPrixPropose(e.target.value)}
              placeholder={`Ex : ${Math.round(commande.prixUnitaire * 0.9)}`}
              className="w-full px-4 h-12 rounded-2xl border-2 border-gray-200 text-sm focus:outline-none bg-white"
              onFocus={e => (e.target.style.borderColor = '#8B5CF6')} onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5">Message au producteur</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3}
              placeholder="Ex : Pour une commande de 500 kg, nous pouvons accepter ce prix..."
              className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 text-sm focus:outline-none bg-white resize-none"
              onFocus={e => (e.target.style.borderColor = '#8B5CF6')} onBlur={e => (e.target.style.borderColor = '#E5E7EB')} />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-gray-100 bg-white">
          <motion.button
            onClick={() => {
              if (!prixPropose || !message.trim()) { toast.error('Saisissez un prix et un message'); return; }
              onEnvoyer(message, parseInt(prixPropose));
            }}
            whileTap={{ scale: 0.97 }}
            className="w-full py-3.5 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}>
            <Send className="w-4 h-4" /> Envoyer la proposition
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════
// DRAWER DÉTAIL COMMANDE
// ════════════════════════════════════════════════════════
function DrawerDetailCmdMarche({ commande, onClose, onAccepter, onRefuser, onNegocier, onCloturer, readOnly = false }: {
  commande: CmdMarche;
  onClose: () => void;
  onAccepter: () => Promise<void> | void;
  onRefuser: () => Promise<void> | void;
  onNegocier?: () => void;
  onCloturer?: () => void;
  /** Coop en acheteur : pas d’actions accepter / refuser dans le drawer */
  readOnly?: boolean;
}) {
  const sc = STATUT_CMD_LABELS[commande.statut] || STATUT_CMD_LABELS['en_attente'];
  const isPending = commande.statut === 'en_attente';
  const cmdExt = commande as CmdMarche & { dateCommande?: string; total?: number };
  const produitImgDrawer = findProduitIconImg(commande.produit);
  const dateCreeAffichee = (commande.dateCreation || cmdExt.dateCommande)
    ? new Date(commande.dateCreation || cmdExt.dateCommande!).toLocaleString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';
  const dateLivAffichee = commande.dateLivraison || '—';
  const totalMontant = Math.round((cmdExt.total ?? commande.montantTotal) || 0);

  const etapes: { label: string; done: boolean }[] = [
    { label: 'Commande reçue',   done: true },
    { label: 'Acceptée',         done: ['acceptee', 'livree'].includes(commande.statut) },
    { label: 'En livraison',     done: commande.statut === 'livree' },
    { label: 'Livrée',           done: commande.statut === 'livree' },
  ];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-end" onClick={onClose}>
      <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26 }}
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-t-3xl w-full max-h-[88vh] overflow-hidden flex flex-col">
        <div className="flex justify-center pt-3 pb-1"><div className="w-12 h-1.5 rounded-full bg-gray-300" /></div>

        <div className="px-5 pb-4 flex items-center justify-between border-b border-gray-100">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">Détail de la commande</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${sc?.color}18`, color: sc?.color }}>
                {sc?.label}
              </span>
              <span className="text-xs text-gray-400">
                #CMD-{(commande.id?.slice(0, 8) ?? 'N/A').toUpperCase()}
              </span>
            </div>
          </div>
          <motion.button onClick={onClose} whileHover={{ rotate: 90 }} className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center">
            <X className="w-4 h-4 text-gray-600" />
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Produit + montant */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-2xl border border-blue-100 p-4 flex items-center gap-4">
            <div className="w-14 h-14 bg-white rounded-2xl overflow-hidden flex items-center justify-center shadow-sm flex-shrink-0">
              {produitImgDrawer ? (
                <img src={produitImgDrawer} alt={commande.produit} className="w-full h-full object-cover" />
              ) : (
                <Package className="w-7 h-7 text-blue-500" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-base truncate">{commande.produit}</p>
              <p className="text-sm text-gray-500">
                {Math.round(commande.quantite || 0).toLocaleString('fr-FR')} {commande.unite} ×{' '}
                {Math.round(commande.prixUnitaire || 0).toLocaleString('fr-FR')} FCFA
              </p>
              <p className="text-base font-black text-blue-700 mt-0.5">
                {totalMontant.toLocaleString('fr-FR')} FCFA
              </p>
            </div>
          </div>

          {/* Acheteur / Vendeur */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Acheteur', nom: commande.acheteurNom, type: 'Coopérative' as const },
              { label: 'Vendeur', nom: commande.vendeurNom, type: 'Producteur' as const },
            ].map((p) => (
              <div key={p.label} className="bg-gray-50 rounded-2xl border border-gray-100 p-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{p.label}</p>
                <p className="text-sm font-bold text-gray-800 truncate">{p.nom}</p>
                <p className="text-xs text-gray-500 capitalize">{p.type}</p>
              </div>
            ))}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Créée le', val: dateCreeAffichee },
              { label: 'Livraison prévue', val: dateLivAffichee },
            ].map((d) => (
              <div key={d.label} className="bg-gray-50 rounded-2xl border border-gray-100 p-3">
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">{d.label}</p>
                <p className="text-sm font-bold text-gray-800">{d.val}</p>
              </div>
            ))}
          </div>

          {/* Message négociation */}
          {commande.messageNegociation && (
            <div className="bg-purple-50 rounded-2xl border border-purple-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4 text-purple-600" />
                <p className="text-xs font-bold text-purple-600 uppercase">Message de négociation</p>
              </div>
              <p className="text-sm text-gray-700">{commande.messageNegociation}</p>
              {commande.prixNegocie && (
                <p className="text-sm font-bold text-purple-700 mt-1.5">
                  Prix proposé : {Math.round(commande.prixNegocie || 0).toLocaleString('fr-FR')} FCFA/
                  {commande.unite}
                </p>
              )}
            </div>
          )}

          {/* Suivi étapes */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase mb-3">Suivi de la commande</p>
            <div className="relative pl-8">
              <div className="absolute left-3.5 top-4 bottom-4 w-0.5 bg-gray-200" />
              <motion.div className="absolute left-3.5 top-4 w-0.5 bg-blue-500 origin-top"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: etapes.filter(e => e.done).length / etapes.length }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
                style={{ height: '100%' }} />
              <div className="space-y-4">
                {etapes.map((etape, i) => (
                  <motion.div key={etape.label}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.07 }}
                    className="flex items-center gap-3">
                    <div className={`absolute left-0 w-7 h-7 rounded-full flex items-center justify-center z-10 border-2 transition-all ${
                      etape.done ? 'bg-blue-500 border-blue-500' : 'bg-white border-gray-200'
                    }`}>
                      {etape.done ? <CheckCircle2 className="w-3.5 h-3.5 text-white" /> : <Clock className="w-3 h-3 text-gray-300" />}
                    </div>
                    <p className={`text-sm font-semibold ${etape.done ? 'text-gray-800' : 'text-gray-400'}`}>{etape.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 bg-white flex gap-3">
          {isPending && !readOnly ? (
            <>
              <motion.button onClick={onRefuser} whileTap={{ scale: 0.97 }}
                className="flex-1 py-3.5 rounded-2xl border-2 border-red-200 text-red-600 text-sm font-bold flex items-center justify-center gap-2">
                <XCircle className="w-4 h-4" /> Refuser
              </motion.button>
              <motion.button onClick={onAccepter} whileTap={{ scale: 0.97 }}
                className="flex-[2] py-3.5 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #2072AF, #1E5A8E)' }}>
                <CheckCircle className="w-4 h-4" /> Accepter
              </motion.button>
            </>
          ) : isPending && readOnly && onNegocier ? (
            <div className="w-full grid grid-cols-2 gap-3">
              <motion.button onClick={onClose} whileTap={{ scale: 0.97 }}
                className="w-full py-3.5 rounded-2xl border-2 border-gray-200 text-gray-600 text-sm font-bold">
                Fermer
              </motion.button>
              <motion.button onClick={onNegocier} whileTap={{ scale: 0.97 }}
                className="w-full py-3.5 rounded-2xl text-white text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' }}>
                Négocier
              </motion.button>
            </div>
          ) : commande.statut === 'livree' && (commande as CmdMarche & { statutPaiement?: string }).statutPaiement !== 'paye' && onCloturer ? (
            <div className="w-full grid grid-cols-2 gap-3">
              <motion.button onClick={onClose} whileTap={{ scale: 0.97 }}
                className="w-full py-3.5 rounded-2xl border-2 border-gray-200 text-gray-600 text-sm font-bold">
                Fermer
              </motion.button>
              <motion.button onClick={onCloturer} whileTap={{ scale: 0.97 }}
                className="w-full py-3.5 rounded-2xl text-white text-sm font-bold flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, #16A34A, #15803D)' }}>
                <Wallet className="w-4 h-4" /> Marquer comme payée
              </motion.button>
            </div>
          ) : (
            <motion.button onClick={onClose} whileTap={{ scale: 0.97 }}
              className="w-full py-3.5 rounded-2xl border-2 border-gray-200 text-gray-600 text-sm font-bold">
              Fermer
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
