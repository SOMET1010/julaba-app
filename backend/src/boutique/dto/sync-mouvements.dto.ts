import { IsArray, ValidateNested, IsString, IsOptional, IsNumber, IsUUID, ArrayMaxSize } from "class-validator";
import { Type } from "class-transformer";

// Un mouvement remonte par le telephone. Le serveur fixe marchand_id (depuis le
// JWT) : il n'est jamais accepte ici.
export class MouvementDto {
  @IsUUID()
  id: string;

  @IsString()
  device: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  produit?: string | null;

  @IsOptional()
  @IsNumber()
  quantite?: number | null;

  @IsOptional()
  @IsNumber()
  montant?: number | null;

  @IsOptional()
  @IsString()
  transcription?: string;

  @IsNumber()
  ts: number;
}

export class SyncMouvementsDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => MouvementDto)
  mouvements: MouvementDto[];
}
