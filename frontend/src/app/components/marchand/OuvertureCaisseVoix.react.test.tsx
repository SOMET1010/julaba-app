/**
 * Parcours réel d'ouverture de caisse sous React/JSDOM :
 * dictée → confirmation → openDay rejeté → échec TTS de reprise → récupération.
 * Vérifie aussi les deux annulations pendant les awaits de la capture.
 * Lancer : npm run test:ouverture-caisse-react
 */
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'https://julaba.local/' });
Object.defineProperties(globalThis, {
  window: { configurable: true, value: dom.window },
  document: { configurable: true, value: dom.window.document },
  navigator: { configurable: true, value: dom.window.navigator },
});
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const React = await import('react');
const { act, cleanup, fireEvent, render, screen, waitFor } = await import('@testing-library/react');
const { resoudreMessage } = await import('../../i18n/voice/runtime.js');
const { OuvertureCaisseVoix } = await import('./OuvertureCaisseVoix.js');

type ResultCallback = (event: {
  resultIndex: number;
  results: ArrayLike<{ isFinal: boolean; 0?: { transcript?: string } }>;
}) => void;

class FakeSpeechRecognition {
  static instances: FakeSpeechRecognition[] = [];
  static onStart: (() => void) | null = null;
  onresult: ResultCallback | null = null;
  onerror: ((event: { error?: string }) => void) | null = null;
  onend: (() => void) | null = null;
  abortCount = 0;

  constructor() { FakeSpeechRecognition.instances.push(this); }
  start() { FakeSpeechRecognition.onStart?.(); }
  stop() { this.onend?.(); }
  abort() { this.abortCount++; }
  dire(texte: string) {
    const resultat = Object.assign([{ transcript: texte }], { isFinal: true });
    this.onresult?.({ resultIndex: 0, results: [resultat] });
    this.onend?.();
  }
}

Object.defineProperty(dom.window, 'SpeechRecognition', {
  configurable: true,
  value: FakeSpeechRecognition,
});

let echecs = 0;
function ok(condition: boolean, message: string): void {
  if (condition) console.log(`  ✓ ${message}`);
  else { echecs++; console.error(`  ✗ ${message}`); }
}

function fluxMicro() {
  let arrets = 0;
  const piste = { stop: () => { arrets++; } };
  const flux = { getTracks: () => [piste] } as unknown as MediaStream;
  return { flux, get arrets() { return arrets; } };
}

function differer<T>() {
  let resoudre!: (value: T) => void;
  const promesse = new Promise<T>((resolve) => { resoudre = resolve; });
  return { promesse, resoudre };
}

function monter(dire: (texte: string) => void | Promise<void>, ouvrir: () => Promise<void>) {
  let fermer!: () => void;
  function Hote() {
    const [ouvert, setOuvert] = React.useState(true);
    fermer = () => setOuvert(false);
    return ouvert
      ? React.createElement(OuvertureCaisseVoix, {
          dire,
          onFondDeclare: ouvrir,
          onManuel: () => {},
          onFermer: () => setOuvert(false),
        })
      : null;
  }
  const rendu = render(React.createElement(Hote));
  return { rendu, fermer: () => act(() => fermer()) };
}

