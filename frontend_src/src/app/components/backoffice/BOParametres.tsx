import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import {
  Settings, Shield, AlertTriangle, Star, Percent, Clock,
  Bell, Smartphone, Save, RotateCcw, ChevronRight,
  Lock, Zap, Database, Globe, CheckCircle2, Info,
  Flag, FlaskConical, Activity, History, X, ArrowLeft,
} from 'lucide-react';
import { useBackOffice } from '../../contexts/BackOfficeContext';
import { BO_PRIMARY, BO_DARK } from './bo-theme';
import { toast } from 'sonner';
import { API_URL } from '../../utils/api';

interface ParamSection {
  id: string;
  titre: string;
  description: string;
  icon: any;
  color: string;
}

interface FeatureFlag {
  key: string;
  label: string;
  desc: string;
  enabled: boolean;
}

interface ABTest {
  nom: string;
  variantes: string[];
  repartition: string;
  statut: string;
  metrique: string;
  resultA: string;
  resultB: string;
}

interface ServiceHealth {
  service: string;
  statut: string;
  uptime: string;
  latence: string;
  dernierCheck: string;
  color: string;
}

interface ChangelogEntry {
  version: string;
  date: string;
  items: string[];
}

const ALL_SECTIONS: ParamSection[] = [
  { id: 'scoring', titre: 'Scoring et évaluation', description: 'Règles de calcul du score de performance', icon: Star, color: BO_PRIMARY },
  { id: 'alertes', titre: 'Seuils d\'alertes', description: 'Déclencheurs automatiques de notifications', icon: AlertTriangle, color: '#EF4444' },
  { id: 'suspension', titre: 'Suspension automatique', description: 'Conditions de suspension sans intervention humaine', icon: Shield, color: '#EF4444' },
  { id: 'commissions', titre: 'Règles de commissions', description: 'Barème et conditions de paiement', icon: Percent, color: '#10B981' },
  { id: 'sessions', titre: 'Sessions et sécurité', description: 'Durée de session, 2FA et liste blanche d\'IP', icon: Lock, color: '#3B82F6' },
  { id: 'notifications', titre: 'Notifications système', description: 'SMS, push et e-mail automatiques', icon: Bell, color: '#8B5CF6' },
  { id: 'api', titre: 'API et intégrations', description: 'Clés API, webhooks et partenaires', icon: Database, color: BO_DARK },
  { id: 'plateforme', titre: 'Paramètres plateforme', description: 'Version app, maintenance et mode débogage', icon: Globe, color: '#F59E0B' },
  { id: 'feature_flags', titre: 'Feature Flags', description: 'Activer ou désactiver des fonctionnalités', icon: Flag, color: '#10B981' },
  { id: 'ab_testing', titre: 'A/B Testing', description: 'Variantes et tests utilisateurs', icon: FlaskConical, color: '#8B5CF6' },
  { id: 'sante', titre: 'Santé des services', description: 'Statut Supabase, ElevenLabs, OpenAI', icon: Activity, color: '#3B82F6' },
  { id: 'changelog', titre: 'Historique versions', description: 'Journal des mises à jour', icon: History, color: '#6B7280' },
];

const DEV_ONLY_SECTIONS = new Set(['feature_flags', 'ab_testing', 'changelog']);

const SECTIONS: ParamSection[] = import.meta.env.DEV
  ? ALL_SECTIONS
  : ALL_SECTIONS.filter(s => !DEV_ONLY_SECTIONS.has(s.id));

