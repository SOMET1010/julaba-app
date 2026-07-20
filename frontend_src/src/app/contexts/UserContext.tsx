import { normalizeRole, UserRoleUI } from '../types/constants';
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import type { User } from './AppContext';
import { useApp } from './AppContext';
import { API_URL } from '../utils/api';

export interface UserData {
  id?: string;
  nom: string;
  prenoms: string;
  genre?: string;
  telephone: string;
  telephone2?: string;
  email: string;
  localisation: string;
  typeActivite: string;
  dateInscription: string;
  numeroMarchand: string;
  statut: string;
  scoreCredit: number;
  niveauMembre: string;
  role: UserRoleUI;
  market?: string; // Marché assigné pour identificateur/marchand
  zoneId?: string;
  zoneNom?: string;
  photo?: string;
  dateNaissance?: string;
  nationalite?: string;
  commune?: string;
  region?: string;
  cni?: string;
  cmu?: string;
  rsti?: string;
  categorie?: string;
  recepisse?: string;
  boitePostale?: string;
  lieuNaissance?: string;
  situationMatrimoniale?: string;
  numCNPS?: string;
  numCMU?: string;
  nin?: string;
  statutEntrepreneur?: string;
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
  estMembreCooperative?: boolean;
  // Paramètres de sécurité
  pinSecurityEnabled?: boolean; // PIN activé pour les paiements Wallet
  pinCode?: string; // Code PIN à 4 chiffres (hashé en production)
  preferences?: Record<string, boolean | string | number>;
}

interface UserContextType {
  user: UserData | null;
  setUser: (user: UserData | User | null) => void;
  updateUser: (updates: Partial<UserData>) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

const STORAGE_KEY = 'julaba_user_data';

// Default user data
const DEFAULT_USER: UserData = {
  nom: '',
  prenoms: '',
  genre: 'femme',
  telephone: '',
  telephone2: '',
  email: '',
  localisation: '',
  typeActivite: '',
  dateInscription: '',
  numeroMarchand: '',
  statut: '',
  scoreCredit: 0,
  niveauMembre: 'Bronze',
  role: UserRoleUI.MARCHAND,
  dateNaissance: '',
  nationalite: 'Ivoirienne',
  commune: '',
  cni: '',
  cmu: '',
  rsti: '',
  categorie: '',
  recepisse: '',
  boitePostale: '',
};

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<UserData | null>(null);
  const { user: appUser } = useApp();
  // Pas de persistance localStorage — session gérée via cookie httpOnly

  // Synchroniser automatiquement avec AppContext.user (source de vérité)
  useEffect(() => {
    if (!appUser) {
      setUserState(null);
      return;
    }
    setUserState({
      id: appUser.id,
      nom: (appUser.lastName || '').toUpperCase(),
      prenoms: appUser.firstName || '',
      genre: (appUser as any).genre || 'femme',
      telephone: appUser.phone || '',
      telephone2: (appUser as any).telephone2 || '',
      email: (appUser as any).email || '',
      localisation: [appUser.commune, appUser.region].filter(Boolean).join(', ') || '',
      typeActivite: appUser.activity || '',
      dateInscription: appUser.createdAt || '',
      numeroMarchand: 'JLB-' + (appUser.role || 'USR').toUpperCase().slice(0, 3) + '-' + (appUser.createdAt || '2026').split('-')[0] + '-' + (appUser.id || '00000').slice(-5),
      statut: appUser.validated ? 'Vérifié' : 'En attente',
      scoreCredit: (appUser.score || 0) * 10,
      niveauMembre: (appUser.score || 0) >= 90 ? 'Platinum' : (appUser.score || 0) >= 80 ? 'Gold' : (appUser.score || 0) >= 70 ? 'Silver' : 'Bronze',
      role: appUser.role as any,
      market: appUser.market,
      zoneId: appUser.zoneId || (appUser as any).zone_id || '',
      zoneNom: (appUser as any).zoneNom || '',
      photo: (appUser as any).photo || (appUser as any).photoUrl || '',
      dateNaissance: (appUser as any).dateNaissance || '',
      nationalite: (appUser as any).nationalite || 'Ivoirienne',
      commune: appUser.commune || '',
      region: appUser.region || '',
      cni: (appUser as any).cni || '',
      cmu: (appUser as any).cmu || '',
      rsti: (appUser as any).rsti || '',
      categorie: (appUser as any).categorie || undefined,
      recepisse: (appUser as any).recepisse || '',
      boitePostale: (appUser as any).boitePostale || '',
      lieuNaissance: (appUser as any).lieuNaissance || '',
      situationMatrimoniale: (appUser as any).situationMatrimoniale || '',
      numCNPS: (appUser as any).numCNPS || '',
      numCMU: (appUser as any).numCMU || '',
      nin: (appUser as any).nin || '',
      statutEntrepreneur: (appUser as any).statutEntrepreneur || '',
      typePointVente: (appUser as any).typePointVente || '',
      typePointVenteAutre: (appUser as any).typePointVenteAutre || '',
      districtId: (appUser as any).districtId || '',
      districtAutre: (appUser as any).districtAutre || '',
      regionId: (appUser as any).regionId || '',
      regionAutre: (appUser as any).regionAutre || '',
      departementId: (appUser as any).departementId || '',
      departementAutre: (appUser as any).departementAutre || '',
      communeId: (appUser as any).communeId || '',
      communeAutre: (appUser as any).communeAutre || '',
      quartierVillage: (appUser as any).quartierVillage || '',
      estMembreCooperative: !!(appUser as any).estMembreCooperative,
      preferences: (appUser as any).preferences || {},
      pinSecurityEnabled: !!(appUser as any).pinSecurityEnabled,
    });
  }, [appUser?.id, appUser?.firstName, appUser?.lastName, appUser?.phone, appUser?.role]);

