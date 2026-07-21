import { Injectable, OnModuleInit } from '@nestjs/common';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

@Injectable()
export class PinCryptoService implements OnModuleInit {
  private key!: Buffer;
  private legacyKey!: Buffer;

  onModuleInit(): void {
    const raw = process.env.PIN_ENCRYPTION_KEY || '';
    if (/^[0-9a-fA-F]{64}$/.test(raw)) {
      // Clé au format attendu (32 octets hex) : utilisée telle quelle (V1 inchangé).
      this.key = Buffer.from(raw, 'hex');
    } else if (raw) {
      // Clé fournie mais pas au format 64-hex (ex. secret généré par l'hébergeur) :
      // on en dérive une clé 32 octets STABLE via SHA-256. Déterministe -> aucune
      // perte de données tant que la valeur du secret ne change pas.
      this.key = createHash('sha256').update(raw).digest();
    } else {
      throw new Error('PIN_ENCRYPTION_KEY manquante: definis un secret pour le chiffrement des PIN.');
    }
    this.legacyKey = Buffer.from(process.env.JWT_SECRET || '', 'utf8').slice(0, 32);
  }

  encrypt(plain: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    let ct = cipher.update(plain, 'utf8', 'hex');
    ct += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');
    return `v2:${iv.toString('hex')}:${tag}:${ct}`;
  }

  decrypt(stored: string): string {
    if (stored.startsWith('v2:')) {
      const [, ivHex = '', tagHex = '', ...rest] = stored.split(':');
      const decipher = createDecipheriv('aes-256-gcm', this.key, Buffer.from(ivHex, 'hex'));
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
      let out = decipher.update(rest.join(':'), 'hex', 'utf8');
      out += decipher.final('utf8');
      return out;
    }
    const iv = Buffer.from(stored.slice(0, 32), 'hex');
    const decipher = createDecipheriv('aes-256-cbc', this.legacyKey, iv);
    let out = decipher.update(stored.slice(32), 'hex', 'utf8');
    out += decipher.final('utf8');
    return out;
  }
}
