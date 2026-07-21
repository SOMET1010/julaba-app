/**
 * ═══════════════════════════════════════════════════════════════════
 * JÙLABA — AppContext v3.0 (100% PostgreSQL via NestJS)
 * ═══════════════════════════════════════════════════════════════════
 * 
 * ✅ Auth JWT custom via NestJS
 * ✅ Authentification JWT
 * ✅ Chargement automatique données utilisateur
 * ✅ Synchronisation temps réel
 * ✅ Support offline/online
 * ✅ Tata Nanti Lou (ElevenLabs TTS)
 */

import { eventBus, EVENTS } from '../services/eventBus';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { normalizeRole } from '../types/constants';
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { speakChunked, stopChunkedSpeaking } from '../services/elevenlabs';
import { API_URL } from '../utils/api';
import { enfilerOperation } from '../voice-offline/offlineCaisse';
import { clearAuthClientState } from '../utils/clearAuthClientState';
import { toProperCase } from '../utils/stringUtils';
import { useUser } from './UserContext';
import { setSuspendRefresh } from '../../imports/api-client';
import type { SousProfilMarchand } from '../types/sousProfilMarchand';

export type UserRole = 'marchand' | 'producteur' | 'cooperative' | 'cooperateur' | 'institution' | 'identificateur' | 'administrateur';

export interface User {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  sousProfilMarchand?: SousProfilMarchand | null;
  region: string;
  commune: string;
  activity: string;
  cooperativeName?: string;
  market?: string;
  zoneId?: string;
  zoneNom?: string;
  score: number;
  createdAt: string;
  validated: boolean;
  
  // Champs carte professionnelle
  nin?: string;
  dateNaissance?: string;
  lieuNaissance?: string;
  nationalite?: string;
  situationMatrimoniale?: string;
  numCNPS?: string;
  numCMU?: string;
  estMembreCooperative?: boolean;
  photo?: string;
  zone?: string;
  cni?: string;
  cmu?: string;
  rsti?: string;
  email?: string;
  telephone2?: string;
  categorie?: 'A' | 'B' | 'C';
  recepisse?: string;
  boitePostale?: string;
  statutEntrepreneur?: string;
  genre?: string;
  typePointVente?: string;
  typePointVenteAutre?: string;
  districtId?: string;
  districtAutre?: string;
  regionId?: string;
  regionAutre?: string;
  departementId?: string;
  departementAutre?: string;
  communeId?: string;
  communeAutre?: string;
  quartierVillage?: string;
  institutionName?: string;
  status?: string;
  mustChangePassword?: boolean;
  prenoms?: string;
  pinSecurityEnabled?: boolean;
  telephone?: string;
  nom?: string;
  prenom?: string;
  scoreCredit?: number;
  scoreJulaba?: number;
  actif?: boolean;
  lastLogin?: string;
  objectifMensuel?: number | null;
  primeObjectif?: number | null;
  [key: string]: unknown;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'vente' | 'depense' | 'recolte';
  productName: string;
  quantity: number;
  price: number;
  paymentMethod?: string;
  category?: string;
  date: string;
  location?: string;
  purchasePrice?: number;
  margin?: number;
  totalMargin?: number;
  synced?: boolean;
  montant?: number;
}

export interface DaySession {
  id: string;
  userId: string;
  date: string;
  fondInitial: number;
  opened: boolean;
  openedAt?: string;
  closedAt?: string;
  notes?: string;
  closingNotes?: string;
  comptageReel?: number;
  ecart?: number;
}

export interface MarketplaceItem {
  id: string;
  sellerId: string;
  sellerName: string;
  sellerRole: UserRole;
  sellerScore: number;
  productName: string;
  quantity: number;
  price: number;
  region: string;
  commune: string;
  photo?: string;
  available: boolean;
  createdAt: string;
}

interface AppContextType {
  // User & Auth
  user: User | null;
  setUser: (user: User | null) => void;
  isAuthenticated: boolean;
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  loading: boolean;
  
  // Transactions
  transactions: Transaction[];
  addTransaction: (transaction: Omit<Transaction, 'id' | 'date'>) => void;
  reloadTransactions: () => Promise<void>;
  
  // Marketplace
  marketplaceItems: MarketplaceItem[];
  addMarketplaceItem: (item: Omit<MarketplaceItem, 'id' | 'createdAt'>) => void;
  
