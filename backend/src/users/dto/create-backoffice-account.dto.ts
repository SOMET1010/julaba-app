import {
  IsString,
  IsNotEmpty,
  IsOptional,
  MinLength,
  MaxLength,
  Matches,
  IsEnum,
} from 'class-validator';
import { UserRole } from '../entities/user.entity';

/**
 * Roles back-office reellement creables via POST /users/backoffice-account.
 * Liste autoritaire cote serveur: super_admin en est volontairement exclu
 * (aucune raison metier de creer un super_admin depuis cet ecran).
 */
export const CREATABLE_BO_ACCOUNT_ROLES: UserRole[] = [
  UserRole.ADMIN_GENERAL,
  UserRole.ADMIN_NATIONAL,
  UserRole.GESTIONNAIRE_ZONE,
  UserRole.OPERATEUR_TERRAIN,
];

/**
 * Creation d'un compte administrateur back-office.
 * Calque sur les champs reels du formulaire BOUtilisateurs (prenom, nom,
 * telephone, role, region). Le mot de passe est genere cote serveur.
 */
export class CreateBackofficeAccountDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  firstName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(\+225)?\s?(0?[1-9]\d{8})$/, {
    message: 'Numero de telephone invalide (format Cote d\'Ivoire attendu)',
  })
  phone: string;

  @IsEnum(UserRole, { message: 'Role invalide' })
  role: UserRole;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;
}
