import { motion } from 'motion/react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { AnimatedChart } from '../ui/AnimatedChart';
import { GraphiqueIndisponible } from './GraphiqueIndisponible';
import { type EtatLecture } from '../../services/etatLectureBO';
import {
  RAISON_HISTORIQUE_ABSENT, RAISON_REGIONS_ABSENTES, type DashboardInstitution, type PartRole,
} from '../../services/accueilInstitution';

/** Pourquoi la répartition par rôle manque, ou `null` si elle a été lue. */
function raisonRepartition(lecture: EtatLecture<DashboardInstitution>): string | null {
  if (lecture.type === 'indisponible') return lecture.raison;
  if (lecture.type === 'lue' && lecture.valeur.dataRepartition.length === 0) return 'aucune répartition renvoyée par le serveur';
  return null;
}

function Repartition({ parts }: { parts: readonly PartRole[] }) {
  return (
    <div className="flex items-center gap-4">
      <ResponsiveContainer width="50%" height={160}>
        <PieChart>
          <Pie data={[...parts]} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value"
            animationBegin={500} animationDuration={1500} animationEasing="ease-out">
            {parts.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
          </Pie>
          <Tooltip formatter={(v: number) => [v.toLocaleString('fr-FR'), '']} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex-1 space-y-2">
        {parts.map((d, i) => (
          <motion.div key={d.name} className="flex items-center gap-2"
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 + i * 0.1 }}>
            <motion.div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }}
              animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }} />
            <span className="text-sm text-gray-700 flex-1">{d.name}</span>
            <span className="text-sm font-bold text-gray-900">{d.value.toLocaleString('fr-FR')}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/**
 * Les graphiques de l'accueil. Seule la répartition par rôle a une source
 * (GET /institution/dashboard) ; l'évolution mensuelle, la valeur et les
 * régions n'en ont pas : ils disent « Indisponible » au lieu d'une courbe.
 */
export function AccueilInstitutionGraphiques({ lecture }: { lecture: EtatLecture<DashboardInstitution> }) {
  const raison = raisonRepartition(lecture);
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="space-y-5 mb-6">
      <AnimatedChart title="Évolution mensuelle des transactions" subtitle="Progression du volume d'activité" delay={300}>
        <GraphiqueIndisponible raison={RAISON_HISTORIQUE_ABSENT} hauteur={180} />
      </AnimatedChart>

      <AnimatedChart title="Répartition acteurs par type" subtitle="Distribution des rôles sur la plateforme" delay={350}>
        {raison !== null && <GraphiqueIndisponible raison={raison} hauteur={160} />}
        {raison === null && lecture.type === 'lue' && <Repartition parts={lecture.valeur.dataRepartition} />}
      </AnimatedChart>

      <AnimatedChart title="Activité par région" subtitle="Répartition géographique des acteurs" delay={400}>
        <GraphiqueIndisponible raison={RAISON_REGIONS_ABSENTES} hauteur={180} />
      </AnimatedChart>

      <AnimatedChart title="Courbe adoption plateforme" subtitle="Évolution de la valeur monétaire" delay={450}>
        <GraphiqueIndisponible raison={RAISON_HISTORIQUE_ABSENT} hauteur={160} />
      </AnimatedChart>
    </motion.div>
  );
}
