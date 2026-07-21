import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum TransactionStatus {
  VALIDEE = 'validee',
  EN_COURS = 'en_cours',
  GELEE = 'gelee',
  ANNULEE = 'annulee',
  LITIGE = 'litige',
}

@Entity('caisse_transactions')
export class CaisseTransaction {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ nullable: true }) type: string;
  @Column({ type: 'decimal', nullable: true }) montant: number;
  @Column({ nullable: true }) description: string;
  @Column({ nullable: true }) user_id: string;
  @Column({ nullable: true }) zone_id: string;
  @Column({ nullable: true }) marchand_id: string;
  @Column({ nullable: true }) session_id: string;
  @Column({ nullable: true }) produit: string;
  @Column({ type: 'decimal', nullable: true }) quantite: number;
  @Column({ nullable: true }) mode_paiement: string;
  @Column({ nullable: true, default: 'kassa' }) source: string;
  @Column({ type: 'jsonb', nullable: true }) details: any;
  @Column({ nullable: true }) category: string;
  @Column({ type: 'decimal', nullable: true, default: 0 }) prix_achat: number;
  @Column({ type: 'decimal', nullable: true, default: 0 }) prix_vente: number;
  @Column({ type: 'decimal', nullable: true, default: 0 }) marge: number;
  @Column({ type: 'decimal', nullable: true, default: 0 }) benefice: number;
  @Column({
    type: 'enum',
    enum: TransactionStatus,
    enumName: 'caisse_transaction_status_enum',
    default: TransactionStatus.VALIDEE,
  })
  statut: TransactionStatus;
  @Column({ type: 'text', nullable: true }) motif: string | null;
  // Idempotence : clé fournie par le client (rejeu offline) pour ne jamais
  // enregistrer deux fois la même vente/dépense. L'unicité est garantie par un
  // index UNIQUE PARTIEL (idempotency_key IS NOT NULL), posé par migration.
  @Column({ type: 'text', nullable: true }) idempotency_key: string | null;
  @CreateDateColumn() created_at: Date;
}
