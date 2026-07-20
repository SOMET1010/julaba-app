import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('academy_modules')
export class AcademyModule {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() titre: string;
  @Column({ nullable: true }) description: string;
  @Column({ default: 'video' }) type: string;
  @Column({ default: 'debutant' }) niveau: string;
  @Column({ default: 'tous' }) profil: string;
  @Column({ default: 10 }) duree: number;
  @Column({ default: 50 }) points: number;
  @Column({ default: 'brouillon' }) statut: string;
  @Column({ name: 'nb_inscrits', default: 0 }) nbInscrits: number;
  @Column({ name: 'taux_completion', default: 0 }) tauxCompletion: number;
  @Column({ nullable: true }) image: string;
  @CreateDateColumn({ name: 'created_at' }) dateCreation: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updatedAt: Date;
}
