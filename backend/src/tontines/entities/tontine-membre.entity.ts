import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * Un membre d'une tontine et sa place FIXE dans l'ordre de réception,
 * assignée une fois pour toutes à la création (`ordre`, 0-based, dans le sens
 * du tableau `membres` fourni par le responsable — jamais recalculée).
 *
 * Deux contraintes d'unicité, portées par des index UNIQUE (donc actives
 * aussi bien sur base neuve via `synchronize` que sur base existante via la
 * migration) :
 *  - (tontine_id, ordre)   : jamais deux membres à la même position de tour.
 *  - (tontine_id, user_id) : jamais un même utilisateur membre deux fois.
 */
@Entity('tontine_membres')
@Index('ux_tontine_membres_ordre', ['tontineId', 'ordre'], { unique: true })
@Index('ux_tontine_membres_user', ['tontineId', 'userId'], { unique: true })
export class TontineMembre {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'tontine_id', type: 'uuid' })
  tontineId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ type: 'int' })
  ordre: number;

  // true une fois que ce membre a reçu le pot de SON tour (ordre ===
  // cycleCourant au moment de la distribution). Ne dispense jamais de cotiser
  // aux tours suivants tant que le cycle n'est pas terminé.
  @Column({ name: 'a_recu', type: 'boolean', default: false })
  aRecu: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
