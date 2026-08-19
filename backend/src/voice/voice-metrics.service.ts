import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VoiceServiceMetric, VoiceMetricServiceKey } from './entities/voice-service-metric.entity';

export type { VoiceMetricServiceKey } from './entities/voice-service-metric.entity';

export const VOICE_METRIC_LABELS: Record<VoiceMetricServiceKey, string> = {
  stt_whisper_local: 'Whisper.cpp (STT local)',
  stt_openai_cloud: 'OpenAI Whisper (STT cloud)',
  tts_piper_local: 'Piper (TTS local)',
  tts_elevenlabs: 'ElevenLabs (TTS cloud)',
};

export interface VoiceServiceSummary {
  key: VoiceMetricServiceKey;
  label: string;
  hasData: boolean;
  total: number;
  successCount: number;
  errorCount: number;
  errorRatePct: number | null;
  avgLatencyMs: number | null;
  lastEventAt: Date | null;
}

export interface VoiceGlobalStats {
  requestsToday: number;
  avgLatencyMs: number | null;
  errorRatePct: number;
}

// Service de mesure REELLE des appels voix (STT/TTS) — pas d'estimation, pas
// de valeur par defaut deguisee en mesure. `record()` est appele au point
// d'appel reel de chaque moteur (whisper.service.ts, openai.service.ts) et ne
// doit JAMAIS faire echouer le pipeline vocal : toute erreur d'ecriture est
// journalisee et avalee ici.
@Injectable()
export class VoiceMetricsService {
  private readonly logger = new Logger(VoiceMetricsService.name);

  constructor(
    @InjectRepository(VoiceServiceMetric)
    private readonly repo: Repository<VoiceServiceMetric>,
  ) {}

  async record(
    service: VoiceMetricServiceKey,
    success: boolean,
    latencyMs: number,
    errorMessage?: string | null,
  ): Promise<void> {
    try {
      await this.repo.save({
        service,
        success,
        latencyMs: Math.max(0, Math.round(latencyMs) || 0),
        errorMessage: errorMessage ? errorMessage.slice(0, 500) : null,
      } as Partial<VoiceServiceMetric>);
    } catch (e) {
      this.logger.warn(`record(${service}) a echoue: ${(e as Error)?.message}`);
    }
  }

  // Etat par service sur une fenetre glissante (30 jours par defaut). Un
  // service sans ligne dans la fenetre renvoie hasData=false — le controleur
  // ne doit alors afficher ni latence ni uptime invente.
  async getServiceSummary(windowHours = 24 * 30): Promise<VoiceServiceSummary[]> {
    const keys = Object.keys(VOICE_METRIC_LABELS) as VoiceMetricServiceKey[];
    try {
      const since = new Date(Date.now() - windowHours * 3600 * 1000);
      const rows = await this.repo
        .createQueryBuilder('m')
        .select('m.service', 'service')
        .addSelect('COUNT(*)', 'total')
        .addSelect('SUM(CASE WHEN m.success THEN 1 ELSE 0 END)', 'success_count')
        .addSelect('AVG(CASE WHEN m.success THEN m.latencyMs ELSE NULL END)', 'avg_latency')
        .addSelect('MAX(m.createdAt)', 'last_event_at')
        .where('m.createdAt >= :since', { since })
        .groupBy('m.service')
        .getRawMany();

      return keys.map((key) => {
        const row = rows.find((r) => r.service === key);
        const total = row ? Number(row.total) : 0;
        if (!row || total === 0) {
          return {
            key,
            label: VOICE_METRIC_LABELS[key],
            hasData: false,
            total: 0,
            successCount: 0,
            errorCount: 0,
            errorRatePct: null,
            avgLatencyMs: null,
            lastEventAt: null,
          };
        }
        const successCount = Number(row.success_count) || 0;
        const errorCount = total - successCount;
        return {
          key,
          label: VOICE_METRIC_LABELS[key],
          hasData: true,
          total,
          successCount,
          errorCount,
          errorRatePct: Math.round((errorCount / total) * 1000) / 10,
          avgLatencyMs: row.avg_latency != null ? Math.round(Number(row.avg_latency)) : null,
          lastEventAt: row.last_event_at ? new Date(row.last_event_at) : null,
        };
      });
    } catch (e) {
      this.logger.error(`getServiceSummary a echoue: ${(e as Error)?.message}`);
      return keys.map((key) => ({
        key,
        label: VOICE_METRIC_LABELS[key],
        hasData: false,
        total: 0,
        successCount: 0,
        errorCount: 0,
        errorRatePct: null,
        avgLatencyMs: null,
        lastEventAt: null,
      }));
    }
  }

