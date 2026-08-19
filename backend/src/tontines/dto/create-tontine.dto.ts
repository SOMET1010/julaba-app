import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class TontineMembreDto {
  @IsUUID()
  userId: string;
}

/**
 * Création d'une tontine. Liste blanche stricte : le client ne fixe ni
 * responsableId (forcé serveur via currentUser), ni statut, ni cycleCourant.
 *
 * `membres` est un tableau ORDONNÉ : l'ordre du tableau = l'ordre de
 * réception assigné (0, 1, 2…), fixé une fois pour toutes ici (décision
 * produit — cf. Tontine.entity.ts). Minimum 2 membres : une tontine à un seul
 * membre n'a pas de sens.
 */
export class CreateTontineDto {
  @IsString()
  @IsNotEmpty()
  nom: string;

  @IsInt()
  @IsPositive()
  montantCotisation: number;

  @IsInt()
  @IsPositive()
  cadenceJours: number;

  @IsDateString()
  dateDebut: string;

  @IsArray()
  @ArrayMinSize(2, { message: 'Une tontine nécessite au moins 2 membres' })
  @ValidateNested({ each: true })
  @Type(() => TontineMembreDto)
  membres: TontineMembreDto[];
}
