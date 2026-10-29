// ──────────────────────────────────────────────────────────────────────────
// Encodage MP3 CÔTÉ NAVIGATEUR (lamejs) — pas de serveur, pas d'upload.
//
// Le micro du navigateur enregistre en WebM/Opus ou MP4/AAC (jamais MP3, aucun
// navigateur n'a d'encodeur MP3 natif). Le format attendu par Julaba pour les
// clips de Tata est MP3 mono (docs/PLAN_PACKS_TATA_LANGUES.md, PACKS_VOIX.md) :
// on décode donc le blob capté en PCM (Web Audio API), puis on l'encode en MP3
// avec lamejs (port pur JS de LAME, aucun binaire natif requis).
// ──────────────────────────────────────────────────────────────────────────
import { Mp3Encoder } from '@breezystack/lamejs';

/** Débit du MP3 produit — aligné sur les 137 clips existants (ui-*.mp3, 96 kb/s). */
const KBPS = 96;

function floatVersInt16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return out;
}

/** Encode un signal mono (Float32, [-1,1]) en MP3 mono. */
export function encoderMp3(samples: Float32Array, sampleRate: number, kbps: number = KBPS): Blob {
  const encoder = new Mp3Encoder(1, sampleRate, kbps);
  const pcm = floatVersInt16(samples);
  const chunkSize = 1152; // taille de bloc recommandée par lamejs
  const morceaux: Uint8Array[] = [];
  for (let i = 0; i < pcm.length; i += chunkSize) {
    const chunk = pcm.subarray(i, i + chunkSize);
    const mp3buf = encoder.encodeBuffer(chunk as Int16Array);
    if (mp3buf.length > 0) morceaux.push(mp3buf);
  }
  const fin = encoder.flush();
  if (fin.length > 0) morceaux.push(fin);
  return new Blob(morceaux as BlobPart[], { type: 'audio/mpeg' });
}

/** Décode un blob audio capté (webm/mp4/...) en échantillons PCM mono. */
export async function decoderEnMono(blob: Blob): Promise<{ samples: Float32Array; sampleRate: number }> {
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new AC();
  try {
    const decode = await ctx.decodeAudioData(await blob.arrayBuffer());
    if (decode.numberOfChannels === 1) {
      return { samples: decode.getChannelData(0), sampleRate: decode.sampleRate };
    }
    // Repli mono : moyenne des canaux (rare ici, le micro capte déjà en mono la plupart du temps).
    const g = decode.getChannelData(0);
    const d = decode.getChannelData(1);
    const mixed = new Float32Array(g.length);
    for (let i = 0; i < g.length; i++) mixed[i] = (g[i] + d[i]) / 2;
    return { samples: mixed, sampleRate: decode.sampleRate };
  } finally {
    void ctx.close().catch(() => {});
  }
}

/** Chaîne complète : blob capté (webm/mp4) → MP3 mono prêt à embarquer. */
export async function versMp3(blob: Blob, kbps: number = KBPS): Promise<Blob> {
  const { samples, sampleRate } = await decoderEnMono(blob);
  return encoderMp3(samples, sampleRate, kbps);
}
