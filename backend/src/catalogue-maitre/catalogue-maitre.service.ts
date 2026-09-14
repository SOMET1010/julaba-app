import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { OdooGatewayService } from '../odoo-gateway/odoo-gateway.service';

export interface ReferenceMaitreLigne {
  default_code: string;
  nom: string;
  categorie: string | null;
  odoo_product_id: number | null;
  actif: boolean;
  synced_at: string;
}

export interface ResultatSynchronisation {
  lues: number;
  creees: number;
  majs: number;
  desactivees: number;
}

/**
 * TypeORM ne renvoie pas la MÊME FORME selon la commande SQL : un
 * `INSERT ... RETURNING` donne directement les lignes, un
 * `UPDATE ... RETURNING` donne `[lignes, nombreAffecté]`. Compter `.length`
 * sur le second renvoie donc toujours 2, quel que soit le nombre de lignes —
 * c'est exactement ce que ce service a fait avant d'être corrigé : il
 * annonçait « 2 désactivées » alors qu'il n'en avait désactivé aucune.
 *
 * Un compteur faux dans un rapport de synchronisation n'est pas cosmétique :
 * c'est lui qui répond « le référentiel a-t-il bougé ? ».
 */
function lignesRetournees(res: unknown): Array<Record<string, unknown>> {
  if (
    Array.isArray(res) && res.length === 2 &&
    Array.isArray(res[0]) && typeof res[1] === 'number'
  ) {
    return res[0] as Array<Record<string, unknown>>;
  }
  return Array.isArray(res) ? (res as Array<Record<string, unknown>>) : [];
}

/**
 * Miroir local du référentiel maître Odoo.
 *
 *     Odoo 19  ──(synchronisation contrôlée)──>  catalogue_maitre (Postgres)
 *                                                      │
 *                                                      └──> cache local téléphone
 *
 * et JAMAIS `téléphone -> Odoo en direct`.
 *
 * POURQUOI UN MIROIR, ET PAS UN RELAIS. Si la recherche d'une référence
 * interrogeait Odoo à chaque frappe, une marchande ne pourrait plus chercher
 * un produit dès qu'Odoo est éteint, en maintenance ou simplement lent. Ce
 * serait exactement la dépendance temps réel que l'architecture
 * offline-first refuse. Ici, Odoo peut être éteint : le référentiel reste
 * servi par Postgres, puis par le cache du téléphone. La seule chose qu'on
 * perd en éteignant Odoo, c'est la FRAÎCHEUR du référentiel — jamais sa
 * disponibilité, et jamais la capacité de vendre.
 *
 * CE QUE CETTE TABLE NE PORTE PAS : ni prix, ni stock. Une ligne de
 * `catalogue_maitre` n'est donc jamais vendable, structurellement. Seule une
 * ligne ADOPTÉE dans `produits` l'est — avec le prix de la marchande. C'est
 * ce qui rend impossible, par construction et non par vigilance, qu'un
 * `list_price = 0` du référentiel devienne un article à 0 F en caisse.
 *
 * SENS DE L'ÉCRITURE : Odoo -> JULABA, uniquement. Ce service lit Odoo via
 * l'allowlist existante (`product.product/search_read`) et n'écrit que dans
 * Postgres. Rien ne remonte vers Odoo, `ODOO_REAL_WRITE_ENABLED` reste
 * `false`.
 */
@Injectable()
export class CatalogueMaitreService {
  private readonly logger = new Logger(CatalogueMaitreService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(OdooGatewayService) private readonly gateway: OdooGatewayService,
  ) {}