  // Network & Voice
  isOnline: boolean;
  voiceEnabled: boolean;
  globalVoiceOpen: boolean;
  setGlobalVoiceOpen: (open: boolean) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  speak: (text: string) => void;
  voiceMuted: boolean;
  toggleVoiceMuted: () => void;
  isSpeaking: boolean;
  speakingText: string;
  
  // UI
  roleColor: string;
  isModalOpen: boolean;
  setIsModalOpen: (isOpen: boolean) => void;
  setAppTitle: (title: string) => void;
  
  // Sessions
  currentSession: DaySession | null;
  openDay: (fondInitial: number, notes?: string) => Promise<void>;
  closeDay: (comptageReel: number, closingNotes?: string) => Promise<void>;
  updateFondInitial: (newFond: number) => Promise<void>;
  
  // Stats
  getTodayStats: () => { ventes: number; cahier: number; caisse: number; nombreVentes: number };
  getSalesHistory: (filters?: { startDate?: string; endDate?: string; productName?: string; paymentMethod?: string }) => Transaction[];
  getFinancialSummary: (period: 'today' | '7days' | '30days' | 'custom', customStart?: string, customEnd?: string) => {
    totalVentes: number;
    totalCahier: number;
    beneficeNet: number;
    nombreVentes: number;
    nombreCahier: number;
    moyenneVente: number;
    topProduits: { productName: string; quantity: number; total: number }[];
  };
  
