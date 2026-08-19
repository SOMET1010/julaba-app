import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Configuration back-office des fournisseurs TTS — `voice_provider_config`
 * (Studio Voix > onglet Clonage).
 *
 * Avant cette table, `openai.service.ts` lisait ELEVENLABS_API_KEY /
 * ELEVENLABS_VOICE_ID UNIQUEMENT depuis les variables d'environnement,
 * sans écran de configuration. Le porteur produit a maintenant une clé
 * Azure AI Speech (Speech Studio) à saisir ; il faut un endroit en base pour
 * la stocker (chiffrée) à côté d'ElevenLabs, et pouvoir basculer l'un ou
 * l'autre actif sans redéploiement.
 *
 * Une ligne par fournisseur ('elevenlabs' | 'azure_speech'). La clé API est
 * chiffrée AES-256-GCM via PinCryptoService — même mécanisme que
 * `identifications.pin_hash` (cf. PIN_ENCRYPTION_KEY, JULABA_DECISIONS.md
 * §10) — jamais stockée en clair.
 *
 * `ux_voice_provider_config_single_active` (index unique PARTIEL sur
 * is_active=true) : au plus un fournisseur actif à la fois, imposé par la
 * base et pas seulement par la logique applicative — même style que
 * `ux_fidelite_evenements_idem` (FideliteEvenements).
 */
export class VoiceProviderConfig1781000000000 implements MigrationInterface {
  name = 'VoiceProviderConfig1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS public.voice_provider_config (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        provider varchar(20) NOT NULL CHECK (provider IN ('elevenlabs', 'azure_speech')),
        is_active boolean NOT NULL DEFAULT false,
        encrypted_api_key text,
        voice_name varchar(150),
        azure_region varchar(50),
        updated_by uuid,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_voice_provider_config_provider
        ON public.voice_provider_config (provider)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS ux_voice_provider_config_single_active
        ON public.voice_provider_config (is_active)
        WHERE is_active = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS public.voice_provider_config`);
  }
}
