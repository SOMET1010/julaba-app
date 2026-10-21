// ──────────────────────────────────────────────────────────────────────────
// Packs de voix — RUNTIME HORS LIGNE.
//
// Julaba ne contacte aucun CDN ni API pendant une vente vocale. Les clips de
// Tata sont embarqués dans l'application et pris en charge par tataVoice.ts.
// Les manifestes distants restent un outil de préparation hors runtime, jamais
// une source audio de production sur le téléphone de la marchande.
// ──────────────────────────────────────────────────────────────────────────

/** Aucun clip distant n’est autorisé au runtime : tataVoice choisit l’asset local. */
export function packClipUrl(_key: string): string | null {
  return null;
}

/** Aucun texte de manifeste distant n’est utilisé au runtime. */
export function packClipTexte(_key: string): string | null {
  return null;
}

/** Compatibilité d’appel : n’effectue volontairement aucune opération réseau. */
export async function initVoicePacks(): Promise<void> {
  return;
}

/** Conservé pour les anciens tests ; il n’expose aucun manifeste au runtime. */
export function __setManifestForTests(_json: unknown | null): void {
  return;
}
