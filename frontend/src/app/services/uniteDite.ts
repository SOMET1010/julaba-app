/**
 * L'UNITÉ QU'ELLE VIENT DE DIRE — VOIX-06, 26/10/2026.
 *
 * LE DÉFAUT QU'ON FERME. La question « {nom}, tu le vends comment ? » était
 * DITE (STK-23) mais n'écoutait PAS : quatre boutons écrits (« tas », « kg »,
 * « unité », « sac ») et un champ libre. Pour une non-lectrice, répondre à
 * une question posée à voix haute en lisant des étiquettes, c'est répondre
 * au hasard. Elle dit « au sac » : c'est SON mot qui doit poser l'unité —
 * puis l'écran la lui relit (TATA_UNITE_CHOISIE), comme pour un touche.
 *
 * CE MODULE NE FAIT QU'UNE CHOSE : lire une unité dans ce qu'elle a dit. Ni
 * le prix, ni le nom, ni la quantité — d'autres s'en chargent (montantDit,
 * produitDit, quantiteDite), et les mélanger recréerait des confusions
 * qu'ARG-12 a fermées une à une.
 *
 * LA RÈGLE — LE RÉFÉRENTIEL EST UNE AIDE, JAMAIS UNE PORTE (STK-25, appliqué
 * aux unités) :
 *   1. d'abord CE QUE L'ÉCRAN PROPOSE — ses unités à elle d'abord
 *      (`unitesProposees`), puis celles du marché : si son mot y est (au
 *      singulier près), on prend l'étiquette EXACTE du bouton qu'elle
 *      aurait touché, pour que sa voix et son doigt écrivent la même chose ;
 *   2. sinon SON MOT, au singulier, s'il est un mot d'unité connu du marché
 *      (`MOTS_UNITE`, la liste qui traverse déjà les dictées de vente) —
 *      « au bol » quand le bol n'est pas proposé reste SON unité ;
 *   3. ce qui n'est ni proposé ni connu rend `null` : on relance à la voix,
 *      on n'invente pas une unité — c'est elle qui décide de comment elle
 *      vend, jamais notre dévinette (STK-02, appliqué à l'unité).
 *
 * LES SYNONYMES RATTACHENT VERS L'ÉCRAN, JAMAIS L'INVERSE : « kilo » écrit
 * « kg » SEULEMENT si « kg » est proposé (l'étiquette qu'elle toucherait) ;
 * sinon son mot reste « kilo ».
 *
 * IL RÉUTILISE `normalise` D'`extraction` : l'apostrophe du téléphone
 * (U+2019) y est pliée une fois pour toutes, et une seconde normalisation
 * serait deux vérités sur une même phrase.
 *
 * CE MODULE EST PUR. Ni React, ni DOM, ni appel réseau.
 */
import { MOTS_UNITE, normalise } from '../voice-offline/extraction';

/** Les mots du marché qui ne traversaient pas encore les dictées de vente :
 *  le bol et le plateau se vendent partout, ils n'ont jamais eu besoin d'un
 *  prix unitaire pour exister. Le reste vient de `MOTS_UNITE`. */
const AUSSI_DU_MARCHE = new Set(['bol', 'bols', 'plateau', 'plateaux']);

/** La famille kilo — elle ne s'invente pas, elle se rattache à l'étiquette. */
const FAMILLE_KILO = new Set(['kilo', 'kilos', 'kilogramme', 'kilogrammes', 'kg']);
const PIECE = new Set(['piece', 'pieces', 'pièce', 'pièces']);

/**
 * SINGULIER PLAUSIBLE. « sacs » → « sac », « morceaux » → « morceau ». On ne
 * retire une finale « s »/« x » que si le mot a au moins quatre lettres :
 * « tas » (trois) garde son « s » qui ne se prononce pas — « ta » n'est rien.
 */
function singulier(mot: string): string {
  if (mot.length >= 4 && (mot.endsWith('s') || mot.endsWith('x'))) return mot.slice(0, -1);
  return mot;
}

/** SANS ACCENT pour APPARIER seulement — « unite » dicté (la reconnaissance
 *  perd souvent les accents) doit joindre « unité » proposé. L'ÉTIQUETTE
 *  rendue reste celle de l'écran, accent comprise : elle toucherait « unité »,
 *  sa voix écrit « unité ». */
