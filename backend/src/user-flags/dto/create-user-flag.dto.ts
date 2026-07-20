import { IsUUID, IsEnum, IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { FlagType } from '../../users/entities/user-flag.entity';

export class CreateUserFlagDto {
  @IsUUID()
  userId: string;

  @IsEnum(FlagType)
  flagType: FlagType;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  raison: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  commentaire?: string;
}
