// ──────────────────────────────────────────────────────────────────────────
// VOIX DE L'ONBOARDING — la VRAIE Tata (clips enregistrés), pas le robot.
//
// Problème réglé ici : jusqu'à présent l'accueil était LU par la voix
// synthétique du téléphone (un robot, différent sur chaque appareil, jamais la
// vraie Tata) → « toujours les mêmes soucis ». On passe donc l'onboarding sur
// de VRAIS clips enregistrés (comme les 137 clips `ui-*.mp3`).
//
// Un clip absent n'est JAMAIS remplacé silencieusement par une voix générique :
// l'écran reste visuel et tactile jusqu'à livraison du MP3 humain validé.
// ──────────────────────────────────────────────────────────────────────────

import { stopAllAudio } from './elevenlabs';
import { playClip, stopAllVoice } from './audioManager';
import { packClipUrl } from './voicePacksRuntime';

const BASE = '/voix/tata';

export interface IntroClip {
  file: string;   // clip de la VRAIE Tata (déposé par le studio d'enregistrement)
  texte: string;  // texte EXACT à enregistrer et valider humainement
  atteste: boolean; // vrai seulement si le fichier existe et a été validé
}

// clé → clip de l'onboarding. Fichiers à enregistrer une seule fois (script fourni).
export const INTRO_CLIPS: Record<string, IntroClip> = {
  // Écran d'accueil (logo)
  accueil: {
    file: `${BASE}/intro-accueil.mp3`,
    atteste: false,
    texte: "Bonjour ! Moi, c'est Tata Nanti Lou. Je serai avec toi pour vendre, compter ton argent " +
      'et faire grandir ton commerce. Beaucoup de commerçantes travaillent déjà avec moi. ' +
      "Maintenant, c'est ton tour. On commence ?",
  },
  retour: {
    file: `${BASE}/intro-retour.mp3`,
    atteste: false,
    texte: 'Re-bonjour ! On y va.',
  },
  // Les 4 écrans-histoire
  histoire1: {
    file: `${BASE}/intro-1.mp3`,
    atteste: false,
    texte: 'Je serai avec toi chaque jour dans ton commerce. On est ensemble.',
  },
  histoire2: {
    file: `${BASE}/intro-2.mp3`,
    atteste: false,
    texte: "Tu vends. J'enregistre. Je compte. Tu sais toujours combien tu gagnes.",
  },
  histoire3: {
    file: `${BASE}/intro-3.mp3`,
    atteste: false,
    texte: "Tu peux me parler, ou utiliser le clavier. C'est toi qui décides.",
  },
  histoire4: {
    file: `${BASE}/intro-4.mp3`,
    atteste: false,
    texte: 'Tout est prêt. Ouvrons ta boutique.',
  },
  // Choix du mode
  mode: {
    file: `${BASE}/intro-mode.mp3`,
    atteste: false,
    texte: 'Comment préfères-tu travailler avec moi ? Le plus simple : laisse-moi choisir, ' +
      "je m'adapte à toi. Sinon : je sais lire et écrire, ou je lis un peu, ou je préfère parler. " +
      "Il n'y a pas de mauvais choix.",
  },
  // Installation de la voix
  voixInstall: {
    // NOTE : intro-voix.mp3 est un enregistrement qui dit encore l'ancien
    // message trompeur (« gros fichier », « wifi »). A REENREGISTRER pour coller
    // a ce texte. Le fallback texte ci-dessous, lui, est deja juste (sonde, pas
    // de telechargement) — cf. audit REPONSE_SHERPA Q5.
    file: `${BASE}/intro-voix.mp3`,
    atteste: false,
    texte: "Pour que je puisse t'écouter et te parler partout, même sans réseau : " +
      "ta voix est déjà dans l'application, je la vérifie, c'est tout. Rien à télécharger.",
  },
  // Récompense finale
  bravo: {
    file: `${BASE}/intro-bravo.mp3`,
    atteste: false,
    texte: 'Bravo ! Nous sommes prêtes. Ouvrons ta boutique.',
  },
};

/**
 * Dit une phrase de l'onboarding avec la VRAIE voix de Tata (clip). Si le clip
 * n'est pas attesté, ne fabrique aucune pseudo-Tata : le visuel reste disponible.
 * Résout quand la lecture est finie (ou interrompue).
 */
export async function direIntro(key: keyof typeof INTRO_CLIPS): Promise<void> {
  const clip = INTRO_CLIPS[key];
  if (!clip) return;
  // V1 (packs) : un clip d'intro PUBLIÉ par manifeste (clé « intro_<clé> »)
  // prime sur le fichier embarqué — les 9 intros arriveront sans rebuild.
  const clipUrl = packClipUrl(`intro_${String(key)}`) ?? (clip.atteste ? clip.file : null);
  if (!clipUrl) return;
  try { await playClip({ url: clipUrl }); }
  catch { /* muet plutôt que planter */ }
}

/** Coupe immédiatement la voix de l'onboarding (barge-in / changement d'écran). */
export function stopIntro(): void {
  stopAllVoice();
  stopAllAudio(); // filet : coupe aussi l'ancien lecteur privé d'elevenlabs
}

let _preloaded = false;
/** Précharge les clips de l'onboarding (lecture instantanée + hors-ligne). */
export function preloadIntroClips(): void {
  if (_preloaded || typeof window === 'undefined') return;
  _preloaded = true;
  try {
    for (const { file, atteste } of Object.values(INTRO_CLIPS)) {
      if (!atteste) continue;
      const a = new Audio(); a.preload = 'auto'; a.src = file;
    }
  } catch { /* ignore */ }
}
