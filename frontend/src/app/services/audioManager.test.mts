/**
 * Démonstration des courses d'exécution du chef d'orchestre (audioManager).
 * Lancer : npx tsx src/app/services/audioManager.test.mts
 *
 * On injecte des lecteurs FACTICES (pas de DOM/speechSynthesis) : chaque lecture
 * expose { promise, stop }, ne se termine JAMAIS toute seule (audio « long »)
 * sauf si le test appelle end()/fail(), et se résout sur stop() ('cancelled').
 */
import * as am from "./audioManager.js";
import { nextObjectifAlert } from "../contexts/objectifAlerts.js";

const tick = () => new Promise((r) => setTimeout(r, 0));

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}
function eq(a: unknown, b: unknown, label: string) {
  ok(JSON.stringify(a) === JSON.stringify(b), `${label}  (attendu ${JSON.stringify(b)}, obtenu ${JSON.stringify(a)})`);
}

function makeMocks() {
  const events: string[] = [];
  const active = new Map<string, (r: am.PlayResult) => void>();
  const mk = (kind: string, id: string): am.Playback => {
    events.push(`${kind}:start:${id}`);
    let settle!: (r: am.PlayResult) => void;
    const promise = new Promise<am.PlayResult>((res) => (settle = res));
    active.set(id, settle);
    return {
      promise,
      stop: () => { const s = active.get(id); if (!s) return; active.delete(id); events.push(`${kind}:stop:${id}`); s("cancelled"); },
    };
  };
  return {
    events,
    tts: (text: string) => mk("tts", text),
    clip: (src: { url?: string; base64?: string }) => mk("clip", src.url ?? src.base64 ?? "?"),
    end: (id: string) => { const s = active.get(id); if (s) { active.delete(id); events.push(`end:${id}`); s("ended"); } },
    fail: (id: string) => { const s = active.get(id); if (s) { active.delete(id); events.push(`fail:${id}`); s("failed"); } },
    playingCount: () => active.size,
  };
}

