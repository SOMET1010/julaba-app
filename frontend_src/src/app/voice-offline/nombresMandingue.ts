/**
 * Nombres MANDINGUE → chiffres (inclusion, langue — docs/INCLUSION.md §2.1).
 * Module PUR, sans React ni DOM, testable au tsx.
 *
 * DOCTRINE (Patrick, 21/09/2026) — changement de cadre :
 * on ne construit plus un « parseur bambara tolérant au dioula ». On construit
 * un PARSEUR MANDINGUE DE MARCHÉ, dont le DIOULA VÉHICULAIRE IVOIRIEN est une
 * VARIÉTÉ DE PREMIER RANG — au même titre que le bambara de Bamako, pas en
 * rattrapage. C'est ce qui colle à Tantie Nanti Lou et à l'usage d'Abidjan.
 *
 * Le fichier s'appelait `nombresBambara.ts` : ce nom portait une hypothèse
 * devenue fausse. Renommé par décision de Patrick, dans un commit purement
 * structurel — mêmes exports, mêmes tests, aucun changement de logique.
 *
 * ── ORGANISATION ──────────────────────────────────────────────────────────
 *  1. NOYAU MANDINGUE : les formes communes aux deux variétés
 *     (kelen 1 · fila 2 · saba 3 · naani 4 · wɔɔrɔ 6 · tan 10 · mugan 20 ·
 *      kɛmɛ 100). Là-dessus, Bamako et Abidjan ne divergent pas.
 *  2. VARIÉTÉS RÉGIONALES : là où l'on diverge (duuru / looru pour 5,
 *     kɔnɔntɔn / kɔnɔtɔ pour 9, …), chaque forme est déclarée séparément.
 *
 * CONVENTION DE DONNÉES (Patrick) — `forme, valeur, rôle, variété, source[, note]` :
 *   • la VARIÉTÉ dit OÙ c'est parlé      (`mandingue`, `bambara`, `dioula-ci`) ;
 *   • la SOURCE dit QUI l'atteste         (`bambara-existant`, `omniglot`,
 *     `coulibaly-haraguchi-1993`, `mandenkan`).
 * Une MÊME FORME peut avoir PLUSIEURS ENTRÉES, une par variété (ou par source)
 * où elle est attestée : `duuru` est attesté côté bambara ET listé comme
 * variante dioula. On ne prétend jamais qu'une forme appartient exclusivement
 * à une seule variété. Une forme SANS SOURCE ATTESTÉE n'entre pas dans la table.
 * Tout ceci est de la TRAÇABILITÉ : la valeur lue par le parseur ne dépend que
 * de `forme` → `valeur`/`rôle`. Variété et source ne changent aucun résultat.
 *
 * ── COMPOSITION (inchangée) ───────────────────────────────────────────────
 *   « ni » relie : tan ni kelen = 11 · mugan ni fila = 22 ·
 *   bi X = dizaines (bi saba = 30) · kɛmɛ saba ni bi duuru ni duuru = 355.
 *
 * ── EXCLUSION VOLONTAIRE, À NE PAS « COMPLÉTER » ──────────────────────────
 *   `dɔ` n'est pas enregistré comme forme numérique autonome en raison de son
 *   emploi grammatical non numérique et du risque de faux positifs.
 *   (En mandingue `dɔ` est l'indéfini : « un certain », « quelqu'un », « de
 *   l'un d'eux ». En faire un numéral universel ferait lire un montant dans
 *   des phrases entières — et sur une caisse, un montant lu est un montant
 *   encaissé. Si quelqu'un veut l'ajouter « par complétude » : non.)
 *
 * ── CE QUI PRIME SUR TOUTE COUVERTURE LINGUISTIQUE ────────────────────────
 *   « La grammaire tranche, sinon on demande. » Enrichir ce lexique ajoute des
 *   FORMES RECONNUES ; cela ne crée AUCUNE INFÉRENCE nouvelle. Une expression
 *   ambiguë reste ambiguë et remonte à la grammaire, qui demandera.
 *
 * Piège culturel MAJEUR (argent) : au marché, les prix se disent souvent en
 * DƆRƆMƐ (1 dɔrɔmɛ = 5 FCFA). « dɔrɔmɛ kɛmɛ » = 100 dɔrɔmɛ = 500 FCFA.
 * Si le mot apparaît, le total est multiplié par 5.
 *
 * Limite v1 assumée : les multiplicateurs composés (« ba tan ni fila » pour
 * 12 000) sont ambigus en lecture linéaire — hors périmètre, couvert par un
 * test « piège » documenté.
 */

