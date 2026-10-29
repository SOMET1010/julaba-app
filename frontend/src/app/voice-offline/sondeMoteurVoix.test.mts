/**
 * B3 — UNE PREMIÈRE SONDE NÉGATIVE NE DOIT PAS CONDAMNER LA SESSION.
 * Lancer : npm run test:sonde-moteur-voix   (tsx, sans DOM)
 *
 * LE DÉFAUT, TEL QU'IL SE VIT SUR LE TÉLÉPHONE. Sur Android, le plugin natif
 * (sherpa-onnx) s'enregistre APRÈS le premier écran. `main.tsx` sonde le
 * moteur au démarrage, en tâche de fond : cette toute première sonde répond
 * donc « indisponible ». Le résultat était mémorisé pour TOUTE la session —
 * `probePromise` restait une promesse résolue à `false`, et seule une
 * exception la remettait à zéro. Le micro restait mort jusqu'au prochain
 * lancement de l'application, alors que le moteur était là une seconde plus
 * tard. C'est le « micro lent au démarrage » du terrain.
 *
 * CE QUE CE TEST PROUVE, ET COMMENT. Il ne relit pas le source : il fait
 * TOURNER le vrai module `offlineStt.ts`, rechargé proprement pour chaque
 * scénario, en remplaçant la seule chose qui dépende de l'appareil —
 * `nativeStt.isAvailable`. On compte les sondes réellement émises et on
 * regarde ce que les fonctions publiques (`offlineModelReady`,
 * `ensureOfflineModel`) répondent AVANT et APRÈS que le moteur soit monté.
 *
 * CE QU'IL VERROUILLE AUSSI, pour que la correction ne casse pas la raison
 * d'être du cache : une sonde POSITIVE reste mémorisée (on ne resonde pas à
 * chaque phrase), et N appels simultanés ne déclenchent QU'UNE sonde.
 */
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

let failures = 0;
function ok(cond: boolean, label: string) {
  if (cond) console.log('  ✅', label);
  else { console.log('  ❌', label); failures++; }
}

const ICI = dirname(fileURLToPath(import.meta.url));
const F_STT = join(ICI, 'offlineStt.ts');
const F_NATIF = join(ICI, 'nativeStt.ts');

type ModuleStt = {
  offlineModelReady: () => boolean;
  offlineModelInstalled: () => boolean;
  ensureOfflineModel: () => Promise<void>;
  warmOfflineModelIfInstalled: () => void;
};

/** Le pont natif, tel que `offlineStt` le voit VRAIMENT : `offlineStt`
 *  importe `./nativeStt` sans paramètre, donc toutes les générations du
 *  module rechargé partagent CET objet-là. C'est lui, et lui seul, qu'on
 *  pilote — sinon on testerait une copie que personne n'appelle. */
const natif = await import(pathToFileURL(F_NATIF).href) as { nativeStt: { isAvailable: () => Promise<boolean> } };

/** Recharge le VRAI module, état interne remis à neuf, et branche une sonde
 *  pilotée par le test. Rend aussi le compteur de sondes réellement émises. */
let generation = 0;
async function chargerMoteur(reponse: () => Promise<boolean>) {
  generation++;
  const compteur = { sondes: 0 };
  natif.nativeStt.isAvailable = async () => { compteur.sondes++; return reponse(); };
  const stt = await import(pathToFileURL(F_STT).href + `?gen=${generation}`) as ModuleStt;
  return { stt, compteur };
}

/** `ensureOfflineModel` a-t-il laissé passer (moteur là) ou refusé ? */
async function laissePasser(stt: ModuleStt): Promise<boolean> {
  try { await stt.ensureOfflineModel(); return true; } catch { return false; }
}

