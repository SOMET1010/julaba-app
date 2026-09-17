/**
 * useAudioUnlockFallback — filet de rattrapage audio (VOIX-V5).
 * Lancer : npm run test:audio-unlock
 *
 * Ce hook est le mécanisme au cœur de « la voix manque sur mobile » : il
 * rejoue une consigne coupée par la politique autoplay, au tout premier
 * toucher de la page. Il n'avait aucun test alors que deux écrans en
 * dépendent (et qu'un troisième — la consigne du code — vient de le
 * rejoindre).
 *
 * Le scénario T4 verrouille le piège déjà rencontré puis documenté dans le
 * hook : une version antérieure filtrait la cible du geste (closest sur
 * button/img) et, l'écouteur étant en mode « une seule fois », un premier
 * tap sur un bouton le consommait SANS jamais jouer le son — silence total
 * pour le reste de la session. C'est exactement le défaut qu'on répare ;
 * il ne doit pas revenir par une « optimisation » future.
 */
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body><div id='root'></div><button id='b'>ok</button></body></html>", {
  url: "https://julaba.local/",
});
Object.defineProperties(globalThis, {
  window: { configurable: true, value: dom.window },
  document: { configurable: true, value: dom.window.document },
  navigator: { configurable: true, value: dom.window.navigator },
});
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const { act, renderHook } = await import("@testing-library/react");
const { useAudioUnlockFallback } = await import("./useAudioUnlockFallback.js");

let failures = 0;
function ok(condition: boolean, label: string): void {
  if (condition) console.log(`  ✓ ${label}`);
  else { failures++; console.error(`  ✗ ${label}`); }
}

/** Un vrai toucher, sur la cible demandée, qui remonte jusqu'à window. */
function toucher(cible: 'page' | 'bouton' = 'page'): void {
  const node = cible === 'bouton' ? dom.window.document.getElementById('b')! : dom.window.document.body;
  act(() => { node.dispatchEvent(new dom.window.Event('pointerdown', { bubbles: true })); });
}

console.log('T1 — le premier toucher rejoue la consigne restée muette');
{
  let appels = 0;
  renderHook(() => useAudioUnlockFallback(() => { appels++; }, true));
  ok(appels === 0, 'rien n\'est joué tant qu\'aucun geste n\'a eu lieu');
  toucher();
  ok(appels === 1, 'le premier toucher rejoue la consigne');
}

console.log('T2 — une seule fois, jamais en boucle');
{
  let appels = 0;
  renderHook(() => useAudioUnlockFallback(() => { appels++; }, true));
  toucher(); toucher(); toucher();
  ok(appels === 1, 'trois touchers ne rejouent qu\'une fois');
}

console.log('T3 — filet désarmé : le hook se tait');
{
  let appels = 0;
  renderHook(() => useAudioUnlockFallback(() => { appels++; }, false));
  toucher();
  ok(appels === 0, 'actif=false ne rejoue jamais (mode lecture, mauvaise étape)');
}

console.log('T4 — RÉGRESSION : la cible du geste ne doit JAMAIS être filtrée');
{
  let appels = 0;
  renderHook(() => useAudioUnlockFallback(() => { appels++; }, true));
  toucher('bouton');
  ok(appels === 1, 'un premier tap sur un BOUTON rejoue quand même la consigne');
}

console.log('T5 — démontage : plus aucun rattrapage');
{
  let appels = 0;
  const { unmount } = renderHook(() => useAudioUnlockFallback(() => { appels++; }, true));
  act(() => { unmount(); });
  toucher();
  ok(appels === 0, 'l\'écouteur est retiré au démontage (pas de fuite)');
}

console.log('T6 — c\'est la DERNIÈRE consigne qui est rejouée, pas celle du premier rendu');
{
  const dits: string[] = [];
  const { rerender } = renderHook(
    ({ texte }: { texte: string }) => useAudioUnlockFallback(() => { dits.push(texte); }, true),
    { initialProps: { texte: 'ancienne consigne' } },
  );
  act(() => { rerender({ texte: 'consigne à jour' }); });
  toucher();
  ok(dits.length === 1 && dits[0] === 'consigne à jour', 'la consigne rejouée suit l\'état courant de l\'écran');
}

if (failures > 0) { console.error(`\n✗ ${failures} échec(s)`); process.exit(1); }
console.log('\n✓ useAudioUnlockFallback — tous les scénarios passent');
