/**
 * B7 — UNE LANGUE NON PRÊTE NE DOIT PAS ARRIVER JUSQU'AU MOTEUR.
 * Lancer : npm run test:langue-non-prete   (tsx, sans DOM)
 *
 * CE QUE LE LOT A6 A FAIT, ET CE QU'IL S'EST INTERDIT. A6 a posé
 * `LANGUE_PRETE` / `langueDisponible` et grisé les langues non prêtes dans les
 * Réglages — **à l'affichage seulement**. Il s'est explicitement interdit de
 * toucher `getLangPref` / `setLangPref`, en disant que faire retomber une
 * préférence non prête est un changement de comportement, donc un lot à part.
 * Ce lot est celui-là. Il ne refait pas A6 et ne le contredit pas : il rend le
 * MOTEUR cohérent avec ce que l'écran affiche déjà.
 *
 * CE QUE CE TEST A MESURÉ, ET QU'IL FAUT DIRE TEL QUEL. La préférence de langue
 * choisit la locale servie à TOUT le runtime vocal — y compris la grammaire
 * d'encaissement. C'était le mécanisme de la dette **I18N-01 (P1 argent)** :
 * avec « Dioula » mémorisé, la liste blanche de validation se retrouvait
 * normalisée par les règles de `dyu-ci` alors que ses variantes sont héritées
 * de fr-ci, et des phrases cessaient d'être reconnues.
 *
 * SUR CETTE BASE, CE SYMPTÔME N'EST PLUS REPRODUCTIBLE, et ce test le vérifie
 * au lieu de le supposer : `grammaireEncaissement.reconnaisseurs` prend le
 * `normaliser` de la locale RÉELLEMENT SERVIE (`v?.normaliser`), pas de la
 * locale demandée — donc un repli sur fr-ci sert les variantes de fr-ci ET sa
 * normalisation. La liste blanche reste entière sous `dyu-ci`.
 *
 * CE LOT N'EST DONC PAS UNE CORRECTION D'ARGENT : c'est la **cohérence** que
 * A6 avait laissée ouverte, et une défense en profondeur. Une langue grisée à
 * l'écran ne doit pas rester servie par le moteur — sinon la marchande voit
 * « en préparation » et entend autre chose, et le jour où une locale non prête
 * recevra des données réelles, elles entreront en production sans décision.
 *
 * CE QUE CE TEST PROUVE. Il exécute la VRAIE grammaire d'encaissement sur les
 * VRAIES données de locale, et il exécute le VRAI module de préférence,
 * rechargé par génération. Il ne recopie aucune liste de phrases : elle est
 * lue dans le catalogue.
 *
 * CE QU'IL N'AUTORISE PAS : combler `dyu-ci` en lui faisant hériter des règles
 * françaises. Aucune langue locale n'hérite automatiquement d'une règle
 * française — si une langue n'a pas de couverture déclarée, on le dit, on ne
 * comble pas. Le repli porte sur la PRÉFÉRENCE, pas sur les données.
 */
import { detecterEncaissement } from '../voice-offline/grammaireEncaissement.js';
import { entreeIntent } from '../i18n/voice/catalog.js';
import { LOCALE_PAR_PREFERENCE, manifest } from '../i18n/voice/registry.js';
import { LANGUE_PRETE, langueDisponible, type AppLang } from './useLangPref.js';

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log('  ✅', label);
  else { console.log('  ❌', label); failures++; }
}

/** Un localStorage de test : on part d'un téléphone où « dioula » dort déjà. */
function poserStockage(valeurInitiale: string | null) {
  const memoire = new Map<string, string>();
  if (valeurInitiale !== null) memoire.set('julaba_lang', valeurInitiale);
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => memoire.get(k) ?? null,
      setItem: (k: string, v: string) => { memoire.set(k, v); },
      removeItem: (k: string) => { memoire.delete(k); },
    },
  });
  // `setLangPref` émet un événement : on fournit le minimum vital.
  if (typeof (globalThis as { window?: unknown }).window === 'undefined') {
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} },
    });
  }
  Object.defineProperty(globalThis, 'CustomEvent', {
    configurable: true,
    value: class { type: string; detail: unknown; constructor(t: string, o?: { detail?: unknown }) { this.type = t; this.detail = o?.detail; } },
  });
  return memoire;
}

/** Recharge le VRAI module de préférence, état neuf. */
let gen = 0;
async function chargerPref() {
  gen++;
  return await import(`./useLangPref.js?gen=${gen}`) as typeof import('./useLangPref.js');
}

// Les phrases de validation, LUES AU CATALOGUE — jamais recopiées ici.
const PHRASES_VALIDATION = [...(entreeIntent('INT_OUI_VALIDE')?.exemplesFR ?? [])];

console.log('\n[0] Le socle : A6 est là, et dit ce qu’il dit');
{
  ok(LANGUE_PRETE.french === true, 'B7-0 le français est déclaré prêt');
  ok(LANGUE_PRETE.dioula === false && LANGUE_PRETE.bambara === false,
    'B7-0 le dioula et le bambara sont déclarés NON prêts (audio humain en préparation)');
  ok(PHRASES_VALIDATION.length > 0, `B7-0 la liste blanche de validation est lue au catalogue (${PHRASES_VALIDATION.length} phrases)`);
}

