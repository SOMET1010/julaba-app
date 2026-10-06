/**
 * LE BACK-OFFICE NE TRANSFORME PLUS UNE ERREUR EN ZÉRO — BO-01.
 *
 * Les quatre exigences de Patrick, dans l'ordre où il les a écrites :
 *   1. vraie valeur 0 → 0 affiché ;
 *   2. erreur réseau → PAS 0 ;
 *   3. deux sources, une échoue → l'autre reste valide ;
 *   4. nouvelle tentative → l'état peut redevenir valide.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  enAttente, indisponible, lue, raisonDe, kpiDepuis, kpiParmi, kpisTableauDeBord,
  motDuKpi, nombreDuKpi, explicationDuKpi, sousTitreZones,
  MOT_CHARGEMENT, MOT_INDISPONIBLE,
  type LecturesTableauDeBord,
} from './etatLectureBO.js';

const ici = dirname(fileURLToPath(import.meta.url));
let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};
const source = (...p: string[]) => {
  const brut = readFileSync(resolve(ici, '..', ...p), 'utf-8');
  return brut.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');
};

/** Tout lu, tout vide — le point de départ neutre des scénarios. */
const TOUT_LU: LecturesTableauDeBord = {
  stats: lue(null),
  acteurs: lue({ liste: [], total: 0 }),
  dossiers: lue([]),
  zones: lue([]),
  transactions: lue({ liste: [], total: 0 }),
};

console.log('\nLe back-office dit ce qu\'il sait, et dit ce qu\'il ne sait pas\n');

console.log('[1] UNE VRAIE VALEUR ZÉRO S\'AFFICHE — c\'est une réponse');
{
  const k = kpisTableauDeBord(TOUT_LU);
  const tous = Object.entries(k);
  const pasNombre = tous.filter(([, v]) => v.type !== 'nombre').map(([n]) => n);
  ok(pasNombre.length === 0,
     `les huit compteurs rendent un NOMBRE quand tout a été lu${pasNombre.length ? ' — sauf : ' + pasNombre.join(', ') : ''}`);
  const pasZero = tous.filter(([, v]) => !(v.type === 'nombre' && v.valeur === 0)).map(([n]) => n);
  ok(pasZero.length === 0, 'et ce nombre vaut bien ZÉRO — on ne masque pas un vrai vide');
  ok(motDuKpi(k.totalActeurs) === null, 'aucun mot ne remplace un zéro lu : la tuile montre le chiffre');
  ok(nombreDuKpi(k.totalActeurs) === 0, 'le compteur animé reçoit 0, pas `undefined`');
  ok(explicationDuKpi(k.totalActeurs) === undefined, 'et rien à expliquer : le chiffre est le chiffre');
}
{
  // Le cas qui rend le précédent non trivial : un vrai zéro VENU DU SERVEUR.
  const k = kpisTableauDeBord({ ...TOUT_LU, stats: lue({ total_acteurs: 0, utilisateurs_actifs: 0, montant_total: 0 }) });
  ok(k.totalActeurs.type === 'nombre' && k.totalActeurs.valeur === 0,
     'un `total_acteurs: 0` renvoyé par le serveur s\'affiche 0 — et non « indisponible »');
  ok(k.volumeTotal.type === 'nombre' && k.volumeTotal.valeur === 0,
     'un volume de 0 F aussi : une institution qui n\'a encore rien encaissé a le droit de le voir');
}

