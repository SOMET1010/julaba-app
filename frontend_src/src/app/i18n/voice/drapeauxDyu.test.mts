/**
 * LES TROIS ÉTATS DU DIOULA, CÔTE À CÔTE, DANS UN SEUL PROCESSUS.
 * Lancer : npm run test:drapeaux-dyu   (tsx, sans DOM)
 *
 * POURQUOI CE TEST EXISTE, ET CE QU'IL RÉPARE.
 * Les deux drapeaux du dioula sont des constantes de BUILD (`define` de Vite).
 * C'est délibéré et c'est ce qui laisse le garde B7 intact : aucun processus
 * Node ne les voit, donc `verify` mesure toujours la configuration LIVRABLE.
 * Mais cela a un prix qu'il faut payer ici plutôt que de le taire : lancer
 * `verify` avec `JULABA_VOIX_DYU=1` dans l'environnement ne prouve rien de ce
 * que le drapeau COMMANDE — par construction, ça ne change rien.
 *
 * Alors on le prouve autrement, et mieux : les fonctions qui décident sont
 * pures et prennent l'état des drapeaux EN ARGUMENT. Ce test les appelle dans
 * les trois états, dans le même processus, et compare. C'est plus fort qu'un
 * `verify` répété : on voit les trois mondes l'un à côté de l'autre.
 *
 * LES TROIS ÉTATS :
 *   [1] rien            — ce qui est livré. `dyu-ci` squelette, dioula non
 *                         sélectionnable. Le monde d'aujourd'hui, inchangé.
 *   [2] JULABA_VOIX_DYU — décor peuplé, dioula sélectionnable, ARGENT FRANÇAIS.
 *   [3] + JULABA_DYU_ARGENT — les montants traduits partent en dioula, et les
 *                         CHIFFRES restent écartés même là.
 *
 * CE QUE CE TEST NE FAIT PAS : il ne remplace pas `test:voix-dyu-argent`, qui
 * reste la norme sur l'état [2] et n'a pas été touché d'une ligne.
 */
import { entreeTts, MESSAGES_CRITIQUES } from './catalog.js';
import { DYU_ARGENT_DE_TEST, LOCALE_ARGENT_DE_TEST, VOIX_DYU_EMBARQUEE } from './drapeauxDeTest.js';
import { decorDioula } from './locales/dyu-ci/decorDeTest.js';
import { DYU_CI } from './locales/dyu-ci/index.js';
import { enregistrerLocale, manifest } from './registry.js';
import { resoudreMessage } from './runtime.js';
import { LANGUE_PRETE, langueDisponible } from '../../hooks/useLangPref.js';
import { SCRIPT_TATA } from '../../services/loginVoiceScript.js';

let echecs = 0;
const ok = (cond: boolean, quoi: string) => { if (cond) console.log('  ✓', quoi); else { console.log('  ✗', quoi); echecs++; } };

const DYU = 'dyu-ci';
const CHIFFRES = SCRIPT_TATA.filter((p) => p.categorie === 'CHIFFRES').map((p) => p.id);

// ── [0] Ce processus est bien celui du build LIVRABLE ─────────────────────
console.log('\n[0] un processus Node ne voit AUCUN drapeau de build — c\'est le point');
{
  ok(VOIX_DYU_EMBARQUEE === false, 'VOIX_DYU_EMBARQUEE est éteint dans tsx, quoi qu\'il y ait dans l\'environnement');
  ok(DYU_ARGENT_DE_TEST === false, 'DYU_ARGENT_DE_TEST aussi');
  ok(LOCALE_ARGENT_DE_TEST === null, 'aucune langue n\'a la dérogation d\'argent');
  ok(langueDisponible('dioula') === false, 'le dioula n\'est donc PAS sélectionnable : le garde B7 voit ce qu\'il doit voir');
  ok(LANGUE_PRETE.dioula === false, 'et `LANGUE_PRETE` — ce qui est prêt à être LIVRÉ — n\'a pas bougé');
  ok(Object.keys(DYU_CI.messages).length === 0 && Object.keys(DYU_CI.intents).length === 0,
    'la locale livrée est le squelette vide du lot B7, littéralement');
}

// ── [1] État « rien » : le décor est vide, et c'est tout ──────────────────
console.log('\n[1] drapeaux éteints — rien du tout');
{
  const d = decorDioula(false, false);
  ok(Object.keys(d.messages).length === 0, 'aucune phrase dioula');
  ok(decorDioula(false, true).messages && Object.keys(decorDioula(false, true).messages).length === 0,
    'le second drapeau SEUL n\'a aucun effet : sans voix ni décor, il n\'y aurait rien à entendre');
}

