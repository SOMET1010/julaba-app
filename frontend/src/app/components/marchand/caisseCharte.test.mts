/**
 * Garde-fou de source — UNE SEULE CHARTE POUR LA CAISSE (VOIX-01, lot F).
 * Lancer : npm run test:caisse-charte   (tsx, sans DOM)
 *
 * CE QU'ON FERME. La caisse avait DEUX sources de vérité pour ses couleurs :
 * `P = '#AF5B23'` / `BG` écrits en dur dans POSCaisse (l'ancienne charte), et
 * `ORANGE = '#F68A1F'` / `VERT = '#1E7A3A'` recopiés de la planche dans
 * MicroVenteCaisse (lot B). Le jour où la planche change une teinte, l'un des
 * deux fichiers ment. La charte validée le 20/09/2026 vit désormais dans
 * styles/commerce.css sous `--caisse-*`, et les deux composants la LISENT.
 *
 * POURQUOI LIRE LE SOURCE. Une couleur écrite en dur ne casse rien : elle
 * s'affiche. C'est un défaut silencieux — exactement ce qu'une revue laisse
 * passer et qu'aucun test de logique ne voit. On le rend bruyant ici.
 *
 * LA BASE, MESURÉE. Lancé contre les fichiers de `a947f2a` (l'état intégré
 * des lots C, D, E), ce fichier est rouge : le nombre d'échecs est noté dans
 * le commit qui l'introduit.
 *
 * CE QU'IL NE DIT PAS : il ne rend rien. Que l'écran RESSEMBLE à la maquette
 * se juge sur la capture docs/parcours/captures/caisse-portrait-lotF.png, pas
 * ici. Il prouve seulement que les valeurs sont celles de la planche et
 * qu'elles ne vivent qu'à un seul endroit.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const lire = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
// Sans les commentaires : ces fichiers RACONTENT l'ancienne charte qu'on
// retire, et une phrase de commentaire ne doit faire ni passer ni échouer un
// test. Les blocs `/* … */` d'abord, les `// …` ensuite (pas les `://` d'URL).
const sansCommentaires = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

const css = lire("../../../styles/commerce.css");
const codeCaisse = sansCommentaires(lire("./POSCaisse.tsx"));
const codeMicro = sansCommentaires(lire("./MicroVenteCaisse.tsx"));
const codeUnite = sansCommentaires(lire("./ChoixUnite.tsx"));

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}

console.log("\n[1] commerce.css porte les huit couleurs de la planche, aux valeurs exactes");
// Recopiées de la planche « JULABA — Design system · Caisse tout-en-un »
// (20/09/2026). Pas interprétées, pas arrondies.
const PALETTE: Array<[string, string]> = [
  ["--caisse-vert", "#1E7A3A"],
  ["--caisse-vert-fonce", "#124A2A"],
  ["--caisse-orange-voix", "#F68A1F"],
  ["--caisse-sable", "#F5EBDD"],
  ["--caisse-ivoire", "#FFF9F1"],
  ["--caisse-succes", "#DDEFCF"],
  ["--caisse-gris-texte", "#6E6A63"],
  ["--caisse-alerte", "#D95C4F"],
];
// Le bloc `:root` qui les déclare — les surcharges `html.dark` viennent APRÈS
// et ne comptent pas comme la valeur de référence.
const blocRoot = css.slice(css.indexOf("--caisse-vert:"));
for (const [nom, valeur] of PALETTE) {
  const re = new RegExp(`${nom}\\s*:\\s*${valeur}\\s*;`, "i");
  ok(re.test(blocRoot), `${nom} = ${valeur}`);
}

