import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsDateString,
  IsOptional,
  IsUrl,
  Min,
} from 'class-validator';

export class CreateCycleDto {
  @ApiProperty({ example: 'Riz' })
  @IsString()
  culture: string;

  @ApiProperty({ example: 2.5, description: 'Surface en hectares' })
  @IsNumber()
  @Min(0.01)
  surface: number;

  @ApiProperty({ example: 'Parcelle A1', required: false })
  @IsOptional()
  @IsString()
  parcelle?: string;

  @ApiProperty({ example: '2024-03-01' })
  @IsDateString()
  datePlantation: string;

  @ApiProperty({ example: '2024-07-01' })
  @IsDateString()
  dateRecolteEstimee: string;

  @ApiProperty({ example: 5000, description: 'Quantité estimée en kg' })
  @IsNumber()
  @Min(1)
  quantiteEstimee: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  photoUrl?: string;
}
