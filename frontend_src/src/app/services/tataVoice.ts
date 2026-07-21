// ──────────────────────────────────────────────────────────────────────────
// Voix « Tata Nanti Lou » — bibliothèque de phrases PRÉ-ENREGISTRÉES.
//
// Vraie voix ivoirienne (enregistrée par une vraie personne), embarquée dans
// l'appli : 100 % sur l'appareil, ZÉRO cloud, zéro coût, marche hors-ligne.
// Chaque clé = une phrase FIXE de l'assistante ; on joue le clip tel quel.
// Les phrases dynamiques (montants qui changent : « 2 000 francs ») ne peuvent
// pas être pré-enregistrées → elles restent dites par la voix de secours.
//
// Les clips vivent dans public/voix/tata/phrase-N.mp3 et sont mis en cache par
// le service worker après la première lecture (donc dispo hors-ligne ensuite).
// ──────────────────────────────────────────────────────────────────────────

const BASE = '/voix/tata';

export interface TataClip {
  file: string;
  /** Le texte EXACT prononcé dans le clip (affiché à l'écran pour coller à l'audio). */
  texte: string;
}

// clé → { fichier, texte prononcé }. Numéro = ligne du script d'enregistrement.
export const TATA_CLIPS: Record<string, TataClip> = {
  bonjour:            { file: `${BASE}/phrase-1.mp3`,  texte: "Bonjour ma chérie ! Contente de te voir. On va bien travailler aujourd'hui." },
  vente_enregistree:  { file: `${BASE}/phrase-2.mp3`,  texte: "C'est noté. Ta vente est bien enregistrée." },
  cest_fait:          { file: `${BASE}/phrase-3.mp3`,  texte: "Voilà, c'est fait ! Bravo, continue comme ça." },
  bien_recu:          { file: `${BASE}/phrase-5.mp3`,  texte: "Bien reçu ! J'enregistre tout de suite." },
  annule:             { file: `${BASE}/phrase-6.mp3`,  texte: "D'accord, j'annule. Pas de souci." },
  reflexion:          { file: `${BASE}/phrase-7.mp3`,  texte: "Je réfléchis un instant… je calcule ça pour toi." },
  je_note:            { file: `${BASE}/phrase-8.mp3`,  texte: "Je note ta vente." },
  pas_compris:        { file: `${BASE}/phrase-9.mp3`,  texte: "Je n'ai pas bien compris. Redis-moi ça autrement, s'il te plaît." },
  rien_entendu:       { file: `${BASE}/phrase-10.mp3`, texte: "Je n'ai rien entendu. Réessaie, parle un peu plus fort." },
  souci_reseau:       { file: `${BASE}/phrase-11.mp3`, texte: "Il y a un petit souci de réseau. Réessaie, s'il te plaît." },
  hors_ligne:         { file: `${BASE}/phrase-12.mp3`, texte: "Tu es hors-ligne, mais ne t'inquiète pas : je garde ta demande et je l'enregistre dès que le réseau revient." },
  ouvre_journee:      { file: `${BASE}/phrase-13.mp3`, texte: "Ouvre d'abord ta journée pour enregistrer une vente." },
  felicitations:      { file: `${BASE}/phrase-18.mp3`, texte: "Félicitations ! Tu as atteint ton objectif du jour." },
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
