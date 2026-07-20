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
import { Cycle } from '../../cycles/entities/cycle.entity';
import { Publication } from '../../publications/entities/publication.entity';

export enum RecolteQualite {
  STANDARD = 'standard',
  PREMIUM = 'premium',
  BIO = 'bio',
}

export enum RecolteStatut {
  DECLAREE = 'declaree',
  VALIDEE = 'validee',
  VENDUE = 'vendue',
}

@Entity('recoltes')
export class Recolte {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'cycle_id', type: 'uuid', nullable: true })
  cycleId: string;

  @Column({ length: 100 })
  produit: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantite: number;

  @Column({ length: 50 })
  unite: string;

  @Column({ type: 'enum', enum: RecolteQualite })
  qualite: RecolteQualite;

  @Column({ name: 'date_recolte', type: 'date' })
  dateRecolte: Date;

  @Column({ type: 'enum', enum: RecolteStatut, default: RecolteStatut.DECLAREE })
  statut: RecolteStatut;

  @Column({ name: 'prix_unitaire', type: 'decimal', precision: 10, scale: 2 })
  prixUnitaire: number;

  @Column({ nullable: true, length: 100 })
  parcelle: string;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ name: 'photo_url', nullable: true, type: 'text' })
  photoUrl: string;

  @Column({ name: 'stock_disponible', type: 'decimal', precision: 10, scale: 2, default: 0 })
  stockDisponible: number;

  @Column({ name: 'stock_vendu', type: 'decimal', precision: 10, scale: 2, default: 0 })
  stockVendu: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Cycle, (cycle) => cycle.recoltes)
  @JoinColumn({ name: 'cycle_id' })
  cycle: Cycle;

  @OneToMany(() => Publication, (publication) => publication.recolte)
  publications: Publication[];
}
