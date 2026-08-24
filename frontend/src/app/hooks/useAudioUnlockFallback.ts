import { useEffect, useRef } from 'react';

/**
 * FILET DE RATTRAPAGE AUDIO — écrans d'auth / onboarding.
 *
 * Le navigateur / WebView Android bloque toute lecture audio tant qu'AUCUN
 * geste utilisateur n'a eu lieu sur la page en cours (politique autoplay).
 * Plusieurs écrans de Jùlaba peuvent être le TOUT PREMIER écran d'une page
 * fraîchement chargée — pas seulement l'accueil :
 *   - retour d'app : EntryGate saute directement à l'écran numéro (ou à la
 *     reconnaissance) via les drapeaux julaba_seen_splash et
 *     julaba_completed_onboarding, persistés en localStorage ;
 *   - lien direct vers /activation (code reçu par SMS).
 * Dans ces cas, l'hypothèse selon laquelle un geste a déjà eu lieu plus tôt
 * dans la session est FAUSSE : la tentative auto de lecture est
 * silencieusement bloquée. D'où le silence constaté en recette terrain sur
 * des écrans qui ne sont PAS le tout premier de l'app (voir Welcome.tsx pour
 * l'écran d'accueil, qui a toujours eu ce filet).
 *
 * Ce hook rejoue la fonction parler au TOUT PREMIER toucher (pointerdown) de
 * la fenêtre (une seule fois), SANS filtrer la cible du geste. Piège déjà
 * rencontré et à ne PAS reproduire : un filtre du type closest sur
 * button/img peut avaler le geste (l'écouteur en mode « une seule fois » se
 * consomme quand même) sans jamais jouer le son si le tout premier tap tombe
 * justement sur un bouton ou une image — silence total pour le reste de la
 * session.
 */
export function useAudioUnlockFallback(parler: () => void, actif: boolean = true): void {
  // Ref pour toujours rejouer la DERNIÈRE version de parler (dépendances à
  // jour) sans ré-attacher l'écouteur à chaque render.
  const parlerRef = useRef(parler);
  parlerRef.current = parler;

  useEffect(() => {
    if (!actif) return;
    const onFirst = () => parlerRef.current();
    window.addEventListener('pointerdown', onFirst, { once: true });
    return () => window.removeEventListener('pointerdown', onFirst);
  }, [actif]);
}
