import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as zonesApi from '../../imports/zones-api';
import { DEV_MODE, devLog } from '../config/devMode';
import { NOT_AUTHENTICATED } from '../../imports/api-client';

export type ZoneType = 'marche' | 'village' | 'region';

export interface Zone {
  id: string;
  nom: string;
  type: ZoneType;
  nombreMarchands: number;
  nombreProducteurs: number;
  nombreIdentificateurs: number;
  region: string;
  commune?: string;
  createdAt: string;
  actif: boolean;
}

export interface ZoneStats {
  zoneId: string;
  zoneNom: string;
  totalIdentifications: number;
  identificationsEnAttente: number;
  identificationsValides: number;
  commissionsVersees: number;
  derniereMaj: string;
}

interface ZoneContextType {
  zones: Zone[];
  loading: boolean;
  error: string | null;
  addZone: (zone: Omit<Zone, 'id' | 'createdAt'>) => void;
  updateZone: (id: string, updates: Partial<Zone>) => void;
  deleteZone: (id: string) => void;
  getZoneById: (id: string) => Zone | undefined;
  getZonesByType: (type: ZoneType) => Zone[];
  getZonesByRegion: (region: string) => Zone[];
  getZoneStats: (zoneId: string) => ZoneStats | undefined;
  refreshZones: () => Promise<void>;
}

const ZoneContext = createContext<ZoneContextType | undefined>(undefined);

export function ZoneProvider({ children }: { children: ReactNode }) {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les zones depuis Supabase au démarrage
  const loadZones = async () => {
    if (DEV_MODE) {
      devLog('ZoneContext', 'Mode dev - skip API call');
      setLoading(false);
      return;
    }
    try {
      if (!zones?.length) setLoading(true);
      setError(null);
      const { zones: data } = await zonesApi.fetchZones();
      setZones(data);
    } catch (err: any) {
      if (err?.message === NOT_AUTHENTICATED) { setLoading(false); return; }
      setError(err instanceof Error ? err.message : 'Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadZones();
    const handler = () => { void loadZones(); };
    window.addEventListener('julaba:token-ready', handler);
    return () => window.removeEventListener('julaba:token-ready', handler);
  }, []);

  const refreshZones = async () => {
    await loadZones();
  };

  const addZone = (zoneData: Omit<Zone, 'id' | 'createdAt'>) => {
    const newZone: Zone = {
      ...zoneData,
      id: Date.now().toString(),
      createdAt: new Date().toISOString().split('T')[0],
    };
    setZones(prev => [...prev, newZone]);
  };

  const updateZone = (id: string, updates: Partial<Zone>) => {
    setZones(prev => prev.map(zone => 
      zone.id === id ? { ...zone, ...updates } : zone
    ));
  };

  const deleteZone = (id: string) => {
    setZones(prev => prev.filter(zone => zone.id !== id));
  };

  const getZoneById = (id: string) => {
    return zones.find(zone => zone.id === id);
  };

  const getZonesByType = (type: ZoneType) => {
    return zones.filter(zone => zone.type === type && zone.actif);
  };

  const getZonesByRegion = (region: string) => {
    return zones.filter(zone => zone.region === region && zone.actif);
  };

  const getZoneStats = (zoneId: string): ZoneStats | undefined => {
    const zone = getZoneById(zoneId);
    if (!zone) return undefined;

    return {
      zoneId: zone.id,
      zoneNom: zone.nom,
      totalIdentifications: zone.nombreMarchands + zone.nombreProducteurs,
      identificationsEnAttente: Math.floor((zone.nombreMarchands + zone.nombreProducteurs) * 0.15),
      identificationsValides: Math.floor((zone.nombreMarchands + zone.nombreProducteurs) * 0.85),
      commissionsVersees: (zone.nombreMarchands * 2000) + (zone.nombreProducteurs * 2500),
      derniereMaj: new Date().toISOString(),
    };
  };

  return (
    <ZoneContext.Provider
      value={{
        zones,
        loading,
        error,
        addZone,
        updateZone,
        deleteZone,
        getZoneById,
        getZonesByType,
        getZonesByRegion,
        getZoneStats,
        refreshZones,
      }}
    >
      {children}
    </ZoneContext.Provider>
  );
}

export function useZones() {
  const context = useContext(ZoneContext);
  if (!context) {
    throw new Error('useZones must be used within a ZoneProvider');
  }
  return context;
}