import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { Wallet } from '../../wallets/entities/wallet.entity';
import { Cycle } from '../../producteur/cycles/entities/cycle.entity';
import { Publication } from '../../producteur/publications/entities/publication.entity';
import { Commande } from '../../commandes/entities/commande.entity';
import { SousProfilMarchand } from './sous-profil-marchand.enum';

export enum UserRole {
  PRODUCTEUR = 'producteur',
  MARCHAND = 'marchand',
  IDENTIFICATEUR = 'identificateur',
  COOPERATEUR = 'cooperateur',
  INSTITUTION = 'institution',
  ADMIN_GENERAL = 'admin_general',
  ADMIN_NATIONAL = 'admin_national',
  GESTIONNAIRE_ZONE = 'gestionnaire_zone',
  OPERATEUR_TERRAIN = 'operateur_terrain',
  SUPER_ADMIN = 'super_admin',
}

export enum UserStatus {
  PENDING = 'pending',
  ACTIF = 'actif',
  SUSPENDU = 'suspendu',
  REJETE = 'rejete',
  EN_ATTENTE_VALIDATION = 'en_attente_validation', // Nouveau pour comptes admin Q34
  SUPPRIME = 'supprime',
}

// Metadonnees d'identite pour les comptes administrateur crees en mode entite
// (ex. une direction generale). Stockees dans la colonne jsonb entite_metadata,
// renseignees uniquement pour les roles admin, nulles pour tous les autres.
export type EntiteMetadata = {
  sigle: string;
  typeEntite: string;
  typePrecise: string | null;
  referentNom: string;
  referentFonction: string;
};

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 20 })
  phone: string;

  @Column({ name: 'email', nullable: true, type: 'varchar', length: 255, unique: true })
  email?: string;

  @Column({ nullable: true, default: 'femme' })
  genre: string;

  @Column({ name: 'password_hash', nullable: true })
  @Exclude()
  passwordHash: string;

  @Column({ name: 'first_name', length: 100 })
  firstName: string;

  @Column({ name: 'last_name', length: 100 })
  lastName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
  })
  role: UserRole;

  @Column({
    name: 'sous_profil_marchand',
    type: 'enum',
    enum: SousProfilMarchand,
    nullable: true,
  })
  sousProfilMarchand?: SousProfilMarchand | null;

  @Column({ nullable: true, length: 100 })
  region: string;

  @Column({ nullable: true, length: 100 })
  commune: string;

  @Column({ nullable: true, length: 200 })
  activity: string;

  @Column({ nullable: true, length: 200 })
  market: string;

  @Column({ name: 'cooperative_name', nullable: true, length: 200 })
  cooperativeName: string;

  @Column({ name: 'institution_name', nullable: true, length: 200 })
  institutionName: string;

  @Column({ name: 'photo_url', nullable: true, type: 'text' })
  photoUrl: string;


  @Column({ name: 'nin', nullable: true, length: 100 })
  nin: string;

  @Column({ nullable: true, length: 100 })
  nationalite: string;

  @Column({ name: 'situation_matrimoniale', nullable: true, length: 100 })
  situationMatrimoniale: string;

  @Column({ name: 'num_cnps', nullable: true, length: 100 })
  numCNPS: string;

  @Column({ name: 'num_cmu', nullable: true, length: 100 })
  numCMU: string;

  @Column({ nullable: true, length: 200 })
  recepisse: string;

  @Column({ name: 'date_naissance', type: 'date', nullable: true })
  dateNaissance: Date | null;

  @Column({ name: 'lieu_naissance', type: 'varchar', length: 200, nullable: true })
  lieuNaissance: string | null;

  @Column({ name: 'est_membre_cooperative', type: 'boolean', default: false, nullable: true })
  estMembreCooperative: boolean | null;

  @Column({ nullable: true, length: 200 })
  categorie: string;

  @Column({ name: 'boite_postale', nullable: true, length: 200 })
  boitePostale: string;

  @Column({ name: 'statut_entrepreneur', nullable: true, length: 200 })
  statutEntrepreneur: string;

  @Column({ name: 'type_point_vente', nullable: true, length: 50 })
  typePointVente: string;

  @Column({ name: 'type_point_vente_autre', nullable: true, type: 'text' })
  typePointVenteAutre: string;

  @Column({ name: 'district_id', nullable: true })
  districtId: string;

  @Column({ name: 'district_autre', nullable: true, type: 'text' })
  districtAutre: string;

  @Column({ name: 'region_id', nullable: true })
  regionId: string;

  @Column({ name: 'region_autre', nullable: true, type: 'text' })
  regionAutre: string;

  @Column({ name: 'departement_id', nullable: true })
  departementId: string;

  @Column({ name: 'departement_autre', nullable: true, type: 'text' })
  departementAutre: string;

  @Column({ name: 'commune_id', nullable: true })
  communeId: string;

  @Column({ name: 'commune_autre', nullable: true, type: 'text' })
  communeAutre: string;

  @Column({ name: 'quartier_village', nullable: true, type: 'text' })
  quartierVillage: string;

  @Column({ name: 'zone_id', nullable: true })
  zoneId: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING,
  })
  status: UserStatus;

  @Column({ name: 'pending_validation_data', type: 'jsonb', nullable: true })
  pendingValidationData: any;

  @Column({ default: false })
  validated: boolean;

  @Column({ name: 'pin_security_enabled', default: false })
  pinSecurityEnabled: boolean;

  @Column({ name: 'must_change_password', default: false })
  mustChangePassword: boolean;

  @Column({ type: 'jsonb', default: '{}' })
  preferences: Record<string, boolean | string | number>;

  @Column({ name: 'bo_permissions', type: 'jsonb', nullable: true })
  boPermissions: Record<string, boolean> | null;

  @Column({ name: 'entite_metadata', type: 'jsonb', nullable: true })
  entiteMetadata: EntiteMetadata | null;

  @Column({ name: 'objectif_mensuel', type: 'int', nullable: true })
  objectifMensuel: number | null;

  @Column({ name: 'prime_objectif', type: 'int', nullable: true })
  primeObjectif: number | null;

  @Column({ name: 'pin_code_hash', nullable: true })
  @Exclude()
  pinCodeHash: string;

  @Column({ name: 'pin_code_encrypted_identificateur', nullable: true })
  @Exclude()
  pinCodeEncryptedIdentificateur: string;

  @Column({ name: 'failed_pin_attempts', type: 'int', default: 0 })
  failedPinAttempts: number;

  @Column({ name: 'locked_until', type: 'timestamp', nullable: true })
  lockedUntil: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt?: Date;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt: Date | null;

  @Column({ name: 'last_login_user_agent', type: 'varchar', length: 500, nullable: true })
  lastLoginUserAgent: string | null;

  @Column({ name: 'webauthn_credentials', type: 'jsonb', nullable: true, default: '[]' })
  webauthnCredentials: Array<{
    credentialID: string;
    credentialPublicKey: string;
    counter: number;
    deviceType: string;
    backedUp: boolean;
    transports?: string[];
  }> | null;

  @Column({ name: 'webauthn_challenge', nullable: true })
  webauthnChallenge: string | null;

  // Relations
  @OneToOne(() => Wallet, (wallet) => wallet.user)
  wallet: Wallet;

  @OneToMany(() => Cycle, (cycle) => cycle.user)
  cycles: Cycle[];

  @OneToMany(() => Publication, (publication) => publication.user)
  publications: Publication[];

  @OneToMany(() => Commande, (commande) => commande.acheteur)
  commandesAchetees: Commande[];

  @OneToMany(() => Commande, (commande) => commande.vendeur)
  commandesVendues: Commande[];
}
