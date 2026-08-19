import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PiperService } from './piper.service';
import { VoiceMetricsService, VoiceMetricServiceKey } from './voice-metrics.service';

// Service voix : regroupe OpenAI (STT Whisper, LLM GPT-4o) et ElevenLabs (TTS).
// Le nom OpenAIService est conserve par historique ; le TTS passe par ElevenLabs,
// avec un chemin Piper local (offline-first) prioritaire si active.
@Injectable()
export class OpenAIService {
  private readonly logger = new Logger(OpenAIService.name);

  constructor(
    private config: ConfigService,
    private piper: PiperService,
    @Optional() private metrics?: VoiceMetricsService,
  ) {}

  // Mesure d'un appel REELLEMENT tente (cle/config presentes, requete
  // envoyee) — jamais appele pour un court-circuit "non configure", pour ne
  // pas gonfler artificiellement les compteurs avec des non-evenements.
  private recordMetric(service: VoiceMetricServiceKey, success: boolean, startedAt: number, errorMessage?: string): Promise<void> {
    return this.metrics?.record(service, success, Date.now() - startedAt, errorMessage) ?? Promise.resolve();
  }

  private getKey(): string {
    const key = this.config.get<string>('OPENAI_API_KEY') || '';
    if (!key) this.logger.error('[OPENAI] OPENAI_API_KEY manquante');
    return key;
  }

  private getElevenLabsApiKey(): string {
    const key = this.config.get<string>('ELEVENLABS_API_KEY') || '';
    if (!key) this.logger.error('[ELEVENLABS] ELEVENLABS_API_KEY manquante');
    return key;
  }

  private getElevenLabsVoiceId(): string {
    const voiceId = this.config.get<string>('ELEVENLABS_VOICE_ID') || '';
    if (!voiceId) this.logger.error('[ELEVENLABS] ELEVENLABS_VOICE_ID manquante');
    return voiceId;
  }

  // STT — Whisper via OpenAI
  async transcribe(audioBuffer: Buffer, lang = 'fr'): Promise<string> {
    const key = this.getKey();
    // Court-circuit : pas d'appel distant avec une cle vide (gere en amont par voice.service).
    if (!key) throw new Error('OPENAI_API_KEY absente, STT/LLM indisponible');
    const fd = new FormData();
    const blob = new Blob([audioBuffer as unknown as BlobPart], { type: 'audio/wav' });
    fd.append('file', blob, 'audio.wav');
    fd.append('model', 'whisper-1');
    fd.append('language', lang);
    fd.append('response_format', 'json');
    fd.append('prompt', 'Bonjour, je vends des légumes au marché. FCFA, Francs, vendu, dépensé, tomate, oignon, attieke.');

    const startedAt = Date.now();
    try {
      const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        signal: AbortSignal.timeout(30000),
        headers: { 'Authorization': `Bearer ${key}` },
        body: fd,
      });
      if (!res.ok) throw new Error(`OpenAI STT HTTP ${res.status}: ${await res.text()}`);
      const data = await res.json() as any;
      if (!data.text?.trim()) throw new Error('OpenAI STT: réponse vide');
      this.logger.log(`[STT:OPENAI] OK — "${data.text.slice(0, 60)}"`);
      await this.recordMetric('stt_openai_cloud', true, startedAt);
      return data.text;
    } catch (e: any) {
      await this.recordMetric('stt_openai_cloud', false, startedAt, e?.message);
      throw e;
    }
  }

  // LLM — endpoint compatible OpenAI, configurable.
  // Par defaut : OpenAI GPT-4o. Pour un LLM souverain (Mistral auto-heberge via
  // vLLM/Ollama, API compatible OpenAI), il suffit de definir LLM_BASE_URL /
  // LLM_MODEL / LLM_API_KEY — aucun changement de code.
  async detectIntent(messages: any[], systemPrompt: string): Promise<any> {
    const baseUrl = this.config.get<string>('LLM_BASE_URL') || 'https://api.openai.com/v1';
    const model = this.config.get<string>('LLM_MODEL') || 'gpt-4o';
    const key = this.config.get<string>('LLM_API_KEY') || this.getKey();
    // Court-circuit : pas d'appel distant avec une cle vide (gere en amont par voice.service).
    // Un LLM local peut ne pas exiger de cle : on tolere une cle vide si LLM_BASE_URL est surchargee.
    const isRemoteOpenAI = baseUrl.includes('api.openai.com');
    if (!key && isRemoteOpenAI) throw new Error('OPENAI_API_KEY absente, LLM indisponible');
    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      signal: AbortSignal.timeout(15000),
      headers: {
        'Content-Type': 'application/json',
        ...(key ? { 'Authorization': `Bearer ${key}` } : {}),
      },
      body: JSON.stringify({
        model,
        max_tokens: 150,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      }),
    });
    if (!res.ok) throw new Error(`LLM HTTP ${res.status}: ${await res.text()}`);
    const data = await res.json() as any;
    const raw = data.choices?.[0]?.message?.content || '{}';
    this.logger.log(`[LLM:${model}] Réponse: ${raw.slice(0, 300)}`);
    try {
      return JSON.parse(raw);
    } catch (e: any) {
      // Repli sur intent indetermine : on ne laisse pas l'exception remonter brute.
      this.logger.error(`[LLM:OPENAI] Parse JSON echoue: ${e?.message} | extrait="${String(raw).slice(0, 200)}"`);
      return { intent: 'conversation', action: null, reponse: "Je n'ai pas bien compris, peux-tu reformuler ?", navigate: null };
    }
  }

  // TTS — Piper local (offline-first) puis repli ElevenLabs
  async synthesize(text: string): Promise<Buffer | null> {
    // Piper local, si actif ET configure (bin+voix presents — sinon ce n'est
    // pas un appel reel, juste un chemin desactive : pas de metrique).
    if (this.config.get<string>('VOICE_LOCAL_TTS') === '1' && this.piper.available()) {
      const startedAt = Date.now();
      try {
        const wav = await this.piper.synthesize(text);
        if (wav && wav.length > 44) {
          await this.recordMetric('tts_piper_local', true, startedAt);
          return wav;
        }
        await this.recordMetric('tts_piper_local', false, startedAt, 'wav vide ou indisponible');
      } catch (e: any) {
        await this.recordMetric('tts_piper_local', false, startedAt, e?.message);
        this.logger.warn(`[TTS:PIPER] repli ElevenLabs (${e.message})`);
      }
    }
    const apiKey = this.getElevenLabsApiKey();
    const voiceId = this.getElevenLabsVoiceId();
    // Court-circuit : pas d'appel distant avec une cle/voiceId vide. L'appelant gere null.
    if (!apiKey || !voiceId) {
      this.logger.error('[TTS:ELEVENLABS] ELEVENLABS_API_KEY ou ELEVENLABS_VOICE_ID absente, TTS indisponible');
      return null;
    }
    const startedAt = Date.now();
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        signal: AbortSignal.timeout(20000),
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.65,
            similarity_boost: 0.80,
            style: 0.25,
            use_speaker_boost: true,
          },
        }),
      });
      if (!res.ok) throw new Error(`ElevenLabs TTS HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      this.logger.log(`[TTS:ELEVENLABS] OK - ${buf.length} bytes`);
      await this.recordMetric('tts_elevenlabs', true, startedAt);
      return buf;
    } catch (e: any) {
      this.logger.error(`[TTS:ELEVENLABS] FAIL: ${e.message}`);
      await this.recordMetric('tts_elevenlabs', false, startedAt, e?.message);
      return null;
    }
  }
}
