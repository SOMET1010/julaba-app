import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { OpenAIService } from "./openai.service";
import { PiperService } from "./piper.service";
import { VoiceConfigModule } from "./voice-config.module";
import { VoiceServiceMetric } from "./entities/voice-service-metric.entity";
import { VoiceMetricsService } from "./voice-metrics.service";

/**
 * Ce qui RESTE du module vocal serveur, et pourquoi.
 *
 * Le parcours vocal d'une marchande ne passe PLUS par le serveur : l'écoute et
 * la parole se font entièrement sur le téléphone (sherpa-onnx embarqué dans
 * l'APK), et la compréhension par un vocabulaire fermé côté application. Le
 * chemin serveur — transcription Whisper/Vosk, intention par LLM, synthèse
 * distante — n'était plus appelé par personne. Il a été retiré le 17/09/2026 :
 * il faisait diagnostiquer des pannes sur du code qui ne tourne pas.
 *
 * Ce qui subsiste ici est VIVANT et appelé :
 *   - OpenAIService : rédige le RAPPORT HEBDOMADAIRE (caisse-rest) ;
 *   - PiperService  : repli de synthèse d'OpenAIService, couvert par un test ;
 *   - VoiceMetricsService : alimente l'analytique du back-office ;
 *   - VoiceConfigModule   : la route /admin/voice-config, appelée par le
 *     back-office pour configurer les fournisseurs de voix.
 */
@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([VoiceServiceMetric]), VoiceConfigModule],
  providers: [OpenAIService, PiperService, VoiceMetricsService],
  exports: [OpenAIService, VoiceMetricsService],
})
export class VoiceModule {}
