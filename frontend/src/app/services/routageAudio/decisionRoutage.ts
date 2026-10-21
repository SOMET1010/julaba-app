// ──────────────────────────────────────────────────────────────────────────
// decisionRoutage.ts — LA DÉCISION DE ROUTAGE AUDIO, et rien qu'elle.
//
// POURQUOI CE MODULE EXISTE, SÉPARÉ DE L'APPEL NATIF.
// Une vendeuse au marché a les mains pleines : des tomates, de la monnaie, un
// sac. Beaucoup travailleront avec une oreillette Bluetooth. Il faut donc que
// la voix de Tantie arrive DANS SON OREILLE — pas au fond du pagne, dans le
// bruit — et, si on le lui demande, que le micro qui écoute soit celui qui est
// PRÈS DE SA BOUCHE.
//
// Tout ce qui DÉCIDE vit ici, en fonctions PURES : aucun appel Android, aucune
// horloge, aucun état caché. C'est la seule partie prouvable sans téléphone, et
// c'est exactement ce qu'on prouve (decisionRoutage.test.mts). L'appel natif
// vit dans pontRoutageAudio.ts et ne décide de RIEN.
//
// CE MODULE NE TOUCHE À AUCUNE LOGIQUE D'ARGENT : ni encaissement, ni stock, ni
// idempotence, ni file hors ligne. Il choisit un MICRO et un HAUT-PARLEUR.
//
// ── LES DEUX VOIES BLUETOOTH SONT INDÉPENDANTES, ET C'EST TOUT L'ENJEU ─────
// A2DP : SORTIE seulement, bonne qualité. C'est la voie qui porte la musique,
//        et Android l'utilise TOUT SEUL dès qu'une oreillette média est
//        connectée. Elle n'a AUCUN effet sur la reconnaissance vocale.
// SCO  : voie TÉLÉPHONIQUE, bidirectionnelle — la SEULE qui apporte le MICRO de
//        l'oreillette. Mono, basse fréquence d'échantillonnage. L'ouvrir
//        dégrade le signal donné à sherpa-onnx ET fait basculer la sortie en
//        qualité téléphone tant qu'elle est tenue.
//
// Les deux voies étant indépendantes, il existe TROIS configurations utiles, et
// non deux. Ce module les rend toutes les trois. Laquelle doit être le défaut
// est un ARBITRAGE DE PATRICK, pas une décision prise ici : `MODE_PAR_DEFAUT`
// est posé sur le mode le plus prudent (aucun changement de comportement), et
// le coût de chacun est écrit noir sur blanc dans `COUTS_DES_MODES`.
// ──────────────────────────────────────────────────────────────────────────

/** Où la marchande entend, et où elle parle. Séparément. */
export type Cible = 'telephone' | 'oreillette';

/** Le chemin audio effectif, voie par voie. */
export interface Routage {
  /** Le micro qui écoute. */
  entree: Cible;
  /** Le haut-parleur qui porte la voix de Tantie. */
  sortie: Cible;
}

/**
 * Les trois configurations possibles.
 *
 * - `tout-telephone` : on ne touche à rien. Comportement d'aujourd'hui.
 * - `sortie-oreillette` : Tantie dans l'oreillette (A2DP), micro du téléphone.
 *   On n'ouvre JAMAIS le canal SCO — donc reconnaissance à pleine qualité.
 * - `tout-oreillette` : micro ET voix dans l'oreillette (canal SCO ouvert).
 */
export type ModeRoutage = 'tout-telephone' | 'sortie-oreillette' | 'tout-oreillette';

export const MODES: readonly ModeRoutage[] = [
  'tout-telephone',
  'sortie-oreillette',
  'tout-oreillette',
] as const;

/**
 * Ce que chaque mode COÛTE. Écrit ici, en données, pour que l'arbitrage se
 * fasse sur des phrases vérifiables et pas sur une intuition.
 */
export const COUTS_DES_MODES: Record<ModeRoutage, string> = {
  'tout-telephone':
    "Aucun risque, aucun gain : la voix de Tantie reste dans le haut-parleur du téléphone, au fond du pagne. C'est le problème qu'on cherche à résoudre.",
  'sortie-oreillette':
    "Tantie dans l'oreille, reconnaissance INTACTE (le canal SCO n'est jamais ouvert), aucune latence d'activation. Ne marche que sur une oreillette qui sait faire du média (A2DP) : une oreillette mono bon marché, qui ne sait que le téléphone, n'entendra rien. Et le micro reste celui du téléphone, donc loin de la bouche dans le bruit du marché.",
  'tout-oreillette':
    "Micro près de la bouche ET voix dans l'oreille, y compris sur une oreillette mono. Prix à payer : le canal SCO dégrade le signal donné à sherpa-onnx (mono, basse fréquence), il met quelques centaines de millisecondes à s'ouvrir, et il fait passer la sortie en qualité téléphone tant qu'il est tenu.",
};

