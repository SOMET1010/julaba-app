import React, { useState, useMemo, useEffect } from 'react';
import { useIdentificateur } from '../../contexts/IdentificateurContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  UserCheck,
  Phone,
  MapPin,
  XCircle,
  CheckCircle,
  Clock,
  FileText,
  History,
  Plus,
  Send,
  Building2,
  ChevronRight,
  AlertCircle,
  Shield,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { NotificationButton } from '../marchand/NotificationButton';
import { toast } from 'sonner';
import { SearchBar } from '../shared/SearchBar';
import { matchesSearch } from '../../utils/searchUtils';
import { API_URL } from '../../utils/api';
import { apiRequest } from '../../../imports/api-client';
import { FicheActeurDetailModal } from '../shared/FicheActeurDetailModal';
import { SubPageLayout } from '../layout/SubPageLayout';
import { UniversalKPI, KPIGrid } from '../ui/UniversalKPI';

const PRIMARY_COLOR = '#9F8170';

/** Champs utiles renvoyés par l’API / le contexte avant mapping liste. */
interface RawIdentification {
  id: string;
  acteurId?: string;
  acteur_id?: string;
  acteurNom?: string;
  acteur_nom?: string;
  nom?: string;
  telephone?: string;
  acteur_telephone?: string;
  typeActeur?: string;
  type_acteur?: string;
  marche?: string;
  zoneId?: string;
  commune?: string;
  activite?: string;
  statut?: string;
  dateIdentification?: string;
  date_identification?: string;
  photo?: string;
  acteur_photo?: string;
}

// Couleur par rôle
function getRoleColor(role: string) {
  if (role === 'marchand') return '#C66A2C';
  if (role === 'producteur') return '#2E8B57';
  if (role === 'cooperative' || role === 'cooperateur') return '#2072AF'; // ok param
  return '#9F8170';
}

// Initiales depuis prénom + nom
function getInitiales(prenoms: string, nom: string): string {
  const p = (prenoms || '').trim()[0] || '';
  const n = (nom || '').trim()[0] || '';
  return (p + n).toUpperCase() || '?';
}

