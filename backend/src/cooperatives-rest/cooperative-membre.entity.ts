import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('cooperative_membres')
@Index(['cooperative_id', 'membre_id'], { unique: true })
export class CooperativeMembre {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // uuid explicite : sans type, TypeORM infère varchar → la FK vers
  // cooperatives.id (uuid) « cannot be implemented ». Cf. ADR-0002 Étape 3 / #10.
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
