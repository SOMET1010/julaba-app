/**
 * LE CÂBLAGE DES DEUX PORTES DU MATIN — l'ordre de Patrick (06/11).
 * Lancer : npm run test:accueil-cable
 *
 * 1. « Ouvrir ma caisse » : le bouton sur l'accueil, le flux vocal (question
 *    → montant dit → relecture → confirmation oui/non), openDay au parent,
 *    et le repli tactile NOMMÉ (OpenDayModal, orpheline jusqu'ici).
 * 2. « Ajoute un produit » depuis l'accueil : la commande route vers
 *    /marchand/stock?ajout=1 et CET écran ouvre la MÊME modale — un seul
 *    chemin de création.
 * 3. PRODUIT EXISTANT : l'unité est RE-DEMANDÉE (elle peut varier d'une
 *    opération à l'autre) — la porte A1 va à l'étape « unité », le tri
 *    nom+unité décide (compléter vs nouvelle ligne), les trois chemins
 *    (grille, voix, champ libre) passent par la même lecture.
 *
 * Ce garde lit le SOURCE (même méthode que parcoursGuideParle, produitDit) :
 * il fige les câblages, pas les libellés (le catalogue vocal fait foi).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ici = dirname(fileURLToPath(import.meta.url));
let echecs = 0;
const ok = (c: boolean, quoi: string, detail = '') => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) { echecs++; if (detail) console.log(`     ${detail}`); }
};
const lire = (rel: string) =>
  readFileSync(join(ici, '..', '..', rel), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '').split('\n')
    .filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');

const accueil = lire('components/marchand/MarchandAccueilVoice.tsx');
const flux = lire('components/marchand/OuvertureCaisseVoix.tsx');
const prix = lire('components/marchand/BoutonDirePrix.tsx');
const guide = lire('components/marchand/AjoutProduitGuide.tsx');
const stock = lire('components/marchand/GestionStock.tsx');
const catalog = readFileSync(join(ici, '..', '..', 'i18n', 'voice', 'catalog.ts'), 'utf-8')
  .replace(/[’]/g, "'");

console.log('\n[1] LA PORTE DE LA CAISSE — bouton, flux vocal, repli');
ok(/journeeAouvrir = !currentSession \|\| \(currentSession\.opened === false && !currentSession\.closedAt\)/.test(accueil),
   'le bouton du matin : ni ouverte, ni fermée le soir (la bannière « Rouvrir » reste la porte des journées fermées)');
ok(accueil.includes('<OuvertureCaisseVoix'), 'l\u2019accueil monte le flux vocal d\u2019ouverture');
ok(/onFondDeclare=\{async \(montant\) => \{[\s\S]*await openDay\(montant\);[\s\S]*speakMessage\('MARCHAND_007'/.test(accueil),
   'le oui de la marchande déclare la journée (openDay) et Tantie le dit (MARCHAND_007)');
ok(accueil.includes('<OpenDayModal'), 'OpenDayModal est enfin MONTÉE — le comptage à la main existe');
ok(/onManuel=\{\(\) => \{ setShowOuverture\(false\); setShowOpenDay\(true\); \}\}/.test(accueil),
   'le flux vocal NOMME le repli tactile — deux portes, un seul openDay');
ok(accueil.includes('grammaire: intentionAccueil'), 'l\u2019accueil ÉCOUTE la grammaire déclarée des commandes');
ok(accueil.includes("navigate('/marchand/stock?ajout=1')"), '« ajoute un produit » route vers le stock, paramètre d\u2019ouverture');

console.log('\n[2] LE FLUX VOCAL — question, montant, confirmation, doute');
ok(flux.includes('<BoutonDirePrix') && flux.includes('CAI_OUVERTURE_FOND'),
   'le fond se DICTE par le composant existant (BoutonDirePrix + montantDit)');
ok(flux.includes('question={resoudreMessage(\'CAI_OUVERTURE_FOND\').texte}'),
   'Tantie pose LA question de l\u2019ordre : « tu as combien dans ta caisse aujourd\u2019hui ? »');
ok(/cleSilence="CAI_OUVERTURE_SILENCE"/.test(flux) && /cleMicro="CAI_OUVERTURE_MIC"/.test(flux) && /cleReseau="CAI_OUVERTURE_WEB"/.test(flux),
   'les refus nomment le geste de CET écran — un fond n\u2019est pas « le prix »');
ok(flux.includes('grammaire: intentionOuiNon'), 'la confirmation vocale passe par la grammaire déclarée oui/non');
ok(flux.includes('key={tour}') || /setTour\(\(t\) => t \+ 1\)/.test(flux),
   'après un « non », la dictée REPART (le micro rouvre — pas de flux bloqué)');
ok(flux.includes('Le compter à la main'), 'le repli tactile est ÉCRIT dans le flux (et dit par le bouton existant)');
ok(/cleSilence \?\?:|cleSilence = 'STOCK_065'/.test(prix),
   'BoutonDirePrix garde ses refus par défaut — les écrans existants ne bougent pas');

console.log('\n[3] LE CATALOGUE — les cinq clés du flux existent, avec leur texte');
// Fragments SANS apostrophe : la classe [^'] du motif s'arrête à la première —
// les textes du catalogue en portent (« n'ai », « C'est »).
for (const [id, mot] of [['CAI_OUVERTURE_FOND', 'Tu as combien dans ta caisse'],
                         ['CAI_OUVERTURE_CONFIRMER', 'au fond de caisse'],
                         ['CAI_OUVERTURE_SILENCE', 'pas entendu le montant'],
                         ['CAI_OUVERTURE_MIC', 'Le micro ne répond pas'],
                         ['CAI_OUVERTURE_WEB', 'pas répondu. Compte ton argent']] as const) {
  ok(new RegExp(`id: '${id}'[\\s\\S]{0,400}frActuel: '[^']*${mot.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\$&')}`).test(catalog),
     `${id} est au catalogue avec son texte`);
}
ok(/CAI_OUVERTURE_CONFIRMER'[\s\S]{0,400}frActuel: '[^']*Dis oui ou non/.test(catalog),
   'CAI_OUVERTURE_CONFIRMER demande la confirmation à la voix (dis oui ou non)');

console.log('\n[4] L\u2019UNITÉ RE-DEMANDÉE — produit existant (ordre Patrick 06/11)');
ok(/produitDejaSurEtal\(\{ nom, unite: '' \}, products\);[\s\S]{0,220}setEtapeVue\('unite'\)/.test(guide),
   'la porte A1 ne pose plus l\u2019unité de la ligne : elle va à L\u2019ÉTAPE DE L\u2019UNITÉ',
   guide.slice(guide.indexOf('const avancer'), guide.indexOf('const avancer') + 500));
ok(/const poserUniteEtTrier = \(u: string\)/.test(guide), 'le tri nom+unité est UNE fonction, lue partout');
ok(/produitDejaSurEtal\(\{ nom, unite: u \}, products\);[\s\S]{0,80}if \(deja\) setExistant\(deja\);[\s\S]{0,40}else setEtapeVue\('prix'\)/.test(guide),
   'la ligne homonyme À CETTE unité → complément ; une AUTRE unité → nouvelle ligne');
ok((guide.match(/poserUniteEtTrier/g) || []).length >= 4,
   'les trois chemins passent par le tri : la grille, le micro, le champ libre (avancer)');
ok(/if \(peutAvancer && etapeVue === 'unite'\) \{ poserUniteEtTrier\(unite\.trim\(\)\); return; \}/.test(guide),
   'le champ libre « Autre » trie aussi — pas de chemin qui brûle l\u2019étape');

console.log('\n[5] L\u2019ACCUEIL ROUTE, LE STOCK OUVRE — un seul chemin de création');
ok(/searchParams\.get\('ajout'\) !== '1'[\s\S]{0,120}setShowAdd\(true\);[\s\S]{0,80}setSearchParams\(\{\}, \{ replace: true \}\)/.test(stock),
   '?ajout=1 ouvre LA modale d\u2019ajout existante, puis l\u2019URL est nettoyée');
ok(stock.includes('<AjoutProduitGuide'), 'la création reste le parcours guidé — aucun doublon de workflow');

console.log(echecs === 0
  ? '\n✅ Les deux portes du matin sont câblées : la caisse s\u2019ouvre en parlant, le produit existant redemande son unité.\n'
  : `\n❌ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
