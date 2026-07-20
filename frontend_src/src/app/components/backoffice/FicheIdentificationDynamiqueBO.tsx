import React, { useRef, useState, useEffect, useId, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft, ArrowRight, Camera, Upload, User, Phone, MapPin,
  ShoppingBag, Building2, Sprout, Store, CheckCircle, X,
  FileText, Navigation as NavigationIcon, Users, Layers, RotateCcw,
  ChevronDown, AlertCircle, CheckCircle2,
  Clock, Send, ShieldCheck, Info, Zap, Trophy, Save,
  UserCircle, Sun, Glasses,
  ShoppingCart, LayoutGrid, Box,
  Shield, Flag, BarChart3,
} from 'lucide-react';
import { useLocation } from 'react-router';
import {
  CATEGORIES_PRINCIPALES,
  SOUS_CATEGORIES,
  PRODUITS_PAR_CATEGORIE,
} from '../../data/activites-vivriers';
import { MarcheSelect } from '../shared/MarcheSelect';
import { useUser } from '../../contexts/UserContext';
import { useApp } from '../../contexts/AppContext';
import { useBackOffice } from '../../contexts/BackOfficeContext';
import { CAN_CREATE_ADMIN, CAN_SIGNAL } from '../../utils/permissions-bo';
import { useZones, type Zone } from '../../contexts/ZoneContext';
import { useCooperativesListe } from '../../hooks/useCooperativesListe';
import { SubPageLayout } from '../layout/SubPageLayout';
import { API_URL } from '../../utils/api';
import {
  boCreateBackofficeUser,
  type CreateBackofficeUserPayload,
  type CreateBackofficeUserResult,
} from '../../services/backoffice-api';
import { toast } from 'sonner';
import { SOUS_PROFILS_MARCHAND, type SousProfilMarchand } from '../../types/sousProfilMarchand';

/* ═══════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════ */
type ProfilType =
  | 'marchand'
  | 'producteur'
  | 'cooperative'
  | 'institution'
  | 'identificateur'
  | 'admin_general'
  | 'admin_national'
  | 'gestionnaire_zone'
  | 'operateur_terrain'
  | null;

function mapProfilToBoRole(p: ProfilType): CreateBackofficeUserPayload['role'] | null {
  if (!p) return null;
  if (p === 'cooperative') return 'cooperateur';
  return p as CreateBackofficeUserPayload['role'];
}

function formatPhoneForBo(tel: string): string {
  const s = (tel || '').trim().replace(/\s+/g, '');
  if (s.startsWith('+225')) return s;
  const d = s.replace(/\D/g, '');
  if (d.length >= 10) return `+225${d.slice(-10)}`;
  return s;
}

// Types d'entite proposes pour le profil admin_general (mode entite).
// 'Autre' impose la saisie d'un complement libre (typePrecise).
const ENTITE_TYPE_AUTRE = 'Autre';
const ENTITE_TYPES: readonly string[] = [
  'Direction',
  'Agence',
  'Organisme public',
  ENTITE_TYPE_AUTRE,
];

// Liste unique des modules/actions BO (source des permissions). Extraite ici
// pour etre reutilisee a la fois par l'etape Permissions et par le calcul des
// pleins pouvoirs par defaut d'un compte admin_general entite.
const BO_MODULES: { module: string; label: string; actions: { action: string; label: string }[] }[] = [
  { module: 'acteurs', label: 'Acteurs', actions: [
    { action: 'read', label: 'Voir' }, { action: 'write', label: 'Modifier' },
    { action: 'delete', label: 'Supprimer' }, { action: 'suspend', label: 'Suspendre' },
  ] },
  { module: 'enrolement', label: 'Enrôlement', actions: [
    { action: 'read', label: 'Voir' }, { action: 'write', label: 'Modifier' }, { action: 'validate', label: 'Valider' },
  ] },
  { module: 'supervision', label: 'Supervision', actions: [
    { action: 'read', label: 'Voir' }, { action: 'write', label: 'Modifier' }, { action: 'freeze', label: 'Geler' },
  ] },
  { module: 'zones', label: 'Zones', actions: [
    { action: 'read', label: 'Voir' }, { action: 'write', label: 'Modifier' },
  ] },
  { module: 'missions', label: 'Missions', actions: [
    { action: 'read', label: 'Voir' }, { action: 'write', label: 'Modifier' },
  ] },
  { module: 'audit', label: 'Audit', actions: [
    { action: 'read', label: 'Voir' },
  ] },
  { module: 'utilisateurs', label: 'Utilisateurs', actions: [
    { action: 'read', label: 'Voir' }, { action: 'write', label: 'Modifier' }, { action: 'delete', label: 'Supprimer' },
  ] },
  { module: 'marketplace', label: 'Marketplace', actions: [
    { action: 'read', label: 'Voir' }, { action: 'write', label: 'Modifier' },
  ] },
  { module: 'livraison', label: 'Livraison', actions: [
    { action: 'read', label: 'Voir' }, { action: 'write', label: 'Modifier' },
  ] },
  { module: 'communication', label: 'Communication', actions: [
    { action: 'read', label: 'Voir' }, { action: 'write', label: 'Modifier' },
  ] },
  { module: 'contenus', label: 'Contenus', actions: [
    { action: 'read', label: 'Voir' }, { action: 'write', label: 'Modifier' },
  ] },
  { module: 'moderation', label: 'Modération', actions: [
    { action: 'read', label: 'Voir' }, { action: 'write', label: 'Modifier' },
  ] },
];

// Construit l'objet boPermissions avec toutes les actions connues a true.
// Utilise pour donner les pleins pouvoirs par defaut a un admin_general entite.
function buildFullBoPermissions(): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const mod of BO_MODULES) {
    for (const act of mod.actions) {
      result[`${mod.module}.${act.action}`] = true;
    }
  }
  return result;
}

interface ProfileConfig {
  label: string;
  color: string;
  colorDark: string;
  lightColor: string;
  borderColor: string;
  gradientFrom: string;
  gradientBg: string;
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  steps: StepConfig[];
  desc: string;
  stepsCount: string;
}

interface StepConfig {
  id: string;
  label: string;
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  tip: string;
}

/* ═══════════════════════════════════════════════════
   PROFIL CONFIGS
═══════════════════════════════════════════════════ */
const PROFILES: Record<string, ProfileConfig> = {
  marchand: {
    label: 'Marchand',
    color: '#C66A2C',
    colorDark: '#A3551F',
    lightColor: 'rgba(198,106,44,0.12)',
    borderColor: '#C66A2C',
    gradientFrom: 'from-orange-50',
    gradientBg: 'linear-gradient(135deg, #FFF7ED 0%, #FFFBF5 100%)',
    icon: Store,
    desc: 'Commerçant sur le marché vivrier',
    stepsCount: '7 étapes',
    steps: [
      { id: 'photo',       label: 'Photo',    icon: Camera,      tip: 'Une belle photo claire du visage' },
      { id: 'documents',   label: 'Documents', icon: FileText,    tip: 'NNI, CNI, RSTI, CMU' },
      { id: 'identite',    label: 'Identité', icon: User,        tip: 'Nom, prénom, date de naissance' },
      { id: 'contact',     label: 'Contact',  icon: Phone,       tip: 'Numéro de téléphone principal' },
      { id: 'lieu',        label: 'Lieu',     icon: MapPin,      tip: 'Commune et marché d’exercice' },
      { id: 'activite',    label: 'Activité', icon: ShoppingBag, tip: 'Produits vendus et expérience' },
      { id: 'finalisation',label: 'Validation',icon: CheckCircle, tip: 'GPS, signature et envoi' },
    ],
  },
  producteur: {
    label: 'Producteur',
    color: '#2E8B57',
    colorDark: '#1F6B41',
    lightColor: 'rgba(46,139,87,0.12)',
    borderColor: '#2E8B57',
    gradientFrom: 'from-green-50',
    gradientBg: 'linear-gradient(135deg, #F0FDF4 0%, #F9FFF9 100%)',
    icon: Sprout,
    desc: 'Agriculteur ou éleveur',
    stepsCount: '7 étapes',
    steps: [
      { id: 'photo',       label: 'Photo',    icon: Camera,      tip: 'Photo claire du producteur' },
      { id: 'documents',   label: 'Documents', icon: FileText,    tip: 'NNI, CNI, RSTI, CMU' },
      { id: 'identite',    label: 'Identité', icon: User,        tip: 'Nom, prénom, date de naissance' },
      { id: 'contact',     label: 'Contact',  icon: Phone,       tip: 'Numéro de téléphone principal' },
      { id: 'lieu',        label: 'Zone',     icon: MapPin,      tip: 'Village et zone de production' },
      { id: 'activite',    label: 'Culture',  icon: Sprout,      tip: 'Filières et superficie' },
      { id: 'finalisation',label: 'Validation',icon: CheckCircle, tip: 'GPS, signature et envoi' },
    ],
  },
  cooperative: {
    label: 'Coopérative',
    color: '#2072AF',
    colorDark: '#185A8C',
    lightColor: 'rgba(32,114,175,0.12)',
    borderColor: '#2072AF',
    gradientFrom: 'from-blue-50',
    gradientBg: 'linear-gradient(135deg, #EFF6FF 0%, #F9FBFF 100%)',
    icon: Building2,
    desc: 'Groupement ou coopérative agricole',
    stepsCount: '8 étapes',
    steps: [
      { id: 'photo',       label: 'Photo',     icon: Camera,      tip: 'Photo du dirigeant principal' },
      { id: 'documents',   label: 'Documents', icon: FileText,    tip: 'NNI, CNI, RSTI, CMU' },
      { id: 'dirigeant',   label: 'Dirigeant', icon: User,        tip: 'Identité du responsable' },
      { id: 'cooperative', label: 'Structure', icon: Building2,   tip: 'Nom et infos légales' },
      { id: 'contact',     label: 'Contact',   icon: Phone,       tip: 'Téléphone et adresse siège' },
      { id: 'localisation',label: 'Siège',     icon: MapPin,      tip: 'Commune et zone couverte' },
      { id: 'activite',    label: 'Activité',  icon: Layers,      tip: 'Filières de la coopérative' },
      { id: 'finalisation',label: 'Validation',icon: CheckCircle, tip: 'GPS, signature et envoi' },
    ],
  },
  institution: {
    label: 'Institution',
    color: '#6366F1',
    colorDark: '#4F46E5',
    lightColor: 'rgba(99,102,241,0.12)',
    borderColor: '#6366F1',
    gradientFrom: 'from-indigo-50',
    gradientBg: 'linear-gradient(135deg, #EEF2FF 0%, #F9FBFF 100%)',
    icon: Building2,
    desc: 'Ministère, agence ou organisme public',
    stepsCount: '5 étapes',
    steps: [
      { id: 'identite-institution', label: 'Identité', icon: Building2, tip: 'Raison sociale, IFU, type' },
      { id: 'contact', label: 'Contact', icon: Phone, tip: 'Téléphone et email du siège' },
      { id: 'localisation', label: 'Adresse', icon: MapPin, tip: 'Adresse du siège' },
      { id: 'modules', label: 'Modules', icon: Layers, tip: 'Modules JULABA actives' },
      { id: 'finalisation', label: 'Validation', icon: CheckCircle, tip: 'Récapitulatif et envoi' },
    ],
  },
  identificateur: {
    label: 'Identificateur',
    color: '#4A3F38',
    colorDark: '#3A322C',
    lightColor: 'rgba(74,63,56,0.12)',
    borderColor: '#4A3F38',
    gradientFrom: 'from-stone-50',
    gradientBg: 'linear-gradient(135deg, #FAFAF9 0%, #F5F4F0 100%)',
    icon: User,
    desc: 'Agent terrain enrôleur d’acteurs',
    stepsCount: '5 étapes',
    steps: [
      { id: 'photo', label: 'Photo', icon: Camera, tip: 'Photo claire du visage' },
      { id: 'identite', label: 'Identité', icon: User, tip: 'Nom, prénom, CNI' },
      { id: 'contact', label: 'Contact', icon: Phone, tip: 'Téléphone et email' },
      { id: 'zone', label: 'Zone', icon: MapPin, tip: 'Zone d’intervention obligatoire' },
      { id: 'finalisation', label: 'Validation', icon: CheckCircle, tip: 'Récapitulatif et envoi' },
    ],
  },
  admin_general: {
    label: 'Administrateur général',
    color: '#7C3AED',
    colorDark: '#5B21B6',
    lightColor: 'rgba(124,58,237,0.12)',
    borderColor: '#7C3AED',
    gradientFrom: 'from-violet-50',
    gradientBg: 'linear-gradient(135deg, #F5F3FF 0%, #FAF9FF 100%)',
    icon: Shield,
    desc: 'Direction generale, agence ou organisme (compte entite)',
    stepsCount: '5 étapes',
    steps: [
      { id: 'entite', label: 'Entité', icon: Building2, tip: 'Raison sociale, sigle, type' },
      { id: 'referent', label: 'Référent', icon: User, tip: 'Personne de contact de l’entité' },
      { id: 'zone', label: 'Zone', icon: MapPin, tip: 'National par défaut (zone optionnelle)' },
      { id: 'permissions', label: 'Permissions', icon: Layers, tip: 'Pleins pouvoirs par défaut' },
      { id: 'finalisation', label: 'Validation', icon: CheckCircle, tip: 'Récapitulatif et envoi' },
    ],
  },
  admin_national: {
    label: 'Administrateur national',
    color: '#2563EB',
    colorDark: '#1D4ED8',
    lightColor: 'rgba(37,99,235,0.12)',
    borderColor: '#2563EB',
    gradientFrom: 'from-blue-50',
    gradientBg: 'linear-gradient(135deg, #EFF6FF 0%, #F9FBFF 100%)',
    icon: Flag,
    desc: 'Administrateur d’une région du pays',
    stepsCount: '7 étapes',
    steps: [
      { id: 'photo', label: 'Photo', icon: Camera, tip: 'Photo optionnelle' },
      { id: 'identite', label: 'Identité', icon: User, tip: 'Nom, prénom, genre' },
      { id: 'contact', label: 'Contact', icon: Phone, tip: 'Téléphone et email obligatoires' },
      { id: 'role', label: 'Rôle', icon: Flag, tip: 'Confirmation du rôle admin' },
      { id: 'zone', label: 'Zone', icon: MapPin, tip: 'Région assignée' },
      { id: 'permissions', label: 'Permissions', icon: Layers, tip: 'Modules accessibles' },
      { id: 'finalisation', label: 'Validation', icon: CheckCircle, tip: 'Récapitulatif et envoi' },
    ],
  },
  gestionnaire_zone: {
    label: 'Gestionnaire de zone',
    color: '#10B981',
    colorDark: '#059669',
    lightColor: 'rgba(16,185,129,0.12)',
    borderColor: '#10B981',
    gradientFrom: 'from-emerald-50',
    gradientBg: 'linear-gradient(135deg, #ECFDF5 0%, #F9FFFB 100%)',
    icon: MapPin,
    desc: 'Gestionnaire d’une zone géographique',
    stepsCount: '7 étapes',
    steps: [
      { id: 'photo', label: 'Photo', icon: Camera, tip: 'Photo optionnelle' },
      { id: 'identite', label: 'Identité', icon: User, tip: 'Nom, prénom, genre' },
      { id: 'contact', label: 'Contact', icon: Phone, tip: 'Téléphone et email obligatoires' },
      { id: 'role', label: 'Rôle', icon: Shield, tip: 'Confirmation du rôle admin' },
      { id: 'zone', label: 'Zone', icon: MapPin, tip: 'Zone obligatoire' },
      { id: 'permissions', label: 'Permissions', icon: Layers, tip: 'Modules accessibles' },
      { id: 'finalisation', label: 'Validation', icon: CheckCircle, tip: 'Récapitulatif et envoi' },
    ],
  },
  operateur_terrain: {
    label: 'Analyste',
    color: '#EA580C',
    colorDark: '#C2410C',
    lightColor: 'rgba(234,88,12,0.12)',
    borderColor: '#EA580C',
    gradientFrom: 'from-orange-50',
    gradientBg: 'linear-gradient(135deg, #FFF7ED 0%, #FFFBF5 100%)',
    icon: BarChart3,
    desc: 'Analyste de données et reporting',
    stepsCount: '7 étapes',
    steps: [
      { id: 'photo', label: 'Photo', icon: Camera, tip: 'Photo optionnelle' },
      { id: 'identite', label: 'Identité', icon: User, tip: 'Nom, prénom, genre' },
      { id: 'contact', label: 'Contact', icon: Phone, tip: 'Téléphone et email obligatoires' },
      { id: 'role', label: 'Rôle', icon: BarChart3, tip: 'Confirmation du rôle admin' },
      { id: 'zone', label: 'Zone', icon: MapPin, tip: 'Zone (optionnelle pour opérateur terrain)' },
      { id: 'permissions', label: 'Permissions', icon: Layers, tip: 'Accès aux modules reporting' },
      { id: 'finalisation', label: 'Validation', icon: CheckCircle, tip: 'Récapitulatif et envoi' },
    ],
  },
};

const FILIERES = [
  'Maïs','Manioc','Igname','Riz','Banane plantain','Banane douce',
  'Tomate','Aubergine','Piment','Gombo','Patate douce','Taro',
  'Haricot','Arachide','Coton','Café','Cacao','Hévéa','Palmier à huile','Autres',
];

const COMMUNES_CI = [
  'Abidjan - Abobo','Abidjan - Adjamé','Abidjan - Attécoubé','Abidjan - Cocody',
  'Abidjan - Koumassi','Abidjan - Marcory','Abidjan - Plateau','Abidjan - Port-Bouët',
  'Abidjan - Treichville','Abidjan - Yopougon','Yamoussoukro','Bouaké','Daloa',
  'San-Pédro','Korhogo','Man','Gagnoa','Abengourou','Divo','Soubré','Autre',
];

const REGIONS_CI = [
  'Abidjan',
  'Agnéby-Tiassa',
  'Bafing',
  'Bagoué',
  'Bélier',
  'Béré',
  'Bounkani',
  'Cavally',
  'Gbêkê',
  'Gbôklé',
  'Gôh',
  'Gontougo',
  'Grands Ponts',
  'Guémon',
  'Hambol',
  'Haut-Sassandra',
  'Iffou',
  'Indénié-Djuablin',
  'Kabadougou',
  'La Mé',
  'Lôh-Djiboua',
  'Marahoué',
  'Moronou',
  'Nawa',
  'N’Zi',
  'Poro',
  'San-Pédro',
  'Tchologo',
  'Tonkpi',
  'Worodougou',
  'Yorofoula',
];


const PAYS_AFRIQUE = [
  'Ivoirienne', 'Burkinabé', 'Malienne', 'Guinéenne', 'Sénégalaise', 'Ghanéenne',
  'Nigériane', 'Togolaise', 'Béninoise', 'Nigérienne', 'Camerounaise', 'Congolaise',
  'Gabonaise', 'Mauritanienne', 'Libérienne', 'Sierra-Léonaise', 'Gambienne',
  'Cap-Verdienne', 'Autre'
];
const SITUATIONS_MATRIMONIALES = ['Célibataire', 'Marié(e)', 'Divorcé(e)', 'Veuf/Veuve'];
const CATEGORIES_ACTEUR = [
  { value: 'A', label: 'A — Vivrier Marchand' },
  { value: 'B', label: 'B — Commercialisation produits annexes' },
];
const NIVEAUX_ETUDES = [
  'Non scolarisé',
  'Préscolaire',
  'Scolaire',
  'Collège',
  'Lycée',
  'Universitaire',
];
const STATUTS_ENTREPRENEUR = ['Entreprenant', 'Auto-entrepreneur', 'SARL', 'SA', 'SAS', 'Autre'];

const STATUTS_JURIDIQUES = [
  'Formelle (immatriculée)',
  'Informelle (non immatriculée)',
  'En cours d’immatriculation',
];

const PHOTO_QUALITY_HINTS = [
  { id: 'visage_centre', label: 'Visage centré', icon: UserCircle },
  { id: 'bonne_lumiere', label: 'Bonne lumière', icon: Sun },
  { id: 'sans_lunettes', label: 'Sans lunettes', icon: Glasses },
];

const TYPES_POINT_VENTE = [
  { value: 'marche', label: 'Étal', icon: Store },
  { value: 'boutique', label: 'Boutique', icon: ShoppingBag },
  { value: 'ambulant', label: 'Ambulant', icon: NavigationIcon },
  { value: 'autre', label: 'Autre', icon: Layers },
];

const TYPES_COMMERCE = [
  { value: 'Grossiste', label: 'Grossiste', icon: Box },
  { value: 'Semi-grossiste', label: 'Semi-grossiste', icon: LayoutGrid },
  { value: 'Détaillant', label: 'Détaillant', icon: ShoppingCart },
  { value: 'Autre', label: 'Autre (à préciser)', icon: Layers },
];

const ANNEES_EXPERIENCE_OPTIONS = [
  'Moins de 1 an',
  '1 à 3 ans',
  '3 à 5 ans',
  '5 à 10 ans',
  'Plus de 10 ans',
];

const GPS_ACCURACY_GOOD_M = 50;
const GPS_ACCURACY_MAX_M = 100;
const GPS_RETRY_DELAY_MS = 5000;
const CI_BBOX = { latMin: 4.3, latMax: 10.7, lngMin: -8.6, lngMax: -2.4 };

const ADMIN_AUTRE = '__autre__';
const todayISO = new Date().toISOString().split('T')[0];

interface AdminDivisionRow { id: string; nom: string; code: string; }

async function safeJson<T = unknown>(res: Response): Promise<T | null> {
  try {
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

const FONCTIONS_DIRIGEANT_COOP: string[] = [
  'Président',
  'Directeur',
  'Secrétaire général',
  'Trésorier',
  'Gestionnaire',
  'Autre',
];

function SectionHeader({
  icon: Icon,
  label,
  color,
  lightColor,
}: {
  icon: React.FC<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  color: string;
  lightColor: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: lightColor }}
        aria-hidden="true"
      >
        <Icon className="w-8 h-8" style={{ color }} />
      </div>
      <p style={{ fontSize: '1.3rem', fontWeight: 900, color: '#111827' }}>{label}</p>
    </div>
  );
}

function RecapRow({ label, value }: { label: string; value: any }) {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', gap: '12px' }}>
        <span style={{ fontSize: '0.78rem', color: '#777' }}>{label}</span>
        <span style={{ fontSize: '0.78rem', color: '#BBB', fontStyle: 'italic' }}>Non renseigné</span>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '5px 0', gap: '12px' }}>
      <span style={{ fontSize: '0.78rem', color: '#777', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.82rem', color: '#1a1a1a', fontWeight: 700, textAlign: 'right', wordBreak: 'break-word' }}>{value}</span>
    </div>
  );
}

function RecapBlock({
  num,
  title,
  stepId: targetStepId,
  children,
  color,
  prefersReducedMotion,
  onModify,
}: {
  num: number;
  title: string;
  stepId: string;
  children: React.ReactNode;
  color: string;
  prefersReducedMotion: boolean;
  onModify: (stepId: string) => void;
}) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid #EEE7DB',
      borderRadius: '14px',
      marginBottom: '8px',
      overflow: 'hidden',
    }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        background: '#FAF7F1',
        borderBottom: '1px solid #EEE7DB',
      }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            background: '#FFEEDD',
            color,
            width: '22px',
            height: '22px',
            borderRadius: '7px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.7rem',
            fontWeight: 700,
          }}
          aria-hidden="true"
          >{num}</span>
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#444' }}>{title}</span>
        </div>
        <motion.button
          type="button"
          onClick={() => onModify(targetStepId)}
          whileTap={{ scale: 0.95 }}
          aria-label={`Modifier la section ${title}`}
          style={{
            background: 'transparent',
            border: '1px solid #E5DCD0',
            color,
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '0.7rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontFamily: 'inherit',
            minHeight: '44px',
          }}
        >
          {prefersReducedMotion ? (
            <div style={{ display: 'flex' }} aria-hidden="true">
              <FileText className="w-3 h-3" />
            </div>
          ) : (
            <motion.div
              animate={{ rotate: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ display: 'flex' }}
              aria-hidden="true"
            >
              <FileText className="w-3 h-3" />
            </motion.div>
          )}
          Modifier
        </motion.button>
      </div>
      <div style={{ padding: '10px 14px' }}>
        {children}
      </div>
    </div>
  );
}

