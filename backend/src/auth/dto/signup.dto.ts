import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  Matches,
  IsInt,
  Min,
  IsBoolean,
  IsDateString,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { UserRole } from '../../users/entities/user.entity';
import { SousProfilMarchand } from '../../users/entities/sous-profil-marchand.enum';

export class SignupDto {
  @IsString() @IsNotEmpty()
  @Matches(/^\+225[0-9]{10}$/)
  phone: string;

  @IsString() @IsOptional() @MaxLength(128)
  password?: string;

  @IsString() @IsNotEmpty()
  firstName: string;

  @IsString() @IsNotEmpty()
  lastName: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.toLowerCase().trim() : value)
  @IsString()
  @IsIn(['homme', 'femme', 'autre'], { message: 'Genre doit être homme, femme ou autre' })
  genre?: string;

  @IsOptional() @IsString() region?: string;
  @IsOptional() @IsString() commune?: string;
  @IsOptional() @IsString() activity?: string;
  @IsOptional() @IsString() market?: string;
  @IsOptional() @IsString() cooperativeName?: string;
  @IsOptional() @IsString() institutionName?: string;
  @IsOptional() @IsString() photoUrl?: string;
  @IsOptional() @IsString() zoneId?: string;
  @IsOptional() @IsString() nin?: string;
  @IsOptional() @IsString() nationalite?: string;
  @IsOptional() @IsString() situationMatrimoniale?: string;
  @IsOptional() @IsString() numCNPS?: string;
  @IsOptional() @IsString() numCMU?: string;
  @IsOptional() @IsString() recepisse?: string;
  @IsOptional() @IsString() categorie?: string;
  @IsOptional() @IsString() boitePostale?: string;
  @IsOptional() @IsString() statutEntrepreneur?: string;
  @IsOptional() @IsDateString() dateNaissance?: string;
  @IsOptional() @IsString() @MaxLength(200) lieuNaissance?: string;
  @IsOptional() @IsBoolean() estMembreCooperative?: boolean;

  @IsOptional() @IsString() @MaxLength(50)
  typePointVente?: string;

  @IsOptional() @IsString() @MaxLength(500)
  typePointVenteAutre?: string;

  @IsOptional() @IsString() districtId?: string;
  @IsOptional() @IsString() @MaxLength(200) districtAutre?: string;
  @IsOptional() @IsString() regionId?: string;
  @IsOptional() @IsString() @MaxLength(200) regionAutre?: string;
  @IsOptional() @IsString() departementId?: string;
  @IsOptional() @IsString() @MaxLength(200) departementAutre?: string;
  @IsOptional() @IsString() communeId?: string;
  @IsOptional() @IsString() @MaxLength(200) communeAutre?: string;
  @IsOptional() @IsString() @MaxLength(500) quartierVillage?: string;

  @IsOptional() @IsInt() @Min(0)
  objectifMensuel?: number;

  @IsOptional() @IsInt() @Min(0)
  primeObjectif?: number;

  @IsOptional() @IsEnum(SousProfilMarchand)
  sousProfilMarchand?: SousProfilMarchand;
}
