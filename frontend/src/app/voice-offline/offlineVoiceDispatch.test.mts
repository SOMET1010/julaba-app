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

  // Lot 2 (convergence voix/tactile POS) : « vendre » n'agit que sur le
  // panier local (aucune écriture serveur) — doit s'exécuter IMMÉDIATEMENT
  // même hors ligne, jamais mis en file, jamais de message de synchronisation.
  const enqueueAppele: { count: number } = { count: 0 };
  let executeAppele = 0;
  const resultVendre = await dispatchVoiceAction({
    isOnline: false,
    hasAction: true,
    intent: "vendre",
    offlineLocalIntents: ["vendre"],
    text: "J'ai vendu 2 tomates à 1000 francs",
    context: { module: "caisse" },
    enqueue: () => { enqueueAppele.count++; },
    execute: async () => { executeAppele++; },
  });
  ok(resultVendre.status === "executed", "« vendre » hors ligne avec offlineLocalIntents : exécution immédiate, jamais mise en file");
  ok(executeAppele === 1, "l'effet (ajout panier) est bien exécuté");
  ok(enqueueAppele.count === 0, "aucune commande texte mise en file pour cette intention locale");

  // Une AUTRE intention (dépense) reste mise en file hors ligne, même avec
  // offlineLocalIntents actif pour « vendre » uniquement.
  let executeDepense = 0;
  const resultDepense = await dispatchVoiceAction({
    isOnline: false,
    hasAction: true,
    intent: "depense",
    offlineLocalIntents: ["vendre"],
    text: "J'ai dépensé 500 francs pour du transport",
    context: { module: "caisse" },
    enqueue: () => {},
    execute: async () => { executeDepense++; },
  });
  ok(resultDepense.status === "queued", "« depense » (hors liste locale) reste mise en file hors ligne");
  ok(executeDepense === 0, "« depense » n'est jamais exécutée immédiatement hors ligne");
}

void main().then(() => {
  console.log(failures === 0 ? "\nDispatch vocal hors ligne validé." : `\n${failures} échec(s).`);
  if (failures > 0) process.exit(1);
});
