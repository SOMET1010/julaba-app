/**
 * Garde-fou de source — LE MICRO NE QUITTE PLUS LA VENTE (VOIX-01, lot B).
 * Lancer : npm run test:caisse-micro   (tsx, sans DOM)
 *
 * CE QU'ON FERME. La voix savait commencer une vente, jamais la terminer :
 * elle vivait dans un écran séparé qui, la ligne une fois au panier, renvoyait
 * vers la caisse — où il n'y avait plus aucun micro. Deux démarrages pour un
 * seul parcours, et une marchande qui ne lit pas se retrouvait, au moment de
 * l'argent, devant un écran muet.
 *
 * VOIE RETENUE (arbitrage du 20/09/2026) : la caisse devient l'unique surface
 * de vente. Le moteur vocal y CONVERGE au lieu d'être abstrait pour alimenter
 * deux surfaces.
 *
 * POURQUOI LIRE LE SOURCE. Les cinq preuves demandées portent sur du CÂBLAGE :
 * un produit qui voyage d'un écran à l'autre, un bouton qui mène à une route,
 * un moteur monté au-dessus d'un bouton. Rien de tout cela ne casse
 * bruyamment. Un micro débranché s'affiche très bien — c'est précisément le
 * défaut que `POSCaisse` documentait : « il y en avait un, purement
 * décoratif ; elle parlait, et rien n'arrivait ».
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const ici = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const lire = (rel: string) => readFileSync(ici(rel), "utf8");

const micro = lire("./MicroVenteCaisse.tsx");
const caisse = lire("./POSCaisse.tsx");
const stock = lire("./GestionStock.tsx");
const accueil = lire("./MarchandAccueilVoice.tsx");

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}

// Sans les commentaires : ces composants RACONTENT l'ancien écran, et ces
// phrases feraient passer (ou échouer) des tests pour de mauvaises raisons.
//
// L'ORDRE COMPTE, et il m'a déjà piégé. Retirer d'abord les commentaires JSX
// `{/* … */}` par la forme « accolade, commentaire, accolade » fait matcher
// AUSSI un `interface Props {` suivi d'un JSDoc : le non-gourmand court
// jusqu'à la première accolade fermante qui suit un `*/`, et emporte tout ce
// qu'il y a entre les deux — ici 10 000 caractères, moteur vocal compris. On
// retire donc les blocs `/* … */` EN PREMIER, quelle que soit leur position ;
// les accolades JSX restées vides ne gênent aucune de ces assertions.
const sansCommentaires = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

const codeMicro = sansCommentaires(micro);
const codeCaisse = sansCommentaires(caisse);
const codeStock = sansCommentaires(stock);
const codeAccueil = sansCommentaires(accueil);

console.log("\n[1] « Vendre » depuis Mon stock ouvre la caisse AVEC le bon produit");
// Le produit voyage par l'ÉTAT DE ROUTE — explicite et relisible. Une variable
// globale ou un état caché passerait inaperçu jusqu'au jour où il casse.
const navStock = codeStock.match(/navigate\('\/marchand\/caisse',\s*\{\s*state:\s*\{\s*produitPreselectionne:[\s\S]{0,400}?\}\s*\}\s*\}\s*\)/);
ok(navStock !== null,
  "GestionStock navigue vers /marchand/caisse en passant `produitPreselectionne` dans l'état de route");
for (const champ of ["nom", "prix", "unite"]) {
  ok(navStock !== null && new RegExp(`${champ}:`).test(navStock[0]),
    `le produit transmis porte son « ${champ} »`);
}
ok(/location\.state[\s\S]{0,200}produitPreselectionne/.test(codeCaisse),
  "la caisse LIT cet état de route (sinon le produit partirait dans le vide)");
ok(/<MicroVenteCaisse\s+produitPreselectionne=\{produitPreselectionne\}/.test(codeCaisse),
  "et le passe au micro, qui s'en sert pour sa question d'ouverture");

console.log("\n[2] « Vendre » depuis l'accueil arrive sur la caisse");
ok(/const allerCaisse = \(\) => navigate\('\/marchand\/caisse'\)/.test(codeAccueil),
  "l'accueil sait aller à la caisse");
ok(/onClick=\{allerCaisse\}\s+aria-label="Vendre"/.test(codeAccueil),
  "le bouton « Vendre » y mène DIRECTEMENT (plus d'écran vocal intermédiaire)");

console.log("\n[3] Le micro est CÂBLÉ, pas seulement affiché");
ok(/useVoiceCore\(\{/.test(codeMicro),
  "le composant du micro monte lui-même le moteur vocal (useVoiceCore)");
ok(/onClick=\{handleMicClick\}/.test(codeMicro),
  "le bouton micro appelle le moteur — pas un gestionnaire décoratif");
// useObjectif()/useRaccourcis() ne LÈVENT PAS d'erreur sans provider : ils
// retombent sur des valeurs nulles. On obtiendrait un micro qui a l'air de
// marcher, c'est-à-dire exactement la dette qu'on ferme.
ok(/<RaccourcisProvider>/.test(codeCaisse) && /<ObjectifProvider ventes=/.test(codeCaisse),
  "la caisse monte les providers dont le moteur a besoin (Raccourcis, Objectif)");
ok(/<POSCaisseInner \/>/.test(codeCaisse),
  "elle les monte AU-DESSUS de l'écran, donc au-dessus du micro");
// Deux micros dont un inerte : rien ne les distingue pour qui ne lit pas.
const micsDansCaisse = (codeCaisse.match(/<Mic\b/g) || []).length;
ok(micsDansCaisse === 0,
  `POSCaisse ne dessine aucun micro de son côté (${micsDansCaisse} trouvé(s)) : le seul micro de l'écran est celui qui marche`);

console.log("\n[4] Le micro est présent aux TROIS moments de la vente");
const rendus = (codeCaisse.match(/<MicroVenteCaisse\b/g) || []).length;
ok(rendus === 1, `le micro est rendu une seule fois (${rendus})`);
// « Présent aux trois moments » se prouve en montrant qu'il n'est conditionné
// par RIEN : ni panier vide, ni panier plein, ni encaissement ouvert.
const ligneRendu = codeCaisse.split("\n").find(l => l.includes("<MicroVenteCaisse produitPreselectionne"));
ok(!!ligneRendu && /^\s*<MicroVenteCaisse produitPreselectionne=\{produitPreselectionne\} \/>\s*$/.test(ligneRendu || ""),
  "il est rendu seul sur sa ligne, sans garde `&&` ni ternaire");
const ligneAvant = (codeCaisse.slice(0, codeCaisse.indexOf("<MicroVenteCaisse")).trimEnd().split("\n").pop() || "").trim();
ok(!/(&&|\?|:)$/.test(ligneAvant),
  `la ligne qui le précède n'ouvre aucune condition (« ${ligneAvant.slice(-40)} »)`);
ok(!/return null/.test(codeMicro),
  "le composant du micro ne se retire jamais de lui-même (aucun `return null`)");

console.log("\n[5] L'ancien écran vocal n'a plus aucun appelant");
ok(!existsSync(ici("./VenteVocaleModal.tsx")),
  "VenteVocaleModal.tsx est supprimé — pas de composant fantôme gardé « au cas où »");
const fichiers: string[] = [];
(function parcourir(dir: string) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) parcourir(p);
    else if (/\.(ts|tsx|mts)$/.test(e)) fichiers.push(p);
  }
})(ici("../../.."));
const importeurs = fichiers.filter(f => /from\s+['"][^'"]*VenteVocaleModal['"]/.test(readFileSync(f, "utf8")));
ok(importeurs.length === 0,
  `aucun fichier ne l'importe (${importeurs.length} trouvé(s)${importeurs.length ? " : " + importeurs.join(", ") : ""})`);

console.log(failures === 0 ? "\nTous les tests sont verts ✅\n" : `\n${failures} échec(s) ❌\n`);
if (failures > 0) process.exit(1);
