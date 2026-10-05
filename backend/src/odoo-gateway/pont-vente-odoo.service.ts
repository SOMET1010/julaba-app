/**
 * LE PONT : UNE VENTE ENREGISTRÉE PART VERS ODOO — ODOO-L2, 05/10/2026.
 *
 * Ce service est la partie IMPURE du pont : il lit la base pour relier les
 * produits d'une marchande à Odoo, et appelle le Gateway. La décision, elle,
 * vit dans `pont-vente-odoo.ts`, qui est pur et testé sans base.
 *
 * ── TROIS GARANTIES, ET AUCUNE N'EST NÉGOCIABLE ──────────────────────────
 *
 * 1. IL NE FAIT JAMAIS ÉCHOUER UNE VENTE. Il est appelé APRÈS le commit, et
 *    tout ce qu'il lève est avalé et journalisé. L'argent de la marchande ne
 *    peut pas dépendre de la disponibilité d'Odoo : sa vente est acquise
 *    avant que ce code ne s'exécute, et le reste quoi qu'il arrive ici.
 *
 * 2. IL N'EST JAMAIS APPELÉ DANS UNE TRANSACTION SQL. Un appel réseau dans
 *    une transaction Postgres la tient ouverte le temps du réseau ; un
 *    timeout Odoo ferait alors échouer — et annuler — une vente parfaitement
 *    valide. C'est la raison pour laquelle le point de branchement est à côté
 *    de `emitTransactionCreated`, et pas trois lignes plus haut.
 *
 * 3. IL NE S'ACTIVE PAS TOUT SEUL. `ODOO_PONT_VENTE_ENABLED=true`, et rien
 *    d'autre, met ce pont en service.
 *
 * LA RÉSOLUTION PEUT NE PAS ABOUTIR, ET C'EST NORMAL. La chaîne
 * `produits.default_code → catalogue_maitre.odoo_product_id` a deux maillons
 * nullables : une marchande peut vendre un article qu'aucun référentiel ne
 * connaît. Ce cas n'est pas une erreur, il est le quotidien — on ne journalise
 * donc ni alerte ni avertissement pour lui.
 */
import { Injectable, Logger, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OdooGatewayService } from './odoo-gateway.service';
import { lirePontVenteActif } from './odoo-client.config';
import { mouvementsDeVente, type LigneVenteResolue } from './pont-vente-odoo';

/** Une ligne telle que `POST /caisse/vente` la tient : l'identifiant est
 *  celui du produit de la marchande, pas celui d'Odoo. */
export interface LigneVendue {
  readonly id: string | null;
  readonly qte: number;
}

@Injectable()
export class PontVenteOdooService {
  private readonly logger = new Logger(PontVenteOdooService.name);

  constructor(
    private readonly dataSource: DataSource,
    @Optional() private readonly gateway?: OdooGatewayService,
  ) {}

  /** Actif seulement si le drapeau est posé ET le Gateway disponible. */
  actif(): boolean {
    return lirePontVenteActif() && !!this.gateway;
  }

  /**
   * Relie les produits de la marchande à Odoo. Une ligne dont la chaîne
   * n'aboutit pas sort avec `odooProductId: null` — le module pur l'ignorera.
   */
  private async resoudre(lignes: readonly LigneVendue[], marchandId: string): Promise<LigneVenteResolue[]> {
    const ids = lignes.map((l) => l.id).filter((id): id is string => !!id);
    if (ids.length === 0) return [];

    // Le `marchand_id` n'est PAS une précaution de style : sans lui, un
    // identifiant de produit appartenant à une autre marchande résoudrait, et
    // on sortirait du stock de quelqu'un d'autre.
    const rangs: { id: string; odoo_product_id: number | null }[] = await this.dataSource.query(
      `SELECT p.id, cm.odoo_product_id
         FROM produits p
         LEFT JOIN catalogue_maitre cm ON cm.default_code = p.default_code
        WHERE p.id = ANY($1) AND p.marchand_id = $2`,
      [ids, marchandId],
    );
    const parId = new Map(rangs.map((r) => [String(r.id), r.odoo_product_id]));

    return lignes.map((l) => ({
      odooProductId: l.id ? (parId.get(String(l.id)) ?? null) : null,
      quantite: l.qte,
    }));
  }

  /**
   * Fait suivre une vente déjà enregistrée. Ne rend rien, ne lève rien :
   * l'appelant n'a rien à attendre de nous, et surtout rien à craindre.
   */
  async suivreVente(params: {
    idempotencyKey: string | null;
    lignes: readonly LigneVendue[];
    marchandId: string;
  }): Promise<void> {
    if (!this.actif()) return;
    try {
      const resolues = await this.resoudre(params.lignes, params.marchandId);
      const mouvements = mouvementsDeVente(params.idempotencyKey, resolues);
      for (const m of mouvements) {
        // Séquentiel, et non en parallèle : deux mouvements d'une même vente
        // n'ont aucune raison de courir l'un contre l'autre, et le journal se
        // relit dans l'ordre où la marchande a vendu.
        await this.gateway!.simulerMouvementStock(m);
      }
    } catch (e: unknown) {
      // LA VENTE EST DÉJÀ ENREGISTRÉE. Ce qui échoue ici est une
      // synchronisation, pas de l'argent : on le dit, et on n'en fait pas un
      // échec de la requête de la marchande. Le journal du Gateway garde la
      // trace `rejected`, rejouable.
      const message = e instanceof Error ? e.message : String(e);
      this.logger.warn(`[PONT-ODOO] vente non synchronisée (${params.idempotencyKey}) : ${message}`);
    }
  }
}
