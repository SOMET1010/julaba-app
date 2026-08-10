/**
 * Client API Audit - JÙLABA
 */

import { apiRequest as _apiRequest } from './api-client';

import { API_URL } from '../app/utils/api';

function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return _apiRequest<T>(API_URL, endpoint, options);
}

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface AuditLog {
  id: string;
  user_id?: string;
  role?: string;
  action: string;
  description?: string;
  severity: 'info' | 'warning' | 'critical';
  entity_type?: string;
  entity_id?: string;
  metadata?: any;
  created_at: string;
}

export interface CreateAuditLogData {
  action: string;
  description?: string;
  severity?: 'info' | 'warning' | 'critical';
  entity_type?: string;
  entity_id?: string;
  metadata?: any;
}

// ─────────────���───────────────────────────────────────────────────────────────
// API FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Récupérer les logs d'audit (admin uniquement)
 */
export async function fetchAuditLogs(page = 1, limit = 50): Promise<{ logs: AuditLog[]; total?: number }> {
  return apiRequest<{ logs: AuditLog[]; total?: number }>(`/audit?page=${page}&limit=${limit}`);
}

/**
 * Créer un log d'audit
 */
export async function createAuditLog(data: CreateAuditLogData): Promise<{ log: AuditLog }> {
  return apiRequest<{ log: AuditLog }>('/audit', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}