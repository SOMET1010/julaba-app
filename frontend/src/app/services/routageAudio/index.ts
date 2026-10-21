// ──────────────────────────────────────────────────────────────────────────
// routageAudio/index.ts — LA COUTURE, en un seul point de l'application.
//
// POURQUOI UNE ENVELOPPE DE `getUserMedia` ET PAS UN APPEL DANS CHAQUE ÉCRAN.
// Le micro s'ouvre à six endroits (la caisse via useVoiceCore, la connexion,
// le studio de voix, la collecte, le portefeuille…). Aller poser un appel dans
// chacun, c'est six occasions d'en oublier un, et c'est surtout toucher des
// fichiers GELÉS : `hooks/useVoiceCore.ts`, `services/audioManager.ts` et
// `voice-offline/offlineStt.ts` sont tenus au caractère près par
// `test:voix-trace-source`, et `useVoiceCore.ts` est de plus dans le périmètre
// d'argent. Un lot de routage audio n'a aucune raison de les rouvrir.
//
// On enveloppe donc `navigator.mediaDevices.getUserMedia` une seule fois, au
// démarrage — exactement le motif déjà employé par `main.tsx` pour
// `window.fetch`. Tous les micros de l'application en héritent, sans qu'aucun
// écran ne change d'une ligne.
//
// CE QUI N'EST PAS TOUCHÉ : aucune logique métier, aucun montant, aucun panier,
// aucune file hors ligne. L'enveloppe rend exactement le `MediaStream` que le
// navigateur aurait rendu, ou propage exactement l'erreur qu'il aurait levée.
// ──────────────────────────────────────────────────────────────────────────

import { MODE_PAR_DEFAUT, MODES, type ModeRoutage } from './decisionRoutage';
import { pontNatif } from './pontRoutageAudio';
import { SessionRoutage, type PontRoutage } from './sessionRoutage';

export * from './decisionRoutage';
export { SessionRoutage } from './sessionRoutage';
export type { EtatPeripheriques, PontRoutage } from './sessionRoutage';
export { pontNatif } from './pontRoutageAudio';

/**
 * Clé de préférence permettant de changer de mode SUR L'APPAREIL, sans
 * rebuild : c'est ce qui rend l'arbitrage de Patrick testable en une minute
 * au marché plutôt qu'en un cycle de livraison.
 */
export const CLE_MODE = 'julaba_routage_audio_mode';

/** Lit le mode voulu : préférence rangée sur l'appareil, sinon le défaut. */
export function choisirMode(lire: (cle: string) => string | null = lireLocal): ModeRoutage {
  try {
    const brut = lire(CLE_MODE);
    if (brut && (MODES as readonly string[]).includes(brut)) return brut as ModeRoutage;
  } catch {
    /* stockage indisponible : le défaut fera l'affaire */
  }
  return MODE_PAR_DEFAUT;
}

function lireLocal(cle: string): string | null {
  try {
    return localStorage.getItem(cle);
  } catch {
    return null;
  }
}

/** Ce qu'il faut à l'enveloppe pour travailler : un `mediaDevices`, rien de plus. */
export interface CibleMedia {
  getUserMedia(contraintes: MediaStreamConstraints): Promise<MediaStream>;
}

let sessionCourante: SessionRoutage | null = null;
let desinstaller: (() => void) | null = null;

/** La session en vigueur, pour le journal et les écrans de diagnostic. */
export function session(): SessionRoutage | null {
  return sessionCourante;
}

/**
 * Enveloppe `getUserMedia` d'une cible donnée. Exporté séparément de
 * l'installation pour être éprouvé en Node avec un faux `mediaDevices` :
 * c'est ce qui permet de prouver le repli sans téléphone.
 *
 * Rend la fonction de désinstallation (restaure l'original).
 */
