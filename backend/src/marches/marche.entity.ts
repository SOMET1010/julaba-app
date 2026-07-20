import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Zone } from '../zones/entities/zone.entity';

export enum MarcheTypeEnum {
  couvert = 'couvert',
  decouvert = 'decouvert',
  mixte = 'mixte',
  autre = 'autre',
}

@Entity('marches')
export class Marche {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  nom: string;

  @ManyToOne(() => Zone, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'zone_id' })
  zone: Zone;

  @Column({ type: 'text', nullable: true })
  adresse: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  @Column({
    name: 'type',
    type: 'enum',
    enum: MarcheTypeEnum,
    enumName: 'marche_type_enum',
    default: MarcheTypeEnum.autre,
  })
  marcheType: MarcheTypeEnum;

  @Column({ default: true })
  actif: boolean;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
