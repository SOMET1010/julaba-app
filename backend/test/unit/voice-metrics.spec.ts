// Le monitoring IA back-office (`GET /admin/monitoring`) affichait 4 services
// codes en dur avec des latences/uptime fixes, sans lien avec les vrais
// appels voix. Ces tests verifient que `VoiceMetricsService.record()` est
// bien appele aux points d'appel REELS (whisper.cpp local, OpenAI Whisper
// cloud, ElevenLabs TTS) — un vrai appel simule doit faire bouger le
// compteur, et un appel non tente (config absente) ne doit RIEN enregistrer
// (pas de fausse donnee).
import { WhisperService } from '../../src/voice/whisper.service';
import { OpenAIService } from '../../src/voice/openai.service';
import { PiperService } from '../../src/voice/piper.service';
import { VoiceMetricsService } from '../../src/voice/voice-metrics.service';
import type { VoiceServiceMetric } from '../../src/voice/entities/voice-service-metric.entity';

function fakeConfig(values: Record<string, string | undefined> = {}) {
  return { get: (key: string) => values[key] } as any;
}

// Faux repository TypeORM en memoire : suffit pour verifier que `save()` est
// bien appele avec les bonnes donnees, sans toucher a une vraie base.
function fakeMetricsRepo() {
  const rows: Partial<VoiceServiceMetric>[] = [];
  return {
    rows,
    save: jest.fn(async (row: Partial<VoiceServiceMetric>) => {
      rows.push(row);
      return row;
    }),
    createQueryBuilder: jest.fn(),
  } as any;
}

describe('VoiceMetricsService.record — reflete un vrai evenement', () => {
  it('enregistre un succes avec la latence mesuree', async () => {
    const repo = fakeMetricsRepo();
    const metrics = new VoiceMetricsService(repo);

    await metrics.record('stt_openai_cloud', true, 123);

    expect(repo.save).toHaveBeenCalledTimes(1);
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0]).toMatchObject({ service: 'stt_openai_cloud', success: true, latencyMs: 123, errorMessage: null });
  });

  it('enregistre un echec avec le message d\'erreur (tronque a 500 car)', async () => {
    const repo = fakeMetricsRepo();
    const metrics = new VoiceMetricsService(repo);

    await metrics.record('tts_elevenlabs', false, 42, 'x'.repeat(600));

    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0].success).toBe(false);
    expect((repo.rows[0].errorMessage as string).length).toBe(500);
  });

  it('n\'echoue jamais l\'appelant meme si repo.save() rejette (le pipeline vocal ne doit jamais casser)', async () => {
    const repo = fakeMetricsRepo();
    repo.save.mockRejectedValueOnce(new Error('DB down'));
    const metrics = new VoiceMetricsService(repo);

    await expect(metrics.record('stt_whisper_local', true, 10)).resolves.toBeUndefined();
  });
});

describe('WhisperService.transcribe — instrumentation au point d\'appel reel', () => {
  it('WHISPER_BIN/WHISPER_MODEL absents → aucune tentative → aucune metrique enregistree', async () => {
    const repo = fakeMetricsRepo();
    const metrics = new VoiceMetricsService(repo);
    const config = fakeConfig({}); // pas de WHISPER_BIN/WHISPER_MODEL
    const service = new WhisperService(config, metrics);

    const audio = Buffer.alloc(1000);
    const result = await service.transcribe(audio);

    expect(result).toBeNull();
    expect(repo.rows).toHaveLength(0); // pas d'appel tente → pas de fausse ligne
  });

  it('WHISPER_BIN configure mais introuvable → appel reellement tente → echec mesure et enregistre', async () => {
    const repo = fakeMetricsRepo();
    const metrics = new VoiceMetricsService(repo);
    const config = fakeConfig({
      WHISPER_BIN: '/chemin/totalement/inexistant/whisper-cli-julaba-test',
      WHISPER_MODEL: '/chemin/totalement/inexistant/model.bin',
    });
    const service = new WhisperService(config, metrics);

    const audio = Buffer.alloc(1000); // >= 44 octets, passe la garde de taille
    const result = await service.transcribe(audio);

    expect(result).toBeNull();
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0]).toMatchObject({ service: 'stt_whisper_local', success: false });
    expect(typeof repo.rows[0].latencyMs).toBe('number');
  }, 15000);
});

