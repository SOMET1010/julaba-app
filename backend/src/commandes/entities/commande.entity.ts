import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Publication } from '../../producteur/publications/entities/publication.entity';

export enum CommandeStatut {
  EN_ATTENTE = 'en_attente',
  CONFIRMEE = 'confirmee',
  EN_LIVRAISON = 'en_livraison',
  LIVREE = 'livree',
  ANNULEE = 'annulee',
  LITIGE = 'litige',
}

@Entity('commandes')
export class Commande {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'acheteur_id', type: 'uuid', nullable: true })
  acheteurId: string | null;

  /** Libellé acheteur hors compte (ex. vente_directe) */
  @Column({ name: 'acheteur_nom', type: 'varchar', length: 255, nullable: true })
  acheteurNom: string | null;

  @Column({ name: 'image_url', type: 'varchar', length: 2048, nullable: true })
  imageUrl: string | null;

  @Column({ name: 'acheteur_telephone', type: 'varchar', length: 50, nullable: true })
  acheteurTelephone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  localite: string | null;

  @Column({ name: 'vendeur_id', type: 'uuid' })
  vendeurId: string;

  @Column({ name: 'publication_id', type: 'uuid', nullable: true })
  publicationId: string;

  @Column({ length: 100 })
  type: string;

  @Column({ length: 100 })
  produit: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  quantite: number;

  @Column({ name: 'prix_unitaire', type: 'decimal', precision: 10, scale: 2 })
  prixUnitaire: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  total: number;

  @Column({
    type: 'enum',
    enum: CommandeStatut,
    default: CommandeStatut.EN_ATTENTE,
  })
  statut: CommandeStatut;

  @Column({ name: 'date_commande', type: 'timestamptz' })
  dateCommande: Date;

  @Column({ name: 'date_livraison', type: 'date', nullable: true })
  dateLivraison: Date;

  @Column({ nullable: true, type: 'text' })
  notes: string;

  @Column({ name: 'mode_paiement', type: 'varchar', length: 50, nullable: true })
  modePaiement: string | null;

  @Column({ name: 'statut_paiement', type: 'varchar', length: 20, default: 'non_paye' })
  statutPaiement: string;

  @Column({ name: 'paye_at', type: 'timestamptz', nullable: true })
  payeAt: Date | null;

  @Column({ nullable: true, default: null })
  livreur: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, (user) => user.commandesAchetees, { nullable: true })
  @JoinColumn({ name: 'acheteur_id' })
  acheteur: User | null;

  @ManyToOne(() => User, (user) => user.commandesVendues)
  @JoinColumn({ name: 'vendeur_id' })
  vendeur: User;

  @ManyToOne(() => Publication, (publication) => publication.commandes)
  @JoinColumn({ name: 'publication_id' })
  publication: Publication;
}
