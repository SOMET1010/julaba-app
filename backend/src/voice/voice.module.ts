import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { VoiceController, TtsController } from "./voice.controller";
import { VoiceService } from "./voice.service";
import { ConversationStateService } from "./conversation.state";
import { UserMemoryService } from "./user-memory.service";
import { OpenAIService } from "./openai.service";
import { AnsutModule } from "../ansut/ansut.module";
import { ConfigModule } from "@nestjs/config";

@Module({
  imports: [AnsutModule, ConfigModule, TypeOrmModule.forFeature([])],
  controllers: [VoiceController, TtsController],
  providers: [VoiceService, UserMemoryService, ConversationStateService, OpenAIService],
  exports: [OpenAIService],
})
export class VoiceModule {}
