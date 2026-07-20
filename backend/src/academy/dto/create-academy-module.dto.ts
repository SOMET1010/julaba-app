import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

// Liste blanche des champs editables d'un module academy a la creation.
// nbInscrits et tauxCompletion sont calcules cote serveur, jamais ecrits ici.
export class CreateAcademyModuleDto {
  @IsString() @IsNotEmpty()
  titre: string;

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