  // Actions
  refreshUserData: () => Promise<void>;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const ROLE_COLORS: Record<UserRole, string> = {
  marchand: '#C46210',
  producteur: '#00563B',
  cooperative: '#2072AF',
  cooperateur: '#2072AF',
  institution: '#702963',
  identificateur: '#9F8170',
  administrateur: '#702963',
};

/** Session par cookie : ne pas envoyer Authorization: Bearer cookie ; JWT réel sinon. */
function caisseAuthHeaders(accessToken: string | null): HeadersInit {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (accessToken && accessToken !== 'cookie') {
    h['Authorization'] = `Bearer ${accessToken}`;
  }
  return h;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { setUser: setUserContext } = useUser();
  // État principal
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [marketplaceItems, setMarketplaceItems] = useState<MarketplaceItem[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceMuted, setVoiceMuted] = useState(() => localStorage.getItem('julaba_voice_muted') === 'true');
  const toggleVoiceMuted = () => setVoiceMuted(prev => { const next = !prev; localStorage.setItem('julaba_voice_muted', String(next)); return next; });
  const [userInteracted, setUserInteracted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingText, setSpeakingText] = useState('');
  const [currentSession, setCurrentSession] = useState<DaySession | null>(null);
  const [isModalOpen, setIsModalOpenState] = useState(false);
  const [globalVoiceOpen, setGlobalVoiceOpen] = useState(false);
  const modalCountRef = React.useRef(0);
  const [appTitle, setAppTitleState] = useState('Jùlaba');
  const silentRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

  usePushNotifications(user?.id ?? null);

  // ═══════════════════════════════════════════════════════════════════
  // AUTHENTIFICATION & CHARGEMENT DONNÉES
  // ══════════════════════════════════════════════════════════════════

  // Charger les données utilisateur depuis API NestJS
  const loadUserData = async (userId: string, token: string) => {
    try {
      // Charger profil utilisateur via /auth/me (utilise le token JWT)
      const userResponse = await fetch(
        `${API_URL}/users/me`,
        {
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
        },
      );

      let finalUserResponse = userResponse;

      if (userResponse.status === 401) {
        // Token expiré → tenter refresh silencieux
        const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (refreshRes.ok) {
          const retryRes = await fetch(`${API_URL}/users/me`, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
          });
          if (!retryRes.ok) {
            setUser(null);
            setAccessToken(null);
            setLoading(false);
            return;
          }
          finalUserResponse = retryRes;
        } else {
          setUser(null);
          setAccessToken(null);
          setLoading(false);
          return;
        }
      }

      if (finalUserResponse.ok) {
        const userJson = await finalUserResponse.json();
        const userData = userJson.user || userJson;
        
        const mappedUser: User = {
          id: userData.id,
          phone: userData.phone,
          firstName: toProperCase(userData.firstName || userData.first_name || ''),
          lastName: userData.lastName || userData.last_name || '',
          prenoms: toProperCase(userData.firstName || userData.first_name || ''),
          genre: userData.genre || 'femme',
          pinSecurityEnabled: userData.pinSecurityEnabled || userData.pin_security_enabled || false,
          role: userData.role as UserRole,
          region: userData.region || '',
          commune: userData.commune || '',
          activity: userData.activity || '',
          market: userData.market,
          zoneId: userData.zoneId || userData.zone_id || '',
          cooperativeName: userData.cooperativeName || userData.cooperative_name,
          institutionName: userData.institutionName || userData.institution_name,
          score: userData.score || 0,
          createdAt: userData.createdAt || userData.created_at,
          validated: userData.validated || false,
          status: userData.status,
          email: userData.email,
          photo: userData.photoUrl || userData.photo_url,
          nin: userData.nin || '',
          nationalite: userData.nationalite || userData.nationality || 'Ivoirienne',
          situationMatrimoniale: userData.situationMatrimoniale || userData.situation_matrimoniale || '',
          numCNPS: userData.numCNPS || userData.num_cnps || '',
          numCMU: userData.numCMU || userData.num_cmu || '',
          recepisse: userData.recepisse || '',
          dateNaissance: userData.dateNaissance || userData.date_naissance || '',
          lieuNaissance: userData.lieuNaissance || userData.lieu_naissance || '',
          estMembreCooperative: userData.estMembreCooperative ?? userData.est_membre_cooperative ?? false,
          categorie: userData.categorie || undefined,
          boitePostale: userData.boitePostale || userData.boite_postale || '',
          statutEntrepreneur: userData.statutEntrepreneur || userData.statut_entrepreneur || '',
          typePointVente: userData.typePointVente || userData.type_point_vente || '',
          typePointVenteAutre: userData.typePointVenteAutre || userData.type_point_vente_autre || '',
          districtId: userData.districtId || userData.district_id || '',
          districtAutre: userData.districtAutre || userData.district_autre || '',
          regionId: userData.regionId || userData.region_id || '',
          regionAutre: userData.regionAutre || userData.region_autre || '',
          departementId: userData.departementId || userData.departement_id || '',
          departementAutre: userData.departementAutre || userData.departement_autre || '',
          communeId: userData.communeId || userData.commune_id || '',
          communeAutre: userData.communeAutre || userData.commune_autre || '',
          quartierVillage: userData.quartierVillage || userData.quartier_village || '',
          mustChangePassword: userData.mustChangePassword ?? userData.must_change_password ?? false,
          cni: userData.nin || '',
          sousProfilMarchand: userData.sousProfilMarchand ?? userData.sous_profil_marchand ?? null,
          cmu: userData.numCMU || userData.num_cmu || '',
          rsti: userData.recepisse || '',
          telephone2: userData.telephone2 || userData.phone2 || '',
          objectifMensuel: userData.objectifMensuel ?? userData.objectif_mensuel ?? null,
          primeObjectif: userData.primeObjectif ?? userData.prime_objectif ?? null,
        };

        // Résoudre le nom de la zone
        if (mappedUser.zoneId) {
          try {
            const zonesRes = await fetch(`${API_URL}/zones/public/${mappedUser.zoneId}`, {
              credentials: 'include' });
            if (zonesRes.ok) {
              const zoneData = await zonesRes.json();
              if (zoneData?.nom) mappedUser.zoneNom = zoneData.nom;
            }
          } catch (e: any) { console.warn('[AppContext] zone fetch failed:', e?.message); }
        }
        setUser(mappedUser);
        setUserContext(mappedUser);
        // Déclencher vérification alertes métier au login
        fetch(`${API_URL}/notifications/alertes/check-user`, {
          method: 'POST',
          credentials: 'include',
        }).catch((e: any) => { console.warn('[AppContext] alertes check-user failed:', e?.message); });
      }

      // Charger transactions
      const txResponse = await fetch(
        `${API_URL}/caisse/transactions`,
        {
          credentials: 'include',
          headers: caisseAuthHeaders(token),
        },
      );

      if (txResponse.ok) {
        const txJson = await txResponse.json();
        const txData = Array.isArray(txJson) ? txJson : (txJson.transactions || []);
        
        const mappedTx: Transaction[] = txData.map((tx: any) => ({
          id: tx.id,
          userId: tx.marchand_id || tx.user_id,
          type: tx.type,
          productName: tx.description || tx.produit || 'Depense',
          quantity: 1,
          price: Number(tx.montant) || 0,
          montant: Number(tx.montant) || 0,
          source: tx.source || 'kassa',
          category: tx.description ? tx.description.toLowerCase() : (tx.produit || '').toLowerCase(),
          details: tx.details || null,
          date: tx.created_at ? new Date(tx.created_at).toISOString() : new Date().toISOString(),
          paymentMethod: tx.mode_paiement,
          synced: true,
        }));


        setTransactions(mappedTx);
      }

      // Charger session du jour
      const today = new Date().toISOString().split('T')[0];
      const sessionResponse = await fetch(
        `${API_URL}/caisse/session/${today}`,
        {
          credentials: 'include',
          headers: caisseAuthHeaders(token),
        },
      );

      if (sessionResponse.ok) {
        const { session: sessionData } = await sessionResponse.json();
        if (sessionData) {
          setCurrentSession({
            id: sessionData.id,
            userId: sessionData.marchand_id,
            date: sessionData.date,
            fondInitial: Number(sessionData.fond_initial) || 0,
            opened: sessionData.ouvert,
            openedAt: sessionData.heure_ouverture,
            closedAt: sessionData.heure_fermeture,
            notes: sessionData.notes,
          });
        }
      }
    } catch (error: any) {
      console.warn('[AppContext] loadUserData failed:', error?.message);
    } finally {
      setLoading(false);
    }
  };

