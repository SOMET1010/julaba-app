/**
 * « ÇA FAIT COMBIEN ? » N'EST PAS UN OUI — VOIX-08.
 * Lancer : npm run test:acquiescement
 *
 * LE DÉFAUT QU'ON FERME, ET IL VALIDAIT DES VENTES.
 *
 * Quand Tata demande « c'est bien ça ? », un OUI appelle `confirmAction` : la
 * vente part. `useVoiceCore.interpretYesNo` décidait de ce qui vaut OUI avec
 * sa propre liste, écrite en dur dans le hook — et cette liste acceptait
 * « ca » et « ça » ISOLÉS. Mesuré :
 *
 *     « ça fait combien ? » → OUI → vente validée
 *     « ça va »             → OUI
 *     « bon alors »         → OUI
 *
 * Elle pose une question, on encaisse. Le repli prévu (« Dis oui pour
 * valider, ou non pour annuler », deux fois, puis les boutons) est bien
 * conçu ; il ne se déclenchait jamais, parce que le doute était compté OUI.
 *
 * DEUX VÉRITÉS POUR LE MÊME ACTE. Le dépôt déclare déjà cette grammaire —
 * `INT_LIGNE_CONFIRMATION` / `INT_LIGNE_REFUS`, `critiqueArgent`, déclinables
 * par locale. C'est la liste NON déclarée qui tranchait : une langue pouvait
 * déclarer ses variantes sans que la confirmation vocale les lise jamais.
 *
 * ET ON N'A RIEN PERDU EN FERMANT. « ouais » vivait dans la liste en dur, pas
 * dans la liste déclarée : brancher l'une sur l'autre l'aurait fait
 * disparaître en silence. Il a été ajouté à la déclaration.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { acquiescement } from './grammaireAcquiescement.js';
import { MOTS_CONFIRME, MOTS_REFUS } from '../services/grammaireCorrection.js';

const ici = dirname(fileURLToPath(import.meta.url));

let failures = 0;
const ok = (c: boolean, label: string, detail = '') => {
  if (c) console.log('  ✅', label);
  else { console.log('  ❌', label, detail ? `\n     ${detail}` : ''); failures++; }
};

console.log('\n[1] LE DOUTE N\'EST JAMAIS UN OUI — c\'est la règle qui gouverne');
// Chacune de ces phrases validait une vente. Elles doivent rendre « pas clair »
// pour que le repli reprenne la main.
for (const phrase of ['ça fait combien', 'ça va', 'et ça', 'bon alors',
                      'attends', 'je réfléchis', 'hein', 'ça alors']) {
  ok(acquiescement(phrase) !== 'oui', `« ${phrase} » ne vaut pas OUI`,
     `obtenu : ${acquiescement(phrase)} — un oui ici fait partir la vente`);
}

console.log('\n[2] ce qui doit être compris l\'est');
for (const phrase of ['oui', 'ouais', "d'accord", 'ok', 'parfait', "c'est bon", "c'est ça", 'exact', 'voilà']) {
  ok(acquiescement(phrase) === 'oui', `« ${phrase} » → oui`, `obtenu : ${acquiescement(phrase)}`);
}

console.log('\n[3] le refus reste LARGE : le doute lui profite');
for (const phrase of ['non', 'pas ça', "c'est faux", 'pas bon', 'erreur']) {
  ok(acquiescement(phrase) === 'non', `« ${phrase} » → non`, `obtenu : ${acquiescement(phrase)}`);
}
console.log('\n[3bis] une NÉGATION EXPLICITE n\'est jamais un oui');
// TROUVÉ PAR CONTRE-ESSAI, PAS PAR LECTURE. La liste en dur de `useVoiceCore`
// portait un « pas » générique ; la liste déclarée ne connaissait que
// « pas ca » et « pas bon ». Brancher l'une sur l'autre l'a perdu, et
// « pas d'accord » s'est mis à valoir OUI — une négation qui valide la vente.
// La liste de remplacement était plus pauvre que celle qu'elle remplaçait, et
// rien ne le disait.
for (const phrase of ["pas d'accord", "c'est pas exact", "c'est pas bon", 'pas ça']) {
  ok(acquiescement(phrase) === 'non', `« ${phrase} » → non`,
     `obtenu : ${acquiescement(phrase)} — une négation comptée OUI valide la vente`);
}

console.log('\n[3ter] LE NON EST TESTÉ EN PREMIER, et ça se vérifie');
// Ces phrases portent un mot de CHAQUE liste. L'ordre décide, donc l'ordre
// doit être tenu : inverser les deux tests fait rougir ces trois-là.
for (const phrase of ['non pas ok', 'non, parfait', 'erreur oui']) {
  ok(acquiescement(phrase) === 'non',
     `« ${phrase} » (les deux listes matchent) part au REFUS`,
     `obtenu : ${acquiescement(phrase)} — un refus mal compris coûte une répétition, `
     + 'un oui mal compris coûte une vente');
}

console.log('\n[4] la répétition ne casse rien');
// Elle répète quand rien ne s'est passé. C'est le cercle vicieux décrit au
// terrain : répéter ne doit jamais aggraver.
for (const phrase of ['oui oui', 'oui oui oui', 'non non', 'oui, oui !']) {
  ok(acquiescement(phrase) !== null, `« ${phrase} » reste compris`,
     `obtenu : ${acquiescement(phrase)}`);
}

console.log('\n[5] rien à interpréter → rien d\'inventé');
for (const vide of ['', '   ', '\n']) ok(acquiescement(vide) === null, `« ${JSON.stringify(vide)} » → null`);

console.log('\n[6] UNE SEULE grammaire : le hook ne garde plus la sienne');
{
  const hook = readFileSync(join(ici, '..', 'hooks', 'useVoiceCore.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');
  ok(/import \{ acquiescement \}/.test(hook),
     '`useVoiceCore` importe la grammaire déclarée');
  ok(!/const (OUI|NON) = \[/.test(hook),
     'et n\'a plus de liste de mots en dur',
     'une seconde liste rouvre la divergence qu\'on vient de fermer');
  ok(!/" ca "|" ça "/.test(hook), 'plus aucun « ca » / « ça » isolé dans le hook');
}

console.log('\n[7] la grammaire déclarée ne contient pas de mot avaleur');
// `compilerMotif` pose des \b autour de chaque mot : un mot TRÈS courant
// compris dans une phrase plus longue vaut OUI. « bon » faisait ça.
for (const mot of MOTS_CONFIRME) {
  const seul = mot.split(' ').length === 1;
  ok(!seul || mot.length >= 4 || ['oui', 'ok'].includes(mot),
     `« ${mot} » n'est pas un mot avaleur`,
     'un mot court et courant, isolé, attrape des phrases entières');
}
ok(!MOTS_CONFIRME.includes('bon'), '« bon » isolé a été retiré',
   '« bon alors » valait OUI et validait la vente');
ok(MOTS_CONFIRME.includes('ouais'), '« ouais » a été conservé en le déclarant',
   'il vivait dans la liste en dur : le brancher l\'aurait perdu en silence');

console.log('\n[8] les deux intentions sont bien celles de l\'argent');
ok(MOTS_REFUS.length > 0 && MOTS_CONFIRME.length > 0, 'les deux listes sont peuplées');

console.log(failures === 0
  ? '\nUne question n\'est plus prise pour un oui ✅\n'
  : `\n${failures} échec(s).\n`);
process.exit(failures === 0 ? 0 : 1);
