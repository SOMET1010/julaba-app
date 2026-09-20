// Deux suites d'invariants qui inscrivent le MÊME numéro se marchent dessus.
//
// Les specs partagent UNE base pour toute l'exécution (globalSetup la recrée une
// fois, pas une par fichier). Un numéro déjà pris fait répondre 409 au signup :
// la suite passe SEULE et échoue EN GROUPE. C'est la pire forme d'échec — on
// croit à une instabilité, on relance, et on finit par ne plus lire les rouges.
//
// C'est arrivé le 19/09/2026 : les suites ARGENT ont repris des numéros de
// `commande-negociation-lien`. Ce garde-fou coûte une milliseconde et rend la
// collision impossible à introduire sans le voir.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('les numéros de téléphone des invariants sont uniques', () => {
  it('aucun numéro n’est inscrit par deux suites différentes', () => {
    const dossier = join(__dirname, '..', 'invariants');
    const parNumero = new Map<string, string[]>();

    for (const fichier of readdirSync(dossier).filter((f) => f.endsWith('.spec.ts'))) {
      const contenu = readFileSync(join(dossier, fichier), 'utf8');
      for (const numero of new Set(contenu.match(/\+225\d{10}/g) ?? [])) {
        if (!parNumero.has(numero)) parNumero.set(numero, []);
        parNumero.get(numero)!.push(fichier);
      }
    }

    const collisions = [...parNumero.entries()]
      .filter(([, fichiers]) => fichiers.length > 1)
      .map(([numero, fichiers]) => `${numero} → ${fichiers.join(', ')}`);

    expect(collisions).toEqual([]);
  });
});
