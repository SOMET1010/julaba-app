/**
 * LE BACK-OFFICE NE DESSINE PLUS UN ÉCRAN CALME SUR UNE PANNE — BO-02 + BO-03.
 *
 * BO-01 a fermé les sept compteurs. Il a nommé, en se fermant, ce qu'il ne
 * prenait pas :
 *
 *   BO-02  les six autres sources du contexte (missions, audit, utilisateurs
 *          BO, institutions, signalements, notifications) avalaient encore
 *          leur erreur dans `console.error('[BO]', e)` ;
 *   BO-03  sur le MÊME tableau de bord, les alertes, les graphiques et les
 *          barres de progression lisaient encore les listes qui valent `[]`
 *          quand la lecture a échoué.
 *
 * LA PREUVE QU'ON CHERCHE ICI est celle de BO-01, portée d'un compteur à un
 * bloc d'écran : aucun chemin ne produit une alerte rassurante, une barre ou
 * un graphique depuis `attente` ou `indisponible`.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { enAttente, indisponible, lue } from '../../services/etatLectureBO.js';
import {
  sectionDe, motDeSection, explicationDeSection,
  alertesBO, urgentes, objectifsBO, pourcentageBarre,
  MOT_SECTION_CHARGEMENT, MOT_SECTION_INDISPONIBLE,
  TITRE_RIEN_A_SIGNALER, DESC_RIEN_A_SIGNALER,
  type LecturesAlertes, type ActeurObjectif,
} from './etatSectionsBO.js';

const ici = dirname(fileURLToPath(import.meta.url));
let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};
/** La source DÉBARRASSÉE de ses commentaires. Une règle ne se prouve pas dans
 *  une phrase : `console.error('[BO]', e)` est cité deux fois en commentaire
 *  dans le contexte, et le chercher sur le fichier brut passerait au vert sur
 *  du code corrigé comme sur du code fautif. */
const source = (...p: string[]) => {
  const brut = readFileSync(resolve(ici, '..', '..', ...p), 'utf-8');
  return brut.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');
};

const RIEN: LecturesAlertes = {
  dossiers: lue([]),
  acteurs: lue({ liste: [] }),
  missions: lue([]),
};

console.log('\nUne panne ne se présente plus comme une bonne nouvelle\n');

console.log('[1] « TOUT EST EN ORDRE » N\'EST DIT QUE SI ON A REGARDÉ');
{
  // LE DÉFAUT, exactement : les trois listes valaient [], les trois compteurs
  // valaient 0, la liste d'alertes restait vide — et l'écran affichait
  // « Aucune alerte activée — Tout est en ordre. Aucune action urgente
  // requise. » sur un back-office qui n'avait rien pu lire.
  const panne = alertesBO({
    dossiers: indisponible('Dossiers injoignables'),
    acteurs: indisponible('Acteurs injoignables'),
    missions: indisponible('Missions injoignables'),
  });
  ok(!panne.some(a => a.titre === TITRE_RIEN_A_SIGNALER),
     `tout en panne : « ${TITRE_RIEN_A_SIGNALER} » n'est PAS affiché`);
  ok(!panne.some(a => a.desc === DESC_RIEN_A_SIGNALER),
     'ni « Tout est en ordre. Aucune action urgente requise. »');
  ok(panne.length === 3 && panne.every(a => a.ton === 'inconnu'),
     `les trois sources illisibles se disent, une par une (${panne.length} carte(s))`);
  // `every` sur une liste VIDE vaut `true` : sans le compte, ces deux
  // assertions passaient au vert sur un code qui ne produisait plus AUCUNE
  // carte. Le contre-essai l'a montré ; le compte est donc exigé d'abord.
  ok(panne.length === 3 && panne.every(a => /injoignables/.test(a.desc)),
     'et chacune garde SA raison — « indisponible » sans raison est un autre silence');
  ok(panne.length === 3 && panne.every(a => /pas « rien à signaler »/.test(a.desc)),
     'la carte dit en toutes lettres que ce n\'est pas « rien à signaler »');
  ok(urgentes(panne) === 0,
     'le bandeau « N urgentes » ne compte aucune de ces cartes : on ne les a pas lues');
}
{
  const attente = alertesBO({ dossiers: enAttente(), acteurs: enAttente(), missions: enAttente() });
  ok(!attente.some(a => a.titre === TITRE_RIEN_A_SIGNALER),
     'rien demandé encore : pas de phrase rassurante non plus — l\'attente n\'est pas une réponse');
  ok(attente.length === 3 && attente.every(a => /lecture en cours/.test(a.titre)),
     'les trois disent « lecture en cours »');
}
{
  // ET LE CAS QUI REND LE PRÉCÉDENT NON TRIVIAL : un vrai calme, vérifié.
  const calme = alertesBO(RIEN);
  ok(calme.length === 1 && calme[0].titre === TITRE_RIEN_A_SIGNALER,
     'tout lu et rien à signaler : la phrase rassurante EST affichée — un vrai calme se dit');
  ok(calme[0]?.desc === DESC_RIEN_A_SIGNALER, 'avec son texte d\'origine, inchangé');
}

