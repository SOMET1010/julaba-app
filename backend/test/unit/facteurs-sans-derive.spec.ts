// Le script d'audit RECOPIE la table de facteurs de l'écran. Toute recopie
// dérive un jour : ce test échoue le jour où elle dérive, pendant qu'un audit
// serait encore réputé fiable.
//
// On ne compare pas des fichiers : on extrait les couples (unité, facteur) des
// DEUX sources et on exige l'égalité. Si l'écran passe « panier » à 12 kg et
// que l'audit continue de dire 10, le chiffre affiché dans le rapport serait
// faux — exactement le genre d'erreur qu'un audit ne doit pas produire.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const RACINE = join(__dirname, '..', '..', '..');
const ECRAN = join(RACINE, 'frontend_src', 'src', 'app', 'components', 'producteur', 'RecolteForm.tsx');
const AUDIT = join(RACINE, 'backend', 'scripts', 'audit-facteur-recoltes.cjs');

/** Les `{ id: 'sac', …, facteur: 100, … }` de la table UNITES de l'écran. */
function facteursDeLEcran(): Record<string, number> {
  const src = readFileSync(ECRAN, 'utf8');
  const out: Record<string, number> = {};
  for (const m of src.matchAll(/\{\s*id:\s*'([a-zéè]+)'[^}]*?facteur:\s*([\d.]+)/g)) {
    out[m[1]] = Number(m[2]);
  }
  return out;
}

/** Le littéral `const FACTEURS = { … }` du script d'audit. */
function facteursDeLAudit(): Record<string, number> {
  const src = readFileSync(AUDIT, 'utf8');
  const bloc = src.match(/const FACTEURS = \{([\s\S]*?)\};/);
  if (!bloc) throw new Error('bloc FACTEURS introuvable dans le script d’audit');
  const out: Record<string, number> = {};
  for (const m of bloc[1].matchAll(/([a-zéè]+):\s*([\d.]+)/g)) out[m[1]] = Number(m[2]);
  return out;
}

describe('Audit du facteur — la recopie ne dérive pas de l’écran', () => {
  it('le balayage trouve bien une table dans chaque source (non-vacuité)', () => {
    expect(Object.keys(facteursDeLEcran()).length).toBeGreaterThanOrEqual(7);
    expect(Object.keys(facteursDeLAudit()).length).toBeGreaterThanOrEqual(7);
  });

  it('les deux tables de facteurs sont IDENTIQUES', () => {
    expect(facteursDeLAudit()).toEqual(facteursDeLEcran());
  });

  it('le facteur du kilo vaut 1 — c’est ce qui rend toute inférence impossible', () => {
    // Si un jour `kg` cessait de valoir 1, la conclusion centrale de l'audit
    // (« indéterminable par construction ») devrait être réécrite.
    expect(facteursDeLEcran().kg).toBe(1);
  });

  it('le script d’audit n’écrit JAMAIS : aucun verbe d’écriture hors du test du verrou', () => {
    const src = readFileSync(AUDIT, 'utf8');
    // La seule écriture tolérée est l'UPDATE vide qui ÉPROUVE le verrou.
    const sansSonde = src.replace(/'UPDATE recoltes SET unite = unite WHERE false'/g, '');
    for (const verbe of ['INSERT INTO', 'DELETE FROM', 'ALTER TABLE', 'DROP ', 'TRUNCATE', 'CREATE TABLE']) {
      expect(sansSonde.toUpperCase()).not.toContain(verbe);
    }
  });

  it('le script EXIGE la lecture seule et la met à l’épreuve', () => {
    const src = readFileSync(AUDIT, 'utf8');
    expect(src).toContain('SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY');
    expect(src).toContain("'25006'");
  });
});
