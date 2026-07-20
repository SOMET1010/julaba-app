import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Unique } from 'typeorm';

@Entity('academy_progress')
@Unique(['userId', 'moduleId'])
export class AcademyProgress {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ name: 'user_id' }) userId: string;
  @Column({ name: 'module_id' }) moduleId: string;
  @Column({ name: 'taux_completion', default: 0 }) tauxCompletion: number;
  @Column({ name: 'completed', default: false }) completed: boolean;
  @Column({ name: 'score', default: 0 }) score: number;
  @Column({ name: 'last_question_index', default: 0 }) lastQuestionIndex: number;
  @CreateDateColumn({ name: 'enrolled_at' }) enrolledAt: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
