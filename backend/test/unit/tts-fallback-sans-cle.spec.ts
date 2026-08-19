// Repli TTS sans clé ElevenLabs — le rapport hebdo vocal (RapportHebdoController)
// et les raccourcis vocaux dépendent transitivement de OpenAIService.synthesize()
// pour la synthèse vocale (ElevenLabs, avec repli Piper local en amont). En
// environnement de test/dev sans ELEVENLABS_API_KEY / ELEVENLABS_VOICE_ID, ce
// service ne doit JAMAIS faire planter l'appelant : il doit renvoyer `null`
// (silencieusement journalisé), pour que le contrôleur retombe sur
// `audioBase64: ''` (cf. caisse-rest/rapport-hebdo.controller.ts) au lieu d'un
// 500 en production/CI.
import { OpenAIService } from '../../src/voice/openai.service';
import { PiperService } from '../../src/voice/piper.service';

function fakeConfig(values: Record<string, string | undefined> = {}) {
  return { get: (key: string) => values[key] } as any;
}

describe('OpenAIService.synthesize — repli propre sans clé ElevenLabs', () => {
  it('ELEVENLABS_API_KEY et ELEVENLABS_VOICE_ID absentes → renvoie null, ne lève pas', async () => {
    const config = fakeConfig({}); // aucune variable définie
    const piper = new PiperService(config);
    const service = new OpenAIService(config, piper);

    await expect(service.synthesize('Bonjour, ceci est un test.')).resolves.toBeNull();
  });

  it('ELEVENLABS_API_KEY présente mais ELEVENLABS_VOICE_ID absente → renvoie null (pas de requête réseau à moitié configurée)', async () => {
    const config = fakeConfig({ ELEVENLABS_API_KEY: 'clef-de-test' });
    const piper = new PiperService(config);
    const service = new OpenAIService(config, piper);

    await expect(service.synthesize('Bonjour.')).resolves.toBeNull();
  });

  it('VOICE_LOCAL_TTS=1 mais PIPER_BIN/PIPER_VOICE absentes ET pas de clé ElevenLabs → renvoie null (double repli, pas de crash)', async () => {
    const config = fakeConfig({ VOICE_LOCAL_TTS: '1' });
    const piper = new PiperService(config);
    const service = new OpenAIService(config, piper);

    await expect(service.synthesize('Bonjour.')).resolves.toBeNull();
  });

  it('texte vide → ne tente aucun appel et ne lève pas (Piper renvoie null immédiatement)', async () => {
    const config = fakeConfig({ VOICE_LOCAL_TTS: '1', PIPER_BIN: '/opt/piper/piper', PIPER_VOICE: '/opt/piper/voice.onnx' });
    const piper = new PiperService(config);
    await expect(piper.synthesize('')).resolves.toBeNull();
  });
});
