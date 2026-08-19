import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { VoiceController, TtsController } from "./voice.controller";
import { VoiceService } from "./voice.service";
import { ConversationStateService } from "./conversation.state";
import { UserMemoryService } from "./user-memory.service";
import { OpenAIService } from "./openai.service";
import { LocalIntentService } from "./local-intent.service";
import { VoskService } from "./vosk.service";
import { WhisperService } from "./whisper.service";
import { PiperService } from "./piper.service";
import { AnsutModule } from "../ansut/ansut.module";
import { ConfigModule } from "@nestjs/config";
import { VoiceConfigModule } from "./voice-config.module";
import { VoiceServiceMetric } from "./entities/voice-service-metric.entity";
import { VoiceMetricsService } from "./voice-metrics.service";

@Module({
  imports: [AnsutModule, ConfigModule, TypeOrmModule.forFeature([VoiceServiceMetric]), VoiceConfigModule],
  controllers: [VoiceController, TtsController],
  providers: [VoiceService, UserMemoryService, ConversationStateService, OpenAIService, LocalIntentService, VoskService, WhisperService, PiperService, VoiceMetricsService],
  exports: [OpenAIService, VoiceMetricsService],
})
export class VoiceModule {}