/**
 * LE DÉFAUT, ET CE QU'IL N'EST PAS.
 *
 * `tout-oreillette` est le comportement que Patrick a demandé mot pour mot :
 * « entrée micro oreillette si connectée ; sortie Tantie dans l'oreillette ».
 * C'est donc lui le défaut, et non un choix pris ici.
 *
 * Ce qui reste à ARBITRER, et que personne d'autre que Patrick ne doit
 * trancher, c'est le mode `sortie-oreillette` : il met Tantie dans l'oreille
 * SANS jamais ouvrir le canal SCO, donc sans toucher à la qualité donnée à
 * sherpa-onnx. Si la reconnaissance se dégrade nettement en Bluetooth sur le
 * terrain — ce qui n'est PAS mesurable sans téléphone —, c'est le repli à
 * privilégier. Le basculement ne coûte ni rebuild ni code : `choisirMode()`
 * dans index.ts lit une préférence rangée sur l'appareil.
 */
export const MODE_PAR_DEFAUT: ModeRoutage = 'tout-oreillette';

/** Ce que la couche session doit faire APRÈS avoir lu la décision. */
export type Action =
  /** Rien à changer : le chemin en place est déjà le bon. */
  | 'rien'
  /** Ouvrir le canal micro Bluetooth (SCO) : micro + voix dans l'oreillette. */
  | 'ouvrir-canal-micro'
  /** Refermer le canal proprement (repos) : la sortie revient à l'A2DP. */
  | 'fermer-canal-micro'
  /** REPLI : oreillette absente, perdue ou muette — téléphone, tout de suite. */
  | 'replier-sur-telephone';

export interface Decision {
  action: Action;
  /** Le chemin audio une fois cette action appliquée. */
  routage: Routage;
  /** Pourquoi — repris tel quel dans le journal et dans le rapport de terrain. */
  raison: string;
}

/**
 * Tout ce que la décision a le droit de regarder. Rien d'autre : pas de
 * `window`, pas de `Date.now()`, pas de plugin.
 */
export interface EtatRoutage {
  /** Le mode voulu (arbitrage de Patrick). */
  mode: ModeRoutage;
  /** Le pont natif Android est-il là ? (faux sur le web, et c'est normal) */
  natifDisponible: boolean;
  /** Android voit-il une oreillette Bluetooth connectée, à cet instant ? */
  oreilletteConnectee: boolean;
  /**
   * Cette oreillette sait-elle recevoir du MÉDIA (A2DP) ? Faux pour une
   * oreillette mono qui ne connaît que la voie téléphonique — cas courant du
   * matériel bon marché, donc cas à traiter et pas à supposer absent.
   */
  oreilletteSortieMedia: boolean;
  /** Le canal micro est-il CONFIRMÉ actif par Android (pas juste demandé) ? */
  canalMicroActif: boolean;
  /** Une ouverture est-elle demandée et pas encore confirmée ? */
  ouvertureEnCours: boolean;
  /** Depuis combien de temps cette demande attend-elle ? */
  msDepuisDemande: number;
  /** Combien de captures micro sont ouvertes en ce moment (0 = au repos). */
  capturesOuvertes: number;
  /** Temps écoulé depuis la fermeture de la dernière capture. */
  msDepuisDerniereCapture: number;
  /** Échecs d'ouverture consécutifs : au-delà d'un plafond, on cesse d'insister. */
  echecsConsecutifs: number;
}

/**
 * Délai MAXIMUM d'attente de la confirmation du canal micro avant d'ouvrir la
 * capture. Au-delà, on n'attend plus : mieux vaut écouter par le micro du
 * téléphone que faire patienter une marchande devant un client.
 */
export const DELAI_CONFIRMATION_MS = 1200;

/**
 * En mode `tout-oreillette`, fenêtre pendant laquelle le canal reste ouvert
 * après la fin de l'écoute, le temps que Tantie réponde dans l'oreillette. La
 * réponse arrive juste après ; refermer tout de suite obligerait à rouvrir à la
 * phrase suivante, et à reperdre les premières syllabes.
 */