function Toggle({ value, onChange }: { value: boolean; onChange: () => void }) {
  return (
    <motion.button onClick={onChange}
      className={`w-12 h-6 rounded-full relative flex-shrink-0 transition-colors`}
      style={{ backgroundColor: value ? BO_PRIMARY : '#d1d5db' }}
      whileTap={{ scale: 0.95 }}>
      <motion.div className="w-5 h-5 bg-white rounded-full shadow-md absolute top-0.5"
        animate={{ left: value ? '26px' : '2px' }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
    </motion.button>
  );
}

function SliderInput({ value, min, max, step = 1, onChange, unit = '' }: { value: number; min: number; max: number; step?: number; onChange: (v: number) => void; unit?: string }) {
  const pct = ((value - min) / (max - min)) * 100;
  const trackRef = React.useRef<HTMLDivElement>(null);

  const handleInteraction = (clientX: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = min + ratio * (max - min);
    const stepped = Math.round(raw / step) * step;
    onChange(Math.max(min, Math.min(max, parseFloat(stepped.toFixed(10)))));
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handleInteraction(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.buttons > 0) {
      handleInteraction(e.clientX);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div
        ref={trackRef}
        className="flex-1 h-3 bg-gray-200 rounded-full cursor-pointer relative border border-gray-300"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        style={{ touchAction: 'none' }}
      >
        {/* Filled track */}
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%`, backgroundColor: BO_PRIMARY }}
        />
        {/* Thumb */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-white shadow-md"
          style={{ left: `calc(${pct}% - 10px)`, backgroundColor: BO_PRIMARY }}
        />
      </div>
      <span className="text-sm font-black text-gray-900 min-w-[60px] text-right">{value}{unit}</span>
    </div>
  );
}

export function BOParametres() {
  const { hasPermission, addAuditLog, boUser } = useBackOffice();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('scoring');
  const [saved, setSaved] = useState(false);
  const [mobileModalOpen, setMobileModalOpen] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);

  const canWrite = hasPermission('parametres.write');

  // Scoring
  const [scoring, setScoring] = useState({
    poidsTransactions: 0,
    poidsFormation: 0,
    poidsPresence: 0,
    poidsAnciennete: 0,
    bonusCooperative: 0,
    bonusAcademy: 0,
    penaliteSuspension: 0,
    penaliteRetard: 0,
  });

  // Alertes
  const [alertes, setAlertes] = useState({
    inactiviteJours: 0,
    transactionSuspect: 0,
    volumeAnormal: 0,
    dossierAttentHeures: 0,
    tauxActiviteMin: 0,
    nbLitigesMax: 0,
  });

  // Suspension auto
  const [suspension, setSuspension] = useState({
    scoreMinSuspension: 0,
    nbLitigesAuto: 0,
    nbTransactionsSuspectes: 0,
    inactiviteAutoJours: 0,
    suspensionAutoActive: false,
    notifierAvantJours: 0,
  });

  // Commissions
  const [commissions, setCommissions] = useState({
    tauxBase: 0,
    bonusObjectif: 0,
    delaiPaiementJours: 0,
    seuiMinPaiement: 0,
    paiementAutoActive: false,
    periodeCalcul: '',
  });

  // Sessions
  const [sessions, setSessions] = useState({
    dureeSessionMinutes: 0,
    tentativesEchecMax: 0,
    delaiVerrouillageMinutes: 0,
    deuxFA: false,
    journalisationIP: false,
  });

  // Notifications
  const [notifs, setNotifs] = useState({
    smsActif: false,
    emailActif: false,
    pushActif: false,
    alertesCritiques: false,
    dossiersEnAttente: false,
    rapportHebdo: false,
  });

  // API
  const [api, setApi] = useState({
    apiVersion: '',
    webhookUrl: '',
    rateLimitPerMin: 0,
    maintenanceMode: false,
    primaryKeyMasked: '',
  });

  // Plateforme
  const [plateforme, setPlateforme] = useState({
    versionAndroid: '',
    versionIOS: '',
    modeDebug: false,
    maintenanceProgrammee: false,
    messageMaintenace: '',
    dureeMaintenanceH: 0,
  });

  // TODO: endpoint à créer
  const [featureFlags, setFeatureFlags] = useState<FeatureFlag[]>([]);
  // TODO: endpoint à créer
  const [abTests, setAbTests] = useState<ABTest[]>([]);
  const [servicesHealth, setServicesHealth] = useState<ServiceHealth[]>([]);
  // TODO: endpoint à créer
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);

  useEffect(() => {
    const toNum = (v: string | undefined, fallback = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };
    const toBool = (v: string | undefined, fallback = false) => {
      if (v == null) return fallback;
      return ['true', '1', 'yes', 'on'].includes(String(v).toLowerCase());
    };
    const loadConfig = async () => {
      setLoadingConfig(true);
      try {
        const [paramRes, monitoringRes] = await Promise.all([
          fetch(`${API_URL}/admin/wallets/config/parametres`, { credentials: 'include' }),
          fetch(`${API_URL}/admin/monitoring`, { credentials: 'include' }),
        ]);
        const cfg = paramRes.ok ? await paramRes.json() : {};
        const monitoring = monitoringRes.ok ? await monitoringRes.json() : {};
        const data: Record<string, string> = cfg && typeof cfg === 'object' ? cfg : {};

        setScoring({
          poidsTransactions: toNum(data.scoring_poids_transactions),
          poidsFormation: toNum(data.scoring_poids_formation),
          poidsPresence: toNum(data.scoring_poids_presence),
          poidsAnciennete: toNum(data.scoring_poids_anciennete),
          bonusCooperative: toNum(data.scoring_bonus_cooperative),
          bonusAcademy: toNum(data.scoring_bonus_academy),
          penaliteSuspension: toNum(data.scoring_penalite_suspension),
          penaliteRetard: toNum(data.scoring_penalite_retard),
        });
        setAlertes({
          inactiviteJours: toNum(data.alertes_inactivite_jours),
          transactionSuspect: toNum(data.alertes_transaction_suspect),
          volumeAnormal: toNum(data.alertes_volume_anormal),
          dossierAttentHeures: toNum(data.alertes_dossier_attente_heures),
          tauxActiviteMin: toNum(data.alertes_taux_activite_min),
          nbLitigesMax: toNum(data.alertes_nb_litiges_max),
        });
        setSuspension({
          scoreMinSuspension: toNum(data.suspension_score_min),
          nbLitigesAuto: toNum(data.suspension_nb_litiges_auto),
          nbTransactionsSuspectes: toNum(data.suspension_nb_transactions_suspectes),
          inactiviteAutoJours: toNum(data.suspension_inactivite_jours),
          suspensionAutoActive: toBool(data.suspension_auto_active),
          notifierAvantJours: toNum(data.suspension_notifier_avant_jours),
        });
        setCommissions({
          tauxBase: toNum(data.commissions_taux_base),
          bonusObjectif: toNum(data.commissions_bonus_objectif),
          delaiPaiementJours: toNum(data.commissions_delai_paiement_jours),
          seuiMinPaiement: toNum(data.commissions_seuil_min_paiement),
          paiementAutoActive: toBool(data.commissions_paiement_auto_active),
          periodeCalcul: data.commissions_periode_calcul || '',
        });
        setSessions({
          dureeSessionMinutes: toNum(data.sessions_duree_minutes),
          tentativesEchecMax: toNum(data.sessions_tentatives_echec_max),
          delaiVerrouillageMinutes: toNum(data.sessions_delai_verrouillage_minutes),
          deuxFA: toBool(data.sessions_deux_fa),
          journalisationIP: toBool(data.sessions_journalisation_ip),
        });
        setNotifs({
          smsActif: toBool(data.notifs_sms_actif),
          emailActif: toBool(data.notifs_email_actif),
          pushActif: toBool(data.notifs_push_actif),
          alertesCritiques: toBool(data.notifs_alertes_critiques),
          dossiersEnAttente: toBool(data.notifs_dossiers_attente),
          rapportHebdo: toBool(data.notifs_rapport_hebdo),
        });
        setApi({
          apiVersion: data.api_version || '',
          webhookUrl: data.api_webhook_url || '',
          rateLimitPerMin: toNum(data.api_rate_limit_per_min),
          maintenanceMode: toBool(data.api_maintenance_mode),
          primaryKeyMasked: data.api_primary_key_masked || '',
        });
        setPlateforme({
          versionAndroid: data.platform_version_android || '',
          versionIOS: data.platform_version_ios || '',
          modeDebug: toBool(data.platform_mode_debug),
          maintenanceProgrammee: toBool(data.platform_maintenance_programmee),
          messageMaintenace: data.platform_message_maintenance || '',
          dureeMaintenanceH: toNum(data.platform_duree_maintenance_h),
        });

        const services = Array.isArray(monitoring?.services) ? monitoring.services : [];
        setServicesHealth(services.map((s: any) => ({
          service: String(s.name || s.service || ''),
          statut: String(s.status || s.statut || ''),
          uptime: String(s.uptime || ''),
          latence: String(s.latence || s.latency || ''),
          dernierCheck: String(s.lastCheck || s.dernierCheck || ''),
          color: String(s.status || s.statut || '').toLowerCase().includes('oper') ? '#10B981' : '#EF4444',
        })));
      } catch (err) {
        console.warn('[BOParametres] loadConfig failed:', err instanceof Error ? err.message : err);
        toast.error('Impossible de charger la configuration');
      } finally {
        setLoadingConfig(false);
      }
    };
    void loadConfig();
  }, []);

  const handleSave = async () => {
    try {
      const payload: Record<string, string> = {
        scoring_poids_transactions: String(scoring.poidsTransactions),
        scoring_poids_formation: String(scoring.poidsFormation),
        scoring_poids_presence: String(scoring.poidsPresence),
        scoring_poids_anciennete: String(scoring.poidsAnciennete),
        scoring_bonus_cooperative: String(scoring.bonusCooperative),
        scoring_bonus_academy: String(scoring.bonusAcademy),
        scoring_penalite_suspension: String(scoring.penaliteSuspension),
        scoring_penalite_retard: String(scoring.penaliteRetard),
        alertes_inactivite_jours: String(alertes.inactiviteJours),
        alertes_transaction_suspect: String(alertes.transactionSuspect),
        alertes_volume_anormal: String(alertes.volumeAnormal),
        alertes_dossier_attente_heures: String(alertes.dossierAttentHeures),
        alertes_taux_activite_min: String(alertes.tauxActiviteMin),
        alertes_nb_litiges_max: String(alertes.nbLitigesMax),
        suspension_score_min: String(suspension.scoreMinSuspension),
        suspension_nb_litiges_auto: String(suspension.nbLitigesAuto),
        suspension_nb_transactions_suspectes: String(suspension.nbTransactionsSuspectes),
        suspension_inactivite_jours: String(suspension.inactiviteAutoJours),
        suspension_auto_active: String(suspension.suspensionAutoActive),
        suspension_notifier_avant_jours: String(suspension.notifierAvantJours),
        commissions_taux_base: String(commissions.tauxBase),
        commissions_bonus_objectif: String(commissions.bonusObjectif),
        commissions_delai_paiement_jours: String(commissions.delaiPaiementJours),
        commissions_seuil_min_paiement: String(commissions.seuiMinPaiement),
        commissions_paiement_auto_active: String(commissions.paiementAutoActive),
        commissions_periode_calcul: commissions.periodeCalcul,
        sessions_duree_minutes: String(sessions.dureeSessionMinutes),
        sessions_tentatives_echec_max: String(sessions.tentativesEchecMax),
        sessions_delai_verrouillage_minutes: String(sessions.delaiVerrouillageMinutes),
        sessions_deux_fa: String(sessions.deuxFA),
        sessions_journalisation_ip: String(sessions.journalisationIP),
        notifs_sms_actif: String(notifs.smsActif),
        notifs_email_actif: String(notifs.emailActif),
        notifs_push_actif: String(notifs.pushActif),
        notifs_alertes_critiques: String(notifs.alertesCritiques),
        notifs_dossiers_attente: String(notifs.dossiersEnAttente),
        notifs_rapport_hebdo: String(notifs.rapportHebdo),
        api_version: api.apiVersion,
        api_webhook_url: api.webhookUrl,
        api_rate_limit_per_min: String(api.rateLimitPerMin),
        api_maintenance_mode: String(api.maintenanceMode),
        platform_version_android: plateforme.versionAndroid,
        platform_version_ios: plateforme.versionIOS,
        platform_mode_debug: String(plateforme.modeDebug),
        platform_maintenance_programmee: String(plateforme.maintenanceProgrammee),
        platform_message_maintenance: plateforme.messageMaintenace,
        platform_duree_maintenance_h: String(plateforme.dureeMaintenanceH),
      };
      const res = await fetch(`${API_URL}/admin/wallets/config/parametres`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        toast.error('Échec de sauvegarde des paramètres');
        return false;
      }
      if (boUser) addAuditLog({
        action: `MODIFICATION paramètres - section "${activeSection}"`,
        utilisateurBO: `${boUser.prenom} ${boUser.nom}`,
        roleBO: boUser.role,
        ancienneValeur: 'configuration précédente',
        nouvelleValeur: activeSection,
        module: 'Paramètres',
      });
      setSaved(true);
      toast.success('Paramètres enregistrés avec succès - journalisé');
      setTimeout(() => setSaved(false), 3000);
      return true;
    } catch (err) {
      console.warn('[BOParametres] handleSave failed:', err instanceof Error ? err.message : err);
      toast.error('Échec de sauvegarde');
      return false;
    }
  };

  const handleReset = async (section: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/wallets/config/parametres/reset?section=${section}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!res.ok) throw new Error();
      toast.success(`Paramètres "${section}" réinitialisés`);
    } catch (err) {
      console.warn('[BOParametres] handleReset failed:', err instanceof Error ? err.message : err);
      toast.error('Impossible de réinitialiser. Réessaie.');
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'scoring':
        return (
          <div className="space-y-5">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex gap-3">
              <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700 font-medium">La somme des poids doit être égale à 100%. Total actuel : <strong>{scoring.poidsTransactions + scoring.poidsFormation + scoring.poidsPresence + scoring.poidsAnciennete}%</strong></p>
            </div>
            <h3 className="font-black text-gray-900">Poids par composante</h3>
            {[
              { key: 'poidsTransactions', label: 'Transactions (volume et fréquence)', max: 60 },
              { key: 'poidsFormation', label: 'Formation Julaba Academy complétée', max: 40 },
              { key: 'poidsPresence', label: 'Présence et connexions régulières', max: 40 },
              { key: 'poidsAnciennete', label: 'Ancienneté sur la plateforme', max: 30 },
            ].map(f => (
              <div key={f.key}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-gray-700">{f.label}</label>
                </div>
                <SliderInput value={(scoring as any)[f.key]} min={0} max={f.max} onChange={v => setScoring(p => ({ ...p, [f.key]: v }))} unit="%" />
              </div>
            ))}
            <h3 className="font-black text-gray-900 pt-2">Bonus & Pénalités</h3>
            {[
              { key: 'bonusCooperative', label: 'Bonus coopérative (membres actifs)', onChange: (v: number) => setScoring(p => ({ ...p, bonusCooperative: v })) },
              { key: 'bonusAcademy', label: 'Bonus modules Academy complétés', onChange: (v: number) => setScoring(p => ({ ...p, bonusAcademy: v })) },
              { key: 'penaliteSuspension', label: 'Pénalité suspension temporaire', onChange: (v: number) => setScoring(p => ({ ...p, penaliteSuspension: v })) },
              { key: 'penaliteRetard', label: 'Pénalité retard de paiement', onChange: (v: number) => setScoring(p => ({ ...p, penaliteRetard: v })) },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-bold text-gray-700 mb-2">{f.label}</label>
                <SliderInput value={(scoring as any)[f.key]} min={0} max={50} onChange={f.onChange} unit=" pts" />
              </div>
            ))}
          </div>
        );

      case 'alertes':
        return (
          <div className="space-y-5">
            <h3 className="font-black text-gray-900">Seuils de déclenchement</h3>
            {[
              { key: 'inactiviteJours', label: 'Alerte inactivité (jours sans connexion)', min: 1, max: 30, unit: ' j', onChange: (v: number) => setAlertes(p => ({ ...p, inactiviteJours: v })) },
              { key: 'transactionSuspect', label: 'Nb transactions anormales (sur 24h)', min: 5, max: 200, unit: '', onChange: (v: number) => setAlertes(p => ({ ...p, transactionSuspect: v })) },
              { key: 'volumeAnormal', label: 'Volume x fois supérieur à la moyenne', min: 2, max: 10, unit: 'x', onChange: (v: number) => setAlertes(p => ({ ...p, volumeAnormal: v })) },
              { key: 'dossierAttentHeures', label: 'Dossier en attente max (heures)', min: 24, max: 168, step: 24, unit: 'h', onChange: (v: number) => setAlertes(p => ({ ...p, dossierAttentHeures: v })) },
              { key: 'tauxActiviteMin', label: 'Taux d\'activité minimal zone (%)', min: 10, max: 80, unit: '%', onChange: (v: number) => setAlertes(p => ({ ...p, tauxActiviteMin: v })) },
              { key: 'nbLitigesMax', label: 'Nb litiges avant alerte critique', min: 1, max: 10, unit: '', onChange: (v: number) => setAlertes(p => ({ ...p, nbLitigesMax: v })) },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-bold text-gray-700 mb-2">{f.label}</label>
                <SliderInput value={(alertes as any)[f.key]} min={f.min} max={f.max} step={f.step} onChange={f.onChange} unit={f.unit} />
              </div>
            ))}
          </div>
        );

      case 'suspension':
        return (
          <div className="space-y-5">
            <div className="flex items-center justify-between p-4 rounded-2xl bg-red-50 border-2 border-red-200">
              <div>
                <p className="font-bold text-red-900">Suspension automatique</p>
                <p className="text-xs text-red-700">Suspend un acteur sans validation humaine</p>
              </div>
              <Toggle value={suspension.suspensionAutoActive} onChange={() => setSuspension(p => ({ ...p, suspensionAutoActive: !p.suspensionAutoActive }))} />
            </div>
            {[
              { key: 'scoreMinSuspension', label: 'Score minimum avant suspension (pts)', min: 0, max: 50, unit: ' pts' },
              { key: 'nbLitigesAuto', label: 'Nb litiges déclenchant la suspension', min: 1, max: 20, unit: '' },
              { key: 'nbTransactionsSuspectes', label: 'Transactions suspectes (suspension auto)', min: 5, max: 50, unit: '' },
              { key: 'inactiviteAutoJours', label: 'Inactivité totale avant suspension (jours)', min: 14, max: 90, unit: ' j' },
              { key: 'notifierAvantJours', label: 'Notification pré-suspension (jours avant)', min: 1, max: 14, unit: ' j' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-bold text-gray-700 mb-2">{f.label}</label>
                <SliderInput value={(suspension as any)[f.key]} min={f.min} max={f.max} onChange={v => setSuspension(p => ({ ...p, [f.key]: v }))} unit={f.unit} />
              </div>
            ))}
          </div>
        );

      case 'commissions':
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Taux de base (%)</label>
              <SliderInput value={commissions.tauxBase} min={0.5} max={5} step={0.5} onChange={v => setCommissions(p => ({ ...p, tauxBase: v }))} unit="%" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Bonus objectif dépassé (%)</label>
              <SliderInput value={commissions.bonusObjectif} min={0} max={50} step={5} onChange={v => setCommissions(p => ({ ...p, bonusObjectif: v }))} unit="%" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Délai de paiement (jours)</label>
              <SliderInput value={commissions.delaiPaiementJours} min={7} max={90} step={7} onChange={v => setCommissions(p => ({ ...p, delaiPaiementJours: v }))} unit=" j" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Seuil minimum paiement (FCFA)</label>
              <SliderInput value={commissions.seuiMinPaiement} min={500} max={10000} step={500} onChange={v => setCommissions(p => ({ ...p, seuiMinPaiement: v }))} unit=" FCFA" />
            </div>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border-2 border-gray-200">
              <div>
                <p className="font-bold text-gray-900">Paiement automatique</p>
                <p className="text-xs text-gray-600">Déclenche le virement automatiquement à l'échéance</p>
              </div>
              <Toggle value={commissions.paiementAutoActive} onChange={() => setCommissions(p => ({ ...p, paiementAutoActive: !p.paiementAutoActive }))} />
            </div>
          </div>
        );

      case 'sessions':
        return (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Durée session Back-Office (minutes)</label>
              <SliderInput value={sessions.dureeSessionMinutes} min={30} max={1440} step={30} onChange={v => setSessions(p => ({ ...p, dureeSessionMinutes: v }))} unit=" min" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Tentatives échouées max</label>
              <SliderInput value={sessions.tentativesEchecMax} min={3} max={10} onChange={v => setSessions(p => ({ ...p, tentativesEchecMax: v }))} unit="" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Délai verrouillage (minutes)</label>
              <SliderInput value={sessions.delaiVerrouillageMinutes} min={5} max={60} step={5} onChange={v => setSessions(p => ({ ...p, delaiVerrouillageMinutes: v }))} unit=" min" />
            </div>
            {[
              { key: 'deuxFA', label: 'Authentification 2 facteurs (2FA)', desc: 'Code SMS à chaque connexion BO' },
              { key: 'journalisationIP', label: 'Journalisation IP', desc: 'Enregistrer l\'adresse IP de chaque action' },
            ].map(f => (
              <div key={f.key} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border-2 border-gray-200">
                <div>
                  <p className="font-bold text-gray-900">{f.label}</p>
                  <p className="text-xs text-gray-600">{f.desc}</p>
                </div>
                <Toggle value={(sessions as any)[f.key]} onChange={() => setSessions(p => ({ ...p, [f.key]: !(p as any)[f.key] }))} />
              </div>
            ))}
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-4">
            <h3 className="font-black text-gray-900">Canaux actifs</h3>
            {[
              { key: 'smsActif', label: 'SMS (Orange, MTN, Moov)', icon: Smartphone },
              { key: 'emailActif', label: 'Email automatique', icon: Globe },
              { key: 'pushActif', label: 'Push notification in-app', icon: Bell },
            ].map(f => {
              const Icon = f.icon || Zap;
              return (
                <div key={f.key} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border-2 border-gray-200">
                  <div className="flex items-center gap-3">
                    <Icon className="w-5 h-5 text-gray-600" />
                    <p className="font-bold text-gray-900">{f.label}</p>
                  </div>
                  <Toggle value={(notifs as any)[f.key]} onChange={() => setNotifs(p => ({ ...p, [f.key]: !(p as any)[f.key] }))} />
                </div>
              );
            })}
            <h3 className="font-black text-gray-900 pt-2">Événements notifiés</h3>
            {[
              { key: 'alertesCritiques', label: 'Alertes critiques (fraudes, anomalies)' },
              { key: 'dossiersEnAttente', label: 'Nouveaux dossiers en attente' },
              { key: 'rapportHebdo', label: 'Rapport hebdomadaire (lundi matin)' },
            ].map(f => (
              <div key={f.key} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border-2 border-gray-200">
                <p className="font-semibold text-gray-900 text-sm">{f.label}</p>
                <Toggle value={(notifs as any)[f.key]} onChange={() => setNotifs(p => ({ ...p, [f.key]: !(p as any)[f.key] }))} />
              </div>
            ))}
          </div>
        );

      case 'api':
        return (
          <div className="space-y-4">
            {[
              { label: 'Version API', value: api.apiVersion },
              { label: 'Webhook URL', value: api.webhookUrl },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-sm font-bold text-gray-700 mb-1">{f.label}</label>
                <div className="flex gap-2">
                  <input
                    value={f.label === 'Version API' ? api.apiVersion : api.webhookUrl}
                    onChange={e => {
                      if (f.label === 'Version API') {
                        setApi(p => ({ ...p, apiVersion: e.target.value }));
                      } else {
                        setApi(p => ({ ...p, webhookUrl: e.target.value }));
                      }
                    }}
                    className="flex-1 px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm font-mono"
                  />
                </div>
              </div>
            ))}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Rate limit (requêtes/minute)</label>
              <SliderInput value={api.rateLimitPerMin} min={10} max={500} step={10} onChange={v => setApi(p => ({ ...p, rateLimitPerMin: v }))} unit=" req/min" />
            </div>
            <div className="flex items-center justify-between p-4 rounded-2xl bg-orange-50 border-2 border-orange-200">
              <div>
                <p className="font-bold text-orange-900">Mode maintenance API</p>
                <p className="text-xs text-orange-700">Coupe les accès API externes (urgent)</p>
              </div>
              <Toggle value={api.maintenanceMode} onChange={() => setApi(p => ({ ...p, maintenanceMode: !p.maintenanceMode }))} />
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 border-2 border-gray-200">
              <p className="text-xs font-bold text-gray-600 mb-2">Clé API principale (masquée)</p>
              <div className="font-mono text-xs text-gray-500 bg-white px-3 py-2 rounded-xl border border-gray-200 tracking-widest">
                {api.primaryKeyMasked || '-'}
              </div>
            </div>
          </div>
        );

      case 'plateforme':
        return (
          <div className="space-y-4">
            {[
              { label: 'Version Android', value: plateforme.versionAndroid, onChange: (v: string) => setPlateforme(p => ({ ...p, versionAndroid: v })) },
              { label: 'Version iOS', value: plateforme.versionIOS, onChange: (v: string) => setPlateforme(p => ({ ...p, versionIOS: v })) },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-sm font-bold text-gray-700 mb-1">{f.label}</label>
                <input value={f.value} onChange={e => f.onChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:border-[#9F8170] focus:outline-none text-sm font-mono" />
              </div>
            ))}
            {[
              { key: 'modeDebug', label: 'Mode debug', desc: 'Logs verbeux côté app (développement)' },
              { key: 'maintenanceProgrammee', label: 'Maintenance programmée', desc: 'Affiche un écran de maintenance aux utilisateurs' },
            ].map(f => (
              <div key={f.key} className={`flex items-center justify-between p-4 rounded-2xl border-2 ${f.key === 'maintenanceProgrammee' ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                <div>
                  <p className={`font-bold ${f.key === 'maintenanceProgrammee' ? 'text-orange-900' : 'text-gray-900'}`}>{f.label}</p>
                  <p className={`text-xs ${f.key === 'maintenanceProgrammee' ? 'text-orange-700' : 'text-gray-600'}`}>{f.desc}</p>
                </div>
                <Toggle value={(plateforme as any)[f.key]} onChange={() => setPlateforme(p => ({ ...p, [f.key]: !(p as any)[f.key] }))} />
              </div>
            ))}
            {plateforme.maintenanceProgrammee && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Message affiché aux utilisateurs</label>
                  <textarea value={plateforme.messageMaintenace} onChange={e => setPlateforme(p => ({ ...p, messageMaintenace: e.target.value }))} rows={2}
                    className="w-full px-4 py-3 rounded-2xl border-2 border-orange-300 focus:border-[#9F8170] focus:outline-none text-sm resize-none"
                    placeholder="Jùlaba est en maintenance. Nous revenons dans 2 heures..." />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Durée estimée</label>
                  <SliderInput value={plateforme.dureeMaintenanceH} min={1} max={24} onChange={v => setPlateforme(p => ({ ...p, dureeMaintenanceH: v }))} unit="h" />
                </div>
              </motion.div>
            )}
          </div>
        );

      case 'feature_flags':
        return (
          <div className="space-y-4">
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-4 flex gap-3">
              <Info className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-700 font-medium">Les feature flags permettent d'activer ou de désactiver des fonctionnalités sans redéploiement.</p>
            </div>
            {featureFlags.map(f => (
              <div key={f.key} className="flex items-center justify-between p-4 rounded-2xl bg-gray-50 border-2 border-gray-200">
                <div>
                  <p className="font-bold text-gray-900">{f.label}</p>
                  <p className="text-xs text-gray-600">{f.desc}</p>
                </div>
                <Toggle value={f.enabled} onChange={() => toast.info(`Feature flag « ${f.label} » modifié (simulation)`)} />
              </div>
            ))}
            {featureFlags.length === 0 && (
              <p className="text-sm text-gray-500">Aucune feature flag disponible.</p>
            )}
          </div>
        );

      case 'ab_testing':
        return (
          <div className="space-y-4">
            <div className="bg-purple-50 border-2 border-purple-200 rounded-2xl p-4 flex gap-3">
              <Info className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-purple-700 font-medium">Tests A/B en cours et résultats. Les variantes sont réparties aléatoirement.</p>
            </div>
            {abTests.map((test, i) => (
              <div key={i} className="p-4 rounded-2xl bg-white border-2 border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-black text-gray-900">{test.nom}</p>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${test.statut === 'En cours' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{test.statut}</span>
                </div>
                <div className="flex gap-2">
                  {test.variantes.map((v, j) => (
                    <span key={j} className="text-xs font-bold px-2 py-1 rounded-xl bg-gray-100 text-gray-600">{v}</span>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Répartition : {test.repartition}</span>
                  <span>Métrique : {test.metrique}</span>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 p-2 rounded-xl bg-blue-50 text-center">
                    <p className="text-[10px] text-blue-600 font-bold">Variante A</p>
                    <p className="font-black text-blue-900">{test.resultA}</p>
                  </div>
                  <div className="flex-1 p-2 rounded-xl bg-purple-50 text-center">
                    <p className="text-[10px] text-purple-600 font-bold">Variante B</p>
                    <p className="font-black text-purple-900">{test.resultB}</p>
                  </div>
                </div>
              </div>
            ))}
            {abTests.length === 0 && (
              <p className="text-sm text-gray-500">Aucun test A/B disponible.</p>
            )}
          </div>
        );

      case 'sante':
        return (
          <div className="space-y-4">
            {servicesHealth.map(s => (
              <div key={s.service} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 border-2 border-gray-200">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">{s.service}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                    <span className="text-green-600 font-bold">{s.statut}</span>
                    <span>Uptime: {s.uptime}</span>
                    <span>Latence: {s.latence}</span>
                    <span>{s.dernierCheck}</span>
                  </div>
                </div>
              </div>
            ))}
            {servicesHealth.length === 0 && (
              <p className="text-sm text-gray-500">Aucune donnée de santé disponible.</p>
            )}
          </div>
        );

      case 'changelog':
        return (
          <div className="space-y-4">
            {changelog.map(entry => (
              <div key={entry.version} className="p-4 rounded-2xl bg-gray-50 border-2 border-gray-200">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-black text-gray-900">{entry.version}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{entry.date}</span>
                </div>
                <ul className="space-y-1">
                  {entry.items.map((item, i) => (
                    <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {changelog.length === 0 && (
              <p className="text-sm text-gray-500">Aucun historique de version disponible.</p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="px-4 lg:px-8 py-6 max-w-7xl mx-auto overflow-hidden">

      <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-6">
        <motion.button
          onClick={() => navigate('/backoffice/profil')}
          className="flex items-center gap-2 mb-3 px-3 py-2 rounded-2xl border-2 border-gray-200 text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:bg-gray-50 transition-all"
          whileHover={{ x: -4 }}
          whileTap={{ scale: 0.95 }}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-bold">Retour au profil</span>
        </motion.button>
        <h1 className="text-2xl lg:text-3xl font-black text-gray-900">Paramètres Système</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configuration globale de la plateforme Jùlaba</p>
      </motion.div>

      {!canWrite && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4 mb-5 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0" />
          <p className="text-sm font-semibold text-orange-800">Vous avez un accès en lecture seule sur cette section.</p>
        </motion.div>
      )}
      {loadingConfig && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 mb-5">
          <p className="text-sm font-semibold text-blue-800">Chargement des paramètres en cours...</p>
        </motion.div>
      )}

      {/* ── Desktop : sidebar + panel ── */}
      <div className="hidden lg:flex flex-row gap-6">
        {/* Menu latéral sections */}
        <div className="w-72 flex-shrink-0">
          <div className="bg-white rounded-3xl shadow-md border-2 border-gray-100 overflow-hidden">
            {SECTIONS.map((section, i) => {
              const Icon = section.icon || Zap;
              const active = activeSection === section.id;
              return (
                <motion.button key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-5 py-4 text-left transition-all border-b border-gray-100 last:border-0 ${active ? 'bg-gray-50' : 'hover:bg-gray-50'}`}
                  whileHover={!active ? { x: 4 } : {}}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: active ? `${section.color}20` : '#f3f4f6' }}>
                    <Icon className="w-5 h-5" style={{ color: active ? section.color : '#6b7280' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${active ? 'text-gray-900' : 'text-gray-600'}`}>{section.titre}</p>
                  </div>
                  {active && <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: section.color }} />}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Contenu section desktop */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div key={activeSection}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-white rounded-3xl p-6 shadow-md border-2 border-gray-100">
              {(() => {
                const section = SECTIONS.find(s => s.id === activeSection);
                if (!section) return null;
                const Icon = section.icon || Zap;
                return (
                  <div className="flex items-center gap-3 mb-6 pb-5 border-b-2 border-gray-100">
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${section.color}20` }}>
                      <Icon className="w-6 h-6" style={{ color: section.color }} />
                    </div>
                    <div>
                      <h2 className="font-black text-gray-900 text-lg">{section.titre}</h2>
                      <p className="text-xs text-gray-500">{section.description}</p>
                    </div>
                  </div>
                );
              })()}

              {renderSection()}

              {canWrite && (
                <div className="flex gap-3 mt-8 pt-5 border-t-2 border-gray-100">
                  <motion.button onClick={() => handleReset(activeSection)}
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl border-2 border-gray-200 font-bold text-sm text-gray-700"
                    whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }}>
                    <RotateCcw className="w-4 h-4" />
                    Réinitialiser
                  </motion.button>
                  <motion.button onClick={handleSave}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm text-white"
                    style={{ backgroundColor: saved ? '#10B981' : BO_PRIMARY }}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                    {saved ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                    {saved ? 'Enregistré !' : 'Enregistrer les modifications'}
                  </motion.button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* ── Mobile : liste de sections cliquables + bottom-sheet modal ── */}
      <div className="lg:hidden">
        <div className="bg-white rounded-3xl shadow-md border-2 border-gray-100 overflow-hidden">
          {SECTIONS.map((section, i) => {
            const Icon = section.icon || Zap;
            return (
              <motion.button key={section.id}
                onClick={() => { setActiveSection(section.id); setMobileModalOpen(true); }}
                className="w-full flex items-center gap-3 px-5 py-4 text-left transition-all border-b border-gray-100 last:border-0 hover:bg-gray-50 active:bg-gray-100"
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${section.color}15` }}>
                  <Icon className="w-5 h-5" style={{ color: section.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 truncate">{section.titre}</p>
                  <p className="text-xs text-gray-400 truncate">{section.description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </motion.button>
            );
          })}
        </div>

        {/* Bottom-sheet modal */}
        <AnimatePresence>
          {mobileModalOpen && (() => {
            const section = SECTIONS.find(s => s.id === activeSection);
            if (!section) return null;
            const Icon = section.icon || Zap;
            return (
              <motion.div
                className="fixed inset-0 z-[200] flex items-end justify-center bg-black/40 backdrop-blur-sm"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setMobileModalOpen(false)}
              >
                <motion.div
                  className="bg-white rounded-t-3xl border-t-2 border-x-2 border-gray-100 shadow-2xl p-5 w-full max-h-[85vh] overflow-y-auto"
                  initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 300 }}
                  onClick={e => e.stopPropagation()}
                >
                  {/* Barre de poignée */}
                  <div className="flex justify-center mb-4">
                    <div className="w-10 h-1 rounded-full bg-gray-300" />
                  </div>

                  {/* Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${section.color}15` }}>
                        <Icon className="w-5 h-5" style={{ color: section.color }} />
                      </div>
                      <div>
                        <h2 className="font-black text-gray-900 text-lg">{section.titre}</h2>
                        <p className="text-xs text-gray-500">{section.description}</p>
                      </div>
                    </div>
                    <motion.button onClick={() => setMobileModalOpen(false)}
                      className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0"
                      whileTap={{ scale: 0.9 }}>
                      <X className="w-4 h-4 text-gray-500" />
                    </motion.button>
                  </div>

                  {/* Contenu */}
                  {renderSection()}

                  {/* Boutons save/reset */}
                  {canWrite && (
                    <div className="flex gap-3 mt-6 pt-5 border-t-2 border-gray-100">
                      <motion.button onClick={() => handleReset(activeSection)}
                        className="flex items-center gap-2 px-4 py-3 rounded-2xl border-2 border-gray-200 font-bold text-sm text-gray-700"
                        whileTap={{ scale: 0.97 }}>
                        <RotateCcw className="w-4 h-4" />
                        Reset
                      </motion.button>
                      <motion.button onClick={async () => { const ok = await handleSave(); if (ok) setMobileModalOpen(false); }}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold text-sm text-white"
                        style={{ backgroundColor: saved ? '#10B981' : BO_PRIMARY }}
                        whileTap={{ scale: 0.97 }}>
                        {saved ? <CheckCircle2 className="w-5 h-5" /> : <Save className="w-5 h-5" />}
                        {saved ? 'Enregistré !' : 'Enregistrer'}
                      </motion.button>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
    </div>
  );
}