  // Serie journaliere (defaut 14 jours) pour les graphiques "requetes par
  // jour" / "erreurs par jour" du back-office. Requetes = STT cloud OpenAI +
  // TTS ElevenLabs (les deux moteurs cloud payants, seuls concernes par
  // l'ecran d'origine "Suivi OpenAI, ElevenLabs").
  async getDailySeries(days = 14): Promise<{ dailyRequests: Array<{ jour: string; openai: number; elevenlabs: number }>; errorData: Array<{ jour: string; erreurs: number }> }> {
    try {
      const since = new Date(Date.now() - days * 24 * 3600 * 1000);
      const rows = await this.repo
        .createQueryBuilder('m')
        .select("TO_CHAR(m.createdAt, 'DD/MM')", 'jour')
        .addSelect('m.service', 'service')
        .addSelect('COUNT(*)', 'total')
        .addSelect('SUM(CASE WHEN m.success THEN 0 ELSE 1 END)', 'errors')
        .where('m.createdAt >= :since', { since })
        .groupBy("TO_CHAR(m.createdAt, 'DD/MM')")
        .addGroupBy('m.service')
        .addGroupBy("DATE_TRUNC('day', m.createdAt)")
        .orderBy("DATE_TRUNC('day', m.createdAt)", 'ASC')
        .getRawMany();

      const byDay = new Map<string, { openai: number; elevenlabs: number; erreurs: number }>();
      for (const r of rows) {
        const jour = r.jour as string;
        const entry = byDay.get(jour) || { openai: 0, elevenlabs: 0, erreurs: 0 };
        const total = Number(r.total) || 0;
        const errors = Number(r.errors) || 0;
        if (r.service === 'stt_openai_cloud') entry.openai += total;
        if (r.service === 'tts_elevenlabs') entry.elevenlabs += total;
        entry.erreurs += errors;
        byDay.set(jour, entry);
      }
      const dailyRequests = Array.from(byDay.entries()).map(([jour, v]) => ({ jour, openai: v.openai, elevenlabs: v.elevenlabs }));
      const errorData = Array.from(byDay.entries()).map(([jour, v]) => ({ jour, erreurs: v.erreurs }));
      return { dailyRequests, errorData };
    } catch (e) {
      this.logger.error(`getDailySeries a echoue: ${(e as Error)?.message}`);
      return { dailyRequests: [], errorData: [] };
    }
  }

  // Stats globales tous services confondus, sur les 24 dernieres heures.
  async getGlobalStats(): Promise<VoiceGlobalStats> {
    try {
      const since24h = new Date(Date.now() - 24 * 3600 * 1000);
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const [statsRow, todayRow] = await Promise.all([
        this.repo
          .createQueryBuilder('m')
          .select('COUNT(*)', 'total')
          .addSelect('SUM(CASE WHEN m.success THEN 1 ELSE 0 END)', 'success_count')
          .addSelect('AVG(CASE WHEN m.success THEN m.latencyMs ELSE NULL END)', 'avg_latency')
          .where('m.createdAt >= :since', { since: since24h })
          .getRawOne(),
        this.repo
          .createQueryBuilder('m')
          .select('COUNT(*)', 'total')
          .where('m.createdAt >= :since', { since: startOfDay })
          .getRawOne(),
      ]);

      const total = statsRow ? Number(statsRow.total) || 0 : 0;
      const successCount = statsRow ? Number(statsRow.success_count) || 0 : 0;
      const errorRatePct = total > 0 ? Math.round(((total - successCount) / total) * 1000) / 10 : 0;
      const avgLatencyMs = statsRow?.avg_latency != null ? Math.round(Number(statsRow.avg_latency)) : null;
      const requestsToday = todayRow ? Number(todayRow.total) || 0 : 0;

      return { requestsToday, avgLatencyMs, errorRatePct };
    } catch (e) {
      this.logger.error(`getGlobalStats a echoue: ${(e as Error)?.message}`);
      return { requestsToday: 0, avgLatencyMs: null, errorRatePct: 0 };
    }
  }
}