/** Où la forme est parlée. `mandingue` = commune aux deux variétés. */
export type VarieteMandingue = 'mandingue' | 'bambara' | 'dioula-ci';

/** Qui atteste la forme. Pas de source → pas d'entrée. */
export type SourceLexicale =
  | 'bambara-existant'
  | 'omniglot'
  | 'coulibaly-haraguchi-1993'
  | 'mandenkan';

/** Ce que la forme fait dans la phrase (c'est le seul champ que le parseur lit). */
export type RoleNumeral =
  | 'unite' | 'tan' | 'mugan' | 'keme' | 'mille' | 'bi' | 'dorome';

/** Une attestation : une forme, dans une variété, par une source. */
export interface EntreeLexicale {
  /** Forme DÉJÀ NORMALISÉE (voir `normaliserBambara`). */
  readonly forme: string;
  /** Valeur scalaire portée par la forme (dɔrɔmɛ : 5 FCFA la pièce). */
  readonly valeur: number;
  readonly role: RoleNumeral;
  readonly variete: VarieteMandingue;
  readonly source: SourceLexicale;
  readonly note?: string;
}

/**
 * NOYAU MANDINGUE — identiques des deux côtés, Bamako comme Abidjan.
 * Rien à arbitrer ici : ces formes ne divergent pas.
 */
const NOYAU_MANDINGUE: readonly EntreeLexicale[] = [
  { forme: 'kelen', valeur: 1, role: 'unite', variete: 'mandingue', source: 'bambara-existant' },
  { forme: 'fila', valeur: 2, role: 'unite', variete: 'mandingue', source: 'bambara-existant' },
  { forme: 'saba', valeur: 3, role: 'unite', variete: 'mandingue', source: 'bambara-existant' },
  { forme: 'naani', valeur: 4, role: 'unite', variete: 'mandingue', source: 'bambara-existant' },
  { forme: 'wooro', valeur: 6, role: 'unite', variete: 'mandingue', source: 'bambara-existant' },
  { forme: 'tan', valeur: 10, role: 'tan', variete: 'mandingue', source: 'bambara-existant' },
  { forme: 'mugan', valeur: 20, role: 'mugan', variete: 'mandingue', source: 'bambara-existant' },
  { forme: 'keme', valeur: 100, role: 'keme', variete: 'mandingue', source: 'bambara-existant' },
  { forme: 'bi', valeur: 10, role: 'bi', variete: 'mandingue', source: 'bambara-existant', note: 'Marque des dizaines : bi saba = 30.' },
];

/**
 * VARIÉTÉ BAMBARA (Bamako) — l'acquis du module, conservé INTÉGRALEMENT.
 * Aucune de ces formes n'est retirée : une marchande de Bamako reste comprise.
 */
const VARIANTES_BAMBARA: readonly EntreeLexicale[] = [
  { forme: 'kele', valeur: 1, role: 'unite', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'fla', valeur: 2, role: 'unite', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'filla', valeur: 2, role: 'unite', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'sabaa', valeur: 3, role: 'unite', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'nani', valeur: 4, role: 'unite', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'duuru', valeur: 5, role: 'unite', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'duru', valeur: 5, role: 'unite', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'woro', valeur: 6, role: 'unite', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'wooroo', valeur: 6, role: 'unite', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'wolonwula', valeur: 7, role: 'unite', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'wolonwla', valeur: 7, role: 'unite', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'wolonfila', valeur: 7, role: 'unite', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'wolonfla', valeur: 7, role: 'unite', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'seegin', valeur: 8, role: 'unite', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'segin', valeur: 8, role: 'unite', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'segi', valeur: 8, role: 'unite', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'seeguin', valeur: 8, role: 'unite', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'kononton', valeur: 9, role: 'unite', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'konoton', valeur: 9, role: 'unite', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'konondon', valeur: 9, role: 'unite', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'ta', valeur: 10, role: 'tan', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'muga', valeur: 20, role: 'mugan', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'kemee', valeur: 100, role: 'keme', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'ba', valeur: 1000, role: 'mille', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'waa', valeur: 1000, role: 'mille', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'wa', valeur: 1000, role: 'mille', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'waga', valeur: 1000, role: 'mille', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'bii', valeur: 10, role: 'bi', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'dorome', valeur: 5, role: 'dorome', variete: 'bambara', source: 'bambara-existant', note: '1 dɔrɔmɛ = 5 FCFA — unité de compte du marché.' },
  { forme: 'doromee', valeur: 5, role: 'dorome', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'doromi', valeur: 5, role: 'dorome', variete: 'bambara', source: 'bambara-existant' },
  { forme: 'drome', valeur: 5, role: 'dorome', variete: 'bambara', source: 'bambara-existant' },
];

