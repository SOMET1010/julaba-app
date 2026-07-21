import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Volume2,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  MapPin,
  BarChart3,
  ShieldAlert,
  UserPlus,
  ArrowRight,
  Wifi,
  Heart,
  Globe,
  Shield,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../../contexts/AppContext';
import { useInstitution } from '../../contexts/InstitutionContext';
import { useInstitutionPermissions } from '../../hooks/useInstitutionPermissions';
import { useInstitutionData } from '../../hooks/useInstitutionData';
import { ROLE_COLORS } from '../../config/roleConfig';
import { Card } from '../ui/card';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';
import { AnimatedChart } from '../ui/AnimatedChart';
import { NotifBellButton, NotificationsPanel } from '../shared/NotificationsPanel';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
const tataLouImg =
  'https://res.cloudinary.com/dco5i2v0n/image/fetch/f_webp,q_auto:good,w_600,c_limit/https://i.postimg.cc/hGNkhd7V/tata-lou-icone-bleu.png';

// ── Component ────────────────────────────────────────────────────────────────
export function InstitutionHome() {
  const navigate = useNavigate();
  const { user, setIsModalOpen } = useApp();
  const { institution } = useInstitution();
  const perms = useInstitutionPermissions(); // ✅ Permissions granulaires
  
  // ✅ Utiliser le hook centralisé pour les données
  const { macroKPIs, resumeJour, dataEvolution, dataRepartition, dataRegions, alertes = [], alertesHigh = [], loading } = useInstitutionData();
  type AlerteRow = { id: string; severity: 'high' | 'medium' | 'low'; message: string };
  const alertesList = alertes as AlerteRow[];

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showAlertes, setShowAlertes] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleListenMessage = () => {
    setIsSpeaking(true);
    setTimeout(() => setIsSpeaking(false), 4000);
  };

  const handleTantieClick = () => {
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      <NotificationsPanel userId={user?.id || ''} isOpen={showNotifications} onClose={() => setShowNotifications(false)} accentColor={ROLE_COLORS.institution} userRole="institution" />
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 999 }}>
        <NotifBellButton userId={user?.id || ''} accentColor={ROLE_COLORS.institution} variant="solid" onOpen={() => setShowNotifications(true)} />
      </div>
      <div className="pb-32 lg:pb-8 pt-16 lg:pt-10 px-4 lg:pl-[320px] max-w-2xl lg:max-w-7xl mx-auto min-h-screen bg-gradient-to-b from-purple-50 via-white to-gray-50">

        {/* ── Tata Nanti Lou — IDENTIQUE à IdentificateurHome ─────────────── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="mb-8"
        >
          <div className="flex items-stretch gap-2">
            {/* Image Tata Nanti Lou à gauche — MÊME position/taille/animation */}
            <motion.div
              className="flex-shrink-0 flex items-center"
              animate={isSpeaking ? { y: [0, -8, 0] } : {}}
              transition={{ duration: 0.6, repeat: isSpeaking ? Infinity : 0 }}
            >
              <motion.img
                src={tataLouImg}
                alt="Tata Nanti Lou"
                className="w-36 h-auto object-contain"
                whileHover={{ scale: 1.05, rotate: 2 }}
                whileTap={{ scale: 0.95 }}
              />
            </motion.div>

            {/* Card contenu à droite */}
            <Card className="flex-1 px-4 py-5 rounded-3xl border-2 shadow-lg relative overflow-hidden" style={{ borderColor: ROLE_COLORS.institution }}>
              <motion.div
                className="absolute inset-0 opacity-5"
                style={{ 
                  background: `linear-gradient(135deg, ${ROLE_COLORS.institution}FF 0%, ${ROLE_COLORS.institution}99 100%)`,
                  willChange: 'transform'
                }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              <div className="relative z-10 flex flex-col h-full gap-4">
                {/* Titre */}
                <motion.h3
                  className="font-black text-gray-900 leading-none"
                  style={{ fontSize: '28px' }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  Tata Nanti Lou
                </motion.h3>
                
                {/* Message */}
                <motion.p
                  className="text-gray-600 leading-snug flex-1 text-xl"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Bonjour {user?.prenoms || user?.firstName} ! {(macroKPIs.acteursActifs || 0).toLocaleString()} acteurs actifs sur {(macroKPIs.totalActeurs || 0).toLocaleString()} inscrits
                </motion.p>

                {/* Bouton écouter — bas droite */}
                <div className="flex justify-end flex-shrink-0">
                  <motion.button
                    onClick={handleListenMessage}
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white shadow-md flex-shrink-0"
                    style={{ backgroundColor: ROLE_COLORS.institution }}
                    whileHover={{ scale: 1.1, boxShadow: `0 8px 20px ${ROLE_COLORS.institution}40` }}
                    whileTap={{ scale: 0.95 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Volume2 className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            </Card>
          </div>
        </motion.div>

        {/* ── Alertes critiques actives ───────────────────────────────────── */}
        {alertesHigh.length > 0 && (
          <motion.button
            onClick={() => setShowAlertes(v => !v)}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full mb-6 bg-red-50 border-2 border-red-300 rounded-3xl p-4 text-left"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            <div className="flex items-center gap-3 mb-1">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center"
              >
                <ShieldAlert className="w-4 h-4 text-red-600" />
              </motion.div>
              <span className="font-bold text-red-800">{alertesList.length} alertes critiques actives</span>
              <span className="ml-auto text-red-500 text-sm">{showAlertes ? 'Fermer' : 'Voir tout'}</span>
            </div>
            <AnimatePresence>
              {showAlertes && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 space-y-2"
                >
                  {alertesList.map(a => (
                    <div key={a.id} className={`flex items-start gap-2 p-3 rounded-2xl border-2 ${
                      a.severity === 'high' ? 'bg-red-50 border-red-200' :
                      a.severity === 'medium' ? 'bg-orange-50 border-orange-200' :
                      'bg-yellow-50 border-yellow-200'
                    }`}>
                      <AlertTriangle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        a.severity === 'high' ? 'text-red-500' :
                        a.severity === 'medium' ? 'text-orange-500' : 'text-yellow-500'
                      }`} />
                      <p className="text-sm text-gray-800 font-medium">{a.message}</p>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        )}

        {/* ── Bloc KPI Macro — 9 indicateurs avec compteurs animés et modals ────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-md"
              style={{ background: ROLE_COLORS.institution }}
            >
              <Globe className="w-5 h-5 text-white" />
            </motion.div>
            <h2 className="font-bold text-gray-900 text-xl">Vue Macro Nationale</h2>
          </div>

          <KPIGrid cols={3}>
            <UniversalKPI
              label="Acteurs actifs"
              animatedTarget={macroKPIs.acteursActifs}
              icon={Users}
              color="#3B82F6"
              delay={0}
              explication={`${12.3}% vs mois dernier`}
              details={[
                { label: 'Marchands actifs', value: '8,234', color: '#C66A2C' },
                { label: 'Producteurs actifs', value: '3,891', color: '#2E8B57' },
                { label: 'Coopératives actives', value: '1,542', color: '#2072AF' },
                { label: 'Identificateurs actifs', value: '1,156', color: '#9F8170' },
                { label: 'Taux d\'activité', value: '80.4%', color: '#3B82F6' },
              ]}
            />

            <UniversalKPI
              label="Total acteurs"
              animatedTarget={macroKPIs.totalActeurs}
              icon={Users}
              color="#A855F7"
              delay={30}
              explication={`${8.7}% croissance mensuelle`}
              details={[
                { label: 'Marchands', value: '8,640', color: '#C66A2C' },
                { label: 'Producteurs', value: '4,920', color: '#2E8B57' },
                { label: 'Coopératives', value: '2,180', color: '#2072AF' },
                { label: 'Identificateurs', value: '2,700', color: '#9F8170' },
                { label: 'Nouveaux ce mois', value: '+1,482', color: '#10B981' },
              ]}
            />

            <UniversalKPI
              label="Suspendus"
              animatedTarget={macroKPIs.acteursSuspendus}
              icon={XCircle}
              color="#EF4444"
              delay={60}
              explication={`${5.2}% vs mois dernier`}
              details={[
                { label: 'Suspensions fraude', value: '124', color: '#DC2626' },
                { label: 'Suspensions inactivité', value: '98', color: '#F59E0B' },
                { label: 'Suspensions documents', value: '67', color: '#EAB308' },
                { label: 'Suspensions autres', value: '23', color: '#6B7280' },
                { label: 'Taux de suspension', value: '1.69%', color: '#EF4444' },
              ]}
            />

            <UniversalKPI
              label="Transactions"
              animatedTarget={macroKPIs.volumeTransactions}
              icon={Activity}
              color="#10B981"
              delay={90}
              explication={`${18.4}% vs mois dernier`}
              details={[
                { label: 'Transactions validées', value: '8,942', color: '#10B981' },
                { label: 'En cours', value: '287', color: '#F59E0B' },
                { label: 'Échouées', value: '58', color: '#EF4444' },
                { label: 'Moyenne par jour', value: '310', color: '#3B82F6' },
                { label: 'Pic journalier', value: '487', color: '#8B5CF6' },
              ]}
            />

            <UniversalKPI
              label="Valeur (Mds FCFA)"
              animatedTarget={macroKPIs.valeurMonetaire / 1_000_000_000}
              icon={TrendingUp}
              color="#059669"
              delay={120}
              explication={`${22.1}% vs mois dernier`}
              details={[
                { label: 'Valeur totale (FCFA)', value: '4,862,500,000', color: '#059669' },
                { label: 'Moyenne transaction', value: '523,450 FCFA', color: '#3B82F6' },
                { label: 'Transaction max', value: '8,900,000 FCFA', color: '#8B5CF6' },
                { label: 'Transaction min', value: '1,500 FCFA', color: '#6B7280' },
                { label: 'Croissance valeur', value: '+22.1%', color: '#10B981' },
              ]}
            />

            <UniversalKPI
              label="Digitalisation"
              animatedTarget={macroKPIs.pctDigitalisation}
              icon={Wifi}
              color="#06B6D4"
              delay={150}
              suffix="%"
              explication={`${4.2}% vs mois dernier`}
              details={[
                { label: 'Acteurs avec smartphone', value: '12,539', color: '#06B6D4' },
                { label: 'Acteurs sans smartphone', value: '5,901', color: '#6B7280' },
                { label: 'Utilisant l\'app mobile', value: '9,847', color: '#10B981' },
                { label: 'Web uniquement', value: '2,692', color: '#F59E0B' },
                { label: 'Taux adoption app', value: '78.5%', color: '#06B6D4' },
              ]}
            />

            <UniversalKPI
              label="Inclusion CNPS"
              animatedTarget={macroKPIs.pctInclusionCNPS}
              icon={Shield}
              color="#F97316"
              delay={180}
              suffix="%"
              explication={`${6.8}% vs mois dernier`}
              details={[
                { label: 'Acteurs affiliés CNPS', value: '7,745', color: '#F97316' },
                { label: 'Acteurs non-affiliés', value: '10,695', color: '#6B7280' },
                { label: 'Dossiers en cours', value: '492', color: '#F59E0B' },
                { label: 'Cotisations actives', value: '6,823', color: '#10B981' },
                { label: 'Objectif 2026', value: '60%', color: '#3B82F6' },
              ]}
            />

            <UniversalKPI
              label="Inclusion CNAM"
              animatedTarget={macroKPIs.pctInclusionCNAM}
              icon={Heart}
              color="#EC4899"
              delay={210}
              suffix="%"
              explication={`${9.2}% vs mois dernier`}
              details={[
                { label: 'Acteurs affiliés CNAM', value: '6,823', color: '#EC4899' },
                { label: 'Acteurs non-affiliés', value: '11,617', color: '#6B7280' },
                { label: 'Dossiers en cours', value: '618', color: '#F59E0B' },
                { label: 'Cartes activées', value: '5,942', color: '#10B981' },
                { label: 'Objectif 2026', value: '55%', color: '#3B82F6' },
              ]}
            />

            <UniversalKPI
              label="Croissance mois"
              animatedTarget={macroKPIs.croissanceMensuelle}
              icon={TrendingUp}
              color="#14B8A6"
              delay={240}
              prefix="+"
              suffix="%"
              explication={`${1.2}% accélération`}
              details={[
                { label: 'Nouveaux acteurs', value: '+1,482', color: '#10B981' },
                { label: 'Nouvelles transactions', value: '+1,287', color: '#3B82F6' },
                { label: 'Croissance valeur', value: '+22.1%', color: '#14B8A6' },
                { label: 'Croissance régions', value: '+6.4%', color: '#8B5CF6' },
                { label: 'Prévision prochain mois', value: '+9.1%', color: '#F59E0B' },
              ]}
            />
          </KPIGrid>
        </motion.div>

        {/* ── Résumé du Jour (sans ventes) ───────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-6 bg-gradient-to-br from-purple-50 via-white to-purple-50 rounded-3xl p-6 border-2 shadow-lg"
          style={{ borderColor: `${ROLE_COLORS.institution}30` }}
        >
          <div className="flex items-center gap-3 mb-5">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: ROLE_COLORS.institution }}
            >
              <BarChart3 className="w-5 h-5 text-white" />
            </motion.div>
            <h2 className="font-bold text-gray-900 text-xl">Résumé du Jour</h2>
            <span className="ml-auto text-xs text-gray-500 font-semibold">03 Mar 2026</span>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            <motion.div whileHover={{ y: -3 }} className="bg-white rounded-3xl p-4 border-2 border-blue-100 shadow-md text-center">
              <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                <UserPlus className="w-6 h-6 text-blue-600 mx-auto mb-2" />
              </motion.div>
              <p className="text-2xl font-bold text-blue-600">{resumeJour.nouveauxInscrits}</p>
              <p className="text-xs text-gray-500 font-semibold mt-1">Nouveaux inscrits</p>
            </motion.div>

            <motion.div whileHover={{ y: -3 }} className="bg-white rounded-3xl p-4 border-2 border-green-100 shadow-md text-center">
              <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}>
                <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
              </motion.div>
              <p className="text-2xl font-bold text-green-600">{resumeJour.dossiersValides}</p>
              <p className="text-xs text-gray-500 font-semibold mt-1">Dossiers validés</p>
            </motion.div>

            <motion.div whileHover={{ y: -3 }} className="bg-white rounded-3xl p-4 border-2 border-red-100 shadow-md text-center">
              <motion.div animate={{ x: [-3, 3, -3] }} transition={{ duration: 2, repeat: Infinity }}>
                <XCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
              </motion.div>
              <p className="text-2xl font-bold text-red-600">{resumeJour.dossiersRejetes}</p>
              <p className="text-xs text-gray-500 font-semibold mt-1">Dossiers rejetés</p>
            </motion.div>

            <motion.div whileHover={{ y: -3 }} className="bg-white rounded-3xl p-4 border-2 border-purple-100 shadow-md text-center">
              <motion.div animate={{ y: [-2, 2, -2] }} transition={{ duration: 2, repeat: Infinity }}>
                <Activity className="w-6 h-6 text-purple-600 mx-auto mb-2" />
              </motion.div>
              <p className="text-2xl font-bold text-purple-600">{(resumeJour.transactionsDuJour || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-500 font-semibold mt-1">Transactions</p>
            </motion.div>

            <motion.div whileHover={{ y: -3 }} className="bg-white rounded-3xl p-4 border-2 border-orange-100 shadow-md text-center col-span-1">
              <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                <AlertTriangle className="w-6 h-6 text-orange-600 mx-auto mb-2" />
              </motion.div>
              <p className="text-2xl font-bold text-orange-600">{resumeJour.alertesCritiquesActives}</p>
              <p className="text-xs text-gray-500 font-semibold mt-1">Alertes actives</p>
            </motion.div>
          </div>
        </motion.div>

        {/* ── Graphiques comparatifs ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-5 mb-6"
        >
          {/* Évolution mensuelle transactions */}
          <AnimatedChart
            title="Évolution mensuelle des transactions"
            subtitle="Progression du volume d'activité"
            delay={300}
          >
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={dataEvolution || []}>
                <defs>
                  <linearGradient id="gradTx" x1="0" y1="0" x2="0" y2="1">
                    <stop key="gradTx-start" offset="5%" stopColor={ROLE_COLORS.institution} stopOpacity={0.3} />
                    <stop key="gradTx-end" offset="95%" stopColor={ROLE_COLORS.institution} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: `2px solid ${ROLE_COLORS.institution}40` }}
                  formatter={(v: any) => [(v || 0).toLocaleString(), 'Transactions']}
                />
                <Area
                  type="monotone"
                  dataKey="transactions"
                  stroke={ROLE_COLORS.institution}
                  strokeWidth={2}
                  fill="url(#gradTx)"
                  animationDuration={2000}
                  animationBegin={500}
                  animationEasing="ease-in-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </AnimatedChart>

          {/* Répartition acteurs par type */}
          <AnimatedChart
            title="Répartition acteurs par type"
            subtitle="Distribution des rôles sur la plateforme"
            delay={350}
          >
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="50%" height={160}>
                <PieChart>
                  <Pie
                    data={dataRepartition}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    dataKey="value"
                    animationBegin={500}
                    animationDuration={1500}
                    animationEasing="ease-out"
                  >
                    {dataRepartition.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [(v || 0).toLocaleString(), '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {dataRepartition.map((d, i) => (
                  <motion.div
                    key={d.name}
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.1 }}
                  >
                    <motion.div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: d.color }}
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
                    />
                    <span className="text-sm text-gray-700 flex-1">{d.name}</span>
                    <span className="text-sm font-bold text-gray-900">{(d.value || 0).toLocaleString()}</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </AnimatedChart>

          {/* Activité par région */}
          <AnimatedChart
            title="Activité par région"
            subtitle="Répartition géographique des acteurs"
            delay={400}
          >
            <div className="overflow-x-auto">
              <div style={{ minWidth: 320 }}>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={dataRegions || []} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="region" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '16px', border: `2px solid ${ROLE_COLORS.institution}40` }}
                      formatter={(v: any) => [(v || 0).toLocaleString(), 'Acteurs']}
                    />
                    <Bar
                      dataKey="acteurs"
                      fill={ROLE_COLORS.institution}
                      radius={[8, 8, 0, 0]}
                      animationBegin={500}
                      animationDuration={1500}
                      animationEasing="ease-out"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </AnimatedChart>

          {/* Courbe adoption */}
          <AnimatedChart
            title="Courbe adoption plateforme"
            subtitle="Évolution de la valeur monétaire"
            delay={450}
          >
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={dataEvolution || []}>
                <defs>
                  <linearGradient id="gradVal" x1="0" y1="0" x2="0" y2="1">
                    <stop key="gradVal-start" offset="5%" stopColor="#16A34A" stopOpacity={0.3} />
                    <stop key="gradVal-end" offset="95%" stopColor="#16A34A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mois" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: '2px solid #16A34A40' }}
                  formatter={(v: any) => [`${v} Mds FCFA`, 'Valeur']}
                />
                <Area
                  type="monotone"
                  dataKey="valeur"
                  stroke="#16A34A"
                  strokeWidth={2}
                  fill="url(#gradVal)"
                  animationBegin={500}
                  animationDuration={2000}
                  animationEasing="ease-in-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </AnimatedChart>
        </motion.div>

        {/* ── Accès rapide ────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          <motion.button
            onClick={() => navigate('/institution/acteurs')}
            className="text-left rounded-3xl p-6 shadow-2xl border-2 overflow-hidden relative"
            style={{
              background: 'linear-gradient(to right, #9333ea, #7e22ce, #9333ea)',
              borderColor: '#a855f7',
            }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,0.2), rgba(255,255,255,0))' }}
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center border-2" style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)' }}>
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Gérer les acteurs</h3>
                  <p className="text-white/80 text-sm">Suspendre, réactiver, voir dossiers</p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-white" />
            </div>
          </motion.button>

          <motion.button
            onClick={() => navigate('/institution/supervision')}
            className="text-left rounded-3xl p-6 shadow-2xl border-2 overflow-hidden relative"
            style={{
              background: 'linear-gradient(to right, #0d9488, #0f766e, #0d9488)',
              borderColor: '#14b8a6',
            }}
            whileHover={{ scale: 1.02, y: -4 }}
            whileTap={{ scale: 0.98 }}
          >
            <motion.div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to right, rgba(255,255,255,0), rgba(255,255,255,0.2), rgba(255,255,255,0))' }}
              animate={{ x: ['-100%', '100%'] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'linear', delay: 1.5 }}
            />
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center border-2" style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderColor: 'rgba(255,255,255,0.3)' }}>
                  <BarChart3 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">Supervision</h3>
                  <p className="text-white/80 text-sm">Transactions, KPIs, Audit, Export</p>
                </div>
              </div>
              <ArrowRight className="w-6 h-6 text-white" />
            </div>
          </motion.button>
        </motion.div>
      </div>
    </>
  );
}