/**
 * STUB du SEUL maillon qu'un Chromium headless ne peut pas jouer : la
 * TRANSCRIPTION (sherpa-onnx n'existe pas hors de l'APK).
 *
 * POURQUOI CE STUB REMPLACE `offlineStt` ET PLUS `useVoiceCore` (22/09/2026).
 * Le banc bouchonnait le MOTEUR VOCAL ENTIER. Son `dicter` tenait en trois
 * lignes — `setTranscript(texte)` puis, si `intentLocal` reconnaissait quelque
 * chose, `onAction`. Tout ce que le vrai moteur fait APRÈS la transcription
 * était donc absent du banc :
 *
 *   - la branche « entendu mais pas compris », qui dit « Je n'ai pas bien
 *     compris. Redis-moi ça autrement » — c'est-à-dire l'exact contraire du
 *     bandeau « J'ai compris » et de l'écran de prix que la relecture de
 *     caisse ouvre au même instant ;
 *   - la file hors ligne, les phrases d'attente, la machine d'états
 *     (`processing` → `thinking` → `idle`), le verrou parole/écoute.
 *
 * Un banc qui remplace le moteur ne prouve rien du moteur. Ici, le moteur est
 * le VRAI : on ne lui ment que sur ce que le micro a entendu, ce qu'aucun
 * navigateur sans micro ne peut fournir.
 *
 * `window.__prochaineTranscription` porte la phrase que le banc veut faire
 * « entendre » ; `__transcriptionsDemandees` compte les appels, pour qu'un
 * parcours ne puisse pas croire qu'il a dicté alors que rien n'a été capté.
 */

const fenetre = () => window as unknown as {
  __prochaineTranscription?: string;
  __transcriptionsDemandees?: number;
};

export function offlineModelReady(): boolean { return true; }
export function offlineModelInstalled(): boolean { return true; }
export async function ensureOfflineModel(): Promise<void> { /* déjà prêt */ }
export function warmOfflineModelIfInstalled(): void { /* rien à chauffer */ }

export async function startLiveDictation(): Promise<{ stop: () => Promise<string> }> {
  return { stop: async () => fenetre().__prochaineTranscription || '' };
}

export async function transcribeWav(): Promise<string> {
  const w = fenetre();
  w.__transcriptionsDemandees = (w.__transcriptionsDemandees || 0) + 1;
  return w.__prochaineTranscription || '';
}
