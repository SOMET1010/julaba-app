/**
 * L'ARGENT RESTE EN FRANÇAIS — le garde-fou du lot « Tantie parle dioula ».
 * Lancer : npm run test:voix-dyu-argent   (tsx, sans DOM)
 *
 * CE QU'IL PROUVE, ET POURQUOI C'EST CELUI-LÀ QUI COMPTE.
 * Faire parler Tantie en dioula ne doit PAS lui faire dire des MONTANTS en
 * dioula. Les 110 nombres dioula du corpus sont en DRAFT, non validés par une
 * locutrice, et un nombre mandingue seul est ambigu entre francs et dɔrɔmɛ :
 * « mugan » peut valoir 20 F ou 100 F. Une Tantie qui annoncerait un montant
 * en dioula avant validation dirait un chiffre faux AVEC AUTORITÉ, à une femme
 * qui ne peut pas le relire. C'est la pire panne que ce produit puisse avoir.
 *
 * LA PRÉCAUTION QUI FAIT LA VALEUR DE CE TEST. Aujourd'hui `dyu-ci` est un
 * squelette vide (lot B7) : tout retombe sur fr-ci de toute façon, et prouver
 * la règle sur un manifest vide ne prouverait rien. On SIMULE donc la langue
 * telle qu'elle sera : entièrement peuplée du décor dioula de travail qui
 * existe déjà dans le dépôt (`texteDyu` de services/loginVoiceScript.ts), et
 * on redemande. La règle doit tenir dans ce monde-là — celui de demain — pas
 * seulement dans celui d'aujourd'hui où elle est vraie par accident.
 *
 * Quatre profondeurs, de la donnée au contournement :
 *   A. le monde d'aujourd'hui — dyu-ci est un squelette, et l'argent est
 *      français parce que le moteur l'impose ;
 *   B. le monde de demain     — dyu-ci peuplé de décor : CHAQUE clé critique
 *      est encore servie par fr-ci, mot pour mot ;
 *   C. la voix                — et la voix choisie pour chacune est la
 *      française, dans les deux mondes ;
 *   D. le contournement       — même sur un MessageVocal fabriqué à la main
 *      qui prétendrait venir du dioula, la voix reste française.
 * Plus le symétrique, sans lequel le lot ne servirait à rien : le DÉCOR, lui,
 * se dit bien en dioula, avec la voix dioula.
 */
import { MESSAGES_CRITIQUES, MESSAGES_TTS, entreeTts } from './catalog.js';
import { enregistrerLocale, manifest } from './registry.js';
import { resoudreMessage, viderJournalFallbacks, journalFallbacks, type MessageVocal } from './runtime.js';
import { LOCALE_REFERENCE, type MessageId, type MessageLocalise } from './types.js';
import { DYU_CI } from './locales/dyu-ci/index.js';
import { SCRIPT_TATA } from '../../services/loginVoiceScript.js';
import {
  VOIX_DYU, VOIX_REFERENCE, choisirVoix, voixPeutDireArgent, voixPourLocale, voixPourMessage,
  __oublierValidationsArgent,
} from './voixParLocale.js';

const DYU = 'dyu-ci';
let echecs = 0;
const ok = (cond: boolean, quoi: string) => { if (cond) console.log('  ✓', quoi); else { console.log('  ✗', quoi); echecs++; } };

/** Les variables de tous les gabarits d'argent — pour comparer des textes complets. */
const VARS = { montant: 500, montantDorome: 100, total: 1500, rendu: 250, manque: 300, somme: 2000, prix: 750, quantite: 3, produit: 'tomate', unite: 'tas', nom: 'Awa', jour: 'lundi', nombre: 2 };

