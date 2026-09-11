import { dispatchVoiceAction } from "./offlineVoiceDispatch.js";

let failures = 0;
function ok(condition: boolean, label: string): void {
  if (condition) console.log(`  ✓ ${label}`);
  else { failures++; console.error(`  ✗ ${label}`); }
}

async function main(): Promise<void> {
  const queued: { current: { text: string; context: Record<string, unknown> } | null } = { current: null };
  let backendCalls = 0;
  const result = await dispatchVoiceAction({
    isOnline: false,
    hasAction: true,
    text: "J'ai vendu 3 tomates à 500 francs",
    context: { module: "caisse" },
    enqueue: (text, context) => { queued.current = { text, context }; },
    execute: async () => { backendCalls++; },
  });

  ok(result.status === "queued", "hors ligne : la commande est mise en file");
  ok(backendCalls === 0, "hors ligne : onAction/backend n’est jamais appelé");
  ok(queued.current?.text === "J'ai vendu 3 tomates à 500 francs", "le texte exact est gardé localement");
  ok(queued.current?.context.module === "caisse", "le contexte de vente accompagne la file");
  ok(result.status === "queued" && result.message.includes("synchronisée"), "un message utilisateur de synchronisation est fourni");
}

void main().then(() => {
  console.log(failures === 0 ? "\nDispatch vocal hors ligne validé." : `\n${failures} échec(s).`);
  if (failures > 0) process.exit(1);
});