function useAdminCascade(districtId: string, regionId: string, departementId: string) {
  const [districts, setDistricts] = useState<AdminDivisionRow[]>([]);
  const [regions, setRegions] = useState<AdminDivisionRow[]>([]);
  const [departements, setDepartements] = useState<AdminDivisionRow[]>([]);
  const [communes, setCommunes] = useState<AdminDivisionRow[]>([]);

  // Garde unmount globale pour les 4 effets (skip setState après démontage)
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  // 1 - Districts
  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${API_URL}/admin-divisions/districts`, {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!res.ok) {
          console.warn('[useAdminCascade] districts HTTP error:', res.status);
          if (isMountedRef.current) setDistricts([]);
          return;
        }
        let data: any = [];
        try {
          data = await res.json();
        } catch (parseErr) {
          console.warn('[useAdminCascade] districts JSON parse failed:', parseErr instanceof Error ? parseErr.message : parseErr);
          if (isMountedRef.current) setDistricts([]);
          return;
        }
        if (!Array.isArray(data)) {
          console.warn('[useAdminCascade] districts unexpected payload (not an array)');
          if (isMountedRef.current) setDistricts([]);
          return;
        }
        if (isMountedRef.current) setDistricts(data as AdminDivisionRow[]);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.warn('[useAdminCascade] districts fetch failed:', err instanceof Error ? err.message : err);
        if (isMountedRef.current) setDistricts([]);
      }
    })();

    return () => controller.abort();
  }, []);

  // 2 - Régions (dépend du district choisi)
  useEffect(() => {
    if (!districtId) {
      if (isMountedRef.current) setRegions([]);
      return;
    }
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${API_URL}/admin-divisions/regions?district_id=${encodeURIComponent(districtId)}`, {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!res.ok) {
          console.warn('[useAdminCascade] regions HTTP error:', res.status);
          if (isMountedRef.current) setRegions([]);
          return;
        }
        let data: any = [];
        try {
          data = await res.json();
        } catch (parseErr) {
          console.warn('[useAdminCascade] regions JSON parse failed:', parseErr instanceof Error ? parseErr.message : parseErr);
          if (isMountedRef.current) setRegions([]);
          return;
        }
        if (!Array.isArray(data)) {
          console.warn('[useAdminCascade] regions unexpected payload (not an array)');
          if (isMountedRef.current) setRegions([]);
          return;
        }
        if (isMountedRef.current) setRegions(data as AdminDivisionRow[]);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.warn('[useAdminCascade] regions fetch failed:', err instanceof Error ? err.message : err);
        if (isMountedRef.current) setRegions([]);
      }
    })();

    return () => controller.abort();
  }, [districtId]);

  // 3 - Départements (dépend de la région choisie)
  useEffect(() => {
    if (!regionId) {
      if (isMountedRef.current) setDepartements([]);
      return;
    }
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${API_URL}/admin-divisions/departements?region_id=${encodeURIComponent(regionId)}`, {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!res.ok) {
          console.warn('[useAdminCascade] departements HTTP error:', res.status);
          if (isMountedRef.current) setDepartements([]);
          return;
        }
        let data: any = [];
        try {
          data = await res.json();
        } catch (parseErr) {
          console.warn('[useAdminCascade] departements JSON parse failed:', parseErr instanceof Error ? parseErr.message : parseErr);
          if (isMountedRef.current) setDepartements([]);
          return;
        }
        if (!Array.isArray(data)) {
          console.warn('[useAdminCascade] departements unexpected payload (not an array)');
          if (isMountedRef.current) setDepartements([]);
          return;
        }
        if (isMountedRef.current) setDepartements(data as AdminDivisionRow[]);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.warn('[useAdminCascade] departements fetch failed:', err instanceof Error ? err.message : err);
        if (isMountedRef.current) setDepartements([]);
      }
    })();

    return () => controller.abort();
  }, [regionId]);

  // 4 - Communes (dépend du département choisi)
  useEffect(() => {
    if (!departementId) {
      if (isMountedRef.current) setCommunes([]);
      return;
    }
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${API_URL}/admin-divisions/communes?departement_id=${encodeURIComponent(departementId)}`, {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!res.ok) {
          console.warn('[useAdminCascade] communes HTTP error:', res.status);
          if (isMountedRef.current) setCommunes([]);
          return;
        }
        let data: any = [];
        try {
          data = await res.json();
        } catch (parseErr) {
          console.warn('[useAdminCascade] communes JSON parse failed:', parseErr instanceof Error ? parseErr.message : parseErr);
          if (isMountedRef.current) setCommunes([]);
          return;
        }
        if (!Array.isArray(data)) {
          console.warn('[useAdminCascade] communes unexpected payload (not an array)');
          if (isMountedRef.current) setCommunes([]);
          return;
        }
        if (isMountedRef.current) setCommunes(data as AdminDivisionRow[]);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        console.warn('[useAdminCascade] communes fetch failed:', err instanceof Error ? err.message : err);
        if (isMountedRef.current) setCommunes([]);
      }
    })();

    return () => controller.abort();
  }, [departementId]);

  return { districts, regions, departements, communes };
}

/* ═══════════════════════════════════════════════════
   MICRO-COMPOSANTS UI
═══════════════════════════════════════════════════ */
function BigLabel({ children, required, optional, htmlFor }: { children: React.ReactNode; required?: boolean; optional?: boolean; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block mb-3 text-gray-800" style={{ fontSize: '1.05rem', fontWeight: 700 }}>
      {children} {required && <span className="text-red-500" aria-hidden="true">*</span>}
      {optional && !required && (
        <span style={{ fontSize: '0.7rem', color: '#999', fontWeight: 400, marginLeft: '6px' }}>
          (optionnel)
        </span>
      )}
    </label>
  );
}

function ErrMsg({ msg, id }: { msg: string; id?: string }) {
  return (
    <motion.div
      id={id}
      role="alert"
      aria-live="polite"
      initial={{ opacity: 0, y: -6, height: 0 }}
      animate={{ opacity: 1, y: 0, height: 'auto' }}
      className="flex items-center gap-2 mt-2 text-red-500"
      style={{ fontSize: '0.88rem' }}
    >
      <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
      <span>{msg}</span>
    </motion.div>
  );
}

function Field({ label, required, optional, error, children, id }: {
  label: string; required?: boolean; optional?: boolean; error?: string; children: React.ReactNode; id?: string;
}) {
  // Génère un id stable si parent ne fournit pas (rétro-compatibilité totale)
  const reactId = useId();
  const fieldId = id || `field-${reactId}`;
  const errorId = `${fieldId}-error`;

  // Propage id + aria-describedby + aria-invalid au child input/select via cloneElement
  // Si le child n’est pas un élément React valide, on le rend tel quel
  const childWithA11y = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<any>, {
      id: (children as React.ReactElement<any>).props.id || fieldId,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': error ? errorId : undefined,
      'aria-required': required ? true : undefined,
    })
    : children;

  return (
    <div>
      <BigLabel required={required} optional={optional} htmlFor={fieldId}>{label}</BigLabel>
      {childWithA11y}
      {error && <ErrMsg msg={error} id={errorId} />}
    </div>
  );
}

function BigInput({ value, onChange, placeholder, type = 'text', inputMode, color, readOnly, rows, min, max, id, name, autoComplete, ...ariaProps }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  color: string; readOnly?: boolean; rows?: number; min?: number | string; max?: number | string;
  id?: string; name?: string; autoComplete?: string;
  'aria-invalid'?: boolean; 'aria-describedby'?: string; 'aria-required'?: boolean;
}) {
  const base = `w-full px-5 py-4 rounded-3xl border-2 border-gray-200 bg-white focus:outline-none transition-all`;
  const sizeStyle: React.CSSProperties = { fontSize: '1.05rem', fontWeight: 500 };

  if (rows) return (
    <textarea
      id={id}
      name={name || id}
      value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} rows={rows} readOnly={readOnly}
      autoComplete={autoComplete}
      className={base} style={{ resize: 'none', ...sizeStyle }}
      aria-invalid={ariaProps['aria-invalid']}
      aria-describedby={ariaProps['aria-describedby']}
      aria-required={ariaProps['aria-required']}
      onFocus={(e) => { e.target.style.borderColor = color; e.target.style.boxShadow = `0 0 0 4px ${color}18`; }}
      onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
    />
  );

  return (
    <input
      id={id}
      name={name || id}
      type={type} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} inputMode={inputMode} readOnly={readOnly}
      min={min} max={max}
      autoComplete={autoComplete}
      className={`${base} h-16`} style={sizeStyle}
      aria-invalid={ariaProps['aria-invalid']}
      aria-describedby={ariaProps['aria-describedby']}
      aria-required={ariaProps['aria-required']}
      onFocus={(e) => { e.target.style.borderColor = color; e.target.style.boxShadow = `0 0 0 4px ${color}18`; }}
      onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
    />
  );
}

type BigSelectOption = string | { value: string; label: string };

