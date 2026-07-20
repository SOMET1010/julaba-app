import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// Statuts reels d'un ticket. Valeurs effectivement ecrites par le serveur
// (create -> 'ouvert', reponse -> 'en_cours') et envoyees par le frontend
// (tickets-api Ticket.statut : ouvert | en_cours | resolu | ferme).
export const TICKET_STATUTS = ['ouvert', 'en_cours', 'resolu', 'ferme'] as const;
export type TicketStatut = (typeof TICKET_STATUTS)[number];

@Entity('tickets')
export class Ticket {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column({ nullable: true }) user_id: string;
  @Column({ nullable: true }) titre: string;
  @Column({ nullable: true }) description: string;
  @Column({ nullable: true }) categorie: string;
  @Column({ default: 'ouvert' }) statut: string;
  @Column({ default: 'normale' }) priorite: string;
  @Column({ type: 'jsonb', default: [] }) reponses: any;
  @Column({ default: false }) lu_par_bo: boolean;
  @Column({ nullable: true }) numero: string;
  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
