import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';
import { TICKET_STATUTS, TicketStatut } from '../ticket.entity';

// Mise a jour d'un ticket par le BO. N'autorise PAS l'ecriture de user_id,
// numero, id ou reponses brutes : ces champs sont absents du DTO et donc
// retires par le ValidationPipe global (whitelist).
export class UpdateTicketDto {
  @IsOptional()
  @IsIn(TICKET_STATUTS as unknown as string[])
  statut?: TicketStatut;

  @IsOptional()
  @IsString()
  priorite?: string;

  @IsOptional()
  @IsBoolean()
  lu_par_bo?: boolean;
}
