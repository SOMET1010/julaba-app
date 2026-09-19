// AUCUNE RÉPONSE D'AUTHENTIFICATION NE REND UN SECRET — garde-fou statique.
//
// SEC-01 a interdit au PIN d'entrer dans un journal. SEC-05 a montré que ça ne
// servait à rien tant que l'application le rendait sur demande : on protégeait
// la trace d'un code qu'on donnait. Ce fichier verrouille l'autre moitié.
//
// IL LIT LE CODE, PAS LES COMMENTAIRES. Les commentaires de `auth.controller.ts`
// parlent explicitement de `pin-decrypted` et de `PIN_READ` — c'est justement
// là qu'on explique ce qu'on a supprimé et pourquoi. Chercher ces chaînes dans
// le fichier brut ferait échouer le test À CAUSE de son propre historique.
// On retire donc commentaires et chaînes littérales avant d'analyser.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RACINE = join(__dirname, '..', '..', 'src');
const MODULES_SENSIBLES = ['auth', 'users', 'sms', 'feedbak-sms'];

function fichiers(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) {
      if (e !== 'migrations' && e !== '_archive') fichiers(p, acc);
    } else if (p.endsWith('.ts') && !p.endsWith('.spec.ts')) acc.push(p);
  }
  return acc;
}

/** Le code seul : sans commentaires. */
function codeNu(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1'))
    .join('\n');
}

const sensibles = MODULES_SENSIBLES
  .map((m) => join(RACINE, m))
  .flatMap((d) => fichiers(d));

describe('le PIN ne sort ni par une route, ni par une réponse', () => {
  it('le balayage trouve bien les fichiers d’authentification', () => {
    expect(sensibles.length).toBeGreaterThan(5);
    expect(sensibles.some((f) => f.endsWith('auth.controller.ts'))).toBe(true);
  });

  // SEC-05 — aucune route ne peut plus déchiffrer un PIN pour le rendre.
  it('aucune route ne renvoie un PIN déchiffré', () => {
    const coupables: string[] = [];
    for (const f of sensibles) {
      const code = codeNu(readFileSync(f, 'utf8'));
      // Un `return` qui transporte le résultat d'un déchiffrement, quel que
      // soit le nom de la variable ou de la route.
      for (const m of code.matchAll(/\breturn\s*\{[^}]*\}/g)) {
        const retour = m[0];
        if (/\bpin\s*[,:}]/i.test(retour) && !/pinChange|pinRequis|pinDefini/i.test(retour)) {
          coupables.push(`${f} → ${retour.replace(/\s+/g, ' ').slice(0, 110)}`);
        }
      }
    }
    expect(coupables).toEqual([]);
  });

  // SEC-06 — le code ne repart plus dans la réponse de création.
  it('aucune réponse ne porte `pinGenere`', () => {
    const coupables = sensibles.filter((f) => /\bpinGenere\b/.test(codeNu(readFileSync(f, 'utf8'))));
    expect(coupables).toEqual([]);
  });

  // La route elle-même a disparu — pas seulement son appelant.
  it('la route de déchiffrement n’est déclarée nulle part', () => {
    const coupables = sensibles.filter((f) =>
      /@(Get|Post|Patch|Put)\([^)]*pin-decrypted/.test(codeNu(readFileSync(f, 'utf8'))));
    expect(coupables).toEqual([]);
  });

  // SEC-08 — aucune route ne laisse un tiers POSER le PIN d'un autre.
  //
  // SEC-2 avait fermé la lecture ; l'attribution restait un geste humain, ce
  // qui revenait au même : le secret était connu d'un administrateur. Une route
  // paramétrée par l'identifiant d'AUTRUI (`:id`) ne doit jamais accepter un
  // PIN dans son corps. `me/change-pin` reste autorisée : l'identificateur y
  // choisit le SIEN, seul cas légitime, et c'est `me` qui le dit.
it('aucune route tierce n’accepte un PIN fourni dans le corps', () => {
    // PREMIÈRE VERSION FAUSSE, gardée en mémoire : elle coupait le bloc au
    // premier « { » rencontré — or ce « { » est justement celui de
    // `@Body() body: { pin: string }`. Le garde-fou passait au vert sur la
    // route qu'il devait interdire. Un garde-fou qui ne rougit pas sur son
    // propre cas est pire que pas de garde-fou : il endort.
    // On capture donc explicitement la LISTE DE PARAMÈTRES de la méthode.
    const coupables: string[] = [];
    for (const f of sensibles) {
      const code = codeNu(readFileSync(f, 'utf8'));
      const blocs = code.split(/(?=@(?:Get|Post|Patch|Put|Delete)\()/);
      for (const bloc of blocs) {
        const route = bloc.match(/@(?:Get|Post|Patch|Put|Delete)\(\s*['"`]([^'"`]*)['"`]/);
        if (!route) continue;
        const chemin = route[1];
        // Une route « me/… » agit sur l'appelant lui-même : l'identificateur y
        // choisit SON code, seul cas légitime. Seules les routes paramétrées
        // par l'identifiant d'AUTRUI sont concernées.
        if (!chemin.includes(':id')) continue;
        const methode = bloc.match(/async\s+\w+\s*\(([\s\S]*?)\)\s*(?::[\s\S]*?)?\{/);
        if (!methode) continue;
        const parametres = methode[1];
        if (/@Body\(/.test(parametres) && /\bpin\b/i.test(parametres)) {
          coupables.push(`${f} → ${chemin}`);
        }
      }
    }
    expect(coupables).toEqual([]);
  });

    // SEC-07 — un secret ne se tire pas avec un générateur non cryptographique.
  it('aucun secret n’est tiré avec Math.random', () => {
    const coupables: string[] = [];
    for (const f of sensibles) {
      const code = codeNu(readFileSync(f, 'utf8'));
      if (/Math\.random\s*\(/.test(code)) coupables.push(f);
    }
    expect(coupables).toEqual([]);
  });
});
