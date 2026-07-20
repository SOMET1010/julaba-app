import { IsEnum, IsString, IsOptional, MaxLength } from 'class-validator';

export enum FlagResolutionAction {
  AVERTISSEMENT = 'avertissement',
  SUSPENDRE = 'suspendre',
  BANNIR = 'bannir',
  REJETER = 'rejeter',
}

export class ResolveUserFlagDto {
  @IsEnum(FlagResolutionAction)
  action: FlagResolutionAction;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolutionNote?: string;
}
