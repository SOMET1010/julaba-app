// ──────────────────────────────────────────────────────────────────────────
// Source du modèle vocal Vosk (reconnaissance de la parole 100 % sur l'appareil).
//
// Le modèle (~40 Mo) est téléchargé UNE SEULE FOIS par le navigateur, puis mis
// en cache : ensuite la vendeuse peut vendre sans réseau. Il faut un .tar.gz
// servi avec les en-têtes CORS (le téléchargement se fait aussi dans un Worker).
//
// Choix actuel (option « adresse publique ») : le modèle français small du
// projet vosk-browser, servi par GitHub Pages (CORS ouvert). C'est celui du
// démo officiel, donc éprouvé. Fragile à long terme (dépend d'un tiers) : à
// terme, on rebascule cette seule constante vers le serveur souverain qui
// servira le même fichier depuis la Côte d'Ivoire.
// ──────────────────────────────────────────────────────────────────────────

export const VOSK_MODEL_URL =
  'https://ccoreilly.github.io/vosk-browser/models/vosk-model-small-fr-pguyot-0.3.tar.gz';
