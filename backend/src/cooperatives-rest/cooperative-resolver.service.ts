import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Source de verite unique : la cooperative active d'un compte.
 *
 * Invariant base (uniq_coop_membre_actif, migration 1779100000000) : au plus une
 * adhesion active par membre. Toute resolution qui gouverne la visibilite du
 * marche cooperatif (getMarche demi-grossiste, republier grossiste) DOIT passer
 * par ce resolveur pour rester coherente entre les points d'entree.
 *
 * Retourne null si le compte n'a aucune adhesion active.
 */
@Injectable()
export class CooperativeResolverService {
  constructor(private readonly dataSource: DataSource) {}

  async getActiveCooperativeId(userId: string): Promise<string | null> {
    if (!userId) return null;
    const rows: Array<{ cooperative_id: string }> = await this.dataSource.query(
      `SELECT cooperative_id FROM cooperative_membres WHERE membre_id = $1 AND actif = true LIMIT 1`,
      [userId],
    );
    return rows?.[0]?.cooperative_id ?? null;
  }
}
