// VoiceConfigService — config back-office des fournisseurs TTS (Studio Voix >
// Clonage, cf. voice-config.controller.ts). Trois garanties vérifiées ici :
//
//   1. La clé API est chiffrée en base (AES-256-GCM via PinCryptoService,
//      même mécanisme que le PIN — JULABA_DECISIONS.md §10) : aucun texte en
//      clair n'atterrit dans la colonne encrypted_api_key.
//   2. Repli sur les variables d'environnement : quand aucune config n'est
//      active en base, OpenAIService.synthesize() retombe sur
//      ELEVENLABS_API_KEY/ELEVENLABS_VOICE_ID comme avant (ne casse jamais
//      la prod existante).
//   3. Changer le fournisseur actif désactive l'autre (au plus un actif à la
//      fois, même invariant que l'index unique partiel en base).
//
// Pas de DB réelle : Repository<VoiceProviderConfigEntity> est simulé par un
// stockage en mémoire (même esprit que test/unit/tts-fallback-sans-cle.spec.ts,
// qui construit déjà OpenAIService à la main sans conteneur Nest).

import { PinCryptoService } from '../../src/auth/pin-crypto.service';
import { VoiceConfigService } from '../../src/voice/voice-config.service';
import { VoiceProviderConfigEntity } from '../../src/voice/voice-provider-config.entity';
import { OpenAIService } from '../../src/voice/openai.service';
import { PiperService } from '../../src/voice/piper.service';

function fakeConfig(values: Record<string, string | undefined> = {}) {
  return { get: (key: string) => values[key] } as any;
}

function makePinCrypto(): PinCryptoService {
  process.env.PIN_ENCRYPTION_KEY = process.env.PIN_ENCRYPTION_KEY || 'test-pin-encryption-key-32-bytes!';
  const svc = new PinCryptoService();
  svc.onModuleInit();
  return svc;
}

// Simule un Repository TypeORM en mémoire — seules les méthodes utilisées par
// VoiceConfigService sont implémentées.
class FakeVoiceConfigRepo {
  rows: VoiceProviderConfigEntity[] = [];

  async findOne({ where }: { where: Partial<VoiceProviderConfigEntity> }): Promise<VoiceProviderConfigEntity | null> {
    if (where.provider) return this.rows.find((r) => r.provider === where.provider) ?? null;
    if (where.is_active) return this.rows.find((r) => r.is_active) ?? null;
    return null;
  }

  create(partial: Partial<VoiceProviderConfigEntity>): VoiceProviderConfigEntity {
    return { encrypted_api_key: null, voice_name: null, azure_region: null, updated_by: null, ...partial } as VoiceProviderConfigEntity;
  }

  async save(row: VoiceProviderConfigEntity): Promise<VoiceProviderConfigEntity> {
    const saved: VoiceProviderConfigEntity = {
      id: row.id || `fake-id-${row.provider}`,
      created_at: row.created_at || new Date(),
      updated_at: new Date(),
      ...row,
    };
    const idx = this.rows.findIndex((r) => r.provider === saved.provider);
    if (idx >= 0) this.rows[idx] = saved;
    else this.rows.push(saved);
    return saved;
  }

  async find(): Promise<VoiceProviderConfigEntity[]> {
    return [...this.rows];
  }

  // Reproduit `.createQueryBuilder().update(...).set({is_active:false}).where('provider != :provider', {provider}).execute()`.
  createQueryBuilder() {
    const self = this;
    return {
      update: () => ({
        set: (_patch: { is_active: boolean }) => ({
          where: (_sql: string, params: { provider: string }) => ({
            execute: async () => {
              for (const r of self.rows) {
                if (r.provider !== params.provider) r.is_active = false;
              }
            },
          }),
        }),
      }),
    };
  }
}

describe('VoiceConfigService — chiffrement de la clé en base', () => {
  it('encrypted_api_key ne contient JAMAIS la clé en clair, et se déchiffre vers la valeur saisie', async () => {
    const repo = new FakeVoiceConfigRepo();
    const pinCrypto = makePinCrypto();
    const service = new VoiceConfigService(repo as any, pinCrypto);

    const plaintext = 'sk-vraie-cle-secrete-azure-0123456789';
    await service.upsert('azure_speech', { apiKey: plaintext, voiceName: 'fr-FR-DeniseNeural', azureRegion: 'francecentral' }, 'admin-1');

    const row = repo.rows.find((r) => r.provider === 'azure_speech')!;
    expect(row.encrypted_api_key).toBeTruthy();
    expect(row.encrypted_api_key).not.toContain(plaintext);
    expect(row.encrypted_api_key!.startsWith('v2:')).toBe(true); // format PinCryptoService AES-256-GCM
    expect(pinCrypto.decrypt(row.encrypted_api_key!)).toBe(plaintext);
  });

  it('getStatus() ne renvoie jamais la clé — seulement "configuré" + les 4 derniers caractères', async () => {
    const repo = new FakeVoiceConfigRepo();
    const pinCrypto = makePinCrypto();
    const service = new VoiceConfigService(repo as any, pinCrypto);

    await service.upsert('elevenlabs', { apiKey: 'clef-secrete-abcd1234', voiceName: 'voice-xyz' }, null);
    const status = await service.getStatus();
    const eleven = status.find((s) => s.provider === 'elevenlabs')!;

    expect(eleven.configured).toBe(true);
    expect(eleven.keyLast4).toBe('1234');
    expect(JSON.stringify(status)).not.toContain('clef-secrete-abcd1234');
  });
});

