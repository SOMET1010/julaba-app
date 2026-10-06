/**
 * Garde-fou de source — UNE SEULE PORTE VERS « MES CHIFFRES ».
 * Lancer : npm run test:portes-chiffres   (tsx, sans DOM)
 *
 * CE QU'ON FERME. Décision déjà rendue par Patrick : « "Résumé caisse" n'est
 * plus une destination concurrente : il appartient à "Mes ventes" », et
 * « "Ventes passées" et "Résumé détaillé" cessent d'être deux portes depuis le
 * stock ».
 *
 * CE QU'IL Y AVAIT, mesuré le 24/09 — SEPT portes vers DEUX écrans de chiffres :
 *
 *   accueil, tuile « Mes ventes »               → ventes-passees
 *   stock, raccourci « Ventes passées »         → ventes-passees
 *   stock, raccourci « Résumé détaillé »        → resume-caisse
 *   modale de clôture, bouton « Ventes »        → ventes-passees
 *   modale de clôture, bouton « Résumé caisse » → resume-caisse
 *   ScoreResumeCard, « Historique ventes »      → ventes-passees
 *   ScoreResumeCard, « Résumé caisse »          → resume-caisse
 *
 * Trois de ces boutons portaient la MÊME icône (BarChart3), deux autres
 * étaient côte à côte avec le même fond et la même bordure. Une marchande qui
 * ne lit pas n'avait aucun moyen de choisir — ni de savoir qu'elle avait déjà
 * vu cet écran.
 *
 * LA RÈGLE MAINTENANT. « Mes ventes » ouvre le RÉSUMÉ du jour : c'est la
 * question qu'elle pose tous les soirs, « combien j'ai fait aujourd'hui ». La
 * liste vente par vente est le DÉTAIL de cette réponse : elle s'ouvre depuis le
 * résumé, et de nulle part ailleurs.
 *
 * CE QU'IL NE DIT PAS. Il ne juge pas la mise en page. Il compte des portes.
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

const compter = (code: string, route: string) =>
  (code.match(new RegExp(String.raw`/marchand/${route}\b`, 'g')) ?? []).length;

console.log("\n[1] une seule porte vers la LISTE des ventes, et elle part du résumé");
const ECRANS = ['MarchandAccueilVoice.tsx', 'GestionStock.tsx', 'MarchandModals.tsx', 'VentesPassees.tsx'] as const;
for (const f of ECRANS) {
  ok(compter(sansCommentaires(lire(`./${f}`)), 'ventes-passees') === 0,
     `${f} ne mène plus à la liste des ventes`);
}
ok(compter(sansCommentaires(lire('../shared/ScoreResumeCard.tsx')), 'ventes-passees') === 0,
   'ScoreResumeCard ne mène plus à la liste des ventes');
ok(compter(sansCommentaires(lire('./ResumeCaisse.tsx')), 'ventes-passees') === 1,
   'le RÉSUMÉ est le seul à ouvrir la liste — « Voir chaque vente »');

console.log("\n[2] « Mes ventes » ouvre le résumé du jour, pas la liste");
const accueil = sansCommentaires(lire('./MarchandAccueilVoice.tsx'));
ok(/label: 'Mes ventes',[\s\S]{0,80}\/marchand\/resume-caisse/.test(accueil),
   'la tuile « Mes ventes » ouvre /marchand/resume-caisse');

console.log("\n[3] le stock montre l'étal, pas les chiffres (STK-03)");
const stock = sansCommentaires(lire('./GestionStock.tsx'));
ok(compter(stock, 'resume-caisse') === 0, 'GestionStock ne mène plus au résumé');
ok(compter(stock, 'ventes-passees') === 0, 'ni à la liste des ventes');

console.log("\n[4] plus deux boutons jumeaux dans la modale de clôture");
const modale = sansCommentaires(lire('./MarchandModals.tsx'));
ok(compter(modale, 'resume-caisse') === 1, 'la modale de clôture a UNE porte vers les chiffres');
ok(!/handleNavigateToSales/.test(modale), 'et le second gestionnaire a disparu avec son bouton');

console.log("\n[5] plus deux boutons à la même icône dans ScoreResumeCard");
const carte = sansCommentaires(lire('../shared/ScoreResumeCard.tsx'));
ok(!/Historique ventes/.test(carte), 'le bouton « Historique ventes » a disparu');
ok(!/>\s*Résumé caisse\s*</.test(carte), 'le bouton jumeau « Résumé caisse » aussi');

if (failures > 0) { console.log(`\n${failures} refus.`); process.exit(1); }
console.log("\nUne seule porte vers les chiffres ✅");
