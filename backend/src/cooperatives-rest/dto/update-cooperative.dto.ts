import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Mise a jour d'une cooperative. Memes champs qu'a la creation, tous optionnels.
 * responsable_id, actif, dates et id restent hors du DTO (transitions serveur).
 */
export class UpdateCooperativeDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nom?: string;

  @IsOptional()
  @IsString()
  zone_id?: string;
}
