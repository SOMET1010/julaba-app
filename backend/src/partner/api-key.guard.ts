import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type { Request } from 'express';

type RequestWithApiKey = Request & { apiKeyId?: string };

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(@InjectDataSource() private readonly ds: DataSource) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<RequestWithApiKey>();
    const raw = req.headers['x-api-key'];
    const key =
      typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined;
    if (!key) throw new UnauthorizedException('Clé API manquante');

    const rows = (await this.ds.query(
      `SELECT id, is_active, rate_limit FROM api_keys WHERE key = $1`,
      [key],
    )) as Array<{ id: string; is_active: boolean; rate_limit: number }>;

    if (!rows.length || !rows[0].is_active) {
      throw new UnauthorizedException('Clé API invalide ou désactivée');
    }

    await this.ds.query(
      `UPDATE api_keys SET usage_count = usage_count + 1, last_used_at = NOW() WHERE key = $1`,
      [key],
    );

    req.apiKeyId = rows[0].id;
    return true;
  }
}
