// ──────────────────────────────────────────────────────────────────────────
// Voix « Tata Nanti Lou » — bibliothèque de phrases PRÉ-ENREGISTRÉES.
//
// Vraie voix ivoirienne (enregistrée par une vraie personne), embarquée dans
// l'appli : 100 % sur l'appareil, ZÉRO cloud, zéro coût, marche hors-ligne.
// Chaque clé = une phrase FIXE de l'assistante ; on joue le clip tel quel.
// Les phrases dynamiques (montants qui changent : « 2 000 francs ») ne peuvent
// pas être pré-enregistrées → elles restent dites par la voix de secours.
//
// Les clips vivent dans public/voix/tata/ui-N.mp3 et sont mis en cache par le
// service worker (donc dispo hors-ligne).
//
// ⚠️ HISTORIQUE : un ancien lot `phrase-*.mp3` (24 fichiers, 64 kb/s, ~7,5 s) était
// une VOIX SYNTHÉTIQUE de test (« Manuela ») — PAS Tata. Il parlait à la caisse
// (« C'est noté… ») → d'où la fausse voix entendue à la vente. Ce lot a été
// SUPPRIMÉ. On ne pointe plus QUE vers les 137 vrais clips de Tata (`ui-*.mp3`,
// 96 kb/s). Les clés sans clip enregistré équivalent sont retirées → elles passent
// par la voix de secours FR (jamais « Manuela »).
// ──────────────────────────────────────────────────────────────────────────

const BASE = '/voix/tata';

export interface TataClip {
  file: string;
  /** Le texte EXACT prononcé dans le clip (affiché à l'écran pour coller à l'audio). */
  texte: string;
}

// clé → VRAI clip de Tata (ui-*.mp3). Le moment clé « vente confirmée » est bien
// sa vraie voix. Les clés absentes retombent sur la voix de secours FR.
export const TATA_CLIPS: Record<string, TataClip> = {
  vente_enregistree:  { file: `${BASE}/ui-128.mp3`, texte: "Vente confirmée" },
  cest_fait:          { file: `${BASE}/ui-128.mp3`, texte: "Vente confirmée" },
  je_note:            { file: `${BASE}/ui-128.mp3`, texte: "Vente confirmée" },
  vente_refusee:      { file: `${BASE}/ui-129.mp3`, texte: "Vente refusée" },
  depense_enregistree:{ file: `${BASE}/ui-034.mp3`, texte: "Dépense enregistrée" },
  bien_recu:          { file: `${BASE}/ui-057.mp3`, texte: "J'ai compris" },
  annule:             { file: `${BASE}/ui-011.mp3`, texte: "Commande annulée" },
  souci_reseau:       { file: `${BASE}/ui-047.mp3`, texte: "Erreur réseau. Réessaie." },
  hors_ligne:         { file: `${BASE}/ui-073.mp3`, texte: "Mode hors ligne" },
  ouvre_journee:      { file: `${BASE}/ui-091.mp3`, texte: "Ouvre ta journée pour activer ta caisse" },
};

/** URL du clip pour une clé donnée, ou null si inconnue. */
export function tataClipUrl(key: string): string | null {
  return TATA_CLIPS[key]?.file ?? null;
}

/** Texte prononcé par le clip (pour l'afficher à l'écran), ou null. */
export function tataClipTexte(key: string): string | null {
  return TATA_CLIPS[key]?.texte ?? null;
}

let _preloaded = false;
/** Précharge les clips en cache navigateur (lecture instantanée + hors-ligne). */
export function preloadTataClips(): void {
  if (_preloaded || typeof window === 'undefined') return;
  _preloaded = true;
  try {
    for (const { file } of Object.values(TATA_CLIPS)) {
      const a = new Audio();
      a.preload = 'auto';
      a.src = file;
    }
  } catch { /* ignore */ }
}
