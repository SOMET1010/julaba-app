/**
 * La voix NATIVE (synthèse hors-ligne de l'APK) traverse-t-elle correctement
 * l'audioManager ?
 *
 * Ce qu'on éprouve ici n'est PAS « est-ce que ça parle » — seul un téléphone le
 * dit. C'est le câblage, et surtout le danger qu'il introduit : un son lancé
 * qu'on ne pourrait plus couper. Une Tata qui continue de parler après qu'on a
 * quitté l'écran, c'est le défaut déjà corrigé pour les clips ; il ne doit pas
 * revenir par la synthèse.
 *
 * Montage : le VRAI realStartTts (c'est lui qu'on teste), un faux lecteur de
 * clips dont on décide la fin à la main, et une fausse synthèse native.
 */
import {
  speak,
  stopAllVoice,
  __setClipPlayer,
  __resetPlayers,
  __setLowLevel,
  __resetLowLevel,
  __reset,
} from './audioManager.ts';

let echecs = 0;
let total = 0;

function verifier(nom: string, condition: boolean): void {
  total++;
  if (condition) {
    console.log(`  ✓ ${nom}`);
  } else {
    echecs++;
    console.log(`  ✗ ${nom}`);
  }
}

type Fin = 'ended' | 'failed' | 'cancelled';

/** Lecteur de clips factice : on contrôle la fin de chaque lecture à la main. */
function lecteurPilotable() {
  const lectures: {
    base64?: string;
    finir: (r: Fin) => void;
    arrete: boolean;
  }[] = [];
  const player = (source: { base64?: string; url?: string }) => {
    let finir!: (r: Fin) => void;
    const promise = new Promise<Fin>((res) => {
      finir = res;
    });
    const entree = { base64: source.base64, finir, arrete: false };
    lectures.push(entree);
    return {
      promise,
      stop: () => {
        entree.arrete = true;
        finir('cancelled');
      },
    };
  };
  return { player, lectures };
}

const pause = () => new Promise((r) => setTimeout(r, 0));

const WAV_FACTICE = 'V0FWRkFDVElDRQ==';

/** Remet tout à zéro et monte le décor. */
function monter(synthetiser: (c: string) => Promise<string | null>) {
  __reset();
  __resetPlayers();
  __resetLowLevel();
  const { player, lectures } = lecteurPilotable();
  __setClipPlayer(player);
  const auNavigateur: string[] = [];
  __setLowLevel(
    async (t: string) => [t],
    async (c: string) => {
      auNavigateur.push(c);
    },
    synthetiser,
  );
  return { lectures, auNavigateur };
}

async function main(): Promise<void> {
  console.log('\nLa synthèse native passe par le lecteur de clips éprouvé');
  {
    const { lectures, auNavigateur } = monter(async () => WAV_FACTICE);
    const enCours = speak('Tu as vendu pour mille cinq cents francs');
    await pause();
    verifier('un WAV natif est confié au lecteur de clips', lectures.length === 1);
    verifier('c’est bien le WAV synthétisé', lectures[0]?.base64 === WAV_FACTICE);
    verifier(
      'la voix du navigateur n’est PAS utilisée quand le natif répond',
      auNavigateur.length === 0,
    );
    lectures[0].finir('ended');
    await enCours;
    verifier('la lecture se termine et libère la chaîne', true);
  }

  console.log('\nUn Stop coupe la voix native en cours — pas de voix fantôme');
  {
    const { lectures } = monter(async () => WAV_FACTICE);
    const enCours = speak('Ta caisse devrait avoir six mille cinq cents francs');
    await pause();
    verifier('la lecture native a démarré', lectures.length === 1);

    stopAllVoice();
    await pause();
    verifier('stop() a coupé la lecture native', lectures[0]?.arrete === true);
    await enCours;
    verifier('la promesse se résout au lieu de rester pendante', true);
  }

  console.log('\nSur le web, rien ne change : la voix du navigateur reste seule');
  {
    const { lectures, auNavigateur } = monter(async () => null);
    await speak('Il te manque cinq cents francs');
    verifier('aucune lecture de clip déclenchée', lectures.length === 0);
    verifier('la voix du navigateur a parlé', auNavigateur.length === 1);
  }

  console.log('\nSi le WAV natif est illisible, on ne reste pas muet');
  {
    const { lectures, auNavigateur } = monter(async () => WAV_FACTICE);
    const enCours = speak('Entre ton code secret');
    await pause();
    lectures[0].finir('failed'); // le WAV ne se lit pas
    await enCours;
    verifier(
      'la voix du navigateur prend le relais au lieu du silence',
      auNavigateur.length === 1,
    );
  }

  console.log('\nUne synthèse qui échoue ne bloque pas l’écran');
  {
    const { lectures, auNavigateur } = monter(async () => {
      throw new Error('moteur natif en panne');
    });
    await speak('Bonjour');
    verifier('aucune lecture de clip', lectures.length === 0);
    verifier(
      'la promesse se résout quand même (l’écran n’attend pas indéfiniment)',
      true,
    );
    // Le navigateur n'est pas sollicité ici : realStartTts attrape l'erreur et
    // résout en « failed ». Ce qui compte est qu'on ne reste PAS bloqué.
    verifier('rien n’est parti au navigateur sur une exception', auNavigateur.length === 0);
  }

  __resetPlayers();
  __resetLowLevel();
  __reset();

  console.log(`\n${total - echecs}/${total} vérifications passées`);
  if (echecs > 0) {
    console.log('\n✗ voix native — échec');
    process.exit(1);
  }
  console.log('\n✓ voix native — tous les cas passent');
}

main();
