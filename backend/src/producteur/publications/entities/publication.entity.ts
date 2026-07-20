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
import { Recolte } from '../../recoltes/entities/recolte.entity';
import { Commande } from '../../../commandes/entities/commande.entity';

export enum PublicationStatut {
  DISPONIBLE = 'disponible',
  EPUISE = 'epuise',
  SUSPENDU = 'suspendu',
  ARCHIVE = 'archive',
}

export enum MarcheVirtuelType {
  PRODUCTEUR = 'producteur',
  COOPERATIVE = 'cooperative',
}

@Entity('publications')
export class Publication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'cycle_id', type: 'uuid', nullable: true })
  cycleId: string;

  @Column({ name: 'recolte_id', type: 'uuid', nullable: true })
  recolteId: string;

  @Column({ length: 100 })
  produit: string;

  @Column({ length: 100 })
  culture: string;

  @Column({
    name: 'quantite_disponible',
    type: 'decimal',
    precision: 10,
    scale: 2,
  })
  quantiteDisponible: number;

  @Column({ name: 'quantite_initiale', type: 'decimal', precision: 10, scale: 2 })
  quantiteInitiale: number;

  @Column({ length: 50 })
  unite: string;

  @Column({ name: 'prix_unitaire', type: 'decimal', precision: 10, scale: 2 })
  prixUnitaire: number;

  @Column({ length: 50 })
  qualite: string;

  @Column({ nullable: true, length: 200 })
  localisation: string;

  @Column({ default: true })
  active: boolean;

  @Column({
    type: 'enum',
    enum: PublicationStatut,
    default: PublicationStatut.DISPONIBLE,
  })
  statut: PublicationStatut;

  @Column({ name: 'cooperative_id', type: 'uuid', nullable: true })
  cooperativeId?: string | null;

  @Column({
    name: 'type_marche',
    type: 'enum',
    enum: MarcheVirtuelType,
    default: MarcheVirtuelType.PRODUCTEUR,
  })
  typeMarche: MarcheVirtuelType;

  @Column({ name: 'date_publication', type: 'timestamptz' })
  datePublication: Date;

  @Column({ name: 'date_expiration', type: 'date', nullable: true })
  dateExpiration: Date;

  @Column({ name: 'date_recolte', type: 'date', nullable: true })
  dateRecolte: Date;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ name: 'photo_url', nullable: true, type: 'text' })
  photoUrl: string;

  @Column({ name: 'conditions_vente', nullable: true, type: 'text' })
  conditionsVente: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.publications)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => Cycle, (cycle) => cycle.publications)
  @JoinColumn({ name: 'cycle_id' })
  cycle: Cycle;

  @ManyToOne(() => Recolte, (recolte) => recolte.publications)
  @JoinColumn({ name: 'recolte_id' })
  recolte: Recolte;

  @OneToMany(() => Commande, (commande) => commande.publication)
  commandes: Commande[];
}