/**
 * Le dioula tel qu'il sera : tout le décor traduit, en draft. Construit depuis
 * la SEULE source dioula du dépôt, sans en écrire une ligne ici.
 *
 * Trois exclusions, et ce sont elles le sujet :
 *   1. la catégorie CHIFFRES — NUM_0 à NUM_9 SONT les nombres dioula non
 *      validés, la matière même du risque ;
 *   2. toute clé `critiqueArgent` au catalogue ;
 *   3. toute clé absente du catalogue ou à variables.
 * C'est exactement la discipline que Manus devra tenir. Le test sert aussi de
 * spécification de ce filtre.
 */
function decorDioulaSimule(): { messages: Record<MessageId, MessageLocalise>; ecartes: Array<{ id: string; raison: string }> } {
  const messages: Record<MessageId, MessageLocalise> = {};
  const ecartes: Array<{ id: string; raison: string }> = [];
  for (const phrase of SCRIPT_TATA) {
    if (phrase.categorie === 'CHIFFRES') { ecartes.push({ id: phrase.id, raison: 'nombre dioula non validé' }); continue; }
    const texte = phrase.texteDyu?.trim();
    if (!texte) { ecartes.push({ id: phrase.id, raison: 'pas de traduction dioula' }); continue; }
    const entree = entreeTts(phrase.id);
    if (!entree) { ecartes.push({ id: phrase.id, raison: 'absente du catalogue' }); continue; }
    if (entree.critiqueArgent) { ecartes.push({ id: phrase.id, raison: 'critiqueArgent' }); continue; }
    if (entree.variables.length > 0) { ecartes.push({ id: phrase.id, raison: 'gabarit à variables' }); continue; }
    messages[phrase.id] = { template: texte, validation: { linguistique: 'draft', finance: false } };
  }
  return { messages, ecartes };
}

// ── A. Le monde d'aujourd'hui : dyu-ci est un squelette ───────────────────
console.log('\n[A] aujourd\'hui — dyu-ci est vide (lot B7), et l\'argent est déjà français');
{
  __oublierValidationsArgent();
  viderJournalFallbacks();
  const m = manifest(DYU)!;
  ok(!!m, 'dyu-ci est enregistrée');
  ok(Object.keys(m.messages).length === 0 && Object.keys(m.intents).length === 0,
    'dyu-ci reste un squelette : rien n\'a été recopié dedans par ce lot');

  const fuites = MESSAGES_CRITIQUES.filter((id) => resoudreMessage(id, VARS, DYU).locale !== LOCALE_REFERENCE);
  ok(fuites.length === 0, `les ${MESSAGES_CRITIQUES.length} clés critiques sont servies par fr-ci`);
  ok(!voixPeutDireArgent(VOIX_DYU), 'le dioula n\'est PAS déclaré validé sur le financier');
  ok(voixPeutDireArgent(VOIX_REFERENCE), 'le français, lui, l\'est — la règle n\'est pas « personne ne parle »');
  ok(voixPourLocale(DYU).id === 'dyu', 'la voix installée pour dyu-ci s\'appelle « dyu » (nom lu par SherpaTtsPlugin)');
  ok(voixPourLocale('xx-inconnue').id === VOIX_REFERENCE.id, 'une langue sans voix retombe sur le français');
}

