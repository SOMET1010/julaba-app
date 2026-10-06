/**
 * QUI A LE DROIT DE PARLER AVANT LA CONNEXION — AKW-02.
 *
 * LA CAUSE D'ORIGINE, ET CE QU'ELLE EST DEVENUE. `AppContext.speak` refuse
 * tout ce qui n'est pas `role === 'marchand'` : sur les écrans d'entrée
 * personne n'est connecté, donc la phrase partait et se faisait refuser en
 * silence. Depuis AKW-01, les trois écrans d'entrée ne sont plus muets — mais
 * chacun s'est fait SA PROPRE porte dérobée vers `audioManager`, et il
 * n'existe AUCUNE règle disant qui a le droit de l'emprunter. N'importe quel
 * écran peut importer `audioManager.speak` et parler, y compris un écran
 * d'institution.
 *
 * TROIS CONTOURNEMENTS SANS RÈGLE, C'EST PIRE QU'UN REFUS : le refus se voyait.
 *
 * CE QU'ON NE FAIT PAS, ET C'EST L'ARBITRAGE DE PATRICK : desserrer
 * `user?.role !== 'marchand'`. Autoriser naïvement `user === null` partout
 * ouvrirait la voix à tous les écrans non connectés, pour toujours.
 *
 * `AppContext.tsx` EST FIGÉ PAR VOICE-01 : ce lot n'y touche pas d'une ligne.
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

console.log('\n[4] INSTITUTION ET IDENTIFICATEUR RESTENT MUETS');
for (const role of ['institution', 'identificateur', 'administrateur', 'producteur']) {
  ok(paroleAutorisee({ ecran: null, role, muet: false }).autorisee === false,
     `« ${role} » : muet, exactement comme aujourd'hui`);
  // ET MÊME SUR UN ÉCRAN D'ENTRÉE : la voie d'entrée sert à celle qui n'est
  // PAS connectée, pas à contourner la garde de rôle pour qui l'est.
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

console.log('\n[7] VOICE-01 — `AppContext.speak` N\'A PAS ÉTÉ TOUCHÉ');
{
  const app = lire('../contexts/AppContext.tsx');
  ok(/if \(user\?\.role !== 'marchand'\) return;/.test(app),
     'la garde de rôle est toujours là, mot pour mot');
  ok(/vtrace\.ttsIgnoree\('AppContext\.speak', text, 'role-non-marchand'\)/.test(app),
     'et sa trace aussi — aucune ligne figée retirée ni déplacée');
  ok(!/paroleAutorisee/.test(app),
     'ce lot n\'a rien ajouté dans le fichier figé : la voie est ailleurs');
}

console.log(echecs === 0
  ? '\n✅ Une voie nommée pour l\'entrée, et la garde de rôle intacte.\n'
  : `\n❌ ${echecs} échec(s)\n`);
process.exit(echecs === 0 ? 0 : 1);
