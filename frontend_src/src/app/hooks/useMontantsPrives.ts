import { useSyncExternalStore } from 'react';

const CLE = 'julaba_montants_masques';
export const MONTANTS_PRIVES_EVENT = 'julaba:montants-prives';

function lire(): boolean {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(CLE) === '1';
}

function souscrire(notifier: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const sync = () => notifier();
  window.addEventListener(MONTANTS_PRIVES_EVENT, sync);
  window.addEventListener('storage', sync);
  return () => {
    window.removeEventListener(MONTANTS_PRIVES_EVENT, sync);
    window.removeEventListener('storage', sync);
  };
}

export function setMontantsMasques(masques: boolean): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(CLE, masques ? '1' : '0');
  window.dispatchEvent(new Event(MONTANTS_PRIVES_EVENT));
}

export function useMontantsPrives() {
  const montantsMasques = useSyncExternalStore(souscrire, lire, () => false);
  return {
    montantsMasques,
    setMontantsMasques,
    basculerMontants: () => setMontantsMasques(!montantsMasques),
  };
}

export function montantPrive(montant: number, masques: boolean, unite = 'F'): string {
  if (masques) return `••••• ${unite}`;
  return `${Math.round(montant).toLocaleString('fr-FR')} ${unite}`;
}
