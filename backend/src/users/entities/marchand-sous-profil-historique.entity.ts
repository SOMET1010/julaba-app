import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';
import { SousProfilMarchand } from './sous-profil-marchand.enum';

@Entity('marchand_sous_profil_historique')
export class MarchandSousProfilHistorique {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'marchand_id', type: 'uuid' })
  marchandId: string;

  @Column({ name: 'ancien_sous_profil', type: 'enum', enum: SousProfilMarchand, nullable: true })
  ancienSousProfil: SousProfilMarchand | null;

  @Column({ name: 'nouveau_sous_profil', type: 'enum', enum: SousProfilMarchand, nullable: true })
  nouveauSousProfil: SousProfilMarchand | null;

  @Column({ name: 'modifie_par', type: 'uuid', nullable: true })
  modifiePar: string | null;

  @Column({ name: 'motif', type: 'text', nullable: true })
  motif: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
