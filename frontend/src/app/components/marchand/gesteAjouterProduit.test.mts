/**
 * Garde-fou de source — UN SEUL GESTE : « AJOUTER UN PRODUIT ».
 * Lancer : npm run test:geste-ajouter-produit   (tsx, sans DOM)
 *
 * STK-18, décision de Patrick : « supprimer le concept "Écrire". Le geste est
 * "Ajouter un produit". »
 *
 * CE QU'IL Y AVAIT. Deux boutons, l'un sous l'autre, appelant tous deux
 * `setShowAdd(true)` — donc ouvrant le MÊME parcours guidé :
 *
 *   « Ajouter en parlant »   (BoutonDireProduit)
 *   « Écrire »               (bouton tactile)
 *
 * Nommer l'un des deux moyens « Écrire » en faisait un geste à part. Et le mot
 * désigne précisément ce que la marchande ne sait pas faire : dans un écran
 * conçu pour une femme qui ne lit pas, c'était une porte marquée « interdit ».
 *
 * LA RÈGLE. Le geste s'appelle « Ajouter un produit ». Parler et toucher n'en
 * sont que des moyens.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const lire = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const sansCommentaires = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

let failures = 0;
const ok = (cond: boolean, label: string) => {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
};

const stock = sansCommentaires(lire('./GestionStock.tsx'));
const voix = sansCommentaires(lire('./BoutonDireProduit.tsx'));

console.log("\n[1] le mot « Écrire » a disparu de l'étal");
ok(!/>\s*Écrire\s*</.test(stock) && !/}\s*Écrire\b/.test(stock),
   "aucun bouton ne s'appelle « Écrire »");

console.log("\n[2] le geste porte son nom");
ok(/Ajouter un produit/.test(stock), "le bouton tactile dit « Ajouter un produit »");
ok(/Ajouter en parlant/.test(voix), "et le bouton vocal dit « Ajouter en parlant » — un MOYEN");

console.log("\n[3] les deux moyens ouvrent bien le même parcours");
// Le bouton tactile appelle setShowAdd ; le vocal le fait aussi, après avoir
// prérempli le brouillon avec ce qu'elle a dit (STK-05).
ok((stock.match(/setShowAdd\(true\)/g) ?? []).length >= 2,
   "le tactile et le vocal mènent tous deux au parcours guidé");

if (failures > 0) { console.log(`\n${failures} refus.`); process.exit(1); }
console.log("\nUn seul geste : « Ajouter un produit » ✅");
