/**
 * Garde-fou de source — UNE SEULE CHARTE POUR TOUT LE PARCOURS MARCHANDE.
 * Lancer : npm run test:charte-marchande   (tsx, sans DOM)
 *
 * CE QU'IL GÉNÉRALISE. `caisseCharte.test.mts` a fermé la question pour la
 * caisse : les couleurs vivent dans `styles/commerce.css`, les composants les
 * LISENT. Patrick, 24/09 : « On n'invente pas une nouvelle charte. Il faut
 * généraliser celle de la caisse. » Ce fichier étend le MÊME garde-fou aux 23
 * autres écrans du parcours marchande.
 *
 * CE QU'ON A MESURÉ le 24/09, sur ces 23 fichiers :
 *
 *   644 couleurs écrites en dur (hors commentaires), 125 teintes distinctes
 *
 *   338 occurrences valent EXACTEMENT un jeton existant  → migration sans
 *                                                          qu'un pixel bouge
 *   250 sont des VARIANTES involontaires (Δ<30 d'un jeton) — trois beiges
 *       presque identiques, trois oranges presque identiques. C'est ça que
 *       l'œil lit comme « ces écrans ne sont pas de la même famille » :
 *       #b74725 (le jeton) vivait aussi en #af5b23, #8f4418, #e67e22.
 *    69 sont étrangères à la charte (des bleus, des verts d'une autre palette)
 *
 * LE CLIQUET. Chaque fichier a un plafond. Il ne peut que BAISSER.
 *  · au-dessus → refus : une couleur en dur a été ajoutée ;
 *  · en dessous → refus aussi, avec la valeur à coller : un gain se VERROUILLE
 *    dans le même commit, sinon il se reperd au commit suivant.
 *
 * POURQUOI LIRE LE SOURCE (repris de caisseCharte). Une couleur en dur ne
 * casse rien : elle s'affiche. C'est un défaut silencieux — exactement ce
 * qu'une revue laisse passer et qu'aucun test de logique ne voit. On le rend
 * bruyant ici.
 *
 * CE QU'IL NE DIT PAS. Il ne juge pas l'esthétique et ne rend rien. Que les
 * écrans se ressemblent se juge sur un téléphone, pas ici. Il prouve seulement
 * qu'une couleur ne vit qu'à un seul endroit.
 */
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ici = (rel: string) => fileURLToPath(new URL(rel, import.meta.url));
const lire = (rel: string) => readFileSync(ici(rel), "utf8");

// Même règle que caisseCharte : ces fichiers RACONTENT en commentaire la
// charte qu'on retire, et une phrase ne doit ni faire passer ni faire échouer.
const sansCommentaires = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

const COULEUR = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g;

/**
 * LES PLAFONDS, relevés le 24/09/2026. Un fichier absent de cette table doit
 * être à ZÉRO : c'est ce que vérifie le bloc [3], pour qu'un écran neuf ne
 * puisse pas naître avec ses propres couleurs.
 */
const PLAFONDS: Record<string, number> = {
  'GestionStock.tsx': 56,
  'MarcheVirtuel.tsx': 25,
  'MarchandModals.tsx': 9,
  'MarchandDepenses.tsx': 56,
  'CreditModal.tsx': 39,
  'ResumeCaisse.tsx': 33,
  'MesCommandes.tsx': 19,
  'DepenseForm.tsx': 15,
  'ConfirmationLigne.tsx': 17,
  'SaisieGuidee.tsx': 16,
  'AjoutProduitGuide.tsx': 8,
  'Tontines.tsx': 0,
  'ProtectionSociale.tsx': 5,
  'MaCooperative.tsx': 2,
  'Fidelite.tsx': 3,
  'TontineDetail.tsx': 0,
  'SyncEchecsBanner.tsx': 8,
  'RecoltesPrevues.tsx': 0,
  'BesoinMarchand.tsx': 0,
  'VentesPassees.tsx': 4,
  'MarchandAlertes.tsx': 1,
  'BoutonDireProduit.tsx': 0,
  'BoutonDirePrix.tsx': 0,
};

/** Les jetons qui portent une couleur littérale — de quoi nommer ce qu'on migre. */
function jetonsDisponibles(): Map<string, string> {
  const m = new Map<string, string>();
  for (const f of ['../../../styles/commerce.css', '../../../styles/tokens.css', '../../../styles/theme.css']) {
    for (const ligne of lire(f).split('\n')) {
      const t = /^\s*(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/.exec(ligne);
      if (t && !m.has(t[2].toLowerCase())) m.set(t[2].toLowerCase(), t[1]);
    }
  }
  return m;
}

let failures = 0;
const ok = (cond: boolean, label: string) => {
  if (cond) console.log("  ✅", label);
  else { console.log("  ❌", label); failures++; }
};

const jetons = jetonsDisponibles();

console.log("\n[1] le cliquet : aucune couleur en dur ajoutée");
const mesures: Array<[string, number, number]> = [];
for (const [fichier, plafond] of Object.entries(PLAFONDS)) {
  const n = (sansCommentaires(lire(`./${fichier}`)).match(COULEUR) ?? []).length;
  mesures.push([fichier, n, plafond]);
  if (n > plafond) {
    console.log(`  ❌ ${fichier} — ${n} couleurs en dur, plafond ${plafond}`);
    console.log(`       Une couleur en dur a été AJOUTÉE. Utilise un jeton :`);
    for (const c of new Set(sansCommentaires(lire(`./${fichier}`)).match(COULEUR) ?? [])) {
      const j = jetons.get(c.toLowerCase());
      if (j) console.log(`         ${c} → var(${j})`);
    }
    failures++;
  }
}
ok(mesures.every(([, n, p]) => n <= p), `les ${mesures.length} fichiers restent sous leur plafond`);

console.log("\n[2] le cliquet : un gain se VERROUILLE");
for (const [fichier, n, plafond] of mesures) {
  if (n < plafond) {
    console.log(`  ❌ ${fichier} — ${n} couleurs en dur, plafond encore à ${plafond}`);
    console.log(`       C'est un GAIN. Verrouille-le dans ce commit :  '${fichier}': ${n},`);
    failures++;
  }
}
ok(mesures.every(([, n, p]) => n === p), "aucun gain non verrouillé");

console.log("\n[3] aucun écran marchand hors de la table");
// Un fichier qui n'est pas dans PLAFONDS doit être à zéro : c'est ainsi qu'un
// écran neuf ne peut pas naître avec ses propres couleurs.
const inconnus: string[] = [];
for (const f of readdirSync(ici('.'))) {
  if (!f.endsWith('.tsx') || f in PLAFONDS) continue;
  const n = (sansCommentaires(lire(`./${f}`)).match(COULEUR) ?? []).length;
  if (n > 0) inconnus.push(`${f} (${n})`);
}
ok(inconnus.length === 0, `aucun fichier hors table ne porte de couleur en dur${inconnus.length ? ' — ' + inconnus.join(', ') : ''}`);

console.log("\n[4] les jetons de la charte existent bien");
ok(jetons.size >= 100, `${jetons.size} jetons portent une couleur littérale`);
for (const [c, nom] of [['#b74725', '--commerce-action'], ['#f6f0e4', '--commerce-paper']] as const) {
  ok(jetons.get(c) === nom, `${c} est bien ${nom}`);
}

const total = mesures.reduce((s, [, n]) => s + n, 0);
console.log(`\nCouleurs en dur restantes dans le parcours marchande : ${total}`);
if (failures > 0) { console.log(`\n${failures} refus.`); process.exit(1); }
console.log("Charte marchande : garde verte ✅");
