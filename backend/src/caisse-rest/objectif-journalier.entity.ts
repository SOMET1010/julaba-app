import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('objectifs_journaliers')
export class ObjectifJournalier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  objectif: number;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'boolean', default: false })
  alerte50: boolean;

  @Column({ type: 'boolean', default: false })
  alerte80: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
