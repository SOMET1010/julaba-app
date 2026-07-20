import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { District } from './district.entity';
import { Departement } from './departement.entity';

@Entity('regions')
export class Region {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  nom: string;

  @Column({ length: 20 })
  code: string;

  @Column({ name: 'district_id' })
  districtId: string;

  @ManyToOne(() => District, (district) => district.regions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'district_id' })
  district: District;

  @OneToMany(() => Departement, (departement) => departement.region)
  departements: Departement[];
}