/**
 * VARIÉTÉ DIOULA DE CÔTE D'IVOIRE (dyu-ci) — premier rang, pas un rattrapage.
 *
 * Sources :
 *   • `omniglot`                  — série numérale dioula ;
 *   • `coulibaly-haraguchi-1993`  — Moussa Coulibaly & Haraguchi Takehiko,
 *     « Lexique du dioula », 1 119 mots dont 570 issus de leçons données à
 *     ABIDJAN entre 1988 et 1990, relu par un chercheur dioulaphone de
 *     l'Institut de Linguistique Appliquée ;
 *   • `mandenkan`                 — « Lexique du Dioula de Côte d'Ivoire ».
 *
 * Plusieurs entrées pour une même forme = plusieurs attestations indépendantes.
 * `duuru` figure ici AUSSI : il est listé côté dioula, sans cesser d'être
 * bambara. Aucune exclusivité n'est revendiquée dans un sens ni dans l'autre.
 */
const VARIANTES_DIOULA_CI: readonly EntreeLexicale[] = [
  // 5 — la divergence la mieux documentée : Bamako duuru / Abidjan looru.
  { forme: 'looru', valeur: 5, role: 'unite', variete: 'dioula-ci', source: 'omniglot' },
  { forme: 'looru', valeur: 5, role: 'unite', variete: 'dioula-ci', source: 'coulibaly-haraguchi-1993' },
  { forme: 'looru', valeur: 5, role: 'unite', variete: 'dioula-ci', source: 'mandenkan' },
  { forme: 'duuru', valeur: 5, role: 'unite', variete: 'dioula-ci', source: 'omniglot', note: 'Également listée côté dioula : une forme n’appartient pas à une seule variété.' },
  // 7 — wolonfila, et wolonvila (le « v » que l'on retrouve dans biwolonvila = 70).
  { forme: 'wolonfila', valeur: 7, role: 'unite', variete: 'dioula-ci', source: 'coulibaly-haraguchi-1993' },
  { forme: 'wolonvila', valeur: 7, role: 'unite', variete: 'dioula-ci', source: 'coulibaly-haraguchi-1993', note: 'Forme séparée correspondant à biwolonvila (70).' },
  // 8
  { forme: 'seegi', valeur: 8, role: 'unite', variete: 'dioula-ci', source: 'omniglot' },
  { forme: 'seegi', valeur: 8, role: 'unite', variete: 'dioula-ci', source: 'coulibaly-haraguchi-1993' },
  // 9 — kɔnɔtɔ (normalisé « konoto ») à côté du bambara kɔnɔntɔn.
  { forme: 'konoto', valeur: 9, role: 'unite', variete: 'dioula-ci', source: 'omniglot' },
  { forme: 'konoto', valeur: 9, role: 'unite', variete: 'dioula-ci', source: 'coulibaly-haraguchi-1993' },
  // 1000
  { forme: 'waga', valeur: 1000, role: 'mille', variete: 'dioula-ci', source: 'omniglot' },
  { forme: 'baa', valeur: 1000, role: 'mille', variete: 'dioula-ci', source: 'omniglot' },
];

