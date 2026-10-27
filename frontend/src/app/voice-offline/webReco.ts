// ──────────────────────────────────────────────────────────────────────────
// WEB — dictée par la reconnaissance vocale native du navigateur.
//
// Sherpa-ONNX reste le moteur de l'APK : il est un plugin Capacitor Android
// (SherpaSttPlugin.kt) et n'existe pas dans un navigateur. Décision du
// 19/10/2026 (docs/DECISIONS.md, arbitrage Patrick) : sur le WEB, la dictée
// utilise SpeechRecognition du navigateur, et TOUT le traitement reste LOCAL
// ensuite — intentLocal() pour la vente, extractPhoneDigits() pour le numéro.
// Aucun serveur de transcription n'est réintroduit. Ce que le navigateur envoie
// à son propre réseau de reconnaissance, il le dit : cf. l'erreur 'reseau'
// ci-dessous, jamais masquée derrière « vérifie le réseau ».
//
// Les plateformes Capacitor (android/ios) sont EXCLUES ici : sur l'APK, le
// chemin reste sherpa natif, même si le WebView exposait un SpeechRecognition.
//
// Contrat d'arrêt (les deux fins, jamais mélangées) :
//   - conclure()  → la dictée est terminée : le texte accumulé est livré UNE
//                   fois, après la fin réelle de l'écoute (promesse résolue
//                   quand onend a tourné — l'appelant peut lire le dernier
//                   chiffre compris avant de conclure lui-même).
//   - annuler()   → réinitialisation / annulation (reset, démontage) : RIEN
//                   n'est livré. Une commande ne part jamais après un reset.
// ──────────────────────────────────────────────────────────────────────────

export type EcouteRecoWeb = {
  /** Termine l'écoute et livre le texte final (promesse = texte livré). */
  conclure: () => Promise<void>;
  /** Annule sans rien livrer (reset, démontage, remplacement). */
  annuler: () => void;
};

type RecoCtor = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: {
    resultIndex: number;
    results: ArrayLike<{ isFinal: boolean; 0?: { transcript?: string } }>;
  }) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

function lecteurWeb(): RecoCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: RecoCtor;
    webkitSpeechRecognition?: RecoCtor;
    Capacitor?: { getPlatform?: () => string };
  };
  // APK : sherpa natif, jamais le navigateur (même si le WebView l'exposait).
  const plateforme = w.Capacitor?.getPlatform?.();
  if (plateforme === 'android' || plateforme === 'ios') return null;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

/** Vrai si ce dispositif (navigateur) sait écouter avec la voix. */
export function recoWebDispo(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const dispo = lecteurWeb() !== null;
    console.log('[recoWebDispo]', dispo, typeof (window as any).SpeechRecognition, typeof (window as any).webkitSpeechRecognition);
    return dispo;
  } catch {
    return false;
  }
}

export type RecoWebOptions = {
  /** Texte en cours (final accumulé + partiel) pour l'affichage en direct. */
  interim?: (texte: string) => void;
  /** Texte final accumulé, livré UNE fois à la fin de l'écoute ('' compris). */
  conclure: (texteFinal: string) => void;
  /** Échec de l'écoute : 'micro' | 'reseau' | 'technique' (jamais de texte). */
  erreur?: (code: 'micro' | 'reseau' | 'technique') => void;
};

/**
 * Démarre l'écoute navigateur. Retourne null si le navigateur n'en a pas
 * (ex. Firefox) ou sur un échec de démarrage — l'appelant garde son filet.
 */
export function demarrerRecoWeb(opts: RecoWebOptions): EcouteRecoWeb | null {
  const Ctor = lecteurWeb();
  if (!Ctor) return null;
  let recognition: InstanceType<RecoCtor>;
  try {
    recognition = new Ctor();
  } catch {
    return null;
  }

  let texteFinal = '';
  let clos = false;   // plus rien à livrer (erreur ou annulation)
  let arret = false;  // arrêt demandé : onend reste attendu, sans erreur
  let veille: ReturnType<typeof setTimeout> | null = null;
  const fins: Array<() => void> = [];

  const livrer = () => {
    if (clos) return;
    clos = true;
    opts.conclure(texteFinal.trim());
  };
  const resoudre = () => {
    if (veille) { clearTimeout(veille); veille = null; }
    const attendeurs = fins.splice(0, fins.length);
    attendeurs.forEach((r) => r());
  };

  recognition.lang = 'fr-FR';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onresult = (ev) => {
    if (clos) return;
    let partiel = '';
    for (let i = ev.resultIndex; i < ev.results.length; i += 1) {
      const r = ev.results[i];
      const t = String(r[0]?.transcript || '');
      if (r.isFinal) texteFinal += `${t} `;
      else partiel += t;
    }
    opts.interim?.(`${texteFinal}${partiel}`.trim());
  };
  recognition.onerror = (ev) => {
    const code = String(ev?.error || '');
    // Annulation volontaire et « rien entendu » : ni erreur, ni texte — le
    // filet de l'appelant (15 s, retap) tranche à sa place.
    if (arret || code === 'aborted' || code === 'no-speech') return;
    // L'erreur tranche : plus aucun texte livré après elle (pas de double
    // conclusion entre erreur et onend).
    clos = true;
    opts.erreur?.(
      code === 'not-allowed' || code === 'service-not-allowed'
        ? 'micro'
        : code === 'network'
          ? 'reseau'
          : 'technique',
    );
    resoudre();
  };
  recognition.onend = () => {
    livrer();
    resoudre();
  };

  try {
    recognition.start();
  } catch {
    return null;
  }

  return {
    conclure: () =>
      new Promise<void>((resolve) => {
        if (clos) {
          resolve();
          return;
        }
        fins.push(resolve);
        try {
          recognition.stop();
        } catch {
          livrer();
          resoudre();
        }
        // Filet : si onend ne vient jamais (navigateur bloqué), on livre quand
        // même — jamais d'appelant pendu sur la promesse.
        veille = setTimeout(() => {
          livrer();
          resoudre();
        }, 1500);
      }),
    annuler: () => {
      arret = true;
      clos = true; // rien ne part après une annulation
      try {
        recognition.abort();
      } catch {
        /* déjà arrêté */
      }
      resoudre();
    },
  };
}
