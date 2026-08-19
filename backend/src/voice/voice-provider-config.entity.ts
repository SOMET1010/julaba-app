import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// Fournisseurs TTS pilotables depuis le back-office (Studio Voix > Clonage).
// 'elevenlabs' : cloud existant (repli historique, cf. openai.service.ts).
// 'azure_speech' : Azure AI Speech (Speech Studio) — synthèse standard OU voix
// clonée (nom de voix personnalisée entraînée dans Speech Studio).
export type VoiceProvider = 'elevenlabs' | 'azure_speech';

// Une ligne par fournisseur. La clé API n'est JAMAIS stockée en clair : elle
// passe par PinCryptoService (AES-256-GCM, même mécanisme que le PIN — voir
// JULABA_DECISIONS.md §10 et backend/src/auth/pin-crypto.service.ts). Au plus
// un fournisseur actif à la fois, imposé par un index unique partiel en base
// (voir migration VoiceProviderConfig) — pas seulement par la logique appli.
@Entity('voice_provider_config')
export class VoiceProviderConfigEntity {
  @PrimaryGeneratedColumn('uuid') id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  provider: VoiceProvider;

  @Column({ type: 'boolean', default: false })
  is_active: boolean;

  // Format PinCryptoService : "v2:<iv-hex>:<tag-hex>:<ciphertext-hex>". null tant
  // qu'aucune clé n'a été saisie pour ce fournisseur.
  @Column({ type: 'text', nullable: true })
  encrypted_api_key: string | null;

  // ElevenLabs : voice_id. Azure Speech : nom de voix (ex. "fr-FR-DeniseNeural")
  // ou nom de déploiement de voix clonée créée dans Speech Studio.
  @Column({ type: 'varchar', length: 150, nullable: true })
  voice_name: string | null;

  // Azure Speech uniquement : région de la ressource (ex. "francecentral").
  @Column({ type: 'varchar', length: 50, nullable: true })
  azure_region: string | null;

  @Column({ type: 'uuid', nullable: true })
  updated_by: string | null;

  @CreateDateColumn() created_at: Date;
  @UpdateDateColumn() updated_at: Date;
}
