import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Cycle de vie d'une reservation de stock liee a une commande.
 * active    : stock retire du disponible de la publication (commande en_attente).
 * convertie : reservation finalisee en vente ferme (commande confirmee).
 * liberee   : reservation annulee, stock restitue au disponible.
 */
export type StockReservationStatut = 'active' | 'convertie' | 'liberee';

/**
 * Reservation de stock B2 : une ligne par commande, contre une publication.
 *
 * Colonnes uuid nues, sans relation TypeORM : on evite volontairement les FK
 * generees par synchronize (cf. dette FK varchar/uuid sur cooperative_membres).
 * L'integrite est assuree par StockReservationService, transactionnel et
 * idempotent (cle unique commande_id). Aucun argent implique.
 */
@Entity('stock_reservations')
export class StockReservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('ux_stock_reservations_commande', { unique: true })
  @Column({ name: 'commande_id', type: 'uuid' })
  commandeId: string;

  // Nullable : une vente directe (sans publication) décrémente une récolte
  // directement — le mouvement est tracé via recolteId. Cf. ADR-0001 D2 / #12.
  @Index('idx_stock_reservations_publication')
  @Column({ name: 'publication_id', type: 'uuid', nullable: true })
  publicationId: string | null;

  @Index('idx_stock_reservations_recolte')
  @Column({ name: 'recolte_id', type: 'uuid', nullable: true })
  recolteId: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantite: number;

  @Column({ type: 'varchar', length: 20, default: 'active' })
  statut: StockReservationStatut;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
