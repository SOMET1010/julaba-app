/**
 * Orchestration technique commune des moteurs de dictée du parcours marchand.
 *
 * Le choix du moteur et le contrat de résultats/annulation sont partagés ;
 * chaque bouton garde sa lecture métier, ses messages, délais et interface.
 */
import {
  demarrerRecoWeb,
  recoWebDispo,
  type EcouteRecoWeb,
  type RecoWebOptions,
} from './webReco';
import { startLiveDictation } from './offlineStt';

export type MoteurCaptureVocale = 'web' | 'sherpa';
export type ErreurCaptureWeb = Parameters<NonNullable<RecoWebOptions['erreur']>>[0];

export interface CallbacksCaptureVocale {
  /** Texte provisoire ; sa signification reste à la charge de l'écran. */
  interim?: (texte: string, moteur: MoteurCaptureVocale) => void;
  /** Résultat final, une fois que le moteur a tranché. */
  conclure: (texte: string, moteur: MoteurCaptureVocale) => void;
  /** Erreurs propres à SpeechRecognition ; Sherpa signale son échec au démarrage. */
  erreurWeb?: (code: ErreurCaptureWeb) => void;
}

export interface SessionCaptureVocale {
  readonly moteur: MoteurCaptureVocale;
  /** Termine en livrant le résultat final, comme l'arrêt normal historique. */
  conclure: () => Promise<void>;
  /** Annule sans livrer de résultat, quel que soit le moteur. */
  annuler: () => Promise<void>;
}

export interface DependancesCaptureVocale {
  webDispo: typeof recoWebDispo;
  demarrerWeb: typeof demarrerRecoWeb;
  demarrerSherpa: typeof startLiveDictation;
}

const dependancesReelles: DependancesCaptureVocale = {
  webDispo: recoWebDispo,
  demarrerWeb: demarrerRecoWeb,
  demarrerSherpa: startLiveDictation,
};

/**
 * Lance Web Speech si disponible (hors Capacitor), puis Sherpa sinon.
 * La fermeture des pistes micro, les délais et la décision sur les résultats
 * restent à l'appelant, car ils diffèrent réellement selon l'étape.
 */
export async function demarrerCaptureVocale(
  flux: MediaStream,
  callbacks: CallbacksCaptureVocale,
  deps: DependancesCaptureVocale = dependancesReelles,
): Promise<SessionCaptureVocale> {
  let annulee = false;
  const transmettreInterim = (texte: string, moteur: MoteurCaptureVocale) => {
    if (!annulee) callbacks.interim?.(texte, moteur);
  };
  const transmettreFinal = (texte: string, moteur: MoteurCaptureVocale) => {
    if (!annulee) callbacks.conclure(texte, moteur);
  };

  if (deps.webDispo()) {
    const web: EcouteRecoWeb | null = deps.demarrerWeb({
      interim: (texte) => transmettreInterim(texte, 'web'),
      conclure: (texte) => transmettreFinal(texte, 'web'),
      erreur: (code) => { if (!annulee) callbacks.erreurWeb?.(code); },
    });
    if (web) {
      return {
        moteur: 'web',
        conclure: web.conclure,
        annuler: async () => { annulee = true; web.annuler(); },
      };
    }
  }

  const sherpa = await deps.demarrerSherpa(flux, (texte, estFinal) => {
    if (estFinal) transmettreFinal(texte, 'sherpa');
    else transmettreInterim(texte, 'sherpa');
  });
  return {
    moteur: 'sherpa',
    conclure: sherpa.stop,
    annuler: async () => {
      annulee = true;
      await sherpa.stop();
    },
  };
}
