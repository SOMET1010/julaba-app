import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PinCryptoService } from '../auth/pin-crypto.service';
import { VoiceProviderConfigEntity, VoiceProvider } from './voice-provider-config.entity';
import { VoiceConfigUpdateDto, VOICE_PROVIDERS } from './dto/voice-config-update.dto';
import { synthesizeAzureSpeech, synthesizeElevenLabs } from './tts-providers';

export interface VoiceConfigStatus {
  provider: VoiceProvider;
  configured: boolean; // une clé chiffrée est enregistrée
  active: boolean;
  keyLast4: string | null; // 4 derniers caractères de la clé, JAMAIS la clé entière
  voiceName: string | null;
  azureRegion: string | null;
  updatedAt: string | null;
}

// Config active résolue (clé déchiffrée EN MÉMOIRE, jamais renvoyée telle
// quelle par une route HTTP) — usage interne uniquement, consommé par
// OpenAIService.synthesize() pour préférer la base aux variables d'env.
export interface ActiveVoiceConfig {
  provider: VoiceProvider;
  apiKey: string;
  voiceName: string | null;
  azureRegion: string | null;
}

function isVoiceProvider(value: string): value is VoiceProvider {
  return (VOICE_PROVIDERS as readonly string[]).includes(value);
}

@Injectable()
export class VoiceConfigService {
  private readonly logger = new Logger(VoiceConfigService.name);

  constructor(
    @InjectRepository(VoiceProviderConfigEntity)
    private readonly repo: Repository<VoiceProviderConfigEntity>,
    private readonly pinCrypto: PinCryptoService,
  ) {}

  assertProvider(provider: string): VoiceProvider {
    if (!isVoiceProvider(provider)) {
      throw new BadRequestException(`Fournisseur invalide : ${VOICE_PROVIDERS.join(' ou ')}.`);
    }
    return provider;
  }

  private toStatus(row: VoiceProviderConfigEntity | null, provider: VoiceProvider): VoiceConfigStatus {
    if (!row) {
      return {
        provider,
        configured: false,
        active: false,
        keyLast4: null,
        voiceName: null,
        azureRegion: null,
        updatedAt: null,
      };
    }
    let keyLast4: string | null = null;
    if (row.encrypted_api_key) {
      try {
        const plain = this.pinCrypto.decrypt(row.encrypted_api_key);
        keyLast4 = plain.slice(-4);
      } catch (e: any) {
        // Clé illisible (ex. PIN_ENCRYPTION_KEY tournée sans rechiffrement) :
        // on le signale, mais "configured" reste true — la ligne existe, elle
        // est juste indéchiffrable avec la clé actuelle. Ne fait JAMAIS
        // planter l'écran de statut.
        this.logger.error(`[VOICE-CONFIG] déchiffrement échoué pour ${provider}: ${e?.message}`);
      }
    }
    return {
      provider,
      configured: !!row.encrypted_api_key,
      active: row.is_active,
      keyLast4,
      voiceName: row.voice_name,
      azureRegion: row.azure_region,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    };
  }

  async getStatus(): Promise<VoiceConfigStatus[]> {
    const rows = await this.repo.find();
    const byProvider = new Map(rows.map((r) => [r.provider, r]));
    return VOICE_PROVIDERS.map((p) => this.toStatus(byProvider.get(p) || null, p));
  }

  async upsert(providerRaw: string, dto: VoiceConfigUpdateDto, updatedBy: string | null): Promise<VoiceConfigStatus> {
    const provider = this.assertProvider(providerRaw);
    let row = await this.repo.findOne({ where: { provider } });
    if (!row) {
      row = this.repo.create({ provider, is_active: false });
    }

    if (dto.apiKey !== undefined) row.encrypted_api_key = this.pinCrypto.encrypt(dto.apiKey);
    if (dto.voiceName !== undefined) row.voice_name = dto.voiceName;
    if (dto.azureRegion !== undefined) row.azure_region = dto.azureRegion;
    row.updated_by = updatedBy;

    if (dto.setActive === true) {
      if (!row.encrypted_api_key) {
        throw new BadRequestException('Impossible d\'activer : aucune clé API enregistrée pour ce fournisseur.');
      }
      if (provider === 'azure_speech' && (!row.azure_region || !row.voice_name)) {
        throw new BadRequestException('Impossible d\'activer Azure Speech : région et nom de voix requis.');
      }
      if (provider === 'elevenlabs' && !row.voice_name) {
        throw new BadRequestException('Impossible d\'activer ElevenLabs : voice_id requis.');
      }
      // Désactive l'autre fournisseur AVANT d'activer celui-ci : l'index
      // unique partiel (is_active=true) refuserait sinon un instant à deux
      // lignes actives simultanément.
      await this.repo
        .createQueryBuilder()
        .update(VoiceProviderConfigEntity)
        .set({ is_active: false })
        .where('provider != :provider', { provider })
        .execute();
      row.is_active = true;
    } else if (dto.setActive === false) {
      row.is_active = false;
    }

    const saved = await this.repo.save(row);
    this.logger.log(`[VOICE-CONFIG] ${provider} mis à jour (actif=${saved.is_active})`);
    return this.toStatus(saved, provider);
  }

  /** Config active résolue, clé déchiffrée — usage interne (OpenAIService). */
  async getActiveProviderConfig(): Promise<ActiveVoiceConfig | null> {
    const row = await this.repo.findOne({ where: { is_active: true } });
    if (!row || !row.encrypted_api_key) return null;
    try {
      const apiKey = this.pinCrypto.decrypt(row.encrypted_api_key);
      return { provider: row.provider, apiKey, voiceName: row.voice_name, azureRegion: row.azure_region };
    } catch (e: any) {
      // Repli sûr : config active mais indéchiffrable → traité comme "pas de
      // config active", l'appelant retombe sur les variables d'environnement.
      this.logger.error(`[VOICE-CONFIG] config active illisible (${row.provider}): ${e?.message}`);
      return null;
    }
  }

  /** Synthétise une phrase courte avec la config ENREGISTRÉE (pas forcément active) pour ce fournisseur — bouton "Tester". */
  async testSynthesize(providerRaw: string, sampleText: string): Promise<Buffer> {
    const provider = this.assertProvider(providerRaw);
    const row = await this.repo.findOne({ where: { provider } });
    if (!row || !row.encrypted_api_key) {
      throw new NotFoundException('Aucune configuration enregistrée pour ce fournisseur — enregistre une clé avant de tester.');
    }
    const apiKey = this.pinCrypto.decrypt(row.encrypted_api_key);
    if (provider === 'azure_speech') {
      if (!row.azure_region || !row.voice_name) {
        throw new BadRequestException('Région et nom de voix Azure requis pour tester.');
      }
      return synthesizeAzureSpeech(sampleText, apiKey, row.azure_region, row.voice_name);
    }
    if (!row.voice_name) {
      throw new BadRequestException('voice_id ElevenLabs requis pour tester.');
    }
    return synthesizeElevenLabs(sampleText, apiKey, row.voice_name);
  }
}