console.log('\n[1b] UNE LECTURE PARTIELLE DIT LES DEUX : CE QU\'ELLE SAIT, ET CE QU\'ELLE IGNORE');
{
  const partielle = alertesBO({
    dossiers: lue([{ statut: 'en_attente' }, { statut: 'en_attente' }, { statut: 'valide' }]),
    acteurs: lue({ liste: [{ statut: 'suspendu' }, { statut: 'actif' }] }),
    missions: indisponible('Missions injoignables'),
  });
  ok(partielle.some(a => a.titre === '2 dossiers en attente'),
     'les dossiers ont été lus : leur alerte reste, on ne la cache pas parce qu\'une autre source est tombée');
  ok(partielle.some(a => a.titre === '1 acteur suspendu'),
     'les acteurs aussi — et le singulier reste correct');
  ok(partielle.some(a => a.ton === 'inconnu' && /Missions/.test(a.titre)),
     'SEULES les missions sont déclarées illisibles');
  ok(!partielle.some(a => a.titre === TITRE_RIEN_A_SIGNALER),
     'et la phrase rassurante reste absente : une source manque');
  ok(urgentes(partielle) === 2, 'le bandeau compte les 2 vraies urgences, et elles seules');
}
{
  // LE CAS LE PLUS TRANCHANT : deux sources lues qui n'ont RIEN à signaler, et
  // une troisième tombée. L'ancien code arrivait ici avec une liste vide et
  // écrivait « Tout est en ordre » — sur une panne.
  const calmeTrompeur = alertesBO({ ...RIEN, missions: indisponible('Missions injoignables') });
  ok(!calmeTrompeur.some(a => a.titre === TITRE_RIEN_A_SIGNALER),
     'deux sources calmes et une tombée : la phrase rassurante reste absente');
  ok(calmeTrompeur.length === 1 && calmeTrompeur[0]?.ton === 'inconnu',
     'il ne reste que la carte qui dit ce qu\'on n\'a pas pu lire');
}
{
  // Une source lue qui n'a rien à dire ne fabrique pas d'alerte inverse.
  const missionsSeules = alertesBO({ ...RIEN, missions: lue([{ statut: 'en_cours' }]) });
  ok(missionsSeules.length === 1 && missionsSeules[0].titre === '1 mission active',
     'une mission en cours, et rien d\'autre : une seule carte, pas de rassurance par-dessus');
}

console.log('\n[2] UNE SECTION NE SE DESSINE QUE SI TOUTES SES SOURCES SONT LUES');
{
  let appels = 0;
  const calcul = () => { appels++; return ['dessiné']; };

  const tout = sectionDe([lue([1]), lue([2])], calcul);
  ok(tout.type === 'donnees' && tout.valeur[0] === 'dessiné', 'deux sources lues : la section se dessine');
  ok(appels === 1, 'et le calcul a été appelé une fois');

  appels = 0;
  const unePanne = sectionDe([lue([1]), indisponible('Transactions injoignables')], calcul);
  ok(unePanne.type === 'indisponible' && unePanne.raison === 'Transactions injoignables',
     'une source en panne : la section est indisponible, avec SA raison');
  ok(appels === 0,
     'ET LE CALCUL N\'A PAS ÉTÉ APPELÉ — c\'est la garantie : une liste repliée sur [] n\'atteint jamais le dessin');

  appels = 0;
  const uneAttend = sectionDe([lue([1]), enAttente()], calcul);
  ok(uneAttend.type === 'chargement', 'une source qui attend : on attend, on ne dessine pas un vide');
  ok(appels === 0, 'et là non plus le calcul n\'a pas tourné');

  // L'ÉCHEC PRIME SUR L'ATTENTE, volontairement : faire patienter un agent
  // devant une panne déjà connue serait un silence de plus.
  const melange = sectionDe([enAttente(), indisponible('Acteurs injoignables')], calcul);
  ok(melange.type === 'indisponible' && melange.raison === 'Acteurs injoignables',
     'une panne connue et une attente : on annonce la panne, pas la patience');
}
{
  const ko = sectionDe([indisponible('Failed to fetch')], () => 1);
  ok(motDeSection(ko) === MOT_SECTION_INDISPONIBLE, `la section affiche « ${MOT_SECTION_INDISPONIBLE} »`);
  ok((explicationDeSection(ko) ?? '').includes('Failed to fetch'), 'la raison est offerte à l\'agent');
  ok((explicationDeSection(ko) ?? '').includes('rien à afficher'),
     'et l\'explication dit que ce n\'est pas « rien à afficher »');
  ok(motDeSection(sectionDe([enAttente()], () => 1)) === MOT_SECTION_CHARGEMENT,
     `pendant l'attente : « ${MOT_SECTION_CHARGEMENT} »`);
  ok(motDeSection(sectionDe([lue(0)], () => 1)) === null,
     'et quand tout est lu, aucun mot ne remplace le contenu — même si le contenu est vide');
}

