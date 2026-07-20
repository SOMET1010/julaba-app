import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MaxLength, IsOptional, ValidateIf, IsEmail, Matches } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: '+2250700000001', required: false })
  @IsOptional()
  @ValidateIf((o) => !o.email)
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+225[0-9]{10}$/, {
    message: 'Le numéro doit commencer par +225 suivi de 10 chiffres',
  })
  phone?: string;

  @ApiProperty({ example: 'admin@julaba.com', required: false })
  @IsOptional()
  @ValidateIf((o) => !o.phone)
  @IsString()
  @IsEmail({}, { message: 'Adresse e-mail invalide' })
  @MaxLength(255)
  email?: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  password: string;
}