console.log("\n[2] … et la typographie, l'espacement et les rayons de la planche");
ok(/--caisse-font-h1\s*:\s*600 28px\/34px/.test(css), "H1 : Inter Semibold 28/34");
ok(/--caisse-font-h2\s*:\s*600 20px\/28px/.test(css), "H2 : Semibold 20/28");
ok(/--caisse-font-texte\s*:\s*400 16px\/24px/.test(css), "texte courant : Regular 16/24");
ok(/--caisse-font-bouton\s*:\s*600 18px\/24px/.test(css), "bouton : Semibold 18/24");
ok(/--caisse-font-legende\s*:\s*400 12px\/16px/.test(css), "légende : Regular 12/16");
ok(/--caisse-police\s*:\s*'Inter'/.test(css) && !/fonts\.googleapis|@import url\(/.test(css),
  "la famille est Inter, et commerce.css n'appelle aucune police distante");
for (const [i, px] of [4, 8, 12, 16, 24, 32, 40].entries()) {
  ok(new RegExp(`--caisse-esp-${i + 1}\\s*:\\s*${px}px`).test(css), `espacement ${i + 1} = ${px}px`);
}
for (const [i, px] of [4, 8, 12, 16, 24].entries()) {
  ok(new RegExp(`--caisse-rayon-${i + 1}\\s*:\\s*${px}px`).test(css), `rayon ${i + 1} = ${px}px`);
}

console.log("\n[3] Plus aucune couleur de l'ancienne charte, ni constante en dur, dans la caisse");
for (const [nom, code] of [["POSCaisse", codeCaisse], ["MicroVenteCaisse", codeMicro], ["ChoixUnite", codeUnite]] as const) {
  ok(!/#AF5B23/i.test(code), `${nom} ne contient plus #AF5B23 (l'ancien accent de la caisse)`);
  ok(!/#B74725/i.test(code), `${nom} ne contient plus #B74725 (l'action commerce)`);
  ok(!/^\s*const\s+(P|BG|ORANGE|VERT)\s*=/m.test(code), `${nom} ne déclare plus de constante P, BG, ORANGE ou VERT`);
  // Aucune couleur hexadécimale, quelle qu'elle soit : si une teinte est
  // nécessaire, elle est un token. Les coupures dessinées (CoupureDessinee)
  // gardent les leurs — ce sont les couleurs des vrais billets, pas de la
  // charte — et ne sont pas lues ici.
  const hex = code.match(/#[0-9a-f]{3,8}\b/gi) || [];
  ok(hex.length === 0, `${nom} n'écrit aucune couleur hexadécimale (${hex.length}${hex.length ? " : " + [...new Set(hex)].join(", ") : ""})`);
}

console.log("\n[4] Les composants LISENT la charte");
const usages = (code: string) => (code.match(/var\(--caisse-[a-z0-9-]+\)/g) || []).length;
ok(usages(codeCaisse) >= 40, `POSCaisse consomme var(--caisse-…) (${usages(codeCaisse)} usages)`);
ok(usages(codeMicro) >= 20, `MicroVenteCaisse consomme var(--caisse-…) (${usages(codeMicro)} usages)`);
ok(/var\(--caisse-orange-voix\)/.test(codeMicro), "le micro est orange voix — la couleur du micro, et d'elle seule");
ok(!/var\(--caisse-orange-voix\)/.test(codeCaisse), "et POSCaisse ne l'utilise nulle part : pour qui ne lit pas, orange veut dire « parler », jamais « payer » ni « décor »");
ok(/couleur = 'var\(--caisse-vert\)'/.test(codeUnite), "ChoixUnite prend le vert de la charte par défaut");
// Chaque token consommé existe : un `var(--caisse-xyz)` qui n'est déclaré
// nulle part vaut « initial » — invisible à la relecture, faux à l'écran.
const declares = new Set((css.match(/--caisse-[a-z0-9-]+(?=\s*:)/g) || []));
for (const [nom, code] of [["POSCaisse", codeCaisse], ["MicroVenteCaisse", codeMicro], ["ChoixUnite", codeUnite]] as const) {
  const inconnus = [...new Set((code.match(/var\((--caisse-[a-z0-9-]+)\)/g) || []).map(m => m.slice(4, -1)))].filter(t => !declares.has(t));
  ok(inconnus.length === 0, `${nom} : chaque token lu est déclaré (${inconnus.length ? "inconnus : " + inconnus.join(", ") : "tous"})`);
}

console.log("\n[5] La maquette est là où on la cherche");
// CAI-02 — LA GARDE CHANGE DE NATURE, SUR DEMANDE DE PATRICK (22/09/2026).
// Elle figeait le LITTÉRAL « Que voulez-vous vendre ? » dans le H1. C'est
// ce littéral qui maintenait le vouvoiement : Tantie tutoie partout
// ailleurs, et cette phrase partait aussi à voix haute au montage.
// Elle exige maintenant mieux : que le H1 ne porte AUCUN texte en dur et
// lise la clé de catalogue. Deux copies d'une phrase finissent toujours
// par diverger — c'est exactement ce qui s'est passé ici.
ok(/<h1\b[\s\S]{0,800}?t\('TATA_QUE_VENDRE'\)[\s\S]{0,80}?<\/h1>/.test(codeMicro),
   "MicroVenteCaisse : le H1 lit la clé TATA_QUE_VENDRE — une seule source pour l'œil et l'oreille");
ok(!/Que voulez-vous vendre/.test(codeMicro), "et le vouvoiement n'est plus écrit nulle part dans ce fichier");
ok(/pour terminer/.test(codeMicro) && /cart\.length > 0 &&/.test(codeMicro), "et rappelle « Dis “encaisser” pour terminer » quand le panier n'est pas vide (lecture seule)");
ok(/J'ai compris :/.test(codeMicro), "le chip « J'ai compris : … » existe");
ok(/Payer en espèces/.test(codeCaisse) && /<Banknote\b/.test(codeCaisse), "POSCaisse : « Payer en espèces » avec l'icône billet");
ok(/Vider le panier/.test(codeCaisse) && /Panier actuel/.test(codeCaisse), "« Panier actuel » et « Vider le panier »");
ok(/Des marchés plus forts, des familles plus heureuses/.test(codeCaisse), "la signature en légende");
ok(/var\(--caisse-succes\)/.test(codeCaisse) && /Total/.test(codeCaisse), "la barre Total est sur fond succès");
ok(/variante="caisse"/.test(codeCaisse), "l'en-tête clair passe par la variante de SubPageLayout, sans changer les autres écrans");

console.log(failures === 0 ? "\nTous les tests sont verts ✅\n" : `\n${failures} échec(s) ❌\n`);
if (failures > 0) process.exit(1);
