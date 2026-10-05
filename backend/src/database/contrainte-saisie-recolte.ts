/**
 * INTÉGRITÉ DE LA SAISIE BRUTE D'UNE RÉCOLTE.
 *
 * CE QUE LA REVUE CONTRADICTOIRE A MESURÉ. Les trois colonnes
 * `quantite_saisie / unite_saisie / facteur_saisie` étaient ouvertes SANS
 * aucune garde. Six attaques par l'API réelle, six acceptées en 201 :
 *   « 3 paniers × 10 kg » avec `quantite = 999`   -> accepté
 *   triplet partiel (`facteur_saisie` absent)     -> accepté
 *   `quantite_saisie = -3`, `facteur_saisie = -10` -> accepté, et comme
 *                                                     -3 × -10 = 30, la ligne
 *                                                     était « cohérente » tout
 *                                                     en étant absurde
 * Avant ce lot la saisie était PERDUE ; sans ces gardes elle pouvait MENTIR.
 * Une colonne sans garde se remplit de bruit dès le premier jour, et on ne
 * nettoie pas le passé.
 *
 * CE QUE CE LOT PERMET D'AFFIRMER, ET RIEN DE PLUS :
 *
 *   « Les composantes métier de la saisie d'origine sont conservées séparément
 *     de la quantité canonique, avec une précision bornée par le schéma. »
 *
 *   et, grâce aux gardes ci-dessous :
 *
 *   « Toute nouvelle saisie structurée est atomique, positive et cohérente
 *     avec la quantité canonique. »
 *
 * On n'écrit PAS « la saisie brute est conservée sans transformation » : c'est
 * faux au sens strict, et un mutant le démontre. `numeric(12,3)` arrondit —
 * 3,00049 devient 3,000. L'écran ne produit jamais de telles valeurs (pas de
 * 1 ou 0,1), mais l'API les accepte, et une affirmation qu'on ne peut pas
 * tenir ne vaut rien.
 *
 * LA RÈGLE — atomique, positive, cohérente :
 *   soit les trois colonnes sont NULL (toute ligne antérieure à ce lot) ;
 *   soit les trois sont renseignées, strictement positives, l'unité non vide,
 *   et `quantite_saisie × facteur_saisie` retrouve `quantite`.
 *
 * `NOT VALID` : la contrainte protège les ÉCRITURES (INSERT et UPDATE) sans
 * scanner ni rejeter l'historique. C'est le même mécanisme que les contraintes
 * d'argent et de stock de la caisse. `SQL_LIGNES_NON_CONFORMES` permet
 * d'inspecter le passé sans rien lui imposer.
 *
 * POURQUOI UN ARRONDI À 1 DÉCIMALE, ET PAS UN « ≈ » FLOU. Une tolérance vague
 * en base serait un invariant qu'on ne sait pas énoncer. 1 décimale n'est pas
 * un choix de confort : c'est EXACTEMENT la précision que l'écran produit
 * (`Math.round(quantite × facteur × 10) / 10`, RecolteForm). La contrainte
 * compare donc deux valeurs calculées à la même précision — déterministe, et
 * identique côté PostgreSQL (`round(numeric, 1)`) et côté TypeScript
 * (`Math.round(x × 10) / 10`), les deux arrondissant à l'opposé de zéro sur
 * des valeurs positives — seules admises ici.
 */

export const NOM_CONTRAINTE_SAISIE_BRUTE = 'ck_recoltes_saisie_brute';

/** Précisions du schéma. Les valeurs sont arrondies AVANT validation, pour que
 *  l'API et la base ne puissent pas rendre deux verdicts différents. */
export const PRECISION_QUANTITE_SAISIE = 3;   // numeric(12,3)
export const PRECISION_FACTEUR_SAISIE = 4;    // numeric(12,4)
/** Précision canonique de la comparaison : celle que l'écran produit. */
export const DECIMALES_COMPARAISON = 1;

/**
 * Le prédicat, en UN SEUL endroit. Consommé par l'entité (`@Check`), par la
 * migration et par `db-init` — trois chemins, une seule vérité.
 */
export const CHECK_SAISIE_BRUTE = `
  (quantite_saisie IS NULL AND unite_saisie IS NULL AND facteur_saisie IS NULL)
  OR (
    quantite IS NOT NULL
    AND quantite_saisie > 0
    AND facteur_saisie > 0
    AND unite_saisie IS NOT NULL
    AND btrim(unite_saisie) <> ''
    AND round(quantite_saisie * facteur_saisie, ${DECIMALES_COMPARAISON})
      = round(quantite, ${DECIMALES_COMPARAISON})
  )`;

