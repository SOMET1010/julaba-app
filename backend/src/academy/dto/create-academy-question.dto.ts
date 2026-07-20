import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

// Liste blanche des champs editables d'une question academy a la creation.
// id et created_at ne sont jamais ecrits depuis le client (id genere serveur).
// options est un tableau libre (le BO envoie des objets { text, icon }), stocke
// tel quel en jsonb : on ne contraint pas la forme des elements.
export class CreateAcademyQuestionDto {
  @IsString() @IsNotEmpty()
  role: string;

  @IsInt()
  chapter: number;

  @IsOptional() @IsInt() @Min(1)
  lesson?: number;

  @IsString() @IsNotEmpty()
  question: string;

  @IsArray()
  options: any[];

  @IsOptional() @IsInt() @Min(0)
  correctIndex?: number;

  @IsOptional() @IsString()
  explication?: string;

  @IsOptional() @IsBoolean()
  actif?: boolean;

  @IsOptional() @IsUUID()
  moduleId?: string | null;
}
