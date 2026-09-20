/**
 * VALIDATEUR DE SOURCE — gate 7 du lot i18n, et la couverture de l'inventaire.
 * Lancer : npm run test:i18n-source   (tsx, sans DOM)
 *
 *  7. Aucune phrase vocale EN DUR dans les fichiers du périmètre migré : tout
 *     appel qui fait parler (`speak`, `dire`, `direEtRetenir`, `deps.speak`…)
 *     y reçoit une clé résolue, une phrase construite par un module pur, ou un
 *     relais — jamais un littéral ni un gabarit `${…}`. Même lecture du source
 *     que l'inventaire (scripts/lib/inventaireVoix.mjs, AST TypeScript).
 *  +  Inventaire à jour : le nombre de sites d'appel et de phrases distinctes
 *     écrits dans docs/langues/INVENTAIRE-VOIX.md sont ceux du source
 *     d'aujourd'hui. Sinon : `npm run i18n:inventaire`.
 *  +  Couverture (règle de Patrick) : chaque phrase encore en dur à un site
 *     d'appel, où que ce soit dans l'application, est au catalogue (statut
 *     `a_migrer`) — une chaîne dite et absente du catalogue est un défaut du
 *     lot. La liste des phrases non migrées est le « reste » du rapport.
 *  +  Périmètre d'argent, au niveau du source : la machine n'a toujours qu'UN
 *     `type: 'encaisser'`, gardé par les mêmes conditions ; la grammaire teste
 *     toujours l'annulation AVANT la validation, et la validation sur la
 *     phrase ENTIÈRE.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
// @ts-expect-error — module ESM JavaScript partagé avec scripts/i18n-inventaire.mjs (pas de déclaration de types).
import { scannerTout, normaliserPhrase } from '../../../../../scripts/lib/inventaireVoix.mjs';
import { MESSAGES_TTS, entreeTts } from '../catalog.js';
import { manifest } from '../registry.js';
import { LOCALE_REFERENCE } from '../types.js';

const ICI = dirname(fileURLToPath(import.meta.url));
const SRC = join(ICI, '..', '..', '..');
const RACINE = join(SRC, '..', '..', '..');

let echecs = 0;
const ok = (cond: boolean, quoi: string) => { if (cond) console.log('  ✓', quoi); else { console.log('  ✗', quoi); echecs++; } };

interface Gabarit { kind: string; texte: string; variables: string[] }
interface Appel { fichier: string; ligne: number; fonction: string; gabarits: Gabarit[] }

/** Le périmètre MIGRÉ : plus aucune phrase en dur n'y est tolérée à un site d'appel. */
const PERIMETRE_MIGRE = [
  'services/machineEncaissement.ts',
  'services/relectureSpontanee.ts',
  'services/dialoguesTata.ts',
  'services/vendreVocalUnifie.ts',
  'services/intentionsCaisse.ts',
  'services/ruptureStock.ts',
  'voice-offline/localIntent.ts',
  'voice-offline/grammaireEncaissement.ts',
  'utils/fcfa.ts',
  'components/marchand/SaisieGuidee.tsx',
  'components/marchand/ConfirmationLigne.tsx',
  'components/marchand/MicroVenteCaisse.tsx',
  'components/marchand/POSCaisse.tsx',
];

const appels: Appel[] = scannerTout(SRC);

