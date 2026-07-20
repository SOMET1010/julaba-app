import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('stocks')
export class Stock {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() produit: string;
  @Column({ type: 'decimal', nullable: true }) quantite: number;
  @Column({ nullable: true }) unite: string;
  @Column({ nullable: true }) zone_id: string;
  @Column({ nullable: true }) proprietaire_id: string;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
