/**
 * VALIDATEUR DES CAS ARGENT — gates 4 et 5 du lot i18n, et la liste blanche.
 * Lancer : npm run test:i18n-argent   (tsx, sans DOM)
 *
 *  4. Aucune traduction FINANCIÈRE activée en statut `draft` : pour chaque
 *     locale, un message critique argent présent doit être validé
 *     (linguistique ≠ draft ET finance = true) — sinon le runtime le refuse
 *     (repli tracé). On prouve les deux : la donnée ET le comportement.
 *  5. Aucun intent financier sans variantes validées : mêmes règles sur
 *     `intents` ; et `variantesIntention` ne rend JAMAIS des variantes
 *     critiques non validées.
 *  Liste blanche de `oui_valide` (invariant (d) du QA) : dans TOUTE locale
 *     qui la définit, `INT_OUI_VALIDE` est en mode `phrase_entiere`, chaque
 *     phrase est autonome (au moins deux mots, déjà normalisée), et aucune ne
 *     contient un mot d'annulation de la même locale. Une grammaire branchée
 *     sur ces données ne peut donc pas accepter « oui valide » au milieu
 *     d'autre chose, ni un « oui » seul.
 *  Sévérité fr-ci figée : la liste blanche de fr-ci est exactement celle de
 *     576fd62 (huit réponses) — l'agrandir agrandit la surface par laquelle
 *     un bruit peut payer, et se décide avec Patrick.
 */
import { INTENTIONS_STT, MESSAGES_TTS, entreeIntent, entreeTts } from '../catalog.js';
import { codesLocales, manifest } from '../registry.js';
import { normaliserPour, variantesIntention } from '../runtime.js';
import { LOCALE_REFERENCE, type IntentId, type VariantesIntention } from '../types.js';
import { detecterEncaissement } from '../../../voice-offline/grammaireEncaissement.js';
import { intentLocal } from '../../../voice-offline/localIntent.js';

let echecs = 0;
const ok = (cond: boolean, quoi: string) => { if (cond) console.log('  ✓', quoi); else { console.log('  ✗', quoi); echecs++; } };

const LISTE_BLANCHE_576FD62 = ['oui valide', 'oui je valide', 'ouais valide', 'ouais je valide', 'valide oui', "oui c'est bon valide", 'oui on valide', 'oui valide ca'];

const critiquesTts = new Set(MESSAGES_TTS.filter((m) => m.critiqueArgent).map((m) => m.id));
const critiquesStt = new Set(INTENTIONS_STT.filter((i) => i.critiqueArgent).map((i) => i.id));

console.log(`\n[catalogue] ${critiquesTts.size} messages et ${critiquesStt.size} intentions critiques argent`);
ok(critiquesStt.has('INT_ENCAISSER') && critiquesStt.has('INT_COMBIEN_DOIT') && critiquesStt.has('INT_OUI_VALIDE') && critiquesStt.has('INT_ANNULER_VALIDATION'),
  'les quatre intentions d\'encaissement sont critiques');
for (const id of ['TATA_RELECTURE_MONNAIE', 'TATA_RELECTURE_COMPTE_JUSTE', 'TATA_MANQUE', 'TATA_COMPTE_JUSTE', 'TATA_DONNE_RENDS', 'TATA_TOUCHE_LES_BILLETS', 'TATA_NE_VALIDE_PAS', 'TATA_DOIT', 'TATA_DOIT_DONNE_RENDS']) {
  ok(critiquesTts.has(id), `${id} est critique (relecture financière, montant insuffisant, compte juste, reçu, monnaie, validation)`);
}

