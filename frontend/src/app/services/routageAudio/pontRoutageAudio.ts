// ──────────────────────────────────────────────────────────────────────────
// pontRoutageAudio.ts — LE SEUL endroit qui parle à Android. Il ne décide rien.
//
// Même forme que voice-offline/nativeStt.ts : on passe par le pont global
// Capacitor, le plugin est enregistré côté natif (MainActivity). Sur le web,
// `disponible()` répond false et TOUT le reste est une non-opération — la page
// web n'a ni oreillette ni AudioManager, et c'est très bien ainsi.
//
// Contrat du plugin natif (à respecter par RoutageAudioPlugin.kt) :
//   - etat(): { oreilletteConnectee, oreilletteSortieMedia, canalMicroActif, nom }
//   - ouvrirCanalMicro(): { canalMicroActif: boolean }
//   - fermerCanalMicro(): {}
//   - évènement « routageChange » : même charge utile que etat()
// ──────────────────────────────────────────────────────────────────────────

import type { EtatPeripheriques, PontRoutage } from './sessionRoutage';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

const NOM_PLUGIN = 'RoutageAudio';

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

/** Normalise ce que rend le natif : jamais de `undefined` qui remonte plus haut. */
function normaliser(brut: Any): EtatPeripheriques {
  return {
    oreilletteConnectee: Boolean(brut?.oreilletteConnectee),
    oreilletteSortieMedia: Boolean(brut?.oreilletteSortieMedia),
    canalMicroActif: Boolean(brut?.canalMicroActif),
    nom: typeof brut?.nom === 'string' ? brut.nom : undefined,
  };
}

const AU_TELEPHONE: EtatPeripheriques = {
  oreilletteConnectee: false,
  oreilletteSortieMedia: false,
  canalMicroActif: false,
};

/** Le pont réel. Toutes ses méthodes avalent leurs erreurs : aucune ne rejette. */
export const pontNatif: PontRoutage = {
  disponible(): boolean {
    const p = obtenirPlugin();
    return Boolean(p && typeof p.etat === 'function');
  },

  async lireEtat(): Promise<EtatPeripheriques> {
    const p = obtenirPlugin();
    if (!p || typeof p.etat !== 'function') return AU_TELEPHONE;
    try {
      return normaliser(await p.etat());
    } catch {
      return AU_TELEPHONE;
    }
  },

  async ouvrirCanalMicro(): Promise<boolean> {
    const p = obtenirPlugin();
    if (!p || typeof p.ouvrirCanalMicro !== 'function') return false;
    try {
      const res = await p.ouvrirCanalMicro();
      return Boolean(res?.canalMicroActif);
    } catch {
      return false;
    }
  },

  async fermerCanalMicro(): Promise<void> {
    const p = obtenirPlugin();
    if (!p || typeof p.fermerCanalMicro !== 'function') return;
    try {
      await p.fermerCanalMicro();
    } catch {
      /* déjà fermé, ou plugin absent : on est au téléphone dans les deux cas */
    }
  },

  surChangement(ecouteur: (etat: EtatPeripheriques) => void): () => void {
    const p = obtenirPlugin();
    if (!p || typeof p.addListener !== 'function') return () => {};
    try {
      const abonnement = p.addListener('routageChange', (charge: Any) => {
        try {
          ecouteur(normaliser(charge));
        } catch {
          /* un écouteur qui casse ne doit pas casser le pont */
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
};
