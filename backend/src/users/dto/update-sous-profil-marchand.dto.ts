import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { SousProfilMarchand } from '../entities/sous-profil-marchand.enum';

export class UpdateSousProfilMarchandDto {
  @IsEnum(SousProfilMarchand, {
    message: 'Sous-profil invalide (grossiste, demi_grossiste ou detaillant)',
  })
  sousProfilMarchand: SousProfilMarchand;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Le motif ne peut dépasser 500 caractères' })
  motif?: string;
}