describe('OpenAIService.transcribe (STT cloud OpenAI) — instrumentation au point d\'appel reel', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('OPENAI_API_KEY absente → aucune tentative reseau → aucune metrique', async () => {
    const repo = fakeMetricsRepo();
    const metrics = new VoiceMetricsService(repo);
    const config = fakeConfig({});
    const piper = new PiperService(config);
    const service = new OpenAIService(config, piper, undefined, metrics);

    await expect(service.transcribe(Buffer.alloc(100))).rejects.toThrow();
    expect(repo.rows).toHaveLength(0);
  });

  it('appel reussi (fetch simule) → metrique succes enregistree', async () => {
    const repo = fakeMetricsRepo();
    const metrics = new VoiceMetricsService(repo);
    const config = fakeConfig({ OPENAI_API_KEY: 'test-key' });
    const piper = new PiperService(config);
    const service = new OpenAIService(config, piper, undefined, metrics);

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ text: 'trois tomates cinq cents francs' }),
    }) as any;

    const text = await service.transcribe(Buffer.alloc(100));

    expect(text).toBe('trois tomates cinq cents francs');
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0]).toMatchObject({ service: 'stt_openai_cloud', success: true });
  });

  it('appel en echec (HTTP 500 simule) → metrique echec enregistree, exception propagee', async () => {
    const repo = fakeMetricsRepo();
    const metrics = new VoiceMetricsService(repo);
    const config = fakeConfig({ OPENAI_API_KEY: 'test-key' });
    const piper = new PiperService(config);
    const service = new OpenAIService(config, piper, undefined, metrics);

    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'boom',
    }) as any;

    await expect(service.transcribe(Buffer.alloc(100))).rejects.toThrow(/HTTP 500/);
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0]).toMatchObject({ service: 'stt_openai_cloud', success: false });
    expect(repo.rows[0].errorMessage).toMatch(/HTTP 500/);
  });
});

describe('OpenAIService.synthesize (TTS ElevenLabs) — instrumentation au point d\'appel reel', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('ni cle ni voiceId ElevenLabs → aucune tentative → aucune metrique', async () => {
    const repo = fakeMetricsRepo();
    const metrics = new VoiceMetricsService(repo);
    const config = fakeConfig({});
    const piper = new PiperService(config);
    const service = new OpenAIService(config, piper, undefined, metrics);

    const result = await service.synthesize('Bonjour ma chère.');

    expect(result).toBeNull();
    expect(repo.rows).toHaveLength(0);
  });

  it('appel ElevenLabs reussi (fetch simule) → metrique succes enregistree', async () => {
    const repo = fakeMetricsRepo();
    const metrics = new VoiceMetricsService(repo);
    const config = fakeConfig({ ELEVENLABS_API_KEY: 'key', ELEVENLABS_VOICE_ID: 'voice-1' });
    const piper = new PiperService(config);
    const service = new OpenAIService(config, piper, undefined, metrics);

    const fakeAudio = new Uint8Array([1, 2, 3, 4]).buffer;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => fakeAudio,
    }) as any;

    const buf = await service.synthesize('Bonjour ma chère.');

    expect(buf).toBeInstanceOf(Buffer);
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0]).toMatchObject({ service: 'tts_elevenlabs', success: true });
  });

  it('appel ElevenLabs en echec (HTTP 500 simule) → metrique echec enregistree, renvoie null (pas de crash appelant)', async () => {
    const repo = fakeMetricsRepo();
    const metrics = new VoiceMetricsService(repo);
    const config = fakeConfig({ ELEVENLABS_API_KEY: 'key', ELEVENLABS_VOICE_ID: 'voice-1' });
    const piper = new PiperService(config);
    const service = new OpenAIService(config, piper, undefined, metrics);

    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 }) as any;

    const buf = await service.synthesize('Bonjour ma chère.');

    expect(buf).toBeNull();
    expect(repo.rows).toHaveLength(1);
    expect(repo.rows[0]).toMatchObject({ service: 'tts_elevenlabs', success: false });
  });
});
