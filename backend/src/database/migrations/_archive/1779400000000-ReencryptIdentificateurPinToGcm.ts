import { MigrationInterface, QueryRunner } from 'typeorm';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export class ReencryptIdentificateurPinToGcm1779400000000 implements MigrationInterface {
  name = 'ReencryptIdentificateurPinToGcm1779400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const keyHex = process.env.PIN_ENCRYPTION_KEY || '';
    if (!/^[0-9a-fA-F]{64}$/.test(keyHex)) {
      throw new Error('PIN_ENCRYPTION_KEY manquante ou invalide: 64 caracteres hex requis');
    }
    const gcmKey = Buffer.from(keyHex, 'hex');
    const legacyKey = Buffer.from(process.env.JWT_SECRET || '', 'utf8').slice(0, 32);
    if (legacyKey.length !== 32) {
      throw new Error('JWT_SECRET insuffisant pour dechiffrer les PIN legacy (32 octets requis)');
    }

    const rows: Array<{ id: string; pin_code_encrypted_identificateur: string }> =
      await queryRunner.query(
        `SELECT id, pin_code_encrypted_identificateur FROM users
         WHERE pin_code_encrypted_identificateur IS NOT NULL
           AND pin_code_encrypted_identificateur NOT LIKE 'v2:%'`,
      );

    let migres = 0;
    for (const row of rows) {
      const stored = row.pin_code_encrypted_identificateur;
      let pin: string;
      try {
        const iv = Buffer.from(stored.slice(0, 32), 'hex');
        const decipher = createDecipheriv('aes-256-cbc', legacyKey, iv);
        pin = decipher.update(stored.slice(32), 'hex', 'utf8') + decipher.final('utf8');
      } catch (e) {
        throw new Error(`Dechiffrement legacy echoue pour user ${row.id}: ${(e as Error).message}`);
      }
      const iv = randomBytes(12);
      const cipher = createCipheriv('aes-256-gcm', gcmKey, iv);
      let ct = cipher.update(pin, 'utf8', 'hex');
      ct += cipher.final('hex');
      const tag = cipher.getAuthTag().toString('hex');
      const v2 = `v2:${iv.toString('hex')}:${tag}:${ct}`;
      await queryRunner.query(
        `UPDATE users SET pin_code_encrypted_identificateur = $1 WHERE id = $2`,
        [v2, row.id],
      );
      migres++;
    }
    console.log(`[migration] PIN identificateur re-chiffres en GCM: ${migres}`);
  }

  public async down(): Promise<void> {
    throw new Error('Migration irreversible: re-chiffrement PIN identificateur CBC->GCM');
  }
}
