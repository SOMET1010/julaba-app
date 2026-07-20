import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('missions')
export class Mission {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() titre: string;
  @Column({ nullable: true }) description: string;
  @Column({ nullable: true }) assignee_id: string;
  @Column({ nullable: true }) zone_id: string;
  @Column({ default: 'en_attente' }) statut: string;
  @Column({ default: 'normale' }) priorite: string;
  @Column({ nullable: true }) date_echeance: Date;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
