import { IsString, MinLength, MaxLength } from 'class-validator';

export class RejectAdminUserDto {
  @IsString()
  @MinLength(10, { message: 'Le motif doit contenir au moins 10 caractères' })
  @MaxLength(2000, { message: 'Le motif ne peut pas dépasser 2000 caractères' })
  motif: string;
}
