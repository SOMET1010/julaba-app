// Tests du Studio Voice v0 — encodeur WAV + squelette de manifeste (modules purs).
// Lancer :  npx tsx src/app/services/studioWav.test.mts

import { encoderWav, genererManifesteStudio } from "./studioWav.js";
import { validerManifeste } from "./voicePacks.js";

let failures = 0;
function ok(cond: boolean, label: string): void {
  if (cond) console.log(`  ✓ ${label}`);
  else { failures++; console.error(`  ✗ ${label}`); }
}

function main(): void {
  console.log("\n[1] Encodeur WAV — en-tête RIFF conforme");
  const samples = new Float32Array([0, 0.5, -0.5, 1, -1, 2, -2]); // 2/-2 = à écrêter
  const buf = encoderWav(samples, 48000);
  const v = new DataView(buf);
  const txt = (o: number, n: number) => Array.from({ length: n }, (_, i) => String.fromCharCode(v.getUint8(o + i))).join("");
  ok(buf.byteLength === 44 + samples.length * 2, "taille totale = 44 + 2 octets/échantillon");
  ok(txt(0, 4) === "RIFF" && txt(8, 4) === "WAVE" && txt(12, 4) === "fmt " && txt(36, 4) === "data", "balises RIFF/WAVE/fmt/data");
  ok(v.getUint16(20, true) === 1 && v.getUint16(22, true) === 1, "PCM mono");
  ok(v.getUint32(24, true) === 48000, "48 kHz");
  ok(v.getUint16(34, true) === 16, "16 bits");
  ok(v.getUint32(40, true) === samples.length * 2, "taille du bloc data");

  console.log("\n[2] Quantification et écrêtage");
  ok(v.getInt16(44, true) === 0, "0.0 → 0");
  ok(v.getInt16(46, true) === Math.floor(0.5 * 0x7fff), "0.5 → mi-échelle positive (troncature Int16)");
  ok(v.getInt16(50, true) === 0x7fff, "1.0 → maximum");
  ok(v.getInt16(52, true) === -0x8000, "-1.0 → minimum");
  ok(v.getInt16(54, true) === 0x7fff && v.getInt16(56, true) === -0x8000, "hors bornes → écrêté proprement");

  console.log("\n[3] Manifeste du studio — accepté par le validateur des packs");
  const manifeste = genererManifesteStudio(
    [{ key: "intro_accueil", texte: "Bonjour ! Moi, c'est Tata." }],
    "https://exemple.ci/voix/fr/tata_v2/2",
    2,
  );
  const valide = validerManifeste(manifeste);
  ok(valide !== null, "le squelette passe validerManifeste tel quel");
  ok(valide!.packs[0].pack_version === 2, "version transportée");
  ok(valide!.packs[0].clips[0].file === "intro_accueil.mp3", "fichier nommé par la clé");
  ok(valide!.packs[0].clips[0].texte === "Bonjour ! Moi, c'est Tata.", "texte transporté");

  console.log(failures === 0 ? "\nTous les tests studioWav passent." : `\n${failures} échec(s).`);
  if (failures > 0) process.exit(1);
}

main();
