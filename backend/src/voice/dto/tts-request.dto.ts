import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

// Borne la taille du texte envoye a l'API TTS payante (OpenAI/ElevenLabs).
// 2000 caracteres couvrent largement une reponse vocale (les chunks reels
// font ~110 caracteres cote frontend).
export class TtsRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  text: string;
}
