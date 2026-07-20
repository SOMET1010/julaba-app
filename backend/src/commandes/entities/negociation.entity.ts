import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum NegociationStatut {
  EN_ATTENTE = 'en_attente',
  ACCEPTE = 'accepte',
  REFUSE = 'refuse',
  CONTRE_OFFRE = 'contre_offre',
}

@Entity('negociations')
export class Negociation {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'marchand_id' }) marchandId: string;
  @Column({ name: 'vendeur_id' }) vendeurId: string;
  @Column() produit: string;
  @Column({ type: 'decimal', precision: 10, scale: 2 }) quantite: number;
  @Column({ name: 'prix_original', type: 'decimal', precision: 10, scale: 2 }) prixOriginal: number;
  @Column({ name: 'prix_propose', type: 'decimal', precision: 10, scale: 2 }) prixPropose: number;
  @Column() unite: string;
  @Column({ nullable: true, type: 'text' }) message: string;
  @Column({ type: 'enum', enum: NegociationStatut, default: NegociationStatut.EN_ATTENTE }) statut: NegociationStatut;
  @Column({ name: 'prix_contre_offre', type: 'decimal', nullable: true }) prixContreOffre: number;
  @Column({ name: 'message_reponse', type: 'text', nullable: true }) messageReponse: string;
  @Column({ name: 'nb_contre_offres', type: 'int', default: 0 }) nbContreOffres: number;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
