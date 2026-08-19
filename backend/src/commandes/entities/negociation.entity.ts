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
  // Publication d'origine (offre du marche negociee). Nullable : une negociation
  // peut porter sur un produit sans etre adossee a une publication du marche
  // virtuel (compat retro). Quand elle est renseignee, la commande creee a
  // l'acceptation la reprend, ce qui branche StockReservationService (reserve /
  // bloque si insuffisant / libere a l'annulation) — cf. JULABA_DECISIONS.md,
  // "B2, voie negociation non couverte par la reservation".
  @Column({ name: 'publication_id', type: 'uuid', nullable: true }) publicationId: string | null;
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
