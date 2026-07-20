import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

// Creation d'un ticket par un acteur. Le serveur fixe user_id, statut,
// numero, lu_par_bo et reponses : aucun de ces champs n'est accepte ici.
export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  titre: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  categorie?: string;

  @IsOptional()
  @IsString()
  priorite?: string;
}