const delai = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function parcoursRepriseTtsEchoue(): Promise<void> {
  console.log('\nA — openDay rejeté, parole de reprise en échec, récupération');
  cleanup();
  FakeSpeechRecognition.instances = [];
  FakeSpeechRecognition.onStart = null;
  let maintenant = 10_000;
  const dateNow = Date.now;
  Date.now = () => maintenant;

  const erreurParlee = resoudreMessage('CAI_OUVERTURE_ECHEC').texteParle!;
  let echouerParoleErreur = false;
  const paroles: string[] = [];
  const dire = async (texte: string) => {
    paroles.push(texte);
    if (echouerParoleErreur && texte === erreurParlee) throw new Error('TTS indisponible');
  };
  let ecritures = 0;
  const media = fluxMicro();
  Object.defineProperty(dom.window.navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: async () => media.flux },
  });
  monter(dire, async () => { ecritures++; throw new Error('openDay indisponible'); });

  await waitFor(() => {
    if (FakeSpeechRecognition.instances.length !== 1) throw new Error('attente du démarrage de la dictée du fond');
  });
  ok(FakeSpeechRecognition.instances.length === 1, 'la dictée du fond démarre');
  await waitFor(() => {
    if (!screen.queryByLabelText('Écoute en cours')) throw new Error('attente du rendu en écoute plein écran');
  });
  await act(async () => { FakeSpeechRecognition.instances[0].dire('cent francs'); });
  await waitFor(() => {
    if (FakeSpeechRecognition.instances.length !== 2) throw new Error('attente de l’écoute oui/non');
  });

  echouerParoleErreur = true;
  maintenant += 700;
  await act(async () => { FakeSpeechRecognition.instances[1].dire('oui'); });
  await waitFor(() => {
    if (!screen.queryByText(/La confirmation n’a pas pu être dite/)) throw new Error('attente de l’échec TTS visible');
  });
  ok(ecritures === 1, 'le premier « oui » tente une seule écriture openDay rejetée');
  ok(FakeSpeechRecognition.instances.length === 2, 'l’échec TTS de reprise ne démarre pas un nouveau micro');
  ok(!!screen.queryByRole('button', { name: 'Réessayer la parole' }), 'un bouton accessible permet de réessayer la parole');
  ok(!!screen.queryByRole('button', { name: 'Plus tard' }), 'le retour reste accessible après l’échec TTS');

  echouerParoleErreur = false;
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Réessayer la parole' })); });
  await waitFor(() => {
    if (FakeSpeechRecognition.instances.length !== 3) throw new Error('attente de la reprise vocale');
  });
  ok(ecritures === 1, 'la reprise vocale seule ne déclenche aucune écriture');

  maintenant += 700;
  await act(async () => { FakeSpeechRecognition.instances[2].dire('oui'); });
  await waitFor(() => {
    if (ecritures !== 2) throw new Error('attente de la seconde tentative openDay');
  });
  ok(ecritures === 2, 'une nouvelle écriture n’est autorisée qu’après parole de reprise réussie et nouveau oui');

  cleanup();
  Date.now = dateNow;
}

async function annulationGetUserMedia(): Promise<void> {
  console.log('\nB — annulation pendant getUserMedia');
  cleanup();
  FakeSpeechRecognition.instances = [];
  const demande = differer<MediaStream>();
  let acquisitions = 0;
  Object.defineProperty(dom.window.navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: () => { acquisitions++; return demande.promesse; } },
  });
  const media = fluxMicro();
  monter(async () => {}, async () => {});
  // La question est dite puis le timer d'ouverture du micro expire.
  await act(async () => { await delai(300); });
  ok(acquisitions === 1, 'getUserMedia est en vol quand le parcours est fermé');
  // getUserMedia est encore pending : fermer démonte BoutonDirePrix et invalide son jeton.
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Plus tard' })); });
  await act(async () => {
    demande.resoudre(media.flux);
    await demande.promesse;
    await Promise.resolve();
  });
  await waitFor(() => {
    if (media.arrets === 0) throw new Error('attente de l’arrêt du flux tardif');
  });
  ok(media.arrets > 0, 'le flux retourné après annulation est immédiatement arrêté');
  ok(FakeSpeechRecognition.instances.length === 0, 'aucune reconnaissance ne démarre après getUserMedia annulé');
  cleanup();
}

async function annulationDemarrageCapture(): Promise<void> {
  console.log('\nC — annulation pendant la résolution de demarrerCaptureVocale');
  cleanup();
  FakeSpeechRecognition.instances = [];
  const media = fluxMicro();
  Object.defineProperty(dom.window.navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: async () => media.flux },
  });
  let ferme!: () => void;
  FakeSpeechRecognition.onStart = () => ferme();
  const hote = monter(async () => {}, async () => {});
  ferme = hote.fermer;

  await act(async () => { await delai(300); });
  await waitFor(() => {
    if (FakeSpeechRecognition.instances.length !== 1) throw new Error('attente du démarrage du moteur de dictée');
  });
  // start() survient dans demarrerCaptureVocale, avant que sa promesse soit
  // rendue au composant : l’annulation doit rendre le flux et annuler le moteur
  // dès que cette promesse se résout.
  await act(async () => { await Promise.resolve(); await Promise.resolve(); });
  await waitFor(() => {
    if (FakeSpeechRecognition.instances[0]?.abortCount !== 1) throw new Error('attente de l’annulation du moteur');
  });
  ok(media.arrets > 0, 'la piste ouverte est arrêtée pendant le démarrage asynchrone');
  ok(FakeSpeechRecognition.instances[0].abortCount === 1, 'la capture résolue après fermeture est annulée, sans transcript');
  cleanup();
  FakeSpeechRecognition.onStart = null;
}

await parcoursRepriseTtsEchoue();
await annulationGetUserMedia();
await annulationDemarrageCapture();

console.log(echecs === 0 ? '\n✅ Ouverture caisse React — parcours et annulations valides.\n' : `\n❌ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
