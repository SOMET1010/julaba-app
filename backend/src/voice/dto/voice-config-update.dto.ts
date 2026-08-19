import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// Corps de PUT /admin/voice-config/:provider — voir voice-config.controller.ts.
// `apiKey` omis (undefined) = on conserve la clé déjà enregistrée pour ce
// fournisseur (permet de changer voiceName/region/setActive sans ressaisir
// la clé). `apiKey` vide explicite ('') n'est PAS accepté (MinLength) : pour
// effacer une clé, il faut la remplacer, jamais la vider silencieusement.
export class VoiceConfigUpdateDto {
  @IsOptional()
  @IsString()
  @MinLength(8, { message: "La clé API semble trop courte." })
  @MaxLength(500)
  apiKey?: string;

  // ElevenLabs : voice_id. Azure Speech : nom de voix standard ou nom de
  // déploiement de voix clonée (Speech Studio).
  @IsOptional()
  @IsString()
  @MaxLength(150)
  voiceName?: string;

  // Azure Speech uniquement (ex. "francecentral", "westeurope").
  @IsOptional()
  @IsString()
  @MaxLength(50)
  azureRegion?: string;

  // true = active ce fournisseur (et désactive l'autre) ; false = enregistre
  // sans activer ; omis = ne change pas l'état actif.
  @IsOptional()
  @IsBoolean()
  setActive?: boolean;
}

// Provider validé dans le contrôleur via ce tableau (source de vérité unique,
// partagée avec l'entité — voir voice-provider-config.entity.ts).
export const VOICE_PROVIDERS = ['elevenlabs', 'azure_speech'] as const;
export type VoiceProviderParam = (typeof VOICE_PROVIDERS)[number];
