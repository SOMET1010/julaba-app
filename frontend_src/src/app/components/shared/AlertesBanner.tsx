/**
 * AlertesBanner — Bandeau d'alertes animé, réutilisable par rôle.
 * Affiche un carrousel auto-scroll des alertes critiques avec animations.
 */
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  Package,
  Sprout,
  Clock,
  ChevronRight,
  X,
  Bell,
} from 'lucide-react';
import { useNavigate } from 'react-router';

// ── Types ──────────────────────────────────────────────────────

export interface Alerte {
  id: string;
  type: 'stock_faible' | 'recolte_proche' | 'commande_retard' | 'paiement_attente' | 'generique';
  label: string;
  detail: string;
  color: string;        // bg color
  textColor: string;    // text / icon color
  actionPath?: string;  // route vers laquelle naviguer
  actionLabel?: string;
}

interface AlertesBannerProps {
  alertes: Alerte[];
  role?: string;
  compact?: boolean; // Version compacte (1 ligne)
}

const ICON_MAP: Record<Alerte['type'], React.ElementType> = {
  stock_faible:     Package,
  recolte_proche:   Sprout,
  commande_retard:  Clock,
  paiement_attente: Bell,
  generique:        AlertTriangle,
};

// ── Composant ──────────────────────────────────────────────────