/**
 * LE LEXIQUE — noyau mandingue, puis variétés régionales.
 * Exporté pour l'audit : on doit pouvoir demander au module « d'où sort cette
 * forme ? » et obtenir une variété et une source.
 */
export const LEXIQUE_MANDINGUE: readonly EntreeLexicale[] = [
  ...NOYAU_MANDINGUE,
  ...VARIANTES_BAMBARA,
  ...VARIANTES_DIOULA_CI,
];

/** forme → (valeur, rôle). Construit depuis le lexique : une seule source de vérité. */
const PAR_FORME: ReadonlyMap<string, { valeur: number; role: RoleNumeral }> = (() => {
  const m = new Map<string, { valeur: number; role: RoleNumeral }>();
  for (const e of LEXIQUE_MANDINGUE) {
    const deja = m.get(e.forme);
    // Une forme attestée plusieurs fois doit rester CONSISTANTE : même valeur,
    // même rôle. Une contradiction serait une erreur de saisie, pas un choix.
    if (deja && (deja.valeur !== e.valeur || deja.role !== e.role)) {
      throw new Error(`Lexique mandingue incohérent pour « ${e.forme} »`);
    }
    if (!deja) m.set(e.forme, { valeur: e.valeur, role: e.role });
  }
  return m;
})();

/**
 * DIZAINES ATTACHÉES — étape de FORME, séparée du lexique.
 *
 * Le dioula écrit souvent la dizaine collée à son unité (`bilooru` = 50). On
 * rabat ces formes sur la forme séparée (`bi looru`) AVANT l'analyse, sans
 * dupliquer la moindre entrée du lexique : ce n'est pas un mot de plus, c'est
 * la même suite écrite autrement.
 *
 * La table est EXPLICITE et close, volontairement : une règle générique
 * « bi + n'importe quelle unité » découperait des mots ordinaires
 * (« bitiki » = boutique) et fabriquerait des montants. On ne détache que ce
 * qui est attesté.
 */
const DIZAINES_ATTACHEES: Readonly<Record<string, string>> = {
  bisaba: 'bi saba',            // 30
  binaani: 'bi naani',          // 40
  bilooru: 'bi looru',          // 50
  biwooro: 'bi wooro',          // 60  (biwɔɔrɔ)
  biwolonvila: 'bi wolonvila',  // 70  (noter le « v »)
  biseegi: 'bi seegi',          // 80
  bisegin: 'bi segin',          // 80
  bikonoto: 'bi konoto',        // 90  (bikɔnɔtɔ)
};

