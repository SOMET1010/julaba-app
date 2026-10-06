import { fetchTTSLocal } from "./elevenlabs.js";
import { initVoicePacks, packClipUrl } from "./voicePacksRuntime.js";
import * as audioManager from "./audioManager.js";

let failures = 0;
function ok(condition: boolean, label: string): void {
  if (condition) console.log(`  ✓ ${label}`);
  else { failures++; console.error(`  ✗ ${label}`); }
}

async function main(): Promise<void> {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls++;
    throw new Error("Un appel réseau vocal est interdit au runtime");
  }) as typeof fetch;

  try {
    await initVoicePacks();
    ok(calls === 0, "le manifeste de voix ne lance aucun appel réseau");
    ok(packClipUrl("vente_enregistree") === null, "aucun pack distant ne remplace un clip Tata embarqué");

    const audio = await fetchTTSLocal("I ni ce", "dioula");
    ok(audio === null, "le TTS Dioula ne contacte pas un service distant sans pack local");
    ok(calls === 0, "le chemin TTS local ne déclenche aucun appel réseau");

    let localTtsCalls = 0;
    audioManager.__reset();
    audioManager.__setPlayers(
      () => {
        localTtsCalls++;
        return { promise: Promise.resolve("ended"), stop() {} };
      },
      () => ({ promise: Promise.resolve("failed"), stop() {} }),
    );
    await audioManager.speakClipOrText({ text: "Réponse française sans clip Tata" });
    ok(calls === 0, "le repli français sans clip reste une voix locale sans fetch");
    ok(localTtsCalls === 1, "le repli français utilise uniquement le lecteur local injecté");
    audioManager.__resetPlayers();
    audioManager.__reset();
  } finally {
    globalThis.fetch = originalFetch;
  }

  console.log(failures === 0 ? "\nTous les tests runtime voix hors ligne passent." : `\n${failures} échec(s).`);
  if (failures > 0) process.exit(1);
}

void main();
