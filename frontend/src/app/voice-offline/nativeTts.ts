// ──────────────────────────────────────────────────────────────────────────
// Pont JS → plugin natif SherpaTts (Capacitor) pour la SYNTHÈSE vocale
// hors-ligne sur l'APK Android.
//
// LE TROU QU'IL BOUCHE, ET LUI SEUL.
// Dans la WebView Android, `window.speechSynthesis` ne produit aucun son :
// seuls les clips enregistrés s'entendent. Or un clip ne peut pas dire un
// MONTANT, qui change à chaque vente. Une marchande qui ne lit pas n'avait donc
// aucun moyen d'entendre ce qu'elle a gagné.
//
// Sur le WEB (navigateur), ce module est une non-opération : il n'y a pas de
// plugin natif, et la voix du navigateur y fonctionne déjà. Le repli reste donc
// intact, et le bundle web ne grossit pas.
//
// Contrat canonique (à respecter par SherpaTtsPlugin.kt) :
//   - isAvailable(): { available: boolean }
//   - synthesize({ text, speed? }): { wav: string, sampleRate: number }
//       wav : base64 d'un WAV PCM 16 bits mono, jouable tel quel par <audio>.
//
// On reçoit un WAV et non du PCM brut EXPRÈS : il traverse ensuite le lecteur
// de clips déjà éprouvé de l'audioManager, qui sait l'arrêter et l'annuler.
// Une seule chaîne audio dans l'application (Constitution, principe 1).
// ──────────────────────────────────────────────────────────────────────────

import * as vtrace from '../utils/voiceTrace'; // VOICE-01 : on note si la synthèse native est là
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

let plugin: Any | null | undefined; // undefined = pas encore évalué

function getPlugin(): Any | null {
  if (plugin !== undefined) return plugin;
  try {
    const cap = (window as unknown as Any).Capacitor;
    if (cap && cap.getPlatform() === 'android') {
      plugin = cap.Plugins?.SherpaTts ?? null;
    } else {
      plugin = null;
    }
  } catch {
    plugin = null;
  }
  return plugin;
}

// Le chargement du moteur prend quelques secondes au premier appel. On retient
// la réponse pour ne pas repayer ce coût — ni le trajet du pont — à chaque
// phrase. `null` = pas encore demandé.
let disponibiliteConnue: boolean | null = null;

/**
 * Vrai si la synthèse native est présente ET chargée.
 *
 * Ne jette jamais : sur le web, sans plugin, ou si le modèle manque des assets,
 * la réponse est simplement `false` et l'appelant garde son comportement
 * actuel. C'est ce qui garantit qu'ajouter la synthèse ne peut rien casser.
 */
export async function ttsNatifDisponible(): Promise<boolean> {
  if (disponibiliteConnue !== null) return disponibiliteConnue;
  const p = getPlugin();
  if (!p || typeof p.isAvailable !== 'function') vtrace.info('TTS_NATIF_SONDE', { moteur: 'SherpaTts (Piper/SIWIS)', disponible: false, raison: 'plugin absent (web, ou APK sans plugin)' });
  if (!p || typeof p.isAvailable !== 'function') {
    disponibiliteConnue = false;
    return false;
  }
  try {
    const res = await p.isAvailable();
    disponibiliteConnue = Boolean(res?.available);
    vtrace.info('TTS_NATIF_SONDE', { moteur: 'SherpaTts (Piper/SIWIS)', disponible: disponibiliteConnue });
  } catch {
    vtrace.info('TTS_NATIF_SONDE', { moteur: 'SherpaTts (Piper/SIWIS)', disponible: false, raison: 'isAvailable() a échoué' });
    disponibiliteConnue = false;
  }
  return disponibiliteConnue;
}

/**
 * Synthétise `texte` et rend un WAV en base64, ou `null` si ce n'est pas
 * possible — jamais d'exception : un échec de synthèse ne doit pas empêcher
 * l'écran de fonctionner.
 */
export async function synthetiserEnWav(
  texte: string,
  vitesse = 1.0,
): Promise<string | null> {
  if (!texte.trim()) return null;
  const p = getPlugin();
  if (!p || typeof p.synthesize !== 'function') return null;
  try {
    const res = await p.synthesize({ text: texte, speed: vitesse });
    const wav = res?.wav;
    return typeof wav === 'string' && wav.length > 0 ? wav : null;
  } catch {
    return null;
  }
}

/** Remet le module à zéro. Réservé aux tests — aucun appel en production. */
export function __reinitialiserPourTests(): void {
  plugin = undefined;
  disponibiliteConnue = null;
}
