/**
 * COUCHE I18N VOCALE — TYPES. Lot langues, 20/09/2026.
 *
 * DEUX CORPUS, JAMAIS MÉLANGÉS :
 *   - STT_INPUT  : ce que la marchande peut DIRE — une intention accepte
 *                  PLUSIEURS variantes par langue (`VariantesIntention`).
 *   - TTS_OUTPUT : ce que Tata RÉPOND — UNE formulation canonique par langue
 *                  et par message (`MessageLocalise.template`).
 * Un identifiant commence par `INT_` (entrée) ou par un préfixe de domaine
 * (`TATA_`, `CORE_`, `AUTH_`, `CLIP_`…) pour la sortie. Le validateur
 * `validateLocale` refuse un fichier `messages.ts` qui contiendrait un `INT_`,
 * et un `intents.ts` qui contiendrait autre chose.
 *
 * PARTAGE DES RESPONSABILITÉS (Patrick, 20/09/2026) — champ `owner` :
 *   - `claude` = texte structuré, intentions, clés stables, variables, type,
 *     `critiqueArgent`, logique de déclenchement, moteur, garde-fous.
 *   - `manus`  = langues naturelles : `frMarche`, traductions, variantes
 *     naturelles STT, et TOUTE la voix (choix de voix, enregistrements, TTS,
 *     clips, packs, prosodie, association langue → voix).
 *   Quand une entrée porte les deux (c'est le cas général : un identifiant
 *   posé par Claude, un contenu remplissable par Manus), `owner` désigne la
 *   partie ÉDITABLE PAR MANUS. Les champs qui restent à Claude quel que soit
 *   `owner` sont listés dans `CHAMPS_CLAUDE` : les changer est une décision
 *   d'ingénierie, pas de langue.
 *
 * CODES DE LANGUE — PROVISOIRES. Plusieurs variétés ne sont pas tranchées
 * (Sénoufo : cebaara/nyarafolo/tagwana ; Bété : gagnoa/daloa/guiberoua ;
 * Dan : blowo/yacouba ; Wê/Guéré : wobé/guéré). On ne FIGE PAS un faux code
 * normalisé : `LocaleCode` est une chaîne libre validée par `registry`, et
 * `LOCALES_PROVISOIRES` documente pour chaque code s'il est ISO 639-3 ou un
 * marqueur de travail à confirmer par Patrick et Manus. Aucun composant
 * métier ne lit un code de langue : il appelle `t(id, vars)` et
 * `detecterIntention(...)`, la langue active est un réglage.
 */

// ── Identifiants ───────────────────────────────────────────────────────────

/** Identifiant stable d'un message TTS (sortie). Ex. `TATA_MANQUE`, `CORE_WAIT_01`, `CLIP_UI_128`. */
export type MessageId = string;
/** Identifiant stable d'une intention STT (entrée). Toujours préfixé `INT_`. */
export type IntentId = `INT_${string}`;

/** Un code de locale — provisoire tant que `LOCALES_PROVISOIRES` le dit. */
export type LocaleCode = string;

/** La locale de référence et de repli : le français tel qu'il est dit aujourd'hui. */
export const LOCALE_REFERENCE: LocaleCode = 'fr-ci';

export type Owner = 'claude' | 'manus';

/**
 * Champs d'une entrée du catalogue qui restent à Claude, même quand
 * `owner === 'manus'` : ils définissent la STRUCTURE (identité, variables,
 * criticité, déclenchement), pas la langue.
 */
export const CHAMPS_CLAUDE = ['id', 'type', 'domaine', 'critiqueArgent', 'variables', 'action', 'source'] as const;

// ── Domaines ───────────────────────────────────────────────────────────────

export type Domaine =
  | 'caisse' | 'vente' | 'questions_caisse' | 'credit' | 'stock' | 'depense'
  | 'moteur_vocal' | 'auth' | 'marchand_autre' | 'producteur' | 'cooperative'
  | 'wallet' | 'partage' | 'backoffice' | 'academy' | 'marketplace' | 'contexte' | 'pages' | 'guidage' | 'autre';

// ── Catalogue : TTS_OUTPUT ─────────────────────────────────────────────────

