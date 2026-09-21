// ──────────────────────────────────────────────────────────────────────────
// Pont JS → plugin natif SherpaTts, VOIX PAR VOIX.
//
// POURQUOI UN SECOND FICHIER À CÔTÉ DE `nativeTts.ts`, ET PAS UN PARAMÈTRE
// DE PLUS DEDANS. `nativeTts.ts` est GELÉ par un garde-fou du lot VOICE-01
// (scripts/test-voix-trace-source.mjs) : on n'y a le droit d'ajouter que des
// lignes de journal, tout le reste est hors lot. Ce gel est une bonne règle —
// ce fichier-là porte le chemin de la voix française, celle qui dit les
// montants, et on ne le remue pas pour ajouter une langue. On pose donc le
// chemin multilingue à côté, et `nativeTts.ts` ne change pas d'un octet.
//
// Les deux pontent le MÊME plugin, qui sérialise tout sur un seul exécuteur :
// il n'y a pas deux moteurs, pas deux chaînes audio, pas deux vérités.
//
// Contrat (SherpaTtsPlugin.kt) :
//   - isAvailable({ voix? }): { available: boolean, voix: string }
//   - synthesize({ text, speed?, voix? }): { wav, sampleRate, voix }
//
// ATTENTION à ce que « disponible » veut dire pour une voix autre que le
// français : le plugin RETOMBE sur le français quand la voix demandée manque
// de l'APK, et répond donc `available: true` avec `voix: 'fr'`. On compare
// donc la voix RENDUE à celle demandée — sans quoi on croirait le dioula
// installé alors que c'est le français qui a répondu, et Tantie lirait du
// dioula avec une bouche française.
//
// Quelle voix pour quel message : i18n/voice/voixParLocale.ts. C'est là qu'est
// la règle « l'argent reste en français », pas ici.
// ──────────────────────────────────────────────────────────────────────────

import * as vtrace from '../utils/voiceTrace';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

/** La voix servie quand rien n'est demandé (doit exister dans SherpaTtsPlugin.VOIX). */
export const VOIX_DEFAUT = 'fr';

function getPlugin(): Any | null {
  try {
    const cap = (window as unknown as Any).Capacitor;
    if (cap && cap.getPlatform() === 'android') return cap.Plugins?.SherpaTts ?? null;
    return null;
  } catch {
    return null;
  }
}

// Le chargement d'un moteur prend quelques secondes au premier appel. On
// retient la réponse PAR VOIX pour ne pas repayer ce coût — ni le trajet du
// pont — à chaque phrase.
const disponibiliteConnue = new Map<string, boolean>();

/**
 * Vrai si CETTE voix est réellement installée et chargée.
 * Ne jette jamais : sur le web, sans plugin, ou sans le modèle, la réponse est
 * `false` et l'appelant garde son comportement actuel.
 */
export async function voixNativeDisponible(voix: string = VOIX_DEFAUT): Promise<boolean> {
  const connu = disponibiliteConnue.get(voix);
  if (connu !== undefined) return connu;
  const p = getPlugin();
  if (!p || typeof p.isAvailable !== 'function') {
    disponibiliteConnue.set(voix, false);
    vtrace.info('TTS_VOIX_SONDE', { voix, disponible: false, raison: 'plugin absent (web, ou APK sans plugin)' });
    return false;
  }
  try {
    const res = await p.isAvailable({ voix });
    // `voix` absent de la réponse = plugin d'avant ce lot, qui ne connaît que
    // le français : on considère que la voix demandée n'est pas là.
    const servie = typeof res?.voix === 'string' && res.voix ? res.voix : VOIX_DEFAUT;
    const dispo = Boolean(res?.available) && servie === voix;
    disponibiliteConnue.set(voix, dispo);
    vtrace.info('TTS_VOIX_SONDE', { voix, voixServie: servie, disponible: dispo });
    return dispo;
  } catch {
    disponibiliteConnue.set(voix, false);
    vtrace.info('TTS_VOIX_SONDE', { voix, disponible: false, raison: 'isAvailable() a échoué' });
    return false;
  }
}

/**
 * Synthétise `texte` avec `voix` et rend un WAV base64, ou `null` — jamais
 * d'exception : un échec de synthèse ne doit pas empêcher l'écran de marcher.
 */
export async function synthetiserAvecVoix(
  texte: string,
  voix: string = VOIX_DEFAUT,
  vitesse = 1.0,
): Promise<string | null> {
  if (!texte.trim()) return null;
  const p = getPlugin();
  if (!p || typeof p.synthesize !== 'function') return null;
  try {
    const res = await p.synthesize({ text: texte, speed: vitesse, voix });
    const wav = res?.wav;
    if (typeof wav !== 'string' || wav.length === 0) return null;
    const servie = typeof res?.voix === 'string' && res.voix ? res.voix : VOIX_DEFAUT;
    if (servie !== voix) {
      // Un repli du plugin s'écrit : « pourquoi Tantie parle français » doit
      // avoir une réponse dans le Rapport de test, pas dans une intuition.
      vtrace.info('TTS_VOIX_REPLI', { demandee: voix, servie });
      return null; // on préfère le chemin d'aujourd'hui à une voix inattendue
    }
    return wav;
  } catch {
    return null;
  }
}

/** Remet le module à zéro. Réservé aux tests — aucun appel en production. */
export function __reinitialiserVoixPourTests(): void {
  disponibiliteConnue.clear();
}