function sansAccent(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// TERRAIN 06/11 — L'ASR COLLE LES PRÉPOSITIONS À L'UNITÉ. « à la pièce »
// arrive « alapièce », « au kilo » arrive « aukilo », « un tas » arrive
// « untas », « en sacs » arrive « ensacs » : le token n'existe dans aucune
// liste, la règle rend null, et la marchande se fait relancer pour une
// réponse qu'elle a pourtant bien donnée. Même fil que l'A3 de
// `INT_ENCAISSER` (« en caisser », « on caisse ») : les formes que la
// reconnaissance déforme. LE DÉCOLLAGE NE DEVINE RIEN : il retire
// itérativement un préfixe de préposition française et rejoue LES MÊMES
// règles au reste — une unité proposée, la famille kilo, la pièce, ou un mot
// du marché connu. Ce qui n'est une unité au bout (« restaurant », « en
// vrac ») rend toujours null. Longueur décroissante d'abord (« aux » avant
// « a »), et les variantes s'explorent TOUTES (« unepièce » par « un » est
// un cul-de-sac, par « une » trouve « pièce »).
const PREFIXES_PREPOSITION = ['aux', 'au', 'en', 'des', 'du', 'de', 'la', 'le', 'les', 'un', 'une', 'a', 'd', 'l'];

function decolle(mot: string): string[] {
  const morceaux = new Set<string>();
  const visites = new Set<string>();
  const pousser = (courant: string, profondeur: number) => {
    if (profondeur === 0 || visites.has(courant)) return;
    visites.add(courant);
    for (const pref of PREFIXES_PREPOSITION) {
      if (courant.startsWith(pref) && courant.length > pref.length) {
        const reste = courant.slice(pref.length);
        morceaux.add(reste);
        pousser(reste, profondeur - 1);
      }
    }
  };
  pousser(mot, 2);
  return [...morceaux];
}

/** L'étiquette EXACTE proposée à l'écran pour ce mot, s'il y en a une —
 *  accent ignorée pour l'appariement, jamais pour l'écriture. */
function etiquetteProposee(mot: string, proposees: readonly string[]): string | null {
  const cherche = sansAccent(mot.toLowerCase());
  return proposees.find((p) => sansAccent(p.toLowerCase()) === cherche) ?? null;
}

/**
 * Lit l'unité dans ce qu'elle vient de dire.
 *
 * `null` quand aucun mot d'unité n'est reconnu : on relance à la voix, on
 * n'invente pas. Le champ libre et les boutons restent là — la voix est le
 * geste par défaut, pas le seul.
 */
export function uniteDite(cequelleADit: string, proposees: readonly string[]): string | null {
  const texte = normalise(cequelleADit ?? '');
  if (!texte) return null;
  const mots = texte.split(' ').filter(Boolean);

  /** Les règles 1 à 4, portées par UN mot — le mot entier puis, s'il n'a rien
   *  donné, chaque morceau décollé repasse par EXACTEMENT la même lecture. */
  const lireUnMot = (mot: string): string | null => {
    const simple = singulier(mot);

    // 1. L'ÉTIQUETTE QU'ELLE AURAIT TOUCHÉE — sa voix écrit ce que son doigt
    //    écrirait, au singulier près.
    const proposee = etiquetteProposee(simple, proposees);
    if (proposee) return proposee;

    // 2. LA FAMILLE KILO SE RATTACHE VERS L'ÉCRAN — « kg » proposé gagne,
    //    sinon son mot « kilo » reste.
    if (FAMILLE_KILO.has(mot) || FAMILLE_KILO.has(simple)) {
      return etiquetteProposee('kg', proposees) ?? 'kilo';
    }

    // 3. « À LA PIÈCE » — l'étiquette du référentiel est « unité ».
    if (PIECE.has(mot) || PIECE.has(simple)) {
      return etiquetteProposee('unité', proposees) ?? 'pièce';
    }

    // 4. SON MOT, s'il est un mot du marché connu. `MOTS_UNITE` porte aussi
    //    « de » (une liaison, pas une unité) : il ne désigne rien ici.
    if (simple !== 'de' && (MOTS_UNITE.has(mot) || MOTS_UNITE.has(simple) || AUSSI_DU_MARCHE.has(mot) || AUSSI_DU_MARCHE.has(simple))) {
      return simple;
    }

    return null;
  };

  for (let i = 0; i < mots.length; i++) {
    const mot = mots[i];
    const simple = singulier(mot);

    // 0. LES ÉTIQUETTES À PLUSIEURS MOTS D'ABORD — ses unités à elle peuvent
    //    être des phrases (« grand sac », « demi-tas »). Même lecture que le
    //    parseur de produits : les bigrammes s'épuisent avant les mots seuls,
    //    sinon « grand » passerait pour une unité seule. Le PREMIER mot a pu
    //    coller une préposition (« ungrand sac ») : ses morceaux décollés
    //    sont candidats aussi — le bigramme reste la lecture prioritaire.
    if (i + 1 < mots.length) {
      const suivant = singulier(mots[i + 1]);
      for (const candidat of [simple, ...decolle(simple)]) {
        const paire = etiquetteProposee(`${candidat} ${suivant}`, proposees);
        if (paire) return paire;
      }
    }

    // 1 à 4 sur le mot ENTIER — le cas bien espacé d'abord, inchangé.
    const entiere = lireUnMot(mot);
    if (entiere) return entiere;

    // 5. LE DÉCOLLAGE — le token collé par l'ASR (terrain 06/11) : chaque
    //    morceau repasse par les MÊMES règles, jamais d'invention.
    for (const morceau of decolle(mot)) {
      const lu = lireUnMot(morceau);
      if (lu) return lu;
    }
  }

  return null;
}