/**
 * Comment le message est produit AUJOURD'HUI (fait constaté, pas un choix) :
 *  - `clip`    : un clip Tata existe pour ce texte exact (tataUiClips,
 *                tataVoice, onboardingVoix) ;
 *  - `dynamic` : la phrase porte des variables, aucun clip ne peut la couvrir ;
 *  - `none`    : phrase fixe sans clip connu (synthèse ou silence selon l'appareil).
 * L'association langue → voix et le choix du rendu appartiennent à Manus
 * (voir `contrat-audio.ts`) ; ce champ ne décide rien.
 */
export type AudioMode = 'clip' | 'dynamic' | 'none';

/**
 * Statut d'INTÉGRATION côté code (pas de validation linguistique — celle-ci
 * vit dans chaque locale, voir `Validation`) :
 *  - `migre`     : le code lit cette clé via `t()` / `speakMessage()` ;
 *  - `a_migrer`  : la phrase est encore en dur dans le code (fichier `source`) ;
 *  - `reference` : corpus existant (clip enregistré, script à enregistrer)
 *                  référencé tel quel, joué par son propre chemin.
 */
export type StatutIntegration = 'migre' | 'a_migrer' | 'reference';

export interface EntreeTts {
  id: MessageId;
  type: 'tts';
  domaine: Domaine;
  critiqueArgent: boolean;
  /** Texte EXACT tel que le code le dit aujourd'hui, variables entre accolades. */
  frActuel: string;
  /** Français « marché » — reformulation naturelle. TOUJOURS `null` côté Claude : Manus. */
  frMarche: string | null;
  /** Variables du gabarit, dans l'ordre d'apparition. Un gabarit localisé doit toutes les porter. */
  variables: readonly string[];
  audioMode: AudioMode;
  statut: StatutIntegration;
  owner: Owner;
  /** D'où vient la phrase : `fichier:ligne` sur la base du lot, ou l'id d'origine (AUTH_01, ui-128). */
  source: string;
  /** Note d'ingénierie (composition, limite, jumeau affiché…). */
  note?: string;
}

// ── Catalogue : STT_INPUT ──────────────────────────────────────────────────

export interface EntreeIntent {
  id: IntentId;
  type: 'stt_intent';
  domaine: Domaine;
  /** Valeur métier rendue au moteur (ex. `encaisser`, `oui_valide`, `vendre`). */
  action: string;
  critiqueArgent: boolean;
  /** Exemples FR issus du code et de ses tests — documentation, PAS le corpus runtime (voir `intents.ts` de chaque locale). */
  exemplesFR: readonly string[];
  owner: Owner;
  source: string;
  note?: string;
}

export type EntreeCatalogue = EntreeTts | EntreeIntent;

// ── Locales : validation ───────────────────────────────────────────────────

/**
 * Statut de validation d'un contenu LINGUISTIQUE, par langue et par entrée.
 *  - `draft`            : proposé (par Manus ou par extraction) — jamais activé sur un cas d'argent ;
 *  - `native_validated` : validé par une locutrice native ;
 *  - `field_validated`  : validé sur le terrain, au marché.
 * `finance` : vrai SEULEMENT si une variante/formulation critique argent a été
 * explicitement validée pour l'argent. Le runtime refuse d'activer une variante
 * STT critique dont `finance !== true` (repli tracé vers `fr-ci`).
 */
export interface Validation {
  linguistique: 'draft' | 'native_validated' | 'field_validated';
  finance: boolean;
}

/** Un message TTS dans une langue : UNE formulation canonique. */
export interface MessageLocalise {
  template: string;
  validation: Validation;
}

/**
 * Variantes STT d'une intention dans une langue.
 *  - `phrase_entiere` : LISTE BLANCHE FERMÉE — la phrase ENTIÈRE normalisée doit
 *    être l'une des `phrases` (réponses autonomes). C'est le mode OBLIGATOIRE de
 *    `INT_OUI_VALIDE` dans TOUTES les langues (gate `validateCriticalMessages`).
 *  - `motif` : `mots` (mots ou expressions entières, bornés `\b…\b`) et/ou `motifs`
 *    (sources d'expressions régulières, réservées à l'ingénierie).
 */
export type VariantesIntention =
  | { mode: 'phrase_entiere'; phrases: readonly string[] }
  | { mode: 'motif'; mots?: readonly string[]; motifs?: readonly string[] };

export interface IntentLocalise {
  variantes: VariantesIntention;
  validation: Validation;
}