function BigSelect({ value, onChange, options, placeholder, color, disabled, id, name, ...ariaProps }: {
  value: string; onChange: (v: string) => void; options: BigSelectOption[]; placeholder?: string; color: string;
  disabled?: boolean; id?: string; name?: string;
  'aria-invalid'?: boolean; 'aria-describedby'?: string; 'aria-required'?: boolean;
}) {
  return (
    <div className="relative">
      <select
        id={id}
        name={name || id}
        disabled={disabled}
        value={value} onChange={(e) => onChange(e.target.value)}
        className={`w-full px-5 h-16 rounded-3xl border-2 border-gray-200 bg-white focus:outline-none appearance-none transition-all ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
        style={{ fontSize: '1.05rem', fontWeight: 500, color: value ? '#111827' : '#9CA3AF' }}
        aria-invalid={ariaProps['aria-invalid']}
        aria-describedby={ariaProps['aria-describedby']}
        aria-required={ariaProps['aria-required']}
        onFocus={(e) => { e.target.style.borderColor = color; e.target.style.boxShadow = `0 0 0 4px ${color}18`; }}
        onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; e.target.style.boxShadow = 'none'; }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => {
          const ov = typeof opt === 'string' ? opt : opt.value;
          const lab = typeof opt === 'string' ? opt : opt.label;
          return <option key={ov} value={ov}>{lab}</option>;
        })}
      </select>
      <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 pointer-events-none" aria-hidden="true" />
    </div>
  );
}

function GenreSelector({ value, onChange, color }: { value: string; onChange: (v: string) => void; color: string }) {
  // Respect prefers-reduced-motion : si utilisateur prefere mouvement reduit, on coupe les animations idle
  const prefersReducedMotion = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const options = [
    {
      value: 'Homme',
      label: 'Homme',
      svg: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Symbole homme">
          <circle cx="12" cy="6" r="3.5" />
          <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
          <line x1="6" y1="13" x2="18" y2="13" strokeOpacity="0.4" />
        </svg>
      ),
    },
    {
      value: 'Femme',
      label: 'Femme',
      svg: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Symbole femme">
          <circle cx="12" cy="6" r="3.5" />
          <path d="M8 21l1.5-9h5L16 21z" />
          <path d="M9.5 12l-2 4M14.5 12l2 4" strokeOpacity="0.5" />
        </svg>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', gap: '10px' }} role="radiogroup" aria-label="Choix du genre">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <motion.button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={opt.label}
            onClick={() => onChange(opt.value)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            style={{
              flex: 1,
              padding: '11px 12px',
              background: active ? '#FFEEDD' : '#fff',
              border: `1.5px solid ${active ? color : '#E5E0D8'}`,
              borderRadius: '12px',
              fontSize: '0.85rem',
              color: active ? color : '#555',
              fontWeight: active ? 700 : 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.15s ease',
              fontFamily: 'inherit',
            }}
          >
            <motion.div
              animate={active && !prefersReducedMotion ? { scale: [1, 1.15, 1] } : { scale: 1 }}
              transition={active && !prefersReducedMotion ? {
                duration: 1.2,
                repeat: Infinity,
                ease: 'easeInOut',
              } : { duration: 0 }}
              style={{ display: 'flex', alignItems: 'center' }}
            >
              {opt.svg}
            </motion.div>
            {opt.label}
          </motion.button>
        );
      })}
    </div>
  );
}

function TagSelector({ options, values, onChange, color }: {
  options: string[]; values: string[]; onChange: (v: string[]) => void; color: string;
}) {
  const toggle = (opt: string) => {
    if (values.includes(opt)) onChange(values.filter((v) => v !== opt));
    else onChange([...values, opt]);
  };
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Selection multiple">
      {options.map((opt) => {
        const sel = values.includes(opt);
        return (
          <motion.button
            key={opt}
            type="button"
            aria-pressed={sel}
            aria-label={opt}
            onClick={() => toggle(opt)}
            whileTap={{ scale: 0.92 }}
            whileHover={{ scale: 1.05 }}
            className="px-4 py-2 rounded-2xl border-2 transition-all flex items-center gap-1"
            style={{
              borderColor: sel ? color : '#E5E7EB',
              backgroundColor: sel ? color : 'white',
              color: sel ? 'white' : '#4B5563',
              fontSize: '0.9rem',
              fontWeight: sel ? 700 : 500,
            }}
          >
            {sel && <CheckCircle className="w-4 h-4" aria-hidden="true" />}
            {opt}
          </motion.button>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
═══════════════════════════════════════════════════ */
const VALID_PROFILS: readonly ProfilType[] = [
  'marchand', 'producteur', 'cooperative', 'institution', 'identificateur',
  'admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain',
] as const;
const isValidProfilType = (value: any): value is Exclude<ProfilType, null> => (
  typeof value === 'string' && VALID_PROFILS.includes(value as ProfilType)
);

// Validation schématique minimale du brouillon stocké en sessionStorage (anti-prototype-pollution)
function sanitizeFormData(input: any): Record<string, any> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  const out: Record<string, any> = {};
  for (const key of Object.keys(input)) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') continue;
    out[key] = input[key];
  }
  return out;
}

export function FicheIdentificationDynamiqueBO({ onClose, onSuccess }: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const location = useLocation();
  const resumeDraft = (location?.state as any)?.resumeDraft;
  const { user } = useUser();
  const { user: appUser } = useApp();
  const { getZonesByRegion } = useZones();
  const userZoneId = (user as any)?.zoneId || (appUser as any)?.zoneId || '';
  const userRegion = (user as any)?.region || (appUser as any)?.region || '';
  const bo = useBackOffice();
  const createurRole = bo.user?.role;
  const submittedNumeroRef = useRef<string>('');
  /** Mode BO : pas de vérification PIN identificateur (cf. phase 4A bis-1). */
  const skipPinCheck = true;
  const VISIBLE_PROFILS = useMemo(() => {
    type ProfilCle = Exclude<ProfilType, null>;
    const ACTEURS_METIER: ProfilCle[] = ['marchand', 'producteur', 'cooperative', 'institution', 'identificateur'];
    const ADMINS_BO: ProfilCle[] = ['admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain'];

    if (createurRole === 'super_admin') {
      return [...ACTEURS_METIER, ...ADMINS_BO];
    }
    if (createurRole === 'admin_general') {
      return [...ACTEURS_METIER, 'admin_national', 'gestionnaire_zone', 'operateur_terrain'];
    }
    if (createurRole === 'admin_national' || createurRole === 'gestionnaire_zone') {
      return ACTEURS_METIER;
    }
    return [];
  }, [createurRole]);

  const boMaySignal = CAN_SIGNAL(createurRole);
  const boMayCreateAdmin = CAN_CREATE_ADMIN(createurRole);

  const fileInputCameraRef = useRef<HTMLInputElement>(null);
  const fileInputGalleryRef = useRef<HTMLInputElement>(null);

  const openCamera = useCallback(() => {
    fileInputCameraRef.current?.click();
  }, []);

  const openGallery = useCallback(() => {
    fileInputGalleryRef.current?.click();
  }, []);

  const signatureCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Reprise de session via location.state ou sessionStorage (complement_dossier).
  // Nettoyage immédiat après lecture pour limiter la persistance des PII.
  const locationState2 = useMemo(() => {
    if (location.state) return location.state as any;
    const stored = sessionStorage.getItem('complement_dossier');
    if (!stored) return null;
    try {
      const parsed = JSON.parse(stored);
      // Nettoyage immédiat après lecture réussie (évite PII résiduelle dans le tab)
      sessionStorage.removeItem('complement_dossier');
      // Validation structurelle minimale (objet non-null, non-array)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
      return parsed;
    } catch {
      // Données session corrompues : on nettoie et on repart proprement.
      sessionStorage.removeItem('complement_dossier');
      return null;
    }
    // location.state ne change pas durant la vie du composant, deps stable
  }, [location.state]);
  const initialProfil: ProfilType = isValidProfilType(locationState2?.typeActeur)
    ? (locationState2!.typeActeur as ProfilType)
    : null;
  const [profil, setProfil] = useState<ProfilType>(initialProfil);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [verificationTel, setVerificationTel] = useState<'idle' | 'checking' | 'exists' | 'available'>('idle');
  const [gpsCapturing, setGpsCapturing] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [hoveredProfil, setHoveredProfil] = useState<ProfilType>(null);
  const [signatureMode, setSignatureMode] = useState<'tactile' | 'clavier'>('tactile');
  const telAbortRef = React.useRef<AbortController | null>(null);
  const submitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Garde unmount centralisée pour le composant principal
  // Utilisée par handleGPS, reverseGeocodeBackend, handleTelChange pour skip setState après démontage
  const isMountedRef = useRef(true);
  useEffect(() => {
    return () => { isMountedRef.current = false; };
  }, []);

  const generateNumeroId = (type: string) => {
    const y = new Date().getFullYear();
    const r = String(Date.now() % 9999 + 1).padStart(4, '0');
    const prefix =
      type === 'marchand' ? 'MARC'
      : type === 'producteur' ? 'PROD'
      : type === 'cooperative' ? 'COOP'
      : type === 'institution' ? 'INST'
      : type === 'identificateur' ? 'IDFT'
      : type === 'admin_general' ? 'ADGN'
      : type === 'admin_national' ? 'ADNA'
      : type === 'gestionnaire_zone' ? 'GEZN'
      : type === 'operateur_terrain' ? 'OPTR'
      : 'ACTR';
    return `${prefix}-${y}-${r}`;
  };

  const [data, setData] = useState({
    numeroId: '',
    photo: null as string | null,
    nom: locationState2?.nom || '', prenoms: locationState2?.prenoms || '', genre: '',
    lieuNaissance: '', dateNaissance: '', nin: '',
    telephone: locationState2?.phone || locationState2?.telephone || '',
    email: '', signature: null as string | null,
    gps: null as { lat: number; lng: number; accuracy?: number } | null,
    codeIdentificateur: '',
    // Champs specifiques au profil admin_general en mode entite.
    raisonSociale: '',
    sigle: '',
    typeEntite: '',
    typePrecise: '',
    referentNom: '',
    referentFonction: '',
    commune: locationState2?.commune || '', marche: locationState2?.marche || '', typePointVente: '', typePointVenteAutre: '', emplacement: '', produitsVendus: locationState2?.activite || '',
    sousProfilMarchand: '' as ('' | SousProfilMarchand),
    districtId: '', districtAutre: '',
    regionId: '', regionAutre: '',
    departementId: '', departementAutre: '',
    communeId: '', communeAutre: '',
    quartierVillage: '',
    lieuAbidjan: false,
    typeActivite: '',
    typeCommerce: [] as string[], typeCommerceAutre: '', anneesExperience: '',
    estMembreCooperative: false,
    nomResponsableMarche: '', nomResponsableCooperative: '',
    cooperativeId: '',
    cooperativeMarche: '',
    cooperativeCommune: '',
    cooperativeResponsable: '',
    cooperativeFonction: '',
    cooperativeContact: '',
    village: '', region: '', sousPrefecture: '',
    filierePrincipale: '', filieresSecondaires: [] as string[],
    superficie: '', typeElevage: '', groupement: '',
    fonctionDirigeant: '', nomCooperative: '', dateCreation: '',
    nationalite: 'Ivoirienne', situationMatrimoniale: '', niveauEtudes: '',
    numCNPS: '', numCMU: '', recepisse: '', categorie: '', boitePostale: '', statutEntrepreneur: '',
    extraitNaissance: '', passeport: '', permis: '', carteScolaire: '', carteEtudiant: '',
    categorieActivite: '',
    sousCategorie: '',
    produitsVendusMultiple: [] as string[],
    autreActivite: '',
    statutJuridique: '', numeroRecepisse: '', nombreMembres: '',
    adresseSiege: '', ville: '', zoneCouverte: '',
    zoneId: '', zoneNom: '',
    filiereCoopPrincipale: '', filieresCoopSecondaires: [] as string[],
    zonesIntervention: '',
  });

  const cfg = profil ? PROFILES[profil] : null;
  const totalSteps = cfg ? cfg.steps.length : 0;
  const currentStepConfig = cfg ? cfg.steps[step] : null;

  // Pleins pouvoirs par defaut pour un compte admin_general entite : on
  // pre-remplit boPermissions avec toutes les actions a true des que ce profil
  // est choisi, sans ecraser une selection deja faite. Aucun effet sur les
  // autres profils (la garde sort immediatement).
  useEffect(() => {
    if (profil !== 'admin_general') return;
    const current = (data as { boPermissions?: Record<string, boolean> }).boPermissions;
    if (current && Object.keys(current).length > 0) return;
    setField('boPermissions', buildFullBoPermissions());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profil]);

  useEffect(() => {
    if (!resumeDraft || !resumeDraft.formData) return;

    // Whitelist enum stricte pour typeActeur (drop si invalide)
    if (isValidProfilType(resumeDraft.typeActeur)) {
      setProfil(resumeDraft.typeActeur as ProfilType);
    }

    // Bornage setStep [0..maxSteps-1] - utilise un fallback large si profil pas encore connu
    if (typeof resumeDraft.currentStep === 'number' && Number.isFinite(resumeDraft.currentStep)) {
      // Maximum théorique = 8 étapes (cooperative). Le rendu plus tard re-clampera si besoin.
      const safeStep = Math.max(0, Math.min(Math.floor(resumeDraft.currentStep), 7));
      setStep(safeStep);
      const completed = new Set<number>();
      for (let i = 0; i < safeStep; i++) {
        completed.add(i);
      }
      setCompletedSteps(completed);
    }

    // Merge contrôlé : retire __proto__ / prototype / constructor avant spread
    const sanitized = sanitizeFormData(resumeDraft.formData);
    setData((prev) => ({ ...prev, ...sanitized }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Brouillon auto : charger au montage si un brouillon existe pour ce profil
  useEffect(() => {
    if (!profil) return;
    try {
      const draftKey = `julaba:bo:draft-${profil}`;
      const stored = localStorage.getItem(draftKey);
      if (!stored) return;

      const parsed = JSON.parse(stored);

      // Validation structurelle minimale
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        console.warn('[BrouillonAuto] Structure invalide, brouillon ignoré');
        return;
      }

      if (parsed.data && typeof parsed.data === 'object') {
        const sanitized = sanitizeFormData(parsed.data);
        setData((prev) => ({ ...prev, ...sanitized }));
      }

      if (typeof parsed.step === 'number' && Number.isFinite(parsed.step)) {
        const safeStep = Math.max(0, Math.min(Math.floor(parsed.step), 7));
        setStep(safeStep);
      }
    } catch (e: any) {
      console.warn('[BrouillonAuto] Lecture échouée:', e?.message);
    }
  }, [profil]);

  // Ref exposée pour annulation manuelle du debounce avant cleanup post-submit
  const draftSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Brouillon auto : sauvegarder à chaque changement (debouncé 500ms pour limiter I/O sessionStorage)
  useEffect(() => {
    if (!profil || submitted) return;
    if (draftSaveTimeoutRef.current) window.clearTimeout(draftSaveTimeoutRef.current);
    draftSaveTimeoutRef.current = window.setTimeout(() => {
      try {
        const draftKey = `julaba:bo:draft-${profil}`;
        const draftPayload = { data, step, savedAt: new Date().toISOString() };
        localStorage.setItem(draftKey, JSON.stringify(draftPayload));
      } catch (e: any) {
        console.warn('[BrouillonAuto] Sauvegarde échouée:', e?.message);
      }
    }, 500);
    return () => {
      if (draftSaveTimeoutRef.current) window.clearTimeout(draftSaveTimeoutRef.current);
    };
  }, [data, step, profil, submitted]);

  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) {
        clearTimeout(submitTimeoutRef.current);
      }
    };
  }, []);

  // Cleanup unmount : annule la requête de vérification téléphone si en vol
  useEffect(() => {
    return () => {
      if (telAbortRef.current) telAbortRef.current.abort();
    };
  }, []);

  // Validation upload photo (alignement ModalEditerActeur Lot 2A)
  const ALLOWED_PHOTO_MIME = ['image/jpeg', 'image/png', 'image/webp'];
  const MAX_PHOTO_SIZE_MB = 5;

  const setField = (field: string, value: any) => {
    setData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const e = { ...prev }; delete e[field]; return e; });
  };

  const handleTelChange = (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 10);
    setField('telephone', cleaned);
    if (cleaned.length >= 10) {
      if (telAbortRef.current) telAbortRef.current.abort();
      telAbortRef.current = new AbortController();
      setVerificationTel('checking');
      const phone = '+225' + cleaned;
      fetch(`${API_URL}/users/by-phone/${encodeURIComponent(phone)}`, {
        credentials: 'include',
        signal: telAbortRef.current.signal,
      })
        .then(res => {
          if (!isMountedRef.current) return;
          if (res.ok) {
            setVerificationTel('exists');
          } else if (res.status === 404) {
            setVerificationTel('available');
          } else {
            setVerificationTel('idle');
          }
        })
        .catch((e) => {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          console.warn('[FicheIdentificationDynamique] phone verification failed:', e instanceof Error ? e.message : e);
          if (isMountedRef.current) setVerificationTel('idle');
        });
    } else {
      setVerificationTel('idle');
    }
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    // Reset valeur input pour permettre re-sélection même fichier après erreur
    e.target.value = '';

    if (!file) return;

    // Validation MIME AVANT compression (rejet immédiat fichiers non image)
    if (!ALLOWED_PHOTO_MIME.includes(file.type)) {
      toast.error('Format non supporté. Utilise une photo JPG, PNG ou WEBP.');
      return;
    }

    // Validation taille AVANT compression (limite raisonnable source)
    const sourceMB = file.size / (1024 * 1024);
    if (sourceMB > MAX_PHOTO_SIZE_MB * 4) {
      // Le source peut être 4x la cible compressée (qualité 0.7, redimension 800px)
      toast.error(`Photo trop lourde (${sourceMB.toFixed(1)} Mo). Choisis une photo plus légère.`);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const MAX = 800;
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * ratio);
        canvas.height = Math.round(img.height * ratio);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          console.warn('[FicheIdentificationDynamique] canvas 2d context unavailable');
          toast.error('Impossible de traiter cette photo. Réessaie avec une autre.');
          URL.revokeObjectURL(objectUrl);
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.7);

        // Validation taille APRES compression (le fichier final stocké)
        const approxBytes = Math.ceil((compressed.length * 3) / 4);
        const approxMB = approxBytes / (1024 * 1024);
        if (approxMB > MAX_PHOTO_SIZE_MB) {
          toast.error(`Photo trop lourde après compression (${approxMB.toFixed(1)} Mo). Maximum ${MAX_PHOTO_SIZE_MB} Mo.`);
          URL.revokeObjectURL(objectUrl);
          return;
        }

        if (isMountedRef.current) setField('photo', compressed);
        URL.revokeObjectURL(objectUrl);
      } catch (err) {
        console.warn('[FicheIdentificationDynamique] photo compression failed:', err instanceof Error ? err.message : err);
        URL.revokeObjectURL(objectUrl);
        toast.error('Impossible de traiter cette photo. Réessaie avec une autre.');
      }
    };

    img.onerror = () => {
      console.warn('[FicheIdentificationDynamique] photo load failed');
      URL.revokeObjectURL(objectUrl);
      toast.error('Impossible de charger l’image. Réessaie avec une autre photo.');
    };

    img.src = objectUrl;
  };

  const isWithinCIBbox = (lat: number, lng: number) => (
    lat >= CI_BBOX.latMin
    && lat <= CI_BBOX.latMax
    && lng >= CI_BBOX.lngMin
    && lng <= CI_BBOX.lngMax
  );

  const handleGPS = async () => {
    if (isMountedRef.current) setGpsCapturing(true);
    if (!navigator.geolocation) {
      toast.error('Ton appareil ne supporte pas la géolocalisation.');
      if (isMountedRef.current) {
        setField('gps', null);
        setGpsCapturing(false);
      }
      return;
    }

    const captureOnce = (): Promise<
      | { coords: { lat: number; lng: number; accuracy: number } }
      | { error: string }
    > => new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            coords: {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
            },
          });
        },
        (err) => {
          console.warn('[handleGPS] geolocation failed:', `code=${err.code}, message=${err.message}`);
          let msg = 'Impossible de récupérer ta position GPS.';
          if (err.code === 1) msg = 'Permission refusée. Active la localisation dans les paramètres.';
          else if (err.code === 2) msg = 'Position indisponible. Vérifie ta connexion ou essaie à l’extérieur.';
          else if (err.code === 3) msg = 'Capture trop longue. Essaie de relancer.';
          resolve({ error: msg });
        },
        {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
        }
      );
    });

    const applyFix = async (coords: { lat: number; lng: number; accuracy: number }) => {
      if (!isMountedRef.current) return;
      setField('gps', {
        lat: coords.lat,
        lng: coords.lng,
        accuracy: coords.accuracy,
      });
      await reverseGeocodeBackend(coords.lat, coords.lng);
      if (isMountedRef.current) setGpsCapturing(false);
    };

    const first = await captureOnce();
    if ('error' in first) {
      toast.error(first.error);
      if (isMountedRef.current) {
        setField('gps', null);
        setGpsCapturing(false);
      }
      return;
    }

    if (!isWithinCIBbox(first.coords.lat, first.coords.lng)) {
      toast.error('Position détectée hors Côte d’Ivoire.');
      if (isMountedRef.current) {
        setField('gps', null);
        setGpsCapturing(false);
      }
      return;
    }

    if (first.coords.accuracy <= GPS_ACCURACY_GOOD_M) {
      await applyFix(first.coords);
      return;
    }

    toast.loading('Affinage de la position en cours...', { id: 'gps-refining' });
    await new Promise((resolve) => setTimeout(resolve, GPS_RETRY_DELAY_MS));
    const second = await captureOnce();
    if ('error' in second) {
      if (first.coords.accuracy <= GPS_ACCURACY_MAX_M) {
        toast.dismiss('gps-refining');
        await applyFix(first.coords);
        return;
      }
      toast.dismiss('gps-refining');
      toast.error(
        `Position imprécise (${Math.round(first.coords.accuracy)}m). Sors à l’extérieur, attends quelques secondes, réessaie.`,
      );
      if (isMountedRef.current) {
        setField('gps', null);
        setGpsCapturing(false);
      }
      return;
    }

    if (!isWithinCIBbox(second.coords.lat, second.coords.lng)) {
      toast.dismiss('gps-refining');
      toast.error('Position détectée hors Côte d’Ivoire.');
      if (isMountedRef.current) {
        setField('gps', null);
        setGpsCapturing(false);
      }
      return;
    }

    if (second.coords.accuracy <= GPS_ACCURACY_MAX_M) {
      toast.dismiss('gps-refining');
      await applyFix(second.coords);
      return;
    }

    toast.dismiss('gps-refining');
    toast.error(
      `Position imprécise (${Math.round(second.coords.accuracy)}m). Sors à l’extérieur, attends quelques secondes, réessaie.`,
    );
    if (isMountedRef.current) {
      setField('gps', null);
      setGpsCapturing(false);
    }
  };

  const reverseGeocodeBackend = async (lat: number, lng: number) => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(`${API_URL}/admin-divisions/reverse-geocode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ lat, lng }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Backend reverse-geocode status ${res.status}`);

      let result: any = null;
      try {
        result = await res.json();
      } catch (parseErr) {
        console.warn('[reverseGeocodeBackend] JSON parse failed:', parseErr instanceof Error ? parseErr.message : parseErr);
        return null;
      }

      // Validation structurelle minimale
      if (!result || typeof result !== 'object') {
        console.warn('[reverseGeocodeBackend] payload structure inattendue');
        return null;
      }

      if (!isMountedRef.current) return result;

      setData((prev) => ({
        ...prev,
        districtId: result.district?.id && !prev.districtId ? result.district.id : prev.districtId,
        regionId: result.region?.id && !prev.regionId ? result.region.id : prev.regionId,
        departementId: result.departement?.id && !prev.departementId ? result.departement.id : prev.departementId,
        communeId: result.commune?.id && !prev.communeId ? result.commune.id : prev.communeId,
      }));

      if (result?.matched_via === 'commune_match' && result?.commune?.nom) {
        toast.success(`Position détectée - ${result.commune.nom}`);
      } else if (result?.matched_via === 'state_only') {
        toast.info('Position captée. Sélectionne ta commune dans la liste.');
      } else {
        toast.info('Position captée. Renseigne ta zone manuellement.');
      }

      return result;
    } catch (e: any) {
      if (e instanceof DOMException && e.name === 'AbortError') return null;
      console.warn('[reverseGeocodeBackend] Échec:', e?.message);
      if (isMountedRef.current) toast.error('Détection des zones impossible. Sélectionne tes informations manuellement.');
      return null;
    } finally {
      window.clearTimeout(timeoutId);
    }
  };

  const getCoords = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); setIsDrawing(true);
    const { x, y } = getCoords(e);
    const ctx = signatureCanvasRef.current?.getContext('2d');
    if (ctx) { ctx.beginPath(); ctx.moveTo(x, y); }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const { x, y } = getCoords(e);
    const ctx = signatureCanvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.lineTo(x, y);
      ctx.strokeStyle = cfg?.color || '#9F8170';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing && signatureCanvasRef.current) {
      setField('signature', signatureCanvasRef.current.toDataURL());
    }
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = signatureCanvasRef.current;
    if (canvas) {
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
      setField('signature', null);
    }
  };

  const validateStep = (): boolean => {
    const e: Record<string, string> = {};
    const stepId = currentStepConfig?.id;
    if (stepId === 'photo') { if (!data.photo) e.photo = 'La photo est obligatoire pour continuer'; }
    // Etapes specifiques au profil admin_general en mode entite.
    if (stepId === 'entite') {
      if (!data.raisonSociale.trim()) e.raisonSociale = 'La raison sociale est obligatoire';
      if (!data.sigle.trim()) e.sigle = 'Le sigle est obligatoire';
      if (!data.typeEntite.trim()) e.typeEntite = 'Le type d\'entité est obligatoire';
      if (data.typeEntite === ENTITE_TYPE_AUTRE && !data.typePrecise.trim()) {
        e.typePrecise = 'Précisez le type d\'entité';
      }
    }
    if (stepId === 'referent') {
      if (!data.referentNom.trim()) e.referentNom = 'Le nom du référent est obligatoire';
      if (!data.referentFonction.trim()) e.referentFonction = 'La fonction du référent est obligatoire';
      if (!data.telephone || data.telephone.length !== 10) e.telephone = 'Numéro de 10 chiffres obligatoire';
      if (verificationTel === 'exists') e.telephone = 'Ce numéro est déjà utilisé par un autre acteur';
      const emailReferent = (data.email || '').trim();
      if (!emailReferent) {
        e.email = 'Adresse e-mail obligatoire';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailReferent)) {
        e.email = 'Adresse e-mail invalide';
      }
    }
    if (stepId === 'documents') {
      // Tous les documents (NIN, CNI, CMU, CNPS, recepisse) sont optionnels.
      // Cette branche existe pour permettre la navigation sans bloquer.
    }
    if (stepId === 'identite' || stepId === 'dirigeant') {
      if (!data.nom.trim()) e.nom = 'Le nom est obligatoire';
      if (!data.prenoms.trim()) e.prenoms = 'Le prénom est obligatoire';
      if (stepId === 'dirigeant' && !data.fonctionDirigeant.trim()) e.fonctionDirigeant = 'La fonction est obligatoire';
      if (stepId === 'identite') {
        if (!data.genre || !data.genre.trim()) e.genre = 'Le genre est obligatoire';
        if (!data.dateNaissance || !data.dateNaissance.trim()) e.dateNaissance = 'La date de naissance est obligatoire';
        if (data.dateNaissance) {
          const dn = new Date(data.dateNaissance);
          const today = new Date();
          today.setHours(23, 59, 59, 999);
          if (dn > today) {
            e.dateNaissance = 'La date de naissance ne peut pas être dans le futur';
          }
        }
        if (!data.lieuNaissance || !data.lieuNaissance.trim()) e.lieuNaissance = 'Le lieu de naissance est obligatoire';
        if (!data.nationalite || !data.nationalite.trim()) e.nationalite = 'La nationalité est obligatoire';
        if (!data.categorie || !data.categorie.trim()) e.categorie = 'La catégorie est obligatoire';
      }
    }
    if (stepId === 'contact') {
      if (!data.telephone || data.telephone.length !== 10) e.telephone = 'Numéro de 10 chiffres obligatoire';
      if (verificationTel === 'exists') e.telephone = 'Ce numéro est déjà utilisé par un autre acteur';
      const emailRequisProfils: ProfilType[] = [
        'admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain', 'identificateur',
      ];
      if (profil && emailRequisProfils.includes(profil)) {
        if (!data.email?.trim()) {
          e.email = 'Adresse e-mail obligatoire pour ce profil';
        }
      }
      if (data.email && data.email.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email.trim())) {
          e.email = 'Adresse e-mail invalide';
        }
      }
    }
    if (stepId === 'lieu') {
      const hasDistrict = Boolean(data.districtId || String(data.districtAutre || '').trim());
      const hasRegion = Boolean(data.regionId || String(data.regionAutre || '').trim());
      const hasDepartement = Boolean(data.departementId || String(data.departementAutre || '').trim());
      if (!hasDistrict) e.districtId = 'Le district est obligatoire';
      if (!hasRegion) e.regionId = 'La région est obligatoire';
      if (!hasDepartement) e.departementId = 'Le département est obligatoire';

      if (data.lieuAbidjan) {
        const hasCommuneNiveau = Boolean(data.communeId || String(data.communeAutre || '').trim());
        if (!hasCommuneNiveau) e.communeId = 'La commune est obligatoire';
      }

      if (profil === 'marchand' && !data.marche.trim()) e.marche = 'Le marché est obligatoire';
      if (profil === 'marchand' && !data.sousProfilMarchand) {
        e.sousProfilMarchand = 'Le sous-profil marchand est obligatoire';
      }
      if (profil === 'marchand' && !data.typePointVente) e.typePointVente = 'Type de point de vente obligatoire';
      if (profil === 'marchand' && data.typePointVente === 'autre' && !data.typePointVenteAutre?.trim()) {
        e.typePointVenteAutre = 'Précise le type de point de vente';
      }
      if (profil === 'producteur' && !data.village.trim()) e.village = 'Le village est obligatoire';
    }
    if (stepId === 'localisation') {
      if (!data.commune.trim()) e.commune = 'La commune est obligatoire';
      if (!data.region?.trim()) e.region = 'La région est obligatoire';
      if (!data.ville.trim()) e.ville = 'La ville est obligatoire';
    }
    if (stepId === 'cooperative') {
      if (!data.nomCooperative.trim()) e.nomCooperative = 'Le nom est obligatoire';
      if (!data.nombreMembres.trim()) e.nombreMembres = 'Le nombre de membres est obligatoire';
    }
    if (stepId === 'activite') {
      if (profil === 'marchand' && !data.categorieActivite) {
        e.categorieActivite = 'Choisissez une catégorie d\'activité';
      }
      if (profil === 'marchand' && data.categorieActivite === 'Autre' && !data.sousCategorie) {
        e.sousCategorie = 'Choisissez une sous-catégorie';
      }
      if (
        profil === 'marchand' &&
        data.categorieActivite &&
        (data.categorieActivite !== 'Autre' || data.sousCategorie) &&
        (!Array.isArray(data.produitsVendusMultiple) || data.produitsVendusMultiple.length === 0)
      ) {
        e.produitsVendusMultiple = 'Sélectionnez au moins un produit';
      }
      if (profil === 'producteur' && !data.filierePrincipale) e.filierePrincipale = 'Choisissez une filière';
      if (profil === 'cooperative' && !data.filiereCoopPrincipale) e.filiereCoopPrincipale = 'Choisissez une filière';
    }
    if (data.superficie !== undefined && data.superficie !== '' && Number(data.superficie) < 0) {
      e.superficie = 'La superficie ne peut pas être négative';
    }
    if (data.nombreMembres !== undefined && data.nombreMembres !== '' && Number(data.nombreMembres) < 0) {
      e.nombreMembres = 'Le nombre de membres ne peut pas être négatif';
    }
    if (data.anneesExperience !== undefined && data.anneesExperience !== '' && Number(data.anneesExperience) < 0) {
      e.anneesExperience = 'Les années d’expérience ne peuvent pas être négatives';
    }
    if (stepId === 'finalisation') {
      if (!skipPinCheck) {
        const pin = String(data.codeIdentificateur || '').trim();
        if (!/^\d{4}$/.test(pin)) {
          e.codeIdentificateur = 'Code de 4 chiffres requis';
        }
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) { return; }
    setCompletedSteps((prev) => new Set([...prev, step]));
    setDirection(1);
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step === 0) { setProfil(null); }
    else { setDirection(-1); setStep((s) => s - 1); }
  };

  const handleStepClick = (targetStep: number) => {
    if (targetStep === step) return;
    if (!completedSteps.has(targetStep) && targetStep > step) return;
    setDirection(targetStep > step ? 1 : -1);
    setStep(targetStep);
  };

  // Refs AbortController dédiées aux mutations serveur sous-passe 3
  const submitAbortRef = useRef<AbortController | null>(null);
  const saveDraftAbortRef = useRef<AbortController | null>(null);

  // Cleanup unmount : annule les flux mutations en vol
  useEffect(() => {
    return () => {
      if (submitAbortRef.current) submitAbortRef.current.abort();
      if (saveDraftAbortRef.current) saveDraftAbortRef.current.abort();
    };
  }, []);

  // Cleanup atomique brouillon sessionStorage post-soumission réussie
  // Annule d'abord le debounce 500ms en cours pour éviter race (ré-écriture après suppression)
  const clearDraftAndCancelDebounce = () => {
    if (draftSaveTimeoutRef.current) {
      window.clearTimeout(draftSaveTimeoutRef.current);
      draftSaveTimeoutRef.current = null;
    }
    if (profil) {
      try {
        localStorage.removeItem(`julaba:bo:draft-${profil}`);
      } catch (e: any) {
        console.warn('[FicheIdentificationDynamique] cleanup brouillon échoué:', e?.message);
      }
    }
  };

  const handleSaveDraft = async () => {
    // Garde anti double soumission en TETE handler
    if (isSubmitting) return;

    if (!data.nom?.trim() && !data.telephone?.trim()) {
      return;
    }
    if (!profil) return;

    // Permet de sauver sans téléphone valide pour le brouillon.
    // La validation stricte reste appliquée à la soumission finale.

    // Annulation requête précédente + AbortController dédié
    if (saveDraftAbortRef.current) saveDraftAbortRef.current.abort();
    const controller = new AbortController();
    saveDraftAbortRef.current = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), 30000);

    setIsSubmitting(true);

    try {
      const fullName = `${data.prenoms || ''} ${data.nom || ''}`.trim();
      const draftBody = {
        id: resumeDraft?.id || undefined,
        typeActeur: profil,
        acteurNom: fullName || null,
        currentStep: step,
        formData: data,
        latitude: data.gps?.lat ?? null,
        longitude: data.gps?.lng ?? null,
        region: data.region || null,
        commune: data.commune || null,
        documents: {
          signature: data.signature || null,
          photoBase64: data.photo || null,
        },
      };

      const res = await fetch(`${API_URL}/identifications/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(draftBody),
        signal: controller.signal,
      });

      const createData = await safeJson(res);

      if (!isMountedRef.current) return;

      if (!res.ok || createData?.success !== true) {
        toast.error(`Erreur lors de la sauvegarde du brouillon : ${createData?.error || createData?.message || 'réessaie'}`);
        return;
      }

      // Nettoyage atomique du brouillon local après confirmation serveur
      // (annule debounce + supprime sessionStorage)
      clearDraftAndCancelDebounce();

      toast.success('Brouillon sauvegardé avec succès.');
      try {
        await bo.refreshActeurs();
      } catch {
        /* liste acteurs optionnelle après brouillon */
      }
      if (isMountedRef.current) onClose();
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      console.warn('[FicheIdentificationDynamique] saveDraft failed:', e instanceof Error ? e.message : e);
      if (isMountedRef.current) toast.error('Erreur réseau. Vérifie ta connexion et réessaie.');
    } finally {
      window.clearTimeout(timeoutId);
      if (isMountedRef.current) setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    // Garde anti double soumission en TETE handler
    if (isSubmitting) return;

    // Validation locale AVANT setIsSubmitting (évite blocage UI sur retour anticipé)
    if (!validateStep()) return;

    // Garde profil défini (générateur numéroId nécessite profil non null)
    if (!profil) return;

    // AbortController UNIQUE pour tout le flux handleSubmit (signal partagé sur les 7 fetchs)
    if (submitAbortRef.current) submitAbortRef.current.abort();
    const controller = new AbortController();
    submitAbortRef.current = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), 60000);

    setIsSubmitting(true);

    try {
      // PIN identificateur retiré en mode BO (pas de vérification serveur).
      if (!skipPinCheck && data.codeIdentificateur) {
        try {
          const pinRes = await fetch(`${API_URL}/auth/identificateur/me/verify-pin`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: data.codeIdentificateur }),
            signal: controller.signal,
          });
          const pinData = await safeJson(pinRes);
          if (!isMountedRef.current) return;
          if (!pinRes.ok || pinData?.valid !== true) {
            setErrors(prev => ({ ...prev, codeIdentificateur: 'Code incorrect. Vérifie ton PIN.' }));
            return;
          }
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          console.warn('[FicheIdentificationDynamiqueBO] verify-pin failed:', err instanceof Error ? err.message : err);
          if (isMountedRef.current) setErrors(prev => ({ ...prev, codeIdentificateur: 'Erreur de vérification du code. Réessaie.' }));
          return;
        }
      }

      const isComplement = locationState2?.mode === 'complement'
        && typeof locationState2?.identificationId === 'string'
        && locationState2.identificationId.length > 0;

      // Helpers de sécurisation des champs optionnels (évitent crash si data.field undefined)
      const safeNom = (data.nom || '').toUpperCase();

      if (isComplement) {
        try {
          const fullName = `${data.prenoms || ''} ${data.nom || ''}`.trim();
          const acteurIdRaw = locationState2.acteurId;
          const acteurIdToUpdate = (typeof acteurIdRaw === 'string' && acteurIdRaw.length > 0) ? acteurIdRaw : '';

          if (acteurIdToUpdate) {
            const userRes = await fetch(`${API_URL}/users/${acteurIdToUpdate}`, {
              credentials: 'include',
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                firstName: data.prenoms, lastName: safeNom,
                commune: data.commune,
                nationalite: data.nationalite,
                situationMatrimoniale: data.situationMatrimoniale,
                numCNPS: data.numCNPS,
                numCMU: data.numCMU,
                recepisse: data.recepisse,
                categorie: data.categorie,
                typePointVente: data.typePointVente || null,
                typePointVenteAutre: data.typePointVente === 'autre' ? (data.typePointVenteAutre || null) : null,
                districtId: data.districtId || null,
                districtAutre: data.districtAutre || null,
                regionId: data.regionId || null,
                regionAutre: data.regionAutre || null,
                departementId: data.departementId || null,
                departementAutre: data.departementAutre || null,
                communeId: data.communeId || null,
                communeAutre: data.communeAutre || null,
                quartierVillage: data.quartierVillage || null,
                estMembreCooperative: data.estMembreCooperative === true,
                boitePostale: data.boitePostale,
                statutEntrepreneur: data.statutEntrepreneur, market: data.marche, activity: data.produitsVendus,
                photoUrl: data.photo || undefined,
              }),
              signal: controller.signal,
            });
            if (!isMountedRef.current) return;
            if (!userRes.ok) {
              toast.error('Mise à jour du profil impossible. Réessaie.');
              return;
            }
          }

          const identPatchRes = await fetch(`${API_URL}/identifications/${locationState2.identificationId}`, {
            credentials: 'include',
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              statut: 'en_attente',
              acteur_nom: fullName,
              commune: data.commune || '',
              region: data.region || null,
              latitude: data.gps?.lat ?? null,
              longitude: data.gps?.lng ?? null,
              current_step: step,
              form_data: data,
              documents: {
                signature: data.signature || null,
                photoBase64: data.photo || null,
              },
            }),
            signal: controller.signal,
          });
          if (!isMountedRef.current) return;
          if (!identPatchRes.ok) {
            toast.error('Mise à jour de l’identification impossible. Réessaie.');
            return;
          }
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') return;
          console.warn('[FicheIdentificationDynamique] complement update failed:', err instanceof Error ? err.message : err);
          if (isMountedRef.current) toast.error('Une erreur est survenue. Réessaie.');
          return;
        }

        // Cleanup atomique brouillon AVANT toast.success (évite race avec debounce 500ms)
        clearDraftAndCancelDebounce();

        try {
          await bo.refreshActeurs();
        } catch {
          /* refresh optionnel */
        }
        if (!isMountedRef.current) return;
        setSubmitted(true);
        submitTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) onSuccess();
        }, 3000);
        return;
      }

      // Branche création neuve : POST /users/backoffice/create
      const roleBo = mapProfilToBoRole(profil);
      if (!roleBo) {
        if (isMountedRef.current) toast.error('Profil invalide pour la création.');
        return;
      }

      let payload: CreateBackofficeUserPayload;

      if (profil === 'admin_general') {
        // Mode entite : firstName = raison sociale, lastName = '-', coordonnees
        // du referent en email/phone, pleins pouvoirs par defaut, metadonnees
        // d'entite. Aucun champ personne n'est transmis. Zone optionnelle
        // (national si absente).
        payload = {
          firstName: (data.raisonSociale || '').trim(),
          lastName: '-',
          phone: formatPhoneForBo(data.telephone || ''),
          role: 'admin_general',
          email: (data.email || '').trim(),
          boPermissions:
            (data as { boPermissions?: Record<string, boolean> }).boPermissions ??
            buildFullBoPermissions(),
          entiteMetadata: {
            sigle: (data.sigle || '').trim(),
            typeEntite: data.typeEntite,
            typePrecise:
              data.typeEntite === ENTITE_TYPE_AUTRE
                ? (data.typePrecise || '').trim() || null
                : null,
            referentNom: (data.referentNom || '').trim(),
            referentFonction: (data.referentFonction || '').trim(),
          },
        };
        if (data.zoneId) {
          payload.zoneIdOptional = data.zoneId;
        }

        let result: CreateBackofficeUserResult;
        try {
          result = await boCreateBackofficeUser(payload, controller.signal);
        } catch (e: unknown) {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          const msg = e instanceof Error ? e.message : 'Erreur lors de la création';
          if (!isMountedRef.current) return;
          if (/téléphone|telephone|numéro/i.test(msg)) {
            toast.error('Ce numéro de téléphone est déjà utilisé.');
          } else if (/e-mail|email|mail/i.test(msg)) {
            toast.error('Cette adresse e-mail est déjà utilisée.');
          } else {
            toast.error(`Erreur de création : ${msg}`);
          }
          return;
        }

        if (!isMountedRef.current) return;
        const refDisplayEntite = generateNumeroId(profil);
        setField('numeroId', result.id || refDisplayEntite);
        submittedNumeroRef.current = result.id || refDisplayEntite;
        clearDraftAndCancelDebounce();
        if (result.defaultPassword) {
          setCreatedPassword(result.defaultPassword);
          toast.success('Compte créé avec succès.');
        } else {
          setCreatedPassword(null);
          toast.success('Compte créé en attente de validation par un super_admin.');
        }
        try {
          await bo.refreshActeurs();
        } catch {
          /* refresh optionnel */
        }
        if (!isMountedRef.current) return;
        setSubmitted(true);
        if (!result.defaultPassword) {
          submitTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) onSuccess();
          }, 3000);
        }
        return;
      }

      payload = {
        firstName: (data.prenoms || '').trim(),
        lastName: (data.nom || '').trim() || undefined,
        phone: formatPhoneForBo(data.telephone || ''),
        role: roleBo,
        genre: data.genre || undefined,
        dateNaissance: data.dateNaissance || undefined,
        lieuNaissance: data.lieuNaissance || undefined,
        nationalite: data.nationalite || undefined,
        nin: data.nin || undefined,
        numCmu: data.numCMU || undefined,
        photoBase64: data.photo || undefined,
      };

      const adminOuIdentificateur = ['admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain', 'identificateur'].includes(roleBo);
      if (adminOuIdentificateur) {
        payload.email = (data.email || '').trim();
      } else if ((data.email || '').trim()) {
        payload.emailOptional = (data.email || '').trim().toLowerCase();
      }

      const zoneObligatoireRole = roleBo === 'gestionnaire_zone' || roleBo === 'identificateur';
      if (zoneObligatoireRole && data.zoneId) {
        payload.zoneId = data.zoneId;
      } else if (!zoneObligatoireRole && data.zoneId) {
        payload.zoneIdOptional = data.zoneId;
      }

      if (['admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain'].includes(roleBo)) {
        const bp = (data as { boPermissions?: Record<string, unknown> }).boPermissions;
        payload.boPermissions = bp ?? undefined;
      }

      if (['marchand', 'producteur', 'cooperateur'].includes(roleBo)) {
        payload.acteurMetierData = {
          marche: data.marche,
          typePointVente: data.typePointVente,
          typePointVenteAutre: data.typePointVenteAutre,
          produitsVendus: data.produitsVendus,
          filierePrincipale: data.filierePrincipale,
          filieresSecondaires: data.filieresSecondaires,
          filiereCoopPrincipale: data.filiereCoopPrincipale,
          filieresCoopSecondaires: data.filieresCoopSecondaires,
          village: data.village,
          nomCooperative: data.nomCooperative,
          zonesIntervention: data.zonesIntervention,
          commune: data.commune,
          region: data.region,
          gps: data.gps
            ? {
              lat: data.gps.lat,
              lng: data.gps.lng,
              accuracy: data.gps.accuracy,
            }
            : null,
          signatureBase64: data.signature ?? null,
        };
        if (roleBo === 'marchand') {
          payload.sousProfilMarchand = data.sousProfilMarchand || undefined;
        }
      }

      if (roleBo === 'institution') {
        payload.institutionData = {
          nomCooperative: data.nomCooperative,
          adresseSiege: data.adresseSiege,
          ville: data.ville,
          commune: data.commune,
          region: data.region,
          zonesIntervention: data.zonesIntervention,
        };
      }

      let result: CreateBackofficeUserResult;
      try {
        result = await boCreateBackofficeUser(payload, controller.signal);
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        const msg = e instanceof Error ? e.message : 'Erreur lors de la création';
        if (!isMountedRef.current) return;
        if (/téléphone|telephone|numéro/i.test(msg)) {
          toast.error('Ce numéro de téléphone est déjà utilisé.');
        } else if (/e-mail|email|mail/i.test(msg)) {
          toast.error('Cette adresse e-mail est déjà utilisée.');
        } else {
          toast.error(`Erreur de création : ${msg}`);
        }
        return;
      }

      if (!isMountedRef.current) return;

      const refDisplay = generateNumeroId(profil);
      setField('numeroId', result.id || refDisplay);
      submittedNumeroRef.current = result.id || refDisplay;

      clearDraftAndCancelDebounce();

      if (result.defaultPassword) {
        setCreatedPassword(result.defaultPassword);
        toast.success('Compte créé avec succès.');
      } else {
        setCreatedPassword(null);
        toast.success('Compte créé en attente de validation par un super_admin.');
      }
      try {
        await bo.refreshActeurs();
      } catch {
        /* refresh optionnel */
      }
      if (!isMountedRef.current) return;
      setSubmitted(true);
      if (!result.defaultPassword) {
        submitTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) onSuccess();
        }, 3000);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.warn('[FicheIdentificationDynamique] handleSubmit failed:', err instanceof Error ? err.message : err);
      if (isMountedRef.current) toast.error('Une erreur est survenue. Réessaie.');
    } finally {
      window.clearTimeout(timeoutId);
      if (isMountedRef.current) setIsSubmitting(false);
    }
  };

  /* ══════════════════════════════════════════════════════
     ÉCRAN DE SÉLECTION DU PROFIL
  ══════════════════════════════════════════════════════ */
  // Respect prefers-reduced-motion : coupe les animations idle infinies si l'utilisateur préfère mouvement réduit
  const prefersReducedMotion = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!profil) {
    const ACTEURS_TERRAIN: ProfilType[] = ['marchand', 'producteur', 'cooperative', 'institution', 'identificateur'];
    const ADMINISTRATEURS: ProfilType[] = ['admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain'];

    const acteursTerrain = VISIBLE_PROFILS.filter((p) => ACTEURS_TERRAIN.includes(p));
    const administrateurs = VISIBLE_PROFILS.filter((p) => ADMINISTRATEURS.includes(p));

    const getBannerText = (hovered: ProfilType | null, creator: string | undefined): string => {
      if (!hovered) {
        return 'Chaque dossier soumis sera verifie avant creation du compte.';
      }
      const isAdmin = (ADMINISTRATEURS as (ProfilType | null)[]).includes(hovered);
      if (!isAdmin) {
        return 'Le compte sera cree et active immediatement apres validation du dossier.';
      }
      if (creator === 'super_admin') {
        return 'Le compte sera cree et active immediatement.';
      }
      if (creator === 'admin_general') {
        return 'Le compte sera mis en attente de validation par un super-administrateur.';
      }
      return 'Chaque dossier soumis sera verifie avant creation du compte.';
    };

    const renderCard = (profilKey: ProfilType) => {
      if (!profilKey) return null;
      const cfg = PROFILES[profilKey];
      if (!cfg) return null;
      const ProfileIcon = cfg.icon;
      const stepsNum = parseInt(cfg.stepsCount, 10) || 0;
      return (
        <motion.button
          key={profilKey}
          type="button"
          onClick={() => {
            setProfil(profilKey);
            setStep(0);
          }}
          onMouseEnter={() => setHoveredProfil(profilKey)}
          onMouseLeave={() => setHoveredProfil(null)}
          onFocus={() => setHoveredProfil(profilKey)}
          onBlur={() => setHoveredProfil(null)}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          aria-label={`Choisir ${cfg.label}`}
          className="bg-white rounded-2xl p-4 w-full text-left border border-gray-100 shadow-sm hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: cfg.lightColor }}
            >
              <ProfileIcon className="w-8 h-8" style={{ color: cfg.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-base text-gray-900 mb-0.5">{cfg.label}</h3>
              <p className="text-sm text-gray-500 mb-2 truncate">{cfg.desc}</p>
              <div className="flex items-center gap-2">
                <div className="flex gap-1" aria-hidden="true">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: i < stepsNum ? cfg.color : `${cfg.color}30` }}
                    />
                  ))}
                </div>
                <span className="text-xs font-bold" style={{ color: cfg.color }}>
                  {cfg.stepsCount}
                </span>
              </div>
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: cfg.lightColor }}
            >
              <ArrowRight className="w-5 h-5" style={{ color: cfg.color }} />
            </div>
          </div>
        </motion.button>
      );
    };

    return (
      <div
        className="min-h-screen px-4 pt-6 pb-6 lg:pl-[320px]"
        style={{ background: 'linear-gradient(180deg, #FAFAF8 0%, #FFFFFF 100%)' }}
        data-bo-create-admin={boMayCreateAdmin ? 'true' : 'false'}
        data-bo-signal={boMaySignal ? 'true' : 'false'}
      >
        <div className="max-w-2xl mx-auto flex flex-col" style={{ maxHeight: '700px', height: 'calc(100vh - 96px)' }}>
          {/* Header fixe */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 mb-6 flex-shrink-0"
          >
            <motion.button
              type="button"
              aria-label="Retour"
              onClick={() => onClose()}
              whileTap={{ scale: 0.9 }}
              className="w-12 h-12 rounded-2xl flex items-center justify-center border-2 border-gray-200 bg-white shadow-sm flex-shrink-0"
            >
              <ArrowLeft className="w-6 h-6 text-gray-700" aria-hidden="true" />
            </motion.button>
            <div className="min-w-0 flex-1">
              <h1
                className="text-gray-900"
                style={{
                  fontSize: '1.4rem',
                  fontWeight: 900,
                  lineHeight: 1.15,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                Nouvel enrolement
              </h1>
              <p className="text-gray-500" style={{ fontSize: '0.88rem' }}>
                Quel type d'acteur souhaites-tu enroler ?
              </p>
            </div>
          </motion.div>

          {/* Section titre acteurs terrain - fixe */}
          {acteursTerrain.length > 0 && (
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex-shrink-0">
              Acteurs terrain
            </h2>
          )}

          {/* Liste scrollable */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-3" style={{ minHeight: 0 }}>
            {acteursTerrain.map((p) => renderCard(p))}

            {administrateurs.length > 0 && (
              <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-6 mb-3 pt-2">
                Comptes administrateurs
              </h2>
            )}

            {administrateurs.map((p) => renderCard(p))}
          </div>

          {/* Banner dynamique fixe */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-4 p-4 rounded-2xl border-2 border-blue-100 bg-blue-50 flex gap-3 flex-shrink-0"
          >
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-blue-800" style={{ fontSize: '0.88rem' }}>
              {getBannerText(hoveredProfil, createurRole)}
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════
     ÉCRAN DE SUCCÈS
  ══════════════════════════════════════════════════════ */
  if (submitted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-5 pb-24 lg:pl-[320px]" style={{ background: 'linear-gradient(180deg, #FFFBEB 0%, #FFFFFF 100%)' }}>
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          className="w-full max-w-md"
        >
          {/* Trophée animé */}
          <div className="flex justify-center mb-6">
            <motion.div
              className="relative"
              animate={prefersReducedMotion ? { y: 0 } : { y: [0, -10, 0] }}
              transition={prefersReducedMotion ? { duration: 0 } : { duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="w-32 h-32 rounded-full bg-amber-100 flex items-center justify-center">
                <Trophy className="w-16 h-16 text-amber-500" aria-hidden="true" />
              </div>
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  className="absolute w-3 h-3 rounded-full bg-amber-400"
                  style={{ top: '50%', left: '50%' }}
                  animate={{
                    x: [0, Math.cos(i * 90 * (Math.PI / 180)) * 60],
                    y: [0, Math.sin(i * 90 * (Math.PI / 180)) * 60],
                    opacity: [1, 0],
                    scale: [1, 0],
                  }}
                  transition={prefersReducedMotion ? { duration: 0 } : { duration: 1.2, repeat: Infinity, delay: i * 0.3 }}
                />
              ))}
            </motion.div>
          </div>

          <h2
            role="status"
            aria-live="polite"
            className="text-center text-gray-900 mb-1"
            style={{ fontSize: '1.7rem', fontWeight: 900 }}
          >
            {createdPassword ? 'Compte créé !' : 'Dossier envoyé !'}
          </h2>
          <p className="text-center text-gray-500 mb-2" style={{ fontSize: '1rem' }}>
            {data.prenoms} {data.nom}
          </p>
          <p className="text-center mb-6" style={{ color: cfg!.color, fontSize: '0.92rem', fontWeight: 700 }}>
            {createdPassword ? `Compte ${cfg!.label} actif` : `Dossier ${cfg!.label} transmis avec succès`}
          </p>

          {/* Workflow */}
          <div className="bg-white rounded-3xl border-2 border-amber-200 p-5 mb-4 shadow-sm">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-gray-100">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
                <Clock className="w-7 h-7 text-amber-600" aria-hidden="true" />
              </div>
              <div>
                <p className="font-black text-gray-900" style={{ fontSize: '1rem' }}>En attente de validation</p>
                <p style={{ fontSize: '0.85rem', fontWeight: 600, color: '#D97706' }}>Délai : 24 à 48 heures ouvrées</p>
              </div>
            </div>
            <div className="space-y-0">
              {[
                { icon: Send,       label: 'Dossier soumis',          desc: 'Reçu pour vérification',       done: true,  active: false },
                { icon: FileText,   label: 'Vérification des docs',   desc: 'Photo, signature, GPS, données',        done: false, active: true  },
                { icon: ShieldCheck,label: 'Contrôle de doublons',    desc: 'NIN, téléphone, biométrie',             done: false, active: false },
                { icon: CheckCircle,label: 'Approbation superviseur', desc: 'Validation finale par le responsable',  done: false, active: false },
                { icon: Users,      label: 'Création du compte',      desc: `Activation du compte ${cfg!.label}`,   done: false, active: false },
              ].map((item, i, arr) => {
                const Icon = item.icon || Zap;
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <motion.div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: item.done ? '#22C55E' : item.active ? '#F59E0B' : '#F3F4F6' }}
                        animate={item.active && !prefersReducedMotion ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                        transition={item.active && !prefersReducedMotion ? { duration: 1.5, repeat: Infinity } : { duration: 0 }}
                      >
                        {item.done ? <CheckCircle className="w-5 h-5 text-white" aria-hidden="true" />
                          : item.active ? (
                            <motion.div
                              animate={prefersReducedMotion ? { rotate: 0 } : { rotate: 360 }}
                              transition={prefersReducedMotion ? { duration: 0 } : { duration: 3, repeat: Infinity, ease: 'linear' }}
                            >
                              <Clock className="w-5 h-5 text-white" aria-hidden="true" />
                            </motion.div>
                          ) : <Icon className="w-5 h-5 text-gray-400" aria-hidden="true" />}
                      </motion.div>
                      {i < arr.length - 1 && (
                        <div className="w-0.5 flex-1 my-1 min-h-[24px]" style={{ backgroundColor: item.done ? '#22C55E' : '#E5E7EB' }} />
                      )}
                    </div>
                    <div className="flex-1 pb-4 pt-1">
                      <p style={{ fontWeight: 700, fontSize: '0.92rem', color: item.done ? '#16A34A' : item.active ? '#D97706' : '#9CA3AF' }}>
                        {item.label}
                      </p>
                      <p style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {!createdPassword && (
            <div className="bg-blue-50 rounded-2xl border-2 border-blue-100 p-4 mb-4 flex gap-3">
              <Info className="w-6 h-6 text-blue-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1E40AF' }}>Aucun compte créé pour l’instant</p>
                <p style={{ fontSize: '0.82rem', color: '#3B82F6', lineHeight: '1.5', marginTop: 4 }}>
                  Le compte sera activé uniquement après approbation complète.
                </p>
              </div>
            </div>
          )}
          {createdPassword && (
            <div className="bg-amber-50 rounded-2xl border-2 border-amber-200 p-4 mb-4">
              <div className="flex gap-3 mb-3">
                <ShieldCheck className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700, color: '#92400E' }}>Mot de passe initial</p>
                  <p style={{ fontSize: '0.82rem', color: '#B45309', lineHeight: '1.5', marginTop: 4 }}>
                    Communique-le à l'utilisateur. Il sera demandé de le changer à la première connexion. Ce mot de passe ne sera plus affiché.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white rounded-xl border-2 border-amber-200 p-3">
                <code style={{ flex: 1, fontSize: '1.05rem', fontWeight: 700, color: '#1a1a1a', letterSpacing: '0.05em', fontFamily: 'ui-monospace, SFMono-Regular, monospace', wordBreak: 'break-all' }}>
                  {createdPassword}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(createdPassword).then(
                      () => toast.success('Mot de passe copié'),
                      () => toast.error('Copie impossible'),
                    );
                  }}
                  className="shrink-0 px-3 py-2 rounded-lg font-bold text-white text-sm"
                  style={{ background: '#D97706' }}
                >
                  Copier
                </button>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-2xl border-2 border-gray-200 p-4 text-center">
            <p style={{ fontSize: '0.75rem', color: '#9CA3AF', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Numéro de référence
            </p>
            <p className="font-black text-gray-900 mt-1" style={{ fontSize: '1.3rem', letterSpacing: '0.08em' }}>
              {data.numeroId || submittedNumeroRef.current}
            </p>
            <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 4 }}>Conserve ce numéro pour le suivi</p>
          </div>

          {createdPassword ? (
            <button
              type="button"
              onClick={() => onSuccess()}
              className="w-full mt-5 py-3 rounded-2xl font-bold text-white"
              style={{ background: cfg!.color }}
            >
              Terminer
            </button>
          ) : (
            <p className="text-center mt-5" style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>
              Retour automatique dans quelques secondes...
            </p>
          )}
        </motion.div>
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════
     FORMULAIRE PRINCIPAL
  ══════════════════════════════════════════════════════ */
  const isLastStep = step === totalSteps - 1;
  const progressPct = (completedSteps.size / totalSteps) * 100;
  const ProfileIcon = (cfg && cfg.icon) || Zap;

  return (
    <SubPageLayout role="administrateur" title="Fiche identification" noPadding onBackOverride={handleBack}>
    <div className={`min-h-screen pb-10 pt-0 lg:pl-[320px]`} style={{ background: cfg!.gradientBg }}>
      {/* HEADER */}
      <div className="sticky top-0 z-20 px-4 pt-5 pb-3" style={{ background: cfg!.gradientBg }}>
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cfg!.lightColor }}>
                  <ProfileIcon className="w-5 h-5" style={{ color: cfg!.color }} aria-hidden="true" />
                </div>
                <h1 className="text-gray-900 truncate" style={{ fontSize: '1.25rem', fontWeight: 900 }}>
                  Identification {cfg!.label}
                </h1>
              </div>
              <p className="text-gray-500" style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                Étape {step + 1} sur {totalSteps} : {currentStepConfig?.label}
              </p>
            </div>

            <motion.button
              type="button"
              onClick={() => setShowCloseConfirm(true)}
              whileTap={{ scale: 0.92 }}
              whileHover={{ scale: 1.05 }}
              style={{
                width: 44,
                height: 44,
                background: '#fff',
                border: '1.5px solid #E5E0D8',
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                flexShrink: 0,
                fontFamily: 'inherit',
              }}
              aria-label="Fermer la fiche"
              aria-haspopup="dialog"
            >
              <X className="w-5 h-5" style={{ color: '#666' }} aria-hidden="true" />
            </motion.button>

          </div>

          {/* BARRE DE PROGRESSION */}
          <div className="relative mb-4">
            <div className="bg-gray-200 rounded-full h-3 overflow-hidden">
              <motion.div
                className="h-full rounded-full relative overflow-hidden"
                style={{ backgroundColor: cfg!.color }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
              >
                {/* Shimmer */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  animate={prefersReducedMotion ? { x: '-100%' } : { x: ['-100%', '200%'] }}
                  transition={prefersReducedMotion ? { duration: 0 } : { duration: 1.5, repeat: Infinity, ease: 'linear' }}
                />
              </motion.div>
            </div>
            <div className="flex justify-between mt-1">
              <span style={{ fontSize: '0.72rem', color: cfg!.color, fontWeight: 700 }}>
                {Math.round(progressPct)}% accompli
              </span>
              <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                {totalSteps - step - 1} étape{totalSteps - step - 1 !== 1 ? 's' : ''} restante{totalSteps - step - 1 !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* INDICATEURS D’ÉTAPES */}
          <div
            className="flex items-start pb-1"
            style={{
              scrollbarWidth: 'none',
              gap: cfg!.steps.length > 7 ? '2px' : '3px',
              justifyContent: cfg!.steps.length > 7 ? 'space-around' : 'space-between',
              overflowX: cfg!.steps.length > 7 ? 'auto' : 'visible',
            }}
          >
            {cfg!.steps.map((s, i) => {
              const Icon = s.icon || Zap;
              const done = completedSteps.has(i);
              const active = i === step;
              const isClickable = done || active;
              return (
                <motion.button
                  key={s.id}
                  type="button"
                  onClick={() => handleStepClick(i)}
                  disabled={!isClickable}
                  aria-current={active ? 'step' : undefined}
                  aria-label={`Étape ${i + 1} : ${s.label}${done ? ' (terminée)' : active ? ' (en cours)' : ' (à venir)'}`}
                  className="flex flex-col items-center gap-0.5"
                  style={{
                    flex: cfg!.steps.length > 7 ? '0 0 auto' : 1,
                    minWidth: cfg!.steps.length > 7 ? 36 : 0,
                    cursor: isClickable ? 'pointer' : 'default',
                    background: 'transparent',
                    border: 'none',
                    padding: 0,
                    fontFamily: 'inherit',
                  }}
                  animate={active && !prefersReducedMotion ? { y: [0, -4, 0] } : { y: 0 }}
                  transition={active && !prefersReducedMotion ? { duration: 1.8, repeat: Infinity, ease: 'easeInOut' } : { duration: 0 }}
                  whileTap={isClickable ? { scale: 0.94 } : undefined}
                >
                  <motion.div
                    className={cfg!.steps.length > 7 ? 'w-8 h-8 rounded-lg flex items-center justify-center' : 'w-9 h-9 rounded-xl flex items-center justify-center'}
                    style={{
                      backgroundColor: done ? cfg!.color : active ? cfg!.lightColor : '#F3F4F6',
                      border: active ? `2.5px solid ${cfg!.color}` : done ? 'none' : '2px solid #E5E7EB',
                      boxShadow: active ? `0 4px 16px ${cfg!.color}44` : 'none',
                    }}
                    animate={
                      active && !prefersReducedMotion
                        ? { scale: [1, 1.06, 1] }
                        : { scale: 1 }
                    }
                    transition={{
                      ...(active && !prefersReducedMotion
                        ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' }
                        : { duration: 0 }),
                    }}
                  >
                    {done
                      ? <CheckCircle className="w-5 h-5 text-white" aria-hidden="true" />
                      : <Icon className="w-5 h-5" style={{ color: active ? cfg!.color : '#9CA3AF' }} aria-hidden="true" />
                    }
                  </motion.div>
                  <span style={{
                    fontSize: cfg!.steps.length > 7 ? '0.55rem' : '0.6rem',
                    fontWeight: active || done ? 800 : 500,
                    color: active ? cfg!.color : done ? cfg!.color : '#9CA3AF',
                    textAlign: 'center',
                    lineHeight: '1.2',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: cfg!.steps.length > 7 ? '44px' : 'none',
                  }}>
                    {s.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-4 max-w-2xl mx-auto">
        {/* CONTENU DE L’ÉTAPE */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`${profil}-${step}`}
            custom={direction}
            initial={{ opacity: 0, x: direction * 100 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -100 }}
            transition={{
              duration: 0.6,
              ease: [0.16, 1, 0.3, 1],
              opacity: { duration: 0.4 },
            }}
            className="bg-white rounded-3xl shadow-xl border-2 p-6 mb-5"
            style={{ borderColor: `${cfg!.color}30`, willChange: 'transform, opacity' }}
          >
            <StepContent
              stepId={currentStepConfig!.id}
              profil={profil!}
              data={data}
              setField={setField}
              setErrors={setErrors}
              errors={errors}
              cfg={cfg!}
              getZonesByRegion={getZonesByRegion}
              signatureCanvasRef={signatureCanvasRef}
              openCamera={openCamera}
              openGallery={openGallery}
              isDrawing={isDrawing}
              startDrawing={startDrawing}
              draw={draw}
              stopDrawing={stopDrawing}
              clearSignature={clearSignature}
              handlePhoto={handlePhoto}
              handleGPS={handleGPS}
              gpsCapturing={gpsCapturing}
              handleTelChange={handleTelChange}
              verificationTel={verificationTel}
              step={step}
              setStep={setStep}
              setDirection={setDirection}
              completedSteps={completedSteps}
              signatureMode={signatureMode}
              setSignatureMode={setSignatureMode}
              skipPinCheck={skipPinCheck}
            />
          </motion.div>
        </AnimatePresence>

        {/* BOUTONS NAVIGATION */}
        <div className="flex gap-3 w-full items-stretch">
          <motion.button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSubmitting || step < 3}
            whileHover={isSubmitting ? undefined : { scale: 1.02 }}
            whileTap={isSubmitting ? undefined : { scale: 0.98 }}
            className="shrink-0 rounded-3xl flex items-center justify-center gap-2 border-2 bg-white font-bold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed px-4"
            style={{
              borderColor: cfg!.color,
              color: cfg!.color,
              fontSize: '0.95rem',
              paddingTop: 18,
              paddingBottom: 18,
            }}
          >
            <Save className="w-4 h-4" aria-hidden="true" />
            Brouillon
          </motion.button>
          <motion.button
            type="button"
            onClick={isLastStep ? () => setShowSubmitConfirm(true) : handleNext}
            disabled={isSubmitting}
            aria-haspopup={isLastStep ? 'dialog' : undefined}
            whileHover={isSubmitting ? undefined : { scale: 1.03, y: -2 }}
            whileTap={isSubmitting ? undefined : { scale: 0.96 }}
            className="flex-1 min-w-0 rounded-3xl text-white flex items-center justify-center gap-3 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(135deg, ${cfg!.color} 0%, ${cfg!.colorDark} 100%)`,
              fontWeight: 800,
              fontSize: '1.15rem',
              paddingTop: 20,
              paddingBottom: 20,
              boxShadow: `0 8px 32px ${cfg!.color}55`,
            }}
          >
            {isLastStep ? (
              <>
                <Send className="w-6 h-6" aria-hidden="true" />
                Envoyer le dossier
              </>
            ) : (
              <>
                Continuer
                <motion.div
                  animate={prefersReducedMotion ? { x: 0 } : { x: [0, 4, 0] }}
                  transition={prefersReducedMotion ? { duration: 0 } : { duration: 1, repeat: Infinity }}
                >
                  <ArrowRight className="w-6 h-6" aria-hidden="true" />
                </motion.div>
              </>
            )}
          </motion.button>
        </div>
      </div>

      <input
        ref={fileInputCameraRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="user"
        className="hidden"
        aria-label="Prendre une photo avec la caméra"
        tabIndex={-1}
        onChange={handlePhoto}
      />

      <input
        ref={fileInputGalleryRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        aria-label="Choisir une photo depuis la galerie"
        tabIndex={-1}
        onChange={handlePhoto}
      />

      <AnimatePresence>
        {showSubmitConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !isSubmitting && setShowSubmitConfirm(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '20px',
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="submit-confirm-title"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff',
                borderRadius: '20px',
                padding: '24px',
                maxWidth: '380px',
                width: '100%',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <motion.div
                  animate={prefersReducedMotion ? { scale: 1 } : { scale: [1, 1.1, 1] }}
                  transition={prefersReducedMotion ? { duration: 0 } : { duration: 1.5, repeat: Infinity }}
                  style={{
                    width: '48px', height: '48px',
                    background: '#FFEEDD', borderRadius: '14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Send className="w-6 h-6" style={{ color: cfg!.color }} aria-hidden="true" />
                </motion.div>
                <div style={{ flex: 1 }}>
                  <div id="submit-confirm-title" style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1a1a' }}>{'Envoyer le dossier\u202f?'}</div>
                  <div style={{ fontSize: '0.78rem', color: '#888', marginTop: '4px' }}>Cette action est définitive</div>
                </div>
              </div>
              <div style={{ fontSize: '0.85rem', color: '#444', lineHeight: 1.5, marginBottom: '20px' }}>
                Une fois envoyé, le dossier sera transmis pour validation et ne pourra plus être modifié directement. Continuer ?
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <motion.button
                  type="button"
                  onClick={() => setShowSubmitConfirm(false)}
                  disabled={isSubmitting}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    background: '#fff',
                    border: '1.5px solid #E5E0D8',
                    borderRadius: '12px',
                    color: '#666',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: isSubmitting ? 'wait' : 'pointer',
                    opacity: isSubmitting ? 0.6 : 1,
                    fontFamily: 'inherit',
                  }}
                >
                  Annuler
                </motion.button>
                <motion.button
                  type="button"
                  onClick={async () => {
                    setShowSubmitConfirm(false);
                    await handleSubmit();
                  }}
                  disabled={isSubmitting}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    flex: 1.5,
                    padding: '12px',
                    background: `linear-gradient(135deg, ${cfg!.color} 0%, ${cfg!.colorDark} 100%)`,
                    border: 'none',
                    borderRadius: '12px',
                    color: '#fff',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: isSubmitting ? 'wait' : 'pointer',
                    opacity: isSubmitting ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    boxShadow: `0 3px 10px ${cfg!.color}50`,
                    fontFamily: 'inherit',
                  }}
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                  Confirmer l’envoi
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCloseConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCloseConfirm(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: 20,
            }}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="close-confirm-title"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff',
                borderRadius: 20,
                padding: 24,
                maxWidth: 400,
                width: '100%',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <motion.div
                  animate={prefersReducedMotion ? { scale: 1 } : { scale: [1, 1.1, 1] }}
                  transition={prefersReducedMotion ? { duration: 0 } : { duration: 1.5, repeat: Infinity }}
                  style={{
                    width: 48, height: 48,
                    background: '#FEF3C7',
                    borderRadius: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AlertCircle className="w-6 h-6" style={{ color: '#D97706' }} aria-hidden="true" />
                </motion.div>
                <div style={{ flex: 1 }}>
                  <div id="close-confirm-title" style={{ fontSize: '1rem', fontWeight: 700, color: '#1a1a1a' }}>
                    Sauver en brouillon avant de fermer ?
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#888', marginTop: 4 }}>
                    Tu as commencé à remplir cette fiche
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 18 }}>
                <motion.button
                  type="button"
                  onClick={async () => {
                    setShowCloseConfirm(false);
                    await handleSaveDraft();
                  }}
                  disabled={isSubmitting}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    width: '100%',
                    padding: 13,
                    background: `linear-gradient(135deg, ${cfg!.color} 0%, ${cfg!.colorDark} 100%)`,
                    border: 'none',
                    borderRadius: 12,
                    color: '#fff',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    cursor: isSubmitting ? 'wait' : 'pointer',
                    opacity: isSubmitting ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: `0 3px 10px ${cfg!.color}50`,
                    fontFamily: 'inherit',
                  }}
                >
                  <Save className="w-4 h-4" aria-hidden="true" />
                  Sauver et fermer
                </motion.button>

                <motion.button
                  type="button"
                  onClick={() => {
                    setShowCloseConfirm(false);
                    onClose();
                  }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    width: '100%',
                    padding: 13,
                    background: '#fff',
                    border: '1.5px solid #FCA5A5',
                    borderRadius: 12,
                    color: '#DC2626',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                  Fermer sans sauver
                </motion.button>

                <motion.button
                  type="button"
                  onClick={() => setShowCloseConfirm(false)}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    width: '100%',
                    padding: 11,
                    background: 'transparent',
                    border: 'none',
                    borderRadius: 10,
                    color: '#888',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    marginTop: 4,
                  }}
                >
                  Annuler
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </SubPageLayout>
  );
}

/* ══════════════════════════════════════════════════════════════════
   DOCUMENTS STEP — NNI / CNI / CNPS / CMU avec lookup ONECI
══════════════════════════════════════════════════════════════════ */
function InputRow({
  label,
  fieldKey,
  placeholder,
  hint,
  value,
  onChange,
  color,
}: {
  label: string;
  fieldKey: string;
  placeholder: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  color: string;
}) {
  const inputId = useId();
  return (
    <div className="mb-4">
      <label htmlFor={inputId} className="block text-sm font-semibold text-gray-700 mb-1">
        {label}
      </label>
      <input
        id={inputId}
        name={fieldKey}
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 focus:outline-none text-gray-900 text-base"
        style={{ borderColor: value ? color : undefined }}
      />
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function DocumentsStep({ data, setField, errors, cfg }: {
  data: any; setField: (f: string, v: any) => void;
  errors: Record<string, string>; cfg: any;
}) {
  const color = cfg.color;
  const [nniStatus, setNniStatus] = React.useState<'idle'|'loading'|'found'|'notfound'>('idle');
  const [nniData, setNniData] = React.useState<any>(null);
  const nniRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const nniAbortRef = React.useRef<AbortController | null>(null);
  const isMountedRef = React.useRef(true);
  const labelNniId = useId();

  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (nniRef.current) clearTimeout(nniRef.current);
      if (nniAbortRef.current) nniAbortRef.current.abort();
    };
  }, []);

  const lookupNNI = async (nni: string) => {
    if (nni.length < 8) {
      if (!isMountedRef.current) return;
      setNniStatus('idle');
      setNniData(null);
      return;
    }
    if (!isMountedRef.current) return;
    if (nniAbortRef.current) nniAbortRef.current.abort();
    nniAbortRef.current = new AbortController();
    const signal = nniAbortRef.current.signal;
    setNniStatus('loading');
    try {
      const res = await fetch(`${API_URL}/oneci/lookup/${nni}`, {
        credentials: 'include',
        signal,
      });
      if (!isMountedRef.current) return;
      if (!res.ok) {
        setNniStatus('notfound');
        setNniData(null);
        return;
      }
      const result = await safeJson<any>(res);
      if (!isMountedRef.current) return;
      if (!result || typeof result !== 'object') {
        setNniStatus('notfound');
        setNniData(null);
        return;
      }
      setNniData(result);
      setNniStatus('found');
      if (typeof result.firstName === 'string' && result.firstName) setField('prenoms', result.firstName);
      if (typeof result.lastName === 'string' && result.lastName) setField('nom', result.lastName);
      if (typeof result.birthDate === 'string' && result.birthDate) setField('dateNaissance', result.birthDate);
      if (typeof result.gender === 'string') {
        setField('genre', result.gender === 'M' ? 'Homme' : result.gender === 'F' ? 'Femme' : '');
      }
      if (typeof result.nationality === 'string' && result.nationality) setField('nationalite', result.nationality);
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      console.warn('[DocumentsStep] NNI lookup failed:', err instanceof Error ? err.message : err);
      if (isMountedRef.current) setNniStatus('notfound');
    }
  };

  const handleNNI = (val: string) => {
    setField('nin', val);
    if (nniRef.current) clearTimeout(nniRef.current);
    nniRef.current = setTimeout(() => lookupNNI(val), 800);
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cfg.lightColor }} aria-hidden="true">
          <FileText className="w-8 h-8" style={{ color }} />
        </div>
        <p style={{ fontSize: '1.3rem', fontWeight: 900, color: '#111827' }}>Documents d’identité</p>
      </div>

      <div className="mb-4">
        <label htmlFor={labelNniId} className="block text-sm font-semibold text-gray-700 mb-1">
          Numéro NNI / Numéro CNI
          <span className="ml-2 text-xs font-normal text-gray-400">(Numéro National d’identification)</span>
        </label>
        <div className="relative">
          <input
            id={labelNniId}
            name="nin"
            type="text"
            value={data.nin || ''}
            onChange={(e) => handleNNI(e.target.value)}
            placeholder="Ex : 11793253275"
            className="w-full px-4 py-3 rounded-2xl border-2 text-gray-900 text-base focus:outline-none pr-12"
            style={{ borderColor: nniStatus === 'found' ? '#16a34a' : nniStatus === 'notfound' ? '#dc2626' : data.nin ? color : '#e5e7eb' }}
          />
          <div className="absolute right-4 top-1/2 -translate-y-1/2" aria-hidden="true">
            {nniStatus === 'loading' && <Clock className="w-5 h-5 text-gray-400 animate-spin" />}
            {nniStatus === 'found' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
            {nniStatus === 'notfound' && <AlertCircle className="w-5 h-5 text-red-500" />}
          </div>
        </div>
        {nniStatus === 'found' && nniData && (
          <div className="mt-2 p-3 bg-green-50 border-2 border-green-200 rounded-2xl" role="status" aria-live="polite">
            <p className="text-xs font-bold text-green-700 mb-1">NNI valide via ONECI</p>
            {nniData.firstName && <p className="text-sm text-green-900 font-semibold">{nniData.firstName} {nniData.lastName}</p>}
            {nniData.birthDate && <p className="text-xs text-green-700">Né(e) le {nniData.birthDate}</p>}
            {nniData.sandboxMode
              ? <p className="text-xs text-green-600 mt-1">Identité confirmée : remplis les champs manuellement</p>
              : <p className="text-xs text-green-600 mt-1">Les champs ont été pré-remplis</p>}
          </div>
        )}
        {nniStatus === 'notfound' && <p className="text-xs text-red-500 mt-1" role="alert">NNI introuvable dans la base ONECI</p>}
      </div>

      <InputRow
        label="Numéro RSTI"
        fieldKey="numCNPS"
        value={data.numCNPS || ''}
        onChange={(v) => setField('numCNPS', v)}
        color={color}
        placeholder="Ex : 0123456789"
        hint="Régime Social des Travailleurs Indépendants"
      />
      <InputRow
        label="Numéro CMU"
        fieldKey="numCMU"
        value={data.numCMU || ''}
        onChange={(v) => setField('numCMU', v)}
        color={color}
        placeholder="Ex : CMU-0000000"
        hint="Couverture Maladie Universelle"
      />

      <div className="mt-4">
        <p className="block text-sm font-semibold text-gray-700 mb-3">
          Autres documents
          <span className="ml-2 text-xs font-normal text-gray-400">(optionnel)</span>
        </p>
        <div className="space-y-3">
          <InputRow
            label="Numéro Extrait de naissance"
            fieldKey="extraitNaissance"
            value={data.extraitNaissance || ''}
            onChange={(v) => setField('extraitNaissance', v)}
            color={color}
            placeholder="Ex : 2024-AB-00123"
          />
          <InputRow
            label="Numéro Passeport"
            fieldKey="passeport"
            value={data.passeport || ''}
            onChange={(v) => setField('passeport', v)}
            color={color}
            placeholder="Ex : CI123456"
          />
          <InputRow
            label="Numéro Permis de conduire"
            fieldKey="permis"
            value={data.permis || ''}
            onChange={(v) => setField('permis', v)}
            color={color}
            placeholder="Ex : 2024-CI-00456"
          />
          <InputRow
            label="Numéro Carte scolaire"
            fieldKey="carteScolaire"
            value={data.carteScolaire || ''}
            onChange={(v) => setField('carteScolaire', v)}
            color={color}
            placeholder="Ex : SCO-2024-00789"
          />
          <InputRow
            label="Numéro Carte étudiant"
            fieldKey="carteEtudiant"
            value={data.carteEtudiant || ''}
            onChange={(v) => setField('carteEtudiant', v)}
            color={color}
            placeholder="Ex : ETU-2024-00012"
          />
        </div>
      </div>

      <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-100 rounded-2xl flex gap-3">
        <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <p className="text-xs text-blue-700">Ces champs sont optionnels. Le NNI permet de pré-remplir automatiquement les informations d'identité via la base ONECI.</p>
      </div>
    </div>
  );
}

async function syncZoneForCommuneLabel(
  setField: (f: string, v: any) => void,
  communeLabel: string,
  signal?: AbortSignal,
) {
  if (!communeLabel.trim()) return;
  const communeNom = communeLabel.replace('Abidjan - ', '').trim();
  try {
    const res = await fetch(`${API_URL}/zones`, { credentials: 'include', signal });
    if (!res.ok) return;
    const d = await safeJson<{ zones?: Array<{ id: string; nom: string }> }>(res);
    if (!d || !Array.isArray(d.zones)) return;
    const communeShort2 = communeNom.includes(' - ') ? communeNom.split(' - ')[1].trim() : communeNom;
    const zone = d.zones.find((z) =>
      typeof z?.nom === 'string' && (
        z.nom.toLowerCase() === communeShort2.toLowerCase()
        || z.nom.toLowerCase() === communeNom.toLowerCase()
      ),
    );
    if (zone) {
      setField('zoneId', zone.id);
      setField('zoneNom', zone.nom);
    }
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') return;
    console.warn('[syncZoneForCommuneLabel] zones fetch failed:', err instanceof Error ? err.message : err);
  }
}

function LieuStep({
  profil, data, setField, errors, color, handleGPS, gpsCapturing, onSkipGps,
}: {
  profil: ProfilType;
  data: any;
  setField: (f: string, v: any) => void;
  errors: Record<string, string>;
  color: string;
  handleGPS: () => void;
  gpsCapturing: boolean;
  onSkipGps: () => void;
}) {
  const { districts, regions, departements, communes: bdCommunes } = useAdminCascade(
    data.districtId || '',
    data.regionId || '',
    data.departementId || '',
  );

  const prefersReducedMotion = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Stabilisation reference setField pour eviter stale closure dans useEffect
  const setFieldRef = useRef(setField);
  useEffect(() => {
    setFieldRef.current = setField;
  });

  const [pickDistrictOther, setPickDistrictOther] = useState(false);
  const [pickRegionOther, setPickRegionOther] = useState(false);
  const [pickDepartementOther, setPickDepartementOther] = useState(false);
  const [pickCommuneOther, setPickCommuneOther] = useState(false);
  const [showCascadeManuelle, setShowCascadeManuelle] = useState(false);

  useEffect(() => {
    if (!data.districtId && String(data.districtAutre || '').trim()) setPickDistrictOther(true);
    if (!data.regionId && String(data.regionAutre || '').trim()) setPickRegionOther(true);
    if (!data.departementId && String(data.departementAutre || '').trim()) setPickDepartementOther(true);
    if (!data.communeId && String(data.communeAutre || '').trim()) setPickCommuneOther(true);
  }, [data.districtId, data.regionId, data.departementId, data.communeId, data.districtAutre, data.regionAutre, data.departementAutre, data.communeAutre]);

  const selectedDistrict = districts.find((d) => d.id === data.districtId);
  const isAbidjan = Boolean(selectedDistrict?.nom?.includes('Abidjan'))
    || Boolean(String(data.districtAutre || '').trim().includes('Abidjan'));

  useEffect(() => {
    const sel = districts.find((d) => d.id === data.districtId);
    const abidjan = Boolean(sel?.nom?.includes('Abidjan'))
      || Boolean(String(data.districtAutre || '').trim().includes('Abidjan'));
    setFieldRef.current('lieuAbidjan', abidjan);
  }, [districts, data.districtId, data.districtAutre]);

  useEffect(() => {
    const ac = new AbortController();
    if (isAbidjan && data.communeId) {
      const c = bdCommunes.find((x) => x.id === data.communeId);
      if (!c) return () => ac.abort();
      const label = `Abidjan - ${c.nom}`;
      if (data.commune !== label) {
        setFieldRef.current('commune', label);
        syncZoneForCommuneLabel(setFieldRef.current, label, ac.signal);
      }
      return () => ac.abort();
    }
    if (isAbidjan && String(data.communeAutre || '').trim() && !data.communeId) {
      const raw = String(data.communeAutre).trim();
      const label = raw.startsWith('Abidjan') ? raw : `Abidjan - ${raw}`;
      if (data.commune !== label) {
        setFieldRef.current('commune', label);
        syncZoneForCommuneLabel(setFieldRef.current, label, ac.signal);
      }
      return () => ac.abort();
    }
    if (!isAbidjan && data.communeId) {
      const c = bdCommunes.find((x) => x.id === data.communeId);
      if (c && data.commune !== c.nom) {
        setFieldRef.current('commune', c.nom);
        syncZoneForCommuneLabel(setFieldRef.current, c.nom, ac.signal);
      }
      return () => ac.abort();
    }
    if (!isAbidjan && String(data.quartierVillage || '').trim()) {
      const t = String(data.quartierVillage).trim();
      if (data.commune !== t) setFieldRef.current('commune', t);
    }
    return () => ac.abort();
  }, [isAbidjan, data.communeId, data.communeAutre, data.quartierVillage, bdCommunes, data.commune]);

  const clearBelowDistrict = () => {
    setField('regionId', '');
    setField('regionAutre', '');
    setField('departementId', '');
    setField('departementAutre', '');
    setField('communeId', '');
    setField('communeAutre', '');
    setField('quartierVillage', '');
    setPickRegionOther(false);
    setPickDepartementOther(false);
    setPickCommuneOther(false);
  };

  const clearBelowRegion = () => {
    setField('departementId', '');
    setField('departementAutre', '');
    setField('communeId', '');
    setField('communeAutre', '');
    setField('quartierVillage', '');
    setPickDepartementOther(false);
    setPickCommuneOther(false);
  };

  const clearBelowDepartement = () => {
    setField('communeId', '');
    setField('communeAutre', '');
    setField('quartierVillage', '');
    setPickCommuneOther(false);
  };

  const hasDistrict = Boolean(data.districtId || String(data.districtAutre || '').trim());
  const hasRegion = Boolean(data.regionId || String(data.regionAutre || '').trim());
  const hasDepartement = Boolean(data.departementId || String(data.departementAutre || '').trim());

  const districtSel = data.districtId || (pickDistrictOther ? ADMIN_AUTRE : '');
  const regionSel = data.regionId || (pickRegionOther ? ADMIN_AUTRE : '');
  const departementSel = data.departementId || (pickDepartementOther ? ADMIN_AUTRE : '');
  const communeSel = data.communeId || (pickCommuneOther ? ADMIN_AUTRE : '');
  const selectedCommune = bdCommunes.find((c) => c.id === data.communeId);

  const hasAutoSummary = Boolean(data.districtId || data.regionId || data.departementId);
  const cascadeVisible = !hasAutoSummary || showCascadeManuelle;

  return (
    <div className="space-y-5">
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
        <div style={{
          width: '42px', height: '42px',
          background: '#FFEEDD', borderRadius: '13px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <motion.div
            animate={prefersReducedMotion ? { y: 0 } : { y: [0, -2, 0] }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            style={{ display: 'flex' }}
          >
            <MapPin className="w-5 h-5" style={{ color }} aria-hidden="true" />
          </motion.div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 }}>
            {profil === 'marchand' ? 'Lieu d’exercice' : 'Zone de production'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '2px' }}>
            Détecte ta position pour remplir automatiquement
          </div>
        </div>
      </div>

      {!data.gps ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <motion.button
              type="button"
              onClick={handleGPS}
              disabled={gpsCapturing}
              whileTap={{ scale: 0.97 }}
              aria-label={gpsCapturing ? 'Capture en cours' : 'Capturer le GPS'}
              style={{
                flex: '1 1 140px',
                padding: '14px 16px',
                background: `linear-gradient(135deg, ${color} 0%, ${color}DD 100%)`,
                color: '#fff',
                border: 'none',
                borderRadius: '14px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: gpsCapturing ? 'wait' : 'pointer',
                opacity: gpsCapturing ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                boxShadow: `0 3px 10px ${color}50`,
                fontFamily: 'inherit',
              }}
            >
              {prefersReducedMotion ? (
                <span
                  style={{
                    width: '10px', height: '10px',
                    background: '#fff',
                    borderRadius: '50%',
                    display: 'inline-block',
                  }}
                  aria-hidden="true"
                />
              ) : (
                <motion.span
                  animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    width: '10px', height: '10px',
                    background: '#fff',
                    borderRadius: '50%',
                    display: 'inline-block',
                  }}
                  aria-hidden="true"
                />
              )}
              {prefersReducedMotion ? (
                <div style={{ display: 'flex' }} aria-hidden="true">
                  <NavigationIcon className="w-5 h-5" />
                </div>
              ) : (
                <motion.div
                  animate={{ x: [0, 3, 0] }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ display: 'flex' }}
                  aria-hidden="true"
                >
                  <NavigationIcon className="w-5 h-5" />
                </motion.div>
              )}
              {gpsCapturing ? 'Capture en cours…' : 'Capturer le GPS'}
            </motion.button>
            <motion.button
              type="button"
              onClick={onSkipGps}
              disabled={gpsCapturing}
              whileTap={{ scale: 0.97 }}
              aria-label="Ignorer le GPS pour cette fiche"
              style={{
                flex: '1 1 140px',
                padding: '14px 16px',
                background: '#fff',
                color: '#4B5563',
                border: `2px solid ${color}55`,
                borderRadius: '14px',
                fontSize: '0.92rem',
                fontWeight: 700,
                cursor: gpsCapturing ? 'wait' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Ignorer le GPS
            </motion.button>
          </div>
        </div>
      ) : (
        <>
        <div style={{
          background: '#ECFDF5',
          border: '1.5px solid #A7F3D0',
          borderRadius: '14px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          {prefersReducedMotion ? (
            <div
              style={{
                width: '32px', height: '32px',
                background: '#10B981', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
          ) : (
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              style={{
                width: '32px', height: '32px',
                background: '#10B981', borderRadius: '10px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
            </motion.div>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#065F46' }}>Position détectée</div>
            <div style={{
              fontSize: '0.62rem',
              color: '#047857',
              marginTop: '2px',
              fontFamily: 'ui-monospace, SFMono-Regular, monospace',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {data.gps.lat.toFixed(4)}° N, {Math.abs(data.gps.lng).toFixed(4)}° {data.gps.lng < 0 ? 'W' : 'E'} · ±{Math.round(data.gps.accuracy || 0)}m
            </div>
          </div>
          <motion.button
            type="button"
            onClick={handleGPS}
            disabled={gpsCapturing}
            whileTap={prefersReducedMotion ? { scale: 0.92 } : { scale: 0.92, rotate: -360 }}
            transition={{ duration: 0.6, ease: 'easeInOut' }}
            style={{
              width: '44px',
              height: '44px',
              background: '#fff',
              border: '1.5px solid #A7F3D0',
              color: '#047857',
              borderRadius: '50%',
              cursor: gpsCapturing ? 'wait' : 'pointer',
              opacity: gpsCapturing ? 0.6 : 1,
              fontFamily: 'inherit',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
            aria-label="Détecter à nouveau"
            title="Détecter à nouveau"
          >
            <RotateCcw className="w-5 h-5" aria-hidden="true" />
          </motion.button>
        </div>
        <motion.button
          type="button"
          onClick={onSkipGps}
          whileTap={{ scale: 0.98 }}
          style={{
            width: '100%',
            marginTop: '8px',
            padding: '10px 14px',
            background: 'transparent',
            border: `1.5px dashed ${color}55`,
            borderRadius: '12px',
            color: '#6B7280',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Retirer le GPS
        </motion.button>
        </>
      )}

      {(data.districtId || data.regionId || data.departementId) && (
        <div style={{
          background: '#F0F9FF',
          border: '1.5px solid #BAE6FD',
          borderRadius: '14px',
          padding: '14px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span style={{
              background: '#0EA5E9',
              color: '#fff',
              fontSize: '0.6rem',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '6px',
              letterSpacing: '0.5px',
            }}>AUTO</span>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0C4A6E' }}>Localisation administrative</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div style={{ background: '#fff', border: '1px solid #E0F2FE', borderRadius: '10px', padding: '8px 10px' }}>
              <div style={{ fontSize: '0.6rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 700 }}>District</div>
              <div style={{ fontSize: '0.78rem', color: '#0C4A6E', fontWeight: 700, marginTop: '2px' }}>
                {selectedDistrict?.nom || (String(data.districtAutre || '').trim() || '-')}
              </div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #E0F2FE', borderRadius: '10px', padding: '8px 10px' }}>
              <div style={{ fontSize: '0.6rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 700 }}>Région</div>
              <div style={{ fontSize: '0.78rem', color: '#0C4A6E', fontWeight: 700, marginTop: '2px' }}>
                {regions.find((r) => r.id === data.regionId)?.nom || (String(data.regionAutre || '').trim() || '-')}
              </div>
            </div>
            <div style={{ background: '#fff', border: '1px solid #E0F2FE', borderRadius: '10px', padding: '8px 10px' }}>
              <div style={{ fontSize: '0.6rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 700 }}>Département</div>
              <div style={{ fontSize: '0.78rem', color: '#0C4A6E', fontWeight: 700, marginTop: '2px' }}>
                {departements.find((d) => d.id === data.departementId)?.nom || (String(data.departementAutre || '').trim() || '-')}
              </div>
            </div>
            {(data.communeAutre || selectedCommune?.nom) && (
              <div style={{ background: '#fff', border: '1px solid #E0F2FE', borderRadius: '10px', padding: '8px 10px' }}>
                <div style={{ fontSize: '0.6rem', color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.4px', fontWeight: 700 }}>Commune</div>
                <div style={{ fontSize: '0.78rem', color: '#0C4A6E', fontWeight: 700, marginTop: '2px' }}>
                  {selectedCommune?.nom || data.communeAutre || '-'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {hasAutoSummary && (
        <button
          type="button"
          onClick={() => setShowCascadeManuelle((prev) => !prev)}
          aria-expanded={showCascadeManuelle}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#0EA5E9',
            fontSize: '0.78rem',
            fontWeight: 600,
            textDecoration: 'underline',
            cursor: 'pointer',
            padding: '8px 12px',
            fontFamily: 'inherit',
            display: 'block',
            margin: '8px auto 0 auto',
            minHeight: '44px',
          }}
        >
          {showCascadeManuelle ? 'Masquer la correction manuelle' : 'Corriger manuellement'}
        </button>
      )}

      <AnimatePresence>
        {cascadeVisible && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: 'hidden' }}
          >
      <Field label="District" required error={errors.districtId}>
        <BigSelect
          value={districtSel}
          onChange={(v) => {
            if (v === ADMIN_AUTRE) {
              setPickDistrictOther(true);
              setField('districtId', '');
              setField('districtAutre', '');
              clearBelowDistrict();
            } else if (v) {
              setPickDistrictOther(false);
              setField('districtId', v);
              setField('districtAutre', '');
              clearBelowDistrict();
            }
          }}
          options={[...districts.map((d) => ({ value: d.id, label: d.nom })), { value: ADMIN_AUTRE, label: 'Autre' }]}
          placeholder="Choisir le district"
          color={color}
        />
        {pickDistrictOther && (
          <div style={{ marginTop: '10px' }}>
            <BigInput
              value={data.districtAutre}
              onChange={(v) => setField('districtAutre', v)}
              placeholder="Préciser le district"
              color={color}
            />
          </div>
        )}
      </Field>

      {hasDistrict && (
        <Field label="Région" required error={errors.regionId}>
          <BigSelect
            value={regionSel}
            onChange={(v) => {
              if (v === ADMIN_AUTRE) {
                setPickRegionOther(true);
                setField('regionId', '');
                setField('regionAutre', '');
                clearBelowRegion();
              } else if (v) {
                setPickRegionOther(false);
                setField('regionId', v);
                setField('regionAutre', '');
                clearBelowRegion();
              }
            }}
            options={[...regions.map((r) => ({ value: r.id, label: r.nom })), { value: ADMIN_AUTRE, label: 'Autre' }]}
            placeholder="Choisir la région"
            color={color}
          />
          {pickRegionOther && (
            <div style={{ marginTop: '10px' }}>
              <BigInput
                value={data.regionAutre}
                onChange={(v) => setField('regionAutre', v)}
                placeholder="Préciser la région"
                color={color}
              />
            </div>
          )}
        </Field>
      )}

      {hasRegion && (
        <Field label="Département" required error={errors.departementId}>
          <BigSelect
            value={departementSel}
            onChange={(v) => {
              if (v === ADMIN_AUTRE) {
                setPickDepartementOther(true);
                setField('departementId', '');
                setField('departementAutre', '');
                clearBelowDepartement();
              } else if (v) {
                setPickDepartementOther(false);
                setField('departementId', v);
                setField('departementAutre', '');
                clearBelowDepartement();
              }
            }}
            options={[...departements.map((d) => ({ value: d.id, label: d.nom })), { value: ADMIN_AUTRE, label: 'Autre' }]}
            placeholder="Choisir le département"
            color={color}
          />
          {pickDepartementOther && (
            <div style={{ marginTop: '10px' }}>
              <BigInput
                value={data.departementAutre}
                onChange={(v) => setField('departementAutre', v)}
                placeholder="Préciser le département"
                color={color}
              />
            </div>
          )}
        </Field>
      )}
          </motion.div>
        )}
      </AnimatePresence>

      {hasDepartement && isAbidjan && (!selectedCommune || showCascadeManuelle) && (
        <Field label="Commune" required error={errors.communeId}>
          <BigSelect
            value={communeSel}
            onChange={(v) => {
              if (v === ADMIN_AUTRE) {
                setPickCommuneOther(true);
                setField('communeId', '');
                setField('communeAutre', '');
              } else if (v) {
                setPickCommuneOther(false);
                setField('communeId', v);
                setField('communeAutre', '');
              }
            }}
            options={[...bdCommunes.map((c) => ({ value: c.id, label: c.nom })), { value: ADMIN_AUTRE, label: 'Autre' }]}
            placeholder="Choisir la commune"
            color={color}
          />
          {pickCommuneOther && (
            <div style={{ marginTop: '10px' }}>
              <BigInput
                value={data.communeAutre}
                onChange={(v) => setField('communeAutre', v)}
                placeholder="Préciser la commune"
                color={color}
              />
            </div>
          )}
        </Field>
      )}

      {hasDepartement && !isAbidjan && (
        <Field label="Quartier / Village" error={errors.quartierVillage}>
          <BigInput
            value={data.quartierVillage}
            onChange={(v) => setField('quartierVillage', v)}
            placeholder="Ex : 2 Plateaux, village Tiébissou"
            color={color}
          />
        </Field>
      )}

      {data.zoneNom && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: color + '15', color }}
          role="status"
          aria-live="polite"
        >
          {prefersReducedMotion ? (
            <div style={{ display: 'flex' }} aria-hidden="true">
              <MapPin className="w-4 h-4" />
            </div>
          ) : (
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ display: 'flex' }}
              aria-hidden="true"
            >
              <MapPin className="w-4 h-4" />
            </motion.div>
          )}
          Zone assignée : {data.zoneNom}
        </div>
      )}

      {profil === 'marchand' && (
        <>
          <Field label="Marché" required error={errors.marche}>
            <MarcheSelect
              commune={data.commune || ''}
              value={data.marche}
              onChange={(v) => setField('marche', v)}
              color={color}
              error={errors.marche}
            />
          </Field>

          <Field label="Sous-profil marchand" required error={errors.sousProfilMarchand}>
            <BigSelect
              value={data.sousProfilMarchand}
              onChange={(v) => setField('sousProfilMarchand', v)}
              options={SOUS_PROFILS_MARCHAND}
              placeholder="Choisir le sous-profil marchand"
              color={color}
            />
          </Field>

          <Field label="Type de point de vente" required error={errors.typePointVente}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {TYPES_POINT_VENTE.map((tpv) => {
                const Icon = tpv.icon;
                const active = data.typePointVente === tpv.value;
                return (
                  <motion.button
                    key={tpv.value}
                    type="button"
                    onClick={() => {
                      setField('typePointVente', tpv.value);
                      if (tpv.value !== 'autre') setField('typePointVenteAutre', '');
                    }}
                    whileTap={{ scale: 0.97 }}
                    aria-pressed={active}
                    style={{
                      padding: '14px 12px',
                      background: active ? '#FFEEDD' : '#fff',
                      border: `1.5px solid ${active ? color : '#E5E0D8'}`,
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      color: active ? color : '#555',
                      fontWeight: active ? 700 : 500,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease',
                      fontFamily: 'inherit',
                      minHeight: '44px',
                    }}
                  >
                    {active && !prefersReducedMotion ? (
                      <motion.div
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ display: 'flex' }}
                        aria-hidden="true"
                      >
                        <Icon className="w-5 h-5" />
                      </motion.div>
                    ) : (
                      <div style={{ display: 'flex' }} aria-hidden="true">
                        <Icon className="w-5 h-5" />
                      </div>
                    )}
                    {tpv.label}
                  </motion.button>
                );
              })}
            </div>
            <AnimatePresence>
              {data.typePointVente === 'autre' && (
                <motion.div
                  key="tpv-autre"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  style={{ marginTop: '12px', overflow: 'hidden' }}
                >
                  <BigInput
                    value={data.typePointVenteAutre}
                    onChange={(v) => setField('typePointVenteAutre', v)}
                    placeholder="Préciser le type de point de vente"
                    color={color}
                  />
                  {errors.typePointVenteAutre && <ErrMsg msg={errors.typePointVenteAutre} />}
                </motion.div>
              )}
            </AnimatePresence>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Emplacement / Secteur" optional error={errors.emplacement}>
              <BigInput value={data.emplacement} onChange={(v) => setField('emplacement', v)} placeholder="Secteur A" color={color} />
            </Field>
            <Field label="Allée / Rangée" optional error={errors.sousPrefecture}>
              <BigInput value={data.sousPrefecture} onChange={(v) => setField('sousPrefecture', v)} placeholder="Allée 3" color={color} />
            </Field>
          </div>
        </>
      )}

      {profil === 'producteur' && (
        <>
          <Field label="Village / Zone" required error={errors.village}>
            <BigInput value={data.village} onChange={(v) => setField('village', v)} placeholder="Village de Tiébissou" color={color} />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Région" error={errors.region}>
              <BigSelect value={data.region} onChange={(v) => setField('region', v)} options={REGIONS_CI} placeholder="Choisir la région" color={color} />
            </Field>
            <Field label="Sous-préfecture" error={errors.sousPrefecture}>
              <BigInput value={data.sousPrefecture} onChange={(v) => setField('sousPrefecture', v)} placeholder="Tiébissou" color={color} />
            </Field>
          </div>
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   STEP CONTENT
══════════════════════════════════════════════════════ */
function StepContent({
  stepId, profil, data, setField, setErrors, errors, cfg,
  getZonesByRegion,
  signatureCanvasRef, openCamera, openGallery, isDrawing,
  startDrawing, draw, stopDrawing, clearSignature,
  handlePhoto, handleGPS, gpsCapturing, handleTelChange, verificationTel,
  step, setStep, setDirection, completedSteps,
  signatureMode, setSignatureMode,
  skipPinCheck,
}: {
  stepId: string; profil: ProfilType; data: any; setField: (f: string, v: any) => void;
  setErrors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  errors: Record<string, string>; cfg: ProfileConfig;
  getZonesByRegion: (region: string) => Zone[];
  signatureCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  openCamera: () => void;
  openGallery: () => void;
  isDrawing: boolean; startDrawing: any; draw: any; stopDrawing: any; clearSignature: () => void;
  handlePhoto: any; handleGPS: () => void; gpsCapturing: boolean;
  handleTelChange: (v: string) => void;
  verificationTel: 'idle' | 'checking' | 'exists' | 'available';
  step: number;
  setStep: React.Dispatch<React.SetStateAction<number>>;
  setDirection: React.Dispatch<React.SetStateAction<number>>;
  completedSteps: Set<number>;
  signatureMode: 'tactile' | 'clavier';
  setSignatureMode: React.Dispatch<React.SetStateAction<'tactile' | 'clavier'>>;
  skipPinCheck: boolean;
}) {
  const { cooperatives: cooperativesListe } = useCooperativesListe();
  const color = cfg.color;
  const villesDisponibles = data.region ? getZonesByRegion(data.region).map((z) => z.nom) : [];
  const codePinRefs = React.useRef<(HTMLInputElement | null)[]>([null, null, null, null]);

  const prefersReducedMotion = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── PHOTO ── */
  if (stepId === 'photo') {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div
            style={{
              width: '42px', height: '42px',
              background: '#FFEEDD', borderRadius: '13px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            {prefersReducedMotion ? (
              <div style={{ display: 'flex' }}>
                <Camera className="w-5 h-5" style={{ color }} />
              </div>
            ) : (
              <motion.div
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ display: 'flex' }}
              >
                <Camera className="w-5 h-5" style={{ color }} />
              </motion.div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 }}>
              {profil === 'cooperative' ? 'Photo du dirigeant' : 'Photo d\u2019identité'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '2px' }}>
              Visage clair, bien centré
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-4 mt-2">
          <AnimatePresence mode="wait">
            {data.photo ? (
              <motion.div
                key="has-photo"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="relative"
              >
                <img
                  src={data.photo}
                  alt={profil === 'cooperative' ? 'Photo du dirigeant chargée' : 'Photo d\u2019identité chargée'}
                  className="object-cover border-4"
                  style={{
                    width: '200px',
                    height: '240px',
                    borderRadius: '100px',
                    borderColor: color,
                  }}
                />
                {prefersReducedMotion ? (
                  <div
                    className="absolute -top-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: color }}
                    aria-hidden="true"
                  >
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <motion.div
                    className="absolute -top-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: color }}
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    aria-hidden="true"
                  >
                    <CheckCircle className="w-5 h-5 text-white" />
                  </motion.div>
                )}
                <motion.button
                  type="button"
                  onClick={() => setField('photo', null)}
                  whileTap={{ scale: 0.9 }}
                  className="absolute -bottom-3 -right-3 w-11 h-11 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg"
                  aria-label="Supprimer la photo"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="no-photo"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                style={{
                  width: '200px',
                  height: '240px',
                  border: `2.5px dashed ${color}60`,
                  borderRadius: '100px',
                  background: '#FDF7F1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                aria-hidden="true"
              >
                {!prefersReducedMotion && (
                  <motion.div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background: `radial-gradient(ellipse at center, ${color}15 0%, transparent 70%)`,
                    }}
                    animate={{ opacity: [0.4, 0.8, 0.4], scale: [1, 1.05, 1] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                  />
                )}
                <svg
                  width="120"
                  height="150"
                  viewBox="0 0 120 150"
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ opacity: 0.5 }}
                  aria-hidden="true"
                >
                  <circle cx="60" cy="50" r="28" strokeDasharray="4 4" />
                  <path d="M20 145 Q20 95 60 95 Q100 95 100 145" strokeDasharray="4 4" />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '8px',
            width: '100%',
            marginTop: '4px',
          }}>
            {PHOTO_QUALITY_HINTS.map((hint, hintIndex) => {
              const Icon = hint.icon;
              return (
                <div
                  key={hint.id}
                  style={{
                    background: '#FAF7F1',
                    border: '1px solid #EAE3D7',
                    borderRadius: '12px',
                    padding: '10px 6px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '5px',
                    textAlign: 'center',
                  }}
                >
                  {prefersReducedMotion ? (
                    <div style={{ display: 'flex' }} aria-hidden="true">
                      <Icon className="w-5 h-5" style={{ color }} />
                    </div>
                  ) : (
                    <motion.div
                      animate={{ y: [0, -2, 0] }}
                      transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: hintIndex * 0.3 }}
                      style={{ display: 'flex' }}
                      aria-hidden="true"
                    >
                      <Icon className="w-5 h-5" style={{ color }} />
                    </motion.div>
                  )}
                  <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#555', lineHeight: 1.2 }}>
                    {hint.label}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
            <motion.button
              type="button"
              onClick={openCamera}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              style={{
                width: '100%',
                padding: '14px 16px',
                background: `linear-gradient(135deg, ${color} 0%, ${color}DD 100%)`,
                border: 0,
                borderRadius: '14px',
                color: '#fff',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: `0 3px 10px ${color}50`,
                fontFamily: 'inherit',
                minHeight: '44px',
              }}
            >
              {prefersReducedMotion ? (
                <div style={{ display: 'flex' }} aria-hidden="true">
                  <Camera className="w-5 h-5" />
                </div>
              ) : (
                <motion.div
                  animate={{ scale: [1, 1.06, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ display: 'flex' }}
                  aria-hidden="true"
                >
                  <Camera className="w-5 h-5" />
                </motion.div>
              )}
              Prendre la photo
            </motion.button>
            <motion.button
              type="button"
              onClick={openGallery}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: '#fff',
                border: '1.5px solid #E5E0D8',
                borderRadius: '12px',
                color: '#888',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontFamily: 'inherit',
                minHeight: '44px',
              }}
            >
              {prefersReducedMotion ? (
                <div style={{ display: 'flex' }} aria-hidden="true">
                  <Upload className="w-4 h-4" />
                </div>
              ) : (
                <motion.div
                  animate={{ y: [0, -1.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{ display: 'flex' }}
                  aria-hidden="true"
                >
                  <Upload className="w-4 h-4" />
                </motion.div>
              )}
              Importer depuis la galerie
            </motion.button>
          </div>
        </div>
        {errors.photo && <ErrMsg msg={errors.photo} />}
      </div>
    );
  }

  /* ── IDENTITÉ ── */

  /* ── DOCUMENTS (NNI / CNI / CNPS / CMU) ── */
  if (stepId === 'documents') {
    return <DocumentsStep data={data} setField={setField} errors={errors} cfg={cfg} />;
  }

  if (stepId === 'identite') {
    return (
      <div className="space-y-5">
        <SectionHeader icon={User} label="Identité de la personne" color={color} lightColor={cfg.lightColor} />

        <div style={{
          fontSize: '0.85rem',
          color: '#888',
          padding: '0 4px',
          marginBottom: '8px',
          marginTop: '-8px',
        }}>
          Les champs marqués <span style={{ color: '#E24B4A', fontWeight: 700 }}>*</span> sont obligatoires
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nom de famille" required error={errors.nom}>
            <BigInput value={data.nom} onChange={(v) => setField('nom', v)} placeholder="KOUASSI" color={color} />
          </Field>
          <Field label="Prénoms" required error={errors.prenoms}>
            <BigInput value={data.prenoms} onChange={(v) => setField('prenoms', v)} placeholder="Aminata" color={color} />
          </Field>
        </div>

        <Field label="Genre" required error={errors.genre}>
          <GenreSelector value={data.genre} onChange={(v) => setField('genre', v)} color={color} />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Date de naissance" required error={errors.dateNaissance}>
            <BigInput type="date" value={data.dateNaissance} onChange={(v) => setField('dateNaissance', v)} max={todayISO} color={color} />
          </Field>
          <Field label="Lieu de naissance" required error={errors.lieuNaissance}>
            <BigInput value={data.lieuNaissance} onChange={(v) => setField('lieuNaissance', v)} placeholder={`Ex${'\u202f'}: Bouaké`} color={color} />
          </Field>
        </div>

        <Field label="Nationalité" required error={errors.nationalite}>
          <BigSelect value={data.nationalite} onChange={(v) => setField('nationalite', v)} options={PAYS_AFRIQUE} placeholder="Choisir la nationalité" color={color} />
        </Field>

        <Field label="Catégorie" required error={errors.categorie}>
          <BigSelect value={data.categorie} onChange={(v) => setField('categorie', v)} options={CATEGORIES_ACTEUR} placeholder="Choisir" color={color} />
        </Field>

        <details style={{
          border: '1.5px dashed #D9D2C7',
          borderRadius: '14px',
          background: '#FAF7F1',
          marginTop: '8px',
          overflow: 'hidden',
        }}>
          <summary style={{
            padding: '14px 16px',
            cursor: 'pointer',
            listStyle: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            userSelect: 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '30px', height: '30px',
                  background: '#EEEAE3',
                  borderRadius: '9px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                aria-hidden="true"
              >
                <FileText className="w-3.5 h-3.5" style={{ color: '#9F8170' }} />
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#555' }}>Informations complémentaires</div>
                <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '1px' }}>{`Optionnel${'\u202f'}: récépissé, BP, statut, situation`}</div>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5" style={{ color: '#9F8170', transition: 'transform 0.2s' }} aria-hidden="true" />
          </summary>
          <div style={{ padding: '6px 16px 18px 16px', borderTop: '1px solid #EAE3D7' }}>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" style={{ marginTop: '14px' }}>
              <Field label="Numéro de récépissé">
                <BigInput value={data.recepisse} onChange={(v) => setField('recepisse', v)} placeholder="REC-2024-00123" color={color} />
              </Field>
              <Field label="Boîte postale">
                <BigInput value={data.boitePostale} onChange={(v) => setField('boitePostale', v)} placeholder="BP 1234 Abidjan" color={color} />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Statut entrepreneur">
                <BigSelect value={data.statutEntrepreneur} onChange={(v) => setField('statutEntrepreneur', v)} options={STATUTS_ENTREPRENEUR} placeholder="Choisir" color={color} />
              </Field>
              <Field label="Situation matrimoniale">
                <BigSelect value={data.situationMatrimoniale} onChange={(v) => setField('situationMatrimoniale', v)} options={SITUATIONS_MATRIMONIALES} placeholder="Choisir" color={color} />
              </Field>
            </div>

            <Field label="Niveau d'études">
              <BigSelect
                value={data.niveauEtudes || ''}
                onChange={(v) => setField('niveauEtudes', v)}
                options={NIVEAUX_ETUDES}
                placeholder="Choisir le niveau d'études"
                color={color}
              />
            </Field>

          </div>
        </details>

      </div>
    );
  }

  /* ── DIRIGEANT (Coopérative) ── */
  if (stepId === 'dirigeant') {
    return (
      <div className="space-y-5">
        <SectionHeader icon={User} label="Identité du dirigeant" color={color} lightColor={cfg.lightColor} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Nom de famille" required error={errors.nom}>
            <BigInput value={data.nom} onChange={(v) => setField('nom', v)} placeholder="KOUAMÉ" color={color} />
          </Field>
          <Field label="Prénoms" required error={errors.prenoms}>
            <BigInput value={data.prenoms} onChange={(v) => setField('prenoms', v)} placeholder="Jean-Paul" color={color} />
          </Field>
        </div>
        <Field label="Fonction dans la coopérative" required error={errors.fonctionDirigeant}>
          <BigSelect
            value={data.fonctionDirigeant}
            onChange={(v) => setField('fonctionDirigeant', v)}
            options={FONCTIONS_DIRIGEANT_COOP}
            placeholder="Choisir la fonction"
            color={color}
          />
        </Field>
        <Field label="Genre" error={errors.genre}>
          <GenreSelector value={data.genre} onChange={(v) => setField('genre', v)} color={color} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Date de naissance" error={errors.dateNaissance}>
            <BigInput type="date" value={data.dateNaissance} onChange={(v) => setField('dateNaissance', v)} max={todayISO} color={color} />
          </Field>
          <Field label="Lieu de naissance" error={errors.lieuNaissance}>
            <BigInput value={data.lieuNaissance} onChange={(v) => setField('lieuNaissance', v)} placeholder="Bouaké" color={color} />
          </Field>
        </div>
        <Field label="NIN / CNI du dirigeant" error={errors.nin}>
          <BigInput value={data.nin} onChange={(v) => setField('nin', v)} placeholder="CI2024XXXXXXXX" color={color} />
        </Field>
      </div>
    );
  }

  /* ── INFOS COOPÉRATIVE ── */
  if (stepId === 'cooperative') {
    return (
      <div className="space-y-5">
        <SectionHeader icon={Building2} label="Informations de la coopérative" color={color} lightColor={cfg.lightColor} />
        <Field label="Nom de la coopérative" required error={errors.nomCooperative}>
          <BigInput value={data.nomCooperative} onChange={(v) => setField('nomCooperative', v)} placeholder="Coopérative des Femmes de Daloa" color={color} />
        </Field>
        <Field label="Statut juridique" error={errors.statutJuridique}>
          <BigSelect value={data.statutJuridique} onChange={(v) => setField('statutJuridique', v)} options={STATUTS_JURIDIQUES} placeholder="Choisir le statut" color={color} />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="N° Récépissé" error={errors.numeroRecepisse}>
            <BigInput value={data.numeroRecepisse} onChange={(v) => setField('numeroRecepisse', v)} placeholder="2024/REC/XXXX" color={color} />
          </Field>
          <Field label="Date de création" error={errors.dateCreation}>
            <BigInput type="date" value={data.dateCreation} onChange={(v) => setField('dateCreation', v)} max={todayISO} color={color} />
          </Field>
        </div>
        <Field label="Nombre de membres" required error={errors.nombreMembres}>
          <BigInput type="number" min={0} value={data.nombreMembres} onChange={(v) => setField('nombreMembres', v)} placeholder={`Ex${'\u202f'}: 45`} inputMode="numeric" color={color} />
        </Field>
      </div>
    );
  }

  /* ── CONTACT ── */
  if (stepId === 'contact') {
    return (
      <div className="space-y-5">
        <SectionHeader icon={Phone} label="Coordonnées de contact" color={color} lightColor={cfg.lightColor} />
        <Field label="Numéro de téléphone" required error={errors.telephone}>
          <div className="relative">
            <BigInput
              value={data.telephone}
              onChange={handleTelChange}
              placeholder="0701020304"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              color={color}
            />
            <div className="absolute right-5 top-1/2 -translate-y-1/2" role="status" aria-live="polite">
              {verificationTel === 'checking' && (
                <div
                  className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: color }}
                  aria-label="Vérification du numéro en cours"
                />
              )}
              {verificationTel === 'exists' && (
                <AlertCircle className="w-7 h-7 text-red-500" aria-hidden="true" />
              )}
              {verificationTel === 'available' && (
                prefersReducedMotion ? (
                  <div aria-hidden="true">
                    <CheckCircle2 className="w-7 h-7 text-green-500" />
                  </div>
                ) : (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring' }}
                    aria-hidden="true"
                  >
                    <CheckCircle2 className="w-7 h-7 text-green-500" />
                  </motion.div>
                )
              )}
            </div>
          </div>
          {verificationTel === 'available' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-green-600 mt-2 flex items-center gap-2"
              style={{ fontSize: '0.92rem', fontWeight: 600 }}
              role="status"
              aria-live="polite"
            >
              <CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Numéro disponible
            </motion.p>
          )}
          {verificationTel === 'exists' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-600 mt-2 flex items-center gap-2 font-bold"
              style={{ fontSize: '0.92rem' }}
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="w-4 h-4" aria-hidden="true" /> Ce numéro est déjà utilisé par un autre acteur
            </motion.p>
          )}
        </Field>
        <Field label="Email (optionnel)" error={errors.email}>
          <BigInput type="email" autoComplete="email" value={data.email} onChange={(v) => setField('email', v)} placeholder="exemple@mail.com" color={color} />
        </Field>
        {profil === 'cooperative' && (
          <Field label="Adresse du siège" error={errors.adresseSiege}>
            <BigInput value={data.adresseSiege} onChange={(v) => setField('adresseSiege', v)} placeholder="Rue, quartier, numéro..." color={color} />
          </Field>
        )}
      </div>
    );
  }

  /* ── LIEU ── */
  if (stepId === 'lieu') {
    return (
      <LieuStep
        profil={profil}
        data={data}
        setField={setField}
        errors={errors}
        color={color}
        handleGPS={handleGPS}
        gpsCapturing={gpsCapturing}
        onSkipGps={() => {
          setField('gps', null);
          setErrors((prev) => {
            const n = { ...prev };
            delete n.gps;
            return n;
          });
        }}
      />
    );
  }

  /* ── LOCALISATION (Coopérative) ── */
  if (stepId === 'localisation') {
    return (
      <div className="space-y-5">
        <SectionHeader icon={MapPin} label="Localisation du siège" color={color} lightColor={cfg.lightColor} />
        <Field label="Commune" required error={errors.commune}>
          <BigSelect value={data.commune} onChange={(v) => setField('commune', v)} options={COMMUNES_CI} placeholder="Choisir la commune" color={color} />
        </Field>
        <Field label="Région" required error={errors.region}>
          <BigSelect
            value={data.region}
            onChange={(v) => {
              setField('region', v);
              setField('ville', '');
            }}
            options={REGIONS_CI}
            placeholder="Choisir la région"
            color={color}
          />
        </Field>
        <Field label="Ville" required error={errors.ville}>
          <BigSelect
            value={data.ville}
            onChange={(v) => setField('ville', v)}
            options={villesDisponibles}
            disabled={!data.region}
            placeholder={data.region ? 'Choisir la ville' : 'Choisir la région d\u2019abord'}
            color={color}
          />
        </Field>
        <Field label={'Zones d\u2019intervention'} error={errors.zoneCouverte}>
          <BigInput value={data.zoneCouverte} onChange={(v) => setField('zoneCouverte', v)} placeholder={`Ex${'\u202f'}: Daloa, Vavoua, Issia`} color={color} rows={3} />
        </Field>
      </div>
    );
  }

  /* ── ACTIVITÉ ── */
  if (stepId === 'activite') {
    if (profil === 'marchand') return (
      <div className="space-y-5">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div
            style={{
              width: '42px', height: '42px',
              background: '#FFEEDD', borderRadius: '13px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            {prefersReducedMotion ? (
              <div style={{ display: 'flex' }}>
                <ShoppingBag className="w-5 h-5" style={{ color }} />
              </div>
            ) : (
              <motion.div
                animate={{ y: [0, -2, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ display: 'flex' }}
              >
                <ShoppingBag className="w-5 h-5" style={{ color }} />
              </motion.div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 }}>Activité commerciale</div>
            <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '2px' }}>Ce que tu vends et comment</div>
          </div>
        </div>

        {/* Niveau 1 — Catégories principales ANSUT */}
        <Field label="Activité principale" required error={errors.categorieActivite}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {CATEGORIES_PRINCIPALES.map((cat) => {
              const active = data.categorieActivite === cat.value;
              return (
                <motion.button
                  key={cat.value}
                  type="button"
                  onClick={() => {
                    setField('categorieActivite', cat.value);
                    setField('sousCategorie', '');
                    setField('produitsVendusMultiple', []);
                    setField('autreActivite', '');
                    setField('produitsVendus', '');
                  }}
                  whileTap={{ scale: 0.97 }}
                  aria-pressed={active}
                  style={{
                    padding: '12px 8px',
                    background: active ? `${color}1A` : '#fff',
                    border: `1.5px solid ${active ? color : '#E5E0D8'}`,
                    borderRadius: '12px',
                    fontSize: '0.82rem',
                    color: active ? color : '#555',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    fontFamily: 'inherit',
                    minHeight: '56px',
                  }}
                >
                  <i className={`ti ${cat.icon}`} style={{ fontSize: '20px' }} aria-hidden="true" />
                  {cat.value}
                </motion.button>
              );
            })}
            <motion.button
              type="button"
              onClick={() => {
                setField('categorieActivite', 'Autre');
                setField('sousCategorie', '');
                setField('produitsVendusMultiple', []);
                setField('autreActivite', '');
                setField('produitsVendus', '');
              }}
              whileTap={{ scale: 0.97 }}
              aria-pressed={data.categorieActivite === 'Autre'}
              style={{
                padding: '12px 8px',
                background: data.categorieActivite === 'Autre' ? `${color}1A` : '#fff',
                border: `1.5px solid ${data.categorieActivite === 'Autre' ? color : '#E5E0D8'}`,
                borderRadius: '12px',
                fontSize: '0.82rem',
                color: data.categorieActivite === 'Autre' ? color : '#555',
                fontWeight: data.categorieActivite === 'Autre' ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontFamily: 'inherit',
                minHeight: '56px',
                gridColumn: '1 / -1',
              }}
            >
              <i className="ti ti-dots-circle-horizontal" style={{ fontSize: '20px' }} aria-hidden="true" />
              Autre
            </motion.button>
          </div>
        </Field>

        <AnimatePresence>
          {data.categorieActivite === 'Autre' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden' }}
            >
              <Field label="Sous-catégorie" required error={errors.sousCategorie}>
                <motion.div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {SOUS_CATEGORIES.map((sub) => {
                    const active = data.sousCategorie === sub.value;
                    return (
                      <motion.button
                        key={sub.value}
                        type="button"
                        onClick={() => {
                          setField('sousCategorie', sub.value);
                          setField('produitsVendusMultiple', []);
                          setField('autreActivite', '');
                        }}
                        whileTap={{ scale: 0.97 }}
                        aria-pressed={active}
                        style={{
                          padding: '10px 8px',
                          background: active ? `${color}1A` : '#fff',
                          border: `1.5px solid ${active ? color : '#E5E0D8'}`,
                          borderRadius: '10px',
                          fontSize: '0.78rem',
                          color: active ? color : '#555',
                          fontWeight: active ? 700 : 500,
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          fontFamily: 'inherit',
                          minHeight: '48px',
                        }}
                      >
                        <i className={`ti ${sub.icon}`} style={{ fontSize: '16px' }} aria-hidden="true" />
                        {sub.value}
                      </motion.button>
                    );
                  })}
                </motion.div>
              </Field>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {(data.categorieActivite && data.categorieActivite !== 'Autre') ||
           (data.categorieActivite === 'Autre' && data.sousCategorie) ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden' }}
            >
              <Field label="Détails supplémentaires" required error={errors.produitsVendusMultiple}>
                <motion.div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {(PRODUITS_PAR_CATEGORIE[
                    data.categorieActivite !== 'Autre'
                      ? data.categorieActivite
                      : data.sousCategorie
                  ] || []).map((produit) => {
                    const active = (data.produitsVendusMultiple as string[]).includes(produit);
                    return (
                      <motion.button
                        key={produit}
                        type="button"
                        onClick={() => {
                          const current = Array.isArray(data.produitsVendusMultiple)
                            ? (data.produitsVendusMultiple as string[])
                            : [];
                          const next = current.includes(produit)
                            ? current.filter(p => p !== produit)
                            : [...current, produit];
                          setField('produitsVendusMultiple', next);
                          setField('produitsVendus', next.join(', '));
                        }}
                        whileTap={{ scale: 0.95 }}
                        aria-pressed={active}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '20px',
                          border: `1.5px solid ${active ? color : '#E5E0D8'}`,
                          background: active ? color : '#fff',
                          color: active ? '#fff' : '#555',
                          fontSize: '0.82rem',
                          fontWeight: active ? 500 : 400,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontFamily: 'inherit',
                        }}
                      >
                        {active && (
                          <i className="ti ti-check" style={{ fontSize: '12px' }} aria-hidden="true" />
                        )}
                        {produit}
                      </motion.button>
                    );
                  })}
                  <motion.button
                    type="button"
                    onClick={() => {
                      const hasAutre = (data.produitsVendusMultiple as string[]).includes('__autre__');
                      const next = hasAutre
                        ? (data.produitsVendusMultiple as string[]).filter(p => p !== '__autre__')
                        : [...(data.produitsVendusMultiple as string[]), '__autre__'];
                      setField('produitsVendusMultiple', next);
                      if (hasAutre) setField('autreActivite', '');
                    }}
                    whileTap={{ scale: 0.95 }}
                    aria-pressed={(data.produitsVendusMultiple as string[]).includes('__autre__')}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '20px',
                      border: `1.5px solid ${(data.produitsVendusMultiple as string[]).includes('__autre__') ? color : '#E5E0D8'}`,
                      background: (data.produitsVendusMultiple as string[]).includes('__autre__') ? color : 'var(--color-background-secondary, #F3F4F6)',
                      color: (data.produitsVendusMultiple as string[]).includes('__autre__') ? '#fff' : '#555',
                      fontSize: '0.82rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontFamily: 'inherit',
                    }}
                  >
                    <i className="ti ti-plus" style={{ fontSize: '12px' }} aria-hidden="true" />
                    Autre (à préciser)
                  </motion.button>
                </motion.div>
              </Field>

              <AnimatePresence>
                {(data.produitsVendusMultiple as string[]).includes('__autre__') && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden', marginTop: '10px' }}
                  >
                    <BigInput
                      value={data.autreActivite || ''}
                      onChange={(v) => {
                        setField('autreActivite', v);
                        const current = (data.produitsVendusMultiple as string[]).filter(p => p !== '__autre__');
                        setField('produitsVendus', [...current, v].filter(Boolean).join(', '));
                      }}
                      placeholder="Ex : Vente de kinkeliba, huile artisanale…"
                      color={color}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <Field label="Détails supplémentaires" optional>
          <BigInput value={data.typeActivite || ''} onChange={(v) => setField('typeActivite', v)} placeholder={`Ex${'\u202f'}: sp\u00e9cialit\u00e9 locale, produit import\u00e9\u2026`} color={color} rows={2} />
        </Field>

        <Field label="Type de commerce" optional error={errors.typeCommerce}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {TYPES_COMMERCE.map((tc, idx) => {
              const Icon = tc.icon;
              const tcArr: string[] = Array.isArray(data.typeCommerce) ? (data.typeCommerce as string[]) : [];
              const active = tcArr.includes(tc.value);
              const isLast = idx === TYPES_COMMERCE.length - 1;
              return (
                <motion.button
                  key={tc.value}
                  type="button"
                  onClick={() => {
                    const current: string[] = Array.isArray(data.typeCommerce) ? (data.typeCommerce as string[]) : [];
                    const next = current.includes(tc.value)
                      ? current.filter((v) => v !== tc.value)
                      : [...current, tc.value];
                    setField('typeCommerce', next);
                  }}
                  whileTap={{ scale: 0.96 }}
                  aria-pressed={active}
                  style={{
                    padding: '14px 10px',
                    background: active ? '#FFEEDD' : '#fff',
                    border: `1.5px solid ${active ? color : '#E5E0D8'}`,
                    borderRadius: '12px',
                    fontSize: '0.82rem',
                    color: active ? color : '#555',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    transition: 'all 0.15s ease',
                    fontFamily: 'inherit',
                    gridColumn: isLast && TYPES_COMMERCE.length % 2 !== 0 ? '1 / -1' : 'auto',
                    minHeight: '44px',
                  }}
                >
                  {active && !prefersReducedMotion ? (
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                      style={{ display: 'flex' }}
                      aria-hidden="true"
                    >
                      <Icon className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <div style={{ display: 'flex' }} aria-hidden="true">
                      <Icon className="w-5 h-5" />
                    </div>
                  )}
                  {tc.label}
                </motion.button>
              );
            })}
          </div>
        </Field>

        <AnimatePresence>
          {Array.isArray(data.typeCommerce) && data.typeCommerce.includes('Autre') && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden', marginTop: '10px' }}
            >
              <BigInput
                value={data.typeCommerceAutre || ''}
                onChange={(v) => setField('typeCommerceAutre', v)}
                placeholder="Préciser le type de commerce"
                color={color}
              />
            </motion.div>
          )}
        </AnimatePresence>



        <Field label={`Ann\u00e9es d\u2019exp\u00e9rience`} optional error={errors.anneesExperience}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {ANNEES_EXPERIENCE_OPTIONS.map((opt, idx) => {
              const active = data.anneesExperience === opt;
              const isLast = idx === ANNEES_EXPERIENCE_OPTIONS.length - 1;
              return (
                <motion.button
                  key={opt}
                  type="button"
                  onClick={() => setField('anneesExperience', active ? '' : opt)}
                  whileTap={{ scale: 0.97 }}
                  aria-pressed={active}
                  style={{
                    padding: '12px 10px',
                    background: active ? color : '#fff',
                    border: `1.5px solid ${active ? color : '#E5E0D8'}`,
                    borderRadius: '11px',
                    fontSize: '0.82rem',
                    color: active ? '#fff' : '#555',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    gridColumn: isLast && ANNEES_EXPERIENCE_OPTIONS.length % 2 !== 0 ? '1 / -1' : 'auto',
                    transition: 'all 0.15s ease',
                    minHeight: '44px',
                  }}
                >
                  {opt}
                </motion.button>
              );
            })}
          </div>
        </Field>

        <Field label={`Membre d\u2019une coop\u00e9rative${'\u202f'}?`}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <motion.button
              type="button"
              onClick={() => {
                setField('estMembreCooperative', true);
              }}
              whileTap={{ scale: 0.96 }}
              aria-pressed={data.estMembreCooperative === true}
              style={{
                padding: '14px 10px',
                background: data.estMembreCooperative ? '#FFEEDD' : '#fff',
                border: `1.5px solid ${data.estMembreCooperative ? color : '#E5E0D8'}`,
                borderRadius: '12px',
                fontSize: '0.9rem',
                color: data.estMembreCooperative ? color : '#555',
                fontWeight: data.estMembreCooperative ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
                minHeight: '44px',
              }}
            >
              {data.estMembreCooperative === true && !prefersReducedMotion ? (
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  style={{ display: 'flex' }}
                  aria-hidden="true"
                >
                  <CheckCircle className="w-4 h-4" />
                </motion.div>
              ) : (
                <div style={{ display: 'flex' }} aria-hidden="true">
                  <CheckCircle className="w-4 h-4" />
                </div>
              )}
              Oui
            </motion.button>
            <motion.button
              type="button"
              onClick={() => {
                setField('estMembreCooperative', false);
                setField('nomResponsableCooperative', '');
              }}
              whileTap={{ scale: 0.96 }}
              aria-pressed={data.estMembreCooperative === false}
              style={{
                padding: '14px 10px',
                background: data.estMembreCooperative === false ? '#F1EFE8' : '#fff',
                border: `1.5px solid ${data.estMembreCooperative === false ? '#A99B8A' : '#E5E0D8'}`,
                borderRadius: '12px',
                fontSize: '0.9rem',
                color: data.estMembreCooperative === false ? '#444' : '#555',
                fontWeight: data.estMembreCooperative === false ? 700 : 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
                minHeight: '44px',
              }}
            >
              <div style={{ display: 'flex' }} aria-hidden="true">
                <X className="w-4 h-4" />
              </div>
              Non
            </motion.button>
          </div>
        </Field>

        <AnimatePresence>
          {data.estMembreCooperative && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25 }}
              style={{ overflow: 'hidden' }}
            >
              <Field label="Nom de la coopérative" optional error={errors.nomResponsableCooperative}>
                <BigSelect
                  value={data.nomResponsableCooperative}
                  onChange={(v) => {
                    const found = cooperativesListe.find(c => c.nom === v);
                    setField('nomResponsableCooperative', v);
                    if (found) {
                      setField('cooperativeId', found.id);
                      setField('cooperativeMarche', found.marche || '');
                      setField('cooperativeCommune', found.commune || '');
                      setField('cooperativeResponsable', found.responsable_nom || '');
                      setField('cooperativeFonction', found.fonction || '');
                      setField('cooperativeContact', found.contact || '');
                      if (found.commune && !data.commune) setField('commune', found.commune);
                      if (found.marche && !data.marche) setField('marche', found.marche);
                    }
                  }}
                  options={cooperativesListe.map(c => ({ value: c.nom, label: c.nom }))}
                  placeholder="Choisir une coopérative…"
                  color={color}
                />
              </Field>

              <AnimatePresence>
                {data.nomResponsableCooperative && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ overflow: 'hidden', marginTop: '10px' }}
                  >
                    <motion.div style={{
                      borderRadius: '14px',
                      border: '0.5px solid #BFDBFE',
                      overflow: 'hidden',
                    }}>
                      <motion.div style={{
                        background: '#EFF6FF',
                        padding: '10px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        borderBottom: '0.5px solid #BFDBFE',
                      }}>
                        <i className="ti ti-building-community" style={{ fontSize: '15px', color: '#2072AF' }} aria-hidden="true" />
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#2072AF' }}>
                          Informations de la coopérative
                        </span>
                        <span style={{
                          marginLeft: 'auto',
                          fontSize: '10px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: '#2072AF',
                          color: '#fff',
                          fontWeight: 600,
                        }}>
                          Auto-rempli
                        </span>
                      </motion.div>
                      <motion.div style={{ padding: '12px 14px', background: '#fff' }}>
                        <motion.div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                          {data.cooperativeMarche && (
                            <motion.div>
                              <p style={{ fontSize: '10px', color: '#9CA3AF', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Marché</p>
                              <p style={{ fontSize: '13px', fontWeight: 600, margin: 0, color: '#111827' }}>{data.cooperativeMarche}</p>
                            </motion.div>
                          )}
                          {data.cooperativeCommune && (
                            <motion.div>
                              <p style={{ fontSize: '10px', color: '#9CA3AF', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Commune</p>
                              <p style={{ fontSize: '13px', fontWeight: 600, margin: 0, color: '#111827' }}>{data.cooperativeCommune}</p>
                            </motion.div>
                          )}
                          {data.cooperativeResponsable && (
                            <motion.div>
                              <p style={{ fontSize: '10px', color: '#9CA3AF', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Responsable</p>
                              <p style={{ fontSize: '13px', fontWeight: 600, margin: 0, color: '#111827' }}>{data.cooperativeResponsable}</p>
                            </motion.div>
                          )}
                          {data.cooperativeFonction && (
                            <motion.div>
                              <p style={{ fontSize: '10px', color: '#9CA3AF', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Fonction</p>
                              <p style={{ fontSize: '13px', fontWeight: 600, margin: 0, color: '#111827' }}>{data.cooperativeFonction}</p>
                            </motion.div>
                          )}
                          {data.cooperativeContact && (
                            <motion.div style={{ gridColumn: '1 / -1' }}>
                              <p style={{ fontSize: '10px', color: '#9CA3AF', margin: '0 0 2px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Contact</p>
                              <motion.div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <i className="ti ti-phone" style={{ fontSize: '13px', color: '#2072AF' }} aria-hidden="true" />
                                <p style={{ fontSize: '13px', fontWeight: 600, margin: 0, color: '#2072AF' }}>{data.cooperativeContact}</p>
                              </motion.div>
                            </motion.div>
                          )}
                        </motion.div>
                      </motion.div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        <details style={{
          border: '1.5px dashed #D9D2C7',
          borderRadius: '14px',
          background: '#FAF7F1',
          marginTop: '8px',
          overflow: 'hidden',
        }}
        >
          <summary style={{
            padding: '14px 16px',
            cursor: 'pointer',
            listStyle: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            userSelect: 'none',
            minHeight: '44px',
          }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '30px', height: '30px',
                  background: '#EEEAE3',
                  borderRadius: '9px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
                aria-hidden="true"
              >
                {prefersReducedMotion ? (
                  <div style={{ display: 'flex' }}>
                    <FileText className="w-3.5 h-3.5" style={{ color: '#9F8170' }} />
                  </div>
                ) : (
                  <motion.div animate={{ y: [0, -1, 0] }} transition={{ duration: 2.5, repeat: Infinity }} style={{ display: 'flex' }}>
                    <FileText className="w-3.5 h-3.5" style={{ color: '#9F8170' }} />
                  </motion.div>
                )}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#555' }}>Informations complémentaires</div>
                <div style={{ fontSize: '0.7rem', color: '#999', marginTop: '1px' }}>{`Optionnel${'\u202f'}: responsable du march\u00e9`}</div>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5" style={{ color: '#9F8170', transition: 'transform 0.2s' }} aria-hidden="true" />
          </summary>
          <div style={{ padding: '6px 16px 18px 16px', borderTop: '1px solid #EAE3D7' }}>
            <Field label="Nom du responsable du marché" optional error={errors.nomResponsableMarche}>
              <BigInput value={data.nomResponsableMarche} onChange={(v) => setField('nomResponsableMarche', v)} placeholder="Nom et prénom" color={color} />
            </Field>
          </div>
        </details>

      </div>
    );

    if (profil === 'producteur') return (
      <div className="space-y-5">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div
            style={{
              width: '42px', height: '42px',
              background: '#FFEEDD', borderRadius: '13px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            {prefersReducedMotion ? (
              <div style={{ display: 'flex' }}>
                <Sprout className="w-5 h-5" style={{ color }} />
              </div>
            ) : (
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
                style={{ display: 'flex' }}
              >
                <Sprout className="w-5 h-5" style={{ color }} />
              </motion.div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 }}>Activité agricole</div>
            <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '2px' }}>Ce que tu cultives ou élèves</div>
          </div>
        </div>

        <Field label="Filière principale" required error={errors.filierePrincipale}>
          <BigSelect value={data.filierePrincipale} onChange={(v) => setField('filierePrincipale', v)} options={FILIERES} placeholder="Choisir la filière principale" color={color} />
        </Field>

        <Field label="Filières secondaires" optional error={errors.filieresSecondaires}>
          <TagSelector options={FILIERES.filter((f) => f !== data.filierePrincipale).slice(0, 10)} values={data.filieresSecondaires} onChange={(v) => setField('filieresSecondaires', v)} color={color} />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Superficie (ha)" optional error={errors.superficie}>
            <BigInput type="number" min={0} value={data.superficie} onChange={(v) => setField('superficie', v)} placeholder="2.5" inputMode="decimal" color={color} />
          </Field>
          <Field label="Élevage pratiqué" optional error={errors.typeElevage}>
            <BigInput value={data.typeElevage} onChange={(v) => setField('typeElevage', v)} placeholder={`Volailles\u2026`} color={color} />
          </Field>
        </div>

        <Field label="Groupement / Coopérative" optional error={errors.groupement}>
          <BigInput value={data.groupement} onChange={(v) => setField('groupement', v)} placeholder="Nom du groupement" color={color} />
        </Field>
      </div>
    );

    if (profil === 'cooperative') return (
      <div className="space-y-5">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div
            style={{
              width: '42px', height: '42px',
              background: '#FFEEDD', borderRadius: '13px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            {prefersReducedMotion ? (
              <div style={{ display: 'flex' }}>
                <Layers className="w-5 h-5" style={{ color }} />
              </div>
            ) : (
              <motion.div
                animate={{ rotate: [0, 6, -6, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                style={{ display: 'flex' }}
              >
                <Layers className="w-5 h-5" style={{ color }} />
              </motion.div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 }}>Activité de la coopérative</div>
            <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '2px' }}>Ce que la coopérative fait</div>
          </div>
        </div>

        <Field label="Filière principale" required error={errors.filiereCoopPrincipale}>
          <BigSelect value={data.filiereCoopPrincipale} onChange={(v) => setField('filiereCoopPrincipale', v)} options={FILIERES} placeholder="Choisir la filière principale" color={color} />
        </Field>

        <Field label="Filières secondaires" optional error={errors.filieresCoopSecondaires}>
          <TagSelector options={FILIERES.filter((f) => f !== data.filiereCoopPrincipale).slice(0, 10)} values={data.filieresCoopSecondaires} onChange={(v) => setField('filieresCoopSecondaires', v)} color={color} />
        </Field>

        <Field label={'Zones d\u2019intervention'} optional error={errors.zonesIntervention}>
          <BigInput value={data.zonesIntervention} onChange={(v) => setField('zonesIntervention', v)} placeholder={`Villages et localit\u00e9s couverts par la coop\u00e9rative\u2026`} color={color} rows={3} />
        </Field>
      </div>
    );

    return null;
  }

  /* ROLE (lecture seule, defini par le type de compte) */
  /* ── ENTITE (profil admin_general) ── */
  if (stepId === 'entite') {
    return (
      <div className="space-y-5">
        <SectionHeader icon={Building2} label="Identité de l’entité" color={color} lightColor={cfg.lightColor} />
        <Field label="Raison sociale" required error={errors.raisonSociale}>
          <BigInput value={data.raisonSociale} onChange={(v) => setField('raisonSociale', v)} placeholder="Direction Générale de ..." color={color} />
        </Field>
        <Field label="Sigle" required error={errors.sigle}>
          <BigInput value={data.sigle} onChange={(v) => setField('sigle', v)} placeholder="DGE" color={color} />
        </Field>
        <Field label="Type d’entité" required error={errors.typeEntite}>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Type d’entité">
            {ENTITE_TYPES.map((t) => {
              const active = data.typeEntite === t;
              return (
                <motion.button
                  key={t}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setField('typeEntite', t)}
                  whileTap={{ scale: 0.92 }}
                  whileHover={{ scale: 1.05 }}
                  className="px-4 py-2 rounded-2xl border-2 transition-all flex items-center gap-1"
                  style={{
                    borderColor: active ? color : '#E5E7EB',
                    backgroundColor: active ? color : 'white',
                    color: active ? 'white' : '#4B5563',
                    fontSize: '0.85rem',
                    fontWeight: active ? 700 : 500,
                  }}
                >
                  {active && <CheckCircle className="w-4 h-4" aria-hidden="true" />}
                  {t}
                </motion.button>
              );
            })}
          </div>
        </Field>
        {data.typeEntite === ENTITE_TYPE_AUTRE && (
          <Field label="Préciser le type" required error={errors.typePrecise}>
            <BigInput value={data.typePrecise} onChange={(v) => setField('typePrecise', v)} placeholder="Type d’entité..." color={color} />
          </Field>
        )}
      </div>
    );
  }

  /* ── REFERENT (profil admin_general) ── */
  if (stepId === 'referent') {
    return (
      <div className="space-y-5">
        <SectionHeader icon={User} label="Référent de l’entité" color={color} lightColor={cfg.lightColor} />
        <Field label="Nom du référent" required error={errors.referentNom}>
          <BigInput value={data.referentNom} onChange={(v) => setField('referentNom', v)} placeholder="NOM Prénom" color={color} />
        </Field>
        <Field label="Fonction du référent" required error={errors.referentFonction}>
          <BigInput value={data.referentFonction} onChange={(v) => setField('referentFonction', v)} placeholder="Directeur, Responsable..." color={color} />
        </Field>
        <Field label="Numéro de téléphone" required error={errors.telephone}>
          <div className="relative">
            <BigInput
              value={data.telephone}
              onChange={handleTelChange}
              placeholder="0701020304"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              color={color}
            />
            <div className="absolute right-5 top-1/2 -translate-y-1/2" role="status" aria-live="polite">
              {verificationTel === 'checking' && (
                <div
                  className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: color }}
                  aria-label="Vérification du numéro en cours"
                />
              )}
              {verificationTel === 'exists' && (
                <AlertCircle className="w-7 h-7 text-red-500" aria-hidden="true" />
              )}
              {verificationTel === 'available' && (
                <CheckCircle2 className="w-7 h-7 text-green-500" aria-hidden="true" />
              )}
            </div>
          </div>
          {verificationTel === 'exists' && (
            <p className="text-red-600 mt-2 flex items-center gap-2 font-bold" style={{ fontSize: '0.92rem' }} role="alert" aria-live="assertive">
              <AlertCircle className="w-4 h-4" aria-hidden="true" /> Ce numéro est déjà utilisé par un autre acteur
            </p>
          )}
        </Field>
        <Field label="Email" required error={errors.email}>
          <BigInput type="email" autoComplete="email" value={data.email} onChange={(v) => setField('email', v)} placeholder="referent@entite.ci" color={color} />
        </Field>
      </div>
    );
  }

  if (stepId === 'role') {
    const roleLabels: Record<string, string> = {
      admin_general: 'Administrateur général',
      admin_national: 'Administrateur national',
      gestionnaire_zone: 'Gestionnaire de zone',
      operateur_terrain: 'Analyste',
    };
    const RoleIcon = cfg.icon;
    const roleLabel = profil ? (roleLabels[profil] ?? cfg.label) : cfg.label;
    return (
      <div className="space-y-5">
        <SectionHeader icon={cfg.icon} label="Rôle du compte" color={color} lightColor={cfg.lightColor} />
        <div
          style={{
            display: 'flex', alignItems: 'center', gap: '14px',
            padding: '18px', borderRadius: '16px',
            background: cfg.lightColor, border: `1.5px solid ${color}`,
          }}
        >
          <div
            style={{
              width: '52px', height: '52px', borderRadius: '14px', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
            aria-hidden="true"
          >
            <RoleIcon className="w-7 h-7" style={{ color }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: '#111827' }}>{roleLabel}</div>
            <div style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: '2px' }}>{cfg.desc}</div>
          </div>
        </div>
        <div
          style={{
            display: 'flex', alignItems: 'flex-start', gap: '8px',
            padding: '12px 14px', borderRadius: '12px',
            background: '#F9FAFB', border: '1px solid #EEE7DB',
          }}
        >
          <Info className="w-4 h-4 flex-shrink-0" style={{ color, marginTop: '2px' }} aria-hidden="true" />
          <span style={{ fontSize: '0.82rem', color: '#6B7280' }}>
            Le rôle est défini par le type de compte sélectionné au début et ne peut pas être modifié ici.
          </span>
        </div>
      </div>
    );
  }

  /* ZONE (region puis zone en cascade) */
  if (stepId === 'zone') {
    const zoneRequise = profil === 'gestionnaire_zone' || profil === 'identificateur';
    const zonesDisponibles = data.region
      ? getZonesByRegion(data.region).filter((z) => z.actif).map((z) => ({ value: z.id, label: z.nom }))
      : [];
    return (
      <div className="space-y-5">
        <SectionHeader icon={MapPin} label="Zone d'affectation" color={color} lightColor={cfg.lightColor} />
        <Field label="Région" required={zoneRequise} error={errors.region}>
          <BigSelect
            value={data.region}
            onChange={(v) => {
              setField('region', v);
              setField('zoneId', '');
              setField('zoneNom', '');
            }}
            options={REGIONS_CI}
            placeholder="Choisir la région"
            color={color}
          />
        </Field>
        <Field label="Zone" required={zoneRequise} error={errors.zoneId}>
          <BigSelect
            value={data.zoneId}
            onChange={(v) => {
              const z = zonesDisponibles.find((opt) => opt.value === v);
              setField('zoneId', v);
              setField('zoneNom', z ? z.label : '');
            }}
            options={zonesDisponibles}
            disabled={!data.region}
            placeholder={data.region ? 'Choisir la zone' : 'Choisir la région d’abord'}
            color={color}
          />
        </Field>
        {!zoneRequise && (
          <div
            style={{
              display: 'flex', alignItems: 'flex-start', gap: '8px',
              padding: '12px 14px', borderRadius: '12px',
              background: '#F9FAFB', border: '1px solid #EEE7DB',
            }}
          >
            <Info className="w-4 h-4 flex-shrink-0" style={{ color, marginTop: '2px' }} aria-hidden="true" />
            <span style={{ fontSize: '0.82rem', color: '#6B7280' }}>
              La zone est optionnelle pour ce rôle. Laisse vide pour un accès national.
            </span>
          </div>
        )}
      </div>
    );
  }

  /* PERMISSIONS (modules BO avec toggles) */
  if (stepId === 'permissions') {
    const perms: Record<string, boolean> = data.boPermissions || {};
    const modulesBO = BO_MODULES;
    const togglePerm = (permKey: string) => {
      const current = perms[permKey] === true;
      setField('boPermissions', { ...perms, [permKey]: !current });
    };
    return (
      <div className="space-y-5">
        <SectionHeader icon={Layers} label="Permissions par module" color={color} lightColor={cfg.lightColor} />
        {modulesBO.map((mod) => (
          <div
            key={mod.module}
            style={{ background: '#fff', border: '1px solid #EEE7DB', borderRadius: '14px', padding: '14px' }}
          >
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '10px' }}>{mod.label}</div>
            <div className="flex flex-wrap gap-2" role="group" aria-label={`Permissions ${mod.label}`}>
              {mod.actions.map((act) => {
                const permKey = `${mod.module}.${act.action}`;
                const active = perms[permKey] === true;
                return (
                  <motion.button
                    key={permKey}
                    type="button"
                    aria-pressed={active}
                    aria-label={`${mod.label} ${act.label}`}
                    onClick={() => togglePerm(permKey)}
                    whileTap={{ scale: 0.92 }}
                    whileHover={{ scale: 1.05 }}
                    className="px-4 py-2 rounded-2xl border-2 transition-all flex items-center gap-1"
                    style={{
                      borderColor: active ? color : '#E5E7EB',
                      backgroundColor: active ? color : 'white',
                      color: active ? 'white' : '#4B5563',
                      fontSize: '0.85rem',
                      fontWeight: active ? 700 : 500,
                    }}
                  >
                    {active && <CheckCircle className="w-4 h-4" aria-hidden="true" />}
                    {act.label}
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ── FINALISATION ── */
  if (stepId === 'finalisation') {
    const goToStep = (targetIdx: number) => {
      if (completedSteps.has(targetIdx) || targetIdx < step) {
        setDirection(targetIdx > step ? 1 : -1);
        setStep(targetIdx);
      }
    };

    const findStepIdx = (id: string) => cfg.steps.findIndex((s) => s.id === id);

    const tpvRecap =
      profil === 'marchand'
        ? data.typePointVente === 'autre'
          ? data.typePointVenteAutre || ''
          : TYPES_POINT_VENTE.find((t) => t.value === data.typePointVente)?.label || ''
        : '';

    const handleModifySection = (id: string) => {
      const idx = findStepIdx(id);
      if (idx >= 0) goToStep(idx);
    };

    return (
      <div className="space-y-5">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div
            style={{
              width: '42px', height: '42px',
              background: '#FFEEDD', borderRadius: '13px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            {prefersReducedMotion ? (
              <div style={{ display: 'flex' }}>
                <CheckCircle className="w-5 h-5" style={{ color }} />
              </div>
            ) : (
              <motion.div
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                style={{ display: 'flex' }}
              >
                <CheckCircle className="w-5 h-5" style={{ color }} />
              </motion.div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1a1a1a', lineHeight: 1.2 }}>Validation finale</div>
            <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '2px' }}>{`V\u00e9rifie le dossier puis confirme l\u2019envoi`}</div>
          </div>
        </div>

        {data.gps && (
          <div
            style={{
              background: '#ECFDF5',
              border: '1.5px solid #A7F3D0',
              borderRadius: '12px',
              padding: '11px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
            role="status"
            aria-live="polite"
          >
            {prefersReducedMotion ? (
              <div
                style={{
                  width: '28px', height: '28px',
                  background: '#10B981', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                <NavigationIcon className="w-3 h-3 text-white" />
              </div>
            ) : (
              <motion.div
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  width: '28px', height: '28px',
                  background: '#10B981', borderRadius: '8px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                <NavigationIcon className="w-3 h-3 text-white" />
              </motion.div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.66rem', color: '#047857', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Position GPS capturée
              </div>
              <div style={{ fontSize: '0.78rem', color: '#065F46', marginTop: '1px', fontFamily: 'ui-monospace, SFMono-Regular, monospace' }}>
                {Number.isFinite(data.gps.lat) ? data.gps.lat.toFixed(4) : '?'}° N, {Number.isFinite(data.gps.lng) ? Math.abs(data.gps.lng).toFixed(4) : '?'}° {Number.isFinite(data.gps.lng) && data.gps.lng < 0 ? 'W' : 'E'} ±{Number.isFinite(data.gps.accuracy) ? Math.round(data.gps.accuracy) : 0}m
              </div>
            </div>
          </div>
        )}
        {errors.gps && (
          <div
            style={{
              fontSize: '0.78rem',
              color: '#DC2626',
              marginTop: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 600,
            }}
            role="alert"
            aria-live="assertive"
          >
            <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
            {errors.gps}
          </div>
        )}

        <div style={{
          background: '#FAF7F1',
          border: '1.5px solid #E8E0D2',
          borderRadius: '14px',
          padding: '12px',
        }}
        >
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#1a1a1a', marginBottom: '12px', padding: '0 4px' }}>
            Récapitulatif du dossier
          </div>

          {profil === 'cooperative' ? (
            <>
              <RecapBlock
                num={1}
                title="Dirigeant"
                stepId="dirigeant"
                color={color}
                prefersReducedMotion={prefersReducedMotion}
                onModify={handleModifySection}
              >
                {data.photo && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', gap: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#777' }}>Photo</span>
                    <img src={data.photo} alt="Photo du dirigeant" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: `2px solid ${color}40` }} />
                  </div>
                )}
                <RecapRow label="Nom complet" value={`${data.prenoms || ''} ${data.nom || ''}`.trim()} />
                <RecapRow label="Fonction" value={data.fonctionDirigeant} />
              </RecapBlock>
              <RecapBlock
                num={2}
                title="Coopérative"
                stepId="cooperative"
                color={color}
                prefersReducedMotion={prefersReducedMotion}
                onModify={handleModifySection}
              >
                <RecapRow label="Nom" value={data.nomCooperative} />
                <RecapRow label="Membres" value={data.nombreMembres} />
                <RecapRow label="Statut juridique" value={data.statutJuridique} />
              </RecapBlock>
              <RecapBlock
                num={3}
                title="Contact"
                stepId="contact"
                color={color}
                prefersReducedMotion={prefersReducedMotion}
                onModify={handleModifySection}
              >
                <RecapRow label="Téléphone" value={data.telephone} />
                <RecapRow label="Email" value={data.email} />
              </RecapBlock>
              <RecapBlock
                num={4}
                title="Siège"
                stepId="localisation"
                color={color}
                prefersReducedMotion={prefersReducedMotion}
                onModify={handleModifySection}
              >
                <RecapRow label="Commune" value={data.commune} />
                <RecapRow label="Région" value={data.region} />
                <RecapRow label="Ville" value={data.ville} />
                <RecapRow label="Adresse siège" value={data.adresseSiege} />
              </RecapBlock>
              <RecapBlock
                num={5}
                title="Activité"
                stepId="activite"
                color={color}
                prefersReducedMotion={prefersReducedMotion}
                onModify={handleModifySection}
              >
                <RecapRow label="Filière coopérative" value={data.filiereCoopPrincipale} />
                <RecapRow label={'Zones d\u2019intervention'} value={data.zonesIntervention} />
              </RecapBlock>
            </>
          ) : (profil === 'admin_general') ? (
            <>
              <RecapBlock num={1} title="Entité" stepId="entite" color={color} prefersReducedMotion={prefersReducedMotion} onModify={handleModifySection}>
                <RecapRow label="Raison sociale" value={data.raisonSociale} />
                <RecapRow label="Sigle" value={data.sigle} />
                <RecapRow label="Type" value={data.typeEntite === ENTITE_TYPE_AUTRE ? data.typePrecise : data.typeEntite} />
              </RecapBlock>
              <RecapBlock num={2} title="Référent" stepId="referent" color={color} prefersReducedMotion={prefersReducedMotion} onModify={handleModifySection}>
                <RecapRow label="Nom" value={data.referentNom} />
                <RecapRow label="Fonction" value={data.referentFonction} />
                <RecapRow label="Téléphone" value={data.telephone} />
                <RecapRow label="Email" value={data.email} />
              </RecapBlock>
              <RecapBlock num={3} title="Zone" stepId="zone" color={color} prefersReducedMotion={prefersReducedMotion} onModify={handleModifySection}>
                <RecapRow label="Zone" value={data.zoneNom || 'National'} />
              </RecapBlock>
              <RecapBlock num={4} title="Permissions" stepId="permissions" color={color} prefersReducedMotion={prefersReducedMotion} onModify={handleModifySection}>
                <RecapRow label="Modules activés" value={data.boPermissions ? Object.entries(data.boPermissions as Record<string,boolean>).filter(([,v])=>v).map(([k])=>k).join(', ') || 'Aucune permission sélectionnée' : 'Aucune permission sélectionnée'} />
              </RecapBlock>
            </>
          ) : (['admin_general', 'admin_national', 'gestionnaire_zone', 'operateur_terrain'].includes(profil as string)) ? (
            <>
              <RecapBlock num={1} title="Identité" stepId="identite" color={color} prefersReducedMotion={prefersReducedMotion} onModify={handleModifySection}>
                {data.photo && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', gap: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#777' }}>Photo</span>
                    <img src={data.photo} alt="Photo identité" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: `2px solid ${color}40` }} />
                  </div>
                )}
                <RecapRow label="Nom complet" value={`${data.prenoms || ''} ${data.nom || ''}`.trim()} />
                <RecapRow label="Genre" value={data.genre} />
              </RecapBlock>
              <RecapBlock num={2} title="Contact" stepId="contact" color={color} prefersReducedMotion={prefersReducedMotion} onModify={handleModifySection}>
                <RecapRow label="Téléphone" value={data.telephone} />
                <RecapRow label="Email" value={data.email} />
              </RecapBlock>
              <RecapBlock num={3} title="Rôle" stepId="role" color={color} prefersReducedMotion={prefersReducedMotion} onModify={handleModifySection}>
                <RecapRow label="Rôle" value={profil ? ({ admin_general: 'Administrateur général', admin_national: 'Administrateur national', gestionnaire_zone: 'Gestionnaire de zone', operateur_terrain: 'Analyste' } as Record<string,string>)[profil] ?? profil : ''} />
              </RecapBlock>
              <RecapBlock num={4} title="Zone" stepId="zone" color={color} prefersReducedMotion={prefersReducedMotion} onModify={handleModifySection}>
                <RecapRow label="Région" value={data.region} />
                <RecapRow label="Zone" value={data.zoneNom} />
              </RecapBlock>
              <RecapBlock num={5} title="Permissions" stepId="permissions" color={color} prefersReducedMotion={prefersReducedMotion} onModify={handleModifySection}>
                <RecapRow label="Modules activés" value={data.boPermissions ? Object.entries(data.boPermissions as Record<string,boolean>).filter(([,v])=>v).map(([k])=>k).join(', ') || 'Aucune permission sélectionnée' : 'Aucune permission sélectionnée'} />
              </RecapBlock>
            </>
          ) : (
            <>
              <RecapBlock
                num={1}
                title="Identité"
                stepId="identite"
                color={color}
                prefersReducedMotion={prefersReducedMotion}
                onModify={handleModifySection}
              >
                {data.photo && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', gap: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: '#777' }}>Photo</span>
                    <img src={data.photo} alt="Photo identité" style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover', border: `2px solid ${color}40` }} />
                  </div>
                )}
                <RecapRow label="Nom complet" value={`${data.prenoms || ''} ${data.nom || ''}`.trim()} />
                <RecapRow label="Genre" value={data.genre} />
                <RecapRow label="Date naissance" value={data.dateNaissance} />
                <RecapRow label="Lieu naissance" value={data.lieuNaissance} />
                <RecapRow label="Nationalité" value={data.nationalite} />
              </RecapBlock>

              <RecapBlock
                num={2}
                title="Contact"
                stepId="contact"
                color={color}
                prefersReducedMotion={prefersReducedMotion}
                onModify={handleModifySection}
              >
                <RecapRow label="Téléphone" value={data.telephone} />
                <RecapRow label="Email" value={data.email} />
              </RecapBlock>

              <RecapBlock
                num={3}
                title="Lieu"
                stepId="lieu"
                color={color}
                prefersReducedMotion={prefersReducedMotion}
                onModify={handleModifySection}
              >
                <RecapRow label="Commune" value={data.commune} />
                {profil === 'marchand' && <RecapRow label="Marché" value={data.marche} />}
                {profil === 'marchand' && <RecapRow label="Type point de vente" value={tpvRecap} />}
                {profil === 'producteur' && <RecapRow label="Village" value={data.village} />}
                {data.quartierVillage ? <RecapRow label="Quartier / Village" value={data.quartierVillage} /> : null}
              </RecapBlock>

              <RecapBlock
                num={4}
                title="Activité"
                stepId="activite"
                color={color}
                prefersReducedMotion={prefersReducedMotion}
                onModify={handleModifySection}
              >
                {profil === 'marchand' && <RecapRow label="Produits vendus" value={data.produitsVendus} />}
                {profil === 'producteur' && <RecapRow label="Filière principale" value={data.filierePrincipale} />}
                {data.anneesExperience ? <RecapRow label="Années expérience" value={data.anneesExperience} /> : null}
              </RecapBlock>
            </>
          )}
        </div>

        <Field label="Signature" optional error={errors.signature}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            {[
              { id: 'tactile', label: 'Signer au doigt', icon: FileText },
              { id: 'clavier', label: 'Saisir au clavier', icon: Phone },
            ].map((mode) => {
              const Icon = mode.icon;
              const active = signatureMode === mode.id;
              return (
                <motion.button
                  key={mode.id}
                  type="button"
                  onClick={() => {
                    const next = mode.id as 'tactile' | 'clavier';
                    if (next === 'clavier' && signatureMode === 'tactile') {
                      clearSignature();
                    }
                    if (next === 'tactile' && signatureMode === 'clavier') {
                      if (data.signature && !String(data.signature).startsWith('data:image')) {
                        setField('signature', null);
                      }
                    }
                    setSignatureMode(next);
                  }}
                  whileTap={{ scale: 0.96 }}
                  aria-pressed={active}
                  style={{
                    flex: 1,
                    padding: '12px 10px',
                    background: active ? '#FFEEDD' : '#fff',
                    border: `1.5px solid ${active ? color : '#E5E0D8'}`,
                    borderRadius: '9px',
                    fontSize: '0.78rem',
                    color: active ? color : '#666',
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    fontFamily: 'inherit',
                    minHeight: '44px',
                  }}
                >
                  {active && !prefersReducedMotion ? (
                    <motion.div
                      animate={{ scale: [1, 1.15, 1] }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                      style={{ display: 'flex' }}
                      aria-hidden="true"
                    >
                      <Icon className="w-3 h-3" />
                    </motion.div>
                  ) : (
                    <div style={{ display: 'flex' }} aria-hidden="true">
                      <Icon className="w-3 h-3" />
                    </div>
                  )}
                  {mode.label}
                </motion.button>
              );
            })}
          </div>

          <motion.button
            type="button"
            onClick={() => {
              clearSignature();
              setField('signature', null);
              setErrors((prev) => {
                const n = { ...prev };
                delete n.signature;
                return n;
              });
            }}
            whileTap={{ scale: 0.97 }}
            style={{
              width: '100%',
              marginBottom: '10px',
              padding: '11px 14px',
              background: '#fff',
              border: `1.5px dashed ${color}55`,
              borderRadius: '12px',
              color: '#6B7280',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Ignorer la signature
          </motion.button>

          {signatureMode === 'tactile' && (
            <div className="border-2 border-dashed rounded-2xl overflow-hidden" style={{ borderColor: color + '60' }}>
              <div style={{ position: 'relative', background: '#fff' }}>
                <canvas
                  ref={signatureCanvasRef}
                  width={600}
                  height={140}
                  style={{ width: '100%', display: 'block', cursor: 'crosshair', touchAction: 'none' }}
                  role="img"
                  aria-label="Zone de signature tactile"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                {!data.signature && (
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    fontSize: '0.78rem',
                    color: '#C0AC9A',
                    textAlign: 'center',
                  }}
                  >
                    Signe avec ton doigt dans ce cadre
                  </div>
                )}
              </div>
              {data.signature && String(data.signature).startsWith('data:image') && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '6px 10px', borderTop: '1px solid #F0E8DA' }}>
                  <motion.button
                    type="button"
                    onClick={clearSignature}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Effacer la signature"
                    style={{
                      background: 'transparent',
                      border: '1px solid #E5DCD0',
                      color: '#888',
                      borderRadius: '8px',
                      padding: '8px 12px',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontFamily: 'inherit',
                      minHeight: '44px',
                    }}
                  >
                    {prefersReducedMotion ? (
                      <span style={{ display: 'inline-flex' }} aria-hidden="true">
                        <RotateCcw className="w-3 h-3" />
                      </span>
                    ) : (
                      <motion.span
                        animate={{ rotate: [0, -18, 0] }}
                        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                        style={{ display: 'inline-flex' }}
                        aria-hidden="true"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </motion.span>
                    )}
                    Effacer
                  </motion.button>
                </div>
              )}
            </div>
          )}

          {signatureMode === 'clavier' && (
            <input
              type="text"
              autoComplete="off"
              aria-label="Signature au clavier : saisis ton nom complet"
              value={
                data.signature && String(data.signature).startsWith('data:application/json')
                  ? ''
                  : (typeof data.signature === 'string' && data.signature && !data.signature.startsWith('data:')
                    ? data.signature
                    : '')
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val.trim()) {
                  setField('signature', val);
                } else {
                  setField('signature', null);
                }
              }}
              placeholder="Tape ton nom complet pour signer"
              style={{
                width: '100%',
                padding: '14px 16px',
                border: `2px dashed ${color}60`,
                borderRadius: '14px',
                fontSize: '1rem',
                fontFamily: 'inherit',
                background: '#fff',
                color: '#1a1a1a',
                outline: 'none',
                textAlign: 'center',
              }}
            />
          )}
        </Field>

        {!skipPinCheck && (
        <Field label={`Code de confirmation${'\u202f'}(4 chiffres)`} required error={errors.codeIdentificateur}>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }} role="group" aria-label="Saisie du code de confirmation à 4 chiffres">
            {[0, 1, 2, 3].map((i) => {
              const isActive = (data.codeIdentificateur || '').length === i;
              const cellStyle: React.CSSProperties = {
                width: '56px',
                height: '60px',
                borderRadius: '12px',
                border: `2px solid ${(data.codeIdentificateur || '')[i] ? color : '#E5E0D8'}`,
                background: (data.codeIdentificateur || '')[i] ? '#FFEEDD' : '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'border-color 0.15s ease, background 0.15s ease',
              };
              const pinInputStyle: React.CSSProperties = {
                width: '100%',
                height: '100%',
                border: 'none',
                borderRadius: '10px',
                background: 'transparent',
                textAlign: 'center',
                fontSize: '1.4rem',
                fontWeight: 700,
                color,
                outline: 'none',
                fontFamily: 'inherit',
              };
              return (
                isActive && !prefersReducedMotion ? (
                  <motion.div
                    key={i}
                    animate={{ scale: [1, 1.06, 1] }}
                    transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                    style={cellStyle}
                  >
                    <input
                      ref={(el) => {
                        codePinRefs.current[i] = el;
                      }}
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      maxLength={1}
                      aria-label={`Chiffre ${i + 1} sur 4 du code de confirmation`}
                      value={(data.codeIdentificateur || '')[i] || ''}
                      onChange={(e) => {
                        const digit = e.target.value.replace(/\D/g, '').slice(-1);
                        const current = data.codeIdentificateur || '';
                        const newCode = (current.substring(0, i) + digit + current.substring(i + 1)).slice(0, 4);
                        setField('codeIdentificateur', newCode);
                        if (digit && i < 3) {
                          const nextEl = codePinRefs.current[i + 1];
                          if (nextEl) nextEl.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !(data.codeIdentificateur || '')[i] && i > 0) {
                          const prevEl = codePinRefs.current[i - 1];
                          if (prevEl) prevEl.focus();
                        }
                      }}
                      style={pinInputStyle}
                    />
                  </motion.div>
                ) : (
                  <div key={i} style={cellStyle}>
                    <input
                      ref={(el) => {
                        codePinRefs.current[i] = el;
                      }}
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      autoComplete="off"
                      maxLength={1}
                      aria-label={`Chiffre ${i + 1} sur 4 du code de confirmation`}
                      value={(data.codeIdentificateur || '')[i] || ''}
                      onChange={(e) => {
                        const digit = e.target.value.replace(/\D/g, '').slice(-1);
                        const current = data.codeIdentificateur || '';
                        const newCode = (current.substring(0, i) + digit + current.substring(i + 1)).slice(0, 4);
                        setField('codeIdentificateur', newCode);
                        if (digit && i < 3) {
                          const nextEl = codePinRefs.current[i + 1];
                          if (nextEl) nextEl.focus();
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !(data.codeIdentificateur || '')[i] && i > 0) {
                          const prevEl = codePinRefs.current[i - 1];
                          if (prevEl) prevEl.focus();
                        }
                      }}
                      style={pinInputStyle}
                    />
                  </div>
                )
              );
            })}
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#999', marginTop: '8px' }}>
            {`Code personnel de l\u2019identificateur pour confirmer la soumission`}
          </div>
        </Field>
        )}

        <div
          style={{
            background: '#EFF6FF',
            border: '1.5px solid #BFDBFE',
            borderRadius: '14px',
            padding: '13px 14px',
            display: 'flex',
            gap: '11px',
          }}
          role="status"
        >
          {prefersReducedMotion ? (
            <div
              style={{
                width: '32px', height: '32px',
                background: '#3B82F6', borderRadius: '9px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <Info className="w-4 h-4 text-white" />
            </div>
          ) : (
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              style={{
                width: '32px', height: '32px',
                background: '#3B82F6', borderRadius: '9px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              <Info className="w-4 h-4 text-white" />
            </motion.div>
          )}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1E40AF', lineHeight: 1.3 }}>
              Envoi pour validation
            </div>
            <div style={{ fontSize: '0.72rem', color: '#1E3A8A', marginTop: '4px', lineHeight: 1.5 }}>
              Le dossier sera transmis pour vérification. Le compte sera activé uniquement après approbation complète.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}