console.log('\n[2] UNE ERREUR RÉSEAU NE DEVIENT JAMAIS ZÉRO');
{
  const panne = new Error('Failed to fetch');
  const k = kpisTableauDeBord({
    stats: indisponible(panne),
    acteurs: indisponible(panne),
    dossiers: indisponible(panne),
    zones: indisponible(panne),
    transactions: indisponible(panne),
  });
  const zeros = Object.entries(k).filter(([, v]) => v.type === 'nombre').map(([n]) => n);
  ok(zeros.length === 0,
     `AUCUN compteur ne rend un nombre quand tout a échoué${zeros.length ? ' — fautif(s) : ' + zeros.join(', ') : ''}`);
  const tous = Object.values(k);
  ok(tous.every(v => v.type === 'indisponible'), 'les huit disent « indisponible »');
  ok(tous.every(v => v.type === 'indisponible' && v.raison === 'Failed to fetch'),
     'et chacun garde la RAISON — « indisponible » sans raison est un autre silence');
  ok(motDuKpi(k.totalActeurs) === MOT_INDISPONIBLE, `la tuile affiche « ${MOT_INDISPONIBLE} »`);
  ok(nombreDuKpi(k.totalActeurs) === undefined, 'et le compteur animé ne reçoit AUCUN nombre');
  ok((explicationDuKpi(k.totalActeurs) ?? '').includes('Failed to fetch'),
     'la raison est offerte à l\'agent, qui doit décider quoi faire');
  ok((explicationDuKpi(k.totalActeurs) ?? '').includes("Ce n'est pas un zéro"),
     'et l\'explication dit en toutes lettres que ce n\'est pas un zéro');
}
{
  // L'ATTENTE N'EST PAS UN ÉCHEC, et ce n'est pas un zéro non plus.
  const k = kpisTableauDeBord({
    stats: enAttente(), acteurs: enAttente(), dossiers: enAttente(),
    zones: enAttente(), transactions: enAttente(),
  });
  ok(Object.values(k).every(v => v.type === 'chargement'), 'rien demandé encore : les huit disent « chargement »');
  ok(motDuKpi(k.zonesActives) === MOT_CHARGEMENT, `et la tuile affiche « ${MOT_CHARGEMENT} »`);
  ok(Object.values(k).every(v => v.type !== 'nombre'), 'aucun nombre pendant l\'attente — surtout pas un zéro qui clignote');
}
{
  // Une donnée abîmée ne fabrique pas un zéro non plus.
  ok(kpiDepuis(lue([1, 2]), () => NaN).type === 'indisponible',
     'une mesure qui ne rend pas un nombre fini → « indisponible », jamais 0');
}

console.log('\n[3] DEUX SOURCES, UNE ÉCHOUE — L\'AUTRE RESTE VALIDE');
{
  // LE DÉFAUT D'ORIGINE : `BackOfficeContext` n'avait QU'UN champ `error`.
  // Une panne sur les zones effaçait l'erreur des acteurs, et on ne pouvait
  // même pas dire à l'agent CE QUI manquait.
  const k = kpisTableauDeBord({
    ...TOUT_LU,
    acteurs: lue({ liste: [{ statut: 'actif' }, { statut: 'suspendu' }, { statut: 'actif' }], total: 3 }),
    zones: indisponible('Zones injoignables'),
  });
  ok(k.totalActeurs.type === 'nombre' && k.totalActeurs.valeur === 3,
     'les acteurs ont été lus : 3, malgré la panne des zones');
  ok(k.actifs.type === 'nombre' && k.actifs.valeur === 2, 'et les actifs aussi : 2');
  ok(k.suspendus.type === 'nombre' && k.suspendus.valeur === 1, 'et les suspendus : 1');
  ok(k.zonesActives.type === 'indisponible' && k.zonesActives.raison === 'Zones injoignables',
     'SEULES les zones sont indisponibles, et elles disent pourquoi');
  ok(sousTitreZones(k.zonesTotal) === 'nombre de zones inconnu',
     'le « sur N zones » n\'invente pas de dénominateur — un « sur 0 zones » serait faux');
}
{
  // Et dans l'autre sens : la panne change de source, le reste ne bouge pas.
  const k = kpisTableauDeBord({
    ...TOUT_LU,
    acteurs: indisponible('Acteurs injoignables'),
    zones: lue([{ actif: true }, { actif: false }, { actif: true }]),
  });
  ok(k.zonesActives.type === 'nombre' && k.zonesActives.valeur === 2, 'les zones sont lues : 2 actives sur 3');
  ok(sousTitreZones(k.zonesTotal) === 'sur 3 zones', 'et le dénominateur est le vrai');
  ok(k.totalActeurs.type === 'indisponible', 'seuls les acteurs manquent');
  ok(k.suspendus.type === 'indisponible' && k.suspendus.raison === 'Acteurs injoignables',
     'et les compteurs qui en dépendent le disent, avec LEUR raison');
  ok(k.enAttente.type === 'nombre', 'les dossiers, eux, n\'ont rien à voir avec les acteurs : ils restent valides');
}
{
  // LA PRÉFÉRENCE ET LE SECOURS. Le tableau de bord préférait déjà les
  // statistiques du serveur au comptage local — sans savoir dire le cas où
  // AUCUNE des deux n'a répondu. Il affichait alors 0.
  const secoursSeul = kpisTableauDeBord({
    ...TOUT_LU,
    stats: indisponible('Stats KO'),
    acteurs: lue({ liste: [{ statut: 'actif' }], total: 42 }),
  });
  ok(secoursSeul.totalActeurs.type === 'nombre' && secoursSeul.totalActeurs.valeur === 42,
     'stats en panne mais acteurs lus → on compte sur les acteurs (comportement d\'origine)');

  const aucuneDesDeux = kpisTableauDeBord({
    ...TOUT_LU, stats: indisponible('Stats KO'), acteurs: indisponible('Acteurs KO'),
  });
  ok(aucuneDesDeux.totalActeurs.type === 'indisponible',
     'les DEUX en panne → « indisponible ». C\'est exactement le cas qui affichait 0');

  const uneAttendEncore = kpisTableauDeBord({
    ...TOUT_LU, stats: indisponible('Stats KO'), acteurs: enAttente(),
  });
  ok(uneAttendEncore.totalActeurs.type === 'chargement',
     'une source échouée, l\'autre en route → on attend : elle peut encore arriver');

  const statsSansLeChamp = kpisTableauDeBord({
    ...TOUT_LU, stats: lue({ montant_total: 900 }), acteurs: lue({ liste: [], total: 7 }),
  });
  ok(statsSansLeChamp.totalActeurs.type === 'nombre' && statsSansLeChamp.totalActeurs.valeur === 7,
     'des stats lues SANS `total_acteurs` ne comptent pas les acteurs — on passe au secours');
  ok(statsSansLeChamp.volumeTotal.type === 'nombre' && statsSansLeChamp.volumeTotal.valeur === 900,
     'et le champ qui EST là sert normalement');
}

