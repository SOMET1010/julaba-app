// Le monitoring IA back-office (`GET /admin/monitoring`) affichait 4 services
// codes en dur avec des latences/uptime fixes, sans lien avec les vrais
// appels voix. Ces tests verifient que `VoiceMetricsService.record()` est
// bien appele aux points d'appel REELS (whisper.cpp local, OpenAI Whisper
// cloud, ElevenLabs TTS) — un vrai appel simule doit faire bouger le
// compteur, et un appel non tente (config absente) ne doit RIEN enregistrer
// (pas de fausse donnee).
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

// LES BLOCS « WhisperService.transcribe » ET « OpenAIService.transcribe » ONT
// ÉTÉ RETIRÉS LE 17/09/2026, EN MÊME TEMPS QUE CE QU'ILS ÉPROUVAIENT.
//
// Ils vérifiaient que les transcriptions serveur (whisper.cpp local, Whisper
// cloud) enregistraient bien leurs métriques au point d'appel réel. Ces deux
// chemins n'existent plus : l'application transcrit entièrement sur le
// téléphone (sherpa-onnx embarqué), le serveur n'écoute plus rien.
//
// Ce qui reste éprouvé ci-dessus garde tout son sens : VoiceMetricsService
// sert encore l'analytique du back-office, et ne doit jamais faire échouer
// son appelant — c'est lui qu'on teste, pas le moteur disparu.
