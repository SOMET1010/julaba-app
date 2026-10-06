/**
 * QUI A LE DROIT DE PARLER AVANT LA CONNEXION — AKW-02.
 *
 * LA CAUSE D'ORIGINE, ET CE QU'ELLE EST DEVENUE. `AppContext.speak` refusait
 * tout ce qui n'est pas `role === 'marchand'` : sur les écrans d'entrée
 * personne n'est connecté, donc la phrase partait et se faisait refuser en
 * silence. Depuis AKW-01, les trois écrans d'entrée ne sont plus muets — mais
 * chacun s'était fait SA PROPRE porte dérobée vers `audioManager`, et il
 * n'existait AUCUNE règle disant qui a le droit de l'emprunter. N'importe quel
 * écran pouvait importer `audioManager.speak` et parler, y compris un écran
 * d'institution.
 *
 * TROIS CONTOURNEMENTS SANS RÈGLE, C'EST PIRE QU'UN REFUS : le refus se voyait.
 *
 * HISTORIQUE — DEUX ARBITRAGES, LE SECOND SUPERSEDE LE PREMIER :
 *
 *  1. AKW-02 (arbitrage de Patrick) : ne PAS desserrer `user?.role !==
 *     'marchand'` dans `AppContext.speak`. Autoriser naïvement `user === null`
 *     partout aurait ouvert la voix à tous les écrans non connectés, pour
 *     toujours. `AppContext.tsx` était alors figé par VOICE-01.
 *
 *  2. §8.1 de l'audit UX du 06/10/2026 (AUDIT-UX-ROLES-2026-10-06, décision
 *     Patrick, exécutée le jour même dans `060c333`) : `AppContext.speak` est
 *     OUVERT aux trois rôles — l'ancien garde rendait ~40 appels producteur
 *     muets et le bouton Tata identificateur inerte, en contradiction avec la
 *     doctrine elle-même (« Aucune information importante ne doit exister
 *     uniquement sous forme de texte », Patrick 20/09). LE MUET UTILISATEUR
 *     RESTE LA BORNE : elle passe avant tout. La décision est consignée sur
 *     le site même du garde retiré (`AppContext.tsx`, commentaire « VOIX
 *     OUVERTE AUX TROIS RÔLES »). Réécriture de la garde demandée par
 *     REVIEW-004/B4-2 (les deux assertions figées sur l'ANCIENNE doctrine
 *     rougissaient depuis le retrait du garde).
 *
 * LA VOIE D'ENTRÉE, ELLE, NE CHANGE PAS : avant la connexion, personne n'est
 * connecté, et la règle AKW-02 ci-dessous reste exactement la même — un seul
 * passage nommé, `parlerAvantConnexion`, pour les trois écrans d'entrée. Ce
 * que §8.1 a ouvert, c'est la voix APRÈS connexion ; ce garde continue de
 * verrouiller la voix AVANT, et les sections [1] à [6] restent mot pour mot.
 *
 * Lancer : npm run test:parole-entree
 */
import { readFileSync } from 'node:fs';
import { paroleAutorisee, ECRANS_DENTREE, type EcranParlant } from './paroleEntree.js';

let echecs = 0;
const ok = (c: boolean, quoi: string) => {
  console.log(`  ${c ? '✓' : '✗'} ${quoi}`);
  if (!c) echecs++;
};
const lire = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf-8');
const sansCommentaires = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n');

console.log('\nAvant la connexion, seule l\'entrée a le droit de parler\n');

console.log('[1] ÉCRAN D\'ENTRÉE, PERSONNE CONNECTÉ → LA VOIX PARLE');
for (const ecran of ECRANS_DENTREE) {
  const d = paroleAutorisee({ ecran, role: null, muet: false });
  ok(d.autorisee === true, `« ${ecran} » : elle entend le premier écran de son téléphone`);
}

console.log('\n[2] AILLEURS, PERSONNE CONNECTÉ → REFUS');
{
  const d = paroleAutorisee({ ecran: null, role: null, muet: false });
  ok(d.autorisee === false, 'un appel ordinaire sans personne connectée reste refusé');
  ok(d.raison === 'role-non-marchand',
     `et la raison ne change pas — « ${d.raison} », comme aujourd'hui`);
  // Un écran inventé ne s'autorise pas lui-même.
  const faux = paroleAutorisee({ ecran: 'coopérative' as unknown as EcranParlant, role: null, muet: false });
  ok(faux.autorisee === false, 'un écran qui se déclare « d\'entrée » sans l\'être est refusé');
}

console.log('\n[3] MARCHAND CONNECTÉ → RIEN NE CHANGE');
{
  ok(paroleAutorisee({ ecran: null, role: 'marchand', muet: false }).autorisee === true,
     'la caisse parle comme avant');
  ok(paroleAutorisee({ ecran: 'akwaba', role: 'marchand', muet: false }).autorisee === true,
     'et une marchande connectée qui repasse par l\'entrée l\'entend aussi');
}