console.log('\n[4] UNE NOUVELLE TENTATIVE PEUT REDEVENIR VALIDE');
{
  // L'état n'est pas un cul-de-sac : une panne n'est pas définitive.
  let etat = enAttente<{ liste: []; total: number }>();
  ok(kpiDepuis(etat, v => v.total).type === 'chargement', 'au départ : chargement');

  etat = indisponible('Failed to fetch');
  ok(kpiDepuis(etat, v => v.total).type === 'indisponible', 'la lecture échoue : indisponible');

  etat = enAttente();
  ok(kpiDepuis(etat, v => v.total).type === 'chargement',
     'on réessaie : chargement — et surtout PAS un zéro pendant la nouvelle tentative');

  etat = lue({ liste: [], total: 12 });
  const revenu = kpiDepuis(etat, v => v.total);
  ok(revenu.type === 'nombre' && revenu.valeur === 12, 'la tentative réussit : le chiffre revient');

  etat = lue({ liste: [], total: 0 });
  const zero = kpiDepuis(etat, v => v.total);
  ok(zero.type === 'nombre' && zero.valeur === 0,
     'et une lecture qui rend zéro reste un zéro affiché — l\'aller-retour n\'a rien contaminé');
}
{
  ok(raisonDe(new Error('boum')) === 'boum', 'une Error donne son message');
  ok(raisonDe('texte brut') === 'texte brut', 'une chaîne aussi');
  ok(raisonDe(null).length > 0 && raisonDe(undefined).length > 0 && raisonDe({}).length > 0,
     'et ce qui n\'a pas de message reçoit quand même une raison — jamais une chaîne vide');
}

