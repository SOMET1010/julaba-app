import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('identifications')
export class Identification {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ nullable: true }) identificateur_id: string;
  @Column({ nullable: true }) acteur_id: string;
  @Column({ nullable: true }) type_acteur: string;
  @Column({ default: 'en_attente' }) statut: string;
  @Column({ type: 'jsonb', nullable: true }) documents: any;
  @Column({ nullable: true }) zone_id: string;
  @Column({ type: 'decimal', nullable: true }) commission: number;
  @Column({ default: false }) commission_payee: boolean;
  @Column({ nullable: true }) date_identification: Date;
  @Column({ nullable: true }) acteur_nom: string;
  @Column({ nullable: true }) region: string;
  @Column({ nullable: true }) commune: string;
  @Column({ nullable: true }) motif_rejet: string;
  @Column({ type: 'float', nullable: true }) latitude: number;
  @Column({ type: 'float', nullable: true }) longitude: number;
  @Column({ type: 'integer', nullable: true, default: 0 }) current_step: number;
  @Column({ type: 'jsonb', nullable: true }) form_data: any;
  // IDENT-09 (20/10/2026) — clé d'idempotence de la soumission : générée par
  // le client AVANT le POST, persistée avec le brouillon, REJOUÉE telle quelle
  // à la reprise après coupure réseau. UNIQUE (les NULL multiples restent
  // licites : les dossiers sans clé — back-office, ancien client — coexistent).
  // Le rejeu d'une clé déjà posée renvoie le dossier EXISTANT : ni doublon
  // d'acteur, ni faux « numéro déjà utilisé ».
  @Column({ nullable: true }) idempotency_key: string;
  @Column({
    type: 'enum',
    enum: ['terrain', 'admin_bo'],
    enumName: 'identification_source_enum',
    default: 'terrain',
  })
  source: string;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