// ── Locales : lexique ──────────────────────────────────────────────────────

/**
 * Lexique d'une langue : identifiants métier STABLES → formes entendues.
 * L'identifiant n'est jamais un libellé (`tomato`/`tomate` est un `productId`,
 * pas un mot) ; une langue peut donner plusieurs formes au même identifiant.
 */
export interface Lexique {
  /** productId → formes entendues (singulier, pluriel, variantes locales). */
  produits: Readonly<Record<string, readonly string[]>>;
  /** unitId (graphie canonique de la boutique) → formes entendues. */
  unites: Readonly<Record<string, readonly string[]>>;
  /** Nombres : mot → valeur (unités, dizaines, exceptions) et mots d'échelle. */
  nombres: {
    mots: Readonly<Record<string, number>>;
    /** Mots d'échelle (cent, mille…) → multiplicateur. */
    echelles: Readonly<Record<string, number>>;
    /** Connecteurs ignorés dans une suite numérique (« et », « ni »). */
    connecteurs: readonly string[];
  };
  monnaie: {
    /** Forme DITE de la devise (« francs ») — variable implicite `{devise}` des gabarits. */
    parlee: string;
    /** Symbole AFFICHÉ (« F ») — variable implicite `{symboleDevise}`. */
    symbole: string;
    /** Marqueurs qui font d'un nombre un montant (avant / après). */
    marqueursAvant: readonly string[];
    marqueursApres: readonly string[];
    /** Valeur de coupure → nom dit (« dix mille »). */
    coupures: Readonly<Record<number, string>>;
    /** Unité monétaire orale locale et son facteur (dɔrɔmɛ = 5 F), s'il y en a une. */
    uniteOrale?: { formes: readonly string[]; facteur: number };
  };
  /** Verbes et mots métier → action (vendu → vente, acheté → depense…). */
  verbesMetier: Readonly<Record<string, string>>;
  /** Unité DITE après un choix tactile (« au tas », « au kilo »). */
  unitesDites: Readonly<Record<string, string>>;
}

// ── Manifest de langue ─────────────────────────────────────────────────────

export interface ManifestLocale {
  code: LocaleCode;
  /** Nom tel qu'on le montre (dans la langue elle-même quand Manus l'aura donné). */
  nom: string;
  /** Code ISO 639-3 sous-jacent si connu, sinon `null` (variété non tranchée). */
  iso639_3: string | null;
  /** Vrai tant que le code n'est pas confirmé par Patrick/Manus. */
  provisoire: boolean;
  /** Étiquette BCP-47 utilisée pour formater les nombres (`toLocaleString`). */
  formatNombre: string;
  /** Locale de repli quand un message ou une intention manque (toujours tracé). */
  fallback: LocaleCode | null;
  messages: Readonly<Record<MessageId, MessageLocalise>>;
  intents: Readonly<Record<IntentId, IntentLocalise>>;
  lexique: Lexique | null;
  /** Normalisation STT propre à la langue (minuscules, accents, ponctuation) ; `null` = celle de `fr-ci`. */
  normaliser?: ((texte: string) => string) | null;
  /**
   * Parseur de nombres de la langue (« mille cinq » → 1500, « kɛmɛ saba » →
   * 300). `null` = aucun ; le français reste dans voice-offline/extraction.ts.
   * Un parseur déclaré ici n'est branché sur la vente que quand la locale est
   * validée pour l'argent — sinon il n'est qu'une référence.
   */
  parseurNombres?: ((texte: string) => number | null) | null;
  /**
   * Emplacement RÉSERVÉ à Manus : association langue → voix. Vide côté Claude,
   * y compris pour `fr-ci` (le rendu actuel est le chemin `speak` existant,
   * voir `contrat-audio.ts`). Forme libre, jamais lue par le moteur métier.
   */
  voix: Readonly<Record<string, unknown>> | null;
}

/** Trace d'un repli — remise au journal d'observabilité. */
export interface TraceFallback {
  type: 'message' | 'intent' | 'lexique';
  id: string;
  localeDemandee: LocaleCode;
  localeServie: LocaleCode;
  /** Pourquoi : absent, ou présent mais non validé pour l'argent. */
  raison: 'absent' | 'non_valide_finance' | 'locale_inconnue';
}
