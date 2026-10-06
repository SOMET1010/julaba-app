import { shouldQueueVoiceAction } from "./offlineVoicePolicy";

export type VoiceDispatchResult =
  | { status: "queued"; message: string }
  | { status: "executed" }
  | { status: "skipped" };

export async function dispatchVoiceAction(params: {
  isOnline: boolean;
  hasAction: boolean;
  /** Intention reconnue — voir offlineVoicePolicy.ts : certaines intentions
   * (ex. « vendre » depuis le Lot 2, qui n'agit que sur le panier local)
   * s'exécutent immédiatement même hors ligne. */
  intent?: string;
  offlineLocalIntents?: string[];
  text: string;
  context: Record<string, unknown>;
  enqueue: (text: string, context: Record<string, unknown>) => void;
  execute: () => Promise<void>;
}): Promise<VoiceDispatchResult> {
  if (!params.hasAction) return { status: "skipped" };
  if (shouldQueueVoiceAction(params.isOnline, true, params.intent, params.offlineLocalIntents)) {
    if (params.text) params.enqueue(params.text, params.context);
    return {
      status: "queued",
      message: "Commande gardée sur ce téléphone. Elle sera synchronisée quand le réseau reviendra.",
    };
  }
  await params.execute();
  return { status: "executed" };
}