export function AlertesBanner({ alertes, role, compact = false }: AlertesBannerProps) {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const visible = alertes.filter(a => !dismissed.has(a.id));

  // Auto-scroll entre les alertes
  useEffect(() => {
    if (visible.length <= 1) return;
    timerRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % visible.length);
    }, 3500);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [visible.length]);

  // Réinitialiser l'index si on dépasse
  useEffect(() => {
    if (current >= visible.length && visible.length > 0) {
      setCurrent(0);
    }
  }, [visible.length, current]);

  if (visible.length === 0) return null;

  const alerte = visible[Math.min(current, visible.length - 1)];
  const Icon = ICON_MAP[alerte.type];

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newDismissed = new Set(dismissed);
    newDismissed.add(alerte.id);
    setDismissed(newDismissed);
    if (current >= visible.length - 1) setCurrent(0);
  };

  const handleAction = () => {
    if (alerte.actionPath) navigate(alerte.actionPath);
  };

  if (compact) {
    return (
      <motion.div
        key={alerte.id}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        onClick={handleAction}
        className="flex items-center gap-2 px-3 py-2 rounded-2xl cursor-pointer border-2"
        style={{ backgroundColor: alerte.color + '18', borderColor: alerte.color + '40' }}
      >
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Icon className="w-4 h-4 flex-shrink-0" style={{ color: alerte.textColor }} />
        </motion.div>
        <span className="text-xs font-semibold truncate" style={{ color: alerte.textColor }}>
          {alerte.label}
        </span>
        {visible.length > 1 && (
          <span className="text-xs font-bold px-1.5 py-0.5 rounded-full text-white"
            style={{ backgroundColor: alerte.textColor }}>
            {visible.length}
          </span>
        )}
      </motion.div>
    );
  }

  return (
    <div className="relative overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={alerte.id}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
          onClick={handleAction}
          className="relative flex items-center gap-3 px-4 py-3 rounded-2xl border-2 cursor-pointer overflow-hidden"
          style={{ backgroundColor: alerte.color + '15', borderColor: alerte.color + '50' }}
        >
          {/* Fond animé */}
          <motion.div
            className="absolute inset-0 opacity-10"
            animate={{ x: ['0%', '100%'] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
            style={{ background: `linear-gradient(90deg, transparent, ${alerte.color}, transparent)` }}
          />

          {/* Icône pulsante */}
          <motion.div
            className="relative flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: alerte.color + '25' }}
            animate={{ scale: [1, 1.12, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <Icon className="w-5 h-5" style={{ color: alerte.textColor }} strokeWidth={2.5} />
          </motion.div>

          {/* Texte */}
          <div className="flex-1 min-w-0 relative z-10">
            <p className="font-bold text-sm leading-tight" style={{ color: alerte.textColor }}>
              {alerte.label}
            </p>
            <p className="text-xs text-gray-600 mt-0.5 truncate">{alerte.detail}</p>
          </div>

          {/* Action + dismiss */}
          <div className="flex items-center gap-1 flex-shrink-0 relative z-10">
            {alerte.actionLabel && (
              <div className="flex items-center gap-0.5" style={{ color: alerte.textColor }}>
                <span className="text-xs font-semibold">{alerte.actionLabel}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </div>
            )}
            <motion.button
              onClick={handleDismiss}
              className="w-6 h-6 rounded-full flex items-center justify-center ml-1"
              style={{ backgroundColor: alerte.color + '30' }}
              whileTap={{ scale: 0.85 }}
            >
              <X className="w-3.5 h-3.5" style={{ color: alerte.textColor }} />
            </motion.button>
          </div>

          {/* Indicateurs de pagination */}
          {visible.length > 1 && (
            <div className="absolute bottom-1.5 right-10 flex gap-1">
              {visible.map((_, i) => (
                <motion.div
                  key={i}
                  className="rounded-full"
                  style={{ backgroundColor: alerte.textColor }}
                  animate={{ width: i === current ? 14 : 5, height: 5, opacity: i === current ? 1 : 0.3 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                />
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Helpers pour construire les alertes par rôle ───────────────

export function buildAlertesProducteur(alertes?: {
  recoltesProches: { id: string; culture: string; dateRecolteEstimee: Date }[];
  stocksFaibles: { id: string; cycleId: string; quantiteReelle: number; stockDisponible: number }[];
  commandesRetard: { id: string }[];
  paiementsAttente: { id: string }[];
}): Alerte[] {
  const result: Alerte[] = [];

  if (!alertes) return result;

  alertes.recoltesProches?.forEach(c => {
    const jours = Math.floor(((c.dateRecolteEstimee ? new Date(c.dateRecolteEstimee).getTime() : Date.now()) - Date.now()) / 86400000);
    result.push({
      id: `recolte-${c.id}`,
      type: 'recolte_proche',
      label: `Récolte de ${c.culture} dans ${jours} jour${jours > 1 ? 's' : ''}`,
      detail: 'Préparez votre équipement et vos acheteurs',
      color: '#16A34A',
      textColor: '#15803D',
      actionPath: '/producteur/production',
      actionLabel: 'Voir',
    });
  });

  alertes.stocksFaibles?.forEach(r => {
    const pct = Math.round((r.stockDisponible / r.quantiteReelle) * 100);
    result.push({
      id: `stock-faible-${r.id}`,
      type: 'stock_faible',
      label: `Stock bas — ${pct}% restant`,
      detail: `${r.stockDisponible} kg disponibles sur ${r.quantiteReelle} kg`,
      color: '#F59E0B',
      textColor: '#B45309',
      actionPath: '/producteur/recoltes',
      actionLabel: 'Publier',
    });
  });

  if (alertes.commandesRetard && alertes.commandesRetard.length > 0) {
    result.push({
      id: 'commandes-retard',
      type: 'commande_retard',
      label: `${alertes.commandesRetard.length} commande(s) en retard`,
      detail: 'Des acheteurs attendent votre livraison',
      color: '#EF4444',
      textColor: '#DC2626',
      actionPath: '/producteur/commandes',
      actionLabel: 'Traiter',
    });
  }

  if (alertes.paiementsAttente && alertes.paiementsAttente.length > 0) {
    result.push({
      id: 'paiements-attente',
      type: 'paiement_attente',
      label: `${alertes.paiementsAttente.length} paiement(s) en attente`,
      detail: 'Confirmez la réception des paiements',
      color: '#8B5CF6',
      textColor: '#7C3AED',
      actionPath: '/producteur/commandes',
      actionLabel: 'Voir',
    });
  }

  return result;
}

export function buildAlertesMarchand(stockFaible: { id: string; name: string; quantity: number; unit: string; seuilAlerte: number }[]): Alerte[] {
  if (stockFaible.length === 0) return [];

  const critiques = stockFaible.filter(s => s.quantity === 0);
  const basNonVides = stockFaible.filter(s => s.quantity > 0);

  const result: Alerte[] = [];

  if (critiques.length > 0) {
    result.push({
      id: 'stock-rupture',
      type: 'stock_faible',
      label: `${critiques.length} produit(s) en rupture`,
      detail: critiques.map(s => s.name).slice(0, 3).join(', '),
      color: '#EF4444',
      textColor: '#DC2626',
      actionPath: '/marchand/stock',
      actionLabel: 'Réappro',
    });
  }

  if (basNonVides.length > 0) {
    result.push({
      id: 'stock-bas',
      type: 'stock_faible',
      label: `${basNonVides.length} stock(s) faible(s)`,
      detail: basNonVides.map(s => `${s.name} (${s.quantity} ${s.unit})`).slice(0, 2).join(', '),
      color: '#F59E0B',
      textColor: '#B45309',
      actionPath: '/marchand/stock',
      actionLabel: 'Voir',
    });
  }

  return result;
}

// ── Alertes Coopérative ────────────────────────────────────────

export function buildAlertesCooperative(data?: {
  membresInactifs: { id: string; nom: string; prenom: string }[];
  cotisationsImpayees: { id: string; nom: string; prenom: string }[];
  commandesEnCours: number;
  solde: number;
  seuilSoldeBas?: number; // défaut 50000 FCFA
}): Alerte[] {
  const result: Alerte[] = [];
  
  if (!data) return result;
  
  const seuil = data.seuilSoldeBas ?? 50000;

  if (data.cotisationsImpayees && data.cotisationsImpayees.length > 0) {
    result.push({
      id: 'cotisations-impayees',
      type: 'paiement_attente',
      label: `${data.cotisationsImpayees.length} cotisation(s) non payée(s)`,
      detail: data.cotisationsImpayees.map(m => `${m.prenom} ${m.nom}`).slice(0, 2).join(', '),
      color: '#8B5CF6',
      textColor: '#7C3AED',
      actionPath: '/cooperative/membres',
      actionLabel: 'Voir',
    });
  }

  if (data.membresInactifs && data.membresInactifs.length > 0) {
    result.push({
      id: 'membres-inactifs',
      type: 'generique',
      label: `${data.membresInactifs.length} membre(s) inactif(s)`,
      detail: 'Ces membres n\'ont pas de production active',
      color: '#6B7280',
      textColor: '#374151',
      actionPath: '/cooperative/membres',
      actionLabel: 'Relancer',
    });
  }

  if (data.commandesEnCours > 0) {
    result.push({
      id: 'commandes-en-cours',
      type: 'commande_retard',
      label: `${data.commandesEnCours} commande(s) groupée(s) en cours`,
      detail: 'Suivi de livraison requis',
      color: '#F59E0B',
      textColor: '#B45309',
      actionPath: '/cooperative/commandes',
      actionLabel: 'Suivre',
    });
  }

  if (data.solde < seuil && data.solde >= 0) {
    result.push({
      id: 'tresorerie-basse',
      type: 'stock_faible',
      label: `Trésorerie basse — ${(data.solde || 0).toLocaleString()} FCFA`,
      detail: 'Pensez à collecter les cotisations dues',
      color: '#EF4444',
      textColor: '#DC2626',
      actionPath: '/cooperative/tresorerie',
      actionLabel: 'Voir',
    });
  }

  return result;
}