import { QueryRunner } from 'typeorm';

/**
 * L'UNIQUE FAÇON D'ENCAISSER DE L'ARGENT SUR UN CRÉDIT — ARGENT-4.
 *
 * CE QU'IL Y AVAIT : trois chemins, trois comportements.
 *
 *   1. `POST /caisse/credits` avec acompte — écrivait `credits.acompte` et le
 *      `montant_du` du client. AUCUNE ligne de caisse. L'argent réellement
 *      reçu à la création n'existait nulle part dans le journal.
 *   2. `PATCH :id/acompte` — écrivait la caisse, mais dans un `try/catch` qui
 *      AVALAIT l'erreur, hors transaction. L'acompte pouvait donc être
 *      enregistré sans sa contrepartie en caisse, silencieusement.
 *   3. `PATCH :id/payer` — posait `statut='paye'` et baissait `montant_du`.
 *      AUCUNE ligne de caisse, et `acompte` restait à son ancienne valeur :
 *      la table disait « elle a versé X », la vue disait « il ne reste rien ».
 *      Deux vérités pour la même dette.
 *
 * LA RÈGLE, posée par Patrick le 19/09/2026 :
 *
 *     Tout argent effectivement reçu doit produire une écriture de caisse,
 *     quelle que soit l'origine du paiement.
 *
 * D'où cette primitive. Les trois routes l'appellent ; aucune n'écrit plus la
 * caisse elle-même. Les quatre écritures — `credits`, `clients`,
 * `caisse_transactions`, audit — se font dans LA MÊME transaction : les quatre
 * ou aucune.
 *
 * ── LA NATURE N'EST PAS UN PARAMÈTRE ───────────────────────────────────────
 *
 * Elle est CALCULÉE ICI, à partir du solde après encaissement :
 *
 *     reste après > 0  →  acompte_credit
 *     reste après = 0  →  reglement_credit
 *
 * Deux raisons, toutes deux de Patrick :
 *
 * • Si le contrôleur fournissait la nature, les trois chemins pourraient
 *   recommencer à diverger — c'est exactement ce qu'on répare.
 * • Ce n'est pas la route HTTP qui décide, c'est le RÉSULTAT MÉTIER. Un
 *   paiement passé par `/acompte` qui termine exactement la dette est un
 *   règlement, et doit être écrit comme tel.
 *
 * Et deux natures plutôt qu'une, parce que le dernier paiement clôt le crédit :
 * avec une seule, l'écran ne pourrait plus distinguer « paiement partiel » de
 * « crédit soldé » sans relire l'état courant du crédit — soit précisément la
 * dépendance à l'état actuel qu'on s'interdit.
 *
 * MINUSCULES, et ce n'est pas un détail de style : `caisse_transactions.type`
 * porte déjà `vente`, `depense`, `annulation`, `acompte_credit`. Écrire
 * `ACOMPTE_CREDIT` aurait rendu invisible l'agrégat existant
 * (`caisse-rest.controller.ts` : `SUM(CASE WHEN type = 'acompte_credit' …)`).
 *
 * CE QUE ÇA NE FAIT PAS : gonfler le chiffre d'affaires. La recette a DÉJÀ été
 * comptée au moment de la vente à crédit. Tous les agrégats de recette filtrent
 * `type = 'vente'` — vérifié, pas supposé — donc ni `acompte_credit` ni
 * `reglement_credit` n'y entrent. `caisseTheorique`, lui, les ajoute
 * explicitement : c'est de l'espèce qui est entrée dans la caisse.
 */

export type NatureEncaissement = 'acompte_credit' | 'reglement_credit';

export interface DemandeEncaissement {
  creditId: string;
  marchandId: string;
  /** Montant réellement reçu. Strictement positif, au plus le reste dû. */
  montant: number;
  /**
   * Clé d'idempotence. Un rejeu hors connexion présente la MÊME clé et ne doit
   * pas encaisser deux fois. Obligatoire : sans elle, la file hors-ligne
   * pourrait doubler un paiement, et il n'existe aucune valeur par défaut
   * honnête à inventer à la place de l'appelant.
   */
  idempotencyKey: string;
}

export interface ResultatEncaissement {
  /** Vrai quand la clé avait déjà été encaissée : rien n'a été réécrit. */
  rejeu: boolean;
  nature: NatureEncaissement;
  /** Ce qu'il reste dû APRÈS cet encaissement. 0 ⇒ le crédit est soldé. */
  resteApres: number;
  soldé: boolean;
}

export class EncaissementInvalide extends Error {}

/** Les francs se comptent en entiers ; on ne laisse pas traîner de centimes. */
const arrondir = (n: number) => Math.round(n);

