/**
 * JULABA — ModalContext
 *
 * Source de vérité unique pour l'état des modals dans toute l'application.
 *
 * Architecture :
 *   - Compteur de modals ouverts (modalCount) — supporte les modals imbriqués
 *   - isAnyModalOpen: boolean — dérivé du compteur
 *   - openModal() / closeModal() — API publique
 *   - Scroll body automatiquement bloqué / débloqué
 *   - BottomBar lit ce contexte pour se masquer
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModalContextType {
  /** Nombre de modals actuellement ouverts */
  modalCount: number;
  /** true si au moins un modal est ouvert */
  isAnyModalOpen: boolean;
  /** Appeler à l'ouverture d'un modal */
  openModal: () => void;
  /** Appeler à la fermeture d'un modal */
  closeModal: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ModalContext = createContext<ModalContextType>({
  modalCount: 0,
  isAnyModalOpen: false,
  openModal: () => {},
  closeModal: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modalCount, setModalCount] = useState(0);

  const openModal = useCallback(() => {
    setModalCount((c) => c + 1);
  }, []);

  const closeModal = useCallback(() => {
    setModalCount((c) => Math.max(0, c - 1));
  }, []);

  const isAnyModalOpen = modalCount > 0;

  // Bloquer / débloquer le scroll du body
  useEffect(() => {
    if (isAnyModalOpen) {
      const scrollY = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    } else {
      const scrollY = document.body.style.top;
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || '0') * -1);
      }
    }
  }, [isAnyModalOpen]);

  return (
    <ModalContext.Provider value={{ modalCount, isAnyModalOpen, openModal, closeModal }}>
      {children}
    </ModalContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useModal(): ModalContextType {
  return useContext(ModalContext);
}

/**
 * Hook utilitaire pour enregistrer / désenregistrer automatiquement
 * un modal dans le ModalContext selon son état isOpen.
 *
 * Usage (dans n'importe quel composant) :
 *   useModalRegister(isOpen);
 */
export function useModalRegister(isOpen: boolean) {
  const { openModal, closeModal } = useModal();

  useEffect(() => {
    if (isOpen) {
      openModal();
      return () => {
        closeModal();
      };
    }
  }, [isOpen, openModal, closeModal]);
}
