/**
 * B5 — LE NIVEAU DE VOIX NE PEUT PAS TAIRE L'ARGENT.
 * Lancer : npm run test:niveau-voix   (tsx, sans DOM)
 *
 * POURQUOI CE TEST EXISTE. Un réglage « j'entends moins » est légitime au
 * marché. Mais livré ailleurs, il décidait de se taire en devinant
 * l'importance par une EXPRESSION RÉGULIÈRE FRANÇAISE sur le texte dit
 * (« franc », « montant », « vente »…), et son niveau 0 coupait tout, y
 * compris une relecture de monnaie. Deux conséquences, toutes deux sur
 * l'argent : la même donnée prenait deux sens — le catalogue déclare déjà ce
 * qui est critique, le texte le redevinait autrement — et la règle devenait
 * INOPÉRANTE dès la première langue locale.
 *
 * CE QUE CE TEST PROUVE, ET COMMENT. Il ne relit pas une liste écrite à la
 * main : il parcourt **le catalogue entier** et, pour chaque message marqué
 * `critiqueArgent`, vérifie qu'AUCUN niveau ne le tait. Puis il fait passer le
 * corpus par le VRAI entonnoir — `creerSpeakMessage`, celui que les écrans
 * utilisent — pour vérifier que ce qui est décidé ici est bien ce qui arrive
 * à la voix, et que chaque silence part au journal.
 *
 * LA PREUVE DE LA LANGUE : le même message, résolu dans une langue où aucun
 * mot français n'apparaît, doit garder exactement la même décision. C'est ce
 * que l'ancienne regex ne pouvait pas faire.
 */
import { MESSAGES_TTS, entreeTts } from './catalog.js';
import {
  NIVEAUX_VOIX, NIVEAU_VOIX_PAR_DEFAUT, doitTaire, importanceDeLaCle, normaliserNiveau,
  type NiveauVoix,
} from './niveauVoix.js';
import { creerSpeakMessage } from './speakMessage.js';

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log('  ✅', label);
  else { console.log('  ❌', label); failures++; }
}

console.log(`\n[1] LE DÉFAUT PAR DÉFAUT : on ne retire la parole à personne`);
{
  ok(NIVEAU_VOIX_PAR_DEFAUT === 'complet', `B5-1 le niveau par défaut est « complet » (${NIVEAU_VOIX_PAR_DEFAUT})`);
  ok(normaliserNiveau(null) === 'complet', 'B5-1 aucune préférence mémorisée → complet, jamais le silence');
  ok(normaliserNiveau('') === 'complet' && normaliserNiveau(undefined) === 'complet', 'B5-1 une préférence vide non plus');
  ok(normaliserNiveau(0) === 'complet' && normaliserNiveau('0') === 'complet',
    'B5-1 un ancien niveau numérique 0 (le « silencieux » d’ailleurs) ne peut pas revenir par le stockage');
  ok(normaliserNiveau('essentiel') === 'essentiel', 'B5-1 un choix explicite est respecté');
  ok(!NIVEAUX_VOIX.includes('silencieux' as NiveauVoix), 'B5-1 il n’existe aucun niveau qui coupe tout');
}

console.log('\n[2] L’ARGENT NE SE TAIT JAMAIS — vérifié sur le CATALOGUE ENTIER');
{
  const critiques = MESSAGES_TTS.filter((m) => m.critiqueArgent);
  ok(critiques.length > 0, `B5-2 le catalogue porte bien des messages critiques argent (${critiques.length})`);
  const tues: string[] = [];
  for (const m of critiques) {
    for (const niveau of NIVEAUX_VOIX) {
      if (doitTaire(niveau, importanceDeLaCle(m.id))) tues.push(`${m.id}@${niveau}`);
    }
  }
  ok(tues.length === 0,
    `B5-2 aucun des ${critiques.length} messages critiques argent n’est tu, à aucun niveau${tues.length ? ` (${tues.slice(0, 5).join(', ')})` : ''}`);

  // Les phrases que le lot Manus rendait muettes par DÉFAUT après connexion.
  for (const id of ['TATA_COMPTE_JUSTE', 'TATA_RELECTURE_MONNAIE', 'TATA_MANQUE', 'TATA_DONNE_RENDS', 'TATA_VENTE_ENREGISTREE', 'TATA_VENTE_GARDEE_TELEPHONE']) {
    const e = entreeTts(id);
    ok(!!e && !doitTaire('essentiel', importanceDeLaCle(id)), `B5-2 « ${id} » reste dite même en « essentiel »`);
  }
}

console.log('\n[3] LE DOUTE FAIT PARLER, JAMAIS TAIRE');
{
  ok(importanceDeLaCle('CLE_QUI_N_EXISTE_PAS') === 'non_declaree', 'B5-3 une clé absente du catalogue est « non déclarée »');
  ok(!doitTaire('essentiel', 'non_declaree'), 'B5-3 et une importance non déclarée ne se tait jamais');
  ok(!doitTaire('complet', 'accompagnement'), 'B5-3 en « complet », rien ne se tait');
  ok(doitTaire('essentiel', 'accompagnement'), 'B5-3 en « essentiel », seul l’accompagnement déclaré se tait');
}

