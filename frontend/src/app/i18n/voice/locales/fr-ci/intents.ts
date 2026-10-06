/**
 * fr-ci — INTENTIONS (STT_INPUT) : ce que la marchande peut dire, en français.
 *
 * DEUX ORIGINES, JAMAIS DUPLIQUÉES :
 *  - l'ENCAISSEMENT : les variantes vivaient dans voice-offline/grammaireEncaissement.ts
 *    (VOIX-01/02). Elles ont DÉMÉNAGÉ ici, à l'identique — la grammaire lit
 *    désormais ces données via `variantesIntention(...)` et garde sa logique
 *    (annulation testée d'abord, liste blanche sur la phrase entière, etc.).
 *    Preuve : empreintesArgent.mts (empreinte `grammaire` inchangée).
 *  - le reste (vente, dépense, questions, réponses de ligne) : les listes
 *    restent dans leurs modules (vocabulaire.ts, grammaireCorrection.ts,
 *    intentionsCaisse.ts) et sont RÉFÉRENCÉES ici par import — une seule source.
 *
 * INT_OUI_VALIDE : liste blanche FERMÉE (décision de Patrick, 20/09/2026).
 * Chaque entrée est une réponse AUTONOME sous sa forme normalisée (minuscules,
 * sans accents, ponctuation aplatie). La phrase ENTIÈRE doit être l'une
 * d'elles. L'agrandir, c'est agrandir la surface par laquelle un bruit peut
 * payer. Même sévérité exigée de toute autre langue (validateCriticalMessages).
 *
 * VALIDATION : ces variantes sont celles du pilote, attaquées par 71 phrases
 * (VOIX-02) et mesurées sur appareil — `field_validated`, `finance: true`.
 */
import { INTENTIONS_MAP } from '../../../../voice-offline/vocabulaire';
import { MOTS_ANNULE, MOTS_CONFIRME, MOTS_ENCAISSE, MOTS_REFUS, MOTS_SUIVANT, MOTS_SUPPRIME, MOTS_TOTAL } from '../../../../services/grammaireCorrection';
import type { IntentId, IntentLocalise, Validation } from '../../types';

const PILOTE: Validation = { linguistique: 'field_validated', finance: true };
/** Lecture seule : pas d'écriture d'argent possible, mais on garde le même niveau de preuve. */
const PILOTE_LECTURE: Validation = { linguistique: 'field_validated', finance: true };

/** Mots de vocabulaire.ts qui mènent à une intention donnée (une seule source : INTENTIONS_MAP). */
const motsPour = (intention: string): readonly string[] =>
  Object.freeze(Object.entries(INTENTIONS_MAP).filter(([, i]) => i === intention).map(([mot]) => mot));

/**
 * Les listes de grammaireCorrection.ts sont des tableaux MUTABLES exportés ;
 * on en prend une copie figée au chargement, pour que personne ne puisse
 * modifier les variantes d'une intention en modifiant le tableau d'origine
 * (contre-audit du 20/09/2026). La source reste grammaireCorrection.ts.
 */
const fige = (mots: readonly string[]): readonly string[] => Object.freeze([...mots]);

