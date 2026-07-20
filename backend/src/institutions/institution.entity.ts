import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('institutions')
export class Institution {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() nom: string;
  @Column({ nullable: true }) type: string;
  @Column({ nullable: true }) zone_id: string;
  @Column({ nullable: true }) responsable_id: string;
  @Column({ type: 'jsonb', default: {} }) modules: any;
  @Column({ default: true }) actif: boolean;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
