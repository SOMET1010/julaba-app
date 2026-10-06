// ──────────────────────────────────────────────────────────────────────────
// sessionRoutage.ts — CE QUI TIENT L'ÉTAT, et applique la décision.
//
// Découpage voulu, en trois couches, pour que la partie qu'on peut prouver
// sans téléphone soit la plus grosse possible :
//
//   decisionRoutage.ts   ← PUR. Décide. Zéro dépendance. Entièrement testé.
//   sessionRoutage.ts    ← ICI. Tient l'état, applique, réagit aux ruptures.
//                          Le pont et l'horloge sont INJECTÉS → testé en Node.
//   pontRoutageAudio.ts  ← le seul endroit qui parle à Android. Ne décide rien.
//
// Cette couche ne touche à AUCUNE logique d'argent : ni encaissement, ni stock,
// ni idempotence, ni file hors ligne. Elle ne connaît que des micros ouverts et
// des oreillettes.
//
// RÈGLE ABSOLUE DE CETTE COUCHE : elle ne peut pas faire perdre une vente.
// Aucune de ses méthodes ne rejette, aucune n'attend plus que le délai prévu,
// et toute erreur du pont natif se solde par un repli silencieux sur le
// téléphone. Le pire qui puisse arriver à la marchande, c'est d'entendre Tantie
// par le haut-parleur — c'est-à-dire exactement ce qu'elle entend aujourd'hui.
// ──────────────────────────────────────────────────────────────────────────

import {
  ETAT_INITIAL,
  MODE_PAR_DEFAUT,
  attenteAvantCapture,
  decider,
  routageEffectif,
  type Decision,
  type EtatRoutage,
  type ModeRoutage,
  type Routage,
} from './decisionRoutage';

/** Ce qu'Android nous dit de l'état des appareils, sans interprétation. */
export interface EtatPeripheriques {
  oreilletteConnectee: boolean;
  /** L'oreillette sait-elle recevoir du média (A2DP) ? */
  oreilletteSortieMedia: boolean;
  /** Le canal micro (SCO) est-il confirmé actif par Android ? */
  canalMicroActif: boolean;
  /** Nom lisible de l'appareil, pour le journal et le rapport de terrain. */
  nom?: string;
}

/**
 * Le contrat du pont natif. Volontairement minuscule : tout ce qui pourrait
 * être une décision est en dehors. Un faux pont suffit donc à éprouver la
 * session en Node, y compris la perte d'oreillette en pleine vente.
 */
export interface PontRoutage {
  /** Le plugin natif est-il présent ? (faux sur le web) */
  disponible(): boolean;
  /** Lit l'état courant des appareils. Ne doit jamais rejeter. */
  lireEtat(): Promise<EtatPeripheriques>;
  /** Ouvre le canal micro Bluetooth. Rend `true` si Android l'a confirmé. */
  ouvrirCanalMicro(): Promise<boolean>;
  /** Referme le canal et rend l'audio au téléphone / à l'A2DP. */
  fermerCanalMicro(): Promise<void>;
  /** S'abonne aux changements (connexion, déconnexion, canal). Rend le désabonnement. */
  surChangement(ecouteur: (etat: EtatPeripheriques) => void): () => void;
}

export interface OptionsSession {
  pont: PontRoutage;
  mode?: ModeRoutage;
  /** Horloge injectable (tests). */
  maintenant?: () => number;
  /** Attente injectable (tests) : par défaut un vrai setTimeout. */
  patienter?: (ms: number) => Promise<void>;
  /** Observation seule : appelée à chaque décision appliquée. */
  journal?: (evenement: string, details: Record<string, unknown>) => void;
}

const attendreVraiment = (ms: number): Promise<void> =>
  new Promise((r) => setTimeout(r, ms));

/**
 * La session de routage. Une seule instance vit par application, mais la classe
 * est exportée pour que les tests en créent autant qu'ils veulent, sans état
 * global qui fuit d'un test à l'autre.
 */
export class SessionRoutage {
  private readonly pont: PontRoutage;
  private readonly maintenant: () => number;
  private readonly patienter: (ms: number) => Promise<void>;
  private readonly journal: (e: string, d: Record<string, unknown>) => void;

  private mode: ModeRoutage;
  private oreilletteConnectee = false;
  private oreilletteSortieMedia = false;
  private canalMicroActif = false;
  private ouvertureEnCours = false;
  private instantDemande = 0;
  private capturesOuvertes = 0;
  private instantDerniereCapture = Number.NEGATIVE_INFINITY;
  private echecsConsecutifs = 0;
  private nomAppareil: string | null = null;