export const INTENTS_FR_CI: Readonly<Record<IntentId, IntentLocalise>> = {
  // ── Encaissement — déménagé de grammaireEncaissement.ts (576fd62), à l'identique ──
  INT_ANNULER_VALIDATION: {
    // Large volontairement : abandonner ne coûte rien, se tromper en payant
    // coûte de l'argent. Le doute profite TOUJOURS au refus.
    variantes: { mode: 'motif', mots: fige(['non', 'annule', 'annuler', 'attends', 'attend', 'arrete', 'arreter', 'pas encore', 'laisse']) },
    validation: PILOTE,
  },
  INT_OUI_VALIDE: {
    variantes: {
      mode: 'phrase_entiere',
      phrases: [
        'oui valide',
        'oui je valide',
        'ouais valide',
        'ouais je valide',
        'valide oui',
        "oui c'est bon valide",
        'oui on valide',
        'oui valide ca',
      ],
    },
    validation: PILOTE,
  },
  INT_ENCAISSER: {
    // « encaisse » sous ses formes réellement dites, plus deux tournures
    // naturelles sans ambiguïté. Pas « fini », « c'est tout » ni « voilà »
    // seuls : mots de conversation ordinaire.
    variantes: { mode: 'motif', mots: fige(['encaisse', 'encaisser', 'encaissement', 'encaissons']), motifs: ['\\b(termine|terminer|finis|finir) (la )?vente\\b'] },
    validation: PILOTE,
  },
  INT_COMBIEN_DOIT: {
    // Lecture seule : plus accueillant, mais borné à la dette de la cliente et
    // au total du panier — jamais aux statistiques du jour.
    variantes: { mode: 'motif', motifs: ['\\bcombien (elle|il|la cliente|le client) doi(t|s)\\b', '\\belle doit combien\\b', '\\bil doit combien\\b', '\\bca fait combien\\b', "\\bc'est combien\\b", '\\b(le |mon |)total\\b'] },
    validation: PILOTE_LECTURE,
  },

  // ── Vente / dépense / questions — vocabulaire.ts (référence, non déménagé) ──
  INT_VENTE: { variantes: { mode: 'motif', mots: motsPour('vente') }, validation: PILOTE },
  INT_DEPENSE: { variantes: { mode: 'motif', mots: motsPour('depense') }, validation: PILOTE },
  INT_SOLDE: { variantes: { mode: 'motif', mots: motsPour('solde') }, validation: PILOTE_LECTURE },
  INT_CREDIT: { variantes: { mode: 'motif', mots: motsPour('credit') }, validation: PILOTE },
  INT_REMBOURSEMENT: { variantes: { mode: 'motif', mots: motsPour('remboursement') }, validation: PILOTE },
  INT_RECETTE: { variantes: { mode: 'motif', mots: motsPour('recette') }, validation: PILOTE_LECTURE },
  INT_REAPPRO: { variantes: { mode: 'motif', mots: motsPour('reappro') }, validation: PILOTE_LECTURE },

  // ── Réponses en confirmation de ligne — grammaireCorrection.ts (référence) ──
  INT_LIGNE_CONFIRMATION: { variantes: { mode: 'motif', mots: fige(MOTS_CONFIRME) }, validation: PILOTE },
  INT_LIGNE_REFUS: { variantes: { mode: 'motif', mots: fige(MOTS_REFUS) }, validation: PILOTE_LECTURE },
  INT_LIGNE_ANNULATION: { variantes: { mode: 'motif', mots: fige(MOTS_ANNULE) }, validation: PILOTE_LECTURE },
  INT_LIGNE_SUPPRESSION: { variantes: { mode: 'motif', mots: fige(MOTS_SUPPRIME) }, validation: PILOTE_LECTURE },
  INT_LIGNE_ARTICLE_SUIVANT: { variantes: { mode: 'motif', mots: fige(MOTS_SUIVANT) }, validation: PILOTE_LECTURE },
  INT_LIGNE_ENCAISSER: { variantes: { mode: 'motif', mots: fige(MOTS_ENCAISSE) }, validation: PILOTE },
  INT_LIGNE_CORRECTION_PRIX: { variantes: { mode: 'motif', mots: fige(MOTS_TOTAL) }, validation: PILOTE },

  // INT_LIGNE_CORRECTION_QUANTITE (nombre nu), INT_QUESTION_* (motifs dans
  // intentionsCaisse.ts) et INT_OUI / INT_NON (useVoiceCore.ts, agent E) n'ont
  // pas de liste de mots isolable : leur reconnaissance reste dans leur
  // module, documentée par `exemplesFR` au catalogue.
};
