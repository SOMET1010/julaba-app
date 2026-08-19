import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VoiceConfigController } from './voice-config.controller';
import { VoiceConfigService } from './voice-config.service';
import { VoiceProviderConfigEntity } from './voice-provider-config.entity';
// Réutilise EXACTEMENT le même service de chiffrement que les PIN
// (AES-256-GCM, JULABA_DECISIONS.md §10) plutôt que d'en inventer un nouveau.
// Fourni ici directement (classe sans dépendance de module) : PinCryptoService
// n'est pas exporté par AuthModule aujourd'hui, et importer tout AuthModule
// (Wallets/FeedbakSms/Audit/Notifications) juste pour cette classe autonome
// aurait été plus lourd et plus risqué (cycle potentiel) que la redéclarer
// comme provider ici — Nest instancie une seule fois par module, le
// mécanisme de chiffrement reste rigoureusement identique.
import { PinCryptoService } from '../auth/pin-crypto.service';

@Module({
  imports: [TypeOrmModule.forFeature([VoiceProviderConfigEntity])],
  controllers: [VoiceConfigController],
  providers: [VoiceConfigService, PinCryptoService],
  exports: [VoiceConfigService],
})
export class VoiceConfigModule {}