for (const code of codesLocales()) {
  const m = manifest(code)!;
  console.log(`\n[${code}] gates 4 et 5`);
  // Gate 4 — données.
  const brouillons = Object.entries(m.messages).filter(([id, msg]) => critiquesTts.has(id) && (msg.validation.linguistique === 'draft' || !msg.validation.finance)).map(([id]) => id);
  ok(brouillons.length === 0, `aucun message critique en brouillon / non validé finance${brouillons.length ? ` (${brouillons.join(', ')})` : ''}`);
  // Gate 5 — données.
  const intentsDraft = Object.entries(m.intents).filter(([id, it]) => critiquesStt.has(id as IntentId) && (it.validation.linguistique === 'draft' || !it.validation.finance)).map(([id]) => id);
  ok(intentsDraft.length === 0, `aucune variante STT financière en brouillon / non validée finance${intentsDraft.length ? ` (${intentsDraft.join(', ')})` : ''}`);
  // Liste blanche.
  const ouiValide = m.intents.INT_OUI_VALIDE;
  if (ouiValide) {
    const v = ouiValide.variantes;
    ok(v.mode === 'phrase_entiere', 'INT_OUI_VALIDE est en mode phrase_entiere (liste blanche fermée)');
    if (v.mode === 'phrase_entiere') {
      const normaliser = normaliserPour(code);
      ok(v.phrases.length > 0 && v.phrases.every((p) => p.trim().split(/\s+/).length >= 2), 'chaque réponse autonome fait au moins deux mots (jamais « oui » ou « valide » seul)');
      ok(v.phrases.every((p) => normaliser(p).trim() === p.trim()), 'chaque phrase est écrite sous sa forme normalisée (minuscules, sans accents, sans ponctuation)');
      const annul = m.intents.INT_ANNULER_VALIDATION?.variantes;
      const motsAnnulation = annul && annul.mode === 'motif' ? [...(annul.mots ?? [])] : [];
      const contamine = v.phrases.filter((p) => motsAnnulation.some((mot) => new RegExp(`\\b${mot}\\b`).test(` ${p} `)));
      ok(contamine.length === 0, `aucune phrase de validation ne contient un mot d'annulation de la locale${contamine.length ? ` (${contamine.join(', ')})` : ''}`);
      ok(new Set(v.phrases).size === v.phrases.length, 'aucun doublon');
      if (code === LOCALE_REFERENCE) {
        ok(JSON.stringify([...v.phrases]) === JSON.stringify(LISTE_BLANCHE_576FD62), 'fr-ci : la liste blanche est exactement celle de 576fd62 (huit réponses, même ordre)');
      }
    }
  } else {
    ok(true, 'INT_OUI_VALIDE absent : la locale repliera sur la liste blanche de fr-ci (tracé)');
  }
}