  // Vérifier session au démarrage via cookie httpOnly → /auth/me
  useEffect(() => {
    const checkSession = async () => {
      try {
        let res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });

        // Token expiré → tenter refresh silencieux
        if (res.status === 401) {
          const refreshRes = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
          });
          if (refreshRes.ok) {
            res = await fetch(`${API_URL}/auth/me`, { credentials: 'include' });
          }
        }

        if (res.ok) {
          const json = await res.json();
          const userData = json.user || json;

          const userDataMapped = {
            id: userData.id,
            phone: userData.phone || '',
            firstName: toProperCase(userData.firstName || userData.first_name || ''),
            prenoms: toProperCase(userData.firstName || userData.first_name || ''),
            lastName: userData.lastName || userData.last_name || '',
            role: normalizeRole(userData.role) as unknown as UserRole,
            region: userData.region || '',
            commune: userData.commune || '',
            activity: userData.activity || '',
            market: userData.market || '',
            zoneId: userData.zoneId || userData.zone_id || '',
            score: userData.score || 0,
            createdAt: userData.createdAt || '',
            validated: userData.validated || false,
            pinSecurityEnabled: userData.pinSecurityEnabled || userData.pin_security_enabled || false,
            objectifMensuel: userData.objectifMensuel ?? userData.objectif_mensuel ?? null,
            primeObjectif: userData.primeObjectif ?? userData.prime_objectif ?? null,
            sousProfilMarchand: userData.sousProfilMarchand ?? userData.sous_profil_marchand ?? null,
            mustChangePassword: !!(userData.mustChangePassword ?? userData.must_change_password),
          };
          // Détecter mustChangePassword AVANT de monter l'app (évite la cascade qui efface les cookies)
          const mustChange = !!(userData.mustChangePassword || userData.must_change_password);
          if (mustChange) {
            setSuspendRefresh(true);
            setUser(userDataMapped);
            setUserContext(userDataMapped);
            setAccessToken('cookie');
            setLoading(false);
            if (!window.location.pathname.includes('change-password')) {
              window.location.href = '/change-password';
            }
            return;
          }
          setSuspendRefresh(false);
          setUser(userDataMapped);
          setUserContext(userDataMapped);
          setAccessToken('cookie');
          await loadUserData(userData.id, 'cookie');
        } else {
          setLoading(false);
        }
      } catch (e: any) {
        console.warn('[AppContext] checkSession failed:', e?.message);
        setLoading(false);
      }
    };

    // Silent refresh automatique toutes les 13 minutes
    silentRefreshRef.current = setInterval(async () => {
      try {
        await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
      } catch { /* silencieux */ }
    }, 13 * 60 * 1000);

    checkSession();

    const handleTokenReady = () => { checkSession(); };
    window.addEventListener('julaba:token-ready', handleTokenReady);
    return () => {
      window.removeEventListener('julaba:token-ready', handleTokenReady);
      if (silentRefreshRef.current) {
        clearInterval(silentRefreshRef.current);
        silentRefreshRef.current = null;
      }
    };
  }, []);

  // Refresh JWT refusé (ex. token réutilisé) : purge localStorage / sessionStorage + logout serveur (cookies httpOnly)
  useEffect(() => {
    const onSessionExpired = () => {
      clearAuthClientState(API_URL);
      setUser(null);
      setUserContext(null);
      setAccessToken(null);
      setTransactions([]);
      setMarketplaceItems([]);
      setCurrentSession(null);
      setLoading(false);
    };
    window.addEventListener('julaba:session-expired', onSessionExpired);
    return () => window.removeEventListener('julaba:session-expired', onSessionExpired);
  }, []);

  // Rafraîchir données utilisateur
  const refreshUserData = async () => {
    if (user?.id && accessToken) {
      await loadUserData(user.id, accessToken);
    }
  };

  // Déconnexion
  const logout = async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } catch { /* silencieux — on continue la déconnexion locale */ }

    if (silentRefreshRef.current) {
      clearInterval(silentRefreshRef.current);
      silentRefreshRef.current = null;
    }

    setUser(null);
    setUserContext(null);
    setAccessToken(null);
    setTransactions([]);
    setMarketplaceItems([]);
    setCurrentSession(null);

    // Nettoyer uniquement les données non-sensibles
    localStorage.removeItem('julaba_user_data');
    localStorage.removeItem('julaba_voice_disabled');
  };

  const logoutRef = useRef(logout);
  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  // Force logout déclenché depuis EntryGate (rôle inconnu, état zombie post-auth)
  // Effectue logout serveur complet + nettoyage local
  useEffect(() => {
    const onForceLogout = () => {
      console.warn('[AppContext] julaba:force-logout received - logout forcé');
      void logoutRef.current();
    };
    window.addEventListener('julaba:force-logout', onForceLogout);
    return () => window.removeEventListener('julaba:force-logout', onForceLogout);
  }, []);

  // ═══════════════════════════════════════════════════════════════════
  // TANTIE SAGESSE - Synthèse vocale avec ElevenLabs
  // ═══════════════════════════════════════════════════════════════════
  
  const speak = async (text: string) => {
    if (!text?.trim()) return;
    if (user?.role !== 'marchand') return;
    if (voiceMuted) return;
    if (isSpeaking) return;
    const safeText = text.replace(/[<>]/g, "");
    stopChunkedSpeaking();
    setSpeakingText(safeText);
    setIsSpeaking(true);
    try {
      await speakChunked(safeText);
    } finally {
      setSpeakingText("");
      setIsSpeaking(false);
    }
  };

  // Activer la voix après la première interaction utilisateur
  useEffect(() => {
    const handleInteraction = () => {
      setUserInteracted(true);
      setVoiceEnabled(true);
    };
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { once: true });
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  // Synchroniser le flag voice_disabled selon le rôle utilisateur
  useEffect(() => {
    const disabledRoles = ['identificateur', 'institution'];
    if (!user || !user.role) {
      localStorage.removeItem('julaba_voice_disabled');
      return;
    }
    if (disabledRoles.includes(user.role as string)) {
      localStorage.setItem('julaba_voice_disabled', 'true');
    } else {
      localStorage.removeItem('julaba_voice_disabled');
    }
  }, [user?.id, user?.role]);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // speak('Connexion rétablie'); // désactivé — boucle audio
    };
    const handleOffline = () => {
      setIsOnline(false);
      // speak('Mode hors ligne'); // désactivé — boucle audio
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [voiceEnabled]);

  // ═══════════════════════════════════════════════════════════════════
  // TRANSACTIONS & MARKETPLACE
  // ════════════════════════════════════════════════��══════════════════

  const addTransaction = async (transaction: Omit<Transaction, 'id' | 'date'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
      date: new Date().toISOString(),
      synced: false,
    };
    
    setTransactions((prev) => [newTransaction, ...prev]);
    eventBus.emit(EVENTS.TRANSACTION_CREATED, newTransaction, { idempotencyKey: newTransaction.id, priority: 'high' });
    eventBus.emit(EVENTS.WALLET_UPDATED, { userId: newTransaction.userId }, { priority: 'high' });

    // Sync avec API si connecté
    if (accessToken && user) {
      const isDepense = transaction.type === 'depense';
      const endpoint = isDepense ? '/caisse/depense' : '/caisse/vente';
      const payload = isDepense
        ? {
            montant: transaction.price * transaction.quantity,
            description: transaction.productName || '',
            categorie: (transaction as any).category || 'autre',
            mode_paiement: transaction.paymentMethod || 'especes',
          }
        : {
            montant: (transaction as any).montant || transaction.price * transaction.quantity,
            produit: transaction.productName,
            produits: (transaction as any).produits || [{ nom: transaction.productName, quantite: transaction.quantity }],
            quantite: transaction.quantity,
            mode_paiement: transaction.paymentMethod,
            source: (transaction as any).source || 'kassa',
          };
      try {
        const res = await fetch(
          `${API_URL}${endpoint}`,
          {
            method: 'POST',
            credentials: 'include',
            headers: caisseAuthHeaders(accessToken),
            body: JSON.stringify(payload),
          }
        );
        // #6 : un POST en erreur (4xx/5xx) ne "réussissait" plus en silence.
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        // Marquer comme synchronisé
        setTransactions((prev) =>
          prev.map((tx) => (tx.id === newTransaction.id ? { ...tx, synced: true } : tx))
        );
        eventBus.emit(EVENTS.CAISSE_VENTE, { ...newTransaction, synced: true }, { idempotencyKey: newTransaction.id + '-synced', priority: 'high' });
      } catch (error: any) {
        // #6 : ne plus perdre la transaction -> file durable, rejeu à la reconnexion.
        console.warn('[AppContext] addTransaction sync failed, mise en file:', error?.message);
        try { await enfilerOperation(endpoint, payload); } catch (e) { void e; }
      }
    }
  };

  const addMarketplaceItem = (item: Omit<MarketplaceItem, 'id' | 'createdAt'>) => {
    const newItem: MarketplaceItem = {
      ...item,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setMarketplaceItems((prev) => [newItem, ...prev]);
    // FUTURE: sync /api/v1/caisse/produits
  };

  // ═══════════════════════════════════════════════════════════════════
  // SESSIONS JOURNALIÈRES
  // ═══════════════════════════════════════════════════════════════════

  const openDay = async (fondInitial: number, notes?: string) => {
    const newSession: DaySession = {
      id: Date.now().toString(),
      userId: user?.id || '',
      date: new Date().toISOString().split('T')[0],
      fondInitial,
      opened: true,
      openedAt: new Date().toISOString(),
      notes,
    };
    
    setCurrentSession(newSession);

    // Sync avec API
    if (accessToken) {
      try {
        await fetch(
          `${API_URL}/caisse/session/ouvrir`,
          {
            method: 'POST',
            credentials: 'include',
            headers: caisseAuthHeaders(accessToken),
            body: JSON.stringify({
              fond_initial: fondInitial,
              notes,
            }),
          }
        );
      } catch (error: any) {
        console.warn('[AppContext] openDay sync failed:', error?.message);
      }
    }
  };

  const closeDay = async (comptageReel: number, closingNotes?: string) => {
    if (!currentSession) return;

    const stats = getTodayStats();
    const caisseTheorique = currentSession.fondInitial + stats.ventes - stats.cahier;
    const ecart = comptageReel - caisseTheorique;

    const updatedSession: DaySession = {
      ...currentSession,
      opened: false,
      closedAt: new Date().toISOString(),
      comptageReel,
      ecart,
      closingNotes,
    };

    // Sync avec API
    if (accessToken) {
      try {
        await fetch(
          `${API_URL}/caisse/session/fermer`,
          {
            method: 'POST',
            credentials: 'include',
            headers: caisseAuthHeaders(accessToken),
            body: JSON.stringify({
              comptage_reel: comptageReel,
              notes: closingNotes,
            }),
          }
        );
      } catch (error: any) {
        console.warn('[AppContext] closeDay sync failed:', error?.message);
      }
    }
    
    setCurrentSession(null);
  };

  const updateFondInitial = async (newFond: number) => {
    if (!currentSession) return;

    const updatedSession: DaySession = {
      ...currentSession,
      fondInitial: newFond,
    };
    
    setCurrentSession(updatedSession);
    // FUTURE: sync /api/v1/users/profile
  };

  // ═══════════════════════════════════════════════════════════════════
  // STATISTIQUES & RAPPORTS
  // ═══════════════════════════════════════════════════════════════════

  const getTodayStats = () => {
    const today = new Date().toISOString().split('T')[0];
    const todayTransactions = transactions.filter(
      (t) => t.date.split('T')[0] === today
    );

    const ventesTransactions = todayTransactions.filter((t) => t.type === 'vente');
    
    const ventes = ventesTransactions.reduce((acc, t) => acc + (t.montant || t.price * t.quantity || 0), 0);
    const nombreVentes = ventesTransactions.length;

    const cahier = todayTransactions
      .filter((t) => t.type === 'depense')
      .reduce((acc, t) => acc + (t.montant || t.price * t.quantity || 0), 0);

    const caisse = (currentSession?.fondInitial || 0) + ventes - cahier;

    return { ventes, cahier, caisse, nombreVentes };
  };

  // Recharger les transactions depuis l'API — appelable depuis n'importe où
  const reloadTransactions = async () => {
    try {
      const txResponse = await fetch(
        `${API_URL}/caisse/transactions`,
        { credentials: 'include', headers: caisseAuthHeaders(accessToken) }
      );
      if (txResponse.ok) {
        const txJson = await txResponse.json();
        const txData = Array.isArray(txJson) ? txJson : (txJson.transactions || []);
        const mappedTx: Transaction[] = txData.map((tx: any) => ({
          id: tx.id,
          userId: tx.marchand_id || tx.user_id,
          type: tx.type,
          productName: tx.description || tx.produit || 'Depense',
          quantity: 1,
          price: Number(tx.montant) || 0,
          montant: Number(tx.montant) || 0,
          source: tx.source || 'kassa',
          details: tx.details || null,
          date: tx.created_at ? new Date(tx.created_at).toISOString() : new Date().toISOString(),
          paymentMethod: tx.mode_paiement,
          synced: true,
        }));
        setTransactions(mappedTx);
      }
    } catch (e: any) { console.warn('[AppContext] reloadTransactions failed:', e?.message); }
  };

  // Écouter les événements de vente depuis CaisseContext via eventBus
  useEffect(() => {
    const unsub1 = eventBus.subscribe(EVENTS.CAISSE_VENTE, () => { reloadTransactions(); });
    const unsub2 = eventBus.subscribe(EVENTS.TRANSACTION_CREATED, () => { reloadTransactions(); });
    return () => { unsub1?.(); unsub2?.(); };
  }, []);

  const getSalesHistory = (filters?: { startDate?: string; endDate?: string; productName?: string; paymentMethod?: string }) => {
    let filteredTransactions = transactions.filter((t) => t.type === 'vente');

    if (filters?.startDate) {
      filteredTransactions = filteredTransactions.filter((t) => new Date(t.date) >= new Date(filters.startDate));
    }
    if (filters?.endDate) {
      filteredTransactions = filteredTransactions.filter((t) => new Date(t.date) <= new Date(filters.endDate));
    }
    if (filters?.productName) {
      filteredTransactions = filteredTransactions.filter((t) => t.productName.toLowerCase().includes((filters.productName ?? '').toLowerCase()));
    }
    if (filters?.paymentMethod) {
      filteredTransactions = filteredTransactions.filter((t) => t.paymentMethod?.toLowerCase().includes((filters.paymentMethod ?? '').toLowerCase()));
    }

    return filteredTransactions;
  };

  const getFinancialSummary = (period: 'today' | '7days' | '30days' | 'custom', customStart?: string, customEnd?: string) => {
    let filteredTransactions = transactions;

    const today = new Date();
    const startDate = new Date(today);
    const endDate = new Date(today);

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '7days':
        startDate.setDate(today.getDate() - 6);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case '30days':
        startDate.setDate(today.getDate() - 29);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'custom':
        if (customStart && customEnd) {
          startDate.setTime(new Date(customStart).getTime());
          endDate.setTime(new Date(customEnd).getTime());
        }
        break;
    }

    filteredTransactions = filteredTransactions.filter((t) => new Date(t.date) >= startDate && new Date(t.date) <= endDate);

    const totalVentes = filteredTransactions
      .filter((t) => t.type === 'vente')
      .reduce((acc, t) => acc + (t.montant || t.price || 0), 0);

    const totalCahier = filteredTransactions
      .filter((t) => t.type === 'depense')
      .reduce((acc, t) => acc + (t.montant || t.price || 0), 0);

    const beneficeNet = totalVentes - totalCahier;

    const nombreVentes = filteredTransactions.filter((t) => t.type === 'vente').length;
    const nombreCahier = filteredTransactions.filter((t) => t.type === 'depense').length;

    const moyenneVente = nombreVentes > 0 ? totalVentes / nombreVentes : 0;

    const topProduits = filteredTransactions
      .filter((t) => t.type === 'vente')
      .reduce((acc, t) => {
        const existingProduct = acc.find((p) => p.productName === t.productName);
        if (existingProduct) {
          existingProduct.quantity += t.quantity;
          existingProduct.total += t.price * t.quantity;
        } else {
          acc.push({ productName: t.productName, quantity: t.quantity, total: t.price * t.quantity });
        }
        return acc;
      }, [] as { productName: string; quantity: number; total: number }[])
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      totalVentes,
      totalCahier,
      beneficeNet,
      nombreVentes,
      nombreCahier,
      moyenneVente,
      topProduits,
    };
  };

  // ═══════════════════════════════════════════════════════════════════
  // UI HELPERS
  // ═══════════════════════════════════════════════════════════════════

  const roleColor = user ? ROLE_COLORS[user.role] : '#C46210';

  // Double-tap global pour ouvrir Tata Nanti Lou
  useEffect(() => {
    let lastTap = 0;
    const handleDoubleTap = (e: TouchEvent) => {
      const now = Date.now();
      const timeDiff = now - lastTap;
      // Double-tap en moins de 300ms sur zone neutre (pas un bouton/input)
      const target = e.target as HTMLElement;
      const isInteractive = target.closest('button, input, textarea, select, a, [role="button"]');
      if (timeDiff < 300 && timeDiff > 0 && !isInteractive) {
        e.preventDefault();
        setGlobalVoiceOpen(true);
      }
      lastTap = now;
    };
    // Raccourci clavier : Alt+V sur desktop
    const handleKeyboard = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'v') {
        e.preventDefault();
        setGlobalVoiceOpen(prev => !prev);
      }
    };
    window.addEventListener('touchend', handleDoubleTap, { passive: false });
    window.addEventListener('keydown', handleKeyboard);
    return () => {
      window.removeEventListener('touchend', handleDoubleTap);
      window.removeEventListener('keydown', handleKeyboard);
    };
  }, []);

  const setIsModalOpen = (open: boolean) => {
    if (open) {
      modalCountRef.current += 1;
    } else {
      modalCountRef.current = Math.max(0, modalCountRef.current - 1);
    }
    setIsModalOpenState(modalCountRef.current > 0);
  };

  const setAppTitle = (title: string) => {
    setAppTitleState(title);
  };

  // ═══════════════════════════════════════════════════════════════════
  // CONTEXT VALUE
  // ═══════════════════════════════════════════════════════════════════

  const value: AppContextType = {
    user,
    setUser,
    isAuthenticated: !!user && !!accessToken,
    accessToken,
    setAccessToken,
    loading,
    transactions,
    addTransaction,
    reloadTransactions,
    marketplaceItems,
    addMarketplaceItem,
    isOnline,
    voiceEnabled,
    globalVoiceOpen,
    setGlobalVoiceOpen,
    setVoiceEnabled,
    speak,
    voiceMuted,
    toggleVoiceMuted,
    isSpeaking,
    speakingText,
    roleColor,
    isModalOpen,
    setIsModalOpen,
    setAppTitle,
    currentSession,
    openDay,
    closeDay,
    updateFondInitial,
    getTodayStats,
    getSalesHistory,
    getFinancialSummary,
    refreshUserData,
    logout,
  };


  // Auto-refresh polling
  useAutoRefresh({
    intervalMs: 30000,
    enabled: !!user?.id,
    debugLabel: "AppContext:stats",
    onRefresh: async () => {
      if (!user?.id) return;
      try {
        await reloadTransactions();
      } catch (e: any) {
        console.warn('[AppContext] autoRefresh failed:', e?.message);
      }
    },
  });

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    return {
      user: null,
      setUser: () => {},
      isAuthenticated: false,
      accessToken: null,
      setAccessToken: () => {},
      loading: false,
      transactions: [],
      addTransaction: () => {},
      reloadTransactions: async () => {},
      marketplaceItems: [],
      addMarketplaceItem: () => {},
      isOnline: true,
      voiceEnabled: false,
      globalVoiceOpen: false,
      setGlobalVoiceOpen: () => {},
      setVoiceEnabled: () => {},
      speak: () => {},
      voiceMuted: false,
      toggleVoiceMuted: () => {},
      isSpeaking: false,
      speakingText: '',
      roleColor: '#C46210',
      isModalOpen: false,
      setIsModalOpen: () => {},
      setAppTitle: () => {},
      currentSession: null,
      openDay: async () => {},
      closeDay: async () => {},
      updateFondInitial: async () => {},
      getTodayStats: () => ({ ventes: 0, cahier: 0, caisse: 0, nombreVentes: 0 }),
      getSalesHistory: () => [],
      getFinancialSummary: () => ({
        totalVentes: 0,
        totalCahier: 0,
        beneficeNet: 0,
        nombreVentes: 0,
        nombreCahier: 0,
        moyenneVente: 0,
        topProduits: [],
      }),
      refreshUserData: async () => {},
      logout: async () => {},
    } as AppContextType;
  }
  return {
    ...context,
    speak: typeof context.speak === 'function' ? context.speak : async () => {},
  };
}