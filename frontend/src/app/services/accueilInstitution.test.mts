/**
 * L'ACCUEIL INSTITUTION N'INVENTE RIEN — démo 12/10/2026.
 *
 * Défauts constatés : « undefined undefined » à la place du nom, une date
 * figée « 03 Mar 2026 », une courbe d'évolution écrite en dur (2 à 5 « M »
 * FCFA) alors que les transactions valaient 0, des « +12,3 % vs mois
 * dernier » et des détails chiffrés écrits en dur, des zéros par défaut sur
 * une lecture ratée.
 *
 * Lancer : npm run test:accueil-institution
 */
import { readFileSync, readdirSync } from 'node:fs';
import {
  nomAffiche, dateDuJour, messageAccueil, lectureDashboardInstitution,
} from './accueilInstitution.js';
import { enAttente, indisponible, kpiDepuis } from './etatLectureBO.js';
import { kpiTuile, prefixeDeSigne } from './tuileKpi.js';

let echecs = 0;
const ok = (c: boolean, quoi: string) => { console.log(`  ${c ? '✓' : '✗'} ${quoi}`); if (!c) echecs++; };
const APP = new URL('../', import.meta.url).pathname;
const lire = (rel: string) => readFileSync(APP + rel, 'utf8');

console.log('\nAccueil institution : nom réel, date réelle, aucun chiffre inventé\n');

console.log('— le nom');
ok(nomAffiche(undefined, undefined) === null, 'aucun champ → null (rien affiché), pas « undefined undefined »');
ok(nomAffiche('Awa', undefined) === 'Awa', 'prénom seul → « Awa »');
ok(nomAffiche(' Awa ', 'KONÉ') === 'Awa KONÉ', 'prénom + nom, espaces nettoyés');
ok(nomAffiche('', '  ') === null, 'chaînes vides → null');

console.log('\n— la date');
const d = dateDuJour(new Date(2026, 9, 12));
ok(d.includes('12') && d.includes('2026') && !d.includes('Mar'), `12/10/2026 → « ${d} »`);

console.log('\n— la phrase d\'accueil');
const lu = lectureDashboardInstitution({
  macroKPIs: { acteursActifs: 3, totalActeurs: 7, valeurMonetaire: null, croissanceMensuelle: null },
  resumeJour: { transactionsDuJour: 0 },
  dataRepartition: [{ name: 'Marchands', value: 2, color: '#C66A2C' }, { name: 'x' }],
});
ok(lu.type === 'lue', 'réponse avec indicateurs → lue');
ok(messageAccueil('Awa', lu) === 'Bonjour Awa ! 3 acteurs actifs sur 7 inscrits', 'chiffres lus → dits');
ok(messageAccueil(null, enAttente()) === 'Bonjour !', 'sans nom, en attente → « Bonjour ! », sans chiffre');
const ko = messageAccueil(null, indisponible(new Error('500')));
ok(!/\d|undefined/.test(ko), `lecture ratée → aucun chiffre ni « undefined » (« ${ko} »)`);

console.log('\n— lecture ratée ou champ null : jamais un zéro');
ok(lectureDashboardInstitution(null).type === 'indisponible', 'réponse vide → indisponible');
ok(lectureDashboardInstitution({ macroKPIs: {} }).type === 'indisponible', 'sans résumé du jour → indisponible');
ok(kpiDepuis(lu, x => x.macroKPIs.valeurMonetaire).type === 'indisponible', 'valeurMonetaire null → indisponible');
ok(kpiDepuis(lu, x => x.macroKPIs.croissanceMensuelle).type === 'indisponible', 'croissanceMensuelle null → indisponible');
ok(kpiDepuis(lu, x => x.resumeJour.transactionsDuJour).type === 'nombre', 'un zéro LU reste un nombre');
ok(lu.type === 'lue' && lu.valeur.dataRepartition.length === 1, 'une part sans valeur est écartée, pas mise à 0');

console.log('\n— la valeur en FCFA entiers, le signe seulement si positif');
const petite = lectureDashboardInstitution({ macroKPIs: { valeurMonetaire: 2_500_000, croissanceMensuelle: -12 }, resumeJour: {} });
const tuileValeur = kpiTuile(kpiDepuis(petite, d => d.macroKPIs.valeurMonetaire), undefined, { suffix: 'FCFA' });
ok(tuileValeur.animatedTarget === 2_500_000 && tuileValeur.suffix === 'FCFA',
  '2 500 000 F → 2 500 000 FCFA (en milliards arrondis, la tuile affichait 0)');
const baisse = kpiDepuis(petite, d => d.macroKPIs.croissanceMensuelle);
ok(prefixeDeSigne(baisse) === undefined, '-12 % → pas de « + » (jamais « +-12 % »)');
ok(prefixeDeSigne({ type: 'nombre', valeur: 12 }) === '+', '+12 % → « + »');
ok(prefixeDeSigne({ type: 'nombre', valeur: 0 }) === undefined, '0 % → pas de « + »');
for (const f of ['components/institution/AccueilInstitutionChiffres.tsx', 'components/institution/Dashboard.tsx',
  'components/institution/Analytics.tsx', 'components/shared/UniversalProfil.tsx']) {
  const c = lire(f);
  ok(!/1_000_000_000|valeurMonetaireFormatted|Mds FCFA/.test(c), `${f} : ni milliards arrondis, ni valeurMonetaireFormatted`);
}
ok(!/valeurMonetaireFormatted/.test(readFileSync(new URL('../../../../backend/src/institutions/institution-dashboard.controller.ts', import.meta.url), 'utf8')),
  'backend : valeurMonetaireFormatted (milliards arrondis) n\'est plus servi');
ok(/prefixeDeSigne\(kpi\)/.test(lire('components/institution/AccueilInstitutionChiffres.tsx')), 'accueil : le signe passe par prefixeDeSigne');

console.log('\n— les sources');
const hook = lire('hooks/useInstitutionData.ts');
ok(!/DATA_EVOLUTION|dataEvolution/.test(hook), 'useInstitutionData ne fournit plus de courbe écrite en dur');
ok(/lectureDashboard/.test(hook), 'useInstitutionData expose l\'état de lecture');
ok(!/user\.firstName\} \$\{user\.lastName/.test(lire('contexts/InstitutionAccessContext.tsx')),
  'le profil institution ne compose plus firstName/lastName (vides dans UserContext)');
const dossier = APP + 'components/institution/';
for (const f of readdirSync(dossier).filter(n => n.endsWith('.tsx'))) {
  const code = readFileSync(dossier + f, 'utf8');
  ok(!/03 Mar 2026/.test(code), `${f} : pas de date figée`);
  ok(!/explication=\{`\$\{\d/.test(code), `${f} : pas de « % vs mois dernier » écrit en dur`);
  ok(!/value: '[+]?\d[\d,.]*%?'/.test(code), `${f} : pas de détail chiffré écrit en dur`);
  ok(!/dataEvolution|filteredEvolution/.test(code), `${f} : pas de courbe d'évolution sans source`);
}
const accueil = lire('components/institution/AccueilInstitutionChiffres.tsx');
ok(!/valeurMonetaire \/ /.test(accueil), 'la valeur n\'est pas divisée telle quelle (null / 1e9 vaudrait 0)');

console.log(echecs === 0 ? '\n✓ l\'accueil institution n\'invente rien\n' : `\n✗ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
