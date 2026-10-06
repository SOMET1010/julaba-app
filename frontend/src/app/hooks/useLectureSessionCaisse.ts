/**
 * L'ÉTAT DE LA DERNIÈRE LECTURE DE LA JOURNÉE DE CAISSE, CÔTÉ REACT — ACC-03.
 *
 * `useSyncExternalStore` et non un `useState` + `useEffect`, pour la raison
 * qui a fait écrire ce lot : le fait est noté par la couche API hors de React,
 * et il peut l'être AVANT que l'écran ne s'abonne. Un hook qui s'abonne puis
 * attend un événement raterait la lecture déjà faite et croirait ne rien
 * savoir — c'est-à-dire la fenêtre exacte pendant laquelle l'accueil a
 * annoncé zéro franc.
 *
 * Jumeau de `useLectureHistorique`, volontairement : deux lectures, une seule
 * façon de les suivre.
 */
import { useSyncExternalStore } from 'react';
import { lectureSessionCaisse, surLectureSessionCaisse, type LectureSession } from '../services/lectureSessionCaisse';

export function useLectureSessionCaisse(): LectureSession {
  return useSyncExternalStore(surLectureSessionCaisse, lectureSessionCaisse, lectureSessionCaisse);
}
