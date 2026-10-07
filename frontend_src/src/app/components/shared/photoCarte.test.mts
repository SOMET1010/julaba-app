/**
 * B1 — LA CARTE PROPOSE LA CAMÉRA (retour terrain PIE, 07/10/2026).
 *
 * Banc textuel : `capture` est un attribut fourni au navigateur, il n'y a pas
 * de fonction à éprouver — on lit le balisage, comme `test:cible-tactile`.
 *
 * Lancer : npm run test:photo-carte
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const lire = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const choix = lire('./ChoixPhotoCarte.tsx');
const modal = lire('./ProfilUnifieModal.tsx');

let echecs = 0;
const ok = (c: boolean, l: string) => { console.log(c ? '  ✅' : '  ❌', l); if (!c) echecs++; };

const inputs = choix.match(/<input[^>]*type="file"[^>]*>/g) ?? [];
console.log('\n[1] Deux gestes : caméra ET galerie');
ok(inputs.some(i => /capture="user"/.test(i) && /accept="image\/\*"/.test(i)), 'un input image ouvre la caméra (capture="user")');
ok(inputs.some(i => !/capture=/.test(i) && /accept="image\/\*"/.test(i)), 'un input image ouvre la galerie (sans capture)');
ok(/Prendre une photo/.test(choix) && /Choisir une photo/.test(choix), 'deux boutons libellés');
ok(/minHeight: (4[4-9]|[5-9]\d)/.test(choix), 'cibles d’au moins 44 px');

console.log('\n[2] La photo est réduite avant envoi');
ok(/compressImage\(file, PHOTO_CARTE\)/.test(choix), 'utils/imageCompression réutilisé');
ok(/maxSizeKb: 150/.test(choix), 'plafond 150 Ko (la photo part en base64 dans PATCH /users)');

console.log('\n[3] Le profil l’utilise, et la consigne est dite');
ok(/<ChoixPhotoCarte color=\{cfg\.color\} speak=\{speak\} onPhoto=\{recevoirPhoto\} \/>/.test(modal), 'ProfilUnifieModal monte ChoixPhotoCarte');
ok(/speak\('Prends une photo, ou choisis une photo dans le téléphone\.'\)/.test(modal), 'ouvrir le choix DIT les deux gestes');
ok(!/type="file"/.test(modal), 'plus d’input galerie seul dans le profil');
ok(/width: 44, height: 44/.test(modal), 'le bouton appareil photo de la carte fait 44 px');

console.log(echecs === 0 ? '\nPhoto de carte : caméra proposée ✅\n' : `\n${echecs} échec(s) ❌\n`);
if (echecs) process.exit(1);
