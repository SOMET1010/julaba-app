/**
 * AUTH-02 — le code de connexion ne voyage plus dans history.state.
 *
 * LE DÉFAUT QU'ON EMPÊCHE DE REVENIR. L'écran de connexion passait le code
 * à l'écran « changement de mot de passe » par
 * `navigate('/change-password', { state: { codeActuel: pwd } })`. React
 * Router persiste `state` dans `window.history.state`, où il SURVIT au
 * rechargement — un code secret, lisible par quiconque ouvre la console sur
 * le téléphone laissé au comptoir.
 *
 * LE CANAL QUI REMPPLACE. `services/codeActuelMemoire.ts` : une variable de
 * module, consommée à la lecture (one-shot), jamais écrite dans un stockage
 * ni dans l'URL ni dans l'historique. L'intention produit reste servie —
 * l'écran suivant ne redemande pas le code — sans la persistance accidentelle.
 *
 * CE QUE LA GARDE VÉRIFIE :
 *   1. plus aucun `codeActuel` dans un `state` de navigation ;
 *   2. plus aucune lecture `location.state` côté écran de changement ;
 *   3. l'émetteur dépose dans le canal, le récepteur le lit ;
 *   4. le canal reste PUR : pas de localStorage/sessionStorage/document/history.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ICI = dirname(fileURLToPath(import.meta.url));
const lire = (rel) => readFileSync(join(ICI, '..', rel), 'utf8');

let echecs = 0;
const verifier = (quoi, ok, pourquoi) => {
  if (ok) { console.log(`  ✓ ${quoi}`); return; }
  echecs++;
  console.log(`  ✗ ${quoi}`);
  if (pourquoi) console.log(`      ${pourquoi}`);
};

// On cherche du CODE, pas les commentaires qui racontent l'incident.
const sansCommentaires = (s) => s
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n')
  .filter((l) => !l.trim().startsWith('//'))
  .join('\n');

console.log('\nLe code de connexion ne transite plus par history.state');

const canalExiste = existsSync(join(ICI, '..', 'src', 'app', 'services', 'codeActuelMemoire.ts'));
verifier('le canal mémoire services/codeActuelMemoire.ts existe', canalExiste);

if (canalExiste) {
  const canal = sansCommentaires(lire('src/app/services/codeActuelMemoire.ts'));
  verifier(
    'le canal est PUR (ni stockage, ni DOM, ni historique)',
    !/localStorage|sessionStorage|document\.|history|window\./.test(canal),
    'une fuite de canal vers un stockage recréerait exactement le défaut AUTH-02.',
  );
  verifier(
    'la lecture est ONE-SHOT (le code s’efface en étant lu)',
    /code = null/.test(canal),
    'un canal qui conserve rend le code re-lisible indéfiniment.',
  );
}

const login = sansCommentaires(lire('src/app/components/auth/LoginPassword.tsx'));
verifier(
  'plus aucun codeActuel dans un state de navigation',
  !/state:\s*\{\s*codeActuel/.test(login),
  '`navigate(path, { state: { codeActuel } })` écrit le code dans history.state.',
);
verifier(
  'l’écran de connexion DÉPOSE le code dans le canal',
  /deposerCodeActuel\(/.test(login),
  'sans dépôt, l’écran suivant redemandera le code à qui ne lit pas.',
);

const change = sansCommentaires(lire('src/app/components/auth/ChangePasswordScreen.tsx'));
verifier(
  'plus aucune lecture location.state côté changement de mot de passe',
  !/location\.state/.test(change),
  'lire location.state réintroduit la persistance du code dans l’historique.',
);
verifier(
  'l’écran de changement LIT le canal',
  /lireCodeActuel\(\)/.test(change),
  'le récepteur du canal est l’écran de changement de mot de passe.',
);

if (echecs > 0) {
  console.log('\n✗ canal du code de connexion — échec');
  process.exit(1);
}
console.log('\n✓ canal du code — en mémoire seule, one-shot, jamais dans l’historique');
