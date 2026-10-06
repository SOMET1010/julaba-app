/**
 * JULABA — ModalPortal
 *
 * Composant infrastructure pour TOUS les modals.
 *
 * Responsabilités :
 *   1. Rendre le contenu via createPortal(children, document.body)
 *      → isole le stacking context, élimine tout conflit z-index local
 *   2. Enregistrer/désenregistrer automatiquement le modal dans ModalContext
 *      → BottomBar réagit instantanément
 *   3. Focus trap passif (le modal est au-dessus de tout par construction)
 *
 * Usage :
 *   <ModalPortal isOpen={isOpen}>
 *     <div className="fixed inset-0 z-[200] ...">
 *       ...
 *     </div>
 *   </ModalPortal>
 */

import React, { useEffect, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useModalRegister } from '../../contexts/ModalContext';

interface ModalPortalProps {
  /** État d'ouverture du modal */
  isOpen: boolean;
  /** Contenu du modal (backdrop + carte) */
  children: ReactNode;
}

export function ModalPortal({ isOpen, children }: ModalPortalProps) {
  // Enregistrement automatique dans le ModalContext
  useModalRegister(isOpen);

  if (!isOpen) return null;

  // Rendu dans document.body — hors de tout stacking context
  return createPortal(<>{children}</>, document.body);
}