console.log('\n[3] LES BARRES DE PROGRESSION N\'INVENTENT PAS DE POURCENTAGE');
const nombre = (v: number) => ({ type: 'nombre' as const, valeur: v });
const kpiKo = (raison: string) => ({ type: 'indisponible' as const, raison });
const LISTE: readonly ActeurObjectif[] = [
  { statut: 'actif', genre: 'femme', photoUrl: 'a.jpg' },
  { statut: 'actif', genre: 'femme' },
  { statut: 'suspendu', genre: 'homme', photoUrl: 'c.jpg' },
  { statut: 'actif', genre: 'homme' },
];
{
  const s = objectifsBO(nombre(4), nombre(3), lue({ liste: LISTE }));
  ok(s.type === 'donnees' && s.valeur.length === 4, 'tout lu : les quatre barres sont calculées');
  if (s.type === 'donnees') {
    const par = (l: string) => s.valeur.find(o => o.label === l)!;
    ok(par('Acteurs enrôlés').current === 4, 'acteurs enrôlés : 4, le nombre lu');
    ok(par('Taux validation').current === 75, 'taux de validation : 3 actifs sur 4 → 75 %');
    ok(par('Digitalisation').current === 50, 'digitalisation : 2 photos sur 4 → 50 %');
    ok(par('Inclusion sociale').current === 50, 'inclusion : 2 femmes actives sur 4 → 50 %');
  }
}
{
  // LE DÉFAUT, exactement : `totalActeurs > 0 ? … : 0` donnait 0 % quand rien
  // n'avait été lu, et une barre à 0 % face à une cible de 95 % se lit comme
  // un échec de terrain, pas comme une absence de mesure.
  const acteursKo = objectifsBO(nombre(4), nombre(3), indisponible('Acteurs injoignables'));
  ok(acteursKo.type === 'indisponible' && acteursKo.raison === 'Acteurs injoignables',
     'acteurs illisibles : AUCUNE barre — et la raison est dite');

  // ON EXIGE LA RAISON, PAS SEULEMENT LE TYPE. Un contre-essai (retirer le
  // total de la liste des sources) laissait cette assertion au VERT : la
  // re-vérification interne rendait bien « indisponible », mais avec la raison
  // GÉNÉRIQUE, sans dire QUI manquait. Un « indisponible » anonyme est un
  // autre silence — c'est la leçon de BO-01, appliquée à une section.
  const totalKo = objectifsBO(kpiKo('Stats et acteurs KO'), nombre(3), lue({ liste: LISTE }));
  ok(totalKo.type === 'indisponible' && totalKo.raison === 'Stats et acteurs KO',
     'pas de total lisible : pas de pourcentage, et la section dit QUELLE source manque');

  const actifsEnCours = objectifsBO(nombre(4), { type: 'chargement' }, lue({ liste: LISTE }));
  ok(actifsEnCours.type === 'chargement', 'un compteur encore en route : on attend, on ne dessine pas 0 %');
}
{
  // ET LE VRAI ZÉRO RESTE DICIBLE : zéro acteur COMPTÉ, c'est une réponse.
  const vide = objectifsBO(nombre(0), nombre(0), lue({ liste: [] }));
  ok(vide.type === 'donnees', 'zéro acteur LU : les barres se dessinent');
  if (vide.type === 'donnees') {
    ok(vide.valeur.every(o => o.current === 0), 'et elles valent 0 — on l\'a compté, on peut le dire');
  }
  ok(pourcentageBarre({ label: 'x', current: 30000, target: 15000, estimation: false }) === 100,
     'une barre reste bornée à 100 %, comme avant');
  ok(pourcentageBarre({ label: 'x', current: 7500, target: 15000, estimation: false }) === 50,
     'et un demi-objectif vaut bien 50 %');
}

