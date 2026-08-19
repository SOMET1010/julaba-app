import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export type CooperativeStockMouvementType = 'apport' | 'distribution';

/**
 * Journal append-only des mouvements du stock commun d'une coopérative — même
 * philosophie que le journal de fidélité (`fidelite_evenements`, PR #190) et
 * le journal argent (ADR-001) : chaque mouvement est un événement immuable,
 * jamais modifié après création. Les vues (stock courant) sont dérivées ;
 * cette table EST l'historique qui les justifie.
 *
 * - type='apport'        : membreId = le membre qui apporte le produit au pot commun.
 * - type='distribution'  : membreId = le membre destinataire de cette part.
 *   besoinId (optionnel)  : lie la distribution au besoin qu'elle satisfait
 *   (cooperative_besoins.id), quand elle en satisfait un.
 */
@Entity('cooperative_stock_mouvements')
@Index('ix_cooperative_stock_mouvements_coop_produit', ['cooperativeId', 'produit'])
export class CooperativeStockMouvement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cooperative_id', type: 'uuid' })
  cooperativeId: string;

  @Column({ type: 'varchar', length: 255 })
  produit: string;

  @Column({ type: 'varchar', length: 20 })
  type: CooperativeStockMouvementType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  quantite: number;

  // Apporteur (type='apport') ou destinataire (type='distribution').
  @Column({ name: 'membre_id', type: 'uuid' })
  membreId: string;

  @Column({ name: 'besoin_id', type: 'uuid', nullable: true })
  besoinId: string | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