async function main() {
  // ── Scénario 1 : interruption d'un CLIP ne fige jamais la chaîne (P1a) ──────
  console.log("\n[1] Interruption d'un clip (la chaîne ne se fige pas)");
  {
    am.__reset(); const m = makeMocks(); am.__setPlayers(m.tts, m.clip);
    let aResolved = false;
    const clipDone = am.playClip({ url: "A" }).then(() => { aResolved = true; });
    await tick();
    ok(m.events.includes("clip:start:A"), "le clip A démarre");
    let bResolved = false;
    const bDone = am.speak("B").then(() => { bResolved = true; });
    await tick(); await tick();
    ok(m.events.includes("clip:stop:A"), "le clip A est coupé");
    ok(m.events.includes("tts:start:B"), "la voix B démarre (chaîne débloquée)");
    ok(aResolved, "la promesse du clip A s'est résolue (pas de blocage)");
    m.end("B"); await tick(); await bDone; await clipDone;
    ok(bResolved, "la promesse de B se résout après lecture");
    ok(m.playingCount() === 0, "plus aucune lecture active");
  }

  // ── Scénario 2 : interruption d'un TTS multi-chunks, sans chevauchement ─────
  console.log("\n[2] Interruption d'un TTS long (pas de reprise par-dessus)");
  {
    am.__reset(); const m = makeMocks(); am.__setPlayers(m.tts, m.clip);
    am.speak("LONG"); await tick();
    ok(m.events.includes("tts:start:LONG"), "TTS long démarre");
    am.speak("NEW"); await tick(); await tick();
    ok(m.events.includes("tts:stop:LONG"), "TTS long coupé");
    ok(m.events.includes("tts:start:NEW"), "TTS NEW démarre");
    eq(m.playingCount(), 1, "une seule lecture active (pas de chevauchement)");
  }

  // ── Scénario 3 : 3 demandes rapides → seule la dernière joue ────────────────
  console.log("\n[3] Trois demandes rapides : seule la dernière joue");
  {
    am.__reset(); const m = makeMocks(); am.__setPlayers(m.tts, m.clip);
    am.speak("A"); am.speak("B"); am.speak("C"); // synchrone, aucune ne démarre encore
    await tick(); await tick();
    const starts = m.events.filter((e) => e.startsWith("tts:start:"));
    eq(starts, ["tts:start:C"], "seule C a démarré (A et B sautées, pas de backlog)");
  }

  // ── Scénario 3b : 'user' interrompt 'auto' ; 'auto' ne s'empile pas ─────────
  console.log("\n[3b] user interrompt auto ; auto ne s'empile pas");
  {
    am.__reset(); const m = makeMocks(); am.__setPlayers(m.tts, m.clip);
    am.speakAuto("AUTO"); await tick();
    ok(m.events.includes("tts:start:AUTO"), "AUTO démarre (rien d'autre en cours)");
    am.speakAuto("AUTO2"); await tick();
    ok(!m.events.includes("tts:start:AUTO2"), "AUTO2 abandonnée (une auto ne s'empile pas)");
    am.speak("USER"); await tick(); await tick();
    ok(m.events.includes("tts:stop:AUTO"), "USER interrompt AUTO");
    ok(m.events.includes("tts:start:USER"), "USER démarre");
  }

  // ── Scénario 4 : mute pendant lecture ──────────────────────────────────────
  console.log("\n[4] Mute pendant lecture");
  {
    am.__reset(); const m = makeMocks(); am.__setPlayers(m.tts, m.clip);
    am.speak("A"); await tick();
    ok(m.events.includes("tts:start:A"), "A démarre");
    am.setVoiceMuted(true); await tick();
    ok(m.events.includes("tts:stop:A"), "mute coupe A");
    am.speak("B"); await tick();
    ok(!m.events.includes("tts:start:B"), "muet : B ne démarre pas");
    am.setVoiceMuted(false);
    am.speak("C"); await tick();
    ok(m.events.includes("tts:start:C"), "après démuter : C démarre");
  }

  // ── Scénario 5 : navigation puis nouvelle voix ─────────────────────────────
  console.log("\n[5] Navigation coupe l'obsolète, puis nouvelle voix");
  {
    am.__reset(); const m = makeMocks(); am.__setPlayers(m.tts, m.clip);
    am.speak("A"); await tick();
    ok(m.events.includes("tts:start:A"), "A démarre");
    am.cancelObsoleteVoice(); await tick();
    ok(m.events.includes("tts:stop:A"), "navigation coupe A");
    am.speak("B"); await tick();
    ok(m.events.includes("tts:start:B"), "nouvelle voix B démarre");
  }

  // ── Scénario 5b : clip indisponible → repli voix de secours (même créneau) ─
  console.log("\n[5b] speakClipOrText : clip échoue → voix de secours");
  {
    am.__reset(); const m = makeMocks(); am.__setPlayers(m.tts, m.clip);
    am.speakClipOrText({ clipUrl: "K", text: "phrase" }); await tick();
    ok(m.events.includes("clip:start:K"), "le clip K est tenté");
    m.fail("K"); await tick(); await tick();
    ok(m.events.includes("tts:start:phrase"), "clip échoué → voix de secours dit la phrase");
  }

  // ── Scénario 7 : realStartTts RÉEL — chunks, ordre, annulation mi-chunk ─────
  console.log("\n[7] realStartTts réel : chunks + annulation mi-chunk");
  {
    am.__reset(); am.__resetPlayers();
    const spoken: string[] = [];
    const waits: Record<string, () => void> = {};
    am.__setLowLevel(
      async (t: string) => t.split(" "),
      (chunk: string) => new Promise<void>((res) => { spoken.push(chunk); waits[chunk] = () => res(); })
    );
    am.speak("c1 c2 c3"); await tick(); await tick();
    eq(spoken, ["c1"], "1er chunk dit, la boucle attend");
    waits["c1"](); await tick();
    eq(spoken, ["c1", "c2"], "2e chunk enchaîne");
    am.speak("X"); await tick(); await tick(); await tick(); // interruption mi-chunk
    ok(!spoken.includes("c3"), "annulation mi-chunk : le 3e chunk n'est jamais dit");
    ok(spoken.includes("X"), "la nouvelle voix démarre");
    am.__resetLowLevel();
  }

  // ── Scénario 8 : realStartTts — une erreur RÉSOUT la promesse (P1) ──────────
  console.log("\n[8] realStartTts : erreur → promesse résolue (pas de blocage)");
  {
    am.__reset(); am.__resetPlayers();
    am.__setLowLevel(async () => { throw new Error("boom"); }, async () => {});
    let resolved = false;
    am.speak("x").then(() => { resolved = true; });
    await tick(); await tick();
    ok(resolved, "erreur de split/synthé → la promesse résout");
    const spoken2: string[] = [];
    am.__setLowLevel(async (t: string) => [t], (c: string) => { spoken2.push(c); return Promise.resolve(); });
    am.speak("apres"); await tick(); await tick();
    ok(spoken2.includes("apres"), "la voix suivante démarre normalement après l'erreur");
    am.__resetLowLevel();
  }

  // ── Scénario 9 : speakDynamic — stop PENDANT la requête → rien ne repart ────
  console.log("\n[9] speakDynamic : stop pendant la requête réseau");
  {
    am.__reset(); const m = makeMocks(); am.__setPlayers(m.tts, m.clip);
    let releaseFetch!: () => void;
    const fetchP = new Promise<void>((res) => (releaseFetch = res));
    am.speakDynamic(async () => { await fetchP; return { base64: "REMOTE" }; });
    await tick();
    am.stopAllVoice();      // l'utilisatrice coupe pendant la requête
    releaseFetch();         // la requête se termine APRÈS le stop
    await tick(); await tick();
    ok(!m.events.includes("clip:start:REMOTE"), "clip distant NE démarre pas après un stop");
  }

  // ── Scénario 6 : accueil — hydratation ne parle pas ; seul le franchissement ─
  console.log("\n[6] Objectif : hydratation muette, franchissement seul annonce");
  eq(nextObjectifAlert(null, 120, false, false), "none", "hydratation déjà >100% → aucune voix");
  eq(nextObjectifAlert(null, 60, false, false), "none", "hydratation à 60% → aucune voix");
  eq(nextObjectifAlert(40, 60, false, false), "p50", "franchit 50% → annonce");
  eq(nextObjectifAlert(60, 90, false, false), "p80", "franchit 80% → annonce");
  eq(nextObjectifAlert(90, 105, false, false), "p100", "franchit 100% → annonce");
  eq(nextObjectifAlert(105, 110, false, false), "none", "déjà >100% → pas de répétition (même après rechargement)");
  eq(nextObjectifAlert(40, 55, true, false), "none", "drapeau serveur 50% posé → pas de re-annonce");

  am.__resetPlayers();
  console.log(failures === 0 ? "\n✅ TOUS LES SCÉNARIOS PASSENT" : `\n❌ ${failures} échec(s)`);
  if (failures > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
