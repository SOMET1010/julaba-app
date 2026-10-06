// Tests de la file de collecte (Studio v1) — store mémoire (sans IndexedDB,
// donc exécutable en Node comme le reste de la chaîne test:ci).
// Lancer :  npx tsx src/app/services/collecteVoixDB.test.mts

import { memoryCollecteStore, type ClipCollecte } from "./collecteVoixDB.js";

let failures = 0;
function ok(cond: boolean, label: string): void {
  if (cond) console.log(`  ✓ ${label}`);
  else { failures++; console.error(`  ✗ ${label}`); }
}

function clip(id: string, over: Partial<ClipCollecte> = {}): ClipCollecte {
  return {
    clip_id: id, prompt_id: 'chiffre_1', task_type: 'elicit_image', lang: 'fr',
    speaker_id: 'loc-test', consent_version: 'v1', ts: Date.now(), duree_s: 1.2,
    audio: new Blob(['x']), votes_up: 0, votes_down: 0, statut: 'pending',
    ...over,
  };
}

async function main(): Promise<void> {
  console.log("\n[1] Enfilage et lecture");
  const store = memoryCollecteStore();
  ok((await store.count()) === 0, "file vide au départ");
  await store.enqueue(clip('a', { ts: 1 }));
  await store.enqueue(clip('b', { ts: 2 }));
  ok((await store.count()) === 2, "2 clips enfilés");
  const liste = await store.list();
  ok(liste[0].clip_id === 'b', "le plus récent (ts=2) arrive en premier");

  console.log("\n[2] Validation par paires — règle 2 votes");
  await store.enqueue(clip('c'));
  let c = await store.voter('c', true);
  ok(c?.statut === 'pending', "1 vote positif → toujours en attente");
  c = await store.voter('c', true);
  ok(c?.statut === 'validated' && c.votes_up === 2, "2 votes positifs → validé");

  console.log("\n[3] Rejet par paires");
  await store.enqueue(clip('d'));
  await store.voter('d', false);
  const d = await store.voter('d', false);
  ok(d?.statut === 'rejected' && d.votes_down === 2, "2 votes négatifs → rejeté");

  console.log("\n[4] Votes mixtes — ne bascule que sur 2 votes du MÊME sens");
  await store.enqueue(clip('e'));
  await store.voter('e', true);
  const e = await store.voter('e', false);
  ok(e?.statut === 'pending', "1 pour + 1 contre → reste en attente (pas de majorité 2)");

  console.log("\n[5] Voter un clip inconnu ne casse rien");
  const inconnu = await store.voter('zzz', true);
  ok(inconnu === undefined, "clip inconnu → undefined, pas d'exception");

  console.log("\n[6] Suppression");
  await store.remove('a');
  ok((await store.get('a')) === undefined, "clip supprimé introuvable ensuite");

  console.log(failures === 0 ? "\nTous les tests collecteVoixDB passent." : `\n${failures} échec(s).`);
  if (failures > 0) process.exit(1);
}

void main();
