import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Departement } from './departement.entity';

@Entity('communes')
export class Commune {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  nom: string;

  @Column({ length: 20 })
  code: string;

  @Column({ name: 'departement_id' })
  departementId: string;

  @ManyToOne(() => Departement, (departement) => departement.communes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'departement_id' })
  departement: Departement;
}
