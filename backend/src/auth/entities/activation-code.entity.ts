import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

// Code d'activation à USAGE UNIQUE (P0.0, cf. ADR-002). Il ne porte JAMAIS de
// session : il n'ouvre que l'activation, où la marchande pose son propre secret.
// Motif « selector + verifier » : le `selector` (non secret, indexé) localise la
// ligne en O(1) ; seul le HASH du `verifier` est stocké → un dump base ne rejoue rien.
@Entity('activation_codes')
export class ActivationCode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Index()
  @Column()
  selector: string;

  @Column({ name: 'verifier_hash' })
  verifierHash: string;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  // NULL = non consommé. La bascule à « consommé » est atomique (cf. ActivationService).
  @Column({ name: 'used_at', type: 'timestamptz', nullable: true })
  usedAt: Date | null;

  // Journalisation anti-abus : qui a initié l'enrôlement (l'identificateur).
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