  private desabonner: (() => void) | null = null;
  private arretee = false;

  constructor(opts: OptionsSession) {
    this.pont = opts.pont;
    this.mode = opts.mode ?? MODE_PAR_DEFAUT;
    this.maintenant = opts.maintenant ?? (() => Date.now());
    this.patienter = opts.patienter ?? attendreVraiment;
    this.journal = opts.journal ?? (() => {});
  }

  /** L'état complet, tel que le module pur le lira. */
  etat(): EtatRoutage {
    const t = this.maintenant();
    return {
      ...ETAT_INITIAL,
      mode: this.mode,
      natifDisponible: this.pont.disponible(),
      oreilletteConnectee: this.oreilletteConnectee,
      oreilletteSortieMedia: this.oreilletteSortieMedia,
      canalMicroActif: this.canalMicroActif,
      ouvertureEnCours: this.ouvertureEnCours,
      msDepuisDemande: this.ouvertureEnCours ? t - this.instantDemande : 0,
      capturesOuvertes: this.capturesOuvertes,
      msDepuisDerniereCapture:
        this.instantDerniereCapture === Number.NEGATIVE_INFINITY
          ? Number.MAX_SAFE_INTEGER
          : t - this.instantDerniereCapture,
      echecsConsecutifs: this.echecsConsecutifs,
    };
  }

  /** Le chemin audio réellement en place, voie par voie. */
  routage(): Routage {
    return routageEffectif(this.etat());
  }

  /** Nom de l'oreillette vue par Android, pour le rapport de terrain. */
  appareil(): string | null {
    return this.nomAppareil;
  }

  /** Le mode en vigueur (arbitrage de Patrick). */
  modeCourant(): ModeRoutage {
    return this.mode;
  }

  /** Change de mode et applique immédiatement les conséquences. */
  async changerMode(mode: ModeRoutage): Promise<void> {
    this.mode = mode;
    await this.appliquer('changement-de-mode');
  }

  /** Démarre : lit l'état une fois et s'abonne aux ruptures. Ne rejette jamais. */
  async demarrer(): Promise<void> {
    if (!this.pont.disponible()) return;
    this.arretee = false;
    try {
      this.absorber(await this.pont.lireEtat());
    } catch {
      /* un pont muet vaut « pas d'oreillette » : on reste au téléphone */
    }
    try {
      this.desabonner = this.pont.surChangement((e) => {
        this.absorber(e);
        // Une déconnexion doit se traiter TOUT DE SUITE, pas au prochain appui
        // sur le micro : c'est le cas « oreillette qui tombe en pleine vente ».
        void this.appliquer('changement-materiel');
      });
    } catch {
      /* pas d'abonnement possible : on dégrade sans casser */
    }
    await this.appliquer('demarrage');
  }

  /** Arrête proprement : rend le canal et se désabonne. Ne rejette jamais. */
  async arreter(): Promise<void> {
    this.arretee = true;
    try {
      this.desabonner?.();
    } catch {
      /* ignore */
    }
    this.desabonner = null;
    await this.fermerSansBruit();
  }

  /**
   * Une capture micro s'ouvre. Rend le chemin audio effectif au moment où la
   * capture peut démarrer.
   *
   * C'EST ICI QUE SE JOUE LE DÉBUT DE PHRASE. Le canal Bluetooth n'est pas
   * instantané : si on ouvrait `getUserMedia` tout de suite, les premières
   * syllabes de « deux mille cinq cents » partiraient dans le vide. On attend
   * donc la confirmation — mais JAMAIS plus que `attenteAvantCapture` ne
   * l'autorise, parce qu'une marchande a un client devant elle.
   */
  async ouvrirCapture(): Promise<Routage> {
    this.capturesOuvertes += 1;
    if (!this.pont.disponible()) return this.routage();

    await this.appliquer('capture-demandee');

    // Attente bornée de la confirmation, par petits pas pour repartir dès
    // qu'Android répond (ou dès que l'oreillette disparaît).
    //
    // L'ÉCHÉANCE EST CALCULÉE UNE SEULE FOIS, volontairement. La recalculer à
    // chaque tour rallongerait l'attente sans fin dès que l'état repasse par
    // « rien n'est engagé » — la marchande attendrait indéfiniment devant son
    // client. Ici, passé l'échéance, on écoute, point.
    const PAS_MS = 50;
    const echeance = this.maintenant() + attenteAvantCapture(this.etat());
    while (
      this.maintenant() < echeance &&
      !this.canalMicroActif &&
      this.oreilletteConnectee &&
      !this.arretee
    ) {
      await this.patienter(Math.min(PAS_MS, echeance - this.maintenant()));
    }
    await this.appliquer('capture-prete');
    return this.routage();
  }

