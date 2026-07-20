import { IsEnum, IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';
import { RecolteQualite, RecolteStatut } from '../entities/recolte.entity';

// Liste blanche des champs modifiables d'une recolte. N'inclut volontairement
// NI user_id, NI id, NI stock_disponible, NI stock_vendu, NI cycle_id : ces
// champs proprietaire/calcules ne sont jamais ecrits depuis le client.
// Les noms snake_case correspondent au format envoye par le frontend
// (recoltes-api.ts) ; le controller les mappe vers les proprietes de l'entite.
export class UpdateRecolteDto {
  @IsOptional() @IsString()
  produit?: string;

  @IsOptional() @IsNumber()
  quantite?: number;

  @IsOptional() @IsString()
  unite?: string;

  @IsOptional() @IsEnum(RecolteQualite)
  qualite?: RecolteQualite;

  @IsOptional() @IsDateString()
  date_recolte?: string;

  @IsOptional() @IsNumber()
  prix_unitaire?: number;

  @IsOptional() @IsString()
  parcelle?: string;

  @IsOptional() @IsString()
  notes?: string;

  @IsOptional() @IsString()
  photo_url?: string;

  // Le frontend recoltes envoie statut via cet update (declaree | validee | vendue).
  @IsOptional() @IsEnum(RecolteStatut)
  statut?: RecolteStatut;
}
