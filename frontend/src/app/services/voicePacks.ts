// ──────────────────────────────────────────────────────────────────────────
// Packs de voix — MODULE PUR (validation + résolution), sans React ni DOM.
//
// Chantier V1 (Studio Voice) : les clips de Tata peuvent être publiés SANS
// reconstruire l'APK, via un petit manifeste JSON hébergé en ligne. Le principe
// est agnostique de l'hébergeur (lab aujourd'hui, Azure Blob Storage + CDN sur
// la plateforme cible — voir docs/AZURE.md) : toutes les URLs viennent du
// manifeste lui-même, l'appli ne connaît que l'URL du manifeste.
//
// Règles de conception (docs/PACKS_VOIX.md) :
// - une version de pack est IMMUABLE (la version est dans base_url) → cache
//   infini côté CDN, retour arrière = repointer le manifeste ;
// - le manifeste est un ENRICHISSEMENT : s'il est absent, invalide ou
//   inaccessible, l'appli garde exactement son comportement embarqué
//   (clips public/voix/tata → synthèse du téléphone). Jamais bloquant.
// ──────────────────────────────────────────────────────────────────────────

export interface ClipVoix {
  /** Clé sémantique stable (ex. « vente_enregistree », « intro_bienvenue »). */
  key: string;
  /** Nom de fichier relatif à base_url (ex. « intro_bienvenue.mp3 »). */
  file: string;
  /** Texte exact prononcé (affiché à l'écran pour coller à l'audio). */
  texte?: string;
  sha256?: string;
  duration_ms?: number;
}

export interface PackVoix {
  lang: string;          // « fr », « dyu »…
  voice: string;         // « tata_v2 »…
  pack_version: number;  // croissante ; la plus haute gagne
  base_url: string;      // URL absolue http(s), version incluse
  clips: ClipVoix[];
}

export interface ManifesteVoix {
  manifest_version: number;
  packs: PackVoix[];
}

/**
 * Valide un JSON inconnu en manifeste. Renvoie null au moindre doute — un
 * manifeste douteux est traité comme absent (l'appli reste sur l'embarqué).
 * Les packs individuellement invalides sont écartés sans invalider le reste.
 */
export function validerManifeste(json: unknown): ManifesteVoix | null {
  if (!json || typeof json !== 'object') return null;
  const m = json as Record<string, unknown>;
  if (typeof m.manifest_version !== 'number' || !Array.isArray(m.packs)) return null;

  const packs: PackVoix[] = [];
  for (const p of m.packs as unknown[]) {
    if (!p || typeof p !== 'object') continue;
    const q = p as Record<string, unknown>;
    if (typeof q.lang !== 'string' || !q.lang) continue;
    if (typeof q.voice !== 'string' || !q.voice) continue;
    if (typeof q.pack_version !== 'number' || !(q.pack_version >= 1)) continue;
    // Sécurité : uniquement des URLs http(s) absolues — jamais de data:, file:…
    if (typeof q.base_url !== 'string' || !/^https?:\/\//.test(q.base_url)) continue;
    if (!Array.isArray(q.clips)) continue;
    const clips: ClipVoix[] = [];
    for (const c of q.clips as unknown[]) {
      if (!c || typeof c !== 'object') continue;
      const r = c as Record<string, unknown>;
      if (typeof r.key !== 'string' || !r.key) continue;
      // Fichier RELATIF simple : pas d'URL absolue, pas de remontée de chemin.
      if (typeof r.file !== 'string' || !r.file || /^(https?:)?\/\//.test(r.file) || r.file.includes('..')) continue;
      clips.push({
        key: r.key,
        file: r.file,
        texte: typeof r.texte === 'string' ? r.texte : undefined,
        sha256: typeof r.sha256 === 'string' ? r.sha256 : undefined,
        duration_ms: typeof r.duration_ms === 'number' ? r.duration_ms : undefined,
      });
    }
    if (clips.length === 0) continue;
    packs.push({ lang: q.lang, voice: q.voice, pack_version: q.pack_version, base_url: q.base_url, clips });
  }
  return { manifest_version: m.manifest_version, packs };
}

/** Le pack retenu pour une langue : la pack_version la plus haute. */
export function choisirPack(manifeste: ManifesteVoix, lang: string): PackVoix | null {
  let meilleur: PackVoix | null = null;
  for (const p of manifeste.packs) {
    if (p.lang !== lang) continue;
    if (!meilleur || p.pack_version > meilleur.pack_version) meilleur = p;
  }
  return meilleur;
}

/** Index clé → { url, texte } d'un pack (jointure base_url + file propre). */
export function indexerClips(pack: PackVoix): Map<string, { url: string; texte?: string }> {
  const base = pack.base_url.endsWith('/') ? pack.base_url : `${pack.base_url}/`;
  const index = new Map<string, { url: string; texte?: string }>();
  for (const clip of pack.clips) {
    const file = clip.file.startsWith('/') ? clip.file.slice(1) : clip.file;
    index.set(clip.key, { url: base + file, texte: clip.texte });
  }
  return index;
}
