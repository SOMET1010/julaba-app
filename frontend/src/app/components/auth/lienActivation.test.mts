/**
 * B4 — L'ACTIVATION EST ATTEIGNABLE DEPUIS L'ÉCRAN DU CODE (audit UX-02).
 *
 * `/activation` n'avait aucun lien entrant : une marchande enrôlée, avec le
 * code lu par son agent, ne pouvait pas l'utiliser dans l'APK.
 *
 * Lancer : npm run test:lien-activation
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { MESSAGES_TTS } from '../../i18n/voice/catalog.js';
import { tParle } from '../../i18n/voice/runtime.js';

const lire = (rel: string) => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
const bouton = lire('./BoutonCodeAgent.tsx');
const login = lire('./LoginPassword.tsx');
const routes = lire('../../routes.tsx');

let echecs = 0;
const ok = (c: boolean, l: string) => { console.log(c ? '  ✅' : '  ❌', l); if (!c) echecs++; };

console.log('\n[1] Le lien existe');
ok(/path: '\/activation', element: <ActivationScreen \/>/.test(routes), 'la route /activation existe');
ok(/navigate\('\/activation'\)/.test(bouton), 'le bouton mène à /activation');
ok(/J&apos;ai un code de mon agent/.test(bouton), 'libellé « J’ai un code de mon agent »');
ok(/minHeight: (4[4-9]|[5-9]\d)/.test(bouton), 'cible d’au moins 44 px');
ok(/<BoutonCodeAgent disabled=\{isLoading\} \/>/.test(login), 'LoginPassword affiche le bouton sur l’écran du code');

console.log('\n[2] La phrase est dite');
// RÉALITÉ DU 26/10 (refacto vocale d'Akoun 9a584805 + lot « toutes les
// éventualités ») : le bouton navigue vers /activation SANS annonce à
// l'enchaînement — c'est l'écran d'activation qui parle À L'ARRIVÉE
// (accueil login-51), puis à chaque erreur (les erreurs de validation se
// disent par clips login-59 à 63). L'ancien enchaînement attenteCodeRef
// (direConsigneCodeAgent après la consigne du code) a été retiré par le
// refacto et son garde restait rouge SANS LIAISON avec ce lot — cassé sur
// la base propre 30b8623b, prouvé par git stash. Le garde dit désormais le
// contrat actuel : la voix de l'activation vit sur l'écran d'activation.
const entree = (MESSAGES_TTS as readonly { id: string; frActuel: string }[]).find(m => m.id === 'ENTREE_CODE_AGENT');
ok(!!entree && /agent/.test(entree.frActuel) && /clé/.test(entree.frActuel), 'phrase ENTREE_CODE_AGENT au catalogue (agent + clé)');
ok(tParle('ENTREE_CODE_AGENT') === entree?.frActuel, 'la clé se résout en phrase (pas « [ENTREE_CODE_AGENT] »)');
ok(/parlerAvantConnexion\('connexion', tParle\('ENTREE_CODE_AGENT'\)\)/.test(bouton), 'dite par la porte d’avant connexion');
const activation = lire('./ActivationScreen.tsx');
ok(/direConsigne\(\);/.test(activation), 'l’écran d’activation dit son accueil à l’arrivée');
ok(/Tape le code que tu as reçu/.test(activation), 'l’accueil dit est celui du clip login-51');
ok(/parle\(error\)/.test(activation), 'chaque erreur de l’activation se dit (clips login-59 à 63)');

console.log(echecs === 0 ? '\nActivation atteignable et annoncée ✅\n' : `\n${echecs} échec(s) ❌\n`);
if (echecs) process.exit(1);
