/**
 * Garde-fou de source — TOUTE ICÔNE DEMANDÉE EXISTE DANS LA TABLE.
 * Lancer : npm run test:role-icones   (tsx, sans DOM)
 *
 * LE DÉFAUT, vu sur l'APK 6f4111d du 25/09 : la barre du bas de la marchande
 * affichait DEUX MAISONS. « Accueil » et « Commandes » portaient la même
 * icône — deux portes indiscernables pour une femme qui ne lit pas.
 *
 * LA CAUSE. `roleConfig.ts` demandait `icon: 'ShoppingBag'`, et `ShoppingBag`
 * était DÉJÀ IMPORTÉ dans `BottomBar.tsx`. Il manquait seulement dans
 * `ICON_MAP`. Le `ICON_MAP[item.icon] || Home` du calcul des onglets
 * fabriquait alors une maison, sans un mot.
 *
 * Une information existait trois fois — la config, l'import, l'icône — et une
 * table en aval la jetait pour la re-deviner. C'est le motif que ce dépôt
 * traque sur l'argent ; il vaut aussi pour ce que la marchande VOIT.
 *
 * TROIS AUTRES étaient dans le même cas pour l'administrateur :
 * LayoutDashboard, DollarSign, Settings — trois onglets sur quatre étaient
 * des maisons.
 *
 * CE QU'IL NE DIT PAS : il ne juge pas le CHOIX de l'icône. Il refuse
 * seulement qu'une icône demandée soit remplacée en silence.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const lire = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), "utf8");

const table = lire('./iconesNavigation.ts');
const barre = lire('./BottomBar.tsx');
const menu = lire('./Sidebar.tsx');
const roles = lire('../../config/roleConfig.ts');

let failures = 0;
const ok = (cond: boolean, label: string) => {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
};

// Les clés de ICON_MAP, lues DANS LE SOURCE (pas recopiées à la main : une
// copie se périme, et c'est précisément ce qu'on empêche).
const bloc = /export const ICONES_NAVIGATION: Record<string, any> = \{([\s\S]*?)\n\};/.exec(table);
const connues = new Set(
  [...(bloc?.[1] ?? '').matchAll(/^\s*(\w+)\s*[,:]/gm)].map(m => m[1]),
);

console.log("\n[1] UNE SEULE table, pour les deux vues");
ok(connues.size >= 12, `${connues.size} icônes dans ICONES_NAVIGATION`);
// Elles étaient DEUX, et elles avaient déjà divergé : `Store` valait un
// magasin dans la barre du bas et un CADDIE dans le menu latéral.
ok(/ICON_MAP = ICONES_NAVIGATION/.test(barre), "la barre du bas lit la table partagée");
ok(/ICON_MAP = ICONES_NAVIGATION/.test(menu), "le menu latéral lit la MÊME table");
ok(!/const ICON_MAP: Record<string, any> = \{/.test(barre + menu),
   "aucune des deux vues ne redéfinit sa propre table");

console.log("\n[2] chaque onglet de chaque rôle a son icône");
// Chaque bloc `bottomBar: { items: [...] }`, avec le rôle qui le porte.
const manquantes: string[] = [];
for (const m of roles.matchAll(/(\w+):\s*\{\s*\n\s*name:[\s\S]*?bottomBar:\s*\{\s*items:\s*\[([\s\S]*?)\]/g)) {
  const role = m[1];
  for (const it of m[2].matchAll(/label:\s*'([^']+)',\s*path:\s*'([^']+)',\s*icon:\s*'([^']+)'/g)) {
    const [, label, , icone] = it;
    if (!connues.has(icone)) manquantes.push(`${role} · ${label} → ${icone}`);
  }
}
ok(manquantes.length === 0,
   manquantes.length ? `icône(s) demandée(s) mais absente(s) — repli silencieux sur Home :\n       ${manquantes.join('\n       ')}` : 'toutes les icônes demandées existent dans ICON_MAP');

console.log("\n[3] deux onglets d'un même rôle ne portent jamais la même icône");
for (const m of roles.matchAll(/(\w+):\s*\{\s*\n\s*name:[\s\S]*?bottomBar:\s*\{\s*items:\s*\[([\s\S]*?)\]/g)) {
  const role = m[1];
  const icones = [...m[2].matchAll(/icon:\s*'([^']+)'/g)].map(x => x[1]);
  const doublons = icones.filter((v, i) => icones.indexOf(v) !== i);
  ok(doublons.length === 0, `${role} : ${icones.length} onglets, ${icones.length} icônes distinctes${doublons.length ? ' — DOUBLON : ' + doublons.join(', ') : ''}`);
}

if (failures > 0) { console.log(`\n${failures} refus.`); process.exit(1); }
console.log("\nAucune icône n'est remplacée en silence ✅");
