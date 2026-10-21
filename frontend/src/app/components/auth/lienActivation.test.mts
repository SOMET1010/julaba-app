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
const entree = (MESSAGES_TTS as readonly { id: string; frActuel: string }[]).find(m => m.id === 'ENTREE_CODE_AGENT');
ok(!!entree && /agent/.test(entree.frActuel) && /clé/.test(entree.frActuel), 'phrase ENTREE_CODE_AGENT au catalogue (agent + clé)');
ok(tParle('ENTREE_CODE_AGENT') === entree?.frActuel, 'la clé se résout en phrase (pas « [ENTREE_CODE_AGENT] »)');
ok(/parlerAvantConnexion\('connexion', tParle\('ENTREE_CODE_AGENT'\)\)/.test(bouton), 'dite par la porte d’avant connexion');
ok(/direConsigne\('code'\)\.then\(\(\) => \{ if \(attenteCodeRef\.current\) void direConsigneCodeAgent\(\); \}\)/.test(login),
  'enchaînée après la consigne du code, seulement si rien n’est tapé');
ok(/attenteCodeRef\.current = step === 'password' && pinInput === ''/.test(login), 'un chiffre tapé fait taire la phrase');

console.log(echecs === 0 ? '\nActivation atteignable et annoncée ✅\n' : `\n${echecs} échec(s) ❌\n`);
if (echecs) process.exit(1);
