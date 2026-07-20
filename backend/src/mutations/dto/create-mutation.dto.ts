import { IsString, IsNotEmpty, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateMutationDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  zoneActuelleId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  zoneActuelle?: string;

  @IsString()
  @IsNotEmpty({ message: 'Zone demandee obligatoire' })
  @MaxLength(100)
  zoneDemandeeId: string;

  @IsString()
  @IsNotEmpty({ message: 'Zone demandee obligatoire' })
  @MaxLength(255)
  zoneDemandee: string;

  @IsString()
  @MinLength(20, { message: 'La raison doit contenir au moins 20 caractères' })
  @MaxLength(500, { message: 'La raison ne peut pas dépasser 500 caractères' })
  raison: string;
}
