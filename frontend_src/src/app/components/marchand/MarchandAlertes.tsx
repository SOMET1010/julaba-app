/**
 * MarchandAlertes — Tableau de bord des alertes temps-réel du Marchand.
 * Connecté au StockContext + AppContext.
 */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Package,
  Clock,
  Bell,
  CheckCircle,
  ChevronRight,
  TrendingDown,
  Zap,
  RefreshCw,
  X,
  ShoppingCart,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';
import { useNavigate } from 'react-router';
import { SubPageLayout } from '../layout/SubPageLayout';
import { useStock } from '../../contexts/StockContext';
import { useApp } from '../../contexts/AppContext';

const COLOR = '#E67E22'; // couleur marchand orange

// ── Types ────────────────────────────────────────────────────────

type Urgence = 'critique' | 'haute' | 'moyenne' | 'info';

const URGENCE_CONFIG: Record<Urgence, { bg: string; text: string; border: string; label: string }> = {
  critique: { bg: 'bg-red-50',    text: 'text-red-600',    border: 'border-red-300',    label: 'Critique' },
  haute:    { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-300', label: 'Urgent' },
  moyenne:  { bg: 'bg-amber-50',  text: 'text-amber-600',  border: 'border-amber-300',  label: 'Attention' },
  info:     { bg: 'bg-blue-50',   text: 'text-blue-600',   border: 'border-blue-300',   label: 'Info' },
};

// ── Carte alerte ─────────────────────────────────────────────────

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

// ── Écran vide ────────────────────────────────────────────────────

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
        Aucune alerte en ce moment. Votre stock est bien garni !
      </p>
    </motion.div>
  );
}

// ── Page principale ───────────────────────────────────────────────

