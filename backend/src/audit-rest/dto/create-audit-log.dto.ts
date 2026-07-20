import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

/**
 * Creation d'une entree d'audit. Liste blanche stricte: le client ne fixe ni
 * user_id (force serveur via currentUser), ni id, ni created_at.
 */
export class CreateAuditLogDto {
  @IsString()
  @IsNotEmpty()
  action: string;

  @IsOptional()
  @IsString()
  entite?: string;

  @IsOptional()
  @IsString()
  entite_id?: string;

  @IsOptional()
  @IsObject()
  details?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  ip?: string;
}
