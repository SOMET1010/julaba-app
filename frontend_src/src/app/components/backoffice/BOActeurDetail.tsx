import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, Phone, MapPin, Calendar, Shield, Target,
  CheckCircle2, Clock,
  UserX, RotateCcw, Key, UserCog, FileText, Activity,
  X, Save, Paperclip, Zap, ChevronDown, ChevronUp, ChevronRight,
  Flag, Trash2, TrendingUp, Wallet,
} from 'lucide-react';
import { useBackOffice } from '../../contexts/BackOfficeContext';
import { BO_DARK, BO_PRIMARY, BO_LIGHT, BO_MEDIUM, BO_TINT } from './bo-theme';
import { BOProgressBar } from './BOProgressBar';
import { UniversalKPI } from '../ui/UniversalKPI';
import { toast } from 'sonner';
import { API_URL } from '../../utils/api';
import { boChangeSousProfilMarchand, boGetUserFlags, boUpdateActeur, type UserFlag } from '../../services/backoffice-api';
import { SOUS_PROFILS_MARCHAND } from '../../types/sousProfilMarchand';
import { CAN_VIEW_ALERTS } from '../../utils/permissions-bo';
import { getContextualTabLabel, ROLE_OPTIONS, STATUT_CONFIG, TYPE_COLORS } from '../../utils/role-config';
import SignalementModal from './SignalementModal';

const TABS = [
  { id: 'apercu', label: 'Aperçu', icon: FileText },
  { id: 'transactions', label: 'Transactions', icon: Activity },
  { id: 'contextuel', label: 'Activité', icon: Activity },
  { id: 'documents', label: 'Documents', icon: Paperclip },
  { id: 'signalements', label: 'Signalements', icon: Flag },
  { id: 'historique', label: 'Historique', icon: Clock },
];

