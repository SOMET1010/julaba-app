import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface AuditLogInput {
  userId?: string | null;
  action: string;
  entite: string;
  entiteId?: string | null;
  details?: Record<string, any> | null;
  ip?: string | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async log(input: AuditLogInput): Promise<void> {
    try {
      await this.dataSource.query(
        `INSERT INTO audit_logs (user_id, action, entite, entite_id, details, ip, created_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW())`,
        [
          input.userId ?? null,
          input.action,
          input.entite,
          input.entiteId ?? null,
          JSON.stringify(input.details ?? {}),
          input.ip ?? null,
        ],
      );
    } catch (error: any) {
      console.warn('[AuditService] Impossible d enregistrer l audit', error?.message || error);
    }
  }
}