console.log('\n[1] CE QUE LA LOCALE NON PRÊTE FAIT AUJOURD’HUI À L’ARGENT : rien');
{
  // Ce que la grammaire répond sous fr-ci, et sous la locale du dioula.
  const enFrancais = PHRASES_VALIDATION.map((p) => detecterEncaissement(p, LOCALE_PAR_PREFERENCE.french));
  const enDioula = PHRASES_VALIDATION.map((p) => detecterEncaissement(p, LOCALE_PAR_PREFERENCE.dioula));
  const perdues = PHRASES_VALIDATION.filter((_, i) => enFrancais[i] === 'oui_valide' && enDioula[i] !== 'oui_valide');
  console.log(`  · ${perdues.length} phrase(s) de validation perdues sous « ${LOCALE_PAR_PREFERENCE.dioula} » : ${JSON.stringify(perdues)}`);
  ok(enFrancais.every((r) => r === 'oui_valide'), 'B7-1 en français, toutes les phrases de la liste blanche valident');
  // MESURE, PAS SUPPOSITION : le symptôme d'argent d'I18N-01 n'est plus là,
  // parce que la grammaire normalise avec la locale SERVIE et non demandée.
  ok(perdues.length === 0,
    'B7-1 sous la locale du dioula non plus : le symptôme d’argent d’I18N-01 est déjà neutralisé dans la grammaire');
}

console.log('\n[2] LE MOTEUR NE DOIT PLUS RECEVOIR UNE LANGUE NON PRÊTE');
{
  // Un téléphone où « dioula » a été choisi AVANT le lot A6.
  poserStockage('dioula');
  const pref = await chargerPref();
  const servie = pref.getLangPref();
  console.log(`  · préférence mémorisée « dioula » → le moteur reçoit « ${servie} »`);
  ok(servie === 'french',
    'B7-2 une préférence non prête déjà mémorisée ne remonte plus au moteur : il reçoit le français');
  ok(langueDisponible(servie as AppLang), 'B7-2 et ce que le moteur reçoit est toujours une langue déclarée prête');
}
{
  // Et l'on ne peut pas non plus en choisir une : l'écran la grise déjà (A6),
  // le moteur doit refuser la même chose, sinon les deux se contredisent.
  const memoire = poserStockage(null);
  const pref = await chargerPref();
  pref.setLangPref('bambara' as AppLang);
  console.log(`  · après setLangPref('bambara') : stockage = ${JSON.stringify(memoire.get('julaba_lang') ?? null)}, moteur = « ${pref.getLangPref()} »`);
  ok(pref.getLangPref() === 'french', 'B7-2 choisir une langue non prête ne la rend pas active');
  ok(memoire.get('julaba_lang') !== 'bambara', 'B7-2 et elle n’est pas mémorisée : l’écran et le moteur disent la même chose');
}
{
  // Une langue PRÊTE reste évidemment choisissable et mémorisée.
  const memoire = poserStockage(null);
  const pref = await chargerPref();
  pref.setLangPref('french' as AppLang);
  ok(pref.getLangPref() === 'french' && memoire.get('julaba_lang') === 'french',
    'B7-2 une langue prête se choisit et se mémorise normalement');
}
{
  // Une valeur inconnue dans le stockage (corruption, version future).
  poserStockage('klingon');
  const pref = await chargerPref();
  ok(pref.getLangPref() === 'french', 'B7-2 une valeur inconnue retombe sur le français, jamais sur un code inventé');
}

console.log('\n[3] ON NE COMBLE PAS — la règle de Patrick sur les langues');
{
  // Le repli porte sur la PRÉFÉRENCE, jamais sur les données de langue :
  // `dyu-ci` ne doit pas se mettre à contenir les variantes de fr-ci.
  const avant = JSON.stringify([...(entreeIntent('INT_OUI_VALIDE')?.exemplesFR ?? [])]);
  poserStockage('dioula');
  await chargerPref();
  const apres = JSON.stringify([...(entreeIntent('INT_OUI_VALIDE')?.exemplesFR ?? [])]);
  ok(avant === apres, 'B7-3 aucune donnée de langue n’a été copiée ni complétée par le repli');
  ok(LANGUE_PRETE.dioula === false,
    'B7-3 le dioula reste déclaré NON prêt : on dit qu’il manque, on ne le comble pas');
  // La locale du dioula reste un SQUELETTE : messages et intentions vides. On
  // n'a rien réparé chez elle et rien recopié dedans — on a seulement cessé de
  // la servir au moteur tant qu'elle n'est pas déclarée prête.
  const dyu = manifest(LOCALE_PAR_PREFERENCE.dioula);
  ok(!!dyu && Object.keys(dyu.messages).length === 0 && Object.keys(dyu.intents).length === 0,
    'B7-3 dyu-ci reste un squelette vide : aucune variante française n’y a été recopiée');
  ok(!!dyu && dyu.lexique === null && dyu.voix === null,
    'B7-3 ni lexique ni voix inventés pour une langue qui n’en a pas encore');
}

console.log(
  failures === 0
    ? '\nUne langue non prête ne décide plus de rien, et rien n’a été comblé ✅'
    : `\n${failures} test(s) en échec ❌`,
);
process.exit(failures ? 1 : 0);
