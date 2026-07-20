import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MutationStatus {
  EN_ATTENTE = 'en_attente',
  APPROUVEE = 'approuvee',
  REJETEE = 'rejetee',
}

@Entity('mutations')
export class Mutation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'identificateur_id', type: 'uuid' })
  identificateurId: string;

  @Column({ name: 'identificateur_nom', length: 255, nullable: true })
  identificateurNom: string;

  @Column({ name: 'zone_actuelle_id', length: 100, nullable: true })
  zoneActuelleId: string;

  @Column({ name: 'zone_actuelle_nom', length: 255, nullable: true })
  zoneActuelleNom: string;

  @Column({ name: 'zone_demandee_id', length: 100 })
  zoneDemandeeId: string;

  @Column({ name: 'zone_demandee_nom', length: 255 })
  zoneDemandeeNom: string;

  @Column({ type: 'text' })
  raison: string;

  @Column({
    type: 'enum',
    enum: MutationStatus,
    default: MutationStatus.EN_ATTENTE,
  })
  statut: MutationStatus;

  @Column({ name: 'decideur_id', type: 'uuid', nullable: true })
  decideurId: string | null;

  @Column({ name: 'motif_decision', type: 'text', nullable: true })
  motifDecision: string | null;

  @Column({ name: 'date_decision', type: 'timestamptz', nullable: true })
  dateDecision: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
