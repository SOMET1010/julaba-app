import { IsString, IsNotEmpty, IsOptional, IsObject, IsBoolean, MaxLength } from 'class-validator';

// Validation des raccourcis vocaux. `nom`, `declencheur`, `type` sont NOT NULL en
// base → sans validation, un body incomplet atteignait la base et renvoyait un 500.
// Avec ces DTO + le ValidationPipe global (whitelist), un payload invalide est
// rejeté proprement en 400 AVANT toute requête base.
export class CreerRaccourciDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  nom: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  declencheur: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  type: string;

  // Action libre (jsonb). Optionnelle et non validée en profondeur : le contenu
  // varie (vendre/depense/stock/autre) et passe tel quel.
  @IsOptional()
  @IsObject()
  action?: Record<string, any> | null;
}

// Mise à jour partielle : tous les champs sont optionnels, mais s'ils sont
// fournis ils doivent être valides (pas de chaîne vide sur un champ NOT NULL).
export class UpdateRaccourciDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  nom?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  declencheur?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  type?: string;

  @IsOptional()
  @IsObject()
  action?: Record<string, any> | null;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}
