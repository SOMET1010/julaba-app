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
import { paroleConfirmationTerminee } from '../../services/paroleConfirmation.js';
import { creerSessionAsyncExclusive } from '../../services/sessionAsyncExclusive.js';
import { creerTentativeOuverture } from '../../services/tentativeOuverture.js';

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
const nom = lire('components/marchand/BoutonDireNom.tsx');
const guide = lire('components/marchand/AjoutProduitGuide.tsx');
const stock = lire('components/marchand/GestionStock.tsx');
const catalogSource = readFileSync(join(ici, '..', '..', 'i18n', 'voice', 'catalog.ts'), 'utf-8');
const catalog = catalogSource
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
ok(/const questionFond = resoudreMessage\('CAI_OUVERTURE_FOND'\)/.test(flux) && flux.includes('question={questionFond.texte}'),
   'Tantie pose LA question de l\u2019ordre : « tu as combien dans ta caisse aujourd\u2019hui ? »');
ok(flux.includes('messageQuestion={questionFond}')
   && /rendreMessage\(messageQuestion, dire\)/.test(prix),
   'la question parlée passe par le rendu du catalogue et ses clips, pas la seule forme écran');
ok(flux.includes('afficherEcoutePleinEcran') && flux.includes('onAnnulerEcoute={onFermer}'),
   'pendant l\u2019écoute du fond, la maquette montre seulement le micro animé et la fermeture');
ok(/if \(etape === 'confirmation' && ecoute\)[\s\S]{0,140}EcranEcoutePleinEcran/.test(flux),
   'la confirmation vocale reprend aussi l\u2019écran d\u2019écoute sans texte de la maquette');
ok(/cleSilence="CAI_OUVERTURE_SILENCE"/.test(flux) && /cleMicro="CAI_OUVERTURE_MIC"/.test(flux) && /cleReseau="CAI_OUVERTURE_WEB"/.test(flux),
   'les refus nomment le geste de CET écran — un fond n\u2019est pas « le prix »');
ok(flux.includes('grammaire: intentionOuiNon'), 'la confirmation vocale passe par la grammaire déclarée oui/non');
ok(/if \(rep === 'oui'\) void declarer\(m\);/.test(flux),
   'seule la réponse positive vocale passe l\u2019appel d\u2019ouverture de la caisse');
ok(/rendreMessage\(resoudreMessage\('CAI_OUVERTURE_CONFIRMER', \{ montant: m \}\), dire\)/.test(flux),
   'la relecture du montant de confirmation suit le rendu parlé du catalogue');