  const setUser = (userData: UserData | User | null) => {
    // Handle null (logout case)
    if (userData === null) {
      setUserState(null);
      return;
    }

    // Check if it's a User from AppContext
    if ('firstName' in userData && 'lastName' in userData) {
      // Convert User to UserData
      const convertedUser: UserData = {
        id: userData.id,
        nom: userData.lastName.toUpperCase(),
        prenoms: userData.firstName,
        genre: userData.genre || 'femme',
        telephone: userData.phone || '',
        email: `${userData.firstName.toLowerCase()}.${userData.lastName.toLowerCase()}@julaba.ci`,
        localisation: [userData.commune, userData.region].filter(Boolean).join(', ') || '',
        typeActivite: userData.activity,
        dateInscription: userData.createdAt,
        numeroMarchand: `JLB-${(userData.role || 'USR').toUpperCase().slice(0, 3)}-${(userData.createdAt || '2026').split('-')[0]}-${(userData.id || '00000').slice(-5)}`,
        statut: userData.validated ? 'Vérifié' : 'En attente',
        scoreCredit: (userData.score || 0) * 10, // Convert score to credit score
        niveauMembre: userData.score >= 90 ? 'Platinum' : userData.score >= 80 ? 'Gold' : userData.score >= 70 ? 'Silver' : 'Bronze',
        role: userData.role,
        market: userData.market, // Conserver le marché
        zoneId: userData.zoneId || (userData as any).zone_id || '',
        zoneNom: userData.zoneNom || '',
        photo: (userData as any).photo || (userData as any).photoUrl || '',
        dateNaissance: (userData as any).dateNaissance || '',
        nationalite: (userData as any).nationalite || 'Ivoirienne',
        commune: userData.commune || '',
        region: (userData as any).region || '',
        cni: (userData as any).cni || '',
        cmu: (userData as any).cmu || '',
        rsti: (userData as any).rsti || '',
        telephone2: (userData as any).telephone2 || '',
        categorie: (userData as any).categorie || undefined,
        recepisse: (userData as any).recepisse || '',
        boitePostale: (userData as any).boitePostale || '',
        lieuNaissance: (userData as any).lieuNaissance || '',
        situationMatrimoniale: (userData as any).situationMatrimoniale || '',
        numCNPS: (userData as any).numCNPS || '',
        numCMU: (userData as any).numCMU || '',
        nin: (userData as any).nin || '',
        statutEntrepreneur: (userData as any).statutEntrepreneur || '',
        typePointVente: (userData as any).typePointVente || '',
        typePointVenteAutre: (userData as any).typePointVenteAutre || '',
        districtId: (userData as any).districtId || '',
        districtAutre: (userData as any).districtAutre || '',
        regionId: (userData as any).regionId || '',
        regionAutre: (userData as any).regionAutre || '',
        departementId: (userData as any).departementId || '',
        departementAutre: (userData as any).departementAutre || '',
        communeId: (userData as any).communeId || '',
        communeAutre: (userData as any).communeAutre || '',
        quartierVillage: (userData as any).quartierVillage || '',
        estMembreCooperative: !!(userData as any).estMembreCooperative,
        preferences: (userData as any).preferences || {},
        pinSecurityEnabled: !!(userData as any).pinSecurityEnabled,
      };
      setUserState(convertedUser);
    } else {
      setUserState(userData as UserData);
    }
  };

  const updateUser = async (updates: Partial<UserData>) => {
    if (user) {
      setUserState({ ...user, ...updates });
      // Persister en BD
      try {
        await fetch(`${API_URL}/users/${user.id}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });
      } catch (e) { void e; }
    }
  };

  const logout = () => {
    setUserState(null);
    window.location.href = '/';
  };

  return (
    <UserContext.Provider value={{ user, setUser, updateUser, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    // En développement, retourner des valeurs par défaut au lieu de crasher
    return {
      user: null,
      setUser: () => {},
      updateUser: () => {},
      logout: () => {},
    } as UserContextType;
  }
  return context;
}