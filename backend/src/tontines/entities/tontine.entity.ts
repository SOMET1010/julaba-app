import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum TontineStatut {
  ACTIVE = 'active',
  TERMINEE = 'terminee',
  ANNULEE = 'annulee',
}

/**
 * Tontine réelle entre plusieurs utilisateurs Jùlaba — module SACRÉ (touche le
 * wallet, cf. CONSTITUTION.md §7). Modèle produit tranché pour ce premier lot :
 *
 *  - Ordre de réception FIXÉ à la création (`TontineMembre.ordre`), jamais
 *    recalculé ensuite.
 *  - Montant et cadence FIXES pour tout le cycle (`montantCotisation`,
 *    `cadenceJours`) — décidés une fois, jamais réédités.
 *  - UN cycle complet = chaque membre reçoit exactement une fois le pot, dans
 *    l'ordre fixé. `cycleCourant` avance de 0 vers `nombre de membres` au fil
 *    des distributions ; une fois qu'il atteint ce nombre, `statut` passe à
 *    `terminee`. Le renouvellement pour un nouveau cycle est HORS PÉRIMÈTRE
 *    de ce lot (extension naturelle documentée dans la PR).
 *
 * Aucun solde n'est stocké ici : chaque cotisation et chaque distribution
 * passe par `WalletsService.debitWallet`/`creditWallet` (seul chemin autorisé
 * pour bouger de l'argent) et est tracée, append-only, dans
 * `tontine_mouvements` — cf. TontineMouvement.
 */
@Entity('tontines')
export class Tontine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  nom: string;

  @Column({ name: 'responsable_id', type: 'uuid' })
  responsableId: string;

  @Column({ name: 'montant_cotisation', type: 'decimal', precision: 15, scale: 2 })
  montantCotisation: number;

  @Column({ name: 'cadence_jours', type: 'int' })
  cadenceJours: number;

  @Column({ name: 'date_debut', type: 'date' })
  dateDebut: string;

  @Column({ type: 'enum', enum: TontineStatut, default: TontineStatut.ACTIVE })
  statut: TontineStatut;

  // Index du tour EN COURS (0-based) — correspond à `TontineMembre.ordre` du
  // membre qui doit recevoir le pot ce tour-ci. Avance uniquement quand TOUS
  // les membres ont cotisé pour ce tour (cf. TontinesService.cotiser).
  @Column({ name: 'cycle_courant', type: 'int', default: 0 })
  cycleCourant: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