// ── Gate 7 ──────────────────────────────────────────────────────────────────
console.log('\n[gate 7] aucune phrase vocale en dur dans le périmètre migré');
for (const rel of PERIMETRE_MIGRE) {
  const enDur = appels.filter((a) => a.fichier === rel).flatMap((a) => a.gabarits.filter((g) => g.kind === 'literal' || g.kind.startsWith('template')).map((g) => `l.${a.ligne} « ${g.texte} »`));
  ok(enDur.length === 0, `${rel}${enDur.length ? ` — en dur : ${enDur.join(' ; ')}` : ''}`);
}
{
  // Les modules purs ne doivent plus contenir de gabarit « phrase » hors t(…).
  const sansCommentaires = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  for (const rel of ['services/machineEncaissement.ts', 'services/relectureSpontanee.ts', 'services/dialoguesTata.ts', 'services/intentionsCaisse.ts', 'services/ruptureStock.ts', 'voice-offline/localIntent.ts']) {
    const code = sansCommentaires(readFileSync(join(SRC, rel), 'utf8'));
    const gabarits = [...code.matchAll(/`[^`]*\$\{[^`]*`/g)].map((m) => m[0]).filter((g) => /[a-zA-Zéèêàç]{3,} [a-zA-Zéèêàç]{2,}/.test(g.replace(/\$\{[^}]*\}/g, '')));
    ok(gabarits.length === 0, `${rel} : aucun gabarit de phrase hors catalogue${gabarits.length ? ` (${gabarits.join(' ; ')})` : ''}`);
    // Aucune CHAÎNE (une expression régulière STT peut, elle, contenir « francs »).
    ok(!/(['"`])[^'"`\n]*\bfrancs\b[^'"`\n]*\1/.test(code), `${rel} : le mot « francs » n'y est plus écrit dans une chaîne (il vient du lexique)`);
  }
}

// ── Périmètre d'argent, au niveau du source ─────────────────────────────────
console.log('\n[argent] la porte unique et l\'ordre de la grammaire, inchangés');
{
  const sansCommentaires = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  const machine = sansCommentaires(readFileSync(join(SRC, 'services/machineEncaissement.ts'), 'utf8'));
  ok((machine.match(/effet:\s*\{\s*type:\s*'encaisser'/g) || []).length === 1, 'machineEncaissement : un seul effet `encaisser` émis');
  ok(/etat\.phase === 'attente_confirmation'\s*&&\s*memeEmpreinte\(etat\.empreinte, fin\.empreinte\)\s*&&\s*!fin\.panierVide\s*&&\s*fin\.suffisant\s*&&\s*fin\.total > 0/.test(machine),
    'machineEncaissement : les quatre conditions de la porte, dans le même ordre');
  ok(!/toLocaleString|francs/.test(machine), 'machineEncaissement : ni formatage ni « francs » — les phrases sont des clés');
  const grammaire = sansCommentaires(readFileSync(join(SRC, 'voice-offline/grammaireEncaissement.ts'), 'utf8'));
  const iAnnul = grammaire.indexOf("r.annulation.motif.test(r.annulation.normaliser(texte))) return 'annuler_validation'");
  const iValid = grammaire.indexOf("r.validation.liste.has(r.validation.normaliser(texte).trim())) return 'oui_valide'");
  const iEnc = grammaire.indexOf("r.encaisser.motif.test(r.encaisser.normaliser(texte))) return 'encaisser'");
  const iComb = grammaire.indexOf("r.combienDoit.motif.test(r.combienDoit.normaliser(texte))) return 'combien_doit'");
  ok(iAnnul !== -1 && iValid !== -1 && iEnc !== -1 && iComb !== -1 && iAnnul < iValid && iValid < iEnc && iEnc < iComb,
    'grammaireEncaissement : annulation, puis liste blanche (phrase entière), puis encaisser, puis combien — dans cet ordre');
  ok(/mode === 'phrase_entiere' \? new Set\(v\.variantes\.phrases\) : new Set<string>\(\)/.test(grammaire), 'grammaireEncaissement : la validation n\'accepte qu\'une liste blanche en mode phrase entière');
  ok(!/normaliserPour\(/.test(grammaire) && (grammaire.match(/\.normaliser\(texte\)/g) || []).length === 4,
    'grammaireEncaissement : chaque intention normalise avec SA locale servie, jamais avec la locale demandée (I18N-01)');
  ok(!/new Set\(\[\s*'oui valide'/.test(grammaire) && !/\/\\b\(non\|annule/.test(grammaire), 'grammaireEncaissement : plus aucune variante française écrite en dur (données de fr-ci)');
}

// ── Inventaire à jour ───────────────────────────────────────────────────────
console.log('\n[inventaire] docs/langues/INVENTAIRE-VOIX.md reflète le source');
{
  const md = readFileSync(join(RACINE, 'docs', 'langues', 'INVENTAIRE-VOIX.md'), 'utf8');
  const sites = Number((md.match(/Sites d'appel vocaux[^|]*\| \*\*(\d+)\*\* \|/) || [])[1]);
  const phrases = new Set<string>();
  for (const a of appels) for (const g of a.gabarits) if (g.kind === 'literal' || g.kind.startsWith('template')) phrases.add(g.texte);
  const distinctes = Number((md.match(/Phrases distinctes aux sites d'appel[^|]*\| \*\*(\d+)\*\* \|/) || [])[1]);
  ok(sites === appels.length, `sites d'appel : inventaire ${sites} = source ${appels.length} (sinon : npm run i18n:inventaire)`);
  ok(distinctes === phrases.size, `phrases distinctes : inventaire ${distinctes} = source ${phrases.size}`);
}

// ── Couverture : toute phrase encore en dur est au catalogue ───────────────
console.log('\n[couverture] chaque phrase dite en dur est au catalogue (statut a_migrer)');
{
  const ref = manifest(LOCALE_REFERENCE)!;
  const norm = (s: string) => normaliserPhrase(s.replace(/\{devise\}/g, ref.lexique!.monnaie.parlee).replace(/\{symboleDevise\}/g, ref.lexique!.monnaie.symbole));
  const catalogue = new Map<string, string>(MESSAGES_TTS.map((m) => [norm(m.frActuel), m.id]));
  const absentes: string[] = [];
  const restantes = new Map<string, number>();
  for (const a of appels) for (const g of a.gabarits) {
    if (!(g.kind === 'literal' || g.kind.startsWith('template'))) continue;
    const id = catalogue.get(norm(g.texte));
    if (!id) absentes.push(`${a.fichier}:${a.ligne} « ${g.texte} »`);
    else restantes.set(a.fichier, (restantes.get(a.fichier) ?? 0) + 1);
  }
  ok(absentes.length === 0, `aucune phrase dite absente du catalogue${absentes.length ? ` — ${absentes.length} absente(s) : ${absentes.slice(0, 8).join(' ; ')}${absentes.length > 8 ? ' ; …' : ''}` : ''}`);
  const total = [...restantes.values()].reduce((s, n) => s + n, 0);
  console.log(`  · phrases encore en dur (à migrer) : ${total} dans ${restantes.size} fichier(s) — détail : npm run i18n:inventaire`);
  ok(!PERIMETRE_MIGRE.some((rel) => restantes.has(rel)), 'et aucune dans le périmètre migré');
  const migres = MESSAGES_TTS.filter((m) => m.statut === 'migre').length;
  ok(migres > 0 && entreeTts('TATA_RELECTURE_MONNAIE')?.statut === 'migre', `${migres} clés lues par le code (statut migre)`);
}

console.log(echecs === 0 ? '\nSource : aucune phrase en dur dans le périmètre migré, inventaire à jour.' : `\n${echecs} échec(s).`);
if (echecs > 0) process.exit(1);
