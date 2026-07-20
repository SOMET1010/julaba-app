import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Creation d'une cooperative. Liste blanche stricte: le client ne fixe ni
 * responsable_id (force serveur via currentUser), ni actif, ni les dates, ni id.
 */
export class CreateCooperativeDto {
  @IsString()
  @IsNotEmpty()
  nom: string;

  @IsOptional()
  @IsString()
  zone_id?: string;
}
