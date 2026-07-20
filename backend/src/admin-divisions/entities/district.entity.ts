import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Region } from './region.entity';

@Entity('districts')
export class District {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 100 })
  nom: string;

  @Column({ length: 20, unique: true })
  code: string;

  @OneToMany(() => Region, (region) => region.district)
  regions: Region[];
}
