import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ nullable: true }) user_id: string;
  @Column({ nullable: true }) action: string;
  @Column({ nullable: true }) entite: string;
  @Column({ nullable: true }) entite_id: string;
  @Column({ type: 'jsonb', nullable: true }) details: any;
  @Column({ nullable: true }) ip: string;
  @CreateDateColumn() created_at: Date;
}
