import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { getConfortVisuel, setConfortVisuel, CONFORT_EVENT } from '../utils/confortVisuel';

// ─── Types ──────────────────────────────────────────────────────────────────

export type ThemeMode = 'manuel' | 'auto';

interface ThemeContextType {
  isDark: boolean;
  mode: ThemeMode;
  toggleDark: () => void;
  setMode: (m: ThemeMode) => void;
  setDark: (v: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

// ─── Helper : est-ce la nuit (18h-6h) ? ─────────────────────────────────────

function isNightTime(): boolean {
  const h = new Date().getHours();
  return h >= 18 || h < 6;
}

// ─── Provider ────────────────────────────────────────────────────────────────
// Depuis v5.0.0.14, le mode sombre est un des trois CONFORTS VISUELS
// (normal / soleil / sombre) arbitrés par utils/confortVisuel — SEUL ce
// module pose/retire les classes sur <html>, jamais deux modes à la fois.
// Ce contexte garde son API (isDark/toggleDark/mode auto 18h-6h) mais
// délègue toute l'application visuelle à l'arbitre.

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDarkState] = useState<boolean>(() => getConfortVisuel() === 'sombre');

  const [mode, setModeState] = useState<ThemeMode>(() => {
    try { return localStorage.getItem('julaba_theme_mode') === 'auto' ? 'auto' : 'manuel'; }
    catch { return 'manuel'; }
  });

  // Le bouton ☀️ de l'accueil (ou tout autre écran) peut changer le confort :
  // on se resynchronise sur l'événement de l'arbitre (soleil posé → sombre ôté).
  useEffect(() => {
    const sync = () => setIsDarkState(getConfortVisuel() === 'sombre');
    window.addEventListener(CONFORT_EVENT, sync);
    return () => window.removeEventListener(CONFORT_EVENT, sync);
  }, []);

  // Persister le mode (manuel / auto)
  useEffect(() => {
    try { localStorage.setItem('julaba_theme_mode', mode); } catch { /* ignore */ }
  }, [mode]);

  const setDark = useCallback((v: boolean) => {
    const actuel = getConfortVisuel();
    // Allumer le sombre remplace TOUT autre mode (exclusif) ; l'éteindre ne
    // rend le 'normal' que si le sombre était bien le mode en place — on ne
    // clobbe jamais un mode soleil choisi ailleurs.
    if (v && actuel !== 'sombre') setConfortVisuel('sombre');
    else if (!v && actuel === 'sombre') setConfortVisuel('normal');
    setIsDarkState(v);
  }, []);

  // Mode auto : vérifier chaque minute si on est entre 18h et 6h
  useEffect(() => {
    if (mode !== 'auto') return;
    setDark(isNightTime());
    const interval = setInterval(() => { setDark(isNightTime()); }, 60000);
    return () => clearInterval(interval);
  }, [mode, setDark]);

  const toggleDark = useCallback(() => {
    if (mode === 'auto') setModeState('manuel'); // un geste manuel reprend la main
    setDark(getConfortVisuel() !== 'sombre');
  }, [mode, setDark]);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    if (m === 'auto') setDark(isNightTime());
  }, [setDark]);

  return (
    <ThemeContext.Provider value={{ isDark, mode, toggleDark, setMode, setDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Fallback gracieux si utilisé hors du provider
    return {
      isDark: false,
      mode: 'manuel',
      toggleDark: () => {},
      setMode: () => {},
      setDark: () => {},
    };
  }
  return ctx;
}
