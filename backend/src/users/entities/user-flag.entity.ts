import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum FlagType {
  DOUBLON = 'doublon',
  FRAUDE = 'fraude',
  ABUS = 'abus',
  SPAM = 'spam',
  USURPATION = 'usurpation',
  AUTRE = 'autre',
}

@Entity('user_flags')
export class UserFlag {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({
    type: 'enum',
    enum: FlagType,
    enumName: 'flag_type_enum',
    name: 'flag_type',
  })
  flagType: FlagType;

  @Column({ type: 'text' })
  raison: string;

  @Column({ type: 'text', nullable: true })
  commentaire: string | null;

  @Column({ name: 'created_by' })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date | null;

  @Column({ name: 'resolved_by', nullable: true })
  resolvedBy: string | null;

  @Column({ name: 'resolution_note', type: 'text', nullable: true })
  resolutionNote: string | null;
}
