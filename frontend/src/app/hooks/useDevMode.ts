import { useState, useRef } from 'react';

/**
 * ── AUTH-10 (audit UI auth 05/10/2026) — LE MODE DÉVELOPPEUR, SORTI DE L'ÉCRAN ──
 *
 * LoginPassword portait le geste caché (5 tapes dans le coin haut-gauche) et
 * son état, noyés au milieu de la connexion. Le hook isole ce régiette :
 * l'écran ne consomme que `{ devMode, toggleDevMode }`. La persistance
 * (julaba_dev_mode) et le retour haptique restent identiques.
 *
 * Le drapeau `showDevButton` (ProfileSwitcher, numéros de test) reste dans
 * l'écran : il est allumé par D'AUTRES chemins (logo cliqué 5×, numéros dev)
 * qui n'ont rien à voir avec le geste des 5 tapes.
 */
export function useDevMode() {
  const [devMode, setDevMode] = useState<boolean>(() => {
    try { return import.meta.env.DEV || localStorage.getItem('julaba_dev_mode') === '1'; } catch { return false; }
  });
  const devTapRef = useRef<{ n: number; t: number }>({ n: 0, t: 0 });
  const toggleDevMode = () => {
    const now = Date.now();
    const s = devTapRef.current;
    s.n = (now - s.t < 600) ? s.n + 1 : 1;
    s.t = now;
    if (s.n >= 5) {
      s.n = 0;
      setDevMode((v) => {
        const nv = !v;
        try { localStorage.setItem('julaba_dev_mode', nv ? '1' : '0'); } catch { /* ignore */ }
        try { navigator.vibrate?.(nv ? [30, 40, 30] : 20); } catch { /* ignore */ }
        return nv;
      });
    }
  };
  return { devMode, toggleDevMode };
}
