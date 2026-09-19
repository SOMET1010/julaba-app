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
