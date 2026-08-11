/**
 * Nombres BAMBARA → chiffres (inclusion, langue — docs/INCLUSION.md §2.1).
 * Module PUR, sans React ni DOM, testable au tsx.
 *
 * Décision du 11/08/2026 : bambara prioritaire (bien documenté), dioula en
 * suspens. Les deux langues mandingues sont très proches : ce parseur servira
 * de base au dioula. Il se branche sur la SORTIE du moteur vocal (sherpa) —
 * quand le modèle bambara sera embarqué, la phrase transcrite passera ici.
 *
 * Système numéral bamanankan couvert :
 *   kelen 1 · fila 2 · saba 3 · naani 4 · duuru 5 · wɔɔrɔ 6 · wolonwula 7 ·
 *   seegin 8 · kɔnɔntɔn 9 · tan 10 · mugan 20 · bi X (dizaines : bi saba 30) ·
 *   kɛmɛ 100 · ba / waa 1000 · « ni » (et) relie les parties :
 *   kɛmɛ saba ni bi duuru ni duuru = 355.
 *
 * Piège culturel MAJEUR (argent) : au marché, les prix se disent souvent en
 * DƆRƆMƐ (1 dɔrɔmɛ = 5 FCFA). « dɔrɔmɛ kɛmɛ » = 100 dɔrɔmɛ = 500 FCFA.
 * Si le mot apparaît, le total est multiplié par 5.
 *
 * Limite v1 assumée : les multiplicateurs composés (« ba tan ni fila » pour
 * 12 000) sont ambigus en lecture linéaire — hors périmètre, couvert par un
 * test « piège » documenté.
 */

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

// Unités (avec variantes orales/orthographiques courantes, déjà normalisées).
const UNITES: Record<string, number> = {
  kelen: 1, kele: 1,
  fila: 2, fla: 2, filla: 2,
  saba: 3, sabaa: 3,
  naani: 4, nani: 4,
  duuru: 5, duru: 5,
  wooro: 6, woro: 6, wooroo: 6,
  wolonwula: 7, wolonwla: 7, wolonfila: 7, wolonfla: 7,
  seegin: 8, segin: 8, segi: 8, seeguin: 8,
  kononton: 9, konoton: 9, konondon: 9,
};

// Nombres « pleins » utilisables seuls ou comme multiplicateur simple.
const TAN = new Set(['tan', 'ta']);       // 10
const MUGAN = new Set(['mugan', 'muga']); // 20

// Échelles : mot × multiplicateur (simple) qui le SUIT.
const KEME = new Set(['keme', 'kemee']);          // 100
const MILLE = new Set(['ba', 'waa', 'waga', 'wa']); // 1000 (deux usages régionaux)
const BI = new Set(['bi', 'bii']);                // dizaines : bi saba = 30

// Dɔrɔmɛ : unité monétaire orale = 5 FCFA.
const DOROME = new Set(['dorome', 'doromee', 'doromi', 'drome']);

const CONNECTEUR = new Set(['ni']); // « et »

type Jeton =
  | { type: 'unite'; valeur: number }
  | { type: 'tan' } | { type: 'mugan' }
  | { type: 'keme' } | { type: 'mille' } | { type: 'bi' }
  | { type: 'dorome' } | { type: 'ni' }
  | { type: 'chiffres'; valeur: number };

function lireJeton(mot: string): Jeton | null {
  if (mot in UNITES) return { type: 'unite', valeur: UNITES[mot] };
  if (TAN.has(mot)) return { type: 'tan' };
  if (MUGAN.has(mot)) return { type: 'mugan' };
  if (KEME.has(mot)) return { type: 'keme' };
  if (MILLE.has(mot)) return { type: 'mille' };
  if (BI.has(mot)) return { type: 'bi' };
  if (DOROME.has(mot)) return { type: 'dorome' };
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
 * Extrait LE nombre exprimé en bambara (ou en chiffres) dans un texte.
 * Renvoie null si aucun nombre n'est trouvé. En présence de dɔrɔmɛ, le
 * résultat est CONVERTI en FCFA (× 5).
 *
 * Les mots non numériques sont ignorés : on parse la PLUS LONGUE suite
 * numérique contiguë (les « ni » ne comptent que s'ils relient deux parties
 * numériques).
 */
export function extraireNombreBambara(texte: string): number | null {
  const mots = normaliserBambara(texte).split(' ').filter(Boolean);
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

/** Vrai si le texte contient au moins un mot numérique bambara (hors chiffres). */
export function contientNombreBambara(texte: string): boolean {
  return normaliserBambara(texte).split(' ').some(m => {
    const j = lireJeton(m);
    return j !== null && j.type !== 'ni' && j.type !== 'chiffres';
  });
}
