/**
 * L'ÉTAT DE LA DERNIÈRE LECTURE DE L'HISTORIQUE, CÔTÉ REACT — HIST-01.
 *
 * `useSyncExternalStore` et non un `useState` + `useEffect` : le fait est noté
 * par la couche API (services/lectureHistorique.ts), hors de React, et peut
 * l'être AVANT que l'écran ne s'abonne. Ce hook lit donc toujours la valeur
 * courante, sans fenêtre pendant laquelle l'écran croirait ne rien savoir.
 */
import { useSyncExternalStore } from 'react';
import { lectureHistorique, surLectureHistorique } from '../services/lectureHistorique';
import type { LectureHistorique } from '../services/etatVentesPassees';

export function useLectureHistorique(): LectureHistorique {
  return useSyncExternalStore(surLectureHistorique, lectureHistorique, lectureHistorique);
}
