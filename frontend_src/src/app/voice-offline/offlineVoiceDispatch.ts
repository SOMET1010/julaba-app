import { shouldQueueVoiceAction } from "./offlineVoicePolicy";

export type VoiceDispatchResult =
  | { status: "queued"; message: string }
  | { status: "executed" }
  | { status: "skipped" };

export async function dispatchVoiceAction(params: {
  isOnline: boolean;
  hasAction: boolean;
  text: string;
  context: Record<string, unknown>;
  enqueue: (text: string, context: Record<string, unknown>) => void;
  execute: () => Promise<void>;
}): Promise<VoiceDispatchResult> {
  if (!params.hasAction) return { status: "skipped" };
  if (shouldQueueVoiceAction(params.isOnline, true)) {
    if (params.text) params.enqueue(params.text, params.context);
    return {
      status: "queued",
      message: "Commande gardée sur ce téléphone. Elle sera synchronisée quand le réseau reviendra.",
    };
  }
  await params.execute();
  return { status: "executed" };
}