function formatRole(role: string | undefined | null): string {
  if (!role) return '?';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

const VALID_FILTERS = ['all', 'submitted', 'complement', 'validee', 'validated', 'rejetee'] as const;
type FilterType = typeof VALID_FILTERS[number];

function parseInitialFilter(rawFilter: unknown): FilterType {
  if (typeof rawFilter !== 'string') return 'all';
  if (rawFilter === 'draft' || rawFilter === 'submitted') return 'submitted';
  if (rawFilter === 'approved' || rawFilter === 'validated' || rawFilter === 'validee') return 'validee';
  if (rawFilter === 'rejected' || rawFilter === 'rejetee') return 'rejetee';
  if (rawFilter === 'complement') return 'complement';
  if ((VALID_FILTERS as readonly string[]).includes(rawFilter)) return rawFilter as FilterType;
  return 'all';
}

// Avatar: photo ou initiales
function Avatar({ photo, prenoms, nom, roleColor, isCooperative }: { photo: string | null, prenoms: string, nom: string, roleColor: string, isCooperative: boolean }) {
  const [imgError, setImgError] = React.useState(false);
  React.useEffect(() => {
    setImgError(false);
  }, [photo]);
  if (photo && !imgError) {
    return (
      <img
        src={photo}
        alt=""
        className="w-full h-full object-cover rounded-2xl"
        onError={() => {
          console.warn('[Identifications] avatar image load failed');
          setImgError(true);
        }}
      />
    );
  }
  if (isCooperative) {
    return <Building2 className="w-7 h-7" style={{ color: roleColor }} aria-hidden="true" />;
  }
  const initiales = getInitiales(prenoms, nom);
  return (
    <span className="text-lg font-black" style={{ color: roleColor }} aria-hidden="true">
      {initiales}
    </span>
  );
}

export function Identifications() {
  const navigate = useNavigate();
  const prefersReducedMotion = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const { identifications: rawIdentifications } = useIdentificateur();

  // Transformer les données API en format attendu par le composant
  const mappedIdentifications = useMemo(() => rawIdentifications.map((i: RawIdentification) => {
    // acteur_nom peut être "CYNTHIA BOKOU" -> on split en prenoms/nom
    const fullName = (i.acteurNom || i.acteur_nom || i.nom || '').trim();
    const parts = fullName.split(' ');
    const prenoms = parts[0] || '';
    const nom = parts.slice(1).join(' ') || parts[0] || '';

    // Mapping statut API -> statut UI
    let statut = 'soumis';
    if (i.statut === 'valide' || i.statut === 'validee' || i.statut === 'approuve') statut = 'validee';
    else if (i.statut === 'en_attente' || i.statut === 'soumis') statut = 'soumis';
    else if (i.statut === 'rejetee' || i.statut === 'rejete') statut = 'rejetee';
    else if (i.statut === 'complement') statut = 'complement';
    else if (i.statut) statut = i.statut;

    const acteurIdValue = (typeof i.acteurId === 'string' && i.acteurId !== '')
      ? i.acteurId
      : (typeof i.acteur_id === 'string' && i.acteur_id !== '')
        ? i.acteur_id
        : '';
    return {
      id: i.id,
      acteurId: acteurIdValue,
      acteur_id: acteurIdValue,
      telephone: i.telephone || i.acteur_telephone || '',
      prenoms,
      nom,
      role: i.typeActeur || i.type_acteur || 'marchand',
      marche: i.marche || i.zoneId || '',
      commune: i.commune || '',
      activite: i.activite || '',
      statut,
      dateIdentification: i.dateIdentification || i.date_identification || '',
      photo: i.photo || i.acteur_photo || null,
    };
  }), [rawIdentifications]);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const initialFilter: FilterType = parseInitialFilter((location.state as { filter?: unknown } | null)?.filter);
  const [activeFilter, setActiveFilter] = useState<FilterType>(initialFilter);
  const [ficheActeur, setFicheActeur] = useState<any | null>(null);
  const [selectedRole, setSelectedRole] = useState<'all' | 'marchand' | 'producteur' | 'cooperative' | 'cooperateur'>('all');
  const [enrichedData, setEnrichedData] = useState<Record<string, any>>({});
  const fetchedIds = React.useRef<Set<string>>(new Set());
  const isMountedRef = React.useRef(true);
  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Enrichir les identifications avec les détails acteur (phone, photo, activite, marche)
  useEffect(() => {
    const ac = new AbortController();
    const toEnrich = rawIdentifications.filter((i: any) => i.acteurId && !fetchedIds.current.has(i.acteurId));
    if (toEnrich.length === 0) return () => ac.abort();

    const enrichOne = async (identification: any) => {
      const acteurId = identification.acteurId;
      fetchedIds.current.add(acteurId);
      try {
        let data: any;
        try {
          data = await apiRequest<any>(API_URL, `/users/${acteurId}`, { method: 'GET', signal: ac.signal });
        } catch (err) {
          if ((err as Error)?.name === 'AbortError') return;
          console.warn('[Identifications] enrich HTTP error:', (err as Error)?.message);
          fetchedIds.current.delete(acteurId);
          return;
        }
        if (!isMountedRef.current) return;
        if (!data || typeof data !== 'object') {
          fetchedIds.current.delete(acteurId);
          return;
        }
        setEnrichedData(prev => ({
          ...prev,
          [acteurId]: {
            telephone: typeof data.phone === 'string' ? data.phone : '',
            photo: data.photoUrl || data.photo_url || null,
            activite: typeof data.activity === 'string' ? data.activity : '',
            marche: typeof data.market === 'string' ? data.market : '',
            firstName: data.firstName || data.first_name || '',
            lastName: data.lastName || data.last_name || '',
            email: typeof data.email === 'string' ? data.email : '',
            region: typeof data.region === 'string' ? data.region : '',
            horsZone: data.horsZone === true,
          }
        }));
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
        console.warn('[Identifications] enrich failed:', err instanceof Error ? err.message : err);
        fetchedIds.current.delete(acteurId);
      }
    };

    const BATCH_SIZE = 5;
    (async () => {
      for (let i = 0; i < toEnrich.length; i += BATCH_SIZE) {
        if (ac.signal.aborted || !isMountedRef.current) return;
        const batch = toEnrich.slice(i, i + BATCH_SIZE);
        await Promise.all(batch.map(enrichOne));
      }
    })();

    return () => ac.abort();
  }, [rawIdentifications]);

  // Stats calculées
  const stats = useMemo(() => {
    const total = mappedIdentifications.length;
    const soumis = mappedIdentifications.filter((i) => i.statut === 'soumis').length;
    const validees = mappedIdentifications.filter((i) => i.statut === 'validee').length;
    const rejetes = mappedIdentifications.filter((i) => i.statut === 'rejetee').length;
    const complements = mappedIdentifications.filter((i) => i.statut === 'complement').length;

    return { total, soumis, validees, rejetes, complements };
  }, [mappedIdentifications]);

  // Filtrer les identifications avec matchesSearch
  const filteredIdentifications = useMemo(() => {
    return mappedIdentifications.filter((identification) => {
      const matchSearch = matchesSearch(
        searchQuery,
        identification.nom,
        identification.prenoms,
        identification.telephone,
        identification.commune,
        identification.activite,
      );

      // Filtre statut actif
      let statutToMatch: string = activeFilter;
      if (activeFilter === 'submitted') statutToMatch = 'soumis';
      if (activeFilter === 'validee') statutToMatch = 'validee';
      if (activeFilter === 'validated') statutToMatch = 'validee';
      if (activeFilter === 'rejetee') statutToMatch = 'rejetee';
      const matchStatut = activeFilter === 'all' || identification.statut === statutToMatch;

      // Filtre rôle (API peut renvoyer cooperative ou cooperateur)
      const matchRole = selectedRole === 'all'
        || identification.role === selectedRole
        || (selectedRole === 'cooperative' && identification.role === 'cooperateur')
        || (selectedRole === 'cooperateur' && identification.role === 'cooperative');

      return matchSearch && matchStatut && matchRole;
    });
  }, [searchQuery, activeFilter, selectedRole, mappedIdentifications]);

  // Fusionner avec les données enrichies
  const mergedIdentifications = useMemo(() => {
    return filteredIdentifications.map(i => {
      const extra = (i.acteurId || i.acteur_id) ? (enrichedData[i.acteurId] || enrichedData[i.acteur_id]) : null;
      if (!extra) return i;
      return {
        ...i,
        telephone: extra.telephone || i.telephone,
        photo: extra.photo || i.photo,
        activite: extra.activite || i.activite,
        marche: extra.marche || i.marche,
        prenoms: extra.firstName ? extra.firstName : i.prenoms,
        nom: extra.lastName ? extra.lastName : i.nom,
        email: extra.email || '',
        region: extra.region || '',
        horsZone: extra.horsZone === true,
      };
    });
  }, [filteredIdentifications, enrichedData]);

  // Séparer en brouillons, soumissions, rejetés et compléments
  const soumissions = useMemo(() => mergedIdentifications.filter(i => i.statut === 'soumis'), [mergedIdentifications]);
  const rejetes = useMemo(() => mergedIdentifications.filter(i => i.statut === 'rejetee'), [mergedIdentifications]);
  const complements = useMemo(() => mergedIdentifications.filter(i => i.statut === 'complement'), [mergedIdentifications]);
  const validees = useMemo(() => mergedIdentifications.filter(i => i.statut === 'validee'), [mergedIdentifications]);

  /** Typage any : ligne fusionnée mapping + enrich (backlog type dédié cross-page). */
  const handleIdentificationClick = (identification: any) => {
    const enriched = mergedIdentifications.find(i => i.id === identification.id) || identification;
    setFicheActeur(enriched);
  };

  return (
    <SubPageLayout
      role="identificateur"
      title="Identifications"
      noPadding={true}
      rightContent={<NotificationButton />}
    >
      <div className="pt-2 pb-32 lg:pb-8 px-4 lg:pl-[320px] max-w-2xl lg:max-w-7xl mx-auto min-h-screen bg-gradient-to-b from-[#F5F0ED] to-white">

        <div
          className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 mb-4"
          role="status"
          aria-live="polite"
        >
          <Shield className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />
          <p className="text-sm font-medium text-amber-900">
            Écran sensible. Données personnelles identifiées (nom, téléphone, photo, activité, commune). Ne pas
            capturer ni partager cet écran.
          </p>
        </div>

        {/* Stats Cards - HARMONISÉES avec SuiviIdentifications */}
        <KPIGrid cols={2} className="mb-4">
          <UniversalKPI
            label="Total"
            animatedTarget={stats.total}
            icon={FileText}
            color="#2072AF"
            onClick={() => {
              setActiveFilter('all');
              toast('Affichage de tous les dossiers');
            }}
          />
          <UniversalKPI
            label="À compléter"
            animatedTarget={stats.complements}
            icon={AlertCircle}
            color="#F59E0B"
            onClick={() => {
              setActiveFilter('complement');
            }}
          />
          <UniversalKPI
            label="Soumissions"
            animatedTarget={stats.soumis}
            icon={Send}
            color="#16a34a"
            onClick={() => {
              setActiveFilter('submitted');
            }}
          />
          <UniversalKPI
            label="Validés"
            animatedTarget={stats.validees || 0}
            icon={CheckCircle}
            color="#9F8170"
            onClick={() => {
              setActiveFilter('validated');
            }}
          />
        </KPIGrid>

        {/* Boutons d'actions stratégiques */}
        <motion.div
          className="grid grid-cols-2 gap-3 mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <motion.button
            type="button"
            disabled
            aria-disabled={true}
            aria-label="Acteurs bientôt disponible"
            className="flex w-full min-w-0 flex-1 items-center justify-center gap-2 px-3 py-3.5 rounded-2xl bg-gray-50 border-2 border-gray-200 opacity-60 cursor-not-allowed"
          >
            <History className="w-5 h-5 text-gray-400 flex-shrink-0" aria-hidden="true" />
            <span className="font-semibold text-gray-500">Acteurs (bientôt)</span>
          </motion.button>

          <motion.button
            type="button"
            onClick={() => {
              navigate('/identificateur/fiche-identification');
            }}
            className="flex w-full min-w-0 flex-1 items-center justify-center gap-2 px-3 py-3.5 rounded-2xl bg-gradient-to-r from-[#9F8170] to-[#B39485] text-white border-2 border-[#9F8170]"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <Plus className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
            <span className="font-semibold">Nouveau dossier</span>
          </motion.button>
        </motion.div>

        {/* Tabs - Filtre par rôle (Tous / Marchands / Producteurs / Coopérative) */}
        <motion.div 
          className="mb-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100">
            <div className="grid grid-cols-4 gap-1.5">
              {/* Tab Tous */}
              <motion.button
                type="button"
                onClick={() => {
                  setSelectedRole('all');
                }}
                aria-pressed={selectedRole === 'all'}
                className={`relative flex items-center justify-center px-2 py-3.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                  selectedRole === 'all'
                    ? 'bg-gradient-to-r from-[#9F8170] to-[#B39485] text-white shadow-md'
                    : 'bg-transparent text-gray-600 hover:bg-gray-50'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                <span>Tous</span>
                {selectedRole === 'all' && (
                  <motion.div
                    className="absolute inset-0 bg-white/20 rounded-xl"
                    layoutId="activeRoleTab"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>

              {/* Tab Marchands */}
              <motion.button
                type="button"
                onClick={() => {
                  setSelectedRole('marchand');
                }}
                aria-pressed={selectedRole === 'marchand'}
                className={`relative flex items-center justify-center px-2 py-3.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                  selectedRole === 'marchand'
                    ? 'bg-gradient-to-r from-[#C66A2C] to-[#D87E47] text-white shadow-md'
                    : 'bg-transparent text-gray-600 hover:bg-gray-50'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                <span>Marchands</span>
                {selectedRole === 'marchand' && (
                  <motion.div
                    className="absolute inset-0 bg-white/20 rounded-xl"
                    layoutId="activeRoleTab"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>

              {/* Tab Producteurs */}
              <motion.button
                type="button"
                onClick={() => {
                  setSelectedRole('producteur');
                }}
                aria-pressed={selectedRole === 'producteur'}
                className={`relative flex items-center justify-center px-2 py-3.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                  selectedRole === 'producteur'
                    ? 'bg-gradient-to-r from-[#2E8B57] to-[#3BA56E] text-white shadow-md'
                    : 'bg-transparent text-gray-600 hover:bg-gray-50'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                <span>Producteurs</span>
                {selectedRole === 'producteur' && (
                  <motion.div
                    className="absolute inset-0 bg-white/20 rounded-xl"
                    layoutId="activeRoleTab"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>

              {/* Tab Coopérative */}
              <motion.button
                type="button"
                onClick={() => {
                  setSelectedRole('cooperative');
                }}
                aria-pressed={selectedRole === 'cooperative'}
                className={`relative flex items-center justify-center px-2 py-3.5 rounded-xl font-bold text-xs sm:text-sm transition-all ${
                  selectedRole === 'cooperative'
                    ? 'bg-gradient-to-r from-[#2072AF] to-[#3A8FCC] text-white shadow-md'
                    : 'bg-transparent text-gray-600 hover:bg-gray-50'
                }`}
                whileTap={{ scale: 0.98 }}
              >
                <span>Coop.</span>
                {selectedRole === 'cooperative' && (
                  <motion.div
                    className="absolute inset-0 bg-white/20 rounded-xl"
                    layoutId="activeRoleTab"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>

        {/* Barre de recherche */}
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <SearchBar
            placeholder="Nom ou téléphone…"
            value={searchQuery}
            onChange={(val) => setSearchQuery(val)}
            primaryColor={PRIMARY_COLOR}
            voiceEnabled={false}
          />
        </motion.div>

        {/* Section: SOUMISSIONS */}
        {soumissions.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3 px-1">
              <Send className="w-5 h-5 text-green-600" aria-hidden="true" />
              <h2 className="font-bold text-gray-900 text-lg">Soumissions</h2>
              <span
                className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold"
                aria-label={`${soumissions.length} soumission${soumissions.length > 1 ? 's' : ''}`}
              >
                {soumissions.length}
              </span>
            </div>
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {soumissions.map((identification, index) => {
                  const roleColor = getRoleColor(identification.role);
                  const isCooperative = identification.role === 'cooperative' || identification.role === 'cooperateur';

                  return (
                    <motion.button
                      key={identification.id}
                      type="button"
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ delay: index * 0.03 }}
                      className="w-full text-left bg-white rounded-3xl border-2 border-green-200 overflow-hidden cursor-pointer shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500"
                      onClick={() => handleIdentificationClick(identification)}
                      whileHover={{ scale: 1.01, y: -2, boxShadow: '0 8px 24px rgba(22,163,74,0.12)' }}
                      whileTap={{ scale: 0.98 }}
                      aria-label={`Soumission ${identification.prenoms} ${identification.nom}, ${formatRole(identification.role)}, ${identification.commune || 'commune non renseignée'}`}
                    >
                      <div className="p-4 flex items-center gap-3">
                        {/* Avatar */}
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border-2 shadow-sm overflow-hidden"
                          style={{ backgroundColor: `${roleColor}15`, borderColor: `${roleColor}40` }}
                          aria-hidden="true"
                        >
                          <Avatar photo={identification.photo} prenoms={identification.prenoms} nom={identification.nom} roleColor={roleColor} isCooperative={isCooperative} />
                        </div>

                        {/* Infos */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-gray-900 text-base truncate mb-1">
                            {identification.prenoms} {identification.nom}
                          </h3>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                              style={{ backgroundColor: `${roleColor}15`, color: roleColor }}>
                              {formatRole(identification.role)}
                            </span>
                            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 border border-green-300 text-xs font-bold text-green-700">
                              <CheckCircle className="w-3 h-3" aria-hidden="true" />
                              Soumis
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" aria-hidden="true" />{identification.telephone}</span>
                            <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3" aria-hidden="true" />{identification.commune}</span>
                          </div>
                        </div>

                        {/* Chevron */}
                        {prefersReducedMotion ? (
                          <div
                            className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${roleColor}12` }}
                            aria-hidden="true"
                          >
                            <ChevronRight className="w-5 h-5" style={{ color: roleColor }} />
                          </div>
                        ) : (
                          <motion.div
                            className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                            style={{ backgroundColor: `${roleColor}12` }}
                            animate={{ x: [0, 3, 0] }}
                            transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                            aria-hidden="true"
                          >
                            <ChevronRight className="w-5 h-5" style={{ color: roleColor }} />
                          </motion.div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Section: VALIDÉS */}
        {validees.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3 px-1">
              <CheckCircle className="w-5 h-5 text-green-600" aria-hidden="true" />
              <h2 className="font-bold text-gray-900 text-lg">Validés</h2>
              <span
                className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold"
                aria-label={`${validees.length} validé${validees.length > 1 ? 's' : ''}`}
              >
                {validees.length}
              </span>
            </div>
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {validees.map((identification, index) => {
                const roleColor = getRoleColor(identification.role);
                const isCooperative = identification.role === 'cooperative' || identification.role === 'cooperateur';
                return (
                  <motion.button
                    key={identification.id}
                    type="button"
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.03 }}
                    className="w-full text-left bg-white rounded-3xl border-2 border-green-300 overflow-hidden cursor-pointer shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500"
                    onClick={() => handleIdentificationClick(identification)}
                    whileHover={{ scale: 1.01, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    aria-label={`Validé ${identification.prenoms} ${identification.nom}, ${formatRole(identification.role)}, ${identification.commune || 'commune non renseignée'}`}
                  >
                    <div className="p-4 flex items-center gap-3">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border-2 shadow-sm overflow-hidden"
                        style={{ backgroundColor: `${roleColor}15`, borderColor: `${roleColor}40` }}
                        aria-hidden="true"
                      >
                        <Avatar
                          photo={identification.photo}
                          prenoms={identification.prenoms}
                          nom={identification.nom}
                          roleColor={roleColor}
                          isCooperative={isCooperative}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-gray-900 text-base truncate mb-1">
                          {identification.prenoms} {identification.nom}
                        </h3>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-bold"
                            style={{ backgroundColor: `${roleColor}15`, color: roleColor }}
                          >
                            {formatRole(identification.role)}
                          </span>
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 border border-green-300 text-xs font-bold text-green-700">
                            <CheckCircle className="w-3 h-3" aria-hidden="true" />
                            Validé
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" aria-hidden="true" />
                            {identification.telephone}
                          </span>
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3" aria-hidden="true" />
                            {identification.commune}
                          </span>
                        </div>
                      </div>
                      {prefersReducedMotion ? (
                        <div
                          className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${roleColor}12` }}
                          aria-hidden="true"
                        >
                          <ChevronRight className="w-5 h-5" style={{ color: roleColor }} />
                        </div>
                      ) : (
                        <motion.div
                          className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${roleColor}12` }}
                          animate={{ x: [0, 3, 0] }}
                          transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                          aria-hidden="true"
                        >
                          <ChevronRight className="w-5 h-5" style={{ color: roleColor }} />
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
              </AnimatePresence>
            </div>
          </div>
        )}

        {rejetes.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3 px-1">
              <XCircle className="w-5 h-5 text-red-600" aria-hidden="true" />
              <h2 className="font-bold text-gray-900 text-lg">Rejetés</h2>
              <span
                className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold"
                aria-label={`${rejetes.length} rejeté${rejetes.length > 1 ? 's' : ''}`}
              >
                {rejetes.length}
              </span>
            </div>
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {rejetes.map((identification, index) => {
                const roleColor = getRoleColor(identification.role);
                const isCooperative = identification.role === 'cooperative' || identification.role === 'cooperateur';
                return (
                  <motion.button
                    key={identification.id}
                    type="button"
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.03 }}
                    className="w-full text-left bg-white rounded-3xl border-2 border-red-200 overflow-hidden cursor-pointer shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-500"
                    onClick={() => handleIdentificationClick(identification)}
                    whileHover={{ scale: 1.01, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    aria-label={`Rejeté ${identification.prenoms} ${identification.nom}, ${formatRole(identification.role)}, ${identification.commune || 'commune non renseignée'}`}
                  >
                    <div className="p-4 flex items-center gap-3">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border-2 shadow-sm overflow-hidden"
                        style={{ backgroundColor: `${roleColor}15`, borderColor: `${roleColor}40` }}
                        aria-hidden="true"
                      >
                        <Avatar
                          photo={identification.photo}
                          prenoms={identification.prenoms}
                          nom={identification.nom}
                          roleColor={roleColor}
                          isCooperative={isCooperative}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-gray-900 text-base truncate mb-1">
                          {identification.prenoms} {identification.nom}
                        </h3>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-bold"
                            style={{ backgroundColor: `${roleColor}15`, color: roleColor }}
                          >
                            {formatRole(identification.role)}
                          </span>
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 border border-red-300 text-xs font-bold text-red-700">
                            <XCircle className="w-3 h-3" aria-hidden="true" /> Rejeté
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" aria-hidden="true" />
                            {identification.telephone}
                          </span>
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3" aria-hidden="true" />
                            {identification.commune}
                          </span>
                        </div>
                      </div>
                      {prefersReducedMotion ? (
                        <div
                          className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: 'rgba(248, 113, 113, 0.15)' }}
                          aria-hidden="true"
                        >
                          <ChevronRight className="w-5 h-5 text-red-400 flex-shrink-0" />
                        </div>
                      ) : (
                        <motion.div
                          className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: 'rgba(248, 113, 113, 0.15)' }}
                          animate={{ x: [0, 3, 0] }}
                          transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                          aria-hidden="true"
                        >
                          <ChevronRight className="w-5 h-5 text-red-400 flex-shrink-0" />
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
              </AnimatePresence>
            </div>
          </div>
        )}

        {complements.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3 px-1">
              <Clock className="w-5 h-5 text-blue-600" aria-hidden="true" />
              <h2 className="font-bold text-gray-900 text-lg">Compléments requis</h2>
              <span
                className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold"
                aria-label={`${complements.length} complément${complements.length > 1 ? 's' : ''} requis`}
              >
                {complements.length}
              </span>
            </div>
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {complements.map((identification, index) => {
                const roleColor = getRoleColor(identification.role);
                const isCooperative = identification.role === 'cooperative' || identification.role === 'cooperateur';
                return (
                  <motion.button
                    key={identification.id}
                    type="button"
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.03 }}
                    className="w-full text-left bg-white rounded-3xl border-2 border-blue-200 overflow-hidden cursor-pointer shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
                    onClick={() => handleIdentificationClick(identification)}
                    whileHover={{ scale: 1.01, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    aria-label={`Complément requis ${identification.prenoms} ${identification.nom}, ${formatRole(identification.role)}, ${identification.commune || 'commune non renseignée'}`}
                  >
                    <div className="p-4 flex items-center gap-3">
                      <div
                        className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border-2 shadow-sm overflow-hidden"
                        style={{ backgroundColor: `${roleColor}15`, borderColor: `${roleColor}40` }}
                        aria-hidden="true"
                      >
                        <Avatar
                          photo={identification.photo}
                          prenoms={identification.prenoms}
                          nom={identification.nom}
                          roleColor={roleColor}
                          isCooperative={isCooperative}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-black text-gray-900 text-base truncate mb-1">
                          {identification.prenoms} {identification.nom}
                        </h3>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-bold"
                            style={{ backgroundColor: `${roleColor}15`, color: roleColor }}
                          >
                            {formatRole(identification.role)}
                          </span>
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 border border-blue-300 text-xs font-bold text-blue-700">
                            <Clock className="w-3 h-3" aria-hidden="true" /> Complément
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" aria-hidden="true" />
                            {identification.telephone}
                          </span>
                          <span className="flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3" aria-hidden="true" />
                            {identification.commune}
                          </span>
                        </div>
                      </div>
                      {prefersReducedMotion ? (
                        <div
                          className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: 'rgba(96, 165, 250, 0.15)' }}
                          aria-hidden="true"
                        >
                          <ChevronRight className="w-5 h-5 text-blue-400 flex-shrink-0" />
                        </div>
                      ) : (
                        <motion.div
                          className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: 'rgba(96, 165, 250, 0.15)' }}
                          animate={{ x: [0, 3, 0] }}
                          transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
                          aria-hidden="true"
                        >
                          <ChevronRight className="w-5 h-5 text-blue-400 flex-shrink-0" />
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
              </AnimatePresence>
            </div>
          </div>
        )}

        {filteredIdentifications.length === 0 && (() => {
          const hasActiveFilters = searchQuery.trim() !== ''
            || activeFilter !== 'all'
            || selectedRole !== 'all';
          if (hasActiveFilters) {
            return (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
                <UserCheck className="w-16 h-16 mx-auto mb-4 text-gray-400" aria-hidden="true" />
                <p className="text-lg font-semibold text-gray-600">Aucun dossier ne correspond à tes filtres</p>
                <p className="text-sm text-gray-500 mt-1 mb-4">Essaie de modifier tes critères de recherche</p>
                <motion.button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setActiveFilter('all');
                    setSelectedRole('all');
                  }}
                  whileTap={{ scale: 0.97 }}
                  className="px-5 py-3 rounded-2xl bg-[#9F8170] text-white font-bold text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#9F8170]"
                  style={{ minHeight: '44px' }}
                >
                  Réinitialiser les filtres
                </motion.button>
              </motion.div>
            );
          }
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
              <UserCheck className="w-16 h-16 mx-auto mb-4 text-gray-400" aria-hidden="true" />
              <p className="text-lg font-semibold text-gray-600">{`Tu n\u2019as encore identifié aucun acteur`}</p>
              <p className="text-sm text-gray-500 mt-1 mb-4">{`Commence par créer un nouveau dossier d\u2019identification`}</p>
              <motion.button
                type="button"
                onClick={() => navigate('/identificateur/fiche-identification')}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[#9F8170] to-[#B39485] text-white font-bold text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#9F8170]"
                style={{ minHeight: '44px' }}
              >
                <Plus className="w-4 h-4" aria-hidden="true" />
                Nouveau dossier
              </motion.button>
            </motion.div>
          );
        })()}
      </div>

      {ficheActeur && (
        <FicheActeurDetailModal
          acteur={{ ...ficheActeur }}
          onClose={() => setFicheActeur(null)}
          contextRole="identificateur"
          canEdit={ficheActeur.horsZone === false}
          onEdit={() => {
            navigate('/identificateur/fiche-identification', {
              state: {
                mode: 'edit',
                identificationId: ficheActeur.id,
                acteurId: ficheActeur.acteurId || ficheActeur.acteur_id,
                phone: ficheActeur.telephone,
                typeActeur: ficheActeur.role,
                nom: ficheActeur.nom,
                prenoms: ficheActeur.prenoms,
                commune: ficheActeur.commune,
                activite: ficheActeur.activite,
                photo: ficheActeur.photo,
              },
            });
            setFicheActeur(null);
          }}
        />
      )}
    </SubPageLayout>
  );
}
