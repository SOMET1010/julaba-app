import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('academy_questions')
export class AcademyQuestion {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() role: string;
  @Column() chapter: number;
  @Column({ default: 1 }) lesson: number;
  @Column() question: string;
  @Column({ type: 'jsonb', default: [] }) options: string[];
  @Column({ name: 'correct_index', default: 0 }) correctIndex: number;
  @Column({ nullable: true }) explication: string;
  @Column({ default: true }) actif: boolean;
  @Column({ name: 'module_id', type: 'uuid', nullable: true }) moduleId: string | null;
  @CreateDateColumn({ name: 'created_at' }) createdAt: Date;
}