describe('VoiceConfigService — bascule du fournisseur actif', () => {
  it('activer azure_speech désactive elevenlabs (au plus un actif à la fois)', async () => {
    const repo = new FakeVoiceConfigRepo();
    const pinCrypto = makePinCrypto();
    const service = new VoiceConfigService(repo as any, pinCrypto);

    await service.upsert('elevenlabs', { apiKey: 'clef-eleven-0000', voiceName: 'voice-1', setActive: true }, null);
    let status = await service.getStatus();
    expect(status.find((s) => s.provider === 'elevenlabs')!.active).toBe(true);

    await service.upsert(
      'azure_speech',
      { apiKey: 'clef-azure-0000', voiceName: 'fr-FR-DeniseNeural', azureRegion: 'francecentral', setActive: true },
      null,
    );
    status = await service.getStatus();
    expect(status.find((s) => s.provider === 'azure_speech')!.active).toBe(true);
    expect(status.find((s) => s.provider === 'elevenlabs')!.active).toBe(false);
  });

  it('activer sans clé enregistrée est refusé (BadRequestException)', async () => {
    const repo = new FakeVoiceConfigRepo();
    const pinCrypto = makePinCrypto();
    const service = new VoiceConfigService(repo as any, pinCrypto);

    await expect(service.upsert('azure_speech', { setActive: true }, null)).rejects.toThrow();
  });

  it('getActiveProviderConfig() renvoie null quand aucune ligne n\'est active', async () => {
    const repo = new FakeVoiceConfigRepo();
    const pinCrypto = makePinCrypto();
    const service = new VoiceConfigService(repo as any, pinCrypto);

    await service.upsert('elevenlabs', { apiKey: 'clef-eleven-0000', voiceName: 'voice-1' }, null); // setActive omis
    await expect(service.getActiveProviderConfig()).resolves.toBeNull();
  });
});

describe('OpenAIService.synthesize — repli sur les variables d\'environnement', () => {
  const realFetch = global.fetch;
  afterEach(() => {
    global.fetch = realFetch;
    jest.restoreAllMocks();
  });

  it('aucune config active en base → utilise ELEVENLABS_API_KEY/ELEVENLABS_VOICE_ID (comportement historique inchangé)', async () => {
    const repo = new FakeVoiceConfigRepo(); // vide : aucune ligne active
    const pinCrypto = makePinCrypto();
    const voiceConfig = new VoiceConfigService(repo as any, pinCrypto);

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([1, 2, 3, 4]).buffer,
    });
    global.fetch = fetchMock as any;

    const config = fakeConfig({ ELEVENLABS_API_KEY: 'env-cle', ELEVENLABS_VOICE_ID: 'env-voice-id' });
    const piper = new PiperService(config);
    const service = new OpenAIService(config, piper, voiceConfig);

    const buf = await service.synthesize('Bonjour.');
    expect(buf).not.toBeNull();
    expect(buf!.length).toBe(4);
    // Appel réellement parti vers ElevenLabs avec la clé/voiceId d'ENV (pas de config DB).
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('env-voice-id'),
      expect.objectContaining({ headers: expect.objectContaining({ 'xi-api-key': 'env-cle' }) }),
    );
  });

  it('une config Azure active en base a PRIORITÉ sur les variables d\'environnement', async () => {
    const repo = new FakeVoiceConfigRepo();
    const pinCrypto = makePinCrypto();
    const voiceConfig = new VoiceConfigService(repo as any, pinCrypto);
    await voiceConfig.upsert(
      'azure_speech',
      { apiKey: 'azure-cle-db', voiceName: 'fr-FR-DeniseNeural', azureRegion: 'francecentral', setActive: true },
      null,
    );

    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: async () => new Uint8Array([9, 9, 9]).buffer,
    });
    global.fetch = fetchMock as any;

    // Variables d'env ElevenLabs présentes mais NE DOIVENT PAS être utilisées.
    const config = fakeConfig({ ELEVENLABS_API_KEY: 'env-cle', ELEVENLABS_VOICE_ID: 'env-voice-id' });
    const piper = new PiperService(config);
    const service = new OpenAIService(config, piper, voiceConfig);

    const buf = await service.synthesize('Bonjour.');
    expect(buf).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('francecentral.tts.speech.microsoft.com'),
      expect.objectContaining({ headers: expect.objectContaining({ 'Ocp-Apim-Subscription-Key': 'azure-cle-db' }) }),
    );
  });
});
