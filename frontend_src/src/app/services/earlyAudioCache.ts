/**
 * earlyAudioCache.ts
 * Cache audio local pour feedback instantané (<50ms)
 * Sons pré-générés via ElevenLabs au démarrage de l'app
 */
import { API_URL } from "../utils/api";

interface CachedAudio {
  buffer: AudioBuffer | null;
  loading: boolean;
  loaded: boolean;
}

const cache = new Map<string, CachedAudio>();
let _ctx: AudioContext | null = null;

// Sons courts à pré-générer
export const EARLY_SOUNDS = {
  // Feedback generiques
  ok:              "Ok",
  daccord:         "D accord",
  jenregistre:     "J enregistre",
  instant:         "Instant",
  jecoute:         "J ecoute",
  cestfait:        "C est fait",
  // Caisse / vente
  vente_ok:        "Vente enregistrée",
  confirme:        "Confirme",
  jannule:         "J annule",
  cestbon:         "C est bon",
  cestcombien:     "C est combien",
  jescoute_vente:  "Dis-moi ce que tu as vendu",
  quantite:        "Quelle quantite",
  quel_produit:    "Quel produit",
  // Depenses
  depense_ok:      "Depense notee",
  pour_quoi:       "Pour quoi cette depense",
  // Stock
  stock_ok:        "Stock mis a jour",
  ajouter_stock:   "Tu veux ajouter du stock",
  // Conversation
  je_reflechis:    "Je reflechis",
  un_moment:       "Un moment",
  pas_compris:     "Dis encore",
  bravo:           "Bravo",
  bien_travaille:  "Tu as bien travaille",
  // Navigation
  je_charge:       "Je charge",
  voila:           "Voila",
  // Erreurs
  reseau:          "Reseau lent, attends",
  reessaie:        "Reessaie",
  // Confirmation
  cest_ca:         "C est ca",
  on_est_bon:      "On est bon",
} as const;

export type EarlySound = keyof typeof EARLY_SOUNDS;

function getCtx(): AudioContext {
  if (!_ctx || _ctx.state === "closed") {
    // Android Chrome : webkitAudioContext fallback
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    _ctx = new AC();
  }
  // iOS Safari + Android Chrome — toujours résoudre le contexte suspendu
  if (_ctx.state === "suspended") {
    _ctx.resume().catch(() => {});
  }
  return _ctx;
}

// iOS Safari : débloquer AudioContext sur premier geste utilisateur
export function unlockAudioContextIOS(): void {
  const ctx = getCtx();
  if (ctx.state === "suspended") {
    ctx.resume().then(() => {
    }).catch(() => {});
  }
}

// Pré-charger tous les sons au démarrage
// Sons prioritaires chargés immédiatement
const PRIORITY_SOUNDS: EarlySound[] = [
  "ok", "cestfait", "je_reflechis",
];

// Sons secondaires chargés après 3s
const SECONDARY_SOUNDS: EarlySound[] = [
  "instant", "jecoute", "confirme", "jannule", "quantite",
  "quel_produit", "pour_quoi", "stock_ok", "ajouter_stock",
  "un_moment", "pas_compris", "bravo", "bien_travaille",
  "je_charge", "voila", "reseau", "reessaie", "cest_ca",
  "on_est_bon", "cestcombien",
];

export async function preloadEarlyAudios(): Promise<void> {
  // Phase 1 : sons prioritaires en parallèle
  const p1 = PRIORITY_SOUNDS.map(key => preloadOne(key, EARLY_SOUNDS[key]));
  await Promise.allSettled(p1);

  // Phase 2 : sons secondaires après 2s (ne bloque pas)
  setTimeout(() => {
    const p2 = SECONDARY_SOUNDS.map(key => preloadOne(key, EARLY_SOUNDS[key]));
    Promise.allSettled(p2).then(() => {
    });
  }, 5000);
}

async function preloadOne(key: EarlySound, text: string): Promise<void> {
  if (cache.has(key)) return;
  cache.set(key, { buffer: null, loading: true, loaded: false });
  try {
    const url = `${API_URL}/tts/openai`;
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.audio) throw new Error("No audio");

    // Décoder base64 → ArrayBuffer → AudioBuffer
    const binary = atob(data.audio);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const ctx = getCtx();
    const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
    cache.set(key, { buffer: audioBuffer, loading: false, loaded: true });
  } catch (e) {
    cache.set(key, { buffer: null, loading: false, loaded: false });
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[EARLY_AUDIO] ❌ ${key} échec:`, e);
    }
  }
}

// Jouer immédiatement depuis cache — <10ms
export function playEarlyAudio(key: EarlySound): boolean {
  const entry = cache.get(key);
  if (!entry?.loaded || !entry.buffer) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[EARLY_AUDIO] ${key} pas encore prêt`);
    }
    return false;
  }
  try {
    const ctx = getCtx();
    if (ctx.state === 'closed') return false;
    if (ctx.state === 'suspended') void ctx.resume();
    const source = ctx.createBufferSource();
    source.buffer = entry.buffer;
    source.connect(ctx.destination);
    source.start(0);
    return true;
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[EARLY_AUDIO] Erreur lecture ${key}:`, e);
    }
    return false;
  }
}

// Choisir le bon son selon l'intent détecté
export function getEarlyAudioForIntent(intent: string): EarlySound {
  switch (intent) {
    case "vendre":           return "jescoute_vente";
    case "depense":          return "jenregistre";
    case "ajouter_stock":    return "ajouter_stock";
    case "consulter_solde":  return "instant";
    case "consulter_ventes": return "je_charge";
    case "ouvrir_journee":   return "daccord";
    case "fermer_journee":   return "daccord";
    case "conversation":     return "je_reflechis";
    default:                 return "ok";
  }
}

// Jouer un son de succès selon l'intent
export function getSuccessAudioForIntent(intent: string): EarlySound {
  switch (intent) {
    case "vendre":        return "vente_ok";
    case "depense":       return "depense_ok";
    case "ajouter_stock": return "stock_ok";
    default:              return "cestfait";
  }
}
