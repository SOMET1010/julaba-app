/**
 * Garde-fou de source — UN SEUL MICRO SUR LA CAISSE (VOIX-03, P1 produit).
 * Lancer : npm run test:caisse-un-seul-micro   (tsx, sans DOM)
 *
 * CE QU'ON FERME. `/marchand/caisse` est rendu sous AppLayout, donc sous la
 * BottomBar — qui dessine un bouton vert « Tata » ouvrant TantieSagesseModal.
 * Ce second moteur vocal vend SANS l'unité dictée et ne connaît pas
 * « encaisse » : mesuré par le QA sur a947f2a, « vends deux tas de gombo à
 * 500 » donne `unité` par le micro vert et `tas` par le micro orange de la
 * caisse. Deux micros sur le même écran, dont l'un se trompe sur l'unité et
 * ignore l'argent : rien ne les distingue pour une marchande qui ne lit pas.
 *
 * DÉCISION DE PATRICK : masquer le bouton Tata sur la route de la caisse. La
 * caisse redevient « un seul micro, et il marche » ; l'assistant reste
 * partout ailleurs, et la NAVIGATION de la barre reste — on ne retire que le
 * second moteur.
 *
 * POURQUOI LIRE LE SOURCE. Un second micro qui réapparaît ne casse rien : il
 * s'affiche, il marche à moitié, et personne ne le voit en revue. Ce test
 * est rouge sur a947f2a (aucun mécanisme de masquage ciblé n'existait : la
 * BottomBar ne savait que se cacher ENTIÈRE, sur /keiwa).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const lire = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");
const sansCommentaires = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

const barre = sansCommentaires(lire("../layout/BottomBar.tsx"));
const layout = sansCommentaires(lire("../layout/AppLayout.tsx"));
const routes = sansCommentaires(lire("../../routes.tsx"));

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
}

console.log("\n[1] La caisse vit bien sous la BottomBar (sinon ce test ne protégerait rien)");
ok(/path:\s*"\/marchand",\s*element:\s*<AppLayout \/>/.test(routes), "/marchand est rendu sous AppLayout");
ok(/path:\s*"caisse",\s*element:[^\n]*POSCaisse/.test(routes), "et /marchand/caisse y est la route de POSCaisse");

console.log("\n[2] Le bouton Tata est masqué sur /marchand/caisse — la navigation reste");
const liste = barre.match(/const ROUTES_SANS_TATA\s*=\s*\[([^\]]*)\]/);
ok(liste !== null, "la BottomBar porte une liste ROUTES_SANS_TATA");
ok(liste !== null && /'\/marchand\/caisse'/.test(liste[1]), "qui contient '/marchand/caisse'");
ok(/const tataMasquee = ROUTES_SANS_TATA\.includes\(location\.pathname\)/.test(barre),
  "le masquage est décidé sur le pathname courant (même mécanisme que /keiwa, mais ciblé)");
const bouton = barre.indexOf('aria-label="Ouvrir Tantie Nanti Lou"');
const garde = barre.lastIndexOf("{!tataMasquee && (", bouton);
ok(bouton !== -1 && garde !== -1, "le bouton « Ouvrir Tantie Nanti Lou » est rendu sous la garde `!tataMasquee`");
ok(
  /isOpen=\{isTantieOpen && !tataMasquee\}/.test(barre)
    || /isOpen=\{tataOuverte && !tataMasquee\}/.test(layout),
  "la modale Tata ne peut pas s'ouvrir non plus (double-tap global) sur la caisse",
);
ok(!/if \(tataMasquee\) return null/.test(barre) && /<nav aria-label="Navigation principale"/.test(barre),
  "la barre elle-même n'est PAS retirée : Accueil, Stock, Profil restent atteignables");

console.log(failures === 0 ? "\nTous les tests sont verts ✅\n" : `\n${failures} échec(s) ❌\n`);
if (failures > 0) process.exit(1);
