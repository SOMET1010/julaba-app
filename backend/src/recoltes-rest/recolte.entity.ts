import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('recoltes')
export class Recolte {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ nullable: true }) producteur_id: string;
  @Column({ nullable: true }) produit: string;
  @Column({ type: 'decimal', nullable: true }) quantite: number;
  @Column({ nullable: true }) unite: string;
  @Column({ type: 'decimal', nullable: true }) prix_unitaire: number;
  @Column({ nullable: true }) zone_id: string;
  @Column({ nullable: true }) date_recolte: string;
  @Column({ default: 'en_cours' }) statut: string;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