// ── I18N-01 : la préférence de langue ne change pas la grammaire d'argent ──
// Contre-audit QA du 20/09/2026 : avec la préférence « Dioula », dyu-ci n'a
// aucune variante validée, la grammaire hérite donc de celles de fr-ci — mais
// elle normalisait la phrase avec la normalisation de dyu-ci (normaliserBambara,
// qui remplace tout [^a-z0-9] par un espace et casse les apostrophes) :
// « oui c'est bon valide » → null au lieu de oui_valide, « c'est combien » →
// null. Règle : la normalisation s'applique avec la locale SERVIE (celle dont
// viennent les variantes), jamais avec la locale demandée. Tant qu'une locale
// n'a pas ses propres intentions validées finance, elle répond EXACTEMENT
// comme fr-ci sur ce corpus — apostrophes droites et courbes, accents,
// ponctuation, espaces insécables, majuscules compris.
console.log('\n[I18N-01] même grammaire d\'encaissement quelle que soit la locale demandée');
{
  const CORPUS_LOCALES = [
    "oui c'est bon valide", 'oui c’est bon valide', "c'est combien", 'c’est combien', 'oui valide ça', 'oui valide ca', 'Oui, valide !',
    'oui\u00a0valide', 'arrête', 'arrete', 'ça fait combien', 'non, pas valide', 'encaisse', 'on encaisse', 'termine la vente', 'combien elle doit ?',
    'elle doit combien', 'le total', 'oui', 'valide', 'ouais je valide', 'oui je valide pas', 'attends', 'pas encore', 'vends 3 tomates à 500 francs',
    "j'ai dépensé 1000 pour le taxi", 'oui validé', 'Encaisse !', 'ok valide', 'oui valide, non attends',
  ];
  const LOCALES_TEST = ['dyu-ci', 'bci', 'any', 'bm', 'xx-inconnue'];
  for (const loc of LOCALES_TEST) {
    const ecarts = CORPUS_LOCALES.filter((p) => detecterEncaissement(p, loc) !== detecterEncaissement(p, LOCALE_REFERENCE))
      .map((p) => `« ${p} » : ${String(detecterEncaissement(p, loc))} ≠ ${String(detecterEncaissement(p, LOCALE_REFERENCE))}`);
    ok(ecarts.length === 0, `${loc} : ${CORPUS_LOCALES.length} phrases, même intention qu'en fr-ci${ecarts.length ? ` — ${ecarts.join(' ; ')}` : ''}`);
    const ecartsLocal = CORPUS_LOCALES.filter((p) => JSON.stringify(intentLocal(p, loc)) !== JSON.stringify(intentLocal(p, LOCALE_REFERENCE)));
    ok(ecartsLocal.length === 0, `${loc} : intentLocal identique à fr-ci sur le corpus${ecartsLocal.length ? ` — ${ecartsLocal.join(' ; ')}` : ''}`);
  }
  // Une locale qui porte une normalisation mais aucune intention validée
  // finance ne doit pas l'appliquer aux intentions critiques : la
  // normalisation retournée pour ces intentions est celle de la locale servie.
  const { normaliserPourIntention } = await import('../runtime.js');
  for (const id of ['INT_OUI_VALIDE', 'INT_ANNULER_VALIDATION', 'INT_ENCAISSER', 'INT_COMBIEN_DOIT'] as IntentId[]) {
    const r = normaliserPourIntention(id, 'dyu-ci');
    ok(r.locale === LOCALE_REFERENCE && r.normaliser("c'est") === normaliserPour(LOCALE_REFERENCE)("c'est"),
      `${id} en dyu-ci : variantes ET normalisation servies par fr-ci (« c'est » → « ${r.normaliser("c'est").trim()} »)`);
  }
}

// ── Comportement : le runtime refuse un brouillon, même s'il est présent ────
console.log('\n[runtime] un brouillon financier n\'est jamais servi');
{
  const { enregistrerLocale } = await import('../registry.js');
  const { resoudreMessage, t } = await import('../runtime.js');
  const brouillon: VariantesIntention = { mode: 'phrase_entiere', phrases: ['awo a ka ɲi'] };
  enregistrerLocale({
    code: 'zz-test', nom: 'test', iso639_3: null, provisoire: true, formatNombre: 'fr-FR', fallback: 'fr-ci',
    messages: { TATA_MANQUE: { template: 'BROUILLON {montant}', validation: { linguistique: 'draft', finance: false } }, TATA_INVITE: { template: 'Invite test', validation: { linguistique: 'draft', finance: false } } },
    intents: { INT_OUI_VALIDE: { variantes: brouillon, validation: { linguistique: 'native_validated', finance: false } } },
    lexique: null, normaliser: null, parseurNombres: null, voix: null,
  });
  const r = resoudreMessage('TATA_MANQUE', { montant: 500 }, 'zz-test');
  ok(r.locale === 'fr-ci' && r.texte === t('TATA_MANQUE', { montant: 500 }, 'fr-ci'), 'message critique en brouillon → servi depuis fr-ci, texte fr-ci exact');
  const nonCritique = resoudreMessage('TATA_INVITE', {}, 'zz-test');
  ok(nonCritique.locale === 'zz-test' && nonCritique.texte === 'Invite test', 'un message NON critique en brouillon est servi (seul l\'argent est verrouillé)');
  const v = variantesIntention('INT_OUI_VALIDE' as IntentId, 'zz-test');
  ok(v !== null && v.locale === 'fr-ci', 'variantes critiques validées native mais finance=false → celles de fr-ci');
  ok(entreeTts('TATA_MANQUE')?.critiqueArgent === true && entreeIntent('INT_OUI_VALIDE')?.critiqueArgent === true, '(les deux entrées sont bien critiques au catalogue)');
}

console.log(echecs === 0 ? '\nCas argent : rien ne sort d\'un brouillon.' : `\n${echecs} échec(s).`);
if (echecs > 0) process.exit(1);
