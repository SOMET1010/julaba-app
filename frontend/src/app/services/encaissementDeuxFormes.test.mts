/**
 * L'ENCAISSEMENT NE DIT PAS CE QU'IL AFFICHE — ARG-17.
 * Lancer : npm run test:encaissement-deux-formes
 *
 * LE DÉFAUT QU'ON FERME, et il est au cœur de l'argent.
 *
 * `EffetEncaissement` ne portait qu'un champ `texte`, et `POSCaisse` s'en
 * servait pour LES DEUX sorties :
 *
 *     POSCaisse:527   setRelectureAffichee(effet.texte)   ← l'œil
 *     POSCaisse:571   speak(effet.texte)                  ← l'oreille
 *
 * Une seule chaîne pour deux organes. Or la forme écran porte une espace fine
 * insécable (U+202F) — c'est elle qui rend « 2 000 » lisible. Mesuré de bout
 * en bout : aucun étage en aval ne la retire. `AppContext.speak` ne fait qu'un
 * `replace(/[<>]/g, '')`, puis `audioManager.speak` choisit un canal sans
 * toucher aux nombres. La synthèse recevait donc un nombre coupé et l'épelait :
 * « 2 zéro zéro zéro » — au moment précis où la marchande doit entendre
 * COMBIEN ON LUI DOIT. Pour quelqu'un qui ne lit pas, la voix EST le montant.
 *
 * Le dépôt portait déjà la réponse : `tParle()`, documenté comme « la chaîne
 * qui part au moteur de synthèse », et le patron `PhraseDeuxFormes` déjà
 * employé par `dialoguesTata` et `relectureSpontanee`. La machine ne s'en
 * servait pas.
 *
 * SIGNALÉ PAR UN AUDIT EXTERNE (JUL-ARCH-03), vérifié ici par la mesure.
 *
 * L'AJOUT EST PUREMENT ADDITIF : `texte` ne bouge pas, et l'empreinte d'argent
 * (gate 8) ne hache que `effet.texte` — elle reste identique, ce qui prouve
 * qu'aucune décision financière n'a changé, seulement ce qu'on entend.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ETAT_INITIAL, reduire, type EtatFinancier } from './machineEncaissement.js';

const ici = dirname(fileURLToPath(import.meta.url));

let failures = 0;
const ok = (c: boolean, label: string, detail = '') => {
  if (c) console.log('  ✅', label);
  else { console.log('  ❌', label, detail ? `\n     ${detail}` : ''); failures++; }
};

const fin = (o: Partial<EtatFinancier>): EtatFinancier => ({
  total: 0, recu: 0, monnaie: 0, suffisant: false, panierVide: false,
  empreinte: { total: o.total ?? 0, recu: o.recu ?? 0, lignes: 1 },
  ...o,
} as EtatFinancier);

/** Ce qui coupe un nombre en deux et le fait épeler. */
const COUPE = /[  ]/;

console.log('\n[1] TOUT effet qui parle porte DEUX formes');
const CAS = [
  ['combien_doit', fin({ total: 2000 })],
  ['encaisser', fin({ total: 2000 })],
  ['etat_financier_change', fin({ total: 2000 })],
  ['annuler_validation', fin({ total: 2000 })],
] as const;
for (const [ev, f] of CAS) {
  const e = reduire(ETAT_INITIAL, ev as never, f).effet as Record<string, unknown>;
  if (e.type === 'rien') { console.log(`  ·  ${ev} → rien à dire`); continue; }
  ok(typeof e.texte === 'string' && typeof e.texteParle === 'string',
     `${ev} : l'effet porte texte ET texteParle`,
     `champs : ${Object.keys(e).join(', ')}`);
}

console.log('\n[2] la forme PARLÉE ne contient aucun nombre coupé');
// C'est l'assertion qui compte : sans elle, tout le reste est décoratif.
for (const [ev, f] of CAS) {
  const e = reduire(ETAT_INITIAL, ev as never, f).effet as Record<string, string>;
  if (e.type === 'rien') continue;
  ok(!COUPE.test(e.texteParle), `${ev} : aucune espace insécable à l'oreille`,
     `parlé : « ${e.texteParle} » — la synthèse épellerait « 2 zéro zéro zéro »`);
}

console.log('\n[3] la forme ÉCRAN reste lisible — on n\'a pas sacrifié l\'œil');
{
  const e = reduire(ETAT_INITIAL, 'combien_doit' as never, fin({ total: 2000 })).effet as Record<string, string>;
  ok(/2\s?000/.test(e.texte), 'l\'écran montre bien « 2 000 »', `écran : « ${e.texte} »`);
  ok(/deux mille/.test(e.texteParle), 'et l\'oreille entend « deux mille »', `parlé : « ${e.texteParle} »`);
  ok(e.texte !== e.texteParle, 'les deux formes SONT différentes',
     'identiques, c\'est que la forme parlée n\'est pas produite');
}

console.log('\n[4] LA PHRASE COMPOSÉE — le cas le plus fragile');
// « Le compte a changé » enchâsse la relecture. Composer une fois puis
// réutiliser la chaîne pour les deux rendrait le montant épelable à
// l'endroit même où le compte vient de bouger.
{
  const avant = { phase: 'attente_confirmation', empreinte: { total: 1, recu: 1, lignes: 1 } };
  const f = fin({ total: 3000, recu: 5000, monnaie: 2000, suffisant: true });
  const e = reduire(avant as never, 'oui_valide' as never, f).effet as Record<string, string>;
  ok(e.type === 'dire', 'un compte changé ne paie pas : il redit');
  ok(!COUPE.test(e.texteParle), 'la phrase composée reste dicible',
     `parlé : « ${e.texteParle} »`);
  ok(/trois mille/.test(e.texteParle) && /cinq mille/.test(e.texteParle) && /deux mille/.test(e.texteParle),
     'les TROIS nombres sont dits en mots',
     `parlé : « ${e.texteParle} » — un seul en chiffres suffit à tromper l'oreille`);
}

console.log('\n[5] l\'écran envoie bien la forme PARLÉE à la voix');
{
  const pos = readFileSync(join(ici, '..', 'components', 'marchand', 'POSCaisse.tsx'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');
  ok(/speak\(effet\.texteParle\)/.test(pos), '`speak` reçoit `texteParle`');
  ok(!/speak\(effet\.texte\)/.test(pos), 'et plus jamais `texte`',
     'c\'est la ligne exacte qui faisait épeler les montants');
  ok(/setRelectureAffichee\(effet\.texte\)/.test(pos),
     'tandis que l\'écran garde `texte`',
     'l\'œil a besoin de l\'espace fine que l\'oreille ne supporte pas');
}

console.log('\n[6] la machine n\'envoie plus de `t()` nu dans un effet');
{
  const mach = readFileSync(join(ici, 'machineEncaissement.ts'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');
  ok(!/type: 'dire', texte: t\(/.test(mach) && !/type: 'dire', texte: phrase/.test(mach),
     'aucun effet `dire` construit avec une seule forme');
  ok(/tParle/.test(mach), 'la machine connaît `tParle`',
     'sans lui, la forme parlée ne peut pas être produite');
}

console.log(failures === 0
  ? '\nL\'œil lit « 3 000 », l\'oreille entend « trois mille » ✅\n'
  : `\n${failures} échec(s).\n`);
process.exit(failures === 0 ? 0 : 1);