function ConfirmModal({ open, title, message, onConfirm, onCancel, danger }: any) {
  if (!open) return null;
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onCancel}>
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-2"
          style={{ borderColor: danger ? '#EF4444' : BO_PRIMARY }}
          initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
          onClick={e => e.stopPropagation()}>
          <h3 id="confirm-modal-title" className="font-black text-gray-900 text-lg mb-2">{title}</h3>
          <p className="text-sm text-gray-600 mb-6">{message}</p>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-700">Annuler</button>
            <button onClick={onConfirm} className="flex-1 py-3 rounded-2xl font-bold text-white"
              style={{ backgroundColor: danger ? '#EF4444' : BO_PRIMARY }}>Confirmer</button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export function BOActeurDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const _boCtx = useBackOffice();
  const acteurs = Array.isArray(_boCtx.acteurs) ? _boCtx.acteurs : [];
  const transactions = Array.isArray(_boCtx.transactions) ? _boCtx.transactions : [];
  const auditLogs = Array.isArray(_boCtx.auditLogs) ? _boCtx.auditLogs : [];
  const { hasPermission, updateActeurStatut, addAuditLog, boUser, zones, refreshActeurs } = _boCtx;
  const [activeTab, setActiveTab] = useState('apercu');
  const [showConfirm, setShowConfirm] = useState<string | null>(null);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showSignalementModal, setShowSignalementModal] = useState(false);
  const [newRole, setNewRole] = useState('');
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState(false);
  const [editObjectif, setEditObjectif] = useState<string>('');
  const [editPrime, setEditPrime] = useState<string>('');
  const [savingObjectif, setSavingObjectif] = useState(false);
  const [criticalActionLoading, setCriticalActionLoading] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [flagsForActeur, setFlagsForActeur] = useState<UserFlag[]>([]);
  const [showSousProfilModal, setShowSousProfilModal] = useState(false);
  const [nouveauSousProfil, setNouveauSousProfil] = useState('');
  const [motifSousProfil, setMotifSousProfil] = useState('');
  const [savingSousProfil, setSavingSousProfil] = useState(false);

  const acteur = acteurs.find(a => a.id === id);
  const currentBoRole = boUser?.role || _boCtx.user?.role;
  const canViewSignalements = hasPermission('acteurs.read') && CAN_VIEW_ALERTS(currentBoRole);
  const contextualRole = (acteur?.type || acteur?.role || '').toLowerCase();
  const contextualTab = useMemo(() => getContextualTabLabel(contextualRole), [contextualRole]);
  const visibleTabs = useMemo(() => (
    TABS
      .filter(tab => tab.id !== 'signalements' || canViewSignalements)
      .map(tab => (tab.id === 'contextuel'
        ? { ...tab, label: contextualTab.label, icon: contextualTab.icon }
        : tab))
  ), [canViewSignalements, contextualTab]);

  useEffect(() => {
    setEditObjectif(acteur?.objectifMensuel != null ? String(acteur.objectifMensuel) : '');
    setEditPrime(acteur?.primeObjectif != null ? String(acteur.primeObjectif) : '');
  }, [acteur?.id, acteur?.objectifMensuel, acteur?.primeObjectif]);

  useEffect(() => {
    if (!visibleTabs.some(tab => tab.id === activeTab)) setActiveTab('apercu');
  }, [activeTab, visibleTabs]);

  useEffect(() => {
    const controller = new AbortController();
    if (!acteur?.id || !canViewSignalements) {
      setFlagsForActeur([]);
      return () => controller.abort();
    }

    void (async () => {
      const result = await (boGetUserFlags as (
        filters?: { resolved?: boolean; userId?: string },
        signal?: AbortSignal,
      ) => Promise<{ count: number; items: UserFlag[] }>)({ userId: acteur.id, resolved: false }, controller.signal);
      if (controller.signal.aborted) return;
      setFlagsForActeur(result.items.filter(flag => flag.userId === acteur.id && !flag.resolvedAt));
    })();

    return () => controller.abort();
  }, [acteur?.id, canViewSignalements]);

  const acteurTx = useMemo(
    () => (acteur ? transactions.filter(t => t.acteurId === acteur.id || t.userId === acteur.id) : []),
    [transactions, acteur],
  );

  const typeColor = useMemo(() => {
    if (!acteur) return BO_PRIMARY;
    const key = (acteur.type || acteur.role || '').toLowerCase();
    return TYPE_COLORS[key] || TYPE_COLORS[acteur.type || ''] || BO_PRIMARY;
  }, [acteur]);

  const statutConf = useMemo(() => {
    if (!acteur) return STATUT_CONFIG.actif;
    return STATUT_CONFIG[acteur.statut || ''] || STATUT_CONFIG.actif || { label: acteur.statut || 'inconnu', bg: 'bg-gray-100', text: 'text-gray-600', icon: Zap };
  }, [acteur]);

  const StatutIcon = statutConf.icon || Zap;

  const acteurRegion = acteur ? String(acteur.region || '').trim() : '';
  const currentScore = acteur ? Number(acteur.score) : NaN;

  const regionalRank = useMemo(() => {
    if (!acteur || !acteurRegion || !Number.isFinite(currentScore)) return null;
    const regionalScored = acteurs
      .filter(a => String(a.region || '').trim() === acteurRegion)
      .map(a => ({ id: a.id, score: Number(a.score) }))
      .filter(a => Number.isFinite(a.score))
      .sort((a, b) => b.score - a.score);
    if (regionalScored.length === 0) return null;
    const idx = regionalScored.findIndex(a => a.id === acteur.id);
    return idx >= 0 ? idx + 1 : null;
  }, [acteurs, acteur, acteurRegion, currentScore]);

  const acteurLogs = useMemo(
    () => (acteur?.id
      ? auditLogs.filter(l => l.entite_id === acteur.id || l.user_id === acteur.id)
      : []),
    [auditLogs, acteur?.id],
  );

  const allHistory = useMemo(() => {
    if (!acteur) return [];
    const baseHistory = [
      { action: 'Compte créé sur Jùlaba', date: acteur.dateInscription ?? '', auteur: 'Système automatique', couleur: '#6b7280', module: 'Système' as string, detail: undefined as string | undefined },
      ...(acteur.validated ? [{ action: 'Dossier validé - acteur actif', date: acteur.dateInscription ?? '', auteur: 'Administrateur', couleur: '#10B981', module: 'Enrôlement' as string, detail: undefined as string | undefined }] : []),
    ];

    const auditHistory = acteurLogs.map(l => {
      const act = l.action ?? '';
      return {
        action: act || 'Action',
        date: l.created_at ?? '',
        auteur: l.user_id ? `Back-office (${l.user_id})` : 'Back-office',
        couleur: act.includes('SUSPEND') ? '#EF4444' : act.includes('VALID') ? '#10B981' : act.includes('REJET') ? '#F97316' : '#3B82F6',
        module: l.entite ?? 'Audit',
        detail: undefined as string | undefined,
      };
    });

    return [...baseHistory, ...auditHistory].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [acteurLogs, acteur]);

  const latestFlag = useMemo(() => (
    flagsForActeur
      .slice()
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0] || null
  ), [flagsForActeur]);
  const ContextualIcon = contextualTab.icon || Activity;

  const completionPercentage = useMemo(() => {
    if (!acteur) return 0;
    const requiredFields: Array<keyof typeof acteur> = [
      'photoUrl', 'nin', 'numCmu', 'email', 'prenoms', 'nom', 'telephone', 'region', 'commune',
    ];
    const filled = requiredFields.filter(field => {
      const value = acteur[field];
      return typeof value === 'string' && value.trim().length > 0;
    }).length;
    return Math.round((filled / requiredFields.length) * 100);
  }, [acteur]);

  const completionTone = useMemo(() => {
    if (completionPercentage >= 80) {
      return {
        color: STATUT_CONFIG.actif.dotColor,
        bgColor: `${STATUT_CONFIG.actif.dotColor}12`,
        borderColor: `${STATUT_CONFIG.actif.dotColor}35`,
      };
    }
    if (completionPercentage >= 50) {
      return {
        color: TYPE_COLORS.operateur_terrain,
        bgColor: `${TYPE_COLORS.operateur_terrain}12`,
        borderColor: `${TYPE_COLORS.operateur_terrain}35`,
      };
    }
    return {
      color: STATUT_CONFIG.suspendu.dotColor,
      bgColor: `${STATUT_CONFIG.suspendu.dotColor}12`,
      borderColor: `${STATUT_CONFIG.suspendu.dotColor}35`,
    };
  }, [completionPercentage]);

  const handleSignaler = useCallback(() => {
    setShowSignalementModal(true);
  }, []);

  const handleSupprimer = useCallback(() => {
    toast.info('Disponible en Phase 4F-3 : suppression définitive avec confirmation typée');
    if (boUser) addAuditLog({
      action: 'SUPPRESSION: ATTEMPT_PLACEHOLDER',
      utilisateurBO: `${boUser.prenom} ${boUser.nom}`,
      roleBO: boUser.role,
      acteurImpacte: `${acteur?.prenoms || ''} ${acteur?.nom || ''}`,
      ancienneValeur: acteur?.statut || 'inconnu',
      nouvelleValeur: 'tentative_suppression',
      ip: 'frontend',
      module: 'BOActeurDetail',
    });
  }, [boUser, addAuditLog, acteur]);

  if (!acteur) return (
    <div className="px-8 py-6 text-center">
      <p className="text-gray-500 font-semibold">Acteur introuvable</p>
      <button onClick={() => navigate('/backoffice/acteurs')} className="mt-4 px-6 py-3 rounded-2xl font-bold text-white" style={{ backgroundColor: BO_PRIMARY }}>Retour</button>
    </div>
  );

  const handleCriticalAction = (action: string) => setShowConfirm(action);

  const executeCriticalAction = async (action: string) => {
    if (criticalActionLoading) return;

    if (action === 'reset_mdp') {
      setShowResetPasswordModal(true);
      setShowConfirm(null);
      return;
    }

    setCriticalActionLoading(true);
    try {
      if (action === 'suspendre') {
        await updateActeurStatut(acteur.id, 'suspendu', 'SUSPENSION forcée depuis détail acteur');
        toast.warning('Acteur suspendu immédiatement');
      } else if (action === 'reactiver') {
        await updateActeurStatut(acteur.id, 'actif', 'RÉACTIVATION depuis détail acteur');
        toast.success('Acteur réactivé');
      } else if (action === 'valider') {
        await updateActeurStatut(acteur.id, 'actif', 'VALIDATION forcée BO');
        toast.success('Validation forcée effectuée');
      }
      setShowConfirm(null);
    } catch (err) {
      console.warn('[BOActeurDetail] executeCriticalAction failed:', err instanceof Error ? err.message : err);
      toast.error('Action impossible. Réessaie.');
    } finally {
      setCriticalActionLoading(false);
    }
  };

  const handleChangeRole = async () => {
    if (!newRole) { toast.error('Sélectionnez un rôle'); return; }
    try {
      await boUpdateActeur(acteur.id, { role: newRole });
      if (boUser) addAuditLog({
        action: 'CHANGEMENT type acteur',
        utilisateurBO: `${boUser.prenom} ${boUser.nom}`,
        roleBO: boUser.role,
        acteurImpacte: `${acteur.prenoms} ${acteur.nom}`,
        ancienneValeur: acteur.type,
        nouvelleValeur: newRole,
        module: 'Acteurs',
      });
      toast.success(`Type changé vers "${newRole}"`);
      setShowRoleModal(false);
      setNewRole('');
    } catch (err) {
      console.warn('[BOActeurDetail] handleChangeRole failed:', err instanceof Error ? err.message : err);
      toast.error('Impossible de changer le type. Réessaie.');
    }
  };

  const handleChangeSousProfil = async () => {
    if (!nouveauSousProfil) { toast.error('Sélectionnez un sous-profil'); return; }
    if (nouveauSousProfil === (acteur as any).sousProfilMarchand) {
      toast.info('Sous-profil inchangé'); return;
    }
    setSavingSousProfil(true);
    try {
      await boChangeSousProfilMarchand(acteur.id, nouveauSousProfil as any, motifSousProfil.trim() || undefined);
      await refreshActeurs();
      toast.success('Sous-profil marchand mis à jour');
      setShowSousProfilModal(false);
      setMotifSousProfil('');
    } catch {
      toast.error('Impossible de modifier le sous-profil. Réessaie.');
    } finally {
      setSavingSousProfil(false);
    }
  };

  const handleSaveObjectif = async () => {
    const objNum = editObjectif === '' ? null : parseInt(editObjectif, 10);
    const primeNum = editPrime === '' ? null : parseInt(editPrime, 10);
    if (objNum !== null && (isNaN(objNum) || objNum < 0)) { toast.error('Objectif invalide'); return; }
    if (primeNum !== null && (isNaN(primeNum) || primeNum < 0)) { toast.error('Prime invalide'); return; }
    setSavingObjectif(true);
    try {
      await boUpdateActeur(acteur.id, { objectifMensuel: objNum, primeObjectif: primeNum });
      await refreshActeurs();
      toast.success('Objectif et prime mis à jour');
    } catch (err) {
      console.warn('[BOActeurDetail] handleSaveObjectif failed:', err instanceof Error ? err.message : err);
      toast.error('Échec de la mise à jour');
    } finally {
      setSavingObjectif(false);
    }
  };

  const handleResetPassword = async () => {
    setResetPasswordLoading(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);

    try {
      const response = await fetch(`${API_URL}/auth/reset-user-password`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: acteur.id }),
        signal: controller.signal,
      });

      const result = await response.json();

      clearTimeout(timeout);
      if (!response.ok || result.error || result.success === false) {
        toast.error(result.error || result.message || 'Erreur lors de la réinitialisation');
        setResetPasswordLoading(false);
        return;
      }

      if (boUser) addAuditLog({
        action: 'RESET mot de passe',
        utilisateurBO: `${boUser.prenom} ${boUser.nom}`,
        roleBO: boUser.role,
        acteurImpacte: `${acteur.prenoms} ${acteur.nom}`,
        module: 'Acteurs',
      });

      const smsSent = result?.sms_sent === true;
      if (smsSent) {
        toast.success(`Le nouveau mot de passe a été envoyé par SMS à ${acteur.prenoms} ${acteur.nom}`);
      } else {
        toast.success(`Mot de passe réinitialisé pour ${acteur.prenoms} ${acteur.nom}`);
      }

      setShowResetPasswordModal(false);
    } catch (err) {
      if ((err as any)?.name === 'AbortError') {
        toast.error('La requête a pris trop de temps. Réessaie.');
      } else {
        console.warn('[BOActeurDetail] resetPassword failed:', err instanceof Error ? err.message : err);
        toast.error('Erreur lors de la réinitialisation');
      }
    } finally {
      clearTimeout(timeout);
      setResetPasswordLoading(false);
    }
  };

  const confirmConfig: Record<string, { title: string; message: string; danger: boolean }> = {
    suspendre: { title: 'Suspendre cet acteur ?', message: `Suspendre ${acteur.prenoms} ${acteur.nom} bloquera immédiatement son accès. Action journalisée.`, danger: true },
    reactiver: { title: 'Réactiver cet acteur ?', message: `Réactiver ${acteur.prenoms} ${acteur.nom} lui redonnera un accès complet. Action journalisée.`, danger: false },
    valider:   { title: 'Forcer la validation ?', message: `Cela validera le dossier de ${acteur.prenoms} ${acteur.nom} sans processus standard. Action journalisée.`, danger: false },
    reset_mdp: { title: 'Réinitialiser le mot de passe ?', message: `Le système générera un nouveau mot de passe et l’enverra directement par SMS à ${acteur.prenoms} ${acteur.nom}. Vous ne verrez pas le mot de passe pour des raisons de sécurité.`, danger: false },
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-5xl mx-auto overflow-hidden" style={{ backgroundColor: '#FAFAF8' }}>

      <motion.button
        aria-label="Retour à la liste des acteurs"
        onClick={() => navigate('/backoffice/acteurs')}
        className="flex items-center gap-2 text-gray-600 font-semibold mb-6 hover:text-gray-900"
        whileHover={{ x: -4 }} whileTap={{ scale: 0.97 }}>
        <ArrowLeft className="w-5 h-5" /> Retour aux acteurs
      </motion.button>

      {/* Card principale */}
      <motion.div className="bg-white rounded-3xl p-5 sm:p-6 shadow-md border-2 border-gray-100 mb-6"
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
          <motion.div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl flex items-center justify-center text-white font-black text-2xl sm:text-3xl shadow-lg flex-shrink-0"
            style={{
              background: `linear-gradient(135deg, ${TYPE_COLORS[(acteur.type || acteur.role || 'marchand').toLowerCase()] || BO_PRIMARY} 0%, ${TYPE_COLORS[(acteur.type || acteur.role || 'marchand').toLowerCase()] || BO_PRIMARY}CC 100%)`,
              boxShadow: `0 16px 30px ${TYPE_COLORS[(acteur.type || acteur.role || 'marchand').toLowerCase()] || BO_PRIMARY}33`,
            }}
            animate={{ rotate: [0, 3, -3, 0] }} transition={{ duration: 4, repeat: Infinity }}>
            {(acteur.prenoms?.[0] || acteur.full_name?.[0] || '?').toUpperCase()}
            {(acteur.nom?.[0] || '').toUpperCase()}
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl font-black text-gray-900">{acteur.prenoms} {acteur.nom}</h1>
                <p className="font-semibold mt-0.5" style={{ color: typeColor }}>{(acteur.type || 'inconnu').charAt(0).toUpperCase() + (acteur.type || 'inconnu').slice(1)} • {acteur.activite}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl ${statutConf.bg} ${statutConf.text} border-2 border-transparent`}>
                  <StatutIcon className="w-4 h-4" />
                  <span className="font-bold">{statutConf.label}</span>
                </div>
                {latestFlag && (
                  <div
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-red-100 text-red-700 border-2 border-transparent"
                    title={`Signalement: ${latestFlag.raison}`}
                  >
                    <Flag className="w-4 h-4" />
                    <span className="font-bold">Signalé</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-wrap gap-4 mt-3">
              <div className="flex items-center gap-2 text-sm text-gray-600"><Phone className="w-4 h-4" /><span>{acteur.telephone}</span></div>
              <div className="flex items-center gap-2 text-sm text-gray-600"><MapPin className="w-4 h-4" /><span>{acteur.commune}, {acteur.region}</span></div>
              <div className="flex items-center gap-2 text-sm text-gray-600"><Calendar className="w-4 h-4" /><span>Inscrit le {acteur.dateInscription ? new Date(acteur.dateInscription).toLocaleDateString('fr-FR') : '-'}</span></div>
              {acteur.email && <div className="flex items-center gap-2 text-sm text-gray-600"><Shield className="w-4 h-4" /><span>{acteur.email}</span></div>}
            </div>
          </div>
        </div>
        <div className="mt-5 pt-5 border-t-2 border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-gray-700">Score de performance</span>
            <span className="text-lg font-black" style={{ color: (acteur.score || 0) >= 70 ? '#10B981' : (acteur.score || 0) >= 40 ? BO_PRIMARY : '#EF4444' }}>{acteur.score || 0}/100</span>
          </div>
          <BOProgressBar
            value={acteur.score || 0}
            color={(acteur.score || 0) >= 70 ? '#10B981' : (acteur.score || 0) >= 40 ? BO_PRIMARY : '#EF4444'}
            height="md"
            delay={0.2}
          />
        </div>
      </motion.div>

      {/* 4 KPIs UniversalKPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <UniversalKPI
          label="Score performance"
          animatedTarget={acteur.score ?? 0}
          suffix="/100"
          icon={TrendingUp}
          color={STATUT_CONFIG.actif.dotColor}
          bgColor={`${STATUT_CONFIG.actif.dotColor}12`}
          borderColor={`${STATUT_CONFIG.actif.dotColor}35`}
          iconAnimation="bounce"
          delay={0}
        />
        <UniversalKPI
          label="Transactions"
          animatedTarget={acteur.transactionsTotal ?? 0}
          icon={Wallet}
          color={TYPE_COLORS.admin_national}
          bgColor={`${TYPE_COLORS.admin_national}12`}
          borderColor={`${TYPE_COLORS.admin_national}35`}
          iconAnimation="pulse"
          delay={0.1}
        />
        <UniversalKPI
          label="Volume total"
          animatedTarget={acteur.volumeTotal ?? 0}
          suffix=" FCFA"
          icon={TrendingUp}
          color={TYPE_COLORS.operateur_terrain}
          bgColor={`${TYPE_COLORS.operateur_terrain}12`}
          borderColor={`${TYPE_COLORS.operateur_terrain}35`}
          iconAnimation="float"
          delay={0.2}
        />
        <UniversalKPI
          label="Taux completion"
          animatedTarget={completionPercentage}
          suffix="%"
          icon={CheckCircle2}
          color={completionTone.color}
          bgColor={completionTone.bgColor}
          borderColor={completionTone.borderColor}
          iconAnimation="pulse"
          delay={0.3}
        />
      </div>

      {/* Actions critiques */}
      {(hasPermission('acteurs.write') || hasPermission('acteurs.suspend')) && (
        <motion.div className="bg-white rounded-3xl p-5 shadow-md border-2 border-gray-100 mb-6"
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h2 className="font-black text-gray-900 mb-4 text-base">Actions critiques</h2>
          {hasPermission('enrolement.validate') && (acteur.statut === 'en_attente' || acteur.statut === 'en_attente_validation') && (
            <div className="mb-3">
              <UniversalKPI
                label="Forcer la validation"
                value=""
                icon={CheckCircle2}
                color={STATUT_CONFIG.actif.dotColor}
                bgColor={`${STATUT_CONFIG.actif.dotColor}12`}
                borderColor={`${STATUT_CONFIG.actif.dotColor}35`}
                iconAnimation="pulse"
                onClick={() => handleCriticalAction('valider')}
                delay={0}
              />
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {hasPermission('acteurs.suspend') && acteur.statut === 'actif' && (
              <UniversalKPI
                label="Suspendre"
                value=""
                icon={UserX}
                color={STATUT_CONFIG.suspendu.dotColor}
                bgColor={`${STATUT_CONFIG.suspendu.dotColor}12`}
                borderColor={`${STATUT_CONFIG.suspendu.dotColor}35`}
                iconAnimation="pulse"
                onClick={() => handleCriticalAction('suspendre')}
                delay={0.05}
              />
            )}
            {hasPermission('acteurs.suspend') && acteur.statut === 'suspendu' && (
              <UniversalKPI
                label="Réactiver"
                value=""
                icon={RotateCcw}
                color={STATUT_CONFIG.actif.dotColor}
                bgColor={`${STATUT_CONFIG.actif.dotColor}12`}
                borderColor={`${STATUT_CONFIG.actif.dotColor}35`}
                iconAnimation="pulse"
                onClick={() => handleCriticalAction('reactiver')}
                delay={0.05}
              />
            )}
            {hasPermission('acteurs.write') && (
              <UniversalKPI
                label="Mot de passe"
                value=""
                icon={Key}
                color={BO_MEDIUM}
                bgColor={BO_TINT}
                borderColor={BO_LIGHT}
                iconAnimation="float"
                onClick={() => handleCriticalAction('reset_mdp')}
                delay={0.1}
              />
            )}
            <UniversalKPI
              label="Signaler"
              value=""
              icon={Flag}
              color={STATUT_CONFIG.suspendu.dotColor}
              bgColor={`${STATUT_CONFIG.suspendu.dotColor}12`}
              borderColor={`${STATUT_CONFIG.suspendu.dotColor}35`}
              iconAnimation="bounce"
              onClick={handleSignaler}
              delay={0.15}
            />
            {hasPermission('acteurs.write') && (
              <UniversalKPI
                label="Changer type"
                value=""
                icon={UserCog}
                color={TYPE_COLORS.operateur_terrain}
                bgColor={`${TYPE_COLORS.operateur_terrain}12`}
                borderColor={`${TYPE_COLORS.operateur_terrain}35`}
                iconAnimation="spin"
                onClick={() => { setNewRole(acteur.type || ''); setShowRoleModal(true); }}
                delay={0.2}
              />
            )}
            <UniversalKPI
              label="Supprimer"
              value=""
              icon={Trash2}
              color={BO_MEDIUM}
              bgColor={BO_TINT}
              borderColor={BO_LIGHT}
              iconAnimation="none"
              onClick={handleSupprimer}
              delay={0.25}
            />
          </div>
        </motion.div>
      )}

      {/* Tabs */}
      <div className="grid mb-6" style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, 1fr)`, gap: 8 }}>
        {visibleTabs.map(tab => {
          const TabIcon = tab.icon || Zap;
          const active = activeTab === tab.id;
          return (
            <motion.button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              whileHover={!active ? { y: -2, scale: 1.01 } : {}}
              whileTap={{ scale: 0.98 }}
              aria-current={active ? 'page' : undefined}
              aria-label={tab.label}
              className="transition-colors flex items-center justify-center gap-2 px-3 py-3.5"
              style={{
                background: active ? BO_DARK : 'white',
                color: active ? 'white' : BO_PRIMARY,
                border: `2px solid ${active ? BO_DARK : BO_LIGHT}`,
                borderRadius: 16,
                fontWeight: 700,
                fontSize: 13,
                boxShadow: active ? `0 2px 6px ${BO_DARK}26` : 'none',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              <motion.span
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ display: 'inline-flex', flexShrink: 0 }}
              >
                <TabIcon size={16} />
              </motion.span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {tab.label}
              </span>
              {tab.id === 'signalements' && flagsForActeur.length > 0 && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 20,
                    height: 20,
                    padding: '0 6px',
                    borderRadius: 10,
                    background: active ? `${BO_TINT}40` : `${STATUT_CONFIG.suspendu.dotColor}18`,
                    color: active ? 'white' : STATUT_CONFIG.suspendu.dotColor,
                    fontSize: 11,
                    fontWeight: 900,
                    flexShrink: 0,
                  }}
                >
                  {flagsForActeur.length}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Contenu tabs */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="bg-white rounded-3xl p-6 shadow-md border-2 border-gray-100">

          {/* APERÇU */}
          {activeTab === 'apercu' && (
            <div className="space-y-4">
              {/* Section Identité */}
              <div className="bg-white rounded-3xl p-5 shadow-md border-2 border-gray-100">
                <h3 className="font-black text-gray-900 text-base mb-4">Identité</h3>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-gray-100"><td className="text-gray-600 py-2">Nom complet</td><td className="text-right py-2 font-medium">{acteur.prenoms} {acteur.nom}</td></tr>
                    <tr className="border-b border-gray-100"><td className="text-gray-600 py-2">Téléphone</td><td className="text-right py-2 font-medium">{acteur.telephone || '-'}</td></tr>
                    <tr className="border-b border-gray-100"><td className="text-gray-600 py-2">Email</td><td className="text-right py-2 font-medium text-blue-600">{acteur.email || '-'}</td></tr>
                    <tr><td className="text-gray-600 py-2">Nationalité</td><td className="text-right py-2 font-medium">{(acteur as any).nationalite || 'Ivoirienne'}</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Section Activité */}
              <div className="bg-white rounded-3xl p-5 shadow-md border-2 border-gray-100">
                <h3 className="font-black text-gray-900 text-base mb-4">Activité</h3>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-gray-100"><td className="text-gray-600 py-2">Type</td><td className="text-right py-2 font-medium capitalize">{acteur.type || acteur.role || '-'}</td></tr>
                    {(acteur.type || acteur.role) === 'marchand' && (
                      <tr className="border-b border-gray-100">
                        <td className="text-gray-600 py-2">Sous-profil</td>
                        <td className="text-right py-2">
                          <span className="inline-flex items-center gap-2">
                            <span className="font-medium">
                              {SOUS_PROFILS_MARCHAND.find(s => s.value === (acteur as any).sousProfilMarchand)?.label
                                || <span className="text-gray-400 italic">Non défini</span>}
                            </span>
                            {hasPermission('acteurs.write') && (
                              <button
                                type="button"
                                onClick={() => { setNouveauSousProfil(((acteur as any).sousProfilMarchand) || ''); setShowSousProfilModal(true); }}
                                className="text-xs px-2 py-1 rounded-lg border border-gray-200 font-medium text-gray-700 inline-flex items-center gap-1"
                              >
                                <UserCog className="w-3.5 h-3.5" /> Modifier
                              </button>
                            )}
                          </span>
                        </td>
                      </tr>
                    )}
                    <tr className="border-b border-gray-100"><td className="text-gray-600 py-2">Activité principale</td><td className="text-right py-2 font-medium">{acteur.activite || '-'}</td></tr>
                    <tr className="border-b border-gray-100"><td className="text-gray-600 py-2">Récépissé</td><td className="text-right py-2 font-medium">{(acteur as any).recepisse || '-'}</td></tr>
                    <tr className="border-b border-gray-100"><td className="text-gray-600 py-2">Catégorie</td><td className="text-right py-2 font-medium">{(acteur as any).categorie || '-'}</td></tr>
                    <tr><td className="text-gray-600 py-2">Statut entrepreneur</td><td className="text-right py-2 font-medium">{(acteur as any).statutEntrepreneur || (acteur as any).statut_entrepreneur || '-'}</td></tr>
                  </tbody>
                </table>
              </div>

              {/* Section Localisation */}
              <div className="bg-white rounded-3xl p-5 shadow-md border-2 border-gray-100">
                <h3 className="font-black text-gray-900 text-base mb-4">Localisation</h3>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-gray-100"><td className="text-gray-600 py-2">Région</td><td className="text-right py-2 font-medium">{acteur.region || <span className="text-gray-400 italic">Non renseigné</span>}</td></tr>
                    <tr className="border-b border-gray-100"><td className="text-gray-600 py-2">Commune</td><td className="text-right py-2 font-medium">{acteur.commune || '-'}</td></tr>
                    <tr><td className="text-gray-600 py-2">Zone</td><td className="text-right py-2 font-medium">{zones.find(z => z.id === acteur.zone)?.nom || acteur.zone || '-'}</td></tr>
                  </tbody>
                </table>
              </div>

              <motion.button
                type="button"
                onClick={() => setShowMoreDetails(!showMoreDetails)}
                className="w-full mt-4 mb-4 py-3 px-4 rounded-2xl border-2 border-dashed border-gray-300 bg-transparent hover:border-gray-400 text-sm font-bold text-gray-600 flex items-center justify-center gap-2 transition-all"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                {showMoreDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                {showMoreDetails ? 'Masquer les détails' : 'Plus de détails (CNI, RSTI, CMU, situation matrimoniale, etc.)'}
              </motion.button>

              <AnimatePresence>
                {showMoreDetails && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden mb-4"
                  >
                    <div className="bg-white rounded-3xl p-5 shadow-md border-2 border-gray-100">
                      <h3 className="text-sm font-bold text-gray-700 mb-4">Informations complémentaires</h3>
                      <table className="w-full text-sm">
                        <tbody>
                          <tr className="border-b border-gray-100"><td className="text-gray-600 py-2">NIN / CNI</td><td className="text-right py-2 font-medium">{acteur.cni || (acteur as any).nin || 'Non renseigné'}</td></tr>
                          <tr className="border-b border-gray-100"><td className="text-gray-600 py-2">RSTI</td><td className="text-right py-2 font-medium">{(acteur as any).numCNPS || (acteur as any).num_cnps || 'Non renseigné'}</td></tr>
                          <tr className="border-b border-gray-100"><td className="text-gray-600 py-2">CMU</td><td className="text-right py-2 font-medium">{(acteur as any).numCMU || (acteur as any).numCmu || 'Non renseigné'}</td></tr>
                          <tr className="border-b border-gray-100"><td className="text-gray-600 py-2">Situation matrimoniale</td><td className="text-right py-2 font-medium">{(acteur as any).situationMatrimoniale || (acteur as any).situation_matrimoniale || 'Non renseigné'}</td></tr>
                          <tr className="border-b border-gray-100"><td className="text-gray-600 py-2">Date de naissance</td><td className="text-right py-2 font-medium">{(acteur as any).dateNaissance || (acteur as any).date_naissance || 'Non renseigné'}</td></tr>
                          <tr className="border-b border-gray-100"><td className="text-gray-600 py-2">Lieu de naissance</td><td className="text-right py-2 font-medium">{(acteur as any).lieuNaissance || (acteur as any).lieu_naissance || 'Non renseigné'}</td></tr>
                          <tr className="border-b border-gray-100"><td className="text-gray-600 py-2">Genre</td><td className="text-right py-2 font-medium">{acteur.genre || 'Non renseigné'}</td></tr>
                          <tr><td className="text-gray-600 py-2">Statut entrepreneur</td><td className="text-right py-2 font-medium">{(acteur as any).statutEntrepreneur || 'Non renseigné'}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {(acteur.type || acteur.role) === 'identificateur' && hasPermission('acteurs.write') && (
                <div className="mt-6 p-5 rounded-2xl border-2" style={{ backgroundColor: '#FEF3C7', borderColor: '#FBBF24' }}>
                  <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-orange-600" />
                    Objectif et prime mensuels
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="objectif-mensuel-input" className="block text-xs font-semibold text-gray-600 mb-2">
                        Objectif mensuel (nb d’acteurs)
                      </label>
                      <input
                        id="objectif-mensuel-input"
                        type="number"
                        min={0}
                        value={editObjectif}
                        onChange={e => setEditObjectif(e.target.value.replace(/\D/g, ''))}
                        placeholder="Ex: 20"
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-400 focus:outline-none text-sm font-medium"
                      />
                    </div>
                    <div>
                      <label htmlFor="prime-objectif-input" className="block text-xs font-semibold text-gray-600 mb-2">
                        Prime objectif (FCFA)
                      </label>
                      <input
                        id="prime-objectif-input"
                        type="number"
                        min={0}
                        value={editPrime}
                        onChange={e => setEditPrime(e.target.value.replace(/\D/g, ''))}
                        placeholder="Ex: 10000"
                        className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-orange-400 focus:outline-none text-sm font-medium"
                      />
                    </div>
                  </div>
                  <motion.button
                    onClick={handleSaveObjectif}
                    disabled={savingObjectif}
                    className="mt-4 px-5 py-2.5 rounded-xl font-bold text-white text-sm shadow-md disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, #C66A2C, #9F8170)' }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {savingObjectif ? 'Enregistrement...' : 'Enregistrer'}
                  </motion.button>
                  <p className="text-xs text-gray-500 mt-3">
                    Ces valeurs s’affichent sur la page d’accueil de l’identificateur dans la section "Missions en cours".
                  </p>
                </div>
              )}
            </div>
          )}

          {/* DOCUMENTS */}
          {activeTab === 'documents' && (
            <div>
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-black text-gray-900 text-lg">Documents officiels</h3>
              </div>
              <div className="space-y-3">
                {acteur.cni ? (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border-2 border-gray-100">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-blue-50">
                      <Paperclip className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-900">CNI : {acteur.cni}</p>
                      <p className="text-xs text-gray-500">Numéro de CNI enregistré</p>
                    </div>
                    <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-green-100 text-green-700">valide</span>
                  </motion.div>
                ) : (
                  <div className="py-10 flex flex-col items-center justify-center text-gray-400">
                    <Paperclip className="w-10 h-10 mb-2 opacity-30" />
                    <p className="text-sm font-semibold">Aucun document enregistré</p>
                    <p className="text-xs mt-1">Les documents soumis lors de l’identification apparaîtront ici</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TRANSACTIONS */}
          {activeTab === 'transactions' && (
            <div>
              <h3 className="font-black text-gray-900 text-lg mb-4">Transactions récentes</h3>
              {acteurTx.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucune transaction trouvée</p>
              ) : (
                <div className="space-y-3">
                  {acteurTx.map(tx => (
                    <div key={tx.id} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border-2 border-gray-100">
                      <div>
                        <p className="font-bold text-sm text-gray-900">{tx.produit}</p>
                        <p className="text-xs text-gray-500">{tx.quantite} • {tx.modePaiement}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-black text-base" style={{ color: BO_PRIMARY }}>{(tx.montant || 0).toLocaleString('fr-FR')} FCFA</p>
                        <p className="text-xs text-gray-500">Commission: {(tx.commission || 0).toLocaleString('fr-FR')} FCFA</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ACTIVITÉ MÉTIER */}
          {activeTab === 'contextuel' && (
            <div className="py-10 text-center text-gray-500">
              <ContextualIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="font-semibold text-gray-700">{contextualTab.label}</p>
              <p className="text-sm mt-2">Contenu disponible en Phase 4D-2b</p>
              <motion.button
                type="button"
                onClick={() => navigate(`${contextualTab.route}?acteurId=${acteur.id}`)}
                className="mt-5 px-5 py-2.5 rounded-2xl font-bold text-white text-sm"
                style={{ backgroundColor: BO_PRIMARY }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                Voir tout
              </motion.button>
            </div>
          )}

          {/* SIGNALEMENTS */}
          {activeTab === 'signalements' && canViewSignalements && (
            <div>
              <h3 className="font-black text-gray-900 text-lg mb-4">Signalements</h3>
              {flagsForActeur.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Aucun signalement pour cet acteur</p>
              ) : (
                <div className="space-y-3">
                  {flagsForActeur.map(flag => (
                    <div key={flag.id} className="p-4 rounded-2xl bg-gray-50 border-2 border-gray-100">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="inline-flex px-2 py-1 rounded-lg text-xs font-bold bg-red-100 text-red-700 capitalize">
                            {flag.flagType}
                          </span>
                          <p className="font-bold text-sm text-gray-900 mt-2">{flag.raison}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(flag.createdAt).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled
                          className="px-3 py-2 rounded-xl border-2 border-gray-200 text-xs font-bold text-gray-400 bg-white cursor-not-allowed"
                        >
                          Résoudre
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* HISTORIQUE */}
          {activeTab === 'historique' && (
            <div>
              <h3 className="font-black text-gray-900 text-lg mb-4">Historique des actions BO</h3>
              <div className="space-y-3">
                {allHistory.length === 0 ? (
                  <p className="text-center text-gray-400 py-8">Aucun historique disponible</p>
                ) : (
                  allHistory.map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-start gap-4 p-4 rounded-2xl bg-gray-50 border-2 border-gray-100"
                    >
                      <div className="flex flex-col items-center gap-1 flex-shrink-0">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: h.couleur }} />
                        {i < allHistory.length - 1 && <div className="w-0.5 h-6 bg-gray-200" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-sm text-gray-900">{h.action}</p>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">{new Date(h.date).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <p className="text-xs text-gray-500">{h.auteur}</p>
                        {h.detail && (
                          <p
                            className="text-xs font-semibold mt-1 px-2 py-0.5 rounded-lg bg-white border border-gray-200 inline-block"
                            style={{ color: h.couleur }}
                          >
                            {h.detail}
                          </p>
                        )}
                        <span className="text-[10px] text-gray-400 mt-0.5 block">{h.module}</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Modal Confirmation */}
      {showConfirm && confirmConfig[showConfirm] && (
        <ConfirmModal
          open={true}
          title={confirmConfig[showConfirm].title}
          message={confirmConfig[showConfirm].message}
          danger={confirmConfig[showConfirm].danger}
          onConfirm={async () => {
            try {
              await executeCriticalAction(showConfirm);
            } catch (err) {
              console.warn('[BOActeurDetail] executeCriticalAction failed:', err instanceof Error ? err.message : err);
              toast.error('Action impossible. Réessaie.');
            }
          }}
          onCancel={() => setShowConfirm(null)}
        />
      )}

      {/* Modal Changer Type */}
      <AnimatePresence>
        {showRoleModal && (
          <motion.div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowRoleModal(false)}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="role-modal-title"
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-2"
              style={{ borderColor: '#F97316' }}
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 id="role-modal-title" className="font-black text-gray-900 text-lg">Changer le type</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Action journalisée dans l’audit</p>
                </div>
                <button
                  aria-label="Fermer la fenêtre de changement de type"
                  onClick={() => setShowRoleModal(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">Type actuel : <strong>{acteur.type}</strong></p>
              <div className="space-y-2 mb-5">
                {ROLE_OPTIONS.filter(r => r.value !== acteur.type && r.value !== acteur.role).map(r => (
                  <button key={r.value} onClick={() => setNewRole(r.value)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl border-2 transition-all text-left"
                    style={{ borderColor: newRole === r.value ? '#F97316' : '#e5e7eb', backgroundColor: newRole === r.value ? '#FFF7ED' : 'transparent' }}>
                    <div className="w-3 h-3 rounded-full border-2 flex-shrink-0"
                      style={{ borderColor: '#F97316', backgroundColor: newRole === r.value ? '#F97316' : 'transparent' }} />
                    <span className="font-semibold text-sm text-gray-900">{r.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowRoleModal(false)} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-700">Annuler</button>
                <motion.button onClick={handleChangeRole}
                  className="flex-1 py-3 rounded-2xl font-bold text-white flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#F97316' }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Save className="w-4 h-4" /> Confirmer
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Sous-profil marchand */}
      <AnimatePresence>
        {showSousProfilModal && (
          <motion.div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => { setShowSousProfilModal(false); setMotifSousProfil(''); }}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="sous-profil-modal-title"
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-2"
              style={{ borderColor: BO_PRIMARY }}
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 id="sous-profil-modal-title" className="font-black text-gray-900 text-lg">Modifier le sous-profil marchand</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Sous-profil actuel : {SOUS_PROFILS_MARCHAND.find(s => s.value === (acteur as any).sousProfilMarchand)?.label || 'Non défini'}
                  </p>
                </div>
                <button
                  aria-label="Fermer la fenêtre de modification du sous-profil"
                  onClick={() => { setShowSousProfilModal(false); setMotifSousProfil(''); }}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <label htmlFor="sous-profil-select" className="block text-xs font-semibold text-gray-600 mb-2">
                Sous-profil marchand
              </label>
              <select
                id="sous-profil-select"
                value={nouveauSousProfil}
                onChange={e => setNouveauSousProfil(e.target.value)}
                className="rounded-2xl border-2 border-gray-200 w-full py-3 px-4 mb-4 text-sm font-medium focus:outline-none"
              >
                <option value="">Choisir le sous-profil</option>
                {SOUS_PROFILS_MARCHAND.map(sousProfil => (
                  <option key={sousProfil.value} value={sousProfil.value}>{sousProfil.label}</option>
                ))}
              </select>
              <label htmlFor="sous-profil-motif" className="block text-xs font-semibold text-gray-600 mb-2">
                Motif (optionnel)
              </label>
              <textarea
                id="sous-profil-motif"
                value={motifSousProfil}
                onChange={e => setMotifSousProfil(e.target.value)}
                maxLength={500}
                rows={3}
                className="rounded-2xl border-2 border-gray-200 w-full py-3 px-4 mb-5 text-sm font-medium focus:outline-none resize-none"
                placeholder="Motif de la modification"
              />
              <div className="flex gap-3">
                <button onClick={() => { setShowSousProfilModal(false); setMotifSousProfil(''); }} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-700">Annuler</button>
                <motion.button onClick={handleChangeSousProfil}
                  disabled={savingSousProfil || !nouveauSousProfil || nouveauSousProfil === (acteur as any).sousProfilMarchand}
                  className="flex-1 py-3 rounded-2xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: BO_PRIMARY }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Save className="w-4 h-4" /> {savingSousProfil ? 'Enregistrement...' : 'Enregistrer'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal Réinitialiser Mot de Passe */}
      <AnimatePresence>
        {showResetPasswordModal && (
          <motion.div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowResetPasswordModal(false)}>
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="reset-mdp-modal-title"
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border-2"
              style={{ borderColor: BO_PRIMARY }}
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 id="reset-mdp-modal-title" className="font-black text-gray-900 text-lg">Réinitialiser le mot de passe</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{acteur.prenoms} {acteur.nom}</p>
                </div>
                <button
                  aria-label="Fermer la fenêtre de réinitialisation"
                  onClick={() => setShowResetPasswordModal(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Un nouveau mot de passe sera généré par le système et envoyé directement par SMS à {acteur.prenoms} {acteur.nom}. Vous ne verrez pas le mot de passe pour des raisons de sécurité.
              </p>

              <div className="flex gap-3">
                <button onClick={() => setShowResetPasswordModal(false)} className="flex-1 py-3 rounded-2xl border-2 border-gray-200 font-bold text-gray-700">Annuler</button>
                <motion.button onClick={handleResetPassword}
                  disabled={resetPasswordLoading}
                  className="flex-1 py-3 rounded-2xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: BO_PRIMARY }}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                  <Key className="w-4 h-4" /> {resetPasswordLoading ? 'Réinitialisation...' : 'Réinitialiser'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSignalementModal && (
          <SignalementModal
            acteur={{
              id: acteur.id,
              prenoms: acteur.prenoms,
              nom: acteur.nom,
              role: acteur.role,
              type: acteur.type,
            }}
            onClose={() => setShowSignalementModal(false)}
            onSuccess={(flag) => {
              setFlagsForActeur(prev => [
                {
                  id: flag.id,
                  flagType: 'autre',
                  raison: flag.raison,
                  commentaire: null,
                  userId: acteur.id,
                  createdBy: boUser?.id || '',
                  createdAt: new Date().toISOString(),
                  resolvedAt: null,
                  resolutionNote: null,
                },
                ...prev,
              ]);
              toast.success('Signalement enregistré');
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}