// ── B et C. Le monde de demain : dyu-ci peuplé de tout le décor ───────────
const { messages: DECOR, ecartes: ECARTES } = decorDioulaSimule();
console.log(`\n[B] demain — dyu-ci peuplé de ${Object.keys(DECOR).length} phrases de décor dioula`);
{
  // On REMPLACE le manifest dans le registre, le temps de ce test. Rien n'est
  // écrit sur disque : c'est une simulation, pas une livraison.
  enregistrerLocale({ ...DYU_CI, messages: DECOR });
  __oublierValidationsArgent();
  viderJournalFallbacks();

  ok(Object.keys(DECOR).length >= 40, `la simulation est sérieuse (${Object.keys(DECOR).length} phrases)`);
  ok(ECARTES.some((e) => e.raison === 'critiqueArgent'), 'au moins une clé a été écartée POUR raison d\'argent (le filtre travaille vraiment)');
  const nombres = SCRIPT_TATA.filter((p) => p.categorie === 'CHIFFRES');
  ok(ECARTES.filter((e) => e.raison === 'nombre dioula non validé').length === nombres.length,
    `les ${nombres.length} nombres dioula (NUM_*) sont écartés nommément, pas par accident`);

  const servisAilleurs = MESSAGES_CRITIQUES.filter((id) => resoudreMessage(id, VARS, DYU).locale !== LOCALE_REFERENCE);
  ok(servisAilleurs.length === 0, `les ${MESSAGES_CRITIQUES.length} clés critiques restent servies par fr-ci${servisAilleurs.length ? ` — fuite : ${servisAilleurs.join(', ')}` : ''}`);

  const textesDifferents = MESSAGES_CRITIQUES.filter(
    (id) => resoudreMessage(id, VARS, DYU).texte !== resoudreMessage(id, VARS, LOCALE_REFERENCE).texte,
  );
  ok(textesDifferents.length === 0, `mot pour mot le texte français${textesDifferents.length ? ` — écart : ${textesDifferents.join(', ')}` : ''}`);

  // ── L'INDICATEUR QU'IL NE FAUT PAS REPRENDRE, ET POURQUOI ───────────────
  // Ce test a d'abord cherché « aucune lettre dioula (ɛ ɔ ŋ ɲ) dans une phrase
  // d'argent ». C'était grossier, et ça s'est retourné contre nous dès qu'une
  // phrase l'a mérité : `TATA_AMBIGUITE_DOROME` est une phrase FRANÇAISE, de
  // fr-ci, qui CITE le mot mandingue qu'elle demande de lever —
  //   « 500 francs, ou 500 dɔrɔmɛ — c'est-à-dire 100 francs ? »
  // Lui retirer ses lettres dioula la rendrait absurde : c'est exactement le
  // mot sur lequel porte la question. « Contient une lettre dioula » n'est
  // donc PAS équivalent à « est dite en dioula ».
  //
  // Le bon critère compare à la SOURCE : une phrase d'argent a le droit de
  // porter des lettres dioula à la seule condition d'être, mot pour mot, celle
  // que sert fr-ci. Une lettre dioula qui apparaîtrait SANS venir de fr-ci
  // voudrait dire qu'une traduction s'est glissée dans un montant — et là, ça
  // doit rester rouge.
  const SPECIFIQUES_DYU = /[ɛɔŋɲ]/;
  const contamines = MESSAGES_CRITIQUES.filter((id) => {
    const enDyu = resoudreMessage(id, VARS, DYU).texte;
    if (!SPECIFIQUES_DYU.test(enDyu)) return false;
    return enDyu !== resoudreMessage(id, VARS, LOCALE_REFERENCE).texte;
  });
  ok(contamines.length === 0, `aucune lettre dioula (ɛ ɔ ŋ ɲ) qui ne vienne pas de fr-ci${contamines.length ? ` (${contamines.join(', ')})` : ''}`);

  // Et on NOMME les citations légitimes, plutôt que de les laisser passer en
  // silence : un successeur doit voir qu'elles existent, qu'elles sont
  // françaises, et qu'elles sont servies telles quelles.
  const citations = MESSAGES_CRITIQUES.filter((id) => SPECIFIQUES_DYU.test(resoudreMessage(id, VARS, LOCALE_REFERENCE).texte));
  ok(citations.every((id) => resoudreMessage(id, VARS, DYU).locale === LOCALE_REFERENCE),
    `les ${citations.length} phrase(s) d'argent qui CITENT un mot mandingue restent servies par fr-ci (${citations.join(', ') || '—'})`);
  ok(citations.every((id) => voixPourMessage(resoudreMessage(id, VARS, DYU)).id === VOIX_REFERENCE.id),
    'et elles sont dites par la voix française — citer un mot dioula ne fait pas basculer la voix');

  ok(!voixPeutDireArgent(VOIX_DYU), 'même peuplé de décor, le dioula ne devient PAS validé sur l\'argent');

  console.log('\n[C] la voix choisie pour chaque clé critique, dioula peuplé');
  const mauvaiseVoix = MESSAGES_CRITIQUES.filter((id) => voixPourMessage(resoudreMessage(id, VARS, DYU)).id !== VOIX_REFERENCE.id);
  ok(mauvaiseVoix.length === 0, `les ${MESSAGES_CRITIQUES.length} clés critiques partent sur la voix « fr »${mauvaiseVoix.length ? ` — fuite : ${mauvaiseVoix.join(', ')}` : ''}`);

  console.log('\n[décor] ce que le lot APPORTE, et pas seulement ce qu\'il interdit');
  const ids = Object.keys(DECOR);
  const ditsEnDioula = ids.filter((id) => {
    const msg = resoudreMessage(id, {}, DYU);
    return msg.locale === DYU && voixPourMessage(msg).id === 'dyu';
  });
  ok(ditsEnDioula.length === ids.length, `les ${ids.length} phrases de décor sont dites en dioula, par la voix dioula`);
  // Le vocabulaire du modèle MMS dioula ne contient AUCUN chiffre : une phrase
  // qui en porterait serait muette sur ces caractères. Garde-fou gratuit.
  const avecChiffres = ids.filter((id) => /[0-9]/.test(DECOR[id]!.template));
  ok(avecChiffres.length === 0, `aucune phrase dioula ne porte de chiffre${avecChiffres.length ? ` (${avecChiffres.join(', ')})` : ''}`);

  console.log('\n[journal] les replis d\'argent sont tracés, pas tus');
  const traces = journalFallbacks().filter((t) => t.localeDemandee === DYU && t.localeServie === LOCALE_REFERENCE);
  ok(traces.length > 0, `${traces.length} repli(s) dyu-ci → fr-ci écrits au journal`);

  // On rend le registre à son état de livraison : un test ne laisse pas
  // derrière lui une langue peuplée que personne n'a validée.
  enregistrerLocale(DYU_CI);
  __oublierValidationsArgent();
  ok(Object.keys(manifest(DYU)!.messages).length === 0, 'le registre est rendu intact après la simulation');
}

