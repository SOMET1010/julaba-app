import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

export interface DuplicateGroup {
  type: 'phone' | 'identity';
  key: string;
  users: Array<{
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    dateNaissance: Date | null;
    role: string;
    status: string;
    createdAt: Date;
  }>;
}

@Injectable()
export class DuplicatesService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async findDuplicates(filters: { zoneId?: string }): Promise<{ count: number; groups: DuplicateGroup[] }> {
    const zoneParam = filters.zoneId ? [filters.zoneId] : [];

    const phoneDuplicates = await this.dataSource.query(
      `
      SELECT
        phone AS key,
        json_agg(
          json_build_object(
            'id', id,
            'firstName', first_name,
            'lastName', last_name,
            'phone', phone,
            'dateNaissance', date_naissance,
            'role', role,
            'status', status,
            'createdAt', created_at
          )
          ORDER BY created_at ASC
        ) AS users
      FROM users
      WHERE status::text NOT IN ('supprime', 'rejete')
        AND phone IS NOT NULL
        ${filters.zoneId ? `AND zone_id = $1` : ''}
      GROUP BY phone
      HAVING COUNT(*) > 1
    `,
      zoneParam,
    );

    const identityDuplicates = await this.dataSource.query(
      `
      SELECT
        CONCAT(LOWER(TRIM(first_name)), '|', LOWER(TRIM(last_name)), '|', date_naissance::text) AS key,
        json_agg(
          json_build_object(
            'id', id,
            'firstName', first_name,
            'lastName', last_name,
            'phone', phone,
            'dateNaissance', date_naissance,
            'role', role,
            'status', status,
            'createdAt', created_at
          )
          ORDER BY created_at ASC
        ) AS users
      FROM users
      WHERE status::text NOT IN ('supprime', 'rejete')
        AND first_name IS NOT NULL
        AND last_name IS NOT NULL
        AND date_naissance IS NOT NULL
        ${filters.zoneId ? `AND zone_id = $1` : ''}
      GROUP BY LOWER(TRIM(first_name)), LOWER(TRIM(last_name)), date_naissance
      HAVING COUNT(*) > 1
    `,
      zoneParam,
    );

    const groups: DuplicateGroup[] = [
      ...phoneDuplicates.map((row: { key: string; users: DuplicateGroup['users'] }) => ({
        type: 'phone' as const,
        key: row.key,
        users: row.users,
      })),
      ...identityDuplicates.map((row: { key: string; users: DuplicateGroup['users'] }) => ({
        type: 'identity' as const,
        key: row.key,
        users: row.users,
      })),
    ];

    return { count: groups.length, groups };
  }
}
