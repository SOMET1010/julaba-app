import { IsIn } from 'class-validator';
import { TICKET_STATUTS, TicketStatut } from '../ticket.entity';

// Changement de statut d'un ticket par le BO.
export class TicketStatutDto {
  @IsIn(TICKET_STATUTS as unknown as string[])
  statut: TicketStatut;
}
