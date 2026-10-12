import React from 'react';
import { motion } from 'motion/react';
import {
  Users, TrendingUp, AlertTriangle, CheckCircle, XCircle, Activity,
  BarChart3, UserPlus, Wifi, Heart, Globe, Shield,
} from 'lucide-react';
import { ROLE_COLORS } from '../../config/roleConfig';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import {
  kpiDepuis, kpiTuile, texteDuKpi, type EtatLecture,
} from '../../services/etatLectureBO';
import { dateDuJour, type DashboardInstitution } from '../../services/accueilInstitution';

type Mesure = (d: DashboardInstitution) => number | null;

/** `null / 1e9` vaut 0 en JavaScript : un montant illisible deviendrait un zéro. */
function enMilliards(v: number | null): number {
  return typeof v === 'number' ? v / 1_000_000_000 : Number.NaN;
}

/** Les neuf indicateurs macro. Chaque chiffre vient de la réponse du serveur,
 *  par `kpiDepuis` : sans lecture, la tuile dit « Lecture… » ou « Indisponible ». */
const TUILES_MACRO: ReadonlyArray<{
  label: string; icon: React.ElementType; color: string; mesure: Mesure; prefix?: string; suffix?: string;
}> = [
  { label: 'Acteurs actifs', icon: Users, color: '#3B82F6', mesure: d => d.macroKPIs.acteursActifs },
  { label: 'Total acteurs', icon: Users, color: '#A855F7', mesure: d => d.macroKPIs.totalActeurs },
  { label: 'Suspendus', icon: XCircle, color: '#EF4444', mesure: d => d.macroKPIs.acteursSuspendus },
  { label: 'Transactions', icon: Activity, color: '#10B981', mesure: d => d.macroKPIs.volumeTransactions },
  { label: 'Valeur (Mds FCFA)', icon: TrendingUp, color: '#059669', mesure: d => enMilliards(d.macroKPIs.valeurMonetaire) },
  { label: 'Digitalisation', icon: Wifi, color: '#06B6D4', mesure: d => d.macroKPIs.pctDigitalisation, suffix: '%' },
  { label: 'Inclusion CNPS', icon: Shield, color: '#F97316', mesure: d => d.macroKPIs.pctInclusionCNPS, suffix: '%' },
  { label: 'Inclusion CNAM', icon: Heart, color: '#EC4899', mesure: d => d.macroKPIs.pctInclusionCNAM, suffix: '%' },
  { label: 'Croissance mois', icon: TrendingUp, color: '#14B8A6', mesure: d => d.macroKPIs.croissanceMensuelle, prefix: '+', suffix: '%' },
];

type Anim = { animate: Record<string, number[]>; transition: Record<string, unknown> };
const BOUCLE = { repeat: Infinity };

const TUILES_JOUR: ReadonlyArray<{
  label: string; icon: React.ElementType; texte: string; bord: string; mesure: Mesure; anim: Anim;
}> = [
  { label: 'Nouveaux inscrits', icon: UserPlus, texte: 'text-blue-600', bord: 'border-blue-100', mesure: d => d.resumeJour.nouveauxInscrits,
    anim: { animate: { scale: [1, 1.1, 1] }, transition: { duration: 2, ...BOUCLE } } },
  { label: 'Dossiers validés', icon: CheckCircle, texte: 'text-green-600', bord: 'border-green-100', mesure: d => d.resumeJour.dossiersValides,
    anim: { animate: { rotate: [0, 360] }, transition: { duration: 3, ease: 'linear', ...BOUCLE } } },
  { label: 'Dossiers rejetés', icon: XCircle, texte: 'text-red-600', bord: 'border-red-100', mesure: d => d.resumeJour.dossiersRejetes,
    anim: { animate: { x: [-3, 3, -3] }, transition: { duration: 2, ...BOUCLE } } },
  { label: 'Transactions', icon: Activity, texte: 'text-purple-600', bord: 'border-purple-100', mesure: d => d.resumeJour.transactionsDuJour,
    anim: { animate: { y: [-2, 2, -2] }, transition: { duration: 2, ...BOUCLE } } },
  { label: 'Alertes actives', icon: AlertTriangle, texte: 'text-orange-600', bord: 'border-orange-100', mesure: d => d.resumeJour.alertesCritiquesActives,
    anim: { animate: { scale: [1, 1.2, 1] }, transition: { duration: 1.5, ...BOUCLE } } },
];

function Titre({ icon: Icon, anim, children, droite }: {
  icon: React.ElementType; anim: Anim; children: React.ReactNode; droite?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <motion.div {...anim} className="w-10 h-10 rounded-full flex items-center justify-center shadow-md" style={{ background: ROLE_COLORS.institution }}>
        <Icon className="w-5 h-5 text-white" />
      </motion.div>
      <h2 className="font-bold text-gray-900 text-xl">{children}</h2>
      {droite && <span className="ml-auto text-xs text-gray-500 font-semibold">{droite}</span>}
    </div>
  );
}

export function AccueilInstitutionChiffres({ lecture }: { lecture: EtatLecture<DashboardInstitution> }) {
  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
        <Titre icon={Globe} anim={{ animate: { rotate: [0, 10, -10, 0] }, transition: { duration: 3, ...BOUCLE } }}>
          Vue Macro Nationale
        </Titre>
        <KPIGrid cols={3}>
          {TUILES_MACRO.map((t, i) => {
            const kpi = kpiDepuis(lecture, t.mesure);
            return (
              <UniversalKPI key={t.label} label={t.label} icon={t.icon} color={t.color} delay={i * 30}
                {...kpiTuile(kpi, undefined, { prefix: t.prefix, suffix: t.suffix })} />
            );
          })}
        </KPIGrid>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="mb-6 bg-gradient-to-br from-purple-50 via-white to-purple-50 rounded-3xl p-6 border-2 shadow-lg"
        style={{ borderColor: `${ROLE_COLORS.institution}30` }}
      >
        <Titre icon={BarChart3} droite={dateDuJour(new Date())}
          anim={{ animate: { rotate: [0, 360] }, transition: { duration: 8, ease: 'linear', ...BOUCLE } }}>
          Résumé du Jour
        </Titre>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {TUILES_JOUR.map(({ label, icon: Icon, texte, bord, mesure, anim }) => (
            <motion.div key={label} whileHover={{ y: -3 }} className={`bg-white rounded-3xl p-4 border-2 ${bord} shadow-md text-center`}>
              <motion.div {...anim}>
                <Icon className={`w-6 h-6 ${texte} mx-auto mb-2`} />
              </motion.div>
              <p className={`text-2xl font-bold ${texte}`}>{texteDuKpi(kpiDepuis(lecture, mesure))}</p>
              <p className="text-xs text-gray-500 font-semibold mt-1">{label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </>
  );
}
