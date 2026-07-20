import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export enum StatutActeur {
  ACTIF = 'actif',
  SUSPENDU = 'suspendu',
  EN_ATTENTE = 'en_attente',
  REJETE = 'rejete',
}

export class UsersBoListQueryDto {
  /** Numéro de page, minimum 1. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  /** Nombre d éléments par page, borné à 100. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  /** Recherche texte sur prénom, nom et téléphone. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  /** Rôle ciblé pour filtrer la liste BO. */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  role?: string;

  /**
   * Scope special : 'bo' cible le groupe des rôles back-office
   * (filtrage serveur sur BO_ROLES). Additif, ne casse pas le filtre `role`.
   */
  @IsOptional()
  @IsIn(['bo'])
  scope?: string;

  /** Statut acteur filtré sur la colonne status. */
  @IsOptional()
  @IsEnum(StatutActeur)
  statut?: StatutActeur;

  /** Région exacte, comparaison insensible à la casse. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  /** Date ISO 8601 minimale sur created_at. */
  @IsOptional()
  @IsISO8601()
  dateDepuis?: string;
}
