import { ConflictException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
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

export interface ProduitAdopte {
  id: string;
  nom: string;
  prix: string | number;
  stock: string | number;
  unite: string | null;
  categorie: string | null;
  default_code: string;
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

  /**
   * ADOPTION : une référence maître devient un article de CETTE marchande.
   *
   * C'est le seul pont entre les deux mondes, et il ne se franchit que dans
   * ce sens. Odoo dit « ceci est de l'igname Kponan » ; la marchande dit
   * « je la vends 500 F le tas ». Tant que personne n'a dit la seconde
   * phrase, il n'y a pas d'article, donc rien à vendre — et c'est pour cela
   * qu'un référentiel à prix nul ne peut pas produire une vente à 0 F.
   *
   * Trois refus, tous délibérés :
   *
   * - PRIX ABSENT OU NUL → refus (porté par le DTO, `@IsPositive`). Adopter
   *   sans prix reviendrait à créer l'article à 0 F qu'on veut empêcher ;
   * - RÉFÉRENCE INCONNUE OU DÉSACTIVÉE → refus. On n'adopte pas un produit
   *   qu'Odoo ne reconnaît pas (ou plus) : le lien serait mort-né ;
   * - DÉJÀ ADOPTÉE → refus explicite, en RENVOYANT le produit existant.
   *   Silencieusement en créer un second donnerait deux articles identiques
   *   dans la caisse, avec deux prix possiblement différents — une marchande
   *   ne saurait plus lequel est le bon.
   *
   * Le stock initial, lui, peut valoir zéro : on adopte souvent avant d'avoir
   * reçu la marchandise. C'est le prix qui ne peut pas être nul, pas le stock.
   */
  async adopter(
    marchandId: string,
    demande: { default_code: string; prix: number; unite?: string; stock?: number; prix_achat?: number },
  ): Promise<{ produit: ProduitAdopte; deja: boolean }> {
    const code = demande.default_code.trim();

    const [reference] = await this.dataSource.query(
      `SELECT default_code, nom, categorie FROM catalogue_maitre WHERE default_code = $1 AND actif = true`,
      [code],
    );
    if (!reference) {
      throw new NotFoundException(
        `Référence "${code}" inconnue ou retirée du référentiel maître : impossible de l'adopter.`,
      );
    }

    const [existant] = await this.dataSource.query(
      `SELECT id, nom, prix, stock, unite, categorie, default_code FROM produits
        WHERE marchand_id = $1::text AND default_code = $2`,
      [marchandId, code],
    );
    if (existant) {
      throw new ConflictException({
        message: `"${reference.nom}" est déjà dans ton catalogue.`,
        produit: existant,
      });
    }

    const [produit] = await this.dataSource.query(
      `INSERT INTO produits (marchand_id, nom, prix, prix_achat, categorie, stock, unite, default_code)
       VALUES ($1::text, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, nom, prix, stock, unite, categorie, default_code`,
      [
        marchandId,
        reference.nom,
        demande.prix,
        demande.prix_achat ?? 0,
        reference.categorie ?? 'Général',
        demande.stock ?? 0,
        demande.unite ?? 'unité',
        code,
      ],
    );
    this.logger.log(`[CATALOGUE-MAITRE] adoption ${code} par ${marchandId} à ${demande.prix} F`);
    return { produit, deja: false };
  }

  /** Références déjà adoptées par cette marchande — pour ne pas les reproposer. */
  async codesAdoptes(marchandId: string): Promise<string[]> {
    const lignes = await this.dataSource.query(
      `SELECT default_code FROM produits WHERE marchand_id = $1::text AND default_code IS NOT NULL`,
      [marchandId],
    );
    return lignes.map((l: { default_code: string }) => l.default_code);
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
