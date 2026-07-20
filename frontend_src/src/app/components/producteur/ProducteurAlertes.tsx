/**
 * ProducteurAlertes — Tableau de bord des alertes agricoles temps-réel.
 * Connecté au ProducteurContext.
 */
import React, { useState } from 'react';
import { SubPageLayout } from '../layout/SubPageLayout';
import { motion, AnimatePresence } from 'motion/react';
import {
  AlertTriangle,
  Sprout,
  Package,
  CheckCircle,
  ChevronRight,
  Calendar,
  TrendingDown,
  Zap,
  RefreshCw,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { useProducteur } from '../../contexts/ProducteurContext';
import { useApp } from '../../contexts/AppContext';

const COLOR = '#2E8B57';

// ── Helpers ────────────────────────────────────────────────────

function joursAvant(date: Date) {
  return Math.floor(((date ? new Date(date).getTime() : Date.now()) - Date.now()) / 86400000);
}

function formatDate(date: Date) {
  return (date ? new Date(date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' }) : '');
}

// ── Types badge ────────────────────────────────────────────────

type Urgence = 'critique' | 'haute' | 'moyenne' | 'info';

const URGENCE_CONFIG: Record<Urgence, { bg: string; text: string; border: string; label: string }> = {
  critique: { bg: 'bg-red-50',    text: 'text-red-600',    border: 'border-red-300',    label: 'Critique' },
  haute:    { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-300', label: 'Urgent' },
  moyenne:  { bg: 'bg-amber-50',  text: 'text-amber-600',  border: 'border-amber-300',  label: 'Attention' },
  info:     { bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-300',   label: 'Info' },
};

// ── Carte alerte ────────────────────────────────────────────────

function AlerteCard({
  urgence,
  icon: Icon,
  title,
  subtitle,
  detail,
  actionLabel,
  onAction,
  onDismiss,
  index,
}: {
  urgence: Urgence;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  detail?: string;
  actionLabel?: string;
  onAction?: () => void;
  onDismiss?: () => void;
  index: number;
}) {
  const cfg = URGENCE_CONFIG[urgence];

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0, marginBottom: 0 }}
      transition={{ delay: index * 0.06, type: 'spring', stiffness: 280, damping: 26 }}
      layout
      className={`relative rounded-3xl border-2 p-4 overflow-hidden ${cfg.bg} ${cfg.border}`}
    >
      {/* Fond animé */}
      <motion.div
        className="absolute inset-0 opacity-5"
        animate={{ x: ['0%', '100%'] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
        style={{ background: 'linear-gradient(90deg, transparent, white, transparent)' }}
      />

      <div className="relative z-10 flex items-start gap-3">
        {/* Icône */}
        <motion.div
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 bg-white/70"
          animate={urgence === 'critique' ? { scale: [1, 1.12, 1] } : { scale: [1, 1.05, 1] }}
          transition={{ duration: urgence === 'critique' ? 1.5 : 3, repeat: Infinity }}
        >
          <Icon className={`w-5 h-5 ${cfg.text}`} strokeWidth={2.5} />
        </motion.div>

        {/* Contenu */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className={`font-bold ${cfg.text}`}>{title}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${cfg.text} bg-white/60`}>
              {URGENCE_CONFIG[urgence].label}
            </span>
          </div>
          <p className="text-sm text-gray-700">{subtitle}</p>
          {detail && <p className="text-xs text-gray-500 mt-1">{detail}</p>}

          {actionLabel && onAction && (
            <motion.button
              onClick={onAction}
              className={`mt-3 flex items-center gap-1 text-sm font-semibold ${cfg.text}`}
              whileTap={{ scale: 0.95 }}
            >
              {actionLabel}
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          )}
        </div>

        {/* Dismiss */}
        {onDismiss && (
          <motion.button
            onClick={onDismiss}
            className="w-7 h-7 rounded-full bg-white/60 flex items-center justify-center flex-shrink-0"
            whileTap={{ scale: 0.85 }}
          >
            <X className={`w-3.5 h-3.5 ${cfg.text}`} />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

// ── Écran vide ──────────────────────────────────────────────────

function EcranVide() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-20 px-8"
    >
      <motion.div
        className="w-24 h-24 rounded-full flex items-center justify-center mb-6"
        style={{ backgroundColor: `${COLOR}18` }}
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <CheckCircle className="w-12 h-12" style={{ color: COLOR }} />
      </motion.div>
      <h3 className="text-xl font-bold text-gray-900 mb-2">Tout va bien</h3>
      <p className="text-gray-500 text-center">
        Aucune alerte en ce moment. Continuez comme ça !
      </p>
    </motion.div>
  );
}

// ── Page principale ─────────────────────────────────────────────

export function ProducteurAlertes() {
  const navigate = useNavigate();
  const { speak } = useApp();
  const { cycles, recoltes, publications } = useProducteur();

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('julaba_producteur_alertes_dismissed');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });
  const dismiss = (id: string) => {
    setDismissedIds(prev => {
      const next = new Set([...prev, id]);
      try { localStorage.setItem('julaba_producteur_alertes_dismissed', JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  };

  // ── Construire liste d'alertes ──────────────────────────────

  type AlerteItem = {
    id: string;
    urgence: Urgence;
    icon: React.ElementType;
    title: string;
    subtitle: string;
    detail?: string;
    actionLabel?: string;
    onAction?: () => void;
  };

  const items: AlerteItem[] = [];

  // Récoltes proches — depuis cycles actifs
  cycles
    .filter(c => c.status === 'active')
    .forEach(c => {
      const j = joursAvant(c.dateRecolteEstimee);
      if (j > 7) return;
      const id = `recolte-${c.id}`;
      if (dismissedIds.has(id)) return;
      items.push({
        id,
        urgence: j <= 3 ? 'critique' : 'haute',
        icon: Sprout,
        title: j === 0 ? `Récolte de ${c.culture} aujourd'hui !` : `Récolte de ${c.culture} dans ${j} jour${j > 1 ? 's' : ''}`,
        subtitle: `Prévu le ${formatDate(c.dateRecolteEstimee)} · ${c.surface} ha`,
        detail: `${(c.quantiteEstimee || 0).toLocaleString()} kg estimés`,
        actionLabel: 'Voir la production',
        onAction: () => navigate('/producteur/production'),
      });
    });

  // Stocks faibles — récoltes avec quantite < 20% de la quantite initiale
  recoltes
    .filter(r => Number(r.quantite) >= 0 && Number(r.quantite) < 50)
    .forEach(r => {
      const id = `stock-${r.id}`;
      if (dismissedIds.has(id)) return;
      items.push({
        id,
        urgence: Number(r.quantite) === 0 ? 'critique' : 'moyenne',
        icon: Package,
        title: Number(r.quantite) === 0 ? 'Récolte épuisée' : `Stock bas — ${Number(r.quantite)} kg restants`,
        subtitle: `${r.produit} · ${Number(r.quantite)} kg disponibles`,
        detail: 'Publiez une nouvelle récolte ou ajustez vos prix',
        actionLabel: 'Gérer mes récoltes',
        onAction: () => navigate('/producteur/recoltes'),
      });
    });

  // Cycles agricoles sans récolte déclarée après la date estimée
  cycles.forEach(c => {
    if (c.status !== 'active') return;
    const j = joursAvant(c.dateRecolteEstimee);
    if (j < 0 && j > -30) {
      const id = `cycle-retard-${c.id}`;
      if (!dismissedIds.has(id)) {
        items.push({
          id,
          urgence: 'moyenne',
          icon: Calendar,
          title: `Récolte de ${c.culture} non déclarée`,
          subtitle: `Prévue le ${formatDate(c.dateRecolteEstimee)} — ${Math.abs(j)} jours de retard`,
          detail: 'Déclarez votre récolte pour activer vos ventes',
          actionLabel: 'Déclarer la récolte',
          onAction: () => navigate('/producteur/declarer-recolte'),
        });
      }
    }
  });

  // Offres sans acheteur depuis plus de 5 jours
  publications.forEach(p => {
    if (!p.active || p.statut !== 'disponible' || !p.datePublication) return;
    const joursPublié = Math.floor((Date.now() - new Date(p.datePublication).getTime()) / 86400000);
    if (joursPublié > 5 && p.quantiteDisponible > 0) {
      const cycle = cycles.find(c => c.id === p.cycleId);
      const id = `offre-inactive-${p.id}`;
      if (dismissedIds.has(id)) return;
      items.push({
        id,
        urgence: 'info',
        icon: TrendingDown,
        title: 'Offre sans acheteur depuis 5 jours',
        subtitle: `${cycle?.culture || p.culture || p.produit} · ${p.quantiteDisponible} ${p.unite} disponibles`,
        detail: 'Envisagez de baisser le prix ou de contacter des marchands',
        actionLabel: 'Modifier l\'offre',
        onAction: () => navigate('/producteur/recoltes'),
      });
    }
  });

  const visibles = items.filter(a => !dismissedIds.has(a.id));
  const count = visibles.length;

  // Compter par urgence
  const countCritique = visibles.filter(a => a.urgence === 'critique').length;
  const countHaute    = visibles.filter(a => a.urgence === 'haute').length;

  return (
    <SubPageLayout
      role="producteur"
      title="Alertes"
      subtitle={count === 0 ? 'Aucune alerte active' : `${count} alerte${count > 1 ? 's' : ''} active${count > 1 ? 's' : ''}`}
      rightContent={countCritique > 0 ? (
        <motion.div
          className="px-3 py-1.5 rounded-full bg-red-500 flex items-center gap-1.5"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Zap className="w-3.5 h-3.5 text-white" />
          <span className="text-white text-xs font-bold">{countCritique} critique{countCritique > 1 ? 's' : ''}</span>
        </motion.div>
      ) : undefined}
      headerChildren={count > 0 ? (
        <div className="flex gap-2">
          {[
            { label: 'Critique', val: countCritique, color: 'bg-red-500' },
            { label: 'Urgent',   val: countHaute,    color: 'bg-orange-500' },
            { label: 'Total',    val: count,         color: 'bg-white/30' },
          ].map(({ label, val, color }) => (
            <div key={label} className={`flex-1 ${color} rounded-xl px-2 py-1.5 text-center`}>
              <p className="text-white font-bold">{val}</p>
              <p className="text-white/80 text-xs">{label}</p>
            </div>
          ))}
        </div>
      ) : undefined}
    >
      <div className="pb-32 space-y-3">
        {count === 0 ? (
          <EcranVide />
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              {visibles.map((alerte, i) => (
                <AlerteCard
                  key={alerte.id}
                  {...alerte}
                  index={i}
                  onDismiss={['info', 'moyenne'].includes(alerte.urgence) ? () => dismiss(alerte.id) : undefined}
                  onAction={alerte.onAction}
                />
              ))}
            </AnimatePresence>

            {/* Actions globales */}
            {count > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="pt-2 flex gap-3"
              >
                <motion.button
                  onClick={() => {
                    const infos = visibles.filter(a => ['info', 'moyenne'].includes(a.urgence)).map(a => a.id);
                    setDismissedIds(prev => {
                      const next = new Set([...prev, ...infos]);
                      try { localStorage.setItem('julaba_producteur_alertes_dismissed', JSON.stringify([...next])); } catch { /* ignore */ }
                      return next;
                    });
                    void speak('Alertes basses ignorées');
                  }}
                  className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold flex items-center justify-center gap-2"
                  whileTap={{ scale: 0.97 }}
                >
                  <X className="w-4 h-4" />
                  Ignorer les infos
                </motion.button>
                <motion.button
                  onClick={() => navigate('/producteur/production')}
                  className="flex-1 py-3 rounded-2xl text-white font-semibold flex items-center justify-center gap-2"
                  style={{ backgroundColor: COLOR }}
                  whileTap={{ scale: 0.97 }}
                >
                  <RefreshCw className="w-4 h-4" />
                  Voir production
                </motion.button>
              </motion.div>
            )}
          </>
        )}
      </div>
    </SubPageLayout>
  );
}