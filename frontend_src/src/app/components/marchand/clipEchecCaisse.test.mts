/**
 * Garde-fou de source — LE CONTRAT ENTRE LA PHRASE ET SON CLIP.
 * Lancer : npm run test:clip-echec-caisse   (tsx, sans DOM)
 *
 * LE DÉFAUT, vu sur l'APK 6f4111d du 25/09. Quand la caisse ne comprend pas,
 * elle affichait « Je n'ai pas compris » — trois mots, AUCUN clip enregistré,
 * donc AUCUNE VOIX. Le code est explicite : en français, « clip Tata
 * enregistré ou texte seul. Jamais de voix navigateur ». Une marchande qui ne
 * lit pas se retrouvait devant un écran muet, sans savoir quoi faire.
 *
 * Le seul clip approchant porte « Je n'ai pas compris. Tape ton numéro, ou
 * réessaie. » — la phrase du LOGIN, qui n'a aucun sens dans la caisse. Deux
 * formulations de la même idée, une seule a une voix.
 *
 * CE QUE CE FICHIER FIGE. La phrase affichée par la caisse est MOT POUR MOT
 * celle qu'on fera enregistrer (texte choisi par Patrick le 25/09). Le jour où
 * `ui-138.mp3` est déposé et déclaré, `tataUiClipForText` l'associe sans qu'on
 * touche à rien. Si quelqu'un reformule la phrase entre-temps, le contrat
 * casse — et ce test le dit.
 *
 * POURQUOI LE CLIP N'EST PAS ENCORE DÉCLARÉ. Déclarer un clip dont le fichier
 * n'existe pas remplacerait un silence par une erreur : `ttsSpeak` passe par
 * `audioManager.playClip`, qui n'a pas de repli (contrairement à
 * `speakClipOrText`). On ne déclare qu'une fois le .mp3 déposé.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const lire = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

/** LE TEXTE À ENREGISTRER, mot pour mot. Décision de Patrick, 25/09/2026. */
const PHRASE_ECHEC = "Je n'ai pas compris. Touche le micro et redis-moi.";

let failures = 0;
const ok = (cond: boolean, label: string) => {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
};

const caisse = lire('./MicroVenteCaisse.tsx');
const clips = lire('../../services/tataUiClips.ts');

console.log("\n[1] la caisse affiche EXACTEMENT la phrase à enregistrer");
// Le source écrit l'apostrophe droite ; on compare sur la forme du source.
ok(caisse.includes(`"${PHRASE_ECHEC}"`),
   `« ${PHRASE_ECHEC} »`);
ok(!/isError \? "Je n'ai pas compris"/.test(caisse),
   "l'ancienne phrase de trois mots, sans voix possible, a disparu");

console.log("\n[2] on ne confond pas avec la phrase du LOGIN");
ok(clips.includes("Je n'ai pas compris. Tape ton numéro, ou réessaie."),
   "le clip du login existe toujours, et reste au login");
ok(!caisse.includes("Tape ton numéro"),
   "la caisse ne dit pas « tape ton numéro » — elle n'a pas de clavier de numéro");

console.log("\n[3] l'état du clip, dit à voix haute");
const declare = clips.includes(PHRASE_ECHEC);
if (declare) {
  ok(/ui-138\.mp3/.test(clips), "ui-138.mp3 est déclaré — la caisse a enfin une voix sur l'échec");
} else {
  console.log("  ⏳ clip PAS ENCORE ENREGISTRÉ — la caisse reste MUETTE quand elle ne comprend pas.");
  console.log("     À faire dire à Tata Nanti Lou, mot pour mot :");
  console.log(`       « ${PHRASE_ECHEC} »`);
  console.log("     puis déposer le fichier en frontend_src/public/voix/tata/ui-138.mp3");
  console.log("     et ajouter dans services/tataUiClips.ts :");
  console.log(`       { file: "/voix/tata/ui-138.mp3", text: "${PHRASE_ECHEC}" },`);
  console.log("     Ce test le vérifiera alors tout seul.");
}

if (failures > 0) { console.log(`\n${failures} refus.`); process.exit(1); }
console.log("\nLe contrat phrase ↔ clip tient ✅");
