import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

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

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const stored = localStorage.getItem('julaba_dark_mode');
    if (stored !== null) return stored === 'true';
    return false;
  });

  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem('julaba_theme_mode');
    return (stored === 'auto' ? 'auto' : 'manuel') as ThemeMode;
  });

  // Appliquer la classe .dark sur <html>
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('julaba_dark_mode', String(isDark));
  }, [isDark]);

  // Persister le mode
  useEffect(() => {
    localStorage.setItem('julaba_theme_mode', mode);
  }, [mode]);

  // Mode auto : verifier toutes les minutes si on est entre 18h et 6h
  useEffect(() => {
    if (mode !== 'auto') return;
    // Appliquer immediatement
    setIsDark(isNightTime());
    const interval = setInterval(() => {
      setIsDark(isNightTime());
    }, 60000); // verifier chaque minute
    return () => clearInterval(interval);
  }, [mode]);

  const toggleDark = useCallback(() => {
    if (mode === 'auto') {
      // Passer en mode manuel quand l'utilisateur toggle manuellement
      setModeState('manuel');
    }
    setIsDark(prev => !prev);
  }, [mode]);

  const setDark = useCallback((v: boolean) => {
    setIsDark(v);
  }, []);

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    if (m === 'auto') {
      setIsDark(isNightTime());
    }
  }, []);

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
    // Fallback gracieux si utilise hors du provider
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
