import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

/**
 * Stock commun d'une coopérative — le pot partagé alimenté par les apports des
 * membres et décrémenté par les distributions. Une ligne = le total COURANT
 * d'un produit pour une coopérative donnée (pas un journal : cf.
 * CooperativeStockMouvement pour la trace append-only des mouvements).
 *
 * Contrainte `(cooperative_id, produit)` unique : au plus une ligne « stock
 * courant » par produit et par coopérative — un apport supplémentaire du même
 * produit incrémente cette ligne, il n'en crée jamais une seconde.
 */
@Entity('cooperative_stock')
@Unique('ux_cooperative_stock_produit', ['cooperativeId', 'produit'])
export class CooperativeStock {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cooperative_id', type: 'uuid' })
  cooperativeId: string;

  @Column({ type: 'varchar', length: 255 })
  produit: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  categorie: string | null;

  // decimal : comme wallets.solde, la valeur revient en string via le driver
  // pg — toujours envelopper de Number(...) avant tout calcul (cf. wallets.service.ts).
  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  quantite: number;

  @Column({ type: 'varchar', length: 50 })
  unite: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
