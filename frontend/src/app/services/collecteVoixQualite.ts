// ──────────────────────────────────────────────────────────────────────────
// Studio v1 (collecte terrain) — contrôle qualité, module PUR.
//
// docs/PACKS_VOIX_COLLECTE.md §5 : « vérifs qualité automatiques côté client
// (durée 0,5–10 s, clipping, silence) qui rejettent avant upload ». Ici :
// avant même la mise en file locale — on ne stocke jamais un clip inutilisable,
// pour ne pas gonfler la file d'attente hors-ligne ni le temps de tri humain
// plus tard.
// ──────────────────────────────────────────────────────────────────────────

export interface VerdictQualite {
  ok: boolean;
  /** Raisons de rejet, en clair — jamais plus d'une à la fois n'est nécessaire
   *  pour agir, mais on les liste toutes pour le journal. */
  raisons: string[];
  duree_s: number;
}

const DUREE_MIN_S = 0.5;
const DUREE_MAX_S = 10;
/** Amplitude crête au-delà de laquelle on suspecte un écrêtage (clipping). */
const SEUIL_ECRETAGE = 0.98;
/** Fraction de l'enregistrement à l'amplitude crête pour parler d'écrêtage
 *  réel (une poignée d'échantillons isolés ne suffit pas). */
const FRACTION_ECRETAGE_SUSPECTE = 0.01;
/** RMS en dessous duquel on considère l'enregistrement silencieux. */
const SEUIL_SILENCE_RMS = 0.01;

/** Vérifie un enregistrement mono avant de le proposer à la file de collecte. */
export function verifierQualite(samples: Float32Array, sampleRate: number): VerdictQualite {
  const raisons: string[] = [];
  const duree_s = sampleRate > 0 ? samples.length / sampleRate : 0;

  if (duree_s < DUREE_MIN_S) raisons.push(`trop court (${duree_s.toFixed(2)} s < ${DUREE_MIN_S} s)`);
  if (duree_s > DUREE_MAX_S) raisons.push(`trop long (${duree_s.toFixed(2)} s > ${DUREE_MAX_S} s)`);

  if (samples.length > 0) {
    let sommeCarres = 0;
    let nbEcretes = 0;
    for (let i = 0; i < samples.length; i++) {
      const v = samples[i];
      sommeCarres += v * v;
      if (Math.abs(v) >= SEUIL_ECRETAGE) nbEcretes++;
    }
    const rms = Math.sqrt(sommeCarres / samples.length);
    if (rms < SEUIL_SILENCE_RMS) raisons.push('silence (rien d\'audible détecté)');
    if (nbEcretes / samples.length > FRACTION_ECRETAGE_SUSPECTE) raisons.push('son saturé (écrêtage)');
  } else {
    raisons.push('aucun échantillon');
  }

  return { ok: raisons.length === 0, raisons, duree_s };
}
