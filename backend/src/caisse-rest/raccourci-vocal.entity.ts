import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('raccourcis_vocaux')
export class RaccourciVocal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  nom: string;

  @Column()
  declencheur: string;

  @Column()
  type: string;

  @Column({ type: 'jsonb', nullable: true })
  action: any;

  @Column({ default: true })
  actif: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
