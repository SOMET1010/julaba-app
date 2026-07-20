// ═══════════════════════════════════════════════════════════════════════════════
//  ProductionKPIBar — KPIs pour la page Production (Producteur)
//  Utilise le composant universel UniversalKPI
// ═══════════════════════════════════════════════════════════════════════════════
import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Package, TrendingUp, Banknote, ShoppingBag,
  AlertCircle, Layers, CheckCircle, Sprout, Clock, Map,
} from 'lucide-react';
import { useProducteur } from '../../contexts/ProducteurContext';
import { useCommande } from '../../contexts/CommandeContext';
import { useApp } from '../../contexts/AppContext';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';

function fmt(n: number): string {
  return (n || 0).toLocaleString('fr-FR');
}

interface Props {
  activeTab: 'cycles' | 'recoltes' | 'publications' | 'historique';
  historiqueTab?: 'ventes' | 'saisons';
  onKPIClick?: (filter: string) => void;
}

export function ProductionKPIBar({ activeTab, historiqueTab = 'ventes', onKPIClick }: Props) {
  const { stats, cycles: rawCycles, recoltes: rawRecoltes } = useProducteur();
  const { commandes: allCommandes } = useCommande();
  const { user } = useApp();
  const cycles: any[] = rawCycles || [];
  const recoltes: any[] = rawRecoltes || [];
  const commandes: any[] = (allCommandes || []).filter((c: any) => c.vendeurId === user?.id);

  // KPIs Ma Plantation
  const cyclesActifs = cycles.filter(c => c.status === 'active').length;
  const superficieTotale = cycles.filter(c => c.status === 'active').reduce((s: number, c: any) => s + (c.surface || 0), 0);
  const recoltesProches = cycles.filter(c => {
    if (c.status !== 'active') return false;
    const days = Math.floor(((c.dateRecolteEstimee ? new Date(c.dateRecolteEstimee).getTime() : Date.now()) - Date.now()) / (1000 * 60 * 60 * 24));
    return days <= 14;
  }).length;
  const cyclesTermines = cycles.filter(c => c.status === 'completed').length;

  // KPIs Mes Recoltes
  const totalRecolte = recoltes.reduce((s: number, r: any) => s + (Number(r.quantite) || Number(r.quantiteReelle) || 0), 0);
  const totalDispo = recoltes.reduce((s: number, r: any) => s + (Number(r.quantite) || Number(r.stockDisponible) || 0), 0);
  const valeurStock = recoltes.reduce((s: number, r: any) => s + (Number(r.quantite) || 0) * (Number(r.prixUnitaire) || 0), 0);
  const nbPubliees = recoltes.filter((r: any) => r.statut === 'declaree' || r.statut === 'validee' || r.status === 'published').length;

  // KPIs Mon Marche
  const cmdActives = commandes.filter((c: any) => ['new', 'accepted', 'preparing'].includes(c.status)).length;
  const cmdUrgentes = commandes.filter((c: any) => c.status === 'new').length;
  const revenuTotal = recoltes.reduce((s: number, r: any) => s + (Number(r.stockVendu) || 0) * (Number(r.prixUnitaire) || 0), 0);
  const cmdLivrees = commandes.filter((c: any) => c.status === 'delivered').length;

  const kpisMap: Record<string, any[]> = {
    cycles: [
      { label: 'Plantations actives', animatedTarget: cyclesActifs, icon: Sprout, color: '#2E8B57', iconAnimation: 'float' as const },
      { label: 'Superficie', value: `${superficieTotale.toFixed(1)}`, suffix: 'ha', icon: Map, color: '#3b82f6', iconAnimation: 'bounce' as const },
      { label: 'Recoltes proches', animatedTarget: recoltesProches, icon: Clock, color: '#f97316', iconAnimation: recoltesProches > 0 ? 'pulse' as const : 'none' as const },
      { label: 'Plantations terminées', animatedTarget: cyclesTermines, icon: CheckCircle, color: '#10b981', iconAnimation: 'float' as const },
    ],
    recoltes: [
      { label: 'Total recolte', value: fmt(totalRecolte), suffix: 'kg', icon: Layers, color: '#2E8B57', iconAnimation: 'float' as const },
      { label: 'En stock', value: fmt(totalDispo), suffix: 'kg', icon: Package, color: '#3b82f6', iconAnimation: 'bounce' as const },
      { label: 'Valeur stock', value: fmt(valeurStock), suffix: 'FCFA', icon: Banknote, color: '#8b5cf6', iconAnimation: 'float' as const },
      { label: 'Publiees', animatedTarget: nbPubliees, icon: TrendingUp, color: '#f59e0b', iconAnimation: 'spin' as const },
    ],
    publications: [
      { label: 'Commandes', animatedTarget: cmdActives, icon: ShoppingBag, color: '#3b82f6', iconAnimation: 'bounce' as const },
      { label: 'Urgentes', animatedTarget: cmdUrgentes, icon: AlertCircle, color: '#f97316', iconAnimation: cmdUrgentes > 0 ? 'pulse' as const : 'none' as const },
      { label: 'Revenus', value: fmt(revenuTotal), suffix: 'FCFA', icon: TrendingUp, color: '#2E8B57', iconAnimation: 'float' as const },
      { label: 'Livrees', animatedTarget: cmdLivrees, icon: CheckCircle, color: '#10b981', iconAnimation: 'float' as const },
    ],
    historique: historiqueTab === 'ventes' ? [
      { label: 'Transactions', animatedTarget: commandes.length, icon: ShoppingBag, color: '#2E8B57', iconAnimation: 'bounce' as const },
      { label: 'Livrées', animatedTarget: commandes.filter((c: any) => c.statut === 'livree' || c.status === 'delivered').length, icon: CheckCircle, color: '#10b981', iconAnimation: 'float' as const },
      { label: 'Revenus', value: fmt(commandes.reduce((s: number, c: any) => s + (Number(c.total) || Number(c.montantTotal) || 0), 0)), suffix: 'FCFA', icon: Banknote, color: '#f59e0b', iconAnimation: 'float' as const },
      { label: 'En attente', animatedTarget: commandes.filter((c: any) => c.statut === 'en_attente' || c.status === 'new').length, icon: Clock, color: '#f97316', iconAnimation: 'pulse' as const },
    ] : [
      { label: 'Saisons terminées', animatedTarget: cycles.filter((c: any) => c.status === 'completed').length, icon: CheckCircle, color: '#2E8B57', iconAnimation: 'float' as const },
      { label: 'Superficie totale', value: `${cycles.filter((c: any) => c.status === 'completed').reduce((s: number, c: any) => s + (c.surface || 0), 0).toFixed(1)}`, suffix: 'ha', icon: Map, color: '#3b82f6', iconAnimation: 'bounce' as const },
      { label: 'Récoltes totales', value: fmt(recoltes.reduce((s: number, r: any) => s + (Number(r.quantite) || 0), 0)), suffix: 'kg', icon: Layers, color: '#8b5cf6', iconAnimation: 'float' as const },
      { label: 'Revenus saisons', value: fmt(recoltes.reduce((s: number, r: any) => s + (Number(r.quantite) || 0) * (Number(r.prixUnitaire) || 0), 0)), suffix: 'FCFA', icon: Banknote, color: '#f59e0b', iconAnimation: 'float' as const },
    ],
  };

  const kpis = kpisMap[activeTab] ?? [];

  if (kpis.length === 0) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      >
        <KPIGrid cols={2}>
          {kpis.map((kpi, i) => (
            <UniversalKPI
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              animatedTarget={kpi.animatedTarget}
              suffix={kpi.suffix}
              icon={kpi.icon}
              color={kpi.color}
              iconAnimation={kpi.iconAnimation}
              onClick={onKPIClick ? () => onKPIClick(kpi.label) : undefined}
              delay={i * 0.05}
            />
          ))}
        </KPIGrid>
      </motion.div>
    </AnimatePresence>
  );
}