/**
 * 🪟 JULABA SHARED MODAL
 *
 * Composant modal unifié pour tous les rôles.
 * Basé sur le Design System Marchand.
 *
 * A11Y-001, pas 2 (29/10) — LE SOCLE EST RADIX DIALOG. Le pas 1 (2bc2ed66)
 * posait la sémantique du dialogue à la main : role=dialog, aria-modal,
 * titre/description associés, Fermer nommé, ESC, focus aller/retour — mais
 * le TRAP du Tab (cycler DANS le dialogue) restait à inventer. La règle du
 * plan était claire : il vient avec l'adoption Radix, PAS réinventé à la
 * main — un piège maison de plus serait le défaut lui-même. Radix apporte
 * aussi ce que le pas 1 faisait à la main : ESC, focus initial, retour au
 * déclencheur, portail — le code fait-maison part avec eux.
 *
 * Ce qui reste NÔTRE, sans changement :
 *  - le contrat ModalContext (useModalRegister) : la BottomBar se masque
 *    et le scroll du body se bloque — Radix ne connaît pas ce contrat ;
 *  - l'API publique (isOpen, onClose, title, description, footer, size,
 *    disableBackdropClick, hideCloseButton, className, cardStyle,
 *    fullHeight) — aucun consommateur ne change ;
 *  - le rendu : mêmes classes, mêmes tokens (Z_INDEX, MOTION.spring),
 *    mêmes animations motion/react (pattern forceMount + AnimatePresence,
 *    déjà en production dans UniversalModalBO).
 *
 * Contrats affinés, dits ici pour ne pas être découverts plus tard :
 *  - disableBackdropClick garde SON contrat : il interdit TOUTES les
 *    fermetures non explicites — backdrop ET Escape (preventDefault sur
 *    les deux événements Radix). Le bouton Fermer reste explicite, il
 *    ferme toujours.
 *  - Le clic sur les MARGES autour de la carte ferme désormais le
 *    dialogue (standard Radix : tout pointerdown hors du Content) —
 *    l'ancien conteneur les absorbait en silence. Les deux usages actuels
 *    passent disableBackdropClick=false : aucune fermeture accidentelle
 *    n'était protégée de toute façon.
 *  - Un dialogue sans `title` doit passer `ariaLabel` : Radix exige un
 *    nom accessible et le warn sinon. Le warning Radix est un GARDE
 *    voulu — il signale exactement le trou que le pas 1 laissait passer
 *    (aria-labelledby undefined).
 */

