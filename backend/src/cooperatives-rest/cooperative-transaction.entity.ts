import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * Écriture de trésorerie d'une coopérative (cotisation, achat groupé, etc.) —
 * lue et écrite en SQL brut par CooperativesRestController (`/tresorerie`,
 * `/cotisation`). Cette entité n'est PAS injectée en repository ailleurs :
 * elle existe uniquement pour que `synchronize` (base neuve, cf.
 * database.module.ts) construise la table depuis le schéma déclaré ici,
 * exactement comme la migration 1781300000000-CooperativeTransactions le
 * fait pour une base existante — les deux DOIVENT rester alignés.
 *
 * Avant cette entité + sa migration jumelle, `cooperative_transactions`
 * n'existait dans AUCUN des deux chemins de construction du schéma : ni les
 * entités (synchronize, base neuve), ni les migrations (base existante) —
 * d'où le 500 "relation does not exist" sur GET /cooperatives/tresorerie.
 */
@Entity('cooperative_transactions')
export class CooperativeTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'cooperative_id', type: 'uuid' })
  cooperativeId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'varchar', length: 20 })
  type: 'entree' | 'sortie';

  @Column({ type: 'varchar', length: 50, default: 'autre' })
  categorie: string;

  // decimal : comme cooperative_stock.quantite, la valeur revient en string
  // via le driver pg — toujours envelopper de Number(...) avant tout calcul.
  @Column({ type: 'decimal', precision: 15, scale: 2 })
  montant: number;

  @Column({ name: 'membre_id', type: 'uuid', nullable: true })
  membreId: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 20, default: 'en_attente' })
  statut: 'en_attente' | 'validee' | 'annulee';

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
