/**
 * L'UNITÉ TRAVERSE TOUTE LA CHAÎNE — VOIX-07.
 * Lancer : npm run test:unite-traverse
 *
 * LE DÉFAUT QU'ON FERME, ET IL N'ÉTAIT PAS D'AFFICHAGE.
 *
 * Retour testeur du 23/09 : « 2 tas de piments » s'affichait « 2 piments ».
 * Décrit comme un défaut de libellé. En remontant la chaîne, c'était pire :
 * l'unité était bien entendue par `extraire` (`uniteParlee: 'tas'`), puis
 * jetée par `intentLocalCaisse` — l'action n'avait même pas de champ pour
 * elle. Ni la voix ni l'écran ne pouvaient donc la porter.
 *
 * Résultat mesuré : elle disait « 5 sacs de riz à 20 000 », Tata répondait
 * « Vente de 5 riz pour 20 000 francs, c'est bien ça ? » — puis attendait un
 * OUI. La CONFIRMATION portait sur une phrase amputée. Cinq sacs à 20 000 et
 * cinq unités de riz à 20 000 ne sont pas la même vente, et c'est elle qui
 * validait la seconde. Sur l'argent, la preuve doit TRAVERSER.
 *
 * ET DEUX RÈGLES D'ACCORD POUR UNE MÊME VENTE. Sans unité, la voix disait
 * « 2 piments » et l'écran « 2 piment » : la grammaire vivait dans
 * `dialoguesTata`, qui tire le catalogue i18n, donc hors de portée d'un
 * `ecouteCaisse` qui revendique de n'importer rien. Elle vit maintenant dans
 * `accordFrancais`, module pur, et les deux s'en servent.
 *
 * CE QUE CETTE GARDE TIENT : que l'unité ne soit plus jetée à aucun des trois
 * relais, et que les deux sorties ne redivergent pas.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { extraire } from '../voice-offline/extraction.js';
import { intentLocalCaisse } from '../voice-offline/localIntent.js';
import { libelleVenteComprise } from './ecouteCaisse.js';
import { plurielNom, plurielUnite } from './accordFrancais.js';

const ici = dirname(fileURLToPath(import.meta.url));

let failures = 0;
const ok = (c: boolean, label: string, detail = '') => {
  if (c) console.log('  ✅', label);
  else { console.log('  ❌', label, detail ? `\n     ${detail}` : ''); failures++; }
};

const CAS = [
  { dit: "j'ai vendu 2 tas de piments à 1000", unite: 'tas',   attendu: '2 tas de piment' },
  { dit: '5 sacs de riz à 20000',              unite: 'sacs',  attendu: '5 sacs de riz' },
  { dit: '3 kilos de tomate à 500',            unite: 'kilos', attendu: '3 kilos de tomate' },
  { dit: '1 sac de riz à 20000',               unite: 'sac',   attendu: '1 sac de riz' },
];

console.log('\n[1] l\'unité est entendue — c\'est le point de départ');
for (const c of CAS) {
  const e = extraire(c.dit) as Record<string, unknown>;
  ok(e.uniteParlee === c.unite, `« ${c.dit} » → uniteParlee = ${c.unite}`,
     `obtenu : ${JSON.stringify(e.uniteParlee)}`);
}

console.log('\n[2] elle survit à l\'action — le relais où elle mourait');
for (const c of CAS) {
  const a = intentLocalCaisse(c.dit)?.action as Record<string, unknown> | undefined;
  ok(a?.unite === c.unite, `« ${c.dit} » → action.unite = ${c.unite}`,
     `obtenu : ${JSON.stringify(a?.unite)} — sans ce champ, rien en aval ne peut la dire`);
}

console.log('\n[3] TATA LA REDIT — c\'est sur cette phrase qu\'elle confirme');
for (const c of CAS) {
  const r = intentLocalCaisse(c.dit)?.response ?? '';
  ok(r.includes(c.attendu), `Tata dit « ${c.attendu} »`, `réponse : « ${r} »`);
}

console.log('\n[4] l\'écran affiche LA MÊME chose');
for (const c of CAS) {
  const l = libelleVenteComprise(intentLocalCaisse(c.dit)?.action) ?? '';
  ok(l.includes(c.attendu), `l'écran affiche « ${c.attendu} »`, `libellé : « ${l} »`);
}

console.log('\n[5] on reprend SON mot, on ne le ré-accorde pas');
// `uniteParlee` arrive déjà accordée par sa bouche : « sac » ou « sacs »,
// « tas » invariable. Repluraliser rendrait « sacss », et surtout lui
// rendrait NOTRE mot à la place du sien.
{
  const a = intentLocalCaisse('5 sacs de riz à 20000')?.action as Record<string, unknown>;
  ok(a?.unite === 'sacs', 'le pluriel qu\'elle a dit est gardé tel quel');
  const b = intentLocalCaisse('1 sac de riz à 20000')?.action as Record<string, unknown>;
  ok(b?.unite === 'sac', 'et le singulier aussi');
  ok(!String(a?.unite).endsWith('ss'), 'aucune double pluralisation');
}

console.log('\n[6] sans unité, UNE SEULE règle d\'accord pour les deux sorties');
{
  const r = intentLocalCaisse("j'ai vendu 2 piments à 1000");
  const voix = r?.response ?? '';
  const ecran = libelleVenteComprise(r?.action) ?? '';
  ok(voix.includes('2 piments'), 'la voix accorde', `voix : « ${voix} »`);
  ok(ecran.includes('2 piments'), 'l\'écran accorde PAREIL', `écran : « ${ecran} »`);
}

console.log('\n[7] la règle d\'accord est dans un module PUR, et les deux y puisent');
// Tant qu'elle vivait dans `dialoguesTata` (qui importe le catalogue i18n),
// `ecouteCaisse` ne pouvait pas s'en servir sans cesser d'être pur.
{
  const accord = readFileSync(join(ici, 'accordFrancais.ts'), 'utf8');
  ok(!/^import /m.test(accord), '`accordFrancais` n\'importe rien',
     'c\'est ce qui permet à un module pur de s\'en servir');
  const ec = readFileSync(join(ici, 'ecouteCaisse.ts'), 'utf8');
  const imports = ec.match(/^import .*$/gm) ?? [];
  ok(imports.length === 1 && /accordFrancais/.test(imports[0]),
     '`ecouteCaisse` reste pur : son seul import est la grammaire',
     `imports : ${imports.join(' | ')}`);
  const dt = readFileSync(join(ici, 'dialoguesTata.ts'), 'utf8');
  ok(/from '\.\/accordFrancais'/.test(dt),
     '`dialoguesTata` puise à la même source',
     'deux copies de la règle finiraient par diverger — c\'est ce qu\'on vient de fermer');
  ok(!/function pluriel\(/.test(dt), 'et n\'en garde aucune copie locale');
}

console.log('\n[8] la grammaire est NOMMÉE française — aucune langue n\'en hérite');
// Règle du projet : aucune langue locale ne doit hériter automatiquement de
// la composition française. Le nom du fichier est ce qui le rappelle.
ok(plurielNom('banane plantain') === 'banane plantains',
   'plurielNom accorde le DERNIER mot', 'c\'est lui qui porte le nombre en français');
ok(plurielUnite('kg') === 'kg', 'les abréviations restent invariables (« 2 kg »)');
ok(plurielUnite('tas') === 'tas', '« tas » aussi');

console.log(failures === 0
  ? '\nL\'unité traverse : entendue, portée, dite, affichée ✅\n'
  : `\n${failures} échec(s).\n`);
process.exit(failures === 0 ? 0 : 1);
