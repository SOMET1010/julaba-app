/**
 * LE BACK-OFFICE NE COMPTE QUE DES VENTES, ET N'INVENTE NI COMMISSION NI ZÉRO
 * — démo 12/10/2026 (causes front localisées avec l'agent backend).
 *
 *   · BORapports : « Commissions » = montant × 3 % (aucune commission
 *     n'existe) ; séries recalculées sur une page de 50 lignes mêlant ventes,
 *     dépenses et annulées, avec `|| 0` sur les montants ; « 12670 » et « +12 % »
 *     écrits en dur.
 *   · BOSupervision : « Volume » = somme de la page ; « Commissions » lit un
 *     champ inexistant ; changer de période ne relisait rien.
 *   · backoffice-api : `|| 0` sur montant_total, zéros sur erreur, liste vide
 *     sur erreur de /transactions/all.
 *   · Le backend renvoie désormais `null` (montant illisible, taux non mesuré) :
 *     l'écran dit « Indisponible » / « non mesuré », jamais 0.
 *
 * Lancer : npm run test:ventes-bo
 */
import { readFileSync, readdirSync } from 'node:fs';
import {
  montantLisible, estVenteRetenue, volumeDesVentes, lireResumeVentes, kpiVolumeVentes,
  kpiVolumeDepuisLecture, texteMontant,
} from './ventesBO.js';
import { seriesMensuelles, performanceRegions, texteMesure } from './seriesRapportsBO.js';
import { kpisTableauDeBord, kpiTuile, lue, enAttente, indisponible } from './etatLectureBO.js';

let echecs = 0;
const ok = (c: boolean, quoi: string) => { console.log(`  ${c ? '✓' : '✗'} ${quoi}`); if (!c) echecs++; };
const APP = new URL('../', import.meta.url).pathname;
const lire = (rel: string) => readFileSync(APP + rel, 'utf8');
const code = (rel: string) => lire(rel).replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');

console.log('\nBack-office : des ventes, rien d\'inventé, jamais un faux zéro\n');

console.log('— la règle de la vente');
ok(montantLisible('1500') === 1500 && montantLisible(null) === null && montantLisible('') === null && montantLisible('abc') === null,
  'montantLisible : nombre lu, sinon null (jamais 0)');
ok(estVenteRetenue({ type: 'vente', statut: 'validee' }), 'une vente validée compte');
ok(!estVenteRetenue({ type: 'vente', statut: 'annulee' }), 'une vente annulée ne compte pas');
ok(!estVenteRetenue({ type: 'depense', statut: 'validee' }), 'une dépense ne compte pas');
ok(volumeDesVentes([
  { type: 'vente', statut: 'validee', montant: '1000' },
  { type: 'depense', statut: 'validee', montant: '700' },
  { type: 'vente', statut: 'annulee', montant: '300' },
]) === 1000, 'volume = ventes retenues seulement (1 000, pas 2 000)');
ok(volumeDesVentes([{ type: 'vente', montant: '1000' }, { type: 'vente', montant: null }]) === null,
  'une vente au montant illisible → volume null, pas un total partiel');

console.log('\n— le résumé du serveur');
const resume = lireResumeVentes({ nombre_ventes: 3, volume_ventes: 4500, montants_illisibles: 0 });
ok(resume?.volume_ventes === 4500, 'resume lu');
ok(lireResumeVentes(undefined) === null, 'resume absent → null');
const illisible = kpiVolumeVentes(lireResumeVentes({ nombre_ventes: 3, volume_ventes: null, montants_illisibles: 1 }));
ok(illisible.type === 'indisponible', 'volume_ventes null → « Indisponible »');
ok(kpiVolumeVentes(null).type === 'indisponible', 'resume absent → « Indisponible », pas 0');
ok(kpiVolumeDepuisLecture(enAttente()).type === 'chargement', 'en attente → « Lecture… »');
ok(kpiVolumeDepuisLecture(indisponible(new Error('500'))).type === 'indisponible', 'erreur → « Indisponible »');
ok(texteMontant(null) === 'illisible' && texteMontant('1500').endsWith('FCFA'), 'texteMontant : « illisible », jamais « 0 FCFA »');
const tuile = kpiTuile({ type: 'indisponible', raison: 'x' }, undefined, { suffix: '%' });
ok(!('suffix' in tuile) && tuile.animatedTarget === undefined, 'tuile indisponible : ni nombre ni unité');

