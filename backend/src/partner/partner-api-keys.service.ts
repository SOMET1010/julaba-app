import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { DataSource } from 'typeorm';

const PARTNER_TYPES = new Set(['bank', 'microfinance', 'institution']);

export interface PartnerApiKeyRow {
  id: string;
  key: string;
  name: string;
  partner_type: string;
  is_active: boolean;
  rate_limit: number;
  usage_count: number;
  last_used_at: Date | string | null;
  created_at: Date | string;
}

@Injectable()
export class PartnerApiKeysService {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  private generateKey(): string {
    const suffix = randomBytes(24).toString('base64url');
    return `jul_pk_${suffix}`;
  }

  async findAll(): Promise<PartnerApiKeyRow[]> {
    const rows = (await this.ds.query(
      `SELECT id, key, name, partner_type, is_active, rate_limit, usage_count, last_used_at, created_at
       FROM api_keys
       ORDER BY created_at DESC`,
    )) as PartnerApiKeyRow[];
    return rows;
  }

  async create(name: string, partnerType: string): Promise<PartnerApiKeyRow> {
    const trimmed = name?.trim();
    if (!trimmed) {
      throw new BadRequestException('Le nom du partenaire est requis.');
    }
    const pt = String(partnerType ?? '').trim();
    if (!PARTNER_TYPES.has(pt)) {
      throw new BadRequestException(
        'Type invalide : bank, microfinance ou institution.',
      );
    }
    const key = this.generateKey();
    const inserted = (await this.ds.query(
      `INSERT INTO api_keys (key, name, partner_type, is_active, rate_limit, usage_count)
       VALUES ($1, $2, $3, true, 1000, 0)
       RETURNING id, key, name, partner_type, is_active, rate_limit, usage_count, last_used_at, created_at`,
      [key, trimmed, pt],
    )) as PartnerApiKeyRow[];
    const row = inserted[0];
    if (!row) {
      throw new BadRequestException('Impossible de créer la clé.');
    }
    return row;
  }

  async setActive(id: string, isActive: boolean): Promise<PartnerApiKeyRow> {
    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(id)) {
      throw new BadRequestException('Identifiant de clé invalide.');
    }
    if (typeof isActive !== 'boolean') {
      throw new BadRequestException('is_active doit être un booléen.');
    }
    const updated = (await this.ds.query(
      `UPDATE api_keys SET is_active = $2 WHERE id = $1
       RETURNING id, key, name, partner_type, is_active, rate_limit, usage_count, last_used_at, created_at`,
      [id, isActive],
    )) as PartnerApiKeyRow[];
    if (!updated[0]) {
      throw new NotFoundException('Clé API introuvable.');
    }
    return updated[0];
  }
}