console.log('\n[5] LE CONTEXTE ET L\'ÉCRAN PASSENT PAR LÀ');
{
  const ctx = source('contexts', 'BackOfficeContext.tsx');
  const dash = source('components', 'backoffice', 'BODashboard.tsx');

  ok(/etatLectureBO/.test(ctx), 'BackOfficeContext importe l\'état de lecture');
  ok(/lectures/.test(ctx), 'et l\'expose aux écrans');
  // LES CINQ SOURCES DE CE LOT, ET ELLES SEULES. Le contexte en sert d'autres
  // (missions, audit, utilisateurs BO, institutions, signalements) qui
  // alimentent les 36 écrans hors périmètre : leurs `catch` avalent encore, et
  // c'est nommé au backlog (BO-02). Documenter une dette ne la ferme pas ; on
  // vérifie donc ce qui EST fermé, sans faire croire au reste.
  for (const [nom, fn] of [
    ['stats', 'refreshStats'], ['acteurs', 'refreshActeurs'],
    ['dossiers', 'refreshDossiers'], ['zones', 'refreshZones'],
    ['transactions', 'refreshTransactions'],
  ] as const) {
    const bloc = ctx.match(new RegExp(`const ${fn} = useCallback\\(async[\\s\\S]*?\\n  \\}, \\[`));
    ok(!!bloc && /setLecture[A-Za-z]+\(indisponible\(/.test(bloc[0]),
       `${nom} : l'échec devient « indisponible », il n'est plus avalé`);
    ok(!!bloc && /setLecture[A-Za-z]+\(lue\(/.test(bloc[0]),
       `${nom} : le succès devient « lue » — la valeur, zéro compris`);
    ok(!!bloc && /setLecture[A-Za-z]+\(enAttente\(\)\)/.test(bloc[0]),
       `${nom} : une nouvelle tentative repart de « attente », pas de l'ancien chiffre`);
  }
  ok(/const \[lectureZones/.test(ctx) && /const \[lectureActeurs/.test(ctx),
     'chaque source a SON état — une panne zones n\'efface plus l\'erreur acteurs');

  ok(/kpisTableauDeBord/.test(dash), 'le tableau de bord calcule ses sept compteurs par la règle');
  // ATTENTION : `source()` retire les commentaires — chercher ce commentaire-là
  // dedans ne peut JAMAIS échouer. Cette assertion passait au vert sur le code
  // fautif. On relit donc le fichier BRUT.
  const dashBrut = readFileSync(resolve(ici, '..', 'components', 'backoffice', 'BODashboard.tsx'), 'utf-8');
  ok(!/KPIs - 100 % données réelles/.test(dashBrut),
     'le commentaire « 100 % données réelles » ne coiffe plus des compteurs qui pouvaient valoir un faux zéro');
  // CE QUI COMPTE VRAIMENT : que les SEPT TUILES ne lisent plus les listes qui
  // se replient sur `[]`. Ces listes existent encore dans le fichier — les
  // alertes, les graphiques et les barres de progression les consomment, et ces
  // parties-là ne sont PAS dans ce lot (BO-03 au backlog). Exiger leur
  // disparition ferait échouer un test pour une dette qu'on n'a pas prise ;
  // exiger seulement l'import ne prouverait rien. On lit donc le bloc des
  // tuiles, et lui seul.
  const grille = dash.match(/<KPIGrid>[\s\S]*?<\/KPIGrid>/);
  ok(!!grille, 'la grille des sept compteurs est bien là');
  if (grille) {
    const g = grille[0];
    const tuiles = (g.match(/<UniversalKPI/g) || []).length;
    ok(tuiles === 7, `les sept tuiles sont servies par la règle (${tuiles} trouvée(s))`);
    ok((g.match(/kpiTuile\(kpis\./g) || []).length === 7,
       'chacune passe par `kpiTuile` — aucune ne calcule son chiffre elle-même');
    // ON NE LIT QUE LE CODE, PAS LES LIBELLÉS. Une première version de ce test
    // échouait sur `label="Acteurs actifs"` : le mot « actifs » du texte affiché
    // déclenchait la règle. Un test qui échoue sur un libellé français ne dit
    // rien du code. On retire donc les chaînes littérales avant de chercher.
    const codeSeul = g.replace(/"[^"]*"/g, '""').replace(/'[^']*'/g, "''");
    // `kpis.totalActeurs` est le bon chemin ; c'est `totalActeurs` TOUT SEUL —
    // la variable locale calculée sur des listes repliées — qui est interdit.
    const fabrique = /(?<!kpis\.)\b(totalActeurs|actifs|suspendus|volumeTotal|enAttente)\b|acteurs\.filter|acteurs\.length|dossiers\.filter|zones\.filter|zones\.length|transactions\.reduce/.exec(codeSeul);
    ok(!fabrique,
       `aucune tuile ne lit plus une liste qui vaut [] quand la lecture échoue${fabrique ? ' — reste : ' + fabrique[0] : ''}`);
    ok(!/animatedTarget=\{[^}]*\}/.test(g),
       'et aucune ne passe un `animatedTarget` calculé à la main — il vient de `kpiTuile`, à `undefined` hors du cas « nombre »');
  }
}

console.log(echecs === 0
  ? '\n✅ Une lecture ratée ne devient plus un chiffre affirmé.\n'
  : `\n❌ ${echecs} règle(s) violée(s).\n`);
process.exit(echecs === 0 ? 0 : 1);