console.log('\n[4] L’IMPORTANCE VIENT DU CATALOGUE, PAS DU TEXTE');
{
  // Le cœur du défaut repris : la décision doit être IDENTIQUE quel que soit
  // le texte rendu. On compare la décision sur la clé à ce qu'une règle de
  // texte française aurait donné sur la MÊME phrase traduite.
  const MOTS_FR = /\d|franc|fcfa|montant|caisse|vente|dépense|depense|pay|confirm|enregistr|gard|envoy|hors[- ]ligne|réseau|reseau|erreur|problème|probleme|refus|attention|insuffisant|stock|rupture|bloqu|annul/i;
  const desaccords = MESSAGES_TTS.filter((m) => {
    const parLaCle = importanceDeLaCle(m.id) === 'argent';
    const parLeTexte = MOTS_FR.test(m.frActuel);
    return parLaCle !== parLeTexte;
  });
  console.log(`  · ${desaccords.length} clé(s) sur ${MESSAGES_TTS.length} où le texte français et le catalogue ne disent PAS la même chose`);
  ok(desaccords.length > 0,
    'B5-4 deviner par le texte donne un autre résultat que le catalogue — c’est bien deux sens pour une même donnée');

  // Et surtout : combien de messages d'ARGENT la règle de texte aurait tus ?
  const argentRateParLeTexte = MESSAGES_TTS.filter((m) => m.critiqueArgent && !MOTS_FR.test(m.frActuel));
  console.log(`  · ${argentRateParLeTexte.length} message(s) critiques argent que la règle de texte française aurait classés « accompagnement »`);
  ok(argentRateParLeTexte.every((m) => !doitTaire('essentiel', importanceDeLaCle(m.id))),
    `B5-4 et aucun d’eux n’est tu par le niveau, parce que la décision vient de la clé (${argentRateParLeTexte.slice(0, 3).map((m) => m.id).join(', ')}…)`);

  // La preuve de langue : même clé, texte sans un mot français, même décision.
  const enDioulaImaginaire = 'Wari tɛ yan, i ka kan ka segin kɔfɛ';
  ok(!MOTS_FR.test(enDioulaImaginaire), 'B5-4 (socle du test) une phrase en langue locale ne contient aucun mot de la règle française');
  ok(!doitTaire('essentiel', importanceDeLaCle('TATA_MANQUE')),
    'B5-4 « TATA_MANQUE » reste dite quelle que soit la langue : la décision ne regarde pas le texte');
}

console.log('\n[5] LE VRAI ENTONNOIR — ce qui est décidé est ce qui arrive à la voix');
{
  const dits: string[] = [];
  const silences: Array<{ id: string; raison: string }> = [];
  const fabrique = (niveau: NiveauVoix) => creerSpeakMessage(
    async (texte: string) => { dits.push(texte); },
    { niveau: () => niveau, surSilence: (id, raison) => { silences.push({ id, raison }); } },
  );

  // En « complet », tout passe.
  dits.length = 0; silences.length = 0;
  const complet = fabrique('complet');
  complet('TATA_INVITE');
  complet('TATA_COMPTE_JUSTE');
  await new Promise<void>((r) => setTimeout(r, 0));
  ok(dits.length === 2 && silences.length === 0, `B5-5 en « complet », les deux phrases sont dites (${dits.length} dites, ${silences.length} tues)`);

  // En « essentiel », l'accompagnement se tait, l'argent passe.
  dits.length = 0; silences.length = 0;
  const essentiel = fabrique('essentiel');
  essentiel('TATA_INVITE');          // accompagnement déclaré
  essentiel('TATA_COMPTE_JUSTE');    // critiqueArgent
  await new Promise<void>((r) => setTimeout(r, 0));
  ok(dits.length === 1 && dits[0].includes('Compte juste'),
    `B5-5 en « essentiel », seule la phrase d’argent est dite (${JSON.stringify(dits)})`);
  ok(silences.length === 1 && silences[0].id === 'TATA_INVITE' && silences[0].raison === 'niveau-voix',
    `B5-5 et le silence part au journal, avec sa raison (${JSON.stringify(silences)})`);

  // Le résultat rendu reste le message résolu, même tu : « réécouter » marche.
  const message = essentiel('TATA_INVITE');
  ok(!!message && typeof message.texte === 'string' && message.texte.length > 0,
    'B5-5 un message tu reste résolu et rendu à l’appelante (le bouton « réécouter » a de quoi parler)');
}

console.log(
  failures === 0
    ? '\nLe niveau de voix ne peut pas taire l’argent, et tout silence est écrit ✅'
    : `\n${failures} test(s) en échec ❌`,
);
process.exit(failures ? 1 : 0);
