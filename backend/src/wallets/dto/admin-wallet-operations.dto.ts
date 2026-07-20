import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsNotEmpty, Min, Max, MaxLength, Equals } from 'class-validator';

export class AdminMontantOperationDto {
  @ApiProperty({ example: 10000, description: 'Montant en XOF' })
  @IsNumber({}, { message: 'Le montant doit etre un nombre' })
  @Min(1, { message: 'Le montant doit etre superieur a 0' })
  @Max(10_000_000, { message: 'Le montant depasse le plafond autorise (10 000 000 XOF)' })
  montant: number;

  @ApiProperty({ example: 'Credit manuel admin', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}

export class BloquerWalletDto {
  @ApiProperty({ example: 'Fraude suspectee' })
  @IsString()
  @IsNotEmpty({ message: 'La raison est requise' })
  @MaxLength(500)
  raison: string;
}

export class ReinitialiserSoldeDto {
  @ApiProperty({ example: 'CONFIRMER', description: 'Doit valoir exactement CONFIRMER' })
  @IsString()
  @Equals('CONFIRMER', { message: 'Confirmation requise: tapez CONFIRMER' })
  confirmation: string;
}