  /**
   * Rafraîchit le miroir depuis Odoo. Idempotent : rejouée, la
   * synchronisation ne duplique rien (la référence stable est la clé
   * primaire) et ne fait pas bouger le nombre de lignes.
   *
   * Une référence qui DISPARAÎT d'Odoo est DÉSACTIVÉE, jamais supprimée. La
   * raison est concrète : une marchande a pu l'adopter, et son produit porte
   * ce `default_code`. Effacer la ligne casserait ce lien et rendrait son
   * article orphelin sans qu'elle ait rien fait. Désactiver suffit : la
   * référence cesse d'être proposée à l'adoption, les produits déjà adoptés
   * continuent d'exister et de se vendre.
   *
   * Tout se fait dans UNE transaction : une synchronisation interrompue ne
   * laisse jamais un miroir à moitié rafraîchi, où des références seraient
   * désactivées sans que les nouvelles soient arrivées.
   */
  async synchroniser(): Promise<ResultatSynchronisation> {
    const references = await this.gateway.listerReferentielMaitre();
    const codes = references.map((r) => r.defaultCode);

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();
    try {
      let creees = 0;
      let majs = 0;
      for (const ref of references) {
        const brut = await qr.manager.query(
          `INSERT INTO catalogue_maitre (default_code, nom, categorie, odoo_product_id, actif, synced_at)
           VALUES ($1, $2, $3, $4, $5, now())
           ON CONFLICT (default_code) DO UPDATE
             SET nom = EXCLUDED.nom,
                 categorie = EXCLUDED.categorie,
                 odoo_product_id = EXCLUDED.odoo_product_id,
                 actif = EXCLUDED.actif,
                 synced_at = now()
           RETURNING (xmax = 0) AS creee`,
          [ref.defaultCode, ref.nom, ref.categorie, ref.odooProductId, ref.actif],
        );
        // `xmax = 0` distingue une insertion d'une mise à jour dans un upsert
        // Postgres : c'est ce qui permet d'affirmer l'idempotence au second
        // passage (0 créée, N mises à jour) plutôt que de la supposer.
        const [ligne] = lignesRetournees(brut);
        if (ligne?.creee) creees++;
        else majs++;
      }

      const desactivees = codes.length
        ? lignesRetournees(
            await qr.manager.query(
              `UPDATE catalogue_maitre SET actif = false, synced_at = now()
                WHERE actif = true AND default_code <> ALL($1::text[])
                RETURNING default_code`,
              [codes],
            ),
          )
        : [];

      await qr.commitTransaction();
      const resultat = { lues: references.length, creees, majs, desactivees: desactivees.length };
      this.logger.log(
        `[CATALOGUE-MAITRE] synchronisation : ${resultat.lues} lues, ${resultat.creees} créées, ` +
          `${resultat.majs} mises à jour, ${resultat.desactivees} désactivées`,
      );
      return resultat;
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }

  /**
   * Recherche dans le miroir — jamais dans Odoo. C'est ce que consulte une
   * marchande qui cherche « tomate » avant d'adopter une référence.
   *
   * Seules les références ACTIVES sont proposées : on n'offre pas à
   * l'adoption un produit qu'Odoo ne reconnaît plus.
   */
  async rechercher(q: string | undefined, limit = 50): Promise<ReferenceMaitreLigne[]> {
    const plafond = Math.min(Math.max(Number(limit) || 50, 1), 200);
    const terme = (q ?? '').trim();
    if (!terme) {
      return this.dataSource.query(
        `SELECT default_code, nom, categorie, odoo_product_id, actif, synced_at
           FROM catalogue_maitre WHERE actif = true ORDER BY nom ASC LIMIT $1`,
        [plafond],
      );
    }
    return this.dataSource.query(
      `SELECT default_code, nom, categorie, odoo_product_id, actif, synced_at
         FROM catalogue_maitre
        WHERE actif = true AND (nom ILIKE $1 OR default_code ILIKE $1)
        ORDER BY nom ASC LIMIT $2`,
      [`%${terme}%`, plafond],
    );
  }

  /** État du miroir : combien de références, et de quand datent-elles. Sert
   *  à répondre « le référentiel est-il à jour ? » sans interroger Odoo. */
  async etat(): Promise<{ actives: number; total: number; derniereSynchro: string | null }> {
    const r = await this.dataSource.query(
      `SELECT count(*) FILTER (WHERE actif)::int AS actives,
              count(*)::int AS total,
              max(synced_at) AS derniere
         FROM catalogue_maitre`,
    );
    return {
      actives: r[0]?.actives ?? 0,
      total: r[0]?.total ?? 0,
      derniereSynchro: r[0]?.derniere ?? null,
    };
  }
}
