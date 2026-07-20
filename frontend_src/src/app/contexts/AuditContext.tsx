import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuditEvent, AuditAction, AuditEntityType } from '../types/julaba.types';
import * as auditApi from '../../imports/audit-api';
import { NOT_AUTHENTICATED } from '../../imports/api-client';

interface AuditContextType {
  events: AuditEvent[];
  logs: AuditEvent[]; // Alias de events pour compatibilite
  loading: boolean;
  
  logEvent: (
    userId: string,
    userRole: 'marchand' | 'producteur' | 'cooperative' | 'identificateur' | 'institution',
    userName: string,
    action: AuditAction,
    entityType: AuditEntityType,
    entityId: string,
    metadata?: Record<string, any>,
    geolocation?: { latitude: number; longitude: number }
  ) => Promise<void>;
  
  getEventsByUser: (userId: string) => AuditEvent[];
  getEventsByEntity: (entityType: AuditEntityType, entityId: string) => AuditEvent[];
  getEventsByAction: (action: AuditAction) => AuditEvent[];
  getRecentEvents: (limit?: number) => AuditEvent[];
  
  exportAuditTrail: (userId?: string, startDate?: string, endDate?: string) => AuditEvent[];
  
  refreshAuditLogs: () => Promise<void>;
}

const AuditContext = createContext<AuditContextType | undefined>(undefined);

export function AuditProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(false);

  // Charger les logs d'audit depuis Supabase
  const loadAuditLogs = async () => {
    try {
      if (!audits?.length) setLoading(true);
      const { logs } = await auditApi.fetchAuditLogs(1, 50);
      
      const eventsList: AuditEvent[] = logs.map((log: any) => ({
        id: log.id,
        timestamp: log.created_at,
        userId: log.user_id || '',
        userRole: log.role as any,
        userName: log.user_id || 'System',
        action: log.action as AuditAction,
        entityType: log.entity_type as AuditEntityType,
        entityId: log.entity_id || '',
        metadata: log.metadata || {},
        geolocation: undefined,
        deviceInfo: '',
      }));

      setEvents(eventsList);
    } catch (error: any) {
      if (error?.message === NOT_AUTHENTICATED) return;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, []);

  const refreshAuditLogs = async () => {
    await loadAuditLogs();
  };

  // Logger un événement
  const logEvent = async (
    userId: string,
    userRole: 'marchand' | 'producteur' | 'cooperative' | 'identificateur' | 'institution',
    userName: string,
    action: AuditAction,
    entityType: AuditEntityType,
    entityId: string,
    metadata: Record<string, any> = {},
    geolocation?: { latitude: number; longitude: number }
  ) => {
    const event: AuditEvent = {
      id: `AUD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      userId,
      userRole,
      userName,
      action,
      entityType,
      entityId,
      metadata,
      geolocation,
      deviceInfo: navigator.userAgent,
    };

    // Ajouter localement
    setEvents([event, ...events]);

    // Sauvegarder dans Supabase
    try {
      await auditApi.createAuditLog({
        action,
        description: `${action} on ${entityType} ${entityId}`,
        severity: 'info',
        entity_type: entityType,
        entity_id: entityId,
        metadata: {
          ...metadata,
          geolocation,
          deviceInfo: navigator.userAgent,
        },
      });
    } catch (error) {
    }
  };

  // Récupération par utilisateur
  const getEventsByUser = (userId: string): AuditEvent[] => {
    return events.filter(e => e.userId === userId);
  };

  // Récupération par entité
  const getEventsByEntity = (entityType: AuditEntityType, entityId: string): AuditEvent[] => {
    return events.filter(e => e.entityType === entityType && e.entityId === entityId);
  };

  // Récupération par action
  const getEventsByAction = (action: AuditAction): AuditEvent[] => {
    return events.filter(e => e.action === action);
  };

  // Événements récents
  const getRecentEvents = (limit: number = 50): AuditEvent[] => {
    return events.slice(0, limit);
  };

  // Export audit trail
  const exportAuditTrail = (
    userId?: string,
    startDate?: string,
    endDate?: string
  ): AuditEvent[] => {
    let filtered = events;

    if (userId) {
      filtered = filtered.filter(e => e.userId === userId);
    }

    if (startDate) {
      filtered = filtered.filter(e => e.timestamp >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter(e => e.timestamp <= endDate);
    }

    return filtered;
  };

  const value: AuditContextType = {
    events,
    logs: events, // Alias de events pour compatibilite
    loading,
    logEvent,
    getEventsByUser,
    getEventsByEntity,
    getEventsByAction,
    getRecentEvents,
    exportAuditTrail,
    refreshAuditLogs,
  };

  return <AuditContext.Provider value={value}>{children}</AuditContext.Provider>;
}

export function useAudit() {
  const context = useContext(AuditContext);
  if (context === undefined) {
    throw new Error('useAudit doit être utilisé dans un AuditProvider');
  }
  return context;
}