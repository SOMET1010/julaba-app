import { useEffect, useState } from 'react';
import { getEffectiveMode, ACCESS_MODE_EVENT, type EffectiveMode } from '../utils/accessMode';

// ──────────────────────────────────────────────────────────────────────────
// Hook APP-WIDE du mode d'accès. N'IMPORTE QUEL écran (caisse, crédit, stock,
// paiements…) fait : `const mode = useAccessMode()` et présente la bonne interface.
// Se ré-adapte EN DIRECT quand le mode change (choix, apprentissage 'auto', autre
// onglet). C'est le socle unique de l'expérience adaptative de Julaba.
// ──────────────────────────────────────────────────────────────────────────
export function useAccessMode(): EffectiveMode {
  const [mode, setMode] = useState<EffectiveMode>(() => getEffectiveMode());
  useEffect(() => {
    const maj = () => setMode(getEffectiveMode());
    window.addEventListener(ACCESS_MODE_EVENT, maj);
    window.addEventListener('storage', maj); // changement depuis un autre onglet
    return () => {
      window.removeEventListener(ACCESS_MODE_EVENT, maj);
      window.removeEventListener('storage', maj);
    };
  }, []);
  return mode;
}
