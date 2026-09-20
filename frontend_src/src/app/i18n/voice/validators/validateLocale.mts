/**
 * VALIDATEUR DE LOCALES — gates 1, 2, 3, 6 du lot i18n.
 * Lancer : npm run test:i18n-locales   (tsx, sans DOM)
 *
 *  1. Aucune clé CRITIQUE ARGENT manquante en fr-ci (la référence doit tout
 *     savoir dire : c'est elle qui rattrape les autres langues).
 *  2. Aucune variable de gabarit perdue : chaque locale porte, pour chaque
 *     message, EXACTEMENT les variables du catalogue — ni oubliée (un
 *     montant qui disparaît d'une relecture), ni inventée (un `{x}` qui
 *     resterait visible).
 *  3. Aucune clé orpheline : toute clé d'une locale existe au catalogue ;
 *     toute clé lue par le code (`t('…')`, `speakMessage('…')`,
 *     `variantesIntention('…')`) existe au catalogue ; toute entrée `migre`
 *     du catalogue est bien lue quelque part.
 *  6. Le repli est tracé : un message absent dans une locale est servi
 *     depuis fr-ci ET produit une trace {id, localeDemandee, localeServie}.
 *  +  STT_INPUT / TTS_OUTPUT strictement séparés : `messages` ne contient
 *     aucun `INT_`, `intents` ne contient que des `INT_` ; le catalogue non plus
 *     ne mélange pas.
 *  +  Codes de langue : chaque manifest enregistré est cohérent (repli connu,
 *     jamais cyclique, référence sans repli) et documenté dans
 *     LOCALES_PROVISOIRES.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MESSAGES_TTS, INTENTIONS_STT, entreeTts, entreeIntent } from '../catalog.js';
import { codesLocales, manifest, LOCALES_PROVISOIRES } from '../registry.js';
import { journalFallbacks, resoudreMessage, viderJournalFallbacks, surFallback, t, variantesIntention } from '../runtime.js';
import { LOCALE_REFERENCE } from '../types.js';

let echecs = 0;
const ok = (cond: boolean, quoi: string) => { if (cond) console.log('  ✓', quoi); else { console.log('  ✗', quoi); echecs++; } };

const varsDe = (template: string) => [...new Set([...template.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((m) => m[1]))].filter((v) => v !== 'devise' && v !== 'symboleDevise');

// ── Catalogue : séparation et unicité ───────────────────────────────────────
console.log('\n[catalogue] STT_INPUT et TTS_OUTPUT séparés, identifiants uniques');
{
  const ids = new Set<string>();
  let doublons = 0;
  for (const e of [...MESSAGES_TTS, ...INTENTIONS_STT]) { if (ids.has(e.id)) doublons++; ids.add(e.id); }
  ok(doublons === 0, `aucun identifiant en double (${ids.size} entrées)`);
  ok(MESSAGES_TTS.every((m) => m.type === 'tts' && !m.id.startsWith('INT_')), 'aucun message TTS ne porte un identifiant INT_');
  ok(INTENTIONS_STT.every((i) => i.type === 'stt_intent' && i.id.startsWith('INT_')), 'toute intention STT porte un identifiant INT_');
  ok(MESSAGES_TTS.every((m) => m.frMarche === null), 'frMarche est null partout (le français « marché » appartient à Manus)');
  ok([...MESSAGES_TTS, ...INTENTIONS_STT].every((e) => e.owner === 'manus' || e.owner === 'claude'), 'owner renseigné sur chaque entrée');
  ok(MESSAGES_TTS.every((m) => JSON.stringify([...m.variables].sort()) === JSON.stringify(varsDe(m.frActuel).sort())), 'les variables déclarées sont exactement celles du gabarit frActuel');
}

// ── Registre ────────────────────────────────────────────────────────────────
console.log('\n[registre] manifests cohérents, codes documentés');
{
  const codes = codesLocales();
  ok(codes.includes(LOCALE_REFERENCE), `la référence ${LOCALE_REFERENCE} est enregistrée`);
  const ref = manifest(LOCALE_REFERENCE)!;
  ok(ref.fallback === null && ref.lexique !== null, 'la référence n\'a pas de repli et porte un lexique');
  for (const code of codes) {
    const m = manifest(code)!;
    ok(LOCALES_PROVISOIRES.some((l) => l.code === code), `${code} : documenté dans LOCALES_PROVISOIRES`);
    ok(m.fallback === null || manifest(m.fallback) !== undefined, `${code} : repli « ${m.fallback} » connu`);
    // Pas de cycle : on suit les replis, on doit finir sur null.
    const vus = new Set<string>(); let c: string | null = code; let cycle = false;
    while (c) { if (vus.has(c)) { cycle = true; break; } vus.add(c); c = manifest(c)?.fallback ?? null; }
    ok(!cycle, `${code} : chaîne de repli sans cycle`);
    ok(Object.keys(m.messages).every((id) => !id.startsWith('INT_')), `${code} : messages sans INT_`);
    ok(Object.keys(m.intents).every((id) => id.startsWith('INT_')), `${code} : intents uniquement INT_`);
    ok(Object.keys(m.messages).every((id) => entreeTts(id) !== undefined), `${code} : toute clé de message existe au catalogue`);
    ok(Object.keys(m.intents).every((id) => entreeIntent(id) !== undefined), `${code} : toute clé d'intention existe au catalogue`);
    // Gate 2 : variables exactes.
    const perdues = Object.entries(m.messages).filter(([id, msg]) => {
      const attendu = [...(entreeTts(id)?.variables ?? [])].sort().join(',');
      return attendu !== varsDe(msg.template).sort().join(',');
    }).map(([id]) => id);
    ok(perdues.length === 0, `${code} : aucune variable de gabarit perdue ni inventée${perdues.length ? ` (${perdues.join(', ')})` : ''}`);
  }
}

// ── Gate 1 : fr-ci complet sur l'argent (et en fait sur tout) ───────────────
console.log('\n[gate 1] fr-ci sait dire chaque clé critique argent');
{
  const ref = manifest(LOCALE_REFERENCE)!;
  const critiquesManquantes = MESSAGES_TTS.filter((m) => m.critiqueArgent && !ref.messages[m.id]).map((m) => m.id);
  ok(critiquesManquantes.length === 0, `aucune clé critique manquante en fr-ci${critiquesManquantes.length ? ` (${critiquesManquantes.join(', ')})` : ''}`);
  const manquantes = MESSAGES_TTS.filter((m) => !ref.messages[m.id]).map((m) => m.id);
  ok(manquantes.length === 0, `fr-ci porte les ${MESSAGES_TTS.length} messages du catalogue`);
  const intentsCritiques = INTENTIONS_STT.filter((i) => i.critiqueArgent && ['encaisser', 'combien_doit', 'oui_valide', 'annuler_validation'].includes(i.action));
  ok(intentsCritiques.every((i) => ref.intents[i.id]), 'fr-ci porte les variantes des quatre intentions d\'encaissement');
  ok(MESSAGES_TTS.filter((m) => m.critiqueArgent).every((m) => ref.messages[m.id]?.validation.finance === true && ref.messages[m.id]?.validation.linguistique !== 'draft'),
    'toute clé critique de fr-ci est validée finance (sinon le runtime la refuserait)');
}

// ── Gate 3 : clés orphelines, dans les deux sens ────────────────────────────
console.log('\n[gate 3] aucune clé orpheline');
{
  const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
  const fichiers: string[] = [];
  const lister = (d: string) => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) lister(p); else if (/\.(ts|tsx)$/.test(n) && !/\.test\.|\.spec\./.test(n) && !p.includes('/i18n/voice/catalog.ts') && !p.includes('/i18n/voice/locales/')) fichiers.push(p); } };
  lister(SRC);
  // Toute chaîne littérale en MAJUSCULES qui est un identifiant du catalogue
  // compte comme une lecture : `t('X')`, `speakMessage('X')`, un ternaire
  // `cond ? 'X' : 'Y'`, un tuple `['X', vars]`… — la forme de l'appel n'est
  // pas ce qu'on vérifie, c'est que la clé existe et qu'elle sert.
  const lues = new Map<string, string[]>();
  const re = /'([A-Z][A-Z0-9_]{3,})'/g;
  // Sans les commentaires : un exemple dans un en-tête n'est pas une lecture.
  const sansCommentaires = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
  for (const f of fichiers) {
    const src = sansCommentaires(readFileSync(f, 'utf8'));
    // Seuls les fichiers qui importent la couche i18n LISENT des clés ; un
    // fichier de données qui porte les mêmes identifiants (loginVoiceScript.ts,
    // adopté par le catalogue) ne compte pas comme une lecture.
    if (!/from '[^']*i18n\/voice\//.test(src)) continue;
    for (const m of src.matchAll(re)) {
      if (!entreeTts(m[1]) && !entreeIntent(m[1])) continue;
      (lues.get(m[1]) ?? lues.set(m[1], []).get(m[1])!).push(f.replace(SRC + '/', ''));
    }
  }
  // Les appels explicites (t('X'), speakMessage('X')…) doivent viser une clé connue.
  const reAppel = /\b(?:t|speakMessage|direMessage|resoudreMessage|variantesIntention)\(\s*'([A-Z][A-Z0-9_]+)'/g;
  const inconnues: string[] = [];
  for (const f of fichiers) for (const m of sansCommentaires(readFileSync(f, 'utf8')).matchAll(reAppel)) if (!entreeTts(m[1]) && !entreeIntent(m[1])) inconnues.push(`${m[1]} (${f.replace(SRC + '/', '')})`);
  ok(inconnues.length === 0, `toute clé demandée par un appel existe au catalogue (${lues.size} clés lues)${inconnues.length ? ` — inconnues : ${inconnues.join(', ')}` : ''}`);
  const migres = MESSAGES_TTS.filter((m) => m.statut === 'migre');
  const orphelines = migres.filter((m) => !lues.has(m.id)).map((m) => m.id);
  ok(orphelines.length === 0, `toute clé « migre » du catalogue est lue par le code (${migres.length} migrées)${orphelines.length ? ` — orphelines : ${orphelines.join(', ')}` : ''}`);
  // Une clé « reference » (script, clip) est lue par son propre module : normal.
  // Une clé « a_migrer » lue par le code est un statut périmé : on le dit.
  const luesNonMigrees = [...lues.keys()].filter((id) => entreeTts(id)?.statut === 'a_migrer');
  ok(luesNonMigrees.length === 0, `aucune clé lue par le code n'est encore marquée « a_migrer »${luesNonMigrees.length ? ` — à corriger : ${luesNonMigrees.join(', ')}` : ''}`);
}

// ── Gate 6 : repli tracé ────────────────────────────────────────────────────
console.log('\n[gate 6] un repli vers fr-ci est explicite et tracé');
{
  const traces: string[] = [];
  const off = surFallback((tr) => traces.push(`${tr.type}:${tr.id}:${tr.localeDemandee}→${tr.localeServie}:${tr.raison}`));
  viderJournalFallbacks();
  const m = resoudreMessage('TATA_MANQUE', { montant: 500 }, 'dyu-ci');
  ok(m.fallback === true && m.locale === 'fr-ci' && m.localeDemandee === 'dyu-ci', 'dyu-ci sans traduction → servi depuis fr-ci, marqué fallback');
  ok(m.texte === t('TATA_MANQUE', { montant: 500 }, 'fr-ci'), 'le texte servi est exactement celui de fr-ci');
  ok(traces.some((s) => s.startsWith('message:TATA_MANQUE:dyu-ci→fr-ci:absent')), `la trace nomme la clé, la locale demandée et la locale servie (${traces[0] ?? 'aucune trace'})`);
  ok(journalFallbacks().length >= 1, 'le journal interne garde la trace');
  const v = variantesIntention('INT_OUI_VALIDE', 'bci');
  ok(v !== null && v.locale === 'fr-ci', 'variantes d\'intention absentes en bci → celles de fr-ci');
  ok(traces.some((s) => s.startsWith('intent:INT_OUI_VALIDE:bci→fr-ci')), 'et le repli d\'intention est tracé aussi');
  const inconnue = resoudreMessage('TATA_MANQUE', { montant: 1 }, 'xx-inconnue');
  ok(inconnue.locale === 'fr-ci' && inconnue.texte.includes('1'), 'locale inconnue → fr-ci, sans exception');
  off();
  const sans = resoudreMessage('TATA_MANQUE', { montant: 500 }, 'fr-ci');
  ok(sans.fallback === false && sans.locale === 'fr-ci', 'fr-ci ne replie jamais');
}

console.log(echecs === 0 ? '\nLocales valides.' : `\n${echecs} échec(s).`);
if (echecs > 0) process.exit(1);
