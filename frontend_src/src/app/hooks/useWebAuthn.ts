import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser';
import { API_URL } from '../utils/api';

async function getConnectedUserPhone(): Promise<string | null> {
  try {
    const meRes = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!meRes.ok) return null;
    const meData = await meRes.json();
    return meData?.user?.phone ?? null;
  } catch {
    return null;
  }
}

export async function registerWebAuthn(): Promise<{ success: boolean; error?: string }> {
  try {
    const optRes = await fetch(`${API_URL}/auth/webauthn/register/options`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!optRes.ok) return { success: false, error: 'Erreur options' };
    const options = await optRes.json();
    const regResponse = await startRegistration({ optionsJSON: options });
    const verRes = await fetch(`${API_URL}/auth/webauthn/register/verify`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regResponse),
    });
    const verData = await verRes.json();
    return { success: verData.verified === true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function authenticateWebAuthn(phone: string): Promise<{ success: boolean; user?: any; error?: string }> {
  try {
    const optRes = await fetch(`${API_URL}/auth/webauthn/authenticate/options`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    if (!optRes.ok) return { success: false, error: 'Erreur options' };
    const { userId, ...options } = await optRes.json();
    const authResponse = await startAuthentication({ optionsJSON: options });
    const verRes = await fetch(`${API_URL}/auth/webauthn/authenticate/verify`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: authResponse, userId }),
    });
    const verData = await verRes.json();
    if (verData.verified) return { success: true, user: verData.user };
    return { success: false, error: 'Authentification échouée' };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

export async function verifyWebAuthnForKeiwa(): Promise<boolean> {
  try {
    const phone = await getConnectedUserPhone();
    if (!phone) return false;
    const optRes = await fetch(`${API_URL}/auth/webauthn/authenticate/options`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    if (!optRes.ok) return false;
    const { userId, ...options } = await optRes.json();
    const authResponse = await startAuthentication({ optionsJSON: options });
    const verRes = await fetch(`${API_URL}/auth/webauthn/authenticate/verify`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: authResponse, userId }),
    });
    const verData = await verRes.json();
    return verData.verified === true;
  } catch {
    return false;
  }
}
