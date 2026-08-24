/**
 * Client API — Studio Voix > Clonage (config des fournisseurs TTS, admin-only).
 * Backend : backend/src/voice/voice-config.controller.ts (JwtAuthGuard + RolesGuard).
 * La clé API n'est jamais transmise en lecture : `configured` + `keyLast4` seulement.
 */

import { apiRequest as _apiRequest, HttpError } from './api-client';
import { API_URL } from '../../utils/api';

function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return _apiRequest<T>(API_URL, endpoint, options);
}

export { HttpError };

export type VoiceProvider = 'elevenlabs' | 'azure_speech';

export interface VoiceConfigStatus {
  provider: VoiceProvider;
  configured: boolean;
  active: boolean;
  keyLast4: string | null;
  voiceName: string | null;
  azureRegion: string | null;
  updatedAt: string | null;
}

export interface VoiceConfigUpdatePayload {
  apiKey?: string;
  voiceName?: string;
  azureRegion?: string;
  setActive?: boolean;
}

export function fetchVoiceConfigStatus(): Promise<VoiceConfigStatus[]> {
  return apiRequest<VoiceConfigStatus[]>('/admin/voice-config');
}

export function updateVoiceConfig(provider: VoiceProvider, payload: VoiceConfigUpdatePayload): Promise<VoiceConfigStatus> {
  return apiRequest<VoiceConfigStatus>(`/admin/voice-config/${provider}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export function testVoiceConfig(provider: VoiceProvider): Promise<{ success: boolean; audio: string; phrase: string }> {
  return apiRequest<{ success: boolean; audio: string; phrase: string }>(`/admin/voice-config/${provider}/test`, {
    method: 'POST',
  });
}