console.log('\n[1] LE DÉFAUT — le plugin natif monte après le premier écran');
{
  // Le moteur n'est pas là au démarrage, puis il arrive.
  let moteurMonte = false;
  const { stt, compteur } = await chargerMoteur(async () => moteurMonte);

  // `main.tsx` sonde en tâche de fond, trop tôt.
  stt.warmOfflineModelIfInstalled();
  await new Promise<void>((r) => setTimeout(r, 0));
  ok(stt.offlineModelReady() === false, 'S0 au démarrage, le moteur n’est pas encore là — la sonde répond non');
  ok(compteur.sondes === 1, `S0 une seule sonde a été émise (${compteur.sondes})`);

  // Une seconde plus tard, le plugin s'enregistre. La marchande touche le micro.
  moteurMonte = true;
  const passe = await laissePasser(stt);
  console.log(`  après montage du plugin : sondes=${compteur.sondes}, ensureOfflineModel ${passe ? 'laisse passer' : 'REFUSE'}`);
  ok(compteur.sondes > 1, 'S1 le moteur est resondé quand on en a de nouveau besoin (la réponse négative n’est pas gravée)');
  ok(passe, 'S1 ensureOfflineModel laisse passer : le micro revient dans la MÊME session');
  ok(stt.offlineModelReady() === true, 'S1 offlineModelReady() dit enfin vrai — les écrans rouvrent le micro');
}

console.log('\n[2] CE QUE LA CORRECTION NE DOIT PAS CASSER');
{
  // Une sonde POSITIVE reste mémorisée : on ne resonde pas à chaque phrase.
  const { stt, compteur } = await chargerMoteur(async () => true);
  await laissePasser(stt);
  const apresPremiere = compteur.sondes;
  await laissePasser(stt);
  await laissePasser(stt);
  await laissePasser(stt);
  ok(apresPremiere === 1 && compteur.sondes === 1,
    `S2 un moteur confirmé n’est plus resondé (${compteur.sondes} sonde(s) pour 4 appels)`);
  ok(stt.offlineModelReady() === true, 'S2 et il reste prêt');
}
{
  // N appels SIMULTANÉS au démarrage ne doivent pas déclencher une rafale.
  const { stt, compteur } = await chargerMoteur(async () => {
    await new Promise<void>((r) => setTimeout(r, 10));
    return true;
  });
  await Promise.all([laissePasser(stt), laissePasser(stt), laissePasser(stt), laissePasser(stt), laissePasser(stt)]);
  ok(compteur.sondes === 1, `S3 cinq appels simultanés ne sondent qu’une fois (${compteur.sondes})`);
}
{
  // Une sonde qui LÈVE ne condamne pas non plus la session (non-régression).
  let casse = true;
  const { stt, compteur } = await chargerMoteur(async () => {
    if (casse) throw new Error('plugin pas prêt');
    return true;
  });
  ok(!(await laissePasser(stt)), 'S4 une sonde qui lève refuse, sur le moment');
  casse = false;
  ok(await laissePasser(stt), 'S4 et la session se rattrape une fois le plugin prêt');
  ok(compteur.sondes >= 2, `S4 elle a bien resondé (${compteur.sondes})`);
}

console.log('\n[3] LE DRAPEAU PERSISTANT NE MENT PAS');
{
  // Il ne doit être écrit que sur un SUCCÈS : un « non » de démarrage ne doit
  // pas se transformer en « moteur vu sur cet appareil ».
  const ecrits: Array<[string, string]> = [];
  const memoire = new Map<string, string>();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => memoire.get(k) ?? null,
      // Le journal de voix écrit lui aussi dans localStorage : on ne retient
      // que la clé d'installation, seule en cause ici.
      setItem: (k: string, v: string) => { if (k.includes('installed')) ecrits.push([k, v]); memoire.set(k, v); },
      removeItem: (k: string) => { memoire.delete(k); },
    },
  });
  let moteurMonte = false;
  const { stt } = await chargerMoteur(async () => moteurMonte);
  await laissePasser(stt);
  ok(ecrits.length === 0, `S5 une sonde négative n’écrit rien (${JSON.stringify(ecrits)})`);
  ok(stt.offlineModelInstalled() === false, 'S5 et l’appareil n’est pas déclaré équipé');
  moteurMonte = true;
  await laissePasser(stt);
  ok(ecrits.length === 1 && ecrits[0][1] === '1', `S5 seule la sonde positive écrit le drapeau (${JSON.stringify(ecrits)})`);
  ok(stt.offlineModelInstalled() === true, 'S5 et l’appareil est alors déclaré équipé');
  // @ts-expect-error — on rend l'environnement tel qu'on l'a trouvé.
  delete globalThis.localStorage;
}

console.log(
  failures === 0
    ? '\nUn « non » de démarrage ne condamne plus la voix de la session ✅'
    : `\n${failures} test(s) en échec ❌`,
);
process.exit(failures ? 1 : 0);
