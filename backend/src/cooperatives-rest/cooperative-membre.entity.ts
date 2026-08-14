import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cooperative_membres')
@Index(['cooperative_id', 'membre_id'], { unique: true })
export class CooperativeMembre {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // type: 'uuid' explicite. Sans lui, synchronize creait ces colonnes en varchar
  // alors que cooperatives.id et users.id sont uuid -> la FK cooperative_id ne
  // pouvait pas se creer (warning a chaque boot). Corrige les builds neufs/tests ;
  // la base de prod deja peuplee restera en varchar jusqu'a la migration dediee.
  @Column({ name: 'cooperative_id', type: 'uuid' })
  cooperative_id: string;

  @Column({ name: 'membre_id', type: 'uuid' })
  membre_id: string;

  @Column({ nullable: true })
  statut?: string;

  @Column({ name: 'role', nullable: true })
  role?: string;

  @Column({ name: 'date_adhesion', nullable: true })
  date_adhesion?: string;

  @Column({ name: 'cotisation_payee', nullable: true })
  cotisation_payee?: boolean;

  @Column({ name: 'actif', nullable: true })
  actif?: boolean;
}