// ── [2] Premier drapeau : le décor parle, l'argent non ────────────────────
console.log('\n[2] JULABA_VOIX_DYU=1 — le décor en dioula, l\'argent en français');
const decor = decorDioula(true, false);
{
  const ids = Object.keys(decor.messages);
  ok(ids.length === 56, `${ids.length} phrases de décor, prises aux seules \`texteDyu\` du dépôt (attendu : 56)`);
  ok(ids.every((id) => SCRIPT_TATA.some((p) => p.id === id && p.texteDyu?.trim() === decor.messages[id]!.template)),
    'chaque phrase est celle du dépôt, mot pour mot — aucune inventée, aucune complétée');
  ok(ids.every((id) => entreeTts(id)?.critiqueArgent === false), 'aucune clé d\'argent dans le décor');
  ok(ids.every((id) => !CHIFFRES.includes(id)), `aucun des ${CHIFFRES.length} chiffres dioula (NUM_*)`);
  ok(ids.every((id) => !/[0-9]/.test(decor.messages[id]!.template)),
    'aucune phrase ne porte de chiffre — le vocabulaire du modèle MMS n\'en contient pas');
  ok(ids.every((id) => decor.messages[id]!.validation.linguistique === 'draft' && !decor.messages[id]!.validation.finance),
    'la validation reste VRAIE : brouillon, non validée finance — on ne maquille pas la donnée');
  ok(decor.ecartees.some((e) => e.raison === 'critiqueArgent'), 'au moins une clé est écartée POUR raison d\'argent (le filtre travaille)');
  ok(decor.ecartees.filter((e) => e.raison === 'nombre dioula non validé').length === CHIFFRES.length,
    'les chiffres sont écartés NOMMÉMENT, pas par accident');

  // Le moteur, avec cette locale-là : l'argent reste français, sans exception.
  enregistrerLocale({ ...DYU_CI, messages: decor.messages });
  const fuites = MESSAGES_CRITIQUES.filter((id) => resoudreMessage(id, {}, DYU).locale !== 'fr-ci');
  ok(fuites.length === 0, `les ${MESSAGES_CRITIQUES.length} clés d'argent restent servies par fr-ci${fuites.length ? ` — fuite : ${fuites.join(', ')}` : ''}`);
  const ditsEnDyu = ids.filter((id) => resoudreMessage(id, {}, DYU).locale === DYU);
  ok(ditsEnDyu.length === ids.length, `et les ${ids.length} phrases de décor, elles, sont bien servies en dioula`);
}

// ── [3] Second drapeau : l'argent traduit passe, les chiffres jamais ──────
console.log('\n[3] + JULABA_DYU_ARGENT=1 — la dérogation d\'essai, et ce qu\'elle ne lève PAS');
{
  const avecArgent = decorDioula(true, true);
  const ids = Object.keys(avecArgent.messages);
  const nouvelles = ids.filter((id) => !(id in decor.messages));
  ok(nouvelles.length > 0, `le second drapeau ajoute ${nouvelles.length} clé(s) d'argent : ${nouvelles.join(', ')}`);
  ok(nouvelles.every((id) => entreeTts(id)?.critiqueArgent === true), 'et ce sont bien des clés `critiqueArgent`');
  ok(ids.every((id) => !CHIFFRES.includes(id)),
    'LES CHIFFRES RESTENT ÉCARTÉS : la dérogation ouvre les phrases, jamais les nombres nus');
  ok(avecArgent.ecartees.filter((e) => e.raison === 'nombre dioula non validé').length === CHIFFRES.length,
    `les ${CHIFFRES.length} NUM_* sont encore écartés nommément`);
  ok(!avecArgent.ecartees.some((e) => e.raison === 'critiqueArgent'), 'plus aucune clé écartée POUR raison d\'argent — c\'est exactement ce que le drapeau change');
  ok(ids.every((id) => avecArgent.messages[id]!.validation.linguistique === 'draft' && !avecArgent.messages[id]!.validation.finance),
    'la donnée reste honnête : toujours `draft`, toujours `finance: false` — c\'est le BUILD qui passe outre, pas la donnée qui ment');
  ok(ids.every((id) => (entreeTts(id)?.variables.length ?? 1) === 0),
    'aucun gabarit à variables : un {montant} n\'entre pas dans une phrase dioula par la porte de derrière');

  // Et sans la dérogation posée au moteur, la donnée seule ne suffit PAS.
  enregistrerLocale({ ...DYU_CI, messages: avecArgent.messages });
  const fuites = MESSAGES_CRITIQUES.filter((id) => resoudreMessage(id, {}, DYU).locale !== 'fr-ci');
  ok(fuites.length === 0,
    'DEUX VERROUS, PAS UN : même avec l\'argent dans la locale, le moteur de CE processus (sans `define`) sert encore fr-ci');
}

// ── On rend le registre à son état de livraison ───────────────────────────
enregistrerLocale(DYU_CI);
ok(Object.keys(manifest(DYU)!.messages).length === 0, 'le registre est rendu intact après la simulation');

console.log(echecs === 0 ? '\n✅ Un seul drapeau commande les trois verrous, et le second ne lève que ce qu\'il dit.\n' : `\n❌ ${echecs} échec(s).\n`);
process.exit(echecs === 0 ? 0 : 1);
