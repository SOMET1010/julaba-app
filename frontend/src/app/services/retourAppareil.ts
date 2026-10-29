// ──────────────────────────────────────────────────────────────────────────
// retourAppareil.ts — LA TOUCHE RETOUR N'ARRACHE PLUS LA CAISSE DES MAINS.
//
// Avant ce service, l'APK laissait la touche retour matérielle au comportement
// par défaut du pont Capacitor : un appui remontait l'historique du WebView,
// et un appui de trop fermait l'application NET — y compris au milieu d'une
// vente, panier plein. Sur le web ce problème n'existe pas (le navigateur
// gère sa propre touche), donc tout ce module est une NON-opération hors APK.
//
// LA RÈGLE (une seule, apprise des mains de la marchande) :
//   - un écran derrière (le WebView peut reculer ET react-router a de
//     l'historique, les deux disent la même chose) → la touche retour recule
//     d'un écran, comme elle doit ;
//   - pas d'écran derrière → le PREMIER appui montre un avis discret
//     (« Encore un appui pour quitter »), le DEUXIÈME appui sous 2 secondes
//     ferme l'application. Jamais de fermeture surprise.
//
// Même forme que routageAudio/pontRoutageAudio.ts et voice-offline/nativeStt.ts :
// pont global Capacitor (`window.Capacitor.Plugins.App`), plugin natif
// @capacitor/app intégré par `npx cap sync android` (workflows/apk.yml).
// Toutes les erreurs sont avalées : la touche retour ne peut pas faire
// perdre une vente — au pire elle ne fait rien.
// ──────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const NOM_PLUGIN = 'App';

/** Ce que le service attend de l'appareil. Injectable pour les tests. */
export interface PontAppareil {
  /** Vrai sur l'APK (plugin App présent côté natif). Faux sur le web. */
  disponible(): boolean;
  /** Écoute la touche retour. Rend la fonction qui débranche. */
  surRetour(ecouteur: (peutReculer: boolean) => void): () => void;
  /** Ferme l'application (APK seulement). */
  quitter(): void;
}

let plugin: Any | null | undefined; // undefined = pas encore évalué

function obtenirPlugin(): Any | null {
  if (plugin !== undefined) return plugin;
  try {
    const cap = (window as unknown as Any).Capacitor;
    plugin = cap && cap.getPlatform() === 'android' ? (cap.Plugins?.[NOM_PLUGIN] ?? null) : null;
  } catch {
    plugin = null;
  }
  return plugin;
}

/** Le pont réel. Toutes ses méthodes avalent leurs erreurs : aucune ne rejette. */
export const pontAppareil: PontAppareil = {
  disponible(): boolean {
    const p = obtenirPlugin();
    return Boolean(p && typeof p.addListener === 'function');
  },

  surRetour(ecouteur: (peutReculer: boolean) => void): () => void {
    const p = obtenirPlugin();
    if (!p || typeof p.addListener !== 'function') return () => {};
    try {
      const abonnement = p.addListener('backButton', (charge: Any) => {
        try {
          ecouteur(Boolean(charge?.canGoBack));
        } catch {
          /* un écouteur qui casse ne doit pas casser la touche retour */
        }
      });
      return () => {
        try {
          // Capacitor 8 : addListener rend une promesse de handle.
          void Promise.resolve(abonnement).then((h: Any) => h?.remove?.());
        } catch {
          /* ignore */
        }
      };
    } catch {
      return () => {};
    }
  },

  quitter(): void {
    const p = obtenirPlugin();
    if (!p || typeof p.exitApp !== 'function') return;
    try {
      void p.exitApp();
    } catch {
      /* on ne ferme jamais l'appli par erreur — on la laisse ouverte */
    }
  },
};

/** Délai max (ms) entre deux appuis pour que le second signifie « je quitte ». */
export const DELAI_DOUBLE_APPUI_MS = 2000;

const ID_AVIS = 'avis-retour-quitter';
const TEXTE_AVIS = 'Encore un appui pour quitter Jùlaba';
const DUREE_AVIS_MS = 2600;

let minuterieAvis: ReturnType<typeof setTimeout> | undefined;

/** Avis discret, hors React : la touche retour est plus basse que l'interface. */
function montrerAvis(): void {
  if (typeof document === 'undefined') return;
  let avis = document.getElementById(ID_AVIS);
  if (!avis && document.body) {
    avis = document.createElement('div');
    avis.id = ID_AVIS;
    avis.setAttribute('role', 'status');
    avis.setAttribute('aria-live', 'polite');
    avis.style.cssText = [
      'position:fixed',
      'left:50%',
      'bottom:calc(24px + env(safe-area-inset-bottom, 0px))',
      'transform:translateX(-50%)',
      'z-index:2147483000',
      'background:rgba(20,20,20,0.92)',
      'color:#fff',
      'padding:10px 18px',
      'border-radius:999px',
      'font-size:14px',
      'font-family:inherit',
      'opacity:0',
      'transition:opacity 180ms ease',
      'pointer-events:none',
      'max-width:90vw',
      'text-align:center',
    ].join(';');
    document.body.appendChild(avis);
  }
  if (!avis) return;
  avis.textContent = TEXTE_AVIS;
  avis.style.opacity = '1';
  if (minuterieAvis) clearTimeout(minuterieAvis);
  minuterieAvis = setTimeout(() => {
    if (avis) avis.style.opacity = '0';
  }, DUREE_AVIS_MS);
}

function masquerAvis(): void {
  if (minuterieAvis) {
    clearTimeout(minuterieAvis);
    minuterieAvis = undefined;
  }
  if (typeof document === 'undefined') return;
  document.getElementById(ID_AVIS)?.style.setProperty('opacity', '0');
}

/**
 * Il y a un écran derrière si le WebView ET react-router le disent tous les
 * deux : `canGoBack` seul mentirait si l'appli avait été ouverte par un lien
 * profond sur un historique qui n'est pas le nôtre — on ne reculerait que
 * pour sortir de l'application. Le double vote bloque ce cas.
 */
function unEcranDerriere(peutReculer: boolean): boolean {
  if (!peutReculer) return false;
  try {
    const idx = (window.history.state as { idx?: number } | null)?.idx;
    return typeof idx === 'number' ? idx > 0 : true;
  } catch {
    return true; // pas d'information : on tente le recul, le WebView tranchera
  }
}

/**
 * Installe la maîtrise de la touche retour. Non-opération complète sur le web
 * (pont indisponible) et en cas d'erreur du natif. Rend la fonction qui
 * débranche l'écoute et masque l'avis.
 */
export function installerRetourAppareil(
  pont: PontAppareil = pontAppareil,
  horloge: () => number = () => Date.now(),
  delaiDoubleAppuiMs: number = DELAI_DOUBLE_APPUI_MS,
): () => void {
  if (!pont.disponible()) return () => {};

  let dernierAppui = 0;
  let averti = false;

  const arreter = pont.surRetour((peutReculer) => {
    if (unEcranDerriere(peutReculer)) {
      dernierAppui = 0;
      averti = false; // on recule : un éventuel « quitter » repart de zéro
      masquerAvis();
      try {
        window.history.back();
      } catch {
        /* ignore */
      }
      return;
    }

    const maintenant = horloge();
    if (averti && maintenant - dernierAppui <= delaiDoubleAppuiMs) {
      averti = false;
      masquerAvis();
      pont.quitter();
      return;
    }

    dernierAppui = maintenant;
    averti = true;
    montrerAvis();
  });

  return () => {
    arreter();
    masquerAvis();
  };
}