export const GRACE_APRES_ECOUTE_MS = 15000;

/** Au-delà, on arrête d'essayer l'oreillette pour cette session : téléphone. */
export const PLAFOND_ECHECS = 2;

/** Tout au téléphone, rien d'engagé — la valeur sûre. */
export const ETAT_INITIAL: EtatRoutage = {
  mode: MODE_PAR_DEFAUT,
  natifDisponible: false,
  oreilletteConnectee: false,
  oreilletteSortieMedia: false,
  canalMicroActif: false,
  ouvertureEnCours: false,
  msDepuisDemande: 0,
  capturesOuvertes: 0,
  msDepuisDerniereCapture: Number.MAX_SAFE_INTEGER,
  echecsConsecutifs: 0,
};

/** Tout au téléphone : le routage de repli, toujours disponible. */
export const ROUTAGE_TELEPHONE: Routage = { entree: 'telephone', sortie: 'telephone' };

/** Le canal micro est-il engagé d'une façon ou d'une autre ? */
function canalEngage(e: EtatRoutage): boolean {
  return e.canalMicroActif || e.ouvertureEnCours;
}

/**
 * Le chemin audio RÉELLEMENT en place, voie par voie.
 *
 * Deux règles qui ne se voient pas au premier regard, et qui sont la raison
 * d'être de cette fonction :
 *
 *  1. Tant que l'ouverture du canal n'est pas CONFIRMÉE, l'entrée est encore
 *     le téléphone. Annoncer « oreillette » sur une simple demande mentirait
 *     au journal — et c'est ce genre de mensonge qui rend un rapport de
 *     terrain inexploitable.
 *
 *  2. Quand le canal SCO est tenu, la sortie passe par CE canal, et non plus
 *     par l'A2DP. C'est pour cela qu'une oreillette mono, sans A2DP, entend
 *     tout de même Tantie en mode `tout-oreillette` alors qu'elle n'entendrait
 *     rien en mode `sortie-oreillette`.
 */
export function routageEffectif(e: EtatRoutage): Routage {
  if (!e.natifDisponible || !e.oreilletteConnectee || e.mode === 'tout-telephone') {
    return ROUTAGE_TELEPHONE;
  }
  if (e.mode === 'tout-oreillette' && e.canalMicroActif) {
    // Le canal téléphonique porte les deux voies.
    return { entree: 'oreillette', sortie: 'oreillette' };
  }
  // Canal fermé : la sortie suit l'A2DP, qu'Android applique seul — mais
  // seulement si l'oreillette sait recevoir du média.
  return {
    entree: 'telephone',
    sortie: e.oreilletteSortieMedia ? 'oreillette' : 'telephone',
  };
}

/**
 * Combien de temps, AU PLUS, la couture doit attendre la confirmation du canal
 * avant d'ouvrir `getUserMedia`. C'est ce qui évite de perdre le début de la
 * phrase quand la marchande parle tout de suite après avoir appuyé.
 *
 * Zéro dès qu'attendre ne servirait à rien : mode qui n'ouvre pas le canal,
 * pas de natif, pas d'oreillette, canal déjà actif, plafond d'échecs atteint.
 * On n'inflige jamais une attente inutile à quelqu'un qui a un client en face.
 */
export function attenteAvantCapture(e: EtatRoutage): number {
  if (e.mode !== 'tout-oreillette') return 0;
  if (!e.natifDisponible) return 0;
  if (!e.oreilletteConnectee) return 0;
  if (e.canalMicroActif) return 0;
  if (e.echecsConsecutifs >= PLAFOND_ECHECS) return 0;
  const dejaAttendu = e.ouvertureEnCours ? e.msDepuisDemande : 0;
  const reste = DELAI_CONFIRMATION_MS - dejaAttendu;
  return reste > 0 ? reste : 0;
}

/**
 * LA décision. Pure, totale (elle répond toujours), et sans surprise : dans le
 * doute, elle choisit le téléphone. Une marchande n'a jamais de silence.
 */
