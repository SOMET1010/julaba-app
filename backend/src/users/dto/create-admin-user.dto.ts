import {
  IsEnum,
  IsOptional,
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  Matches,
  ValidateIf,
  IsObject,
  IsUUID,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

const ADMIN_ROLES_CREATABLE = [
  UserRole.ADMIN_GENERAL,
  UserRole.ADMIN_NATIONAL,
  UserRole.GESTIONNAIRE_ZONE,
  UserRole.OPERATEUR_TERRAIN,
];

export class CreateAdminUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  lastName: string;

  @IsString()
  @Matches(/^(\+225)?\s?(0?[1-9]\d{8})$/, {
    message: 'Numéro de téléphone invalide (format Côte d\'Ivoire attendu)',
  })
  phone: string;

  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  email: string;

  @IsEnum(ADMIN_ROLES_CREATABLE, {
    message:
      'Le rôle doit être admin_general, admin_national, gestionnaire_zone ou operateur_terrain',
  })
  role: UserRole;

  @ValidateIf((dto) => dto.role === UserRole.GESTIONNAIRE_ZONE)
  @IsUUID(undefined, { message: 'zoneId obligatoire pour le rôle gestionnaire_zone' })
  zoneId?: string;

  @IsOptional()
  @IsObject({ message: 'boPermissions doit être un objet JSON' })
  boPermissions?: Record<string, any>;
}
