/**
 * UN RÉSUMÉ NOMME LA PÉRIODE QU'IL DÉCRIT — HIS-01.
 *
 * Recette terrain, MAR-HIS-001, mot pour mot : « je sélectionne la périodicité
 * "Ce mois" et il est affiché "Aujourd'hui tu as gagné 33 600 francs" ».
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ouverturePhrasePeriode, complementPeriode, parleDuJour, type PeriodeResume,
} from './resumePeriode.js';
import { t, tParle } from '../i18n/voice/runtime.js';

const ici = dirname(fileURLToPath(import.meta.url));
let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};

const TOUTES: PeriodeResume[] = ['today', '7days', '30days', 'custom'];

console.log('\nUn résumé dit de quelle période il parle\n');

console.log('[1] Chaque période a ses mots, et ils ouvrent une phrase');
ok(ouverturePhrasePeriode('today') === "Aujourd'hui", 'today → « Aujourd\'hui »');
ok(ouverturePhrasePeriode('7days') === 'Sur les 7 derniers jours',
   '7days → « Sur les 7 derniers jours » — avec sa préposition, pas le libellé du bouton');
ok(ouverturePhrasePeriode('30days') === 'Sur les 30 derniers jours', '30days → les 30 derniers jours');
ok(ouverturePhrasePeriode('custom') === 'Sur la période choisie', 'custom → la période choisie');
{
  const distinctes = new Set(TOUTES.map(ouverturePhrasePeriode));
  ok(distinctes.size === TOUTES.length,
     'les quatre sont DIFFÉRENTES : deux périodes qui se disent pareil, c\'est le défaut qui revient');
}

console.log('\n[2] LE DÉFAUT DE LA RECETTE : « Ce mois » ne dit plus « Aujourd\'hui »');
{
  const fautives = TOUTES.filter(p => !parleDuJour(p) && /aujourd/i.test(ouverturePhrasePeriode(p)));
  ok(fautives.length === 0,
     `aucune période autre que « today » ne parle du jour${fautives.length ? ' — fautive(s) : ' + fautives.join(', ') : ''}`);
}
{
  const fautives = TOUTES.filter(p => !parleDuJour(p) && /\bdu jour\b/i.test(complementPeriode(p)));
  ok(fautives.length === 0, 'et « Résumé du jour » ne s\'emploie pas non plus hors du jour');
}
ok(complementPeriode('today') === 'du jour' && ouverturePhrasePeriode('today') === "Aujourd'hui",
   'seule « today » a le droit de parler du jour — et elle en garde les mots d\'origine');

console.log('\n[3] Les deux formes se glissent dans une vraie phrase');
for (const p of TOUTES) {
  const phrase = `${ouverturePhrasePeriode(p)}, tu as gagné 33 600 francs.`;
  ok(!phrase.startsWith(' ') && phrase.includes(', tu as gagné'),
     `« ${phrase.slice(0, 46)}… » se lit`);
}
ok(`Résumé ${complementPeriode('30days')}.` === 'Résumé des 30 derniers jours.',
   '« Résumé des 30 derniers jours. » — et non « Résumé 30 derniers jours »');

console.log('\n[4] L\'ÉCRAN N\'ÉCRIT PLUS LA PÉRIODE EN DUR');
{
  // Le vrai témoin : le source de l'écran. Les deux phrases — celle qui
  // s'affiche et celle qui se dit — codaient « aujourd'hui » / « du jour » en
  // dur, indépendamment du bouton choisi.
  const src = readFileSync(resolve(ici, '..', 'components', 'marchand', 'ResumeCaisse.tsx'), 'utf-8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');
  ok(!/Aujourd'hui tu as gagné|Aujourd’hui tu as gagné/.test(code),
     'la phrase affichée ne commence plus par « Aujourd\'hui » quoi qu\'il arrive');
  ok(!/Résumé du jour\./.test(code),
     'la phrase dite ne s\'appelle plus « Résumé du jour » quoi qu\'il arrive');
  ok(/ouverturePhrasePeriode|complementPeriode/.test(code),
     'l\'écran passe par la règle au lieu de la réécrire');
}

console.log('\n[5] ET LES MONTANTS DITS NE PASSENT PLUS PAR LA FORME ÉCRITE');
{
  // Le second défaut, trouvé en corrigeant le premier : la phrase DITE
  // fabriquait ses montants avec `toLocaleString('fr-FR')` — l'espace fine
  // insécable partait au moteur de synthèse, qui épelle « trois zéro zéro
  // zéro ». C'est la faute fermée le 22/09 sur la caisse (deuxFormes), encore
  // vivante ici.
  const src = readFileSync(resolve(ici, '..', 'components', 'marchand', 'ResumeCaisse.tsx'), 'utf-8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');
  // ATTENTION : chercher `speak(... toLocaleString ...)` sur UNE ligne ne
  // prouve rien — la phrase était assemblée dans une variable, puis passée à
  // `speak(resume)`. Ce test-là passait au vert sur du code fautif. On exige
  // donc la CHOSE JUSTE, qui est vérifiable : le résumé parlé passe par le
  // catalogue (`speakMessage`), seul chemin qui produise la forme PARLÉE des
  // montants (« trois mille francs » et non « 3 000 »).
  ok(/speakMessage\(/.test(code),
     'le résumé parlé passe par le catalogue — seul chemin vers la forme parlée des montants');
  const bilanEnDur = /Ventes\s*:\s*\$\{[^}]*toLocaleString/.test(code);
  ok(!bilanEnDur, 'la phrase parlée n\'assemble plus les montants avec leur forme ÉCRITE');
}

console.log('\n[6] LA PREUVE TRAVERSE : les clés du catalogue, sur les quatre périodes');
{
  // On ne se contente pas de vérifier que l'écran APPELLE le catalogue : on
  // lit ce que le catalogue REND, à l'œil et à l'oreille, pour chaque période.
  for (const p of TOUTES) {
    const vars = { periode: ouverturePhrasePeriode(p), ventes: 33600, depenses: 1200 };
    const ecran = t('RESUME_BILAN_GAGNE', vars);
    const dit = tParle('RESUME_BILAN_GAGNE', vars);
    // L'ŒIL GARDE SA FORME, AU CARACTÈRE PRÈS : `toLocaleString('fr-FR')`
    // sépare les milliers par U+202F (espace fine insécable). C'est justement
    // ce caractère que le moteur de synthèse ne sait pas lire — d'où les deux
    // formes. L'écran, lui, ne change pas d'un pixel.
    const ecritsAttendus = `${(33600).toLocaleString('fr-FR')} francs`;
    ok(ecran.startsWith(ouverturePhrasePeriode(p)) && ecran.includes(ecritsAttendus),
       `${p} → écran : « ${ecran.slice(0, 44)}… »`);
    ok(dit.includes('trente-trois mille six cents francs') && !/33/.test(dit),
       `${p} → oreille : « trente-trois mille six cents francs », plus aucun groupe de chiffres`);
    const detail = tParle('RESUME_DETAIL', {
      complement: complementPeriode(p), ventes: 33600, depenses: 1200, solde: 42400, heure: '12h',
    });
    ok(detail.includes(`Résumé ${complementPeriode(p)}.`) && detail.includes('quarante-deux mille quatre cents francs'),
       `${p} → le résumé lu nomme sa période ET dit ses trois montants`);
  }
  // Le cas qui a produit le défaut : une période qui n'est pas le jour ne
  // doit plus, à aucune des deux sorties, contenir les mots du jour.
  const fautives = TOUTES.filter(p => !parleDuJour(p)).filter(p => {
    const vars = { periode: ouverturePhrasePeriode(p), ventes: 1, depenses: 1 };
    return /aujourd/i.test(t('RESUME_BILAN_GAGNE', vars))
      || /aujourd/i.test(tParle('RESUME_BILAN_GAGNE', vars))
      || /\bdu jour\b/i.test(tParle('RESUME_DETAIL', { complement: complementPeriode(p), ventes: 1, depenses: 1, solde: 1, heure: 'x' }));
  });
  ok(fautives.length === 0,
     `aucune période ne fait dire « aujourd'hui » au catalogue${fautives.length ? ' — fautive(s) : ' + fautives.join(', ') : ''}`);
}
{
  ok(!/\d/.test(tParle('RESUME_BILAN_SANS_DEPENSE', { periode: "Aujourd'hui", ventes: 3000 })),
     'zéro dépense : la phrase dite ne contient plus AUCUN chiffre — « trois mille francs »');
  ok(t('RESUME_BILAN_PERTE', { periode: 'Sur les 30 derniers jours' })
       === 'Attention ! Sur les 30 derniers jours, tu as plus dépensé que gagné. Fais attention à tes dépenses.',
     'la perte aussi nomme sa période — c\'était « aujourd\'hui » en dur elle aussi');
}

console.log(echecs === 0
  ? '\n✅ Le résumé dit de quelle période il parle, et ses montants se prononcent.\n'
  : `\n❌ ${echecs} règle(s) violée(s).\n`);
process.exit(echecs === 0 ? 0 : 1);