console.log('\n— les séries de Rapports');
const acteurs = [{ dateInscription: '2026-03-02', region: 'Abidjan' }];
const tx = [
  { type: 'vente', statut: 'validee', montant: '2000000', date: '2026-03-05', region: 'Abidjan' },
  { type: 'depense', statut: 'validee', montant: '9000000', date: '2026-03-06', region: 'Abidjan' },
];
const incomplet = seriesMensuelles(acteurs, tx, false);
ok(incomplet.length === 1 && incomplet[0].transactions === null && incomplet[0].volume === null,
  'page incomplète → transactions et volume « non mesuré » (null)');
const complet = seriesMensuelles(acteurs, tx, true);
ok(complet[0].transactions === 1 && complet[0].volume === 2, 'page complète → 1 vente, 2 M (la dépense ne compte pas)');
ok(!('commissions' in complet[0]), 'aucune commission dans la série');
const regions = performanceRegions(acteurs, tx, false);
ok(regions[0].volume === null && !('commissions' in regions[0]) && !('taux' in regions[0]),
  'régions : volume non mesuré, ni commission ni taux inventé');
ok(texteMesure(null) === 'non mesuré', 'texteMesure(null) → « non mesuré »');

console.log('\n— le tableau de bord BO');
const k = kpisTableauDeBord({
  stats: lue({ total_acteurs: 4, montant_total: null }),
  acteurs: lue({ liste: [], total: 4 }), dossiers: lue([]), zones: lue([]),
  transactions: lue({ liste: [{ montant: 500 }], total: 1 }),
});
ok(k.volumeTotal.type === 'indisponible', 'montant_total null → « Indisponible », pas la somme de la page');

console.log('\n— les sources');
const api = code('services/backoffice-api.ts');
const stats = api.slice(api.indexOf('export async function boDashboardStats'), api.indexOf('export async function boGetActeurs'));
ok(!/\|\| 0|: 0[,}]/.test(stats), 'boDashboardStats : aucun `|| 0`, aucun zéro de repli');
ok(!/catch/.test(stats), 'boDashboardStats : une erreur sort en erreur');
const getTx = api.slice(api.indexOf('export async function boGetTransactions('), api.indexOf('export type TransactionStatusValue'));
ok(/throw new Error/.test(getTx) && !/return \{ data: \[\], total: 0/.test(getTx), 'boGetTransactions : erreur levée, pas de liste vide');
ok(/resume: lireResumeVentes\(raw\.resume\)/.test(getTx), 'boGetTransactions propage `resume`');
const rapports = code('components/backoffice/BORapports.tsx');
ok(!/0\.03|commissions|Commissions/.test(rapports), 'BORapports : plus de commissions inventées');
ok(!/12670|"\+12%"/.test(rapports), 'BORapports : plus de 12670 ni « +12 % » en dur');
ok(!/montant \|\| t\.amount \|\| 0/.test(rapports), 'BORapports : plus de `t.montant || t.amount || 0`');
ok(!/\bfetch\(/.test(rapports), 'BORapports : lit par le client BO (boLire), pas par fetch');
const supervision = code('components/backoffice/BOSupervision.tsx');
ok(!/commission|visibleVolume/i.test(supervision), 'BOSupervision : ni commission, ni volume de page');
ok(/setLectureResume\(lue\(res\.resume\)\)/.test(supervision), 'BOSupervision : volume = res.resume');
ok(/\[computeDateRange, currentPage/.test(supervision), 'BOSupervision : changer de période relit les transactions');
ok(!/commission/i.test(code('components/backoffice/BOActeurDetail.tsx')), 'BOActeurDetail : plus de « Commission: 0 FCFA »');
ok(/montantLisible\(t\.montant \?\? t\.amount\)/.test(code('contexts/BackOfficeContext.tsx')),
  'BackOfficeContext : montant illisible → absent, pas parseFloat(… || \'0\')');
const dossier = APP + 'components/institution/';
for (const f of readdirSync(dossier).filter(n => n.endsWith('.tsx'))) {
  ok(!/\bmacroKPIs\.\w+/.test(code('components/institution/' + f).replace(/d\.macroKPIs/g, '')),
    `${f} : aucun chiffre institution lu hors de lectureDashboard`);
}
ok(!/macroKPIs\.valeurMonetaireFormatted;/.test(code('components/shared/UniversalProfil.tsx')),
  'UniversalProfil : le volume passe par lectureDashboard');

console.log(echecs === 0 ? '\n✓ des ventes, rien d\'inventé\n' : `\n✗ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