/** Minuscules, sans accents/diacritiques, lettres spéciales rabattues (ɛ→e, ɔ→o, ŋ→n). */
export function normaliserBambara(s: string): string {
  return s
    .toLowerCase()
    .replace(/ɛ/g, 'e')
    .replace(/ɔ/g, 'o')
    .replace(/ŋ/g, 'n')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Détache les dizaines attachées attestées (`bilooru` → `bi looru`).
 * S'applique APRÈS `normaliserBambara`, mot par mot, et ne touche à rien
 * d'autre : un mot absent de la table ressort tel quel.
 */
export function detacherDizainesAttachees(texte: string): string {
  return texte
    .split(' ')
    .map(mot => DIZAINES_ATTACHEES[mot] ?? mot)
    .join(' ');
}

/** Normalisation complète avant analyse : orthographe, puis forme. */
function preparer(texte: string): string[] {
  return detacherDizainesAttachees(normaliserBambara(texte)).split(' ').filter(Boolean);
}

type Jeton =
  | { type: 'unite'; valeur: number }
  | { type: 'tan' } | { type: 'mugan' }
  | { type: 'keme' } | { type: 'mille' } | { type: 'bi' }
  | { type: 'dorome' } | { type: 'ni' }
  | { type: 'chiffres'; valeur: number };

const CONNECTEUR = new Set(['ni']); // « et »

function lireJeton(mot: string): Jeton | null {
  const e = PAR_FORME.get(mot);
  if (e) {
    return e.role === 'unite' ? { type: 'unite', valeur: e.valeur } : { type: e.role };
  }
  if (CONNECTEUR.has(mot)) return { type: 'ni' };
  if (/^\d+$/.test(mot)) return { type: 'chiffres', valeur: parseInt(mot, 10) };
  return null;
}

/** Multiplicateur simple accepté après une échelle (kɛmɛ saba, ba tan, waa mugan). */
function multiplicateur(j: Jeton | undefined): number | null {
  if (!j) return null;
  if (j.type === 'unite') return j.valeur;
  if (j.type === 'tan') return 10;
  if (j.type === 'mugan') return 20;
  return null;
}

/**
 * Extrait LE nombre exprimé en mandingue (ou en chiffres) dans un texte.
 * Renvoie null si aucun nombre n'est trouvé. En présence de dɔrɔmɛ, le
 * résultat est CONVERTI en FCFA (× 5).
 *
 * Les mots non numériques sont ignorés : on parse la PLUS LONGUE suite
 * numérique contiguë (les « ni » ne comptent que s'ils relient deux parties
 * numériques).
 */
export function extraireNombreBambara(texte: string): number | null {
  const mots = preparer(texte);
  const jetons: (Jeton | null)[] = mots.map(lireJeton);

  // Découpe en SUITES numériques contiguës (un « ni » n'est gardé que s'il est
  // entouré de jetons numériques — « ni » est aussi un mot ordinaire du bambara).
  const suites: Jeton[][] = [];
  let courante: Jeton[] = [];
  for (let i = 0; i < jetons.length; i++) {
    const j = jetons[i];
    const estNum = j !== null && j.type !== 'ni';
    const estNiValide = j !== null && j.type === 'ni'
      && courante.length > 0
      && jetons[i + 1] !== null && jetons[i + 1]?.type !== 'ni';
    if (estNum || estNiValide) courante.push(j as Jeton);
    else if (courante.length > 0) { suites.push(courante); courante = []; }
  }
  if (courante.length > 0) suites.push(courante);
  if (suites.length === 0) return null;

  // La plus longue suite porte le nombre (montant dicté au milieu d'une phrase).
  const suite = suites.reduce((a, b) => (b.length > a.length ? b : a));

  let total = 0;
  let enDorome = false;
  let aLuUnNombre = false;
  for (let i = 0; i < suite.length; i++) {
    const j = suite[i];
    switch (j.type) {
      case 'ni': break;
      case 'dorome': enDorome = true; break;
      case 'chiffres': {
        // « 12 500 » arrive parfois en deux groupes (12, 500) : on RECOLLE les
        // groupes adjacents quand le suivant fait exactement 3 chiffres (usage
        // des séparateurs de milliers), sinon on additionne comme deux nombres.
        let v = j.valeur;
        while (i + 1 < suite.length && suite[i + 1].type === 'chiffres') {
          const nxt = suite[i + 1] as { type: 'chiffres'; valeur: number };
          if (nxt.valeur < 1000 && v >= 1) {
            v = v * 1000 + nxt.valeur;
            i++;
          } else break;
        }
        total += v;
        aLuUnNombre = true;
        break;
      }
      case 'unite': total += j.valeur; aLuUnNombre = true; break;
      case 'tan': total += 10; aLuUnNombre = true; break;
      case 'mugan': total += 20; aLuUnNombre = true; break;
      case 'bi': {
        // bi + unité obligatoire (bi saba = 30). « bi » seul est ignoré.
        const m = multiplicateur(suite[i + 1]);
        if (m !== null && m <= 9) { total += 10 * m; i++; aLuUnNombre = true; }
        break;
      }
      case 'keme': {
        const m = multiplicateur(suite[i + 1]);
        if (m !== null) { total += 100 * m; i++; } else total += 100;
        aLuUnNombre = true;
        break;
      }
      case 'mille': {
        const m = multiplicateur(suite[i + 1]);
        if (m !== null) { total += 1000 * m; i++; } else total += 1000;
        aLuUnNombre = true;
        break;
      }
    }
  }
  if (!aLuUnNombre) return null;
  return enDorome ? total * 5 : total;
}

/** Vrai si le texte contient au moins un mot numérique mandingue (hors chiffres). */
export function contientNombreBambara(texte: string): boolean {
  return preparer(texte).some(m => {
    const j = lireJeton(m);
    return j !== null && j.type !== 'ni' && j.type !== 'chiffres';
  });
}
