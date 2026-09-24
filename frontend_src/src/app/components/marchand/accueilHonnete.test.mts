/**
 * L'ACCUEIL NE REDEVIENT PAS MENTEUR, NI MUET, NI MORT — ACC-01.
 *
 * Le module pur (services/etatCaisseAccueil.test.mts) prouve la RÈGLE. Celui-ci
 * prouve que l'écran s'en sert — et qu'aucune des trois familles fermées par le
 * banc terrain (silence, impasses, faux « 0 F ») ne peut se rouvrir par une
 * ligne réécrite à la va-vite.
 *
 * Il lit le SOURCE. C'est l'idiome du dépôt (caisseCharte.test.mts) : un
 * garde-fou qui n'a besoin ni de DOM ni de réseau, donc qui tourne partout et
 * ne peut pas être « flaky ».
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ici = dirname(fileURLToPath(import.meta.url));
const src = readFileSync(resolve(ici, 'MarchandAccueilVoice.tsx'), 'utf-8');
// On ne juge pas les commentaires : ils CITENT le défaut d'avant, et un
// garde-fou qui interdit de nommer ce qu'on a corrigé rendrait le code muet.
const code = src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');

let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};

console.log('\nL\'accueil — écran étalon du parcours marchand\n');

console.log('[1] Le faux « 0 F » — inconnu / non chargé / erreur ≠ 0');
ok(/etatCaisseAccueil\s*\(/.test(code),
   'l\'écran passe par la règle (services/etatCaisseAccueil), il ne la réécrit pas');
{
  // LE BLOC QUI AFFICHE « MA CAISSE AUJOURD'HUI » — le chiffre que la
  // marchande lit en ouvrant. C'est LUI qui mentait, c'est lui qu'on garde.
  const bloc = code.slice(code.indexOf('commerce-balance-main'), code.indexOf('commerce-balance-actions'));
  ok(bloc.length > 100, 'le bloc de la caisse est bien là (sinon ce garde-fou ne garde rien)');
  ok(!/\|\|\s*0/.test(bloc),
     'le `stats?.caisse || 0` d\'origine a disparu du bloc affiché — c\'était lui, le zéro qui mentait');
}
ok(/caisseAffichable/.test(code) && /'—'|>—</.test(code),
   'quand le montant n\'est pas affichable, l\'écran écrit un tiret, pas un chiffre');
ok(/au moins/.test(code),
   'un montant PARTIEL est annoncé « au moins » : un plancher n\'est pas un total');

console.log('\n[2] Les deux impasses — un bouton qui promet un son en produit un');
ok(/speakMessage\('ACCUEIL_COMPTOIR'\)/.test(code),
   'le bonjour a un recours : la clé de catalogue, quand aucun clip n\'est embarqué');
ok(/r\.doitDireLeTexte/.test(code),
   'ce recours est CONDITIONNÉ par ce que le service rapporte — le composant ne devine pas');
{
  // La double lecture d'avant : `direAccueilMarchand(...)` et `speakMessage`
  // côte à côte, inconditionnels. Si le clip existe, deux Tantie en même temps.
  const enchaine = /direAccueilMarchand\('comptoir'\);\s*\n\s*speakMessage\(/.test(code);
  ok(!enchaine, 'le clip et le texte ne sont JAMAIS lancés l\'un après l\'autre sans condition');
}
{
  // Les deux boutons du banc — le logo et la carte de bienvenue — appellent le
  // MÊME geste. S'ils divergeaient, l'un des deux pourrait redevenir muet sans
  // que rien ne le dise.
  const appels = (code.match(/onClick=\{bonjour\}/g) || []).length;
  ok(appels === 2, `les deux boutons « Écouter… » partagent un seul geste (${appels} trouvé(s), 2 attendus)`);
}
ok(/const direBonjour\s*=/.test(code) && /const bonjour = direBonjour;/.test(code),
   'ce geste est nommé une fois et réutilisé — pas deux chemins à maintenir');

console.log('\n[3] Le silence au montage — une phrase, la bonne, et une seule');
ok(/useEffect\(\(\) => \{[\s\S]{0,400}?ditAuMontage/.test(code),
   'l\'écran dit quelque chose en arrivant');
ok(/if \(ditAuMontage \|\| etatCaisse\.type === 'attente'\) return;/.test(code),
   'il ATTEND de savoir : tant qu\'on ignore l\'état, on ne raconte rien');
ok(/if \(!guidageVocal\(\)\) return;/.test(code),
   'le profil « je lis » reste silencieux — la voix ne s\'impose pas');
ok(/setDitAuMontage\(true\)/.test(code),
   'la phrase ne se répète pas à chaque rendu : pas de bavardage');

console.log('\n[4] Ce qui est dit est ce qui est affiché');
ok(/ACCUEIL_CAISSE_CONNUE/.test(code) && /ACCUEIL_CAISSE_PARTIELLE/.test(code) && /ACCUEIL_CAISSE_ILLISIBLE/.test(code),
   'les trois états ont chacun leur clé — jamais une phrase pour deux situations');
ok(/if \(!soldeVisible\)/.test(code),
   'montants masqués : on ne prononce pas le chiffre que l\'œil a caché');
{
  // La clé ILLISIBLE ne doit porter AUCUNE variable : prononcer un montant
  // qu'on n'a pas est précisément le défaut fermé ici.
  const ligne = code.match(/speakMessage\('ACCUEIL_CAISSE_ILLISIBLE'[^)]*\)/);
  ok(!!ligne && !/,/.test(ligne[0]),
     'la phrase « je n\'ai pas pu lire » ne reçoit aucun montant à prononcer');
}

console.log('\n[5] La logique métier n\'a pas bougé');
ok(/getTodayStats\(\)/.test(code),
   'le montant vient toujours de getTodayStats() — on n\'a pas recalculé la caisse');
ok(!/fondInitial\s*[+\-*/]/.test(code),
   'l\'écran ne refait aucun calcul d\'argent de son côté');

