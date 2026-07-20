import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Region } from './region.entity';
import { Commune } from './commune.entity';

@Entity('departements')
export class Departement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  nom: string;

  @Column({ length: 20 })
  code: string;

  @Column({ name: 'region_id' })
  regionId: string;

  @ManyToOne(() => Region, (region) => region.departements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'region_id' })
  region: Region;

  @OneToMany(() => Commune, (commune) => commune.departement)
  communes: Commune[];
}
