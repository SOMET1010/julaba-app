/**
 * RENDU VOCAL PAR LANGUE — le seul endroit où une phrase part sur une AUTRE
 * voix que celle d'aujourd'hui.
 *
 * CE QU'IL CHANGE, ET RIEN DE PLUS. Pour tout message dont la voix choisie est
 * la voix de RÉFÉRENCE — c'est-à-dire, aujourd'hui : tout l'argent, tout le
 * français, tout le web, et toute langue sans voix installée — il appelle
 * `direTexte`, exactement le chemin `speak` d'aujourd'hui, octet pour octet.
 * Seule une phrase de DÉCOR résolue en dioula prend la branche neuve.
 *
 * POURQUOI ICI. `contrat-audio.ts` prévoit ce point d'extension
 * (`enregistrerRenduVocal`) précisément parce que c'est le dernier endroit où
 * l'on connaît encore la LOCALE du message. Après, il ne reste qu'un texte, et
 * deviner la langue d'une phrase à ses mots est exactement ce qu'on refuse.
 * Le rendu est remplaçable : quand Manus enregistrera le sien (clips par
 * (id, locale), prosodie, packs), il prendra simplement la place de celui-ci.
 *
 * L'ARGENT NE PASSE PAS PAR LA BRANCHE NEUVE. Ce n'est pas une politesse :
 * `choisirVoix` rend la voix française pour toute clé `critiqueArgent` tant
 * que la langue n'est pas validée sur le financier, et le runtime a déjà
 * remplacé le texte par le français. Deux verrous, aucun à contourner ici.
 */
import { speakDynamic } from '../../services/audioManager';
import * as vtrace from '../../utils/voiceTrace';
import { formeDite, type DireTexte, type RenduVocal } from './contrat-audio';
import { choisirVoix, VOIX_REFERENCE } from './voixParLocale';

/**
 * Rendu vocal qui suit la langue du message résolu.
 * Ne jette jamais : toute panne de synthèse retombe sur le chemin actuel.
 */
export const RENDU_VOIX_LOCALE: RenduVocal = (message, direTexte: DireTexte) => {
  const choix = choisirVoix(message);
  if (choix.voix.id === VOIX_REFERENCE.id) {
    // Le chemin d'aujourd'hui, inchangé. C'est le cas de l'écrasante majorité
    // des phrases, et de LA TOTALITÉ de celles qui portent un montant.
    if (choix.raison === 'argent-non-valide') {
      vtrace.info('VOIX_ARGENT_EN_FRANCAIS', { id: message.id, localeDemandee: message.localeDemandee });
    }
    return direTexte(formeDite(message));
  }
  // UN MONTANT QUI PART SUR UNE VOIX NON VALIDÉE NE PASSE JAMAIS EN SILENCE.
  // Cette trace n'existe que dans un build d'essai (JULABA_DYU_ARGENT=1). Elle
  // est là pour qu'on puisse constater APRÈS COUP, sur le rapport de test d'un
  // téléphone, qu'un build avait la dérogation allumée — et pour qu'un APK
  // qu'on croirait ordinaire se dénonce lui-même.
  if (choix.raison === 'argent-de-test') {
    vtrace.info('VOIX_ARGENT_EN_DIOULA_DE_TEST', {
      id: message.id, locale: message.locale, voix: choix.voix.id,
      avertissement: 'build d\'essai : montant dit dans une langue NON VALIDÉE (nombres en brouillon, francs/dɔrɔmɛ ambigus). Juger le son, jamais le compte.',
    });
  }
  vtrace.info('VOIX_LOCALE', { id: message.id, locale: message.locale, voix: choix.voix.id, raison: choix.raison });
  // Résolue À CHAUD dans le créneau exclusif de l'audioManager : un Stop
  // pendant la synthèse empêche la lecture de démarrer, comme pour la voix
  // française. Une seule chaîne audio (Constitution, principe 1).
  return speakDynamic(async () => {
    try {
      const { voixNativeDisponible, synthetiserAvecVoix } = await import('../../voice-offline/nativeTtsVoix');
      if (!(await voixNativeDisponible(choix.voix.id))) return { text: formeDite(message) };
      const wav = await synthetiserAvecVoix(formeDite(message), choix.voix.id);
      // Sans WAV, on retombe sur le chemin d'aujourd'hui (`text`) : la voix
      // française dira la phrase de décor. Moins bien, jamais muet.
      return wav ? { base64: wav, text: formeDite(message) } : { text: formeDite(message) };
    } catch {
      return { text: formeDite(message) };
    }
  });
};
