import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, IsEnum, Min } from 'class-validator';

export enum Provider {
  ORANGE = 'ORANGE',
  MTN = 'MTN',
  MOOV = 'MOOV',
  WAVE = 'WAVE',
}

export class CreditWalletDto {
  @ApiProperty({ example: 10000, description: 'Montant en XOF' })
  @IsNumber()
  @Min(100, { message: 'Le montant minimum est 100 XOF' })
  montant: number;

  @ApiProperty({ example: 'Recharge via Orange Money' })
  @IsString()
  description: string;

  @ApiProperty({
    enum: Provider,
    example: Provider.ORANGE,
    required: false,
  })
  @IsOptional()
  @IsEnum(Provider)
  provider?: Provider;

  @ApiProperty({ example: 'TRX123456789', required: false })
  @IsOptional()
  @IsString()
  reference?: string;
}
