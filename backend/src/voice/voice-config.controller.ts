import { Body, Controller, Get, HttpCode, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { VoiceConfigService } from './voice-config.service';
import { VoiceConfigUpdateDto } from './dto/voice-config-update.dto';

const TEST_PHRASE = "Bonjour, ceci est un test de la voix Julaba. Un, deux, trois.";

// Admin-only : configuration des fournisseurs TTS (ElevenLabs / Azure Speech)
// consommée par Studio Voix > onglet Clonage (frontend_src/src/app/pages/StudioVoix.tsx).
// La clé API n'est JAMAIS renvoyée en clair par ces routes — seulement
// "configuré : oui/non" + les 4 derniers caractères (voir VoiceConfigService.toStatus).
@Roles('ADMIN')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/voice-config')
export class VoiceConfigController {
  constructor(private readonly voiceConfig: VoiceConfigService) {}

  @Get()
  getStatus() {
    return this.voiceConfig.getStatus();
  }

  @Put(':provider')
  update(@Param('provider') provider: string, @Body() dto: VoiceConfigUpdateDto, @Req() req: any) {
    const updatedBy = req.user?.id ?? null;
    return this.voiceConfig.upsert(provider, dto, updatedBy);
  }

  // Synthétise une courte phrase de test avec la config ENREGISTRÉE pour ce
  // fournisseur, pour vérifier que la clé fonctionne avant de l'activer en
  // prod. Throttle serré : appel à une API cloud payante par admin authentifié.
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post(':provider/test')
  @HttpCode(200)
  async test(@Param('provider') provider: string) {
    const buf = await this.voiceConfig.testSynthesize(provider, TEST_PHRASE);
    return { success: true, audio: buf.toString('base64'), phrase: TEST_PHRASE };
  }
}
