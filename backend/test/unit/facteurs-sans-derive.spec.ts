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

// ── La liste de départ de la campagne est un FAIT, pas une liste tapée ───────
//
// docs/CAMPAGNE_MESURE_CONDITIONNEMENTS.md annonce 7 couples
// (produit × conditionnement) à peser. Ils sont tirés du seed de `db-init`.
// Le jour où quelqu'un ajoute au référentiel un produit en `panier`, la liste
// du document devient fausse en silence — et une campagne terrain serait lancée
// sur un périmètre incomplet. Ce test l'interdit.
describe('Campagne — la liste à peser colle au référentiel semé', () => {
  const DB_INIT = join(RACINE, 'backend', 'src', 'database', 'db-init.service.ts');
  const DOC = join(RACINE, 'docs', 'CAMPAGNE_MESURE_CONDITIONNEMENTS.md');

  // Unités de masse : le facteur y est une définition, rien à peser.
  const MASSE = new Set(['kg', 'g', 'tonne', 't']);

  /** Les couples (nom, unite) du seed `caisse_produits` de db-init. */
  function seedReferentiel(): Array<{ nom: string; unite: string }> {
    const src = readFileSync(DB_INIT, 'utf8');
    return [...src.matchAll(/\{\s*nom:\s*'([^']+)',\s*categorie:\s*'[^']*',\s*unite:\s*'([^']+)'/g)]
      .map((m) => ({ nom: m[1], unite: m[2] }));
  }

  it('le balayage retrouve bien le référentiel semé (non-vacuité)', () => {
    expect(seedReferentiel().length).toBe(21);
  });

  it('exactement 7 couples sont à peser, et le document les cite tous', () => {
    const aPeser = seedReferentiel().filter((p) => !MASSE.has(p.unite.toLowerCase()));
    expect(aPeser).toHaveLength(7);

    const doc = readFileSync(DOC, 'utf8');
    for (const { nom, unite } of aPeser) {
      // Chaque couple doit apparaître sur une même ligne du tableau du document.
      const ligne = doc.split('\n').find((l) => l.includes(`| ${nom} |`));
      expect(ligne).toBeDefined();
      expect(ligne).toContain(unite);
    }
  });

  it('`tas` porte deux sens incompatibles — c’est le cas prioritaire', () => {
    // Côté caisse, `tas` est le conditionnement du gombo et du piment (un tas
    // de marché). Côté récolte, la table de conversion le chiffre à 50 kg.
    const enTas = seedReferentiel().filter((p) => p.unite === 'tas').map((p) => p.nom).sort();
    expect(enTas).toEqual(['Gombo', 'Piment']);
    expect(facteursDeLEcran().tas).toBe(50);
  });
});
