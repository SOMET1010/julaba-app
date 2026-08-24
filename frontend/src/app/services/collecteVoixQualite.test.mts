// Tests du contrôle qualité de collecte (Studio v1) — module pur.
// Lancer :  npx tsx src/app/services/collecteVoixQualite.test.mts

import { verifierQualite } from "./collecteVoixQualite.js";

let failures = 0;
function ok(cond: boolean, label: string): void {
  if (cond) console.log(`  ✓ ${label}`);
  else { failures++; console.error(`  ✗ ${label}`); }
}

function silence(n: number): Float32Array { return new Float32Array(n); }
function ton(n: number, amplitude: number): Float32Array {
  const s = new Float32Array(n);
  for (let i = 0; i < n; i++) s[i] = amplitude * Math.sin((i / n) * Math.PI * 40);
  return s;
}

function main(): void {
  const SR = 16000;

  console.log("\n[1] Clip correct — accepté");
  const bon = ton(SR * 2, 0.4); // 2 s, amplitude franche, pas saturée
  const v1 = verifierQualite(bon, SR);
  ok(v1.ok === true, "2 s à amplitude 0.4 → accepté");
  ok(v1.raisons.length === 0, "aucune raison de rejet");
  ok(Math.abs(v1.duree_s - 2) < 0.01, "durée mesurée ≈ 2 s");

  console.log("\n[2] Trop court / trop long");
  const court = verifierQualite(ton(Math.round(SR * 0.2), 0.4), SR);
  ok(!court.ok && court.raisons.some((r) => r.includes('court')), "0,2 s → rejeté (trop court)");
  const long = verifierQualite(ton(SR * 12, 0.4), SR);
  ok(!long.ok && long.raisons.some((r) => r.includes('long')), "12 s → rejeté (trop long)");

  console.log("\n[3] Silence");
  const muet = verifierQualite(silence(SR * 2), SR);
  ok(!muet.ok && muet.raisons.some((r) => r.includes('silence')), "silence total → rejeté");

  console.log("\n[4] Écrêtage (saturation)");
  const sature = verifierQualite(ton(SR * 2, 0.995), SR);
  ok(!sature.ok && sature.raisons.some((r) => r.includes('saturé')), "amplitude quasi-max soutenue → rejeté (écrêtage)");

  console.log("\n[5] Aucun échantillon");
  const vide = verifierQualite(new Float32Array(0), SR);
  ok(!vide.ok, "0 échantillon → rejeté");

  console.log(failures === 0 ? "\nTous les tests collecteVoixQualite passent." : `\n${failures} échec(s).`);
  if (failures > 0) process.exit(1);
}

main();
