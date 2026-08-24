// ──────────────────────────────────────────────────────────────────────────
// Studio Voice v0 — utilitaires PURS (sans DOM) de la console d'enregistrement.
//
// - encoderWav : échantillons Float32 → fichier WAV PCM 16 bits mono. C'est le
//   format MASTER du studio (docs/PACKS_VOIX.md) : on archive du WAV, le MP3 de
//   publication est transcodé ensuite (ffmpeg, checklist du doc).
// - genererManifesteStudio : squelette de manifeste prêt à téléverser, aligné
//   sur le format validé par services/voicePacks.ts.
// ──────────────────────────────────────────────────────────────────────────

/** Encode un signal mono en WAV PCM 16 bits (en-tête RIFF standard). */
export function encoderWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const nb = samples.length;
  const buffer = new ArrayBuffer(44 + nb * 2);
  const v = new DataView(buffer);
  const ecrire = (offset: number, texte: string) => {
    for (let i = 0; i < texte.length; i++) v.setUint8(offset + i, texte.charCodeAt(i));
  };
  ecrire(0, 'RIFF');
  v.setUint32(4, 36 + nb * 2, true);
  ecrire(8, 'WAVE');
  ecrire(12, 'fmt ');
  v.setUint32(16, 16, true);        // taille du bloc fmt
  v.setUint16(20, 1, true);         // PCM
  v.setUint16(22, 1, true);         // mono
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, sampleRate * 2, true); // octets/seconde (16 bits mono)
  v.setUint16(32, 2, true);         // alignement bloc
  v.setUint16(34, 16, true);        // bits par échantillon
  ecrire(36, 'data');
  v.setUint32(40, nb * 2, true);
  for (let i = 0; i < nb; i++) {
    // Écrêtage propre à [-1, 1] puis quantification 16 bits.
    const s = Math.max(-1, Math.min(1, samples[i]));
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

export interface ClipStudio {
  /** Clé du manifeste (ex. « intro_accueil », « vente_enregistree »). */
  key: string;
  /** Texte EXACT à prononcer (affiché à la comédienne et transporté au manifeste). */
  texte: string;
}

/**
 * Squelette de manifeste pour un lot de clips enregistrés. Les fichiers sont
 * nommés `<clé>.mp3` (le transcodage WAV→MP3 se fait à la publication).
 */
export function genererManifesteStudio(
  clips: ClipStudio[],
  baseUrl: string,
  packVersion: number,
): object {
  return {
    manifest_version: 1,
    packs: [
      {
        lang: 'fr',
        voice: 'tata_v2',
        pack_version: packVersion,
        base_url: baseUrl,
        clips: clips.map((c) => ({ key: c.key, file: `${c.key}.mp3`, texte: c.texte })),
      },
    ],
  };
}
