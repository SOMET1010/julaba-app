import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('raccourcis')
export class Raccourci {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id' }) userId: string;
  @Column() nom: string;
  @Column() declencheur: string;
  @Column({ default: 'vente' }) type: string;
  @Column({ type: 'jsonb', default: {} }) action: any;
  @Column({ default: true }) actif: boolean;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
