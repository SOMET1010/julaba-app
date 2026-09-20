/**
 * Garde-fou de source — UNE SEULE SURFACE (VOIX-01, lot A).
 * Lancer : npm run test:caisse-surface   (tsx, sans DOM)
 *
 * CE QU'ON FERME. Sur téléphone portrait — le support du pilote — le panier
 * et TOUT l'encaissement (total, montant reçu, coupures, monnaie, « Payer en
 * espèces ») vivaient dans une feuille coulissante qu'il fallait d'abord
 * ouvrir. Une marchande qui ne lit pas devait donc deviner qu'un bouton
 * cachait l'argent. Le mot d'ordre posé le 20/09/2026 est : « une seule
 * surface, un seul panier, un seul paiement ».
 *
 * CE QUE CE TEST PROUVE, et pourquoi il lit le SOURCE. Aucun runner de
 * composant ne tourne sur cette caisse, et la régression serait silencieuse :
 * réintroduire une feuille ou une barre flottante ne casse rien, ça ne fait
 * que RECACHER l'argent. C'est exactement le genre de retour en arrière qu'une
 * revue humaine laisse passer.
 *
 * Ce test ne dit rien de la voix : le lot A est purement structurel (aucune
 * intention vocale, aucun moteur STT, aucune écriture d'argent touchée). Le
 * micro permanent est le lot B et aura son propre garde-fou.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const src = readFileSync(fileURLToPath(new URL("./POSCaisse.tsx", import.meta.url)), "utf8");
const css = readFileSync(fileURLToPath(new URL("../../../styles/commerce.css", import.meta.url)), "utf8");

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}

// Retire les commentaires (// … et /* … */) : on teste le code réel, pas ce
// que les commentaires racontent. Les commentaires de ce fichier-ci décrivent
// justement la feuille SUPPRIMÉE — sans ce nettoyage, ils feraient échouer
// leurs propres tests.
const code = src
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

console.log("\n[1] Plus aucune feuille coulissante pour le panier");
ok(!/\bshowCart\b/.test(code),
  "aucun état `showCart` : il n'existe plus d'écran caché à ouvrir");
ok(!/\bbottomAction\s*=/.test(code),
  "aucune barre flottante `bottomAction` : elle n'était qu'une poignée pour ouvrir la feuille");

console.log("\n[2] Panier ET encaissement sur la surface, sur téléphone");
// La section mobile doit exister ET contenir les DEUX rendus : les lignes
// seules ne suffisent pas — c'est le PIED qui porte le total, la monnaie et
// « Payer en espèces ». Un panier consultable dont l'encaissement resterait
// caché serait exactement le défaut qu'on ferme.
const sectionMobile = code.match(/<section className="lg:hidden"[\s\S]*?<\/section>/);
ok(sectionMobile !== null,
  "une <section className=\"lg:hidden\"> porte le panier sur téléphone");
ok(sectionMobile !== null && /renderCartLines\(\)/.test(sectionMobile[0]),
  "elle rend les LIGNES du panier");
ok(sectionMobile !== null && /renderCartFooter\(\)/.test(sectionMobile[0]),
  "elle rend le PIED : total, montant reçu, monnaie, « Payer en espèces »");

console.log("\n[3] Une seule logique, deux dispositions");
// Deux appels chacun : le panneau permanent (grand écran) et la section
// téléphone. Trois appels signifieraient qu'un troisième endroit a été
// dupliqué — c'est-à-dire une logique d'argent à maintenir en double.
const lignes = (code.match(/renderCartLines\(\)/g) || []).length;
const pieds = (code.match(/renderCartFooter\(\)/g) || []).length;
ok(lignes === 2, `renderCartLines() rendu exactement 2 fois (obtenu ${lignes} : panneau grand écran + section téléphone)`);
ok(pieds === 2, `renderCartFooter() rendu exactement 2 fois (obtenu ${pieds})`);

console.log("\n[4] L'unité est sur la ligne de panier");
// « 3 » ne veut rien dire : trois tas, trois kilos, trois pièces ? L'unité
// n'existait sur téléphone que dans la barre flottante, supprimée ici.
ok(/uniteSeule\(item\.quantite,\s*item\.unite\)/.test(code),
  "chaque ligne de panier affiche son unité (uniteSeule), comme l'étiquette du produit et le reçu");

console.log("\n[5] « Voir plus » déplie sur place, il ne change pas d'écran");
ok(/setVoirPlusProduits\(/.test(code),
  "« Voir plus » bascule un état local (aucune navigation)");
ok(/pos-grille-apercu/.test(code),
  "la grille repliée porte la classe .pos-grille-apercu");
ok(/\.pos-grille-apercu\s*>\s*\*:nth-child\(n\s*\+\s*5\)/.test(css),
  "la règle d'aperçu existe dans styles/commerce.css");
ok(/@media\s*\(max-width:\s*1023px\)[\s\S]{0,200}pos-grille-apercu/.test(css),
  "elle ne s'applique QUE sous 1024 px : au-dessus, le panier est à côté et la grille reste entière");

console.log("\n[6] Le total reste visible sans deuxième parcours");
ok(/className="caisse-panier-raccourci"/.test(code),
  "un résumé panier compact apparaît dès le premier article");
ok(/id="caisse-paiement-mobile"/.test(code),
  "le panier complet possède une destination explicite sur la même page");
ok(/getElementById\('caisse-paiement-mobile'\)\?\.scrollIntoView/.test(code),
  "« Encaisser » fait seulement défiler vers le paiement existant");
ok(/\.caisse-panier-raccourci\s*\{[^}]*position:\s*sticky/.test(css),
  "le résumé reste visible pendant le choix des produits sans recouvrir la page");

console.log(failures === 0 ? "\nTous les tests sont verts ✅\n" : `\n${failures} échec(s) ❌\n`);
if (failures > 0) process.exit(1);
