/**
 * CORS-01 — toute méthode employée par le front est autorisée par CORS.
 *
 * LE DÉFAUT, vécu deux fois. Terrain du 24/09 : « Erreur, Impossible de
 * modifier le stock ». Agent de test du 25/09 :
 *   [GestionStock] saveInlineEdit failed: Failed to fetch
 *
 * La modification d'un produit part en `PUT /caisse/produits/:id`, et la route
 * EXISTE (caisse-rest.controller.ts). Mais l'en-tête CORS annonçait
 * « GET,POST,PATCH,DELETE,OPTIONS » — sans PUT. Le navigateur refusait le
 * préflight et la requête NE PARTAIT JAMAIS.
 *
 * POURQUOI C'ÉTAIT SI DUR À VOIR. Côté serveur, rien dans les journaux : la
 * requête n'y arrivait pas. Côté écran, « Erreur lors de la sauvegarde », qui
 * ne dit pas que c'est le navigateur qui a refusé. Et la vente marchait (POST),
 * ce qui donnait l'impression que l'API allait bien.
 *
 * Le correctif STK-06 du 24/09 — un champ vidé n'écrit plus 0 — était juste, et
 * restait invisible : il corrigeait ce que le serveur ÉCRIT, quand le problème
 * était que la requête ne l'atteignait pas.
 *
 * CE TEST lit les méthodes RÉELLEMENT employées dans le code du front, et
 * vérifie que chacune est déclarée. Aucune liste recopiée à la main : une copie
 * se périme, et c'est exactement ce qu'on empêche.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const RACINE = resolve(__dirname, '../../..');

function fichiersSource(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { if (e !== 'node_modules') fichiersSource(p, out); }
    else if (/\.(ts|tsx)$/.test(e)) out.push(p);
  }
  return out;
}

describe('CORS-01 — les méthodes du front sont autorisées', () => {
  const main = readFileSync(join(RACINE, 'backend/src/main.ts'), 'utf-8');
  const entete = /Access-Control-Allow-Methods',\s*'([^']+)'/.exec(main)?.[1] ?? '';
  const autorisees = new Set(entete.split(',').map(s => s.trim()));

  const employees = new Set<string>();
  for (const f of fichiersSource(join(RACINE, 'frontend_src/src/app'))) {
    for (const m of readFileSync(f, 'utf-8').matchAll(/method:\s*'(GET|POST|PUT|PATCH|DELETE)'/g)) {
      employees.add(m[1]);
    }
  }

  it('l’en-tête CORS est bien lu dans main.ts', () => {
    expect(entete).toBeTruthy();
    expect(autorisees.has('OPTIONS')).toBe(true);
  });

  it('LE DÉFAUT EXACT : PUT est autorisé', () => {
    // `PUT /caisse/produits/:id` — la modification d'un produit par la marchande.
    expect(autorisees.has('PUT')).toBe(true);
  });

  it('chaque méthode employée par le front est autorisée', () => {
    const manquantes = [...employees].filter(m => !autorisees.has(m)).sort();
    expect(manquantes).toEqual([]);
  });

  it('le front emploie bien les cinq méthodes attendues', () => {
    // Si cette liste change, c'est que le front a bougé : on veut le savoir.
    expect([...employees].sort()).toEqual(['DELETE', 'GET', 'PATCH', 'POST', 'PUT']);
  });
});