// ── D. Le contournement : un message fabriqué à la main ───────────────────
console.log('\n[D] même un MessageVocal forgé ne fait pas dire l\'argent en dioula');
{
  const forger = (id: string): MessageVocal => ({
    id, locale: DYU, localeDemandee: DYU,
    texte: 'wari bɛ yan', variables: {}, fallback: false,
  });
  const fuites = MESSAGES_CRITIQUES.filter((id) => choisirVoix(forger(id)).voix.id !== VOIX_REFERENCE.id);
  ok(fuites.length === 0, `un message d'argent étiqueté « dyu-ci » reste dit en français${fuites.length ? ` — fuite : ${fuites.join(', ')}` : ''}`);
  ok(MESSAGES_CRITIQUES.every((id) => choisirVoix(forger(id)).raison === 'argent-non-valide'),
    'et le refus porte un motif traçable (« argent-non-valide »), il n\'est pas silencieux');
  // Le décor forgé, lui, part bien en dioula : le filet ne bloque QUE l'argent.
  const decorForge = forger('AUTH_01');
  ok(choisirVoix(decorForge).voix.id === 'dyu', 'une phrase de décor forgée part bien sur la voix dioula (le filet ne bloque que l\'argent)');
}

// ── Rien n'a bougé pour le français ───────────────────────────────────────
console.log('\n[non-régression] fr-ci est intact');
{
  const changes = MESSAGES_TTS.filter((m) => resoudreMessage(m.id, VARS, LOCALE_REFERENCE).locale !== LOCALE_REFERENCE);
  ok(changes.length === 0, `les ${MESSAGES_TTS.length} clés du catalogue sont encore servies par fr-ci en français`);
}

console.log(echecs === 0 ? '\n✅ L\'argent reste en français.\n' : `\n❌ ${echecs} échec(s).\n`);
process.exit(echecs === 0 ? 0 : 1);
