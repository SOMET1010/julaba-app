/**
 * Garde-fou de source — LE REPLI TACTILE PARLE (VOIX-01, lot D).
 * Lancer : npm run test:repli-parle   (tsx, sans DOM)
 * Rejouer sur un autre état du dépôt : tsx repliParle.test.mts <dossier-des-sources>
 *
 * LE DÉFAUT QU'ON FERME, mesuré sur `f0c965c` (registre VOIX-01, révision 13) :
 * `SaisieGuidee.tsx` et `ConfirmationLigne.tsx` contenaient ZÉRO appel à
 * `speak`. La « répétition de Tata » — « J'ai compris : 3 tas de tomate à 500
 * francs. C'est bon ? » — était ÉCRITE à l'écran et jamais dite. Or c'est
 * précisément le repli qu'on emprunte quand la dictée vient d'échouer : la
 * marchande qui ne lit pas y arrivait parce que sa voix n'avait pas été
 * comprise, et y trouvait un écran muet. « Aucune information importante ne
 * doit exister uniquement sous forme de texte » (doctrine du propriétaire).
 *
 * CE QUE CE TEST PROUVE, ET POURQUOI IL LIT LE SOURCE. Aucun runner de
 * composant ne tourne sur ces écrans, et la régression serait silencieuse :
 * retirer un `speak` ne casse aucun type, aucun rendu — l'écran redevient
 * juste muet, et personne ne l'entend en revue. On compte donc les appels dans
 * le code réel (commentaires retirés), et on vérifie que la phrase DITE est la
 * phrase AFFICHÉE, pas une autre.
 *
 * CE QU'IL NE PROUVE PAS : que la synthèse prononce bien, ni le moment exact où
 * la phrase part sur un vrai téléphone. C'est un test de présence et de
 * câblage, pas d'expérience.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Par défaut, les fichiers voisins ; sinon le dossier passé en argument (pour
// rejouer le test tel quel sur les sources d'un commit passé).
const dossier = process.argv[2] ?? fileURLToPath(new URL('.', import.meta.url));
const lire = (nom: string) => readFileSync(join(dossier, nom), 'utf8');

/** Retire les commentaires : on teste le code, pas ce que les commentaires racontent. */
const sansCommentaires = (src: string) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

const saisie = sansCommentaires(lire('SaisieGuidee.tsx'));
const confirmation = sansCommentaires(lire('ConfirmationLigne.tsx'));

let echecs = 0;
const ok = (cond: boolean, quoi: string) => {
  if (cond) console.log('  ✓', quoi);
  else { console.log('  ✗', quoi); echecs++; }
};

/** Nombre d'appels réels à `speak(` (pas `useApp` ni un identifiant qui s'y termine). */
const nbSpeak = (code: string) => (code.match(/(?<![\w.])speak\(/g) || []).length;

console.log(`\n[1] Le repli n'est plus muet (sources : ${dossier})`);
const nS = nbSpeak(saisie);
const nC = nbSpeak(confirmation);
ok(nS > 0, `SaisieGuidee.tsx appelle speak( au moins une fois (obtenu ${nS})`);
ok(nC > 0, `ConfirmationLigne.tsx appelle speak( au moins une fois (obtenu ${nC})`);

console.log('\n[2] La voix suit le profil : silencieuse seulement si elle a choisi « je lis »');
ok(/guidageVocal\(\)/.test(saisie), 'SaisieGuidee passe par guidageVocal()');
ok(/guidageVocal\(\)/.test(confirmation), 'ConfirmationLigne passe par guidageVocal()');

console.log('\n[3] La phrase DITE est la phrase AFFICHÉE');
// La répétition de Tata est produite par phraseConfirmation(ligne). Elle doit
// partir à la synthèse SOUS CETTE FORME — pas une paraphrase qui divergerait
// le jour où la spec §6 change.
ok(/const texteAffiche\s*=[\s\S]{0,200}phraseConfirmation\(ligne\)/.test(confirmation),
  'la phrase affichée (texteAffiche) est produite par phraseConfirmation(ligne)');
ok(/dire\(texteAffiche\)/.test(confirmation), 'et c\'est texteAffiche qui part à la synthèse');
ok(/\{texteAffiche\}/.test(confirmation), 'et c\'est texteAffiche qui est rendu à l\'écran — même variable, pas de paraphrase');
// Une fois par ligne, pas à chaque re-render : la répétition part d'un effet,
// pas du corps du composant.
ok(/useEffect\(/.test(confirmation), 'la répétition est dite depuis un useEffect (une fois par état de ligne, pas à chaque rendu)');

console.log('\n[4] Chaque étape de la saisie guidée pose sa question à voix haute');
ok(/phraseQuantiteManquante\(/.test(saisie), 'la question « Combien de … ? » est celle des dialogues de Tata, pas une phrase maison');
ok(/useEffect\(/.test(saisie), 'les questions d\'étape partent d\'un useEffect (au changement d\'étape, pas à chaque rendu)');

console.log('\n[5] Un bouton « réécouter » touchable (cible ≥ 44 px)');
// Même règle que test-cible-tactile.mjs : une cible tactile fait au moins
// 44 px. On lit la constante partagée plutôt que des styles épars, pour que
// la règle vive à un seul endroit.
const cible = /const CIBLE_TACTILE\s*=\s*(\d+)/.exec(confirmation);
ok(cible !== null && Number(cible[1]) >= 44, `CIBLE_TACTILE ≥ 44 px (obtenu ${cible ? cible[1] : 'absente'})`);
ok(/minHeight:\s*CIBLE_TACTILE/.test(confirmation) && /minWidth:\s*CIBLE_TACTILE/.test(confirmation),
  'le bouton réécouter applique CIBLE_TACTILE en hauteur ET en largeur');
ok(/aria-label="Réécouter/.test(confirmation), 'le bouton réécouter est nommé pour le lecteur d\'écran');
ok(/BoutonReecouter/.test(saisie), 'SaisieGuidee affiche aussi le bouton réécouter');

if (echecs > 0) {
  console.log(`\n✗ repli parlé — ${echecs} échec(s)`);
  process.exit(1);
}
console.log('\n✓ repli parlé — ce qui est écrit dans le repli est aussi dit');
