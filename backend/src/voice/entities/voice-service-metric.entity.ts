import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

// Journal append-only des appels reels aux moteurs voix (STT/TTS).
//
// Sert de base au monitoring IA back-office (`/admin/monitoring`) : avant
// cette entite, cet ecran renvoyait 4 services CODES EN DUR avec des
// latences/uptime fixes ("45ms", "99.9%"...) sans aucun lien avec les
// appels reels a whisper.cpp, OpenAI Whisper ou ElevenLabs. Une ligne ici
// = un appel reellement tente (config presente, requete/process lance),
// jamais une estimation ou une valeur par defaut.
//
// `service` identifie le moteur concerne (cf. VoiceMetricService dans
// voice-metrics.service.ts) : 'stt_whisper_local' | 'stt_openai_cloud' |
// 'tts_piper_local' | 'tts_elevenlabs'.
export type VoiceMetricServiceKey =
  | 'stt_whisper_local'
  | 'stt_openai_cloud'
  | 'tts_piper_local'
  | 'tts_elevenlabs';

@Entity('voice_service_metrics')
@Index('idx_voice_service_metrics_service_created', ['service', 'createdAt'])
export class VoiceServiceMetric {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 40 })
  service: VoiceMetricServiceKey;

  @Column({ type: 'boolean' })
  success: boolean;

  @Column({ name: 'latency_ms', type: 'integer' })
  latencyMs: number;

  @Column({ name: 'error_message', type: 'varchar', length: 500, nullable: true })
  errorMessage: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
