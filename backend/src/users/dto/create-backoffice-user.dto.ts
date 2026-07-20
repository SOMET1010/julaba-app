import {
  IsOptional,
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  ValidateIf,
  IsObject,
  IsUUID,
  IsIn,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole, EntiteMetadata } from '../entities/user.entity';
import { SousProfilMarchand } from '../entities/sous-profil-marchand.enum';

/** Rôles créables via POST /users/backoffice/create */
export const CREATABLE_BO_ROLE_LIST: UserRole[] = [
  UserRole.ADMIN_GENERAL,
  UserRole.ADMIN_NATIONAL,
  UserRole.GESTIONNAIRE_ZONE,
  UserRole.OPERATEUR_TERRAIN,
  UserRole.MARCHAND,
  UserRole.PRODUCTEUR,
  UserRole.COOPERATEUR,
  UserRole.INSTITUTION,
  UserRole.IDENTIFICATEUR,
];

const ADMIN_ROLES_SET = [
  UserRole.ADMIN_GENERAL,
  UserRole.ADMIN_NATIONAL,
  UserRole.GESTIONNAIRE_ZONE,
  UserRole.OPERATEUR_TERRAIN,
];

const ACTEUR_METIER_ROLES_SET = [
  UserRole.MARCHAND,
  UserRole.PRODUCTEUR,
  UserRole.COOPERATEUR,
];

export class CreateBackofficeUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @IsString()
  @Matches(/^(\+225)?\s?(0?[1-9]\d{8})$/, {
    message:
      'Numéro de téléphone invalide (format Côte d\'Ivoire attendu)',
  })
  phone: string;

  /** Obligatoire pour les rôles admin BO et identificateur. */
  @ValidateIf(
    (dto: CreateBackofficeUserDto) =>
      ADMIN_ROLES_SET.includes(dto.role) ||
      dto.role === UserRole.IDENTIFICATEUR,
  )
  @IsEmail({}, { message: 'Adresse e-mail invalide (obligatoire pour ce rôle)' })
  email?: string;

  /** Pour les autres rôles, e-mail facultatif (fusionné côté service avec email). */
  @ValidateIf(
    (dto: CreateBackofficeUserDto) =>
      !ADMIN_ROLES_SET.includes(dto.role) &&
      dto.role !== UserRole.IDENTIFICATEUR,
  )
  @IsOptional()
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  emailOptional?: string;

  @IsIn(CREATABLE_BO_ROLE_LIST, {
    message: 'Rôle non autorisé pour la création via le back-office',
  })
  role: UserRole;

  @ValidateIf((dto: CreateBackofficeUserDto) => dto.role === UserRole.MARCHAND)
  @IsEnum(SousProfilMarchand, {
    message: 'Sous-profil obligatoire pour un marchand (grossiste, demi_grossiste ou detaillant)',
  })
  sousProfilMarchand?: SousProfilMarchand;

  @ValidateIf(
    (dto: CreateBackofficeUserDto) =>
      dto.role === UserRole.GESTIONNAIRE_ZONE ||
      dto.role === UserRole.IDENTIFICATEUR,
  )
  @IsUUID(undefined, {
    message: 'zoneId obligatoire pour gestionnaire_zone et identificateur',
  })
  zoneId?: string;

  @ValidateIf(
    (dto: CreateBackofficeUserDto) =>
      dto.role !== UserRole.GESTIONNAIRE_ZONE &&
      dto.role !== UserRole.IDENTIFICATEUR,
  )
  @IsOptional()
  @IsUUID()
  zoneIdOptional?: string;

  @ValidateIf((dto: CreateBackofficeUserDto) =>
    ADMIN_ROLES_SET.includes(dto.role),
  )
  @IsOptional()
  @IsObject({ message: 'boPermissions doit être un objet JSON' })
  boPermissions?: Record<string, unknown>;

  /**
   * Metadonnees d'entite (sigle, type, referent...) pour un compte admin cree
   * en mode entite. Optionnel : un acteur metier ne l'envoie pas. Valide
   * uniquement pour les roles admin et seulement s'il est present.
   */
  @ValidateIf((dto: CreateBackofficeUserDto) =>
    ADMIN_ROLES_SET.includes(dto.role),
  )
  @IsOptional()
  @IsObject({ message: 'entiteMetadata doit être un objet JSON' })
  entiteMetadata?: EntiteMetadata;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.toLowerCase().trim() : value)
  @IsString()
  @MaxLength(50)
  @IsIn(['homme', 'femme', 'autre'], { message: 'Genre doit être homme, femme ou autre' })
  genre?: string;

  @IsOptional()
  @IsDateString()
  dateNaissance?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  lieuNaissance?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  nationalite?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  nin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  numCmu?: string;

  @IsOptional()
  @IsString()
  photoBase64?: string;

  @ValidateIf((dto: CreateBackofficeUserDto) =>
    ACTEUR_METIER_ROLES_SET.includes(dto.role),
  )
  @IsOptional()
  @IsObject()
  acteurMetierData?: Record<string, unknown>;

  @ValidateIf((dto: CreateBackofficeUserDto) =>
    dto.role === UserRole.INSTITUTION,
  )
  @IsOptional()
  @IsObject()
  institutionData?: Record<string, unknown>;
}