/** Pour `db-init`, qui rejoue à chaque démarrage. */
export function sqlAjoutIdempotent(): string {
  return `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${NOM_CONTRAINTE_SAISIE_BRUTE}') THEN
        ALTER TABLE recoltes
          ADD CONSTRAINT ${NOM_CONTRAINTE_SAISIE_BRUTE} CHECK (${CHECK_SAISIE_BRUTE}) NOT VALID;
      END IF;
    END $$;`;
}

/**
 * Lignes DÉJÀ en base qui violeraient la règle. LECTURE SEULE.
 * À consulter avant tout `VALIDATE CONSTRAINT` futur : tant que ce compte
 * n'est pas zéro, valider rejetterait de l'historique.
 */
export const SQL_LIGNES_NON_CONFORMES = `
  SELECT id, quantite, quantite_saisie, unite_saisie, facteur_saisie
    FROM recoltes
   WHERE NOT (${CHECK_SAISIE_BRUTE})`;

// ── LA MÊME RÈGLE, À LA FRONTIÈRE DE L'API ──────────────────────────────────
// Pourquoi deux expressions : PostgreSQL renvoie `23514 violates check
// constraint`, que personne sur le terrain ne peut comprendre. La frontière
// rend une erreur métier lisible. Un test exige que les DEUX verdicts
// coïncident sur une même table de cas — une règle écrite deux fois sans
// garde-fou finit toujours par se contredire.

export type SaisieBrute = {
  quantite: number | null;
  quantiteSaisie: number | null;
  uniteSaisie: string | null;
  facteurSaisie: number | null;
};

const arrondi = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d;

/** Arrondit à la précision RÉELLEMENT stockable. L'API valide et écrit la même
 *  valeur, donc la base ne peut pas refuser ce que l'API a accepté. */
export function normaliseSaisieBrute(l: SaisieBrute): SaisieBrute {
  return {
    quantite: l.quantite,
    quantiteSaisie: l.quantiteSaisie == null ? null : arrondi(l.quantiteSaisie, PRECISION_QUANTITE_SAISIE),
    uniteSaisie: l.uniteSaisie == null ? null : l.uniteSaisie.trim() || null,
    facteurSaisie: l.facteurSaisie == null ? null : arrondi(l.facteurSaisie, PRECISION_FACTEUR_SAISIE),
  };
}

/** `null` si la saisie est valide ; sinon la raison, en clair, pour l'API.
 *  (Et non une union discriminee : le `strict` partiel du depot ne la
 *  restreint pas, et un contrat qu'on doit contourner n'est pas un contrat.) */
export function valideSaisieBrute(brut: SaisieBrute): string | null {
  const l = normaliseSaisieBrute(brut);
  const renseignes = [l.quantiteSaisie, l.uniteSaisie, l.facteurSaisie].filter((v) => v != null).length;

  // CAS 1 — aucune saisie structurée. C'est l'état de toutes les récoltes
  // antérieures, et celui d'un client qui n'envoie rien. Toujours valide.
  if (renseignes === 0) return null;

  // ATOMIQUE — un triplet à moitié rempli ne décrit rien.
  if (renseignes < 3) {
    return 'La saisie d’origine est incomplète : il faut la quantité, l’unité ET le facteur, ou aucun des trois.';
  }
  // POSITIF — « -3 paniers » n'existe pas.
  if (!(l.quantiteSaisie! > 0)) {
    return 'La quantité saisie doit être strictement positive.';
  }
  if (!(l.facteurSaisie! > 0)) {
    return 'Le facteur de conversion doit être strictement positif.';
  }
  if (!l.uniteSaisie) {
    return 'L’unité saisie ne peut pas être vide.';
  }
  // COHÉRENT — le triplet doit retrouver la quantité canonique.
  if (l.quantite == null) {
    return 'Une saisie d’origine sans quantité convertie n’a pas de sens.';
  }
  const attendu = arrondi(l.quantiteSaisie! * l.facteurSaisie!, DECIMALES_COMPARAISON);
  const observe = arrondi(l.quantite, DECIMALES_COMPARAISON);
  if (attendu !== observe) {
    return `Incohérence : ${l.quantiteSaisie} × ${l.facteurSaisie} donne ${attendu}, `
      + `mais la quantité enregistrée est ${observe}.`;
  }
  return null;
}
