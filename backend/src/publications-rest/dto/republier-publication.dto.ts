import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsPositive,
  MaxLength,
} from 'class-validator';

export class RepublierPublicationDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  produit: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  culture?: string;

  @IsNumber()
  @IsPositive()
  quantite_disponible: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  unite: string;

  @IsNumber()
  @IsPositive()
  prix_unitaire: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  qualite?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  localisation?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  photo_url?: string;
}