/**
 * @param qr  Un QueryRunner dont la transaction est DÉJÀ ouverte par
 *            l'appelant. La primitive n'ouvre ni ne valide la transaction :
 *            c'est ce qui permet à la création d'un crédit d'écrire le crédit
 *            ET son premier encaissement d'un seul tenant.
 */
export async function encaisserCredit(
  qr: QueryRunner,
  d: DemandeEncaissement,
): Promise<ResultatEncaissement> {
  const montant = arrondir(Number(d.montant));
  if (!Number.isFinite(montant) || montant <= 0) {
    throw new EncaissementInvalide('Le montant encaissé doit être supérieur à zéro');
  }
  if (!d.idempotencyKey) {
    throw new EncaissementInvalide('Clé d’idempotence requise');
  }

  // Le verrou de ligne sérialise deux encaissements simultanés sur le MÊME
  // crédit. Sans lui, deux paiements concurrents liraient le même `acompte` et
  // le second écraserait le premier : de l'argent reçu disparaîtrait.
  const [credit] = await qr.query(
    `SELECT id, client_nom, montant_total, COALESCE(acompte, 0) AS acompte, statut
       FROM credits WHERE id = $1 AND marchand_id = $2 FOR UPDATE`,
    [d.creditId, d.marchandId],
  );
  if (!credit) throw new EncaissementInvalide('Crédit introuvable');

  // REJEU : on regarde la clé AVANT d'écrire quoi que ce soit. Un
  // `ON CONFLICT DO NOTHING` sur la seule ligne de caisse ne suffirait pas —
  // `credits.acompte` aurait déjà été incrémenté une seconde fois.
  const [deja] = await qr.query(
    `SELECT montant FROM caisse_transactions WHERE idempotency_key = $1`,
    [d.idempotencyKey],
  );
  if (deja) {
    const resteApres = arrondir(
      Math.max(0, Number(credit.montant_total) - Number(credit.acompte)),
    );
    return {
      rejeu: true,
      nature: resteApres === 0 ? 'reglement_credit' : 'acompte_credit',
      resteApres,
      soldé: resteApres === 0,
    };
  }

  const total = arrondir(Number(credit.montant_total));
  const dejaVerse = arrondir(Number(credit.acompte));
  const resteAvant = Math.max(0, total - dejaVerse);
  if (resteAvant === 0) {
    throw new EncaissementInvalide('Ce crédit est déjà soldé');
  }
  if (montant > resteAvant) {
    throw new EncaissementInvalide(
      `Le montant dépasse le restant dû (${resteAvant} FCFA)`,
    );
  }

  const resteApres = resteAvant - montant;
  const soldé = resteApres === 0;
  // ← LA RÈGLE. Le résultat métier décide, pas la route appelante.
  const nature: NatureEncaissement = soldé ? 'reglement_credit' : 'acompte_credit';

  // 1. Le crédit. `acompte` monte toujours — y compris sur un règlement final,
  //    pour que la table et la vue disent la même chose.
  await qr.query(
    `UPDATE credits SET
       acompte = COALESCE(acompte, 0) + $1,
       statut = CASE WHEN $2 THEN 'paye' ELSE statut END,
       paye_le = CASE WHEN $2 THEN now() ELSE paye_le END,
       updated_at = now()
     WHERE id = $3 AND marchand_id = $4`,
    [montant, soldé, d.creditId, d.marchandId],
  );

  // 2. Ce que le client doit encore.
  await qr.query(
    `UPDATE clients SET
       montant_du = GREATEST(0, montant_du - $1),
       updated_at = now()
     WHERE marchand_id = $2 AND nom = $3`,
    [montant, d.marchandId, credit.client_nom],
  );

  // 3. LA LIGNE DE CAISSE — celle qui manquait sur deux chemins sur trois.
  await qr.query(
    `INSERT INTO caisse_transactions
       (user_id, marchand_id, session_id, montant, type, description, source,
        mode_paiement, idempotency_key)
     VALUES ($1, $1, '', $2, $3, $4, 'kassa', 'especes', $5)`,
    [
      d.marchandId,
      montant,
      nature,
      `${soldé ? 'Règlement' : 'Acompte'} — ${credit.client_nom}`,
      d.idempotencyKey,
    ],
  );

  // 4. L'audit, dans la même transaction que le reste. Une trace qui survit à
  //    un échec des écritures qu'elle décrit ne tracerait rien de réel.
  await qr.query(
    `INSERT INTO audit_logs (user_id, action, entite, entite_id, details)
     VALUES ($1, $2, 'credit', $3, $4)`,
    [
      d.marchandId,
      soldé ? 'CREDIT_REGLEMENT' : 'CREDIT_ACOMPTE',
      d.creditId,
      JSON.stringify({ montant, resteAvant, resteApres, nature }),
    ],
  );

  return { rejeu: false, nature, resteApres, soldé };
}
