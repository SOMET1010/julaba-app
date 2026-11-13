/**
 * Garde-fou de source — CAI-10 : L'ASSISTANTE LIT UNE VENTE COMME SA CAISSE.
 * Lancer : npm run test:cai10-assistante-vente   (tsx, sans DOM)
 *
 * LE DÉFAUT, vu en recette le 13/11/2026 en rejouant le rapport de Patrick
 * (« Quand je veux enregistrer une vente, il ne comprend pas »). La modale de
 * Tantie Nanti Lou jugeait une vente dictée par MOINS de renseignements que la
 * même vente dictée à sa caisse :
 *
 *   1. `montant <= 0 → return` : « vends 3 tomates » était avalé SANS UN MOT —
 *      produit et quantité compris, seul le prix manquait, et le catalogue le
 *      connaît. Mesuré avant correction : aucun toast, aucune ligne, rien.
 *
 *   2. « enregistre une vente » posait une ligne fantôme à UN franc : l'article
 *      « une » était lu comme un MONTANT, et la correction `venteSansProduit`
 *      (qui existe pour ça) n'était pas appliquée ici.
 *
 *   3. L'unité prononcée et le « à »/« pour » dicté n'arrivaient jamais à la
 *      résolution du prix — la même phrase pouvait entrer pour deux montants
 *      selon l'écran qui l'avait reçue.
 *
 * CE QU'ON FIGE. La branche `vendre` de TantieSagesseModal relit la phrase par
 * les MÊMES portes que MicroVenteCaisse : `lireVenteAuCatalogue` d'abord,
 * `venteSansProduit` ensuite, `extraire` pour l'unité et la lecture du prix,
 * et les trois arguments passés à `vendreVocalUnifie`. Et plus aucun return
 * silencieux : une vente comprise obtient TOUJOURS soit sa ligne, soit un mot.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const lire = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const sansCommentaires = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

const assistant = sansCommentaires(lire("./TantieSagesseModal.tsx"));

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}

// La branche `vendre` de l'assistante, du `if` à l'accolade fermante de son
// return. On la découpe pour ne pas juger le reste du fichier.
const debut = assistant.indexOf("if (action.type === 'vendre') {");
const fin = assistant.indexOf("try {", debut);
ok(debut > 0 && fin > debut, "la branche `vendre` de onAction est localisable");
const branche = assistant.slice(debut, fin);

console.log("\n[1] La lecture au catalogue et la correction CAT-02 sont branchées");
ok(branche.includes("lireVenteAuCatalogue(data.transcript"), "son étal passe d'abord (lireVenteAuCatalogue)");
ok(branche.includes("venteSansProduit(action"), "la correction CAT-02 s'applique (venteSansProduit)");

console.log("\n[2] Plus aucun return silencieux sur une vente sans prix");
ok(!/if\s*\(!montant\s*\|\|\s*montant\s*<=\s*0[^)]*\)\s*return;/.test(branche),
  "l'ancien `montant <= 0 → return` a disparu");
ok(branche.includes("montant = Number.isFinite(brut) && brut > 0 ? brut : 0"),
  "0 = prix du catalogue, à défaut DEMANDÉ (jamais inventé)");

console.log("\n[3] L'unité et la lecture du prix atteignent la résolution");
ok(branche.includes("lu.uniteParlee") && branche.includes("lu.lecturePrix"),
  "extraire fournit uniteParlee et lecturePrix");
ok(assistant.includes("uniteDictee, lectureDictee);"),
  "vendreUnifie transmet les deux arguments à vendreVocalUnifie");

console.log("\n[4] Les autres surfaces n'écrivent pas d'argent par ce chemin");
ok(!branche.includes("enregistrerVente"), "aucun encaissement direct dans la branche vendre");

process.exit(failures ? 1 : 0);
