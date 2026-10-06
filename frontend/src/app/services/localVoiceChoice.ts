export type LocalVoiceChoice =
  | { mode: "clip"; clipUrl: string }
  | { mode: "text_only" };

/**
 * Le choix B interdit tout repli vers une voix de téléphone ou un service web.
 * Une réponse est dite uniquement si un clip Tata embarqué existe.
 */
export function resolveLocalVoiceChoice(clipUrl?: string | null): LocalVoiceChoice {
  return clipUrl ? { mode: "clip", clipUrl } : { mode: "text_only" };
}

export async function playTataChoice(
  choice: LocalVoiceChoice,
  playClip: (clipUrl: string) => Promise<void>,
): Promise<void> {
  if (choice.mode === "clip") await playClip(choice.clipUrl);
}