import React, { useId, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { MOTION, Z_INDEX } from '../../styles/design-tokens';
import { cn } from '../ui/utils';
import { useModalRegister } from '../../contexts/ModalContext';

export interface SharedModalProps {
  /** État d'ouverture */
  isOpen: boolean;

  /** Callback de fermeture */
  onClose: () => void;

  /** Titre du modal */
  title?: string;

  /** Description */
  description?: string;

  /** Contenu du modal */
  children: React.ReactNode;

  /** Footer (actions) */
  footer?: React.ReactNode;

  /** Taille du modal */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';

  /** Désactiver la fermeture au clic backdrop */
  disableBackdropClick?: boolean;

  /** Désactiver le bouton close */
  hideCloseButton?: boolean;

  /** Classes additionnelles */
  className?: string;

  /** Style inline pour la carte du modal */
  cardStyle?: React.CSSProperties;

  /**
   * Mode plein-écran : la carte s'étire jusqu'au bord, le body n'a
   * plus de padding ni de max-height propre — le contenu gère lui-même.
   */
  fullHeight?: boolean;

  /**
   * Nom accessible du dialogue quand aucun `title` n'est rendu
   * (Radix exige un nom : Title visible OU aria-label). Fidèle au
   * contenu : c'est LE nom que le lecteur d'écran annonce.
   */
  ariaLabel?: string;
}

export function SharedModal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  disableBackdropClick = false,
  hideCloseButton = false,
  className,
  cardStyle,
  fullHeight = false,
  ariaLabel,
}: SharedModalProps) {
  // Contrat CONSERVÉ : l'enregistrement dans ModalContext (compteur →
  // BottomBar se masque, scroll du body bloqué). Radix ne le connaît pas.
  useModalRegister(isOpen);

  // Sémantique de dialogue : les ids de titre et de description sont
  // branchés à la main (pattern UniversalModalBO) — les props explicites
  // du child priment sur les défauts du Slot Radix, donc le cas SANS
  // titre reste sans aria-labelledby dangling (comportement du pas 1).
  const idTitre = useId();
  const idDescription = useId();
  const carteRef = useRef<HTMLDivElement>(null);

  // Classes de taille
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  }[size];

  return (
    <DialogPrimitive.Root
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <AnimatePresence>
        {isOpen && (
          <DialogPrimitive.Portal forceMount>
            {/* Backdrop — mêmes classes et z-index que le fait-maison */}
            <DialogPrimitive.Overlay forceMount asChild>
              <motion.div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                style={{ zIndex: Z_INDEX.modalBackdrop }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            </DialogPrimitive.Overlay>

            {/* Conteneur de centrage — le même div qu'avant la refonte */}
            <div
              className={cn(
                'fixed inset-0 flex items-center justify-center overflow-y-auto',
                fullHeight ? 'p-2' : 'p-4'
              )}
              style={{ zIndex: Z_INDEX.modal }}
            >
              <DialogPrimitive.Content
                forceMount
                asChild
                aria-label={title ? undefined : ariaLabel}
                aria-labelledby={title ? idTitre : undefined}
                aria-describedby={description ? idDescription : undefined}
                onEscapeKeyDown={(event) => {
                  // Le même contrat que le pas 1 : disableBackdropClick
                  // interdit TOUTES les fermetures non explicites, le
                  // clavier compris.
                  if (disableBackdropClick) event.preventDefault();
                }}
                onOpenAutoFocus={(event) => {
                  // Focus initial sur LA CARTE (le lecteur d'écran « entre »
                  // dans le dialogue) — comportement du pas 1 conservé ;
                  // Radix focaliserait sinon le premier focusable.
                  event.preventDefault();
                  carteRef.current?.focus();
                }}
              >
                <motion.div
                  ref={carteRef}
                  tabIndex={-1}
                  className={cn(
                    'bg-white rounded-3xl shadow-2xl',
                    'w-full',
                    sizeClasses,
                    fullHeight && 'flex flex-col',
                    className
                  )}
                  style={{
                    ...(fullHeight ? { height: 'calc(100dvh - 192px)' } : {}),
                    ...cardStyle,
                  }}
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: 20 }}
                  transition={MOTION.spring}
                >
                  {/* Header */}
                  {(title || !hideCloseButton) && (
                    <div className="flex items-start justify-between p-6 border-b border-gray-200 flex-shrink-0">
                      <div className="flex-1">
                        {title && (
                          <DialogPrimitive.Title
                            id={idTitre}
                            className="text-2xl font-bold text-gray-900 mb-1"
                          >
                            {title}
                          </DialogPrimitive.Title>
                        )}
                        {description && (
                          <DialogPrimitive.Description
                            id={idDescription}
                            className="text-sm text-gray-600"
                          >
                            {description}
                          </DialogPrimitive.Description>
                        )}
                      </div>

                      {!hideCloseButton && (
                        <DialogPrimitive.Close asChild>
                          <motion.button
                            type="button"
                            aria-label="Fermer"
                            className="ml-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <X className="w-6 h-6 text-gray-500" />
                          </motion.button>
                        </DialogPrimitive.Close>
                      )}
                    </div>
                  )}

                  {/* Body */}
                  <div className={cn(
                    fullHeight ? 'flex-1 overflow-hidden' : 'p-6 max-h-[60vh] overflow-y-auto'
                  )}>
                    {children}
                  </div>

                  {/* Footer */}
                  {footer && (
                    <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-3xl flex-shrink-0">
                      {footer}
                    </div>
                  )}
                </motion.div>
              </DialogPrimitive.Content>
            </div>
          </DialogPrimitive.Portal>
        )}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}
