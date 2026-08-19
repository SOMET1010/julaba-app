import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Wallet } from './wallet.entity';

export enum TransactionType {
  CREDIT = 'credit',
  DEBIT = 'debit',
  ESCROW_BLOCK = 'escrow_block',
  ESCROW_RELEASE = 'escrow_release',
  ESCROW_REFUND = 'escrow_refund',
}

// Idempotence du paiement Keiwa d'une commande (défense en profondeur, en plus
// du verrou applicatif sur la commande) : la base refuse un second débit ou un
// second crédit pour la MÊME commande. Cf. migration
// 1780700000000-WalletTransactionCommandeIdempotence.
//
// Idempotence du transfert compte-à-compte (POST /wallets/me/transfert) : pas
// de commande à qui rattacher la clé ici, donc le CLIENT fournit une clé
// d'idempotence par tentative d'envoi (même mécanisme que
// caisse_transactions.idempotency_key). Cf. migration
// 1781000000001-WalletTransactionTransfertIdempotence.
//
// Idempotence du débit Keiwa d'une cotisation sociale (POST
// /protection-sociale/cotisations, mode='keiwa') : même patron que
// ux_wallet_tx_commande_idempotence, mais l'id rattaché est celui de la
// cotisation (générée AVANT l'écriture, dans la même transaction — cf.
// ProtectionSocialeController) plutôt qu'une commande préexistante. Un seul
// débit possible par cotisation. Cf. migration 1781100000000-CotisationsSociales.
@Entity('wallet_transactions')
@Index('ux_wallet_tx_commande_idempotence', ['relatedEntityId', 'userId', 'type'], {
  unique: true,
  where: `related_entity_type = 'commande' AND type IN ('debit', 'credit')`,
})
@Index('ux_wallet_tx_cotisation_idempotence', ['relatedEntityId', 'userId', 'type'], {
  unique: true,
  where: `related_entity_type = 'cotisation_sociale' AND type = 'debit'`,
})
@Index('ux_wallet_tx_idempotency_key', ['idempotencyKey', 'userId', 'type'], {
  unique: true,
  where: `idempotency_key IS NOT NULL`,
})
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

  // Clé d'idempotence fournie par le client pour une action initiée par
  // l'utilisateur sans identifiant naturel (transfert compte-à-compte) —
  // nullable : les mouvements existants (crédit/débit admin, paiement
  // commande, escrow) n'en fournissent pas. Cf. index ux_wallet_tx_idempotency_key.
  @Column({ name: 'idempotency_key', type: 'varchar', length: 120, nullable: true })
  idempotencyKey: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @ManyToOne(() => Wallet, (wallet) => wallet.transactions)
  @JoinColumn({ name: 'user_id', referencedColumnName: 'userId' })
  wallet: Wallet;
}