  /** La capture se referme. Le canal, lui, tient encore un peu (voir la grâce). */
  fermerCapture(): void {
    if (this.capturesOuvertes === 0) return;
    this.capturesOuvertes -= 1;
    if (this.capturesOuvertes === 0) this.instantDerniereCapture = this.maintenant();
    void this.appliquer('capture-fermee');
  }

  /**
   * Relit la décision et l'applique. Appelée à chaque événement ; peut aussi
   * être appelée par un minuteur pour que la fenêtre de grâce finisse par
   * expirer même si plus rien ne se passe.
   */
  async appliquer(cause: string): Promise<Decision> {
    const decision = decider(this.etat());
    this.journal('ROUTAGE_AUDIO', {
      cause,
      action: decision.action,
      raison: decision.raison,
      entree: decision.routage.entree,
      sortie: decision.routage.sortie,
      mode: this.mode,
      appareil: this.nomAppareil,
    });

    switch (decision.action) {
      case 'ouvrir-canal-micro':
        await this.ouvrirCanal();
        break;
      case 'fermer-canal-micro':
      case 'replier-sur-telephone':
        await this.fermerSansBruit();
        break;
      case 'rien':
        break;
    }
    return decision;
  }

  // ── Interne ────────────────────────────────────────────────────────────

  private absorber(e: EtatPeripheriques): void {
    const etaitConnectee = this.oreilletteConnectee;
    this.oreilletteConnectee = Boolean(e.oreilletteConnectee);
    this.oreilletteSortieMedia = Boolean(e.oreilletteSortieMedia);
    if (e.nom !== undefined) this.nomAppareil = e.nom || null;

    if (!this.oreilletteConnectee) {
      // OREILLETTE PERDUE. On NE remet PAS ici les drapeaux du canal à faux,
      // et c'est délibéré : c'est `decider` qui doit voir le canal ENCORE
      // ENGAGÉ pour prononcer le REPLI, et `fermerSansBruit` qui le rendra
      // vraiment à Android. Les effacer ici ferait croire qu'il n'y a plus
      // rien à rendre — le téléphone resterait en mode communication, un
      // chemin audio pointé sur un appareil absent, et la marchande
      // n'entendrait plus rien au milieu de sa vente.
      this.nomAppareil = null;
      // Un nouvel appairage a droit à sa chance : on oublie les échecs.
      if (etaitConnectee) this.echecsConsecutifs = 0;
      return;
    }

    this.canalMicroActif = Boolean(e.canalMicroActif);
    if (this.canalMicroActif) {
      // Confirmé par Android : la demande est close, et c'est un succès.
      this.ouvertureEnCours = false;
      this.echecsConsecutifs = 0;
    }
  }

  private async ouvrirCanal(): Promise<void> {
    this.ouvertureEnCours = true;
    this.instantDemande = this.maintenant();
    let confirme = false;
    try {
      confirme = await this.pont.ouvrirCanalMicro();
    } catch {
      confirme = false;
    }
    if (confirme) {
      this.canalMicroActif = true;
      this.ouvertureEnCours = false;
      this.echecsConsecutifs = 0;
      return;
    }
    // Pas confirmé sur-le-champ : ce n'est pas encore un échec, Android peut
    // confirmer par un événement. L'échec sera constaté au délai dépassé.
    if (!this.oreilletteConnectee) {
      this.ouvertureEnCours = false;
      this.echecsConsecutifs += 1;
    }
  }

  private async fermerSansBruit(): Promise<void> {
    const etaitEnCours = this.ouvertureEnCours;
    const etaitActif = this.canalMicroActif;
    this.ouvertureEnCours = false;
    this.canalMicroActif = false;
    // Un repli qui suit une demande jamais confirmée compte comme un échec :
    // c'est ce qui finit par arrêter les tentatives en boucle.
    if (etaitEnCours && !etaitActif && this.oreilletteConnectee) {
      this.echecsConsecutifs += 1;
    }
    try {
      await this.pont.fermerCanalMicro();
    } catch {
      /* rien à faire de plus : on est déjà, par construction, au téléphone */
    }
  }
}