console.log('\n[4] INSTITUTION ET IDENTIFICATEUR RESTENT MUETS (SUR LA VOIE D\'ENTRÉE)');
for (const role of ['institution', 'identificateur', 'administrateur', 'producteur']) {
  ok(paroleAutorisee({ ecran: null, role, muet: false }).autorisee === false,
     `« ${role} » : muet, exactement comme aujourd'hui`);
  // ET MÊME SUR UN ÉCRAN D'ENTRÉE : la voie d'entrée sert à celle qui n'est
  // PAS connectée, pas à contourner la garde de rôle pour qui l'est. (§8.1
  // a ouvert `AppContext.speak` APRÈS connexion — elle n'ouvre pas la voix
  // d'entrée à un rôle connecté, et ce garde le verrouille toujours.)
  ok(paroleAutorisee({ ecran: 'akwaba', role, muet: false }).autorisee === false,
     `« ${role} » : et l'entrée ne lui ouvre aucune porte`);
}

console.log('\n[5] LE MUET GLOBAL PASSE AVANT TOUT');
{
  for (const ecran of [...ECRANS_DENTREE, null]) {
    const d = paroleAutorisee({ ecran, role: null, muet: true });
    ok(d.autorisee === false && d.raison === 'muet',
       `« ${ecran ?? 'ailleurs'} » : elle a coupé le son, on se tait`);
  }
  ok(paroleAutorisee({ ecran: null, role: 'marchand', muet: true }).autorisee === false,
     'y compris pour une marchande connectée');
}

console.log('\n[6] LE VRAI PARCOURS — LES TROIS ÉCRANS PASSENT PAR LA RÈGLE');
{
  const ECRANS: Array<[string, string]> = [
    ['écran 1 — Akwaba', '../components/auth/Welcome.tsx'],
    ['écran 2 — Tantie se présente', '../components/auth/OnboardingSlides.tsx'],
    ['écran 3 — connexion', '../components/auth/LoginPassword.tsx'],
  ];
  for (const [nom, chemin] of ECRANS) {
    const code = sansCommentaires(lire(chemin));
    ok(/parlerAvantConnexion\(/.test(code), `${nom} passe par LA porte`);
    // CE QUE CE GARDE INTERDIT VRAIMENT : rouvrir une porte à soi. Chacun de
    // ces écrans en avait une ; il ne doit plus en exister qu'une seule.
    // `stopAllVoice` reste permis : se TAIRE n'est pas parler. Ce qu'on
    // interdit, c'est d'importer de quoi PARLER.
    ok(!/import \{[^}]*\bspeak\b[^}]*\} from '\.\.\/\.\.\/services\/audioManager'/.test(code),
       `${nom} n'importe plus de quoi parler depuis le moteur`);
    ok(!/\bdireTexte\(/.test(code) && !/audioManager\.speak\(/.test(code),
       `${nom} n'appelle plus le moteur en direct`);
  }
  // Et l'écran de connexion garde SON canal : la primitive décide qui parle,
  // elle ne change pas ce qui est entendu.
  ok(/parlerAvantConnexion\('connexion', texte, direEntreeTexte\)/.test(
       sansCommentaires(lire('../components/auth/LoginPassword.tsx'))),
     'l\'écran 3 garde `direEntreeTexte` — le son entendu ne change pas');
}

console.log('\n[7] §8.1 — `AppContext.speak` : voix ouverte aux trois rôles, le muet reste LA borne');
{
  const app = lire('../contexts/AppContext.tsx');
  // La décision est consignée SUR LE SITE du garde retiré — elle doit rester
  // lisible dans le code, pas seulement dans l'audit.
  ok(/VOIX OUVERTE AUX TROIS RÔLES/.test(app),
     'la décision §8.1 (06/10) est consignée sur le site même du garde retiré');
  // L'ANCIEN GARDE NE REVIENT PAS EN SILENCE. Rien n'interdit de re-garder
  // la voix un jour — c'est le faire SANS réécrire cette garde qui est
  // interdit, exactement le défaut que B4-2 a pointé sur l'ancienne doctrine.
  ok(!/if \(user\?\.role !== 'marchand'\) return;/.test(app),
     'l\'ancien garde « marchand seul » ne revient pas en silence (supersédé §8.1, historique dans git)');
  ok(!/ttsIgnoree\('AppContext\.speak', text, 'role-non-marchand'\)/.test(app),
     'la trace du refus de rôle est partie avec le garde — pas de cadavre de trace');
  // LA BORNE : le muet refuse AVANT toute sortie sonore, et le refus est tracé.
  ok(/if \(voiceMuted\) vtrace\.ttsIgnoree\('AppContext\.speak', text, 'muet'\);/.test(app),
     'le refus muet est journalisé — la borne unique doit rester observable');
  ok(/if \(voiceMuted\) return;/.test(app),
     'le muet coupe avant toute sortie sonore — la borne passe avant tout');
  // L'observabilité d'origine reste entière.
  ok(/vtrace\.ttsAppel\('AppContext\.speak'/.test(app),
     'l\'appel reste journalisé (le Rapport de test ne ment pas par omission)');
  // La voie d'entrée n'a pas fui dans le contexte global.
  ok(!/paroleAutorisee/.test(app),
     'paroleAutorisee reste la porte de l\'entrée seule — elle ne gouverne pas AppContext');
}

console.log(echecs === 0
  ? '\n✅ Une voie nommée pour l\'entrée, la voix ouverte aux trois rôles après connexion, le muet comme seule borne.\n'
  : `\n❌ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