export function enrouler(cible: CibleMedia, sess: SessionRoutage): () => void {
  const original = cible.getUserMedia.bind(cible);

  const enveloppe = async (contraintes: MediaStreamConstraints): Promise<MediaStream> => {
    // Une demande vidéo n'a rien à voir avec l'oreillette : on passe droit.
    if (!contraintes || !contraintes.audio) return original(contraintes);

    // Le routage ne doit JAMAIS empêcher le micro de s'ouvrir. Si quoi que ce
    // soit échoue ici, on laisse simplement passer : la marchande écoute par le
    // téléphone, c'est-à-dire exactement ce qu'elle fait aujourd'hui.
    try {
      await sess.ouvrirCapture();
    } catch {
      return original(contraintes);
    }

    let flux: MediaStream;
    try {
      flux = await original(contraintes);
    } catch (e) {
      sess.fermerCapture();
      throw e; // l'appelant doit voir EXACTEMENT l'erreur du navigateur
    }

    brancherFermeture(flux, () => sess.fermerCapture());
    return flux;
  };

  try {
    (cible as unknown as Record<string, unknown>).getUserMedia = enveloppe;
  } catch {
    return () => {};
  }
  return () => {
    try {
      (cible as unknown as Record<string, unknown>).getUserMedia = original;
    } catch {
      /* ignore */
    }
  };
}

/**
 * Prévient UNE SEULE FOIS quand la capture est finie, quelle que soit la façon
 * dont elle finit : `track.stop()` par l'appelant, ou `ended` émis par le
 * système (débranchement, micro confisqué par un appel entrant). Sans les deux
 * chemins, une capture coupée par le système laisserait le canal Bluetooth
 * ouvert indéfiniment.
 */
function brancherFermeture(flux: MediaStream, fini: () => void): void {
  let pistes: MediaStreamTrack[];
  try {
    pistes = flux.getAudioTracks();
  } catch {
    return;
  }
  if (pistes.length === 0) {
    fini();
    return;
  }
  let restantes = pistes.length;
  let prevenu = false;
  const uneDeMoins = () => {
    if (prevenu) return;
    restantes -= 1;
    if (restantes > 0) return;
    prevenu = true;
    try {
      fini();
    } catch {
      /* ignore */
    }
  };
  for (const piste of pistes) {
    try {
      piste.addEventListener('ended', uneDeMoins, { once: true });
    } catch {
      /* ignore */
    }
    try {
      const stopOriginal = piste.stop.bind(piste);
      piste.stop = () => {
        try {
          stopOriginal();
        } finally {
          uneDeMoins();
        }
      };
    } catch {
      /* ignore */
    }
  }
}

/**
 * Installe le routage. Non-opération complète hors APK Android : sur le web,
 * `pontNatif.disponible()` est faux et `getUserMedia` n'est même pas enveloppé.
 *
 * Ne rejette jamais, ne bloque jamais le démarrage de l'application.
 */
export function installerRoutageAudio(
  pont: PontRoutage = pontNatif,
  journal?: (evenement: string, details: Record<string, unknown>) => void,
): void {
  try {
    if (sessionCourante) return; // déjà installé
    if (!pont.disponible()) return;
    const md = (navigator as Navigator & { mediaDevices?: CibleMedia }).mediaDevices;
    if (!md || typeof md.getUserMedia !== 'function') return;

    const sess = new SessionRoutage({ pont, mode: choisirMode(), journal });
    sessionCourante = sess;
    desinstaller = enrouler(md, sess);
    void sess.demarrer();
  } catch {
    /* un routage audio qui n'arrive pas à s'installer ne casse pas la caisse */
  }
}

/** Retire l'enveloppe et rend le canal. Utile aux tests et au démontage. */
export async function retirerRoutageAudio(): Promise<void> {
  try {
    desinstaller?.();
  } catch {
    /* ignore */
  }
  desinstaller = null;
  const s = sessionCourante;
  sessionCourante = null;
  if (s) await s.arreter();
}
