import { IsInt, IsOptional, IsString, Min } from 'class-validator';

// Mise a jour d'un module academy. Tous les champs sont optionnels (le BO
// envoie parfois uniquement { statut }). nbInscrits et tauxCompletion sont
// calcules cote serveur, jamais ecrits depuis le client.
export class UpdateAcademyModuleDto {
  @IsOptional() @IsString()
  titre?: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsString()
  type?: string;

  @IsOptional() @IsString()
  niveau?: string;

  @IsOptional() @IsString()
  profil?: string;

  @IsOptional() @IsInt() @Min(0)
  duree?: number;

  @IsOptional() @IsInt() @Min(0)
  points?: number;

  @IsOptional() @IsString()
  statut?: string;

  @IsOptional() @IsString()
  image?: string;
}