console.log('\n[6] LA DETTE VOISINE, NOMMÉE — ACC-02, OUVERTE');
{
  // « Fermer une dette impose de nommer les dettes voisines ; aucune dette ne
  // se ferme par effet de bord. » Les MODALES de cet écran (MarchandModals :
  // résumé du jour, clôture, fond de caisse) reçoivent encore `|| 0` sur des
  // montants qu'on n'a peut-être pas lus. C'est le MÊME défaut, dans un autre
  // fichier, et il n'entre pas dans ce lot — Patrick a dit : l'accueil seul.
  //
  // Ce garde-fou ne le referme pas : il l'empêche de S'ÉTENDRE. Si le compte
  // monte, quelqu'un a propagé le faux zéro ; s'il descend, ACC-02 avance et
  // le backlog doit suivre (docs/parcours/BACKLOG-PARCOURS.md).
  // MESURÉ LE 22/09/2026, APRÈS FERMETURE DE LA PARTIE QUI ÉCRIT.
  // Ce qui reste : les 8 chiffres AFFICHÉS dans les deux modales (ventes,
  // cahier, caisse, nombre de ventes × 2) et l'objectif. Ils ne mentent plus
  // en silence — les deux modales portent désormais un bandeau qui dit qu'on
  // n'a pas pu lire. Ce qui ÉCRIT est fermé : la clôture refuse, et le fond
  // n'est plus pré-rempli à zéro.
  const DETTE_ACC02 = 9;
  const restants = (code.match(/\?\.[A-Za-z]+\s*\|\|\s*0/g) || []).length;
  ok(restants <= DETTE_ACC02,
     `ACC-02 ne s'étend pas : ${restants} montant(s) en \`?. || 0\` passés aux modales (plafond ${DETTE_ACC02})`);
  if (restants < DETTE_ACC02) {
    console.log(`     ↳ ACC-02 a reculé (${restants} < ${DETTE_ACC02}) : mets le plafond et le backlog à jour.`);
  }
}

console.log("\n[PILOTE] SEPT PORTES, PAS VINGT-SIX");
{
  // Décision de Patrick, 24/09 (docs/parcours/CIBLE-UX-MARCHANDE-PILOTE.md) :
  // la marchande comprend l'application comme « ouvrir → vendre → encaisser »,
  // pas comme une collection de modules. 26 destinations étaient déclarées sous
  // /marchand ; elle n'en utilise que quelques-unes.
  //
  // RIEN N'EST SUPPRIMÉ : les routes et le code restent. Seules les PORTES
  // VISIBLES se réduisent. On remet une tuile en une ligne si besoin.
  const lire = (rel: string) => readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), rel), 'utf-8')
    .replace(/\/\*[\s\S]*?\*\//g, '').split('\n')
    .filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');

  const accueil = lire('./MarchandAccueilVoice.tsx');
  const roles = lire('../../config/roleConfig.ts');

  // KEIWA — un produit financier entier logé dans la caisse d'une marchande,
  // 6 des 26 destinations à lui seul. C'est par la tuile « Mon argent » qu'on
  // tombait sur « Keiwa verrouillé · Entre ton code PIN » : un écran de
  // sécurité, devant une femme qui ne lit pas, avec ZÉRO parole.
  ok(!/\/marchand\/keiwa/.test(accueil),
     "l'accueil n'ouvre plus Keiwa — l'écran de code PIN n'est plus atteignable");
  ok(!/Mon argent/.test(accueil), "et la tuile « Mon argent » a disparu de l'accueil");

  // LE MARCHÉ VIRTUEL — s'approvisionner est un autre métier que vendre.
  const barreMarchand = roles.match(/marchand:\s*\{[\s\S]*?bottomBar:\s*\{[\s\S]*?\]/)?.[0] ?? '';
  ok(!/\/marchand\/marche/.test(barreMarchand),
     "la barre du bas n'ouvre plus le marché virtuel");

  // CE QUI RESTE, et que la marchande doit toujours trouver.
  for (const [chemin, quoi] of [
    ['/marchand/caisse', 'vendre'],
    ['/marchand/stock', 'son étal'],
    ['/marchand/cahier', 'ses dépenses'],
    // « Mes ventes » ouvre désormais le RÉSUMÉ du jour, pas la liste — 24/09.
    // La porte est la même et le libellé aussi ; c'est ce qu'elle ouvre qui
    // change. « Combien j'ai fait aujourd'hui » est la question du soir ; le
    // détail vente par vente s'ouvre DEPUIS ce résumé (portesChiffres.test.mts).
    ['/marchand/resume-caisse', 'ses ventes'],
  ] as const) {
    ok(accueil.includes(chemin), `l'accueil garde la porte vers ${quoi}`);
  }
  for (const [chemin, quoi] of [
    ['/marchand', "l'accueil"],
    ['/marchand/commandes', 'ses commandes'],
    ['/marchand/profil', 'elle-même'],
  ] as const) {
    ok(barreMarchand.includes(`'${chemin}'`), `la barre du bas garde la porte vers ${quoi}`);
  }
}

console.log(echecs === 0
  ? '\n✅ Les trois familles restent fermées.\n'
  : `\n❌ ${echecs} garde(s) tombée(s).\n`);
process.exit(echecs === 0 ? 0 : 1);
