/**
 * Garde-fou de source — caisse pilote « espèces uniquement ».
 * Lancer : npm run test:caisse-pilote   (tsx, sans DOM)
 *
 * Ce test lit le SOURCE de POSCaisse.tsx et garantit deux invariants que la
 * revue humaine peut laisser filer et qu'aucun runner de composant ne couvre :
 *
 *  1. AUCUNE écriture stock/produit depuis l'écran de caisse. Le backend
 *     `/caisse/vente` est SEUL maître du stock (décrément atomique + ledger I3).
 *     Toute réintroduction d'un `updateProduct(...)` dans POSCaisse ramènerait la
 *     « double autorité » (R-A) : un PUT stock absolu du front écrasant le
 *     décrément serveur en concurrence/rejeu.
 *  2. La vente à CRÉDIT est désactivée (pilote espèces, blockers I4/I5/I6) :
 *     flag `CAISSE_CREDIT_ACTIF = false`, et tous les déclencheurs (boutons +
 *     modal) sont conditionnés à ce flag.
 *
 * Si le crédit est réactivé un jour, ce test devra être mis à jour EN MÊME TEMPS
 * que le décrément stock passe côté backend — jamais l'un sans l'autre.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const src = readFileSync(fileURLToPath(new URL("./POSCaisse.tsx", import.meta.url)), "utf8");

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}

// Retire les commentaires (// … et /* … */) pour ne tester que le code réel.
const code = src
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

console.log("\n[1] Aucune écriture stock/produit depuis la caisse (backend seul maître)");
// `updateProduct(id, { stock })` → PUT /caisse/produits/:id est le SEUL moyen par
// lequel l'écran de caisse pourrait écrire un stock. L'interdire entièrement
// verrouille la « double autorité » (R-A), chemins espèces ET crédit compris.
ok(!/\bupdateProduct\s*\(/.test(code),
  "POSCaisse n'appelle jamais updateProduct (aucun PUT stock absolu front)");

console.log("\n[2] Vente à crédit désactivée (pilote espèces)");
ok(/const\s+CAISSE_CREDIT_ACTIF\s*:\s*boolean\s*=\s*false\b/.test(code),
  "flag CAISSE_CREDIT_ACTIF = false présent");
const gates = (code.match(/CAISSE_CREDIT_ACTIF\s*&&/g) || []).length;
ok(gates >= 3,
  `tous les déclencheurs crédit sont gatés par le flag (${gates} gardes ≥ 3 : bouton rapide, sélecteur, modal)`);
ok(/espèces uniquement/i.test(src),
  "mention visible « espèces uniquement » affichée quand le crédit est off");

console.log("\n[3] Mobile money (déclaratif) désactivé (pilote espèces)");
ok(/const\s+CAISSE_MOBILE_MONEY_ACTIF\s*:\s*boolean\s*=\s*false\b/.test(code),
  "flag CAISSE_MOBILE_MONEY_ACTIF = false présent");
const mmGates = (code.match(/CAISSE_MOBILE_MONEY_ACTIF\s*&&/g) || []).length;
ok(mmGates >= 2,
  `bouton mobile money et sélecteur d’opérateur gatés par le flag (${mmGates} gardes ≥ 2)`);
// Aucun setPaymentMethod('mobile_money') ne doit rester HORS d’un garde de flag.
ok(!/(^|[^&]\s*)setPaymentMethod\(\s*['"]mobile_money['"]\s*\)/.test(code) || mmGates >= 2,
  "le passage en mobile_money n’est atteignable que derrière le flag");

console.log(failures === 0 ? "\nTous les tests sont verts ✅\n" : `\n${failures} échec(s) ❌\n`);
if (failures > 0) process.exit(1);