ok(/paroleConfirmationTerminee\([\s\S]{0,180}rendreMessage/.test(flux)
   && /if \(!reussie\)[\s\S]{0,140}setParole\('echec'\)[\s\S]{0,100}return;[\s\S]{0,180}ecouterConfirmation/.test(flux),
   'la commande oui/non ne démarre qu’après la fin réussie de la parole');
ok(/paroleRef\.current = true/.test(flux)
   && /if \(enCours \|\| !paroleRef\.current\) return/.test(flux)
   && flux.includes('tentativeRef.current.executer')
   && flux.includes('reprendreConfirmation(m)')
   && /disabled=\{enCours \|\| parole !== 'reussie'\}/.test(flux),
   'une écriture rejetée garde le montant et réarme la confirmation sans doubler une tentative en cours');
ok(/parole === 'echec' \?/.test(flux)
   && /Réessayer/.test(flux)
   && /parole !== 'echec' && <motion\.button/.test(flux)
   && (flux.match(/parole !== 'echec' && <motion\.button/g) || []).length >= 2
   && /onClick=\{annuler\}/.test(flux),
   'en cas d’échec de parole, seuls réessayer et revenir sont proposés');
ok(flux.includes('key={tour}') || /setTour\(\(t\) => t \+ 1\)/.test(flux),
   'après un « non », la dictée REPART (le micro rouvre — pas de flux bloqué)');
ok(flux.includes('Le compter à la main'), 'le repli tactile est ÉCRIT dans le flux (et dit par le bouton existant)');
ok(/cleSilence \?\?:|cleSilence = 'STOCK_065'/.test(prix),
   'BoutonDirePrix garde ses refus par défaut — les écrans existants ne bougent pas');
ok(/capture\?\.annuler\(\)/.test(prix) && /onFermer=\{\(\) => \{ void annulerCapture\(\)/.test(prix),
   'annuler le montant utilise capture.annuler et ne livre pas le transcript');
ok(/capture\?\.annuler\(\)/.test(nom) && /onFermer=\{\(\) => \{ void annulerCapture\(\)/.test(nom),
   'annuler le nom utilise capture.annuler et ne livre pas le transcript');
ok(prix.includes('gardeRef.current.demarrer()') && nom.includes('gardeRef.current.demarrer()')
   && prix.includes('if (!sessionCourante(run))') && nom.includes('if (!sessionCourante(run))'),
   'les deux dictées verrouillent avant await et ignorent les continuations obsolètes');

console.log('\n[3] LE CATALOGUE — les clés du flux existent, avec leur texte');
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
const erreurOuverture = catalogSource.slice(catalogSource.indexOf("id: 'CAI_OUVERTURE_ECHEC'")).split('\n')[0];
ok(erreurOuverture.includes('Réessaie ou reviens plus tard'),
   'CAI_OUVERTURE_ECHEC est au catalogue avec son texte de reprise');
ok(/CAI_OUVERTURE_CONFIRMER'[\s\S]{0,400}frActuel: '[^']*Dis oui ou non/.test(catalog),
   'CAI_OUVERTURE_CONFIRMER demande la confirmation à la voix (dis oui ou non)');
ok(flux.includes("resoudreMessage('CAI_OUVERTURE_ECHEC')")
   && flux.includes('Réessayer l’ouverture') && /role="alert"/.test(flux),
   'un rejet d’ouverture est montré et dit depuis le catalogue, avec reprise et retour disponibles');

console.log('\n[4] L\u2019UNITÉ RE-DEMANDÉE — produit existant (ordre Patrick 06/11)');
ok(/produitNomDejaSurEtal\(nom, products\)[\s\S]{0,180}setUnite\(''\);[\s\S]{0,100}setEtapeVue\('unite'\)/.test(guide),
   'la porte A1 ne pose plus l\u2019unité de la ligne : elle va à L\u2019ÉTAPE DE L\u2019UNITÉ',
   guide.slice(guide.indexOf('const avancer'), guide.indexOf('const avancer') + 500));
ok(/const poserUniteEtTrier = \(u: string\)/.test(guide), 'le tri nom+unité est UNE fonction, lue partout');
ok(/produitDejaSurEtal\(\{ nom, unite: u \}, products\);[\s\S]{0,140}if \(deja\) \{\s*setExistant\(deja\);\s*setEtapeVue\('quantite'\);\s*\} else \{\s*setExistant\(null\);\s*setEtapeVue\('prix'\);/.test(guide),
   'la ligne homonyme À CETTE unité → complément ; une AUTRE unité → nouvelle ligne');
ok((guide.match(/poserUniteEtTrier/g) || []).length >= 4,
   'les trois chemins passent par le tri : la grille, le micro, le champ libre (avancer)');
ok(/if \(peutAvancer && etapeVue === 'unite'\) \{ poserUniteEtTrier\(unite\.trim\(\)\); return; \}/.test(guide),
   'le champ libre « Autre » trie aussi — pas de chemin qui brûle l\u2019étape');

console.log('\n[5] L\u2019ACCUEIL ROUTE, LE STOCK OUVRE — un seul chemin de création');
ok(/searchParams\.get\('ajout'\) !== '1'[\s\S]{0,120}setShowAdd\(true\);[\s\S]{0,80}setSearchParams\(\{\}, \{ replace: true \}\)/.test(stock),
   '?ajout=1 ouvre LA modale d\u2019ajout existante, puis l\u2019URL est nettoyée');
ok(stock.includes('<AjoutProduitGuide'), 'la création reste le parcours guidé — aucun doublon de workflow');
ok(/messageQuestion=\{resoudreMessage\('STOCK_047'\)\}/.test(guide)
   && /afficherEcoutePleinEcran/.test(guide),
   'la dictée du nom suit la question catalogue et l\u2019état d\u2019écoute de la maquette');

{
  let resolu = false;
  const parle = paroleConfirmationTerminee(() => new Promise<void>((resolve) => {
    setTimeout(() => { resolu = true; resolve(); }, 0);
  }));
  ok(!resolu && await parle && resolu, 'la suite attend réellement la fin de parole');
  ok(!(await paroleConfirmationTerminee(async () => { throw new Error('tts'); })),
     'un échec de parole refuse la continuation');
}

console.log('\n[6] RACES COMPORTEMENTALES — démarrage, annulation et ouverture');
{
  const garde = creerSessionAsyncExclusive();
  const ancienne = garde.demarrer();
  let acquisitions = ancienne ? 1 : 0;
  const doubleTap = garde.demarrer();
  if (doubleTap) acquisitions++;
  let terminerAncienne!: () => void;
  const demarrageEnAttente = new Promise<void>((resolve) => { terminerAncienne = resolve; });
  let resultatAncienApplique = false;
  const continuationAncienne = demarrageEnAttente.then(() => {
    if (ancienne && garde.estCourante(ancienne)) resultatAncienApplique = true;
  });
  const annulationPendantAttente = ancienne !== null && garde.annuler(ancienne);
  const nouvelle = garde.demarrer();
  terminerAncienne();
  await continuationAncienne;
  const ancienneNeLiberePasNouvelle = ancienne !== null && !garde.terminer(ancienne) && nouvelle !== null
    && garde.estCourante(nouvelle);
  ok(acquisitions === 1 && doubleTap === null, 'deux déclenchements simultanés ne créent qu’un démarrage');
  ok(annulationPendantAttente && !resultatAncienApplique && ancienneNeLiberePasNouvelle,
     'l’annulation pendant await invalide l’ancien résultat sans libérer la session suivante');
  if (nouvelle) garde.annuler(nouvelle);
}
{
  const tentative = creerTentativeOuverture();
  let ecritures = 0;
  let rejeter!: (raison: Error) => void;
  const attente = new Promise<void>((_resolve, reject) => { rejeter = reject; });
  const premiere = tentative.executer(async () => { ecritures++; await attente; });
  const doubleOui = await tentative.executer(async () => { ecritures++; });
  rejeter(new Error('rejet d’ouverture simulé'));
  const echec = await premiere;
  const reprise = await tentative.executer(async () => { ecritures++; });
  const ouiApresSucces = await tentative.executer(async () => { ecritures++; });
  ok(doubleOui.etat === 'ignoree' && echec.etat === 'echec' && reprise.etat === 'ouverte',
     'un rejet est récupérable et une confirmation doublée pendant l’écriture est ignorée');
  ok(ouiApresSucces.etat === 'ignoree' && ecritures === 2,
     'seul le rejet autorise une nouvelle écriture; après succès aucun second openDay');
}

console.log(echecs === 0
  ? '\n✅ Les portes sont câblées; final/interim, échec parole et annulations sont gardés.\n'
  : `\n❌ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
