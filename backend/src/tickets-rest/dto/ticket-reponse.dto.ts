import { IsNotEmpty, IsString } from 'class-validator';

// Reponse du BO a un ticket.
export class TicketReponseDto {
  @IsString()
  @IsNotEmpty()
  message: string;
}
