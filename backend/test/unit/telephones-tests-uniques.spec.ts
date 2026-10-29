// Deux suites d'invariants qui inscrivent le MÊME numéro se marchent dessus.
//
// Les specs partagent UNE base pour toute l'exécution (globalSetup la recrée une
// fois, pas une par fichier). Un numéro déjà pris fait répondre 409 au signup :
// la suite passe SEULE et échoue EN GROUPE. C'est la pire forme d'échec — on
// croit à une instabilité, on relance, et on finit par ne plus lire les rouges.
//
// C'est arrivé le 19/09/2026 : les suites ARGENT ont repris des numéros de
// `commande-negociation-lien`. Et encore le 29/10/2026 : cinq paires de
// suites se marchaient dessus (dge-09/stk-04, fidelite/prod-05, financial-
// score/sec-besoin-01, ident-02/ident-10, ident-09/m6-m8) — vécues comme
// des « suites instables » tant que le garde n'existait pas. Ce garde-fou
// coûte une milliseconde et rend la collision impossible à introduire sans
// le voir.
//
// Allotissement des plages (à respecter à la création d'une suite) :
//   +22507000008xx   m6-m8-role-escalation (famille M6-M8)
//   +22507000009xx   bloc IDENT/sécurité : 0900-0902 ident-11, 0910-0913
//                    ident-02, 0915-0918 ident-09, 0921-0923 cai-09,
//                    0925-0926 sec-besoin-01, 0930 stk-04 — prochains libres :
//                    0931-0999
//   +225078888xxxx   suites ARGENT/PROD (fournies aux autres fichiers, ex.
//                    prod-05 : « cf. le garde-fou »)
// Toute autre plage est libre à condition d'être UNIQUE entre fichiers —
// ce test le vérifie quoi qu'il arrive.

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
