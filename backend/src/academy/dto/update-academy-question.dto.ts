import { IsArray, IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

// Mise a jour d'une question academy. Tous les champs sont optionnels (le BO
// envoie parfois uniquement { actif } pour basculer l'activation). id et
// created_at ne sont jamais ecrits depuis le client.
export class UpdateAcademyQuestionDto {
  @IsOptional() @IsString()
  role?: string;

  @IsOptional() @IsInt()
  chapter?: number;

  @IsOptional() @IsInt() @Min(1)
  lesson?: number;

  @IsOptional() @IsString()
  question?: string;

  @IsOptional() @IsArray()
  options?: any[];

  @IsOptional() @IsInt() @Min(0)
  correctIndex?: number;

  @IsOptional() @IsString()
  explication?: string;

  @IsOptional() @IsBoolean()
  actif?: boolean;

  @IsOptional() @IsUUID()
  moduleId?: string | null;
}