export function MarchandAlertes() {
  const navigate = useNavigate();
  const { speak, currentSession } = useApp();
  const { stock, getStockFaible, getValeurTotaleStock } = useStock();

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('julaba_alertes_dismissed');
      return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
    } catch { return new Set(); }
  });
  const dismiss = (id: string) => {
    setDismissedIds(prev => {
      const next = new Set([...prev, id]);
      try { localStorage.setItem('julaba_alertes_dismissed', JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  };

  // ── Construire la liste d'alertes ─────────────────────────────

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
  const stockFaible = getStockFaible();

  // Produits en rupture (quantité = 0)
  const ruptures = stockFaible.filter(s => s.quantite === 0);
  ruptures.forEach(s => {
    items.push({
      id: `rupture-${s.id}`,
      urgence: 'critique',
      icon: Package,
      title: `${s.produit} — Rupture de stock`,
      subtitle: 'Ce produit n\'est plus disponible à la vente',
      detail: 'Réapprovisionnez rapidement pour ne pas perdre de ventes',
      actionLabel: 'Réapprovisionner',
      onAction: () => navigate('/marchand/stock'),
    });
  });

  // Produits à stock bas (quantité > 0 mais sous le seuil par défaut = 5)
  const SEUIL_DEFAUT = 5;
  const basMaisNonVides = stockFaible.filter(s => s.quantite > 0);
  basMaisNonVides.forEach(s => {
    const pct = Math.round((s.quantite / SEUIL_DEFAUT) * 100);
    items.push({
      id: `stock-bas-${s.id}`,
      urgence: pct < 50 ? 'haute' : 'moyenne',
      icon: TrendingDown,
      title: `${s.produit} — Stock faible`,
      subtitle: `${s.quantite} ${s.unite} restant(s) · seuil : ${SEUIL_DEFAUT} ${s.unite}`,
      detail: 'Pensez à commander avant la rupture',
      actionLabel: 'Voir le stock',
      onAction: () => navigate('/marchand/stock'),
    });
  });

  // Journée non ouverte
  if (!currentSession?.opened) {
    items.push({
      id: 'journee-fermee',
      urgence: 'haute',
      icon: Clock,
      title: 'Journée non ouverte',
      subtitle: 'Votre caisse n\'est pas encore activée',
      detail: 'Ouvrez votre journée pour commencer à enregistrer des ventes',
      actionLabel: 'Ouvrir la journée',
      onAction: () => navigate('/marchand'),
    });
  }

  // Valeur stock élevée (> 500 000 FCFA) — info de gestion
  const valeurStock = getValeurTotaleStock();
  if (valeurStock > 500000) {
    items.push({
      id: 'stock-valeur-elevee',
      urgence: 'info',
      icon: DollarSign,
      title: 'Valeur stock importante',
      subtitle: `${(valeurStock || 0).toLocaleString()} FCFA de stock en cours`,
      detail: 'Assurez-vous que vos produits sont bien sécurisés',
      actionLabel: 'Voir le détail',
      onAction: () => navigate('/marchand/stock'),
    });
  }

  // Trop de produits différents (> 8) sans vente — conseils
  const produitsSansVente = stock.filter(s => s.quantite > SEUIL_DEFAUT * 3);
  if (produitsSansVente.length > 0) {
    items.push({
      id: 'surstock',
      urgence: 'info',
      icon: ShoppingCart,
      title: `${produitsSansVente.length} produit(s) en surstock`,
      subtitle: 'Certains stocks sont 3x au-dessus du seuil normal',
      detail: 'Envisagez des promotions pour écouler ces stocks',
      actionLabel: 'Voir le marché',
      onAction: () => navigate('/marchand/marche'),
    });
  }

  const visibles = items.filter(a => !dismissedIds.has(a.id));
  const count = visibles.length;
  const countCritique = visibles.filter(a => a.urgence === 'critique').length;
  const countHaute    = visibles.filter(a => a.urgence === 'haute').length;

  // Trier par urgence
  const ORDER: Record<Urgence, number> = { critique: 0, haute: 1, moyenne: 2, info: 3 };
  const sorted = [...visibles].sort((a, b) => ORDER[a.urgence] - ORDER[b.urgence]);

  return (
    <SubPageLayout
      role="marchand"
      title="Alertes"
      subtitle={count === 0 ? 'Aucune alerte active' : `${count} alerte${count > 1 ? 's' : ''} active${count > 1 ? 's' : ''}`}
      rightContent={countCritique > 0 ? (
        <motion.div
          className="px-3 py-1.5 rounded-full bg-red-500 flex items-center gap-1.5"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Zap className="w-3.5 h-3.5 text-white" />
          <span className="text-white font-bold text-sm">{countCritique}</span>
        </motion.div>
      ) : undefined}
      headerChildren={count > 0 ? (
        <div className="flex gap-2 flex-wrap">
          {countCritique > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-500/30">
              <span className="text-xs font-semibold text-white">{countCritique} critique{countCritique > 1 ? 's' : ''}</span>
            </div>
          )}
          {countHaute > 0 && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-400/30">
              <span className="text-xs font-semibold text-white">{countHaute} urgent{countHaute > 1 ? 's' : ''}</span>
            </div>
          )}
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/20">
            <span className="text-xs font-semibold text-white">{count} au total</span>
          </div>
        </div>
      ) : undefined}
    >
      <div className="pb-10 space-y-3">

        {/* Bouton rafraîchir */}
        <div className="flex justify-end mb-1">
          <motion.button
            onClick={() => {
              setDismissedIds(new Set());
              try { localStorage.removeItem('julaba_alertes_dismissed'); } catch { /* ignore */ }
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 px-3 py-1.5 rounded-xl bg-white border-2 border-gray-100"
            whileTap={{ scale: 0.93 }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Rafraîchir
          </motion.button>
        </div>

        {/* Alertes ou écran vide */}
        <AnimatePresence mode="popLayout">
          {sorted.length === 0 ? (
            <EcranVide key="vide" />
          ) : (
            sorted.map((item, i) => (
              <AlerteCard
                key={item.id}
                urgence={item.urgence}
                icon={item.icon}
                title={item.title}
                subtitle={item.subtitle}
                detail={item.detail}
                actionLabel={item.actionLabel}
                onAction={item.onAction}
                onDismiss={() => dismiss(item.id)}
                index={i}
              />
            ))
          )}
        </AnimatePresence>

        {/* Footer conseil */}
        {count > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 p-4 rounded-3xl bg-white border-2 border-gray-100 flex items-start gap-3"
          >
            <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${COLOR}18` }}>
              <AlertTriangle className="w-5 h-5" style={{ color: COLOR }} />
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm">Conseil Tata Lou</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Traitez d'abord les alertes critiques pour éviter les pertes de ventes. 
                Un stock bien géré, c'est un marchand prospère !
              </p>
              <motion.button
                onClick={() => {
                  const texte =
                    "Traitez d'abord les alertes critiques pour éviter les pertes de ventes. Un stock bien géré, c'est un marchand prospère !";
                  speak(texte);
                }}
                className="mt-2 flex items-center gap-1 text-xs font-semibold"
                style={{ color: COLOR }}
                whileTap={{ scale: 0.95 }}
              >
                <Bell className="w-3.5 h-3.5" />
                Écouter le conseil
              </motion.button>
            </div>
          </motion.div>
        )}
      </div>
    </SubPageLayout>
  );
}