import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Lien Negociation -> Publication : colonne `publication_id` sur `negociations`.
 *
 * Trou constate le 13/08/2026 (JULABA_DECISIONS.md, "B2, voie negociation non
 * couverte par la reservation") : une commande nee d'une negociation acceptee
 * (commandes-rest.controller.ts, repondreNegociation / marchandRepondreContreOffre)
 * n'avait jamais de publication_id, car l'entite Negociation ne le stockait pas.
 * StockReservationService.reserver/convertir sont conditionnes a
 * commande.publicationId : sans lien, une negociation acceptee ne reservait ni
 * ne decrementait AUCUN stock. Une marchande pouvait accepter plusieurs
 * negociations sur le meme stock sans jamais etre bloquee par indisponibilite.
 *
 * Colonne nullable sans contrainte FK, meme pattern que commandes.recolte_id et
 * commandes.negociation_id : lien informatif, pas structurel. Nullable car une
 * negociation peut porter sur un produit sans etre adossee a une publication du
 * marche virtuel (retro-compat : le flux fonctionne toujours sans, simplement
 * sans reservation de stock, comme avant ce lot).
 *
 * Pas de backfill : une negociation historique ne porte que `produit` (texte
 * libre) + `vendeur_id`, sans reference fiable a UNE publication precise parmi
 * celles, actives ou non, du vendeur pour ce produit. Deviner introduirait soit
 * un faux lien (blocage de stock injustifie sur une future action), soit un
 * lien errone (reservation contre la mauvaise offre) — les deux interdits par
 * CONSTITUTION.md (l'argent et le stock sont sacres). Seules les negociations
 * FUTURES (proposees apres ce lot, front mis a jour pour envoyer publicationId)
 * beneficient de la reservation.
 */
export class NegociationPublicationLink1780900000000 implements MigrationInterface {
  name = 'NegociationPublicationLink1780900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE negociations ADD COLUMN IF NOT EXISTS publication_id uuid`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE negociations DROP COLUMN IF EXISTS publication_id`);
  }
}
