/**
 * INVARIANTS D'ARGENT ET DE STOCK, TENUS PAR LA BASE — pas par convention.
 *
 * CONSTAT QUI MOTIVE CE FICHIER : la base entière ne portait que DEUX
 * contraintes `CHECK`, toutes deux sur `evaluations.note BETWEEN 1 AND 5`.
 * Aucune sur l'argent, aucune sur le stock. Toutes les règles vivaient dans le
 * code applicatif — c'est-à-dire qu'une écriture directe en base, un script
 * d'exploitation ou une future route les ignoraient en silence.
 *
 * POURQUOI `NOT VALID`. Ces contraintes s'appliquent aux écritures NOUVELLES
 * et n'inspectent PAS les lignes déjà présentes. C'est volontaire : valider
 * d'anciennes lignes ferait échouer le démarrage en production sur une donnée
 * historique qu'on n'a pas encore regardée. `SQL_LIGNES_NON_CONFORMES` permet
 * justement de la regarder, en lecture seule, avant de décider un
 * `VALIDATE CONSTRAINT` dans un lot séparé.
 *
 * CE QUI N'EST PAS ICI, ET POURQUOI. `produits.prix`, `produits.prix_achat` et
 * `produits.stock` ne sont PAS contraints. La création d'un produit fait
 * `body.prix || 0` et `Number(body.prix_achat) || 0` sans aucun contrôle de
 * signe (`caisse-rest.controller.ts`, route `POST produits`) : poser un `CHECK`
 * y transformerait une mauvaise saisie en erreur 500 au lieu d'un 400 lisible.
 * Il faut donc d'abord valider l'entrée. Tranche séparée, assumée comme telle.
 *
 * Les quatre contraintes ci-dessous, elles, sont des invariants que le code
 * respecte DÉJÀ partout : aucune ne peut créer un nouveau chemin d'erreur.
 */
export interface ContrainteArgentStock {
  /** Nom stable — sert de clé d'idempotence (`pg_constraint.conname`). */
  nom: string;
  table: string;
  /** Expression SQL du CHECK, sans les parenthèses externes. */
  check: string;
  /** Pourquoi cet invariant tient déjà dans le code. */
  pourquoi: string;
}

export const CONTRAINTES_ARGENT_STOCK: ContrainteArgentStock[] = [
  {
    nom: 'ck_stock_mouvements_demandee_non_negative',
    table: 'stock_mouvements',
    check: 'quantite_demandee >= 0',
    pourquoi:
      'Une quantité demandée est toujours posée positive : la vente la lit du panier, ' +
      "la restitution utilise le net du ledger, l'ajustement `Math.abs(avant - après)`.",
  },
  {
    nom: 'ck_stock_mouvements_manquant_non_negatif',
    table: 'stock_mouvements',
    check: 'manquant >= 0',
    pourquoi:
      "Le manquant est ce qui n'a pas pu être retranché — jamais négatif. " +
      'La restitution et l\'ajustement écrivent 0 explicitement.',
  },
  {
    nom: 'ck_stock_mouvements_retranchee_bornee',
    table: 'stock_mouvements',
    check: 'quantite_retranchee <= quantite_demandee',
    pourquoi:
      'On ne retranche jamais PLUS que demandé. Vrai pour les trois types : vente ' +
      '(retranchée ≤ demandée, le reste part en `manquant`), annulation (−net ≤ net) ' +
      'et ajustement (|avant−après| = demandée). `quantite_retranchee` reste libre ' +
      "d'être NÉGATIVE : c'est ainsi qu'une annulation ou un ajout de stock s'écrit.",
  },
  {
    nom: 'ck_caisse_transactions_montant_non_negatif',
    table: 'caisse_transactions',
    check: 'montant IS NULL OR montant >= 0',
    pourquoi:
      'Toutes les routes qui écrivent un montant le refusent déjà ≤ 0 (vente, dépense, ' +
      'encaissement de crédit). `IS NULL` est toléré : la colonne est nullable et ' +
      "d'anciennes lignes techniques peuvent ne rien porter.",
  },
];

/**
 * Ajout IDEMPOTENT d'une contrainte. Postgres n'a pas
 * `ADD CONSTRAINT IF NOT EXISTS` : on teste `pg_constraint`, comme le fait déjà
 * `db-init` pour `fk_cooperatives_commune`.
 */
export function sqlAjoutIdempotent(c: ContrainteArgentStock): string {
  return `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${c.nom}') THEN
        ALTER TABLE ${c.table}
          ADD CONSTRAINT ${c.nom} CHECK (${c.check}) NOT VALID;
      END IF;
    END $$;`;
}

/**
 * Lignes DÉJÀ en base qui violeraient ces contraintes. LECTURE SEULE.
 *
 * À lancer avant tout `VALIDATE CONSTRAINT` : tant que ce compte n'est pas
 * connu, valider l'historique serait un pari.
 */
export const SQL_LIGNES_NON_CONFORMES = `
  SELECT 'ck_stock_mouvements_demandee_non_negative' AS contrainte, count(*)::int AS lignes
    FROM stock_mouvements WHERE NOT (quantite_demandee >= 0)
  UNION ALL
  SELECT 'ck_stock_mouvements_manquant_non_negatif', count(*)::int
    FROM stock_mouvements WHERE NOT (manquant >= 0)
  UNION ALL
  SELECT 'ck_stock_mouvements_retranchee_bornee', count(*)::int
    FROM stock_mouvements WHERE NOT (quantite_retranchee <= quantite_demandee)
  UNION ALL
  SELECT 'ck_caisse_transactions_montant_non_negatif', count(*)::int
    FROM caisse_transactions WHERE NOT (montant IS NULL OR montant >= 0)
`;
