import { useApp } from './AppContext';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import * as audioManager from '../services/audioManager';
import { nextObjectifAlert } from './objectifAlerts';
import { API_URL } from '../utils/api';
import { creerSpeakMessage } from '../i18n/voice/speakMessage';

/**
 * VOIX-09 — le montant passe par le CATALOGUE, plus par `toLocaleString`.
 *
 * La phrase était composée à la main : `${montant.toLocaleString('fr-FR')}`
 * glisse une espace fine insécable (U+202F) dans « 2 000 », la synthèse reçoit
 * un nombre coupé et l'épelle — « 2 zéro zéro zéro ». C'était le dernier site
 * du défaut #4 relevé au terrain le 23/09.
 *
 * ON GARDE LE CANAL EXACT. `audioManager.speak(..., { priority: 'user' })` est
 * conservé tel quel : seule la fabrication du texte change. Passer par
 * `useSpeakMessage` aurait emprunté le `speak` du contexte applicatif et donc
 * changé la priorité, ce que rien ne demandait.
 */
const direObjectif = creerSpeakMessage((texte) => { audioManager.speak(texte, { priority: 'user' }); });
const direObjectif80 = creerSpeakMessage((texte) => {
  audioManager.speakAuto(texte, { dedupeKey: 'objectif-80', minRepeatMs: 5 * 60 * 1000 });
});

interface ObjectifState {
  objectif: number;
  alerte50: boolean;
  alerte80: boolean;
  date: string;
}

interface ObjectifContextType {
  objectif: number;
  progression: number; // 0-100
  setObjectif: (montant: number) => Promise<void>;
  refresh: () => Promise<void>;
  loading: boolean;
}

const ObjectifContext = createContext<ObjectifContextType | null>(null);

export function ObjectifProvider({ children, ventes }: { children: React.ReactNode; ventes: number }) {
  const [state, setState] = useState<ObjectifState>({ objectif: 0, alerte50: false, alerte80: false, date: '' });
  const [loading, setLoading] = useState(false);
  const ventesRef = useRef(ventes);
  ventesRef.current = ventes;
  // Base pour détecter un FRANCHISSEMENT (et non la simple hydratation de l'état).
  const prevPctRef = useRef<number | null>(null);
  const prevObjectifRef = useRef<number | null>(null);


  const headers = () => ({ 'Content-Type': 'application/json' });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/objectifs/today`, { credentials: 'include', headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setState(data);
      }
    } catch (e) { void e; }
  }, []);

  const { user: appUser } = useApp();
  useEffect(() => { if (appUser?.id) refresh(); }, [appUser?.id]);

  // Alertes d'objectif : UNIQUEMENT sur un franchissement ASCENDANT pendant la
  // session — jamais à l'hydratation (chargement de l'état), ni à un changement
  // d'objectif. Cf. objectifAlerts.ts (logique pure, testée).
  useEffect(() => {
    if (!state.objectif || state.objectif === 0) {
      prevPctRef.current = null;
      prevObjectifRef.current = state.objectif;
      return;
    }
    const pct = (ventes / state.objectif) * 100;

    // Hydratation initiale OU objectif qui vient de changer → on pose la base sans
    // annoncer (distingue « état chargé » d'un « vrai franchissement »).
    if (prevObjectifRef.current !== state.objectif || prevPctRef.current === null) {
      prevObjectifRef.current = state.objectif;
      prevPctRef.current = pct;
      return;
    }

    const prev = prevPctRef.current;
    prevPctRef.current = pct;

    const alert = nextObjectifAlert(prev, pct, state.alerte50, state.alerte80);
    if (alert === 'p50') {
      audioManager.speakAuto(`Félicitations ! Tu as atteint 50% de ton objectif. Continue ma chère, tu es sur la bonne voie !`, { dedupeKey: 'objectif-50', minRepeatMs: 5 * 60 * 1000 });
      setState(s => ({ ...s, alerte50: true }));
      fetch(`${API_URL}/objectifs/alerte`, { method: 'PATCH', credentials: 'include', headers: headers(), body: JSON.stringify({ alerte50: true }) });
    } else if (alert === 'p80') {
      // VOIX-09 — ce montant aussi partait brut. Même canal (`speakAuto` et sa
      // déduplication), seule la fabrication du texte change.
      direObjectif80('OBJECTIF_80', { montant: Math.round(state.objectif - ventes) });
      setState(s => ({ ...s, alerte80: true }));
      fetch(`${API_URL}/objectifs/alerte`, { method: 'PATCH', credentials: 'include', headers: headers(), body: JSON.stringify({ alerte80: true }) });
    } else if (alert === 'p100') {
      audioManager.speakAuto(`Incroyable ! Tu as atteint ton objectif du jour ! Tu es trop forte ma chère !`, { dedupeKey: 'objectif-100', minRepeatMs: 10 * 60 * 1000 });
    }
  }, [ventes, state.objectif]);

  const setObjectif = useCallback(async (montant: number) => {
    if (!state.objectif) setLoading(true);
    try {
      const res = await fetch(`${API_URL}/objectifs/today`, {
        method: 'POST',
        credentials: 'include',
        headers: headers(),
        body: JSON.stringify({ objectif: montant }),
      });
      if (res.ok) {
        const data = await res.json();
        setState(data);
        direObjectif('OBJECTIF_FIXE', { montant });
      }
    } catch (e) { void e; }
    setLoading(false);
  }, []);

  const progression = state.objectif > 0 ? Math.min((ventes / state.objectif) * 100, 100) : 0;

  return (
    <ObjectifContext.Provider value={{ objectif: state.objectif, progression, setObjectif, refresh, loading }}>
      {children}
    </ObjectifContext.Provider>
  );
}

export function useObjectif() {
  const ctx = useContext(ObjectifContext);
  if (!ctx) return { objectif: 0, progression: 0, setObjectif: async () => {}, refresh: async () => {}, loading: false };
  return ctx;
}
