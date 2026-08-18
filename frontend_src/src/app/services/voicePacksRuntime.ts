// ──────────────────────────────────────────────────────────────────────────
// Packs de voix — RUNTIME (fetch + cache), pendant navigateur de voicePacks.ts.
//
// Au démarrage (différé, jamais bloquant) : télécharge le manifeste depuis
// VITE_VOICE_MANIFEST_URL, le valide, indexe le pack « fr » le plus récent.
// Sans URL configurée, sans réseau, ou sur manifeste invalide : on retombe sur
// le dernier manifeste validé (localStorage), sinon sur RIEN — et l'appli garde
// exactement son comportement embarqué. Aucune erreur ne sort de ce module.
//
// Les clips téléchargés passent par le cache HTTP du téléphone (les URLs de
// pack sont immuables → cache long) ; la chaîne de lecture reste celle de
// l'audioManager : clip du pack → clip embarqué → synthèse, même créneau.
// ──────────────────────────────────────────────────────────────────────────

import { validerManifeste, choisirPack, indexerClips } from './voicePacks';

const CLE_CACHE = 'julaba_voice_manifest';
const LANGUE = 'fr'; // v1 : seule la voix française a des clips ; dyu/bci suivront

let index: Map<string, { url: string; texte?: string }> | null = null;

function indexerDepuis(json: unknown): boolean {
  const manifeste = validerManifeste(json);
  if (!manifeste) return false;
  const pack = choisirPack(manifeste, LANGUE);
  if (!pack) return false;
  index = indexerClips(pack);
  return true;
}

/** URL du clip publié pour une clé, ou null (→ l'appelant essaie l'embarqué). */
export function packClipUrl(key: string): string | null {
  return index?.get(key)?.url ?? null;
}

/** Texte prononcé par le clip publié, ou null. */
export function packClipTexte(key: string): string | null {
  return index?.get(key)?.texte ?? null;
}

/**
 * Initialisation « fire-and-forget » (appelée en tâche de fond au démarrage) :
 * 1) recharge immédiatement le dernier manifeste validé (cache local) ;
 * 2) tente un rafraîchissement réseau, et ne remplace le cache QUE si le
 *    nouveau manifeste est valide.
 */
export async function initVoicePacks(): Promise<void> {
  try {
    const enCache = localStorage.getItem(CLE_CACHE);
    if (enCache) indexerDepuis(JSON.parse(enCache));
  } catch { /* cache illisible : ignoré */ }

  const url = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_VOICE_MANIFEST_URL;
  if (!url || typeof navigator !== 'undefined' && navigator.onLine === false) return;
  try {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) return;
    const json = await r.json();
    if (indexerDepuis(json)) {
      try { localStorage.setItem(CLE_CACHE, JSON.stringify(json)); } catch { /* plein : tant pis */ }
    }
  } catch { /* hors-ligne ou manifeste injoignable : l'embarqué suffit */ }
}

/** Réservé aux tests : injecter/effacer un manifeste sans réseau. */
export function __setManifestForTests(json: unknown | null): void {
  if (json === null) { index = null; return; }
  indexerDepuis(json);
}