console.log('\n[4] LE CONTEXTE ET L\'ÉCRAN PASSENT PAR LÀ');
{
  const ctx = source('contexts', 'BackOfficeContext.tsx');

  // BO-02 — LES SIX SOURCES QUI AVALAIENT ENCORE. On lit le BLOC de chaque
  // fonction, jamais le fichier entier : `setLecture…(indisponible(` existe
  // déjà cinq fois pour BO-01, et une recherche globale passerait au vert
  // sans qu'aucune des six n'ait été touchée.
  for (const [nom, fn] of [
    ['missions', 'refreshMissions'], ['audit', 'refreshAuditLogs'],
    ['utilisateurs BO', 'refreshBOUsers'], ['institutions', 'refreshInstitutions'],
    ['signalements', 'refreshSignalements'], ['notifications', 'refreshNotifications'],
  ] as const) {
    const bloc = ctx.match(new RegExp(`const ${fn} = useCallback\\(async[\\s\\S]*?\\n  \\}, \\[`));
    ok(!!bloc && /setLecture[A-Za-z]+\(indisponible\(/.test(bloc[0]),
       `${nom} : l'échec devient « indisponible », il n'est plus avalé`);
    ok(!!bloc && /setLecture[A-Za-z]+\(lue\(/.test(bloc[0]),
       `${nom} : le succès devient « lue »`);
    ok(!!bloc && /setLecture[A-Za-z]+\(enAttente\(\)\)/.test(bloc[0]),
       `${nom} : une nouvelle tentative repart de « attente »`);
  }
  ok(!/console\.error\('\[BO\]'/.test(ctx),
     'et il ne reste AUCUN `console.error(\'[BO]\')` dans le code — la console d\'un navigateur n\'est pas une interface');

  const dash = source('components', 'backoffice', 'BODashboard.tsx');

  // BO-03 — LES CINQ NOMBRES FABRIQUÉS N'EXISTENT PLUS. On retire les chaînes
  // littérales avant de lire : une première version échouait sur le libellé
  // `label="Acteurs actifs"`, et un test qui échoue sur un mot français ne dit
  // rien du code.
  const codeSeul = dash.replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''");
  const fabrique = /const (totalActeurs|actifs|suspendus|enAttente|volumeTotal) =/.exec(codeSeul);
  ok(!fabrique,
     `plus aucun nombre calculé sur une liste repliée sur []${fabrique ? ' — reste : ' + fabrique[0] : ''}`);
  ok(!/acteurs\.filter\(a => a\.statut === ''\)\.length/.test(codeSeul),
     'et plus aucun comptage direct de statut hors d\'une section gardée');

  // LES CINQ BLOCS DE RENDU, UN PAR UN. `<BlocSection` cherché sur le fichier
  // entier ne prouverait qu'une chose : qu'il est écrit quelque part. On borne
  // donc au bloc de rendu concerné.
  for (const [quoi, ancre, etat] of [
    ['le graphique de croissance', 'Nouveaux acteurs et transactions par mois', 'sectionCroissance'],
    ['la répartition par type', "Par type d'acteur", 'sectionRepartition'],
    ['les barres d\'objectifs', 'Progression vers les cibles fixées', 'sectionObjectifs'],
    ['l\'activité par région', 'Acteurs et volume (M FCFA)', 'sectionRegions'],
    ['les identificateurs', 'Top identificateurs - dossiers traités', 'sectionIdentificateurs'],
  ] as const) {
    const i = dash.indexOf(ancre);
    const bloc = i === -1 ? '' : dash.slice(i, i + 400);
    ok(i !== -1 && new RegExp(`<BlocSection etat=\\{${etat}\\}`).test(bloc),
       `${quoi} : le contenu n'est dessiné qu'après « tout lu »`);
  }

  // LES ALERTES passent par la règle, et le bandeau ne compte plus « tout ce
  // qui n'est pas info » — ce qui aurait compté les cartes « illisible ».
  ok(/const alertes = useMemo\(\(\) => alertesBO\(\{/.test(dash),
     'les alertes sont produites par la règle, plus par un `if (compteur > 0)` sur des listes vides');
  ok(/\{urgentes\(alertes\)\} urgentes/.test(dash),
     'et le bandeau « N urgentes » ne compte que ce qui a été lu');
}

console.log(echecs === 0
  ? '\n✅ Une panne se dit. Elle ne se dessine pas comme un calme.\n'
  : `\n❌ ${echecs} règle(s) violée(s).\n`);
process.exit(echecs === 0 ? 0 : 1);
