/**
 * LE CODE EN IMAGES NE LAISSE PLUS PERSONNE DANS L'IMPASSE.
 * Lancer : npm run test:login-images-repli
 *
 * LE DÉFAUT QU'ON FERME. Le pavé imagé est un mode d'aide, pas une autre
 * authentification. Une marchande qui l'a activé autrefois et qui ne se
 * souvient plus de la correspondance image→chiffre n'avait qu'une seule
 * issue : deviner. Quatre images fausses, et l'écran restait identique —
 * aucune explication, aucun retour aux chiffres automatique.
 *
 * CE QUE LA GARDE TIENT :
 *   1. le clip login-27 existe, embarqué, et dit exactement la phrase jouée ;
 *   2. un échec de connexion en mode images REVIENT aux chiffres ;
 *   3. le choix est persisté à « 0 » : le prochain écran ne réarme pas le piège ;
 *   4. le code saisi est effacé, et la voix repart sur login-27 ;
 *   5. ce repli est dans la branche d'échec, avant les messages 429/verrou.
 */
(import.meta as unknown as { env: Record<string, string> }).env ??= {};

const { ENTREE_VOICE_CLIPS } = await import('./entreeVoix.js');
const { readFileSync, existsSync } = await import('node:fs');
const { join, dirname } = await import('node:path');
const { fileURLToPath } = await import('node:url');

let echecs = 0;
const ok = (c: boolean, quoi: string, detail = '') => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) {
    echecs++;
    if (detail) console.log(`      ${detail}`);
  }
};

const app = join(dirname(fileURLToPath(import.meta.url)), '..');
const sansCommentaires = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !l.trim().startsWith('//'))
  .join('\n');
const ecran = sansCommentaires(readFileSync(join(app, 'components/auth/LoginPassword.tsx'), 'utf8'));

console.log('\n[1] login-27 est le clip du repli, et il est embarqué');
{
  const clip = ENTREE_VOICE_CLIPS.pinImagesEchec;
  ok(clip?.file === '/voix/tata/login-27.mp3', 'le repli pointe login-27', `obtenu : ${clip?.file}`);
  ok(clip?.texte === "Ce n'est pas toi ? Y'a pas problème, appuie ici pour taper ton numéro.",
    'le texte est celui du clip enregistré', `obtenu : « ${clip?.texte} »`);
  ok(clip?.lotA === true && clip?.atteste === false,
    'lot A : il passe en production, sans prétendre qu’une oreille l’a validé');
  ok(existsSync(join(app, '..', '..', 'public', clip.file.replace(/^\//, ''))),
    'le fichier audio existe dans public/', clip.file);
}

console.log('\n[2] l’échec en images ramène AUX CHIFFRES, pas à l’impasse');
{
  const debut = ecran.indexOf('if (!response.ok || result.error)');
  const repli = ecran.indexOf('if (pinEnImages)', debut);
  const apres = repli >= 0 ? ecran.slice(repli, repli + 700) : '';
  ok(debut >= 0 && repli > debut, 'le repli vit DANS la branche d’échec de connexion');
  ok(/setPinEnImages\(false\)/.test(apres), 'le pavé repasse en chiffres');
  ok(/localStorage\.setItem\('julaba_pin_images', '0'\)/.test(apres),
    'le choix est persisté à « 0 » — le piège ne se réarme pas au prochain écran');
  ok(/setPinInput\(''\)/.test(apres), 'le code tenté en images est effacé');
  ok(/parle\(ENTREE_VOICE_CLIPS\.pinImagesEchec\.texte\)/.test(apres),
    'la voix joue login-27, le clip qui nomme le geste de secours');
  ok(/return;/.test(apres), 'le repli s’arrête là : aucun message générique empilé');
}

console.log('\n[3] le repli passe AVANT les messages de quota et de verrou');
{
  const repli = ecran.indexOf('if (pinEnImages)');
  const quota = ecran.indexOf('if (response.status === 429)');
  const verrou = ecran.indexOf('if (result.locked === true)');
  ok(repli >= 0 && quota > repli, 'le repli est avant le message « trop forcé »');
  ok(repli >= 0 && verrou > repli, 'le repli est avant le message de verrou');
}

console.log(echecs === 0
  ? '\n✓ le code en images a une sortie : login-27, puis les chiffres\n'
  : `\n✗ ${echecs} échec(s) — le repli du code imagé n’est pas garanti.\n`);
process.exit(echecs === 0 ? 0 : 1);