export function decider(e: EtatRoutage): Decision {
  // 1. Pas de pont natif (le web, ou un APK sans le plugin) : rien à router.
  if (!e.natifDisponible) {
    return { action: 'rien', routage: ROUTAGE_TELEPHONE, raison: 'pas-de-pont-natif' };
  }

  // 2. Mode « on ne touche à rien ». Si un canal traînait (changement de mode
  //    en cours de session), on le rend — sinon la sortie resterait coincée en
  //    qualité téléphone sans que personne ne l'ait demandé.
  if (e.mode === 'tout-telephone') {
    return canalEngage(e)
      ? { action: 'fermer-canal-micro', routage: ROUTAGE_TELEPHONE, raison: 'mode-tout-telephone' }
      : { action: 'rien', routage: ROUTAGE_TELEPHONE, raison: 'mode-tout-telephone' };
  }

  // 3. REPLI. Pas d'oreillette — jamais connectée, ou PERDUE EN PLEINE VENTE.
  //    C'est le cas le plus important du lot : si le canal est encore engagé
  //    sur une oreillette qui n'est plus là, on le rend IMMÉDIATEMENT, sinon
  //    Android garde un chemin audio vers un appareil absent et la marchande
  //    n'entend plus rien — vente perdue, sans un mot d'explication.
  if (!e.oreilletteConnectee) {
    return canalEngage(e)
      ? { action: 'replier-sur-telephone', routage: ROUTAGE_TELEPHONE, raison: 'oreillette-perdue' }
      : { action: 'rien', routage: ROUTAGE_TELEPHONE, raison: 'pas-d-oreillette' };
  }

  // 4. Mode « sortie seule » : on n'ouvre JAMAIS le canal téléphonique. C'est
  //    précisément ce qui garde la reconnaissance à pleine qualité. Android
  //    pose la sortie sur l'A2DP tout seul ; notre seul devoir est de ne rien
  //    tenir qui l'en empêcherait.
  if (e.mode === 'sortie-oreillette') {
    if (canalEngage(e)) {
      return {
        action: 'fermer-canal-micro',
        routage: routageEffectif({ ...e, canalMicroActif: false, ouvertureEnCours: false }),
        raison: 'mode-sortie-oreillette',
      };
    }
    return {
      action: 'rien',
      routage: routageEffectif(e),
      raison: e.oreilletteSortieMedia ? 'sortie-a2dp' : 'oreillette-sans-media',
    };
  }

  // ── À partir d'ici : mode `tout-oreillette`. ────────────────────────────

  // 5. L'oreillette est là mais elle a refusé d'ouvrir le canal plusieurs fois
  //    de suite. On cesse d'insister : réessayer en boucle ferait clignoter le
  //    son à chaque phrase. Téléphone, et on n'en reparle plus de la session.
  if (e.echecsConsecutifs >= PLAFOND_ECHECS) {
    return canalEngage(e)
      ? { action: 'replier-sur-telephone', routage: ROUTAGE_TELEPHONE, raison: 'ouverture-impossible' }
      : { action: 'rien', routage: routageEffectif(e), raison: 'ouverture-impossible' };
  }

  // 6. On écoute (au moins une capture ouverte).
  if (e.capturesOuvertes > 0) {
    if (e.canalMicroActif) {
      return { action: 'rien', routage: routageEffectif(e), raison: 'micro-oreillette-actif' };
    }
    if (e.ouvertureEnCours) {
      // Toujours pas confirmé passé le délai : on n'attend plus, on écoute par
      // le téléphone. Mieux vaut un micro moins bien placé que pas de micro.
      return e.msDepuisDemande >= DELAI_CONFIRMATION_MS
        ? { action: 'replier-sur-telephone', routage: ROUTAGE_TELEPHONE, raison: 'delai-depasse' }
        : { action: 'rien', routage: routageEffectif(e), raison: 'ouverture-en-cours' };
    }
    return { action: 'ouvrir-canal-micro', routage: routageEffectif(e), raison: 'capture-demandee' };
  }

  // 7. Au repos. On garde le canal le temps que Tantie réponde dans
  //    l'oreillette (voir GRACE_APRES_ECOUTE_MS), puis on le rend à l'A2DP.
  if (canalEngage(e)) {
    return e.msDepuisDerniereCapture < GRACE_APRES_ECOUTE_MS
      ? { action: 'rien', routage: routageEffectif(e), raison: 'grace-reponse-de-tantie' }
      : {
          action: 'fermer-canal-micro',
          routage: routageEffectif({ ...e, canalMicroActif: false, ouvertureEnCours: false }),
          raison: 'repos',
        };
  }

  return { action: 'rien', routage: routageEffectif(e), raison: 'repos' };
}
