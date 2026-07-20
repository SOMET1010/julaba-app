import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';

export enum TransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
  ESCROW_BLOCK = 'escrow_block',
  ESCROW_RELEASE = 'escrow_release',
  ESCROW_REFUND = 'escrow_refund',
}

@Entity('wallet_transactions')
export class WalletTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  montant: number;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ length: 50, default: 'completed' })
  statut: string;

  @Column({ name: 'related_entity_type', nullable: true, length: 100 })
  relatedEntityType: string;

  @Column({ name: 'related_entity_id', nullable: true, type: 'uuid' })
  relatedEntityId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Wallet, (wallet) => wallet.transactions)
  @JoinColumn({ name: 'user_id', referencedColumnName: 'userId' })
  wallet: Wallet;
}
