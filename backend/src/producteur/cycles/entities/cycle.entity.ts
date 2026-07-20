import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from '../../../users/entities/user.entity';
import { Recolte } from '../../recoltes/entities/recolte.entity';
import { Publication } from '../../publications/entities/publication.entity';

export enum CycleStatus {
  PREPARATION = 'preparation',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  ARCHIVED = 'archived',
}

@Entity('cycles')
export class Cycle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ length: 100 })
  culture: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  surface: number;

  @Column({ nullable: true, length: 100 })
  parcelle: string;

  @Column({ name: 'date_plantation', type: 'date' })
  datePlantation: Date;

  @Column({ name: 'date_recolte_estimee', type: 'date' })
  dateRecolteEstimee: Date;

  @Column({ name: 'date_recolte_reelle', type: 'date', nullable: true })
  dateRecolteReelle: Date;

  @Column({ name: 'quantite_estimee', type: 'decimal', precision: 10, scale: 2 })
  quantiteEstimee: number;

  @Column({
    name: 'quantite_reelle',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
  })
  quantiteReelle: number;

  @Column({ type: 'enum', enum: CycleStatus, default: CycleStatus.ACTIVE })
  status: CycleStatus;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ name: 'photo_url', nullable: true, type: 'text' })
  photoUrl: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.cycles)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => Recolte, (recolte) => recolte.cycle)
  recoltes: Recolte[];

  @OneToMany(() => Publication, (publication) => publication.cycle)
  publications: Publication[];
}
